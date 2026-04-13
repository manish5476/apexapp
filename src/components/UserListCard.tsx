import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { User } from '../api/userService';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing, UI, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';

interface UserListCardProps {
  user: User;
  onPress: (id: string) => void;
}

export function UserListCard({ user, onPress }: UserListCardProps) {
  const theme = useAppTheme();

  // Status Badge Logic
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return theme.success;
      case 'pending': return theme.warning;
      case 'inactive': return theme.textLabel;
      case 'suspended': return theme.error;
      case 'rejected': return theme.error;
      default: return theme.textTertiary;
    }
  };

  const roleName: string = (user.role && typeof user.role === 'object') ? user.role.name : String(user.role || 'No Role');
  const branchName: string = (user.branchId && typeof user.branchId === 'object') ? user.branchId.name : String(user.branchId || 'Global');

  return (
    <TouchableOpacity 
      onPress={() => onPress(user._id)}
      activeOpacity={0.7}
      style={[styles.card, { borderColor: theme.borderPrimary, backgroundColor: theme.bgSecondary }]}
    >
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.bgTernary }]}>
              <ThemedText style={{ color: theme.accentPrimary, fontWeight: 'bold' }}>
                {user.name.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}
          {user.isLoginBlocked && (
            <View style={[styles.lockIcon, { backgroundColor: theme.error }]}>
              <Ionicons name="lock-closed" size={10} color="white" />
            </View>
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <ThemedText type="defaultSemiBold" style={styles.name}>{user.name}</ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(user.status)}20` }]}>
              <ThemedText style={[styles.statusText, { color: getStatusColor(user.status) }]}>
                {user.status}
              </ThemedText>
            </View>
          </View>
          
          <ThemedText style={styles.email} numberOfLines={1}>{user.email}</ThemedText>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: theme.borderSecondary }]}>
        <View style={styles.meta}>
          <Ionicons name="briefcase-outline" size={14} color={theme.textTertiary} />
          <ThemedText style={styles.metaText}>{roleName}</ThemedText>
        </View>
        <View style={styles.meta}>
          <Ionicons name="location-outline" size={14} color={theme.textTertiary} />
          <ThemedText style={styles.metaText}>{branchName}</ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: UI.borderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  header: {
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  email: {
    fontSize: 12,
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.lg,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    opacity: 0.7,
  },
});
