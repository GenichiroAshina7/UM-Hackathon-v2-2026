import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, SEASONS, INGREDIENT_CHANGES, BUSINESS_GOALS } from '../constants/theme';
import { fetchMenu, analyse, sendChat } from '../services/api';

export default function InsightsScreen() {
  const [subTab, setSubTab] = useState('insights'); // 'insights' or 'chat'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [context, setContext] = useState({ season: 'None', ingredient_change: 'No change', business_goal: 'Maximise profit' });
  const [pickerVisible, setPickerVisible] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your business advisor. Ask me about pricing, margins, seasonal strategies, or anything about your stall. I can also save useful strategies for you to read later.' },
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => { fetchMenu().then(setItems).catch(console.error); }, []);

  const handleAnalyse = async () => {
    if (items.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await analyse(items, context);
      setResult(data);
    } catch (e) {
      setResult({ error: e.message });
    }
    setLoading(false);
  };

  const handleSendChat = async () => {
    if (!input.trim() || chatLoading) return;
    const userMsg = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setChatLoading(true);
    try {
      const res = await sendChat(newMessages.map(m => ({ role: m.role, content: m.content })));
      setMessages([...newMessages, { role: 'assistant', content: res.reply }]);
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    }
    setChatLoading(false);
  };

  const renderPicker = (field, options, currentValue) => (
    <Modal visible={pickerVisible === field} transparent animationType="slide">
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          {options.map((opt) => (
            <Pressable key={opt} style={styles.pickerOption} onPress={() => { setContext({ ...context, [field]: opt }); setPickerVisible(null); }}>
              <Text style={[styles.pickerOptionText, currentValue === opt && styles.pickerOptionSelected]}>{opt}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setPickerVisible(null)}><Text style={styles.pickerCancel}>Cancel</Text></Pressable>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>AI is analysing your menu...</Text>
        <Text style={styles.loadingSubtext}>The agent is investigating your data step by step</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Sub-tabs */}
      <View style={styles.subTabRow}>
        <TouchableOpacity style={[styles.subTab, subTab === 'insights' && styles.subTabActive]} onPress={() => setSubTab('insights')}>
          <Text style={[styles.subTabText, subTab === 'insights' && styles.subTabTextActive]}>Insights</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.subTab, subTab === 'chat' && styles.subTabActive]} onPress={() => setSubTab('chat')}>
          <Text style={[styles.subTabText, subTab === 'chat' && styles.subTabTextActive]}>Chat</Text>
        </TouchableOpacity>
      </View>

      {subTab === 'chat' ? (
        <KeyboardAvoidingView style={styles.chatContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.chatMessages} ref={ref => { this.scrollView = ref; }} onContentSizeChange={() => this.scrollView?.scrollToEnd?.({ animated: true })}>
            {messages.map((msg, i) => (
              <View key={i} style={[styles.chatBubble, msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAI]}>
                <Text style={[styles.chatText, msg.role === 'user' && styles.chatTextUser]}>{msg.content}</Text>
              </View>
            ))}
            {chatLoading && <View style={styles.chatBubbleAI}><ActivityIndicator size="small" color={COLORS.primary} /></View>}
          </ScrollView>
          <View style={styles.chatInputRow}>
            <TextInput style={styles.chatInput} placeholder="Ask about your business..." value={input} onChangeText={setInput} onSubmitEditing={handleSendChat} editable={!chatLoading} />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendChat} disabled={chatLoading || !input.trim()}>
              <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView style={styles.container}>
          <View style={styles.contextCard}>
            <Text style={styles.contextTitle}>Select Context</Text>
            <Text style={styles.contextLabel}>Season / Event</Text>
            <TouchableOpacity style={styles.contextBtn} onPress={() => setPickerVisible('season')}><Text style={styles.contextBtnText}>{context.season}</Text></TouchableOpacity>
            {renderPicker('season', SEASONS, context.season)}
            <Text style={styles.contextLabel}>Ingredient Cost Change</Text>
            <TouchableOpacity style={styles.contextBtn} onPress={() => setPickerVisible('ingredient_change')}><Text style={styles.contextBtnText}>{context.ingredient_change}</Text></TouchableOpacity>
            {renderPicker('ingredient_change', INGREDIENT_CHANGES, context.ingredient_change)}
            <Text style={styles.contextLabel}>Business Goal</Text>
            <TouchableOpacity style={styles.contextBtn} onPress={() => setPickerVisible('business_goal')}><Text style={styles.contextBtnText}>{context.business_goal}</Text></TouchableOpacity>
            {renderPicker('business_goal', BUSINESS_GOALS, context.business_goal)}
          </View>

          <TouchableOpacity style={[styles.generateBtn, items.length === 0 && styles.generateBtnDisabled]} onPress={handleAnalyse} disabled={items.length === 0}>
            <Text style={styles.generateBtnText}>{items.length === 0 ? 'Add menu items first' : 'Generate Insights'}</Text>
          </TouchableOpacity>

          {result && result.error && <View style={styles.errorCard}><Text style={styles.errorText}>Something went wrong: {result.error}</Text></View>}

          {result && !result.error && (
            <View style={styles.resultsContainer}>
              <View style={styles.insightCard}><Text style={styles.cardTitle}>Business Health Summary</Text><Text style={styles.cardBody}>{result.health_summary}</Text></View>
              <View style={styles.insightCard}>
                <Text style={styles.cardTitle}>Pricing Recommendations</Text>
                {(result.item_recommendations || []).map((rec, i) => {
                  const dirColor = rec.direction === 'raise' ? COLORS.amber : rec.direction === 'lower' ? COLORS.green : COLORS.primary;
                  return (
                    <View key={i} style={styles.recItem}>
                      <View style={styles.recHeader}><Text style={styles.recName}>{rec.name}</Text><View style={[styles.directionBadge, { backgroundColor: dirColor }]}><Text style={styles.directionText}>{rec.direction.toUpperCase()}</Text></View></View>
                      <Text style={styles.recPrices}>RM {rec.current_price?.toFixed(2)} → RM {rec.recommended_price?.toFixed(2)}</Text>
                      <Text style={styles.recReason}>{rec.reason}</Text>
                      <Text style={styles.recImpact}>Monthly impact: RM {rec.monthly_impact_rm?.toFixed(2)}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={[styles.insightCard, { borderLeftWidth: 4, borderLeftColor: COLORS.accent }]}><Text style={styles.cardTitle}>Strategic Insight</Text><Text style={styles.cardBody}>{result.strategic_insight}</Text></View>
              {(result.risk_flags || []).length > 0 && (
                <View style={[styles.insightCard, { borderLeftWidth: 4, borderLeftColor: COLORS.red }]}><Text style={styles.cardTitle}>Risk Flags</Text>{result.risk_flags.map((flag, i) => <Text key={i} style={styles.riskText}>{flag}</Text>)}</View>
              )}
              {result.impact_summary && (
                <View style={[styles.insightCard, { backgroundColor: COLORS.primary }]}>
                  <Text style={[styles.cardTitle, { color: COLORS.textLight }]}>Impact Summary</Text>
                  <View style={styles.impactRow}>
                    <View style={styles.impactCol}><Text style={styles.impactLabel}>Revenue Change</Text><Text style={styles.impactValue}>RM {result.impact_summary.total_revenue_change_rm?.toFixed(2)}</Text></View>
                    <View style={styles.impactCol}><Text style={styles.impactLabel}>Margin Improvement</Text><Text style={styles.impactValue}>+{result.impact_summary.margin_improvement_pp?.toFixed(1)}pp</Text></View>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: COLORS.background },
  subTabRow: { flexDirection: 'row', gap: SPACING.xs, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
  subTab: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.surface },
  subTabActive: { backgroundColor: COLORS.primary },
  subTabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  subTabTextActive: { color: COLORS.textLight },
  chatContainer: { flex: 1 },
  chatMessages: { flex: 1, padding: SPACING.md },
  chatBubble: { borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, maxWidth: '85%' },
  chatBubbleUser: { backgroundColor: COLORS.primary, alignSelf: 'flex-end' },
  chatBubbleAI: { backgroundColor: COLORS.surface, alignSelf: 'flex-start', elevation: 1 },
  chatText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  chatTextUser: { color: COLORS.textLight },
  chatInputRow: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  chatInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: 14 },
  sendBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.sm, justifyContent: 'center' },
  sendBtnText: { color: COLORS.textLight, fontWeight: '700', fontSize: 14 },
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: SPACING.xl },
  loadingText: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: SPACING.md },
  loadingSubtext: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.xs },
  contextCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, elevation: 1 },
  contextTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  contextLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  contextBtn: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.sm, padding: SPACING.md, backgroundColor: COLORS.background },
  contextBtnText: { fontSize: 15, color: COLORS.text },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, paddingBottom: SPACING.xl },
  pickerOption: { paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerOptionText: { fontSize: 16, color: COLORS.text, textAlign: 'center' },
  pickerOptionSelected: { fontWeight: '700', color: COLORS.primary },
  pickerCancel: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.md },
  generateBtn: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.md },
  generateBtnDisabled: { backgroundColor: COLORS.border },
  generateBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.textLight },
  errorCard: { backgroundColor: '#FFEBEE', borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  errorText: { color: COLORS.red, fontSize: 14 },
  resultsContainer: { gap: SPACING.sm },
  insightCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  cardBody: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  recItem: { paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  recHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  directionBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  directionText: { fontSize: 11, fontWeight: '700', color: COLORS.textLight },
  recPrices: { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.xs },
  recReason: { fontSize: 13, color: COLORS.text, marginTop: SPACING.xs, lineHeight: 18 },
  recImpact: { fontSize: 13, fontWeight: '600', color: COLORS.primary, marginTop: SPACING.xs },
  riskText: { fontSize: 14, color: COLORS.red, marginBottom: SPACING.xs, lineHeight: 20 },
  impactRow: { flexDirection: 'row', gap: SPACING.md },
  impactCol: { flex: 1 },
  impactLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  impactValue: { fontSize: 20, fontWeight: '700', color: COLORS.accentLight, marginTop: SPACING.xs },
});
