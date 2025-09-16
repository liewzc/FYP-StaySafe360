// logic/ProfileContainer.js
import React, { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import ProfileScreen from "../screens/ProfileScreen";
import { computeAchievementProgressMap } from "../utils/achievements";
import { stopBgm } from "../utils/sound";

const STORAGE_KEYS = {
  notifications: "settings.notifications",
  sound: "settings.sound",
  vibration: "settings.vibration",
  mockDisaster: "dev.mockDisaster",
};

const FEATURED_DEFS = [
  { id: "first", title: "First Quiz", icon: { lib: "mci", name: "medal-outline" } },
  { id: "ks5",   title: "Knowledge Seeker", icon: { lib: "mci", name: "trophy-outline" } },
  { id: "ks10",  title: "Quiz Explorer",    icon: { lib: "ion", name: "trophy-outline" } },
];

export default function ProfileContainer() {
  const navigation = useNavigation();

  // UI 
  const [loading, setLoading] = useState(true);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [mockDisasterActive, setMockDisasterActive] = useState(false);

  const [featuredAchievements, setFeaturedAchievements] = useState(
    FEATURED_DEFS.map((d) => ({ ...d, progress: 0 }))
  );
  const [achLoading, setAchLoading] = useState(false);

  const saveSetting = useCallback(async (key, value) => {
    try {
      await AsyncStorage.setItem(key, String(value));
    } catch (e) {
      console.warn("saveSetting error:", e);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const [n, s, v, md] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.notifications),
        AsyncStorage.getItem(STORAGE_KEYS.sound),
        AsyncStorage.getItem(STORAGE_KEYS.vibration),
        AsyncStorage.getItem(STORAGE_KEYS.mockDisaster),
      ]);
      if (n !== null) setNotificationsEnabled(n === "true");
      if (s !== null) setSoundEnabled(s === "true");
      if (v !== null) setVibrationEnabled(v === "true");
      if (md !== null) setMockDisasterActive(md === "true");
    } catch (e) {
      console.warn("loadSettings error:", e);
    }
  }, []);

  const loadFeaturedAchievements = useCallback(async () => {
    try {
      setAchLoading(true);
      const map = await computeAchievementProgressMap(); 
      const next = FEATURED_DEFS.map((def) => ({
        ...def,
        progress: Math.max(0, Math.min(100, Math.round(map?.[def.id] ?? 0))),
      }));
      setFeaturedAchievements(next);
    } catch (e) {
      console.warn("loadFeaturedAchievements error:", e?.message || e);
    } finally {
      setAchLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadSettings();
      await loadFeaturedAchievements();
      setLoading(false);
    })();
  }, [loadSettings, loadFeaturedAchievements]);

  useFocusEffect(
    React.useCallback(() => {
      loadFeaturedAchievements();
    }, [loadFeaturedAchievements])
  );

  const onToggleNotifications = useCallback(
    async (v) => {
      try {
        if (v) {
          const { status } = await Notifications.getPermissionsAsync();
          let granted = status === "granted";
          if (!granted) {
            const req = await Notifications.requestPermissionsAsync();
            granted = req.status === "granted";
          }
          if (!granted) {
            Alert.alert(
              "Permission required",
              "Please allow notifications in system settings to receive alerts."
            );
            setNotificationsEnabled(false);
            await saveSetting(STORAGE_KEYS.notifications, false);
            return;
          }
        }
        setNotificationsEnabled(v);
        await saveSetting(STORAGE_KEYS.notifications, v);
      } catch (e) {
        console.warn("notifications permission error:", e);
      }
    },
    [saveSetting]
  );

  const onToggleSound = useCallback(
    async (v) => {
      setSoundEnabled(v);
      await saveSetting(STORAGE_KEYS.sound, v);
      if (!v) {
        try {
          await stopBgm();
        } catch (e) {
          console.warn("stopBgm error:", e);
        }
      }
    },
    [saveSetting]
  );

  const onToggleVibration = useCallback(
    async (v) => {
      setVibrationEnabled(v);
      await saveSetting(STORAGE_KEYS.vibration, v);
    },
    [saveSetting]
  );

  const onToggleMockDisaster = useCallback(
    async (v) => {
      setMockDisasterActive(v);
      await saveSetting(STORAGE_KEYS.mockDisaster, v);
    },
    [saveSetting]
  );

  const onOpenAchievementGallery = useCallback(
    () => navigation.navigate("AchievementGallery"),
    [navigation]
  );

  return (
    <ProfileScreen
      // state
      loading={loading}
      featuredAchievements={featuredAchievements}
      achLoading={achLoading}
      // settings
      notificationsEnabled={notificationsEnabled}
      soundEnabled={soundEnabled}
      vibrationEnabled={vibrationEnabled}
      mockDisasterActive={mockDisasterActive}
      // actions
      onOpenAchievementGallery={onOpenAchievementGallery}
      onToggleNotifications={onToggleNotifications}
      onToggleSound={onToggleSound}
      onToggleVibration={onToggleVibration}
      onToggleMockDisaster={onToggleMockDisaster}
    />
  );
}
