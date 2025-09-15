// __tests__/component/HazardsHubScreen.test.js
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

/** 兼容不同 RN 版本的 Animated helper 路径 */
try {
  jest.doMock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}));
} catch {}

/** gesture-handler 基础 mock */
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

/** reanimated（很多导航依赖它） */
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

/** 向量图标：用 Text 占位，避免 ESM 解析问题 */
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

/** 最小导航 mock（不要 requireActual 以免 ESM 报错） */
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

/** ✅ AsyncStorage 内存 mock，修复 NativeModule: AsyncStorage is null */
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

/** TopBarBack 等自定义 UI 组件轻量 mock（如果屏幕里有用到） */
jest.doMock(
  '../../../components/ui/TopBarBack',
  () => {
    const React = require('react');
    return ({ children }) => children ?? null;
  },
  { virtual: true }
);

/** ✅ hazardsData：按组件的真实用法导出命名常量，且提供 cover 字段 */
const path = require('path');
const hazardsDataPath = path.join(process.cwd(), 'screens', 'knowledge', 'hazard', 'hazardsData.js');
jest.doMock(
  hazardsDataPath,
  () => ({
    __esModule: true,
    // 组件通常是通过 HAZARD_KEYS 遍历，然后用 HAZARDS[key]
    HAZARD_KEYS: ['flood', 'earthquake'],
    HAZARDS: {
      flood: {
        id: 'flood',
        title: 'Flood',
        icon: { lib: 'mci', name: 'water' },
        // ✅ 提供可用的图片源，避免 ImageBackground 访问 undefined
        cover: { uri: 'about:blank#flood' },
      },
      earthquake: {
        id: 'earthquake',
        title: 'Earthquake',
        icon: { lib: 'mci', name: 'earth' },
        cover: { uri: 'about:blank#earthquake' },
      },
    },
    // 如果你的实现还默认导出一个数组，也一并给上（可有可无）
    default: [
      { id: 'flood', title: 'Flood', icon: { lib: 'mci', name: 'water' }, cover: { uri: 'about:blank#flood' } },
      { id: 'earthquake', title: 'Earthquake', icon: { lib: 'mci', name: 'earth' }, cover: { uri: 'about:blank#earthquake' } },
    ],
  }),
  { virtual: true }
);

/** 在所有 mocks 之后再引入被测组件 */
const Screen =
  require('../../screens/knowledge/hazard/HazardsHubScreen').default ||
  require('../../screens/knowledge/hazard/HazardsHubScreen');

describe('HazardsHubScreen (component)', () => {
  test('renders (smoke)', async () => {
    const { toJSON } = render(<Screen />);
    // 等待首轮异步 useEffect（读 AsyncStorage 后 setState）完成，避免 act 警告
    await waitFor(() => {
      // 只要树能成功渲染即可
      expect(toJSON()).toBeTruthy();
    });
  });
});
