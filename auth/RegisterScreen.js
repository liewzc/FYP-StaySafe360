// /auth/RegisterScreen.js
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRegister } from "./useRegister";

// UI palette
const PRIMARY = "#0b6fb8";
const BG = "#f5f9ff";
const TEXT_MUTED = "#6b7280";
const CARD = "#ffffff";
const DANGER = "#dc2626";
const SUCCESS = "#059669";

// RegisterScreen
export default function RegisterScreen({ navigation }) {
  const {
    email,
    username,
    password,
    banner,
    isLoading,
    emailValid,
    strongEnough,
    canSubmit,
    setEmail,
    setUsername,
    setPassword,
    handleRegister,
  } = useRegister();

  // UI-only states/refs
  const [showPwd, setShowPwd] = useState(false); // UI-only
  const pwdRef = useRef(null);

  // Submit flow: call hook, then prompt to check inbox
  const onSubmit = async () => {
    const { ok } = await handleRegister();
    if (ok) {
      Alert.alert(
        "Check your email",
        "We’ve sent a verification link to your inbox. Please verify to continue.",
        [{ text: "OK", onPress: () => navigation.navigate("Login") }]
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="person-add" size={28} color={PRIMARY} />
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Join us to get timely tips and preparedness tools.
            </Text>
          </View>

          {/* Banner */}
          {banner.msg ? (
            <View
              style={[
                styles.banner,
                banner.type === "error" && { backgroundColor: DANGER },
                banner.type === "success" && { backgroundColor: SUCCESS },
              ]}
            >
              <Ionicons
                name={
                  banner.type === "error" ? "alert-circle" : "checkmark-circle"
                }
                size={18}
                color="#fff"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.bannerText}>{banner.msg}</Text>
            </View>
          ) : null}

          {/* Card */}
          <View style={styles.card}>
            {/* Username */}
            <View style={styles.inputRow}>
              <Ionicons
                name="at"
                size={20}
                color={TEXT_MUTED}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Username (optional)"
                placeholderTextColor="#9ca3af"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => pwdRef.current?.focus()}
                style={styles.input}
              />
            </View>

            {/* Email */}
            <View style={styles.inputRow}>
              <Ionicons
                name="mail"
                size={20}
                color={TEXT_MUTED}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                style={styles.input}
              />
            </View>
            {!emailValid && email.length > 0 && (
              <Text style={styles.helperText}>Enter a valid email address</Text>
            )}

            {/* Password */}
            <View style={styles.inputRow}>
              <Ionicons
                name="lock-closed"
                size={20}
                color={TEXT_MUTED}
                style={styles.inputIcon}
              />
              <TextInput
                ref={pwdRef}
                placeholder="Password (min 6 chars)"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPwd}
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                style={styles.input}
              />
              <TouchableOpacity
                onPress={() => setShowPwd((s) => !s)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPwd ? "eye-off" : "eye"}
                  size={22}
                  color={TEXT_MUTED}
                />
              </TouchableOpacity>
            </View>
            {password.length > 0 && !strongEnough && (
              <Text style={styles.helperText}>
                Password must be at least 6 characters
              </Text>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.primaryBtn, !canSubmit && { opacity: 0.5 }]}
              onPress={onSubmit}
              disabled={!canSubmit}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="person-add"
                    size={18}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.primaryBtnText}>Create account</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Back to login */}
            <TouchableOpacity
              onPress={() => navigation.navigate("Login")}
              style={styles.ghostBtn}
            >
              <Text style={styles.ghostBtnText}>
                Already have an account? Sign In
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerNote}>
            By signing up, you agree to our Terms & Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 32,
    flexGrow: 1,
    justifyContent: "center",
    backgroundColor: BG,
  },
  header: { alignItems: "center", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#0f172a", marginTop: 6 },
  subtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 6,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  bannerText: { color: "#fff", flex: 1, fontSize: 13 },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#e5e7eb",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: 16, color: "#111827" },
  eyeBtn: { paddingHorizontal: 6, paddingVertical: 6 },
  helperText: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: -6,
    marginBottom: 8,
    marginLeft: 4,
  },
  primaryBtn: {
    height: 50,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  ghostBtn: { alignItems: "center", marginTop: 12 },
  ghostBtnText: { color: TEXT_MUTED },
  footerNote: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 14,
  },
});
