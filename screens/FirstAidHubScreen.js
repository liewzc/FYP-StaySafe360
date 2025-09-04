// screens/firstaid/FirstAidHubScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function FirstAidHubScreen() {
  const navigation = useNavigation();

  const goDisaster = () => {
    // 进入你现有的灾害学习/测验流程（LevelSelectScreen）
    navigation.navigate('DisasterPreparedness');
  };

  const goEveryday = () => {
    // 进入你原本的 FirstAidScreen（我们会把它挂在 Stack 里，名字叫 EverydayFirstAid）
    navigation.navigate('EverydayFirstAid');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>First Aid Hub</Text>

      <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={goDisaster}>
        {/* ⚠️ 替换为你实际的图片文件名 */}
        {/* 例如：require('../../assets/firstaid_images/disaster.png') */}
        <Image
          source={require('../assets/firstaidhub/disaster.png')}
          style={styles.cardImg}
          resizeMode="contain"
        />
        <Text style={styles.cardText}>Disaster Preparedness</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={goEveryday}>
        {/* ⚠️ 替换为你实际的图片文件名 */}
        {/* 例如：require('../../assets/firstaid_images/everyday.png') */}
        <Image
          source={require('../assets/firstaidhub/everyday.png')}
          style={styles.cardImg}
          resizeMode="contain"
        />
        <Text style={styles.cardText}>Everyday First Aid</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const PRIMARY = '#0b6fb8';

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 22,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5ff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d9ecff',
  },
  cardImg: { width: 64, height: 64, marginRight: 12 },
  cardText: { fontSize: 16, fontWeight: '700', color: PRIMARY },
});
