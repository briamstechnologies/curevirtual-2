import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

export default function AppointmentsListScreen() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      const response = await api.get('/patient/appointments');
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setAppointments(data);
    } catch (error) {
      console.error('[AppointmentsListScreen] Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const renderItem = ({ item }) => {
    const doctorName = item.doctorProfile?.user?.firstName
      ? `Dr. ${item.doctorProfile.user.firstName} ${item.doctorProfile.user.lastName || ''}`
      : 'Dr. Unknown';
    
    // Fallback date/time parsing
    const dateObj = new Date(item.appointmentDate);
    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.doctorName}>{doctorName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'CONFIRMED' ? `${COLORS.success}15` : `${COLORS.warning}15` }]}>
            <Text style={[styles.statusText, { color: item.status === 'CONFIRMED' ? COLORS.success : COLORS.warning }]}>{item.status || 'PENDING'}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.dateTime}>{dateStr} at {timeStr}</Text>
          <TouchableOpacity style={styles.detailsBtn}>
            <Text style={styles.detailsBtnText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All Appointments</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.brandGreen} style={{ marginTop: SPACING.xxl }} />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brandGreen} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No appointments found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  header: { padding: SPACING.lg },
  title: { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain },
  listContent: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.base,
    padding: SPACING.lg, marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  doctorName: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  statusText: { fontSize: TYPOGRAPHY.xs, fontWeight: 'bold' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.slate50, paddingTop: SPACING.sm },
  dateTime: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted },
  detailsBtn: { paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: RADIUS.sm, backgroundColor: COLORS.bgInput },
  detailsBtnText: { color: COLORS.textSoft, fontSize: TYPOGRAPHY.xs, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: SPACING.xxxl },
  emptyText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.md },
});
