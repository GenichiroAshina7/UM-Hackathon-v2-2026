import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  ActivityIndicator, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, WORRIES, EVENTS, PRIORITIES, SEASONS, BUSINESS_GOALS } from '../constants/theme';
import { financeAdvise, bridgeAdvise, sendChat } from '../services/api';

export default function AIAdvisorScreen() {
  const [mode, setMode] = useState('chat'); // 'chat' or 'analyse'
  const [layer, setLayer] = useState('bridge');

  // Analyse mode state
  const [worry, setWorry] = useState(WORRIES[0]);
  const [event, setEvent] = useState(EVENTS[0]);
  const [priority, setPriority] = useState(PRIORITIES[0]);
  const [season, setSeason] = useState(SEASONS[0]);
  const [businessGoal, setBusinessGoal] = useState(BUSINESS_GOALS[3]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Chat mode state
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi User! I\'m UpStart, your money and business advisor. I can help you with:\n\n• Check your menu, margins, and pricing\n• Change prices, add/remove items, edit menu details\n• Track income, expenses, and debts\n• Add or remove financial records\n• Get pricing and financial advice\n• Save useful tips to your Advice library\n\nJust tell me what you need!' },
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Picker state
  const [showPicker, setShowPicker] = useState(null);

  const pickerConfig = {
    worry: { items: WORRIES, label: 'Current Worry', get: () => worry, set: setWorry },
    event: { items: EVENTS, label: 'Upcoming Event', get: () => event, set: setEvent },
    priority: { items: PRIORITIES, label: "This Month's Priority", get: () => priority, set: setPriority },
    season: { items: SEASONS, label: 'Season / Event', get: () => season, set: setSeason },
    businessGoal: { items: BUSINESS_GOALS, label: 'Business Goal', get: () => businessGoal, set: setBusinessGoal },
  };

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const context = { worry, event, priority };
      if (layer === 'bridge') {
        context.season = season;
        context.business_goal = businessGoal;
        const res = await bridgeAdvise(context);
        setResult({ type: 'bridge', data: res });
      } else {
        const res = await financeAdvise(context);
        setResult({ type: 'finance', data: res });
      }
    } catch (e) {
      setResult({ type: 'error', data: { message: 'Failed to generate analysis. Please try again.' } });
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
      const assistantMsg = { role: 'assistant', content: res.reply };
      if (res.actions && res.actions.length > 0) {
        assistantMsg.actions = res.actions;
      }
      setMessages([...newMessages, assistantMsg]);
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    }
    setChatLoading(false);
  };

  const renderPicker = () => {
    const field = showPicker;
    if (!field) return null;
    const cfg = pickerConfig[field];
    return (
      <Modal visible animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{cfg.label}</Text>
            {cfg.items.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.pickerItem, cfg.get() === item && styles.pickerItemActive]}
                onPress={() => { cfg.set(item); setShowPicker(null); }}
              >
                <Text style={[styles.pickerItemText, cfg.get() === item && styles.pickerItemTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPicker(null)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderResult = () => {
    if (!result) return null;
    if (result.type === 'error') {
      return <View style={[styles.card, { borderLeftColor: COLORS.red, borderLeftWidth: 4 }]}><Text style={styles.errorText}>{result.data.message}</Text></View>;
    }
    const d = result.data;
    if (result.type === 'finance') {
      return (
        <View>
          {d.health_summary && <View style={styles.card}><Text style={styles.cardTitle}>Financial Health Summary</Text><Text style={styles.cardText}>{d.health_summary}</Text></View>}
          {d.spending_alert && d.spending_alert.category && <View style={[styles.card, { borderLeftColor: COLORS.amber, borderLeftWidth: 4 }]}><Text style={styles.cardTitle}>Spending Alert</Text><Text style={styles.cardText}>{d.spending_alert.issue}</Text><Text style={styles.cardSuggestion}>{d.spending_alert.suggestion}</Text></View>}
          {d.debt_action_plan && d.debt_action_plan.ordered_debts && d.debt_action_plan.ordered_debts.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Debt Action Plan</Text>
              <Text style={styles.cardStrategy}>Strategy: {d.debt_action_plan.strategy === 'avalanche' ? 'Avalanche (highest interest first)' : 'Snowball (smallest balance first)'}</Text>
              {d.debt_action_plan.ordered_debts.map((debt, i) => (
                <View key={i} style={styles.debtOrderItem}><Text style={styles.debtOrderNum}>{i + 1}.</Text><Text style={styles.debtOrderName}>{debt.creditor}</Text><Text style={styles.debtOrderReason}>{debt.reason}</Text></View>
              ))}
              <Text style={styles.cardText}>{d.debt_action_plan.explanation}</Text>
            </View>
          )}
          {d.savings_opportunity && d.savings_opportunity.amount_rm > 0 && <View style={[styles.card, { borderLeftColor: COLORS.green, borderLeftWidth: 4 }]}><Text style={styles.cardTitle}>Savings Opportunity</Text><Text style={styles.cardAmount}>RM {d.savings_opportunity.amount_rm.toFixed(2)}</Text><Text style={styles.cardText}>Source: {d.savings_opportunity.source}</Text><Text style={styles.cardSuggestion}>Use for: {d.savings_opportunity.target}</Text></View>}
          {d.income_boost_suggestion && <View style={[styles.card, { borderLeftColor: COLORS.primary, borderLeftWidth: 4 }]}><Text style={styles.cardTitle}>Income Boost</Text>{d.income_boost_suggestion.gap_rm > 0 && <Text style={styles.cardText}>Monthly shortfall: RM {d.income_boost_suggestion.gap_rm.toFixed(2)}</Text>}{d.income_boost_suggestion.business_potential_rm > 0 && <Text style={styles.cardAmount}>Business potential: RM {d.income_boost_suggestion.business_potential_rm.toFixed(2)}/month</Text>}<Text style={styles.cardSuggestion}>{d.income_boost_suggestion.next_step}</Text></View>}
        </View>
      );
    }
    // Bridge result
    return (
      <View>
        {d.full_picture_summary && <View style={[styles.card, { borderLeftColor: COLORS.primary, borderLeftWidth: 4 }]}><Text style={styles.cardTitle}>Full Picture</Text><Text style={styles.cardText}>{d.full_picture_summary}</Text></View>}
        {d.smart_money_move && d.smart_money_move.action && <View style={[styles.card, { borderLeftColor: COLORS.accent, borderLeftWidth: 4 }]}><Text style={styles.cardTitle}>Smart Money Move</Text><Text style={styles.cardAction}>{d.smart_money_move.action}</Text><Text style={styles.cardText}>{d.smart_money_move.reason}</Text>{d.smart_money_move.impact_rm && <Text style={styles.cardAmount}>Impact: RM {d.smart_money_move.impact_rm.toFixed(2)}/month</Text>}</View>}
        {d.business_as_escape && <View style={[styles.card, { borderLeftColor: COLORS.green, borderLeftWidth: 4 }]}><Text style={styles.cardTitle}>Business as Escape Route</Text>{d.business_as_escape.financial_gap_rm > 0 && <Text style={styles.cardText}>Financial gap: RM {d.business_as_escape.financial_gap_rm.toFixed(2)}/month</Text>}{d.business_as_escape.business_potential_rm > 0 && <Text style={styles.cardAmount}>Business potential: RM {d.business_as_escape.business_potential_rm.toFixed(2)}/month</Text>}<Text style={styles.cardSuggestion}>{d.business_as_escape.next_step}</Text></View>}
        {d.cross_layer_risk && <View style={[styles.card, { borderLeftColor: COLORS.red, borderLeftWidth: 4 }]}><Text style={styles.cardTitle}>Risk Alert</Text><Text style={styles.cardText}>{d.cross_layer_risk}</Text></View>}
        {d.action_plan && d.action_plan.length > 0 && (
          <View style={styles.card}><Text style={styles.cardTitle}>Action Plan</Text>
            {d.action_plan.map((step, i) => (
              <View key={i} style={styles.planStep}>
                <View style={styles.planStepNum}><Text style={styles.planStepNumText}>{i + 1}</Text></View>
                <View style={styles.planStepContent}><Text style={styles.planStepAction}>{step.step}</Text><Text style={styles.planStepWhy}>{step.why}</Text>{step.impact_rm && <Text style={styles.planStepImpact}>RM {step.impact_rm.toFixed(2)}/month</Text>}</View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Mode Tabs */}
      <View style={styles.modeRow}>
        <TouchableOpacity style={[styles.modeBtn, mode === 'chat' && styles.modeBtnActive]} onPress={() => setMode('chat')}>
          <Text style={[styles.modeBtnText, mode === 'chat' && styles.modeBtnTextActive]}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeBtn, mode === 'analyse' && styles.modeBtnActive]} onPress={() => setMode('analyse')}>
          <Text style={[styles.modeBtnText, mode === 'analyse' && styles.modeBtnTextActive]}>Analyse</Text>
        </TouchableOpacity>
      </View>

      {mode === 'chat' ? (
        <KeyboardAvoidingView style={styles.chatContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.chatMessages} ref={ref => { this.scrollView = ref; }} onContentSizeChange={() => this.scrollView?.scrollToEnd?.({ animated: true })}>
            {messages.map((msg, i) => (
              <View key={i} style={[styles.chatBubble, msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAI]}>
                <Text style={[styles.chatText, msg.role === 'user' && styles.chatTextUser]}>{msg.content}</Text>
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
            {chatLoading && (
              <View style={styles.chatBubbleAI}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            )}
          </ScrollView>
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Ask about your finances or business..."
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSendChat}
              editable={!chatLoading}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendChat} disabled={chatLoading || !input.trim()}>
              <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView style={styles.analyseContainer} contentContainerStyle={styles.analyseContent}>
          {/* Layer Selector */}
          <View style={styles.layerRow}>
            <TouchableOpacity style={[styles.layerBtn, layer === 'finance' && styles.layerBtnActive]} onPress={() => setLayer('finance')}>
              <Text style={[styles.layerBtnText, layer === 'finance' && styles.layerBtnTextActive]}>Finance Only</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.layerBtn, layer === 'bridge' && styles.layerBtnActive]} onPress={() => setLayer('bridge')}>
              <Text style={[styles.layerBtnText, layer === 'bridge' && styles.layerBtnTextActive]}>Full Picture</Text>
            </TouchableOpacity>
          </View>

          {/* Context Selectors */}
          <View style={styles.contextSection}>
            <Text style={styles.contextTitle}>Your Situation</Text>
            <TouchableOpacity style={styles.contextRow} onPress={() => setShowPicker('worry')}><Text style={styles.contextLabel}>Current Worry</Text><Text style={styles.contextValue}>{worry}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.contextRow} onPress={() => setShowPicker('event')}><Text style={styles.contextLabel}>Upcoming Event</Text><Text style={styles.contextValue}>{event}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.contextRow} onPress={() => setShowPicker('priority')}><Text style={styles.contextLabel}>Priority</Text><Text style={styles.contextValue}>{priority}</Text></TouchableOpacity>
            {layer === 'bridge' && (
              <>
                <TouchableOpacity style={styles.contextRow} onPress={() => setShowPicker('season')}><Text style={styles.contextLabel}>Season</Text><Text style={styles.contextValue}>{season}</Text></TouchableOpacity>
                <TouchableOpacity style={styles.contextRow} onPress={() => setShowPicker('businessGoal')}><Text style={styles.contextLabel}>Business Goal</Text><Text style={styles.contextValue}>{businessGoal}</Text></TouchableOpacity>
              </>
            )}
          </View>

          <TouchableOpacity style={[styles.generateBtn, loading && styles.generateBtnDisabled]} onPress={handleGenerate} disabled={loading}>
            {loading ? (
              <View style={styles.loadingRow}><ActivityIndicator color={COLORS.textLight} /><Text style={styles.generateBtnText}>AI is analysing...</Text></View>
            ) : (
              <Text style={styles.generateBtnText}>Generate Insights</Text>
            )}
          </TouchableOpacity>

          {renderResult()}
        </ScrollView>
      )}

      {renderPicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  modeRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingTop: SPACING.md, gap: SPACING.sm },
  modeBtn: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  modeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  modeBtnTextActive: { color: COLORS.textLight },

  // Chat styles
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

  // Action badges
  actionsContainer: { marginTop: SPACING.xs, gap: 4 },
  actionBadge: { backgroundColor: 'rgba(76, 175, 80, 0.1)', borderLeftWidth: 3, borderLeftColor: '#4CAF50', paddingLeft: SPACING.sm, paddingVertical: 4, borderRadius: 2 },
  actionBadgeText: { fontSize: 12, color: '#4CAF50', fontWeight: '600' },

  // Analyse styles
  analyseContainer: { flex: 1 },
  analyseContent: { padding: SPACING.md, paddingBottom: SPACING.xl },
  layerRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  layerBtn: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  layerBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  layerBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  layerBtnTextActive: { color: COLORS.textLight },
  contextSection: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  contextTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  contextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  contextLabel: { fontSize: 14, color: COLORS.textSecondary },
  contextValue: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  generateBtn: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.md },
  generateBtnDisabled: { opacity: 0.7 },
  generateBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.textLight },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },

  // Card styles
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xs },
  cardText: { fontSize: 14, color: COLORS.text, lineHeight: 20, marginBottom: SPACING.xs },
  cardAmount: { fontSize: 18, fontWeight: '700', color: COLORS.primary, marginBottom: SPACING.xs },
  cardSuggestion: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  cardAction: { fontSize: 16, fontWeight: '700', color: COLORS.accent, marginBottom: SPACING.xs },
  cardStrategy: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: SPACING.sm },
  debtOrderItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.xs },
  debtOrderNum: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginRight: SPACING.sm, width: 24 },
  debtOrderName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  debtOrderReason: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  planStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  planStepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  planStepNumText: { fontSize: 13, fontWeight: '700', color: COLORS.textLight },
  planStepContent: { flex: 1 },
  planStepAction: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  planStepWhy: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  planStepImpact: { fontSize: 13, fontWeight: '700', color: COLORS.green, marginTop: 2 },
  errorText: { fontSize: 14, color: COLORS.red },

  // Picker modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: BORDER_RADIUS.lg, borderTopRightRadius: BORDER_RADIUS.lg, padding: SPACING.lg, maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  pickerItem: { paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerItemActive: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.sm, paddingHorizontal: SPACING.sm },
  pickerItemText: { fontSize: 16, color: COLORS.text },
  pickerItemTextActive: { color: COLORS.textLight, fontWeight: '600' },
  cancelBtn: { paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.sm },
  cancelBtnText: { fontSize: 16, color: COLORS.textSecondary },
});
