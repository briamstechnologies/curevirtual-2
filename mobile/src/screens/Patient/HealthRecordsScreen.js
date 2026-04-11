import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

const DUMMY_RECORDS = [
  { id: '1', title: 'Annual Checkup Report', date: '2025-12-10', doctor: 'Dr. Sarah Wilson' },
  { id: '2', title: 'Blood Test Results', date: '2026-01-15', doctor: 'City Lab' },
  { id: '3', title: 'Vaccination Certificate', date: '2026-02-20', doctor: 'CureVirtual Clinic' },
];

export default function HealthRecordsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Health Records</Text>
        <Text style={styles.subtitle}>View your medical history and lab reports.</Text>

        {DUMMY_RECORDS.map((record) => (
          <TouchableOpacity key={record.id} style={styles.recordCard}>
            <View style={styles.recordIcon}>
              <Text style={styles.iconText}>📄</Text>
            </View>
            <View style={styles.recordInfo}>
              <Text style={styles.recordTitle}>{record.title}</Text>
              <Text style={styles.recordSub}>{record.date} • {record.doctor}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.uploadBtn}>
          <Text style={styles.uploadBtnText}>+ Upload New Record</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  scrollContent: { padding: SPACING.lg },
  title: { fontSize: TYPOGRAPHY.xxl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain },
  subtitle: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, marginBottom: SPACING.xl, marginTop: 4 },
  recordCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: RADIUS.base,
    padding: SPACING.lg, marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  recordIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.slate100, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.base },
  iconText: { fontSize: 22 },
  recordInfo: { flex: 1 },
  recordTitle: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  recordSub: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, marginTop: 2 },
  arrow: { fontSize: 24, color: COLORS.slate400, marginLeft: SPACING.sm },
  uploadBtn: { marginTop: SPACING.xl, borderDashArray: [5, 5], borderWidth: 2, borderColor: COLORS.brandGreen, borderRadius: RADIUS.base, padding: SPACING.xl, alignItems: 'center' },
  uploadBtnText: { color: COLORS.brandGreen, fontWeight: TYPOGRAPHY.bold, fontSize: TYPOGRAPHY.md },
});
