// logic/DisasterQuizContainer.js
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Alert, Vibration } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DisasterQuizScreen from '../screens/firstaid/DisasterQuizScreen';
import { QUIZ_BANK } from '../screens/firstaid/disasterQuizData';
// (optional) still log to server if you want:
import { logDisasterResult } from '../utils/quizStorage';

import {
  playBgm, pauseBgm, resumeBgm, stopBgm,
  playCorrect, playWrong
} from '../utils/sound';

const TIME_LIMIT = 15;
const SCORE_PER = 20;
const ACCENT = '#0B6FB8';

const TITLE_MAP = {
  Flood: 'Flash Flood',
  StormsLightning: 'Severe Thunderstorms & Lightning',
  Haze: 'Haze / Air Quality',
  Heatwave: 'Heatwave / Heat Stress',
  CoastalFlooding: 'Coastal / High Tide Flooding',
};

// local attempt persistence helpers (Results tab expects these)
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
    console.error('❌ appendAttemptIndex failed:', e);
  }
}
async function writeAttemptDetail(id, detail) {
  try {
    await AsyncStorage.setItem(`attempt:${id}`, JSON.stringify(detail));
  } catch (e) {
    console.error('❌ writeAttemptDetail failed:', e);
  }
}

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
  const [score, setScore] = useState(0); // scaled by SCORE_PER
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);

  const timerRef = useRef(null);
  const quizStartRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());
  const answersRef = useRef([]);

  // de-dup per-question logging
  const lastLoggedIndexRef = useRef(-1);
  const pushAnswer = useCallback((pickedIndex) => {
    const q = quiz[index];
    if (!q) return;
    if (lastLoggedIndexRef.current === index) return;
    lastLoggedIndexRef.current = index;

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

  useEffect(() => { lastLoggedIndexRef.current = -1; }, [index]);

  const advancingRef = useRef(false);

  // back intercept
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (finished) return;
      e.preventDefault();
      Alert.alert(
        'Exit Quiz',
        'Are you sure you want to exit the quiz? Your progress will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Exit',
            style: 'destructive',
            onPress: () => {
              if (timerRef.current) clearInterval(timerRef.current);
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
    });
    return unsub;
  }, [navigation, finished]);

  const onBack = useCallback(() => navigation.goBack(), [navigation]);

  // vibration setting
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

  // bgm
  useEffect(() => {
    playBgm();
    return () => { stopBgm(); };
  }, []);

  // persist a finished attempt AS FIRST AID
  const persistAttemptLocally = useCallback(async ({ finalScore, total, timeSpentMs }) => {
    const title = TITLE_MAP[disasterType] || disasterType;
    const id = genId();
    const created_at = nowISO();

    const idxItem = {
      id,
      kind: 'firstaid',          // 👈 put it in the First Aid column
      disasterType: title,       // what ResultScreen shows as title
      subLevel: subLevel,
      score: Number(finalScore),
      total: Number(total),
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
  }, [disasterType, subLevel]);

  const handleNext = useCallback(async () => {
    if (finished || advancingRef.current) return;
    advancingRef.current = true;

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
      advancingRef.current = false;
    } else {
      setFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);
      await stopBgm();

      const finalScore = newScore; // already scaled
      const total = quizLength * SCORE_PER;
      const timeSpentMs = Date.now() - quizStartRef.current;

      // (optional) server log; harmless if it fails
      try {
        await logDisasterResult({
          disasterType: TITLE_MAP[disasterType] || disasterType,
          level: 'main',
          subLevel,
          score: finalScore,
          timeSpentMs,
        });
      } catch {}

      // ✅ local log for Results tab under First Aid
      try {
        await persistAttemptLocally({ finalScore, total, timeSpentMs });
      } catch (e) {
        console.warn('Failed to persist local disaster attempt:', e);
      }

      navigation.replace('FirstAidResult', {
        score: finalScore,
        total,
        category: TITLE_MAP[disasterType] || 'Disaster Preparedness',
        level: 'main',
        sublevel: subLevel,
        timeSpentMs,
        answers: answersRef.current,
      });
      // keep lock (we're done)
    }
  }, [
    quiz, index, selected, score, quizLength,
    navigation, disasterType, subLevel, finished, pushAnswer, persistAttemptLocally
  ]);

  // per-question timer
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
          if (!advancingRef.current) handleNext();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [index, finished, handleNext]);

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

  const q = quiz[index];
  const correctIndex = useMemo(() => {
    if (!q?.options) return null;
    return q.options.findIndex((o) => o === q.answer);
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
