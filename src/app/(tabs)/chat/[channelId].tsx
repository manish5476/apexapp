// src/app/(tabs)/chat/[channelId].tsx
/**
 * Conversation screen — full real-time chat for a single channel.
 * Messages stream in from the Zustand chat store.
 */

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getElevation, Spacing, ThemeColors, Typography, UI } from '../../../constants/theme';
import { useAppTheme } from '../../../hooks/use-app-theme';
import {
  useChannel,
  useChannelMessages,
  useChatActions,
  useIsOnline,
  useTypingUsers,
} from '../../../hooks/use-chat';
import { useAuthStore } from '../../../store/auth.store';
import { useChatStore } from '../../../store/chat.store';
import { ChatService } from '../../../api/chatService';
import { ThemedText } from '../../../components/themed-text';
import { ThemedView } from '../../../components/themed-view';
import type { Message } from '../../../services/socket/chat.models';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMsgTime(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(a?: string, b?: string) {
  if (!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function dayLabel(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function getSenderId(msg: Message): string {
  if (typeof msg.senderId === 'string') return msg.senderId;
  return msg.senderId?._id ?? '';
}

function getSenderName(msg: Message): string {
  if (typeof msg.senderId === 'object') return msg.senderId?.name ?? 'Unknown';
  return '';
}

// ─── System / Date Divider ────────────────────────────────────────────────────

function DateDivider({ label, theme }: { label: string; theme: ThemeColors }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg, paddingHorizontal: Spacing['2xl'] }}>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.borderPrimary }} />
      <ThemedText style={{ fontFamily: theme.fonts.body, fontSize: Typography.size.xs, color: theme.textLabel, marginHorizontal: Spacing.lg }}>
        {label}
      </ThemedText>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.borderPrimary }} />
    </View>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

const MessageBubble = React.memo(({
  msg,
  isSelf,
  showName,
  theme,
}: {
  msg: Message;
  isSelf: boolean;
  showName: boolean;
  theme: ThemeColors;
}) => {
  const isDeleted = msg.deleted;

  return (
    <View style={[
      styles.bubbleWrap,
      isSelf ? styles.bubbleRight : styles.bubbleLeft,
    ]}>
      {showName && !isSelf && (
        <ThemedText style={[styles.senderName, { color: theme.accentPrimary, fontFamily: theme.fonts.heading }]}>
          {getSenderName(msg)}
        </ThemedText>
      )}
      <View style={[
        styles.bubble,
        isSelf
          ? { backgroundColor: theme.accentPrimary }
          : { backgroundColor: theme.bgSecondary, borderWidth: 1, borderColor: theme.borderPrimary },
        isDeleted && { opacity: 0.5 },
      ]}>
        {isDeleted ? (
          <ThemedText style={[styles.deletedText, { color: isSelf ? 'rgba(255,255,255,0.7)' : theme.textTertiary }]}>
            🗑 Message deleted
          </ThemedText>
        ) : (
          <ThemedText style={[
            styles.msgText,
            { color: isSelf ? '#fff' : theme.textPrimary },
          ]}>
            {msg.body}
          </ThemedText>
        )}
      </View>
      <ThemedText style={[styles.msgTime, { color: theme.textLabel, alignSelf: isSelf ? 'flex-end' : 'flex-start' }]}>
        {formatMsgTime(msg.createdAt)}
      </ThemedText>
    </View>
  );
});
MessageBubble.displayName = 'MessageBubble';

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ theme }: { theme: ThemeColors }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={[styles.typingWrap, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[styles.typingDot, { backgroundColor: theme.textTertiary, opacity: dot }]}
        />
      ))}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ConversationScreen() {
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const theme = useAppTheme();
  const { user } = useAuthStore();
  const selfUserId = user?._id ?? '';

  const channel = useChannel(channelId);
  const messages = useChannelMessages(channelId);
  const typingUsers = useTypingUsers(channelId, selfUserId);
  const { joinChannel, markRead, sendTyping } = useChatActions();

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const flatRef = useRef<FlatList>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Join channel & mark read on mount
  useEffect(() => {
    if (!channelId) return;
    joinChannel(channelId);
    markRead(channelId);
  }, [channelId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // Load older messages (pagination)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;
    const oldest = messages[0];
    setIsLoadingMore(true);
    try {
      const res = await ChatService.fetchMessages(channelId, oldest._id);
      if (!res.messages.length) { setHasMore(false); return; }
      useChatStore.getState()._prependMessages([...res.messages].reverse());
    } catch (e) {
      console.warn('loadMore error', e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [channelId, isLoadingMore, hasMore, messages]);

  // Handle typing events
  const handleInputChange = (text: string) => {
    setInputText(text);
    if (text.length > 0) {
      sendTyping(channelId, true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => sendTyping(channelId, false), 2_000);
    } else {
      sendTyping(channelId, false);
    }
  };

  const handleSend = async () => {
    const body = inputText.trim();
    if (!body || isSending) return;
    setInputText('');
    sendTyping(channelId, false);
    setIsSending(true);
    try {
      await ChatService.sendMessage({ channelId, body });
    } catch (e) {
      console.error('Send message failed', e);
      setInputText(body); // restore on failure
    } finally {
      setIsSending(false);
    }
  };

  // Build render data with date dividers
  const renderData = useMemo(() => {
    const result: Array<{ type: 'divider'; label: string } | { type: 'message'; msg: Message }> = [];
    messages.forEach((msg, i) => {
      const prev = messages[i - 1];
      if (!isSameDay(msg.createdAt, prev?.createdAt)) {
        result.push({ type: 'divider', label: dayLabel(msg.createdAt) });
      }
      result.push({ type: 'message', msg });
    });
    return result;
  }, [messages]);

  const renderItem = useCallback(({ item, index }: { item: typeof renderData[0]; index: number }) => {
    if (item.type === 'divider') {
      return <DateDivider label={item.label} theme={theme} />;
    }
    const msg = item.msg;
    const isSelf = getSenderId(msg) === selfUserId;
    const prevItem = renderData[index - 1];
    const prevMsg = prevItem?.type === 'message' ? prevItem.msg : null;
    const showName = !isSelf && getSenderId(msg) !== (prevMsg ? getSenderId(prevMsg) : '');
    return <MessageBubble msg={msg} isSelf={isSelf} showName={showName} theme={theme} />;
  }, [renderData, selfUserId, theme]);

  const keyExtractor = useCallback((item: typeof renderData[0], i: number) => {
    return item.type === 'divider' ? `div-${i}` : item.msg._id;
  }, []);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* ── Header ── */}
          <View style={[styles.header, { backgroundColor: theme.bgSecondary, borderBottomColor: theme.borderPrimary }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <ThemedText style={[styles.headerTitle, { color: theme.textPrimary, fontFamily: theme.fonts.heading }]} numberOfLines={1}>
                {channel?.name ?? 'Chat'}
              </ThemedText>
              {channel && (
                <ThemedText style={[styles.headerSub, { color: theme.textTertiary, fontFamily: theme.fonts.body }]}>
                  {channel.type === 'dm' ? 'Direct Message' : channel.type === 'announcement' ? '📢 Announcement' : `${channel.members?.length ?? 0} members`}
                </ThemedText>
              )}
            </View>
            <TouchableOpacity style={styles.headerAction}>
              <Ionicons name="information-circle-outline" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── Messages ── */}
          <FlatList
            ref={flatRef}
            data={renderData}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={[styles.messageList, { backgroundColor: theme.bgPrimary }]}
            onScrollToIndexFailed={() => {}}
            onEndReached={loadMore}
            onEndReachedThreshold={0.2}
            ListHeaderComponent={
              isLoadingMore ? (
                <ActivityIndicator color={theme.accentPrimary} style={{ marginVertical: Spacing.lg }} />
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="chatbubble-outline" size={48} color={theme.borderSecondary} />
                <ThemedText style={[styles.emptyText, { color: theme.textTertiary, fontFamily: theme.fonts.body }]}>
                  No messages yet. Say hello! 👋
                </ThemedText>
              </View>
            }
          />

          {/* ── Typing indicator ── */}
          {typingUsers.length > 0 && (
            <View style={[styles.typingPill, { backgroundColor: theme.bgPrimary }]}>
              <TypingIndicator theme={theme} />
              <ThemedText style={[styles.typingText, { color: theme.textTertiary, fontFamily: theme.fonts.body }]}>
                {typingUsers.length === 1 ? 'Someone is typing…' : 'Multiple people typing…'}
              </ThemedText>
            </View>
          )}

          {/* ── Composer ── */}
          <View style={[styles.composer, { backgroundColor: theme.bgSecondary, borderTopColor: theme.borderPrimary }]}>
            <TextInput
              style={[styles.composerInput, { backgroundColor: theme.bgPrimary, borderColor: theme.borderPrimary, color: theme.textPrimary, fontFamily: theme.fonts.body }]}
              placeholder="Type a message…"
              placeholderTextColor={theme.textLabel}
              value={inputText}
              onChangeText={handleInputChange}
              multiline
              maxLength={2000}
              returnKeyType="default"
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: inputText.trim() ? theme.accentPrimary : theme.disabled },
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
              activeOpacity={0.85}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

// ─── Styles (static — doesn't depend on theme so we keep it flat) ─────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: Typography.size.lg, fontWeight: '700' },
  headerSub: { fontSize: Typography.size.xs, marginTop: 1 },
  headerAction: { padding: Spacing.xs },

  messageList: { paddingVertical: Spacing.xl, paddingHorizontal: Spacing.xl, flexGrow: 1 },

  bubbleWrap: { marginVertical: 2, maxWidth: '80%' },
  bubbleLeft: { alignSelf: 'flex-start' },
  bubbleRight: { alignSelf: 'flex-end' },

  senderName: {
    fontSize: Typography.size.xs,
    fontWeight: '600',
    marginBottom: 3,
    marginLeft: 4,
  },

  bubble: {
    borderRadius: UI.borderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  msgText: {
    fontSize: Typography.size.md,
    lineHeight: 20,
  },
  deletedText: {
    fontSize: Typography.size.sm,
    fontStyle: 'italic',
  },
  msgTime: {
    fontSize: 10,
    marginTop: 3,
    marginHorizontal: 4,
  },

  typingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.sm,
  },
  typingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: UI.borderRadius.pill,
    borderWidth: 1,
  },
  typingDot: { width: 6, height: 6, borderRadius: 3 },
  typingText: { fontSize: Typography.size.xs },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: UI.borderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    fontSize: Typography.size.md,
    maxHeight: 120,
    lineHeight: 20,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: UI.borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, paddingTop: 80 },
  emptyText: { fontSize: Typography.size.md, textAlign: 'center' },
});
