import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth.store';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, organization, session } = useAuthStore();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* Header Section */}
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.welcomeText}>Good day,</ThemedText>
              <ThemedText type="title" style={styles.nameText}>{user?.name?.split(' ')[0] || 'Member'}</ThemedText>
            </View>
            <TouchableOpacity style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={24} color="#0A0A0A" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>

          {/* Org Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={styles.orgInfo}>
                <ThemedText style={styles.orgName}>{organization?.name || 'Workspace'}</ThemedText>
                <ThemedText style={styles.orgId}>{organization?.uniqueShopId || '---'}</ThemedText>
              </View>
              <View style={styles.roleBadge}>
                <ThemedText style={styles.roleText}>{user?.role || 'User'}</ThemedText>
              </View>
            </View>
          </View>

          {/* Highlights Grid */}
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Current Session</ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name="globe-outline" size={20} color="#E8622A" style={styles.statIcon} />
              <ThemedText style={styles.statLabel}>IP ADDRESS</ThemedText>
              <ThemedText style={styles.statValue}>{session?.ipAddress || '::1'}</ThemedText>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="desktop-outline" size={20} color="#E8622A" style={styles.statIcon} />
              <ThemedText style={styles.statLabel}>BROWSER</ThemedText>
              <ThemedText style={styles.statValue}>{session?.browser || 'Chrome'}</ThemedText>
            </View>
          </View>

          {/* Quick Actions */}
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Quick Actions</ThemedText>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIconBg, { backgroundColor: '#F0F9FF' }]}>
                <Ionicons name="people-outline" size={24} color="#0369A1" />
              </View>
              <ThemedText style={styles.actionLabel}>Employees</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIconBg, { backgroundColor: '#FDF2F8' }]}>
                <Ionicons name="clipboard-outline" size={24} color="#BE185D" />
              </View>
              <ThemedText style={styles.actionLabel}>Attendance</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIconBg, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="stats-chart-outline" size={24} color="#15803D" />
              </View>
              <ThemedText style={styles.actionLabel}>Reports</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Recent Activity Placeholder */}
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Recent Activity</ThemedText>
          <View style={styles.activityCard}>
            <Ionicons name="time-outline" size={24} color="#9CA3AF" />
            <ThemedText style={styles.placeholderText}>Systems are operational. No recent alerts.</ThemedText>
          </View>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { padding: 24, paddingBottom: 100 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10
  },
  welcomeText: { fontSize: 16, color: '#737066' },
  nameText: { fontSize: 28, fontWeight: '800', color: '#0A0A0A', letterSpacing: -0.5 },
  notificationBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  notificationBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: 'white'
  },
  statusCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    elevation: 4
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  orgInfo: { flex: 1 },
  orgName: { color: 'white', fontSize: 18, fontWeight: '700' },
  orgId: { color: '#737373', fontSize: 12, fontWeight: '600', marginTop: 4, letterSpacing: 0.5 },
  roleBadge: {
    backgroundColor: '#E8622A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  roleText: { color: 'white', fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 14, color: '#0A0A0A', marginBottom: 16, marginTop: 8, letterSpacing: 1, textTransform: 'uppercase' },
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  statBox: {
    flex: 1,
    backgroundColor: '#F9F9F8',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E3DE'
  },
  statIcon: { marginBottom: 12 },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#737066', letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700', color: '#0A0A0A' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  actionCard: { alignItems: 'center', width: (width - 48 - 32) / 3 },
  actionIconBg: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E3DE',
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 12
  },
  placeholderText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' }
});
