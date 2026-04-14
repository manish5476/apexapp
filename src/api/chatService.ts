// src/api/chatService.ts
/**
 * React-Native port of Angular's ChatHttpService.
 * Uses the existing axios apiClient (handles auth token automatically).
 */

import apiClient from './client';
import { environment } from '../constants/environment';
import type { Message, Channel, Attachment } from '../services/socket/chat.models';

const BASE = '/v1/chat';

export const ChatService = {
  // ── Messages ────────────────────────────────────────────────────────────────

  sendMessage(payload: { channelId: string; body: string; attachments?: Attachment[] }): Promise<Message> {
    const { channelId, body, attachments = [] } = payload;
    if (!channelId || (!body && !attachments.length)) {
      return Promise.reject(new Error('Invalid Payload'));
    }
    return apiClient.post<any, Message>(`${BASE}/messages`, payload);
  },

  editMessage(messageId: string, body: string): Promise<Message> {
    return apiClient.patch<any, Message>(`${BASE}/messages/${messageId}`, { body });
  },

  deleteMessage(messageId: string): Promise<void> {
    return apiClient.delete(`${BASE}/messages/${messageId}`);
  },

  fetchMessages(
    channelId: string,
    before?: string,
    limit = 50
  ): Promise<{ messages: Message[] }> {
    const params: Record<string, any> = { limit };
    if (before) params.before = before;
    return apiClient.get<any, { messages: Message[] }>(
      `${BASE}/channels/${channelId}/messages`,
      { params }
    );
  },

  // ── Channels ─────────────────────────────────────────────────────────────────

  listChannels(): Promise<Channel[]> {
    return apiClient.get<any, Channel[]>(`${BASE}/channels`);
  },

  createChannel(
    name: string,
    type: 'dm' | 'group' | 'announcement',
    members: string[] = []
  ): Promise<Channel> {
    return apiClient.post<any, Channel>(`${BASE}/channels`, { name, type, members });
  },

  leaveChannel(channelId: string): Promise<void> {
    return apiClient.post(`${BASE}/channels/${channelId}/leave`, {});
  },

  // ── Members ──────────────────────────────────────────────────────────────────

  addMember(channelId: string, userId: string): Promise<void> {
    return apiClient.post(`${BASE}/channels/${channelId}/members`, { userId });
  },

  removeMember(channelId: string, userId: string): Promise<void> {
    return apiClient.delete(`${BASE}/channels/${channelId}/members/${userId}`);
  },

  // ── Uploads ──────────────────────────────────────────────────────────────────

  uploadAttachment(file: {
    uri: string;
    name: string;
    type: string;
  }): Promise<Attachment> {
    const formData = new FormData();
    // React Native FormData accepts { uri, name, type }
    formData.append('file', file as any);
    return apiClient.post<any, Attachment>(`${BASE}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
