import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

export default function MyPatientsScreen({ navigation }) {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPatients = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await api.get(`/doctor/my-patients?doctorId=${user.id}`);
      const data = response.data || [];
      setPatients(data);
    } catch (error) {
      console.error('[MyPatientsScreen] Failed to fetch patients:', error.message || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPatients();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PatientHistory', { patientId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.email}>{item.email}</Text>
          {item.profile?.user?.phone && (
            <Text style={styles.phone}>📞 {item.profile.user.phone}</Text>
          )}
        </View>
        <View style={styles.badgeContainer}>
          {item.bloodGroup && (
            <Text style={styles.condition}>{item.bloodGroup}</Text>
          )}
          {item.gender && (
            <Text style={[styles.condition, { backgroundColor: `${COLORS.brandGreen}15`, color: COLORS.brandGreen, marginTop: 4 }]}>
              {item.gender}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.lastVisit}>Patient Since: {new Date(item.profile?.createdAt).toLocaleDateString()}</Text>
        <Text style={styles.viewLink}>View History ›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Patients</Text>
        <Text style={styles.subtitle}>
          {loading ? 'Updating...' : `You have ${patients.length} assigned patients.`}
        </Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.brandGreen} />
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
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
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No patients found</Text>
              <Text style={styles.emptySubText}>
                Patients will appear here after they book appointments with you.
              </Text>
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
  header: { padding: SPACING.lg },
  title: { fontSize: TYPOGRAPHY.xxl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain },
  subtitle: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, marginTop: 4 },
  listContent: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.base,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  nameContainer: { flex: 1 },
  name: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  email: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, marginTop: 2 },
  phone: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, marginTop: 4 },
  badgeContainer: { alignItems: 'flex-end' },
  condition: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.brandBlue,
    fontWeight: 'bold',
    backgroundColor: `${COLORS.brandBlue}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.slate50,
    paddingTop: SPACING.sm,
  },
  lastVisit: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  viewLink: { fontSize: TYPOGRAPHY.xs, color: COLORS.brandGreen, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.md },
  emptyText: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.semiBold, color: COLORS.textMuted },
  emptySubText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textPlaceholder,
    textAlign: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.xxl,
  },
});
