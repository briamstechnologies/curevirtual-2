import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../theme/designSystem';

const DUMMY_MEDICINES = [
  { id: '1', name: 'Paracetamol 500mg', category: 'Analgesic', price: '$5.00' },
  { id: '2', name: 'Amoxicillin 250mg', category: 'Antibiotic', price: '$12.00' },
  { id: '3', name: 'Cetirizine 10mg', category: 'Antihistamine', price: '$8.50' },
];

export default function MedicinesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Medicines Catalog</Text>
        <TextInput style={styles.searchBar} placeholder="Search medicines..." />
      </View>
      <FlatList
        data={DUMMY_MEDICINES}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.medName}>{item.name}</Text>
              <Text style={styles.medCat}>{item.category}</Text>
            </View>
            <Text style={styles.price}>{item.price}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  header: { padding: SPACING.lg, backgroundColor: COLORS.white },
  title: { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain, marginBottom: SPACING.base },
  searchBar: { ...StyleSheet.flatten(COLORS.COMPONENTS?.input), height: 44, paddingVertical: 0, paddingHorizontal: SPACING.md },
  listContent: { padding: SPACING.lg },
  card: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: RADIUS.base,
    padding: SPACING.lg, marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardInfo: { flex: 1 },
  medName: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  medCat: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, marginTop: 2 },
  price: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.black, color: COLORS.brandGreen },
});
