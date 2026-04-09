/**
 * DoctorsListScreen.js — CureVirtual Mobile
 *
 * ──────────────────────────────────────────────────────────────
 * API: GET /api/doctor/list
 * Returns: [{ id (DoctorProfile.id), user: { id (User.id), firstName, lastName, email },
 *             specialization, yearsOfExperience, ... }]
 *
 * For booking, we pass DoctorProfile.id (not User.id) because
 * POST /api/patient/appointments expects { doctorId: DoctorProfile.id }
 * ──────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

const DoctorCard = ({ item, onBook }) => {
  // ✅ /doctor/list response: { id: DoctorProfile.id, user: { firstName, lastName }, specialization }
  const firstName = item.user?.firstName || item.firstName || '';
  const lastName = item.user?.lastName || item.lastName || '';
  const initials = `${firstName[0] || 'D'}${lastName[0] || ''}`.toUpperCase();
  const specialty = item.specialization || item.specialty || 'General Practitioner';
  const experience = item.yearsOfExperience;
  const fee = item.consultationFee;

  return (
    <View style={styles.doctorCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.doctorInfo}>
        <Text style={styles.doctorName}>Dr. {firstName} {lastName}</Text>
        <Text style={styles.specialtyText}>{specialty}</Text>
        <View style={styles.badgeRow}>
          {experience > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{experience} yrs</Text>
            </View>
          )}
          {fee > 0 && (
            <View style={[styles.badge, { backgroundColor: `${COLORS.brandBlue}12` }]}>
              <Text style={[styles.badgeText, { color: COLORS.brandBlue }]}>${fee}</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity style={styles.bookBtn} onPress={onBook} activeOpacity={0.85}>
        <Text style={styles.bookBtnText}>Book</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function DoctorsListScreen({ navigation }) {
  const [doctors, setDoctors] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchDoctors = useCallback(async () => {
    try {
      // ✅ Correct endpoint: /doctor/list (not /patient/doctors)
      const response = await api.get('/doctor/list');
      const data = Array.isArray(response.data)
        ? response.data
        : (response.data?.data || response.data?.doctors || []);
      setDoctors(data);
      setFiltered(data);
      console.log('[DoctorsListScreen] Doctors loaded:', data.length);
      if (data[0]) console.log('[DoctorsListScreen] First doctor:', JSON.stringify(data[0]).substring(0, 200));
    } catch (error) {
      console.error('[DoctorsListScreen] Failed to fetch doctors:', error.message || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(doctors);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        doctors.filter(d => {
          const name = `${d.user?.firstName || ''} ${d.user?.lastName || ''}`.toLowerCase();
          const spec = (d.specialization || '').toLowerCase();
          return name.includes(q) || spec.includes(q);
        })
      );
    }
  }, [search, doctors]);

  const onRefresh = () => { setRefreshing(true); fetchDoctors(); };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find a Doctor</Text>
        <Text style={styles.subtitle}>{filtered.length} available</Text>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or specialty..."
          placeholderTextColor={COLORS.textPlaceholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.brandGreen} style={{ marginTop: SPACING.xxl }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item.id?.toString() || `doc-${i}`}
          renderItem={({ item }) => (
            <DoctorCard
              item={item}
              onBook={() => navigation.navigate('AppointmentBooking', {
                // ✅ Pass DoctorProfile.id (not User.id) — required by POST /patient/appointments
                doctorId: item.id,
                doctor: item,
              })}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brandGreen} colors={[COLORS.brandGreen]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👨‍⚕️</Text>
              <Text style={styles.emptyText}>No doctors found</Text>
              <Text style={styles.emptySubText}>{search ? 'Try a different search' : 'Pull down to refresh'}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.base,
    paddingBottom: SPACING.sm,
  },
  title: { fontSize: TYPOGRAPHY.xxl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain },
  subtitle: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, marginTop: 2 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.base,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.base,
    paddingHorizontal: SPACING.base,
    ...SHADOWS.sm,
  },
  searchIcon: { fontSize: 16, marginRight: SPACING.sm },
  searchInput: { flex: 1, paddingVertical: SPACING.md, fontSize: TYPOGRAPHY.base, color: COLORS.textMain },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl },
  doctorCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.base,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${COLORS.brandGreen}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: { fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.black, color: COLORS.brandGreen },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  specialtyText: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, marginTop: 3 },
  badgeRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: 5 },
  badge: {
    backgroundColor: `${COLORS.brandGreen}12`,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  badgeText: { fontSize: TYPOGRAPHY.xs, color: COLORS.brandGreen, fontWeight: TYPOGRAPHY.bold },
  bookBtn: {
    backgroundColor: COLORS.brandGreen,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
    borderRadius: RADIUS.md,
    ...SHADOWS.green,
  },
  bookBtnText: { color: COLORS.white, fontWeight: TYPOGRAPHY.bold, fontSize: TYPOGRAPHY.sm },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.md },
  emptyText: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.semiBold, color: COLORS.textMuted },
  emptySubText: { fontSize: TYPOGRAPHY.sm, color: COLORS.textPlaceholder, marginTop: SPACING.xs },
});
