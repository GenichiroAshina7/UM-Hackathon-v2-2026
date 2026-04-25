import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { fetchHealthScore, getHealthColor, fetchIncome, fetchExpenses, fetchDebts } from '../services/api';

export default function HomeScreen({ navigation }) {
  const [healthScore, setHealthScore] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [recentIncome, setRecentIncome] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [scoreData, incomeData, expenseData] = await Promise.all([
        fetchHealthScore(), fetchIncome(), fetchExpenses(),
      ]);
      setHealthScore(scoreData);
      setRecentIncome(incomeData.slice(-3).reverse());
      setRecentExpenses(expenseData.slice(-3).reverse());
    } catch (e) {
      console.error('Failed to load data', e);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const finScore = healthScore ? healthScore.score : 0;
  const finScoreColor = getHealthColor(finScore);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.greeting}>Good morning, User👋</Text>

      {/* Financial Health Score */}
      <View style={[styles.scoreCard, { borderColor: finScoreColor }]}>
        <Text style={styles.scoreLabel}>Financial Health</Text>
        <Text style={[styles.scoreValue, { color: finScoreColor }]}>{finScore}</Text>
        <Text style={styles.scoreMax}>out of 100</Text>
        {healthScore && healthScore.dragging_down ? (
          <Text style={styles.scoreNote}>{healthScore.dragging_down}</Text>
        ) : null}
      </View>

      {/* Summary Metrics */}
      <View style={styles.metricsRow}>
        {healthScore ? (
          <>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>RM {healthScore.total_income.toFixed(0)}</Text>
              <Text style={styles.metricLabel}>Income</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={[styles.metricValue, { color: healthScore.surplus_deficit >= 0 ? COLORS.green : COLORS.red }]}>
                RM {healthScore.surplus_deficit.toFixed(0)}
              </Text>
              <Text style={styles.metricLabel}>Surplus</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>RM {healthScore.total_debt.toFixed(0)}</Text>
              <Text style={styles.metricLabel}>Debt</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>—</Text>
              <Text style={styles.metricLabel}>Income</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>—</Text>
              <Text style={styles.metricLabel}>Surplus</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>—</Text>
              <Text style={styles.metricLabel}>Debt</Text>
            </View>
          </>
        )}
      </View>

      {/* Recent Activity */}
      {recentIncome.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Income</Text>
          {recentIncome.map((r) => (
            <View key={r.id} style={styles.recordRow}>
              <View style={styles.recordLeft}>
                <Text style={styles.recordName}>{r.source}</Text>
                <Text style={styles.recordSub}>{r.type === 'fixed' ? 'Fixed' : 'Variable'}</Text>
              </View>
              <Text style={[styles.recordAmount, { color: COLORS.green }]}>+RM {r.amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      {recentExpenses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Expenses</Text>
          {recentExpenses.map((r) => (
            <View key={r.id} style={styles.recordRow}>
              <View style={styles.recordLeft}>
                <Text style={styles.recordName}>{r.description}</Text>
                <Text style={styles.recordSub}>{r.category}</Text>
              </View>
              <Text style={[styles.recordAmount, { color: COLORS.red }]}>-RM {r.amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Business CTA Card */}
      <TouchableOpacity style={styles.businessCard} onPress={() => navigation.navigate('Business')}>
        <View style={styles.businessCardContent}>
          <Text style={styles.businessCardTitle}>My Business</Text>
          <Text style={styles.businessCardDesc}>
            {healthScore && healthScore.surplus_deficit < 0
              ? `You're RM${Math.abs(healthScore.surplus_deficit).toFixed(0)} short this month. Your business can help close the gap.`
              : 'Manage your menu, pricing, and get AI business insights.'}
          </Text>
        </View>
        <Text style={styles.businessCardArrow}>→</Text>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AI Advisor')}>
          <Text style={styles.actionBtnIcon}>🧠</Text>
          <Text style={styles.actionBtnText}>Ask AI</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Money')}>
          <Text style={styles.actionBtnIcon}>💰</Text>
          <Text style={styles.actionBtnText}>Log Money</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Debt')}>
          <Text style={styles.actionBtnIcon}>⚡</Text>
          <Text style={styles.actionBtnText}>Debt & Goals</Text>
        </TouchableOpacity>
      </View>

      {!healthScore && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data yet.</Text>
          <Text style={styles.emptySubtext}>Load a demo scenario to get started.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
  greeting: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  scoreCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  scoreLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  scoreValue: { fontSize: 56, fontWeight: '700' },
  scoreMax: { fontSize: 12, color: COLORS.textSecondary },
  scoreNote: { fontSize: 12, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },
  metricsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  metricBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    elevation: 1,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
  },
  metricValue: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  metricLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: SPACING.xs },
  section: { marginBottom: SPACING.md },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
    elevation: 1,
  },
  recordLeft: { flex: 1 },
  recordName: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  recordSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  recordAmount: { fontSize: 15, fontWeight: '700' },
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    elevation: 2,
  },
  businessCardContent: { flex: 1 },
  businessCardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textLight, marginBottom: SPACING.xs },
  businessCardDesc: { fontSize: 13, color: COLORS.textLight, opacity: 0.85, lineHeight: 18 },
  businessCardArrow: { fontSize: 28, color: COLORS.accentLight, fontWeight: '700', marginLeft: SPACING.md },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    elevation: 1,
  },
  actionBtnIcon: { fontSize: 24, marginBottom: SPACING.xs },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  emptyState: { alignItems: 'center', marginTop: SPACING.xl },
  emptyText: { fontSize: 16, color: COLORS.textSecondary },
  emptySubtext: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },
});
