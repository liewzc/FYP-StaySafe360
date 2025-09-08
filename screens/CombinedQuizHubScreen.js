// screens/CombinedQuizHubScreen.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";

const TITLE = "#111827";
const MUTED = "#6b7280";

export default function CombinedQuizHubScreen({
  insets,
  cards, // [{key, icon, title, subtitle, onPress}]
  headerTitle = "Quiz Hub",
}) {
  const Card = ({ icon, title, subtitle, onPress }) => (
    <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={onPress}>
      <Image source={icon} style={styles.cardIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{
        paddingTop: (insets?.top ?? 0) + 20,
        paddingBottom: (insets?.bottom ?? 0) + 20,
        paddingHorizontal: 16,
      }}
    >
      <Text style={styles.bigTitle}>{headerTitle}</Text>

      {/* Local Disaster */}
      <Text style={styles.sectionLabel}>Local Disaster</Text>
      {cards
        .filter((c) => c.key === "disaster")
        .map((c) => {
          const { key, ...rest } = c; // ← remove key from spread
          return <Card key={key} {...rest} />;
        })}

      {/* First Aid Hub */}
      <Text style={[styles.sectionLabel, { marginTop: 18 }]}>
        First Aid Hub
      </Text>
      {cards
        .filter((c) => c.group === "firstaid")
        .map((c) => {
          const { key, ...rest } = c; // ← remove key from spread
          return <Card key={key} {...rest} />;
        })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bigTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: TITLE,
    textAlign: "center",
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: TITLE,
    marginLeft: 6,
    marginBottom: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardIcon: {
    width: 44,
    height: 44,
    marginRight: 12,
    borderRadius: 8,
    resizeMode: "contain",
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: TITLE, marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: MUTED },
});
