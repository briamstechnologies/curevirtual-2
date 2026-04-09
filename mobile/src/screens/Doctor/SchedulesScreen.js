import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../theme/designSystem';

export default function SchedulesScreen() {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Work Schedule</Text>
        <Text style={styles.subtitle}>Manage your availability for consultations.</Text>

        {days.map((day) => (
          <View key={day} style={styles.dayRow}>
            <View style={styles.dayInfo}>
              <Text style={styles.dayName}>{day}</Text>
              <Text style={styles.status}>Available: 09:00 AM - 05:00 PM</Text>
            </View>
            <TouchableOpacity style={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  scrollContent: { padding: SPACING.lg },
  title: { fontSize: TYPOGRAPHY.xxl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain },
  subtitle: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, marginBottom: SPACING.xl },
  dayRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: RADIUS.base,
    padding: SPACING.lg, marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  dayInfo: { flex: 1 },
  dayName: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  status: { fontSize: TYPOGRAPHY.xs, color: COLORS.brandGreen, marginTop: 4, fontWeight: 'bold' },
  editBtn: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.brandGreen },
  editBtnText: { color: COLORS.brandGreen, fontSize: TYPOGRAPHY.sm, fontWeight: '600' },
});
