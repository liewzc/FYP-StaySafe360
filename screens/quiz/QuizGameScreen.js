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

// 🔊 声音工具（受 settings.sound 控制）
import {
  playBgm, pauseBgm, resumeBgm, stopBgm,
  playCorrect, playWrong
} from '../../utils/sound';

const ACCENT = '#0B6FB8';
const TIME_LIMIT = 15;
const SCORE_PER_CORRECT = 20;
const PROGRESS_KEY = 'quizProgress'; // ✅ 统一存储键

export default function QuizGameScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { disasterType = 'Earthquake', subLevel = 'Ⅰ' } = route.params || {};

  // 题库
  const quiz = useMemo(() => QUIZ_BANK?.[disasterType]?.[subLevel] ?? [], [disasterType, subLevel]);
  const quizLength = quiz.length;

  // 状态
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);

  // 受 Profile 开关控制的震动
  const [vibrateEnabled, setVibrateEnabled] = useState(true);
  const reloadVibrateSetting = useCallback(async () => {
    try {
      const v = await AsyncStorage.getItem('settings.vibration');
      setVibrateEnabled(v === null ? true : v === 'true'); // 默认开启
    } catch (e) {
      console.warn('reloadVibrateSetting error:', e);
    }
  }, []);

  // 动画/计时
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);
  const quizStartRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());

  // 当前题与作答记录
  const answersRef = useRef([]);
  const current = quiz[index];

  // ====== 防并发关键：前进锁 & 去重记录 ======
  const advancingRef = useRef(false);      // 防止 handleNext 重入
  const lastLoggedIndexRef = useRef(-1);   // 保证同一题只 push 一次

  // ====== 存进度（统一为 quizProgress: 'complete'/'incomplete'） ======
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

  // ✅ 一次性迁移旧数据：quiz_progress_${disasterType}（boolean -> 'complete'/'incomplete'）
  useEffect(() => {
    (async () => {
      try {
        const legacyKey = `quiz_progress_${disasterType}`;
        const legacyRaw = await AsyncStorage.getItem(legacyKey);
        if (!legacyRaw) return;

        const legacy = JSON.parse(legacyRaw); // { 'Ⅰ': true/false, ... }
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

  // ========= 生命周期：返回拦截 =========
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (finished) return;
      e.preventDefault();
      Alert.alert('Exit Quiz', 'Exit now? Your progress will be lost.', [
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

  // ========= 生命周期：震动开关同步 =========
  useEffect(() => {
    reloadVibrateSetting();
    const unsub = navigation.addListener('focus', reloadVibrateSetting);
    return unsub;
  }, [navigation, reloadVibrateSetting]);

  // ========= 生命周期：BGM =========
  useEffect(() => {
    playBgm();                 // 已受 settings.sound 控制
    return () => { stopBgm(); };
  }, []);

  // ========= 工具：计时条颜色 =========
  const getTimerColor = () => {
    const ratio = timeLeft / TIME_LIMIT;
    if (ratio <= 0.33) return '#EF4444'; // red
    if (ratio <= 0.66) return '#F59E0B'; // amber
    return ACCENT;                       // blue
  };

  // ========= 记录答案（同一题只记录一次）=========
  const pushAnswer = useCallback((pickedIndex) => {
    const q = quiz[index];
    if (!q) return;
    if (lastLoggedIndexRef.current === index) return; // 去重：同一题只 push 一次
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

  // 切到新题时，允许再次记录
  useEffect(() => { lastLoggedIndexRef.current = -1; }, [index]);

  // ========= 下一题 / 完成（带前进锁）=========
  const handleNext = useCallback(async () => {
    if (finished || advancingRef.current) return; // 防重入
    advancingRef.current = true;

    // 先记录答案
    pushAnswer(selected);

    const ok = selected !== null && current?.options?.[selected] === current?.answer;
    const newScore = score + (ok ? SCORE_PER_CORRECT : 0);
    setScore(newScore);

    if (index + 1 < quizLength) {
      setIndex((p) => p + 1);
      setSelected(null);
      questionStartRef.current = Date.now();

      // 🔊 进入下一题时恢复 BGM
      resumeBgm();

      // 释放锁（继续答题）
      advancingRef.current = false;
    } else {
      setFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);

      // 🔊 完成时彻底停掉 BGM
      await stopBgm();

      // 保存进度（统一 key/格式）
      await saveProgress(newScore);

      const timeSpentMs = Date.now() - quizStartRef.current;
      navigation.replace('ResultShare', {
        disasterType,
        subLevel,
        score: newScore,
        total: quizLength * SCORE_PER_CORRECT,
        timeSpentMs,
        answers: answersRef.current,
      });
      // 不释放锁：已完成，避免晚到调用重复进入
    }
  }, [
    selected, current, score, index, quizLength,
    navigation, disasterType, subLevel, saveProgress, pushAnswer, finished
  ]);

  // ========= 计时器（到点时仅在未前进时触发）=========
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
          // 只有还没在前进流程中时才触发（避免与按钮点击并发）
          if (!advancingRef.current) handleNext();
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

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [index, finished, handleNext, progressAnim]);

  // ========= 渲染 =========
  if (!current) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <TopBarBack title={`${disasterType} - Sublevel ${subLevel}`} />
        <View style={[styles.container, { justifyContent: 'center' }]}>
          <Text style={styles.header}>❌ No questions available.</Text>
          <TouchableOpacity style={styles.menuButton} onPress={() => navigation.goBack()}>
            <Text style={styles.menuText}>Go Back</Text>
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

              // 🔊 答题瞬间暂停 BGM，避免与 SFX 叠音
              pauseBgm();

              // ✅ 仅当开启时且答错时震动
              if (!correct && vibrateEnabled) Vibration.vibrate(200);

              // 🔊 播放对/错音效
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

// ================= Styles =================
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
