// screens/firstaid/FirstAidResultScreen.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Animated,
  ScrollView,
  Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import TopBarBack from "../../components/ui/TopBarBack";

// Local-only achievements/history
import {
  recordLocalAttempt,
  markEverydaySublevelComplete,
  logShareOnce,
} from "../../utils/achievements";

// Normalize a human title into a key used by the achievements module.
function normalizeToKey(title = "") {
  return String(title)
    .toLowerCase()
    .replace(/[^\w\s]/g, "") 
    .trim()
    .replace(/\s+/g, "_"); 
}

export default function FirstAidResultScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  // EverydayQuizScreen 
  const {
    score = 0,           // e.g. 80
    total = 100,         // e.g. 100
    category = "First Aid",
    level = "main",
    sublevel = "Ⅰ",
    timeSpentMs = 0,
    answers = [],
  } = route.params || {};

  const pct = Math.max(0, Math.min(100, Math.round((score / total) * 100)));
  const isPerfect = score === total;
  const isGood = !isPerfect && pct >= 60;

  const accent = isPerfect ? "#10B981" : isGood ? "#0B6FB8" : "#EF4444";
  const accentSoft = isPerfect ? "#E8FFF6" : isGood ? "#F1F7FE" : "#FFF1F2";

  // animated score count-up
  const animVal = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    Animated.timing(animVal, { toValue: score, duration: 900, useNativeDriver: false }).start();
    const id = animVal.addListener(({ value }) => setDisplayScore(Math.round(value)));
    return () => animVal.removeListener(id);
  }, [score, animVal]);

  const timeText = useMemo(() => {
    const sec = Math.max(0, Math.round(timeSpentMs / 1000));
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  }, [timeSpentMs]);

  const [showReview, setShowReview] = useState(false);

  // One-time persistence: record attempt, and if perfect, mark the sublevel complete
  const didPersistRef = useRef(false);
  useEffect(() => {
    if (didPersistRef.current) return;
    didPersistRef.current = true;

    // 1) Save an attempt locally
    recordLocalAttempt({
      domain: "firstaid",
      categoryId: category,
      sublevelId: sublevel,
      score,
      total,
      timeMs: timeSpentMs || 0,
    }).catch((e) => console.warn("recordLocalAttempt error:", e));

    // 2) If perfect score, mark this sublevel as completed for achievements
    if (isPerfect) {
      const key = normalizeToKey(category);
      markEverydaySublevelComplete(key, sublevel).catch((e) =>
        console.warn("markEverydaySublevelComplete error:", e)
      );
    }
  }, [category, sublevel, score, total, timeSpentMs, isPerfect]);

  const handleShare = async () => {
    try {
      const message = `💊 I scored ${score} / ${total} (${pct}%) in the ${category} — ${level} ${sublevel} first-aid quiz! #StaySafe360`;
      const result = await Share.share(
        { message, title: "My StaySafe360 Quiz Score" },
        { dialogTitle: "Share your score" }
      );
      if (result?.action) {
        await logShareOnce().catch(() => {});
      }
    } catch (err) {
      console.error("Share error:", err);
      Alert.alert("Share failed", "Please try again.");
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: "#fff" }]}>
      <TopBarBack
        title="Quiz Result"
        onBack={() => navigation.goBack()}
        backgroundColor="#fff"
        showBorder
      />

      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: accentSoft }]}
      >
        <View style={styles.card} accessibilityRole="summary">
          <View style={[styles.badge, { backgroundColor: accentSoft, borderColor: accent }]}>
            <Text style={[styles.badgeText, { color: accent }]}>
              {isPerfect ? "🏆 Perfect!" : isGood ? "👍 Well done" : "💪 Keep going"}
            </Text>
          </View>

          <View className="chips-row" style={styles.chipsRow}>
            <View style={[styles.chip, { borderColor: accent }]}>
              <Text style={[styles.chipText, { color: accent }]}>{category}</Text>
            </View>
            <View style={[styles.chip, { borderColor: "#CBD5E1" }]}>
              <Text style={[styles.chipText, { color: "#334155" }]}>
                Level: {level} · Sublevel {sublevel}
              </Text>
            </View>
            <View style={[styles.chip, { borderColor: "#CBD5E1" }]}>
              <Text style={[styles.chipText, { color: "#334155" }]}>Time: {timeText}</Text>
            </View>
          </View>

          <Text
            style={[styles.score, { color: accent }]}
            accessibilityLabel={`Score ${score} out of ${total}`}
          >
            {displayScore} / {total}
          </Text>

          <View
            style={styles.progressBarBackground}
            accessibilityRole="progressbar"
            accessibilityValue={{ now: pct, min: 0, max: 100 }}
          >
            <View
              style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: accent }]}
            />
          </View>
          <Text style={styles.pctText}>{pct}%</Text>

          <Text style={styles.subtitle}>
            {isPerfect ? "✅ All correct! Outstanding work!" : "📝 Try again to aim for a perfect score!"}
          </Text>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: accent }]}
              onPress={handleShare}
            >
              <Text style={styles.primaryBtnText}>📤 Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: accent }]}
              onPress={() => setShowReview((v) => !v)}
            >
              <Text style={[styles.secondaryBtnText, { color: accent }]}>
                {showReview ? "Hide review" : "🔎 Review answers"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: accent }]}
              onPress={() => navigation.navigate("Main", { screen: "Quiz" })}
            >
              <Text style={[styles.secondaryBtnText, { color: accent }]}>🏠 Back to Quiz Menu</Text>
            </TouchableOpacity>
          </View>

          {/* Inline review */}
          {showReview && (
            <View style={styles.reviewBlock}>
              <Text style={styles.reviewTitle}>Answer Review</Text>
              {answers?.length ? (
                answers.map((a, idx) => {
                  const letter =
                    a?.selectedIndex != null ? String.fromCharCode(65 + a.selectedIndex) : "—";
                  const picked = a?.selectedAnswer ?? "No answer";
                  const correct = a?.correctAnswer;
                  const ok = a?.isCorrect ?? picked === correct;
                  const spent = a?.timeSpentSec != null ? `${a.timeSpentSec}s` : "";
                  return (
                    <View key={`${idx}-${a?.question?.slice(0, 6)}`} style={styles.qItem}>
                      <Text style={styles.qTitle}>
                        {idx + 1}. {a?.question}
                      </Text>
                      <Text style={[styles.qLine, ok ? styles.ok : styles.notOk]}>
                        Your answer: {letter}. {picked}
                      </Text>
                      <Text style={styles.qLine}>Correct: {correct}</Text>
                      {!!spent && <Text style={styles.qLine}>Time: {spent}</Text>}
                    </View>
                  );
                })
              ) : (
                <Text style={{ color: "#6b7280" }}>No per-question details were provided.</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flexGrow: 1, padding: 16 },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  badgeText: { fontSize: 13, fontWeight: "800" },
  chipsRow: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: "700" },
  score: {
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 6,
  },
  progressBarBackground: {
    width: "100%",
    height: 14,
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    overflow: "hidden",
    position: "relative",
    marginTop: 6,
  },
  progressBarFill: { height: "100%", borderRadius: 999 },
  pctText: { fontSize: 12, color: "#6B7280", textAlign: "right", marginTop: 6 },
  subtitle: { fontSize: 14, color: "#475569", textAlign: "center", marginVertical: 16 },

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 10, justifyContent: "center" },
  primaryBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  secondaryBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", borderWidth: 1.5 },
  secondaryBtnText: { fontWeight: "800", fontSize: 14 },

  reviewBlock: { marginTop: 18, borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 14 },
  reviewTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  qItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  qTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 6 },
  qLine: { fontSize: 13, color: "#374151", marginBottom: 2 },
  ok: { color: "#15803D" },
  notOk: { color: "#B91C1C" },
});
