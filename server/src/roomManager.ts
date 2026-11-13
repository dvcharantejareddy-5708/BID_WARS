import { WebSocket } from 'ws';
import { GameRoom } from './gameEngine.js';
import { RoomSettings, ClientMessage, ServerMessage, RoomState } from './types.js';
import { storageService } from './storageService.js';

interface ClientConnection {
  ws: WebSocket;
  roomCode: string;
  memberId: string;
}

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private connections: Map<WebSocket, ClientConnection> = new Map();

  constructor() {}

  public async loadPersistedRooms(): Promise<void> {
    try {
      const persisted = await storageService.loadAllRooms();
      for (const jsonState of persisted) {
        const code = jsonState.roomCode;
        if (code && !this.rooms.has(code)) {
          const room = GameRoom.fromJSON(
            jsonState,
            (state: RoomState, eventMsg?: any) => this.broadcastToRoom(code, state, eventMsg)
          );
          this.rooms.set(code, room);
        }
      }
      console.log(`[RoomManager] Loaded ${this.rooms.size} persisted rooms.`);
    } catch (err) {
      console.error('[RoomManager] Failed to load persisted rooms:', err);
    }
  }

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
    storageService.saveRoom(room.toJSON());
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

    if (msg.type === 'VERIFY_PASSWORD') {
      const room = this.getRoom(msg.roomCode);
      if (!room) {
        this.sendError(ws, 'Room not found');
        return;
      }
      if (room.verifyPassword(msg.password)) {
        ws.send(JSON.stringify({ type: 'PASSWORD_VERIFIED', token: 'pass_ok' }));
      } else {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Incorrect room password', code: 'INVALID_PASSWORD' }));
      }
      return;
    }

    if (msg.type === 'JOIN_ROOM') {
      const room = this.getRoom(msg.roomCode);
      if (!room) {
        this.sendError(ws, `Room "${msg.roomCode}" not found`);
        return;
      }

      // Check if participant was previously kicked
      if (msg.sessionToken && room.kickedMemberIds.has(msg.sessionToken)) {
        ws.send(JSON.stringify({
          type: 'KICKED',
          message: 'You have been removed from this auction room by the host.'
        }));
        return;
      }

      // Check password authorization if private
      if (room.isPrivate) {
        const isHostReconnect = msg.sessionToken && msg.sessionToken === room.hostId;
        const isExistingMember = msg.sessionToken && room.members.has(msg.sessionToken);

        if (!isHostReconnect && !isExistingMember) {
          if (!msg.password || !room.verifyPassword(msg.password)) {
            ws.send(JSON.stringify({
              type: 'PASSWORD_REQUIRED',
              roomCode: room.roomCode,
              roomName: room.settings.roomName
            }));
            return;
          }
        }
      }

      // Check room full capacity for new participants (non-reconnects)
      const isExisting = msg.sessionToken && room.members.has(msg.sessionToken);
      if (!isExisting) {
        const allTeams = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];
        const occupiedCount = Array.from(room.members.values()).filter(m => m.teamId).length;
        if (occupiedCount >= allTeams.length) {
          this.sendError(ws, 'The auction room is full. All 10 franchises have already been claimed.', 'ROOM_FULL');
          return;
        }
      }

      const member = room.join(msg.nickname, msg.sessionToken);
      this.connections.set(ws, {
        ws,
        roomCode: room.roomCode,
        memberId: member.id
      });

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
      case 'DRAW_RANDOM_PLAYER': {
        const res = room.drawRandomPlayer(conn.memberId, msg.category, msg.basePriceInr);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to draw random lot');
        }
        break;
      }
      case 'SEND_CHAT_MESSAGE': {
        const res = room.sendChatMessage(conn.memberId, msg.text);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to send chat message');
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
        const res = room.finishAuction(conn.memberId);
        if (!res.success) {
          this.sendError(ws, res.message || 'Only the host can end the auction');
          return;
        }
        break;
      }
      case 'BRING_ALL_UNSOLD_BACK': {
        const res = room.bringAllUnsoldBack(conn.memberId);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to recall unsold players');
        }
        break;
      }
      case 'RANDOM_DRAW_UNSOLD': {
        const res = room.randomDrawUnsold(conn.memberId, msg.count, msg.playerIds);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to draw unsold players');
        }
        break;
      }
      case 'REAUCTION_PARTICULAR_PLAYER': {
        const res = room.reAuctionParticularPlayer(conn.memberId, msg.playerId);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to re-auction unsold player');
        }
        break;
      }
      case 'REAUCTION_SOLD_PLAYER': {
        const res = room.reAuctionSoldPlayer(conn.memberId, msg.playerId);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to re-auction sold player');
        }
        break;
      }
      case 'SKIP_MULTIPLE_PLAYERS': {
        const res = room.skipMultipleLots(conn.memberId, msg.count);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to skip players');
        }
        break;
      }
      case 'UPDATE_TIMER': {
        const res = room.updateSettings(conn.memberId, { timerDuration: msg.timerDuration });
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to update timer');
        }
        break;
      }
      case 'KICK_MEMBER': {
        const targetMemberId = msg.targetMemberId;
        const res = room.kickMember(conn.memberId, targetMemberId);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to remove participant');
          break;
        }

        // Find target's WebSocket connection, send KICKED message, and terminate connection
        for (const [clientWs, clientConn] of this.connections.entries()) {
          if (clientConn.roomCode === room.roomCode && clientConn.memberId === targetMemberId) {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'KICKED',
                message: 'You have been removed from the auction room by the host.'
              }));
              clientWs.close();
            }
            this.connections.delete(clientWs);
          }
        }
        break;
      }
      case 'REAUCTION_UNSOLD': {
        const res = room.reAuctionUnsold(conn.memberId);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to start re-auction');
        }
        break;
      }
      case 'ADVANCE_LOT': {
        room.advanceLot(msg.lotIndex);
        break;
      }
      case 'ANNOUNCEMENT_COMPLETE': {
        room.advanceLot(msg.lotIndex, msg.resultId);
        break;
      }
      case 'CREATE_TRADE_REQUEST': {
        const res = room.createTradeRequest(conn.memberId, {
          targetTeamId: msg.toTeamId,
          type: msg.tradeType,
          offeredPlayerId: msg.offeredPlayerId,
          requestedPlayerId: msg.requestedPlayerId,
          moneyAmount: msg.moneyAmount
        });
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to create trade request');
        }
        break;
      }
      case 'RESPOND_TRADE_REQUEST': {
        const res = room.respondTradeRequest(conn.memberId, msg.tradeId, msg.action, msg.rejectionReason);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to respond to trade request');
        }
        break;
      }
      case 'CANCEL_TRADE_REQUEST': {
        const res = room.cancelTradeRequest(conn.memberId, msg.tradeId, msg.reason);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to cancel trade request');
        }
        break;
      }
      case 'UPDATE_TRADE_TIMER': {
        const res = room.updateTradeTimer(conn.memberId, msg.tradeTimerDuration);
        if (!res.success) {
          this.sendError(ws, res.message || 'Failed to update trade timer');
        }
        break;
      }
      case 'LEAVE_ROOM': {
        this.connections.delete(ws);
        room.removeMember(conn.memberId);
        if (room.isClosed) {
          this.rooms.delete(conn.roomCode);
          storageService.deleteRoom(conn.roomCode);
        }
        ws.send(JSON.stringify({ type: 'LEFT_ROOM' }));
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

  public broadcastToRoom(roomCode: string, state: RoomState | null, eventMsg?: any) {
    const rawEvent = eventMsg ? JSON.stringify(eventMsg) : null;
    const rawState = state ? JSON.stringify({ type: 'SYNC_STATE', state }) : null;

    for (const [ws, conn] of this.connections.entries()) {
      if (conn.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
        if (rawState) {
          ws.send(rawState);
        }
        if (rawEvent) {
          ws.send(rawEvent);
        }
      }
    }
  }

  private sendError(ws: WebSocket, message: string, code?: string) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ERROR', message, code }));
    }
  }
}
