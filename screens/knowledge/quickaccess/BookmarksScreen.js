// screens/knowledge/quickaccess/BookmarksScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

// Reuse the unified top bar
import TopBarBack from '../../../components/ui/TopBarBack';

const ACCENT = '#0B6FB8';
const MUTED = '#6b7280';

export default function BookmarksScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem('bookmarks');
    const arr = raw ? JSON.parse(raw) : [];
    setItems(arr);
  }, []);
  // Initial load
  useEffect(() => { load(); }, [load]);

  // Open a bookmark: support internal app:// routes and external links
  const open = (it) => {
    const url = it?.url;
    if (!url) {
      Alert.alert('Coming soon', 'This item will be available in-app soon.');
      return;
    }
    if (url.startsWith('app://')) {
      if (url === 'app://tools/cpr') nav.navigate('EmergencyTools', { initial: 'cpr' });
      else if (url === 'app://tools/sos') nav.navigate('SOS');
      else if (url === 'app://tools/weather') nav.navigate('WeatherMap');
      return;
    }
    Linking.openURL(url).catch(() => Alert.alert('Cannot open link'));
  };

  // Remove a single bookmark by id
  const removeOne = async (id) => {
    const next = items.filter((x) => x.id !== id);
    await AsyncStorage.setItem('bookmarks', JSON.stringify(next));
    setItems(next);
  };

  // Clear all bookmarks
  const clearAll = async () => {
    Alert.alert('Clear all bookmarks?', 'This removes all saved resources.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await AsyncStorage.removeItem('bookmarks');
        setItems([]);
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <TopBarBack title="Bookmarks" iconName="chevron-back" iconColor="#000" />
      
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
        <Text style={styles.subtitle}>Saved resources from Resource Hub</Text>

        {items.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No bookmarks yet. Tap ☆ in Resource Hub to save items.</Text>
          </View>
        )}

        {items.map((it) => (
          <View key={it.id} style={styles.card}>
            <Text style={styles.icon}>{it.icon || '📄'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={2}>{it.title}</Text>
              {!!it.subtitle && <Text style={styles.cardSub} numberOfLines={2}>{it.subtitle}</Text>}
              <Text style={styles.meta}>
                {it.provider}{(it.tags?.length ? ` · ${it.tags.slice(0,3).join(' / ')}` : '')}
              </Text>
              <View style={styles.row}>
                <TouchableOpacity style={styles.btnOpen} onPress={() => open(it)} activeOpacity={0.9}>
                  <Text style={styles.btnOpenText}>Open</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnRemove} onPress={() => removeOne(it.id)} activeOpacity={0.9}>
                  <Text style={styles.btnRemoveText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        {items.length > 0 && (
          <TouchableOpacity style={styles.btnDanger} onPress={clearAll} activeOpacity={0.9}>
            <Text style={styles.btnDangerText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  content: { 
    paddingHorizontal: 16, 
    paddingTop: 10, 
  },

  subtitle: { fontSize: 12, color: MUTED, marginTop: 6, marginBottom: 10, textAlign: 'center' },
  emptyBox: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 10 },
  emptyText: { color: MUTED, textAlign: 'center' },
  card: { flexDirection: 'row', gap: 10, backgroundColor: '#f8fbff', borderWidth: 1, borderColor: '#e6f1fb', borderRadius: 14, padding: 12, marginBottom: 10 },
  icon: { fontSize: 22, marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' }, 
  cardSub: { marginTop: 4, color: '#374151', fontSize: 13 },
  meta: { marginTop: 6, color: MUTED, fontSize: 12 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btnOpen: { flex: 1, backgroundColor: ACCENT, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnOpenText: { color: '#fff', fontWeight: '900' },
  btnRemove: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#ef4444' },
  btnRemoveText: { color: '#ef4444', fontWeight: '900' },
  btnDanger: { backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  btnDangerText: { color: '#fff', fontWeight: '900' },
});