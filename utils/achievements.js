// utils/achievements.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const FIRST_AID_CATS = 5 + 10;              // Total First Aid categories 
const FIRST_AID_SUBLEVELS_PER_CAT = 4;      // 4 sublevels per First Aid category
const DISASTER_CATS = 5;                    // Total Disaster categories
const DISASTER_SUBLEVELS_PER_CAT = 10;      // 10 sublevels per Disaster category
const KNOWLEDGE_TOTAL_ARTICLES = 15;        // Total articles

//Storage Keys
const K = {
  shares: 'progress.shares',
  readIds: 'knowledge.readIds',
  streakCount: 'streak.count',
  streakLast: 'streak.lastActive',
  disasterCompleted: 'progress.disaster.completed',   // { [disasterType]: { [subLevel]: true } }
  everydayCompleted: 'progress.everyday.completed',   // { [categoryKey]:  { [subLevel]: true } }
};

// Helpers
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

// Local attempts: read summaries + resolve details
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
        categoryId: String(s.disasterType || s.topic || s.disaster || '—'),
        sublevelId: String(s.subLevel || s.sublevel || '—'),
        score: Number(s.score ?? detail?.score ?? 0),
        total: Number(s.total ?? detail?.total ?? 0),
        timeMs: Number(detail?.timeSpentMs ?? 0),
        ts: s.created_at || detail?.created_at || new Date().toISOString(),
      });
    } catch {
      // ignore a single corrupted entry
    }
  }
  return out;
}

// Record a local attempt (results screens can also call markXXComplete on PERFECT).
export async function recordLocalAttempt({ domain, categoryId, sublevelId, score, total, timeMs }) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const created_at = new Date().toISOString();

  const detail = {
    domain, categoryId, sublevelId,
    score: Number(score || 0),
    total: Number(total || 0),
    timeSpentMs: Number(timeMs || 0),
    created_at,
  };
  await AsyncStorage.setItem(`attempt:${id}`, JSON.stringify(detail));

  const row = {
    id,
    kind: domain === 'firstaid' ? 'firstaid' : 'disaster',
    topic: categoryId,
    disasterType: categoryId,
    subLevel: sublevelId,
    score: Number(score || 0),
    total: Number(total || 0),
    created_at,
  };
  const idxRaw = await AsyncStorage.getItem('attemptIndex');
  const idx = idxRaw ? JSON.parse(idxRaw) : [];
  idx.push(row);
  await AsyncStorage.setItem('attemptIndex', JSON.stringify(idx));
}

// Increment share counter
export async function logShareOnce() {
  const n = await readNumber(K.shares, 0);
  await AsyncStorage.setItem(K.shares, String(n + 1));
  await bumpStreak();
}

// Mark an article as read
export async function markArticleRead(articleId) {
  const arr = await readArray(K.readIds);
  if (!arr.includes(articleId)) {
    arr.push(articleId);
    await AsyncStorage.setItem(K.readIds, JSON.stringify(arr));
    await bumpStreak();
  }
}

// Internal: bump the streak if last-active != today
async function bumpStreak() {
  const last = await AsyncStorage.getItem(K.streakLast);
  const today = todayStr();
  if (last === today) return;
  const n = await readNumber(K.streakCount, 0);
  await AsyncStorage.multiSet([
    [K.streakCount, String(n + 1)],
    [K.streakLast, today],
  ]);
}

//  Home “Check-in” button: explicit daily streak bump
export async function checkInToday() {
  const last = await AsyncStorage.getItem(K.streakLast);
  const today = todayStr();
  if (last === today) return { ok: false, message: 'Already checked in today' };
  const n = await readNumber(K.streakCount, 0);
  await AsyncStorage.multiSet([
    [K.streakCount, String(n + 1)],
    [K.streakLast, today],
  ]);
  return { ok: true, message: 'Checked in!' };
}

// App-start “passive check-in”
export async function touchDailyStreak() {
  await bumpStreak();
}

// mark a Disaster sublevel as completed
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

// mark an Everyday (First Aid) sublevel as completed.
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

// Compute achievement progress map
export async function computeAchievementProgressMap() {
  // 1) Attempts: detect any perfect / any fast
  const attempts = await readLocalAttempts();
  const hasPerfect = attempts.some(a => Number.isFinite(a.total) && a.total > 0 && a.score === a.total);
  const hasFast = attempts.some(a => (a.timeMs || 0) > 0 && a.timeMs <= 20000);

  // 2) Sets of PERFECT completions
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

  // Total perfect quizzes
  const completedTotal = faDone.subCount + dzDone.subCount;

  // 3) Other counters
  const shares = await readNumber(K.shares, 0);
  const readIds = await readArray(K.readIds);
  const streak = await readNumber(K.streakCount, 0);

  // 4) Aggregate progress map
  const map = {};

  // —— General
  map['first'] = completedTotal > 0 ? 100 : 0;
  map['ks5']   = percent(completedTotal, 5);
  map['ks10']  = percent(completedTotal, 10);
  map['ks50']  = percent(completedTotal, 50);

  map['perfect1'] = hasPerfect ? 100 : 0;     // At least one perfect quiz
  map['fast1']    = hasFast ? 100 : 0;        // Any quiz done in ≤ 20s
  map['share1']   = shares > 0 ? 100 : 0;     // Shared at least once

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

  // Backward
  map['dz_completed_sub'] = percent(dzDone.subCount, DISASTER_CATS * DISASTER_SUBLEVELS_PER_CAT);
  map['dz_completed_cat'] = percent(dzDone.catCount, DISASTER_CATS);
  map['fa_completed_sub'] = percent(faDone.subCount, FIRST_AID_CATS * FIRST_AID_SUBLEVELS_PER_CAT);
  map['fa_completed_cat'] = percent(faDone.catCount, FIRST_AID_CATS);

  return map;
}

// Full local reset
export async function clearAchievementDataFull() {
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
      k.startsWith('attempt:') ||
      k.startsWith('quiz_history_fallback_')
    );
    if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
  } catch (e) {
    console.warn('clearAchievementDataFull failed:', e?.message || e);
  }
}

// Back-compat alias: same as Full local reset.
export const clearAchievementData = clearAchievementDataFull;

// Export keys if needed (debug/tools)
export const __ACH_KEYS__ = K;
