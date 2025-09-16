/**
 * __tests__/integration/achievements-after-perfect.test.js
 * 目标：满分后本地成就进度应更新：dz_sub_10=10, dz_cat_1=100, dz_cat_3=33
 */

import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react-native';

// —— 关键：用“旧版假定时器”，避免 RN preset 的 teardown 冲突 —— 
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

afterAll(() => {
  try { jest.clearAllTimers(); } catch {}
});

// ⚠️ 完全 stub 掉 Navigation
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const View = ({ children }) => <>{children}</>;
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
        timeSpentMs: 14000,
        answers: [],
      },
    }),
  };
});

// Safe Area
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

// gesture
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

// icons
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

// AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import AsyncStorage from '@react-native-async-storage/async-storage';

// Haptics & Share
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'Medium' },
}));
jest.mock('react-native/Libraries/Share/Share', () => ({
  share: jest.fn(async () => ({ action: 'sharedAction' })),
}));

// ✅ 删除 supabaseClient mock

// 待测组件与工具
import ResultShareScreen from '../../screens/quiz/ResultShareScreen';
import { computeAchievementProgressMap } from '../../utils/achievements';

const { SafeAreaProvider } = require('react-native-safe-area-context');

const renderWithProviders = (ui) =>
  render(<SafeAreaProvider>{ui}</SafeAreaProvider>);

describe('Integration: Perfect result updates Disaster achievements map', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  test('after perfect, dz_sub_10 is 10 and dz_cat_1 is 100', async () => {
    renderWithProviders(<ResultShareScreen />);

    jest.advanceTimersByTime(2000);

    await waitFor(
      async () => {
        const map = await computeAchievementProgressMap({ ignoreServer: true });
        expect(map.dz_sub_10).toBe(10);  // 1/10 => 10%
        expect(map.dz_cat_1).toBe(100);  // 1/1  => 100%
        expect(map.dz_cat_3).toBe(33);   // 1/3  => 33%
      },
      { timeout: 4000 }
    );

    jest.runOnlyPendingTimers();
  });
});
