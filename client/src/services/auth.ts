import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email?: string;
  name: string;
  avatar?: string;
  isGoogleUser: boolean;
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

  private init() {
    // 1. Check local storage for persistent profile
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch {}

    // 2. Listen to Supabase Auth state changes if available
    if (supabaseClient) {
      supabaseClient.auth.getSession().then(({ data }) => {
        if (data?.session?.user) {
          const u = data.session.user;
          const userObj: AuthUser = {
            id: u.id,
            email: u.email,
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'IPL Master',
            avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture,
            isGoogleUser: true
          };
          this.setUser(userObj);
        }
      });

      supabaseClient.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const u = session.user;
          const userObj: AuthUser = {
            id: u.id,
            email: u.email,
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'IPL Master',
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
      guestId = 'usr_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('bidwars_guest_id', guestId);
    }

    const defaultUser: AuthUser = {
      id: guestId,
      name: 'Player ' + guestId.slice(-4).toUpperCase(),
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

  public async signInWithGoogle(): Promise<{ error?: string }> {
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
      // Simulate/prompt Google user profile for zero-config local environment
      const email = prompt('Enter your Google Account email for Tournament Mode:')?.trim();
      if (!email) return { error: 'Sign in cancelled' };

      const name = email.split('@')[0].toUpperCase();
      const googleUser: AuthUser = {
        id: 'goog_' + btoa(email).replace(/=/g, '').slice(0, 16),
        email,
        name: name,
        isGoogleUser: true
      };
      this.setUser(googleUser);
      return {};
    }
  }

  public updateProfile(name: string, email?: string): void {
    if (!this.currentUser) return;
    const updated: AuthUser = {
      ...this.currentUser,
      name: name.trim() || this.currentUser.name,
      email: email?.trim() || this.currentUser.email
    };
    this.setUser(updated);
  }

  public async signOut(): Promise<void> {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
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

