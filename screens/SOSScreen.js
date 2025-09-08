// screens/SOSScreen.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TopBarBack from "../components/ui/TopBarBack";
import { Ionicons } from "@expo/vector-icons";

const C = {
  text: "#0f172a",
  sub: "#6B7280",
  border: "#E5E7EB",
  bg: "#FFFFFF",
  rowBg: "#FFFFFF",
  callBg: "#EF4444",
  callTxt: "#FFFFFF",
  primary: "#2563EB",
  primaryBg: "#EFF6FF",
};

function Row({ item, active, onSelect, onCall }) {
  return (
    <TouchableOpacity style={[s.row, active && s.rowActive]} activeOpacity={0.9} onPress={() => onSelect(item.id)}>
      <View style={s.left}>
        <View style={s.iconWrap}>
          <Image source={item.icon} style={s.icon} />
        </View>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={s.num}>{item.number}</Text>
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{item.title}</Text>
            </View>
          </View>
          <Text style={s.roleSub}>
            {item.id === "1777"
              ? "Non-Emergency Transport"
              : item.id === "995"
              ? "Ambulance / Fire"
              : "Police Hotline"}
          </Text>
        </View>
      </View>

      <TouchableOpacity onPress={() => onCall(item.number)} style={s.callBtn} activeOpacity={0.9}>
        <Ionicons name="call" size={14} color={C.callTxt} />
        <Text style={s.callTxt}>Call</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function Section({ title, lines }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={s.secTitle}>{title}</Text>
      {lines.map((t, i) => (
        <Text key={i} style={s.secLine}>
          • {t}
        </Text>
      ))}
    </View>
  );
}

/**
 * Pure presentational screen.
 * Props:
 *  - options: array of SOS option objects
 *  - selectedOption: the currently selected option (object)
 *  - onSelect(id: string): select an option
 *  - onCall(number: string): trigger a phone call
 */
export default function SOSScreen({ options = [], selectedOption, onSelect, onCall }) {
  const insets = useSafeAreaInsets();
  const sel = selectedOption || options[0];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBarBack title="Emergency Call (SOS)" iconColor={C.text} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 16,
        }}
        showsVerticalScrollIndicator
      >
        <Text style={s.pageHint}>Tap a service to view details or place a call.</Text>

        <View style={s.list}>
          {options.map((op) => (
            <Row key={op.id} item={op} active={sel?.id === op.id} onSelect={onSelect} onCall={onCall} />
          ))}
        </View>

        {sel?.detail && (
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <Text style={s.cardHeader}>{sel.detail.header}</Text>
            </View>
            {sel.detail.sections.map((sec, i) => (
              <Section key={i} title={sec.title} lines={sec.lines} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  pageHint: { color: C.sub, marginBottom: 8, fontSize: 12, fontWeight: "600" },

  list: { marginBottom: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.rowBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rowActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  left: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EDF0F5",
  },
  icon: { width: 28, height: 28, resizeMode: "contain" },
  num: { fontSize: 18, fontWeight: "900", color: C.text, lineHeight: 22 },
  badge: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeTxt: { color: C.sub, fontWeight: "700", fontSize: 12 },
  roleSub: { fontSize: 12, color: C.sub, marginTop: 2 },

  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.callBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callTxt: { color: C.callTxt, fontWeight: "800" },

  card: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    backgroundColor: C.bg,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 8,
  },
  cardHeader: { fontWeight: "800", color: C.text, fontSize: 16 },

  secTitle: { color: C.text, fontWeight: "800", marginBottom: 4 },
  secLine: { color: C.text, lineHeight: 20 },
});
