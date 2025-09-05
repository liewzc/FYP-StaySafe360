// logic/DisasterQuizContainer.js
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Vibration } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DisasterQuizScreen from '../screens/firstaid/DisasterQuizScreen';
import { QUIZ_BANK } from '../assets/firstaid/disasterQuizData';
import { logDisasterResult } from '../utils/quizStorage';

// sound utils (respect your internal sound settings)
import {
  playBgm, pauseBgm, resumeBgm, stopBgm,
  playCorrect, playWrong
} from '../utils/sound';

// Constants / labels
const TITLE_MAP = {
  Flood: 'Flash Flood',
  StormsLightning: 'Severe Thunderstorms & Lightning',
  Haze: 'Haze / Air Quality',
  Heatwave: 'Heatwave / Heat Stress',
  CoastalFlooding: 'Coastal / High Tide Flooding',
};

const TIME_LIMIT = 15;
const SCORE_PER = 20;
const ACCENT = '#0B6FB8';

export default function DisasterQuizContainer() {
  const navigation = useNavigation();
  const route = useRoute();
  const { disasterType = 'Flood', subLevel = 'Ⅰ' } = route.params || {};

  const quiz = useMemo(
    () => QUIZ_BANK?.[disasterType]?.[subLevel] ?? [],
    [disasterType, subLevel]
  );

  const quizLength = quiz.length;

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);

  const timerRef = useRef(null);
  const quizStartRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());
  const answersRef = useRef([]);

  // Back intercept (all types: gesture/hardware/UI)
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (finished) return;
      e.preventDefault();
      // Defer to the stack's confirmation UI
      navigation.navigate('Checklist', {
        // or show a modal… keeping simple: use the Alert from your screen if desired
      });
      // Simpler: just map to default Alert via replace call in the screen if you prefer.
    });
    return unsub;
  }, [navigation, finished]);

  const onBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Load vibration setting (default on)
  const reloadVibrateSetting = useCallback(async () => {
    try {
      const v = await AsyncStorage.getItem('settings.vibration');
      setVibrateEnabled(v === null ? true : v === 'true');
    } catch {}
  }, []);

  useEffect(() => {
    reloadVibrateSetting();
    const unsub = navigation.addListener('focus', reloadVibrateSetting);
    return unsub;
  }, [navigation, reloadVibrateSetting]);

  // bgm lifecycle
  useEffect(() => {
    playBgm();
    return () => { stopBgm(); };
  }, []);

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

  const pushAnswer = useCallback((pickedIndex) => {
    const q = quiz[index];
    if (!q) return;
    const timeSpentSec = Math.max(0, Math.round((Date.now() - questionStartRef.current) / 1000));
    const selectedAnswer = (pickedIndex != null && q.options?.[pickedIndex] != null)
      ? q.options[pickedIndex]
      : null;
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
      resumeBgm();
    } else {
      setFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);
      await stopBgm();
      await saveProgress(newScore);

      const timeSpentMs = Date.now() - quizStartRef.current;
      try {
        await logDisasterResult({
          disasterType: TITLE_MAP[disasterType] || disasterType,
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
        category: TITLE_MAP[disasterType] || 'Disaster Preparedness',
        level: 'main',
        sublevel: subLevel,
        timeSpentMs,
        answers: answersRef.current,
      });
    }
  }, [quiz, index, selected, score, quizLength, disasterType, subLevel, saveProgress, pushAnswer, navigation]);

  // Timer per question
  useEffect(() => {
    if (finished) return;

    setTimeLeft(TIME_LIMIT);
    if (timerRef.current) clearInterval(timerRef.current);
    questionStartRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setSelected(null);
          handleNext(); // timeout -> advance
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [index, finished, handleNext]);

  // UI helpers
  const getTimerColor = useCallback(() => {
    const ratio = timeLeft / TIME_LIMIT;
    if (ratio <= 0.33) return '#EF4444';
    if (ratio <= 0.66) return '#F59E0B';
    return ACCENT;
  }, [timeLeft]);

  const onSelect = useCallback((i) => {
    const q = quiz[index];
    setSelected(i);
    if (timerRef.current) clearInterval(timerRef.current);

    const correct = q?.options?.[i] === q?.answer;
    pauseBgm();
    if (!correct && vibrateEnabled) Vibration.vibrate(200);
    correct ? playCorrect() : playWrong();
  }, [quiz, index, vibrateEnabled]);

  // Current question & indices
  const q = quiz[index];
  const correctIndex = useMemo(() => {
    if (!q?.options) return null;
    return q.options.findIndex(o => o === q.answer);
  }, [q]);

  const title = `${TITLE_MAP[disasterType] || disasterType} — Sublevel ${subLevel}`;
  const isLast = index + 1 === quizLength;
  const progressFraction = Math.max(0, Math.min(1, timeLeft / TIME_LIMIT));

  return (
    <DisasterQuizScreen
      title={title}
      question={q || null}
      index={index}
      total={quizLength}
      selectedIndex={selected}
      correctIndex={correctIndex}
      onSelect={onSelect}
      onNext={handleNext}
      isLast={isLast}
      timeLeft={timeLeft}
      timerColor={getTimerColor()}
      progressFraction={progressFraction}
      onBack={onBack}
    />
  );
}
