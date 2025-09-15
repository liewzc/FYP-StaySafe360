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
    // 把所有挂起的宏/微任务跑干净（此时仍在 fake timers 环境中）
    jest.runOnlyPendingTimers();
    jest.runAllTicks();
    jest.runAllTimers();
  } catch {}
  cleanup();

  // 恢复到真实定时器，避免影响其他测试
  jest.clearAllTimers();
  jest.useRealTimers();
});

// ✅ 不再在 afterAll 里推进定时器（此时通常已是 real timers）
afterAll(() => {
  // 如无特殊需求，这里什么都不做最安全
  // 如果你仍想保险地清一次，可以仅做“无副作用”的恢复：
  try { jest.clearAllTimers(); } catch {}
});

// ⚠️ 完全 stub 掉 Navigation（不要 requireActual，避免加载 ESM）
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

// ✅ Safe Area 简单 stub
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

//（可选）手势库轻量 stub
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

//（可选）图标库轻量 stub
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

// AsyncStorage 官方 mock
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import AsyncStorage from '@react-native-async-storage/async-storage';

// Haptics & Share 静默
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'Medium' },
}));

// 如果此内部路径在你的 RN 版本不存在，改用“备用写法”见下方注释
jest.mock('react-native/Libraries/Share/Share', () => ({
  share: jest.fn(async () => ({ action: 'sharedAction' })),
}));

/* 备用写法（若上面路径报找不到模块，把上面那段替换为下面）
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Share: { share: jest.fn(async () => ({ action: 'sharedAction' })) },
  };
});
*/

// Supabase 客户端 stub（按项目导出名）
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

// 引入待测组件与进度计算函数
import ResultShareScreen from '../../screens/quiz/ResultShareScreen';
import { computeAchievementProgressMap } from '../../utils/achievements';

// 从 mock 里拿 SafeAreaProvider
const { SafeAreaProvider } = require('react-native-safe-area-context');

// 简化渲染器（NavigationContainer 已被 View stub）
const renderWithProviders = (ui) =>
  render(<SafeAreaProvider>{ui}</SafeAreaProvider>);

describe('Integration: Perfect result updates Disaster achievements map', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  test('after perfect, dz_sub_10 is 10 and dz_cat_1 is 100', async () => {
    renderWithProviders(<ResultShareScreen />);

    // 推进时间，确保组件里若有 setTimeout/raf 能执行
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

    // 结束前再确保没有挂起定时器（仍在 fake timers 环境中）
    jest.runOnlyPendingTimers();
  });
});
