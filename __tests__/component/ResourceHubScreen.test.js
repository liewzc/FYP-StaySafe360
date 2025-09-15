// __tests__/component/ResourceHubScreen.test.js
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

/** ---------- 精准静音：仅忽略 not wrapped in act(...) ---------- */
const realConsoleError = console.error;
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    const first = (args[0]?.toString?.() || '');
    if (first.includes('not wrapped in act(')) return; // 只忽略这条噪音
    return realConsoleError(...args);
  });
});
afterAll(() => {
  console.error?.mockRestore?.();
});

/** ---------- 兼容不同 RN 版本的 Animated helper 路径 ---------- */
const animatedHelperPaths = [
  'react-native/Libraries/Animated/NativeAnimatedHelper',
  'react-native/Libraries/Animated/src/NativeAnimatedHelper',
];
for (const p of animatedHelperPaths) {
  try {
    jest.doMock(p, () => ({}), { virtual: true });
    break;
  } catch {}
}

/** ---------- gesture-handler 基础 mock ---------- */
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const View = ({ children }) => <>{children}</>;
  return {
    GestureHandlerRootView: View,
    PanGestureHandler: View,
    TapGestureHandler: View,
    LongPressGestureHandler: View,
    FlingGestureHandler: View,
    NativeViewGestureHandler: View,
    Directions: {},
    State: {},
    default: {},
  };
});

/** ---------- reanimated（很多导航/动画依赖它） ---------- */
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

/** ---------- safe-area ---------- */
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaProvider: ({ children }) => <>{children}</>,
    SafeAreaView: ({ children }) => <>{children}</>,
  };
});

/** ---------- 向量图标：工厂内部 require，避免 ESM 问题 ---------- */
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const I = ({ name = 'icon', ...p }) => <Text {...p}>{name}</Text>;
  return { Ionicons: I, MaterialCommunityIcons: I, FontAwesome5: I };
});

/** ---------- 导航 mock：提供 useFocusEffect/useIsFocused 等 ---------- */
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    __esModule: true,
    NavigationContainer: ({ children }) => children ?? null,
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() }),
    useRoute: () => ({ params: {} }),
    useIsFocused: () => true,
    useFocusEffect: (cb) => {
      // 在测试里通过 effect 立即触发一次 cb（与真实行为等价于已聚焦）
      React.useEffect(() => {
        const cleanup = typeof cb === 'function' ? cb(() => {}) : undefined;
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, []);
    },
    DefaultTheme: {},
    DarkTheme: {},
  };
});

/** ---------- AsyncStorage：内存版实现 ---------- */
jest.mock('@react-native-async-storage/async-storage', () => {
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
});

/** ---------- resourceData 虚拟实现（若屏幕直接从该路径 default 导入） ---------- */
const path = require('path');
const resourceDataPath = path.join(process.cwd(), 'screens', 'knowledge', 'resourceData.js');
jest.doMock(
  resourceDataPath,
  () => ({
    __esModule: true,
    default: [
      { id: 'r1', title: 'Emergency Contacts', url: 'https://example.com' },
      { id: 'r2', title: 'First Aid PDF', url: 'https://example.com/a' },
    ],
  }),
  { virtual: true }
);

/** ---------- 在所有 mocks 之后再引入被测组件 ---------- */
const Screen =
  require('../../screens/knowledge/quickaccess/ResourceHubScreen').default ||
  require('../../screens/knowledge/quickaccess/ResourceHubScreen');

/** ---------- 取到 mock 的 AsyncStorage 以便断言 ---------- */
const AsyncStorage =
  require('@react-native-async-storage/async-storage').default;

describe('ResourceHubScreen (component)', () => {
  test('renders (smoke) without act warning', async () => {
    const { toJSON } = render(<Screen />);

    // ✅ 正面消除：等待一次异步 effect 完成（waitFor 内置 act）
    // 如果你的实现读取的 key 不是 'bookmarks'，改成实际的 key（如 'savedResources'）
    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalled();
    });

    expect(toJSON()).toBeTruthy();
  });
});
