// screens/QuizScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import TopBarBack from '../../components/ui/TopBarBack'; // Use unified title bar

// Quiz category cards
const DISASTERS = [
  { key: 'Flood',     label: 'Flood',     image: require('../../assets/quiz_images/flood.jpg') },
  { key: 'Lightning', label: 'Lightning', image: require('../../assets/quiz_images/lightning.jpg') },
  { key: 'Haze',      label: 'Haze',      image: require('../../assets/quiz_images/airquality.jpg') },
  { key: 'Heatwave',  label: 'Heatwave',  image: require('../../assets/quiz_images/heatwave.jpg') },
  { key: 'Coastal',   label: 'Coastal',   image: require('../../assets/quiz_images/coastal.jpg') },
];

export default function QuizScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Navigate to sublevel picker for the selected category
  const handleSelectDisaster = (type) => {
    navigation.navigate('SubLevel', { disasterType: type });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBarBack title="Select a quiz type" />
      
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 16,
          paddingTop: 12,
        }}
      >
        <Text style={styles.subtitle}>Choose a category:</Text>

        <View style={styles.grid}>
          {DISASTERS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.card}
              onPress={() => handleSelectDisaster(item.key)}
              activeOpacity={0.9}
            >
              <ImageBackground
                source={item.image}
                style={styles.image}
                imageStyle={styles.imageRadius}
              >
                <Text style={styles.cardLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              </ImageBackground>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const MUTED = '#555';

const styles = StyleSheet.create({
  // Small subtitle under the page title
  subtitle: {
    fontSize: 14,
    color: MUTED,
    marginTop: 6,
    marginBottom: 14,
    textAlign: 'center',
  },

  // Two-column rectangular cover cards
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  card: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  image: {
    width: '100%',
    height: 130,
    justifyContent: 'flex-end',
  },
  imageRadius: { borderRadius: 12 },
  cardLabel: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});