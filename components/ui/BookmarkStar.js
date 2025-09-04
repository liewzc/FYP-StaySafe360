// components/ui/BookmarkStar.js
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, ActivityIndicator, Alert, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isBookmarked, toggleBookmark } from '../../utils/bookmarks';

export default function BookmarkStar({ getItem, size = 24, colorOn = '#f59e0b', colorOff = '#6b7280' }) {
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const it = getItem();
        const ok = it?.id ? await isBookmarked(it.id) : false;
        if (mounted) setSaved(ok);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [getItem]);

  const onPress = async () => {
    try {
      const it = getItem?.();
      if (!it?.id) return;
      const next = await toggleBookmark(it);
      setSaved(next);
      AccessibilityInfo?.announceForAccessibility?.(next ? 'Saved to bookmarks.' : 'Removed from bookmarks.');
    } catch (e) {
      Alert.alert('Bookmark failed', 'Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={saved ? 'Remove bookmark' : 'Add bookmark'}>
      <Ionicons name={saved ? 'star' : 'star-outline'} size={size} color={saved ? colorOn : colorOff} />
    </TouchableOpacity>
  );
}
