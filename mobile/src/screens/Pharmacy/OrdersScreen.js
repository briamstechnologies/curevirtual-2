import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../theme/designSystem';

const DUMMY_ORDERS = [
  { id: '1', customer: 'James Carter', items: '2 items', total: '$25.00', status: 'PENDING' },
  { id: '2', customer: 'Linda Miller', items: '1 item', total: '$12.00', status: 'COMPLETED' },
];

export default function OrdersScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Prescription Orders</Text>
      </View>
      <FlatList
        data={DUMMY_ORDERS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.customer}>{item.customer}</Text>
              <View style={[styles.statusBadge, { backgroundColor: item.status === 'COMPLETED' ? `${COLORS.success}15` : `${COLORS.brandOrange}15` }]}>
                <Text style={[styles.statusText, { color: item.status === 'COMPLETED' ? COLORS.success : COLORS.brandOrange }]}>{item.status}</Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.details}>{item.items} • {item.total}</Text>
              <TouchableOpacity style={styles.viewBtn}>
                <Text style={styles.viewBtnText}>Process</Text>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  customer: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  statusText: { fontSize: TYPOGRAPHY.xs, fontWeight: 'bold' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.slate100, paddingTop: SPACING.sm },
  details: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted },
  viewBtn: { paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: RADIUS.sm, backgroundColor: COLORS.brandGreen },
  viewBtnText: { color: COLORS.white, fontSize: TYPOGRAPHY.xs, fontWeight: '600' },
});
