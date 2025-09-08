// logic/CombinedQuizHubContainer.js
import React, { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CombinedQuizHubScreen from '../screens/CombinedQuizHubScreen';

const ICONS = {
  local:        require('../assets/firstaidhub/localdisaster.png'),
  preparedness: require('../assets/firstaidhub/disaster.png'),
  everyday:     require('../assets/firstaidhub/everyday.png'),
};

export default function CombinedQuizHubContainer() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const cards = useMemo(() => ([
    {
      key: 'disaster',
      icon: ICONS.local,
      title: 'Disaster',
      subtitle: 'Boost your survival chances in disasters',
      onPress: () => navigation.navigate('DisasterSelect'),
    },
    {
      key: 'preparedness',
      group: 'firstaid',
      icon: ICONS.preparedness,
      title: 'Disaster Preparedness',
      subtitle: 'Training to boost your survival in floods, haze & more',
      onPress: () => navigation.navigate('DisasterPreparedness'),
    },
    {
      key: 'everyday',
      group: 'firstaid',
      icon: ICONS.everyday,
      title: 'Everyday First Aid',
      subtitle: 'Quick lifesaving skills for burns, CPR & choking',
      onPress: () => navigation.navigate('EverydayFirstAid'),
    },
  ]), [navigation]);

  return (
    <CombinedQuizHubScreen
      insets={insets}
      headerTitle="Quiz Hub"
      cards={cards}
    />
  );
}
