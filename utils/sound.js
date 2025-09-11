// utils/sound.js

// Sound utilities built on top of expo-av
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SOUND_KEY = "settings.sound";

// Internal singleton state
// Keep a single BGM sound instance across the app session.
let bgmSound = null;
// Set audio mode once
let audioModeSet = false;

// Setting read helpers
export async function isSoundEnabled() {
  try {
    const v = await AsyncStorage.getItem(SOUND_KEY);
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
}

// Ensure app-level audio behavior is configured before playback
async function ensureAudioMode() {
  if (audioModeSet) return;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
    });
    audioModeSet = true;
  } catch (e) {
    console.log("ensureAudioMode error", e);
  }
}

// BGM controls
export async function playBgm() {
  if (!(await isSoundEnabled())) return null;
  await ensureAudioMode();

  try {
    if (bgmSound) {
      // Reuse existing sound if present
      const status = await bgmSound.getStatusAsync();
      if (!status.isLoaded) {
        await bgmSound.loadAsync(require("../assets/sfx/bgm.mp3"), {
          isLooping: true,
          volume: 0.35,
        });
      }
      if (!status.isPlaying) await bgmSound.playAsync();
      return bgmSound;
    }

     // First-time load
    const { sound } = await Audio.Sound.createAsync(
      require("../assets/sfx/bgm.mp3"),
      { isLooping: true, volume: 0.35 }
    );
    bgmSound = sound;
    await bgmSound.playAsync();
    return bgmSound;
  } catch (e) {
    console.log("playBgm error", e);
    return null;
  }
}

// Pause background music if currently playing
export async function pauseBgm() {
  try {
    if (!bgmSound) return;
    const status = await bgmSound.getStatusAsync();
    if (status.isLoaded && status.isPlaying) await bgmSound.pauseAsync();
  } catch (e) {
    console.log("pauseBgm error", e);
  }
}

// Resume background music if loaded and currently paused
export async function resumeBgm() {
  try {
    if (!bgmSound) return;
    const status = await bgmSound.getStatusAsync();
    if (status.isLoaded && !status.isPlaying) await bgmSound.playAsync();
  } catch (e) {
    console.log("resumeBgm error", e);
  }
}

// Stop and fully unload the BGM sound, releasing resources
export async function stopBgm() {
  try {
    if (!bgmSound) return;
    await bgmSound.stopAsync();
    await bgmSound.unloadAsync();
  } catch (e) {
    console.log("stopBgm error", e);
  } finally {
    bgmSound = null;
  }
}

// Short SFX (fire-and-forget)
export async function playCorrect() {
  if (!(await isSoundEnabled())) return;
  await ensureAudioMode();
  try {
    const { sound } = await Audio.Sound.createAsync(
      require("../assets/sfx/correct.mp3"),
      { volume: 0.85 }
    );
    await sound.playAsync();
    // Auto-unload when finished or interrupted to avoid leaks
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.didJustFinish || s.isInterrupted)
        sound.unloadAsync().catch(() => {});
    });
  } catch (e) {
    console.log("playCorrect error", e);
  }
}

// Plays the "wrong" sound once and cleans up after playback.
export async function playWrong() {
  if (!(await isSoundEnabled())) return;
  await ensureAudioMode();
  try {
    const { sound } = await Audio.Sound.createAsync(
      require("../assets/sfx/wrong.mp3"),
      { volume: 0.85 }
    );
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.didJustFinish || s.isInterrupted)
        sound.unloadAsync().catch(() => {});
    });
  } catch (e) {
    console.log("playWrong error", e);
  }
}

// SFX variants that await completion
// Useful if you need to block progress until the effect finishes.
export async function playCorrectWait() {
  if (!(await isSoundEnabled())) return;
  await ensureAudioMode();
  const { sound } = await Audio.Sound.createAsync(
    require("../assets/sfx/correct.mp3"),
    { volume: 0.85 }
  );
  await sound.playAsync();
  return new Promise((resolve) => {
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.didJustFinish || s.isInterrupted) {
        sound.unloadAsync().catch(() => {});
        resolve();
      }
    });
  });
}

export async function playWrongWait() {
  if (!(await isSoundEnabled())) return;
  await ensureAudioMode();
  const { sound } = await Audio.Sound.createAsync(
    require("../assets/sfx/wrong.mp3"),
    { volume: 0.85 }
  );
  await sound.playAsync();
  return new Promise((resolve) => {
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.didJustFinish || s.isInterrupted) {
        sound.unloadAsync().catch(() => {});
        resolve();
      }
    });
  });
}
