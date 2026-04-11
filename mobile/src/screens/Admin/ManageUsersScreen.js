import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

const DUMMY_USERS = [
  { id: '1', name: 'James Carter', role: 'PATIENT', email: 'james@example.com' },
  { id: '2', name: 'Dr. Sarah Wilson', role: 'DOCTOR', email: 'sarah@example.com' },
  { id: '3', name: 'BioCare Pharmacy', role: 'PHARMACY', email: 'biocare@example.com' },
];

export default function ManageUsersScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Users</Text>
      </View>
      <FlatList
        data={DUMMY_USERS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: item.role === 'DOCTOR' ? `${COLORS.brandBlue}15` : `${COLORS.brandGreen}15` }]}>
              <Text style={[styles.roleText, { color: item.role === 'DOCTOR' ? COLORS.brandBlue : COLORS.brandGreen }]}>{item.role}</Text>
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: RADIUS.base,
    padding: SPACING.lg, marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardInfo: { flex: 1 },
  name: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  email: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, marginTop: 2 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  roleText: { fontSize: TYPOGRAPHY.xs, fontWeight: 'bold' },
});
