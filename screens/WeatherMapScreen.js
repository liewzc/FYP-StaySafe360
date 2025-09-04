// screens/WeatherMapScreen.js
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, ActivityIndicator, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

function distanceKm(a, b) {
  if (!a || !b) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export default function WeatherMapScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const webRef = useRef(null);

  const {
    location,
    pm25Data = [],
    rainData = [],
    humidityData = [],
  } = route.params || {};

  const [layer, setLayer] = useState('all');

  // ======== 预处理数据 ========
  const processed = useMemo(() => {
    const loc = location?.latitude && location?.longitude
      ? { lat: location.latitude, lng: location.longitude }
      : null;

    const pm = pm25Data
      .filter(r => r?.location?.latitude && r?.location?.longitude)
      .map(r => ({
        lat: r.location.latitude,
        lng: r.location.longitude,
        name: r.name || '',
        value: r.value ?? null,
        dist: loc ? distanceKm(location, { latitude: r.location.latitude, longitude: r.location.longitude }) : null,
      }));

    const rain = rainData
      .filter(r => r?.location?.latitude && r?.location?.longitude)
      .map(r => ({
        lat: r.location.latitude,
        lng: r.location.longitude,
        name: r.name || '',
        value: r.value ?? 0,
        dist: loc ? distanceKm(location, { latitude: r.location.latitude, longitude: r.location.longitude }) : null,
      }));

    const hum = humidityData
      .filter(r => r?.location?.latitude && r?.location?.longitude)
      .map(r => ({
        lat: r.location.latitude,
        lng: r.location.longitude,
        name: r.name || '',
        value: r.value ?? 0,
        dist: loc ? distanceKm(location, { latitude: r.location.latitude, longitude: r.location.longitude }) : null,
      }));

    return { loc, pm, rain, hum };
  }, [location, pm25Data, rainData, humidityData]);

  const initialCenter = useMemo(() => {
    if (processed.loc) return processed.loc;
    return { lat: 1.3521, lng: 103.8198 }; // 新加坡中心
  }, [processed.loc]);

  // ======== 把图标转换为 data URL（给 WebView/Leaflet 标记使用） ========
  const [iconUris, setIconUris] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const toDataUrl = async (mod) => {
        const asset = Asset.fromModule(mod);
        await asset.downloadAsync();
        const b64 = await FileSystem.readAsStringAsync(asset.localUri || asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return `data:image/png;base64,${b64}`;
      };

      try {
        const [rain, pm, hum] = await Promise.all([
          toDataUrl(require('../assets/analysis/rainfall.png')),
          toDataUrl(require('../assets/analysis/pm2.5.png')),
          toDataUrl(require('../assets/analysis/humidity.png')),
        ]);
        if (mounted) setIconUris({ rain, pm, hum });
      } catch (e) {
        console.warn('Icon load error:', e);
        if (mounted) setIconUris({ rain: '', pm: '', hum: '' });
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ======== Leaflet HTML ========
  const html = useMemo(() => {
    const PM = JSON.stringify(processed.pm || []);
    const RAIN = JSON.stringify(processed.rain || []);
    const HUM = JSON.stringify(processed.hum || []);
    const LOC = JSON.stringify(processed.loc || null);
    const CENTER = JSON.stringify(initialCenter);

    const PM_ICON = JSON.stringify(iconUris?.pm || '');
    const RAIN_ICON = JSON.stringify(iconUris?.rain || '');
    const HUM_ICON = JSON.stringify(iconUris?.hum || '');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    html,body,#map{height:100%;margin:0}
    .leaflet-control-zoom{display:none}
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const RN = window.ReactNativeWebView;
    const PM = ${PM};
    const RAIN = ${RAIN};
    const HUM = ${HUM};
    const USER_LOC = ${LOC};
    const CENTER = ${CENTER};

    const map = L.map('map', { zoomControl:false, attributionControl:false }).setView([CENTER.lat, CENTER.lng], ${processed.loc ? 12 : 11});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

    const groupPM = L.layerGroup().addTo(map);
    const groupRain = L.layerGroup().addTo(map);
    const groupHum = L.layerGroup().addTo(map);

    if (USER_LOC) {
      L.circleMarker([USER_LOC.lat, USER_LOC.lng], { radius: 5, weight: 2, color: '#2563eb', fillColor:'#60a5fa', fillOpacity:0.9, title: 'You are here' }).addTo(map);
    }

    const pmIcon = L.icon({ iconUrl: ${PM_ICON}, iconSize:[26,26], iconAnchor:[13,13], popupAnchor:[0,-12] });
    const rainIcon = L.icon({ iconUrl: ${RAIN_ICON}, iconSize:[26,26], iconAnchor:[13,13], popupAnchor:[0,-12] });
    const humIcon = L.icon({ iconUrl: ${HUM_ICON}, iconSize:[26,26], iconAnchor:[13,13], popupAnchor:[0,-12] });

    function addIconMarker(group, lat, lng, icon, title, desc) {
      const m = L.marker([lat, lng], { icon });
      m.bindPopup('<b>'+title+'</b><br/>'+desc);
      m.addTo(group);
    }

    function kmText(d) {
      if (!d && d !== 0) return '';
      return ' · ' + d.toFixed(2) + ' km';
    }

    PM.forEach(p => addIconMarker(groupPM, p.lat, p.lng, pmIcon, 'PM2.5: ' + (p.value ?? 'N/A'), (p.name||'') + kmText(p.dist)));
    RAIN.forEach(r => addIconMarker(groupRain, r.lat, r.lng, rainIcon, 'Rainfall: ' + (r.value ?? 0) + ' mm', (r.name||'') + kmText(r.dist)));
    HUM.forEach(h => addIconMarker(groupHum, h.lat, h.lng, humIcon, 'Humidity: ' + (h.value ?? 0) + '%', (h.name||'') + kmText(h.dist)));

    function setLayer(mode) {
      const showPM = (mode==='all' || mode==='pm25');
      const showRain = (mode==='all' || mode==='rain');
      const showHum = (mode==='all' || mode==='humidity');
      const showNone = (mode==='none');

      groupPM.removeFrom(map); groupRain.removeFrom(map); groupHum.removeFrom(map);
      if (!showNone) {
        if (showPM) groupPM.addTo(map);
        if (showRain) groupRain.addTo(map);
        if (showHum) groupHum.addTo(map);
      }
    }

    window.addEventListener('message', (e) => {
      try {
        const msg = JSON.parse(e.data || '{}');
        if (msg.type === 'set-layer') setLayer(msg.mode);
      } catch (err) {
        console.error('Message parse error:', err);
      }
    });

    setLayer('${layer}');
  </script>
</body>
</html>
    `;
  }, [processed, initialCenter, layer, iconUris]);

  const post = (obj) => {
    webRef.current?.postMessage?.(JSON.stringify(obj));
  };

  const switchLayer = (mode) => {
    setLayer(mode);
    post({ type: 'set-layer', mode });
  };

  const onMessage = (e) => {
    try {
      const data = JSON.parse(e.nativeEvent.data || '{}');
      if (data.type === 'no-markers') {
        Alert.alert('No markers to fit', '当前图层没有可视站点。');
      }
    } catch (err) {
      console.error('onMessage parse error:', err);
    }
  };

  if (!iconUris) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={onMessage}
        source={{ html }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 返回 */}
      <TouchableOpacity
        style={styles.backFab}
        onPress={() => navigation.goBack()}
        activeOpacity={0.85}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Image source={require('../assets/back.png')} style={styles.backIcon} />
        <Text style={styles.backLabel}>Back</Text>
      </TouchableOpacity>

      {/* 图层按钮：icon + name */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.btn, layer === 'all' && styles.active]}
          onPress={() => switchLayer('all')}
        >
          <Image source={require('../assets/all.png')} style={styles.btnIcon} />
          <Text style={styles.btnText}>All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, layer === 'rain' && styles.active]}
          onPress={() => switchLayer('rain')}
        >
          <Image source={require('../assets/analysis/rainfall.png')} style={styles.btnIcon} />
          <Text style={styles.btnText}>Rainfall</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, layer === 'pm25' && styles.active]}
          onPress={() => switchLayer('pm25')}
        >
          <Image source={require('../assets/analysis/pm2.5.png')} style={styles.btnIcon} />
          <Text style={styles.btnText}>PM2.5</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, layer === 'humidity' && styles.active]}
          onPress={() => switchLayer('humidity')}
        >
          <Image source={require('../assets/analysis/humidity.png')} style={styles.btnIcon} />
          <Text style={styles.btnText}>Humidity</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, layer === 'none' && styles.active]}
          onPress={() => switchLayer('none')}
        >
          <Image source={require('../assets/none.png')} style={styles.btnIcon} />
          <Text style={styles.btnText}>None</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // 胶囊返回按钮
  backFab: {
    position: 'absolute',
    top: 44,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17,24,39,0.8)', // 深色半透明
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    zIndex: 10,
  },
  backIcon: { width: 14, height: 14, marginRight: 6, tintColor: '#fff', resizeMode: 'contain' },
  backLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // 一排图层按钮
  buttonGroup: {
    position: 'absolute',
    bottom: 30,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    elevation: 4,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#eee',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  active: { backgroundColor: '#3399ff' },
  btnText: { fontWeight: '600', color: '#333', fontSize: 9, lineHeight: 12, marginTop: 2, textAlign: 'center' },
  btnIcon: { width: 18, height: 18, resizeMode: 'contain' },
});
