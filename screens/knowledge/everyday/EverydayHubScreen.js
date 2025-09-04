// screens/knowledge/everyday/EverydayHubScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import TopBarBack from '../../../components/ui/TopBarBack'; // 导入标题栏组件

const ITEMS = [
  { key: 'burns',        title: 'Burns/Scalds',     img: require('../../../assets/everydayfirstaid/burns.jpg') },
  { key: 'bleeding',     title: 'Bleeding',         img: require('../../../assets/everydayfirstaid/bleeding.jpg') },
  { key: 'cpr',          title: 'CPR',              img: require('../../../assets/everydayfirstaid/cpr.jpg') },
  { key: 'choking',      title: 'Choking',          img: require('../../../assets/everydayfirstaid/choking.jpg') },
  { key: 'fracture',     title: 'Fracture/Sprain',  img: require('../../../assets/everydayfirstaid/fracture.jpg') },
  { key: 'fainting',     title: 'Fainting',         img: require('../../../assets/everydayfirstaid/fainting.jpg') },
  { key: 'heatstroke',   title: 'Heatstroke',       img: require('../../../assets/everydayfirstaid/heat.jpg') },
  { key: 'electric',     title: 'Electric Shock',   img: require('../../../assets/everydayfirstaid/electric.jpg') },
  { key: 'animal_bite',  title: 'Animal Bite',      img: require('../../../assets/everydayfirstaid/bite.jpg') },
  { key: 'smoke',        title: 'Smoke Inhalation', img: require('../../../assets/everydayfirstaid/smoke.jpg') },
];

export default function EverydayHubScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();

  const open = (key) => nav.navigate('EverydayLearn', { topicKey: key });

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* 添加 TopBarBack 组件 */}
      <TopBarBack title="Everyday First Aid" />
      
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
        <Text style={styles.subtitle}>Select a topic to learn</Text>

        <View style={styles.grid}>
          {ITEMS.map((it) => (
            <TouchableOpacity key={it.key} style={styles.cardWrap} activeOpacity={0.9} onPress={() => open(it.key)}>
              <ImageBackground source={it.img} style={styles.cardImage} imageStyle={styles.cardImageRadius}>
                <Text style={styles.cardText} numberOfLines={1}>{it.title}</Text>
              </ImageBackground>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.disclaimer}>This guide is for education only. In Singapore, call 995 for emergencies.</Text>
      </ScrollView>
    </View>
  );
}

const RADIUS = 12;

const styles = StyleSheet.create({
  container: { 
    paddingHorizontal: 16, 
    paddingTop: 12, // 减少顶部内边距，因为标题栏已经提供了空间
    backgroundColor: '#fff' 
  },
  subtitle: { 
    fontSize: 12, 
    color: '#6b7280', 
    textAlign: 'center', 
    marginTop: 4, 
    marginBottom: 12 
  },

  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between' 
  },

  cardWrap: {
    width: '48%',
    height: 120,
    borderRadius: RADIUS,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#eee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 3 },
    }),
  },
  cardImage: { 
    width: '100%', 
    height: '100%', 
    justifyContent: 'flex-end' 
  },
  cardImageRadius: { 
    borderRadius: RADIUS 
  },
  cardText: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  disclaimer: { 
    fontSize: 11, 
    color: '#6b7280', 
    marginTop: 6, 
    textAlign: 'center' 
  },
});