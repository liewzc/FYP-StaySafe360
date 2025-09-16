import React from 'react';
import { render } from '@testing-library/react-native';

try {
  jest.doMock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}));
} catch {}

/** gesture-handler */
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const View = ({ children }) => <>{children}</>;
  return {
    GestureHandlerRootView: View,
    TapGestureHandler: View,
    PanGestureHandler: View,
    LongPressGestureHandler: View,
    State: {},
    default: {},
  };
});

/** reanimated */
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

/** safe-area */
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

jest.doMock(
  '@react-navigation/native',
  () => ({
    __esModule: true,
    NavigationContainer: ({ children }) => children ?? null,
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() }),
    useRoute: () => ({ params: {} }),
    useFocusEffect: (cb) => cb && cb(() => {}),
    useIsFocused: () => true,
    DefaultTheme: {},
    DarkTheme: {},
  }),
  { virtual: true }
);

/** AsyncStorage */
jest.doMock(
  '@react-native-async-storage/async-storage',
  () => {
    let store = {};
    const api = {
      getItem: jest.fn(async (k) => (k in store ? store[k] : null)),
      setItem: jest.fn(async (k, v) => {
        store[k] = v;
      }),
      removeItem: jest.fn(async (k) => {
        delete store[k];
      }),
      clear: jest.fn(async () => {
        store = {};
      }),
      getAllKeys: jest.fn(async () => Object.keys(store)),
      multiGet: jest.fn(async (keys) => keys.map((k) => [k, store[k] ?? null])),
      multiSet: jest.fn(async (pairs) => {
        pairs.forEach(([k, v]) => (store[k] = v));
      }),
      multiRemove: jest.fn(async (keys) => {
        keys.forEach((k) => delete store[k]);
      }),
    };
    return { __esModule: true, default: api };
  },
  { virtual: true }
);

const Screen =
  require('../../screens/knowledge/everyday/EverydayHubScreen').default ||
  require('../../screens/knowledge/everyday/EverydayHubScreen');

describe('EverydayHubScreen (component)', () => {
  test('renders (smoke)', () => {
    const { toJSON } = render(<Screen />);
    expect(toJSON()).toBeTruthy();
  });
});
