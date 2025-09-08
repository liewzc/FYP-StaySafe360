// logic/AchievementGalleryContainer.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import AchievementGalleryScreen from '../screens/achievements/AchievementGalleryScreen';
import { computeAchievementProgressMap, clearAchievementDataFull } from '../utils/achievements';
import { ACHIEVEMENTS } from '../assets/achievement/achievementsCatalog';

export default function AchievementGalleryContainer() {
  const series = useMemo(
    () => ['All', ...Array.from(new Set(ACHIEVEMENTS.map(a => a.series)))],
    []
  );

  const [activeSeries, setActiveSeries] = useState('All');
  const [sortLabel, setSortLabel] = useState('Default');
  const [refreshing, setRefreshing] = useState(false);
  const [progressMap, setProgressMap] = useState({});

  const loadProgress = useCallback(async () => {
    const map = await computeAchievementProgressMap();
    setProgressMap(map);
  }, []);

  useEffect(() => { loadProgress(); }, [loadProgress]);
  useFocusEffect(useCallback(() => { loadProgress(); }, [loadProgress]));

  const achievementsWithProgress = useMemo(
    () => ACHIEVEMENTS.map(a => ({ ...a, progress: progressMap[a.id] ?? 0 })),
    [progressMap]
  );

  const filtered = useMemo(
    () =>
      activeSeries === 'All'
        ? achievementsWithProgress
        : achievementsWithProgress.filter(a => a.series === activeSeries),
    [activeSeries, achievementsWithProgress]
  );

  const items = useMemo(() => {
    if (sortLabel === 'Progress') return [...filtered].sort((a, b) => b.progress - a.progress);
    return filtered;
  }, [filtered, sortLabel]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProgress();
    setRefreshing(false);
  }, [loadProgress]);

  const onToggleSort = useCallback(
    () => setSortLabel(s => (s === 'Default' ? 'Progress' : 'Default')),
    []
  );

  const onSelectSeries = useCallback(tag => setActiveSeries(tag), []);

  // 🔴 Clear 全部（本地+云端），并刷新。清空后 20s 内跳过服务端拉取，UI 立即为空。
  const onClear = useCallback(() => {
    Alert.alert(
      'Clear all progress?',
      'This removes local attempts, streaks, shares, read history, and cloud quiz history. (Server fetch is skipped for ~20s so UI empties immediately.)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setRefreshing(true);
            try {
              await clearAchievementDataFull();
            } finally {
              await loadProgress();
              setRefreshing(false);
            }
          }
        }
      ]
    );
  }, [loadProgress]);

  return (
    <AchievementGalleryScreen
      series={series}
      activeSeries={activeSeries}
      onSelectSeries={onSelectSeries}
      sortLabel={sortLabel}
      onToggleSort={onToggleSort}
      onClear={onClear}
      refreshing={refreshing}
      onRefresh={onRefresh}
      items={items}
    />
  );
}
