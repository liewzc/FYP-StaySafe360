import React, { useEffect, useState, useCallback } from 'react';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DisasterSubLevelScreen from '../screens/firstaid/DisasterSubLevelScreen';

const SUBLEVELS = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'];

// Nice titles for display
const TITLES = {
  Flood: 'Flash Flood',
  Lightning: 'Severe Thunderstorms & Lightning', // comes from Preparedness screen
  Haze: 'Haze / Air Quality',
  Heatwave: 'Heatwave / Heat Stress',
  CoastalFlooding: 'Coastal / High Tide Flooding',
  default: 'Disaster Preparedness',
};

// Map route type -> data key used by QUIZ_BANK (DisasterQuiz)
const TYPE_KEY_MAP = {
  Lightning: 'StormsLightning', // data file uses "StormsLightning"
  // Flood/Haze/Heatwave/CoastalFlooding already match
};

export default function DisasterSubLevelContainer() {
  const route = useRoute();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const rawType = route.params?.disasterType ?? 'Flood';
  const niceTitle = route.params?.title || TITLES[rawType] || TITLES.default;

  // Use the effective key everywhere we persist or pass to the quiz
  const effectiveType = TYPE_KEY_MAP[rawType] || rawType;

  const [progress, setProgress] = useState({});

  const loadProgress = useCallback(async () => {
    try {
      const key = `disaster_progress_${effectiveType}`;
      const json = await AsyncStorage.getItem(key);
      setProgress(json ? JSON.parse(json) : {});
    } catch (e) {
      console.error('Failed to load progress:', e);
    }
  }, [effectiveType]);

  useEffect(() => {
    if (isFocused) loadProgress();
  }, [isFocused, loadProgress]);

  const handleOpenSublevel = (subLevel) => {
    navigation.navigate('DisasterQuiz', { disasterType: effectiveType, subLevel });
  };

  return (
    <DisasterSubLevelScreen
      title={niceTitle}
      sublevels={SUBLEVELS}
      progressMap={progress}
      onOpenSublevel={handleOpenSublevel}
    />
  );
}
