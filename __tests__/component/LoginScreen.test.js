// __tests__/component/LoginScreen.test.js
/**
 * Component tests for auth/LoginScreen
 * We mock the useLogin hook so tests don't hit Supabase.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Vector icons + safe-area
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ children }) => children || null,
}));
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaProvider: ({ children }) => <>{children}</>,
    SafeAreaView: ({ children }) => <>{children}</>,
  };
});

// Mock the hook with a mutable state object
let mockLoginState;
jest.mock('../../auth/useLogin', () => ({
  useLogin: () => mockLoginState,
}));

// Silence logs
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterAll(() => {
  console.warn.mockRestore?.();
  console.log.mockRestore?.();
});

import LoginScreen from '../../auth/LoginScreen';

describe('LoginScreen (component)', () => {
  const navigation = { navigate: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoginState = {
      email: '',
      password: '',
      loginError: '',
      isLoading: false,
      emailValid: false,
      canSubmit: false,
      setEmail: jest.fn(),
      setPassword: jest.fn(),
      setLoginError: jest.fn(),
      handleLogin: jest.fn(async () => {}),
    };
  });

  test('renders form and disabled button initially', () => {
    const { getByPlaceholderText, getAllByText } = render(<LoginScreen navigation={navigation} />);

    // 存在输入框
    expect(getByPlaceholderText(/Email/i)).toBeTruthy();
    expect(getByPlaceholderText(/Password/i)).toBeTruthy();

    // 行为断言：canSubmit=false 时，点击“Sign In”不会触发 handleLogin
    const signInNodes = getAllByText(/^Sign In$/i);
    const pressTarget =
      signInNodes.map((n) => n.parent).find((p) => p?.props?.accessible) ?? signInNodes[0];

    fireEvent.press(pressTarget);
    expect(mockLoginState.handleLogin).not.toHaveBeenCalled();
  });


  test('typing calls setters; enabled submit triggers handleLogin', async () => {
    mockLoginState.canSubmit = true;
    const { getByPlaceholderText, getAllByText } = render(<LoginScreen navigation={navigation} />);

    fireEvent.changeText(getByPlaceholderText(/Email/i), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText(/Password/i), 'secret123');

    expect(mockLoginState.setEmail).toHaveBeenCalledWith('user@example.com');
    expect(mockLoginState.setPassword).toHaveBeenCalledWith('secret123');

    // 选择可点击的那个“Sign In”：优先点父节点（通常是 Pressable/Touchable，带 accessible）
    const signInNodes = getAllByText(/^Sign In$/i);
    const pressTarget =
      signInNodes.map((n) => n.parent).find((p) => p?.props?.accessible) ?? signInNodes[0];

    fireEvent.press(pressTarget);
    expect(mockLoginState.handleLogin).toHaveBeenCalledTimes(1);
  });

  test('shows error banner when loginError present', () => {
    mockLoginState.loginError = 'Wrong email or password. Please try again.';
    const { getByText } = render(<LoginScreen navigation={navigation} />);
    expect(getByText(/Wrong email or password/i)).toBeTruthy();
  });

  test('navigate to Register from link', () => {
    const { getByText } = render(<LoginScreen navigation={navigation} />);
    // 文案： “Don’t have an account? Register”
    const registerWord = getByText(/Register$/i);
    fireEvent.press(registerWord.parent);
    expect(navigation.navigate).toHaveBeenCalledWith('Register');
  });

  test('navigate to Forgot Password from link', () => {
    const { getByText } = render(<LoginScreen navigation={navigation} />);
    const forgot = getByText(/Forgot Password/i);
    fireEvent.press(forgot.parent);
    expect(navigation.navigate).toHaveBeenCalledWith('ForgotPassword');
  });
});
