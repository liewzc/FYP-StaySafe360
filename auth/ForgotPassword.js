
import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

const PRIMARY = '#0b6fb8';
const BG = '#f5f9ff';
const TEXT_MUTED = '#6b7280';
const CARD = '#ffffff';
const DANGER = '#dc2626';
const SUCCESS = '#059669';

export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState('');
  const [banner, setBanner] = useState({ type: '', msg: '' }); // '', 'error', 'success'
  const [isLoading, setIsLoading] = useState(false);

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());
  const canSubmit = emailValid && !isLoading;

  const handleReset = async () => {
    const e = email.trim();
    if (!e) {
      setBanner({ type: 'error', msg: 'Please enter your email.' });
      return;
    }
    if (!emailValid) {
      setBanner({ type: 'error', msg: 'Please enter a valid email address.' });
      return;
    }

    setBanner({ type: '', msg: '' });
    setIsLoading(true);

    try {
      // 注意：若是移动端 App，建议 redirectTo 使用你 App 的深链 scheme（如 myapp://reset）
      // 确保在 Supabase Auth 设置里允许该 redirect URL。
      const { error } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo: 'https://reset-password-page-one.vercel.app',
        // redirectTo: 'myapp://reset-password', // ← 移动端深链示例
      });

      if (error) {
        setBanner({ type: 'error', msg: error.message || 'Failed to send reset email.' });
      } else {
        setBanner({
          type: 'success',
          msg: 'Reset email sent. Please check your inbox (and spam).',
        });
        // 也可跳转回登录页：
        // navigation.goBack();
      }
    } catch (err) {
      console.error('Reset error:', err);
      setBanner({ type: 'error', msg: 'Unexpected error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={{ flex: 1 }}
      >
        <View style={styles.wrapper}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="key-outline" size={28} color={PRIMARY} />
            <Text style={styles.title}>Forgot your password?</Text>
            <Text style={styles.subtitle}>
              Enter the email associated with your account and we’ll send you a reset link.
            </Text>
          </View>

          {/* Banner */}
          {banner.msg ? (
            <View
              style={[
                styles.banner,
                banner.type === 'error' && { backgroundColor: DANGER },
                banner.type === 'success' && { backgroundColor: SUCCESS },
              ]}
            >
              <Ionicons
                name={banner.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
                size={18}
                color="#fff"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.bannerText}>{banner.msg}</Text>
            </View>
          ) : null}

          {/* Card */}
          <View style={styles.card}>
            <View style={styles.inputRow}>
              <Ionicons name="mail" size={20} color={TEXT_MUTED} style={styles.inputIcon} />
              <TextInput
                placeholder="Email address"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setBanner({ type: '', msg: '' });
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="send"
                onSubmitEditing={handleReset}
                style={styles.input}
                accessibilityLabel="Email"
              />
            </View>
            {!emailValid && email.length > 0 && (
              <Text style={styles.helperText}>Enter a valid email address</Text>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, !canSubmit && { opacity: 0.5 }]}
              onPress={handleReset}
              disabled={!canSubmit}
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Send Reset Email</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.ghostBtn}>
              <Text style={styles.ghostBtnText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginTop: 6 },
  subtitle: { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', marginTop: 6 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  bannerText: { color: '#fff', flex: 1, fontSize: 13 },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#111827',
  },
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
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  ghostBtn: { alignItems: 'center', marginTop: 12 },
  ghostBtnText: { color: TEXT_MUTED },
});
