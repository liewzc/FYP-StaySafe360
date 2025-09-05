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

// 🔊 声音工具（受 settings.sound 控制）
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

export default function EverydayQuizScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const { categoryKey, categoryTitle, subLevel } = route.params || {};
  const lvl = 'main';
  const sub = subLevel || 'Ⅰ';

  /** ---------- 固定 title ---------- */
  const resolvedTitle = useMemo(() => {
    if (categoryTitle && EverydayQuizData?.[categoryTitle]) return categoryTitle;

    const key = categoryKey || normalizeKey(categoryTitle || '');
    if (TITLE_BY_KEY[key]) return TITLE_BY_KEY[key];

    const target = key || normalizeKey(categoryTitle || '');
    const found = Object.keys(EverydayQuizData || {}).find((t) => normalizeKey(t) === target);
    if (found) return found;

    return categoryTitle || '⛑️ First Aid';
  }, [categoryKey, categoryTitle]);

  /** ---------- 固定 quiz / quizLen / currentQ ---------- */
  const quizMemo = useMemo(
    () => EverydayQuizData?.[resolvedTitle]?.[lvl]?.[sub] || [],
    [resolvedTitle, lvl, sub]
  );
  const quizLen = quizMemo.length;
  const [index, setIndex] = useState(0);

  // 当前题
  const currentQ = useMemo(() => quizMemo[index], [quizMemo, index]);

  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0); // 每题 +1，结果页乘 20
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);

  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  // 计时：总用时 + 每题用时
  const quizStartRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());

  // 每题作答详情
  const answersRef = useRef([]);

  // ✅ 震动开关（与 Profile 的 settings.vibration 对齐）
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

  // 统一拦截返回（物理/手势/UI）
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

  // Header 返回（只 goBack，弹窗交给 beforeRemove）
  const handleBack = () => navigation.goBack();

  // 🔊 进入页面播放 BGM；卸载时停止并释放
  useEffect(() => {
    playBgm();
    return () => {
      stopBgm();
    };
  }, []);

  // ====== 关键修复 1：记录答案去重 ======
  const lastLoggedIndexRef = useRef(-1);
  const pushAnswer = useCallback(
    (pickedIndex) => {
      if (!currentQ) return;
      // 同一题只记录一次
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
  // 切到新题时允许再次记录
  useEffect(() => {
    lastLoggedIndexRef.current = -1;
  }, [index]);

  // 存成就（全对才 complete）
  const saveCompletionStatus = useCallback(
    async (finalScore) => {
      try {
        const storeKey = categoryKey || normalizeKey(resolvedTitle);
        const key = `everyday_progress_${storeKey}`;
        const json = await AsyncStorage.getItem(key);
        const progress = json ? JSON.parse(json) : {};
        progress[sub] = finalScore === quizLen; // 每题 +1，所以 finalScore 满分为 quizLen
        await AsyncStorage.setItem(key, JSON.stringify(progress));
      } catch (e) {
        console.error('⚠️ Save progress failed:', e);
      }
    },
    [categoryKey, resolvedTitle, sub, quizLen]
  );

  // ====== 关键修复 2：前进锁，防止 handleNext 并发 ======
  const advancingRef = useRef(false);

  // 下一题 / 完成
  const handleNext = useCallback(async () => {
    if (finished || advancingRef.current) return; // 防重入
    advancingRef.current = true;

    // 先记录答案（有去重，不会重复）
    pushAnswer(selected);

    const isCorrect = selected !== null && currentQ?.options?.[selected] === currentQ?.answer;
    const newScore = score + (isCorrect ? 1 : 0);
    setScore(newScore);

    if (index + 1 < quizLen) {
      setIndex((p) => p + 1);
      setSelected(null);
      questionStartRef.current = Date.now();

      // 🔊 进入下一题时恢复 BGM
      resumeBgm();

      // 释放锁，允许进入下一题后的交互
      advancingRef.current = false;
    } else {
      setFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);

      await saveCompletionStatus(newScore);

      const finalScore20 = newScore * 20;
      const total20 = quizLen * 20;
      const timeSpentMs = Date.now() - quizStartRef.current;

      // 🔊 完成时停止并释放 BGM
      await stopBgm();

      navigation.replace('FirstAidResult', {
        score: finalScore20,
        total: total20,
        category: resolvedTitle,
        level: lvl,
        sublevel: sub,
        timeSpentMs,
        answers: answersRef.current,
      });
      // 不释放锁：已完成，避免晚到的调用再次进入
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
  ]);

  // ====== 关键修复 3：倒计时超时只在未前进时触发 handleNext ======
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
          // 只有还没在前进流程中时才触发（避免与按钮点击并发）
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
      {/* 使用 TopBarBack 组件替换原有的顶部栏 */}
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

              // 🔊 答题瞬间暂停 BGM，避免和 SFX 叠音
              pauseBgm();

              // ✅ 仅当开启时且答错时震动
              if (!correct && vibrateEnabled) Vibration.vibrate(200);

              // 🔊 播放对/错音效（受 settings.sound 控制）
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
  // 主体
  container: {
    padding: 20,
    backgroundColor: '#fefefe',
    flexGrow: 1,
    paddingTop: 0, // 因为顶部栏已经有了安全区域处理
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
