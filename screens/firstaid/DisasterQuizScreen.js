// screens/firstaid/DisasterQuizScreen.js
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, Alert, Vibration
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QUIZ_BANK } from './disasterQuizData';
import { logDisasterResult } from '../../utils/quizStorage';
import TopBarBack from '../../components/ui/TopBarBack';

// 🔊 声音工具（受 settings.sound 控制）
import {
  playBgm, pauseBgm, resumeBgm, stopBgm,
  playCorrect, playWrong
} from '../../utils/sound';

// ✅ Preparedness 五大类的标题映射
const TITLE = {
  Flood: 'Flash Flood',
  StormsLightning: 'Severe Thunderstorms & Lightning',
  Haze: 'Haze / Air Quality',
  Heatwave: 'Heatwave / Heat Stress',
  CoastalFlooding: 'Coastal / High Tide Flooding',
};

const ACCENT = '#0B6FB8';
const TIME_LIMIT = 15;
const SCORE_PER = 20;

export default function DisasterQuizScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  // ✅ 默认改为 Flood，和新题库保持一致
  const { disasterType = 'Flood', subLevel = 'Ⅰ' } = route.params || {};

  const quiz = useMemo(() => QUIZ_BANK?.[disasterType]?.[subLevel] ?? [], [disasterType, subLevel]);
  const quizLength = quiz.length;

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);

  const timerRef = useRef(null);
  const bar = useRef(new Animated.Value(1)).current;

  // 计时：总时长与每题时长
  const quizStartRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());

  // 每题详情
  const answersRef = useRef([]);

  // ✅ 震动开关（从 Profile 的 settings.vibration 读取）
  const [vibrateEnabled, setVibrateEnabled] = useState(true);
  const reloadVibrateSetting = useCallback(async () => {
    try {
      const v = await AsyncStorage.getItem('settings.vibration');
      // 默认打开（如果从未存过）
      setVibrateEnabled(v === null ? true : v === 'true');
    } catch (e) {
      console.warn('reloadVibrateSetting error:', e);
    }
  }, []);

  // ✅ 统一拦截所有返回（物理/手势/UI）
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (finished) return;
      e.preventDefault();
      Alert.alert('Exit Quiz', 'Exit now? Your progress will be lost.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsub;
  }, [navigation, finished]);

  // ✅ Header 的 back 只调用 goBack，弹窗交给 beforeRemove
  const handleBack = () => {
    navigation.goBack();
  };

  // ✅ 初次进入 & 获得焦点时刷新震动设置
  useEffect(() => {
    reloadVibrateSetting();
    const unsub = navigation.addListener('focus', reloadVibrateSetting);
    return unsub;
  }, [navigation, reloadVibrateSetting]);

  // 🔊 进入页面播放 BGM；卸载时停止并释放
  useEffect(() => {
    playBgm();
    return () => {
      stopBgm();
    };
  }, []);

  // 进度保存（全对=complete）
  const saveProgress = useCallback(async (finalScore) => {
    try {
      const total = quizLength * SCORE_PER;
      const key = `disaster_progress_${disasterType}`;
      const json = await AsyncStorage.getItem(key);
      const data = json ? JSON.parse(json) : {};
      data[subLevel] = finalScore === total;
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('save progress failed:', e);
    }
  }, [disasterType, subLevel, quizLength]);

  // 记录当前题
  const pushAnswer = useCallback((pickedIndex) => {
    const q = quiz[index];
    if (!q) return;
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

  // 倒计时颜色
  const getTimerColor = () => {
    const ratio = timeLeft / TIME_LIMIT;
    if (ratio <= 0.33) return '#EF4444';
    if (ratio <= 0.66) return '#F59E0B';
    return ACCENT;
  };

  // 下一题 / 完成
  const handleNext = useCallback(async () => {
    const cur = quiz[index];
    pushAnswer(selected);

    const ok = selected !== null && cur?.options?.[selected] === cur?.answer;
    const newScore = score + (ok ? SCORE_PER : 0);
    setScore(newScore);

    if (index + 1 < quizLength) {
      setIndex((p) => p + 1);
      setSelected(null);
      questionStartRef.current = Date.now();
      // 🔊 进入下一题时恢复 BGM
      resumeBgm();
    } else {
      setFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);
      // 🔊 完成时停止并释放 BGM
      await stopBgm();
      await saveProgress(newScore);

      // ✅ 统一写入历史（Supabase + 本地兜底）
      const timeSpentMs = Date.now() - quizStartRef.current;
      try {
        await logDisasterResult({
          disasterType: TITLE[disasterType] || disasterType,
          level: 'main',
          subLevel,
          score: newScore,
          timeSpentMs,
        });
      } catch (e) {
        console.warn('Failed to log disaster result:', e);
      }

      navigation.replace('FirstAidResult', {
        score: newScore,
        total: quizLength * SCORE_PER,
        category: TITLE[disasterType] || 'Disaster Preparedness',
        level: 'main',
        sublevel: subLevel,
        timeSpentMs,
        answers: answersRef.current,
      });
    }
  }, [quiz, index, selected, score, quizLength, disasterType, subLevel, saveProgress, pushAnswer, navigation]);

  // 计时器
  useEffect(() => {
    if (finished) return;

    setTimeLeft(TIME_LIMIT);
    bar.setValue(1);
    if (timerRef.current) clearInterval(timerRef.current);

    questionStartRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setSelected(null);
          handleNext(); // 超时未选，进入下一题（会 resumeBgm）
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    Animated.timing(bar, { toValue: 0, duration: TIME_LIMIT * 1000, useNativeDriver: false }).start();

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [index, finished, handleNext, bar]);

  const q = quiz[index];
  if (!q) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={styles.headerEmpty}>❌ No questions available.</Text>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.menuTxt}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLast = index + 1 === quizLength;

  const optStyle = (i) => {
    if (selected === null) return [styles.option, { borderColor: ACCENT }];
    const ok = q.options[i] === q.answer;
    const chosen = selected === i;
    if (chosen && ok) return [styles.option, styles.correct];
    if (chosen && !ok) return [styles.option, styles.incorrect];
    if (ok) return [styles.option, styles.correct];
    return [styles.option, { borderColor: ACCENT }];
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* 使用TopBarBack组件替换原有顶部栏 */}
      <TopBarBack
        title={`${TITLE[disasterType] || disasterType} — Sublevel ${subLevel}`}
        onBack={handleBack}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <Text style={styles.progress}>Question {index + 1}/{quizLength}</Text>
          <Text style={[styles.timerText, { color: getTimerColor() }]}>⏳ {timeLeft}s</Text>
        </View>

        <View style={[styles.questionCard, { backgroundColor: ACCENT + '33' }]}>
          <Text style={styles.questionText}>{q.question}</Text>

          <View style={styles.progressBarWrapper}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  backgroundColor: getTimerColor(),
                },
              ]}
            />
          </View>
        </View>

        {q.options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            style={optStyle(i)}
            disabled={selected !== null}
            onPress={() => {
              setSelected(i);
              if (timerRef.current) clearInterval(timerRef.current);

              const correct = q.options[i] === q.answer;

              // 🔊 答题瞬间暂停 BGM，避免和 SFX 叠音
              pauseBgm();

              // ✅ 仅当开启时震动（且只在答错时震）
              if (!correct && vibrateEnabled) Vibration.vibrate(200);

              // 🔊 播放对/错音效（受 settings.sound 控制）
              correct ? playCorrect() : playWrong();
            }}
          >
            <Text style={styles.optText}>{String.fromCharCode(65 + i)}. {opt}</Text>
          </TouchableOpacity>
        ))}

        {selected !== null && (
          <>
            <Text style={styles.explanation}>💡 {q.explanation}</Text>
            <TouchableOpacity
              style={[styles.nextBtn, isLast && { backgroundColor: '#4CAF50' }]}
              onPress={handleNext}
            >
              <Text style={styles.nextTxt}>{isLast ? 'Finish' : 'Next'}</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fefefe', flexGrow: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  progress: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  timerText: { fontSize: 14, fontWeight: 'bold' },

  questionCard: { padding: 20, borderRadius: 12, marginBottom: 15 },
  questionText: { fontSize: 16, fontWeight: '600', color: '#222', marginBottom: 10 },

  progressBarWrapper: { height: 6, backgroundColor: '#eee', borderRadius: 5, overflow: 'hidden', marginTop: 8 },
  progressBar: { height: 6, borderRadius: 5 },

  option: { backgroundColor: '#fff', padding: 14, borderRadius: 8, marginBottom: 10, borderWidth: 2 },
  correct: { backgroundColor: '#c8e6c9', borderColor: '#388e3c' },
  incorrect: { backgroundColor: '#ffcdd2', borderColor: '#d32f2f' },
  optText: { fontSize: 15, color: '#111827' },

  explanation: { fontSize: 14, fontStyle: 'italic', color: '#555', marginVertical: 12 },
  nextBtn: { backgroundColor: '#9C27B0', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  nextTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  headerEmpty: { fontSize: 18, fontWeight: '800', color: ACCENT, marginTop: 6, marginBottom: 10 },
  menuBtn: { backgroundColor: '#9e9e9e', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 14 },
  menuTxt: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
