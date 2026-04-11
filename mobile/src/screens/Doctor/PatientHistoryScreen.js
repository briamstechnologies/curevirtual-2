/**
 * PatientHistoryScreen.js — CureVirtual Mobile
 * Shows patient profile and medical history for a doctor.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

const InfoCard = ({ label, value, icon }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardIcon}>{icon}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
    <Text style={styles.cardValue}>{value || 'Not available'}</Text>
  </View>
);

export default function PatientHistoryScreen({ route, navigation }) {
  const { patientId } = route.params || {};
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const response = await api.get(`/doctor/patient/${patientId}`);
        if (response.data) {
          setHistory(response.data?.data || response.data);
        }
      } catch (error) {
        console.error('[PatientHistoryScreen] Failed to fetch:', error.message || error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [patientId]);

  const fullName = `${history?.user?.firstName || ''} ${history?.user?.lastName || ''}`.trim() || 'Patient';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.brandGreen} />
          <Text style={styles.loadingText}>Loading patient data...</Text>
        </View>
      ) : !history ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Could not load patient history</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Avatar + Name */}
          <View style={styles.patientHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(history.user?.firstName?.[0] || 'P').toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.patientName}>{fullName}</Text>
              <Text style={styles.patientRole}>Patient</Text>
            </View>
          </View>

          {/* Info Cards */}
          <InfoCard icon="📧" label="EMAIL" value={history.user?.email} />
          <InfoCard icon="📞" label="PHONE" value={history.user?.phone} />
          <InfoCard icon="🎂" label="DATE OF BIRTH" value={history.user?.dateOfBirth ? new Date(history.user?.dateOfBirth).toLocaleDateString() : null} />
          <InfoCard icon="⚧️" label="GENDER" value={history.user?.gender} />
          <InfoCard icon="🩸" label="BLOOD TYPE" value={history.bloodGroup} />
          <InfoCard icon="⚕️" label="ALLERGIES" value={history.allergies} />
          <InfoCard
            icon="📋"
            label="MEDICAL HISTORY NOTES"
            value={history.notes || history.medicalHistory || 'No notes on record.'}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
  },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.bgMuted,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: { fontSize: TYPOGRAPHY.xl, color: COLORS.textMain },
  headerTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.textMain,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.base,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.base,
  },
  errorIcon: { fontSize: 40, marginBottom: SPACING.md },
  errorText: {
    fontSize: TYPOGRAPHY.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  retryBtn: {
    backgroundColor: COLORS.brandGreen,
    borderRadius: RADIUS.base,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  retryBtnText: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.bold,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.base,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.base,
    padding: SPACING.lg,
    marginBottom: SPACING.base,
    ...SHADOWS.sm,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${COLORS.brandGreen}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: TYPOGRAPHY.xxl,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.brandGreen,
  },
  patientName: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textMain,
  },
  patientRole: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.base,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  cardIcon: { fontSize: 16 },
  cardLabel: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.brandGreen,
    fontWeight: TYPOGRAPHY.black,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: TYPOGRAPHY.md,
    color: COLORS.textMain,
    lineHeight: 22,
  },
});
