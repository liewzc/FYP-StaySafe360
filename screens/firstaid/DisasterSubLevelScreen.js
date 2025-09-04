// screens/firstaid/DisasterSubLevelScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TopBarBack from '../../components/ui/TopBarBack';

const SUBLEVELS = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'];

// Map the keys from DisasterPreparednessScreen to proper titles
const TITLES = {
  Flood: 'Flash Flood',
  Lightning: 'Severe Thunderstorms & Lightning', // Changed from StormsLightning
  Haze: 'Haze / Air Quality',
  Heatwave: 'Heatwave / Heat Stress',
  CoastalFlooding: 'Coastal / High Tide Flooding',
  // Add fallback for any unexpected types
  default: 'Disaster Preparedness'
};

export default function DisasterSubLevelScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const { disasterType = 'Flood' } = route.params || {};
  const title = TITLES[disasterType] || TITLES.default;

  const [progress, setProgress] = useState({});

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const key = `disaster_progress_${disasterType}`;
        const json = await AsyncStorage.getItem(key);
        setProgress(json ? JSON.parse(json) : {});
      } catch (e) {
        console.error('Failed to load progress:', e);
      }
    };
    
    if (isFocused) loadProgress();
  }, [isFocused, disasterType]);

  const openSub = (subLevel) => {
    navigation.navigate('DisasterQuiz', { disasterType, subLevel });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBarBack title={`${title} — Sublevels`} />
      
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.kicker}>Disaster Preparedness</Text>
        <Text style={styles.subtitle}>Pick a sublevel to start the quiz</Text>

        {SUBLEVELS.map((sub) => {
          const done = progress?.[sub] === true;
          return (
            <TouchableOpacity 
              key={sub} 
              style={styles.card} 
              onPress={() => openSub(sub)}
              activeOpacity={0.7}
            >
              <View style={styles.row}>
                <Text style={styles.cardTitle}>Sublevel {sub}</Text>
                <View style={[styles.badge, { backgroundColor: done ? '#16a34a' : '#ef4444' }]}>
                  <Text style={styles.badgeText}>{done ? 'Complete' : 'Incomplete'}</Text>
                </View>
              </View>
              <Text style={styles.cardHint}>
                {done ? 'You\'ve completed this sublevel.' : 'Tap to begin this sublevel quiz.'}
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
  container: { 
    padding: 16, 
    paddingTop: 20, 
    backgroundColor: '#fff' 
  },
  kicker: { 
    fontSize: 12, 
    color: '#6b7280', 
    fontWeight: '700', 
    textTransform: 'uppercase', 
    marginBottom: 4,
    textAlign: 'center'
  },
  subtitle: { 
    fontSize: 12, 
    color: '#6b7280', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  card: {
    backgroundColor: '#f7fbff',
    borderColor: '#e6f1fb',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 4
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
    fontSize: 13, 
    color: '#374151',
    marginTop: 4
  },
});