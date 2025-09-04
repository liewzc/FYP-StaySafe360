// screens/knowledge/hazard/HazardsHubScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { HAZARDS, HAZARD_KEYS } from './hazardsData';
import TopBarBack from '../../../components/ui/TopBarBack'; // 导入标题栏组件

const PRIMARY = '#0b6fb8';
const MUTED = '#6b7280';
const CARD_BG = '#ffffff';
const BORDER = '#e6f1fb';
const TITLE_COLOR = '#111827';

export default function HazardsHubScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const keys = HAZARD_KEYS;
      const storeKeys = keys.map(k => `hazard_learn_progress_${k}`);
      const results = await Promise.all(storeKeys.map(k => AsyncStorage.getItem(k)));
      const prog = {};
      results.forEach((json, idx) => {
        prog[keys[idx]] = json ? JSON.parse(json) : {};
      });
      setProgressMap(prog);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const goLearn = (hazardKey) => navigation.navigate('HazardLearn', { hazardKey });

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <TopBarBack title="Hazards Hub" />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* 使用 TopBarBack 组件 */}
      <TopBarBack title="Hazards Hub" />
      
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
        <Text style={styles.subtitle}>Learn the essentials, then dive deeper by topic.</Text>

        {/* 二列四宫格 */}
        <View style={styles.grid}>
          {HAZARD_KEYS.map((k) => {
            const h = HAZARDS[k];
            return (
              <TouchableOpacity key={k} style={styles.card} activeOpacity={0.9} onPress={() => goLearn(k)}>
                <ImageBackground
                  source={h.cover}
                  style={styles.cover}
                  imageStyle={{ borderTopLeftRadius: 14, borderTopRightRadius: 14 }}
                />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{h.title}</Text>
                  <Text style={styles.cardTagline} numberOfLines={1}>{h.tagline}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    paddingHorizontal: 16, 
    paddingTop: 12, // 减少顶部内边距
    backgroundColor: '#fff' 
  },

  subtitle: { 
    fontSize: 12, 
    color: MUTED, 
    textAlign: 'center', 
    marginTop: 8, 
    marginBottom: 12 
  },

  // 二列网格
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },

  card: {
    width: '48%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cover: { 
    width: '100%', 
    height: 110, 
    justifyContent: 'flex-end' 
  },

  cardBody: { 
    padding: 10 
  },
  cardTitle: { 
    fontSize: 15, 
    fontWeight: '800', 
    color: PRIMARY 
  },
  cardTagline: { 
    fontSize: 12, 
    color: MUTED, 
    marginTop: 2, 
    minHeight: 16 
  },
});