import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Alert, RefreshControl,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, DEBT_TYPES } from '../constants/theme';
import { fetchDebts, addDebt, updateDebt, deleteDebt, fetchHealthScore, fetchGoals, addGoal, updateGoal, deleteGoal } from '../services/api';

export default function DebtScreen() {
  const [tab, setTab] = useState('debts');
  const [debts, setDebts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Debt form
  const [dCreditor, setDCreditor] = useState('');
  const [dType, setDType] = useState('informal');
  const [dOwed, setDOwed] = useState('');
  const [dPayment, setDPayment] = useState('');
  const [dInterest, setDInterest] = useState('');

  // Goal form
  const [gName, setGName] = useState('');
  const [gTarget, setGTarget] = useState('');
  const [gCurrent, setGCurrent] = useState('');
  const [gDeadline, setGDeadline] = useState('');

  const loadData = async () => {
    try {
      const [debtsData, goalsData, scoreData] = await Promise.all([
        fetchDebts(), fetchGoals(), fetchHealthScore(),
      ]);
      setDebts(debtsData);
      setGoals(goalsData);
      setHealthScore(scoreData);
    } catch (e) {
      console.error('Failed to load data', e);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const resetForm = () => {
    setDCreditor(''); setDType('informal'); setDOwed(''); setDPayment(''); setDInterest('');
    setGName(''); setGTarget(''); setGCurrent(''); setGDeadline('');
  };

  const totalOwed = debts.reduce((s, d) => s + d.total_owed, 0);
  const monthlyPayments = debts.reduce((s, d) => s + d.monthly_payment, 0);
  const totalSavings = goals.reduce((s, g) => s + g.current_amount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const monthlyExpenses = healthScore?.total_expenses || 1;
  const daysCovered = totalSavings / (monthlyExpenses / 30);

  const debtToIncome = healthScore && healthScore.total_income > 0
    ? ((monthlyPayments / healthScore.total_income) * 100).toFixed(0) : 0;

  const handleAdd = async () => {
    try {
      if (tab === 'debts') {
        if (!dCreditor || !dOwed || !dPayment) { Alert.alert('Error', 'Fill in creditor, amount owed, and monthly payment'); return; }
        await addDebt({
          creditor: dCreditor, type: dType,
          total_owed: parseFloat(dOwed), monthly_payment: parseFloat(dPayment),
          interest_rate: dInterest ? parseFloat(dInterest) : 0,
        });
      } else {
        if (!gName || !gTarget) { Alert.alert('Error', 'Fill in goal name and target amount'); return; }
        await addGoal({
          name: gName, target_amount: parseFloat(gTarget),
          current_amount: gCurrent ? parseFloat(gCurrent) : 0,
          deadline: gDeadline || null,
        });
      }
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to add record');
    }
  };

  const handleAddToGoal = async (goalId, currentAmount, addAmount) => {
    try {
      await updateGoal(goalId, { current_amount: currentAmount + addAmount });
      loadData();
    } catch (e) { Alert.alert('Error', 'Failed to update goal'); }
  };

  const handleDelete = async (type, id) => {
    Alert.alert('Delete', 'Remove this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          if (type === 'debt') await deleteDebt(id);
          else await deleteGoal(id);
          loadData();
        } catch (e) { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const getDebtTypeLabel = (type) => {
    const found = DEBT_TYPES.find(d => d.value === type);
    return found ? found.label : type;
  };

  return (
    <View style={styles.container}>
      {/* Debt Overview */}
      <View style={styles.overviewRow}>
        <View style={styles.overviewBox}>
          <Text style={styles.overviewLabel}>Total Debt</Text>
          <Text style={[styles.overviewValue, { color: COLORS.red }]}>RM {totalOwed.toFixed(0)}</Text>
        </View>
        <View style={styles.overviewBox}>
          <Text style={styles.overviewLabel}>Monthly Payments</Text>
          <Text style={[styles.overviewValue, { color: COLORS.amber }]}>RM {monthlyPayments.toFixed(0)}</Text>
        </View>
        <View style={styles.overviewBox}>
          <Text style={styles.overviewLabel}>Debt/Income</Text>
          <Text style={[styles.overviewValue, { color: debtToIncome > 40 ? COLORS.red : debtToIncome > 20 ? COLORS.amber : COLORS.green }]}>{debtToIncome}%</Text>
        </View>
      </View>

      {/* Emergency Fund */}
      <View style={styles.emergencyCard}>
        <View style={styles.emergencyRow}>
          <Text style={styles.emergencyLabel}>Emergency Fund</Text>
          <Text style={styles.emergencyValue}>RM {totalSavings.toFixed(0)} / RM {totalTarget.toFixed(0)}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(100, (totalSavings / totalTarget) * 100)}%` }]} />
        </View>
        <Text style={styles.emergencyNote}>{daysCovered.toFixed(0)} days of expenses covered</Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, tab === 'debts' && styles.tabActive]} onPress={() => setTab('debts')}>
          <Text style={[styles.tabText, tab === 'debts' && styles.tabTextActive]}>Debts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'goals' && styles.tabActive]} onPress={() => setTab('goals')}>
          <Text style={[styles.tabText, tab === 'goals' && styles.tabTextActive]}>Savings Goals</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tab === 'debts' ? (
          debts.length === 0 ? (
            <Text style={styles.emptyText}>No debts recorded. That's great!</Text>
          ) : (
            debts.map((d) => (
              <View key={d.id} style={styles.debtCard}>
                <View style={styles.debtHeader}>
                  <Text style={styles.debtCreditor}>{d.creditor}</Text>
                  <View style={[styles.debtTypeBadge, d.type === 'informal' && styles.debtTypeBadgeDanger]}>
                    <Text style={styles.debtTypeText}>{getDebtTypeLabel(d.type)}</Text>
                  </View>
                </View>
                <View style={styles.debtDetails}>
                  <View style={styles.debtDetail}>
                    <Text style={styles.debtDetailLabel}>Owed</Text>
                    <Text style={styles.debtDetailValue}>RM {d.total_owed.toFixed(2)}</Text>
                  </View>
                  <View style={styles.debtDetail}>
                    <Text style={styles.debtDetailLabel}>Monthly</Text>
                    <Text style={styles.debtDetailValue}>RM {d.monthly_payment.toFixed(2)}</Text>
                  </View>
                  <View style={styles.debtDetail}>
                    <Text style={styles.debtDetailLabel}>Interest</Text>
                    <Text style={styles.debtDetailValue}>{d.interest_rate}%</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete('debt', d.id)}>
                  <Text style={styles.deleteBtn}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        ) : (
          goals.length === 0 ? (
            <Text style={styles.emptyText}>No savings goals yet. Start one!</Text>
          ) : (
            goals.map((g) => {
              const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount * 100) : 0;
              return (
                <View key={g.id} style={styles.goalCard}>
                  <Text style={styles.goalName}>{g.name}</Text>
                  <Text style={styles.goalAmount}>RM {g.current_amount.toFixed(0)} / RM {g.target_amount.toFixed(0)}</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${Math.min(100, pct)}%` }]} />
                  </View>
                  <Text style={styles.goalPct}>{pct.toFixed(0)}% complete</Text>
                  {g.deadline && <Text style={styles.goalDeadline}>Target: {g.deadline}</Text>}
                  <View style={styles.goalActions}>
                    <TouchableOpacity style={styles.addMoneyBtn} onPress={() => handleAddToGoal(g.id, g.current_amount, 50)}>
                      <Text style={styles.addMoneyBtnText}>+ RM 50</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete('goal', g.id)}>
                      <Text style={styles.deleteBtn}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
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
            <Text style={styles.modalTitle}>{tab === 'debts' ? 'Add Debt' : 'Add Savings Goal'}</Text>

            {tab === 'debts' ? (
              <>
                <TextInput style={styles.input} placeholder="Creditor name" value={dCreditor} onChangeText={setDCreditor} />
                <View style={styles.typeRow}>
                  {DEBT_TYPES.map((dt) => (
                    <TouchableOpacity key={dt.value} style={[styles.typeBtn, dType === dt.value && styles.typeBtnActive]} onPress={() => setDType(dt.value)}>
                      <Text style={[styles.typeBtnText, dType === dt.value && styles.typeBtnTextActive]}>{dt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={styles.input} placeholder="Amount owed (RM)" value={dOwed} onChangeText={setDOwed} keyboardType="decimal-pad" />
                <TextInput style={styles.input} placeholder="Monthly payment (RM)" value={dPayment} onChangeText={setDPayment} keyboardType="decimal-pad" />
                <TextInput style={styles.input} placeholder="Interest rate % (optional)" value={dInterest} onChangeText={setDInterest} keyboardType="decimal-pad" />
              </>
            ) : (
              <>
                <TextInput style={styles.input} placeholder="Goal name (e.g. Emergency fund)" value={gName} onChangeText={setGName} />
                <TextInput style={styles.input} placeholder="Target amount (RM)" value={gTarget} onChangeText={setGTarget} keyboardType="decimal-pad" />
                <TextInput style={styles.input} placeholder="Current savings (RM)" value={gCurrent} onChangeText={setGCurrent} keyboardType="decimal-pad" />
                <TextInput style={styles.input} placeholder="Deadline (e.g. 2025-12-31)" value={gDeadline} onChangeText={setGDeadline} />
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
  overviewRow: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm },
  overviewBox: { flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center', elevation: 1 },
  overviewLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 },
  overviewValue: { fontSize: 16, fontWeight: '700' },
  emergencyCard: { backgroundColor: COLORS.surface, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, elevation: 1 },
  emergencyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  emergencyLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  emergencyValue: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  progressBar: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  emergencyNote: { fontSize: 12, color: COLORS.textSecondary, marginTop: SPACING.xs },
  tabRow: { flexDirection: 'row', marginHorizontal: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm },
  tab: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.surface },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.textLight },
  listContainer: { flex: 1, paddingHorizontal: SPACING.md },
  debtCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, elevation: 1 },
  debtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  debtCreditor: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  debtTypeBadge: { backgroundColor: COLORS.amber, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: 4 },
  debtTypeBadgeDanger: { backgroundColor: COLORS.red },
  debtTypeText: { fontSize: 11, fontWeight: '600', color: COLORS.textLight },
  debtDetails: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.sm },
  debtDetail: {},
  debtDetailLabel: { fontSize: 11, color: COLORS.textSecondary },
  debtDetailValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  goalCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, elevation: 1 },
  goalName: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  goalAmount: { fontSize: 14, color: COLORS.primary, fontWeight: '700', marginBottom: SPACING.xs },
  goalPct: { fontSize: 12, color: COLORS.textSecondary, marginTop: SPACING.xs },
  goalDeadline: { fontSize: 12, color: COLORS.textSecondary },
  goalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.sm },
  addMoneyBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm },
  addMoneyBtnText: { color: COLORS.textLight, fontSize: 12, fontWeight: '600' },
  deleteBtn: { fontSize: 11, color: COLORS.red },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: SPACING.xl },
  fab: { position: 'absolute', right: SPACING.lg, bottom: SPACING.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabText: { fontSize: 28, color: COLORS.textLight, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: BORDER_RADIUS.lg, borderTopRightRadius: BORDER_RADIUS.lg, padding: SPACING.lg, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.sm, padding: SPACING.md, marginBottom: SPACING.sm, fontSize: 16 },
  typeRow: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.sm, flexWrap: 'wrap' },
  typeBtn: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.background },
  typeBtnActive: { backgroundColor: COLORS.primary },
  typeBtnText: { fontSize: 11, color: COLORS.textSecondary },
  typeBtnTextActive: { color: COLORS.textLight, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  cancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', backgroundColor: COLORS.background },
  cancelBtnText: { fontSize: 16, color: COLORS.textSecondary },
  saveBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', backgroundColor: COLORS.primary },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.textLight },
});
