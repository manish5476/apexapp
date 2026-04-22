// src/services/socket/socket-connection.service.ts
/**
 * React-Native / Expo port of the Angular SocketConnectionService.
 * Uses socket.io-client directly – no NgZone needed.
 * Connection state is exposed as a Zustand slice (see socket.store.ts).
 */

import { useSocketStore } from '@/src/store/socket.store';
import { EventEmitter } from 'eventemitter3';
import { io, ManagerOptions, Socket, SocketOptions } from 'socket.io-client';
import { AuthService } from '../../api/authService';
import { environment } from '../../constants/environment';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
export type ConnectionHealth = 'healthy' | 'degraded' | 'poor';

// ─────────────────────────────────────────────────────────────────────────────
// Singleton service class
// ─────────────────────────────────────────────────────────────────────────────

class SocketConnectionService extends EventEmitter {
  private socket: Socket | null = null;
  private readonly url = environment.socketUrl;

  // Identity
  private orgId = '';
  private userId = '';

  // Queue for offline messages (max 100)
  private outboundQueue: Array<{ event: string; payload: any }> = [];

  // Token refresh guard
  private isRefreshingToken = false;

  // Heartbeat
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastPongTime = 0;

  // ── Public API ──────────────────────────────────────────────────────────────

  connect(token: string, orgId: string, userId: string) {
    this.orgId = orgId;
    this.userId = userId;

    if (this.socket?.connected) return;

    const opts: Partial<ManagerOptions & SocketOptions> = {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.5,
      withCredentials: true,
      timeout: 20_000,
      autoConnect: true,
    };

    this.disconnect(); // clean slate
    this.socket = io(this.url, opts);
    this._setupCoreListeners();
  }

  send(eventName: string, payload?: any): boolean {
    if (this.socket?.connected) {
      this.socket.emit(eventName, payload);
      return true;
    } else if (this.outboundQueue.length < 100) {
      this.outboundQueue.push({ event: eventName, payload });
      return true;
    }
    return false;
  }

  listen(eventName: string, callback: (data: any) => void): this {
    this.socket?.on(eventName, (data: any) => {
      callback(data);
      super.emit(eventName, data); // broadcast via EventEmitter (local)
    });
    return this;
  }

  ping() { this.socket?.emit('ping'); }

  updateTheme(themeId: string) { this.send('updateTheme', { themeId }); }

  get isConnected() { return this.socket?.connected ?? false; }

  disconnect() {
    this._stopHeartbeat();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    useSocketStore.getState().setStatus('disconnected');
  }

  destroy() {
    this.disconnect();
    this.removeAllListeners();
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private _setupCoreListeners() {
    if (!this.socket) return;
    const store = useSocketStore.getState();

    this.socket.on('connect', () => {
      // console.log('✅ Socket connected:', this.socket?.id);
      this.isRefreshingToken = false;
      store.setStatus('connected');
      this._flushQueue();
      this.socket?.emit('joinOrg', { organizationId: this.orgId });
      this.socket?.emit('subscribeNotifications');
      this.socket?.emit('getInitialData');
      // this._startHeartbeat();
      super.emit('connect');
    });

    this.socket.on('disconnect', (reason: string) => {
      // console.warn('⚠️ Socket disconnected:', reason);
      // this._stopHeartbeat();
      store.setStatus('disconnected');
      // If the server force-disconnected us, reconnect manually
      if (reason === 'io server disconnect') {
        setTimeout(() => this.socket?.connect(), 1_000);
      }
      super.emit('disconnect', reason);
    });

    this.socket.on('connect_error', async (error: any) => {
      console.error('❌ Connection error:', error.message, error.data?.code);
      store.setStatus('reconnecting');

      if (error.data?.code === 'TOKEN_EXPIRED' && !this.isRefreshingToken) {
        this.isRefreshingToken = true;
        try {
          const res = await AuthService.refreshToken();
          if (this.socket) {
            (this.socket as any).auth = { token: res.token };
            this.socket.connect();
          }
        } catch (err) {
          console.error('Token refresh failed, disconnecting', err);
          this.disconnect();
        } finally {
          this.isRefreshingToken = false;
        }
      }
      super.emit('connect_error', error);
    });

    this.socket.on('reconnect_attempt', (attempt: number) => {
      // console.log(`🔄 Reconnect attempt #${attempt}`);
      store.setStatus('reconnecting');
    });

    this.socket.on('reconnect_failed', () => {
      console.error('💀 All reconnect attempts exhausted');
      store.setStatus('disconnected');
    });

    this.socket.on('pong', (data: { timestamp: string }) => {
      const latency = Date.now() - new Date(data.timestamp).getTime();
      this.lastPongTime = Date.now();
      if (latency < 150) store.setHealth('healthy');
      else if (latency < 500) store.setHealth('degraded');
      else store.setHealth('poor');
    });

    // ── App-level events forwarded to EventEmitter ────────────────────────────

    this.socket.on('themeChanged', (d: any) => super.emit('themeChanged', d));
    this.socket.on('permissions:updated', (d: any) => super.emit('permissions:updated', d));
    this.socket.on('newAnnouncement', (d: any) => { if (d?.data) super.emit('newAnnouncement', d.data); });
    this.socket.on('forceLogout', (d: any) => { super.emit('forceLogout', d); this.disconnect(); });
    this.socket.on('systemStats', (d: any) => super.emit('systemStats', d));

    // ── Chat events – forwarded so ChatStateService can consume them ──────────
    const chatEvents = [
      'newMessage', 'messageEdited', 'messageDeleted', 'messages', 'messageRead',
      'initialData', 'channelActivity', 'channelCreated', 'channelUpdated', 'removedFromChannel',
      'userTyping', 'readReceipt', 'channelUsers',
      'userJoinedChannel', 'userLeftChannel',
      'userOnline', 'userOffline', 'orgOnlineUsers',
    ];
    chatEvents.forEach(ev => {
      this.socket!.on(ev, (d: any) => super.emit(ev, d));
    });
  }

  // ── Heartbeat ─────────────────────────────────────────────────────────────

  private _startHeartbeat() {
    // Socket.io handles heartbeats natively via pingInterval/pingTimeout.
    // Manual heartbeat removed to reduce noise.
  }

  private _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ── Queue ─────────────────────────────────────────────────────────────────

  private _flushQueue() {
    while (this.outboundQueue.length > 0 && this.socket?.connected) {
      const item = this.outboundQueue.shift();
      if (item) this.socket.emit(item.event, item.payload);
    }
  }
}

// Export as a singleton
export const socketService = new SocketConnectionService();
