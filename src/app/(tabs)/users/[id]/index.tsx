import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../../../../components/themed-text';
import { ThemedView } from '../../../../components/themed-view';
import { UserService, User } from '../../../../api/userService';
import { Spacing, UI } from '../../../../constants/theme';
import { useAppTheme } from '../../../../hooks/use-app-theme';

export default function UserDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useAppTheme();
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    try {
      const response = await UserService.getUser(id as string);
      setUser(response.data?.data || response.data?.user || response.data);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={theme.accentPrimary} />
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>User not found</ThemedText>
      </ThemedView>
    );
  }

  const roleName: string = (user.role && typeof user.role === 'object') ? user.role.name : String(user.role || 'N/A');
  const deptName: string = (user.employeeProfile?.departmentId && typeof user.employeeProfile.departmentId === 'object') 
    ? user.employeeProfile.departmentId.name : String(user.employeeProfile?.departmentId || 'N/A');

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header Actions */}
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push(`/users/${id}/edit` as any)}
            style={[styles.editButton, { backgroundColor: theme.accentPrimary }]}
          >
            <Ionicons name="pencil" size={18} color="white" />
            <ThemedText style={styles.editText}>Edit Profile</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrapper}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.largeAvatar} />
              ) : (
                <View style={[styles.largeAvatar, styles.avatarPlaceholder, { backgroundColor: theme.bgTernary }]}>
                  <ThemedText style={{ fontSize: 32, color: theme.accentPrimary, fontWeight: 'bold' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
              )}
              <View style={[styles.statusIndicator, { backgroundColor: user.isActive ? theme.success : theme.textLabel }]} />
            </View>
            
            <ThemedText type="title" style={styles.userName}>{user.name}</ThemedText>
            <View style={styles.badgeRow}>
              <View style={[styles.pill, { backgroundColor: theme.bgTernary }]}>
                <ThemedText style={styles.pillText}>{roleName}</ThemedText>
              </View>
              <View style={[styles.pill, { backgroundColor: theme.bgTernary }]}>
                <ThemedText style={styles.pillText}>{deptName}</ThemedText>
              </View>
            </View>
          </View>

          {/* Quick Info Grid */}
          <View style={styles.infoGrid}>
            <InfoItem icon="mail-outline" label="Email" value={user.email} />
            <InfoItem icon="call-outline" label="Phone" value={user.phone} />
          </View>

          {/* Details Sections */}
          <DetailSection title="Employment Info" icon="briefcase-outline">
            <DataRow label="Employee ID" value={user.employeeProfile?.employeeId || 'Not Assigned'} />
            <DataRow label="Type" value={user.employeeProfile?.employmentType || 'Permanent'} />
            <DataRow label="Location" value={user.employeeProfile?.workLocation || 'HQ'} />
          </DetailSection>

          <DetailSection title="Security & Access" icon="shield-checkmark-outline">
            <DataRow label="Status" value={user.status} />
            <DataRow label="Login" value={user.isActive ? 'Enabled' : 'Disabled'} />
            <DataRow label="Device Lock" value={user.isLoginBlocked ? 'Locked' : 'Unlocked'} />
          </DetailSection>

          <DetailSection title="Attendance Settings" icon="time-outline">
            <DataRow label="Track Attendance" value={user.attendanceConfig?.isAttendanceEnabled ? 'Yes' : 'No'} />
            <DataRow label="Biometric ID" value={user.attendanceConfig?.machineUserId || 'N/A'} />
            <DataRow label="Mobile Punch" value={user.attendanceConfig?.allowMobilePunch ? 'Allowed' : 'Not Allowed'} />
          </DetailSection>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// Sub-components
function InfoItem({ icon, label, value }: any) {
  const theme = useAppTheme();
  return (
    <View style={[styles.infoItem, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
      <Ionicons name={icon} size={20} color={theme.accentPrimary} />
      <View>
        <ThemedText style={styles.infoLabel}>{label}</ThemedText>
        <ThemedText style={styles.infoValue}>{value}</ThemedText>
      </View>
    </View>
  );
}

function DetailSection({ title, icon, children }: any) {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color={theme.textTertiary} />
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      </View>
      <View style={[styles.sectionCard, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
        {children}
      </View>
    </View>
  );
}

function DataRow({ label, value }: any) {
  const theme = useAppTheme();
  return (
    <View style={styles.dataRow}>
      <ThemedText style={styles.dataLabel}>{label}</ThemedText>
      <ThemedText style={styles.dataValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  editText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  container: {
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  largeAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 4,
    borderColor: 'white',
  },
  userName: {
    marginBottom: Spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 11,
    fontWeight: 'bold',
    opacity: 0.8,
  },
  infoGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  infoItem: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: UI.borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontSize: 10,
    opacity: 0.6,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  sectionCard: {
    borderRadius: UI.borderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dataLabel: {
    fontSize: 13,
    opacity: 0.6,
  },
  dataValue: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
