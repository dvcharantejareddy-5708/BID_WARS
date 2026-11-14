import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './supabase.js';
import { Tournament } from './tournamentTypes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getTournamentStorageFilePath = (): string => {
  const candidates = [
    path.join(__dirname, 'data', 'persisted_tournaments.json'),
    path.join(__dirname, '..', 'data', 'persisted_tournaments.json'),
    path.join(process.cwd(), 'server', 'data', 'persisted_tournaments.json'),
    path.join(process.cwd(), 'data', 'persisted_tournaments.json')
  ];

  for (const c of candidates) {
    const parent = path.dirname(c);
    if (fs.existsSync(parent)) {
      return c;
    }
  }

  const defaultDir = path.join(process.cwd(), 'server', 'data');
  if (!fs.existsSync(defaultDir)) {
    try {
      fs.mkdirSync(defaultDir, { recursive: true });
    } catch {}
  }
  return path.join(defaultDir, 'persisted_tournaments.json');
};

const storageFilePath = getTournamentStorageFilePath();

export class TournamentStorageService {
  private saveTimeout: NodeJS.Timeout | null = null;
  private tournamentsCache: Map<string, Tournament> = new Map();
  private pendingSaves: Map<string, Tournament> = new Map();
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
      console.warn('[TournamentStorage] Could not create storage directory:', err);
    }
  }

  public async loadAllTournaments(): Promise<Tournament[]> {
    this.tournamentsCache.clear();

    // 1. Read from local disk store
    try {
      if (fs.existsSync(storageFilePath)) {
        const raw = fs.readFileSync(storageFilePath, 'utf-8');
        if (raw.trim()) {
          const list: Tournament[] = JSON.parse(raw);
          for (const t of list) {
            if (t.id) this.tournamentsCache.set(t.id, t);
          }
          console.log(`[TournamentStorage] Loaded ${this.tournamentsCache.size} tournaments from disk`);
        }
      }
    } catch (err) {
      console.error('[TournamentStorage] Error reading tournaments from disk:', err);
    }

    // 2. Read from Supabase if configured
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .select('*')
          .limit(100);

        if (!error && data) {
          for (const row of data) {
            if (row.format_details && row.id) {
              const disk = this.tournamentsCache.get(row.id);
              const formatObj = typeof row.format_details === 'string' ? JSON.parse(row.format_details) : row.format_details;
              if (!disk || (formatObj.updatedAt || 0) > (disk.updatedAt || 0)) {
                this.tournamentsCache.set(row.id, formatObj);
              }
            }
          }
          console.log(`[TournamentStorage] Synced tournaments with Supabase`);
        }
      } catch (err) {
        console.warn('[TournamentStorage] Supabase sync fallback:', err);
      }
    }

    this.isLoaded = true;
    return Array.from(this.tournamentsCache.values());
  }

  public async getTournament(id: string): Promise<Tournament | undefined> {
    if (!this.isLoaded) {
      await this.loadAllTournaments();
    }
    return this.tournamentsCache.get(id);
  }

  public saveTournament(tournament: Tournament): void {
    const updated = {
      ...tournament,
      updatedAt: Date.now()
    };
    this.pendingSaves.set(tournament.id, updated);
    this.tournamentsCache.set(tournament.id, updated);

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.flushToDisk();
    }, 300);
  }

  public deleteTournament(id: string): void {
    this.pendingSaves.delete(id);
    this.tournamentsCache.delete(id);
    this.flushToDisk(id);
  }

  public flushToDisk(deletedId?: string): void {
    try {
      if (deletedId) {
        this.tournamentsCache.delete(deletedId);
      }

      const list = Array.from(this.tournamentsCache.values());
      const tempPath = `${storageFilePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(list), 'utf-8');
      fs.renameSync(tempPath, storageFilePath);

      // Async sync to Supabase if configured
      if (supabase && this.pendingSaves.size > 0) {
        const toSync = Array.from(this.pendingSaves.values());
        this.pendingSaves.clear();

        for (const t of toSync) {
          Promise.resolve(
            supabase
              .from('tournaments')
              .upsert({
                id: t.id,
                name: t.name,
                host_id: t.hostId,
                status: t.status,
                teams_count: t.teamsCount,
                match_overs: t.matchOvers,
                room_code: t.roomCode,
                format_details: t,
                winner_franchise_id: t.winnerFranchiseId,
                runner_up_franchise_id: t.runnerUpFranchiseId,
                updated_at: new Date().toISOString()
              })
          ).catch(() => {});
        }
      } else {
        this.pendingSaves.clear();
      }
    } catch (err) {
      console.error('[TournamentStorage] Error flushing tournaments to disk:', err);
    }
  }
}

export const tournamentStorage = new TournamentStorageService();

