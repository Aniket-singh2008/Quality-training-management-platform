import { createClient, SupabaseClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://xxqdxzqdtrqzfoyvpenv.supabase.co';
const FALLBACK_KEY = 'sb_publishable_o4z9x2zdBo6Umu8VUDjjDw_d7EF0oOJ';

function getValidSupabaseUrl(): string {
  const raw = import.meta.env.VITE_SUPABASE_URL;
  if (!raw || typeof raw !== 'string') {
    return FALLBACK_URL;
  }
  const clean = raw.trim().replace(/^["']|["']$/g, '');
  try {
    const parsed = new URL(clean);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return clean;
    }
  } catch {
    // Malformed URL provided in env
  }
  return FALLBACK_URL;
}

function getValidSupabaseAnonKey(): string {
  const raw = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!raw || typeof raw !== 'string') {
    return FALLBACK_KEY;
  }
  const clean = raw.trim().replace(/^["']|["']$/g, '');
  return clean || FALLBACK_KEY;
}

const SUPABASE_URL = getValidSupabaseUrl();
const SUPABASE_ANON_KEY = getValidSupabaseAnonKey();

function initSupabaseClient(): SupabaseClient {
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    });
  } catch (err) {
    console.warn('Initial createClient warning, falling back to default Supabase URL:', err);
    return createClient(FALLBACK_URL, FALLBACK_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    });
  }
}

export const supabase = initSupabaseClient();

export function createEphemeralClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export const SUPABASE_CONFIG = {
  projectId: 'xxqdxzqdtrqzfoyvpenv',
  url: SUPABASE_URL,
  keyPreview: SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 16) + '...' : 'sb_publishable_...',
};

