import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface AuthUser {
  id: string; // Permanent Supabase Auth UUID
  email?: string;
  name: string; // Google Profile Full Name
  inGameName?: string; // BidWars In-Game Display Name
  avatar?: string;
  isGoogleUser: boolean;
}

export interface UserProfileData {
  id: string;
  email?: string;
  inGameName: string;
  avatarUrl?: string;
}

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export let supabaseClient: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('your-project')) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.warn('[Auth] Supabase client init fallback:', err);
  }
}

const STORAGE_KEY = 'bidwars_active_user';

class AuthService {
  private currentUser: AuthUser | null = null;
  private listeners: Array<(user: AuthUser | null) => void> = [];

  constructor() {
    this.init();
  }

  public isConfigured(): boolean {
    return Boolean(supabaseClient);
  }

  private async fetchUserProfile(userId: string): Promise<UserProfileData | null> {
    try {
      const apiBase = ((import.meta as any).env?.VITE_API_URL as string) || '';
      const res = await fetch(`${apiBase}/api/profiles/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.profile) return data.profile;
      }
    } catch (err) {
      console.warn('[Auth] Error fetching profile:', err);
    }
    return null;
  }

  private async init() {
    // 1. Check local storage for persistent profile
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch {}

    // 2. Listen to Supabase Auth state changes if available
    if (supabaseClient) {
      try {
        const { data } = await supabaseClient.auth.getSession();
        if (data?.session?.user) {
          const u = data.session.user;
          const profile = await this.fetchUserProfile(u.id);

          const userObj: AuthUser = {
            id: u.id,
            email: u.email,
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'IPL Master',
            inGameName: profile?.inGameName,
            avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture,
            isGoogleUser: true
          };
          this.setUser(userObj);
        }
      } catch (err) {
        console.warn('[Auth] getSession error:', err);
      }

      supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const u = session.user;
          const profile = await this.fetchUserProfile(u.id);

          const userObj: AuthUser = {
            id: u.id,
            email: u.email,
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'IPL Master',
            inGameName: profile?.inGameName,
            avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture,
            isGoogleUser: true
          };
          this.setUser(userObj);
        } else if (!this.currentUser?.isGoogleUser) {
          // Keep guest user if any
        } else {
          this.setUser(null);
        }
      });
    }

    // 3. Fallback: If no user found, create or restore a persistent local user
    if (!this.currentUser) {
      this.restoreOrCreateDefaultGuest();
    }
  }

  private restoreOrCreateDefaultGuest(): AuthUser {
    let guestId = localStorage.getItem('bidwars_guest_id');
    if (!guestId) {
      guestId = 'usr_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10));
      localStorage.setItem('bidwars_guest_id', guestId);
    }

    const defaultUser: AuthUser = {
      id: guestId,
      name: 'Manager',
      inGameName: undefined,
      email: `${guestId}@bidwars.ipl`,
      avatar: undefined,
      isGoogleUser: false
    };

    this.setUser(defaultUser);
    return defaultUser;
  }

  public getUser(): AuthUser {
    if (!this.currentUser) {
      return this.restoreOrCreateDefaultGuest();
    }
    return this.currentUser;
  }

  public setUser(user: AuthUser | null) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.listeners.forEach(cb => cb(user));
  }

  public async checkInGameNameAvailable(name: string, excludeUserId?: string): Promise<{ available: boolean; message: string }> {
    try {
      const apiBase = ((import.meta as any).env?.VITE_API_URL as string) || '';
      const params = new URLSearchParams({ name: name.trim() });
      if (excludeUserId) params.append('excludeUserId', excludeUserId);

      const res = await fetch(`${apiBase}/api/profiles/check-name?${params.toString()}`);
      return await res.json();
    } catch {
      return { available: true, message: 'Available' };
    }
  }

  public async setInGameName(inGameName: string): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUser) return { success: false, error: 'No active user' };

    const cleanName = inGameName.trim();
    if (cleanName.length < 3 || cleanName.length > 20) {
      return { success: false, error: 'In-Game Name must be between 3 and 20 characters.' };
    }

    if (!/^[a-zA-Z0-9_ -]{3,20}$/.test(cleanName)) {
      return { success: false, error: 'In-Game Name can only contain letters, numbers, spaces, underscores, and hyphens.' };
    }

    try {
      const apiBase = ((import.meta as any).env?.VITE_API_URL as string) || '';
      const res = await fetch(`${apiBase}/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: this.currentUser.id,
          inGameName: cleanName,
          email: this.currentUser.email,
          avatarUrl: this.currentUser.avatar
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to save In-Game Name' };
      }

      const updated: AuthUser = {
        ...this.currentUser,
        inGameName: cleanName
      };
      this.setUser(updated);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error saving In-Game Name' };
    }
  }

  public async signInWithGoogle(): Promise<{ error?: string; configMissing?: boolean }> {
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) return { error: error.message };
        return {};
      } catch (err: any) {
        return { error: err.message || 'Google Auth error' };
      }
    } else {
      return {
        error: 'Supabase Auth is not configured. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable Google OAuth.',
        configMissing: true
      };
    }
  }

  public async signInWithGoogleTestAccount(email: string, name: string): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    if (!cleanEmail || !cleanName) return { success: false, error: 'Email and name are required' };

    // Generate deterministic UUID for simulated test account
    let hash = 0;
    for (let i = 0; i < cleanEmail.length; i++) {
      hash = ((hash << 5) - hash) + cleanEmail.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    const simulatedUUID = `00000000-0000-4000-8000-${hex.padEnd(12, '0')}`;

    const profile = await this.fetchUserProfile(simulatedUUID);

    const googleUser: AuthUser = {
      id: simulatedUUID,
      email: cleanEmail,
      name: cleanName,
      inGameName: profile?.inGameName,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`,
      isGoogleUser: true
    };
    this.setUser(googleUser);
    return { success: true };
  }

  public async signOut(): Promise<void> {
    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut();
      } catch {}
    }
    localStorage.removeItem(STORAGE_KEY);
    this.restoreOrCreateDefaultGuest();
  }

  public onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }
}

export const authService = new AuthService();
