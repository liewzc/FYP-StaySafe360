// utils/quizStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient';

// 最大返回条数（与 UI 兼容）
export const MAX_HISTORY = 200;

// 本地兜底 key
const FB_KEY = (kind) => `quiz_history_fallback_${kind}`;

/** ---- 工具函数 ---- */
function nowISO() {
  return new Date().toISOString();
}
function uid() {
  // 简单唯一 id
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

/**
 * 标准化一条记录，字段与 ResultScreen 展示对齐：
 * id, kind, disaster, level, sublevel, score, created_at
 */
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

/** ----------------- 写入一条记录（优先 Supabase，失败落本地） ----------------- */
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

  // 先尝试服务端写入
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
      created_at: baseRow.created_at, // 若表有默认值也没关系
    });

    if (error) throw error;
    // Server 写入成功
    return { ok: true, fallback: false };
  } catch (e) {
    // 服务端失败：本地兜底
    await writeFallback(kind, baseRow);
    return { ok: false, fallback: true, error: e };
  }
}

/** ----------------- 公开 API：记录灾害测验 ----------------- */
/**
 * @param {Object} p
 * @param {string} p.disasterType  - 'Earthquake' | 'Flood' ...
 * @param {string|null} p.level    - 可为 null（本流程无难度分级）
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

/** ----------------- 公开 API：记录急救测验（First Aid） ----------------- */
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
    // ✅ Canonical kind name for First Aid
    kind: 'firstaid',
    disaster: categoryTitle,
    level: level ?? null,
    sublevel: subLevel,
    score,
    time_sec,
  });
}

/** ----------------- 公开 API：读取历史（合并服务端 + 本地） ----------------- */
/**
 * @param {'disaster'|'firstaid'|'everydayfirstaid'} kind
 * @param {number} limit
 */
export async function getHistory(kind, limit = 50) {
  const lim = Math.min(limit, MAX_HISTORY);

  // ✅ Read both kinds for First Aid to keep legacy data visible
  const kinds = (kind === 'firstaid' || kind === 'everydayfirstaid')
    ? ['firstaid', 'everydayfirstaid']
    : [kind];

  let serverRows = [];
  // 先尝试拉取服务端
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

  // 读取本地兜底（两种 kind 都读）
  const localBuckets = await Promise.all(kinds.map((k) => readFallback(k)));
  const localRows = localBuckets.flat().map(normalizeRow);

  // 合并去重（按 created_at & disaster & sublevel & score 粗略去重）
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

/** ----------------- 公开 API：清空某类历史（服务端 + 本地） ----------------- */
export async function clearHistory(kind) {
  // ✅ 清空本地兜底（两种 kind 都清）
  const kinds = (kind === 'firstaid' || kind === 'everydayfirstaid')
    ? ['firstaid', 'everydayfirstaid']
    : [kind];
  for (const k of kinds) {
    await clearFallback(k);
  }

  // 再尝试清服务端
  try {
    const { data: userInfo, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    const user = userInfo?.user;
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('quiz_history')
      .delete()
      .eq('user_id', user.id)
      .in('kind', kinds); // ← delete both

    if (error) throw error;
  } catch {
    // 忽略服务端错误（离线/未登录时依然能清本地）
  }
}
