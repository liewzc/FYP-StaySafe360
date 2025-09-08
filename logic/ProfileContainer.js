// logic/ProfileContainer.js
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Notifications from "expo-notifications";
import ProfileScreen from "../screens/ProfileScreen";
import { supabase } from "../supabaseClient";
import { computeAchievementProgressMap } from "../utils/achievements";
import { stopBgm } from "../utils/sound";

const AVATAR_BUCKET = "avatars";

const STORAGE_KEYS = {
  notifications: "settings.notifications",
  sound: "settings.sound",
  vibration: "settings.vibration",
  mockDisaster: "dev.mockDisaster",
};

const FEATURED_DEFS = [
  {
    id: "first",
    title: "First Quiz",
    icon: { lib: "mci", name: "medal-outline" },
  },
  {
    id: "ks5",
    title: "Knowledge Seeker",
    icon: { lib: "mci", name: "trophy-outline" },
  },
  {
    id: "ks10",
    title: "Quiz Explorer",
    icon: { lib: "ion", name: "trophy-outline" },
  },
];

// --- helpers ---
const base64ToUint8Array = (base64) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let str = base64.replace(/=+$/, "");
  const output = [];
  let bc = 0,
    bs,
    buffer;
  for (let i = 0; i < str.length; i++) {
    buffer = chars.indexOf(str.charAt(i));
    if (~buffer) {
      bs = bc % 4 ? bs * 64 + buffer : buffer;
      if (bc++ % 4) output.push(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return Uint8Array.from(output);
};
const guessExt = (uri, pickerFileName) => {
  const name = pickerFileName || uri || "";
  const match = name.match(/\.(\w+)(?:\?|#|$)/);
  const ext = (match?.[1] || "").toLowerCase();
  if (ext === "jpeg" || ext === "jpg") return "jpg";
  if (ext === "png") return "png";
  if (ext === "webp") return "webp";
  return "jpg";
};
const mimeFromExt = (ext) => {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
};

export default function ProfileContainer() {
  const navigation = useNavigation();

  // Profile state
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Edit state
  const [editingUsername, setEditingUsername] = useState(false);
  const [draftUsername, setDraftUsername] = useState("");

  // Local settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [mockDisasterActive, setMockDisasterActive] = useState(false);

  // Achievements
  const [featuredAchievements, setFeaturedAchievements] = useState(
    FEATURED_DEFS.map((d) => ({ ...d, progress: 0 }))
  );
  const [achLoading, setAchLoading] = useState(false);

  // ====== load & save settings ======
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

  // ====== profile ======
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userData?.user;
      if (!user) throw new Error("No authenticated user");

      setEmail(user.email ?? "");

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("uuid", user.id)
        .maybeSingle();
      if (profileErr) throw profileErr;

      if (profile) {
        const name = profile.username ?? (user.email || "user").split("@")[0];
        setUsername(name);
        setDraftUsername(name);
        setAvatarUrl(profile.avatar_url ?? null);
      } else {
        const defaultUsername = (user.email || "user").split("@")[0];
        await supabase
          .from("profiles")
          .insert({
            uuid: user.id,
            username: defaultUsername,
            avatar_url: null,
          });
        setUsername(defaultUsername);
        setDraftUsername(defaultUsername);
        setAvatarUrl(null);
      }
    } catch (e) {
      console.error("loadProfile error:", e);
      Alert.alert("Error", e.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ====== achievements ======
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
    loadSettings();
    loadProfile();
    loadFeaturedAchievements();
  }, [loadSettings, loadProfile, loadFeaturedAchievements]);

  useFocusEffect(
    React.useCallback(() => {
      loadFeaturedAchievements();
    }, [loadFeaturedAchievements])
  );

  // ===== username save =====
  const onSaveUsername = useCallback(async () => {
    if (!draftUsername.trim()) {
      return Alert.alert("Validation", "Username cannot be empty.");
    }
    try {
      setSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("profiles")
        .update({ username: draftUsername.trim() })
        .eq("uuid", user.id);
      if (error) throw error;
      setUsername(draftUsername.trim());
      setEditingUsername(false);
      Alert.alert("Saved", "Username has been updated.");
    } catch (e) {
      console.error("handleSaveUsername error:", e);
      Alert.alert("Error", e.message || "Failed to update username.");
    } finally {
      setSaving(false);
    }
  }, [draftUsername]);

  // ===== avatar pick & upload =====
  const pickImage = useCallback(async (source) => {
    try {
      setUploading(true);

      if (source === "library") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          setUploading(false);
          return Alert.alert(
            "Permission required",
            "Allow photo library access to choose an image."
          );
        }
      } else {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          setUploading(false);
          return Alert.alert(
            "Permission required",
            "Allow camera access to take a photo."
          );
        }
      }

      const pickerOpts = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
        base64: true,
      };

      const result =
        source === "library"
          ? await ImagePicker.launchImageLibraryAsync(pickerOpts)
          : await ImagePicker.launchCameraAsync(pickerOpts);

      if (result.canceled || !result.assets?.length) {
        setUploading(false);
        return;
      }

      const asset = result.assets[0];
      let base64 = asset.base64;
      if (!base64) {
        base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const bytes = base64ToUint8Array(base64);
      const arrayBuffer = bytes.buffer;
      const ext = guessExt(asset.uri, asset.fileName);
      const contentType = mimeFromExt(ext);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const fileName = `${Date.now()}.${ext}`;
      const objectKey = `${user.id}/${fileName}`;

      try {
        const { error: uploadErr } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(objectKey, arrayBuffer, { upsert: true, contentType });
        if (uploadErr) throw uploadErr;

        const { data: pub } = supabase.storage
          .from(AVATAR_BUCKET)
          .getPublicUrl(objectKey);
        const publicUrl = pub?.publicUrl;
        if (!publicUrl)
          throw new Error("Failed to obtain public URL for avatar.");

        await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl })
          .eq("uuid", user.id);
        setAvatarUrl(publicUrl);
      } catch (storageErr) {
        const msg = String(storageErr?.message || "").toLowerCase();
        if (msg.includes("bucket not found")) {
          const dataUrl = `data:${contentType};base64,${base64}`;
          await supabase
            .from("profiles")
            .update({ avatar_url: dataUrl })
            .eq("uuid", user.id);
          setAvatarUrl(dataUrl);
        } else {
          throw storageErr;
        }
      }

      Alert.alert("Updated", "Your avatar has been changed.");
    } catch (e) {
      console.error("pickImage/upload error:", e);
      Alert.alert("Error", e.message || "Failed to update avatar.");
    } finally {
      setUploading(false);
    }
  }, []);

  const onAskPickAvatar = useCallback(() => {
    Alert.alert("Change Avatar", "Pick a photo source", [
      { text: "Take Photo", onPress: () => pickImage("camera") },
      { text: "Choose from Gallery", onPress: () => pickImage("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [pickImage]);

  // ===== toggles =====
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

  // ===== logout =====
  const onLogout = useCallback(() => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await supabase.auth.signOut();
          } catch (err) {
            Alert.alert("Error", err.message || "Failed to log out.");
          }
        },
      },
    ]);
  }, []);

  // ===== nav handlers =====
  const onOpenAchievementGallery = useCallback(
    () => navigation.navigate("AchievementGallery"),
    [navigation]
  );

  return (
    <ProfileScreen
      // state
      loading={loading}
      uploading={uploading}
      saving={saving}
      email={email}
      username={username}
      avatarUrl={avatarUrl}
      editingUsername={editingUsername}
      draftUsername={draftUsername}
      notificationsEnabled={notificationsEnabled}
      soundEnabled={soundEnabled}
      vibrationEnabled={vibrationEnabled}
      mockDisasterActive={mockDisasterActive}
      featuredAchievements={featuredAchievements}
      achLoading={achLoading}
      // actions
      onAskPickAvatar={onAskPickAvatar}
      onEditStart={() => setEditingUsername(true)}
      onEditCancel={() => {
        setEditingUsername(false);
        setDraftUsername(username);
      }}
      onChangeDraftUsername={setDraftUsername}
      onSaveUsername={onSaveUsername}
      onToggleNotifications={onToggleNotifications}
      onToggleSound={onToggleSound}
      onToggleVibration={onToggleVibration}
      onToggleMockDisaster={onToggleMockDisaster}
      onLogout={onLogout}
      onOpenAchievementGallery={onOpenAchievementGallery}
    />
  );
}
