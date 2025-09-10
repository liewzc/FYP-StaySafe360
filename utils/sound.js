// utils/sound.js
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SOUND_KEY = "settings.sound";

// ===== 内部状态（单例） =====
let bgmSound = null;
let audioModeSet = false;

// ===== 开关读取 =====
export async function isSoundEnabled() {
  try {
    const v = await AsyncStorage.getItem(SOUND_KEY);
    return v === null ? true : v === "true"; // 默认开启
  } catch {
    return true;
  }
}

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

// ===== BGM 控制 =====
export async function playBgm() {
  if (!(await isSoundEnabled())) return null;
  await ensureAudioMode();

  try {
    if (bgmSound) {
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

export async function pauseBgm() {
  try {
    if (!bgmSound) return;
    const status = await bgmSound.getStatusAsync();
    if (status.isLoaded && status.isPlaying) await bgmSound.pauseAsync();
  } catch (e) {
    console.log("pauseBgm error", e);
  }
}

export async function resumeBgm() {
  try {
    if (!bgmSound) return;
    const status = await bgmSound.getStatusAsync();
    if (status.isLoaded && !status.isPlaying) await bgmSound.playAsync();
  } catch (e) {
    console.log("resumeBgm error", e);
  }
}

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

// ===== SFX（即时播放）=====
export async function playCorrect() {
  if (!(await isSoundEnabled())) return;
  await ensureAudioMode();
  try {
    const { sound } = await Audio.Sound.createAsync(
      require("../assets/sfx/correct.mp3"),
      { volume: 0.85 }
    );
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.didJustFinish || s.isInterrupted)
        sound.unloadAsync().catch(() => {});
    });
  } catch (e) {
    console.log("playCorrect error", e);
  }
}

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

// ===== SFX（等播完再继续的版本）=====
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
