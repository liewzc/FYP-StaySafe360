// screens/firstaid/EverydayFirstAidScreen.js
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ImageBackground, Platform
} from 'react-native';
import TopBarBack from '../../components/ui/TopBarBack';

const RADIUS = 16;

export default function EverydayFirstAidScreen({
  items = [],
  bottomInset = 0,
  onBack,
  onOpenTopic,
}) {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBarBack title="Everyday First Aid" onBack={onBack} />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: 12, paddingBottom: bottomInset + 16 },
        ]}
      >
        <Text style={styles.subtitle}>
          Choose a topic to learn quick, life-saving steps
        </Text>

        <View style={styles.grid}>
          {items.map((it) => (
            <TouchableOpacity
              key={it.key}
              style={styles.cardWrap}
              activeOpacity={0.9}
              onPress={() => onOpenTopic?.(it)}
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

const styles = StyleSheet.create({
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
