import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[Supabase] Initialized database client successfully');
  } catch (err) {
    console.warn('[Supabase] Failed to initialize Supabase client, falling back to in-memory engine:', err);
  }
} else {
  console.log('[Engine] Running in high-performance server-authoritative in-memory mode (Zero-config ready)');
}
