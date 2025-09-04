// screens/SOS.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBarBack from '../components/ui/TopBarBack';
import { Ionicons } from '@expo/vector-icons';

// 资源
import IcPolice from '../assets/sos/police.png';
import IcAmb from '../assets/sos/ambulance.png';
import IcNon from '../assets/sos/nonemergency.png';

const C = {
  text: '#0f172a',
  sub: '#6B7280',
  border: '#E5E7EB',
  bg: '#FFFFFF',
  rowBg: '#FFFFFF',
  callBg: '#EF4444',
  callTxt: '#FFFFFF',
  primary: '#2563EB',
  primaryBg: '#EFF6FF',
};

const dial = (num) => {
  const url = Platform.select({ ios: `tel://${num}`, android: `tel:${num}` });
  try {
    Linking.openURL(url);
  } catch {
    Alert.alert('Cannot place call', `Please dial ${num} manually.`);
  }
};

const OPTIONS = [
  {
    id: '999',
    number: '999',
    title: 'Police',
    icon: IcPolice,
    detail: {
      header: '999 - Police',
      sections: [
        { title: 'When to call :', lines: [
          'Crime in progress;',
          'Immediate danger to life or property;',
          'Serious traffic accident.',
        ]},
        { title: 'Do NOT call :', lines: [
          'General enquiries;',
          'Minor disputes without danger;',
          'Non-urgent noise or nuisance (use police e-services).',
        ]},
        { title: 'Before calling :', lines: [
          'Exact location (block, street, unit);',
          'Brief incident details;',
          'Suspect/vehicle description if any.',
        ]},
        { title: 'What to say :', lines: [
          '1. Location first',
          '2. What happened',
          '3. Current risk / injuries',
        ]},
      ],
    },
  },
  {
    id: '995',
    number: '995',
    title: 'Ambulance / Fire',
    icon: IcAmb,
    detail: {
      header: '995 - Ambulance / Fire',
      sections: [
        { title: 'When to call :', lines: [
          'Unconscious / not breathing / choking;',
          'Chest pain, suspected heart attack;',
          'Stroke signs (face droop, arm weakness, speech difficulty);',
          'Severe bleeding, major trauma, burns, seizures;',
          'Breathing difficulty, anaphylaxis;',
          'Fire / smoke / explosion / gas leak; rescue from height/vehicle/water.',
        ]},
        { title: 'Do NOT call :', lines: [
          'Minor ailments (fever, mild pain, small cuts);',
          'Non-urgent transport to clinic/hospital;',
          'Stable chronic conditions or routine follow-up;',
          'Hospital transfer without doctor’s instruction.',
        ]},
        { title: 'Before calling :', lines: [
          'Exact location & access (block, street, unit, entry code);',
          'Patient age/sex and condition (symptoms, consciousness, bleeding);',
          'Number of casualties;',
          'Hazards present (fire, smoke, chemicals, traffic);',
          'Callback phone number.',
        ]},
        { title: 'What to say :', lines: [
          '1. Location & how to access',
          '2. What happened & patient condition',
          '3. Immediate risks / special needs (mobility, oxygen, contagious risk)',
        ]},
      ],
    },
  },
  {
    id: '1777',
    number: '1777',
    title: 'Non-Emergency',
    icon: IcNon,
    detail: {
      header: '1777 - Non-Emergency Ambulance',
      sections: [
        { title: 'Use for :', lines: [
          'Non-urgent medical transport to clinic/hospital;',
          'Scheduled appointments or discharge/transfer;',
          'Needs wheelchair/stretcher assistance but not time-critical.',
        ]},
        { title: 'Do NOT use :', lines: [
          'Life-threatening conditions (use 995);',
          'Fire/explosion or rescue needs;',
          'Suspected stroke/heart attack/major trauma;',
          'If the person can travel safely by own means.',
        ]},
        { title: 'Before calling :', lines: [
          'Pickup address & preferred time;',
          'Destination & department/clinic;',
          'Patient details (age, mobility, weight if relevant);',
          'Assistance/equipment (wheelchair, stretcher, oxygen);',
          'Stairs/lift availability; contact phone; payment arrangement.',
        ]},
        { title: 'What to say :', lines: [
          '1. Pickup location & time',
          '2. Destination & purpose (appointment/discharge)',
          '3. Patient condition & assistance needed',
        ]},
      ],
    },
  },
];

export default function SOSScreen() {
  const insets = useSafeAreaInsets();
  const [sel, setSel] = useState(OPTIONS[0]);

  const Row = ({ item, active }) => (
    <TouchableOpacity
      style={[s.row, active && s.rowActive]}
      activeOpacity={0.9}
      onPress={() => setSel(item)}
    >
      <View style={s.left}>
        <View style={s.iconWrap}>
          <Image source={item.icon} style={s.icon} />
        </View>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.num}>{item.number}</Text>
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{item.title}</Text>
            </View>
          </View>
          <Text style={s.roleSub}>
            {item.id === '1777'
              ? 'Non-Emergency Transport'
              : item.id === '995'
              ? 'Ambulance / Fire'
              : 'Police Hotline'}
          </Text>
        </View>
      </View>

      <TouchableOpacity onPress={() => dial(item.number)} style={s.callBtn} activeOpacity={0.9}>
        <Ionicons name="call" size={14} color={C.callTxt} />
        <Text style={s.callTxt}>Call</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const Section = ({ title, lines }) => (
    <View style={{ marginBottom: 10 }}>
      <Text style={s.secTitle}>{title}</Text>
      {lines.map((t, i) => (
        <Text key={i} style={s.secLine}>• {t}</Text>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBarBack title="Emergency Call (SOS)" iconColor={C.text} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator
      >
        <Text style={s.pageHint}>Tap a service to view details or place a call.</Text>

        <View style={s.list}>
          {OPTIONS.map((op) => (
            <Row key={op.id} item={op} active={sel.id === op.id} />
          ))}
        </View>

        {/* Detail Card */}
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <Text style={s.cardHeader}>{sel.detail.header}</Text>
          </View>

          {sel.detail.sections.map((sec, i) => (
            <Section key={i} title={sec.title} lines={sec.lines} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  pageHint: { color: C.sub, marginBottom: 8, fontSize: 12, fontWeight: '600' },

  list: { marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.rowBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rowActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrap: {
    width: 42, height: 42, borderRadius: 999, backgroundColor: '#F4F6FA',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EDF0F5',
  },
  icon: { width: 28, height: 28, resizeMode: 'contain' },
  num: { fontSize: 18, fontWeight: '900', color: C.text, lineHeight: 22 },
  badge: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1, borderColor: C.border,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3,
  },
  badgeTxt: { color: C.sub, fontWeight: '700', fontSize: 12 },
  roleSub: { fontSize: 12, color: C.sub, marginTop: 2 },

  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.callBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  callTxt: { color: C.callTxt, fontWeight: '800' },

  card: {
    borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginTop: 8, backgroundColor: C.bg,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // 只显示标题，去掉右侧按钮
    marginBottom: 8,
  },
  cardHeader: { fontWeight: '800', color: C.text, fontSize: 16 },

  secTitle: { color: C.text, fontWeight: '800', marginBottom: 4 },
  secLine: { color: C.text, lineHeight: 20 },
});
