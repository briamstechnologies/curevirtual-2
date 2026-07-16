import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace('/api', '') || 'https://curevirtual-2-production-e766.up.railway.app';
const SOCKET_URL = API_BASE_URL;

class SocketService {
  constructor() {
    this.socket = null;
  }

  async connect(userId, role, name) {
    // If socket exists (even if connecting), don't start a new one
    if (this.socket) {
      if (this.socket.connected) return this.socket;
      // If disconnected but instance exists, reconnect
      if (this.socket.disconnected) this.socket.connect();
      return this.socket;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');

      console.log(`[Socket] Initializing connection to ${SOCKET_URL}...`);
      this.socket = io(SOCKET_URL, {
        auth: { token },
        // Standard Socket.io handshake: start with polling, upgrade to websocket
        // This is more reliable for passing through sticky-session load balancers
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 10, // Increased for stability
        timeout: 20000,
        // Optional: Some environments require explicit headers
        // extraHeaders: {
        //   "Origin": SOCKET_URL
        // }
      });

      this.socket.on('connect', () => {
        console.log(`[Socket] ✅ Connected to ${SOCKET_URL} as ${role}`);
        this.socket.emit('user_online', { userId, role, name });
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket] ❌ Disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        // 🚨 CRITICAL DIAGNOSTICS
        console.error('[Socket] ⚠️ Connection error DETAIL:', {
          message: error.message,
          type: error.type,
          description: error.description, // Low-level detail (e.g. 403, 404)
          context: error.context?.status // XHR status code
        });

        if (error.message === 'timeout' && this.socket.disconnected) {
          console.log('[Socket] Attempting manual reconnect after timeout...');
          this.socket.connect();
        }
      });

      return this.socket;
    } catch (err) {
      console.error('[Socket] Init failed:', err.message);
      return null;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('[Socket] Manually disconnected.');
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`[Socket] Cannot emit '${event}' - no active socket`);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  getSocket() {
    return this.socket;
  }
}

const socketService = new SocketService();
export default socketService;
