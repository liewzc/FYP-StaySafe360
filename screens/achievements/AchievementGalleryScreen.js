// screens/achievements/AchievementGalleryScreen.js
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ScrollView, RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import TopBarBack from '../../components/ui/TopBarBack';
import { computeAchievementProgressMap } from '../../utils/achievements';
import { useFocusEffect } from '@react-navigation/native';

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
  CHIP_INACTIVE: '#f3f4f6',
  CHIP_ACTIVE: '#e8f1fb',
  ICON_BG: '#f3f4f6',
  BADGE_BG: '#eaf6ef',
  BADGE_TEXT: '#15803d',
};

/* ---------------- Data ---------------- */
const FIRST_AID_CATS = 5 + 10;
const FIRST_AID_SUBLEVELS_PER_CAT = 4;
const DISASTER_CATS = 5;
const DISASTER_SUBLEVELS_PER_CAT = 10;
const KNOWLEDGE_TOTAL_ARTICLES = 15;

const A = (id, title, subtitle, series, icon) => ({ id, title, subtitle, series, icon, progress: 0 });

function buildAchievements() {
  const list = [];
  // General
  list.push(
    A('first','First Quiz','Complete your first quiz','General',{ lib:'mci', name:'medal-outline' }),
    A('ks5','Knowledge Seeker','Complete 5 quizzes','General',{ lib:'mci', name:'trophy-outline' }),
    A('ks10','Quiz Explorer','Complete 10 quizzes','General',{ lib:'mci', name:'trophy' }),
    A('ks50','Quiz Veteran','Complete 50 quizzes','General',{ lib:'ion', name:'ribbon-outline' }),
    A('perfect1','Perfect Score','Score 100% in any quiz','General',{ lib:'ion', name:'star-outline' }),
    A('fast1','Speed Runner','Finish a quiz under 20s','General',{ lib:'mci', name:'speedometer' }),
    A('share1','Spread the Word','Share one result','General',{ lib:'mci', name:'share-variant' }),
  );
  // First Aid
  const faTotalSublevels = FIRST_AID_CATS * FIRST_AID_SUBLEVELS_PER_CAT;
  list.push(
    A('fa_sub_1','First Aid Beginner','Complete 1 sublevel','First Aid',{ lib:'ion', name:'medkit-outline' }),
    A('fa_sub_10','First Aid Climber','Complete 10 sublevels','First Aid',{ lib:'ion', name:'bandage-outline' }),
    A('fa_sub_30','First Aid Pro','Complete 30 sublevels','First Aid',{ lib:'mci', name:'hospital-box-outline' }),
    A('fa_sub_all',`First Aid Master`,`Complete all ${faTotalSublevels} sublevels`,'First Aid',{ lib:'ion', name:'school-outline' }),
    A('fa_cat_1','Aid Category Finisher I','Finish 1 category','First Aid',{ lib:'mci', name:'stethoscope' }),
    A('fa_cat_5','Aid Category Finisher II','Finish 5 categories','First Aid',{ lib:'mci', name:'clipboard-check-outline' }),
    A('fa_cat_10','Aid Category Expert','Finish 10 categories','First Aid',{ lib:'ion', name:'medkit' }),
    A('fa_cat_all',`Aid Completionist`, `Finish all ${FIRST_AID_CATS} categories`,'First Aid',{ lib:'mci', name:'crown-outline' }),
  );
  // Disaster
  const dzTotalSublevels = DISASTER_CATS * DISASTER_SUBLEVELS_PER_CAT;
  list.push(
    A('dz_sub_10','Preparedness Novice','Complete 10 disaster sublevels','Disaster',{ lib:'ion', name:'flash-outline' }),
    A('dz_sub_25','Preparedness Adept','Complete 25 disaster sublevels','Disaster',{ lib:'mci', name:'shield-half-full' }),
    A('dz_sub_all',`Preparedness Master`, `Complete all ${dzTotalSublevels} disaster sublevels`,'Disaster',{ lib:'mci', name:'shield-outline' }),
    A('dz_cat_1','Resilience I','Finish 1 disaster category','Disaster',{ lib:'mci', name:'alert-outline' }),
    A('dz_cat_3','Resilience II','Finish 3 disaster categories','Disaster',{ lib:'ion', name:'earth-outline' }),
    A('dz_cat_all',`Resilience Max`, `Finish all ${DISASTER_CATS} categories`,'Disaster',{ lib:'mci', name:'shield-check-outline' }),
  );
  // Streaks
  [
    { id:'streak1', days:1,  title:'Day 1 Explorer',   icon:{ lib:'ion', name:'calendar-outline' } },
    { id:'streak3', days:3,  title:'3-Day Challenger', icon:{ lib:'ion', name:'flame-outline' } },
    { id:'streak7', days:7,  title:'7-Day Challenger', icon:{ lib:'ion', name:'flame-outline' } },
    { id:'streak10',days:10, title:'10-Day Runner',    icon:{ lib:'mci', name:'run-fast' } },
    { id:'streak14',days:14, title:'Two-Week Hero',    icon:{ lib:'ion', name:'sunny-outline' } },
    { id:'streak30',days:30, title:'30-Day Survivor',  icon:{ lib:'mci', name:'crown-outline' } },
  ].forEach(({ id, days, title, icon }) => list.push(A(id, title, `连续打卡 ${days} 天`, 'Daily Streaks', icon)));
  // Knowledge
  list.push(
    A('kn1','Quick Learner','阅读 1 篇知识文章','Knowledge',{ lib:'ion', name:'book-outline' }),
    A('kn5','Reader','阅读 5 篇知识文章','Knowledge',{ lib:'ion', name:'book' }),
    A('kn10','Knowledge Collector','阅读 10 篇知识文章','Knowledge',{ lib:'ion', name:'library-outline' }),
    A('kn15','Knowledge Finisher',`阅读全部 ${KNOWLEDGE_TOTAL_ARTICLES} 篇文章`,'Knowledge',{ lib:'mci', name:'lightbulb-outline' }),
  );
  return list;
}
const ACHIEVEMENTS = buildAchievements();

/* ---------------- Helpers ---------------- */
const clampPct = (v) => Math.max(0, Math.min(100, Math.round(v || 0)));
const isUnlocked = (p) => clampPct(p) === 100;
const calcStats = (items) => {
  const total = items.length || 0;
  const unlocked = items.filter((a) => isUnlocked(a.progress)).length;
  const avg = total ? Math.round(items.reduce((s, a) => s + clampPct(a.progress), 0) / total) : 0;
  return { total, unlocked, avg };
};

/* ---------------- UI ---------------- */
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
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={[styles.chip, active && styles.chipActive]}
  >
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

/* ---------------- Main ---------------- */
export default function AchievementGalleryScreen() {
  const SERIES = useMemo(() => ['All', ...Array.from(new Set(ACHIEVEMENTS.map(a => a.series)))], []);
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
    () => (activeSeries === 'All'
      ? achievementsWithProgress
      : achievementsWithProgress.filter(a => a.series === activeSeries)),
    [activeSeries, achievementsWithProgress]
  );

  const sorted = useMemo(() => {
    if (sortLabel === 'Progress') return [...filtered].sort((a, b) => b.progress - a.progress);
    return filtered;
  }, [filtered, sortLabel]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProgress();
    setRefreshing(false);
  }, [loadProgress]);

  const RightControls = (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity
        onPress={() => setSortLabel(s => (s === 'Default' ? 'Progress' : 'Default'))}
        style={styles.sortButton}
      >
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
          {SERIES.map(tag => (
            <SeriesChip key={tag} tag={tag} active={activeSeries === tag} onPress={() => setActiveSeries(tag)} />
          ))}
        </ScrollView>
      </View>

      <StatsBar items={sorted} />

      <FlatList
        data={sorted}
        renderItem={({ item }) => <AchItem item={item} />}
        keyExtractor={(it) => it.id}
        contentContainerStyle={[styles.listContent, sorted.length === 0 && styles.emptyListContent]}
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
  statLabel: { color: COLORS.MUTED, fontSize: 12 },
  statValue: { color: COLORS.TEXT, fontSize: 16, fontWeight: '800', marginTop: 2 },
  divider: { width: 1, height: 22, backgroundColor: COLORS.BORDER, marginHorizontal: 12 },
  listContent: { padding: 16, paddingBottom: 28 },
  emptyListContent: { flexGrow: 1, justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.CARD, borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.BORDER, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.ICON_BG, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#eceff3' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { color: COLORS.TEXT, fontSize: 16, fontWeight: '800', flex: 1, marginRight: 8 },
  subtitle: { color: COLORS.MUTED, fontSize: 12, marginTop: 2, lineHeight: 16 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  progressTrack: { flex: 1, height: 6, borderRadius: 999, backgroundColor: COLORS.TRACK, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.ACCENT },
  pct: { color: COLORS.MUTED, fontSize: 12, width: 42, textAlign: 'right' },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.BADGE_BG, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: '#d6f0db' },
  badgeText: { color: COLORS.BADGE_TEXT, fontSize: 11, fontWeight: '700', marginLeft: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyStateText: { marginTop: 12, color: COLORS.MUTED, fontSize: 16, textAlign: 'center' },
});
