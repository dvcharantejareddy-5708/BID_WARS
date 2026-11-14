import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface AuthUser {
  id: string; // Permanent Supabase Auth UUID
  username: string; // BidWars In-Game Username
  inGameName: string; // Same as username
  email?: string; // Optional recovery email
  avatar?: string;
  isRegisteredUser: boolean;
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

  private async init() {
    // 1. Check local storage for persistent profile
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.isRegisteredUser && parsed.id && parsed.username) {
          this.currentUser = parsed;
        }
      }
    } catch {}

    // 2. Listen to Supabase Auth state changes if session exists
    if (supabaseClient) {
      try {
        const { data } = await supabaseClient.auth.getSession();
        if (data?.session?.user && !this.currentUser) {
          const u = data.session.user;
          const uName = u.user_metadata?.username || u.user_metadata?.in_game_name || 'Player';
          const userObj: AuthUser = {
            id: u.id,
            username: uName,
            inGameName: uName,
            email: u.email,
            avatar: u.user_metadata?.avatar_url,
            isRegisteredUser: true
          };
          this.setUser(userObj);
        }
      } catch (err) {
        console.warn('[Auth] getSession check:', err);
      }

      supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const u = session.user;
          const uName = u.user_metadata?.username || u.user_metadata?.in_game_name || this.currentUser?.username || 'Player';
          const userObj: AuthUser = {
            id: u.id,
            username: uName,
            inGameName: uName,
            email: u.email,
            avatar: u.user_metadata?.avatar_url || this.currentUser?.avatar,
            isRegisteredUser: true
          };
          this.setUser(userObj);
        }
      });
    }
  }

  public getUser(): AuthUser | null {
    return this.currentUser;
  }

  public setUser(user: AuthUser | null) {
    this.currentUser = user;
    if (user && user.isRegisteredUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.listeners.forEach(cb => cb(user));
  }

  // Register new account with unique username and secure password
  public async register(
    username: string,
    password: string,
    confirmPassword: string,
    recoveryEmail?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const apiBase = ((import.meta as any).env?.VITE_API_URL as string) || '';
      const res = await fetch(`${apiBase}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          confirmPassword,
          recoveryEmail: recoveryEmail ? recoveryEmail.trim() : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      // If Supabase session tokens were returned, set session on client
      if (data.session && supabaseClient) {
        try {
          await supabaseClient.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          });
        } catch {}
      }

      const activeUser: AuthUser = {
        id: data.user.id,
        username: data.user.username,
        inGameName: data.user.inGameName,
        email: recoveryEmail ? recoveryEmail.trim() : undefined,
        isRegisteredUser: true
      };

      this.setUser(activeUser);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration' };
    }
  }

  // Login with username and password
  public async login(
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const apiBase = ((import.meta as any).env?.VITE_API_URL as string) || '';
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid username or password' };
      }

      // If Supabase session tokens were returned, set session on client
      if (data.session && supabaseClient) {
        try {
          await supabaseClient.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          });
        } catch {}
      }

      const activeUser: AuthUser = {
        id: data.user.id,
        username: data.user.username,
        inGameName: data.user.inGameName,
        avatar: data.user.avatar,
        isRegisteredUser: true
      };

      this.setUser(activeUser);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  }

  // Password recovery
  public async resetPassword(
    username: string,
    recoveryEmail: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const apiBase = ((import.meta as any).env?.VITE_API_URL as string) || '';
      const res = await fetch(`${apiBase}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          recoveryEmail: recoveryEmail.trim(),
          newPassword,
          confirmPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Password reset failed' };
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during password reset' };
    }
  }

  public async checkUsernameAvailable(username: string): Promise<{ available: boolean; message: string }> {
    try {
      const apiBase = ((import.meta as any).env?.VITE_API_URL as string) || '';
      const params = new URLSearchParams({ name: username.trim() });
      const res = await fetch(`${apiBase}/api/profiles/check-name?${params.toString()}`);
      return await res.json();
    } catch {
      return { available: true, message: 'Available' };
    }
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
    const clean = inGameName.trim();
    try {
      const apiBase = ((import.meta as any).env?.VITE_API_URL as string) || '';
      const res = await fetch(`${apiBase}/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: this.currentUser.id,
          inGameName: clean,
          email: this.currentUser.email
        })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Failed to update name' };
      const updated: AuthUser = {
        ...this.currentUser,
        username: clean,
        inGameName: clean
      };
      this.setUser(updated);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
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
