import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase, supabaseAdmin } from './supabase.js';
import { Tournament, UserProfile } from './tournamentTypes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getTournamentStorageFilePath = (): string => {
  const defaultDir = path.join(process.cwd(), 'server', 'data');
  if (!fs.existsSync(defaultDir)) {
    try {
      fs.mkdirSync(defaultDir, { recursive: true });
    } catch {}
  }
  return path.join(defaultDir, 'persisted_tournaments.json');
};

const storageFilePath = getTournamentStorageFilePath();
const profilesFilePath = path.join(path.dirname(storageFilePath), 'persisted_profiles.json');

export class TournamentStorageService {
  private saveTimeout: NodeJS.Timeout | null = null;
  private tournamentsCache: Map<string, Tournament> = new Map();
  private pendingSaves: Map<string, Tournament> = new Map();
  private profilesCache: Map<string, UserProfile> = new Map();
  private isLoaded: boolean = false;
  private isProfilesLoaded: boolean = false;

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
      const clientToUse = supabaseAdmin || supabase;
      if (clientToUse && this.pendingSaves.size > 0) {
        const toSync = Array.from(this.pendingSaves.values());
        this.pendingSaves.clear();

        for (const t of toSync) {
          Promise.resolve(
            clientToUse
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

          // Persist all fixtures in Supabase PostgreSQL
          if (t.fixtures && t.fixtures.length > 0) {
            for (const f of t.fixtures) {
              Promise.resolve(
                clientToUse
                  .from('fixtures')
                  .upsert({
                    id: f.id,
                    tournament_id: t.id,
                    match_number: f.matchNumber,
                    round_number: f.roundNumber,
                    stage: f.stage,
                    home_franchise_id: f.homeFranchiseId,
                    away_franchise_id: f.awayFranchiseId,
                    match_overs: f.matchOvers,
                    status: f.status,
                    winner_franchise_id: f.winnerFranchiseId || null,
                    match_result_summary: f.matchResultSummary || null,
                    scheduled_at: new Date(f.scheduledAt).toISOString(),
                    completed_at: f.completedAt ? new Date(f.completedAt).toISOString() : null
                  })
              ).catch(() => {});
            }
          }

          // Persist tournament teams in Supabase PostgreSQL
          if (t.teams) {
            for (const team of Object.values(t.teams)) {
              Promise.resolve(
                clientToUse
                  .from('tournament_teams')
                  .upsert({
                    tournament_id: t.id,
                    franchise_id: team.franchiseId,
                    owner_user_id: team.ownerUserId,
                    owner_user_name: team.ownerUserName,
                    purse_remaining: team.purseRemaining,
                    squad: team.squad,
                    default_lineup: team.defaultPlayingXI,
                    updated_at: new Date().toISOString()
                  }, { onConflict: 'tournament_id,franchise_id' })
              ).catch(() => {});
            }
          }
        }
      } else {
        this.pendingSaves.clear();
      }
    } catch (err) {
      console.error('[TournamentStorage] Error flushing tournaments to disk:', err);
    }
  }

  // ==========================================
  // PROFILE STORAGE METHODS
  // ==========================================

  public async loadAllProfiles(): Promise<UserProfile[]> {
    if (this.isProfilesLoaded) {
      return Array.from(this.profilesCache.values());
    }

    this.profilesCache.clear();

    // 1. Read from local disk store (preserves all existing accounts)
    try {
      if (fs.existsSync(profilesFilePath)) {
        const raw = fs.readFileSync(profilesFilePath, 'utf-8');
        if (raw.trim()) {
          const list: UserProfile[] = JSON.parse(raw);
          for (const p of list) {
            if (p.id) this.profilesCache.set(p.id, p);
          }
        }
      }
    } catch (err) {
      console.warn('[TournamentStorage] Disk profile read fallback:', err);
    }

    // 2. Read from Supabase PostgreSQL database if configured
    const clientToUse = supabaseAdmin || supabase;
    if (clientToUse) {
      try {
        const { data, error } = await clientToUse
          .from('profiles')
          .select('*')
          .limit(1000);

        if (!error && data) {
          for (const row of data) {
            if (row.id) {
              this.profilesCache.set(row.id, {
                id: row.id,
                username: row.username || row.in_game_name || row.display_name,
                inGameName: row.in_game_name || row.username || row.display_name,
                email: row.email,
                recoveryEmail: row.recovery_email,
                avatarUrl: row.avatar_url,
                passwordHash: row.password_hash,
                salt: row.password_salt,
                createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
                updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
              });
            }
          }
          console.log(`[TournamentStorage] Synced ${data.length} profiles from Supabase database`);
        }
      } catch (err) {
        console.warn('[TournamentStorage] Supabase profile sync fallback:', err);
      }
    }

    this.isProfilesLoaded = true;
    return Array.from(this.profilesCache.values());
  }

  public async getProfile(userId: string): Promise<UserProfile | undefined> {
    const clientToUse = supabaseAdmin || supabase;
    if (clientToUse) {
      try {
        const { data, error } = await clientToUse
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!error && data) {
          const prof: UserProfile = {
            id: data.id,
            username: data.username || data.in_game_name,
            inGameName: data.in_game_name || data.username,
            email: data.email,
            recoveryEmail: data.recovery_email,
            avatarUrl: data.avatar_url,
            passwordHash: data.password_hash,
            salt: data.password_salt,
            createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
            updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : Date.now()
          };
          this.profilesCache.set(data.id, prof);
          return prof;
        }
      } catch {}
    }

    await this.loadAllProfiles();
    return this.profilesCache.get(userId);
  }

  public async getProfileByUsername(username: string): Promise<UserProfile | undefined> {
    const cleanLower = username.trim().toLowerCase();
    const clientToUse = supabaseAdmin || supabase;

    // Check Supabase DB directly
    if (clientToUse) {
      try {
        const { data, error } = await clientToUse
          .from('profiles')
          .select('*')
          .ilike('username', cleanLower)
          .maybeSingle();

        if (!error && data) {
          const prof: UserProfile = {
            id: data.id,
            username: data.username || data.in_game_name,
            inGameName: data.in_game_name || data.username,
            email: data.email,
            recoveryEmail: data.recovery_email,
            avatarUrl: data.avatar_url,
            passwordHash: data.password_hash,
            salt: data.password_salt,
            createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
            updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : Date.now()
          };
          this.profilesCache.set(data.id, prof);
          return prof;
        }
      } catch {}
    }

    await this.loadAllProfiles();
    for (const p of this.profilesCache.values()) {
      const uName = (p.username || p.inGameName || '').trim().toLowerCase();
      if (uName === cleanLower) {
        return p;
      }
    }
    return undefined;
  }

  public async isNameAvailable(name: string, excludeUserId?: string): Promise<boolean> {
    const cleanLower = name.trim().toLowerCase();
    const clientToUse = supabaseAdmin || supabase;

    // Check Supabase database table with case-insensitive match
    if (clientToUse) {
      try {
        const { data, error } = await clientToUse
          .from('profiles')
          .select('id, username')
          .ilike('username', cleanLower);

        if (!error && data && data.length > 0) {
          if (!excludeUserId || data.some(row => row.id !== excludeUserId)) {
            return false;
          }
        }
      } catch {}
    }

    await this.loadAllProfiles();
    for (const [id, p] of this.profilesCache.entries()) {
      if (excludeUserId && id === excludeUserId) continue;
      const existingName = (p.username || p.inGameName || '').trim().toLowerCase();
      if (existingName === cleanLower) {
        return false;
      }
    }
    return true;
  }

  public async saveProfile(profile: UserProfile): Promise<UserProfile> {
    await this.loadAllProfiles();
    const cleanUsername = (profile.username || profile.inGameName).trim();
    const updated: UserProfile = {
      ...profile,
      username: cleanUsername,
      inGameName: cleanUsername,
      updatedAt: Date.now()
    };

    this.profilesCache.set(profile.id, updated);

    // 1. Write to local disk cache (failsafe persistence)
    try {
      const list = Array.from(this.profilesCache.values());
      const tempPath = `${profilesFilePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(list, null, 2), 'utf-8');
      fs.renameSync(tempPath, profilesFilePath);
    } catch (err) {
      console.error('[TournamentStorage] Error saving profile to disk:', err);
    }

    // 2. Write to Supabase database (public.profiles)
    const clientToUse = supabaseAdmin || supabase;
    if (clientToUse) {
      try {
        const { error } = await clientToUse
          .from('profiles')
          .upsert({
            id: updated.id,
            username: updated.username,
            in_game_name: updated.inGameName,
            display_name: updated.inGameName,
            email: updated.email,
            recovery_email: updated.recoveryEmail,
            avatar_url: updated.avatarUrl,
            password_hash: updated.passwordHash,
            password_salt: updated.salt,
            updated_at: new Date(updated.updatedAt).toISOString()
          });
        if (error) {
          console.warn('[TournamentStorage] Supabase saveProfile warning:', error.message);
        } else {
          console.log(`[TournamentStorage] Profile "${updated.username}" saved to Supabase database`);
        }
      } catch (err) {
        console.warn('[TournamentStorage] Supabase saveProfile fallback:', err);
      }
    }

    return updated;
  }
}

export const tournamentStorage = new TournamentStorageService();

