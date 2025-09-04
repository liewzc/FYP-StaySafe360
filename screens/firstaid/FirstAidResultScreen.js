// screens/firstaid/FirstAidResultScreen.js
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Animated, AccessibilityInfo } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logFirstAidResult } from '../../utils/quizStorage';
// ✅ 成就：满分时写入 attempt（供统计） + 分享成就 + 标记子关完成
import { recordLocalAttempt, logShareOnce, markEverydaySublevelComplete } from '../../utils/achievements';

export default function FirstAidResultScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const {
    score = 0,
    total = 100,
    category = 'First Aid',
    level = 'main',
    sublevel = 'Ⅰ',
    timeSpentMs = 0,
    answers = [], // ✅ 每题记录
  } = route.params || {};

  const pct = Math.max(0, Math.min(100, Math.round((score / total) * 100)));
  const isPerfect = score === total;
  const isGood = !isPerfect && pct >= 60;

  const accent = isPerfect ? '#10B981' : isGood ? '#0B6FB8' : '#EF4444';
  const accentSoft = isPerfect ? '#E8FFF6' : isGood ? '#F1F7FE' : '#FFF1F2';

  const animVal = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  // 本机 attempt id
  const attemptIdRef = useRef(null);
  const loggedRef = useRef(false);

  // 归一化：把标题转成 everyday_progress_<key> 用的 key（去 emoji、空白→下划线）
  const normalizeToKey = (raw) => {
    if (!raw) return null;
    const noEmoji = raw.replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF])+?/g,
      ''
    );
    return noEmoji.trim().toLowerCase().replace(/\s+/g, '_');
  };

  useEffect(() => {
    Animated.timing(animVal, { toValue: score, duration: 900, useNativeDriver: false }).start();
    const id = animVal.addListener(({ value }) => setDisplayScore(Math.round(value)));
    return () => animVal.removeListener(id);
  }, [score, animVal]);

  // 保存：云端 + 本机（带每题详情）+ ✅ 满分才计入成就 & 标记子关完成
  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    (async () => {
      try {
        // 1) 云端（精简）
        await logFirstAidResult({
          categoryTitle: category,
          level,
          subLevel: sublevel, // 与 helper 命名一致
          score,
          timeSpentMs,
        });

        // 2) 本机（详，供 AttemptDetail 使用）
        const attemptId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        attemptIdRef.current = attemptId;
        const created_at = new Date().toISOString();

        const attempt = {
          id: attemptId,
          kind: 'firstaid',
          disasterType: category, // 复用 AttemptDetail 字段名
          subLevel: sublevel,
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
          kind: 'firstaid',
          disasterType: category,
          subLevel: sublevel,
          score,
          total,
          created_at,
        };
        await AsyncStorage.setItem('attemptIndex', JSON.stringify([summary, ...idx].slice(0, 500)));

        AccessibilityInfo.announceForAccessibility?.('Your result has been saved.');

        // 3) ✅ 满分：写入“成就统计所需的本地 attempt”
        if (score === total) {
          await recordLocalAttempt({
            domain: 'firstaid',
            categoryId: String(category),
            sublevelId: String(sublevel),
            score,
            total,
            timeMs: timeSpentMs || 0,
          });

          // 4) ✅ 满分：标记该 First Aid 子关完成（用于 Everyday 进度）
          const key = normalizeToKey(category); // 与 EverydaySubLevel 的 key 规则一致
          if (key) {
            await markEverydaySublevelComplete(key, sublevel);
          }
        }
      } catch (e) {
        console.warn('Failed to log first-aid result:', e);
      }
    })();
  }, [category, level, sublevel, score, total, timeSpentMs, answers, isPerfect]);

  const handleShare = async () => {
    try {
      const message = `💊 I scored ${score} / ${total} (${pct}%) in the ${category} - ${level} ${sublevel} first aid quiz!
Can you do better? #StaySafe360`;

      await Share.share(
        { message, title: 'My StaySafe360 Quiz Score' },
        { dialogTitle: 'Share your score' }
      );

      // ✅ 分享一次 -> 计入 share1 成就（内部自增 + streak）
      await logShareOnce();
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const openDetails = () => {
    const id = attemptIdRef.current;
    if (!id) return;
    navigation.navigate('AttemptDetail', { attemptId: id });
  };

  const handleBackHome = () => {
    navigation.navigate('Main', { screen: 'Quiz' });
  };

  return (
    <View style={[styles.container, { backgroundColor: accentSoft }]} accessible accessibilityLabel="First-aid results screen">
      <View style={styles.card} accessibilityRole="summary">
        <View style={[styles.badge, { backgroundColor: accentSoft, borderColor: accent }]}>
          <Text style={[styles.badgeText, { color: accent }]}>
            {isPerfect ? '🏆 Perfect!' : isGood ? '👍 Well done' : '💪 Keep going'}
          </Text>
        </View>

        <View style={styles.chipsRow}>
          <View style={[styles.chip, { borderColor: accent }]}>
            <Text style={[styles.chipText, { color: accent }]}>{category}</Text>
          </View>
          <View style={[styles.chip, { borderColor: '#CBD5E1' }]}>
            <Text style={[styles.chipText, { color: '#334155' }]}>
              Level: {level} · Sublevel {sublevel}
            </Text>
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

        {/* Share + View 同一排（与 ResultShareScreen 保持一致） */}
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
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    paddingTop: 18,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
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
