// screens/quiz/QuizGameScreen.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Animated, Alert, Vibration
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QUIZ_BANK } from './quizData';
import TopBarBack from '../../components/ui/TopBarBack';

import {
  playBgm, pauseBgm, resumeBgm, stopBgm,
  playCorrect, playWrong
} from '../../utils/sound';

const ACCENT = '#0B6FB8';
const TIME_LIMIT = 15;
const SCORE_PER_CORRECT = 20;
const PROGRESS_KEY = 'quizProgress';

export default function QuizGameScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    disasterType = 'Earthquake',
    subLevel = 'Ⅰ',
    backTarget,
    backParams = {},
  } = route.params || {};

  const quiz = useMemo(() => QUIZ_BANK?.[disasterType]?.[subLevel] ?? [], [disasterType, subLevel]);
  const quizLength = quiz.length;

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);

  const [vibrateEnabled, setVibrateEnabled] = useState(true);
  const reloadVibrateSetting = useCallback(async () => {
    try {
      const v = await AsyncStorage.getItem('settings.vibration');
      setVibrateEnabled(v === null ? true : v === 'true');
    } catch (e) {
      console.warn('reloadVibrateSetting error:', e);
    }
  }, []);

  const progressAnim = useRef(new Animated.Value(1)).current;
  const handleNextRef = useRef(null);
  const timerRef = useRef(null);
  const quizStartRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());

  const answersRef = useRef([]);
  const current = quiz[index];

  const advancingRef = useRef(false);
  const lastLoggedIndexRef = useRef(-1);

  // ✅ allow a single removal after user confirms exit
  const allowExitRef = useRef(false);

  // ===== Exit target helper =====
  const exitToHub = useCallback(async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      await stopBgm();
    } catch {}

    // let the next navigation removal pass
    allowExitRef.current = true;

    // ⬅️ Go back to the root of this stack: "Select a quiz type" (QuizScreen)
    navigation.popToTop();
  }, [navigation]);

  const saveProgress = useCallback(async (finalScore) => {
    try {
      const total = quizLength * SCORE_PER_CORRECT;
      const pass = finalScore === total;
      const raw = await AsyncStorage.getItem(PROGRESS_KEY);
      const all = raw ? JSON.parse(raw) : {};
      const node = typeof all[disasterType] === 'object' ? all[disasterType] : {};
      node[subLevel] = pass ? 'complete' : 'incomplete';
      all[disasterType] = node;
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('⚠️ Failed to save quiz progress:', e);
    }
  }, [disasterType, subLevel, quizLength]);

  useEffect(() => {
    (async () => {
      try {
        const legacyKey = `quiz_progress_${disasterType}`;
        const legacyRaw = await AsyncStorage.getItem(legacyKey);
        if (!legacyRaw) return;

        const legacy = JSON.parse(legacyRaw);
        const raw = await AsyncStorage.getItem(PROGRESS_KEY);
        const all = raw ? JSON.parse(raw) : {};
        const node = typeof all[disasterType] === 'object' ? all[disasterType] : {};

        Object.entries(legacy).forEach(([k, v]) => {
          node[k] = v ? 'complete' : 'incomplete';
        });
        all[disasterType] = node;

        await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
        await AsyncStorage.removeItem(legacyKey);
      } catch (e) {
        console.warn('migrate legacy quiz progress failed:', e);
      }
    })();
  }, [disasterType]);

  // 🔒 Intercept any attempt to leave unless finished or explicitly allowed
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (finished || allowExitRef.current) {
        // Let the navigation happen
        return;
      }
      e.preventDefault();
      Alert.alert('Exit Quiz', 'Exit now? Your progress will be lost.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            allowExitRef.current = true; // permit the next removal
            // If you want to go back instead of replace, uncomment below:
            // navigation.dispatch(e.data.action);
            exitToHub();
          },
        },
      ]);
    });
    return unsub;
  }, [navigation, finished, exitToHub]);

  useEffect(() => {
    reloadVibrateSetting();
    const unsub = navigation.addListener('focus', reloadVibrateSetting);
    return unsub;
  }, [navigation, reloadVibrateSetting]);

  useEffect(() => {
    playBgm();
    return () => { stopBgm(); };
  }, []);

  const getTimerColor = () => {
    const ratio = timeLeft / TIME_LIMIT;
    if (ratio <= 0.33) return '#EF4444';
    if (ratio <= 0.66) return '#F59E0B';
    return ACCENT;
  };

  const pushAnswer = useCallback((pickedIndex) => {
    const q = quiz[index];
    if (!q) return;
    if (lastLoggedIndexRef.current === index) return;
    lastLoggedIndexRef.current = index;

    const timeSpentSec = Math.max(0, Math.round((Date.now() - questionStartRef.current) / 1000));
    const selectedAnswer = (pickedIndex != null && q.options?.[pickedIndex] != null) ? q.options[pickedIndex] : null;
    const isCorrect = selectedAnswer === q.answer;

    answersRef.current.push({
      idx: index + 1,
      question: q.question,
      options: q.options,
      correctAnswer: q.answer,
      selectedIndex: pickedIndex,
      selectedAnswer,
      isCorrect,
      timeSpentSec,
    });
  }, [quiz, index]);

  useEffect(() => { lastLoggedIndexRef.current = -1; }, [index]);

  const handleNext = useCallback(async () => {
    if (finished || advancingRef.current) return;
    advancingRef.current = true;

    pushAnswer(selected);

    const ok = selected !== null && current?.options?.[selected] === current?.answer;
    const newScore = score + (ok ? SCORE_PER_CORRECT : 0);
    setScore(newScore);

    if (index + 1 < quizLength) {
      setIndex((p) => p + 1);
      setSelected(null);
      questionStartRef.current = Date.now();
      resumeBgm();
      advancingRef.current = false;
    } else {
      setFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);
      await stopBgm();
      await saveProgress(newScore);

      const timeSpentMs = Date.now() - quizStartRef.current;
      navigation.replace('ResultShare', {
        disasterType,
        subLevel,
        score: newScore,
        total: quizLength * SCORE_PER_CORRECT,
        timeSpentMs,
        answers: answersRef.current,
        backTarget: backTarget || 'DisasterSelect',
        backParams,
      });
    }
  }, [
    selected, current, score, index, quizLength,
    navigation, disasterType, subLevel, saveProgress, pushAnswer, finished,
    backTarget, backParams
  ]);

  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  useEffect(() => {
    if (finished) return;

    setTimeLeft(TIME_LIMIT);
    progressAnim.setValue(1);
    if (timerRef.current) clearInterval(timerRef.current);
    questionStartRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
        setSelected(null);
          if (!advancingRef.current) {
            // call the latest handleNext without recreating the effect
            handleNextRef.current?.();
        }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: TIME_LIMIT * 1000,
      useNativeDriver: false,
    }).start();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
  };
  }, [index, finished]);

  if (!current) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <TopBarBack title={`${disasterType} - Sublevel ${subLevel}`} />
        <View style={[styles.container, { justifyContent: 'center' }]}>
          <Text style={styles.header}>❌ No questions available.</Text>
          <TouchableOpacity style={styles.menuButton} onPress={exitToHub}>
            <Text style={styles.menuText}>Back to Hub</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isLast = index + 1 === quizLength;
  const getOptionStyle = (i) => {
    if (selected === null) return [styles.option, { borderColor: ACCENT }];
    const ok = current.options[i] === current.answer;
    const chosen = selected === i;
    if (chosen && ok) return [styles.option, styles.correct];
    if (chosen && !ok) return [styles.option, styles.incorrect];
    if (ok) return [styles.option, styles.correct];
    return [styles.option, { borderColor: ACCENT }];
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBarBack title={`${disasterType} - Sublevel ${subLevel}`} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <Text style={styles.progress}>Question {index + 1}/{quizLength}</Text>
          <Text style={[styles.timerText, { color: getTimerColor() }]}>⏳ {timeLeft}s</Text>
        </View>

        <View style={[styles.questionCard, { backgroundColor: ACCENT + '33' }]}>
          <Text style={styles.questionText}>{current.question}</Text>
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

        {current.options.map((opt, idx) => (
          <TouchableOpacity
            key={idx}
            style={getOptionStyle(idx)}
            onPress={() => {
              setSelected(idx);
              if (timerRef.current) clearInterval(timerRef.current);

              const correct = current.options[idx] === current.answer;
              pauseBgm();
              if (!correct && vibrateEnabled) Vibration.vibrate(200);
              correct ? playCorrect() : playWrong();
            }}
            disabled={selected !== null || finished}
            activeOpacity={0.9}
          >
            <Text style={styles.optionText}>{String.fromCharCode(65 + idx)}. {opt}</Text>
          </TouchableOpacity>
        ))}

        {selected !== null && (
          <>
            <Text style={styles.explanation}>💡 {current.explanation}</Text>
            <TouchableOpacity
              style={[styles.nextButton, isLast && { backgroundColor: '#4CAF50' }]}
              onPress={handleNext}
              disabled={finished}
            >
              <Text style={styles.nextButtonText}>{isLast ? 'Finish' : 'Next'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 12,
    backgroundColor: '#fefefe',
    flexGrow: 1
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    marginBottom: 10,
    marginTop: 30
  },
  progress: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  timerText: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  questionCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 15
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 10
  },
  progressBarWrapper: {
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 8
  },
  progressBar: {
    height: 6,
    borderRadius: 5
  },
  option: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2
  },
  correct: {
    backgroundColor: '#c8e6c9',
    borderColor: '#388e3c'
  },
  incorrect: {
    backgroundColor: '#ffcdd2',
    borderColor: '#d32f2f'
  },
  optionText: {
    fontSize: 16,
    color: '#222'
  },
  explanation: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#555',
    marginVertical: 12
  },
  nextButton: {
    backgroundColor: '#9C27B0',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  menuButton: {
    backgroundColor: '#9e9e9e',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
});
