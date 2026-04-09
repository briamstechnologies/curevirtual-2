/**
 * DoctorDashboard.js — CureVirtual Mobile
 *
 * ──────────────────────────────────────────────────────────────
 * API RESPONSE SHAPE (from GET /api/doctor/appointments):
 *   [{
 *     id, status, appointmentDate,   ← ✅ "appointmentDate" NOT "date"
 *     patient: {
 *       user: { firstName, lastName }  ← ✅ nested patient.user.*
 *     },
 *     doctor: { user: { ... } }
 *   }]
 *
 * API STATS (from GET /api/doctor/stats):
 *   { totalAppointments, completedAppointments, pendingAppointments,
 *     totalPrescriptions, activePatients }
 * ──────────────────────────────────────────────────────────────
 */

import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

const logo = require('../../../assets/images/logo.png');

// ──────────────────────────────────────────────────────────────
// Format appointmentDate for display
// ──────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return 'Date TBD';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return 'Date TBD';
  }
};

const AppointmentCard = ({ item, onPress }) => {
  // ✅ Correct path: patient.user.firstName (NOT patient.firstName)
  const patientFirst = item.patient?.user?.firstName || '';
  const patientLast = item.patient?.user?.lastName || '';
  const initial = (patientFirst[0] || 'P').toUpperCase();
  const patientName = [patientFirst, patientLast].filter(Boolean).join(' ') || 'Patient';

  return (
    <TouchableOpacity style={styles.appointmentCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.patientName}>{patientName}</Text>
          {/* ✅ Correct field: appointmentDate */}
          <Text style={styles.timeText}>{formatDate(item.appointmentDate)}</Text>
          {item.status && (
            <View style={[styles.typeBadge, { backgroundColor: `${COLORS.brandGreen}15` }]}>
              <Text style={[styles.typeText, { color: COLORS.brandGreen }]}>{item.status}</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity style={styles.callBtn} activeOpacity={0.85}>
        <Text style={styles.callBtnText}>▶ Call</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default function DoctorDashboard({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Both requests in parallel for speed
      const [apptRes, statsRes] = await Promise.allSettled([
        api.get('/doctor/appointments'),
        api.get('/doctor/stats'),
      ]);

      if (apptRes.status === 'fulfilled') {
        const data = apptRes.value.data;
        const list = Array.isArray(data) ? data : (data?.data || data?.appointments || []);
        setAppointments(list);
        console.log('[DoctorDashboard] Appointments loaded:', list.length);
        // Debug: log first item's structure
        if (list[0]) {
          console.log('[DoctorDashboard] First appointment keys:', Object.keys(list[0]));
          console.log('[DoctorDashboard] patient.user:', list[0]?.patient?.user);
          console.log('[DoctorDashboard] appointmentDate:', list[0]?.appointmentDate);
        }
      } else {
        console.error('[DoctorDashboard] Appointments error:', apptRes.reason?.message);
      }

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      }
    } catch (error) {
      console.error('[DoctorDashboard] Unexpected error:', error.message || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // Use displayName from normalized user object (firstName set by authService)
  const displayName = user?.firstName || user?.name || 'Doctor';

  // Stat values — prefer from API stats, fall back to counting locally
  const total = stats?.totalAppointments ?? appointments.length;
  const pending = stats?.pendingAppointments ?? appointments.filter(a => a.status === 'PENDING').length;
  const completed = stats?.completedAppointments ?? appointments.filter(a => a.status === 'COMPLETED').length;

  const ListHeader = (
    <>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerLeft} 
          onPress={() => navigation.openDrawer()}
          activeOpacity={0.7}
        >
          <View style={styles.logoWrapper}>
            <Image source={logo} style={styles.logoSmall} resizeMode="contain" />
          </View>
          <View>
            <Text style={styles.greeting}>Dr. {displayName}</Text>
            <Text style={styles.subGreeting}>Your Schedule</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stat Cards ── */}
      <View style={styles.statsRow}>
        <TouchableOpacity 
          style={[styles.statCard, { borderTopColor: COLORS.brandGreen }]}
          onPress={() => navigation.navigate('HomeTab')}
        >
          <Text style={styles.statValue}>{total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statCard, { borderTopColor: COLORS.brandBlue }]}
          onPress={() => navigation.navigate('HomeTab')}
        >
          <Text style={styles.statValue}>{pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statCard, { borderTopColor: COLORS.success }]}
          onPress={() => navigation.navigate('HomeTab')}
        >
          <Text style={styles.statValue}>{completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </TouchableOpacity>
      </View>

      {/* ── Extra Stats ── */}
      <View style={styles.statsRow}>
        <TouchableOpacity 
          style={[styles.statCard, { borderTopColor: COLORS.brandOrange }]}
          onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab', params: { screen: 'Prescriptions' }})}
        >
          <Text style={styles.statValue}>{stats?.totalPrescriptions ?? 0}</Text>
          <Text style={styles.statLabel}>Prescriptions</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statCard, { borderTopColor: COLORS.brandBlue }]}
          onPress={() => navigation.navigate('PatientsTab')}
        >
          <Text style={styles.statValue}>{stats?.activePatients ?? 0}</Text>
          <Text style={styles.statLabel}>Patients</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statCard, { borderTopColor: COLORS.slate400 }]}
          onPress={() => navigation.navigate('MessagesTab')}
        >
          <Text style={styles.statValue}>{stats?.totalMessages ?? 0}</Text>
          <Text style={styles.statLabel}>Messages</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Appointments</Text>
      {loading && <ActivityIndicator color={COLORS.brandGreen} style={{ marginBottom: SPACING.base }} />}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={appointments}
        keyExtractor={(item, i) => item.id?.toString() || `apt-${i}`}
        renderItem={({ item }) => (
          <AppointmentCard
            item={item}
            onPress={() => navigation.navigate('PatientHistory', {
              patientId: item.patient?.id || item.patientId,
            })}
          />
        )}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.brandGreen}
            colors={[COLORS.brandGreen]}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No appointments scheduled</Text>
              <Text style={styles.emptySubText}>Your upcoming appointments will appear here</Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  listContent: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  logoWrapper: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.base,
    padding: SPACING.sm,
    ...SHADOWS.sm,
  },
  logoSmall: { width: 32, height: 32 },
  greeting: { fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  subGreeting: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, marginTop: 2 },
  logoutBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.md,
  },
  logoutText: { color: COLORS.danger, fontWeight: TYPOGRAPHY.bold, fontSize: TYPOGRAPHY.sm },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.base,
    padding: SPACING.base,
    alignItems: 'center',
    borderTopWidth: 3,
    ...SHADOWS.sm,
  },
  statValue: { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain },
  statLabel: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, marginTop: 2, fontWeight: TYPOGRAPHY.medium },
  sectionTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.slate700,
    marginTop: SPACING.md,
    marginBottom: SPACING.base,
  },
  appointmentCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.base,
    borderRadius: RADIUS.base,
    marginBottom: SPACING.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.brandGreen,
    ...SHADOWS.sm,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.brandGreen}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.black, color: COLORS.brandGreen },
  patientName: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.semiBold, color: COLORS.textMain },
  timeText: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, marginTop: 3 },
  typeBadge: {
    marginTop: 4, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 2, alignSelf: 'flex-start',
  },
  typeText: { fontSize: TYPOGRAPHY.xs, fontWeight: TYPOGRAPHY.bold },
  callBtn: {
    backgroundColor: COLORS.brandGreen,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md, ...SHADOWS.green,
  },
  callBtnText: { color: COLORS.white, fontWeight: TYPOGRAPHY.bold, fontSize: TYPOGRAPHY.sm },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.md },
  emptyText: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.semiBold, color: COLORS.textMuted },
  emptySubText: { fontSize: TYPOGRAPHY.sm, color: COLORS.textPlaceholder, marginTop: SPACING.xs, textAlign: 'center' },
});
