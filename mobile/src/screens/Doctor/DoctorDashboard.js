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
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

const AppointmentCard = ({ item, onPress, onEditStatus }) => {
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
          <View style={styles.detailRow}>
            {item.status && (
              <View style={[styles.typeBadge, { backgroundColor: `${COLORS.brandGreen}15` }]}>
                <Text style={[styles.typeText, { color: COLORS.brandGreen }]}>{item.status}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editBadge} onPress={() => onEditStatus(item)}>
              <Ionicons name="create-outline" size={12} color={COLORS.brandBlue} />
              <Text style={styles.editText}>Edit Status</Text>
            </TouchableOpacity>
          </View>
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

  // Editing State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

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
      } else {
        console.error('[DoctorDashboard] Appointments error:', apptRes.reason?.message);
      }

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      }
    } catch (_error) {
      console.error('[DoctorDashboard] Unexpected error:', _error.message || _error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedAppt) return;
    try {
      setUpdatingStatus(true);
      await api.patch(`/doctor/appointments/${selectedAppt.id}`, { status: newStatus });
      setShowEditModal(false);
      fetchData(); // Refresh list
    } catch (_error) {
      Alert.alert("Update Failed", "Could not update appointment status. Please try again.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openStatusModal = (appt) => {
    setSelectedAppt(appt);
    setShowEditModal(true);
  };

  // Use displayName from normalized user object
  const firstName = user?.firstName || 'Doctor';
  const lastName = user?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();

  // Stat values
  const total = stats?.totalAppointments ?? appointments.length;
  const pending = stats?.pendingAppointments ?? appointments.filter(a => a.status === 'PENDING').length;
  const completed = stats?.completedAppointments ?? appointments.filter(a => a.status === 'COMPLETED').length;

  const ListHeader = (
    <>
      {/* ── Top Premium Card ── */}
      <View style={styles.topCardWrapper}>
        <View style={styles.topCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.brandRow}>
              <View style={styles.miniLogoBg}>
                <Image source={logo} style={styles.logoMini} resizeMode="contain" />
              </View>
              <Text style={styles.brandText}>CureVirtual</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.openDrawer()}>
              <Ionicons name="menu-outline" size={28} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.userInfoRow}>
            <View style={styles.userTextContainer}>
              <Text style={styles.userNameText}>{fullName}</Text>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusLabel}>Verified Doctor Portfolio</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutMiniBtn} onPress={logout}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.cardInfoText}>Managing {pending} pending consultations today</Text>
        </View>
      </View>

      {/* ── Stat Cards ── */}
      <View style={styles.statsRow}>
        <TouchableOpacity style={[styles.statCard, { borderTopColor: COLORS.brandGreen }]}>
          <Text style={styles.statValue}>{total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statCard, { borderTopColor: COLORS.brandBlue }]}>
          <Text style={styles.statValue}>{pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statCard, { borderTopColor: COLORS.success }]}>
          <Text style={styles.statValue}>{completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Consultations</Text>
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
            onEditStatus={openStatusModal}
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

      {/* ── Status Update Modal ── */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Appt Status</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              {['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((status) => (
                <TouchableOpacity 
                  key={status} 
                  style={[
                    styles.statusOption,
                    selectedAppt?.status === status && styles.selectedOption
                  ]}
                  onPress={() => handleUpdateStatus(status)}
                  disabled={updatingStatus}
                >
                  <Text style={[
                    styles.statusOptionText,
                    selectedAppt?.status === status && styles.selectedOptionText
                  ]}>{status}</Text>
                  {selectedAppt?.status === status && <Ionicons name="checkmark-circle" size={20} color={COLORS.brandGreen} />}
                </TouchableOpacity>
              ))}
              
              {updatingStatus && (
                <ActivityIndicator size="small" color={COLORS.brandGreen} style={{ marginTop: 10 }} />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  listContent: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  
  // ── Top Premium Card ──
  topCardWrapper: { marginBottom: SPACING.xl },
  topCard: {
    backgroundColor: COLORS.brandGreen,
    borderRadius: 24,
    padding: SPACING.xl,
    ...SHADOWS.green,
  },
  cardHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniLogoBg: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  logoMini: { width: 20, height: 20 },
  brandText: { color: COLORS.white, fontWeight: TYPOGRAPHY.black, fontSize: 16 },
  
  userInfoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12,
  },
  userTextContainer: { flex: 1 },
  userNameText: { color: COLORS.white, fontSize: 24, fontWeight: TYPOGRAPHY.bold },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' },
  statusLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: TYPOGRAPHY.medium },
  logoutMiniBtn: { 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    padding: 10, 
    borderRadius: 12 
  },
  cardInfoText: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },

  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
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
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  typeBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
  },
  typeText: { fontSize: 10, fontWeight: TYPOGRAPHY.bold },
  editBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editText: { fontSize: 10, color: COLORS.brandBlue, fontWeight: TYPOGRAPHY.semiBold },

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

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: SPACING.xl,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalTitle: { fontSize: 18, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  modalBody: { gap: 12 },
  statusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate100,
  },
  selectedOption: {
    backgroundColor: `${COLORS.brandGreen}10`,
    borderColor: COLORS.brandGreen,
  },
  statusOptionText: { fontSize: 16, fontWeight: TYPOGRAPHY.medium, color: COLORS.textMain },
  selectedOptionText: { color: COLORS.brandGreen, fontWeight: TYPOGRAPHY.bold },
});
