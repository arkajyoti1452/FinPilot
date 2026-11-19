import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

// This client uses a server-only key. User scoping and ownership are still enforced
// explicitly in every query because service-role clients bypass database RLS.
export const supabaseAdmin = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
});
