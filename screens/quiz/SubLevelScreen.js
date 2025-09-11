// screens/quiz/SubLevelScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TopBarBack from '../../components/ui/TopBarBack';

// Roman numeral sublevels I–X
const SUB_LEVELS = ['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ','Ⅷ','Ⅸ','Ⅹ'];
const ACCENT = '#0b6fb8';
// Root key for persisted quiz progress in AsyncStorage
const PROGRESS_KEY = 'quizProgress';

export default function SubLevelScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { disasterType = 'General' } = route.params || {};
  // Map of sublevel -> 'complete' | 'incomplete' (normalized from legacy shapes)
  const [progressMap, setProgressMap] = useState({});

  // Load progress whenever the screen is focused or the disasterType changes.
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const raw = await AsyncStorage.getItem(PROGRESS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        const node = parsed?.[disasterType];
        let levelProgress = {};

        if (node) {
          // Detect flat per-sublevel structure (Ⅰ / Ⅱ keys present)
          const looksFlat =
            typeof node['Ⅰ'] !== 'undefined' ||
            typeof node['Ⅱ'] !== 'undefined';

          if (looksFlat) {
            // Normalize booleans -> 'complete' | 'incomplete'
            levelProgress = Object.fromEntries(
              Object.entries(node).map(([k, v]) => [
                k,
                v === true ? 'complete' : v === false ? 'incomplete' : v
              ])
            );
          } else {
            ['easy', 'medium', 'hard'].forEach((k) => {
              if (node[k]) {
                Object.entries(node[k]).forEach(([sub, v]) => {
                  levelProgress[sub] =
                    v === true ? 'complete' : v === false ? 'incomplete' : v;
                });
              }
            });
          }
        }
        setProgressMap(levelProgress || {});
      } catch (e) {
        console.error('Failed to load quiz progress:', e);
      }
    };
    if (isFocused) loadProgress();
  }, [isFocused, disasterType]);

  // Navigate into the selected sublevel’s quiz
  const openSub = (subLevel) => {
    navigation.navigate('QuizGame', { disasterType, subLevel });
  };

  // Compute UI status for a given sublevel
  const statusConfig = (sub) => {
    const status = progressMap?.[sub];
    if (status === 'complete') {
      return { text: 'Complete', color: '#16a34a', hint: 'You\'ve completed this sublevel.' };
    }
    return { text: 'Incomplete', color: '#ef4444', hint: 'Tap to begin this sublevel quiz.' };
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBarBack title={`${disasterType} Sublevels`} />
      
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.subtitle}>Pick a sublevel to start the quiz</Text>

        {SUB_LEVELS.map((sub) => {
          const cfg = statusConfig(sub);
          return (
            <TouchableOpacity
              key={sub}
              style={[styles.card, { borderColor: ACCENT }]}
              onPress={() => openSub(sub)}
              activeOpacity={0.9}
            >
              <View style={styles.row}>
                <Text style={styles.cardTitle}>Sublevel {sub}</Text>
                <View style={[styles.badge, { backgroundColor: cfg.color }]}>
                  <Text style={styles.badgeText}>{cfg.text}</Text>
                </View>
              </View>
              <Text style={styles.cardHint}>{cfg.hint}</Text>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 16, 
    paddingTop: 12, 
    backgroundColor: '#fff' 
  },
  subtitle: { 
    fontSize: 12, 
    color: '#6b7280', 
    marginTop: 4, 
    marginBottom: 14 
  },
  card: {
    backgroundColor: '#f7fbff',
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#0f172a' 
  },
  badge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 999 
  },
  badgeText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '800' 
  },
  cardHint: { 
    marginTop: 6, 
    fontSize: 13, 
    color: '#374151' 
  },
});
