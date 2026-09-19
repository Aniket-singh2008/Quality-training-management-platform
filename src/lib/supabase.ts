import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://xxqdxzqdtrqzfoyvpenv.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o4z9x2zdBo6Umu8VUDjjDw_d7EF0oOJ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const SUPABASE_CONFIG = {
  projectId: 'xxqdxzqdtrqzfoyvpenv',
  url: SUPABASE_URL,
  keyPreview: SUPABASE_ANON_KEY.substring(0, 16) + '...',
};
