import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { fetchStrategies, deleteStrategy } from '../services/api';

export default function AdviceScreen() {
  const [tab, setTab] = useState('finance'); // 'finance' or 'business'
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await fetchStrategies(tab);
      setStrategies(data);
    } catch (e) {
      console.error('Failed to load strategies', e);
    }
  };

  useEffect(() => { loadData(); }, [tab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = (id, title) => {
    Alert.alert('Delete', `Remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteStrategy(id);
          loadData();
          if (selectedStrategy && selectedStrategy.id === id) setSelectedStrategy(null);
        } catch (e) { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  // Detail view
  if (selectedStrategy) {
    return (
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedStrategy(null)}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(selectedStrategy.id, selectedStrategy.title)}>
            <Text style={styles.deleteBtn}>Delete</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.detailContent}>
          <Text style={styles.detailTitle}>{selectedStrategy.title}</Text>
          <View style={[styles.detailBadge, selectedStrategy.layer === 'business' ? styles.badgeBusiness : styles.badgeFinance]}>
            <Text style={styles.detailBadgeText}>{selectedStrategy.layer === 'business' ? 'Business' : 'Finance'}</Text>
          </View>
          <Text style={styles.detailDate}>Saved {new Date(selectedStrategy.created_at).toLocaleDateString()}</Text>
          <View style={styles.detailBody}>
            <Text style={styles.detailText}>{selectedStrategy.content}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // List view
  return (
    <View style={styles.container}>
      {/* Sub-tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, tab === 'finance' && styles.tabActive]} onPress={() => { setTab('finance'); setSelectedStrategy(null); }}>
          <Text style={[styles.tabText, tab === 'finance' && styles.tabTextActive]}>Finance Advice</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'business' && styles.tabActive]} onPress={() => { setTab('business'); setSelectedStrategy(null); }}>
          <Text style={[styles.tabText, tab === 'business' && styles.tabTextActive]}>Business Strategies</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {strategies.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>No saved advice yet</Text>
            <Text style={styles.emptySubtext}>
              {tab === 'finance'
                ? 'Chat with the AI Advisor about your finances. Useful advice gets saved here automatically.'
                : 'Chat with the AI about your business. Strategies and tips get saved here automatically.'}
            </Text>
          </View>
        ) : (
          strategies.map((s) => (
            <TouchableOpacity key={s.id} style={styles.strategyCard} onPress={() => setSelectedStrategy(s)}>
              <View style={styles.strategyHeader}>
                <View style={[styles.strategyBadge, s.layer === 'business' ? styles.badgeBusiness : styles.badgeFinance]}>
                  <Text style={styles.strategyBadgeText}>{s.layer === 'business' ? 'Biz' : 'Fin'}</Text>
                </View>
                <Text style={styles.strategyTitle} numberOfLines={2}>{s.title}</Text>
              </View>
              <Text style={styles.strategyPreview} numberOfLines={2}>{s.content}</Text>
              <Text style={styles.strategyDate}>{new Date(s.created_at).toLocaleDateString()}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabRow: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm },
  tab: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.surface },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.textLight },
  listContainer: { flex: 1, paddingHorizontal: SPACING.md },
  strategyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 1,
  },
  strategyHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  strategyBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: 4 },
  badgeFinance: { backgroundColor: COLORS.primary },
  badgeBusiness: { backgroundColor: COLORS.accent },
  strategyBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.textLight },
  strategyTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1 },
  strategyPreview: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: SPACING.xs },
  strategyDate: { fontSize: 11, color: COLORS.textSecondary },

  // Detail view
  detailContainer: { flex: 1, backgroundColor: COLORS.background },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  deleteBtn: { fontSize: 14, color: COLORS.red, fontWeight: '600' },
  detailContent: { flex: 1, padding: SPACING.md },
  detailTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  detailBadge: { alignSelf: 'flex-start', paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: 4, marginBottom: SPACING.xs },
  detailBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.textLight },
  detailDate: { fontSize: 12, color: COLORS.textSecondary, marginBottom: SPACING.md },
  detailBody: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.lg, elevation: 1 },
  detailText: { fontSize: 15, color: COLORS.text, lineHeight: 24 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.md },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  emptySubtext: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18, paddingHorizontal: SPACING.xl },
});
