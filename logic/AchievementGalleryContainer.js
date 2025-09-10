// logic/AchievementGalleryContainer.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import AchievementGalleryScreen from '../screens/achievements/AchievementGalleryScreen';
import { computeAchievementProgressMap } from '../utils/achievements';
import { ACHIEVEMENTS } from '../screens/achievements/achievementsCatalog';

export default function AchievementGalleryContainer() {
  // Build the series filter list
  const series = useMemo(
    () => ['All', ...Array.from(new Set(ACHIEVEMENTS.map(a => a.series)))],
    []
  );

  // UI state: active series tag, sort mode, pull-to-refresh, and progress map
  const [activeSeries, setActiveSeries] = useState('All');
  const [sortLabel, setSortLabel] = useState('Default');
  const [refreshing, setRefreshing] = useState(false);
  const [progressMap, setProgressMap] = useState({});

  // Load progress
  const loadProgress = useCallback(async () => {
    const map = await computeAchievementProgressMap();
    setProgressMap(map);
  }, []);

  // Initial load
  useEffect(() => { loadProgress(); }, [loadProgress]);
  // Refresh progress whenever the screen regains focus
  useFocusEffect(useCallback(() => { loadProgress(); }, [loadProgress]));

  // Attach current progress to each achievement item
  const achievementsWithProgress = useMemo(
    () => ACHIEVEMENTS.map(a => ({ ...a, progress: progressMap[a.id] ?? 0 })),
    [progressMap]
  );

  // Apply series filter
  const filtered = useMemo(
    () =>
      activeSeries === 'All'
        ? achievementsWithProgress
        : achievementsWithProgress.filter(a => a.series === activeSeries),
    [activeSeries, achievementsWithProgress]
  );

  // Sort items (by progress when requested; otherwise original order)
  const items = useMemo(() => {
    if (sortLabel === 'Progress') return [...filtered].sort((a, b) => b.progress - a.progress);
    return filtered;
  }, [filtered, sortLabel]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProgress();
    setRefreshing(false);
  }, [loadProgress]);

  // Toggle sort mode between Default and Progress
  const onToggleSort = useCallback(
    () => setSortLabel(s => (s === 'Default' ? 'Progress' : 'Default')),
    []
  );

  // Change active series tag
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
