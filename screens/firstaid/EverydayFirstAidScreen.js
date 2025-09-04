// screens/firstaid/FirstAidScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ImageBackground, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBarBack from '../../components/ui/TopBarBack'; // ✅ 导入TopBarBack组件

const TITLE_COLOR = '#111827';

export default function FirstAidScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const items = [
    { key: 'burns',            title: 'Burns',          img: require('../../assets/everydayfirstaid/burns.jpg') },
    { key: 'cpr',              title: 'CPR',            img: require('../../assets/everydayfirstaid/cpr.jpg') },
    { key: 'choking',          title: 'Choking',        img: require('../../assets/everydayfirstaid/choking.jpg') },
    { key: 'bleeding',         title: 'Bleeding',       img: require('../../assets/everydayfirstaid/bleeding.jpg') },
    { key: 'fracture',         title: 'Fracture',       img: require('../../assets/everydayfirstaid/fracture.jpg') },
    { key: 'fainting',         title: 'Fainting',       img: require('../../assets/everydayfirstaid/fainting.jpg') },
    { key: 'heatstroke',       title: 'Heatstroke',     img: require('../../assets/everydayfirstaid/heat.jpg') },
    { key: 'electric_shock',   title: 'Electric Shock', img: require('../../assets/everydayfirstaid/electric.jpg') },
    { key: 'animal_bite',      title: 'Animal Bite',    img: require('../../assets/everydayfirstaid/bite.jpg') },
    { key: 'smoke_inhalation', title: 'Smoke',          img: require('../../assets/everydayfirstaid/smoke.jpg') },
  ];

  const handlePress = (item) => {
    navigation.navigate('EverydaySubLevel', { topic: item.key, category: item.title });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* 使用TopBarBack组件替换原有顶部栏 */}
      <TopBarBack
        title="Everyday First Aid"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: 12, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <Text style={styles.subtitle}>Choose a topic to learn quick, life-saving steps</Text>

        <View style={styles.grid}>
          {items.map((it) => (
            <TouchableOpacity
              key={it.key}
              style={styles.cardWrap}
              activeOpacity={0.9}
              onPress={() => handlePress(it)}
            >
              <ImageBackground
                source={it.img}
                style={styles.cardImage}
                imageStyle={styles.cardImageRadius}
              >
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {it.title}
                </Text>
              </ImageBackground>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const RADIUS = 16;

const styles = StyleSheet.create({
  // 移除原有的headerBar相关样式，因为现在使用TopBarBack组件
  container: { paddingHorizontal: 16, backgroundColor: '#fff', flexGrow: 1 },
  subtitle: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginBottom: 14 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },

  cardWrap: {
    width: '48%',
    borderRadius: RADIUS,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 3 },
    }),
  },
  cardImage: { width: '100%', height: 130, justifyContent: 'flex-end' },
  cardImageRadius: { borderRadius: RADIUS },
  cardTitle: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});