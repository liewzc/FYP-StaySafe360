jest.mock(
  '@react-navigation/native',
  () => {
    const React = require('react');
    return {
      NavigationContainer: ({ children }) => <>{children}</>,
      useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
      useRoute: () => ({ params: {} }),
      useIsFocused: () => true,
      useFocusEffect: (effect) => {
        React.useEffect(effect, []);
      },
    };
  },
  { virtual: true }
);

// safe-area
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

// icons
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

// gesture
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

// Animated helper
try {
  require.resolve('react-native/Libraries/Animated/NativeAnimatedHelper');
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}));
} catch {
  jest.mock(
    'react-native/Libraries/Animated/NativeAnimatedHelper',
    () => ({}),
    { virtual: true }
  );
}

import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

// AsyncStorage 
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import AsyncStorage from '@react-native-async-storage/async-storage';

// Linking mock
jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

jest.mock('../../screens/knowledge/quickaccess/resourceData', () => ({
  RESOURCE_HUB_DATA: {
    featured: [
      { id: 'res-1', title: 'Test Item', type: 'article', icon: '📰', url: 'https://example.com' }
    ],
    official: [],
    learning: [],
    faqs: []
  }
}));

import ResourceHubScreen from '../../screens/knowledge/quickaccess/ResourceHubScreen';
import BookmarksScreen from '../../screens/knowledge/quickaccess/BookmarksScreen';

const renderWithProviders = (ui) =>
  render(
    <SafeAreaProvider>
      <NavigationContainer>{ui}</NavigationContainer>
    </SafeAreaProvider>
  );

describe('Integration: ResourceHub bookmark -> Bookmarks list', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  test('toggle bookmark in ResourceHub then appears in Bookmarks', async () => {

    renderWithProviders(<ResourceHubScreen />);

    const starBtn = await screen.findByText('☆');
    fireEvent.press(starBtn, { stopPropagation: jest.fn(), nativeEvent: {} });

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    const calls = AsyncStorage.setItem.mock.calls;
    const lastSet = calls[calls.length - 1];
    const savedJSON = lastSet?.[1] ?? JSON.stringify([]);

    AsyncStorage.getItem.mockImplementation(async () => savedJSON);

    renderWithProviders(<BookmarksScreen />);
    expect(await screen.findByText('Test Item')).toBeTruthy();

    expect(screen.queryByText(/No bookmarks yet/i)).toBeNull();
  });
});
