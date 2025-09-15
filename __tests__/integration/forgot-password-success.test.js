// __tests__/integration/forgot-password-success.test.js
/** @jest-environment jsdom */

/** ---------- 仅隐藏 act 警告；其他报错照常输出 ---------- */
const _realConsoleError = console.error;
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    const first = String(args[0] ?? '');
    if (first.includes('not wrapped in act(')) return; // 精准静音
    return _realConsoleError(...args);
  });
});
afterAll(() => {
  console.error?.mockRestore?.();
});

/* ---------- 先 mock 掉会触发 ESM/原生绑定的依赖 ---------- */

jest.mock(
  '@react-navigation/native',
  () => {
    const React = require('react');
    return {
      NavigationContainer: ({ children }) => <>{children}</>,
      useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
      useRoute: () => ({ params: {} }),
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

/* ---------- Supabase reset 密码 mock ---------- */
jest.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: jest.fn(async () => ({ error: null })),
    },
  },
}));

/* ---------- 正式导入测试所需 ---------- */
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

/** 动态加载 ForgotPassword 组件，兼容多种可能的文件路径/文件名 */
function loadForgotScreen() {
  const tryPaths = [
    '../../auth/ForgotPassword',
    '../../screens/auth/ForgotPassword',
    '../../auth/ForgotPasswordScreen',
    '../../screens/auth/ForgotPasswordScreen',
    // 如果是 index 导出：
    '../../auth/index',
    '../../screens/auth/index',
  ];
  for (const p of tryPaths) {
    try {
      const mod = require(p);
      return mod.default || mod;
    } catch (_e) {}
  }
  throw new Error(
    '无法找到 ForgotPassword 组件。请确认路径是否为 auth/ForgotPassword(.js|.tsx) 或 screens/auth/ForgotPassword(.js|.tsx)。'
  );
}

const ForgotPasswordScreen = loadForgotScreen();

const renderWithProviders = (ui) =>
  render(
    <SafeAreaProvider>
      <NavigationContainer>{ui}</NavigationContainer>
    </SafeAreaProvider>
  );

/* ---------- 用例 ---------- */
describe('Integration: ForgotPasswordScreen success banner on reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('submit valid email triggers success banner', async () => {
    renderWithProviders(<ForgotPasswordScreen navigation={{ goBack: jest.fn() }} />);

    // 1) 找到 Email 输入框：placeholder 或 label 任意一种
    let input;
    try {
      input = await screen.findByPlaceholderText(/email/i);
    } catch {
      input = await screen.findByLabelText(/email/i);
    }
    fireEvent.changeText(input, 'user@example.com');

    // 2) 触发提交：优先 submitEditing；若组件使用按钮，则兜底按钮点击
    let submitted = false;
    try {
      fireEvent(input, 'submitEditing');
      submitted = true;
    } catch {}
    if (!submitted) {
      const submitBtn =
        screen.queryByText(/reset|send|submit|continue|next/i) ||
        screen.queryByRole?.('button', { name: /reset|send|submit|continue|next/i });
      if (submitBtn) fireEvent.press(submitBtn);
    }

    // 3) 断言成功提示（根据你的文案可以调整关键字）
    const successMatcher = /reset email sent|check your email|email has been sent|we(')?ve sent/i;

    await waitFor(async () => {
      expect(await screen.findByText(successMatcher)).toBeTruthy();
    });
  });
});
