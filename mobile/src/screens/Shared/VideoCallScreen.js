import React, { useEffect, useState, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';
import { useSocket } from '../../hooks/useSocket';

export default function VideoCallScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for active mock call
  const [activeCall, setActiveCall] = useState(null);

  // Hook into socket events
  const { emit } = useSocket({
    'call-missed': (data) => {
      console.log('Call missed:', data);
    },
    'call-accepted': (data) => {
      console.log('Call accepted by counterparty:', data);
    }
  });

  const fetchConsultations = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await api.get('/videocall/list', {
        params: { userId: user.id, role: user.role }
      });
      const data = res.data?.data || res.data || [];
      setConsultations(data.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt)));
    } catch (err) {
      console.error('[VideoCallScreen] Failed to fetch consultations:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  const endCall = () => {
    if (activeCall) {
      emit('leave_room', activeCall.meetingUrl || `consult-${activeCall.id}`);
      emit('end_session', { roomId: activeCall.meetingUrl || `consult-${activeCall.id}` });
    }
    setActiveCall(null);
  };

  const startCall = (consult) => {
    const roomId = consult.meetingUrl || `consult-${consult.id}`;
    // Notify server we are ready
    emit('join_room', { 
      roomId, 
      appointmentId: consult.appointmentId || consult.id // Adjust based on data structure
    });
    
    // Broadcast generic session start
    emit('start_session', {
      roomId,
      doctorName: user?.name,
      patientId: user?.role === 'DOCTOR' ? consult.patientId : user?.id,
      appointmentId: consult.id
    });
    
    setActiveCall(consult);
  };


  if (activeCall) {
    return (
      <SafeAreaView style={styles.callContainer}>
        <View style={styles.videoHeader}>
          <Text style={styles.videoRoomText}>Room: {activeCall.meetingUrl || `consult-${activeCall.id}`}</Text>
        </View>
        <View style={styles.videoContainer}>
          <Text style={styles.placeholderText}>Waiting for {user?.role === 'PATIENT' ? 'Doctor' : 'Patient'} to join...</Text>
          <View style={styles.localVideo}>
            <Ionicons name="person" size={40} color="#94a3b8" />
            <Text style={styles.localText}>You</Text>
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

  const renderItem = ({ item }) => {
    const isScheduled = item.status === 'SCHEDULED' || item.status === 'ONGOING';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Consultation</Text>
          <View style={[styles.statusBadge, { backgroundColor: isScheduled ? COLORS.brandBlue + '20' : COLORS.brandGreen + '20' }]}>
            <Text style={[styles.statusText, { color: isScheduled ? COLORS.brandBlue : COLORS.brandGreen }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.infoText}>Duration: {item.durationMins || 30} mins</Text>
          <Text style={styles.infoText}>Time: {new Date(item.scheduledAt).toLocaleString()}</Text>
        </View>

        {isScheduled && (
          <TouchableOpacity style={styles.joinBtn} onPress={() => startCall(item)}>
            <Ionicons name="videocam" size={20} color={COLORS.white} />
            <Text style={styles.joinBtnText}>Enter Hub</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Video Consultations</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brandGreen} />
        </View>
      ) : (
        <FlatList
          data={consultations}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No consultation history found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  header: { padding: SPACING.lg, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.slate100 },
  title: { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: SPACING.md },
  
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  cardTitle: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  statusText: { fontSize: TYPOGRAPHY.xs, fontWeight: TYPOGRAPHY.bold },
  cardBody: { marginBottom: SPACING.md },
  infoText: { fontSize: TYPOGRAPHY.sm, color: COLORS.textSoft, marginBottom: 4 },
  joinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.brandBlue, padding: SPACING.md, borderRadius: RADIUS.sm, gap: 8 },
  joinBtnText: { color: COLORS.white, fontWeight: TYPOGRAPHY.bold, fontSize: TYPOGRAPHY.sm },

  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: TYPOGRAPHY.base, textAlign: 'center' },

  // Call View Styles
  callContainer: { flex: 1, backgroundColor: '#0f172a' },
  videoHeader: { padding: SPACING.md, backgroundColor: '#1e293b', alignItems: 'center' },
  videoRoomText: { color: '#cbd5e1', fontSize: TYPOGRAPHY.sm, fontWeight: 'bold' },
  videoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  placeholderText: { color: '#64748b', fontSize: 18, fontWeight: 'bold' },
  localVideo: { position: 'absolute', bottom: 24, right: 24, width: 100, height: 150, backgroundColor: '#334155', borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  localText: { color: '#94a3b8', fontSize: 14, marginTop: 8 },
  controlsContainer: { height: 100, backgroundColor: '#020617', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' },
  controlButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  endCallButton: { backgroundColor: '#ef4444' }
});
