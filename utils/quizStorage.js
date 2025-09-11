// utils/quizStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient';

// Max rows returned (kept in sync with UI)
export const MAX_HISTORY = 200;

// Local fallback storage key per kind
const FB_KEY = (kind) => `quiz_history_fallback_${kind}`;

// tiny helpers
function nowISO() {
  return new Date().toISOString();
}
function uid() {
  // Simple unique id (time + random)
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
async function readFallback(kind) {
  try {
    const raw = await AsyncStorage.getItem(FB_KEY(kind));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
async function writeFallback(kind, row) {
  const list = await readFallback(kind);
  const next = [row, ...list].slice(0, MAX_HISTORY);
  await AsyncStorage.setItem(FB_KEY(kind), JSON.stringify(next));
}
async function clearFallback(kind) {
  await AsyncStorage.removeItem(FB_KEY(kind));
}

// Normalize one history row to match Result screens
function normalizeRow(partial) {
  return {
    id: partial.id ?? uid(),
    kind: partial.kind,
    disaster: partial.disaster ?? partial.disasterType ?? partial.topic ?? '—',
    level: partial.level ?? null,
    sublevel: partial.sublevel ?? partial.subLevel ?? '—',
    score: typeof partial.score === 'string' ? partial.score : Number(partial.score ?? 0),
    created_at:
      partial.created_at ??
      partial.finished_at ??
      partial.finishedAt ??
      partial.timestamp ??
      nowISO(),
    time_sec: partial.time_sec ?? (partial.timeSpentMs ? Math.round(partial.timeSpentMs / 1000) : null),
  };
}

// Insert a row (Supabase first; local fallback)
async function insertHistoryRow({ kind, disaster, level, sublevel, score, time_sec }) {
  const baseRow = normalizeRow({
    kind,
    disaster,
    level,
    sublevel,
    score,
    time_sec,
    created_at: nowISO(),
  });

  // Try server write first
  try {
    const { data: userInfo, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    const user = userInfo?.user;
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('quiz_history').insert({
      user_id: user.id,
      kind: baseRow.kind,
      disaster: baseRow.disaster,
      level: baseRow.level,
      sublevel: baseRow.sublevel,
      score: typeof baseRow.score === 'string' ? baseRow.score : Number(baseRow.score),
      time_sec: baseRow.time_sec,
      created_at: baseRow.created_at, // table default is fine as well
    });

    if (error) throw error;
    // Server ok
    return { ok: true, fallback: false };
  } catch (e) {
    // Server failed → write to local fallback
    await writeFallback(kind, baseRow);
    return { ok: false, fallback: true, error: e };
  }
}

// Public API: log Disaster quiz
/**
 * @param {Object} p
 * @param {string} p.disasterType  - 'Earthquake' | 'Flood' ...
 * @param {string|null} p.level    
 * @param {string} p.subLevel      - 'Ⅰ' | 'Ⅱ' | 'Ⅲ' | 'Ⅳ' ...
 * @param {number} p.score
 * @param {number} p.timeSpentMs
 */
export async function logDisasterResult({ disasterType, level, subLevel, score, timeSpentMs }) {
  const time_sec = Math.round((timeSpentMs || 0) / 1000);
  return insertHistoryRow({
    kind: 'disaster',
    disaster: disasterType,
    level: level ?? null,
    sublevel: subLevel,
    score,
    time_sec,
  });
}

// Public API: log First Aid quiz
/**
 * @param {Object} p
 * @param {string} p.categoryTitle
 * @param {string|null} p.level
 * @param {string} p.subLevel
 * @param {number} p.score
 * @param {number} p.timeSpentMs
 */
export async function logFirstAidResult({ categoryTitle, level, subLevel, score, timeSpentMs }) {
  const time_sec = Math.round((timeSpentMs || 0) / 1000);
  return insertHistoryRow({
    // Canonical kind name for First Aid
    kind: 'firstaid',
    disaster: categoryTitle,
    level: level ?? null,
    sublevel: subLevel,
    score,
    time_sec,
  });
}

// Public API: read history (server + local)
/**
 * @param {'disaster'|'firstaid'|'everydayfirstaid'} kind
 * @param {number} limit
 */
export async function getHistory(kind, limit = 50) {
  const lim = Math.min(limit, MAX_HISTORY);

  // Read both kinds for First Aid to keep legacy data visible
  const kinds = (kind === 'firstaid' || kind === 'everydayfirstaid')
    ? ['firstaid', 'everydayfirstaid']
    : [kind];

  let serverRows = [];
  try {
    const { data: userInfo, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    const user = userInfo?.user;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('quiz_history')
      .select('*')
      .eq('user_id', user.id)
      .in('kind', kinds) // ← read both firstaid & everydayfirstaid
      .order('created_at', { ascending: false })
      .limit(lim);

    if (error) throw error;

    serverRows = (data || []).map((r) =>
      normalizeRow({
        ...r,
        score: r.score,
      })
    );
  } catch (_) {
    serverRows = [];
  }

  // Read local fallbacks (both kinds)
  const localBuckets = await Promise.all(kinds.map((k) => readFallback(k)));
  const localRows = localBuckets.flat().map(normalizeRow);

  // Merge & de-duplicate
  const keyOf = (x) => `${x.created_at}|${x.disaster}|${x.sublevel}|${x.score}`;
  const map = new Map();
  [...serverRows, ...localRows].forEach((row) => {
    const k = keyOf(row);
    if (!map.has(k)) map.set(k, row);
  });

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return merged.slice(0, lim);
}

// Public API: clear history (server + local)
export async function clearHistory(kind) {
  // Clear local fallbacks
  const kinds = (kind === 'firstaid' || kind === 'everydayfirstaid')
    ? ['firstaid', 'everydayfirstaid']
    : [kind];
  for (const k of kinds) {
    await clearFallback(k);
  }

  // Attempt server delete
  try {
    const { data: userInfo, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    const user = userInfo?.user;
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('quiz_history')
      .delete()
      .eq('user_id', user.id)
      .in('kind', kinds); // delete both

    if (error) throw error;
  } catch {
    // Ignore server errors; local clear already succeeded
  }
}
