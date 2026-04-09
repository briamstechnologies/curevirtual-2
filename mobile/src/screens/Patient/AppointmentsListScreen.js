import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../theme/designSystem';

const DUMMY_APPOINTMENTS = [
  { id: '1', doctor: 'Dr. Sarah Wilson', date: '2026-04-12', time: '10:00 AM', status: 'CONFIRMED' },
  { id: '2', doctor: 'Dr. Robert Benson', date: '2026-04-15', time: '02:30 PM', status: 'PENDING' },
  { id: '3', doctor: 'Dr. Sarah Wilson', date: '2026-03-20', time: '11:00 AM', status: 'COMPLETED' },
];

export default function AppointmentsListScreen() {
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.doctorName}>{item.doctor}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'CONFIRMED' ? `${COLORS.success}15` : `${COLORS.warning}15` }]}>
          <Text style={[styles.statusText, { color: item.status === 'CONFIRMED' ? COLORS.success : COLORS.warning }]}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.dateTime}>{item.date} at {item.time}</Text>
        <TouchableOpacity style={styles.detailsBtn}>
          <Text style={styles.detailsBtnText}>Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All Appointments</Text>
      </View>
      <FlatList
        data={DUMMY_APPOINTMENTS}
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
  doctorName: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  statusText: { fontSize: TYPOGRAPHY.xs, fontWeight: 'bold' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.slate50, paddingTop: SPACING.sm },
  dateTime: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted },
  detailsBtn: { paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: RADIUS.sm, backgroundColor: COLORS.bgInput },
  detailsBtnText: { color: COLORS.textSoft, fontSize: TYPOGRAPHY.xs, fontWeight: '600' },
});
