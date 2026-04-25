import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { fetchMenu, simulate, calculateMargin, getMarginColor } from '../services/api';

export default function SimulatorScreen() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [costChangePct, setCostChangePct] = useState('0');
  const [volumeChangePct, setVolumeChangePct] = useState('0');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchMenu().then((data) => {
      setItems(data);
      if (data.length > 0) {
        setSelectedItem(data[0]);
        setNewPrice(String(data[0].current_price));
      }
    }).catch(console.error);
  }, []);

  const onItemSelect = (item) => {
    setSelectedItem(item);
    setNewPrice(String(item.current_price));
    setCostChangePct('0');
    setVolumeChangePct('0');
    setAiResult(null);
  };

  if (!selectedItem) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No menu items to simulate.</Text>
        <Text style={styles.emptySubtext}>Add items in My Menu first.</Text>
      </View>
    );
  }

  const price = parseFloat(newPrice) || selectedItem.current_price;
  const adjustedCost = selectedItem.cost_per_unit * (1 + (parseFloat(costChangePct) || 0) / 100);
  const adjustedVolume = Math.round(selectedItem.monthly_volume * (1 + (parseFloat(volumeChangePct) || 0) / 100));

  const currentMargin = calculateMargin(selectedItem.current_price, selectedItem.cost_per_unit);
  const newMargin = calculateMargin(price, adjustedCost);
  const currentRevenue = selectedItem.current_price * selectedItem.monthly_volume;
  const newRevenue = price * adjustedVolume;
  const currentProfit = (selectedItem.current_price - selectedItem.cost_per_unit) * selectedItem.monthly_volume;
  const newProfit = (price - adjustedCost) * adjustedVolume;
  const revenueDiff = newRevenue - currentRevenue;
  const profitDiff = newProfit - currentProfit;

  const handleAskAI = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const data = await simulate({
        item_name: selectedItem.name,
        current_price: selectedItem.current_price,
        new_price: price,
        cost_per_unit: adjustedCost,
        monthly_volume: adjustedVolume,
        volume_change_pct: parseFloat(volumeChangePct) || 0,
      });
      setAiResult(data);
    } catch (e) {
      setAiResult({ error: e.message });
    }
    setAiLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>What-If Simulator</Text>

      {/* Item Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemTabs}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.itemTab, selectedItem.id === item.id && styles.itemTabActive]}
            onPress={() => onItemSelect(item)}
          >
            <Text style={[styles.itemTabText, selectedItem.id === item.id && styles.itemTabTextActive]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Adjustment Inputs */}
      <View style={styles.adjustCard}>
        <Text style={styles.adjustTitle}>Adjust Variables</Text>

        <Text style={styles.inputLabel}>New Selling Price (RM)</Text>
        <TextInput
          style={styles.input}
          value={newPrice}
          onChangeText={setNewPrice}
          keyboardType="decimal-pad"
        />

        <Text style={styles.inputLabel}>Ingredient Cost Change (%)</Text>
        <TextInput
          style={styles.input}
          value={costChangePct}
          onChangeText={setCostChangePct}
          keyboardType="decimal-pad"
          placeholder="e.g. 10 for +10%, -5 for -5%"
        />

        <Text style={styles.inputLabel}>Sales Volume Change (%)</Text>
        <TextInput
          style={styles.input}
          value={volumeChangePct}
          onChangeText={setVolumeChangePct}
          keyboardType="decimal-pad"
          placeholder="e.g. 20 for +20%, -10 for -10%"
        />
      </View>

      {/* Before / After Comparison */}
      <View style={styles.comparisonCard}>
        <Text style={styles.comparisonTitle}>Before vs After</Text>

        <View style={styles.comparisonRow}>
          <View style={styles.comparisonCol}>
            <Text style={styles.comparisonLabel}>Current</Text>
            <Text style={styles.comparisonSublabel}>Price: RM {selectedItem.current_price.toFixed(2)}</Text>
            <Text style={styles.comparisonSublabel}>Cost: RM {selectedItem.cost_per_unit.toFixed(2)}</Text>
            <Text style={styles.comparisonSublabel}>Volume: {selectedItem.monthly_volume}/mo</Text>
          </View>
          <View style={styles.comparisonCol}>
            <Text style={styles.comparisonLabel}>New</Text>
            <Text style={styles.comparisonSublabel}>Price: RM {price.toFixed(2)}</Text>
            <Text style={styles.comparisonSublabel}>Cost: RM {adjustedCost.toFixed(2)}</Text>
            <Text style={styles.comparisonSublabel}>Volume: {adjustedVolume}/mo</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Margin</Text>
            <Text style={[styles.metricValue, { color: getMarginColor(currentMargin) }]}>{currentMargin.toFixed(1)}%</Text>
            <Text style={styles.metricArrow}>→</Text>
            <Text style={[styles.metricValue, { color: getMarginColor(newMargin) }]}>{newMargin.toFixed(1)}%</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Revenue/mo</Text>
            <Text style={styles.metricValue}>RM {currentRevenue.toFixed(0)}</Text>
            <Text style={styles.metricArrow}>→</Text>
            <Text style={styles.metricValue}>RM {newRevenue.toFixed(0)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Profit/mo</Text>
            <Text style={styles.metricValue}>RM {currentProfit.toFixed(0)}</Text>
            <Text style={styles.metricArrow}>→</Text>
            <Text style={[styles.metricValue, { color: profitDiff >= 0 ? COLORS.green : COLORS.red }]}>
              RM {newProfit.toFixed(0)}
            </Text>
          </View>
        </View>

        <View style={styles.diffRow}>
          <Text style={[styles.diffText, { color: revenueDiff >= 0 ? COLORS.green : COLORS.red }]}>
            Revenue: {revenueDiff >= 0 ? '+' : ''}RM {revenueDiff.toFixed(2)}/mo
          </Text>
          <Text style={[styles.diffText, { color: profitDiff >= 0 ? COLORS.green : COLORS.red }]}>
            Profit: {profitDiff >= 0 ? '+' : ''}RM {profitDiff.toFixed(2)}/mo
          </Text>
        </View>
      </View>

      {/* Ask AI Button */}
      <TouchableOpacity style={styles.aiBtn} onPress={handleAskAI} disabled={aiLoading}>
        {aiLoading ? (
          <ActivityIndicator color={COLORS.textLight} />
        ) : (
          <Text style={styles.aiBtnText}>Ask AI About This Scenario</Text>
        )}
      </TouchableOpacity>

      {/* AI Result */}
      {aiResult && aiResult.error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{aiResult.error}</Text>
        </View>
      )}
      {aiResult && aiResult.interpretation && (
        <View style={[styles.insightCard, { borderLeftWidth: 4, borderLeftColor: COLORS.accent }]}>
          <Text style={styles.insightTitle}>AI Interpretation</Text>
          <Text style={styles.insightBody}>{aiResult.interpretation}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: SPACING.xl },
  emptyText: { fontSize: 16, color: COLORS.textSecondary },
  emptySubtext: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.xs },
  itemTabs: { marginBottom: SPACING.md, maxHeight: 50 },
  itemTab: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  itemTabText: { fontSize: 14, color: COLORS.textSecondary },
  itemTabTextActive: { color: COLORS.textLight, fontWeight: '600' },
  adjustCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 1,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
  },
  adjustTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    fontSize: 16,
    backgroundColor: COLORS.background,
    color: COLORS.text,
  },
  comparisonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 1,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
  },
  comparisonTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  comparisonRow: { flexDirection: 'row', gap: SPACING.md },
  comparisonCol: { flex: 1 },
  comparisonLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xs },
  comparisonSublabel: { fontSize: 13, color: COLORS.textSecondary },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },
  metricsRow: { flexDirection: 'row', gap: SPACING.md },
  metricItem: { flex: 1, alignItems: 'center' },
  metricLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  metricValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  metricArrow: { fontSize: 12, color: COLORS.textSecondary, marginVertical: 2 },
  diffRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  diffText: { fontSize: 14, fontWeight: '600' },
  aiBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  aiBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.textLight },
  errorCard: { backgroundColor: '#FFEBEE', borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  errorText: { color: COLORS.red, fontSize: 14 },
  insightCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  insightTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  insightBody: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
});
