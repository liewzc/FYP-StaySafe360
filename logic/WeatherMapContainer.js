// logic/WeatherMapContainer.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";
import WeatherMapScreen from "../screens/WeatherMapScreen";

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

async function modToDataUrl(mod) {
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  const b64 = await FileSystem.readAsStringAsync(asset.localUri || asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:image/png;base64,${b64}`;
}

export default function WeatherMapContainer() {
  const route = useRoute();
  const navigation = useNavigation();
  const webRef = useRef(null);

  const {
    location,
    pm25Data = [],
    rainData = [],
    humidityData = [],
  } = route.params || {};

  const [layer, setLayer] = useState("all");
  const [iconUris, setIconUris] = useState(null);

  // preprocess data
  const processed = useMemo(() => {
    const loc =
      location?.latitude && location?.longitude
        ? { lat: location.latitude, lng: location.longitude }
        : null;

    const toRow = (r, defVal = null) =>
      r?.location?.latitude && r?.location?.longitude
        ? {
            lat: r.location.latitude,
            lng: r.location.longitude,
            name: r.name || "",
            value: r.value ?? defVal,
            dist: loc
              ? distanceKm(location, {
                  latitude: r.location.latitude,
                  longitude: r.location.longitude,
                })
              : null,
          }
        : null;

    const pm = pm25Data.map((r) => toRow(r, null)).filter(Boolean);
    const rain = rainData.map((r) => toRow(r, 0)).filter(Boolean);
    const hum = humidityData.map((r) => toRow(r, 0)).filter(Boolean);
    return { loc, pm, rain, hum };
  }, [location, pm25Data, rainData, humidityData]);

  const initialCenter = useMemo(
    () => processed.loc || { lat: 1.3521, lng: 103.8198 },
    [processed.loc]
  );

  // load icons as data URLs
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [rain, pm, hum] = await Promise.all([
          modToDataUrl(require("../assets/analysis/rainfall.png")),
          modToDataUrl(require("../assets/analysis/pm2.5.png")),
          modToDataUrl(require("../assets/analysis/humidity.png")),
        ]);
        if (mounted) setIconUris({ rain, pm, hum });
      } catch (e) {
        console.warn("Icon load error:", e);
        if (mounted) setIconUris({ rain: "", pm: "", hum: "" });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // build HTML (logic responsibility)
  const html = useMemo(() => {
    const PM = JSON.stringify(processed.pm || []);
    const RAIN = JSON.stringify(processed.rain || []);
    const HUM = JSON.stringify(processed.hum || []);
    const LOC = JSON.stringify(processed.loc || null);
    const CENTER = JSON.stringify(initialCenter);
    const PM_ICON = JSON.stringify(iconUris?.pm || "");
    const RAIN_ICON = JSON.stringify(iconUris?.rain || "");
    const HUM_ICON = JSON.stringify(iconUris?.hum || "");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>html,body,#map{height:100%;margin:0}.leaflet-control-zoom{display:none}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const PM = ${PM};
    const RAIN = ${RAIN};
    const HUM = ${HUM};
    const USER_LOC = ${LOC};
    const CENTER = ${CENTER};

    const map = L.map('map', { zoomControl:false, attributionControl:false }).setView([CENTER.lat, CENTER.lng], ${
      processed.loc ? 12 : 11
    });
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
    function kmText(d){ if(!d && d!==0) return ''; return ' · ' + d.toFixed(2) + ' km'; }

    PM.forEach(p => addIconMarker(groupPM, p.lat, p.lng, pmIcon, 'PM2.5: ' + (p.value ?? 'N/A'), (p.name||'') + kmText(p.dist)));
    RAIN.forEach(r => addIconMarker(groupRain, r.lat, r.lng, rainIcon, 'Rainfall: ' + (r.value ?? 0) + ' mm', (r.name||'') + kmText(r.dist)));
    HUM.forEach(h => addIconMarker(groupHum, h.lat, h.lng, humIcon, 'Humidity: ' + (h.value ?? 0) + '%', (h.name||'') + kmText(h.dist)));

    function setLayer(mode){
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
      } catch (err) { console.error('Message parse error:', err); }
    });

    setLayer('${layer}');
  </script>
</body>
</html>
    `;
  }, [processed, initialCenter, layer, iconUris]);

  const postToWeb = (obj) => {
    webRef.current?.postMessage?.(JSON.stringify(obj));
  };

  const switchLayer = (mode) => {
    setLayer(mode);
    postToWeb({ type: "set-layer", mode });
  };

  const onMessage = (e) => {
    try {
      const data = JSON.parse(e.nativeEvent.data || "{}");
      if (data.type === "no-markers") {
        Alert.alert("No markers to fit", "当前图层没有可视站点。");
      }
    } catch (err) {
      console.error("onMessage parse error:", err);
    }
  };

  return (
    <WeatherMapScreen
      html={html}
      loading={!iconUris}
      layer={layer}
      onSwitchLayer={switchLayer}
      onBack={() => navigation.goBack()}
      webRef={webRef}
      onMessage={onMessage}
    />
  );
}
