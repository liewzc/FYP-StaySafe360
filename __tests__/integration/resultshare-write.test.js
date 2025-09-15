/**
 * __tests__/integration/resultshare-write.test.js
 * 目标：ResultShareScreen 挂载后会把一次测验 attempt 写入：
 *  - 'attemptIndex' 为数组且长度 > 0
 *  - 'attempt:<id>' 详情存在
 */

import React from 'react';
import { Share, AccessibilityInfo } from 'react-native';
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

/* ---------------- 完全 stub 导航（避免 ESM），并提供 useFocusEffect ---------------- */
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const View = ({ children }) => <>{children}</>;
  const useFocusEffect = (cb) => {
    React.useEffect(() => {
      const clean = cb?.();
      return clean;
    }, [cb]);
  };
  return {
    __esModule: true,
    NavigationContainer: View,
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useRoute: () => ({
      params: {
        score: 5,
        total: 5,
        disasterType: 'Flood',
        subLevel: 'Ⅰ',
        timeSpentMs: 15000,
        answers: [],
      },
    }),
    useFocusEffect,
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

/* ---------------- AsyncStorage 官方 mock（自包含） ---------------- */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ---------------- Haptics / Share / A11y 静默 ---------------- */
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'Medium' },
}));
jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});

/* ---------------- Supabase client 最小 mock ---------------- */
jest.mock('../../supabaseClient', () => {
  const auth = {
    getUser: jest.fn(async () => ({ data: { user: { id: 'u_test' } }, error: null })),
    getSession: jest.fn(async () => ({ data: { session: { user: { id: 'u_test' } } } })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    signOut: jest.fn(),
  };
  const from = jest.fn(() => ({
    insert: jest.fn(async () => ({ error: null })),
    delete: jest.fn(async () => ({ error: null })),
    select: jest.fn(() => ({
      eq: () => ({ in: () => ({ order: () => ({ limit: () => ({ data: [], error: null }) }) }) }),
    })),
  }));
  return { supabase: { auth, from } };
});

/* ---------------- 被测组件及 Provider from mocks（避免顶层 import 触发 ESM） ---------------- */
import ResultShareScreen from '../../screens/quiz/ResultShareScreen';
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { NavigationContainer } = require('@react-navigation/native');

const renderWithProviders = (ui) =>
  render(
    <SafeAreaProvider>
      <NavigationContainer>{ui}</NavigationContainer>
    </SafeAreaProvider>
  );

/* -------------------------------- 测试 -------------------------------- */
describe('Integration: ResultShareScreen writes attempt + index', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  test('mount side-effects save attempt & index to AsyncStorage', async () => {
    renderWithProviders(<ResultShareScreen />);

    // 若组件内部有延迟写入，推进时间以触发
    jest.advanceTimersByTime(3000);

    await waitFor(async () => {
      const idxRaw = await AsyncStorage.getItem('attemptIndex');
      expect(idxRaw).toBeTruthy();
      const idx = JSON.parse(idxRaw);
      expect(Array.isArray(idx)).toBe(true);
      expect(idx.length).toBeGreaterThan(0);

      const attemptId = idx[0]?.id;
      expect(attemptId).toBeTruthy();

      const detailRaw = await AsyncStorage.getItem(`attempt:${attemptId}`);
      expect(detailRaw).toBeTruthy();
    }, { timeout: 4000 });

    jest.runOnlyPendingTimers();
  });
});
