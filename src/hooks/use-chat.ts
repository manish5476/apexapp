// src/hooks/use-chat.ts
/**
 * Thin selector hooks — wrap the chat Zustand store so components stay decoupled.
 *
 * Usage:
 *   const messages  = useChannelMessages(channelId);
 *   const channels  = useChannels();
 *   const typing    = useTypingUsers(channelId);
 *   const isOnline  = useIsOnline(userId);
 */

import { useMemo } from 'react';
import { useChatStore } from '../store/chat.store';
import type { Message, Channel, TypingEvent } from '../services/socket/chat.models';

// ─── Messages ─────────────────────────────────────────────────────────────────

/** All messages for a specific channel, in chronological order */
export function useChannelMessages(channelId: string): Message[] {
  return useChatStore(
    (s) => s.messages.filter((m) => m.channelId === channelId)
  );
}

/** All messages currently in memory (across all channels) */
export function useAllMessages(): Message[] {
  return useChatStore((s) => s.messages);
}

// ─── Channels ─────────────────────────────────────────────────────────────────

/** Sidebar-ready channel list (pre-sorted by lastMessage) */
export function useChannels(): Channel[] {
  return useChatStore((s) => s.channels);
}

/** Single channel by id */
export function useChannel(channelId: string): Channel | undefined {
  return useChatStore((s) => s.channels.find((c) => c._id === channelId));
}

// ─── Presence ─────────────────────────────────────────────────────────────────

/** Returns true if a user is currently online */
export function useIsOnline(userId: string): boolean {
  return useChatStore((s) => s.onlineUsers.has(userId));
}

/** Full online user list as { userId }[] */
export function useOnlineUsers() {
  return useChatStore((s) => s.onlineUsersList());
}

// ─── Typing ───────────────────────────────────────────────────────────────────

/** Returns the list of userIds currently typing in a channel (excludes self) */
export function useTypingUsers(channelId: string, selfUserId?: string): string[] {
  const events = useChatStore((s) =>
    s.typingEvents.filter(
      (e) => e.channelId === channelId && e.typing && e.userId !== selfUserId
    )
  );

  return useMemo(() => {
    // Deduplicate — keep only the latest event per userId
    const map = new Map<string, TypingEvent>();
    events.forEach((e) => map.set(e.userId, e));
    // Only show events that arrived within the last 5s
    const cutoff = Date.now() - 5_000;
    return Array.from(map.values())
      .filter((e) => !e.timestamp || new Date(e.timestamp).getTime() > cutoff)
      .map((e) => e.userId);
  }, [events]);
}

// ─── Actions (pass-through for ergonomics) ────────────────────────────────────

export function useChatActions() {
  const joinChannel = useChatStore((s) => s.joinChannel);
  const sendTyping  = useChatStore((s) => s.sendTyping);
  const markRead    = useChatStore((s) => s.markRead);
  return { joinChannel, sendTyping, markRead };
}
