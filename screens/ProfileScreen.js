// screens/ProfileScreen.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Alert, ActivityIndicator, TextInput, KeyboardAvoidingView,
  Platform, ScrollView, Animated, Pressable
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

// ✅ 成就进度
import { computeAchievementProgressMap } from '../utils/achievements';
// ✅ 关闭声音时立刻停 BGM
import { stopBgm } from '../utils/sound';

const PLACEHOLDER_AVATAR = require('../assets/profile_image/profile.jpeg');
const AVATAR_BUCKET = 'avatars';

const STORAGE_KEYS = {
  notifications: 'settings.notifications',
  sound: 'settings.sound',
  vibration: 'settings.vibration',
  mockDisaster: 'dev.mockDisaster',
};

// --- helpers ---
const base64ToUint8Array = (base64) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = base64.replace(/=+$/, '');
  const output = [];
  let bc = 0, bs, buffer;

  for (let i = 0; i < str.length; i++) {
    buffer = chars.indexOf(str.charAt(i));
    if (~buffer) {
      bs = bc % 4 ? bs * 64 + buffer : buffer;
      if (bc++ % 4) {
        output.push(255 & (bs >> ((-2 * bc) & 6)));
      }
    }
  }
  return Uint8Array.from(output);
};

const guessExt = (uri, pickerFileName) => {
  const name = pickerFileName || uri || '';
  const match = name.match(/\.(\w+)(?:\?|#|$)/);
  const ext = (match?.[1] || '').toLowerCase();
  if (ext === 'jpeg' || ext === 'jpg') return 'jpg';
  if (ext === 'png') return 'png';
  if (ext === 'webp') return 'webp';
  return 'jpg';
};

const mimeFromExt = (ext) => {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
};

/** 🔰 首页精选成就卡 */
const FEATURED_DEFS = [
  { id: 'first', title: 'First Quiz', icon: { lib: 'mci', name: 'medal-outline' } },
  { id: 'ks5',   title: 'Knowledge Seeker', icon: { lib: 'mci', name: 'trophy-outline' } },
  { id: 'ks10',  title: 'Quiz Explorer', icon: { lib: 'ion', name: 'trophy-outline' } },
];

/* ----------- 更好看的 ToggleSwitch（黑白风，可调左右贴边） ----------- */
function ToggleSwitch({ value, onValueChange, disabled }) {
  const W = 52, H = 30, P = 3, R = 999;

  // 关闭时偏移（负值更靠左，0 为默认）
  const OFF_OFFSET = -1;
  // 开启时偏移（正值更靠右）— 想更明显可调到 8/10
  const ON_OFFSET = -4;

  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#e5e7eb', '#111111'] // off -> on
  });

  const knobX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.max(0, P + OFF_OFFSET), W - (H - P) + ON_OFFSET] // 左 -> 右（右侧更靠边）
  });

  return (
    <Pressable
      onPress={() => !disabled && onValueChange?.(!value)}
      style={{ opacity: disabled ? 0.5 : 1 }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      hitSlop={8}
    >
      <Animated.View style={{ width: W, height: H, borderRadius: R, backgroundColor: trackColor, padding: P }}>
        <Animated.View
          style={{
            width: H - P * 2, height: H - P * 2, borderRadius: R,
            backgroundColor: '#ffffff',
            transform: [{ translateX: knobX }],
            shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

/* 行组件：左侧黑白图标 + 文本 + ToggleSwitch */
function SettingRow({ iconLib = 'ion', iconName, label, value, onChange, disabled }) {
  const Icon = iconLib === 'mci' ? MaterialCommunityIcons : Ionicons;
  return (
    <View style={styles.settingItem}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon name={iconName} size={20} color="#111" />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <ToggleSwitch value={value} onValueChange={onChange} disabled={disabled} />
    </View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Profile state
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Edit state
  const [editingUsername, setEditingUsername] = useState(false);
  const [draftUsername, setDraftUsername] = useState('');

  // Local settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [mockDisasterActive, setMockDisasterActive] = useState(false);

  // ✅ 首页成就
  const [featuredAchievements, setFeaturedAchievements] = useState(
    FEATURED_DEFS.map(d => ({ ...d, progress: 0 }))
  );
  const [achLoading, setAchLoading] = useState(false);

  // ===== Settings persistence =====
  const loadSettings = useCallback(async () => {
    try {
      const [n, s, v, md] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.notifications),
        AsyncStorage.getItem(STORAGE_KEYS.sound),
        AsyncStorage.getItem(STORAGE_KEYS.vibration),
        AsyncStorage.getItem(STORAGE_KEYS.mockDisaster),
      ]);
      if (n !== null) setNotificationsEnabled(n === 'true');
      if (s !== null) setSoundEnabled(s === 'true');
      if (v !== null) setVibrationEnabled(v === 'true');
      if (md !== null) setMockDisasterActive(md === 'true');
    } catch (e) {
      console.warn('loadSettings error:', e);
    }
  }, []);

  const saveSetting = useCallback(async (key, value) => {
    try {
      await AsyncStorage.setItem(key, String(value));
    } catch (e) {
      console.warn('saveSetting error:', e);
    }
  }, []);

  // ===== Load profile =====
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userData?.user;
      if (!user) throw new Error('No authenticated user');

      setEmail(user.email ?? '');

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('uuid', user.id)
        .maybeSingle();
      if (profileErr) throw profileErr;

      if (profile) {
        const name = profile.username ?? (user.email || 'user').split('@')[0];
        setUsername(name);
        setDraftUsername(name);
        setAvatarUrl(profile.avatar_url ?? null);
      } else {
        const defaultUsername = (user.email || 'user').split('@')[0];
        await supabase.from('profiles').insert({ uuid: user.id, username: defaultUsername, avatar_url: null });
        setUsername(defaultUsername);
        setDraftUsername(defaultUsername);
        setAvatarUrl(null);
      }
    } catch (e) {
      console.error('loadProfile error:', e);
      Alert.alert('Error', e.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ 载入成就
  const loadFeaturedAchievements = useCallback(async () => {
    try {
      setAchLoading(true);
      const map = await computeAchievementProgressMap();
      const next = FEATURED_DEFS.map(def => ({
        ...def,
        progress: Math.max(0, Math.min(100, Math.round(map?.[def.id] ?? 0))),
      }));
      setFeaturedAchievements(next);
    } catch (e) {
      console.warn('loadFeaturedAchievements error:', e?.message || e);
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
    useCallback(() => {
      loadFeaturedAchievements();
    }, [loadFeaturedAchievements])
  );

  // ===== Save username =====
  const handleSaveUsername = async () => {
    if (!draftUsername.trim()) {
      return Alert.alert('Validation', 'Username cannot be empty.');
    }
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('profiles')
        .update({ username: draftUsername.trim() })
        .eq('uuid', user.id);
      if (error) throw error;

      setUsername(draftUsername.trim());
      setEditingUsername(false);
      Alert.alert('Saved', 'Username has been updated.');
    } catch (e) {
      console.error('handleSaveUsername error:', e);
      Alert.alert('Error', e.message || 'Failed to update username.');
    } finally {
      setSaving(false);
    }
  };

  // ===== Avatar change =====
  const askAndPickImage = async () => {
    Alert.alert('Change Avatar', 'Pick a photo source', [
      { text: 'Take Photo', onPress: () => pickImage('camera') },
      { text: 'Choose from Gallery', onPress: () => pickImage('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickImage = async (source) => {
    try {
      setUploading(true);

      if (source === 'library') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setUploading(false);
          return Alert.alert('Permission required', 'Allow photo library access to choose an image.');
        }
      } else {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setUploading(false);
          return Alert.alert('Permission required', 'Allow camera access to take a photo.');
        }
      }

      const pickerOpts = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
        base64: true,
      };

      const result = source === 'library'
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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const fileName = `${Date.now()}.${ext}`;
      const objectKey = `${user.id}/${fileName}`;

      try {
        const { error: uploadErr } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(objectKey, arrayBuffer, { upsert: true, contentType });
        if (uploadErr) throw uploadErr;

        const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(objectKey);
        const publicUrl = pub?.publicUrl;
        if (!publicUrl) throw new Error('Failed to obtain public URL for avatar.');

        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('uuid', user.id);
        setAvatarUrl(publicUrl);
      } catch (storageErr) {
        const msg = String(storageErr?.message || '').toLowerCase();
        if (msg.includes('bucket not found')) {
          const dataUrl = `data:${contentType};base64,${base64}`;
          await supabase.from('profiles').update({ avatar_url: dataUrl }).eq('uuid', user.id);
          setAvatarUrl(dataUrl);
        } else {
          throw storageErr;
        }
      }

      Alert.alert('Updated', 'Your avatar has been changed.');
    } catch (e) {
      console.error('pickImage/upload error:', e);
      Alert.alert('Error', e.message || 'Failed to update avatar.');
    } finally {
      setUploading(false);
    }
  };

  // ===== Logout =====
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.auth.signOut();
          } catch (err) {
            Alert.alert('Error', err.message || 'Failed to log out.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView
        edges={['bottom', 'left', 'right']}
        style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}
      >
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 24,
            paddingTop: insets.top + 8,
          }}
        >
          {/* Header: Avatar + Email/Username */}
          <View style={styles.profileHeader}>
            <TouchableOpacity activeOpacity={0.8} onPress={askAndPickImage}>
              <View>
                <Image
                  source={avatarUrl ? { uri: avatarUrl } : PLACEHOLDER_AVATAR}
                  style={styles.avatar}
                  onError={() => setAvatarUrl(null)}
                />
                <View style={styles.changeBadge}>
                  <Text style={styles.changeBadgeText}>{uploading ? '...' : 'Edit'}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.userInfo}>
              <Text style={styles.email} numberOfLines={1}>{email}</Text>

              {!editingUsername ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.name} numberOfLines={1}>{username || 'Anonymous'}</Text>
                  <TouchableOpacity onPress={() => setEditingUsername(true)} style={styles.editBtn}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.editRow}>
                  <TextInput
                    value={draftUsername}
                    onChangeText={setDraftUsername}
                    placeholder="Enter username"
                    style={styles.input}
                  />
                  <TouchableOpacity
                    onPress={handleSaveUsername}
                    disabled={saving}
                    style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  >
                    <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setEditingUsername(false); setDraftUsername(username); }}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Achievements */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AchievementGallery')}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.achievementsRow}>
              {featuredAchievements.map((a) => (
                <AchievementCard
                  key={a.id}
                  title={a.title}
                  progress={a.progress}
                  icon={a.icon}
                />
              ))}
            </View>

            {achLoading && (
              <View style={{ alignItems: 'center', marginTop: 8 }}>
                <ActivityIndicator size="small" />
              </View>
            )}
          </View>

          {/* Settings */}
          <View style={[styles.section, { marginTop: 4 }]}>
            <Text style={styles.sectionTitle}>Settings</Text>

            <SettingRow
              iconLib="ion"
              iconName="notifications-outline"
              label="Notifications"
              value={notificationsEnabled}
              onChange={async (v) => {
                if (v) {
                  try {
                    const { status } = await Notifications.getPermissionsAsync();
                    let granted = status === 'granted';
                    if (!granted) {
                      const req = await Notifications.requestPermissionsAsync();
                      granted = req.status === 'granted';
                    }
                    if (!granted) {
                      Alert.alert('Permission required', 'Please allow notifications in system settings to receive alerts.');
                      setNotificationsEnabled(false);
                      await saveSetting(STORAGE_KEYS.notifications, false);
                      return;
                    }
                  } catch (e) {
                    console.warn('notifications permission error:', e);
                  }
                }
                setNotificationsEnabled(v);
                await saveSetting(STORAGE_KEYS.notifications, v);
              }}
            />

            <SettingRow
              iconLib="ion"
              iconName="volume-high-outline"
              label="Sound Effects"
              value={soundEnabled}
              onChange={async (v) => {
                setSoundEnabled(v);
                await saveSetting(STORAGE_KEYS.sound, v);
                if (!v) {
                  try { await stopBgm(); } catch (e) { console.warn('stopBgm error:', e); }
                }
              }}
            />

            <SettingRow
              iconLib="ion"
              iconName="vibrate-outline"
              label="Vibration"
              value={vibrationEnabled}
              onChange={async (v) => { setVibrationEnabled(v); await saveSetting(STORAGE_KEYS.vibration, v); }}
            />

            <SettingRow
              iconLib="mci"
              iconName="flask-outline"
              label="Mock Disaster"
              value={mockDisasterActive}
              onChange={async (v) => { setMockDisasterActive(v); await saveSetting(STORAGE_KEYS.mockDisaster, v); }}
            />

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {uploading && (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator size="large" />
        </View>
      )}
    </SafeAreaView>
  );
}

/* ---------- 小组件：AchievementCard（icon + title + progress%） ---------- */
function AchievementCard({ title, progress = 0, icon }) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  const renderIcon = () => {
    if (!icon) return null;
    if (icon.lib === 'mci') {
      return <MaterialCommunityIcons name={icon.name} size={22} color="#0f172a" />;
    }
    return <Ionicons name={icon.name} size={22} color="#0f172a" />;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={achStyles.card}
      onPress={() => {
        // 可跳转到成就详情
        console.log('AchievementCard pressed:', title);
      }}
    >
      <View style={achStyles.iconCircle}>{renderIcon()}</View>
      <Text style={achStyles.title} numberOfLines={1}>{title}</Text>

      <View style={achStyles.progressBar}>
        <View style={[achStyles.progressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={achStyles.pct}>{pct}%</Text>
    </TouchableOpacity>
  );
}

const AVATAR_SIZE = 72;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: '#eee' },
  changeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -6,
    backgroundColor: '#6C63FF',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  changeBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  userInfo: { flex: 1, marginLeft: 16 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#111', maxWidth: '75%' },
  email: { fontSize: 14, color: '#666', marginBottom: 6 },
  editBtn: { marginLeft: 10, backgroundColor: '#eef2ff', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  editBtnText: { color: '#3b82f6', fontWeight: '600' },

  editRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, marginRight: 8,
  },
  saveBtn: { backgroundColor: '#3b82f6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  cancelBtn: { backgroundColor: '#e5e7eb', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginLeft: 6 },
  cancelBtnText: { color: '#111', fontWeight: '600' },

  /* sections */
  section: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  viewAll: { color: '#3b82f6', fontWeight: '600' },

  /* achievements row */
  achievementsRow: { flexDirection: 'row', gap: 10 },

  /* settings */
  settingItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 12,
  },
  settingLabel: { fontSize: 16, color: '#333' },

  logoutButton: { marginTop: 8, backgroundColor: '#f44336', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
});

/* 卡片样式 */
const achStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignItems: 'center',
  },
  iconCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    marginBottom: 8,
  },
  title: { color: '#111', fontWeight: '700', fontSize: 13, marginBottom: 6 },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#3b82f6' },
  pct: { color: '#6b7280', fontSize: 12, marginTop: 6, textAlign: 'center' },
});
