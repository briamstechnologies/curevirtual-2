import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

const DUMMY_TICKETS = [
  { id: '1', subject: 'Login Issue', user: 'James Carter', status: 'OPEN', priority: 'HIGH' },
  { id: '2', subject: 'Payment Failed', user: 'Linda Miller', status: 'RESOLVED', priority: 'MEDIUM' },
  { id: '3', subject: 'Doctor Not Found', user: 'Robert Benson', status: 'OPEN', priority: 'LOW' },
];

export default function SupportTicketsScreen() {
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.subject}>{item.subject}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: item.priority === 'HIGH' ? `${COLORS.danger}15` : `${COLORS.warning}15` }]}>
          <Text style={[styles.priorityText, { color: item.priority === 'HIGH' ? COLORS.danger : COLORS.warning }]}>{item.priority}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.userInfo}>User: {item.user}</Text>
        <View style={[styles.statusBadge, { borderColor: item.status === 'OPEN' ? COLORS.brandBlue : COLORS.slate300 }]}>
          <Text style={[styles.statusText, { color: item.status === 'OPEN' ? COLORS.brandBlue : COLORS.slate500 }]}>{item.status}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Support Tickets</Text>
      </View>
      <FlatList
        data={DUMMY_TICKETS}
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
  subject: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priorityText: { fontSize: 10, fontWeight: 'bold' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.slate50, paddingTop: SPACING.sm },
  userInfo: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  statusBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm },
  statusText: { fontSize: 10, fontWeight: 'bold' },
});
