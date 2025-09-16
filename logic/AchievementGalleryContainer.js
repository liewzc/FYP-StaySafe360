// logic/AchievementGalleryContainer.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AchievementGalleryScreen from '../screens/achievements/AchievementGalleryScreen';
import { computeAchievementProgressMap, clearAchievementDataFull } from '../utils/achievements';
import { ACHIEVEMENTS } from '../screens/achievements/achievementsCatalog';

export default function AchievementGalleryContainer() {
  const insets = useSafeAreaInsets();

  // Build the series filter list
  const series = useMemo(
    () => ['All', ...Array.from(new Set(ACHIEVEMENTS.map(a => a.series)))],
    []
  );

  // UI state
  const [activeSeries, setActiveSeries] = useState('All');
  const [sortLabel, setSortLabel] = useState('Default');
  const [refreshing, setRefreshing] = useState(false);
  const [progressMap, setProgressMap] = useState({});
  const [clearing, setClearing] = useState(false);

  // Load progress (纯本地)
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

  // Clear all local achievement & quiz history
  const onClearAll = useCallback(() => {
    Alert.alert(
      'Reset achievements?',
      'This will clear local achievement progress and quiz attempts on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setClearing(true);
              await clearAchievementDataFull(); 
              await loadProgress();
              Alert.alert('Cleared', 'Local progress has been reset.');
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to clear.');
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  }, [loadProgress]);

  return (
    <View style={{ flex: 1 }}>
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

      {/* Floating Clear button */}
      <TouchableOpacity
        style={[
          styles.fab,
          { bottom: 16 + Math.max(insets.bottom, 8) },
        ]}
        onPress={onClearAll}
        activeOpacity={0.85}
        disabled={clearing}
        accessibilityLabel="Clear achievements"
      >
        {clearing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.fabText}>Clear</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#ef4444',
    borderRadius: 28,
    paddingHorizontal: 18,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 10,
  },
  fabText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
