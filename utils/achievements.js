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

// After a full wipe, temporarily skip server reads so the UI renders "empty" immediately
const WIPE_SKIP_KEY = 'progress.wipe.skipServer'; // number (ms)
const WIPE_SKIP_MS  = 20 * 1000;

// Storage keys
const K = {
  shares: 'progress.shares',// number of times result shared
  readIds: 'knowledge.readIds',// array of read article ids
  streakCount: 'streak.count',// day count
  streakLast: 'streak.lastActive',// YYYY-MM-DD string

  // Written only on perfect scores
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

// attempts -> {domain, categoryId, sublevelId, score, total, timeMs, ts}[]
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

// Read attempts from server
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

// Merge local + server attempts
function mergeAttempts(localArr, serverArr) {
  const day = (ts) => (ts || '').slice(0, 10);
  const keyOf = (x) => `${x.domain}|${x.categoryId}|${x.sublevelId}|${day(x.ts)}`;
  const map = new Map();
  for (const r of serverArr) map.set(keyOf(r), r);
  for (const r of localArr) map.set(keyOf(r), r); 
  return Array.from(map.values());
}

// Public writers
export async function logShareOnce() {
  const n = await readNumber(K.shares, 0);
  await AsyncStorage.setItem(K.shares, String(n + 1));
  await bumpStreak();
}
// Mark a knowledge article as read (idempotent) and bump streak
export async function markArticleRead(articleId) {
  const arr = await readArray(K.readIds);
  if (!arr.includes(articleId)) {
    arr.push(articleId);
    await AsyncStorage.setItem(K.readIds, JSON.stringify(arr));
    await bumpStreak();
  }
}
// Daily streak bookkeeping
async function bumpStreak() {
  const last = await AsyncStorage.getItem(K.streakLast);
  const today = todayStr();
  if (last === today) return;
  const n = await readNumber(K.streakCount, 0);
  await AsyncStorage.multiSet([[K.streakCount, String(n + 1)], [K.streakLast, today]]);
}

// Mark a Disaster sublevel as completed
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

// Mark an Everyday First Aid sublevel as completed
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

// Compute the full achievement progress map for the UI
export async function computeAchievementProgressMap(opts = {}) {
  const { ignoreServer = false } = opts ?? {};

  // After a full wipe, optionally skip server to ensure immediate empty UI
  const wipeTsRaw = await AsyncStorage.getItem(WIPE_SKIP_KEY);
  const now = Date.now();
  const shouldSkipServer = ignoreServer || (wipeTsRaw && (now - Number(wipeTsRaw) < WIPE_SKIP_MS));

  // 1) Gather attempts (used for perfect/fast, beyond completion sets)
  const local = await readLocalAttempts();
  const server = shouldSkipServer ? [] : (await readServerAttempts());
  const attempts = mergeAttempts(local, server);

  const hasPerfect = attempts.some(a => Number.isFinite(a.total) && a.total > 0 && a.score === a.total);
  const hasFast = attempts.some(a => (a.timeMs || 0) > 0 && a.timeMs <= 20000);

  // 2) Completion sets (written only on perfect scores by result pages)
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

  // One perfect sublevel equals one completed quiz for General milestones
  const completedTotal = faDone.subCount + dzDone.subCount;

  // 3) Other counters
  const shares = await readNumber(K.shares, 0);
  const readIds = await readArray(K.readIds);
  const streak = await readNumber(K.streakCount, 0);

  // 4) Build progress map
  const map = {};

  // —— General
  map['first'] = completedTotal > 0 ? 100 : 0;
  map['ks5']   = percent(completedTotal, 5);
  map['ks10']  = percent(completedTotal, 10);
  map['ks50']  = percent(completedTotal, 50);

  map['perfect1'] = hasPerfect ? 100 : 0;   
  map['fast1']    = hasFast ? 100 : 0;      
  map['share1']   = shares > 0 ? 100 : 0;    

  // —— First Aid
  map['fa_sub_1']   = percent(faDone.subCount, 1);
  map['fa_sub_10']  = percent(faDone.subCount, 10);
  map['fa_sub_30']  = percent(faDone.subCount, 30);
  map['fa_sub_all'] = percent(faDone.subCount, FIRST_AID_CATS * FIRST_AID_SUBLEVELS_PER_CAT);
  map['fa_cat_1']   = percent(faDone.catCount, 1);
  map['fa_cat_5']   = percent(faDone.catCount, 5);
  map['fa_cat_10']  = percent(faDone.catCount, 10);
  map['fa_cat_all'] = percent(faDone.catCount, FIRST_AID_CATS);

  // —— Disaster
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

  map['dz_completed_sub'] = percent(dzDone.subCount, DISASTER_CATS * DISASTER_SUBLEVELS_PER_CAT);
  map['dz_completed_cat'] = percent(dzDone.catCount, DISASTER_CATS);
  map['fa_completed_sub'] = percent(faDone.subCount, FIRST_AID_CATS * FIRST_AID_SUBLEVELS_PER_CAT);
  map['fa_completed_cat'] = percent(faDone.catCount, FIRST_AID_CATS);

  return map;
}

// Record a local attempt (detail + index row)
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

// Simple daily check-in
export async function touchDailyStreak() {
  await bumpStreak();
}

// Local-only clear (testing / keep data server-side)
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

// Full clear (local + server) and set a short-lived "skip server" flag
export async function clearAchievementDataFull() {
  try {
    await AsyncStorage.setItem(WIPE_SKIP_KEY, String(Date.now()));

    // 1) Local
    await clearAchievementData();

    // 2) Server (delete from supabase 'quiz_history' for the current user)
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

    // Refresh the flag timestamp to keep the 20s window
    await AsyncStorage.setItem(WIPE_SKIP_KEY, String(Date.now()));
    console.log('✅ 成就数据已清空（本地 + 云端）');
  } catch (e) {
    console.warn('❌ clearAchievementDataFull failed:', e.message || e);
  }
}
