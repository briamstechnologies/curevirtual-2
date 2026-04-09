/**
 * PharmacyDashboard.js — CureVirtual Mobile
 * Pharmacy's main dashboard showing prescriptions and platform stats.
 *
 * ──────────────────────────────────────────────────────────────
 * API RESPONSE SHAPE (from GET /api/pharmacy/prescriptions):
 *   { success: true, data: [{
 *     id, status, dispatchStatus, createdAt,
 *     medication, dosage,
 *     patient: {
 *       user: { firstName, lastName }
 *     }
 *   }] }
 *
 * API STATS (from GET /api/pharmacy/stats):
 *   { totalPrescriptions, pendingPrescriptions, dispensedPrescriptions, totalCustomers }
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

const STATUS_COLORS = {
  SENT: COLORS.brandOrange, // Newly sent
  ACKNOWLEDGED: COLORS.brandBlue,
  READY: COLORS.brandBlue,
  DISPENSED: COLORS.success,
  REJECTED: COLORS.brandRed || COLORS.danger,
};

const OrderCard = ({ item }) => {
  const status = item.dispatchStatus || 'SENT';
  const statusColor = STATUS_COLORS[status] || COLORS.textMuted;

  const patientFirst = item.patient?.user?.firstName || '';
  const patientLast = item.patient?.user?.lastName || '';
  const patientName = [patientFirst, patientLast].filter(Boolean).join(' ') || 'Patient';

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderLeft}>
        <View style={[styles.orderIcon, { backgroundColor: `${statusColor}15` }]}>
          <Text style={styles.orderIconText}>💊</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderPatient}>{patientName}</Text>
          <Text style={styles.orderDate}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Date TBD'}
          </Text>
          <Text style={styles.orderMeds} numberOfLines={1}>
            {item.medication || 'No medication info'} {item.dosage ? `(${item.dosage})` : ''}
          </Text>
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
      </View>
    </View>
  );
};

export default function PharmacyDashboard({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [presRes, statsRes] = await Promise.allSettled([
        api.get('/pharmacy/prescriptions'),
        api.get('/pharmacy/stats'),
      ]);

      if (presRes.status === 'fulfilled') {
        const raw = presRes.value.data;
        // API returns { success: true, data: [...] }
        const list = raw.success && Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : []);
        setOrders(list);
      } else {
        console.error('[PharmacyDashboard] Prescriptions failed:', presRes.reason?.message);
      }

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      } else {
        console.error('[PharmacyDashboard] Stats failed:', statsRes.reason?.message);
      }
    } catch (error) {
      console.error('[PharmacyDashboard] Unexpected error:', error.message || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const displayName = user?.firstName || user?.name || 'Pharmacy';

  // Stats display
  const total = stats?.totalPrescriptions ?? orders.length;
  const pending = stats?.pendingPrescriptions ?? orders.filter(o => o.dispatchStatus === 'SENT').length;
  const dispensed = stats?.dispensedPrescriptions ?? orders.filter(o => o.dispatchStatus === 'DISPENSED').length;

  const ListHeader = (
    <>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoWrapper}>
            <Image source={logo} style={styles.logoSmall} resizeMode="contain" />
          </View>
          <View>
            <Text style={styles.greeting}>{displayName} 💊</Text>
            <Text style={styles.subGreeting}>Pharmacy Dashboard</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats ── */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderTopColor: COLORS.brandOrange }]}>
          <Text style={styles.statValue}>{total}</Text>
          <Text style={styles.statLabel}>Total Rx</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: COLORS.brandBlue }]}>
          <Text style={styles.statValue}>{pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: COLORS.success }]}>
          <Text style={styles.statValue}>{dispensed}</Text>
          <Text style={styles.statLabel}>Dispensed</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Prescription Orders</Text>
      {loading && <ActivityIndicator color={COLORS.brandGreen} style={{ marginBottom: SPACING.base }} />}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item, i) => item.id?.toString() || `rx-${i}`}
        renderItem={({ item }) => <OrderCard item={item} />}
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
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>No prescriptions yet</Text>
              <Text style={styles.emptySubText}>Incoming orders will appear here</Text>
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
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.base,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  orderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  orderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderIconText: { fontSize: 22 },
  orderPatient: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.semiBold, color: COLORS.textMain },
  orderDate: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, marginTop: 2 },
  orderMeds: { fontSize: TYPOGRAPHY.xs, color: COLORS.textPlaceholder, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusText: { fontSize: TYPOGRAPHY.xs, fontWeight: TYPOGRAPHY.black },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.md },
  emptyText: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.semiBold, color: COLORS.textMuted },
  emptySubText: { fontSize: TYPOGRAPHY.sm, color: COLORS.textPlaceholder, marginTop: SPACING.xs },
});
