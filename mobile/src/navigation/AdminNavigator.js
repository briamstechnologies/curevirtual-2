/**
 * AdminNavigator.js — Primary Tab Navigator for Admin / SuperAdmin / Support
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/Shared/HomeScreen';
import ManageUsersScreen from '../screens/Admin/ManageUsersScreen';
import ReportsScreen from '../screens/Admin/ReportsScreen';
import SupportTicketsScreen from '../screens/Admin/SupportTicketsScreen';
import SettingsScreen from '../screens/Shared/SettingsScreen';
import { COLORS } from '../../theme/designSystem';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const DrawerButton = ({ navigation }) => (
  <Ionicons 
    name="menu" 
    size={28} 
    color={COLORS.brandGreen} 
    style={{ marginLeft: 16 }} 
    onPress={() => navigation.openDrawer()} 
  />
);

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AdminHome" component={HomeScreen} options={{ title: 'Dashboard', headerShown: false }} />
      <Stack.Screen name="Users" component={ManageUsersScreen} options={{ title: 'User Management' }} />
    </Stack.Navigator>
  );
}

function TicketsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TicketsList" component={SupportTicketsScreen} options={{ title: 'Support Tickets' }} />
    </Stack.Navigator>
  );
}

const TAB_ICONS = {
  HomeTab: { focused: 'shield-checkmark', unfocused: 'shield-checkmark-outline' },
  UsersTab: { focused: 'people', unfocused: 'people-outline' },
  TicketsTab: { focused: 'help-buoy', unfocused: 'help-buoy-outline' },
  ReportsTab: { focused: 'bar-chart', unfocused: 'bar-chart-outline' },
  SettingsTab: { focused: 'settings', unfocused: 'settings-outline' },
};

export default function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerLeft: (props) => <DrawerButton {...props} />,
        tabBarActiveTintColor: COLORS.brandGreen,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.slate200,
          height: 60,
          paddingBottom: 8,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = icons ? (focused ? icons.focused : icons.unfocused) : 'ellipse';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ tabBarLabel: 'Home', title: 'Admin Panel' }} />
      <Tab.Screen name="UsersTab" component={ManageUsersScreen} options={{ tabBarLabel: 'Users', title: 'User Management' }} />
      <Tab.Screen name="TicketsTab" component={TicketsStack} options={{ tabBarLabel: 'Support', title: 'Tickets' }} />
      <Tab.Screen name="ReportsTab" component={ReportsScreen} options={{ tabBarLabel: 'Reports', title: 'Reports' }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ tabBarLabel: 'Settings', title: 'Settings' }} />
    </Tab.Navigator>
  );
}
