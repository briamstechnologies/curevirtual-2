import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import scheduleService from '../../services/scheduleService';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

const DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export default function SchedulesScreen() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [saving, setSaving] = useState(false);

  const fetchSchedule = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await scheduleService.getDoctorSchedule(user.id);
      setSchedules(data);
    } catch (error) {
      console.error('[SchedulesScreen] Fetch failed:', error);
      Alert.alert('Error', 'Failed to load your schedule.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedule();
  };

  const openEditModal = (dayIndex, slot = null) => {
    setSelectedDay(dayIndex);
    if (slot) {
      setEditingSlot(slot);
      setStartTime(slot.startTime);
      setEndTime(slot.endTime);
    } else {
      setEditingSlot(null);
      setStartTime('09:00');
      setEndTime('17:00');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    // Basic validation
    if (!startTime || !endTime) {
      Alert.alert('Invalid Time', 'Please provide both start and end times.');
      return;
    }

    try {
      setSaving(true);
      if (editingSlot) {
        await scheduleService.updateScheduleSlot(editingSlot.id, {
          startTime,
          endTime,
        });
      } else {
        await scheduleService.createScheduleSlot({
          doctorId: user.id,
          dayOfWeek: selectedDay,
          startTime,
          endTime,
        });
      }
      setModalVisible(false);
      fetchSchedule();
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to save schedule.';
      Alert.alert('Conflict or Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Delete Slot',
      'Are you sure you want to remove this availability block?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await scheduleService.deleteScheduleSlot(id);
              fetchSchedule();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete slot.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderDaySchedule = (dayIndex) => {
    const dayName = DAYS[dayIndex];
    const daySlots = schedules.filter(s => s.dayOfWeek === dayIndex);

    return (
      <View key={dayIndex} style={styles.dayCard}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayName}>{dayName}</Text>
          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => openEditModal(dayIndex)}
          >
            <Ionicons name="add-circle" size={24} color={COLORS.brandGreen} />
            <Text style={styles.addBtnText}>Add Slot</Text>
          </TouchableOpacity>
        </View>

        {daySlots.length === 0 ? (
          <Text style={styles.noSlots}>No availability set</Text>
        ) : (
          daySlots.map((slot) => (
            <View key={slot.id} style={styles.slotRow}>
              <View style={styles.slotTimeBox}>
                <Ionicons name="time-outline" size={16} color={COLORS.brandGreen} />
                <Text style={styles.slotTimeText}>{slot.startTime} - {slot.endTime}</Text>
              </View>
              <View style={styles.slotActions}>
                <TouchableOpacity onPress={() => openEditModal(dayIndex, slot)} style={styles.actionBtn}>
                  <Ionicons name="pencil" size={18} color={COLORS.textSoft} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(slot.id)} style={styles.actionBtn}>
                  <Ionicons name="trash" size={18} color={COLORS.brandOrange} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Schedule</Text>
        <Text style={styles.subtitle}>Define your weekly consultation hours here.</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.brandGreen} />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {DAYS.map((_, index) => renderDaySchedule(index))}
        </ScrollView>
      )}

      {/* Edit/Add Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingSlot ? 'Edit Slot' : 'Add Slot'} for {DAYS[selectedDay]}
            </Text>

            <View style={styles.timeInputGroup}>
              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>START TIME (HH:MM)</Text>
                <TextInput
                  style={styles.textInput}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="09:00"
                  maxLength={5}
                />
              </View>
              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>END TIME (HH:MM)</Text>
                <TextInput
                  style={styles.textInput}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="17:00"
                  maxLength={5}
                />
              </View>
            </View>

            <Text style={styles.hint}>Use 24-hour format (e.g., 14:30 for 02:30 PM)</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.saveBtn]} 
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Slot</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  header: { padding: SPACING.lg },
  title: { fontSize: TYPOGRAPHY.xxl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain },
  subtitle: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, marginTop: 4 },
  scrollContent: { padding: SPACING.lg, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  dayCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.base,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate50,
    paddingBottom: SPACING.sm,
  },
  dayName: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { fontSize: TYPOGRAPHY.xs, fontWeight: 'bold', color: COLORS.brandGreen },
  
  noSlots: { fontSize: TYPOGRAPHY.xs, color: COLORS.textPlaceholder, fontStyle: 'italic' },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgMuted,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  slotTimeBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotTimeText: { fontSize: TYPOGRAPHY.sm, fontWeight: '600', color: COLORS.textMain },
  slotActions: { flexDirection: 'row', gap: SPACING.md },
  actionBtn: { padding: 4 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.lg,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textMain,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  timeInputGroup: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.md },
  inputBox: { flex: 1 },
  inputLabel: { fontSize: 10, fontWeight: 'bold', color: COLORS.brandGreen, marginBottom: 4 },
  textInput: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.lg,
    fontWeight: 'bold',
    textAlign: 'center',
    color: COLORS.textMain,
  },
  hint: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.xl },
  modalActions: { flexDirection: 'row', gap: SPACING.md },
  modalBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.base, alignItems: 'center' },
  cancelBtn: { backgroundColor: COLORS.slate100 },
  cancelBtnText: { color: COLORS.textSoft, fontWeight: 'bold' },
  saveBtn: { backgroundColor: COLORS.brandGreen },
  saveBtnText: { color: COLORS.white, fontWeight: 'bold' },
});
