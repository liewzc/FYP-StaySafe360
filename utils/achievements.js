// utils/achievements.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getHistory } from './quizStorage';
import { supabase } from '../supabaseClient';

/** ===== Constants ===== */
const FIRST_AID_CATS = 5 + 10;
const FIRST_AID_SUBLEVELS_PER_CAT = 4;
const DISASTER_CATS = 5;
const DISASTER_SUBLEVELS_PER_CAT = 10;
const KNOWLEDGE_TOTAL_ARTICLES = 15;

// 本地“清空后短时跳过服务器”标记（确保 UI 立即空）
const WIPE_SKIP_KEY = 'progress.wipe.skipServer'; // number (ms)
const WIPE_SKIP_MS  = 20 * 1000;

/** ===== Keys ===== */
const K = {
  shares: 'progress.shares',
  readIds: 'knowledge.readIds',
  streakCount: 'streak.count',
  streakLast: 'streak.lastActive',

  // 只有满分时才写入
  disasterCompleted: 'progress.disaster.completed', // { [disasterType]: { [subLevel]: true } }
  everydayCompleted: 'progress.everyday.completed', // { [categoryKey]:  { [subLevel]: true } }
};

/** ===== Helpers ===== */
const todayStr = () => new Date().toISOString().slice(0, 10);
const percent = (v, target) => {
  if (!target) return 100;
  const p = Math.max(0, Math.min(1, (v || 0) / target));
  return Math.round(p * 100);
};
async function readNumber(key, def = 0) {
  const v = await AsyncStorage.getItem(key);
  return v ? Number(v) : def;
}
async function readArray(key) {
  const v = await AsyncStorage.getItem(key);
  return v ? JSON.parse(v) : [];
}
async function readJson(key, fallback = {}) {
  const v = await AsyncStorage.getItem(key);
  return v ? JSON.parse(v) : fallback;
}

/** 读取本机 attempts -> {domain, categoryId, sublevelId, score, total, timeMs, ts}[] */
async function readLocalAttempts() {
  const idxRaw = await AsyncStorage.getItem('attemptIndex');
  const idx = idxRaw ? JSON.parse(idxRaw) : [];

  const out = [];
  for (const s of idx) {
    try {
      const detailRaw = await AsyncStorage.getItem(`attempt:${s.id}`);
      const detail = detailRaw ? JSON.parse(detailRaw) : null;
      out.push({
        domain: s.kind === 'firstaid' ? 'firstaid' : 'disaster',
        categoryId: String(s.disasterType || s.topic || '—'),
        sublevelId: String(s.subLevel || '—'),
        score: Number(s.score || detail?.score || 0),
        total: Number(s.total || detail?.total || 0),
        timeMs: Number(detail?.timeSpentMs || 0),
        ts: s.created_at || detail?.created_at || new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  }
  return out;
}

/** 读取服务器 attempts（用于通用成就统计/补全） */
async function readServerAttempts() {
  const a = await getHistory('disaster', 200);
  const b = await getHistory('everydayfirstaid', 200);
  const norm = (rows, domain) =>
    (rows || []).map(r => ({
      domain,
      categoryId: String(r.disaster || r.disasterType || r.topic || '—'),
      sublevelId: String(r.sublevel || r.subLevel || '—'),
      score: Number(r.score || 0),
      total: Number.isFinite(r.total) ? Number(r.total) : NaN,
      timeMs: Number.isFinite(r.time_sec) ? r.time_sec * 1000 : 0,
      ts: r.created_at || r.finished_at || new Date().toISOString(),
    }));
  return [...norm(a, 'disaster'), ...norm(b, 'firstaid')];
}

/** 合并（本机优先）+ 去重（domain|category|sub|日） */
function mergeAttempts(localArr, serverArr) {
  const day = (ts) => (ts || '').slice(0, 10);
  const keyOf = (x) => `${x.domain}|${x.categoryId}|${x.sublevelId}|${day(x.ts)}`;
  const map = new Map();
  for (const r of serverArr) map.set(keyOf(r), r);
  for (const r of localArr) map.set(keyOf(r), r); // 覆盖（保留本机的 total/timeMs）
  return Array.from(map.values());
}

/** ===== 对外：写入器 ===== */
export async function logShareOnce() {
  const n = await readNumber(K.shares, 0);
  await AsyncStorage.setItem(K.shares, String(n + 1));
  await bumpStreak();
}
export async function markArticleRead(articleId) {
  const arr = await readArray(K.readIds);
  if (!arr.includes(articleId)) {
    arr.push(articleId);
    await AsyncStorage.setItem(K.readIds, JSON.stringify(arr));
    await bumpStreak();
  }
}
async function bumpStreak() {
  const last = await AsyncStorage.getItem(K.streakLast);
  const today = todayStr();
  if (last === today) return;
  const n = await readNumber(K.streakCount, 0);
  await AsyncStorage.multiSet([[K.streakCount, String(n + 1)], [K.streakLast, today]]);
}

/** ✅ 满分后标记“灾害类子关完成” */
export async function markDisaster10SublevelComplete(disasterType, subLevel) {
  try {
    const data = await readJson(K.disasterCompleted, {});
    const typeKey = String(disasterType);
    const sub = String(subLevel);
    if (!data[typeKey]) data[typeKey] = {};
    data[typeKey][sub] = true;
    await AsyncStorage.setItem(K.disasterCompleted, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('markDisaster10SublevelComplete failed:', e?.message || e);
    return false;
  }
}

/** ✅ 满分后标记“Everyday(FirstAid) 子关完成”
 *  categoryKey：FirstAidResultScreen 用 normalizeToKey(category) 得到的 key
 */
export async function markEverydaySublevelComplete(categoryKey, subLevel) {
  try {
    const data = await readJson(K.everydayCompleted, {});
    const cat = String(categoryKey);
    const sub = String(subLevel);
    if (!data[cat]) data[cat] = {};
    data[cat][sub] = true;
    await AsyncStorage.setItem(K.everydayCompleted, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('markEverydaySublevelComplete failed:', e?.message || e);
    return false;
  }
}

/** ===== 核心：计算成就进度 Map（给 UI 用）=====
 *  First Aid / Disaster 的进度只统计“满分完成集”；
 *  General 的 first/ks5/ks10/ks50 也改为“只有满分才计数”。
 */
export async function computeAchievementProgressMap(opts = {}) {
  const { ignoreServer = false } = opts ?? {};

  // 清空后的短时跳过服务器，确保 UI 立即空
  const wipeTsRaw = await AsyncStorage.getItem(WIPE_SKIP_KEY);
  const now = Date.now();
  const shouldSkipServer = ignoreServer || (wipeTsRaw && (now - Number(wipeTsRaw) < WIPE_SKIP_MS));

  // 1) 作答记录（给 perfect/fast 判定、以及 share/streak/knowledge 之外的参考）
  const local = await readLocalAttempts();
  const server = shouldSkipServer ? [] : (await readServerAttempts());
  const attempts = mergeAttempts(local, server);

  const hasPerfect = attempts.some(a => Number.isFinite(a.total) && a.total > 0 && a.score === a.total);
  const hasFast = attempts.some(a => (a.timeMs || 0) > 0 && a.timeMs <= 20000);

  // 2) “完成集”（只有满分时由结果页写入）
  const dzCompleted = await readJson(K.disasterCompleted, {}); // { Flood: { 'Ⅰ': true }, ... }
  const faCompleted = await readJson(K.everydayCompleted, {}); // { cpr_basics: { 'Ⅰ': true }, ... }

  const countCompleted = (obj) => {
    let subCount = 0;
    const cats = new Set();
    Object.keys(obj).forEach(cat => {
      const subs = obj[cat] || {};
      const n = Object.keys(subs).filter(k => subs[k]).length;
      if (n > 0) cats.add(cat);
      subCount += n;
    });
    return { subCount, catCount: cats.size };
  };
  const dzDone = countCompleted(dzCompleted);
  const faDone = countCompleted(faCompleted);

  // ✅ “满分测验次数” = 两类完成子关之和（你每个子关就是一次 quiz）
  const completedTotal = faDone.subCount + dzDone.subCount;

  // 3) 其它计数
  const shares = await readNumber(K.shares, 0);
  const readIds = await readArray(K.readIds);
  const streak = await readNumber(K.streakCount, 0);

  // 4) 汇总
  const map = {};

  // —— General（改为：只有“满分完成”的测验才计数）
  map['first'] = completedTotal > 0 ? 100 : 0;
  map['ks5']   = percent(completedTotal, 5);
  map['ks10']  = percent(completedTotal, 10);
  map['ks50']  = percent(completedTotal, 50);

  map['perfect1'] = hasPerfect ? 100 : 0;     // 任意一次达成 100%
  map['fast1']    = hasFast ? 100 : 0;        // 任意一次 <= 20s
  map['share1']   = shares > 0 ? 100 : 0;     // 分享过一次

  // —— First Aid：只看“满分完成集”
  map['fa_sub_1']   = percent(faDone.subCount, 1);
  map['fa_sub_10']  = percent(faDone.subCount, 10);
  map['fa_sub_30']  = percent(faDone.subCount, 30);
  map['fa_sub_all'] = percent(faDone.subCount, FIRST_AID_CATS * FIRST_AID_SUBLEVELS_PER_CAT);
  map['fa_cat_1']   = percent(faDone.catCount, 1);
  map['fa_cat_5']   = percent(faDone.catCount, 5);
  map['fa_cat_10']  = percent(faDone.catCount, 10);
  map['fa_cat_all'] = percent(faDone.catCount, FIRST_AID_CATS);

  // —— Disaster：只看“满分完成集”
  map['dz_sub_10']  = percent(dzDone.subCount, 10);
  map['dz_sub_25']  = percent(dzDone.subCount, 25);
  map['dz_sub_all'] = percent(dzDone.subCount, DISASTER_CATS * DISASTER_SUBLEVELS_PER_CAT);
  map['dz_cat_1']   = percent(dzDone.catCount, 1);
  map['dz_cat_3']   = percent(dzDone.catCount, 3);
  map['dz_cat_all'] = percent(dzDone.catCount, DISASTER_CATS);

  // —— Streaks
  map['streak1']  = percent(streak, 1);
  map['streak3']  = percent(streak, 3);
  map['streak7']  = percent(streak, 7);
  map['streak10'] = percent(streak, 10);
  map['streak14'] = percent(streak, 14);
  map['streak30'] = percent(streak, 30);

  // —— Knowledge
  const readCount = readIds.length;
  map['kn1']   = percent(readCount, 1);
  map['kn5']   = percent(readCount, 5);
  map['kn10']  = percent(readCount, 10);
  map['kn15']  = percent(readCount, KNOWLEDGE_TOTAL_ARTICLES);

  // —— 兼容你之前可能使用的别名（可选）
  map['dz_completed_sub'] = percent(dzDone.subCount, DISASTER_CATS * DISASTER_SUBLEVELS_PER_CAT);
  map['dz_completed_cat'] = percent(dzDone.catCount, DISASTER_CATS);
  map['fa_completed_sub'] = percent(faDone.subCount, FIRST_AID_CATS * FIRST_AID_SUBLEVELS_PER_CAT);
  map['fa_completed_cat'] = percent(faDone.catCount, FIRST_AID_CATS);

  return map;
}

/** 记录一次本地作答（供结果页在满分时另外 markXXComplete） */
export async function recordLocalAttempt({ domain, categoryId, sublevelId, score, total, timeMs }) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const created_at = new Date().toISOString();

  const detail = { domain, categoryId, sublevelId, score, total, timeSpentMs: timeMs || 0, created_at };
  await AsyncStorage.setItem(`attempt:${id}`, JSON.stringify(detail));

  const row = {
    id,
    kind: domain === 'firstaid' ? 'firstaid' : 'disaster',
    topic: categoryId,
    disasterType: categoryId,
    subLevel: sublevelId,
    score,
    total,
    created_at,
  };
  const idxRaw = await AsyncStorage.getItem('attemptIndex');
  const idx = idxRaw ? JSON.parse(idxRaw) : [];
  idx.push(row);
  await AsyncStorage.setItem('attemptIndex', JSON.stringify(idx));
}

/** 简单打卡（App 打开时调用） */
export async function touchDailyStreak() {
  await bumpStreak();
}

/** 仅清本地（测试/保留） */
export async function clearAchievementData() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter((k) =>
      k === K.shares ||
      k === K.readIds ||
      k === K.streakCount ||
      k === K.streakLast ||
      k === K.disasterCompleted ||
      k === K.everydayCompleted ||
      k === 'attemptIndex' ||
      k.startsWith('attempt:')
    );
    if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
  } catch (e) {
    console.warn('clearAchievementData failed:', e);
  }
}

/** 清空所有（本地 + 云端）并设置短时跳过服务器 */
export async function clearAchievementDataFull() {
  try {
    // 先写标记，让 UI 这次刷新立刻显示空
    await AsyncStorage.setItem(WIPE_SKIP_KEY, String(Date.now()));

    // 1) 本地
    await clearAchievementData();

    // 2) 云端
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    const userId = userData?.user?.id;
    if (userId) {
      const { error } = await supabase
        .from('quiz_history')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    }

    // 完成后再刷新标记时间（维持 20s 窗口）
    await AsyncStorage.setItem(WIPE_SKIP_KEY, String(Date.now()));
    console.log('✅ 成就数据已清空（本地 + 云端）');
  } catch (e) {
    console.warn('❌ clearAchievementDataFull failed:', e.message || e);
  }
}
