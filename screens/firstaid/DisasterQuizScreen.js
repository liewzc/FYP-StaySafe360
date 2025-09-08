import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import TopBarBack from "../../components/ui/TopBarBack";

const ACCENT = "#0B6FB8";

export default function DisasterQuizScreen({
  title,
  question, // { question, options[], explanation }
  index, // 0-based
  total, // number of questions
  selectedIndex, // number | null
  correctIndex, // number | null
  onSelect, // (i) => void
  onNext, // () => void
  isLast, // boolean
  timeLeft, // seconds remaining
  timerColor, // '#RRGGBB'
  progressFraction, // 0..1
  onBack, // () => void
}) {
  const optStyle = (i) => {
    if (selectedIndex == null) return [styles.option, { borderColor: ACCENT }];
    if (i === correctIndex) return [styles.option, styles.correct];
    if (i === selectedIndex && i !== correctIndex)
      return [styles.option, styles.incorrect];
    return [styles.option, { borderColor: ACCENT }];
  };

  if (!question) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <TopBarBack title="Disaster Quiz" onBack={onBack} />
        <View style={[styles.container, { justifyContent: "center" }]}>
          <Text style={styles.headerEmpty}>❌ No questions available.</Text>
          <TouchableOpacity style={styles.menuBtn} onPress={onBack}>
            <Text style={styles.menuTxt}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <TopBarBack title={title} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <Text style={styles.progress}>
            Question {index + 1}/{total}
          </Text>
          <Text style={[styles.timerText, { color: timerColor }]}>
            ⏳ {timeLeft}s
          </Text>
        </View>

        <View style={[styles.questionCard, { backgroundColor: ACCENT + "33" }]}>
          <Text style={styles.questionText}>{question.question}</Text>
          <View style={styles.progressBarWrapper}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.max(0, Math.min(1, progressFraction)) * 100}%`,
                  backgroundColor: timerColor,
                },
              ]}
            />
          </View>
        </View>

        {question.options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            style={optStyle(i)}
            disabled={selectedIndex !== null}
            onPress={() => onSelect(i)}
          >
            <Text style={styles.optText}>
              {String.fromCharCode(65 + i)}. {opt}
            </Text>
          </TouchableOpacity>
        ))}

        {selectedIndex !== null && (
          <>
            {!!question.explanation && (
              <Text style={styles.explanation}>💡 {question.explanation}</Text>
            )}
            <TouchableOpacity
              style={[styles.nextBtn, isLast && { backgroundColor: "#4CAF50" }]}
              onPress={onNext}
            >
              <Text style={styles.nextTxt}>{isLast ? "Finish" : "Next"}</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fefefe", flexGrow: 1 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
  },
  progress: { fontSize: 14, fontWeight: "bold", color: "#333" },
  timerText: { fontSize: 14, fontWeight: "bold" },

  questionCard: { padding: 20, borderRadius: 12, marginBottom: 15 },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginBottom: 10,
  },

  progressBarWrapper: {
    height: 6,
    backgroundColor: "#eee",
    borderRadius: 5,
    overflow: "hidden",
    marginTop: 8,
  },
  progressBar: { height: 6, borderRadius: 5 },

  option: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
  },
  correct: { backgroundColor: "#c8e6c9", borderColor: "#388e3c" },
  incorrect: { backgroundColor: "#ffcdd2", borderColor: "#d32f2f" },
  optText: { fontSize: 15, color: "#111827" },

  explanation: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#555",
    marginVertical: 12,
  },
  nextBtn: {
    backgroundColor: "#9C27B0",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  nextTxt: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  headerEmpty: {
    fontSize: 18,
    fontWeight: "800",
    color: ACCENT,
    marginTop: 6,
    marginBottom: 10,
    textAlign: 'center'
  },
  menuBtn: {
    backgroundColor: "#9e9e9e",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 14,
    alignSelf: 'center'
  },
  menuTxt: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
