// screens/quiz/ResultShareScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, AccessibilityInfo, Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logDisasterResult } from '../../utils/quizStorage';
// ✅ 成就：满分时标记子关已完成 + 分享成就自增
import { recordLocalAttempt, logShareOnce, markDisaster10SublevelComplete } from '../../utils/achievements';

export default function ResultShareScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const {
    score: rawScore = 0,
    total: rawTotal = 100,
    disasterType = 'General',
    subLevel = 'Ⅰ',
    timeSpentMs = 0,
    answers = [],
  } = route.params || {};

  const score = Number.isFinite(rawScore) ? rawScore : 0;
  const total = Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : 100;

  const pct = useMemo(
    () => Math.max(0, Math.min(100, Math.round((score / total) * 100))),
    [score, total]
  );
  const isPerfect = score === total;
  const isGood = !isPerfect && pct >= 60;

  const accent = isPerfect ? '#10B981' : isGood ? '#0B6FB8' : '#EF4444';
  const accentSoft = isPerfect ? '#E8FFF6' : isGood ? '#F1F7FE' : '#FFF1F2';

  const animVal = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    Animated.timing(animVal, { toValue: score, duration: 900, useNativeDriver: false }).start();
    const id = animVal.addListener(({ value }) => setDisplayScore(Math.round(value)));
    return () => animVal.removeListener(id);
  }, [score, animVal]);

  const loggedRef = useRef(false);
  const attemptIdRef = useRef(null);

  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;

    (async () => {
      try {
        // 1) 远端日志
        await logDisasterResult({
          disasterType,
          level: null,
          subLevel,
          score: Number(score),
          timeSpentMs,
        });

        // 2) 本地保存（供 AttemptDetail 使用）
        const attemptId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        attemptIdRef.current = attemptId;

        const created_at = new Date().toISOString();
        const attempt = {
          id: attemptId,
          kind: 'disaster',
          disasterType,
          subLevel,
          score,
          total,
          timeSpentMs,
          created_at,
          answers,
        };

        await AsyncStorage.setItem(`attempt:${attemptId}`, JSON.stringify(attempt));

        const idxRaw = await AsyncStorage.getItem('attemptIndex');
        const idx = idxRaw ? JSON.parse(idxRaw) : [];
        const summary = {
          id: attemptId,
          kind: 'disaster',
          disasterType,
          subLevel,
          score,
          total,
          created_at,
        };
        await AsyncStorage.setItem('attemptIndex', JSON.stringify([summary, ...idx].slice(0, 500)));

        // 3) ✅ 只有满分才写入“成就统计所需的本地 attempt”
        if (score === total) {
          await recordLocalAttempt({
            domain: 'disaster',
            categoryId: String(disasterType),
            sublevelId: String(subLevel),
            score,
            total,
            timeMs: timeSpentMs || 0,
          });
        }

        AccessibilityInfo.announceForAccessibility?.('Your result has been saved.');

        // 4) ✅ 只有满分才把该子关卡标记为完成（影响分类成就统计）
        if (isPerfect) {
          await markDisaster10SublevelComplete(disasterType, subLevel);
        }
      } catch (e) {
        console.warn('Failed to save result:', e?.message || e);
      }
    })();
  }, [disasterType, subLevel, score, timeSpentMs, total, answers, isPerfect]);

  const handleShare = async () => {
    try {
      Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
      const message = `🚨 I scored ${score} / ${total} (${pct}%) in the ${disasterType} - Sublevel ${subLevel} quiz!
Can you beat my score? 💪 #StaySafe360`;
      await Share.share({ message, title: 'My StaySafe360 Quiz Score' }, { dialogTitle: 'Share your score' });

      // ✅ 分享一次 -> 计入 share1 成就（内部自增 + streak）
      await logShareOnce();
    } catch (error) {
      console.error('Error sharing result:', error);
    }
  };

  const handleBackHome = () => {
    Haptics.selectionAsync?.();
    navigation.navigate('Main', { screen: 'Quiz' });
  };

  const openDetails = () => {
    const id = attemptIdRef.current;
    if (!id) return;
    navigation.navigate('AttemptDetail', { attemptId: id });
  };

  return (
    <View style={[styles.container, { backgroundColor: accentSoft }]} accessible accessibilityLabel="Quiz results screen">
      <View style={styles.card} accessibilityRole="summary">
        <View style={[styles.badge, { backgroundColor: accentSoft, borderColor: accent }]}>
          <Text style={[styles.badgeText, { color: accent }]}>
            {isPerfect ? '🏆 Perfect!' : isGood ? '👍 Well done' : '💪 Keep going'}
          </Text>
        </View>

        <View style={styles.chipsRow}>
          <View style={[styles.chip, { borderColor: accent }]}>
            <Text style={[styles.chipText, { color: accent }]}>{disasterType}</Text>
          </View>
          <View style={[styles.chip, { borderColor: '#CBD5E1' }]}>
            <Text style={[styles.chipText, { color: '#334155' }]}>Sublevel {subLevel}</Text>
          </View>
        </View>

        <Text style={[styles.score, { color: accent }]} accessibilityLabel={`Score ${score} out of ${total}`}>
          {displayScore} / {total}
        </Text>

        <View
          style={styles.progressBarBackground}
          accessibilityRole="progressbar"
          accessibilityValue={{ now: pct, min: 0, max: 100 }}
        >
          <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: accent }]} />
          <View style={styles.progressStripes} pointerEvents="none" />
        </View>
        <Text style={styles.pctText}>{pct}%</Text>

        <Text style={styles.subtitle}>
          {isPerfect ? '✅ All correct! Outstanding work!' : '📝 Try again to aim for a perfect score!'}
        </Text>

        {/* Share + View 同一排 */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: accent, flex: 1, backgroundColor: accent }]}
            onPress={handleShare}
          >
            <Text style={[styles.secondaryBtnText, { color: '#fff' }]}>📤 Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: accent, flex: 1 }]}
            onPress={openDetails}
          >
            <Text style={[styles.secondaryBtnText, { color: accent }]}>🔎 View</Text>
          </TouchableOpacity>
        </View>

        {/* Back 独立一排 */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.secondaryBtn, { borderColor: accent }]} onPress={handleBackHome}>
            <Text style={[styles.secondaryBtnText, { color: accent }]}>🏠 Back to Quiz Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const STRIPE_SIZE = 8;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 22, alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, paddingTop: 18, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, marginBottom: 10 },
  badgeText: { fontSize: 13, fontWeight: '800' },
  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: '700' },
  score: { fontSize: 32, fontWeight: '900', textAlign: 'center', marginTop: 8, marginBottom: 6 },
  progressBarBackground: { width: '100%', height: 14, backgroundColor: '#E5E7EB', borderRadius: 999, overflow: 'hidden', position: 'relative', marginTop: 6 },
  progressBarFill: { height: '100%', borderRadius: 999 },
  progressStripes: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent', backgroundSize: `${STRIPE_SIZE * 2}px ${STRIPE_SIZE * 2}px` },
  pctText: { fontSize: 12, color: '#6B7280', textAlign: 'right', marginTop: 6 },
  subtitle: { fontSize: 14, color: '#475569', textAlign: 'center', marginVertical: 16 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 10, justifyContent: 'center' },
  secondaryBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5 },
  secondaryBtnText: { fontWeight: '800', fontSize: 14 },
});
