/**
 * PatientNavigator.js — Primary Tab Navigator for Patients
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/Shared/HomeScreen';
import DoctorsListScreen from '../screens/Patient/DoctorsListScreen';
import AppointmentBookingScreen from '../screens/Patient/AppointmentBookingScreen';
import AppointmentsListScreen from '../screens/Patient/AppointmentsListScreen';
import HealthRecordsScreen from '../screens/Patient/HealthRecordsScreen';
import PrescriptionsListScreen from '../screens/Shared/PrescriptionsListScreen';
import MessagesScreen from '../screens/Shared/MessagesScreen';
import ChatScreen from '../screens/Shared/ChatScreen';
import ChatbotScreen from '../screens/Shared/ChatbotScreen';
import MapScreen from '../screens/Shared/MapScreen';
import VideoCallScreen from '../screens/Shared/VideoCallScreen';
import ProfileScreen from '../screens/Shared/ProfileScreen';
import SettingsScreen from '../screens/Shared/SettingsScreen';
import { COLORS } from '../../theme/designSystem';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Shared Header Right Component (Hamburger Toggle) ──
const DrawerButton = ({ navigation }) => (
  <Ionicons 
    name="menu" 
    size={28} 
    color={COLORS.brandGreen} 
    style={{ marginLeft: 16 }} 
    onPress={() => navigation.openDrawer()} 
  />
);

// ── Stacks ──
function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="PatientHome" component={HomeScreen} options={{ title: 'Dashboard', headerShown: false }} />
      <Stack.Screen name="Chatbot" component={ChatbotScreen} options={{ title: 'AI Health Assistant' }} />
      <Stack.Screen name="Map" component={MapScreen} options={{ title: 'Nearby Services' }} />
      <Stack.Screen name="Doctors" component={DoctorsListScreen} options={{ title: 'Find Doctors' }} />
      <Stack.Screen name="Booking" component={AppointmentBookingScreen} options={{ title: 'Book Appointment' }} />
      <Stack.Screen name="HealthRecords" component={HealthRecordsScreen} options={{ title: 'Health Records' }} />
      <Stack.Screen name="Prescriptions" component={PrescriptionsListScreen} options={{ title: 'My Prescriptions' }} />
      <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ title: 'Instant Consultation' }} />
    </Stack.Navigator>
  );
}

function AppointmentsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AppointmentsList" component={AppointmentsListScreen} options={{ title: 'My Appointments' }} />
      <Stack.Screen name="Booking" component={AppointmentBookingScreen} options={{ title: 'Book New' }} />
    </Stack.Navigator>
  );
}

function MessagesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Inbox" component={MessagesScreen} options={{ title: 'Messages' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: route.params?.name || 'Chat' })} />
    </Stack.Navigator>
  );
}

const TAB_ICONS = {
  HomeTab: { focused: 'home', unfocused: 'home-outline' },
  AppointmentsTab: { focused: 'calendar', unfocused: 'calendar-outline' },
  MessagesTab: { focused: 'mail', unfocused: 'mail-outline' },
  ProfileTab: { focused: 'person', unfocused: 'person-outline' },
  SettingsTab: { focused: 'settings', unfocused: 'settings-outline' },
};

export default function PatientNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerLeft: (props) => <DrawerButton {...props} />, // Will be wired to Drawer
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
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ tabBarLabel: 'Home', title: 'CureVirtual' }} />
      <Tab.Screen name="AppointmentsTab" component={AppointmentsStack} options={{ tabBarLabel: 'Bookings', title: 'Appointments' }} />
      <Tab.Screen name="MessagesTab" component={MessagesStack} options={{ tabBarLabel: 'Chat', title: 'Messages' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarLabel: 'Profile', title: 'My Profile' }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ tabBarLabel: 'Settings', title: 'Settings' }} />
    </Tab.Navigator>
  );
}
