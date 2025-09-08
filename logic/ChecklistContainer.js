// logic/ChecklistContainer.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChecklistScreen from '../screens/ChecklistScreen';

const STORAGE_KEY = '@preparedness/disaster-checklist';

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

function useChecklist(initialTab = 'flood') {
  const [tab, setTab] = useState(initialTab);
  const [state, setState] = useState({}); // { [categoryId]: { [index]: boolean } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState(JSON.parse(raw));
      } catch (e) {
        setError('Failed to load saved checklist.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Checklist save failed:', e);
    }
  }, []);

  const data = useMemo(() => CHECKLIST[tab], [tab]);
  const checkedMap = state[tab] || {};

  const toggle = useCallback((idx) => {
    const next = { ...state, [tab]: { ...(state[tab] || {}), [idx]: !checkedMap[idx] } };
    persist(next);
  }, [state, tab, checkedMap, persist]);

  const progress = useMemo(() => {
    const total = data.items.length;
    const done = Object.values(checkedMap).filter(Boolean).length;
    return total ? Math.round((done / total) * 100) : 0;
  }, [data.items.length, checkedMap]);

  return { tab, setTab, data, checkedMap, toggle, progress, loading, error };
}

export default function ChecklistContainer() {
  const insets = useSafeAreaInsets();
  const { tab, setTab, data, checkedMap, toggle, progress, loading, error } =
    useChecklist('flood');

  const icon = (TABS.find((x) => x.id === tab) || {}).icon || 'check-circle-outline';

  return (
    <ChecklistScreen
      insets={insets}
      tabs={TABS}
      activeTab={tab}
      onChangeTab={setTab}
      title={data.title}
      icon={icon}
      progress={progress}
      items={data.items}
      checkedMap={checkedMap}
      onToggle={toggle}
      loading={loading}
      error={error}
    />
  );
}
