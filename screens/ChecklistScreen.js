// screens/Checklist.js — Disaster Checklist (with TopBarBack & polished UI)
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const TABS = [
  { id: 'flood',     label: 'Flood',     icon: 'home-flood' },
  { id: 'lightning', label: 'Lightning', icon: 'weather-lightning' },
  { id: 'haze',      label: 'Haze',      icon: 'weather-hazy' },
  { id: 'heatwave',  label: 'Heatwave',  icon: 'white-balance-sunny' },
  { id: 'coastal',   label: 'Coastal',   icon: 'waves' },
];

const CHECKLIST = {
  flood: {
    title: 'Flood Preparedness',
    items: [
      'Monitor official rain/flood alerts (PUB / myENV / NEA).',
      'If at ground floor, prepare sandbags or portable flood barriers.',
      'Move valuables & electricals to higher shelves; elevate multi-plugs.',
      'Prepare a “go-bag”: IDs, cash, meds, power bank, flashlight.',
      'Use waterproof pouches for phone & documents.',
      'Know high-ground evacuation routes & a family meeting point.',
      'If water rises, switch off electricity at the mains (if safe).',
      'Avoid walking/driving through flood water (even 15–30 cm is dangerous).',
    ],
  },
  lightning: {
    title: 'Lightning Preparedness',
    items: [
      'Check thunderstorm forecast before outdoor plans.',
      'Unplug sensitive appliances; avoid using wired devices during storms.',
      'Stay indoors; keep away from windows, plumbing & metal fixtures.',
      'Outdoors: seek shelter in a building or enclosed vehicle; avoid open fields/water/tall trees.',
      '30/30 rule: wait 30 minutes after last thunder before resuming.',
      'If hair stands on end/tingling: crouch low; remove metal objects.',
      'Do not swim, cycle, fish or fly kites during storms.',
    ],
  },
  haze: {
    title: 'Haze / PM2.5 Preparedness',
    items: [
      'Stock N95/KN95 masks for all family members.',
      'Check air purifier & spare filters; set appropriate mode.',
      'Seal window/vent gaps to reduce infiltration.',
      'Eye drops/saline; ensure meds for asthma/COPD are available.',
      'Monitor PSI/PM2.5 advisories; reduce strenuous outdoor activity.',
      'Plan indoor/low-exposure activities; keep hydrated.',
    ],
  },
  heatwave: {
    title: 'Heatwave Preparedness',
    items: [
      'Hydration plan: water + electrolytes; avoid alcohol/sugary drinks.',
      'Light-colored, breathable clothes; hat/umbrella; sunscreen.',
      'Do activities in cooler hours; rest in shade/AC; buddy system.',
      'Know heat illness signs & first-aid steps.',
      'Check on elderly, children, outdoor workers & pets.',
      'Never leave anyone in parked vehicles; improve ventilation/fans.',
    ],
  },
  coastal: {
    title: 'Coastal Flood / Storm Tide Preparedness',
    items: [
      'Track tide tables & coastal flood/storm surge warnings.',
      'Plan evacuation route away from shorelines; identify safe shelters.',
      'Move vehicles & valuables to higher ground; protect low-level inlets.',
      'Prepare emergency bag (IDs, cash, meds, chargers, flashlight).',
      'Backup power ready; waterproof critical items.',
      'If advised to evacuate, go early; avoid seawalls during storms.',
    ],
  },
};

const STORAGE_KEY = '@preparedness/disaster-checklist';

export default function ChecklistScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('flood');
  const [state, setState] = useState({}); // { [categoryId]: { [index]: boolean } }

  // load
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState(JSON.parse(raw));
      } catch (e) {
        console.warn('Checklist load failed:', e);
      }
    })();
  }, []);

  // save
  const persist = async (next) => {
    setState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Checklist save failed:', e);
    }
  };

  const data = useMemo(() => CHECKLIST[tab], [tab]);
  const checkedMap = state[tab] || {};
  const toggle = (idx) => {
    const next = { ...state, [tab]: { ...(state[tab] || {}), [idx]: !checkedMap[idx] } };
    persist(next);
  };

  const progress = (() => {
    const total = data.items.length;
    const done = Object.values(checkedMap).filter(Boolean).length;
    return total ? Math.round((done / total) * 100) : 0;
  })();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBarBack title="Disaster Checklist" iconColor={C.text} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 16,
        }}
        showsVerticalScrollIndicator
      >
        {/* Tabs – horizontal chips */}
        <Text style={s.sectionHint}>Choose a category:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8, paddingRight: 4 }}
        >
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setTab(t.id)}
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
            <MCI name={TABS.find((x) => x.id === tab)?.icon || 'check-circle-outline'} size={20} color={C.blue} />
            <Text style={s.headerTitle}>{data.title}</Text>
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
          {data.items.map((t, i) => {
            const on = !!checkedMap[i];
            return (
              <TouchableOpacity
                key={i}
                style={[s.row, on && s.rowOn]}
                activeOpacity={0.8}
                onPress={() => toggle(i)}
              >
                <View style={[s.box, on && s.boxOn]}>
                  {on ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                </View>
                <Text style={s.itemTxt}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  sectionHint: { color: C.sub, fontSize: 13, fontWeight: '600' },

  /* Chips */
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

  /* Header card with progress */
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

  /* Checklist card */
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
  boxOn: {
    backgroundColor: C.blue,
    borderColor: C.blue,
  },
  itemTxt: { color: C.text, lineHeight: 20, flex: 1 },
});
