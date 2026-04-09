import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SPACING } from '../../../theme/designSystem';

const StatGrid = ({ children }) => {
  return (
    <View style={styles.grid}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs, // Offset margins of items
    marginBottom: SPACING.lg,
  },
});

export default StatGrid;
