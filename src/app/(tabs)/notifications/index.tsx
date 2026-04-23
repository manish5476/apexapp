import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AnnouncementItem, AnnouncementService, CreateAnnouncementPayload } from '@/src/api/announcementService';
import { PermissionGate } from '@/src/components/permission/PermissionGate';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { PERMISSIONS } from '@/src/constants/permissions';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { useMasterDropdown } from '@/src/hooks/use-master-dropdown';
import { useNotifications } from '@/src/hooks/use-notifications';
import { usePermissions } from '@/src/hooks/use-permissions';

type ActiveTab = 'notifications' | 'announcements';

const EMPTY_FORM: CreateAnnouncementPayload = {
  title: '',
  message: '',
  type: 'info',
  targetAudience: 'all',
  targetIds: [],
  priority: 'low',
  isPinned: false,
  isUrgent: false,
};

export default function NotificationsScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { hasPermission } = usePermissions();
  const canReadAnnouncements = hasPermission(PERMISSIONS.ANNOUNCEMENT.READ);
  const canManageAnnouncements = hasPermission(PERMISSIONS.ANNOUNCEMENT.MANAGE);

  const roleDropdown = useMasterDropdown({ endpoint: 'roles', isMulti: true, limit: 100 });
  const userDropdown = useMasterDropdown({ endpoint: 'users', isMulti: true, limit: 100 });

  const [activeTab, setActiveTab] = useState<ActiveTab>('notifications');
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [targetSearch, setTargetSearch] = useState('');
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);

  const [form, setForm] = useState<CreateAnnouncementPayload>(EMPTY_FORM);

  const {
    notifications,
    unreadCount,
    isLoading,
    reloadNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications();

  const loadAnnouncements = useCallback(async () => {
    if (!canReadAnnouncements) return;
    setAnnouncementLoading(true);
    try {
      const data = await AnnouncementService.getAllAnnouncements({ page: 1, limit: 50 });
      setAnnouncements(data);
    } catch (error) {
      console.error('Failed to load announcements', error);
      Alert.alert('Error', 'Unable to load announcements.');
    } finally {
      setAnnouncementLoading(false);
    }
  }, [canReadAnnouncements]);

  useEffect(() => {
    if (canReadAnnouncements) loadAnnouncements().catch(() => {});
  }, [canReadAnnouncements, loadAnnouncements]);

  useEffect(() => {
    if (form.targetAudience === 'role') {
      roleDropdown.onSearch(targetSearch);
      return;
    }
    if (form.targetAudience === 'specific') {
      userDropdown.onSearch(targetSearch);
    }
  }, [form.targetAudience, targetSearch, roleDropdown, userDropdown]);

  const resetComposer = () => {
    setEditingAnnouncementId(null);
    setForm(EMPTY_FORM);
    setSelectedTargetIds([]);
    setTargetSearch('');
  };

  const toggleTargetId = (id: string) => {
    setSelectedTargetIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const startEdit = (item: AnnouncementItem) => {
    if (!canManageAnnouncements) return;
    setActiveTab('announcements');
    setEditingAnnouncementId(item._id);
    setForm({
      title: item.title || '',
      message: item.message || '',
      type: item.type || 'info',
      targetAudience: item.targetAudience || 'all',
      priority: item.priority || 'low',
      isPinned: Boolean(item.isPinned),
      isUrgent: Boolean(item.isUrgent),
      targetIds: item.targetIds || [],
    });
    setSelectedTargetIds(item.targetIds || []);
  };

  const submitAnnouncement = async () => {
    if (!canManageAnnouncements) return;
    if (!form.title?.trim() || !form.message?.trim()) {
      Alert.alert('Validation', 'Announcement title and message are required.');
      return;
    }

    const payload: CreateAnnouncementPayload = {
      ...form,
      title: form.title.trim(),
      message: form.message.trim(),
      targetIds: form.targetAudience === 'all' ? [] : selectedTargetIds,
    };

    setSendingAnnouncement(true);
    try {
      if (editingAnnouncementId) {
        const updated = await AnnouncementService.updateAnnouncement(editingAnnouncementId, payload);
        if (updated) {
          setAnnouncements((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
        }
        Alert.alert('Success', 'Announcement updated successfully.');
      } else {
        const created = await AnnouncementService.createAnnouncement(payload);
        if (created) {
          setAnnouncements((prev) => [created, ...prev]);
        }
        Alert.alert('Success', 'Announcement broadcasted successfully.');
      }
      resetComposer();
      setActiveTab('announcements');
    } catch (error) {
      console.error('Failed to save announcement', error);
      Alert.alert('Error', 'Unable to save announcement.');
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const confirmDeleteAnnouncement = (item: AnnouncementItem) => {
    if (!canManageAnnouncements) return;
    Alert.alert('Delete announcement', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await AnnouncementService.deleteAnnouncement(item._id);
            setAnnouncements((prev) => prev.filter((x) => x._id !== item._id));
          } catch (error) {
            console.error('Failed to delete announcement', error);
            Alert.alert('Error', 'Unable to delete announcement.');
          }
        },
      },
    ]);
  };

  const targetOptions = form.targetAudience === 'role' ? roleDropdown.options : userDropdown.options;

  const renderNotifications = () => (
    <FlatList
      data={notifications}
      keyExtractor={(item, index) => item._id ?? `${item.title}-${index}`}
      contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.list}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => reloadNotifications().catch(() => {})}
          tintColor={theme.accentPrimary}
        />
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          activeOpacity={0.82}
          style={[styles.card, !item.isRead && styles.unreadCard]}
          onPress={() => item._id && markAsRead(item._id).catch(() => {})}
          onLongPress={() =>
            item._id &&
            Alert.alert('Delete notification', 'Remove this notification?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => removeNotification(item._id!).catch(() => {}) },
            ])
          }
        >
          <View style={[styles.iconWrap, { backgroundColor: `${resolveColor(item.type, theme)}18` }]}>
            <Ionicons name={resolveIcon(item.type)} size={20} color={resolveColor(item.type, theme)} />
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
              {!item.isRead ? <View style={styles.unreadDot} /> : null}
            </View>
            <ThemedText style={styles.cardMessage}>{item.message}</ThemedText>
            <ThemedText style={styles.cardDate}>{formatDate(item.createdAt)}</ThemedText>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={44} color={theme.textTertiary} />
          <ThemedText style={styles.emptyTitle}>No notifications</ThemedText>
          <ThemedText style={styles.emptyText}>You are caught up right now.</ThemedText>
        </View>
      }
    />
  );

  const renderAnnouncements = () => {
    if (!canReadAnnouncements) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="megaphone-outline" size={44} color={theme.textTertiary} />
          <ThemedText style={styles.emptyTitle}>Announcements restricted</ThemedText>
          <ThemedText style={styles.emptyText}>You do not have permission to view announcements.</ThemedText>
        </View>
      );
    }

    if (announcementLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accentPrimary} />
        </View>
      );
    }

    return (
      <FlatList
        data={announcements}
        keyExtractor={(item) => item._id}
        contentContainerStyle={announcements.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl refreshing={announcementLoading} onRefresh={loadAnnouncements} tintColor={theme.accentPrimary} />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <View style={styles.cardHeader}>
                <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
                <ThemedText style={styles.chipText}>{(item.type || 'info').toUpperCase()}</ThemedText>
              </View>
              <ThemedText style={styles.cardMessage}>{item.message}</ThemedText>
              <View style={styles.rowBetween}>
                <ThemedText style={styles.cardDate}>{formatDate(item.createdAt)}</ThemedText>
                <ThemedText style={styles.cardDate}>Audience: {item.targetAudience || 'all'}</ThemedText>
              </View>
              {canManageAnnouncements ? (
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.rowAction} onPress={() => startEdit(item)}>
                    <Ionicons name="create-outline" size={16} color={theme.accentPrimary} />
                    <ThemedText style={styles.rowActionText}>Edit</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rowAction} onPress={() => confirmDeleteAnnouncement(item)}>
                    <Ionicons name="trash-outline" size={16} color={theme.error} />
                    <ThemedText style={[styles.rowActionText, { color: theme.error }]}>Delete</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={44} color={theme.textTertiary} />
            <ThemedText style={styles.emptyTitle}>No announcements</ThemedText>
            <ThemedText style={styles.emptyText}>Broadcasted announcements will appear here.</ThemedText>
          </View>
        }
      />
    );
  };

  return (
    <PermissionGate permissions={[PERMISSIONS.NOTIFICATION.READ]}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>Notification Bell</ThemedText>
              <ThemedText style={styles.subtitle}>{unreadCount} unread notifications</ThemedText>
            </View>
            {activeTab === 'notifications' ? (
              <TouchableOpacity style={styles.markAllButton} onPress={() => markAllAsRead().catch(() => {})}>
                <Ionicons name="checkmark-done-outline" size={18} color={theme.accentPrimary} />
                <ThemedText style={styles.markAllText}>Mark all</ThemedText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.markAllButton} onPress={loadAnnouncements}>
                <Ionicons name="refresh-outline" size={18} color={theme.accentPrimary} />
                <ThemedText style={styles.markAllText}>Refresh</ThemedText>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'notifications' && styles.tabButtonActive]}
              onPress={() => setActiveTab('notifications')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'notifications' && styles.tabTextActive]}>Notifications</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'announcements' && styles.tabButtonActive]}
              onPress={() => setActiveTab('announcements')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'announcements' && styles.tabTextActive]}>Announcements</ThemedText>
            </TouchableOpacity>
          </View>

          {canManageAnnouncements ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.announceComposerWrap}>
              <View style={styles.announceComposer}>
                <View style={styles.rowBetween}>
                  <ThemedText style={styles.composeTitle}>
                    {editingAnnouncementId ? 'Edit Announcement' : 'Broadcast Announcement'}
                  </ThemedText>
                  {editingAnnouncementId ? (
                    <TouchableOpacity onPress={resetComposer}>
                      <ThemedText style={styles.cancelEditText}>Cancel Edit</ThemedText>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.formRow}>
                  <TextInput
                    value={form.title}
                    onChangeText={(title) => setForm((prev) => ({ ...prev, title }))}
                    placeholder="Title"
                    placeholderTextColor={theme.textTertiary}
                    style={styles.input}
                  />
                  <TextInput
                    value={form.type || 'info'}
                    onChangeText={(type) => setForm((prev) => ({ ...prev, type }))}
                    placeholder="Type (info/success/warning/urgent)"
                    placeholderTextColor={theme.textTertiary}
                    style={styles.input}
                  />
                </View>

                <View style={styles.formRow}>
                  <TextInput
                    value={form.targetAudience || 'all'}
                    onChangeText={(targetAudience) => {
                      const next = targetAudience.toLowerCase();
                      setForm((prev) => ({ ...prev, targetAudience: next }));
                      setSelectedTargetIds([]);
                    }}
                    placeholder="Audience (all/role/specific)"
                    placeholderTextColor={theme.textTertiary}
                    style={styles.input}
                  />
                  <TextInput
                    value={form.priority || 'low'}
                    onChangeText={(priority) => setForm((prev) => ({ ...prev, priority }))}
                    placeholder="Priority (low/medium/high)"
                    placeholderTextColor={theme.textTertiary}
                    style={styles.input}
                  />
                </View>

                {form.targetAudience === 'role' || form.targetAudience === 'specific' ? (
                  <View style={styles.targetBox}>
                    <TextInput
                      value={targetSearch}
                      onChangeText={setTargetSearch}
                      placeholder={form.targetAudience === 'role' ? 'Search roles...' : 'Search users...'}
                      placeholderTextColor={theme.textTertiary}
                      style={styles.input}
                    />

                    <ScrollView style={styles.targetList}>
                      {targetOptions.map((option) => {
                        const checked = selectedTargetIds.includes(option.value);
                        return (
                          <TouchableOpacity key={option.value} style={styles.targetRow} onPress={() => toggleTargetId(option.value)}>
                            <Ionicons
                              name={checked ? 'checkbox' : 'square-outline'}
                              size={18}
                              color={checked ? theme.accentPrimary : theme.textTertiary}
                            />
                            <ThemedText style={styles.targetLabel}>{option.label}</ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}

                {selectedTargetIds.length > 0 ? (
                  <View style={styles.selectedWrap}>
                    {selectedTargetIds.map((id) => (
                      <View key={id} style={styles.selectedChip}>
                        <ThemedText style={styles.selectedChipText}>{id}</ThemedText>
                        <TouchableOpacity onPress={() => toggleTargetId(id)}>
                          <Ionicons name="close" size={14} color={theme.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={styles.switchGroup}>
                  <ThemedText style={styles.switchLabel}>Pinned</ThemedText>
                  <Switch
                    value={Boolean(form.isPinned)}
                    onValueChange={(isPinned) => setForm((prev) => ({ ...prev, isPinned }))}
                    thumbColor={theme.bgPrimary}
                    trackColor={{ false: theme.borderPrimary, true: theme.accentPrimary }}
                  />
                  <ThemedText style={styles.switchLabel}>Urgent</ThemedText>
                  <Switch
                    value={Boolean(form.isUrgent)}
                    onValueChange={(isUrgent) => setForm((prev) => ({ ...prev, isUrgent }))}
                    thumbColor={theme.bgPrimary}
                    trackColor={{ false: theme.borderPrimary, true: theme.error }}
                  />
                </View>

                <TextInput
                  value={form.message}
                  onChangeText={(message) => setForm((prev) => ({ ...prev, message }))}
                  placeholder="Write announcement message..."
                  placeholderTextColor={theme.textTertiary}
                  style={[styles.input, styles.messageInput]}
                  multiline
                  textAlignVertical="top"
                />

                <TouchableOpacity style={styles.broadcastButton} disabled={sendingAnnouncement} onPress={submitAnnouncement}>
                  {sendingAnnouncement ? (
                    <ActivityIndicator size="small" color={theme.bgPrimary} />
                  ) : (
                    <>
                      <Ionicons name={editingAnnouncementId ? 'save-outline' : 'megaphone-outline'} size={16} color={theme.bgPrimary} />
                      <ThemedText style={styles.broadcastText}>{editingAnnouncementId ? 'Update Announcement' : 'Broadcast Now'}</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : null}

          <View style={styles.body}>{activeTab === 'notifications' ? renderNotifications() : renderAnnouncements()}</View>
        </SafeAreaView>
      </ThemedView>
    </PermissionGate>
  );
}

const resolveIcon = (type?: string) => {
  switch (type) {
    case 'success':
      return 'checkmark-circle-outline';
    case 'warning':
      return 'warning-outline';
    case 'error':
    case 'urgent':
      return 'alert-circle-outline';
    default:
      return 'notifications-outline';
  }
};

const resolveColor = (type: string | undefined, theme: ThemeColors) => {
  switch (type) {
    case 'success':
      return theme.success;
    case 'warning':
      return theme.warning;
    case 'error':
    case 'urgent':
      return theme.error;
    default:
      return theme.accentPrimary;
  }
};

const formatDate = (value?: string) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Just now' : date.toLocaleString();
};

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgSecondary },
    safeArea: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1 },
    header: {
      padding: Spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.bgPrimary,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderPrimary,
    },
    title: {
      fontFamily: theme.fonts.heading,
      fontSize: Typography.size['2xl'],
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
    },
    subtitle: {
      color: theme.textSecondary,
      marginTop: 4,
    },
    markAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      backgroundColor: theme.bgSecondary,
      borderRadius: UI.borderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    markAllText: {
      color: theme.accentPrimary,
      fontWeight: Typography.weight.bold,
    },
    tabRow: {
      flexDirection: 'row',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      gap: Spacing.sm,
      backgroundColor: theme.bgPrimary,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderPrimary,
    },
    tabButton: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: UI.borderRadius.pill,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      backgroundColor: theme.bgSecondary,
    },
    tabButtonActive: {
      borderColor: theme.accentPrimary,
      backgroundColor: `${theme.accentPrimary}18`,
    },
    tabText: {
      color: theme.textSecondary,
      fontWeight: Typography.weight.semibold,
    },
    tabTextActive: {
      color: theme.accentPrimary,
      fontWeight: Typography.weight.bold,
    },
    announceComposerWrap: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      backgroundColor: theme.bgSecondary,
    },
    announceComposer: {
      minWidth: 760,
      width: '100%',
      backgroundColor: theme.bgPrimary,
      borderRadius: UI.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      padding: Spacing.md,
      gap: Spacing.sm,
      ...getElevation(1, theme),
    },
    composeTitle: {
      color: theme.textPrimary,
      fontWeight: Typography.weight.bold,
    },
    cancelEditText: {
      color: theme.warning,
      fontWeight: Typography.weight.bold,
      fontSize: Typography.size.xs,
    },
    formRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    input: {
      flex: 1,
      backgroundColor: theme.bgSecondary,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      color: theme.textPrimary,
    },
    messageInput: {
      minHeight: 80,
    },
    targetBox: {
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.md,
      padding: Spacing.sm,
      backgroundColor: theme.bgSecondary,
      gap: Spacing.sm,
    },
    targetList: {
      maxHeight: 120,
    },
    targetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: 6,
    },
    targetLabel: {
      color: theme.textPrimary,
      fontSize: Typography.size.sm,
    },
    selectedWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    selectedChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      backgroundColor: theme.bgSecondary,
      borderRadius: UI.borderRadius.pill,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    },
    selectedChipText: {
      color: theme.textSecondary,
      fontSize: Typography.size.xs,
    },
    switchGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.sm,
    },
    switchLabel: {
      color: theme.textSecondary,
      fontSize: Typography.size.xs,
    },
    broadcastButton: {
      marginTop: Spacing.xs,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: theme.accentPrimary,
      borderRadius: UI.borderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    broadcastText: {
      color: theme.bgPrimary,
      fontWeight: Typography.weight.bold,
    },
    list: {
      padding: Spacing.md,
      gap: Spacing.md,
    },
    emptyList: {
      flexGrow: 1,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
      backgroundColor: theme.bgPrimary,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      borderRadius: UI.borderRadius.lg,
      padding: Spacing.lg,
      ...getElevation(1, theme),
    },
    unreadCard: {
      borderColor: `${theme.accentPrimary}55`,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: {
      flex: 1,
      gap: Spacing.xs,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      marginTop: Spacing.sm,
    },
    rowAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    rowActionText: {
      color: theme.accentPrimary,
      fontWeight: Typography.weight.bold,
      fontSize: Typography.size.xs,
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    cardTitle: {
      flex: 1,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
    },
    cardMessage: {
      color: theme.textSecondary,
      lineHeight: 20,
    },
    cardDate: {
      fontSize: Typography.size.xs,
      color: theme.textTertiary,
    },
    chipText: {
      fontSize: Typography.size.xs,
      color: theme.accentPrimary,
      fontWeight: Typography.weight.bold,
    },
    unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.accentPrimary,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing['3xl'],
      gap: Spacing.sm,
    },
    emptyTitle: {
      fontSize: Typography.size.lg,
      fontWeight: Typography.weight.bold,
      color: theme.textPrimary,
    },
    emptyText: {
      textAlign: 'center',
      color: theme.textSecondary,
    },
  });

