// screens/ChecklistScreen.js
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import TopBarBack from '../components/ui/TopBarBack';
import { MaterialCommunityIcons as MCI, Ionicons } from '@expo/vector-icons';

const C = {
  text: '#0f172a',
  sub: '#6b7280',
  border: '#e5e7eb',
  blue: '#2563EB',
  blueBg: '#eff6ff',
  bg: '#FFFFFF',
  chipBg: '#f3f4f6',
  card: '#ffffff',
  barBg: '#e5e7eb',
};

export default function ChecklistScreen({
  insets,
  tabs,
  activeTab,
  onChangeTab,
  title,
  icon,
  progress,
  items,
  checkedMap,
  onToggle,
  loading,
  error,
}) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBarBack title="Disaster Checklist" iconColor={C.text} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: (insets?.bottom ?? 0) + 16,
        }}
        showsVerticalScrollIndicator
      >
        <Text style={s.sectionHint}>Choose a category:</Text>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8, paddingRight: 4 }}
        >
          {tabs.map((t) => {
            const active = t.id === activeTab;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => onChangeTab(t.id)}
                activeOpacity={0.9}
                style={[s.chip, active && s.chipActive]}
              >
                <MCI
                  name={t.icon}
                  size={16}
                  color={active ? '#fff' : C.sub}
                  style={{ marginRight: 6 }}
                />
                <Text style={[s.chipTxt, active && s.chipTxtActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Header card with progress */}
        <View style={s.headerCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MCI name={icon || 'check-circle-outline'} size={20} color={C.blue} />
            <Text style={s.headerTitle}>{title}</Text>
          </View>

          <View style={s.progressPill}>
            <Ionicons name="stats-chart-outline" size={14} color={C.blue} />
            <Text style={s.progressPillTxt}>{progress}%</Text>
          </View>

          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Checklist card */}
        <View style={s.card}>
          {loading ? (
            <Text style={{ color: C.sub, padding: 12 }}>Loading…</Text>
          ) : error ? (
            <Text style={{ color: '#b91c1c', padding: 12 }}>{error}</Text>
          ) : (
            items.map((t, i) => {
              const on = !!checkedMap[i];
              return (
                <TouchableOpacity
                  key={i}
                  style={[s.row, on && s.rowOn]}
                  activeOpacity={0.8}
                  onPress={() => onToggle(i)}
                >
                  <View style={[s.box, on && s.boxOn]}>
                    {on ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                  </View>
                  <Text style={s.itemTxt}>{t}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  sectionHint: { color: C.sub, fontSize: 13, fontWeight: '600' },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.chipBg,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: C.blue, borderColor: C.blue },
  chipTxt: { color: C.sub, fontWeight: '700' },
  chipTxtActive: { color: '#fff' },

  headerCard: {
    marginTop: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitle: { marginLeft: 8, fontSize: 16, fontWeight: '800', color: C.text },

  progressPill: {
    position: 'absolute',
    right: 14,
    top: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.blueBg,
    borderColor: C.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  progressPillTxt: { color: C.blue, fontWeight: '800', fontSize: 12 },

  progressBar: {
    marginTop: 12,
    height: 8,
    borderRadius: 999,
    backgroundColor: C.barBg,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: C.blue },

  card: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.card,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eef2f7',
    borderRadius: 8,
  },
  rowOn: { backgroundColor: '#f8fafc' },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.border,
    marginRight: 10,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  boxOn: { backgroundColor: C.blue, borderColor: C.blue },
  itemTxt: { color: C.text, lineHeight: 20, flex: 1 },
});
