import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

// 从 Expo 注入的环境变量里读取
const cfg = Constants?.expoConfig?.extra ?? {};
const OPENROUTER_API_KEY = cfg.OPENROUTER_API_KEY;
const OPENROUTER_ENDPOINT = cfg.OPENROUTER_ENDPOINT || 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = cfg.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324:free';

export default function Chatbot({ visible, onClose }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'system', content: 'You are a helpful assistant inside a mobile app.' },
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      if (!OPENROUTER_API_KEY) {
        throw new Error('Missing OPENROUTER_API_KEY');
      }

      const response = await fetch(OPENROUTER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: nextMessages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errText || 'Request failed'}`);
      }

      const json = await response.json();
      const reply = json?.choices?.[0]?.message;

      if (reply?.content) {
        setMessages(prev => [...prev, reply]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: '⚠️ No reply content returned.' },
        ]);
      }
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `❌ Chat error: ${e.message || 'Failed to connect to chatbot.'}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.overlay}>
        {/* 左上角关闭按钮 */}
        <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
          <Ionicons name="close" size={26} color="#333" />
        </TouchableOpacity>

        <View style={styles.container}>
          <ScrollView style={styles.chatArea}>
            {messages
              .filter(msg => msg.role !== 'system') // 不显示 system 消息
              .map((msg, i) => (
                <Text
                  key={i}
                  style={msg.role === 'user' ? styles.userMsg : styles.botMsg}
                >
                  {msg.content}
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
            />
            <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
              <Text style={{ color: 'white' }}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'white' },
  closeIcon: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    padding: 4,
  },
  container: { flex: 1, paddingTop: 80, paddingHorizontal: 15 },
  chatArea: { flex: 1, marginBottom: 10 },
  userMsg: {
    alignSelf: 'flex-end',
    backgroundColor: '#d1e7dd',
    padding: 8,
    borderRadius: 6,
    marginVertical: 2,
    maxWidth: '80%',
  },
  botMsg: {
    alignSelf: 'flex-start',
    backgroundColor: '#f8d7da',
    padding: 8,
    borderRadius: 6,
    marginVertical: 2,
    maxWidth: '80%',
  },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 8,
  },
  sendBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    justifyContent: 'center',
    borderRadius: 5,
    marginLeft: 5,
    height: 40,
  },
});
