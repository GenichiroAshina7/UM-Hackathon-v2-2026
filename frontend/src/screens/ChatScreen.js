import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { sendChat } from '../services/api';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "Hi Auntie Siti! I'm PriceSmart, your money and business advisor. I can help you with:\n\n• Check your menu, margins, and pricing\n• Change prices, add/remove items, edit menu details\n• Track income, expenses, and debts\n• Add or remove financial records\n• Get pricing and financial advice\n• Save useful tips to your Advice library\n\nJust tell me what you need!",
};

export default function ChatScreen() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const result = await sendChat(newMessages);
      const assistantMsg = { role: 'assistant', content: result.reply };
      if (result.actions && result.actions.length > 0) {
        assistantMsg.actions = result.actions;
      }
      setMessages([...newMessages, assistantMsg]);
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: "Sorry, something went wrong. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        <Text style={styles.title}>Chat with PriceSmart</Text>

        {messages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.messageBubble,
              msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            {msg.role === 'assistant' && (
              <Text style={styles.assistantLabel}>PriceSmart</Text>
            )}
            <Text style={[styles.messageText, msg.role === 'user' ? styles.userText : styles.assistantText]}>
              {msg.content}
            </Text>
            {msg.actions && msg.actions.length > 0 && (
              <View style={styles.actionsContainer}>
                {msg.actions.map((action, idx) => (
                  <View key={idx} style={styles.actionBadge}>
                    <Text style={styles.actionBadgeText}>✓ {action.summary}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {loading && (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <Text style={styles.assistantLabel}>PriceSmart</Text>
            <Text style={styles.typingText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask PriceSmart anything..."
          placeholderTextColor={COLORS.textSecondary}
          multiline
          maxLength={500}
          onSubmitEditing={handleSend}
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: SPACING.md, paddingBottom: SPACING.xl },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
  },
  assistantLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: COLORS.textLight },
  assistantText: { color: COLORS.text },
  typingText: { fontSize: 15, color: COLORS.textSecondary, fontStyle: 'italic' },
  inputContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    paddingBottom: Platform.OS === 'web' ? SPACING.md : SPACING.xl,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 16,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  sendBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textLight },

  // Action badges
  actionsContainer: { marginTop: SPACING.xs, gap: 4 },
  actionBadge: { backgroundColor: 'rgba(76, 175, 80, 0.1)', borderLeftWidth: 3, borderLeftColor: '#4CAF50', paddingLeft: SPACING.sm, paddingVertical: 4, borderRadius: 2 },
  actionBadgeText: { fontSize: 12, color: '#4CAF50', fontWeight: '600' },
});
