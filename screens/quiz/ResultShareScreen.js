// screens/quiz/ResultShareScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  AccessibilityInfo,
  Animated,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logDisasterResult } from '../../utils/quizStorage';
// ✅ 成就：满分时标记子关已完成 + 分享成就自增
import { recordLocalAttempt, logShareOnce, markDisaster10SublevelComplete } from '../../utils/achievements';
import TopBarBack from '../../components/ui/TopBarBack';

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

  // 分数动画
  const animVal = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    Animated.timing(animVal, { toValue: score, duration: 900, useNativeDriver: false }).start();
    const id = animVal.addListener(({ value }) => setDisplayScore(Math.round(value)));
    return () => animVal.removeListener(id);
  }, [score, animVal]);

  // 保存 attempt（日志、索引、成就）
  const loggedRef = useRef(false);
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

        // 2) 本地保存（供历史/统计使用）
        const attemptId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
        const summary = { id: attemptId, kind: 'disaster', disasterType, subLevel, score, total, created_at };
        await AsyncStorage.setItem('attemptIndex', JSON.stringify([summary, ...idx].slice(0, 500)));

        // 3) 满分计入成就统计
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

        // 4) 满分标记子关完成
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
      const message = `🚨 I scored ${score} / ${total} (${pct}%) in the ${disasterType} — Sublevel ${subLevel} quiz! #StaySafe360`;
      await Share.share({ message, title: 'My StaySafe360 Quiz Score' }, { dialogTitle: 'Share your score' });
      await logShareOnce();
    } catch (error) {
      console.error('Error sharing result:', error);
    }
  };

  const handleBackHome = () => {
    Haptics.selectionAsync?.();
    navigation.navigate('Main', { screen: 'Quiz' });
  };

  const timeText = useMemo(() => {
    const sec = Math.max(0, Math.round(timeSpentMs / 1000));
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  }, [timeSpentMs]);

  return (
    <View style={[styles.root, { backgroundColor: '#fff' }]}>
      <TopBarBack title="Quiz Result" onBack={() => navigation.goBack()} backgroundColor="#fff" showBorder />

      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: accentSoft }]}>
        <View style={styles.card} accessibilityRole="summary">
          {/* 徽章 */}
          <View style={[styles.badge, { backgroundColor: accentSoft, borderColor: accent }]}>
            <Text style={[styles.badgeText, { color: accent }]}>
              {isPerfect ? '🏆 Perfect!' : isGood ? '👍 Well done' : '💪 Keep going'}
            </Text>
          </View>

          {/* 信息 chips */}
          <View style={styles.chipsRow}>
            <View style={[styles.chip, { borderColor: accent }]}>
              <Text style={[styles.chipText, { color: accent }]}>{disasterType}</Text>
            </View>
            <View style={[styles.chip, { borderColor: '#CBD5E1' }]}>
              <Text style={[styles.chipText, { color: '#334155' }]}>Sublevel {subLevel}</Text>
            </View>
            <View style={[styles.chip, { borderColor: '#CBD5E1' }]}>
              <Text style={[styles.chipText, { color: '#334155' }]}>Time: {timeText}</Text>
            </View>
          </View>

          {/* 分数 + 进度条 */}
          <Text style={[styles.score, { color: accent }]} accessibilityLabel={`Score ${score} out of ${total}`}>
            {displayScore} / {total}
          </Text>

          <View style={styles.progressBarBackground} accessibilityRole="progressbar" accessibilityValue={{ now: pct, min: 0, max: 100 }}>
            <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: accent }]} />
          </View>
          <Text style={styles.pctText}>{pct}%</Text>

          {/* 文案 */}
          <Text style={styles.subtitle}>
            {isPerfect ? '✅ All correct! Outstanding work!' : '📝 Try again to aim for a perfect score!'}
          </Text>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: accent }]} onPress={handleShare}>
              <Text style={styles.primaryBtnText}>📤 Share</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: accent }]} onPress={() => setShowReview(v => !v)}>
              <Text style={[styles.secondaryBtnText, { color: accent }]}>{showReview ? 'Hide review' : '🔎 Review answers'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: accent }]} onPress={handleBackHome}>
              <Text style={[styles.secondaryBtnText, { color: accent }]}>🏠 Back to Quiz Menu</Text>
            </TouchableOpacity>
          </View>

          {/* 内联 Review（与 FirstAidResultScreen 一致的文本风格） */}
          {showReview && (
            <View style={styles.reviewBlock}>
              <Text style={styles.reviewTitle}>Answer Review</Text>
              {Array.isArray(answers) && answers.length > 0 ? (
                answers.map((a, idx) => {
                  const letter = a?.selectedIndex != null ? String.fromCharCode(65 + a.selectedIndex) : '—';
                  const picked = a?.selectedAnswer ?? 'No answer';
                  const correct = a?.correctAnswer;
                  const ok = typeof a?.isCorrect === 'boolean' ? a.isCorrect : picked === correct;
                  const spent = a?.timeSpentSec != null ? `${a.timeSpentSec}s` : '';

                  return (
                    <View key={`${idx}-${a?.question?.slice(0, 6)}`} style={styles.qItem}>
                      <Text style={styles.qTitle}>{idx + 1}. {a?.question}</Text>
                      <Text style={[styles.qLine, ok ? styles.ok : styles.notOk]}>
                        Your answer: {letter}. {picked}
                      </Text>
                      <Text style={styles.qLine}>Correct: {String(correct ?? '—')}</Text>
                      {!!spent && <Text style={styles.qLine}>Time: {spent}</Text>}
                    </View>
                  );
                })
              ) : (
                <Text style={{ color: '#6b7280' }}>No per-question details were provided.</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // 与 FirstAidResultScreen 完全同一套命名与数值
  root: { flex: 1 },
  container: { flexGrow: 1, padding: 16 },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  badgeText: { fontSize: 13, fontWeight: '800' },
  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: '700' },

  score: { fontSize: 32, fontWeight: '900', textAlign: 'center', marginTop: 8, marginBottom: 6 },
  progressBarBackground: { width: '100%', height: 14, backgroundColor: '#E5E7EB', borderRadius: 999, overflow: 'hidden', position: 'relative', marginTop: 6 },
  progressBarFill: { height: '100%', borderRadius: 999 },
  pctText: { fontSize: 12, color: '#6B7280', textAlign: 'right', marginTop: 6 },

  subtitle: { fontSize: 14, color: '#475569', textAlign: 'center', marginVertical: 16 },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 10, justifyContent: 'center' },
  primaryBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  secondaryBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5 },
  secondaryBtnText: { fontWeight: '800', fontSize: 14 },

  reviewBlock: { marginTop: 18, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 14 },
  reviewTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8 },

  qItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  qTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 6 },
  qLine: { fontSize: 13, color: '#374151', marginBottom: 2 },
  ok: { color: '#15803D' },
  notOk: { color: '#B91C1C' },
});
