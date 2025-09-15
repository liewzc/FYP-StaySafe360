// __tests__/integration/resourcehub-filtering.test.js
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react-native';
import { Linking } from 'react-native';

/* ---------- 定时器：legacy 假定时器 + 清理 ---------- */
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

/* ---------- 完全 stub 导航，加入 useFocusEffect ---------- */
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const View = ({ children }) => <>{children}</>;
  const useFocusEffect = (cb) => {
    // 在测试里把它当成 useEffect：挂载/依赖变更时调用回调
    React.useEffect(() => {
      const cleanup = cb?.();
      return cleanup;
    }, [cb]);
  };
  return {
    __esModule: true,
    NavigationContainer: View,
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useRoute: () => ({ params: {} }),
    useFocusEffect,
  };
});

/* ---------- Safe Area / 手势 / 图标 轻量 stub ---------- */
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

/* ---------- AsyncStorage mock（收藏/状态用） ---------- */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

/* ---------- Linking 安静化 ---------- */
jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

/* ---------- 注入最小资源数据 ---------- */
jest.mock('../../screens/knowledge/quickaccess/resourceData', () => ({
  RESOURCE_HUB_DATA: {
    featured: [],
    official: [
      { id: 'gov-1', title: 'Gov Advisory', type: 'site', provider: 'GovSG', icon: '🏛️', url: 'https://gov.sg' }
    ],
    learning: [
      { id: 'art-1', title: 'Learn Flood Safety', type: 'article', provider: 'Blog', icon: '📚', url: 'https://example.com' }
    ],
    faqs: [],
  },
}));

/* ---------- 被测页面 ---------- */
import ResourceHubScreen from '../../screens/knowledge/quickaccess/ResourceHubScreen';

// 从 mock 里“require”出 Provider/Container（避免顶层 import 触发 ESM）
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { NavigationContainer } = require('@react-navigation/native');

const renderWithProviders = (ui) =>
  render(
    <SafeAreaProvider>
      <NavigationContainer>{ui}</NavigationContainer>
    </SafeAreaProvider>
  );

describe('Integration: ResourceHub filter pills', () => {
  test('filter by Official only shows site items', async () => {
    renderWithProviders(<ResourceHubScreen />);

    fireEvent.press(screen.getByText('Official'));

    expect(await screen.findByText('Gov Advisory')).toBeTruthy();
    expect(screen.queryByText('Learn Flood Safety')).toBeNull();
  });

  test('filter by Article only shows articles', async () => {
    renderWithProviders(<ResourceHubScreen />);

    fireEvent.press(screen.getByText('Article'));

    expect(await screen.findByText('Learn Flood Safety')).toBeTruthy();
    expect(screen.queryByText('Gov Advisory')).toBeNull();
  });
});
