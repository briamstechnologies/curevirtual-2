import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

const DUMMY_PRESCRIPTIONS = [
  { id: '1', medicine: 'Amoxicillin 500mg', patient: 'James Carter', date: '2026-04-05', status: 'DISPENSED' },
  { id: '2', medicine: 'Lisinopril 10mg', patient: 'Linda Miller', date: '2026-04-08', status: 'SENT' },
];

export default function PrescriptionsListScreen({ route }) {
  const isPatient = route.name?.includes('Patient');

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.medicine}>{item.medicine}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'DISPENSED' ? `${COLORS.success}15` : `${COLORS.brandOrange}15` }]}>
          <Text style={[styles.statusText, { color: item.status === 'DISPENSED' ? COLORS.success : COLORS.brandOrange }]}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.detail}>{isPatient ? `Prescribed on ${item.date}` : `For ${item.patient}`}</Text>
        <TouchableOpacity style={styles.viewBtn}>
          <Text style={styles.viewBtnText}>View Rx</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Prescriptions</Text>
      </View>
      <FlatList
        data={DUMMY_PRESCRIPTIONS}
        keyExtractor={item => item.id}
        renderItem={renderItem}
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
  medicine: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  statusText: { fontSize: TYPOGRAPHY.xs, fontWeight: 'bold' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.slate50, paddingTop: SPACING.sm },
  detail: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  viewBtn: { paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: RADIUS.sm, backgroundColor: COLORS.bgInput },
  viewBtnText: { color: COLORS.textSoft, fontSize: TYPOGRAPHY.xs, fontWeight: '600' },
});
