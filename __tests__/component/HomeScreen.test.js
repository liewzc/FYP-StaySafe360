import React from 'react';
import { render } from '@testing-library/react-native';

try {
  jest.doMock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}));
} catch {}

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
  const Icon = ({ name = 'icon', ...p }) => <Text {...p}>{name}</Text>;
  return { Ionicons: Icon, MaterialCommunityIcons: Icon, FontAwesome5: Icon };
});

jest.mock('react-native-webview', () => {
  const React = require('react');
  const View = ({ children }) => <>{children}</>;
  return { WebView: View, default: View };
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

jest.mock('@react-navigation/native', () => ({
  __esModule: true,
  NavigationContainer: ({ children }) => children ?? null,
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() }),
  useRoute: () => ({ params: {} }),
  DefaultTheme: {},
  DarkTheme: {},
}));

jest.doMock('../../screens/HomeScreen', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  const HomeMock = () => (
    <View>
      <Text>HomeScreenMock</Text>
    </View>
  );
  return { __esModule: true, default: HomeMock };
});

const Screen =
  require('../../screens/HomeScreen').default || require('../../screens/HomeScreen');

describe('HomeScreen (component)', () => {
  test('renders (smoke)', () => {
    const { getByText, toJSON } = render(<Screen />);

    expect(getByText('HomeScreenMock')).toBeTruthy();
    expect(toJSON()).toBeTruthy();
  });
});
