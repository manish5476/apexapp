// src/services/socket/chat.models.ts
/** Shared types for the chat system – mirrors Angular chat.models.ts */

export interface Attachment {
  url: string;
  name?: string;
  type?: string;
  size?: number;
}

export interface Message {
  _id: string;
  channelId: string;
  senderId: string | { _id: string; name: string; avatar?: string };
  body: string;
  attachments?: Attachment[];
  deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  readBy?: string[];
}

export interface Channel {
  _id: string;
  name: string;
  type: 'dm' | 'group' | 'announcement';
  members?: string[];
  lastMessage?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface OnlineUser {
  userId: string;
}

export interface TypingEvent {
  channelId: string;
  userId: string;
  typing: boolean;
  timestamp?: string;
}

export interface ReadReceiptEvent {
  userId: string;
  channelId: string;
  messageIds: string[] | null;
  timestamp: string;
}

export interface ChannelActivityEvent {
  channelId: string;
  lastMessage: any;
}
