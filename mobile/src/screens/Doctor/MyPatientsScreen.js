import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../theme/designSystem';

const DUMMY_PATIENTS = [
  { id: '1', name: 'James Carter', lastVisit: '2026-03-25', condition: 'Hypertension' },
  { id: '2', name: 'Linda Miller', lastVisit: '2026-04-02', condition: 'Type 2 Diabetes' },
  { id: '3', name: 'Robert Benson', lastVisit: '2026-04-05', condition: 'General Checkup' },
];

export default function MyPatientsScreen({ navigation }) {
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('PatientHistory', { patientId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.condition}>{item.condition}</Text>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.lastVisit}>Last Visit: {item.lastVisit}</Text>
        <Text style={styles.viewLink}>View History ›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Patients</Text>
        <Text style={styles.subtitle}>You have {DUMMY_PATIENTS.length} assigned patients.</Text>
      </View>
      <FlatList
        data={DUMMY_PATIENTS}
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
  title: { fontSize: TYPOGRAPHY.xxl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain },
  subtitle: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, marginTop: 4 },
  listContent: { padding: SPACING.lg },
  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.base,
    padding: SPACING.lg, marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  name: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  condition: { fontSize: TYPOGRAPHY.xs, color: COLORS.brandBlue, fontWeight: 'bold', backgroundColor: `${COLORS.brandBlue}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.slate50, paddingTop: SPACING.sm },
  lastVisit: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  viewLink: { fontSize: TYPOGRAPHY.xs, color: COLORS.brandGreen, fontWeight: 'bold' },
});
