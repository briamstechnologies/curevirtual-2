/**
 * DoctorNavigator.js — Primary Tab Navigator for Doctors
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/Shared/HomeScreen';
import PatientHistoryScreen from '../screens/Doctor/PatientHistoryScreen';
import MyPatientsScreen from '../screens/Doctor/MyPatientsScreen';
import SchedulesScreen from '../screens/Doctor/SchedulesScreen';
import VideoCallScreen from '../screens/Shared/VideoCallScreen';
import PrescriptionsListScreen from '../screens/Shared/PrescriptionsListScreen';
import MessagesScreen from '../screens/Shared/MessagesScreen';
import ChatScreen from '../screens/Shared/ChatScreen';
import ProfileScreen from '../screens/Shared/ProfileScreen';
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
      <Stack.Screen name="DoctorHome" component={HomeScreen} options={{ title: 'Dashboard', headerShown: false }} />
      <Stack.Screen name="PatientHistory" component={PatientHistoryScreen} options={{ title: 'Patient Records' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: route.params?.name || 'Chat' })} />
      <Stack.Screen name="Schedules" component={SchedulesScreen} options={{ title: 'Manage Schedule' }} />
      <Stack.Screen name="Prescriptions" component={PrescriptionsListScreen} options={{ title: 'Prescriptions' }} />
      <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ title: 'Instant Consultation' }} />
    </Stack.Navigator>
  );
}

function PatientsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MyPatientsList" component={MyPatientsScreen} options={{ title: 'My Patients' }} />
      <Stack.Screen name="PatientHistory" component={PatientHistoryScreen} options={{ title: 'Patient Records' }} />
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
  PatientsTab: { focused: 'people', unfocused: 'people-outline' },
  MessagesTab: { focused: 'mail', unfocused: 'mail-outline' },
  ProfileTab: { focused: 'person', unfocused: 'person-outline' },
  SettingsTab: { focused: 'settings', unfocused: 'settings-outline' },
};

export default function DoctorNavigator() {
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
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ tabBarLabel: 'Home', title: 'Doctor Console' }} />
      <Tab.Screen name="PatientsTab" component={PatientsStack} options={{ tabBarLabel: 'Patients', title: 'My Patients' }} />
      <Tab.Screen name="MessagesTab" component={MessagesStack} options={{ tabBarLabel: 'Chat', title: 'Messages' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarLabel: 'Profile', title: 'My Profile' }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ tabBarLabel: 'Settings', title: 'Settings' }} />
    </Tab.Navigator>
  );
}
