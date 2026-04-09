import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function VideoCallScreen({ navigation, route }) {
  // Mock Video Call stub as ZegoCloud requires native linking
  
  const endCall = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.videoContainer}>
        <Text style={styles.placeholderText}>Remote Video Feed</Text>
        <View style={styles.localVideo}>
          <Text style={styles.localText}>Local</Text>
        </View>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton}>
          <Ionicons name="mic-off" size={28} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.controlButton, styles.endCallButton]} onPress={endCall}>
          <Ionicons name="call" size={28} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton}>
          <Ionicons name="videocam-off" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e293b' },
  videoContainer: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 18,
    fontWeight: 'bold',
  },
  localVideo: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 100,
    height: 150,
    backgroundColor: '#334155',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  localText: { color: '#94a3b8', fontSize: 14 },
  controlsContainer: {
    height: 100,
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallButton: {
    backgroundColor: '#ef4444',
  }
});
