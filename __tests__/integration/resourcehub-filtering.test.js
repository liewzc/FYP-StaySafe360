import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react-native';
import { Linking } from 'react-native';

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
  const useFocusEffect = (cb) => {
    React.useEffect(() => {
      const cleanup = cb?.();
      return cleanup;
    }, [cb]);
  };
  return {
    __esModule: true,
    NavigationContainer: View,
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useRoute: () => ({ params: {} }),
    useFocusEffect,
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

jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

jest.mock('../../screens/knowledge/quickaccess/resourceData', () => ({
  RESOURCE_HUB_DATA: {
    featured: [],
    official: [
      { id: 'gov-1', title: 'Gov Advisory', type: 'site', provider: 'GovSG', icon: '🏛️', url: 'https://gov.sg' }
    ],
    learning: [
      { id: 'art-1', title: 'Learn Flood Safety', type: 'article', provider: 'Blog', icon: '📚', url: 'https://example.com' }
    ],
    faqs: [],
  },
}));

import ResourceHubScreen from '../../screens/knowledge/quickaccess/ResourceHubScreen';

const { SafeAreaProvider } = require('react-native-safe-area-context');
const { NavigationContainer } = require('@react-navigation/native');

const renderWithProviders = (ui) =>
  render(
    <SafeAreaProvider>
      <NavigationContainer>{ui}</NavigationContainer>
    </SafeAreaProvider>
  );

describe('Integration: ResourceHub filter pills', () => {
  test('filter by Official only shows site items', async () => {
    renderWithProviders(<ResourceHubScreen />);

    fireEvent.press(screen.getByText('Official'));

    expect(await screen.findByText('Gov Advisory')).toBeTruthy();
    expect(screen.queryByText('Learn Flood Safety')).toBeNull();
  });

  test('filter by Article only shows articles', async () => {
    renderWithProviders(<ResourceHubScreen />);

    fireEvent.press(screen.getByText('Article'));

    expect(await screen.findByText('Learn Flood Safety')).toBeTruthy();
    expect(screen.queryByText('Gov Advisory')).toBeNull();
  });
});
