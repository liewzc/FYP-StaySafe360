// screens/firstaid/EverydaySubLevelScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TopBarBack from '../../components/ui/TopBarBack';

const SUBLEVELS = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'];

const normalizeToKey = (raw) => {
  if (!raw) return null;
  const noEmoji = raw.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF])+/g, '');
  return noEmoji.trim().toLowerCase().replace(/\s+/g, '_');
};

export default function EverydaySubLevelScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const { category, categoryKey: rawKey, categoryTitle } = route.params || {};
  const title = categoryTitle || category || 'Everyday First Aid';
  const key = rawKey || normalizeToKey(title);

  const [completedLevels, setCompletedLevels] = useState({});

  useEffect(() => {
    const loadProgress = async () => {
      try {
        if (!key) return;
        const json = await AsyncStorage.getItem(`everyday_progress_${key}`);
        setCompletedLevels(json ? JSON.parse(json) : {});
      } catch (e) {
        console.error('Failed to load progress:', e);
      }
    };
    if (isFocused) loadProgress();
  }, [isFocused, key]);

  const handlePress = (subLevel) => {
    navigation.navigate('EverydayQuiz', {
      categoryKey: key,
      categoryTitle: title,
      subLevel,
    });
  };

  if (!key) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.title}>Everyday First Aid</Text>
        <Text style={{ textAlign: 'center', color: '#666' }}>
          Missing category. Please open from a First Aid detail page.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBarBack
        title={`${title} — Sublevels`}
        iconName="chevron-back"
        iconSize={28}
        iconColor="#0f172a"
        backgroundColor="#fff"
        horizontalPadding={16}
        showBorder={true}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.kicker}>Everyday First Aid</Text>
        <Text style={styles.subtitle}>Pick a sublevel to start the quiz</Text>

        {SUBLEVELS.map((sub, idx) => {
          const isComplete = completedLevels?.[sub] === true;
          return (
            <TouchableOpacity key={idx} style={styles.card} onPress={() => handlePress(sub)}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Sublevel {sub}</Text>
                {/* 状态小色框已移除 */}
              </View>
              <Text style={styles.cardText}>
                {isComplete ? 'You’ve completed this quiz.' : 'Tap to begin this sublevel quiz.'}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    justifyContent: 'center',
  },

  container: { padding: 16, paddingTop: 20, backgroundColor: '#fff' },
  kicker: { fontSize: 12, color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4, color: '#0b6fb8', textAlign: 'center' },
  subtitle: { fontSize: 12, color: '#6b7280', marginBottom: 16, textAlign: 'center' },

  card: { backgroundColor: '#e8f5ff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#d9ecff' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardText: { marginTop: 8, fontSize: 13, color: '#374151' },
});
