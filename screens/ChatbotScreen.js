import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useNavigation } from "@react-navigation/native";

// ---- your existing config reading (keep yours) ----
const EXTRA = Constants?.expoConfig?.extra ?? {};
const OPENROUTER_API_KEY =
  process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? EXTRA.OPENROUTER_API_KEY ?? "";
const OPENROUTER_ENDPOINT =
  EXTRA.OPENROUTER_ENDPOINT ?? "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = EXTRA.OPENROUTER_MODEL ?? "openai/gpt-oss-20b:free";

export default function Chatbot({ visible, onClose }) {
  const navigation = useNavigation();
  const isModal = typeof visible === "boolean"; // if not provided -> screen mode

  // one close function to rule them all
  const close = useCallback(() => {
    if (typeof onClose === "function") {
      onClose();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [onClose, navigation]);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "system",
      content: "You are a helpful assistant inside a mobile app.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    const userMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      if (!OPENROUTER_API_KEY) throw new Error("Missing OPENROUTER_API_KEY");
      const res = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: nextMessages,
        }),
      });
      if (!res.ok)
        throw new Error(
          `HTTP ${res.status}: ${
            (await res.text().catch(() => "")) || "Request failed"
          }`
        );
      const json = await res.json();
      const reply = json?.choices?.[0]?.message?.content;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply || "⚠️ No reply content returned.",
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ Chat error: ${e.message || "Failed to connect."}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // shared UI
  const Content = (
    <View style={styles.overlay}>
      <TouchableOpacity
        onPress={close}
        style={styles.closeIcon}
        hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Close chatbot"
      >
        <Ionicons name="close" size={26} color="#333" />
      </TouchableOpacity>

      <View style={styles.container}>
        <ScrollView style={styles.chatArea}>
          {messages
            .filter((m) => m.role !== "system")
            .map((m, i) => (
              <Text
                key={i}
                style={m.role === "user" ? styles.userMsg : styles.botMsg}
              >
                {m.content}
              </Text>
            ))}
          {loading && <ActivityIndicator size="small" color="#000" />}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask something..."
            style={styles.input}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            editable={!loading}
          />
          <TouchableOpacity
            onPress={sendMessage}
            style={styles.sendBtn}
            disabled={loading}
          >
            <Text style={{ color: "white" }}>{loading ? "..." : "Send"}</Text>
          </TouchableOpacity>
        </View>

        {!OPENROUTER_API_KEY && (
          <Text style={styles.warn}>
            ⚠️ OPENROUTER_API_KEY not found. Set EXPO_PUBLIC_OPENROUTER_API_KEY
            or extra.OPENROUTER_API_KEY.
          </Text>
        )}
      </View>
    </View>
  );

  // Modal mode: use visible + onRequestClose (Android back)
  if (isModal) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={close}
      >
        {Content}
      </Modal>
    );
  }

  // Screen mode: just render the content; close() navigates back
  return Content;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "white" },
  closeIcon: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10,
    padding: 4,
  },
  container: { flex: 1, paddingTop: 80, paddingHorizontal: 15 },
  chatArea: { flex: 1, marginBottom: 10 },
  userMsg: {
    alignSelf: "flex-end",
    backgroundColor: "#d1e7dd",
    padding: 8,
    borderRadius: 6,
    marginVertical: 2,
    maxWidth: "80%",
  },
  botMsg: {
    alignSelf: "flex-start",
    backgroundColor: "#f8d7da",
    padding: 8,
    borderRadius: 6,
    marginVertical: 2,
    maxWidth: "80%",
  },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 8,
  },
  sendBtn: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 15,
    justifyContent: "center",
    borderRadius: 5,
    marginLeft: 5,
    height: 40,
  },
  warn: { marginTop: 8, color: "#b45309", fontSize: 12 },
});
