// src/store/chat.store.ts
/**
 * React-Native port of Angular's ChatStateService.
 *
 * Instead of RxJS BehaviorSubject/Subject we use a single Zustand store.
 * The socket event listeners are registered once when `initChatListeners()`
 * is called (from the app root after auth is confirmed).
 *
 * Components consume state via normal Zustand selectors:
 *   const messages = useChatStore(s => s.messages);
 */

import { create } from 'zustand';
import { socketService } from '../services/socket/socket-connection.service';
import type {
  Channel,
  ChannelActivityEvent,
  Message,
  OnlineUser,
  ReadReceiptEvent,
  TypingEvent,
} from '../services/socket/chat.models';

// ─────────────────────────────────────────────────────────────────────────────
// State shape
// ─────────────────────────────────────────────────────────────────────────────

interface ChatState {
  /** Flat list of all messages across all channels currently in memory */
  messages: Message[];

  /** Map of channelId -> sorted channel list */
  channels: Channel[];

  /** Map channelId -> userId[] currently in that channel */
  channelUsers: Record<string, string[]>;

  /** Set of userId strings that are currently online */
  onlineUsers: Set<string>;

  /** Latest typing event (components filter by channelId themselves) */
  typingEvents: TypingEvent[];

  /** Latest read-receipt events */
  readReceipts: ReadReceiptEvent[];

  // ── Mutators (used internally by initChatListeners) ───────────────────────
  _addOrUpdateMessage: (msg: Message) => void;
  _editMessage: (msg: Message) => void;
  _deleteMessage: (messageId: string) => void;
  _prependMessages: (msgs: Message[]) => void;
  _markMessageRead: (messageId: string, userId: string, readAt: string) => void;

  _setChannels: (channels: Channel[]) => void;
  _updateChannelActivity: (data: ChannelActivityEvent) => void;
  _addChannel: (channel: Channel) => void;
  _updateChannel: (channel: Channel) => void;
  _removeChannel: (channelId: string) => void;

  _setChannelUsers: (channelId: string, users: string[]) => void;
  _addChannelUser: (channelId: string, userId: string) => void;
  _removeChannelUser: (channelId: string, userId: string) => void;

  _addOnlineUser: (userId: string) => void;
  _removeOnlineUser: (userId: string) => void;
  _setOnlineUsers: (userIds: string[]) => void;

  _pushTyping: (event: TypingEvent) => void;
  _pushReadReceipt: (event: ReadReceiptEvent) => void;

  // ── Public actions (called from UI / hooks) ───────────────────────────────
  joinChannel: (channelId: string) => void;
  sendTyping: (channelId: string, isTyping: boolean) => void;
  markRead: (channelId: string, messageIds?: string[]) => void;

  /** Returns the online user list as a plain array */
  onlineUsersList: () => OnlineUser[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  channels: [],
  channelUsers: {},
  onlineUsers: new Set<string>(),
  typingEvents: [],
  readReceipts: [],

  // ── Message mutators ────────────────────────────────────────────────────────

  _addOrUpdateMessage: (msg) =>
    set((s) => {
      if (s.messages.some((m) => m._id === msg._id)) return s;
      return { messages: [...s.messages, msg] };
    }),

  _editMessage: (msg) =>
    set((s) => ({
      messages: s.messages.map((m) => (m._id === msg._id ? msg : m)),
    })),

  _deleteMessage: (messageId) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m._id === messageId ? { ...m, body: '', attachments: [], deleted: true } : m
      ),
    })),

  _prependMessages: (newMsgs) =>
    set((s) => {
      const existingIds = new Set(s.messages.map((m) => m._id));
      const fresh = newMsgs.filter((m) => !existingIds.has(m._id));
      return { messages: [...fresh, ...s.messages] };
    }),

  _markMessageRead: (messageId, userId, readAt) =>
    set((s) => {
      const msg = s.messages.find((m) => m._id === messageId);
      if (!msg) return s;
      const receipt: ReadReceiptEvent = {
        userId,
        channelId: msg.channelId,
        messageIds: [messageId],
        timestamp: readAt,
      };
      return { readReceipts: [...s.readReceipts, receipt] };
    }),

  // ── Channel mutators ────────────────────────────────────────────────────────

  _setChannels: (channels) => set({ channels }),

  _updateChannelActivity: (data) =>
    set((s) => {
      const idx = s.channels.findIndex((c) => String(c._id) === String(data.channelId));
      if (idx === -1) return s;
      const updated = { ...s.channels[idx], lastMessage: data.lastMessage };
      const filtered = s.channels.filter((c) => String(c._id) !== String(data.channelId));
      return { channels: [updated, ...filtered] };
    }),

  _addChannel: (channel) =>
    set((s) => {
      if (s.channels.some((c) => c._id === channel._id)) return s;
      return { channels: [channel, ...s.channels] };
    }),

  _updateChannel: (channel) =>
    set((s) => ({
      channels: s.channels.map((c) => (c._id === channel._id ? channel : c)),
    })),

  _removeChannel: (channelId) =>
    set((s) => ({
      channels: s.channels.filter((c) => c._id !== channelId),
      messages: s.messages.filter((m) => m.channelId !== channelId),
    })),

  // ── Channel users ────────────────────────────────────────────────────────────

  _setChannelUsers: (channelId, users) =>
    set((s) => ({ channelUsers: { ...s.channelUsers, [channelId]: users } })),

  _addChannelUser: (channelId, userId) =>
    set((s) => {
      const users = s.channelUsers[channelId] ?? [];
      if (users.includes(userId)) return s;
      return { channelUsers: { ...s.channelUsers, [channelId]: [...users, userId] } };
    }),

  _removeChannelUser: (channelId, userId) =>
    set((s) => ({
      channelUsers: {
        ...s.channelUsers,
        [channelId]: (s.channelUsers[channelId] ?? []).filter((u) => u !== userId),
      },
    })),

  // ── Online users ────────────────────────────────────────────────────────────

  _addOnlineUser: (userId) =>
    set((s) => {
      const next = new Set(s.onlineUsers);
      next.add(userId);
      return { onlineUsers: next };
    }),

  _removeOnlineUser: (userId) =>
    set((s) => {
      const next = new Set(s.onlineUsers);
      next.delete(userId);
      return { onlineUsers: next };
    }),

  _setOnlineUsers: (userIds) => set({ onlineUsers: new Set(userIds) }),

  // ── Presence ─────────────────────────────────────────────────────────────────

  _pushTyping: (event) =>
    set((s) => {
      // Keep only the last 50 typing events to avoid unbounded growth
      const next = [...s.typingEvents.slice(-49), event];
      return { typingEvents: next };
    }),

  _pushReadReceipt: (event) =>
    set((s) => ({ readReceipts: [...s.readReceipts.slice(-99), event] })),

  // ── Selectors ───────────────────────────────────────────────────────────────

  onlineUsersList: () =>
    Array.from(get().onlineUsers).map((userId) => ({ userId })),

  // ── Public actions ───────────────────────────────────────────────────────────

  joinChannel: (channelId) => socketService.emit('joinChannel', { channelId }),
  sendTyping: (channelId, isTyping) => socketService.emit('typing', { channelId, typing: isTyping }),
  markRead: (channelId, messageIds?) => socketService.emit('markRead', { channelId, messageIds }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Wire socket listeners to the store (call once after auth)
// ─────────────────────────────────────────────────────────────────────────────

let _listenersRegistered = false;

export function initChatListeners() {
  if (_listenersRegistered) return;
  _listenersRegistered = true;

  const s = useChatStore.getState();

  // ── Messages ──────────────────────────────────────────────────────────────
  socketService.on('newMessage', (msg: Message) => s._addOrUpdateMessage(msg));
  socketService.on('messageEdited', (msg: Message) => s._editMessage(msg));
  socketService.on('messageDeleted', (data: { messageId: string }) => s._deleteMessage(data.messageId));
  socketService.on('messages', (payload: { channelId: string; messages: Message[] }) => {
    s._prependMessages([...payload.messages].reverse());
  });
  socketService.on('messageRead', (data: { messageId: string; userId: string; readAt: string }) => {
    s._markMessageRead(data.messageId, data.userId, data.readAt);
  });

  // ── Channels ──────────────────────────────────────────────────────────────
  socketService.on('initialData', (data: any) => {
    if (data.channels) s._setChannels(data.channels);
  });
  socketService.on('channelActivity', (data: ChannelActivityEvent) => s._updateChannelActivity(data));
  socketService.on('channelCreated', (channel: Channel) => s._addChannel(channel));
  socketService.on('channelUpdated', (channel: Channel) => s._updateChannel(channel));
  socketService.on('removedFromChannel', (data: { channelId: string }) => s._removeChannel(data.channelId));

  // ── Presence ──────────────────────────────────────────────────────────────
  socketService.on('userTyping', (data: TypingEvent) => s._pushTyping(data));
  socketService.on('readReceipt', (data: ReadReceiptEvent) => s._pushReadReceipt(data));
  socketService.on('channelUsers', (data: { channelId: string; users: string[] }) =>
    s._setChannelUsers(data.channelId, data.users)
  );
  socketService.on('userJoinedChannel', (data: { channelId: string; userId: string }) =>
    s._addChannelUser(data.channelId, data.userId)
  );
  socketService.on('userLeftChannel', (data: { channelId: string; userId: string }) =>
    s._removeChannelUser(data.channelId, data.userId)
  );

  // ── Online users ──────────────────────────────────────────────────────────
  socketService.on('userOnline', (data: OnlineUser) => s._addOnlineUser(data.userId));
  socketService.on('userOffline', (data: OnlineUser) => s._removeOnlineUser(data.userId));
  socketService.on('orgOnlineUsers', (data: { users: string[] }) => s._setOnlineUsers(data.users));

  console.log('🔌 Chat socket listeners registered');
}

/** Call on logout to reset listener guard so next login re-registers cleanly */
export function destroyChatListeners() {
  _listenersRegistered = false;
  socketService.removeAllListeners();
}
