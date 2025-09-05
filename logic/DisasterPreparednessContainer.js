// logic/DisasterPreparednessContainer.js
import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import DisasterPreparednessScreen from '../screens/firstaid/DisasterPreparednessScreen';

export default function DisasterPreparednessContainer() {
  const navigation = useNavigation();

  const items = useMemo(() => ([
    { key: 'Flood',           title: 'Flood',     img: require('../assets/disasterpreparedness/flood.jpg') },
    { key: 'Lightning',       title: 'Lightning', img: require('../assets/disasterpreparedness/lightning.jpg') },
    { key: 'Haze',            title: 'Haze',      img: require('../assets/disasterpreparedness/haze.jpg') },
    { key: 'Heatwave',        title: 'Heatwave',  img: require('../assets/disasterpreparedness/heat.jpg') },
    { key: 'CoastalFlooding', title: 'Coastal',   img: require('../assets/disasterpreparedness/coastal.jpg') },
  ]), []);

  const onOpen = useCallback((item) => {
    navigation.navigate('DisasterSubLevel', {
      disasterType: item.key,
      title: item.title,
    });
  }, [navigation]);

  return <DisasterPreparednessScreen items={items} onOpen={onOpen} />;
}
