// logic/AchievementGalleryContainer.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import AchievementGalleryScreen from '../screens/achievements/AchievementGalleryScreen';
import { computeAchievementProgressMap } from '../utils/achievements';
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

  return (
    <AchievementGalleryScreen
      series={series}
      activeSeries={activeSeries}
      onSelectSeries={onSelectSeries}
      sortLabel={sortLabel}
      onToggleSort={onToggleSort}
      refreshing={refreshing}
      onRefresh={onRefresh}
      items={items}
    />
  );
}
