import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { fetchUserProfile } from '../../services/authService';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../../theme/designSystem';

export default function ProfileScreen() {
  const { user: authUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      if (authUser?.id) {
        const fullProfile = await fetchUserProfile(authUser.id, authUser.role);
        
        // Data mapping: normalize nested data if it comes from /patient/profile
        // /patient/profile returns { ..., user: { ... } }
        // /users/:id returns { ... }
        const normalizedData = fullProfile.user ? { ...fullProfile.user, ...fullProfile } : fullProfile;
        
        setProfile(normalizedData);
      }
    } catch (error) {
      console.error('[ProfileScreen] Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  }, [authUser?.id, authUser?.role]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const renderInfoRow = (label, value) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'Not available'}</Text>
    </View>
  );

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (_) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.brandGreen} />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  // Display data (prefer profile, fallback to authUser)
  const displayUser = profile || authUser;
  const fullName = profile 
    ? `${profile.firstName} ${profile.lastName}`.trim() 
    : authUser?.name || 'User Profile';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>My Profile</Text>
        
        <View style={styles.profileCard}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.email}>{displayUser?.email || 'Not available'}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{displayUser?.role || 'User'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          {renderInfoRow('Email Address', displayUser?.email)}
          {renderInfoRow('Phone Number', displayUser?.phone)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          {renderInfoRow('Date of Birth', formatDate(displayUser?.dateOfBirth))}
          {renderInfoRow('Gender', displayUser?.gender)}
          {renderInfoRow('Marital Status', displayUser?.maritalStatus)}
          
          {/* Blood Type is usually only for patients */}
          {authUser?.role === 'PATIENT' && renderInfoRow('Blood Type', displayUser?.bloodGroup)}
        </View>

        <TouchableOpacity 
          style={styles.editBtn}
          onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available in the next update.')}
        >
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.editBtn, { backgroundColor: COLORS.white, marginTop: SPACING.md, borderWidth: 1, borderColor: COLORS.brandGreen }]}
          onPress={loadProfile}
        >
          <Text style={[styles.editBtnText, { color: COLORS.brandGreen }]}>Refresh Data</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgMuted },
  loadingText: { marginTop: SPACING.md, color: COLORS.textMuted, fontSize: TYPOGRAPHY.md },
  scrollContent: { padding: SPACING.lg },
  title: { fontSize: TYPOGRAPHY.xxl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain, marginBottom: SPACING.xl },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.slate100,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: { fontSize: 40 },
  name: { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  email: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, marginTop: 4 },
  badge: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.brandGreen + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    color: COLORS.brandGreen,
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    textTransform: 'uppercase',
  },
  section: { backgroundColor: COLORS.white, borderRadius: RADIUS.base, padding: SPACING.lg, marginBottom: SPACING.xl, ...SHADOWS.sm },
  sectionTitle: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.brandGreen, marginBottom: SPACING.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.slate100 },
  infoLabel: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted },
  infoValue: { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.semiBold, color: COLORS.textMain, flex: 1, textAlign: 'right', marginLeft: SPACING.md },
  editBtn: { backgroundColor: COLORS.brandGreen, paddingVertical: SPACING.md, borderRadius: RADIUS.base, alignItems: 'center', ...SHADOWS.green },
  editBtnText: { color: COLORS.white, fontWeight: TYPOGRAPHY.bold, fontSize: TYPOGRAPHY.md },
});
