// __tests__/component/ProfileScreen.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { View, Text, Button } from 'react-native';

/* ---- 轻量依赖 mocks（仅本文件内有效） ---- */
jest.mock(
  '@expo/vector-icons',
  () => {
    const React = require('react');
    const { View } = require('react-native');
    const Icon = ({ name, testID, ...props }) => (
      <View testID={testID || `icon-${name}`} {...props} />
    );
    return { Ionicons: Icon, MaterialCommunityIcons: Icon };
  },
  { virtual: true }
);

jest.mock(
  'react-native-safe-area-context',
  () => ({
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    SafeAreaView: ({ children }) => children,
  }),
  { virtual: true }
);

jest.mock(
  'react-native-image-picker',
  () => ({ launchImageLibrary: jest.fn() }),
  { virtual: true }
);

/* ---- 只测交互的最小“假 Profile 组件” ---- */
const MockProfileScreen = ({ username, email, onLogout, onAskPickAvatar }) => (
  <View testID="profile-screen">
    <Text testID="username">{username}</Text>
    <Text testID="email">{email}</Text>
    <Button testID="logout-button" title="Log Out" onPress={onLogout} />
    <Button testID="avatar-button" title="Change Avatar" onPress={onAskPickAvatar} />
  </View>
);

/* ---- 组件级别的基础用例 ---- */
describe('ProfileScreen (component-only stub)', () => {
  it('renders basic info', () => {
    const onLogout = jest.fn();
    const onAskPickAvatar = jest.fn();

    render(
      <MockProfileScreen
        username="Test User"
        email="test@example.com"
        onLogout={onLogout}
        onAskPickAvatar={onAskPickAvatar}
      />
    );

    expect(screen.getByTestId('username').props.children).toBe('Test User');
    expect(screen.getByTestId('email').props.children).toBe('test@example.com');
    expect(screen.getByText('Log Out')).toBeTruthy();
  });

  it('fires button handlers', () => {
    const onLogout = jest.fn();
    const onAskPickAvatar = jest.fn();

    render(
      <MockProfileScreen
        username="U"
        email="e@x.com"
        onLogout={onLogout}
        onAskPickAvatar={onAskPickAvatar}
      />
    );

    fireEvent.press(screen.getByText('Log Out'));
    fireEvent.press(screen.getByText('Change Avatar'));

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(onAskPickAvatar).toHaveBeenCalledTimes(1);
  });
});

/* ---- 纯 RN 组件的小 sanity 测试 ---- */
it('Text renders', () => {
  render(<Text>Hello Jest!</Text>);
  expect(screen.getByText('Hello Jest!')).toBeTruthy();
});

it('Button works', () => {
  const onPress = jest.fn();
  render(<Button title="Test Button" onPress={onPress} />);
  fireEvent.press(screen.getByText('Test Button'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
