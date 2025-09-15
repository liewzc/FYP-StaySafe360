import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: jest.fn(),
    },
  },
}));
import { supabase } from '../../supabaseClient';
import { useForgotPassword } from '../../auth/useForgotPassword';

function ForgotHarness({ email }) {
  const h = useForgotPassword({ redirectTo: 'https://reset-password-page-one.vercel.app' });

  React.useEffect(() => {
    if (email != null) h.setEmail(email);
  }, [email]);

  return (
    <View>
      <Text testID="banner">{h.banner.msg}</Text>
      <TouchableOpacity testID="submit" onPress={h.handleReset}>
        <Text>reset</Text>
      </TouchableOpacity>
    </View>
  );
}

describe('useForgotPassword (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('invalid email -> banner error', async () => {
    const { getByTestId } = render(<ForgotHarness email="bad" />);
    fireEvent.press(getByTestId('submit'));
    await waitFor(() => {
      expect(getByTestId('banner').props.children).toMatch(/valid email/i);
    });
  });

  test('success -> calls supabase.resetPasswordForEmail + success banner', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({ error: null });

    const { getByTestId } = render(<ForgotHarness email="me@ex.com" />);
    fireEvent.press(getByTestId('submit'));

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('me@ex.com', {
        redirectTo: 'https://reset-password-page-one.vercel.app',
      });
      expect(getByTestId('banner').props.children).toMatch(/Reset email sent/i);
    });
  });

  test('server error -> banner error', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
      error: { message: 'rate limited' },
    });

    const { getByTestId } = render(<ForgotHarness email="me@ex.com" />);
    fireEvent.press(getByTestId('submit'));

    await waitFor(() => {
      expect(getByTestId('banner').props.children).toMatch(/rate limited/i);
    });
  });
});
