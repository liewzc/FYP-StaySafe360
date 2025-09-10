// screens/knowledge/quickaccess/CPRTrainingScreen.js
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Vibration, Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { WebView } from 'react-native-webview';
import TopBarBack from '../../../components/ui/TopBarBack'; // Reuse the unified top bar

const ACCENT = '#0B6FB8';
const BG = '#f6f8fc';
const TEXT = '#0f172a';
const MUTED = '#6b7280';
const BORDER = '#e6eef8';
const DANGER = '#dc2626';

// Extract a YouTube video ID
function getYouTubeId(input) {
  if (!input) return null;
  if (/^[A-Za-z0-9_\-]{8,}$/.test(input) && !input.includes('http')) return input;
  try {
    const url = new URL(input);
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtube-nocookie.com')) {
      const v = url.searchParams.get('v');
      if (v) return v;
      const parts = url.pathname.split('/');
      const idx = parts.indexOf('embed');
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
    if (url.hostname === 'youtu.be' && url.pathname.length > 1) {
      return url.pathname.slice(1);
    }
  } catch (e) {
    console.warn('getYouTubeId parse error:', e);
  }
  return null;
}

export default function CPRTrainingScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const initial = route.params?.initial || null;

  // Accepts video / videoId
  const videoParam = route.params?.video || route.params?.videoId || 'https://www.youtube.com/watch?v=2PngCv7NjaI';
  const videoId = getYouTubeId(videoParam) || '2PngCv7NjaI';

  /* ---------------------- CPR Metronome ---------------------- */
  const [bpm, setBpm] = useState(110); // Target compression rate
  const [running, setRunning] = useState(false);// Metronome on/off
  const [tick, setTick] = useState(false);// Visual dot toggle
  const beatTimerRef = useRef(null);// Interval handle
  const beepRef = useRef(null);// Loaded beep sound

  // If launched with initial='cpr', auto-start the metronome
  useEffect(() => { if (initial === 'cpr') setRunning(true); }, [initial]);

  // Prepare audio: load beep and enable iOS silent-mode playback
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        const { sound } = await Audio.Sound.createAsync(
          require('../../../assets/sound/metronome.mp3')
        );
        if (mounted) beepRef.current = sound;
      } catch (e) {
        console.warn('Beep load failed:', e?.message || e);
      }
    })();
    return () => {
      mounted = false;
      try { beepRef.current?.unloadAsync(); } catch (e) { console.warn('unloadAsync error:', e); }
    };
  }, []);

  // Start/stop the metronome interval; clamp bpm and vibrate + beep each beat
  useEffect(() => {
    if (!running) {
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
      return;
    }
    const clamped = Math.max(60, Math.min(150, bpm));
    const intervalMs = Math.round(60000 / clamped);

    beatTimerRef.current = setInterval(() => {
      setTick((t) => !t);
      if (beepRef.current) {
        try { beepRef.current.stopAsync?.(); } catch (e) { console.warn('stopAsync error:', e); }
        try { beepRef.current.setPositionAsync?.(0); } catch (e) { console.warn('setPositionAsync error:', e); }
        try { beepRef.current.playAsync?.(); } catch (e) { console.warn('playAsync error:', e); }
      }
      if (Platform.OS !== 'web') {
        try { Vibration.vibrate(10); } catch (e) { console.warn('Vibration error:', e); }
      }
    }, intervalMs);

    return () => { if (beatTimerRef.current) clearInterval(beatTimerRef.current); };
  }, [running, bpm]);

  // Change BPM by delta, clamped to [60, 150]
  const changeBpm = (delta) => setBpm((v) => Math.max(60, Math.min(150, v + delta)));

  // UI
  return (
    <View style={styles.container}>
      <TopBarBack title="CPR Training" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 16 },
        ]}
        style={{ backgroundColor: BG }}
      >
        {/* CPR Metronome */}
        <SectionHeader icon="❤️" title="CPR Metronome" subtitle="Target rate 100–120/min. Push hard & fast." />
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>⏱️ Metronome</Text>
            <Text style={[styles.meta, { color: running ? ACCENT : MUTED }]}>{bpm} bpm</Text>
          </View>

          <View style={styles.metronomeFace}>
            <View style={[styles.dot, tick && styles.dotOn]} />
          </View>

          <View style={styles.row}>
            <Pill label="−5" onPress={() => changeBpm(-5)} />
            <Pill label="−1" onPress={() => changeBpm(-1)} />
            <Pill label="110" accent onPress={() => setBpm(110)} />
            <Pill label="+1" onPress={() => changeBpm(+1)} />
            <Pill label="+5" onPress={() => changeBpm(+5)} />
          </View>

          <PrimaryButton
            label={running ? 'Stop' : 'Start'}
            danger={running}
            onPress={() => setRunning(!running)}
          />
        </View>

        {/* YouTube（WebView） */}
        <SectionHeader icon="🎬" title="Learn CPR (Video)" subtitle="Tap to play inline. Long press to open in YouTube." />
        <View style={styles.card}>
          <YouTubePlayer videoId={videoId} />
          <TouchableOpacity
            onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`)}
            style={{ marginTop: 10 }}
          >
            <Text style={[styles.small, { textAlign: 'center', textDecorationLine: 'underline' }]}>
              Open in YouTube
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.small, { textAlign: 'center', marginTop: 6, color: MUTED }]}>
          This app does not replace professional medical training. Call local emergency services as soon as possible.
        </Text>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// small components
function YouTubePlayer({ videoId }) {
  const containerStyle = useMemo(
    () => ({ width: '100%', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden' }),
    []
  );
  const src = `https://www.youtube.com/embed/${videoId}?rel=0&controls=1&modestbranding=1&playsinline=1`;

  return (
    <View style={containerStyle}>
      <WebView
        source={{ uri: src }}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        automaticallyAdjustContentInsets={false}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(req) => {
          const ok =
            req.url.startsWith('https://www.youtube.com/') ||
            req.url.startsWith('https://m.youtube.com/') ||
            req.url.startsWith('https://www.google.com/') ||
            req.url.startsWith('about:blank');
          return ok;
        }}
        style={{ backgroundColor: '#000' }}
      />
    </View>
  );
}

function Badge({ label, on }) {
  return (
    <View style={[styles.badge, on ? styles.badgeOn : styles.badgeOff]}>
      <Text style={[styles.badgeTxt, on ? { color: '#065f46' } : { color: '#334155' }]}>{label}</Text>
    </View>
  );
}
function Pill({ label, onPress, accent }) {
  return (
    <TouchableOpacity style={[styles.pill, accent && styles.pillAccent]} onPress={onPress}>
      <Text style={[styles.pillTxt, accent && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}
function PrimaryButton({ label, onPress, danger, color, grow }) {
  const bg = danger ? DANGER : (color || ACCENT);
  return (
    <TouchableOpacity style={[styles.btn, { backgroundColor: bg }, grow && { flexGrow: 1 }]} onPress={onPress} activeOpacity={0.9}>
      <Text style={styles.btnTxt}>{label}</Text>
    </TouchableOpacity>
  );
}
function SectionHeader({ icon, title, subtitle }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{icon} {title}</Text>
      {!!subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
    </View>
  );
}

// styles
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: BG 
  },
  content: { 
    paddingHorizontal: 16,
    paddingTop: 10, 
  },
  sectionHeader: { marginTop: 14, marginBottom: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: TEXT },
  sectionSub: { color: MUTED, marginTop: 4, fontSize: 12 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    ...shadowSoft(8),
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '900', color: TEXT },
  meta: { color: MUTED, fontSize: 12 },
  small: { color: MUTED, fontSize: 12, marginTop: 6 },
  metronomeFace: { alignItems: 'center', justifyContent: 'center', height: 84, marginTop: 6 },
  dot: { width: 22, height: 22, borderRadius: 999, backgroundColor: '#e2e8f0' },
  dotOn: { backgroundColor: ACCENT },
  pill: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff' },
  pillAccent: { backgroundColor: ACCENT, borderColor: ACCENT },
  pillTxt: { fontWeight: '900', color: '#334155' },
  btn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', paddingHorizontal: 14, marginTop: 10 },
  btnTxt: { color: '#fff', fontWeight: '900' },
  badge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  badgeOn: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
  badgeOff: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  badgeTxt: { fontSize: 12, fontWeight: '800' },
});

function shadowSoft(elevation = 8) {
  return Platform.select({
    ios: {
      shadowColor: '#0b1b31',
      shadowOpacity: 0.08,
      shadowRadius: Math.max(4, elevation / 2),
      shadowOffset: { width: 0, height: Math.min(6, Math.round(elevation / 2)) },
    },
    android: { elevation },
    default: {},
  });
}
