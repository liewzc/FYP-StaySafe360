// screens/CombinedQuizHubScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TITLE = '#111827'; 
const MUTED = '#6b7280';

const ICONS = {
  local:        require('../assets/firstaidhub/localdisaster.png'),
  preparedness: require('../assets/firstaidhub/disaster.png'),
  everyday:     require('../assets/firstaidhub/everyday.png'),
};

export default function CombinedQuizHubScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const Card = ({ icon, title, subtitle, onPress, emoji }) => (
    <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={onPress}>
      {icon ? (
        <Image source={icon} style={styles.cardIcon} />
      ) : (
        <Text style={styles.cardEmoji}>{emoji}</Text>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, paddingHorizontal: 16 }}
    >
      {/* 大标题居中 */}
      <Text style={styles.bigTitle}>Quiz Hub</Text>

      {/* Local Disaster */}
      <Text style={styles.sectionLabel}>Local Disaster</Text>
      <Card
        icon={ICONS.local}
        title="Disaster"
        subtitle="Boost your survival chances in disasters"
        onPress={() => navigation.navigate('DisasterSelect')}
      />

      {/* First Aid Hub */}
      <Text style={[styles.sectionLabel, { marginTop: 18 }]}>First Aid Hub</Text>
      <Card
        icon={ICONS.preparedness}
        title="Disaster Preparedness"
        subtitle="Training to boost your survival in floods, haze & more"
        onPress={() => navigation.navigate('DisasterPreparedness')}
      />
      <Card
        icon={ICONS.everyday}
        title="Everyday First Aid"
        subtitle="Quick lifesaving skills for burns, CPR & choking"
        onPress={() => navigation.navigate('EverydayFirstAid')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bigTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: TITLE,
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: TITLE,
    marginLeft: 6,
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff', // ✅ 全部白色
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardIcon: { width: 44, height: 44, marginRight: 12, borderRadius: 8, resizeMode: 'contain' },
  cardEmoji: { fontSize: 38, marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: TITLE, marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: MUTED },
});
