// logic/EverydayFirstAidContainer.js
import React, { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EverydayFirstAidScreen from '../screens/firstaid/EverydayFirstAidScreen';

export default function EverydayFirstAidContainer() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const items = useMemo(() => ([
    { key: 'burns',            title: 'Burns',          img: require('../assets/everydayfirstaid/burns.jpg') },
    { key: 'cpr',              title: 'CPR',            img: require('../assets/everydayfirstaid/cpr.jpg') },
    { key: 'choking',          title: 'Choking',        img: require('../assets/everydayfirstaid/choking.jpg') },
    { key: 'bleeding',         title: 'Bleeding',       img: require('../assets/everydayfirstaid/bleeding.jpg') },
    { key: 'fracture',         title: 'Fracture',       img: require('../assets/everydayfirstaid/fracture.jpg') },
    { key: 'fainting',         title: 'Fainting',       img: require('../assets/everydayfirstaid/fainting.jpg') },
    { key: 'heatstroke',       title: 'Heatstroke',     img: require('../assets/everydayfirstaid/heat.jpg') },
    { key: 'electric_shock',   title: 'Electric Shock', img: require('../assets/everydayfirstaid/electric.jpg') },
    { key: 'animal_bite',      title: 'Animal Bite',    img: require('../assets/everydayfirstaid/bite.jpg') },
    { key: 'smoke_inhalation', title: 'Smoke',          img: require('../assets/everydayfirstaid/smoke.jpg') },
  ]), []);

  const onBack = () => navigation.goBack();
  const onOpenTopic = (item) =>
    navigation.navigate('EverydaySubLevel', { topic: item.key, category: item.title });

  return (
    <EverydayFirstAidScreen
      items={items}
      bottomInset={insets.bottom}
      onBack={onBack}
      onOpenTopic={onOpenTopic}
    />
  );
}
