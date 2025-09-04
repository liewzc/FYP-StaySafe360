// screens/quiz/AttemptDetailScreen.js
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import TopBarBack from '../../components/ui/TopBarBack'; // 导入标题栏组件

const ACCENT = '#0B6FB8';

export default function AttemptDetailScreen() {
  const { params } = useRoute();
  const navigation = useNavigation();
  const { attemptId } = params || {};
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!attemptId) return;
        const json = await AsyncStorage.getItem(`attempt:${attemptId}`);
        setAttempt(json ? JSON.parse(json) : null);
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId]);

  const scorePct = useMemo(() => {
    if (!attempt?.total) return 0;
    return Math.round((attempt.score / attempt.total) * 100);
  }, [attempt]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <TopBarBack title="Attempt Details" />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  if (!attempt) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <TopBarBack title="Attempt Details" />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.empty}>No attempt data found.</Text>
        </View>
      </View>
    );
  }

  const { disasterType, subLevel, score, total, created_at, answers = [] } = attempt;

  return (
    <View style={{ flex: 1, backgroundColor: '#f7fafc' }}>
      {/* 使用 TopBarBack 组件 */}
      <TopBarBack title="Attempt Details" />
      
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 24 }]}>
        {/* Header Stripe */}
        <View style={styles.card}>
          {/* chips */}
          <View style={styles.chipsRow}>
            <View style={[styles.chip, { borderColor: ACCENT }]}>
              <Text style={[styles.chipText, { color: ACCENT }]}>{disasterType}</Text>
            </View>
            <View style={[styles.chip, { borderColor: '#CBD5E1' }]}>
              <Text style={[styles.chipText, { color: '#334155' }]}>Sublevel {subLevel}</Text>
            </View>
          </View>

          {/* score */}
          <Text style={[styles.score, { color: ACCENT }]}>{score} / {total} ({scorePct}%)</Text>
          <Text style={styles.timeText}>{new Date(created_at).toLocaleString()}</Text>
        </View>

        {/* questions */}
        <View style={{ height: 8 }} />
        {answers.map((a, idx) => (
          <View key={`${idx}-${a.idx}`} style={styles.qCard}>
            <View style={styles.qTopRow}>
              <Text style={styles.qIndex}>Q{a.idx}</Text>
              <View
                style={[
                  styles.qBadge,
                  { backgroundColor: a.isCorrect ? '#dcfce7' : '#fee2e2', borderColor: a.isCorrect ? '#86efac' : '#fca5a5' },
                ]}
              >
                <Text style={[styles.qBadgeText, { color: a.isCorrect ? '#166534' : '#7f1d1d' }]}>
                  {a.selectedIndex == null ? 'Timeout/No Answer' : (a.isCorrect ? 'Correct' : 'Incorrect')}
                </Text>
              </View>
            </View>

            <Text style={styles.qTitle}>{a.question}</Text>

            {/* options */}
            <View style={{ marginTop: 6 }}>
              {a.options?.map((opt, oi) => {
                const isRight = opt === a.correctAnswer;
                const isChosen = oi === a.selectedIndex;
                return (
                  <View
                    key={oi}
                    style={[
                      styles.opt,
                      isRight && styles.optRight,
                      isChosen && !isRight && styles.optWrong,
                    ]}
                  >
                    <Text style={styles.optText}>
                      {String.fromCharCode(65 + oi)}. {opt}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.meta}>⏱ {a.timeSpentSec ?? 0}s</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 18, 
    paddingTop: 12, // 减少顶部内边距
    backgroundColor: '#f7fafc', 
    flexGrow: 1 
  },
  empty: { 
    color: '#6b7280' 
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipsRow: { 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 10, 
    flexWrap: 'wrap' 
  },
  chip: { 
    borderWidth: 1.5, 
    borderRadius: 999, 
    paddingHorizontal: 10, 
    paddingVertical: 6 
  },
  chipText: { 
    fontSize: 12, 
    fontWeight: '700' 
  },

  score: { 
    fontSize: 28, 
    fontWeight: '900', 
    textAlign: 'center' 
  },
  timeText: { 
    fontSize: 12, 
    color: '#6b7280', 
    textAlign: 'center', 
    marginTop: 4 
  },

  qCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  qTopRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  qIndex: { 
    fontSize: 13, 
    fontWeight: '800', 
    color: '#0f172a' 
  },
  qBadge: { 
    borderWidth: 1, 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 999 
  },
  qBadgeText: { 
    fontSize: 12, 
    fontWeight: '800' 
  },
  qTitle: { 
    marginTop: 6, 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#0f172a' 
  },

  opt: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    backgroundColor: '#fff',
  },
  optRight: { 
    backgroundColor: '#ecfdf5', 
    borderColor: '#86efac' 
  },
  optWrong: { 
    backgroundColor: '#fee2e2', 
    borderColor: '#fca5a5' 
  },
  optText: { 
    color: '#111827', 
    fontSize: 14 
  },

  meta: { 
    fontSize: 12, 
    color: '#6b7280', 
    marginTop: 8, 
    textAlign: 'right' 
  },
});