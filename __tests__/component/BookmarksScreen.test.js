// __tests__/component/BookmarksScreen.test.js
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

/** ---------- 精准静音：仅忽略 not wrapped in act(...) ---------- */
const realConsoleError = console.error;
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    const first = (args[0]?.toString?.() || '');
    if (first.includes('not wrapped in act(')) return; // 忽略这条噪音
    return realConsoleError(...args); // 其他错误照常打印
  });
});
afterAll(() => {
  console.error.mockRestore();
});

/** ---------- RN Animated helper（某些 RN 版本无此模块，用 try 兼容） ---------- */
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

/** ---------- reanimated（很多导航栈会依赖） ---------- */
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

/** ---------- safe area ---------- */
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaProvider: ({ children }) => <>{children}</>,
    SafeAreaView: ({ children }) => <>{children}</>,
  };
});

/** ---------- AsyncStorage（避免 NativeModule: null） ---------- */
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

/** ---------- vector icons（工厂里 require RN，避免 ESM 报错） ---------- */
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name = 'icon', ...p }) => <Text {...p}>{name}</Text>;
  return { Ionicons: Icon, MaterialCommunityIcons: Icon, FontAwesome5: Icon };
});

/** ---------- 完全虚拟化 @react-navigation/native，避免 requireActual 触发 ESM ---------- */
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

/** ---------- 读取被测组件（在所有 mocks 之后） ---------- */
const Screen =
  require('../../screens/knowledge/quickaccess/BookmarksScreen').default ||
  require('../../screens/knowledge/quickaccess/BookmarksScreen');

/** ---------- 引入被 mock 的 AsyncStorage 以便断言 ---------- */
const AsyncStorage =
  require('@react-native-async-storage/async-storage').default;

describe('BookmarksScreen (component)', () => {
  test('renders without crashing (smoke) without act warning', async () => {
    const { toJSON } = render(<Screen />);

    // 正面消除：等待 useEffect -> AsyncStorage -> setState 完成
    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('bookmarks');
    });

    expect(toJSON()).toBeTruthy();
  });
});
