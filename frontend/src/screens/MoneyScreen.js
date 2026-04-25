import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Alert, RefreshControl, FlatList,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, EXPENSE_CATEGORIES } from '../constants/theme';
import { fetchIncome, addIncome, deleteIncome, fetchExpenses, addExpense, deleteExpense, fetchHealthScore } from '../services/api';

export default function MoneyScreen() {
  const [tab, setTab] = useState('income');
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Income form
  const [incSource, setIncSource] = useState('');
  const [incType, setIncType] = useState('fixed');
  const [incAmount, setIncAmount] = useState('');

  // Expense form
  const [expCategory, setExpCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expNeedsWants, setExpNeedsWants] = useState('needs');

  const loadData = async () => {
    try {
      const [incData, expData, scoreData] = await Promise.all([
        fetchIncome(), fetchExpenses(), fetchHealthScore(),
      ]);
      setIncome(incData);
      setExpenses(expData);
      setHealthScore(scoreData);
    } catch (e) {
      console.error('Failed to load finance data', e);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalIncome = income.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);
  const surplus = totalIncome - totalExpenses;

  const resetForm = () => {
    setIncSource(''); setIncType('fixed'); setIncAmount('');
    setExpCategory(EXPENSE_CATEGORIES[0]); setExpDesc(''); setExpAmount(''); setExpNeedsWants('needs');
  };

  const handleAdd = async () => {
    try {
      if (tab === 'income') {
        if (!incSource || !incAmount) { Alert.alert('Error', 'Please fill in source and amount'); return; }
        await addIncome({ source: incSource, type: incType, amount: parseFloat(incAmount), date: new Date().toISOString().split('T')[0] });
      } else {
        if (!expDesc || !expAmount) { Alert.alert('Error', 'Please fill in description and amount'); return; }
        await addExpense({ category: expCategory, description: expDesc, amount: parseFloat(expAmount), needs_wants: expNeedsWants, date: new Date().toISOString().split('T')[0] });
      }
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to add record');
    }
  };

  const handleDelete = async (type, id) => {
    Alert.alert('Delete', 'Remove this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          if (type === 'income') await deleteIncome(id);
          else await deleteExpense(id);
          loadData();
        } catch (e) { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const scoreColor = healthScore ? (healthScore.score >= 70 ? COLORS.green : healthScore.score >= 40 ? COLORS.amber : COLORS.red) : COLORS.textSecondary;

  return (
    <View style={styles.container}>
      {/* Summary Bar */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryValue, { color: COLORS.green }]}>RM {totalIncome.toFixed(0)}</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={[styles.summaryValue, { color: COLORS.red }]}>RM {totalExpenses.toFixed(0)}</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Surplus</Text>
          <Text style={[styles.summaryValue, { color: surplus >= 0 ? COLORS.green : COLORS.red }]}>
            RM {surplus.toFixed(0)}
          </Text>
        </View>
      </View>

      {healthScore && (
        <View style={[styles.scoreBar, { borderLeftColor: scoreColor }]}>
          <Text style={styles.scoreBarLabel}>Financial Health</Text>
          <Text style={[styles.scoreBarValue, { color: scoreColor }]}>{healthScore.score}/100</Text>
          {healthScore.dragging_down ? <Text style={styles.scoreBarNote}>{healthScore.dragging_down}</Text> : null}
        </View>
      )}

      {/* Tab Selector */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, tab === 'income' && styles.tabActive]} onPress={() => setTab('income')}>
          <Text style={[styles.tabText, tab === 'income' && styles.tabTextActive]}>Income</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'expenses' && styles.tabActive]} onPress={() => setTab('expenses')}>
          <Text style={[styles.tabText, tab === 'expenses' && styles.tabTextActive]}>Expenses</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tab === 'income' ? (
          income.length === 0 ? (
            <Text style={styles.emptyText}>No income records yet.</Text>
          ) : (
            income.map((r) => (
              <View key={r.id} style={styles.recordCard}>
                <View style={styles.recordLeft}>
                  <Text style={styles.recordTitle}>{r.source}</Text>
                  <Text style={styles.recordSub}>{r.type === 'fixed' ? 'Fixed' : 'Variable'} income</Text>
                </View>
                <View style={styles.recordRight}>
                  <Text style={[styles.recordAmount, { color: COLORS.green }]}>RM {r.amount.toFixed(2)}</Text>
                  <TouchableOpacity onPress={() => handleDelete('income', r.id)}>
                    <Text style={styles.deleteBtn}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        ) : (
          expenses.length === 0 ? (
            <Text style={styles.emptyText}>No expense records yet.</Text>
          ) : (
            expenses.map((r) => (
              <View key={r.id} style={styles.recordCard}>
                <View style={styles.recordLeft}>
                  <Text style={styles.recordTitle}>{r.description}</Text>
                  <Text style={styles.recordSub}>{r.category} · {r.needs_wants === 'needs' ? 'Needs' : 'Wants'}</Text>
                </View>
                <View style={styles.recordRight}>
                  <Text style={[styles.recordAmount, { color: COLORS.red }]}>RM {r.amount.toFixed(2)}</Text>
                  <TouchableOpacity onPress={() => handleDelete('expenses', r.id)}>
                    <Text style={styles.deleteBtn}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setShowAddModal(true); }}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{tab === 'income' ? 'Add Income' : 'Add Expense'}</Text>

            {tab === 'income' ? (
              <>
                <TextInput style={styles.input} placeholder="Source (e.g. Salary, Grab)" value={incSource} onChangeText={setIncSource} />
                <View style={styles.typeRow}>
                  <TouchableOpacity style={[styles.typeBtn, incType === 'fixed' && styles.typeBtnActive]} onPress={() => setIncType('fixed')}>
                    <Text style={[styles.typeBtnText, incType === 'fixed' && styles.typeBtnTextActive]}>Fixed</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.typeBtn, incType === 'variable' && styles.typeBtnActive]} onPress={() => setIncType('variable')}>
                    <Text style={[styles.typeBtnText, incType === 'variable' && styles.typeBtnTextActive]}>Variable</Text>
                  </TouchableOpacity>
                </View>
                <TextInput style={styles.input} placeholder="Amount (RM)" value={incAmount} onChangeText={setIncAmount} keyboardType="decimal-pad" />
              </>
            ) : (
              <>
                <View style={styles.typeRow}>
                  {EXPENSE_CATEGORIES.slice(0, 4).map((cat) => (
                    <TouchableOpacity key={cat} style={[styles.catBtn, expCategory === cat && styles.catBtnActive]} onPress={() => setExpCategory(cat)}>
                      <Text style={[styles.catBtnText, expCategory === cat && styles.catBtnTextActive]}>{cat.split(' ')[0]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.typeRow}>
                  {EXPENSE_CATEGORIES.slice(4).map((cat) => (
                    <TouchableOpacity key={cat} style={[styles.catBtn, expCategory === cat && styles.catBtnActive]} onPress={() => setExpCategory(cat)}>
                      <Text style={[styles.catBtnText, expCategory === cat && styles.catBtnTextActive]}>{cat.split(' ')[0]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={styles.input} placeholder="Description" value={expDesc} onChangeText={setExpDesc} />
                <TextInput style={styles.input} placeholder="Amount (RM)" value={expAmount} onChangeText={setExpAmount} keyboardType="decimal-pad" />
                <View style={styles.typeRow}>
                  <TouchableOpacity style={[styles.typeBtn, expNeedsWants === 'needs' && styles.typeBtnActive]} onPress={() => setExpNeedsWants('needs')}>
                    <Text style={[styles.typeBtnText, expNeedsWants === 'needs' && styles.typeBtnTextActive]}>Needs</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.typeBtn, expNeedsWants === 'wants' && styles.typeBtnActive]} onPress={() => setExpNeedsWants('wants')}>
                    <Text style={[styles.typeBtnText, expNeedsWants === 'wants' && styles.typeBtnTextActive]}>Wants</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAddModal(false); resetForm(); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  summaryRow: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm },
  summaryBox: { flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center', elevation: 1 },
  summaryLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 },
  summaryValue: { fontSize: 16, fontWeight: '700' },
  scoreBar: { backgroundColor: COLORS.surface, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.sm, padding: SPACING.md, borderLeftWidth: 4 },
  scoreBarLabel: { fontSize: 12, color: COLORS.textSecondary },
  scoreBarValue: { fontSize: 24, fontWeight: '700' },
  scoreBarNote: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  tabRow: { flexDirection: 'row', marginHorizontal: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm },
  tab: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.surface },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.textLight },
  listContainer: { flex: 1, paddingHorizontal: SPACING.md },
  recordCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.sm, padding: SPACING.md, marginBottom: SPACING.xs, elevation: 1 },
  recordLeft: { flex: 1 },
  recordTitle: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  recordSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  recordRight: { alignItems: 'flex-end' },
  recordAmount: { fontSize: 15, fontWeight: '700' },
  deleteBtn: { fontSize: 11, color: COLORS.red, marginTop: 4 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: SPACING.xl },
  fab: { position: 'absolute', right: SPACING.lg, bottom: SPACING.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabText: { fontSize: 28, color: COLORS.textLight, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: BORDER_RADIUS.lg, borderTopRightRadius: BORDER_RADIUS.lg, padding: SPACING.lg, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.sm, padding: SPACING.md, marginBottom: SPACING.sm, fontSize: 16 },
  typeRow: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.sm, flexWrap: 'wrap' },
  typeBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.background },
  typeBtnActive: { backgroundColor: COLORS.primary },
  typeBtnText: { fontSize: 13, color: COLORS.textSecondary },
  typeBtnTextActive: { color: COLORS.textLight, fontWeight: '600' },
  catBtn: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.background, marginBottom: SPACING.xs },
  catBtnActive: { backgroundColor: COLORS.primary },
  catBtnText: { fontSize: 11, color: COLORS.textSecondary },
  catBtnTextActive: { color: COLORS.textLight, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  cancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', backgroundColor: COLORS.background },
  cancelBtnText: { fontSize: 16, color: COLORS.textSecondary },
  saveBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', backgroundColor: COLORS.primary },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.textLight },
});
