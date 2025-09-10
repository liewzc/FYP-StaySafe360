// screens/firstaid/EverydayQuizScreen.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Animated, Alert, Vibration
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firstAidQuizData as EverydayQuizData } from './EverydayQuizData';
import TopBarBack from '../../components/ui/TopBarBack';

// Sound helpers (respect global settings.sound)
import {
  playBgm, pauseBgm, resumeBgm, stopBgm,
  playCorrect, playWrong
} from '../../utils/sound';

const ACCENT = '#0B6FB8';

const normalizeKey = (raw = '') =>
  raw
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF])+/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

// Fallback titles for common first-aid categories
const TITLE_BY_KEY = {
  burns: '🔥 Burns',
  cpr: '❤️ CPR',
  choking: '🫁 Choking',
  bleeding: '🩸 Bleeding',
  fracture: '🦴 Fracture',
  fainting: '😵 Fainting',
  heatstroke: '🌞 Heatstroke',
  electric_shock: '⚡ Electric Shock',
  animal_bite: '🐕 Animal Bite',
  smoke_inhalation: '💨 Smoke Inhalation',
};

// Helpers to persist attempts for the Results tab
function nowISO() {
  return new Date().toISOString();
}
function genId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
async function appendAttemptIndex(idxItem) {
  try {
    const raw = await AsyncStorage.getItem('attemptIndex');
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(idxItem);
    await AsyncStorage.setItem('attemptIndex', JSON.stringify(arr));
  } catch (e) {
    console.error('❌ Failed to append attemptIndex:', e);
  }
}
async function writeAttemptDetail(id, detail) {
  try {
    await AsyncStorage.setItem(`attempt:${id}`, JSON.stringify(detail));
  } catch (e) {
    console.error('❌ Failed to write attempt detail:', e);
  }
}

export default function EverydayQuizScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const { categoryKey, categoryTitle, subLevel } = route.params || {};
  const lvl = 'main';
  const sub = subLevel || 'Ⅰ';

  // Resolve a stable, display-friendly title
  const resolvedTitle = useMemo(() => {
    if (categoryTitle && EverydayQuizData?.[categoryTitle]) return categoryTitle;

    const key = categoryKey || normalizeKey(categoryTitle || '');
    if (TITLE_BY_KEY[key]) return TITLE_BY_KEY[key];

    const target = key || normalizeKey(categoryTitle || '');
    const found = Object.keys(EverydayQuizData || {}).find((t) => normalizeKey(t) === target);
    if (found) return found;

    return categoryTitle || '⛑️ First Aid';
  }, [categoryKey, categoryTitle]);

  // Bind current quiz, length, and question by index
  const quizMemo = useMemo(
    () => EverydayQuizData?.[resolvedTitle]?.[lvl]?.[sub] || [],
    [resolvedTitle, lvl, sub]
  );
  const quizLen = quizMemo.length;
  const [index, setIndex] = useState(0);

  // Current question object
  const currentQ = useMemo(() => quizMemo[index], [quizMemo, index]);

  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);

  // Progress bar
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  // Timers: total quiz & per-question
  const quizStartRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());

  // Per-question answer log (for review)
  const answersRef = useRef([]);

  // Vibration toggle
  const [vibrateEnabled, setVibrateEnabled] = useState(true);
  const reloadVibrateSetting = useCallback(async () => {
    try {
      const v = await AsyncStorage.getItem('settings.vibration');
      setVibrateEnabled(v === null ? true : v === 'true');
    } catch (e) {
      console.warn('reloadVibrateSetting error:', e);
    }
  }, []);
  useEffect(() => {
    reloadVibrateSetting();
    const unsub = navigation.addListener('focus', reloadVibrateSetting);
    return unsub;
  }, [navigation, reloadVibrateSetting]);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (finished) return;
      e.preventDefault();
      Alert.alert('Exit Quiz', 'Are you sure you want to exit the quiz? Your progress will be lost.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            if (timerRef.current) clearInterval(timerRef.current);
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return unsub;
  }, [navigation, finished]);

  // Header back button
  const handleBack = () => navigation.goBack();

  // Start BGM on mount; stop + unload on unmount
  useEffect(() => {
    playBgm();
    return () => {
      stopBgm();
    };
  }, []);

  // Fix 1: Ensure each question is logged once
  const lastLoggedIndexRef = useRef(-1);
  const pushAnswer = useCallback(
    (pickedIndex) => {
      if (!currentQ) return;
      if (lastLoggedIndexRef.current === index) return;
      lastLoggedIndexRef.current = index;

      const timeSpentSec = Math.max(0, Math.round((Date.now() - questionStartRef.current) / 1000));
      const selectedAnswer =
        pickedIndex != null && currentQ.options?.[pickedIndex] != null ? currentQ.options[pickedIndex] : null;
      const isCorrect = selectedAnswer === currentQ.answer;

      answersRef.current.push({
        idx: index + 1,
        question: currentQ.question,
        options: currentQ.options,
        correctAnswer: currentQ.answer,
        selectedIndex: pickedIndex,
        selectedAnswer,
        isCorrect,
        timeSpentSec,
      });
    },
    [currentQ, index]
  );
  useEffect(() => {
    lastLoggedIndexRef.current = -1;
  }, [index]);

  const saveCompletionStatus = useCallback(
    async (finalScore) => {
      try {
        const storeKey = categoryKey || normalizeKey(resolvedTitle);
        const key = `everyday_progress_${storeKey}`;
        const json = await AsyncStorage.getItem(key);
        const progress = json ? JSON.parse(json) : {};
        progress[sub] = finalScore === quizLen; 
        await AsyncStorage.setItem(key, JSON.stringify(progress));
      } catch (e) {
        console.error('⚠️ Save progress failed:', e);
      }
    },
    [categoryKey, resolvedTitle, sub, quizLen]
  );

  // Fix 2: Forward-navigation lock to prevent handleNext races
  const advancingRef = useRef(false);

  // —— Persist finished run for Results tab (kind: 'firstaid') ——
  const persistAttemptLocally = useCallback(async ({ finalScore20, total20, timeSpentMs }) => {
    const id = genId();
    const created_at = nowISO();

    const idxItem = {
      id,
      kind: 'firstaid',            // <- ResultContainer filters by this
      disasterType: resolvedTitle, // display title (can include emoji)
      subLevel: sub,
      score: Number(finalScore20),
      total: Number(total20),
      created_at,
    };

    const detail = {
      ...idxItem,
      level: 'main',
      answers: answersRef.current,
      timeSpentMs,
    };

    await appendAttemptIndex(idxItem);
    await writeAttemptDetail(id, detail);
  }, [resolvedTitle, sub]);

  const handleNext = useCallback(async () => {
    if (finished || advancingRef.current) return;
    advancingRef.current = true;

    pushAnswer(selected);

    const isCorrect = selected !== null && currentQ?.options?.[selected] === currentQ?.answer;
    const newScore = score + (isCorrect ? 1 : 0);
    setScore(newScore);

    if (index + 1 < quizLen) {
      setIndex((p) => p + 1);
      setSelected(null);
      questionStartRef.current = Date.now();

      resumeBgm();

      advancingRef.current = false;
    } else {
      setFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);

      await saveCompletionStatus(newScore);

      const finalScore20 = newScore * 20;
      const total20 = quizLen * 20;
      const timeSpentMs = Date.now() - quizStartRef.current;

      await stopBgm();

      // ✅ Save this attempt so it appears under the ⛑️ First Aid tab in Results
      try {
        await persistAttemptLocally({ finalScore20, total20, timeSpentMs });
      } catch (e) {
        console.error('❌ Failed to persist Everyday attempt:', e);
      }

      navigation.replace('FirstAidResult', {
        score: finalScore20,
        total: total20,
        category: resolvedTitle,
        level: lvl,
        sublevel: sub,
        timeSpentMs,
        answers: answersRef.current,
      });
    }
  }, [
    pushAnswer,
    selected,
    currentQ,
    score,
    index,
    quizLen,
    saveCompletionStatus,
    navigation,
    resolvedTitle,
    sub,
    finished,
    persistAttemptLocally,
  ]);

  // Fix 3: Countdown only triggers handleNext if not already advancing
  useEffect(() => {
    if (finished) return;

    setTimeLeft(10);
    progressAnim.setValue(1);
    if (timerRef.current) clearInterval(timerRef.current);

    questionStartRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setSelected(null);
          if (!advancingRef.current) handleNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    Animated.timing(progressAnim, { toValue: 0, duration: 10000, useNativeDriver: false }).start();

    return () => clearInterval(timerRef.current);
  }, [index, finished, handleNext, progressAnim]);

  const getTimerColor = () => {
    const ratio = timeLeft / 10;
    if (ratio <= 0.33) return '#EF4444';
    if (ratio <= 0.66) return '#F59E0B';
    return ACCENT;
  };

  const getOptionStyle = (idx) => {
    if (!currentQ) return styles.option;
    if (selected === null) return [styles.option, { borderColor: ACCENT }];
    const isCorrect = currentQ.options[idx] === currentQ.answer;
    const isSelected = selected === idx;
    if (isSelected && isCorrect) return [styles.option, styles.correct];
    if (isSelected && !isCorrect) return [styles.option, styles.incorrect];
    if (isCorrect) return [styles.option, styles.correct];
    return [styles.option, { borderColor: ACCENT }];
  };

  if (!currentQ) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={styles.headerEmpty}>❌ No quiz data found.</Text>
        <TouchableOpacity style={styles.menuButton} onPress={() => navigation.goBack()}>
          <Text style={styles.menuText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLast = index + 1 === quizLen;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBarBack
        title={`${resolvedTitle} — Sublevel ${sub}`}
        onBack={handleBack}
        backgroundColor="#fff"
        showBorder={true}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <Text style={styles.progress}>Question {index + 1}/{quizLen}</Text>
          <Text style={[styles.timerText, { color: getTimerColor() }]}>⏳ {timeLeft}s</Text>
        </View>

        <View style={[styles.questionCard, { backgroundColor: ACCENT + '33' }]}>
          <Text style={styles.questionText}>{currentQ.question}</Text>
          <View style={styles.progressBarWrapper}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  backgroundColor: getTimerColor(),
                },
              ]}
            />
          </View>
        </View>

        {currentQ.options.map((opt, idx) => (
          <TouchableOpacity
            key={idx}
            style={getOptionStyle(idx)}
            onPress={() => {
              setSelected(idx);
              if (timerRef.current) clearInterval(timerRef.current);

              const correct = currentQ.options[idx] === currentQ.answer;

              // Pause BGM to avoid overlap with SFX
              pauseBgm();

              // Vibrate on wrong answer if enabled
              if (!correct && vibrateEnabled) Vibration.vibrate(200);

              // Play correct/wrong SFX
              correct ? playCorrect() : playWrong();
            }}
            disabled={selected !== null}
          >
            <Text style={styles.optionText}>
              {String.fromCharCode(65 + idx)}. {opt}
            </Text>
          </TouchableOpacity>
        ))}

        {selected !== null && (
          <>
            <Text style={styles.explanation}>💡 {currentQ.explanation}</Text>
            <TouchableOpacity
              style={[styles.nextButton, isLast && { backgroundColor: '#4CAF50' }]}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>{isLast ? 'Finish' : 'Next'}</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const TITLE_COLOR = '#111827';

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fefefe',
    flexGrow: 1,
    paddingTop: 0, 
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  progress: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  timerText: { fontSize: 14, fontWeight: 'bold' },

  questionCard: { padding: 20, borderRadius: 12, marginBottom: 15 },
  questionText: { fontSize: 16, fontWeight: '600', color: '#222', marginBottom: 10 },

  progressBarWrapper: { height: 6, backgroundColor: '#eee', borderRadius: 5, overflow: 'hidden', marginTop: 8 },
  progressBar: { height: 6, borderRadius: 5 },

  option: { backgroundColor: '#ffffff', padding: 14, borderRadius: 8, marginBottom: 10, borderWidth: 2, borderColor: '#dbeafe' },
  correct: { backgroundColor: '#c8e6c9', borderColor: '#388e3c' },
  incorrect: { backgroundColor: '#ffcdd2', borderColor: '#d32f2f' },
  optionText: { fontSize: 15, color: '#111827' },

  explanation: { fontSize: 14, fontStyle: 'italic', color: '#555', marginVertical: 12 },
  nextButton: { backgroundColor: '#9C27B0', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  nextButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  headerEmpty: { fontSize: 22, fontWeight: 'bold', color: '#222', textAlign: 'center', marginBottom: 10, marginTop: 30 },
  menuButton: { backgroundColor: '#9e9e9e', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 14 },
  menuText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
