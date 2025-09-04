// screens/firstaid/DisasterPreparednessScreen.js
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ImageBackground, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import TopBarBack from '../../components/ui/TopBarBack'; // Import the separated component

const TITLE = '#111827';

export default function DisasterPreparednessScreen() {
  const navigation = useNavigation();

  const items = [
    { key: 'Flood',            title: 'Flood',      img: require('../../assets/disasterpreparedness/flood.jpg') },
    { key: 'Lightning',        title: 'Lightning',  img: require('../../assets/disasterpreparedness/lightning.jpg') },
    { key: 'Haze',             title: 'Haze',       img: require('../../assets/disasterpreparedness/haze.jpg') },
    { key: 'Heatwave',         title: 'Heatwave',   img: require('../../assets/disasterpreparedness/heat.jpg') },
    { key: 'CoastalFlooding',  title: 'Coastal',    img: require('../../assets/disasterpreparedness/coastal.jpg') },
  ];

  const openDisaster = (item) => {
    navigation.navigate('DisasterSubLevel', {
      disasterType: item.key,
      title: item.title,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBarBack title="Disaster Preparedness" />
      
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.subtitle}>Choose a hazard to practice</Text>

        <View style={styles.grid}>
          {items.map((it) => (
            <TouchableOpacity
              key={it.key}
              style={styles.cardWrap}
              activeOpacity={0.9}
              onPress={() => openDisaster(it)}
            >
              <ImageBackground source={it.img} style={styles.cardImage} imageStyle={styles.cardImageRadius}>
                <View style={styles.cardOverlay} />
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
  container: { 
    padding: 16, 
    paddingTop: 16, 
    backgroundColor: '#fff', 
    flexGrow: 1 
  },
  subtitle: { 
    fontSize: 12, 
    color: '#6b7280', 
    textAlign: 'center', 
    marginTop: 4, 
    marginBottom: 14 
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
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
  cardImage: {
    width: '100%',
    height: 130,
    justifyContent: 'flex-end',
  },
  cardImageRadius: { 
    borderRadius: RADIUS 
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: RADIUS,
  },
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