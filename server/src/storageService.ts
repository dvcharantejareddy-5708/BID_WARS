import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase, supabaseAdmin } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate or create data storage directory
const getStorageFilePath = (): string => {
  const defaultDir = path.join(process.cwd(), 'server', 'data');
  if (!fs.existsSync(defaultDir)) {
    try {
      fs.mkdirSync(defaultDir, { recursive: true });
    } catch {}
  }
  return path.join(defaultDir, 'persisted_rooms.json');
};

const storageFilePath = getStorageFilePath();

export interface SerializedRoomData {
  roomCode: string;
  hostNickname: string;
  hostId: string;
  settings: any;
  status: string;
  isPrivate: boolean;
  passwordHash?: string | null;
  members: any[];
  teamPurse: Record<string, number>;
  teamSquads: Record<string, any[]>;
  currentLotIndex: number;
  lots: any[];
  history: any[];
  auditLog: any[];
  chatMessages: any[];
  bidLog: any[];
  activeTrade?: any;
  tradeHistory?: any[];
  pausedByTrade?: boolean;
  teamPlayingXI?: Record<string, any>;
  postAuctionTradeStatus?: string;
  postAuctionTradeDeadline?: number | null;
  kickedMemberIds?: string[];
  updatedAt: number;
}

class StorageService {
  private saveTimeout: NodeJS.Timeout | null = null;
  private pendingRooms: Map<string, SerializedRoomData> = new Map();
  private roomsCache: Map<string, SerializedRoomData> = new Map();
  private isLoaded: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      const dir = path.dirname(storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      console.warn('[Storage] Could not create storage directory:', err);
    }
  }

  /**
   * Load a single persisted room by roomCode
   */
  public async loadRoom(roomCode: string): Promise<SerializedRoomData | undefined> {
    if (!this.isLoaded) {
      await this.loadAllRooms();
    }
    return this.roomsCache.get(roomCode.toUpperCase());
  }

  /**
   * Load all persisted rooms from durable disk storage and/or Supabase
   */
  public async loadAllRooms(): Promise<SerializedRoomData[]> {
    this.roomsCache.clear();

    // 1. Try reading from local durable file store
    try {
      if (fs.existsSync(storageFilePath)) {
        const raw = fs.readFileSync(storageFilePath, 'utf-8');
        if (raw.trim()) {
          const list: SerializedRoomData[] = JSON.parse(raw);
          for (const r of list) {
            if (r.roomCode) this.roomsCache.set(r.roomCode.toUpperCase(), r);
          }
          console.log(`[Storage] Loaded ${this.roomsCache.size} persisted rooms from disk`);
        }
      }
    } catch (err) {
      console.error('[Storage] Error reading persisted rooms from disk:', err);
    }

    // 2. If Supabase is active, fetch any rooms missing or newer
    const clientToUse = supabaseAdmin || supabase;
    if (clientToUse) {
      try {
        const { data, error } = await clientToUse
          .from('auction_rooms')
          .select('room_code, state_json, updated_at')
          .limit(100);

        if (!error && data) {
          for (const row of data) {
            const parsed = typeof row.state_json === 'string' ? JSON.parse(row.state_json) : row.state_json;
            if (parsed && parsed.roomCode) {
              const code = parsed.roomCode.toUpperCase();
              const diskRoom = this.roomsCache.get(code);
              if (!diskRoom || (parsed.updatedAt || 0) > (diskRoom.updatedAt || 0)) {
                this.roomsCache.set(code, parsed);
              }
            }
          }
          console.log(`[Storage] Synced rooms with Supabase database`);
        }
      } catch (err) {
        console.warn('[Storage] Supabase fetch fallback to disk:', err);
      }
    }

    this.isLoaded = true;
    return Array.from(this.roomsCache.values());
  }

  /**
   * Schedule room state persistence (debounced by 300ms to handle rapid bids)
   */
  public saveRoom(room: SerializedRoomData) {
    const updated = {
      ...room,
      updatedAt: Date.now()
    };
    this.pendingRooms.set(room.roomCode, updated);
    this.roomsCache.set(room.roomCode.toUpperCase(), updated);

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
  public deleteRoom(roomCode: string) {
    this.pendingRooms.delete(roomCode);
    this.roomsCache.delete(roomCode.toUpperCase());
    this.flushToDisk(roomCode);
  }

  /**
   * Write pending room states directly to disk and sync to Supabase
   */
  public flushToDisk(deletedRoomCode?: string) {
    try {
      if (deletedRoomCode) {
        this.roomsCache.delete(deletedRoomCode.toUpperCase());
      }

      const list = Array.from(this.roomsCache.values());
      const tempPath = `${storageFilePath}.tmp`;
      // High-performance compact write without multi-megabyte whitespace formatting
      fs.writeFileSync(tempPath, JSON.stringify(list), 'utf-8');
      fs.renameSync(tempPath, storageFilePath);

      // Async sync to Supabase if configured for only pending items
      const clientToUse = supabaseAdmin || supabase;
      if (clientToUse && this.pendingRooms.size > 0) {
        const toSync = Array.from(this.pendingRooms.values());
        this.pendingRooms.clear();

        for (const item of toSync) {
          Promise.resolve(
            clientToUse
              .from('auction_rooms')
              .upsert({
                room_code: item.roomCode,
                state_json: item,
                updated_at: new Date().toISOString()
              })
          ).catch(() => {});
        }
      } else {
        this.pendingRooms.clear();
      }
    } catch (err) {
      console.error('[Storage] Error flushing room state to disk:', err);
    }
  }
}

export const storageService = new StorageService();
