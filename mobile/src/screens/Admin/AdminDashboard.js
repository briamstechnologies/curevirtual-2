/**
 * AdminDashboard.js — CureVirtual Mobile
 * Dashboard for ADMIN, SUPERADMIN, and SUPPORT roles.
 * Displays platform-wide overview stats and provides a link to the web portal.
 */

import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

const logo = require('../../../assets/images/logo.png');

const StatCard = ({ label, value, icon, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={styles.statLeft}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
    <View style={[styles.statIconBg, { backgroundColor: `${color}15` }]}>
      <Text style={styles.statIcon}>{icon}</Text>
    </View>
  </View>
);

export default function AdminDashboard() {
  const { user, logout } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      // ✅ Correct endpoint for admin stats
      const response = await api.get('/admin-dashboard/dashboard-stats');
      setStats(response.data);
    } catch (error) {
      console.error('[AdminDashboard] Failed to fetch stats:', error.message || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const handleOpenWeb = () => {
    Linking.openURL('https://cure-virtual-2.vercel.app/admin').catch((err) =>
      console.error('An error occurred', err)
    );
  };

  const roleLabel = user?.role || 'Admin';

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.brandGreen} />
        <Text style={styles.loadingText}>Loading platform stats...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brandGreen} />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoWrapper}>
              <Image source={logo} style={styles.logoSmall} resizeMode="contain" />
            </View>
            <View>
              <Text style={styles.greeting}>Welcome, {user?.firstName || 'Admin'}</Text>
              <Text style={styles.subGreeting}>{roleLabel} Panel</Text>
            </View>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* ── Overview Stats ── */}
        <Text style={styles.sectionTitle}>Platform Overview</Text>
        
        <View style={styles.statsGrid}>
          <StatCard label="Total Users" value={stats?.users || 0} icon="👥" color={COLORS.brandBlue} />
          <StatCard label="Doctors" value={stats?.doctors || 0} icon="👨‍⚕️" color={COLORS.brandGreen} />
          <StatCard label="Patients" value={stats?.patients || 0} icon="🩹" color={COLORS.brandOrange} />
          <StatCard label="Appointments" value={stats?.appointments || 0} icon="📅" color={COLORS.brandBlue} />
          <StatCard label="Subscriptions" value={stats?.subscriptions || 0} icon="💎" color={COLORS.brandPurple || '#8b5cf6'} />
          <StatCard label="Messages" value={stats?.messages || 0} icon="💬" color={COLORS.slate500} />
        </View>

        {/* ── Web Portal CTA ── */}
        <View style={styles.webCta}>
          <Text style={styles.webCtaTitle}>Need more controls?</Text>
          <Text style={styles.webCtaDesc}>
            Access the full administrative suite on the web portal to manage users, billing, and system settings.
          </Text>
          <TouchableOpacity style={styles.webBtn} onPress={handleOpenWeb} activeOpacity={0.85}>
            <Text style={styles.webBtnText}>OPEN WEB PORTAL ↗</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgMuted },
  loadingText: { marginTop: SPACING.md, color: COLORS.textMuted, fontSize: TYPOGRAPHY.base },
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
  sectionTitle: { fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain, marginBottom: SPACING.base },
  statsGrid: { gap: SPACING.md, marginBottom: SPACING.xxl },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.base,
    padding: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    ...SHADOWS.sm,
  },
  statLeft: { flex: 1 },
  statLabel: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, fontWeight: TYPOGRAPHY.bold, textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain, marginTop: 4 },
  statIconBg: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  statIcon: { fontSize: 24 },
  webCta: {
    backgroundColor: COLORS.brandGreen,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.green,
  },
  webCtaTitle: { color: COLORS.white, fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.black, marginBottom: SPACING.sm },
  webCtaDesc: { color: `${COLORS.white}CC`, fontSize: TYPOGRAPHY.sm, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.xl },
  webBtn: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.base,
  },
  webBtnText: { color: COLORS.brandGreen, fontWeight: TYPOGRAPHY.black, fontSize: TYPOGRAPHY.sm },
});
