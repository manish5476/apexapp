// src/app/(tabs)/chat/index.tsx
/**
 * Chat Inbox — lists all channels the user is a member of.
 * Real-time updates come from useChatStore via the socket.
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../store/auth.store';
import { useSocketStore } from '../../../store/socket.store';
import { getElevation, Spacing, ThemeColors, Themes, Typography, UI } from '../../../constants/theme';
import { useChannels } from '../../../hooks/use-chat';
import { useAppTheme } from '../../../hooks/use-app-theme';
import { ThemedText } from '../../../components/themed-text';
import { ThemedView } from '../../../components/themed-view';
import type { Channel } from '../../../services/socket/chat.models';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getChannelInitials(name: string = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
}

const AVATAR_COLORS = [
  '#e86510', '#2563eb', '#059669', '#7c3aed', '#0284c7',
  '#d97706', '#db2777', '#0891b2',
];
const avatarColor = (name: string) => AVATAR_COLORS[name.length % AVATAR_COLORS.length];

// ─── Channel Row ─────────────────────────────────────────────────────────────

const ChannelRow = React.memo(({
  item,
  theme,
  styles,
  selfUserId,
}: {
  item: Channel;
  theme: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  selfUserId: string;
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const lastMsg = item.lastMessage;
  const isDM = item.type === 'dm';
  const previewText = lastMsg?.body
    ? (lastMsg.body.length > 60 ? lastMsg.body.slice(0, 60) + '…' : lastMsg.body)
    : 'No messages yet';

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.985, useNativeDriver: true, speed: 50 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => router.push(`/chat/${item._id}` as any)}
        style={styles.row}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: avatarColor(item.name) }]}>
          {isDM ? (
            <Ionicons name="person" size={18} color="#fff" />
          ) : (
            <ThemedText style={styles.avatarText}>{getChannelInitials(item.name)}</ThemedText>
          )}
        </View>

        {/* Content */}
        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <View style={styles.rowNameWrap}>
              {item.type === 'announcement' && (
                <Ionicons name="megaphone-outline" size={12} color={theme.accentPrimary} />
              )}
              {item.type === 'group' && (
                <Ionicons name="people-outline" size={12} color={theme.textTertiary} />
              )}
              <ThemedText style={styles.channelName} numberOfLines={1}>{item.name}</ThemedText>
            </View>
            <ThemedText style={styles.timestamp}>
              {formatTime(lastMsg?.createdAt ?? item.updatedAt)}
            </ThemedText>
          </View>
          <ThemedText style={styles.preview} numberOfLines={1}>{previewText}</ThemedText>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});
ChannelRow.displayName = 'ChannelRow';

// ─── Connection Banner ────────────────────────────────────────────────────────

function ConnectionBanner({ theme }: { theme: ThemeColors }) {
  const status = useSocketStore((s) => s.status);
  if (status === 'connected') return null;
  const isReconnecting = status === 'reconnecting';
  return (
    <View style={{
      backgroundColor: isReconnecting ? `${theme.warning}22` : `${theme.error}18`,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing['2xl'],
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    }}>
      <ActivityIndicator size="small" color={isReconnecting ? theme.warning : theme.error} />
      <ThemedText style={{ fontSize: Typography.size.xs, color: isReconnecting ? theme.warning : theme.error, fontWeight: '600' }}>
        {isReconnecting ? 'Reconnecting…' : 'Disconnected'}
      </ThemedText>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ChatInboxScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuthStore();
  const selfUserId = user?._id ?? '';

  const allChannels = useChannels();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return allChannels;
    const q = search.toLowerCase();
    return allChannels.filter((c) => c.name.toLowerCase().includes(q));
  }, [allChannels, search]);

  const renderItem = useCallback(({ item }: { item: Channel }) => (
    <ChannelRow item={item} theme={theme} styles={styles} selfUserId={selfUserId} />
  ), [theme, styles, selfUserId]);

  const keyExtractor = useCallback((item: Channel) => item._id, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ConnectionBanner theme={theme} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.title}>Messages</ThemedText>
            <ThemedText style={styles.subtitle}>
              {allChannels.length} {allChannels.length === 1 ? 'channel' : 'channels'}
            </ThemedText>
          </View>
          <TouchableOpacity style={styles.composeBtn} activeOpacity={0.85}>
            <Ionicons name="create-outline" size={20} color={theme.bgSecondary} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={theme.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search channels…"
            placeholderTextColor={theme.textLabel}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={theme.borderSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={filtered.length === 0 ? styles.listEmpty : styles.list}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme.borderPrimary }]} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIcon, { backgroundColor: `${theme.accentPrimary}12` }]}>
                <Ionicons name="chatbubbles-outline" size={36} color={theme.accentPrimary} />
              </View>
              <ThemedText style={styles.emptyTitle}>
                {search ? 'No results' : 'No channels yet'}
              </ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                {search
                  ? `No channels match "${search}"`
                  : 'Channels will appear here once you join one'}
              </ThemedText>
            </View>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size['4xl'],
    fontWeight: '700',
    color: theme.textPrimary,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    color: theme.textTertiary,
    marginTop: 2,
  },
  composeBtn: {
    width: 44,
    height: 44,
    borderRadius: UI.borderRadius.pill,
    backgroundColor: theme.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    ...getElevation(2, theme),
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing['2xl'],
    marginBottom: Spacing.xl,
    backgroundColor: theme.bgSecondary,
    borderRadius: UI.borderRadius.lg,
    paddingHorizontal: Spacing.xl,
    height: 44,
    borderWidth: UI.borderWidth.thin,
    borderColor: theme.borderPrimary,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.md,
    color: theme.textPrimary,
  },

  list: { paddingBottom: 80 },
  listEmpty: { flex: 1, justifyContent: 'center' },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.xl,
    gap: Spacing.lg,
    backgroundColor: theme.bgPrimary,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: UI.borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: '#fff',
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.lg,
    fontWeight: '700',
  },
  rowContent: { flex: 1 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rowNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  channelName: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.md,
    fontWeight: '600',
    color: theme.textPrimary,
    flex: 1,
  },
  timestamp: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.xs,
    color: theme.textLabel,
  },
  preview: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    color: theme.textTertiary,
    lineHeight: 18,
  },
  separator: { height: 1, marginLeft: 80 },

  // Empty
  emptyWrap: { alignItems: 'center', gap: Spacing.lg, paddingBottom: 80 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: UI.borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: Typography.size.xl,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  emptySubtitle: {
    fontFamily: theme.fonts.body,
    fontSize: Typography.size.sm,
    color: theme.textTertiary,
    textAlign: 'center',
    maxWidth: 260,
  },
});
