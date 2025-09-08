// logic/HomeContainer.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import HomeScreen from '../screens/HomeScreen';
import { getAll } from '../utils/dataGov';

const ALERT_KEYS = {
  lastLevel: 'alerts.lastLevel',
  lastPushAt: 'alerts.lastPushAt',
};

// Ask for push permission
async function ensurePushPermission() {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// Fire an immediate local notification
async function sendAlertNotification({ title, body }) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
  } catch {}
}

export default function HomeContainer() {
  const navigation = useNavigation();

  // Loading/Refresh
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Location
  const [location, setLocation] = useState(null);

  // Main metrics
  const [temp, setTemp] = useState('--');
  const [humidity, setHumidity] = useState('--');
  const [wind, setWind] = useState('--');
  const [pm25, setPm25] = useState('--');

  // Map overlays
  const [pm25Data, setPm25Data] = useState([]);
  const [rainData, setRainData] = useState([]);
  const [humidityData, setHumidityData] = useState([]);

  // Profile settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const loadNotificationFlag = useCallback(async () => {
    try {
      const v = await AsyncStorage.getItem('settings.notifications');
      setNotificationsEnabled(v === null ? true : v === 'true'); // default ON
    } catch {}
  }, []);

  // Dev mock flag
  const [mockDisasterActive, setMockDisasterActive] = useState(false);
  const loadMockFlag = useCallback(async () => {
    try {
      const v = await AsyncStorage.getItem('dev.mockDisaster');
      setMockDisasterActive(v === 'true');
    } catch {}
  }, []);

  // Alarm (sound)
  const [alarmSound, setAlarmSound] = useState(null);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  const toggleAlarm = useCallback(async () => {
    try {
      if (isAlarmPlaying && alarmSound) {
        await alarmSound.stopAsync();
        await alarmSound.unloadAsync();
        setAlarmSound(null);
        setIsAlarmPlaying(false);
        return;
      }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/quickactionbar/alarm.mp3'),
        { isLooping: true, volume: 1.0 }
      );
      setAlarmSound(sound);
      await sound.playAsync();
      setIsAlarmPlaying(true);
    } catch {}
  }, [isAlarmPlaying, alarmSound]);

  useEffect(() => {
    return () => { if (alarmSound) alarmSound.unloadAsync(); };
  }, [alarmSound]);

  // Fetch everything
  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync();
      const userLoc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setLocation(userLoc);

      const { air, rh, wind: windObj, pm, rain } = await getAll(userLoc);

      if (air?.value != null) setTemp(Number(air.value).toFixed(1));
      if (rh?.value != null) setHumidity(Math.round(rh.value));
      if (windObj?.speed != null) setWind(Number(windObj.speed).toFixed(1));
      if (pm?.value != null) setPm25(Math.round(pm.value));

      setHumidityData(Array.isArray(rh?.overlays) ? rh.overlays : []);
      setRainData(Array.isArray(rain?.overlays) ? rain.overlays : []);
      setPm25Data(Array.isArray(pm?.overlays) ? pm.overlays : []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    loadMockFlag();
    loadNotificationFlag();
  }, [loadAll, loadMockFlag, loadNotificationFlag]);

  useFocusEffect(
    useCallback(() => {
      loadMockFlag();
      loadNotificationFlag();
    }, [loadMockFlag, loadNotificationFlag])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll();
    loadMockFlag();
    loadNotificationFlag();
  }, [loadAll, loadMockFlag, loadNotificationFlag]);

  // Build risk text lines for alerts (needs nearest rain)
  const nearestRain1h = useMemo(() => {
    if (!rainData || rainData.length === 0) return NaN;
    const nearest = rainData.reduce((a, b) => (a.distanceKm < b.distanceKm ? a : b));
    return typeof nearest?.lastHour === 'number' ? nearest.lastHour : NaN;
  }, [rainData]);

  const riskSignals = useMemo(() => {
    const list = [];
    const t = Number(temp);
    const pm = Number(pm25);
    const w = Number(wind);
    const r = Number.isNaN(nearestRain1h) ? NaN : Number(nearestRain1h);

    if (!Number.isNaN(pm) && pm > 55) list.push(`High PM2.5 (${pm} µg/m³)`);
    if (!Number.isNaN(w) && w > 8)    list.push(`Strong wind (${w.toFixed(1)} m/s)`);
    if (!Number.isNaN(r) && r > 10)   list.push(`Heavy rain (${r.toFixed(1)} mm in last hour)`);
    if (!Number.isNaN(t) && t > 33)   list.push(`High temperature (${t.toFixed(1)}°C)`);
    return list;
  }, [temp, pm25, wind, nearestRain1h]);

  const alertData = useMemo(() => {
    if (mockDisasterActive) {
      return { kind: 'danger', title: 'Incident nearby', lines: ['Mock disaster active (testing)'] };
    }
    if (riskSignals.length > 0) {
      return { kind: 'danger', title: 'Weather Alert', lines: riskSignals };
    }
    return { kind: 'safe', title: 'You are safe', lines: ['No abnormal weather detected around you.'] };
  }, [mockDisasterActive, riskSignals]);

  // Throttled notifications when danger
  const maybeNotifyAlert = useCallback(async (alertKind, lines) => {
    try {
      if (!notificationsEnabled) {
        await AsyncStorage.setItem(ALERT_KEYS.lastLevel, alertKind === 'danger' ? 'danger' : 'safe');
        return;
      }
      const now = Date.now();
      const [lastLevel, lastPushAtStr] = await Promise.all([
        AsyncStorage.getItem(ALERT_KEYS.lastLevel),
        AsyncStorage.getItem(ALERT_KEYS.lastPushAt),
      ]);
      const lastPushAt = lastPushAtStr ? Date.parse(lastPushAtStr) : 0;

      if (alertKind !== 'danger') {
        await AsyncStorage.setItem(ALERT_KEYS.lastLevel, 'safe');
        return;
      }

      const granted = await ensurePushPermission();
      if (!granted) return;

      const fromSafeToDanger = lastLevel !== 'danger';
      const throttled = !fromSafeToDanger && now - lastPushAt < 10 * 60 * 1000;

      if (throttled) {
        await AsyncStorage.setItem(ALERT_KEYS.lastLevel, 'danger');
        return;
      }

      const title = 'Weather Alert';
      const body = (lines && lines.length ? lines.slice(0, 3).join(' • ') : 'Conditions deteriorated nearby.');
      await sendAlertNotification({ title, body });

      await AsyncStorage.multiSet([
        [ALERT_KEYS.lastLevel, 'danger'],
        [ALERT_KEYS.lastPushAt, new Date().toISOString()],
      ]);
    } catch {}
  }, [notificationsEnabled]);

  useEffect(() => {
    maybeNotifyAlert(alertData.kind, alertData.lines);
  }, [alertData.kind, alertData.lines, maybeNotifyAlert]);

  // Navigation callbacks (screen stays dumb)
  const openChatbot = useCallback(() => navigation.navigate('Chatbot'), [navigation]);
  const openChecklist = useCallback(() => navigation.navigate('Checklist'), [navigation]);
  const openSOS = useCallback(() => navigation.navigate('SOS'), [navigation]);
  const openWeatherMap = useCallback(
    (params) => navigation.navigate('WeatherMap', params),
    [navigation]
  );
  const navigateRoute = useCallback(
    (route) => route && navigation.navigate(route),
    [navigation]
  );

  return (
    <HomeScreen
      // data
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      location={location}
      pm25Data={pm25Data}
      rainData={rainData}
      humidityData={humidityData}
      temp={temp}
      humidity={humidity}
      wind={wind}
      pm25={pm25}
      alertData={alertData}

      // alarm
      isAlarmPlaying={isAlarmPlaying}
      onToggleAlarm={toggleAlarm}

      // navigation callbacks
      onOpenChatbot={openChatbot}
      onOpenChecklist={openChecklist}
      onOpenSOS={openSOS}
      onOpenWeatherMap={openWeatherMap}
      onNavigateRoute={navigateRoute}
    />
  );
}
