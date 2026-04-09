import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

const logo = require('../../../assets/images/logo.png');

const DashboardHeader = ({ name, role, onNotificationPress, onProfilePress, onMenuPress }) => {
  // Deterministic greeting based on hour
  const hour = new Date().getHours();
  let greeting = "Good Morning";
  if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
  if (hour >= 17) greeting = "Good Evening";

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.logoWrapper} onPress={onMenuPress}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={onNotificationPress}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.textMain} />
            <View style={styles.dot} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn} onPress={onProfilePress}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name ? name[0] : 'U'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.greetingSection}>
        <Text style={styles.greetingText}>{greeting}, {name} 👋</Text>
        <Text style={styles.roleText}>{role} Dashboard</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.bgMuted,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoWrapper: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    ...SHADOWS.sm,
  },
  logo: { width: 30, height: 30 },
  headerRight: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: SPACING.base 
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  dot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brandOrange,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brandGreen,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.bold,
    fontSize: TYPOGRAPHY.base,
  },
  greetingSection: {
    marginTop: SPACING.xs,
  },
  greetingText: {
    fontSize: TYPOGRAPHY.xxl,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.textMain,
  },
  roleText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.brandGreen,
    fontWeight: TYPOGRAPHY.bold,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default DashboardHeader;
