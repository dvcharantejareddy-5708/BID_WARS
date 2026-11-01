import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './supabase.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Locate or create data storage directory
const getStorageFilePath = () => {
    const candidates = [
        path.join(__dirname, 'data', 'persisted_rooms.json'),
        path.join(__dirname, '..', 'data', 'persisted_rooms.json'),
        path.join(process.cwd(), 'server', 'data', 'persisted_rooms.json'),
        path.join(process.cwd(), 'data', 'persisted_rooms.json')
    ];
    for (const c of candidates) {
        const parent = path.dirname(c);
        if (fs.existsSync(parent)) {
            return c;
        }
    }
    // Fallback: create data directory in dirname or cwd
    const defaultDir = path.join(process.cwd(), 'server', 'data');
    if (!fs.existsSync(defaultDir)) {
        try {
            fs.mkdirSync(defaultDir, { recursive: true });
        }
        catch { }
    }
    return path.join(defaultDir, 'persisted_rooms.json');
};
const storageFilePath = getStorageFilePath();
class StorageService {
    saveTimeout = null;
    pendingRooms = new Map();
    constructor() {
        this.init();
    }
    init() {
        try {
            const dir = path.dirname(storageFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
        catch (err) {
            console.warn('[Storage] Could not create storage directory:', err);
        }
    }
    /**
     * Load a single persisted room by roomCode
     */
    async loadRoom(roomCode) {
        const all = await this.loadAllRooms();
        return all.find(r => r.roomCode.toUpperCase() === roomCode.toUpperCase());
    }
    /**
     * Load all persisted rooms from durable disk storage and/or Supabase
     */
    async loadAllRooms() {
        const roomsMap = new Map();
        // 1. Try reading from local durable file store
        try {
            if (fs.existsSync(storageFilePath)) {
                const raw = fs.readFileSync(storageFilePath, 'utf-8');
                if (raw.trim()) {
                    const list = JSON.parse(raw);
                    for (const r of list) {
                        if (r.roomCode)
                            roomsMap.set(r.roomCode, r);
                    }
                    console.log(`[Storage] Loaded ${roomsMap.size} persisted rooms from disk`);
                }
            }
        }
        catch (err) {
            console.error('[Storage] Error reading persisted rooms from disk:', err);
        }
        // 2. If Supabase is active, fetch any rooms missing or newer
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('auction_rooms')
                    .select('room_code, state_json, updated_at')
                    .limit(100);
                if (!error && data) {
                    for (const row of data) {
                        const parsed = typeof row.state_json === 'string' ? JSON.parse(row.state_json) : row.state_json;
                        if (parsed && parsed.roomCode) {
                            const diskRoom = roomsMap.get(parsed.roomCode);
                            if (!diskRoom || (parsed.updatedAt || 0) > (diskRoom.updatedAt || 0)) {
                                roomsMap.set(parsed.roomCode, parsed);
                            }
                        }
                    }
                    console.log(`[Storage] Synced rooms with Supabase database`);
                }
            }
            catch (err) {
                console.warn('[Storage] Supabase fetch fallback to disk:', err);
            }
        }
        return Array.from(roomsMap.values());
    }
    /**
     * Schedule room state persistence (debounced by 300ms to handle rapid bids)
     */
    saveRoom(room) {
        this.pendingRooms.set(room.roomCode, {
            ...room,
            updatedAt: Date.now()
        });
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => {
            this.flushToDisk();
        }, 300);
    }
    /**
     * Remove a room permanently (e.g. when closed or deleted)
     */
    deleteRoom(roomCode) {
        this.pendingRooms.delete(roomCode);
        this.flushToDisk(roomCode);
    }
    /**
     * Write pending room states directly to disk and sync to Supabase
     */
    flushToDisk(deletedRoomCode) {
        try {
            let existing = [];
            if (fs.existsSync(storageFilePath)) {
                try {
                    const raw = fs.readFileSync(storageFilePath, 'utf-8');
                    if (raw.trim())
                        existing = JSON.parse(raw);
                }
                catch { }
            }
            const map = new Map();
            for (const r of existing) {
                map.set(r.roomCode, r);
            }
            if (deletedRoomCode) {
                map.delete(deletedRoomCode);
            }
            for (const [code, r] of this.pendingRooms.entries()) {
                map.set(code, r);
            }
            const list = Array.from(map.values());
            const tempPath = `${storageFilePath}.tmp`;
            fs.writeFileSync(tempPath, JSON.stringify(list, null, 2), 'utf-8');
            fs.renameSync(tempPath, storageFilePath);
            // Async sync to Supabase if configured
            if (supabase && this.pendingRooms.size > 0) {
                const toSync = Array.from(this.pendingRooms.values());
                for (const item of toSync) {
                    Promise.resolve(supabase
                        .from('auction_rooms')
                        .upsert({
                        room_code: item.roomCode,
                        state_json: item,
                        updated_at: new Date().toISOString()
                    })).catch(() => { });
                }
            }
        }
        catch (err) {
            console.error('[Storage] Error flushing room state to disk:', err);
        }
    }
}
export const storageService = new StorageService();
