import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import TopBarBack from '../../components/ui/TopBarBack';

const SUBLEVELS_DEFAULT = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'];

export default function DisasterSubLevelScreen({
  title = 'Disaster Preparedness',
  sublevels = SUBLEVELS_DEFAULT,
  progressMap = {},
  onOpenSublevel,
}) {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBarBack title={`${title} — Sublevels`} />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.kicker}>Disaster Preparedness</Text>
        <Text style={styles.subtitle}>Pick a sublevel to start the quiz</Text>

        {sublevels.map((sub) => {
          const done = progressMap?.[sub] === true;
          return (
            <TouchableOpacity
              key={sub}
              style={styles.card}
              onPress={() => onOpenSublevel?.(sub)}
              activeOpacity={0.7}
            >
              <View style={styles.row}>
                <Text style={styles.cardTitle}>Sublevel {sub}</Text>
                {/* badge removed */}
              </View>
              <Text style={styles.cardHint}>
                {done ? "You've completed this sublevel." : 'Tap to begin this sublevel quiz.'}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 20, backgroundColor: '#fff' },
  kicker: {
    fontSize: 12, color: '#6b7280', fontWeight: '700', textTransform: 'uppercase',
    marginBottom: 4, textAlign: 'center',
  },
  subtitle: { fontSize: 12, color: '#6b7280', marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: '#f7fbff', borderColor: '#e6f1fb', borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  // badge styles removed
  cardHint: { fontSize: 13, color: '#374151', marginTop: 4 },
});
