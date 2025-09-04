// screens/HomeScreen.js
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, RefreshControl,
  ActivityIndicator, ScrollView, Linking, Image, FlatList, Dimensions,
  Modal, Pressable,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications'; // ✅ 通知

// ✅ 迷你地图
import LeafletMiniMap from '../components/LeafletMiniMap';

// ✅ 统一从独立 API 文件获取数据
import { getAll } from '../utils/dataGov';

// ===== Theme =====
const PRIMARY = '#0b6fb8';
const CARD_BG = '#ffffff';
const TEXT_MUTED = '#6b7280';

// ===== Assets =====
import LogoIcon from '../assets/home/logo.png';
import LocationPin from '../assets/home/location.png';

import RainIcon from '../assets/analysis/rainfall.png';
import HumidityIcon from '../assets/analysis/humidity.png';
import PmIcon from '../assets/analysis/pm2.5.png';
import WindIcon from '../assets/analysis/wind.png';

import ChatbotIcon from '../assets/quickactionbar/chatbot.png';
import ChecklistIcon from '../assets/quickactionbar/checklist.png';
import SosIcon from '../assets/quickactionbar/sos.png';
import AlarmIcon from '../assets/quickactionbar/alarm.png';

import SunnyIcon from '../assets/weather/sunny.png';
import CloudyIcon from '../assets/weather/cloudy.png';
import RainyIcon from '../assets/weather/rainy.png';
import StormIcon from '../assets/weather/storm.png';
import SnowIcon from '../assets/weather/snow.png';

// ===== Advertise images =====
import Adv1 from '../assets/advertise/1.jpg';
import Adv2 from '../assets/advertise/2.jpg';
import Adv3 from '../assets/advertise/3.jpg';
import Adv4 from '../assets/advertise/4.jpg';
import Adv5 from '../assets/advertise/5.jpg';

// ===== Quiz icons =====
import LocalIcon from '../assets/firstaidhub/localdisaster.png';
import PrepIcon from '../assets/firstaidhub/disaster.png';
import EverydayIcon from '../assets/firstaidhub/everyday.png';

/** —— 简单天气图标选择 —— */
const pickIconByConditions = ({ temp, rain1h, wind }) => {
  const t = Number(temp);
  const r = Number(rain1h);
  const w = Number(wind);
  if (!Number.isNaN(r) && r >= 0.5) return RainyIcon;
  if (!Number.isNaN(w) && w >= 12) return StormIcon;
  if (!Number.isNaN(t) && t <= 5) return SnowIcon;
  if (!Number.isNaN(t) && t >= 32) return SunnyIcon;
  return CloudyIcon;
};

/** —— PM2.5 动态样式（绿/黄/橙/红） —— */
function getPm25Style(pm) {
  const n = typeof pm === 'number' ? pm : Number(pm);
  if (Number.isNaN(n)) {
    return { bg: '#f7fbff', border: '#e6f1fb', text: PRIMARY, label: '—', score: 0 };
  }
  if (n <= 12)   return { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46', label: 'Good',      score: 0 };
  if (n <= 35)   return { bg: '#fffbeb', border: '#fde68a', text: '#92400e', label: 'Moderate',  score: 1 };
  if (n <= 55)   return { bg: '#fff7ed', border: '#fdba74', text: '#9a3412', label: 'USG',       score: 2 };
  return           { bg: '#fef2f2', border: '#fecaca', text: '#7f1d1d', label: 'Unhealthy', score: 3 };
}

/** —— 风速样式（m/s） —— */
function getWindStyle(ms) {
  const n = typeof ms === 'number' ? ms : Number(ms);
  if (Number.isNaN(n)) return { bg: '#f7fbff', border: '#e6f1fb', text: PRIMARY, score: 0 };
  if (n > 8) return { bg: '#fef2f2', border: '#fecaca', text: '#7f1d1d', score: 2 };
  if (n >= 5) return { bg: '#fff7ed', border: '#fdba74', text: '#9a3412', score: 1 };
  return { bg: '#ecfeff', border: '#a5f3fc', text: '#155e75', score: 0 };
}

/** —— 雨量样式（1h 累计，mm） —— */
function getRainStyle(mm) {
  const n = typeof mm === 'number' ? mm : Number(mm);
  if (Number.isNaN(n)) return { bg: '#f7fbff', border: '#e6f1fb', text: PRIMARY, score: 0 };
  if (n > 10) return { bg: '#e0f2fe', border: '#bae6fd', text: '#0c4a6e', score: 2 };
  if (n >= 2) return { bg: '#f0f9ff', border: '#e0f2fe', text: '#0369a1', score: 1 };
  return { bg: '#f7fbff', border: '#e6f1fb', text: PRIMARY, score: 0 };
}

/** —— 湿度样式（%） —— */
function getHumidityStyle(h) {
  const n = typeof h === 'number' ? h : Number(h);
  if (Number.isNaN(n)) return { bg: '#f7fbff', border: '#e6f1fb', text: PRIMARY, score: 0 };
  if (n < 30 || n > 85) return { bg: '#fff7ed', border: '#fdba74', text: '#9a3412', score: 1 };
  return { bg: '#f7fbff', border: '#e6f1fb', text: PRIMARY, score: 0 };
}

/* ====================== 全屏图集（零依赖） ====================== */
function GalleryModal({ visible, images, initialIndex = 0, onClose }) {
  const { width, height } = Dimensions.get('window');
  const listRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 0);
    }
  }, [visible, initialIndex]);

  const keyExtractor = (_, i) => String(i);

  const renderItem = ({ item }) => (
    <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
      <Image
        source={item}
        style={{ width: width * 0.95, height: height * 0.8, resizeMode: 'contain' }}
      />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={stylesGallery.backdrop}>
        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={renderItem}
        />
        <Pressable style={stylesGallery.closeBtn} onPress={onClose} accessibilityLabel="Close">
          <Text style={stylesGallery.closeTxt}>✕</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

/** —— 可滑动广告 Carousel —— */
function AdvertCarousel({ images, onPressImage, autoMs = 4500, height = 170, borderRadius = 16 }) {
  const { width } = Dimensions.get('window');
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!images?.length) return;
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % images.length;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, autoMs);
    return () => clearInterval(timerRef.current);
  }, [images?.length, autoMs]);

  const onViewableItemsChanged = useMemo(
    () => ({ viewableItems }) => {
      if (viewableItems?.length) {
        const i = viewableItems[0].index ?? 0;
        setIndex(i);
      }
    },
    []
  );
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  return (
    <View>
      <FlatList
        ref={listRef}
        data={images}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item, index: i }) => (
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => onPressImage?.(i)}
          >
            <Image
              source={item}
              style={{
                width: width - 32,
                height,
                borderRadius,
                marginRight: 8,
                resizeMode: 'cover',
              }}
            />
          </TouchableOpacity>
        )}
        onTouchStart={() => clearInterval(timerRef.current)}
        onMomentumScrollEnd={() => {
          clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setIndex((cur) => {
              const next = (cur + 1) % images.length;
              listRef.current?.scrollToIndex({ index: next, animated: true });
              return next;
            });
          }, autoMs);
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfigRef.current}
      />

      {/* 圆点指示器 */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 6 }}>
        {images.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === index ? 18 : 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: i === index ? PRIMARY : '#d1d5db',
            }}
          />
        ))}
      </View>
    </View>
  );
}

/** —— Quiz 横向滑动（Carousel） —— */
function QuizCarousel({ items, onPressItem, height = 86 }) {
  const { width } = Dimensions.get('window');
  const ITEM_W = width * 0.82;
  const SPACING = 12;

  return (
    <View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(it) => it.key}
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_W + SPACING}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 4 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPressItem?.(item)}
            style={[
              styles.quizCardH,
              { width: ITEM_W, marginRight: SPACING, height },
            ]}
          >
            <Image source={item.icon} style={styles.quizIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.quizTitle}>{item.title}</Text>
              {!!item.subtitle && <Text style={styles.quizSubtitle}>{item.subtitle}</Text>}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

/** —— Knowledge 横向滑动（Emoji 卡片） —— */
function KnowledgeCarousel({ items, onPressItem, height = 86 }) {
  const { width } = Dimensions.get('window');
  const ITEM_W = width * 0.86;
  const SPACING = 12;

  return (
    <View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(it) => it.key}
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_W + SPACING}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 4 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPressItem?.(item)}
            style={[
              styles.knowledgeCardH,
              { width: ITEM_W, marginRight: SPACING, height },
            ]}
          >
            <Text style={styles.kEmoji}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.kTitle} numberOfLines={1}>{item.title}</Text>
              {!!item.hint && <Text style={styles.kHint} numberOfLines={2}>{item.hint}</Text>}
            </View>
            <Text style={styles.kChevron}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

/* —— Alert Card 组件 —— */
function AlertCard({ kind = 'safe', title, lines = [] }) {
  const isDanger = kind === 'danger';

  const COLORS = isDanger
    ? { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: '#ef4444' }
    : { bg: '#ecfdf5', border: '#bbf7d0', text: '#065f46', icon: '#10b981' };

  return (
    <View
      style={{
        backgroundColor: COLORS.bg,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Ionicons
          name={isDanger ? 'alert-circle' : 'checkmark-circle'}
          size={18}
          color={COLORS.icon}
          style={{ marginRight: 8 }}
        />
        <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '800' }}>{title}</Text>
      </View>

      {lines.map((t, i) => (
        <Text key={i} style={{ color: COLORS.text, marginTop: i === 0 ? 0 : 4 }}>
          • {t}
        </Text>
      ))}
    </View>
  );
}

/* ===== 通知节流用的本地键 & 辅助函数 ===== */
const ALERT_KEYS = {
  lastLevel: 'alerts.lastLevel',   // 'safe' | 'danger'
  lastPushAt: 'alerts.lastPushAt', // ISO 时间
};

// 请求通知权限
async function ensurePushPermission() {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('ensurePushPermission error:', e);
    return false;
  }
}

// 发送一条即时通知
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
  } catch (e) {
    console.warn('scheduleNotification error:', e);
  }
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

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

  // Map overlay data
  const [pm25Data, setPm25Data] = useState([]);
  const [rainData, setRainData] = useState([]);
  const [humidityData, setHumidityData] = useState([]);

  // UI
  const [showContacts, setShowContacts] = useState(false);

  // ✅ Profile 通知开关
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const loadNotificationFlag = useCallback(async () => {
    try {
      const v = await AsyncStorage.getItem('settings.notifications');
      setNotificationsEnabled(v === null ? true : v === 'true'); // 默认 ON
    } catch (e) {
      console.warn('loadNotificationFlag error:', e);
    }
  }, []);

  // ===== Alarm sound state =====
  const [alarmSound, setAlarmSound] = useState(null);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  // ===== Mock Disaster flag（从 Profile 的开关读取） =====
  const [mockDisasterActive, setMockDisasterActive] = useState(false);
  const loadMockFlag = useCallback(async () => {
    try {
      const v = await AsyncStorage.getItem('dev.mockDisaster');
      setMockDisasterActive(v === 'true');
    } catch (e) {
      console.warn('loadMockFlag error:', e);
    }
  }, []);

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
    } catch (e) {
      console.log('Alarm toggle error:', e);
    }
  }, [isAlarmPlaying, alarmSound]);

  useEffect(() => {
    return () => { if (alarmSound) alarmSound.unloadAsync(); };
  }, [alarmSound]);

  // ------- Load All ----------
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
    } catch (e) {
      console.log('loadAll error:', e);
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

  const advice = () => {
    if (temp !== '--' && Number(temp) > 33) return "It's very hot — stay hydrated.";
    if (pm25 !== '--' && Number(pm25) > 55) return "Air quality is poor — limit outdoor activity.";
    if (wind !== '--' && Number(wind) > 8) return "It's quite windy — take precautions.";
    return "The weather looks generally good today.";
  };

  // —— 最近雨量 1h（不显示站名）
  const nearestRain1h = useMemo(() => {
    if (!rainData || rainData.length === 0) return NaN;
    const nearest = rainData.reduce((a, b) => (a.distanceKm < b.distanceKm ? a : b));
    return typeof nearest?.lastHour === 'number' ? nearest.lastHour : NaN;
  }, [rainData]);

  const localWeatherIcon = useMemo(
    () => pickIconByConditions({ temp, rain1h: nearestRain1h, wind }),
    [temp, nearestRain1h, wind]
  );

  /** —— Metric Column —— */
  const MetricColumn = ({ icon, label, value, styleOverride, valueColor }) => (
    <View style={[styles.metricCol, styleOverride]}>
      <Image source={icon} style={[styles.metricColIcon, { tintColor: valueColor || PRIMARY }]} />
      <Text style={[styles.metricColLabel, { color: valueColor || TEXT_MUTED }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.metricColValue, { color: valueColor || PRIMARY }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );

  // —— 排序后的分析指标 —— //
  const sortedMetrics = useMemo(() => {
    const pmVal = pm25 === '--' ? NaN : Number(pm25);
    const wVal  = wind === '--' ? NaN : Number(wind);
    const hVal  = humidity === '--' ? NaN : Number(humidity);
    const rVal  = nearestRain1h;

    const pmS = getPm25Style(pmVal);
    const wS  = getWindStyle(wVal);
    const rS  = getRainStyle(rVal);
    const hS  = getHumidityStyle(hVal);

    const items = [
      { key: 'rain', icon: RainIcon, label: 'Rain', value: Number.isNaN(rVal) ? '--' : `${rVal.toFixed(1)} mm`, style: rS, score: rS.score },
      { key: 'pm25', icon: PmIcon, label: 'PM2.5', value: Number.isNaN(pmVal) ? '--' : `${pmVal} µg/m³`, style: pmS, score: pmS.score },
      { key: 'wind', icon: WindIcon, label: 'Wind', value: Number.isNaN(wVal) ? '--' : `${wVal.toFixed(1)} m/s`, style: wS, score: wS.score },
      { key: 'humidity', icon: HumidityIcon, label: 'Humidity', value: Number.isNaN(hVal) ? '--' : `${hVal}%`, style: hS, score: hS.score },
    ];

    const priority = { pm25: 4, wind: 3, rain: 2, humidity: 1 };
    return items.sort((a, b) => (b.score !== a.score ? b.score - a.score : priority[b.key] - priority[a.key]));
  }, [pm25, wind, humidity, nearestRain1h]);

  // —— Mock Disaster & 风险信号 —— //
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

  // ✅ 当卡片变红时推送本地通知（10min 节流；safe→danger 立刻推），尊重 Profile 开关
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
    } catch (e) {
      console.log('maybeNotifyAlert error:', e);
    }
  }, [notificationsEnabled]);

  useEffect(() => {
    maybeNotifyAlert(alertData.kind, alertData.lines);
  }, [alertData.kind, alertData.lines, maybeNotifyAlert]);

  // ======== 全屏广告图集状态 ========
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const advertImages = useMemo(() => [Adv1, Adv2, Adv3, Adv4, Adv5], []);

  const openGalleryAt = useCallback((idx) => {
    setGalleryIndex(idx);
    setShowGallery(true);
  }, []);

  return (
    <View
      style={[
        styles.page,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Image source={LogoIcon} style={styles.logo} />
          <Text style={styles.appName}>StaySafe360</Text>
        </View>

        {/* ✅ Awareness —— Header 下方（可点进全屏） */}
        <AdvertCarousel
          images={advertImages}
          autoMs={4500}
          height={170}
          onPressImage={openGalleryAt}
        />

        {/* Location */}
        <View style={styles.locRow}>
          <Image source={LocationPin} style={styles.locIcon} />
          <Text style={styles.locText}>Singapore</Text>
        </View>

        {/* Big Weather Card */}
        <View style={styles.bigCard}>
          <View style={styles.bigCardTop}>
            <View style={styles.bigLeft}>
              <Image source={localWeatherIcon} style={styles.weatherIcon} />
            </View>
            <View style={styles.bigRight}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.bigTemp}>{temp === '--' ? '--' : `${temp}°C`}</Text>
              </View>
              <Text style={styles.bigSubtitle}>{advice()}</Text>
            </View>
          </View>

          {/* Analysis —— 四列竖排 (Icon / 名字 / 数据) */}
          <View style={styles.metricRow}>
            {sortedMetrics.map(m => (
              <MetricColumn
                key={m.key}
                icon={m.icon}
                label={m.label}
                value={m.value}
                styleOverride={{ backgroundColor: m.style.bg, borderColor: m.style.border, borderWidth: 1 }}
                valueColor={m.style.text}
              />
            ))}
          </View>
        </View>

        {/* Alert Card —— Weather 下方 */}
        <AlertCard kind={alertData.kind} title={alertData.title} lines={alertData.lines} />

        {/* Quick Action Bar */}
        <View style={[styles.quickBar, { marginTop: 4, marginBottom: 12 }]}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Chatbot')}>
            <Image source={ChatbotIcon} style={styles.quickIconImg} />
            <Text style={styles.quickText}>Chatbot</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Checklist')}>
            <Image source={ChecklistIcon} style={styles.quickIconImg} />
            <Text style={styles.quickText}>Checklist</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('SOS')}>
            <Image source={SosIcon} style={styles.quickIconImg} />
            <Text style={styles.quickText}>SOS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={toggleAlarm}>
            <Image source={AlarmIcon} style={[styles.quickIconImg, isAlarmPlaying ? { tintColor: 'red' } : null]} />
            <Text style={[styles.quickText, { color: isAlarmPlaying ? 'red' : '#111827' }]}>
              {isAlarmPlaying ? 'Stop' : 'Alarm'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Map */}
        <Text style={styles.sectionTitle}>Map</Text>
        {location ? (
          <>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.navigate('WeatherMap', { location, pm25Data, rainData, humidityData })}
            >
              <LeafletMiniMap lat={location.latitude} lng={location.longitude} />
            </TouchableOpacity>
            <Text style={styles.mapHint}>Tap map to view full screen with layers</Text>
          </>
        ) : (
          <View style={{ paddingVertical: 24 }}>
            {loading ? <ActivityIndicator size="large" color={PRIMARY} /> : (
              <Text style={{ textAlign: 'center', color: TEXT_MUTED }}>无法获取定位权限，无法显示地图</Text>
            )}
          </View>
        )}

        {/* ✅ Knowledge（两个横滑卡片） */}
        <Text style={styles.sectionTitle}>Knowledge</Text>
        {/* Ready to Respond */}
        <KnowledgeCarousel
          items={[
            { key: 'hazards',  emoji: '🌪️', title: 'Hazards',           hint: 'Flood / Thunderstorms & Lightning / Haze / Heatwave / Coastal Flooding', route: 'HazardsHub' },
            { key: 'firstaid', emoji: '⛑️', title: 'Everyday First Aid', hint: 'Burns • CPR • Choking • Bleeding • Fracture • Heatstroke • Electric shock…', route: 'FirstAidGuides' },
          ]}
          onPressItem={(it)=> it?.route && navigation.navigate(it.route)}
          height={86}
        />

        {/* ✅ Quiz（横向 Carousel） */}
        <Text style={styles.sectionTitle}>Quiz</Text>
        <QuizCarousel
          items={[
            { key: 'disaster',       icon: LocalIcon,    title: 'Disaster',               subtitle: 'Earthquake • Typhoon • Flood • Tsunami', route: 'DisasterSelect' },
            { key: 'preparedness',   icon: PrepIcon,     title: 'Disaster Preparedness',  subtitle: 'Kits • Checklists • Pre-disaster training', route: 'DisasterPreparedness' },
            { key: 'everyday',       icon: EverydayIcon, title: 'Everyday First Aid',     subtitle: 'Burns • CPR • Choking • Bleeding',         route: 'EverydayFirstAid' },
          ]}
          onPressItem={(it)=> it?.route && navigation.navigate(it.route)}
          height={86}
        />

        {/* Emergency contacts popover */}
        {showContacts && (
          <View style={styles.contactBoxInline}>
            <Text style={styles.contactText}>📞 Emergency</Text>
            <TouchableOpacity onPress={() => Linking.openURL('tel:999')}>
              <Text style={styles.phone}>🚓 Police – 999</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('tel:995')}>
              <Text style={styles.phone}>🚑 SCDF – 995</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ====== 全屏广告图集 Modal ====== */}
      <GalleryModal
        visible={showGallery}
        images={advertImages}
        initialIndex={galleryIndex}
        onClose={() => setShowGallery(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  container: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 24, backgroundColor: '#fff' },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  logo: { width: 28, height: 28, resizeMode: 'contain' },
  appName: { fontSize: 22, fontWeight: '800', color: PRIMARY, textAlign: 'left', marginBottom: 4 },

  locRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  locIcon: { width: 16, height: 16, resizeMode: 'contain', tintColor: PRIMARY },
  locText: { fontSize: 13, color: '#111827', fontWeight: '600' },

  bigCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eef2f7',
    marginBottom: 12,
    elevation: 2,
  },
  bigCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  bigLeft: { width: 70, alignItems: 'center', justifyContent: 'center' },
  weatherIcon: { width: 56, height: 56, resizeMode: 'contain' },
  bigRight: { flex: 1, paddingLeft: 8 },
  bigTemp: { fontSize: 32, fontWeight: '900', color: '#111827' },
  bigSubtitle: { marginTop: 4, color: TEXT_MUTED, fontSize: 12, fontWeight: '600' },

  // —— 四列竖排 —— //
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  metricCol: {
    flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, marginHorizontal: 2,
    borderRadius: 12, borderWidth: 1, minWidth: 0,
  },
  metricColIcon: { width: 22, height: 22, resizeMode: 'contain', marginBottom: 4 },
  metricColLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  metricColValue: { fontSize: 11, fontWeight: '800' },

  sectionTitle: { fontSize: 14,fontWeight: '800', marginTop: 4, marginBottom: 6, color: '#111827' },

  quickBar: {
    flexDirection: 'row', backgroundColor: CARD_BG, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12,
    justifyContent: 'space-between', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#eef2f7', marginBottom: 12,
  },
  quickBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 6 },
  quickIconImg: { width: 28, height: 28, resizeMode: 'contain' },
  quickText: { fontWeight: '700', color: '#111827', fontSize: 12 },

  mapHint: { fontSize: 12, color: TEXT_MUTED, marginBottom: 12 },

  // —— Quiz 横滑卡片样式 —— //
  quizCardH: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 12, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    borderWidth: 1, borderColor: '#eef2f7',
  },
  quizIcon: { width: 44, height: 44, marginRight: 12, borderRadius: 8, resizeMode: 'contain' },
  quizTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 2 },
  quizSubtitle: { fontSize: 12, color: '#6b7280' },

  // —— Knowledge 横滑卡片样式（Emoji） —— //
  knowledgeCardH: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 12, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  kEmoji: { fontSize: 26, marginRight: 12 },
  kTitle: { fontSize: 16, fontWeight: '800', color: PRIMARY, marginBottom: 2 },
  kHint: { fontSize: 12, color: TEXT_MUTED },
  kChevron: { fontSize: 24, color: PRIMARY, marginLeft: 10, lineHeight: 24 },

  contactBoxInline: {
    backgroundColor: CARD_BG, padding: 12, borderRadius: 12, elevation: 2,
    borderWidth: 1, borderColor: '#eef2f7', marginTop: 8,
  },
  contactText: { fontWeight: 'bold', marginBottom: 6 },
  phone: { fontSize: 16, fontWeight: '600', color: '#d9534f', marginVertical: 4 },
});

const stylesGallery = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute', top: 40, right: 20,
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  closeTxt: { fontSize: 18, color: '#fff', fontWeight: '700' },
});
