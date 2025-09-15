import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

import { supabase } from '../../supabaseClient';
import { useLogin } from '../../auth/useLogin';

function LoginHarness({ email, password }) {
  const h = useLogin();

  React.useEffect(() => {
    if (email != null) h.setEmail(email);
    if (password != null) h.setPassword(password);
  }, [email, password]);

  return (
    <View>
      <Text testID="err">{h.loginError}</Text>
      <TouchableOpacity testID="submit" onPress={h.handleLogin}>
        <Text>submit</Text>
      </TouchableOpacity>
    </View>
  );
}

describe('useLogin (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('empty fields -> shows validation error', async () => {
    const { getByTestId } = render(<LoginHarness email="" password="" />);
    fireEvent.press(getByTestId('submit'));
    await waitFor(() => {
      expect(getByTestId('err').props.children).toMatch(/Please enter both email and password/i);
    });
  });

  test('invalid email -> shows validation error', async () => {
    const { getByTestId, rerender } = render(<LoginHarness email="bad" password="123456" />);
    fireEvent.press(getByTestId('submit'));
    await waitFor(() => {
      expect(getByTestId('err').props.children).toMatch(/valid email/i);
    });

    rerender(<LoginHarness email="ok@test.com" password="123456" />);
    await waitFor(() => {
      expect(getByTestId('err').props.children).toBe('');
    });
  });

  test('supabase -> invalid credentials -> friendly error', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid login credentials' },
    });

    const { getByTestId } = render(<LoginHarness email="a@b.com" password="123456" />);
    fireEvent.press(getByTestId('submit'));

    await waitFor(() => {
      expect(getByTestId('err').props.children).toMatch(/Wrong email or password/i);
    });
  });

  test('email not verified -> alerts + signOut()', async () => {
    const spyAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: { email_confirmed_at: null } },
      error: null,
    });

    const { getByTestId } = render(<LoginHarness email="a@b.com" password="123456" />);
    fireEvent.press(getByTestId('submit'));

    await waitFor(() => {
      expect(spyAlert).toHaveBeenCalled();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    spyAlert.mockRestore();
  });

  test('success path -> no error message', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: { email_confirmed_at: '2025-01-01T00:00:00Z' } },
      error: null,
    });

    const { getByTestId } = render(<LoginHarness email="a@b.com" password="123456" />);
    fireEvent.press(getByTestId('submit'));

    await waitFor(() => {
      expect(getByTestId('err').props.children).toBe('');
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: '123456',
      });
    });
  });
});
