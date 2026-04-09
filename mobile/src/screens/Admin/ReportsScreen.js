import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../theme/designSystem';

export default function ReportsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>System Reports</Text>
        
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Revenue This Month</Text>
          <Text style={styles.statValue}>$12,450.00</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Active Users</Text>
          <Text style={styles.statValue}>1,204</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>New Registrations (24h)</Text>
          <Text style={styles.statValue}>24</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  scrollContent: { padding: SPACING.lg },
  title: { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain, marginBottom: SPACING.xl },
  statBox: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.base,
    padding: SPACING.xl, marginBottom: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
    borderLeftWidth: 5, borderLeftColor: COLORS.brandGreen,
  },
  statLabel: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold' },
  statValue: { fontSize: TYPOGRAPHY.xxl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain, marginTop: 4 },
});
