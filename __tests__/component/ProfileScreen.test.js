import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Animated } from 'react-native';

jest.mock(
  '@expo/vector-icons',
  () => {
    const React = require('react');
    const { View } = require('react-native');
    const I = ({ testID, ...p }) => <View testID={testID || 'icon'} {...p} />;
    return { Ionicons: I, MaterialCommunityIcons: I };
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

jest.mock('../assets/profile_image/vibrate.png', () => 1, { virtual: true });

let timingSpy;
beforeAll(() => {
  timingSpy = jest.spyOn(Animated, 'timing').mockImplementation((value, config) => {
    return {
      start: (cb) => {
        try {
          value.setValue(config?.toValue ?? 0);
        } finally {
          if (typeof cb === 'function') cb({ finished: true });
        }
      },
    };
  });
});
afterAll(() => {
  timingSpy?.mockRestore();
});

import ProfileScreen from '../../screens/ProfileScreen';

function setup(props = {}) {
  const defaultProps = {
    loading: false,
    // achievements
    featuredAchievements: [
      { id: 'first', title: 'First Quiz', progress: 25, icon: { lib: 'mci', name: 'medal-outline' } },
      { id: 'ks5', title: 'Knowledge Seeker', progress: 60, icon: { lib: 'mci', name: 'trophy-outline' } },
      { id: 'ks10', title: 'Quiz Explorer', progress: 100, icon: { lib: 'ion', name: 'trophy-outline' } },
    ],
    achLoading: false,
    onOpenAchievementGallery: jest.fn(),
    // settings
    notificationsEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    mockDisasterActive: false,
    onToggleNotifications: jest.fn(),
    onToggleSound: jest.fn(),
    onToggleVibration: jest.fn(),
    onToggleMockDisaster: jest.fn(),
  };
  const all = { ...defaultProps, ...props };
  const utils = render(<ProfileScreen {...all} />);
  return { ...utils, props: all };
}

function getUniqueClickableSwitches(queries) {
  const all = queries.UNSAFE_getAllByProps({ accessibilityRole: 'switch' }) || [];
  const clickable = all.filter((n) => typeof n?.props?.onPress === 'function');
  const map = new Map(); // key: onPress function ref
  clickable.forEach((n) => {
    const key = n.props.onPress;
    if (!map.has(key)) map.set(key, n);
  });
  return Array.from(map.values());
}

describe('ProfileScreen (presentational)', () => {
  it('shows loading state', () => {
    render(<ProfileScreen loading={true} featuredAchievements={[]} />);
    expect(screen.toJSON()).toBeTruthy();
  });

  it('renders achievements and titles', () => {
    setup();
    expect(screen.getByText('Achievements')).toBeTruthy();
    expect(screen.getByText('First Quiz')).toBeTruthy();
    expect(screen.getByText('Knowledge Seeker')).toBeTruthy();
    expect(screen.getByText('Quiz Explorer')).toBeTruthy();
    expect(screen.getByText('View All')).toBeTruthy();
  });

  it('invokes onOpenAchievementGallery when pressing "View All"', () => {
    const { props } = setup();
    fireEvent.press(screen.getByText('View All'));
    expect(props.onOpenAchievementGallery).toHaveBeenCalledTimes(1);
  });

  it('renders four settings switches with initial state', () => {
    const utils = setup({
      notificationsEnabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      mockDisasterActive: false,
    });
    const switches = getUniqueClickableSwitches(utils);
    const first4 = switches.slice(0, 4);
    expect(first4.length).toBe(4);

    expect(first4[0].props.accessibilityState.checked).toBe(true);  // Notifications
    expect(first4[1].props.accessibilityState.checked).toBe(true);  // Sound Effects
    expect(first4[2].props.accessibilityState.checked).toBe(true);  // Vibration
    expect(first4[3].props.accessibilityState.checked).toBe(false); // Mock Disaster
  });

  it('toggles each setting and calls corresponding handlers', () => {
    const utils = setup({
      notificationsEnabled: false,
      soundEnabled: false,
      vibrationEnabled: false,
      mockDisasterActive: false,
    });
    const { props } = utils;

    const [notif, sound, vibra, mock] = getUniqueClickableSwitches(utils).slice(0, 4);

    fireEvent.press(notif);
    fireEvent.press(sound);
    fireEvent.press(vibra);
    fireEvent.press(mock);

    expect(props.onToggleNotifications).toHaveBeenCalledWith(true);
    expect(props.onToggleSound).toHaveBeenCalledWith(true);
    expect(props.onToggleVibration).toHaveBeenCalledWith(true);
    expect(props.onToggleMockDisaster).toHaveBeenCalledWith(true);
  });
});

