/**
 * DrawerNavigator.js — Root navigator that handles role-based side menu
 */

import React, { useContext } from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme/designSystem';

import PatientNavigator from './PatientNavigator';
import DoctorNavigator from './DoctorNavigator';
import PharmacyNavigator from './PharmacyNavigator';
import AdminNavigator from './AdminNavigator';

const Drawer = createDrawerNavigator();
const logo = require('../../assets/images/logo.png');

function CustomDrawerContent(props) {
  const { user, logout } = useContext(AuthContext);
  const role = user?.role?.toUpperCase();
  const displayName = user?.firstName || user?.name || 'Doctor Panel';
  
  // Role-based menu items mapped to their respective Tab Navigators
  const menuItems = {
    PATIENT: [
      { label: 'Dashboard', icon: 'bar-chart', target: 'HomeTab' },
      { label: 'Appointments', icon: 'calendar', target: 'AppointmentsTab' },
      { label: 'Prescriptions', icon: 'document-text', target: 'HomeTab', screen: 'Prescriptions' },
      { label: 'My Doctors', icon: 'people', target: 'HomeTab', screen: 'Doctors' },
      { label: 'Video Call', icon: 'videocam', target: 'HomeTab', screen: 'VideoCall' },
      { label: 'Messages', icon: 'mail', target: 'MessagesTab' },
      { label: 'Profile', icon: 'person', target: 'ProfileTab' },
    ],
    DOCTOR: [
      { label: 'Dashboard', icon: 'bar-chart', target: 'HomeTab' },
      { label: 'Appointments', icon: 'calendar', target: 'HomeTab', screen: 'Schedules' },
      { label: 'My Patients', icon: 'people', target: 'PatientsTab' },
      { label: 'Prescriptions', icon: 'document-text', target: 'HomeTab', screen: 'Prescriptions' },
      { label: 'Video Call', icon: 'videocam', target: 'HomeTab', screen: 'VideoCall' },
      { label: 'Messages', icon: 'mail', target: 'MessagesTab' },
      { label: 'Profile', icon: 'person', target: 'ProfileTab' },
    ],
    PHARMACY: [
      { label: 'Dashboard', icon: 'bar-chart', target: 'HomeTab' },
      { label: 'Stock Inventory', icon: 'cube', target: 'InventoryTab' },
      { label: 'Orders', icon: 'cart', target: 'HomeTab', screen: 'Orders' },
      { label: 'Messages', icon: 'mail', target: 'MessagesTab' },
      { label: 'Profile', icon: 'person', target: 'ProfileTab' },
    ],
    ADMIN: [
      { label: 'Dashboard', icon: 'bar-chart', target: 'HomeTab' },
      { label: 'User Mgmt', icon: 'people', target: 'UsersTab' },
      { label: 'Support Tickets', icon: 'help-buoy', target: 'TicketsTab' },
      { label: 'Reports', icon: 'stats-chart', target: 'ReportsTab' },
      { label: 'Messages', icon: 'mail', target: 'MessagesTab' },
      { label: 'Settings', icon: 'settings', target: 'SettingsTab' },
    ],
    SUPERADMIN: [
      { label: 'Admin Dashboard', icon: 'shield-checkmark', target: 'HomeTab' },
      { label: 'User Mgmt', icon: 'people', target: 'UsersTab' },
      { label: 'Reports', icon: 'stats-chart', target: 'ReportsTab' },
      { label: 'Settings', icon: 'settings', target: 'SettingsTab' },
    ],
  };

  // Harmonized roles for label
  const roleLabel = role ? `${role} PANEL` : 'CUREVIRTUAL';
  const items = menuItems[role] || menuItems['DOCTOR'];

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1, backgroundColor: COLORS.brandGreen }}>
      {/* ── Header Area ── */}
      <View style={styles.drawerHeader}>
        {/* Close Button X */}
        <TouchableOpacity style={styles.closeButton} onPress={() => props.navigation.closeDrawer()}>
          <Ionicons name="close" size={24} color={COLORS.white} />
        </TouchableOpacity>
        
        <View style={styles.brandGroup}>
          <View style={styles.logoWrapper}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </View>
          <View>
            <Text style={styles.brandTitle}>CureVirtual</Text>
            <Text style={styles.userRole}>● {roleLabel}</Text>
          </View>
        </View>
      </View>

      {/* ── Items Container ── */}
      <View style={styles.itemsContainer}>
        {items.map((item, index) => {
          // Detect if active
          const isDashboard = item.label === 'Dashboard';
          
          return (
            <DrawerItem
              key={index}
              label={item.label}
              icon={({ color, size }) => <Ionicons name={item.icon} size={20} color={isDashboard ? COLORS.brandGreen : COLORS.white} />}
              onPress={() => {
                if (item.screen) {
                  props.navigation.navigate('MainTabs', {
                    screen: item.target,
                    params: { screen: item.screen }
                  });
                } else {
                  props.navigation.navigate('MainTabs', { screen: item.target });
                }
              }}
              activeTintColor={COLORS.brandGreen}
              inactiveTintColor={COLORS.white}
              labelStyle={[styles.itemLabel, { color: isDashboard ? COLORS.brandGreen : COLORS.white }]}
              style={[
                styles.drawerItemBase, 
                isDashboard ? styles.drawerItemActive : null
              ]}
              focused={isDashboard}
            />
          );
        })}
      </View>

      {/* ── Footer ── */}
      <View style={styles.drawerFooter}>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

export default function DrawerNavigator() {
  const { user } = useContext(AuthContext);
  const role = user?.role?.toUpperCase();

  const getComponent = () => {
    if (role === 'PATIENT') return PatientNavigator;
    if (role === 'DOCTOR') return DoctorNavigator;
    if (role === 'PHARMACY') return PharmacyNavigator;
    return AdminNavigator;
  };

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: COLORS.brandGreen, // the drawer solid background
          width: 320,
        },
        drawerType: 'front',
      }}
    >
      <Drawer.Screen name="MainTabs" component={getComponent()} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    padding: SPACING.xl,
    paddingTop: SPACING.xl,
    backgroundColor: COLORS.brandGreen,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  logo: {
    width: 28,
    height: 28,
    opacity: 1, // Optional tint if required
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  userRole: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: 'bold',
    marginTop: 2,
    letterSpacing: 1,
  },
  itemsContainer: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  drawerItemBase: {
    borderRadius: 16, // Matching the rounded pill in the snapshot
    marginVertical: 2,
    paddingLeft: 4,
  },
  drawerItemActive: {
    backgroundColor: COLORS.white,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: -16, // Compact icon distance
  },
  drawerFooter: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  logoutText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: TYPOGRAPHY.md,
  },
});
