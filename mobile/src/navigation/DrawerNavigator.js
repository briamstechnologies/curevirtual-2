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
const logo = require('../../../assets/images/logo.png');

function CustomDrawerContent(props) {
  const { user, logout } = useContext(AuthContext);
  const role = user?.role?.toUpperCase();
  const displayName = user?.firstName || user?.name || 'User';

  const menuItems = {
    PATIENT: [
      { label: 'Dashboard', icon: 'home', target: 'HomeTab' },
      { label: 'Doctors', icon: 'medkit', target: 'HomeTab', screen: 'Doctors' },
      { label: 'Appointments', icon: 'calendar', target: 'AppointmentsTab' },
      { label: 'Video Calls', icon: 'videocam', target: 'HomeTab', screen: 'VideoCall' },
      { label: 'Health Records', icon: 'document-text', target: 'HomeTab', screen: 'HealthRecords' },
      { label: 'Prescriptions', icon: 'medical', target: 'HomeTab', screen: 'Prescriptions' },
      { label: 'Messages', icon: 'mail', target: 'MessagesTab' },
      { label: 'Profile', icon: 'person', target: 'ProfileTab' },
      { label: 'Settings', icon: 'settings', target: 'SettingsTab' },
    ],
    DOCTOR: [
      { label: 'Dashboard', icon: 'home', target: 'HomeTab' },
      { label: 'Appointments', icon: 'calendar', target: 'HomeTab' },
      { label: 'Schedules', icon: 'time', target: 'HomeTab', screen: 'Schedules' },
      { label: 'My Patients', icon: 'people', target: 'PatientsTab' },
      { label: 'Prescriptions', icon: 'medical', target: 'HomeTab', screen: 'Prescriptions' },
      { label: 'Video Calls', icon: 'videocam', target: 'HomeTab', screen: 'VideoCall' },
      { label: 'Messages', icon: 'mail', target: 'MessagesTab' },
      { label: 'Profile', icon: 'person', target: 'ProfileTab' },
      { label: 'Settings', icon: 'settings', target: 'SettingsTab' },
    ],
    PHARMACY: [
      { label: 'Dashboard', icon: 'home', target: 'HomeTab' },
      { label: 'Orders', icon: 'cart', target: 'HomeTab', screen: 'Orders' },
      { label: 'Inventory', icon: 'cube', target: 'InventoryTab' },
      { label: 'Medicines', icon: 'medkit', target: 'InventoryTab', screen: 'Medicines' },
      { label: 'Messages', icon: 'mail', target: 'MessagesTab' },
      { label: 'Profile', icon: 'person', target: 'ProfileTab' },
      { label: 'Settings', icon: 'settings', target: 'SettingsTab' },
    ],
    ADMIN: [
      { label: 'Dashboard', icon: 'home', target: 'HomeTab' },
      { label: 'Manage Users', icon: 'people', target: 'UsersTab' },
      { label: 'Reports', icon: 'bar-chart', target: 'ReportsTab' },
      { label: 'Support Tickets', icon: 'help-buoy', target: 'TicketsTab' },
      { label: 'Settings', icon: 'settings', target: 'SettingsTab' },
    ],
  };

  const items = menuItems[role] || menuItems['ADMIN'];

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      <View style={styles.drawerHeader}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userRole}>{role} Panel</Text>
      </View>

      <View style={styles.itemsContainer}>
        {items.map((item, index) => (
          <DrawerItem
            key={index}
            label={item.label}
            icon={({ color, size }) => <Ionicons name={item.icon} size={size} color={color} />}
            onPress={() => {
              if (item.screen) {
                props.navigation.navigate(item.target, { screen: item.screen });
              } else {
                props.navigation.navigate(item.target);
              }
            }}
            activeTintColor={COLORS.brandGreen}
            inactiveTintColor={COLORS.textMuted}
            labelStyle={styles.itemLabel}
          />
        ))}
      </View>

      <View style={styles.drawerFooter}>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
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
        drawerActiveBackgroundColor: `${COLORS.brandGreen}10`,
        drawerActiveTintColor: COLORS.brandGreen,
        drawerInactiveTintColor: COLORS.textMuted,
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
    backgroundColor: COLORS.bgMuted,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
    marginBottom: SPACING.md,
  },
  logo: { width: 60, height: 60, marginBottom: SPACING.md },
  userName: { fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  userRole: { fontSize: TYPOGRAPHY.xs, color: COLORS.brandGreen, fontWeight: 'bold', marginTop: 4, textTransform: 'uppercase' },
  itemsContainer: { flex: 1 },
  itemLabel: { fontSize: TYPOGRAPHY.sm, fontWeight: '600', marginLeft: -16 },
  drawerFooter: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate100,
  },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.sm },
  logoutText: { color: COLORS.danger, fontWeight: 'bold', fontSize: TYPOGRAPHY.md },
});
