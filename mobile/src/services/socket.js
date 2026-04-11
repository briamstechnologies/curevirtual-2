import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://curevirtual-2-production-ee33.up.railway.app';
const SOCKET_URL = API_BASE_URL;

class SocketService {
  constructor() {
    this.socket = null;
  }

  async connect(userId, role, name) {
    if (this.socket?.connected) return this.socket;

    try {
      const token = await AsyncStorage.getItem('userToken');
      
      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
      });

      this.socket.on('connect', () => {
        console.log(`[Socket] Connected to ${SOCKET_URL} as ${role}`);
        this.socket.emit('user_online', { userId, role, name });
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error.message);
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
