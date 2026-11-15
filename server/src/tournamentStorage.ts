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

    // 2. Read from Supabase if configured (Use supabaseAdmin if available to bypass RLS for server)
    const clientToUse = supabaseAdmin || supabase;
    if (clientToUse) {
      try {
        const { data, error } = await clientToUse
          .from('tournaments')
          .select('*')
          .limit(100);

        if (!error && data) {
          for (const row of data) {
            const rawFormat = row.format_details || row.data_payload;
            let formatObj: Tournament | null = null;
            if (rawFormat) {
              formatObj = typeof rawFormat === 'string' ? JSON.parse(rawFormat) : rawFormat;
            }
            if (!formatObj && row.id) {
              formatObj = {
                id: row.id,
                name: row.name,
                hostId: row.host_id,
                hostName: row.host_name || 'Host',
                status: row.status,
                auctionType: 'MEGA',
                teamsCount: row.teams_count || 8,
                matchOvers: row.match_overs || 5,
                roomCode: row.room_code,
                members: [],
                teams: {},
                fixtures: [],
                pointsTable: [],
                playerStats: {},
                createdAt: new Date(row.created_at || Date.now()).getTime(),
                updatedAt: new Date(row.updated_at || Date.now()).getTime()
              };
            }
            if (formatObj && row.id) {
              if (row.host_name && !formatObj.hostName) {
                formatObj.hostName = row.host_name;
              }
              const disk = this.tournamentsCache.get(row.id);
              if (!disk || (formatObj.updatedAt || 0) >= (disk.updatedAt || 0)) {
                this.tournamentsCache.set(row.id, formatObj);
              }
            }
          }
          console.log(`[TournamentStorage] Synced ${this.tournamentsCache.size} tournaments with Supabase`);
        } else if (error) {
          console.warn('[TournamentStorage] Supabase load warning:', error.message);
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

        (async () => {
          for (const t of toSync) {
            try {
              const { error: tErr } = await clientToUse
                .from('tournaments')
                .upsert({
                  id: t.id,
                  name: t.name,
                  host_id: t.hostId,
                  host_name: t.hostName || 'Host',
                  status: t.status,
                  teams_count: t.teamsCount,
                  match_overs: t.matchOvers,
                  room_code: t.roomCode,
                  format_details: t,
                  data_payload: t,
                  winner_franchise_id: t.winnerFranchiseId,
                  runner_up_franchise_id: t.runnerUpFranchiseId,
                  updated_at: new Date().toISOString()
                });

              if (tErr) {
                console.error(`[TournamentStorage] Supabase tournament upsert error for ${t.id}:`, tErr);
                continue;
              }

              // Parent tournament exists. Now upsert child members
              if (t.members && t.members.length > 0) {
                for (const m of t.members) {
                  const { error: mErr } = await clientToUse
                    .from('tournament_members')
                    .upsert({
                      tournament_id: t.id,
                      user_id: m.userId,
                      user_name: m.userName,
                      user_email: m.userEmail || null,
                      franchise_id: m.franchiseId,
                      is_host: Boolean(m.isHost),
                      joined_at: new Date(m.joinedAt || Date.now()).toISOString()
                    }, { onConflict: 'tournament_id,user_id' });
                  if (mErr) {
                    console.error(`[TournamentStorage] Member upsert error (${t.id}, ${m.userId}):`, mErr);
                  }
                }
              }

              // Upsert child fixtures
              if (t.fixtures && t.fixtures.length > 0) {
                for (const f of t.fixtures) {
                  const { error: fErr } = await clientToUse
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
                      match_id: f.matchId || null,
                      winner_franchise_id: f.winnerFranchiseId || null,
                      match_result_summary: f.matchResultSummary || null,
                      scheduled_at: new Date(f.scheduledAt).toISOString(),
                      completed_at: f.completedAt ? new Date(f.completedAt).toISOString() : null
                    });
                  if (fErr) {
                    console.error(`[TournamentStorage] Fixture upsert error (${t.id}, ${f.id}):`, fErr);
                  }
                }
              }

              // Upsert child teams
              if (t.teams) {
                for (const team of Object.values(t.teams)) {
                  const { error: tmErr } = await clientToUse
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
                    }, { onConflict: 'tournament_id,franchise_id' });
                  if (tmErr) {
                    console.error(`[TournamentStorage] Team upsert error (${t.id}, ${team.franchiseId}):`, tmErr);
                  }
                }
              }
            } catch (syncErr) {
              console.error(`[TournamentStorage] Error syncing tournament ${t.id} to Supabase:`, syncErr);
            }
          }
        })();
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

    // 1. Read from Supabase PostgreSQL database (authoritative source of truth)
    const clientToUse = supabaseAdmin || supabase;
    if (clientToUse) {
      try {
        const { data, error } = await clientToUse
          .from('profiles')
          .select('*')
          .limit(1000);

        if (!error && Array.isArray(data)) {
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
          this.isProfilesLoaded = true;
          return Array.from(this.profilesCache.values());
        }
      } catch (err) {
        console.warn('[TournamentStorage] Supabase profile sync fallback:', err);
      }
    }

    // 2. Fallback to local disk store only if Supabase database is unreachable or unconfigured
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
          .or(`username.ilike.${cleanLower},in_game_name.ilike.${cleanLower}`)
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

  public async isEmailAvailable(email: string, excludeUserId?: string): Promise<boolean> {
    const cleanLower = email.trim().toLowerCase();
    if (!cleanLower) return false;
    const clientToUse = supabaseAdmin || supabase;

    // Supabase PostgreSQL is the single authoritative source of truth for email uniqueness
    if (clientToUse) {
      try {
        const { data, error } = await clientToUse
          .from('profiles')
          .select('id, email, recovery_email')
          .or(`email.ilike.${cleanLower},recovery_email.ilike.${cleanLower}`);

        if (!error && Array.isArray(data)) {
          const conflict = data.find(row => !excludeUserId || row.id !== excludeUserId);
          return !conflict;
        }
      } catch (err) {
        console.warn('[TournamentStorage] Supabase isEmailAvailable check fallback:', err);
      }
    }

    // Fallback: only if Supabase database query failed or client is unconfigured
    await this.loadAllProfiles();
    for (const [id, p] of this.profilesCache.entries()) {
      if (excludeUserId && id === excludeUserId) continue;
      const existingEmail = (p.email || p.recoveryEmail || '').trim().toLowerCase();
      if (existingEmail === cleanLower) {
        return false;
      }
    }
    return true;
  }

  public async getProfileByEmail(email: string): Promise<UserProfile | undefined> {
    const cleanLower = email.trim().toLowerCase();
    const clientToUse = supabaseAdmin || supabase;

    if (clientToUse) {
      try {
        const { data, error } = await clientToUse
          .from('profiles')
          .select('*')
          .ilike('email', cleanLower)
          .maybeSingle();

        if (!error && data) {
          const prof: UserProfile = {
            id: data.id,
            username: data.username || data.in_game_name,
            inGameName: data.in_game_name || data.username,
            email: data.email,
            recoveryEmail: data.recovery_email,
            avatarUrl: data.avatar_url,
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
      const uEmail = (p.email || p.recoveryEmail || '').trim().toLowerCase();
      if (uEmail === cleanLower) {
        return p;
      }
    }
    return undefined;
  }

  public async getLegacyCredentials(username: string): Promise<{ id: string; username: string; inGameName: string; passwordHash: string; salt: string } | undefined> {
    const cleanLower = username.trim().toLowerCase();

    // 1. Check auth_secrets table in Supabase via Admin client
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('auth_secrets')
          .select('user_id, username, password_hash, password_salt')
          .ilike('username', cleanLower)
          .maybeSingle();

        if (!error && data && data.password_hash && data.password_salt) {
          return {
            id: data.user_id,
            username: data.username,
            inGameName: data.username,
            passwordHash: data.password_hash,
            salt: data.password_salt
          };
        }
      } catch {}
    }

    // 2. Check local persisted_profiles.json for legacy accounts
    try {
      if (fs.existsSync(profilesFilePath)) {
        const raw = fs.readFileSync(profilesFilePath, 'utf-8');
        if (raw.trim()) {
          const list: any[] = JSON.parse(raw);
          for (const p of list) {
            const uName = (p.username || p.inGameName || '').trim().toLowerCase();
            if (uName === cleanLower && p.passwordHash && p.salt) {
              return {
                id: p.id,
                username: p.username || p.inGameName,
                inGameName: p.inGameName || p.username,
                passwordHash: p.passwordHash,
                salt: p.salt
              };
            }
          }
        }
      }
    } catch {}

    return undefined;
  }

  public async updateCredentials(userId: string, passwordHash: string, salt: string): Promise<void> {
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('auth_secrets').upsert({
          user_id: userId,
          password_hash: passwordHash,
          password_salt: salt,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('[tournamentStorage] updateCredentials error:', err);
      }
    }
  }

  public async isNameAvailable(name: string, excludeUserId?: string): Promise<boolean> {
    const cleanLower = name.trim().toLowerCase();
    if (!cleanLower) return false;
    const clientToUse = supabaseAdmin || supabase;

    // Supabase PostgreSQL is the single authoritative source of truth for username uniqueness
    if (clientToUse) {
      try {
        const { data, error } = await clientToUse
          .from('profiles')
          .select('id, username, in_game_name')
          .or(`username.ilike.${cleanLower},in_game_name.ilike.${cleanLower}`);

        if (!error && Array.isArray(data)) {
          const conflict = data.find(row => !excludeUserId || row.id !== excludeUserId);
          return !conflict;
        }
      } catch (err) {
        console.warn('[TournamentStorage] Supabase isNameAvailable check fallback:', err);
      }
    }

    // Fallback: only if Supabase database query failed or client is unconfigured
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
    const cleanUsername = (profile.username || profile.inGameName).trim();
    const updated: UserProfile = {
      ...profile,
      username: cleanUsername,
      inGameName: cleanUsername,
      updatedAt: Date.now()
    };

    const clientToUse = supabaseAdmin || supabase;
    if (!clientToUse) {
      throw new Error('Supabase database service is not configured. Local JSON fallback persistence is strictly disabled.');
    }

    // 1. Write exclusively to Supabase database (public.profiles)
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
        updated_at: new Date(updated.updatedAt).toISOString()
      });

    if (error) {
      console.error('[TournamentStorage] Supabase saveProfile error:', error.message);
      throw new Error(`Failed to persist profile to Supabase database: ${error.message}`);
    }

    // 2. Also back up private credentials to public.auth_secrets if hash and salt present (Service Role Only)
    if (updated.passwordHash && updated.salt && supabaseAdmin) {
      try {
        await supabaseAdmin.from('auth_secrets').upsert({
          user_id: updated.id,
          username: updated.username,
          password_hash: updated.passwordHash,
          password_salt: updated.salt,
          updated_at: new Date(updated.updatedAt).toISOString()
        });
      } catch (secErr: any) {
        console.warn('[TournamentStorage] auth_secrets backup notice:', secErr.message);
      }
    }

    // Update in-memory session cache (never write to persisted_profiles.json for new accounts)
    this.profilesCache.set(profile.id, updated);
    console.log(`[TournamentStorage] Profile "${updated.username}" successfully persisted in Supabase database`);
    return updated;
  }
}

export const tournamentStorage = new TournamentStorageService();

