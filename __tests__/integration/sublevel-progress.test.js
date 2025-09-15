// __tests__/integration/sublevel-progress.test.js
/** @jest-environment jsdom */

// ---- Mocks: navigation / safe-area / icons / gesture / Animated ----
jest.mock(
  '@react-navigation/native',
  () => {
    const React = require('react');
    return {
      NavigationContainer: ({ children }) => <>{children}</>,
      useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
      useRoute: () => ({ params: { disasterType: 'Flood' } }),
      useIsFocused: () => true,
      useFocusEffect: (effect) => { React.useEffect(effect, []); },
    };
  },
  { virtual: true }
);

jest.mock(
  'react-native-safe-area-context',
  () => {
    const React = require('react');
    return {
      SafeAreaProvider: ({ children }) => <>{children}</>,
      SafeAreaView: ({ children }) => <>{children}</>,
      useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    };
  },
  { virtual: true }
);

jest.mock(
  '@expo/vector-icons',
  () => {
    const React = require('react');
    const { Text } = require('react-native');
    const Icon = ({ name = 'icon', ...p }) => (
      <Text accessibilityRole="image" {...p}>{name}</Text>
    );
    return { Ionicons: Icon, MaterialCommunityIcons: Icon, FontAwesome5: Icon };
  },
  { virtual: true }
);

jest.mock(
  'react-native-gesture-handler',
  () => {
    const React = require('react');
    const View = ({ children }) => <>{children}</>;
    return {
      GestureHandlerRootView: View,
      PanGestureHandler: View,
      TapGestureHandler: View,
      LongPressGestureHandler: View,
      State: {},
    };
  },
  { virtual: true }
);

try {
  require.resolve('react-native/Libraries/Animated/NativeAnimatedHelper');
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}));
} catch {
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true });
}

// ---- AsyncStorage mock ----
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---- Imports ----
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import SubLevelScreen from '../../screens/quiz/SubLevelScreen';

// ---- Timers to avoid teardown leakage ----
beforeAll(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.runOnlyPendingTimers();
});
afterAll(() => {
  jest.useRealTimers();
});

// ---- Helpers ----
const PROGRESS_KEY = 'quizProgress';
const renderWithProviders = (ui) =>
  render(
    <SafeAreaProvider>
      <NavigationContainer>{ui}</NavigationContainer>
    </SafeAreaProvider>
  );

// ---- Test ----
describe('Integration: SubLevelScreen progress display', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  test('shows Complete badge for finished sublevel', async () => {
    // 写入最新进度结构
    await AsyncStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ Flood: { 'Ⅰ': 'complete' } })
    );

    renderWithProviders(<SubLevelScreen />);

    // 1) “Complete” 可能出现多处，用 findAllByText 并断言至少 1 个
    const completes = await screen.findAllByText(/Complete/i);
    expect(completes.length).toBeGreaterThan(0);

    // 2) 也应能看到 “Sublevel Ⅰ” 卡片标题
    expect(await screen.findByText(/Sublevel\s*Ⅰ/i)).toBeTruthy();

    // 3) （可选）更强语义校验：看到解释文字
    expect(await screen.findByText(/You've completed this sublevel\./i)).toBeTruthy();
  });
});
