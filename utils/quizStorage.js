// utils/quizStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const MAX_HISTORY = 200;
const FB_KEY = (kind) => `quiz_history_fallback_${kind}`;

// Small helpers
function nowISO() { return new Date().toISOString(); }
function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

// Low-level local read/write
async function readFallback(kind) {
  try {
    const raw = await AsyncStorage.getItem(FB_KEY(kind));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
async function writeFallback(kind, row) {
  const list = await readFallback(kind);
  const next = [row, ...list].slice(0, MAX_HISTORY);
  await AsyncStorage.setItem(FB_KEY(kind), JSON.stringify(next));
}
async function clearFallback(kind) {
  await AsyncStorage.removeItem(FB_KEY(kind));
}

// Normalize a row coming from various callers/versions into a stable shape.
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

// Log a Disaster quiz result
export async function logDisasterResult({ disasterType, level, subLevel, score, timeSpentMs }) {
  const row = normalizeRow({
    kind: 'disaster',
    disaster: disasterType,
    level: level ?? null,
    sublevel: subLevel,
    score,
    timeSpentMs,
  });
  await writeFallback('disaster', row);
  return { ok: true, fallback: true };
}

// Log a First Aid quiz result
export async function logFirstAidResult({ categoryTitle, level, subLevel, score, timeSpentMs }) {
  const row = normalizeRow({
    kind: 'firstaid',
    disaster: categoryTitle,
    level: level ?? null,
    sublevel: subLevel,
    score,
    timeSpentMs,
  });
  await writeFallback('firstaid', row);
  return { ok: true, fallback: true };
}

// Read history from local storage
export async function getHistory(kind, limit = 50) {
  const lim = Math.min(limit, MAX_HISTORY);
  const kinds = (kind === 'firstaid' || kind === 'everydayfirstaid')
    ? ['firstaid', 'everydayfirstaid']
    : [kind];

  const localBuckets = await Promise.all(kinds.map((k) => readFallback(k)));
  const rows = localBuckets.flat().map(normalizeRow);

  const keyOf = (x) => `${x.created_at}|${x.disaster}|${x.sublevel}|${x.score}`;
  const map = new Map();
  rows.forEach((row) => {
    const k = keyOf(row);
    if (!map.has(k)) map.set(k, row);
  });

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  return merged.slice(0, lim);
}

// Clear local history for a given kind
export async function clearHistory(kind) {
  const kinds = (kind === 'firstaid' || kind === 'everydayfirstaid')
    ? ['firstaid', 'everydayfirstaid']
    : [kind];
  for (const k of kinds) await clearFallback(k);
}
