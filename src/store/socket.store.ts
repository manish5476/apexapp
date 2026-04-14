// src/store/socket.store.ts
import { create } from 'zustand';
import type { ConnectionHealth, ConnectionStatus } from '../services/socket/socket-connection.service';

interface SocketState {
  status: ConnectionStatus;
  health: ConnectionHealth;
  setStatus: (s: ConnectionStatus) => void;
  setHealth: (h: ConnectionHealth) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  status: 'disconnected',
  health: 'healthy',
  setStatus: (status) => set({ status }),
  setHealth: (health) => set({ health }),
}));
