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
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
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

  public getConfigStatus() {
    return {
      isConfigured: Boolean(supabaseClient),
      supabaseUrl: SUPABASE_URL || '',
      hasAnonKey: Boolean(SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('your-anon'))
    };
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
        const parsed = JSON.parse(stored);
        if (parsed && parsed.isGoogleUser && parsed.id) {
          this.currentUser = parsed;
        }
      }
    } catch {}

    // 2. Listen to Supabase Auth state changes and parse OAuth redirect callback
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

          // Clean URL hash after OAuth token exchange so secrets don't linger in address bar
          if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
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

          if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        } else {
          this.setUser(null);
        }
      });
    }
  }

  public getUser(): AuthUser | null {
    return this.currentUser;
  }

  public setUser(user: AuthUser | null) {
    this.currentUser = user;
    if (user && user.isGoogleUser) {
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
    if (!this.currentUser) return { success: false, error: 'No active Google user' };

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
        error: 'Supabase Auth is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable Google OAuth.',
        configMissing: true
      };
    }
  }

  public async signOut(): Promise<void> {
    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut();
      } catch {}
    }
    localStorage.removeItem(STORAGE_KEY);
    this.setUser(null);
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
