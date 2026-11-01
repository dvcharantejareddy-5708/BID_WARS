import { WebSocket } from 'ws';
import { GameRoom } from './gameEngine.js';
import { storageService } from './storageService.js';
export class RoomManager {
    rooms = new Map();
    connections = new Map();
    constructor() { }
    async loadPersistedRooms() {
        try {
            const persisted = await storageService.loadAllRooms();
            for (const jsonState of persisted) {
                const code = jsonState.roomCode;
                if (code && !this.rooms.has(code)) {
                    const room = GameRoom.fromJSON(jsonState, (state, eventMsg) => this.broadcastToRoom(code, state, eventMsg));
                    this.rooms.set(code, room);
                }
            }
            console.log(`[RoomManager] Loaded ${this.rooms.size} persisted rooms.`);
        }
        catch (err) {
            console.error('[RoomManager] Failed to load persisted rooms:', err);
        }
    }
    generateRoomCode() {
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
    createRoom(hostNickname, settings) {
        const roomCode = this.generateRoomCode();
        const room = new GameRoom(roomCode, hostNickname, settings, (state, eventMsg) => this.broadcastToRoom(roomCode, state, eventMsg));
        this.rooms.set(roomCode, room);
        storageService.saveRoom(room.toJSON());
        return room;
    }
    getRoom(roomCode) {
        return this.rooms.get(roomCode.toUpperCase().trim());
    }
    handleConnection(ws) {
        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                this.handleMessage(ws, msg);
            }
            catch (err) {
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
    handleMessage(ws, msg) {
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
            }
            else {
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
            const syncMsg = {
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
            case 'ADVANCE_LOT': {
                room.advanceLot(msg.lotIndex);
                break;
            }
            case 'ANNOUNCEMENT_COMPLETE': {
                room.advanceLot(msg.lotIndex);
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
    handleDisconnect(ws) {
        const conn = this.connections.get(ws);
        if (!conn)
            return;
        this.connections.delete(ws);
        const room = this.rooms.get(conn.roomCode);
        if (!room)
            return;
        const member = room.getMember(conn.memberId);
        if (member) {
            member.connected = false;
            member.lastSeen = Date.now();
            room.addAuditLog('USER_DISCONNECTED', `${member.nickname} disconnected (grace period active)`, member.nickname);
            room.broadcastState();
        }
    }
    broadcastToRoom(roomCode, state, eventMsg) {
        const rawState = JSON.stringify({ type: 'SYNC_STATE', state });
        const rawEvent = eventMsg ? JSON.stringify(eventMsg) : null;
        for (const [ws, conn] of this.connections.entries()) {
            if (conn.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
                if (rawEvent) {
                    ws.send(rawEvent);
                }
                else {
                    ws.send(rawState);
                }
            }
        }
    }
    sendError(ws, message, code) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ERROR', message, code }));
        }
    }
}
