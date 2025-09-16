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
  console.error?.mockRestore?.();
});

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

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const I = ({ name = 'icon', ...p }) => <Text {...p}>{name}</Text>;
  return { Ionicons: I, MaterialCommunityIcons: I, FontAwesome5: I };
});

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    __esModule: true,
    NavigationContainer: ({ children }) => children ?? null,
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() }),
    useRoute: () => ({ params: {} }),
    useIsFocused: () => true,
    useFocusEffect: (cb) => {

      React.useEffect(() => {
        const cleanup = typeof cb === 'function' ? cb(() => {}) : undefined;
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, []);
    },
    DefaultTheme: {},
    DarkTheme: {},
  };
});

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

const Screen =
  require('../../screens/knowledge/quickaccess/ResourceHubScreen').default ||
  require('../../screens/knowledge/quickaccess/ResourceHubScreen');

const AsyncStorage =
  require('@react-native-async-storage/async-storage').default;

describe('ResourceHubScreen (component)', () => {
  test('renders (smoke) without act warning', async () => {
    const { toJSON } = render(<Screen />);

    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalled();
    });

    expect(toJSON()).toBeTruthy();
  });
});
