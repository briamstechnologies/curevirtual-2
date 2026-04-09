/**
 * PatientDashboard.js — CureVirtual Mobile
 *
 * ──────────────────────────────────────────────────────────────
 * API RESPONSE SHAPE (from GET /api/patient/appointments):
 *   [{
 *     id, status, appointmentDate,       ← ✅ "appointmentDate" NOT "date"
 *     reason,
 *     doctor: {
 *       user: { firstName, lastName }    ← ✅ nested doctor.user.*
 *     }
 *   }]
 *
 * API STATS (from GET /api/patient/stats):
 *   { success: true, data: { totalAppointments, completedAppointments,
 *     pendingAppointments, totalPrescriptions, totalConsultations, totalDoctors } }
 * ──────────────────────────────────────────────────────────────
 */

import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

const logo = require('../../../assets/images/logo.png');

const QUICK_ACTIONS = [
  { key: 'Doctors', icon: '👨‍⚕️', label: 'Find Doctor', color: COLORS.brandGreen },
  { key: 'Chatbot', icon: '🤖', label: 'AI Assistant', color: COLORS.brandBlue },
  { key: 'Map', icon: '🗺️', label: 'Near Me', color: COLORS.brandOrange },
];

// ──────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return 'Date TBD';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return 'Date TBD'; }
};

const AppointmentCard = ({ item }) => {
  // ✅ Correct path: doctor.user.firstName
  const doctorFirst = item.doctor?.user?.firstName || '';
  const doctorLast = item.doctor?.user?.lastName || '';
  const doctorName = [doctorFirst, doctorLast].filter(Boolean).join(' ') || 'Doctor';

  return (
    <View style={styles.appointmentCard}>
      <View style={styles.aptLeft}>
        <View style={styles.aptIndicator} />
        <View>
          <Text style={styles.aptDocName}>Dr. {doctorName}</Text>
          {/* ✅ Correct field: appointmentDate */}
          <Text style={styles.aptTime}>{formatDate(item.appointmentDate)}</Text>
          {item.status && (
            <View style={styles.aptTypeBadge}>
              <Text style={styles.aptTypeText}>{item.status}</Text>
            </View>
          )}
          {item.reason && (
            <Text style={styles.aptReason} numberOfLines={1}>{item.reason}</Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default function PatientDashboard({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [apptRes, statsRes] = await Promise.allSettled([
        api.get('/patient/appointments'),
        api.get('/patient/stats'),
      ]);

      if (apptRes.status === 'fulfilled') {
        const data = apptRes.value.data;
        const list = Array.isArray(data) ? data : (data?.data || data?.appointments || []);
        setAppointments(list);
        console.log('[PatientDashboard] Appointments loaded:', list.length);
        if (list[0]) {
          console.log('[PatientDashboard] First appt keys:', Object.keys(list[0]));
          console.log('[PatientDashboard] doctor.user:', list[0]?.doctor?.user);
          console.log('[PatientDashboard] appointmentDate:', list[0]?.appointmentDate);
        }
      } else {
        console.error('[PatientDashboard] Appointment error:', apptRes.reason?.message);
      }

      if (statsRes.status === 'fulfilled') {
        // /patient/stats returns { success: true, data: { ... } }
        const sData = statsRes.value.data?.data || statsRes.value.data;
        setStats(sData);
      }
    } catch (error) {
      console.error('[PatientDashboard] Unexpected error:', error.message || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const displayName = user?.firstName || user?.name?.split(' ')[0] || 'Patient';

  // Use API stats where available, fall back to local count
  const totalAppt = stats?.totalAppointments ?? appointments.length;
  const prescriptions = stats?.totalPrescriptions ?? 0;
  const doctors = stats?.totalDoctors ?? 0;

  const ListHeader = (
    <>
      {/* ── Top Header ── */}
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
            <Text style={styles.greeting}>Hello, {displayName} 👋</Text>
            <Text style={styles.subGreeting}>How are you feeling today?</Text>
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
          onPress={() => navigation.navigate('AppointmentsTab')}
        >
          <Text style={styles.statValue}>{totalAppt}</Text>
          <Text style={styles.statLabel}>Appointments</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statCard, { borderTopColor: COLORS.brandBlue }]}
          onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab', params: { screen: 'Prescriptions' }})}
        >
          <Text style={styles.statValue}>{prescriptions}</Text>
          <Text style={styles.statLabel}>Prescriptions</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statCard, { borderTopColor: COLORS.brandOrange }]}
          onPress={() => navigation.navigate('HomeTab', { screen: 'Doctors' })}
        >
          <Text style={styles.statValue}>{doctors}</Text>
          <Text style={styles.statLabel}>Doctors</Text>
        </TouchableOpacity>
      </View>

      {/* ── Quick Actions ── */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.key}
            style={styles.actionCard}
            onPress={() => navigation.navigate(action.key)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBg, { backgroundColor: `${action.color}15` }]}>
              <Text style={styles.actionIcon}>{action.icon}</Text>
            </View>
            <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
      {loading && <ActivityIndicator color={COLORS.brandGreen} style={{ marginTop: SPACING.base }} />}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={appointments}
        keyExtractor={(item, i) => item.id?.toString() || `apt-${i}`}
        renderItem={({ item }) => <AppointmentCard item={item} />}
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
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>No upcoming appointments</Text>
              <Text style={styles.emptySubText}>Tap 'Find Doctor' to book one</Text>
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
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xl, gap: SPACING.sm },
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
  sectionTitle: { fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.bold, color: COLORS.slate700, marginBottom: SPACING.base },
  actionsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xl, gap: SPACING.sm },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.base,
    paddingVertical: SPACING.base,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionIcon: { fontSize: 22 },
  actionLabel: { fontSize: TYPOGRAPHY.xs, fontWeight: TYPOGRAPHY.bold, textAlign: 'center' },
  appointmentCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.base,
    borderRadius: RADIUS.base,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.brandGreen,
    ...SHADOWS.sm,
  },
  aptLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, flex: 1 },
  aptIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.brandGreen, marginTop: 6 },
  aptDocName: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.semiBold, color: COLORS.textMain },
  aptTime: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, marginTop: 3 },
  aptTypeBadge: {
    marginTop: 4,
    backgroundColor: `${COLORS.brandBlue}15`,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  aptTypeText: { fontSize: TYPOGRAPHY.xs, color: COLORS.brandBlue, fontWeight: TYPOGRAPHY.bold },
  aptReason: { fontSize: TYPOGRAPHY.xs, color: COLORS.textPlaceholder, marginTop: 2 },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.md },
  emptyText: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.semiBold, color: COLORS.textMuted },
  emptySubText: { fontSize: TYPOGRAPHY.sm, color: COLORS.textPlaceholder, marginTop: SPACING.xs },
});
