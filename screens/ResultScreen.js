// screens/ResultScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Platform
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // ✅ 安全区
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRIMARY = '#0b6fb8';
const MUTED = '#6b7280';
const CARD_BG = '#ffffff';
const CARD_BORDER = '#e6f1fb';

export default function ResultScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets(); // ✅
  const [attemptIndex, setAttemptIndex] = useState([]); // 本机作答索引（含 disaster / firstaid）
  const [tab, setTab] = useState('disaster');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();

  /** 校验 attempt 详情是否有效（有意义的详情才保留） */
  const isValidDetail = useCallback((detailObj) => {
    if (!detailObj || typeof detailObj !== 'object') return false;
    // 必须存在基本字段
    if (!detailObj.id || !detailObj.kind) return false;
    // 分数要是数字
    if (!Number.isFinite(Number(detailObj.score))) return false;
    // 要求有 answers 且非空（你提到“进去是空数据”，这里直接判空）
    if (!Array.isArray(detailObj.answers) || detailObj.answers.length === 0) return false;
    return true;
  }, []);

  /** 读取索引 -> 批量拉取详情 -> 过滤无详情 -> 自动清理孤儿 */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const idxRaw = await AsyncStorage.getItem('attemptIndex');
      const idx = idxRaw ? JSON.parse(idxRaw) : [];

      if (!Array.isArray(idx) || idx.length === 0) {
        setAttemptIndex([]);
        return;
      }

      // 批量获取 attempt 详情
      const keys = idx.map(it => `attempt:${it.id}`);
      const pairs = await AsyncStorage.multiGet(keys);

      // 建立 id -> detail 的映射
      const detailMap = new Map();
      for (const [k, v] of pairs) {
        if (!k) continue;
        const id = k.startsWith('attempt:') ? k.slice('attempt:'.length) : k;
        try {
          detailMap.set(id, v ? JSON.parse(v) : null);
        } catch {
          detailMap.set(id, null);
        }
      }

      // 过滤：只保留有详情且有效的项
      const keep = [];
      const toRemoveKeys = []; // 需要删除的 attempt 详情键
      for (const it of idx) {
        const detail = detailMap.get(it.id) || null;
        if (isValidDetail(detail)) {
          keep.push(it);
        } else {
          // 详情无效/缺失：删除对应的 attempt:<id>，并从索引剔除
          toRemoveKeys.push(`attempt:${it.id}`);
        }
      }

      // 如有孤儿，做一次“索引与详情”的清理
      if (toRemoveKeys.length > 0) {
        // 先删孤儿详情键（不存在也无害）
        await AsyncStorage.multiRemove(toRemoveKeys);
        // 回写干净后的索引（可能为空）
        if (keep.length > 0) {
          await AsyncStorage.setItem('attemptIndex', JSON.stringify(keep));
        } else {
          await AsyncStorage.removeItem('attemptIndex');
        }
      }

      setAttemptIndex(keep);
    } catch (err) {
      console.error('❌ Failed to load attempts:', err);
      setAttemptIndex([]); // 出错也不要卡住
    } finally {
      setLoading(false);
    }
  }, [isValidDetail]);

  useEffect(() => { if (isFocused) loadData(); }, [isFocused, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const attemptsDisaster = useMemo(
    () => attemptIndex.filter(x => x?.kind === 'disaster')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [attemptIndex]
  );
  const attemptsFirstAid = useMemo(
    () => attemptIndex.filter(x => x?.kind === 'firstaid')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [attemptIndex]
  );

  const isEmptyAttemptsDisaster = attemptsDisaster.length === 0;
  const isEmptyAttemptsFirstAid = attemptsFirstAid.length === 0;

  // 仅删除本机 attempts（attempt:* 与 attemptIndex）
  async function clearLocal(kind /* 'disaster' | 'firstaid' | 'all' */) {
    try {
      const idxRaw = await AsyncStorage.getItem('attemptIndex');
      const idx = idxRaw ? JSON.parse(idxRaw) : [];

      const shouldRemove = (it) => {
        if (kind === 'all') return true;
        return it?.kind !== undefined ? it.kind === kind : false;
      };

      const toDelete = idx.filter(shouldRemove);
      const keep = idx.filter(it => !shouldRemove(it));

      // 删除 attempt:<id> 详情
      const attemptKeys = toDelete.map(it => `attempt:${it.id}`);
      const keysToRemove = ['attemptIndex', ...attemptKeys];
      await AsyncStorage.multiRemove(keysToRemove);

      // 重新写入保留的索引
      if (keep.length) {
        await AsyncStorage.setItem('attemptIndex', JSON.stringify(keep));
      }

      await loadData();
    } catch (e) {
      console.error('❌ Clear local attempts failed:', e);
    }
  }

  const handleClearAll = () =>
    Alert.alert('Clear all local attempts?', 'This will delete all local results (both Disaster and First Aid).', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => clearLocal('all') },
    ]);

  const handleClearTab = () => {
    const label = tab === 'disaster' ? 'Disaster' : 'First Aid';
    Alert.alert(`Clear ${label} local attempts?`, `This will delete all local ${label} results.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => clearLocal(tab) },
    ]);
  };

  if (loading) {
    return (
      <View style={[
        styles.page,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }
      ]}>
        <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={[
      styles.page,
      {
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }
    ]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={[styles.container, { paddingBottom: 28 }]}
      >
        <Text style={styles.title}>Results</Text>

        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentBtn, tab === 'disaster' && styles.segmentActive]}
            onPress={() => setTab('disaster')}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, tab === 'disaster' && styles.segmentTextActive]}>🌪️ Disaster</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, tab === 'firstaid' && styles.segmentActive]}
            onPress={() => setTab('firstaid')}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, tab === 'firstaid' && styles.segmentTextActive]}>⛑️ First Aid</Text>
          </TouchableOpacity>
        </View>

        {/* 只保留：This device attempts (with details) */}
        <Text style={styles.sectionTitle}>This device attempts (with details)</Text>

        {tab === 'disaster' ? (
          isEmptyAttemptsDisaster ? (
            <Empty text="No local attempts yet." />
          ) : (
            attemptsDisaster.map((a) => (
              <Card
                key={a.id}
                title={a.disasterType ?? '—'}
                sublevel={a.subLevel ?? '—'}
                score={a.score}
                total={a.total}
                time={new Date(a.created_at).toLocaleString()}
                emoji={pickEmoji({ disaster: a.disasterType }, false)}
                accent="#0ea5e9"
                onPressDetails={() => navigation.navigate('AttemptDetail', { attemptId: a.id })}
              />
            ))
          )
        ) : (
          isEmptyAttemptsFirstAid ? (
            <Empty text="No local attempts yet." />
          ) : (
            attemptsFirstAid.map((a) => (
              <Card
                key={a.id}
                title={a.disasterType ?? '—'}
                sublevel={a.subLevel ?? '—'}
                score={a.score}
                total={a.total}
                time={new Date(a.created_at).toLocaleString()}
                emoji={pickEmoji({ disaster: a.disasterType }, true)}
                accent="#22c55e"
                onPressDetails={() => navigation.navigate('AttemptDetail', { attemptId: a.id })}
              />
            ))
          )
        )}

        {/* 仅针对本机 attempts 的清除按钮 */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.btnGhost} onPress={handleClearTab} activeOpacity={0.9}>
            <Text style={styles.btnGhostText}>
              {tab === 'disaster' ? 'Clear Disaster Only' : 'Clear First Aid Only'}
            </Text>
          </TouchableOpacity>
        </View>

        {attemptIndex.length > 0 && (
          <TouchableOpacity style={styles.btnDanger} onPress={handleClearAll} activeOpacity={0.9}>
            <Text style={styles.btnDangerText}>Clear All Local Attempts</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

/** —— UI 组件 —— */
function Card({ title, sublevel, score, total, time, emoji, accent = PRIMARY, onPressDetails }) {
  const scoreNum = typeof score === 'number' ? score : Number(score);
  const totalNum = typeof total === 'number' ? total : NaN;
  const textDisplay = Number.isFinite(scoreNum) ? (Number.isFinite(totalNum) ? `${scoreNum}/${totalNum}` : String(scoreNum)) : '—';
  const scoreBadgeStyle = getScoreBadgeStyle(
    Number.isFinite(scoreNum) && Number.isFinite(totalNum) ? Math.round((scoreNum / totalNum) * 10) : scoreNum
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardTitleWrap}>
          <Text style={[styles.cardEmoji, { marginRight: 8 }]}>{emoji}</Text>
          <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
        </View>

        <View style={[styles.badge, scoreBadgeStyle.container]}>
          <Text style={[styles.badgeText, scoreBadgeStyle.text]}>{textDisplay}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Row label="Sublevel" value={sublevel} />
      <Row label="Time" value={time} />

      {onPressDetails && (
        <TouchableOpacity style={styles.btnView} onPress={onPressDetails} activeOpacity={0.9}>
          <Text style={styles.btnViewText}>🔎 View details</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.cardAccent, { backgroundColor: accent }]} />
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Empty({ text }) {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

/** —— 工具 —— */
function getScoreBadgeStyle(score) {
  if (!Number.isFinite(score)) return { container: { backgroundColor: '#e5e7eb' }, text: { color: '#374151' } };
  if (score >= 8) return { container: { backgroundColor: '#dcfce7', borderColor: '#86efac', borderWidth: 1 }, text: { color: '#166534', fontWeight: '800' } };
  if (score >= 6) return { container: { backgroundColor: '#fff7ed', borderColor: '#fed7aa', borderWidth: 1 }, text: { color: '#9a3412', fontWeight: '800' } };
  return { container: { backgroundColor: '#fee2e2', borderColor: '#fca5a5', borderWidth: 1 }, text: { color: '#7f1d1d', fontWeight: '800' } };
}

function pickEmoji(item, isFirstAid) {
  const name = String(item?.disaster ?? item?.topic ?? '').toLowerCase();
  if (isFirstAid) {
    if (name.includes('burn') || name.includes('scald')) return '🔥';
    if (name.includes('bleed') || name.includes('cut')) return '🩸';
    if (name.includes('cpr') || name.includes('choking')) return '🫁';
    if (name.includes('fracture') || name.includes('sprain')) return '🦴';
    if (name.includes('heat')) return '🌡️';
    return '⛑️';
  }
  if (name.includes('flood')) return '🌊';
  if (name.includes('storm') || name.includes('lightning')) return '🌩️';
  if (name.includes('haze') || name.includes('air')) return '🌫️';
  if (name.includes('heat')) return '🌡️';
  if (name.includes('coastal') || name.includes('tide')) return '🌊';
  return '🌐';
}

/** —— 样式 —— */
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' }, // ✅ 外层容器，结合安全区 padding
  container: { paddingHorizontal: 16, backgroundColor: '#f6f8fb', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: 6, marginBottom: 14, color: '#0f172a' },
  sectionTitle: { fontSize: 14, color: '#475569', fontWeight: '800', marginBottom: 8, marginTop: 2, textTransform: 'uppercase' },

  segment: { flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 12, padding: 4, marginBottom: 14 },
  segmentBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  segmentActive: {
    backgroundColor: '#fff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 }
    }),
  },
  segmentText: { fontSize: 15, fontWeight: '600', color: MUTED },
  segmentTextActive: { color: PRIMARY, fontWeight: '800' },

  card: {
    backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 16,
    padding: 14, marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 1.5 }
    }),
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitleWrap: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  cardEmoji: { fontSize: 18 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', flexShrink: 1 },

  badge: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#eef2f7', marginVertical: 10 },

  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  rowLabel: { color: MUTED, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  rowValue: { color: '#0f172a', fontSize: 14, fontWeight: '600', marginLeft: 12, maxWidth: '65%' },

  btnView: { marginTop: 10, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: PRIMARY, backgroundColor: '#fff' },
  btnViewText: { color: PRIMARY, fontWeight: '800' },

  cardAccent: { height: 4, borderRadius: 999, marginTop: 10, opacity: 0.85 },

  emptyBox: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 8 },
  emptyText: { color: MUTED, fontSize: 14 },

  actionsRow: { marginTop: 6, marginBottom: 12, alignItems: 'center' },
  btnGhost: { borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18, alignItems: 'center', marginTop: 6, backgroundColor: '#ffffff' },
  btnGhostText: { color: PRIMARY, fontWeight: '700', fontSize: 14 },

  btnDanger: { backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  btnDangerText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
