import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../theme/designSystem';

const DashboardSection = ({ title, onViewAll, children }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.slate700,
  },
  viewAll: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.brandGreen,
    fontWeight: TYPOGRAPHY.bold,
  },
  content: {
    gap: SPACING.base,
  },
});

export default DashboardSection;
