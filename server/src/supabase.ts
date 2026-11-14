import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export let supabase: SupabaseClient | null = null;
export let supabaseAdmin: SupabaseClient | null = null;

if (supabaseUrl && !supabaseUrl.includes('your-project')) {
  // 1. Standard Anon Client (for public requests and token validation)
  const clientKey = anonKey || serviceRoleKey;
  if (clientKey) {
    try {
      supabase = createClient(supabaseUrl, clientKey);
      console.log('[Supabase] Initialized database client successfully');
    } catch (err) {
      console.warn('[Supabase] Failed to initialize Supabase client:', err);
    }
  }

  // 2. Admin Client (for direct auth.users creation, bypassing email verification rate limits)
  if (serviceRoleKey && !serviceRoleKey.includes('your-service')) {
    try {
      supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      console.log('[Supabase] Initialized Admin Service Role client successfully');
    } catch (err) {
      console.warn('[Supabase] Failed to initialize Admin client:', err);
    }
  }
} else {
  console.log('[Engine] Running in high-performance server-authoritative in-memory mode (Zero-config ready)');
}

