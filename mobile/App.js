/**
 * App.js — CureVirtual Mobile Root
 * Wraps the app with AuthProvider, SafeAreaProvider, and NavigationContainer.
 */

import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator />
          {/* Use dark-content for light backgrounds */}
          <StatusBar style="dark" backgroundColor="#f8fafc" />
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
