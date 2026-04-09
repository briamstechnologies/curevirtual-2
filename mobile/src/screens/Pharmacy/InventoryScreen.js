import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../theme/designSystem';

const DUMMY_INVENTORY = [
  { id: '1', name: 'Paracetamol', stock: 500, unit: 'Tabs', expiry: '2027-05' },
  { id: '2', name: 'Amoxicillin', stock: 120, unit: 'Caps', expiry: '2026-11' },
  { id: '3', name: 'Cough Syrup', stock: 45, unit: 'Bottles', expiry: '2026-08' },
];

export default function InventoryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory Management</Text>
      </View>
      <FlatList
        data={DUMMY_INVENTORY}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.medName}>{item.name}</Text>
              <Text style={styles.expiry}>Exp: {item.expiry}</Text>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.stock}>Stock: {item.stock} {item.unit}</Text>
              <TouchableOpacity style={styles.restockBtn}>
                <Text style={styles.restockBtnText}>Restock</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  header: { padding: SPACING.lg },
  title: { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain },
  listContent: { padding: SPACING.lg },
  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.base,
    padding: SPACING.lg, marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  medName: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  expiry: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.slate50, paddingTop: SPACING.sm },
  stock: { fontSize: TYPOGRAPHY.sm, color: COLORS.brandGreen, fontWeight: 'bold' },
  restockBtn: { paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: RADIUS.sm, backgroundColor: COLORS.brandGreen },
  restockBtnText: { color: COLORS.white, fontSize: TYPOGRAPHY.xs, fontWeight: '600' },
});
