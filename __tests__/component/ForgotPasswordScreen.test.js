// __tests__/component/ForgotPasswordScreen.test.js
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Silence logs
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterAll(() => {
  console.warn.mockRestore?.();
  console.log.mockRestore?.();
});

// Mock safe-area
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaProvider: ({ children }) => <>{children}</>,
    SafeAreaView: ({ children }) => <>{children}</>,
  };
});

// Mock vector icons (light)
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ children }) => children || null,
}));

// Hook mock with dynamic state
let mockForgotState;
jest.mock('../../auth/useForgotPassword', () => ({
  useForgotPassword: () => mockForgotState,
}));

import ForgotPasswordScreen from '../../auth/ForgotPasswordScreen';

describe('ForgotPasswordScreen (component)', () => {
  const navigation = { goBack: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockForgotState = {
      email: '',
      setEmail: jest.fn(),
      banner: { type: '', msg: '' },
      isLoading: false,
      emailValid: false,
      canSubmit: false,
      handleReset: jest.fn(),
    };
  });

  test('renders header and blocks submit when cannot submit', () => {
    const { getByText } = render(<ForgotPasswordScreen navigation={navigation} />);
    expect(getByText('Forgot your password?')).toBeTruthy();

    // 行为断言：canSubmit=false 时按下不会调用 handleReset
    fireEvent.press(getByText('Send Reset Email'));
    expect(mockForgotState.handleReset).not.toHaveBeenCalled();
  });

  test('typing email calls setEmail and enables submit, pressing calls handleReset', () => {
    mockForgotState.canSubmit = true;
    const { getByLabelText, getByText } = render(<ForgotPasswordScreen navigation={navigation} />);

    const emailInput = getByLabelText('Email');
    fireEvent.changeText(emailInput, 'user@example.com');
    expect(mockForgotState.setEmail).toHaveBeenCalledWith('user@example.com');

    fireEvent.press(getByText('Send Reset Email'));
    expect(mockForgotState.handleReset).toHaveBeenCalledTimes(1);
  });

  test('Back to Sign In triggers navigation.goBack', () => {
    const { getByText } = render(<ForgotPasswordScreen navigation={navigation} />);
    fireEvent.press(getByText('Back to Sign In'));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('shows success banner message', () => {
    mockForgotState.banner = { type: 'success', msg: 'Reset email sent. Please check your inbox.' };
    const { getByText } = render(<ForgotPasswordScreen navigation={navigation} />);
    expect(getByText(/Reset email sent/i)).toBeTruthy();
  });
});
