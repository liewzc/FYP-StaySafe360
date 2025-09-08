// screens/WeatherMapScreen.js
import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Image,
} from "react-native";
import { WebView } from "react-native-webview";

export default function WeatherMapScreen({
  html,
  loading,
  layer,
  onSwitchLayer,
  onBack,
  webRef,
  onMessage,
}) {
  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        onMessage={onMessage}
        source={{ html }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Back */}
      <TouchableOpacity
        style={styles.backFab}
        onPress={onBack}
        activeOpacity={0.85}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Image source={require("../assets/back.png")} style={styles.backIcon} />
        <Text style={styles.backLabel}>Back</Text>
      </TouchableOpacity>

      {/* Layer buttons */}
      <View style={styles.buttonGroup}>
        {[
          { id: "all", icon: require("../assets/all.png"), label: "All" },
          {
            id: "rain",
            icon: require("../assets/analysis/rainfall.png"),
            label: "Rainfall",
          },
          {
            id: "pm25",
            icon: require("../assets/analysis/pm2.5.png"),
            label: "PM2.5",
          },
          {
            id: "humidity",
            icon: require("../assets/analysis/humidity.png"),
            label: "Humidity",
          },
          { id: "none", icon: require("../assets/none.png"), label: "None" },
        ].map((b) => (
          <TouchableOpacity
            key={b.id}
            style={[styles.btn, layer === b.id && styles.active]}
            onPress={() => onSwitchLayer(b.id)}
          >
            <Image source={b.icon} style={styles.btnIcon} />
            <Text style={styles.btnText}>{b.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  backFab: {
    position: "absolute",
    top: 44,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17,24,39,0.8)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    zIndex: 10,
  },
  backIcon: {
    width: 14,
    height: 14,
    marginRight: 6,
    tintColor: "#fff",
    resizeMode: "contain",
  },
  backLabel: { color: "#fff", fontSize: 13, fontWeight: "700" },

  buttonGroup: {
    position: "absolute",
    bottom: 30,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    elevation: 4,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#eee",
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4,
  },
  active: { backgroundColor: "#3399ff" },
  btnText: {
    fontWeight: "600",
    color: "#333",
    fontSize: 9,
    lineHeight: 12,
    marginTop: 2,
    textAlign: "center",
  },
  btnIcon: { width: 18, height: 18, resizeMode: "contain" },
});
