import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

const StatCard = ({ label, value, icon, color = COLORS.brandGreen, onPress }) => {
  return (
    <TouchableOpacity 
      style={[styles.container, { borderTopColor: color }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.value}>{value}</Text>
        {icon && <Ionicons name={icon} size={20} color={color} />}
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.base,
    padding: SPACING.lg,
    margin: SPACING.xs,
    borderTopWidth: 4,
    ...SHADOWS.sm,
    minWidth: '30%', // Grid-friendly
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  value: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.textMain,
  },
  label: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default StatCard;
