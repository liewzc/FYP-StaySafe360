// screens/knowledge/quickaccess/ResourceHubScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Linking, Alert, Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import TopBarBack from '../../../components/ui/TopBarBack';
import { getBookmarks, isBookmarked, toggleBookmark } from '../../../utils/bookmarks';
import { RESOURCE_HUB_DATA } from './resourceData';

const ACCENT = '#0B6FB8';
const MUTED = '#6b7280';
const CARD_BG = '#f8fbff';
const CARD_BORDER = '#e6f1fb';

const FILTERS = ['All', 'Official', 'Article'];

export default function ResourceHubScreen() {
  const navigation = useNavigation();

  // flatten all sections
  const flatList = useMemo(() => {
    const all = [
      ...(RESOURCE_HUB_DATA.featured || []),
      ...(RESOURCE_HUB_DATA.official || []),
      ...(RESOURCE_HUB_DATA.learning || []),
    ];
    return all;
  }, []);

  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const [savedMap, setSavedMap] = useState({}); // { id: true }

  const loadSaved = useCallback(async () => {
    try {
      const arr = await getBookmarks();
      const map = {};
      arr.forEach((x) => { map[x.id] = true; });
      setSavedMap(map);
    } catch (e) {
      console.warn('Failed to load bookmarks:', e);
    }
  }, []);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  // 回到该页面时刷新（从其它页面加/删书签后保持同步）
  useFocusEffect(
    useCallback(() => {
      loadSaved();
    }, [loadSaved])
  );

  const openResource = (item) => {
    const url = item?.url;
    if (!url) {
      Alert.alert('Coming soon', 'This article will be available in-app soon.');
      return;
    }
    if (url.startsWith('app://')) {
      // 这里保留给你 app 内部的深链路由需要时再接
      return;
    }
    Linking.openURL(url).catch(() => Alert.alert('Cannot open link'));
  };

  const filtered = useMemo(() => {
    const f = flatList.filter((it) => {
      // type filter
      let passType = true;
      if (filter === 'Official') passType = it.type === 'site';
      else if (filter === 'Article') passType = it.type === 'article';

      // text search
      const qq = q.trim().toLowerCase();
      let passQ = true;
      if (qq) {
        const s = `${it.title} ${it.subtitle || ''} ${it.provider || ''} ${(it.tags || []).join(' ')}`.toLowerCase();
        passQ = s.includes(qq);
      }
      return passType && passQ;
    });
    return f;
  }, [flatList, q, filter]);

  const onBookmarkToggle = useCallback(async (item) => {
    if (!item?.id) {
      Alert.alert('Cannot bookmark', 'This item has no id.');
      return;
    }
    try {
      const nextOn = await toggleBookmark({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle || '',
        provider: item.provider || 'StaySafe360',
        url: item.url || null,
        tags: Array.isArray(item.tags) ? item.tags : [],
        icon: item.icon || '📄',
      });
      // 乐观更新
      setSavedMap((prev) => ({ ...prev, [item.id]: nextOn || false }));
    } catch (e) {
      console.warn('Bookmark update failed:', e);
      Alert.alert('Oops', 'Bookmark update failed.');
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBarBack title="Singapore Updates" />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Header text */}
        <Text style={styles.kicker}>Resource Hub</Text>
        <Text style={styles.title}>News • Government advisories</Text>
        <Text style={styles.subtitle}>Stay current with Singapore sources</Text>

        {/* Search + Filters */}
        <View style={styles.searchWrap}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search resources…"
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = f === filter;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setFilter(f)}
                activeOpacity={0.9}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        <View style={{ marginTop: 10 }}>
          {filtered.map((it) => (
            <ResourceCard
              key={it.id}
              item={it}
              onOpen={() => openResource(it)}
              isSaved={!!savedMap[it.id]}
              onToggleSave={() => onBookmarkToggle(it)}
            />
          ))}
          {filtered.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No results.</Text>
            </View>
          )}
        </View>

        {/* FAQs */}
        {!!(RESOURCE_HUB_DATA.faqs || []).length && (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.sectionLabel}>FAQs</Text>
            {(RESOURCE_HUB_DATA.faqs || []).map((f, i) => (
              <View key={i} style={styles.faqCard}>
                <Text style={styles.faqQ}>Q: {f.q}</Text>
                <Text style={styles.faqA}>A: {f.a}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

function ResourceCard({ item, onOpen, isSaved, onToggleSave }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onOpen}>
      <Text style={styles.icon}>{item.icon || '📄'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {!!item.subtitle && <Text style={styles.cardSub} numberOfLines={2}>{item.subtitle}</Text>}
        <View style={styles.metaRow}>
          {!!item.provider && <Text style={styles.meta}>{item.provider}</Text>}
          {!!(item.tags || []).length && (
            <Text style={styles.meta}> · {(item.tags || []).slice(0, 3).join(' / ')}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        onPress={(e) => { e.stopPropagation?.(); onToggleSave?.(); }}
        style={styles.saveBtn}
        accessibilityRole="button"
        accessibilityLabel={isSaved ? 'Remove bookmark' : 'Add bookmark'}
      >
        <Text style={{ fontSize: 18 }}>{isSaved ? '★' : '☆'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const TITLE = '#111827';

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 20, backgroundColor: '#fff' },

  kicker: { fontSize: 12, color: MUTED, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 12, color: MUTED, marginTop: 4, marginBottom: 10 },

  searchWrap: { marginTop: 6 },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 12, android: 10 }),
    borderWidth: 1, borderColor: '#e2e8f0',
    color: '#0f172a',
  },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  filterPill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1.5, borderColor: '#e2e8f0' },
  filterPillActive: { backgroundColor: '#eaf4ff', borderColor: ACCENT },
  filterText: { color: '#334155', fontWeight: '700', fontSize: 12 },
  filterTextActive: { color: ACCENT },

  sectionLabel: { fontSize: 14, fontWeight: '900', color: '#0f172a', marginBottom: 8 },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER,
    borderRadius: 14, padding: 12, marginBottom: 10,
  },
  icon: { fontSize: 22, marginTop: 2 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  cardSub: { marginTop: 4, color: '#374151', fontSize: 13 },
  metaRow: { flexDirection: 'row', marginTop: 6 },
  meta: { color: MUTED, fontSize: 12 },

  saveBtn: { padding: 6, marginLeft: 6 },

  faqCard: {
    backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
    padding: 12, marginBottom: 8,
  },
  faqQ: { fontWeight: '900', color: '#0f172a' },
  faqA: { color: '#374151', marginTop: 4 },

  emptyBox: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 10 },
  emptyText: { color: MUTED },
});
