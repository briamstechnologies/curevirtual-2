import React from 'react';
import { TouchableOpacity, StyleSheet, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SHADOWS } from '../../theme/designSystem';

export default function FloatingChatbotButton() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('Chatbot')}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubbles" size={28} color={COLORS.white} />
        <View style={styles.badge}>
          <Ionicons name="add" size={12} color={COLORS.white} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    right: 20,
    zIndex: 9999,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.brandBlue,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  badge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: COLORS.brandGreen,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.brandBlue,
  }
});
