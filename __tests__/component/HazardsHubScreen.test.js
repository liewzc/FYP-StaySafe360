import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

try {
  jest.doMock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}));
} catch {}

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const View = ({ children }) => <>{children}</>;
  return {
    GestureHandlerRootView: View,
    LongPressGestureHandler: View,
    TapGestureHandler: View,
    PanGestureHandler: View,
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

jest.doMock(
  '@expo/vector-icons',
  () => {
    const React = require('react');
    const { Text } = require('react-native');
    const I = ({ name = 'icon', ...p }) => <Text {...p}>{name}</Text>;
    return { Ionicons: I, MaterialCommunityIcons: I, FontAwesome5: I };
  },
  { virtual: true }
);

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

jest.doMock(
  '../../../components/ui/TopBarBack',
  () => {
    const React = require('react');
    return ({ children }) => children ?? null;
  },
  { virtual: true }
);


const path = require('path');
const hazardsDataPath = path.join(process.cwd(), 'screens', 'knowledge', 'hazard', 'hazardsData.js');
jest.doMock(
  hazardsDataPath,
  () => ({
    __esModule: true,

    HAZARD_KEYS: ['flood', 'earthquake'],
    HAZARDS: {
      flood: {
        id: 'flood',
        title: 'Flood',
        icon: { lib: 'mci', name: 'water' },

        cover: { uri: 'about:blank#flood' },
      },
      earthquake: {
        id: 'earthquake',
        title: 'Earthquake',
        icon: { lib: 'mci', name: 'earth' },
        cover: { uri: 'about:blank#earthquake' },
      },
    },

    default: [
      { id: 'flood', title: 'Flood', icon: { lib: 'mci', name: 'water' }, cover: { uri: 'about:blank#flood' } },
      { id: 'earthquake', title: 'Earthquake', icon: { lib: 'mci', name: 'earth' }, cover: { uri: 'about:blank#earthquake' } },
    ],
  }),
  { virtual: true }
);

const Screen =
  require('../../screens/knowledge/hazard/HazardsHubScreen').default ||
  require('../../screens/knowledge/hazard/HazardsHubScreen');

describe('HazardsHubScreen (component)', () => {
  test('renders (smoke)', async () => {
    const { toJSON } = render(<Screen />);
    await waitFor(() => {

      expect(toJSON()).toBeTruthy();
    });
  });
});
