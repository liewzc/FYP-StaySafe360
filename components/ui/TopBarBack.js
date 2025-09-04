// components/ui/TopBarBack.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const TEXT = '#0f172a';

export default function TopBarBack({
  title = 'Title',
  iconName = 'chevron-back',
  iconSize = 28,
  iconColor = '#000',
  backgroundColor = '#fff',
  horizontalPadding = 16,
  onBack,
  titleStyle,
  containerStyle,
  rightSlot,
  showBorder = true,
}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Calculate safe area top padding
  const androidStatus = StatusBar.currentHeight ?? 0;
  const safeTop = Platform.select({
    ios: insets.top,
    android: Math.max(insets.top, androidStatus, 24),
    default: insets.top,
  });

  const pressBack = () => {
    if (onBack) return onBack();
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <View style={[styles.outerContainer, { paddingTop: safeTop }]}>
      <View
        style={[
          styles.topBar,
          {
            paddingLeft: Math.max(horizontalPadding, 0),
            paddingRight: Math.max(horizontalPadding, 0),
            backgroundColor,
          },
          showBorder && styles.borderBottom,
          containerStyle,
        ]}
      >
        <TouchableOpacity
          onPress={pressBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          activeOpacity={0.9}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name={iconName} size={iconSize} color={iconColor} />
        </TouchableOpacity>

        {/* Centered title */}
        <View style={styles.titleWrap}>
          <Text style={[styles.title, titleStyle]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Right slot (optional) */}
        {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
      </View>
    </View>
  );
}

const BAR_HEIGHT = 56;

const styles = StyleSheet.create({
  outerContainer: {
    zIndex: 100,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_HEIGHT,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 6,
    zIndex: 2,
  },
  titleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: TEXT,
  },
  rightSlot: {
    position: 'absolute',
    right: 16,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});