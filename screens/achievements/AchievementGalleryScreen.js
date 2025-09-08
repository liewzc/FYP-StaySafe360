// screens/achievements/AchievementGalleryScreen.js
import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ScrollView, RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import TopBarBack from '../../components/ui/TopBarBack';

/* ---------------- Theme ---------------- */
const COLORS = {
  BG: '#ffffff',
  CARD: '#ffffff',
  TEXT: '#0f172a',
  MUTED: '#6b7280',
  BORDER: '#e5e7eb',
  TRACK: '#eaeef5',
  ACCENT: '#0B6FB8',
  SUCCESS: '#16a34a',
  ICON_BG: '#f3f4f6',
  BADGE_BG: '#eaf6ef',
  BADGE_TEXT: '#15803d',
};

/* ---------------- Helpers (pure) ---------------- */
const clampPct = (v) => Math.max(0, Math.min(100, Math.round(v || 0)));
const isUnlocked = (p) => clampPct(p) === 100;
const calcStats = (items) => {
  const total = items.length || 0;
  const unlocked = items.filter((a) => isUnlocked(a.progress)).length;
  const avg = total ? Math.round(items.reduce((s, a) => s + clampPct(a.progress), 0) / total) : 0;
  return { total, unlocked, avg };
};

/* ---------------- UI atoms ---------------- */
const ProgressBar = React.memo(({ value = 0 }) => {
  const pct = clampPct(value);
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={[styles.pct, isUnlocked(pct) && { color: COLORS.SUCCESS, fontWeight: '700' }]}>{pct}%</Text>
    </View>
  );
});

const LeftIcon = React.memo(({ icon }) => (
  <View style={styles.iconWrap}>
    {icon?.lib === 'mci'
      ? <MaterialCommunityIcons name={icon.name} size={22} color={COLORS.TEXT} />
      : <Ionicons name={icon?.name || 'trophy-outline'} size={22} color={COLORS.TEXT} />}
  </View>
));

const UnlockedBadge = React.memo(() => (
  <View style={styles.badge}>
    <MaterialCommunityIcons name="check-decagram-outline" size={14} color={COLORS.BADGE_TEXT} />
    <Text style={styles.badgeText}>Unlocked</Text>
  </View>
));

const AchItem = React.memo(({ item }) => {
  const unlocked = isUnlocked(item.progress);
  return (
    <View style={styles.card}>
      <LeftIcon icon={item.icon} />
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          {unlocked && <UnlockedBadge />}
        </View>
        <Text style={styles.subtitle} numberOfLines={2}>{item.subtitle}</Text>
        <ProgressBar value={item.progress} />
      </View>
    </View>
  );
});

const SeriesChip = React.memo(({ tag, active, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{tag}</Text>
  </TouchableOpacity>
));

const EmptyState = React.memo(({ series }) => (
  <View style={styles.emptyState}>
    <MaterialCommunityIcons name="trophy-outline" size={48} color={COLORS.MUTED} />
    <Text style={styles.emptyStateText}>
      {series === 'All' ? 'No achievements yet' : `No achievements in “${series}”`}
    </Text>
  </View>
));

const StatsBar = React.memo(({ items }) => {
  const { total, unlocked, avg } = useMemo(() => calcStats(items), [items]);
  return (
    <View style={styles.statsBar}>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Unlocked</Text>
        <Text style={styles.statValue}>{unlocked}/{total}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Avg Progress</Text>
        <Text style={styles.statValue}>{avg}%</Text>
      </View>
    </View>
  );
});

/* ---------------- Presentation component ---------------- */
export default function AchievementGalleryScreen({
  series,
  activeSeries,
  onSelectSeries,
  sortLabel,
  onToggleSort,
  refreshing,
  onRefresh,
  items,
}) {
  const RightControls = (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity onPress={onToggleSort} style={styles.sortButton}>
        <Ionicons name="swap-vertical" size={18} color={COLORS.ACCENT} />
        <Text style={styles.sortButtonText}>{sortLabel}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TopBarBack
        title="Achievements"
        iconColor={COLORS.TEXT}
        backgroundColor={COLORS.BG}
        showBorder
        rightSlot={RightControls}
      />

      <View style={styles.filterBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          {series.map(tag => (
            <SeriesChip key={tag} tag={tag} active={activeSeries === tag} onPress={() => onSelectSeries(tag)} />
          ))}
        </ScrollView>
      </View>

      <StatsBar items={items} />

      <FlatList
        data={items}
        renderItem={({ item }) => <AchItem item={item} />}
        keyExtractor={(it) => it.id}
        contentContainerStyle={[styles.listContent, items.length === 0 && styles.emptyListContent]}
        ListEmptyComponent={<EmptyState series={activeSeries} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.ACCENT]}
            tintColor={COLORS.ACCENT}
          />
        }
      />
    </SafeAreaView>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG },
  sortButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 6, marginRight: 4 },
  sortButtonText: { color: COLORS.ACCENT, fontWeight: '700', marginLeft: 6 },
  filterBarWrap: { height: 52, paddingTop: 6 },
  filterBar: { paddingHorizontal: 12, alignItems: 'center' },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', justifyContent: 'center', marginRight: 8 },
  chipActive: { backgroundColor: '#e8f1fb', borderColor: COLORS.ACCENT },
  chipText: { color: '#334155', fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: COLORS.ACCENT },
  statsBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fbff', borderColor: '#e6f1fb', borderWidth: 1, borderRadius: 12, marginHorizontal: 16, marginTop: 8, paddingVertical: 10, paddingHorizontal: 12 },
  statItem: { flex: 1 },
  statLabel: { color: '#6b7280', fontSize: 12 },
  statValue: { color: '#0f172a', fontSize: 16, fontWeight: '800', marginTop: 2 },
  divider: { width: 1, height: 22, backgroundColor: '#e5e7eb', marginHorizontal: 12 },
  listContent: { padding: 16, paddingBottom: 28 },
  emptyListContent: { flexGrow: 1, justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#eceff3' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { color: '#0f172a', fontSize: 16, fontWeight: '800', flex: 1, marginRight: 8 },
  subtitle: { color: '#6b7280', fontSize: 12, marginTop: 2, lineHeight: 16 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  progressTrack: { flex: 1, height: 6, borderRadius: 999, backgroundColor: '#eaeef5', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#0B6FB8' },
  pct: { color: '#6b7280', fontSize: 12, width: 42, textAlign: 'right' },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eaf6ef', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: '#d6f0db' },
  badgeText: { color: '#15803d', fontSize: 11, fontWeight: '700', marginLeft: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyStateText: { marginTop: 12, color: '#6b7280', fontSize: 16, textAlign: 'center' },
});
