// __tests__/component/RegisterScreen.test.js
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

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ children }) => children || null,
}));

// Hook mock with dynamic state
let mockRegisterState;
jest.mock('../../auth/useRegister', () => ({
  useRegister: () => mockRegisterState,
}));

import RegisterScreen from '../../auth/RegisterScreen';

describe('RegisterScreen (component)', () => {
  const navigation = { navigate: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRegisterState = {
      email: '',
      username: '',
      password: '',
      banner: { type: '', msg: '' },
      isLoading: false,
      emailValid: false,
      strongEnough: false,
      canSubmit: false,
      setEmail: jest.fn(),
      setUsername: jest.fn(),
      setPassword: jest.fn(),
      handleRegister: jest.fn(async () => ({ ok: true })),
    };
  });

  test('renders header and disabled submit initially', () => {
    const { getByText } = render(<RegisterScreen navigation={navigation} />);
    expect(getByText('Create your account')).toBeTruthy();

    // 行为断言：canSubmit=false 时点击不会触发 handleRegister
    const btnText = getByText('Create account');
    const pressTarget = btnText.parent?.props?.accessible ? btnText.parent : btnText;
    fireEvent.press(pressTarget);
    expect(mockRegisterState.handleRegister).not.toHaveBeenCalled();
  });

  test('typing fields calls setters', () => {
    const { getByPlaceholderText } = render(<RegisterScreen navigation={navigation} />);
    fireEvent.changeText(getByPlaceholderText('Username (optional)'), 'alice');
    fireEvent.changeText(getByPlaceholderText('Email'), 'alice@example.com');
    fireEvent.changeText(getByPlaceholderText('Password (min 6 chars)'), 'secret!');
    expect(mockRegisterState.setUsername).toHaveBeenCalledWith('alice');
    expect(mockRegisterState.setEmail).toHaveBeenCalledWith('alice@example.com');
    expect(mockRegisterState.setPassword).toHaveBeenCalledWith('secret!');
  });

  test('enabled submit triggers handleRegister', async () => {
    mockRegisterState.canSubmit = true;
    const { getByText } = render(<RegisterScreen navigation={navigation} />);
    const btnText = getByText('Create account');
    const pressTarget = btnText.parent?.props?.accessible ? btnText.parent : btnText;
    await fireEvent.press(pressTarget);
    expect(mockRegisterState.handleRegister).toHaveBeenCalledTimes(1);
  });

  test('shows error banner when present', () => {
    mockRegisterState.banner = { type: 'error', msg: 'Registration failed.' };
    const { getByText } = render(<RegisterScreen navigation={navigation} />);
    expect(getByText('Registration failed.')).toBeTruthy();
  });

  test('link to login navigates back to Login', () => {
    const { getByText } = render(<RegisterScreen navigation={navigation} />);
    const link = getByText(/Already have an account\? Sign In/i);
    const pressTarget = link.parent?.props?.accessible ? link.parent : link;
    fireEvent.press(pressTarget);
    expect(navigation.navigate).toHaveBeenCalledWith('Login');
  });
});
