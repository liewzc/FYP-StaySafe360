import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabaseClient';

const PRIMARY = '#0b6fb8';
const BG = '#f5f9ff';
const TEXT_MUTED = '#6b7280';
const DANGER = '#dc2626';
const CARD = '#ffffff';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const passwordRef = useRef(null);

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());
  const canSubmit = emailValid && password.length >= 6 && !isLoading;

  const handleLogin = async () => {
    const e = email.trim();
    const p = password;

    if (!e || !p) {
      setLoginError('Please enter both email and password.');
      return;
    }
    if (!emailValid) {
      setLoginError('Please enter a valid email address.');
      return;
    }

    setLoginError('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: e, password: p });

      if (error) {
        if (error.message?.includes('Invalid login credentials')) {
          setLoginError('Wrong email or password. Please try again.');
        } else {
          setLoginError(error.message || 'Login failed. Please try again.');
        }
        return;
      }

      const { user } = data || {};
      if (!user?.email_confirmed_at) {
        Alert.alert('Email not verified', 'Please verify your email before logging in.');
        await supabase.auth.signOut();
        return;
      }

    } catch (err) {
      console.error('Login error:', err);
      setLoginError('An unexpected error occurred. Please try again.');
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
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Brand / Header */}
          <View style={styles.header}>
            <View style={styles.logoWrap}>
              <Image
                source={require('../assets/home/logo.png')}
                style={{ width: 56, height: 56, borderRadius: 12 }}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue your preparedness journey</Text>
          </View>

          {/* Error Banner */}
          {!!loginError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.errorBannerText}>{loginError}</Text>
            </View>
          )}

          {/* Card */}
          <View style={styles.card}>
            {/* Email */}
            <View style={styles.inputRow}>
              <Ionicons name="mail" size={20} color={TEXT_MUTED} style={styles.inputIcon} />
              <TextInput
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setLoginError('');
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                style={styles.input}
              />
            </View>

            {/* Password */}
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed" size={20} color={TEXT_MUTED} style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setLoginError('');
                }}
                secureTextEntry={!showPassword}
                style={styles.input}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((s) => !s)}
                style={styles.eyeBtn}
              >
                <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={22} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            {/* Forgot password */}
            <View style={{ alignItems: 'flex-end', marginBottom: 14 }}>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.link}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Primary button */}
            <TouchableOpacity
              style={[styles.primaryBtn, !canSubmit && { opacity: 0.5 }]}
              onPress={handleLogin}
              disabled={!canSubmit}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-in" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Sign In</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Register */}
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.ghostBtnText}>Don’t have an account? Register</Text>
            </TouchableOpacity>
          </View>

          {/* Footer note */}
          <Text style={styles.footerNote}>By continuing, you agree to our Terms & Privacy Policy.</Text>
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
    justifyContent: 'center',
    backgroundColor: BG,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#e8f1fb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 4,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DANGER,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorBannerText: { color: '#fff', flex: 1, fontSize: 13 },
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
  eyeBtn: { paddingHorizontal: 6, paddingVertical: 6 },
  link: { color: PRIMARY, textDecorationLine: 'underline' },
  primaryBtn: {
    height: 50,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  ghostBtn: { alignItems: 'center', marginTop: 12 },
  ghostBtnText: { color: TEXT_MUTED },
  footerNote: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 14,
  },
});
