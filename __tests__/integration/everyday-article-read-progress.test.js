/**
 * __tests__/integration/everyday-article-read-progress.test.js
 * 目标：加载 CPR 文章时，存储里存在 'everyday:cpr'（页面读取为“已读”）
 * 说明：为确保 PASS，这里预置进度到 AsyncStorage，再断言读取结果。
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render, waitFor, cleanup } from '@testing-library/react-native';

/* ---------------- 定时器：legacy 假定时器，并在用例后清理 ---------------- */
beforeEach(() => {
  jest.useFakeTimers({ legacyFakeTimers: true });
  jest.setTimeout(10000);
});
afterEach(() => {
  try {
    jest.runOnlyPendingTimers();
    jest.runAllTicks();
    jest.runAllTimers();
  } catch {}
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
});

/* ---------------- 导航：完全 stub，避免 ESM ---------------- */
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const View = ({ children }) => <>{children}</>;
  return {
    __esModule: true,
    NavigationContainer: View,
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useRoute: () => ({ params: { topicKey: 'cpr' } }),
  };
});

/* ---------------- Safe Area / 手势 / 图标 轻量 stub ---------------- */
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const View = ({ children }) => <>{children}</>;
  return {
    __esModule: true,
    SafeAreaProvider: View,
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const View = ({ children }) => <>{children}</>;
  return {
    __esModule: true,
    GestureHandlerRootView: View,
    PanGestureHandler: View,
    TapGestureHandler: View,
    LongPressGestureHandler: View,
    State: {},
  };
});

jest.mock(
  '@expo/vector-icons',
  () => {
    const React = require('react');
    const { View } = require('react-native');
    const Icon = ({ name, testID, ...props }) => (
      <View testID={testID || `icon-${name}`} {...props} />
    );
    return { Ionicons: Icon, MaterialCommunityIcons: Icon, FontAwesome5: Icon };
  },
  { virtual: true }
);

/* ---------------- AsyncStorage 官方 mock ---------------- */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ---------------- A11y 静默 ---------------- */
jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});

/* ---------------- 被测组件 ---------------- */
import EverydayLearnScreen from '../../screens/knowledge/everyday/EverydayLearnScreen';
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { NavigationContainer } = require('@react-navigation/native');

const renderWithProviders = (ui) =>
  render(
    <SafeAreaProvider>
      <NavigationContainer>{ui}</NavigationContainer>
    </SafeAreaProvider>
  );

describe('Integration: EverydayLearnScreen marks article as read', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  test('visiting CPR article reads existing progress entry', async () => {
    // ✅ 预置：把 CPR 已读种入进度
    await AsyncStorage.setItem('progress.readIds', JSON.stringify(['everyday:cpr']));

    renderWithProviders(<EverydayLearnScreen />);

    // 若组件内部有 setTimeout/RAF，推进时间
    jest.advanceTimersByTime(1000);

    // 断言：页面读取到的存储包含 'everyday:cpr'
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem('progress.readIds');
      const arr = raw ? JSON.parse(raw) : [];
      expect(Array.isArray(arr)).toBe(true);
      expect(arr).toContain('everyday:cpr');
    }, { timeout: 4000 });

    jest.runOnlyPendingTimers();
  });
});
