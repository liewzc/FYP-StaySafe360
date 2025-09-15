jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../assets/sfx/correct.mp3', () => ({}), { virtual: true });
jest.mock('../../assets/sfx/wrong.mp3',   () => ({}), { virtual: true });
jest.mock('../../assets/sfx/bgm.mp3',     () => ({}), { virtual: true });

jest.mock('expo-av', () => {
  const mockPlayAsync   = jest.fn(async () => {});
  const mockPauseAsync  = jest.fn(async () => {});
  const mockStopAsync   = jest.fn(async () => {});
  const mockUnloadAsync = jest.fn(async () => {});
  let status = { isLoaded: true, isPlaying: false };
  const getStatusAsync  = jest.fn(async () => status);

  const createAsync = jest.fn(async () => ({
    sound: {
      playAsync: mockPlayAsync,
      pauseAsync: mockPauseAsync,
      stopAsync: mockStopAsync,
      unloadAsync: mockUnloadAsync,
      getStatusAsync,
      setPositionAsync: jest.fn(async () => {}),
      setOnPlaybackStatusUpdate: jest.fn(),
    },
  }));

  const __setPlaying = (playing) => {
    status = { isLoaded: true, isPlaying: !!playing };
  };

  return {
    Audio: {
      setAudioModeAsync: jest.fn(async () => {}),
      Sound: { createAsync },
      __mocks: { mockPlayAsync, mockPauseAsync, mockStopAsync, mockUnloadAsync, getStatusAsync },
      __setPlaying,
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import {
  isSoundEnabled,
  playBgm,
  pauseBgm,
  stopBgm,
  playCorrect,
  playWrong,
} from '../../utils/sound';

describe('sound utils', () => {
  let logSpy;
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy?.mockRestore();
  });

  test('isSoundEnabled defaults to true', async () => {
    await AsyncStorage.removeItem('settings.sound');
    await expect(isSoundEnabled()).resolves.toBe(true);
  });

  test('playCorrect plays when enabled', async () => {
    await AsyncStorage.setItem('settings.sound', 'true');
    await playCorrect();
    expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(1);
    expect(Audio.__mocks.mockPlayAsync).toHaveBeenCalledTimes(1);
  });

  test('playWrong does nothing when disabled', async () => {
    await AsyncStorage.setItem('settings.sound', 'false');
    await playWrong();
    expect(Audio.Sound.createAsync).not.toHaveBeenCalled();
    expect(Audio.__mocks.mockPlayAsync).not.toHaveBeenCalled();
  });

  test('playBgm -> pause -> stop flow', async () => {
    await AsyncStorage.setItem('settings.sound', 'true');

    await playBgm();
    expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(1);
    expect(Audio.__mocks.mockPlayAsync).toHaveBeenCalledTimes(1);

    Audio.__setPlaying(true);
    await pauseBgm();
    expect(Audio.__mocks.mockPauseAsync).toHaveBeenCalledTimes(1);

    await stopBgm();
    expect(Audio.__mocks.mockStopAsync).toHaveBeenCalledTimes(1);
    expect(Audio.__mocks.mockUnloadAsync).toHaveBeenCalledTimes(1);
  });
});
