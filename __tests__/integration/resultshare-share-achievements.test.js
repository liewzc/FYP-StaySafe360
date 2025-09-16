// __tests__/integration/resultshare-share-achievements.test.js
/** @jest-environment jsdom */

/* ---------- 先 mock 掉会触发 ESM/原生绑定的依赖 ---------- */

// 完整 mock @react-navigation/native（避免加载其 ESM）
jest.mock(
  '@react-navigation/native',
  () => {
    const React = require('react');
    return {
      NavigationContainer: ({ children }) => <>{children}</>,
      useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
      useRoute: () => ({
        params: {
          score: 10,
          total: 10,
          disasterType: 'Flood',
          subLevel: 'Ⅰ',
          timeSpentMs: 12000,
          answers: [],
        },
      }),
      useIsFocused: () => true,
      useFocusEffect: (effect) => { React.useEffect(effect, []); },
    };
  },
  { virtual: true }
);

// safe-area
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }) => <>{children}</>,
    SafeAreaView: ({ children }) => <>{children}</>,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
}, { virtual: true });

// icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name = 'icon', ...p }) => <Text accessibilityRole="image" {...p}>{name}</Text>;
  return { Ionicons: Icon, MaterialCommunityIcons: Icon, FontAwesome5: Icon };
}, { virtual: true });

// gesture
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const View = ({ children }) => <>{children}</>;
  return {
    GestureHandlerRootView: View,
    PanGestureHandler: View,
    TapGestureHandler: View,
    LongPressGestureHandler: View,
    State: {},
  };
}, { virtual: true });

// Animated helper（兼容存在/不存在）
try {
  // eslint-disable-next-line import/no-unresolved
  require.resolve('react-native/Libraries/Animated/NativeAnimatedHelper');
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}));
} catch {
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true });
}

/* ---------- 功能相关 mocks ---------- */

// AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import AsyncStorage from '@react-native-async-storage/async-storage';

// Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'Medium' },
}));

// Share / A11y
import { Share, AccessibilityInfo } from 'react-native';
jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});

/* ---------- 正式导入 ---------- */
import React from 'react';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import ResultShareScreen from '../../screens/quiz/ResultShareScreen';

/* ---------- 启用 & 清理假定时器，防止 teardown 后还有定时器 ---------- */
beforeAll(() => {
  jest.useFakeTimers();           // 使用现代 fake timers
});
afterEach(() => {
  jest.runOnlyPendingTimers();
});
afterAll(() => {
  jest.useRealTimers();
});

const renderWithProviders = (ui) =>
  render(
    <SafeAreaProvider>
      <NavigationContainer>{ui}</NavigationContainer>
    </SafeAreaProvider>
  );

/* ---------- 用例 ---------- */
describe('Integration: ResultShareScreen share increments achievements share counter', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  test('tap Share -> progress.shares increments', async () => {
    renderWithProviders(<ResultShareScreen />);

    const shareBtn = await screen.findByText(/Share/i);

    fireEvent.press(shareBtn, { stopPropagation: jest.fn(), nativeEvent: {} });

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(async () => {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const val = await AsyncStorage.getItem('progress.shares');
      const n = typeof val === 'string' ? parseInt(val, 10) : val;
      expect(n).toBe(1);
    });
  });
});
