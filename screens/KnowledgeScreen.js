// screens/KnowledgeScreen.js
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CARD_BG = "#ffffff"; // ✅ 全白
const CARD_BORDER = "#e5e7eb";
const TITLE = "#0b6fb8";
const MUTED = "#6b7280";

export default function KnowledgeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const SectionCard = ({ emoji, title, hint, onPress, right }) => (
    <TouchableOpacity
      style={styles.sectionCard}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {title}
        </Text>
        {!!hint && (
          <Text style={styles.cardHint} numberOfLines={2}>
            {hint}
          </Text>
        )}
      </View>
      {right ?? <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
        ]}
      >
        {/* 页面标题 */}
        <Text style={styles.pageTitle}>Knowledge Hub</Text>

        {/* 分区 1：Ready to Respond */}
        <View style={styles.sectionHeaderWrap}>
          <Text style={styles.sectionHeader}>Ready to Respond</Text>
        </View>

        <SectionCard
          emoji="🌪️"
          title="Hazards"
          hint="Flood / Thunderstorms & Lightning / Haze / Heatwave / Coastal Flooding"
          onPress={() => navigation.navigate("HazardsHub")}
        />

        <SectionCard
          emoji="⛑️"
          title="Everyday First Aid"
          hint="Burns • CPR • Choking • Bleeding • Fracture • Heatstroke • Electric shock…"
          onPress={() => navigation.navigate("FirstAidGuides")}
        />

        {/* 分区 2：Quick Access */}
        <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
          Quick Access
        </Text>

        <SectionCard
          emoji="📰"
          title="Resource Hub"
          hint="News • Articles • Learning"
          onPress={() => navigation.navigate("ResourceHub")}
        />

        <SectionCard
          emoji="🔖"
          title="My Bookmarks"
          hint="Saved guides & tips"
          onPress={() => navigation.navigate("Bookmarks")}
        />

        <SectionCard
          emoji="🧭"
          title="CPR Training"
          hint="CPR Metronome • Video"
          onPress={() => navigation.navigate("CPRTrainingScreen")}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, backgroundColor: "#fff" },

  pageTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 18,
  },

  sectionHeaderWrap: { marginBottom: 10 },
  sectionHeader: { fontSize: 18, fontWeight: "900", color: "#0f172a" },

  sectionLabel: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 8,
    marginLeft: 2,
  },

  sectionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderColor: CARD_BORDER,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  emoji: { fontSize: 26, marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: TITLE, marginBottom: 2 },
  cardHint: { fontSize: 12, color: MUTED },
  chevron: { fontSize: 24, color: TITLE, marginLeft: 10, lineHeight: 24 },
});
