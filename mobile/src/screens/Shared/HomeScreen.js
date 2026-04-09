import React, { useContext, useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

// Dashboard Components
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import StatGrid from '../../components/dashboard/StatGrid';
import StatCard from '../../components/dashboard/StatCard';
import DashboardSection from '../../components/dashboard/DashboardSection';

// Role-specific Section Items (Reuse existing or placeholder)
// In a real app, these would be separate component files
const ActivityItem = ({ title, subtitle, time, type }) => (
  <View style={styles.activityItem}>
    <View style={styles.activityIcon}>
      <Text style={styles.activityIconText}>{type === 'appointment' ? '📅' : '💬'}</Text>
    </View>
    <View style={styles.activityInfo}>
      <Text style={styles.activityTitle}>{title}</Text>
      <Text style={styles.activitySubtitle}>{subtitle}</Text>
    </View>
    <Text style={styles.activityTime}>{time}</Text>
  </View>
);

const ROLE_CONFIGS = {
  PATIENT: {
    title: 'Patient',
    endpoints: {
      stats: '/patient/stats',
      activities: '/patient/appointments'
    },
    statsMapping: [
      { key: 'totalAppointments', label: 'Visits', icon: 'calendar', color: COLORS.brandGreen },
      { key: 'pendingAppointments', label: 'Upcoming', icon: 'time', color: COLORS.brandBlue },
      { key: 'totalPrescriptions', label: 'Rx', icon: 'medical', color: COLORS.brandOrange },
      { key: 'totalDoctors', label: 'Doctors', icon: 'people', color: COLORS.success },
    ],
    sections: [
      { id: 'appointments', title: 'My Appointments', type: 'appointment' },
      { id: 'messages', title: 'Recent Messages', type: 'message' }
    ]
  },
  DOCTOR: {
    title: 'Doctor',
    endpoints: {
      stats: '/doctor/stats',
      activities: '/doctor/appointments'
    },
    statsMapping: [
      { key: 'totalAppointments', label: 'Total', icon: 'calendar', color: COLORS.brandGreen },
      { key: 'pendingAppointments', label: 'Pending', icon: 'time', color: COLORS.brandBlue },
      { key: 'completedAppointments', label: 'Done', icon: 'checkmark-circle', color: COLORS.success },
      { key: 'totalPrescriptions', label: 'Rx Sent', icon: 'medical', color: COLORS.brandOrange },
    ],
    sections: [
      { id: 'appointments', title: 'Upcoming Patients', type: 'appointment' },
      { id: 'messages', title: 'Chat Consultations', type: 'message' }
    ]
  },
  PHARMACY: {
    title: 'Pharmacy',
    endpoints: {
      stats: '/pharmacy/stats',
      activities: '/pharmacy/prescriptions'
    },
    statsMapping: [
      { key: 'totalOrders', label: 'Orders', icon: 'cart', color: COLORS.brandGreen },
      { key: 'pendingOrders', label: 'Pending', icon: 'hourglass', color: COLORS.warning },
      { key: 'totalMedicines', label: 'Meds', icon: 'medkit', color: COLORS.brandBlue },
      { key: 'revenue', label: 'Revenue', icon: 'cash', color: COLORS.success },
    ],
    sections: [
      { id: 'orders', title: 'Recent Orders', type: 'appointment' },
      { id: 'messages', title: 'Supplier Messages', type: 'message' }
    ]
  },
  ADMIN: {
    title: 'Admin',
    endpoints: {
      stats: '/admin-dashboard/dashboard-stats',
      activities: '/support/tickets'
    },
    statsMapping: [
      { key: 'totalUsers', label: 'Users', icon: 'people', color: COLORS.brandGreen },
      { key: 'totalDoctors', label: 'Doctors', icon: 'medkit', color: COLORS.brandBlue },
      { key: 'totalPatients', label: 'Patients', icon: 'person', color: COLORS.brandOrange },
      { key: 'revenue', label: 'Revenue', icon: 'trending-up', color: COLORS.success },
    ],
    sections: [
      { id: 'activity', title: 'System Activity', type: 'appointment' },
      { id: 'tickets', title: 'Support Tickets', type: 'message' }
    ]
  }
};

export default function HomeScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({});
  const [activities, setActivities] = useState([]);

  // Resolve role config
  const rawRole = user?.role?.toUpperCase() || 'PATIENT';
  const role = ['SUPERADMIN', 'SUPPORT'].includes(rawRole) ? 'ADMIN' : rawRole;
  const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.PATIENT;

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        api.get(config.endpoints.stats),
        api.get(config.endpoints.activities)
      ]);

      if (statsRes.data?.success) setStats(statsRes.data.data);
      else setStats(statsRes.data); // Fallback for various API shapes

      const activityData = Array.isArray(activityRes.data) ? activityRes.data : (activityRes.data?.data || []);
      setActivities(activityData.slice(0, 5)); // Only show top 5

    } catch (error) {
      console.error('[HomeScreen] Fetch Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [config]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.brandGreen} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        <DashboardHeader 
          name={user?.firstName || user?.name || 'User'} 
          role={config.title}
          onMenuPress={() => navigation.openDrawer()}
          onNotificationPress={() => {}}
          onProfilePress={() => navigation.navigate('ProfileTab')}
        />

        <View style={styles.body}>
          <StatGrid>
            {config.statsMapping.map((item, idx) => (
              <StatCard 
                key={idx}
                label={item.label}
                value={stats[item.key] || '0'}
                icon={item.icon}
                color={item.color}
                onPress={() => {}}
              />
            ))}
          </StatGrid>

          {config.sections.map((section, idx) => (
            <DashboardSection 
              key={idx} 
              title={section.title} 
              onViewAll={() => {}}
            >
              {activities.length > 0 ? (
                activities.map((act, i) => (
                  <ActivityItem 
                    key={i}
                    title={act.patient?.user?.firstName ? `${act.patient.user.firstName} ${act.patient.user.lastName}` : (act.doctor?.user?.firstName ? `Dr. ${act.doctor.user.firstName}` : 'Activity Item')}
                    subtitle={act.reason || act.status || 'General Consultation'}
                    time={new Date(act.appointmentDate || act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    type={section.type}
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>No recent {section.title.toLowerCase()}</Text>
              )}
            </DashboardSection>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  scrollContent: { paddingBottom: SPACING.xxxl },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { paddingBottom: SPACING.xl },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, marginVertical: SPACING.xl, fontSize: TYPOGRAPHY.sm },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.base,
    borderRadius: RADIUS.base,
    ...SHADOWS.sm,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.slate100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.base,
  },
  activityIconText: { fontSize: 20 },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  activitySubtitle: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  activityTime: { fontSize: TYPOGRAPHY.xs, color: COLORS.brandGreen, fontWeight: TYPOGRAPHY.bold },
});
