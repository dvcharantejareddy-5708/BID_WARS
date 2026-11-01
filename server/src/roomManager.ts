import { WebSocket } from 'ws';
import { GameRoom } from './gameEngine.js';
import { RoomSettings, ClientMessage, ServerMessage, RoomState, IPLTeamId } from './types.js';

interface ClientConnection {
  ws: WebSocket;
  roomCode: string;
  memberId: string;
}

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private connections: Map<WebSocket, ClientConnection> = new Map();

  constructor() {}

  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'BW-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (this.rooms.has(code)) {
      return this.generateRoomCode();
    }
    return code;
  }

  public createRoom(hostNickname: string, settings: Partial<RoomSettings>): GameRoom {
    const roomCode = this.generateRoomCode();
    const room = new GameRoom(
      roomCode,
      hostNickname,
      settings,
      (state: RoomState, eventMsg?: any) => this.broadcastToRoom(roomCode, state, eventMsg)
    );
    this.rooms.set(roomCode, room);
    return room;
  }

  public getRoom(roomCode: string): GameRoom | undefined {
    return this.rooms.get(roomCode.toUpperCase().trim());
  }

  public handleConnection(ws: WebSocket) {
    ws.on('message', (data: string) => {
      try {
        const msg: ClientMessage = JSON.parse(data.toString());
        this.handleMessage(ws, msg);
      } catch (err: any) {
        this.sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    ws.on('error', () => {
      this.handleDisconnect(ws);
    });
  }

  private handleMessage(ws: WebSocket, msg: ClientMessage) {
    if (msg.type === 'PING') {
      ws.send(JSON.stringify({ type: 'PONG' }));
      return;
    }

    if (msg.type === 'JOIN_ROOM') {
      const room = this.getRoom(msg.roomCode);
      if (!room) {
        this.sendError(ws, `Room "${msg.roomCode}" not found`);
        return;
      }

      const member = room.join(msg.nickname, msg.sessionToken);
      this.connections.set(ws, {
        ws,
        roomCode: room.roomCode,
        memberId: member.id
      });

      // Send initial SYNC_STATE
      const syncMsg: ServerMessage = {
        type: 'SYNC_STATE',
        state: room.getState(),
        myMemberId: member.id
      };
      ws.send(JSON.stringify(syncMsg));
      return;
    }

    const conn = this.connections.get(ws);
    if (!conn) {
      this.sendError(ws, 'You must join a room first');
      return;
    }

    const room = this.rooms.get(conn.roomCode);
    if (!room) {
      this.sendError(ws, 'Room expired or closed');
      return;
    }

    switch (msg.type) {
      case 'SELECT_TEAM': {
        const res = room.selectTeam(conn.memberId, msg.teamId);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to select team');
        }
        break;
      }
      case 'TOGGLE_READY': {
        room.toggleReady(conn.memberId, msg.isReady);
        break;
      }
      case 'UPDATE_SETTINGS': {
        const res = room.updateSettings(conn.memberId, msg.settings);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to update settings');
        }
        break;
      }
      case 'START_AUCTION': {
        const res = room.startAuction(conn.memberId);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to start auction');
        }
        break;
      }
      case 'PLACE_BID': {
        const res = room.placeBid(conn.memberId, msg.amount);
        if (!res.success) {
          this.sendError(ws, res.message || 'Bid rejected');
        }
        break;
      }
      case 'SKIP_PLAYER': {
        const res = room.skipCurrentLot(conn.memberId);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to skip lot');
        }
        break;
      }
      case 'PAUSE_AUCTION': {
        const res = room.pauseAuction(conn.memberId);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to pause');
        }
        break;
      }
      case 'RESUME_AUCTION': {
        const res = room.resumeAuction(conn.memberId);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to resume');
        }
        break;
      }
      case 'RESTART_AUCTION': {
        const res = room.restartAuction(conn.memberId);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to restart');
        }
        break;
      }
      case 'END_AUCTION': {
        if (conn.memberId !== room.hostId) {
          this.sendError(ws, 'Only the host can end the auction');
          return;
        }
        room.finishAuction();
        break;
      }
      case 'REAUCTION_UNSOLD': {
        const res = room.reAuctionUnsold(conn.memberId);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to start re-auction');
        }
        break;
      }
    }
  }

  private handleDisconnect(ws: WebSocket) {
    const conn = this.connections.get(ws);
    if (!conn) return;

    this.connections.delete(ws);
    const room = this.rooms.get(conn.roomCode);
    if (!room) return;

    const member = room.getMember(conn.memberId);
    if (member) {
      member.connected = false;
      member.lastSeen = Date.now();
      room.addAuditLog('USER_DISCONNECTED', `${member.nickname} disconnected (grace period active)`, member.nickname);
      room.broadcastState();
    }
  }

  public broadcastToRoom(roomCode: string, state: RoomState, eventMsg?: any) {
    const rawState = JSON.stringify({ type: 'SYNC_STATE', state });
    const rawEvent = eventMsg ? JSON.stringify(eventMsg) : null;

    for (const [ws, conn] of this.connections.entries()) {
      if (conn.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
        if (rawEvent) {
          ws.send(rawEvent);
        } else {
          ws.send(rawState);
        }
      }
    }
  }

  private sendError(ws: WebSocket, message: string) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ERROR', message }));
    }
  }
}
