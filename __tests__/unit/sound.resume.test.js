jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../assets/sfx/bgm.mp3',     () => ({}), { virtual: true });
jest.mock('../../assets/sfx/correct.mp3', () => ({}), { virtual: true });
jest.mock('../../assets/sfx/wrong.mp3',   () => ({}), { virtual: true });

jest.mock('expo-av', () => {
  let status = { isLoaded: true, isPlaying: false };
  const mockPlay   = jest.fn(async () => {});
  const mockPause  = jest.fn(async () => {});
  const mockStop   = jest.fn(async () => {});
  const mockUnload = jest.fn(async () => {});
  const mockGet    = jest.fn(async () => status);

  const createAsync = jest.fn(async () => ({
    sound: {
      playAsync: mockPlay,
      pauseAsync: mockPause,
      stopAsync: mockStop,
      unloadAsync: mockUnload,
      getStatusAsync: mockGet,
      setOnPlaybackStatusUpdate: jest.fn(),
    }
  }));

  const __setPlaying = (b) => { status = { isLoaded: true, isPlaying: !!b }; };

  return {
    Audio: {
      setAudioModeAsync: jest.fn(async () => {}),
      Sound: { createAsync },
      __m: { mockPlay, mockPause, mockStop, mockUnload, mockGet, __setPlaying, createAsync },
    }
  };
});

const ASLib = require('@react-native-async-storage/async-storage');
const AsyncStorage = ASLib.default || ASLib;

const { Audio } = require('expo-av');
const { playBgm, pauseBgm, resumeBgm } = require('../../utils/sound');

describe('sound: resume flow', () => {
  const clearAll = AsyncStorage.clear || (async () => {
    const keys = await AsyncStorage.getAllKeys();
    if (keys && keys.length) await AsyncStorage.multiRemove(keys);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await clearAll();
  });

  test('play → pause (when playing) → resume (when stopped)', async () => {
    await playBgm();
    expect(Audio.__m.createAsync).toHaveBeenCalledTimes(1);
    expect(Audio.__m.mockPlay).toHaveBeenCalledTimes(1);

    Audio.__m.__setPlaying(true);
    await pauseBgm();
    expect(Audio.__m.mockPause).toHaveBeenCalledTimes(1);

    Audio.__m.__setPlaying(false);
    await resumeBgm();
    expect(Audio.__m.mockPlay).toHaveBeenCalledTimes(2);
  });
});
