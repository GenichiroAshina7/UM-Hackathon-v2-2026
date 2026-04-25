import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, CATEGORIES } from '../constants/theme';
import { fetchMenu, addMenuItem, updateMenuItem, deleteMenuItem, calculateMargin, getMarginColor } from '../services/api';

const emptyForm = {
  name: '',
  category: 'Food',
  cost_per_unit: '',
  current_price: '',
  monthly_volume: '',
  competitor_price_low: '',
  competitor_price_high: '',
};

export default function MenuScreen() {
  const [items, setItems] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [categoryPicker, setCategoryPicker] = useState(false);

  const load = async () => {
    try {
      const data = await fetchMenu();
      setItems(data);
    } catch (e) {
      console.error('Failed to load menu', e);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalVisible(true);
  };

  const openEdit = (item) => {
    setForm({
      name: item.name,
      category: item.category,
      cost_per_unit: String(item.cost_per_unit),
      current_price: String(item.current_price),
      monthly_volume: String(item.monthly_volume),
      competitor_price_low: String(item.competitor_price_low),
      competitor_price_high: String(item.competitor_price_high),
    });
    setEditingId(item.id);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.cost_per_unit || !form.current_price || !form.monthly_volume) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    try {
      const payload = {
        name: form.name,
        category: form.category,
        cost_per_unit: parseFloat(form.cost_per_unit),
        current_price: parseFloat(form.current_price),
        monthly_volume: parseInt(form.monthly_volume),
        competitor_price_low: parseFloat(form.competitor_price_low) || 0,
        competitor_price_high: parseFloat(form.competitor_price_high) || 0,
      };
      if (editingId) {
        await updateMenuItem(editingId, payload);
      } else {
        await addMenuItem(payload);
      }
      setModalVisible(false);
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Delete Item', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteMenuItem(item.id);
            load();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>My Menu</Text>

        {items.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No items yet. Add your first menu item!</Text>
          </View>
        )}

        {items.map((item) => {
          const margin = calculateMargin(item.current_price, item.cost_per_unit);
          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={[styles.marginBadge, { backgroundColor: getMarginColor(margin) }]}>
                  <Text style={styles.marginBadgeText}>{margin.toFixed(1)}%</Text>
                </View>
              </View>
              <Text style={styles.itemCategory}>{item.category}</Text>
              <View style={styles.itemDetails}>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Cost</Text>
                  <Text style={styles.detailValue}>RM {item.cost_per_unit.toFixed(2)}</Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={styles.detailValue}>RM {item.current_price.toFixed(2)}</Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Volume</Text>
                  <Text style={styles.detailValue}>{item.monthly_volume}/mo</Text>
                </View>
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+ Add Item</Text>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Item' : 'Add Item'}</Text>
            <Pressable onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.form}>
            <Text style={styles.formLabel}>Item Name *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
              placeholder="e.g. Nasi Lemak"
            />

            <Text style={styles.formLabel}>Category</Text>
            <TouchableOpacity
              style={styles.categoryPickerBtn}
              onPress={() => setCategoryPicker(true)}
            >
              <Text style={styles.categoryPickerText}>{form.category}</Text>
            </TouchableOpacity>

            <Modal visible={categoryPicker} transparent animationType="slide">
              <View style={styles.pickerOverlay}>
                <View style={styles.pickerSheet}>
                  {CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat}
                      style={styles.pickerOption}
                      onPress={() => { setForm({ ...form, category: cat }); setCategoryPicker(false); }}
                    >
                      <Text style={[styles.pickerOptionText, form.category === cat && styles.pickerOptionSelected]}>
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable onPress={() => setCategoryPicker(false)}>
                    <Text style={styles.pickerCancel}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>

            <Text style={styles.formLabel}>Cost to Make (RM) *</Text>
            <TextInput
              style={styles.input}
              value={form.cost_per_unit}
              onChangeText={(t) => setForm({ ...form, cost_per_unit: t })}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />

            <Text style={styles.formLabel}>Selling Price (RM) *</Text>
            <TextInput
              style={styles.input}
              value={form.current_price}
              onChangeText={(t) => setForm({ ...form, current_price: t })}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />

            <Text style={styles.formLabel}>Monthly Sales Volume *</Text>
            <TextInput
              style={styles.input}
              value={form.monthly_volume}
              onChangeText={(t) => setForm({ ...form, monthly_volume: t })}
              keyboardType="number-pad"
              placeholder="0"
            />

            <Text style={styles.formLabel}>Competitor Price Low (RM)</Text>
            <TextInput
              style={styles.input}
              value={form.competitor_price_low}
              onChangeText={(t) => setForm({ ...form, competitor_price_low: t })}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />

            <Text style={styles.formLabel}>Competitor Price High (RM)</Text>
            <TextInput
              style={styles.input}
              value={form.competitor_price_high}
              onChangeText={(t) => setForm({ ...form, competitor_price_high: t })}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{editingId ? 'Update' : 'Add Item'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, padding: SPACING.md },
  emptyState: { alignItems: 'center', marginTop: SPACING.xl },
  emptyText: { fontSize: 16, color: COLORS.textSecondary },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 1,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  marginBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  marginBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  itemCategory: { fontSize: 12, color: COLORS.textSecondary, marginTop: SPACING.xs },
  itemDetails: { flexDirection: 'row', marginTop: SPACING.sm },
  detailCol: { flex: 1 },
  detailLabel: { fontSize: 11, color: COLORS.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  itemActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  editBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.primary },
  editBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textLight },
  deleteBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.red },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textLight },
  fab: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: { fontSize: 16, fontWeight: '700', color: COLORS.textLight },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalClose: { fontSize: 16, color: COLORS.primary },
  form: { padding: SPACING.md },
  formLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.md, marginBottom: SPACING.xs },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    fontSize: 16,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
  },
  categoryPickerBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  categoryPickerText: { fontSize: 16, color: COLORS.text },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  pickerOption: { paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerOptionText: { fontSize: 16, color: COLORS.text, textAlign: 'center' },
  pickerOptionSelected: { fontWeight: '700', color: COLORS.primary },
  pickerCancel: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.md },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.textLight },
});
