import { ClientMessage, ServerMessage, RoomState } from '../types.js';

type MessageHandler = (msg: ServerMessage) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer: any = null;
  private isExplicitlyClosed: boolean = false;
  private pingInterval: any = null;
  private savedPassword?: string;

  public connect(roomCode: string, nickname: string, sessionToken?: string, password?: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.isExplicitlyClosed = false;
      this.savedPassword = password || this.savedPassword;
      if (import.meta.env.VITE_WS_URL) {
        this.url = import.meta.env.VITE_WS_URL;
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        // In dev, vite proxies /ws or we can connect directly to localhost:3001
        const isDev = window.location.port === '5173';
        this.url = isDev ? `ws://localhost:3001` : `${protocol}//${host}/ws`;
      }

      if (this.ws) {
        this.ws.close();
      }

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected successfully');
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }

          // Send JOIN_ROOM immediately
          this.send({
            type: 'JOIN_ROOM',
            roomCode,
            nickname,
            sessionToken,
            password: this.savedPassword
          });

          // Start ping heartbeat
          if (this.pingInterval) clearInterval(this.pingInterval);
          this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({ type: 'PING' }));
            }
          }, 15000);

          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const data: ServerMessage = JSON.parse(event.data);
            this.handlers.forEach(h => h(data));
          } catch (err) {
            console.error('[WebSocket] Message parse error:', err);
          }
        };

        this.ws.onclose = () => {
          console.log('[WebSocket] Disconnected');
          if (this.pingInterval) clearInterval(this.pingInterval);
          if (!this.isExplicitlyClosed) {
            this.reconnectTimer = setTimeout(() => {
              console.log('[WebSocket] Attempting auto-reconnect...');
              this.connect(roomCode, nickname, sessionToken, this.savedPassword);
            }, 2000);
          }
        };

        this.ws.onerror = (err) => {
          console.warn('[WebSocket] Error occurred:', err);
          resolve(false);
        };
      } catch (err) {
        console.error('[WebSocket] Connection failed:', err);
        resolve(false);
      }
    });
  }

  public send(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn('[WebSocket] Cannot send message, socket not open:', msg);
    }
  }

  public subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const socketService = new SocketService();

