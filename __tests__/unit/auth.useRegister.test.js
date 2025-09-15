import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
    },
  },
}));
import { supabase } from '../../supabaseClient';
import { useRegister } from '../../auth/useRegister';

function RegisterHarness({ email, username, password }) {
  const h = useRegister();

  React.useEffect(() => {
    if (email != null) h.setEmail(email);
    if (username != null) h.setUsername(username);
    if (password != null) h.setPassword(password);
  }, [email, username, password]);

  return (
    <View>
      <Text testID="banner">{h.banner.msg}</Text>
      <TouchableOpacity
        testID="submit"
        onPress={async () => {
          await h.handleRegister();
        }}
      >
        <Text>register</Text>
      </TouchableOpacity>
    </View>
  );
}

describe('useRegister (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('invalid email -> banner error', async () => {
    const { getByTestId } = render(<RegisterHarness email="bad" password="123456" />);
    fireEvent.press(getByTestId('submit'));
    await waitFor(() => {
      expect(getByTestId('banner').props.children).toMatch(/valid email/i);
    });
  });

  test('weak password -> banner error', async () => {
    const { getByTestId, rerender } = render(<RegisterHarness email="ok@x.com" password="123" />);
    fireEvent.press(getByTestId('submit'));
    await waitFor(() => {
      expect(getByTestId('banner').props.children).toMatch(/at least 6/i);
    });

    rerender(<RegisterHarness email="ok@x.com" password="123456" />);
    await waitFor(() => {
      expect(getByTestId('banner').props.children).toBe('');
    });
  });

  test('success -> calls supabase.signUp + success banner', async () => {
    supabase.auth.signUp.mockResolvedValueOnce({ data: { user: { id: 'u1' } }, error: null });

    const { getByTestId } = render(
      <RegisterHarness email="u@ex.com" username="" password="123456" />
    );
    fireEvent.press(getByTestId('submit'));

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'u@ex.com',
        password: '123456',
        options: {
          emailRedirectTo: 'https://reset-password-page-one.vercel.app',
          data: { username: 'u' }, 
        },
      });
      expect(getByTestId('banner').props.children).toMatch(/Registration successful/i);
    });
  });

  test('server error -> banner error shows message', async () => {
    supabase.auth.signUp.mockResolvedValueOnce({
      data: null,
      error: { message: 'email already registered' },
    });

    const { getByTestId } = render(
      <RegisterHarness email="dup@ex.com" username="dup" password="123456" />
    );
    fireEvent.press(getByTestId('submit'));

    await waitFor(() => {
      expect(getByTestId('banner').props.children).toMatch(/email already registered/i);
    });
  });
});
