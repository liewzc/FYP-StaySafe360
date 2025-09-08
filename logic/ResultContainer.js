// logic/ResultContainer.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import ResultScreen from '../screens/ResultScreen';

export default function ResultContainer() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attemptIndex, setAttemptIndex] = useState([]);
  const [detailsById, setDetailsById] = useState({}); // <- keep details for score normalization

  const isValidDetail = useCallback((detailObj) => {
    if (!detailObj || typeof detailObj !== 'object') return false;
    if (!detailObj.id || !detailObj.kind) return false;
    // allow either explicit scores OR an answers array
    const hasExplicit = Number.isFinite(Number(detailObj.score)) || Number.isFinite(Number(detailObj.percentage));
    const hasAnswers = Array.isArray(detailObj.answers) && detailObj.answers.length > 0;
    return hasExplicit || hasAnswers;
  }, []);

  // normalize score/total from detail (fallback to index if needed)
  const normalizeScore = (detail, idx) => {
    // 1) percentage 0..100
    if (Number.isFinite(Number(detail?.percentage))) {
      return { score: Math.round(Number(detail.percentage)), total: 100 };
    }
    // 2) explicit score/total
    if (Number.isFinite(Number(detail?.score)) && Number.isFinite(Number(detail?.total))) {
      return { score: Number(detail.score), total: Number(detail.total) };
    }
    // 3) derive from answers correctness
    if (Array.isArray(detail?.answers) && detail.answers.length > 0) {
      const correct = detail.answers.filter(a => a?.correct === true || a?.isCorrect === true).length;
      return { score: correct, total: detail.answers.length };
    }
    // 4) fallback to what was in the index (may be 0/100)
    if (Number.isFinite(Number(idx?.score)) && Number.isFinite(Number(idx?.total))) {
      return { score: Number(idx.score), total: Number(idx.total) };
    }
    return { score: 0, total: 100 };
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const idxRaw = await AsyncStorage.getItem('attemptIndex');
      const idx = idxRaw ? JSON.parse(idxRaw) : [];
      if (!Array.isArray(idx) || idx.length === 0) {
        setAttemptIndex([]);
        setDetailsById({});
        return;
      }

      const keys = idx.map(it => `attempt:${it.id}`);
      const pairs = await AsyncStorage.multiGet(keys);

      const byId = {};
      const detailMap = new Map();
      for (const [k, v] of pairs) {
        if (!k) continue;
        const id = k.startsWith('attempt:') ? k.slice('attempt:'.length) : k;
        let parsed = null;
        try { parsed = v ? JSON.parse(v) : null; } catch {}
        byId[id] = parsed;
        detailMap.set(id, parsed);
      }

      const keep = [];
      const toRemoveKeys = [];
      for (const it of idx) {
        const detail = detailMap.get(it.id) || null;
        if (isValidDetail(detail)) keep.push(it);
        else toRemoveKeys.push(`attempt:${it.id}`);
      }

      if (toRemoveKeys.length > 0) {
        await AsyncStorage.multiRemove(toRemoveKeys);
        if (keep.length > 0) await AsyncStorage.setItem('attemptIndex', JSON.stringify(keep));
        else await AsyncStorage.removeItem('attemptIndex');
      }

      setAttemptIndex(keep);
      setDetailsById(byId);
    } catch (err) {
      console.error('❌ Failed to load attempts:', err);
      setAttemptIndex([]);
      setDetailsById({});
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

  // Enrich items with normalized score/total and better titles from detail (if present)
  const present = useCallback((it) => {
    const detail = detailsById[it.id];
    const { score, total } = normalizeScore(detail, it);
    return {
      ...it,
      score,
      total,
      disasterType: it.disasterType ?? detail?.disasterType ?? detail?.topic ?? '—',
      subLevel: it.subLevel ?? detail?.subLevel ?? detail?.level ?? '—',
    };
  }, [detailsById]);

  const attemptsDisaster = useMemo(
    () => attemptIndex
      .filter(x => x?.kind === 'disaster')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(present),
    [attemptIndex, present]
  );

  const attemptsFirstAid = useMemo(
    () => attemptIndex
      .filter(x => x?.kind === 'firstaid')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(present),
    [attemptIndex, present]
  );

  const clearLocal = useCallback(async (kind /* 'disaster' | 'firstaid' | 'all' */) => {
    try {
      const idxRaw = await AsyncStorage.getItem('attemptIndex');
      const idx = idxRaw ? JSON.parse(idxRaw) : [];

      const shouldRemove = (it) => kind === 'all' ? true : (it?.kind === kind);
      const toDelete = idx.filter(shouldRemove);
      const keep = idx.filter(it => !shouldRemove(it));

      const attemptKeys = toDelete.map(it => `attempt:${it.id}`);
      const keysToRemove = ['attemptIndex', ...attemptKeys];
      await AsyncStorage.multiRemove(keysToRemove);

      if (keep.length) await AsyncStorage.setItem('attemptIndex', JSON.stringify(keep));
      await loadData();
    } catch (e) {
      console.error('❌ Clear local attempts failed:', e);
    }
  }, [loadData]);

  const onOpenAttemptDetail = useCallback((attemptId) => {
    navigation.navigate('AttemptDetail', { attemptId });
  }, [navigation]);

  return (
    <ResultScreen
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      attemptsDisaster={attemptsDisaster}
      attemptsFirstAid={attemptsFirstAid}
      onOpenAttemptDetail={onOpenAttemptDetail}
      onClearAll={() => clearLocal('all')}
      onClearKind={(k) => clearLocal(k)}
    />
  );
}
