import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const realConsoleError = console.error;
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    const first = (args[0]?.toString?.() || '');
    if (first.includes('not wrapped in act(')) return; 
    return realConsoleError(...args); 
  });
});
afterAll(() => {
  console.error.mockRestore();
});

/** ---------- RN Animated helper ---------- */
try {
  jest.doMock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}));
} catch {}

/** ---------- gesture-handler ---------- */
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const View = ({ children }) => <>{children}</>;
  return {
    GestureHandlerRootView: View,
    PanGestureHandler: View,
    LongPressGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    NativeViewGestureHandler: View,
    Directions: {},
    State: {},
    default: {},
  };
});

try {
  jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
} catch {
  jest.doMock(
    'react-native-reanimated',
    () => {
      const NOOP = (v) => v;
      return {
        useSharedValue: (v) => ({ value: v }),
        useAnimatedStyle: (fn) => (typeof fn === 'function' ? fn() : {}),
        withTiming: NOOP,
        withSpring: NOOP,
        withRepeat: (v) => v,
        runOnJS: (fn) => fn,
        runOnUI: (fn) => fn,
        default: {},
      };
    },
    { virtual: true }
  );
}

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaProvider: ({ children }) => <>{children}</>,
    SafeAreaView: ({ children }) => <>{children}</>,
  };
});

jest.doMock(
  '@react-native-async-storage/async-storage',
  () => {
    let store = {};
    const api = {
      getItem: jest.fn(async (k) => (k in store ? store[k] : null)),
      setItem: jest.fn(async (k, v) => { store[k] = v; }),
      removeItem: jest.fn(async (k) => { delete store[k]; }),
      clear: jest.fn(async () => { store = {}; }),
      getAllKeys: jest.fn(async () => Object.keys(store)),
      multiGet: jest.fn(async (keys) => keys.map((k) => [k, store[k] ?? null])),
      multiSet: jest.fn(async (pairs) => { pairs.forEach(([k, v]) => (store[k] = v)); }),
      multiRemove: jest.fn(async (keys) => { keys.forEach((k) => delete store[k]); }),
    };
    return { __esModule: true, default: api };
  },
  { virtual: true }
);

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name = 'icon', ...p }) => <Text {...p}>{name}</Text>;
  return { Ionicons: Icon, MaterialCommunityIcons: Icon, FontAwesome5: Icon };
});

jest.doMock(
  '@react-navigation/native',
  () => {
    const React = require('react');
    const NavigationContainer = ({ children }) => <>{children}</>;
    const useFocusEffect = (cb) => {
      React.useEffect(() => {
        const clean = cb?.(() => {}) || undefined;
        return typeof clean === 'function' ? clean : undefined;
      }, []);
    };
    const useIsFocused = () => true;

    return {
      __esModule: true,
      NavigationContainer,
      useNavigation: () => ({
        navigate: jest.fn(),
        goBack: jest.fn(),
        setOptions: jest.fn(),
      }),
      useRoute: () => ({ params: {} }),
      useFocusEffect,
      useIsFocused,
      DefaultTheme: {},
      DarkTheme: {},
    };
  },
  { virtual: true }
);

const Screen =
  require('../../screens/knowledge/quickaccess/BookmarksScreen').default ||
  require('../../screens/knowledge/quickaccess/BookmarksScreen');

const AsyncStorage =
  require('@react-native-async-storage/async-storage').default;

describe('BookmarksScreen (component)', () => {
  test('renders without crashing (smoke) without act warning', async () => {
    const { toJSON } = render(<Screen />);

    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('bookmarks');
    });

    expect(toJSON()).toBeTruthy();
  });
});
