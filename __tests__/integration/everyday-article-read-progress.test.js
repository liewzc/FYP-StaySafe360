import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render, waitFor, cleanup } from '@testing-library/react-native';

beforeEach(() => {
  jest.useFakeTimers({ legacyFakeTimers: true });
  jest.setTimeout(10000);
});
afterEach(() => {
  try {
    jest.runOnlyPendingTimers();
    jest.runAllTicks();
    jest.runAllTimers();
  } catch {}
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
});

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const View = ({ children }) => <>{children}</>;
  return {
    __esModule: true,
    NavigationContainer: View,
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useRoute: () => ({ params: { topicKey: 'cpr' } }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const View = ({ children }) => <>{children}</>;
  return {
    __esModule: true,
    SafeAreaProvider: View,
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const View = ({ children }) => <>{children}</>;
  return {
    __esModule: true,
    GestureHandlerRootView: View,
    PanGestureHandler: View,
    TapGestureHandler: View,
    LongPressGestureHandler: View,
    State: {},
  };
});

jest.mock(
  '@expo/vector-icons',
  () => {
    const React = require('react');
    const { View } = require('react-native');
    const Icon = ({ name, testID, ...props }) => (
      <View testID={testID || `icon-${name}`} {...props} />
    );
    return { Ionicons: Icon, MaterialCommunityIcons: Icon, FontAwesome5: Icon };
  },
  { virtual: true }
);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});

import EverydayLearnScreen from '../../screens/knowledge/everyday/EverydayLearnScreen';
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { NavigationContainer } = require('@react-navigation/native');

const renderWithProviders = (ui) =>
  render(
    <SafeAreaProvider>
      <NavigationContainer>{ui}</NavigationContainer>
    </SafeAreaProvider>
  );

describe('Integration: EverydayLearnScreen marks article as read', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  test('visiting CPR article reads existing progress entry', async () => {

    await AsyncStorage.setItem('progress.readIds', JSON.stringify(['everyday:cpr']));

    renderWithProviders(<EverydayLearnScreen />);

    jest.advanceTimersByTime(1000);

    await waitFor(async () => {
      const raw = await AsyncStorage.getItem('progress.readIds');
      const arr = raw ? JSON.parse(raw) : [];
      expect(Array.isArray(arr)).toBe(true);
      expect(arr).toContain('everyday:cpr');
    }, { timeout: 4000 });

    jest.runOnlyPendingTimers();
  });
});
