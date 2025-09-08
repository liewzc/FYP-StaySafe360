// screens/ProfileScreen.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Pressable,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const PLACEHOLDER_AVATAR = require("../assets/profile_image/profile.jpeg");

function ToggleSwitch({ value, onValueChange, disabled }) {
  const W = 52,
    H = 30,
    P = 3,
    R = 999;
  const OFF_OFFSET = -1;
  const ON_OFFSET = -4;

  const anim = React.useRef(new Animated.Value(value ? 1 : 0)).current;
  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#e5e7eb", "#111111"],
  });
  const knobX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.max(0, P + OFF_OFFSET), W - (H - P) + ON_OFFSET],
  });

  return (
    <Pressable
      onPress={() => !disabled && onValueChange?.(!value)}
      style={{ opacity: disabled ? 0.5 : 1 }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      hitSlop={8}
    >
      <Animated.View
        style={{
          width: W,
          height: H,
          borderRadius: R,
          backgroundColor: trackColor,
          padding: P,
        }}
      >
        <Animated.View
          style={{
            width: H - P * 2,
            height: H - P * 2,
            borderRadius: R,
            backgroundColor: "#ffffff",
            transform: [{ translateX: knobX }],
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

function SettingRow({
  iconLib = "ion",
  iconName,
  iconImageSource,
  label,
  value,
  onChange,
  disabled,
}) {
  const Icon = iconLib === "mci" ? MaterialCommunityIcons : Ionicons;

  return (
    <View style={styles.settingItem}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {iconImageSource ? (
          <Image
            source={iconImageSource}
            style={{ width: 20, height: 20, resizeMode: "contain" }}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Icon name={iconName} size={20} color="#111" />
        )}
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <ToggleSwitch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      />
    </View>
  );
}

/* Small component: Achievement Card */
function AchievementCard({ title, progress = 0, icon }) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const renderIcon = () => {
    if (!icon) return null;
    if (icon.lib === "mci")
      return (
        <MaterialCommunityIcons name={icon.name} size={22} color="#0f172a" />
      );
    return <Ionicons name={icon.name} size={22} color="#0f172a" />;
  };

  return (
    <TouchableOpacity activeOpacity={0.9} style={achStyles.card}>
      <View style={achStyles.iconCircle}>{renderIcon()}</View>
      <Text style={achStyles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={achStyles.progressBar}>
        <View style={[achStyles.progressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={achStyles.pct}>{pct}%</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen(props) {
  const {
    loading,
    uploading,
    saving,
    email,
    username,
    avatarUrl,
    editingUsername,
    draftUsername,
    notificationsEnabled,
    soundEnabled,
    vibrationEnabled,
    mockDisasterActive,
    featuredAchievements,
    achLoading,

    // actions
    onAskPickAvatar,
    onEditStart,
    onEditCancel,
    onChangeDraftUsername,
    onSaveUsername,
    onToggleNotifications,
    onToggleSound,
    onToggleVibration,
    onToggleMockDisaster,
    onLogout,
    onOpenAchievementGallery,
  } = props;

  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        style={[
          styles.container,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 24,
            paddingTop: insets.top + 8,
          }}
        >
          {/* Header: Avatar + Email/Username */}
          <View style={styles.profileHeader}>
            <TouchableOpacity activeOpacity={0.8} onPress={onAskPickAvatar}>
              <View>
                <Image
                  source={avatarUrl ? { uri: avatarUrl } : PLACEHOLDER_AVATAR}
                  style={styles.avatar}
                />
                <View style={styles.changeBadge}>
                  <Text style={styles.changeBadgeText}>
                    {uploading ? "..." : "Edit"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.userInfo}>
              <Text style={styles.email} numberOfLines={1}>
                {email}
              </Text>

              {!editingUsername ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {username || "Anonymous"}
                  </Text>
                  <TouchableOpacity
                    onPress={onEditStart}
                    style={styles.editBtn}
                  >
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.editRow}>
                  <TextInput
                    value={draftUsername}
                    onChangeText={onChangeDraftUsername}
                    placeholder="Enter username"
                    style={styles.input}
                  />
                  <TouchableOpacity
                    onPress={onSaveUsername}
                    disabled={saving}
                    style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  >
                    <Text style={styles.saveBtnText}>
                      {saving ? "Saving..." : "Save"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onEditCancel}
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
              <TouchableOpacity onPress={onOpenAchievementGallery}>
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
              <View style={{ alignItems: "center", marginTop: 8 }}>
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
              onChange={onToggleNotifications}
            />

            <SettingRow
              iconLib="ion"
              iconName="volume-high-outline"
              label="Sound Effects"
              value={soundEnabled}
              onChange={onToggleSound}
            />

            <SettingRow
              iconImageSource={require("../assets/profile_image/vibrate.png")}
              label="Vibration"
              value={vibrationEnabled}
              onChange={onToggleVibration}
            />

            <SettingRow
              iconLib="mci"
              iconName="flask-outline"
              label="Mock Disaster"
              value={mockDisasterActive}
              onChange={onToggleMockDisaster}
            />

            <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
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

const AVATAR_SIZE = 72;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "#eee",
  },
  changeBadge: {
    position: "absolute",
    bottom: -2,
    right: -6,
    backgroundColor: "#6C63FF",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  changeBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  userInfo: { flex: 1, marginLeft: 16 },
  name: { fontSize: 18, fontWeight: "bold", color: "#111", maxWidth: "75%" },
  email: { fontSize: 14, color: "#666", marginBottom: 6 },
  editBtn: {
    marginLeft: 10,
    backgroundColor: "#eef2ff",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  editBtnText: { color: "#3b82f6", fontWeight: "600" },

  editRow: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    marginRight: 8,
  },
  saveBtn: {
    backgroundColor: "#3b82f6",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  saveBtnText: { color: "#fff", fontWeight: "700" },
  cancelBtn: {
    backgroundColor: "#e5e7eb",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 6,
  },
  cancelBtnText: { color: "#111", fontWeight: "600" },

  section: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  viewAll: { color: "#3b82f6", fontWeight: "600" },

  achievementsRow: { flexDirection: "row", gap: 10 },

  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  settingLabel: { fontSize: 16, color: "#333" },

  logoutButton: {
    marginTop: 8,
    backgroundColor: "#f44336",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
});

const achStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignItems: "center",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
    marginBottom: 8,
  },
  title: { color: "#111", fontWeight: "700", fontSize: 13, marginBottom: 6 },
  progressBar: {
    width: "100%",
    height: 6,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
    marginTop: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#3b82f6" },
  pct: { color: "#6b7280", fontSize: 12, marginTop: 6, textAlign: "center" },
});
