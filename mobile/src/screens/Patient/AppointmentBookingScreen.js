/**
 * AppointmentBookingScreen.js — CureVirtual Mobile
 *
 * ──────────────────────────────────────────────────────────────
 * API: POST /api/patient/appointments
 * Body: { doctorId: DoctorProfile.id, appointmentDate: ISOString, reason? }
 *   ⚠️  doctorId must be DoctorProfile.id (NOT User.id)
 *   The backend resolves using: doctorProfile.findUnique({ where: { id: doctorId } })
 *
 * IMPORTANT: The backend validates against the doctor's schedule.
 * If the doctor has no schedule set, booking will return 400.
 * ──────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

// ──────────────────────────────────────────────────────────────
// Generate time slots for today — we can't use a static list
// because the backend validates against doctor's schedule.
// ──────────────────────────────────────────────────────────────
const generateSlots = () => {
  const slots = [];
  for (let h = 8; h <= 17; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 17) slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
};

export default function AppointmentBookingScreen({ route, navigation }) {
  const { doctorId, doctor } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const timeSlots = generateSlots();

  const today = new Date();
  const dateStr = selectedDate.toISOString().split('T')[0];
  const displayDate = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const handleBook = async () => {
    if (!selectedTime) {
      Alert.alert('Select Time', 'Please select a time slot to continue.');
      return;
    }
    if (!doctorId) {
      Alert.alert('Error', 'Doctor information missing. Please go back and try again.');
      return;
    }

    // Build ISO date string for the selected date + time
    const appointmentDate = `${dateStr}T${selectedTime}:00`;

    console.log('[Booking] Sending:', { doctorId, appointmentDate, reason });

    setLoading(true);
    try {
      // ✅ POST /api/patient/appointments
      // doctorId = DoctorProfile.id (passed from DoctorsListScreen as item.id)
      const response = await api.post('/patient/appointments', {
        doctorId,
        appointmentDate,
        reason: reason.trim() || undefined,
      });

      console.log('[Booking] Success:', response.data);

      Alert.alert(
        '✅ Appointment Booked!',
        `Your appointment is confirmed for ${selectedTime} on ${displayDate}.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      const msg = error.response?.data?.error
        || error.response?.data?.message
        || error.message
        || 'Booking failed. Please try another time slot.';
      console.error('[Booking] Error:', error.response?.data || error.message);
      Alert.alert('Booking Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to next day
  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
    setSelectedTime('');
  };

  // Navigate to previous day (but not before today)
  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    if (d >= today) {
      setSelectedDate(d);
      setSelectedTime('');
    }
  };

  const doctorFirst = doctor?.user?.firstName || doctor?.firstName || '';
  const doctorLast = doctor?.user?.lastName || doctor?.lastName || '';
  const doctorName = `Dr. ${[doctorFirst, doctorLast].filter(Boolean).join(' ')}` || 'Doctor';
  const specialty = doctor?.specialization || 'General Practitioner';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book Appointment</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Doctor Card ── */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorAvatar}>
            <Text style={styles.doctorAvatarText}>{(doctorFirst[0] || 'D').toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.doctorName}>{doctorName}</Text>
            <Text style={styles.doctorSpec}>{specialty}</Text>
          </View>
        </View>

        {/* ── Date Selector ── */}
        <Text style={styles.sectionLabel}>SELECT DATE</Text>
        <View style={styles.dateCard}>
          <TouchableOpacity style={styles.dateBtnLeft} onPress={prevDay} activeOpacity={0.7}>
            <Text style={styles.dateArrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.dateCenter}>
            <Text style={styles.dateValue}>{displayDate}</Text>
          </View>
          <TouchableOpacity style={styles.dateBtnRight} onPress={nextDay} activeOpacity={0.7}>
            <Text style={styles.dateArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Reason ── */}
        <Text style={styles.sectionLabel}>REASON (OPTIONAL)</Text>
        <TextInput
          style={styles.reasonInput}
          placeholder="Describe your symptoms or reason for visit..."
          placeholderTextColor={COLORS.textPlaceholder}
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
        />

        {/* ── Time Slots ── */}
        <Text style={styles.sectionLabel}>SELECT TIME SLOT</Text>
        <Text style={styles.scheduleNote}>
          ⚠️ Times shown are suggestions. The doctor's available schedule determines which slots are valid.
        </Text>
        <View style={styles.slotGrid}>
          {timeSlots.map((time) => (
            <TouchableOpacity
              key={time}
              style={[styles.slotBtn, selectedTime === time && styles.selectedSlot]}
              onPress={() => setSelectedTime(time)}
              activeOpacity={0.8}
            >
              <Text style={[styles.slotText, selectedTime === time && styles.selectedSlotText]}>
                {time}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Confirm ── */}
        <TouchableOpacity
          style={[styles.confirmBtn, (!selectedTime || loading) && styles.confirmBtnDisabled]}
          onPress={handleBook}
          disabled={!selectedTime || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.confirmBtnText}>CONFIRM BOOKING →</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  backIcon: { fontSize: TYPOGRAPHY.xl, color: COLORS.textMain },
  headerTitle: { fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain },
  doctorCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.base,
    padding: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
  },
  doctorAvatar: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: `${COLORS.brandGreen}20`,
    justifyContent: 'center', alignItems: 'center',
  },
  doctorAvatarText: { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.black, color: COLORS.brandGreen },
  doctorName: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  doctorSpec: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, marginTop: 3 },
  sectionLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.brandGreen,
    letterSpacing: 1.5,
    marginBottom: SPACING.md,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.base,
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
    overflow: 'hidden',
  },
  dateBtnLeft: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.bgInput,
  },
  dateBtnRight: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.bgInput,
  },
  dateArrow: { fontSize: 24, color: COLORS.brandGreen, fontWeight: TYPOGRAPHY.black },
  dateCenter: { flex: 1, alignItems: 'center', padding: SPACING.md },
  dateValue: { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.semiBold, color: COLORS.textMain },
  reasonInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: RADIUS.base,
    padding: SPACING.base,
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textMain,
    marginBottom: SPACING.xl,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  scheduleNote: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.brandOrange,
    marginBottom: SPACING.base,
    fontWeight: TYPOGRAPHY.medium,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xxl,
  },
  slotBtn: {
    width: '22%',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.slate200,
    ...SHADOWS.sm,
  },
  selectedSlot: {
    backgroundColor: COLORS.brandGreen,
    borderColor: COLORS.brandGreen,
    ...SHADOWS.green,
  },
  slotText: { color: COLORS.textSoft, fontWeight: TYPOGRAPHY.semiBold, fontSize: TYPOGRAPHY.sm },
  selectedSlotText: { color: COLORS.white, fontWeight: TYPOGRAPHY.black },
  confirmBtn: {
    backgroundColor: COLORS.brandGreen,
    borderRadius: RADIUS.base,
    paddingVertical: SPACING.base,
    alignItems: 'center',
    ...SHADOWS.green,
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: COLORS.white, fontSize: TYPOGRAPHY.base, fontWeight: TYPOGRAPHY.black, letterSpacing: 1.5 },
});
