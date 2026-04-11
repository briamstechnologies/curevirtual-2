import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

export default function SettingsScreen() {
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Push Notifications</Text>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: COLORS.brandGreen }} />
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Dark Mode</Text>
            <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: COLORS.brandGreen }} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Help Center</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Privacy Policy</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Terms of Service</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Version 1.0.0 (Build 123)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  scrollContent: { padding: SPACING.lg },
  title: { fontSize: TYPOGRAPHY.xxl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain, marginBottom: SPACING.xl },
  section: { backgroundColor: COLORS.white, borderRadius: RADIUS.base, paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl, ...SHADOWS.sm },
  sectionTitle: { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.bold, color: COLORS.brandGreen, marginTop: SPACING.lg, marginBottom: SPACING.sm, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.slate100 },
  rowLabel: { fontSize: TYPOGRAPHY.md, color: COLORS.textMain, fontWeight: TYPOGRAPHY.medium },
  arrow: { fontSize: 24, color: COLORS.slate400 },
  version: { textAlign: 'center', color: COLORS.textPlaceholder, fontSize: TYPOGRAPHY.xs, marginTop: SPACING.xl },
});
