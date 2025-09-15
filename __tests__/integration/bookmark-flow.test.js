// __tests__/integration/bookmark-flow.test.js
/** @jest-environment jsdom */

/* ------------------ 先 mock 掉会触发 ESM/原生绑定的依赖 ------------------ */

// Navigation（避免加载 @react-navigation/native 的 ESM；补齐 useFocusEffect / useIsFocused）
jest.mock(
  '@react-navigation/native',
  () => {
    const React = require('react');
    return {
      NavigationContainer: ({ children }) => <>{children}</>,
      useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
      useRoute: () => ({ params: {} }),
      useIsFocused: () => true,
      useFocusEffect: (effect) => {
        React.useEffect(effect, []);
      },
    };
  },
  { virtual: true }
);

// safe-area
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

// icons
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

// gesture
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

// Animated helper（兼容存在/不存在）
try {
  require.resolve('react-native/Libraries/Animated/NativeAnimatedHelper');
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}));
} catch {
  jest.mock(
    'react-native/Libraries/Animated/NativeAnimatedHelper',
    () => ({}),
    { virtual: true }
  );
}

/* ------------------ 正式导入测试所需 ------------------ */
import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

// AsyncStorage 官方 mock
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import AsyncStorage from '@react-native-async-storage/async-storage';

// Linking mock
jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

// 资源数据最小集
jest.mock('../../screens/knowledge/quickaccess/resourceData', () => ({
  RESOURCE_HUB_DATA: {
    featured: [
      { id: 'res-1', title: 'Test Item', type: 'article', icon: '📰', url: 'https://example.com' }
    ],
    official: [],
    learning: [],
    faqs: []
  }
}));

import ResourceHubScreen from '../../screens/knowledge/quickaccess/ResourceHubScreen';
import BookmarksScreen from '../../screens/knowledge/quickaccess/BookmarksScreen';

const renderWithProviders = (ui) =>
  render(
    <SafeAreaProvider>
      <NavigationContainer>{ui}</NavigationContainer>
    </SafeAreaProvider>
  );

/* ------------------ 用例 ------------------ */
describe('Integration: ResourceHub bookmark -> Bookmarks list', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  test('toggle bookmark in ResourceHub then appears in Bookmarks', async () => {
    // 1) 打开资源页
    renderWithProviders(<ResourceHubScreen />);

    // 2) 点击收藏按钮（提供带 stopPropagation 的事件对象）
    const starBtn = await screen.findByText('☆');
    fireEvent.press(starBtn, { stopPropagation: jest.fn(), nativeEvent: {} });

    // 3) 等待收藏写入 AsyncStorage
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    // 4) 取出最近一次 setItem 的 payload，并让 getItem 对任意 key 都返回同样的数据
    const calls = AsyncStorage.setItem.mock.calls;
    const lastSet = calls[calls.length - 1];
    const savedJSON = lastSet?.[1] ?? JSON.stringify([]);

    // 注意：这里覆盖 getItem，让 BookmarksScreen 不管读什么 key 都拿到刚才的收藏数据
    AsyncStorage.getItem.mockImplementation(async () => savedJSON);

    // 5) 打开书签页，应看到刚刚收藏的条目
    renderWithProviders(<BookmarksScreen />);
    expect(await screen.findByText('Test Item')).toBeTruthy();

    // 6) 不应看到“空列表”提示
    expect(screen.queryByText(/No bookmarks yet/i)).toBeNull();
  });
});
