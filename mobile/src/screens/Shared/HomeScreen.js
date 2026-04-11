import React, { useContext, useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator,
  TouchableOpacity,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../../theme/designSystem';
import FloatingChatbotButton from '../../components/FloatingChatbotButton';

const DASHBOARD_CONFIGS = {
  PATIENT: {
    title: 'Patient Portal',
    mainActionText: 'Next Appt',
    primaryGrid: [
      { id: 'book', label: 'Book Visit', icon: 'calendar-outline', target: 'AppointmentsTab', screen: 'Booking' },
      { id: 'prescriptions', label: 'My Meds', icon: 'document-text-outline', target: 'HomeTab', screen: 'Prescriptions' },
      { id: 'history', label: 'History', icon: 'time-outline', target: 'HomeTab', screen: 'HealthRecords' },
    ],
    secondaryGrid: [
      { id: 'doctors', label: 'Doctors', icon: 'people-outline', target: 'HomeTab', screen: 'Doctors' },
      { id: 'messages', label: 'Messages', icon: 'chatbubbles-outline', target: 'MessagesTab' },
      { id: 'reports', label: 'Lab Reports', icon: 'thermometer-outline', target: 'HomeTab', screen: 'HealthRecords' },
      { id: 'video', label: 'Video Call', icon: 'videocam-outline', target: 'HomeTab', screen: 'VideoCall' },
      { id: 'payments', label: 'Payments', icon: 'card-outline', target: 'ProfileTab' },
      { id: 'packages', label: 'Packages', icon: 'cube-outline', target: 'ProfileTab' },
      { id: 'profile', label: 'My Profile', icon: 'person-outline', target: 'ProfileTab' },
      { id: 'all', label: 'See All', icon: 'ellipsis-horizontal-outline', target: 'HomeTab' },
    ]
  },
  DOCTOR: {
    title: 'Doctor Portal',
    mainActionText: 'Pending Appts',
    primaryGrid: [
      { id: 'schedule', label: 'My Schedule', icon: 'calendar-outline', target: 'HomeTab', screen: 'Schedules' },
      { id: 'prescriptions', label: 'Issue Meds', icon: 'pencil-outline', target: 'HomeTab', screen: 'Prescriptions' },
      { id: 'patients', label: 'My Patients', icon: 'people-outline', target: 'PatientsTab' },
    ],
    secondaryGrid: [
      { id: 'upcoming', label: 'Upcoming', icon: 'time-outline', target: 'HomeTab', screen: 'Schedules' },
      { id: 'messages', label: 'Messages', icon: 'chatbubbles-outline', target: 'MessagesTab' },
      { id: 'video', label: 'Video Call', icon: 'videocam-outline', target: 'HomeTab', screen: 'VideoCall' },
      { id: 'reports', label: 'Reports', icon: 'pie-chart-outline', target: 'PatientsTab', screen: 'PatientHistory' },
      { id: 'wallet', label: 'Earnings', icon: 'cash-outline', target: 'ProfileTab' },
      { id: 'packages', label: 'Packages', icon: 'cube-outline', target: 'ProfileTab' },
      { id: 'profile', label: 'My Profile', icon: 'person-outline', target: 'ProfileTab' },
      { id: 'all', label: 'See All', icon: 'ellipsis-horizontal-outline', target: 'HomeTab' },
    ]
  }
};

export default function HomeScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({});

  const role = user?.role?.toUpperCase() === 'DOCTOR' ? 'DOCTOR' : 'PATIENT';
  const config = DASHBOARD_CONFIGS[role];

  const fetchData = useCallback(async () => {
    try {
      // Typically fetch specific endpoints. Mocked API calls context:
      const statsRes = await api.get(`/${role.toLowerCase()}/stats`).catch(() => ({ data: { pendingAppointments: 2, totalAppointments: 14 } }));
      setStats(statsRes.data || { pendingAppointments: 'N/A' });
    } catch (error) {
      console.error('[HomeScreen] Fetch Error', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role]);

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

  // Value mapping for the big green card
  const mainValue = stats.pendingAppointments || '0';

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Top App Bar (Custom equivalent of Native Header) ── */}
      <View style={styles.customHeader}>
        <View style={styles.headerProfileContainer}>
          <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
            {/* The profile initial or avatar with border over the Drawer menu toggle */}
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{user?.firstName?.[0] || 'U'}</Text>
              <View style={styles.menuIconOverlay}>
                <Ionicons name="menu" size={12} color={COLORS.white} />
              </View>
            </View>
          </TouchableOpacity>
          <Image source={require('../../../assets/images/logo.png')} style={styles.miniLogo} resizeMode="contain" />
          <Text style={styles.headerBrandText}>CureVirtual</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="search-outline" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Digital Wallet Style Green Card ── */}
        <View style={styles.walletCardWrapper}>
          <View style={styles.walletCard}>
            <View style={styles.walletTopRow}>
              <View style={styles.walletBadgeRow}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.white} />
                <Text style={styles.walletBadgeText}>{config.title}</Text>
              </View>
              <View style={styles.walletRewardsRow}>
                <Text style={styles.walletRewardsText}>My Ratings</Text>
                <View style={styles.starCircle}>
                  <Ionicons name="star" size={12} color="#FFF" />
                </View>
              </View>
            </View>

            <View style={styles.userInfoRowMain}>
              <Text style={styles.walletUserName}>{user?.firstName} {user?.lastName}</Text>
              <View style={styles.walletStatusRow}>
                <View style={styles.walletStatusDot} />
                <Text style={styles.walletStatusLabel}>Active Profile</Text>
              </View>
            </View>

            <Text style={styles.walletLabel}>{config.mainActionText}</Text>
            
            <View style={styles.walletValueRow}>
              <Text style={styles.walletValueText}>Count: {mainValue}</Text>
              <TouchableOpacity style={styles.addCashBtn}>
                <Text style={styles.addCashBtnText}>Action</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.walletSubText}>Tap to refresh data</Text>
          </View>
        </View>

        {/* ── Main Action Grid (3 Cards) ── */}
        <View style={styles.mainGridRow}>
          {config.primaryGrid.map((item, idx) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.mainGridCard}
              onPress={() => item.target ? navigation.navigate(item.target, item.screen ? { screen: item.screen } : {}) : null}
            >
              <View style={styles.mainGridIconBg}>
                <Ionicons name={item.icon} size={28} color={COLORS.brandGreen} />
              </View>
              <Text style={styles.mainGridText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Secondary Services Section (4-column Grid) ── */}
        <View style={styles.secondarySection}>
          <Text style={styles.sectionTitle}>More with CureVirtual</Text>
          
          <View style={styles.secondaryGridWrapper}>
            {config.secondaryGrid.map((item, idx) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.secondaryGridItem}
                onPress={() => item.target ? navigation.navigate(item.target, item.screen ? { screen: item.screen } : {}) : null}
              >
                <View style={styles.secondaryGridIconContainer}>
                   {/* Sometimes an overlay badge or mini icon represents a feature */}
                  <Ionicons name={item.icon} size={24} color={COLORS.brandGreen} />
                </View>
                <Text style={styles.secondaryGridText} numberOfLines={2}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Persistent floating chatbot integration */}
      <FloatingChatbotButton />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFCFA', // matching the gradient style bottom
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 100, // accommodate bottom tab & chatbot 
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    backgroundColor: 'transparent',
  },
  headerProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.brandGreen, // or image
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    position: 'relative',
    marginRight: SPACING.base,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuIconOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.black,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniLogo: {
    width: 28,
    height: 28,
    marginRight: 6,
  },
  headerBrandText: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.textMain,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconBtn: {
    marginLeft: SPACING.md,
  },

  // Wallet Card inside wrapper
  walletCardWrapper: {
    paddingHorizontal: SPACING.base,
    marginTop: SPACING.base,
    marginBottom: SPACING.xl,
  },
  walletCard: {
    backgroundColor: COLORS.brandGreen, // Primary solid green card
    borderRadius: 20,
    padding: SPACING.xl,
    ...SHADOWS.green,
  },
  walletTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  walletBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 6,
  },
  walletBadgeText: {
    color: COLORS.white,
    marginLeft: 6,
    fontSize: TYPOGRAPHY.xs,
    fontWeight: 'bold',
  },
  walletRewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletRewardsText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sm,
    marginRight: 6,
    fontWeight: 'bold',
  },
  starCircle: {
    backgroundColor: COLORS.brandOrange,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoRowMain: {
    marginTop: -SPACING.md,
    marginBottom: SPACING.lg,
  },
  walletUserName: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  walletStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  walletStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
    marginRight: 6,
  },
  walletStatusLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  walletLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: TYPOGRAPHY.sm,
    marginBottom: 4,
  },
  walletValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  walletValueText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: 'bold',
  },
  addCashBtn: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addCashBtnText: {
    color: COLORS.brandGreen,
    fontWeight: 'bold',
    fontSize: TYPOGRAPHY.sm,
  },
  walletSubText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },

  // 3 Boxes Primary Grid
  mainGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.xxl,
  },
  mainGridCard: {
    backgroundColor: COLORS.white,
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: SPACING.md,
    borderRadius: 16,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  mainGridIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.brandGreen}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  mainGridText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
    textAlign: 'center',
  },

  // 4-Column Secondary Grid
  secondarySection: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: SPACING.xxl,
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.section,
    ...SHADOWS.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: SPACING.xl,
  },
  secondaryGridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  secondaryGridItem: {
    width: '25%', // 4 columns
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  secondaryGridIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.slate50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.slate200,
  },
  secondaryGridText: {
    fontSize: 11,
    textAlign: 'center',
    color: COLORS.textSoft,
  },
});
