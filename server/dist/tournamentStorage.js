import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './supabase.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const getTournamentStorageFilePath = () => {
    const defaultDir = path.join(process.cwd(), 'server', 'data');
    if (!fs.existsSync(defaultDir)) {
        try {
            fs.mkdirSync(defaultDir, { recursive: true });
        }
        catch { }
    }
    return path.join(defaultDir, 'persisted_tournaments.json');
};
const storageFilePath = getTournamentStorageFilePath();
const profilesFilePath = path.join(path.dirname(storageFilePath), 'persisted_profiles.json');
export class TournamentStorageService {
    saveTimeout = null;
    tournamentsCache = new Map();
    pendingSaves = new Map();
    profilesCache = new Map();
    isLoaded = false;
    isProfilesLoaded = false;
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
            console.warn('[TournamentStorage] Could not create storage directory:', err);
        }
    }
    async loadAllTournaments() {
        this.tournamentsCache.clear();
        // 1. Read from local disk store
        try {
            if (fs.existsSync(storageFilePath)) {
                const raw = fs.readFileSync(storageFilePath, 'utf-8');
                if (raw.trim()) {
                    const list = JSON.parse(raw);
                    for (const t of list) {
                        if (t.id)
                            this.tournamentsCache.set(t.id, t);
                    }
                    console.log(`[TournamentStorage] Loaded ${this.tournamentsCache.size} tournaments from disk`);
                }
            }
        }
        catch (err) {
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
            }
            catch (err) {
                console.warn('[TournamentStorage] Supabase sync fallback:', err);
            }
        }
        this.isLoaded = true;
        return Array.from(this.tournamentsCache.values());
    }
    async getTournament(id) {
        if (!this.isLoaded) {
            await this.loadAllTournaments();
        }
        return this.tournamentsCache.get(id);
    }
    saveTournament(tournament) {
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
    deleteTournament(id) {
        this.pendingSaves.delete(id);
        this.tournamentsCache.delete(id);
        this.flushToDisk(id);
    }
    flushToDisk(deletedId) {
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
                    Promise.resolve(supabase
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
                    })).catch(() => { });
                }
            }
            else {
                this.pendingSaves.clear();
            }
        }
        catch (err) {
            console.error('[TournamentStorage] Error flushing tournaments to disk:', err);
        }
    }
    // ==========================================
    // PROFILE STORAGE METHODS
    // ==========================================
    async loadAllProfiles() {
        if (this.isProfilesLoaded) {
            return Array.from(this.profilesCache.values());
        }
        this.profilesCache.clear();
        // 1. Read from disk
        try {
            if (fs.existsSync(profilesFilePath)) {
                const raw = fs.readFileSync(profilesFilePath, 'utf-8');
                if (raw.trim()) {
                    const list = JSON.parse(raw);
                    for (const p of list) {
                        if (p.id)
                            this.profilesCache.set(p.id, p);
                    }
                }
            }
        }
        catch (err) {
            console.warn('[TournamentStorage] Disk profile read fallback:', err);
        }
        // 2. Read from Supabase if configured
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .limit(1000);
                if (!error && data) {
                    for (const row of data) {
                        if (row.id) {
                            this.profilesCache.set(row.id, {
                                id: row.id,
                                email: row.email,
                                inGameName: row.in_game_name || row.display_name,
                                avatarUrl: row.avatar_url,
                                createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
                                updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
                            });
                        }
                    }
                }
            }
            catch (err) {
                console.warn('[TournamentStorage] Supabase profile sync fallback:', err);
            }
        }
        this.isProfilesLoaded = true;
        return Array.from(this.profilesCache.values());
    }
    async getProfile(userId) {
        await this.loadAllProfiles();
        return this.profilesCache.get(userId);
    }
    async isNameAvailable(inGameName, excludeUserId) {
        await this.loadAllProfiles();
        const cleanLower = inGameName.trim().toLowerCase();
        for (const [id, p] of this.profilesCache.entries()) {
            if (excludeUserId && id === excludeUserId)
                continue;
            if (p.inGameName.trim().toLowerCase() === cleanLower) {
                return false;
            }
        }
        return true;
    }
    async saveProfile(profile) {
        await this.loadAllProfiles();
        const updated = {
            ...profile,
            inGameName: profile.inGameName.trim(),
            updatedAt: Date.now()
        };
        this.profilesCache.set(profile.id, updated);
        // Write to disk
        try {
            const list = Array.from(this.profilesCache.values());
            const tempPath = `${profilesFilePath}.tmp`;
            fs.writeFileSync(tempPath, JSON.stringify(list, null, 2), 'utf-8');
            fs.renameSync(tempPath, profilesFilePath);
        }
        catch (err) {
            console.error('[TournamentStorage] Error saving profile to disk:', err);
        }
        // Write to Supabase if available
        if (supabase) {
            try {
                await supabase
                    .from('profiles')
                    .upsert({
                    id: updated.id,
                    email: updated.email,
                    display_name: updated.inGameName,
                    in_game_name: updated.inGameName,
                    avatar_url: updated.avatarUrl,
                    updated_at: new Date(updated.updatedAt).toISOString()
                });
            }
            catch (err) {
                console.warn('[TournamentStorage] Supabase saveProfile fallback:', err);
            }
        }
        return updated;
    }
}
export const tournamentStorage = new TournamentStorageService();
