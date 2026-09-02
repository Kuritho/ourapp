import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://wtdyzwmjoeoycgmhxbwx.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0ZHl6d21qb2VveWNnbWh4Ynd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNjA3NTMsImV4cCI6MjEwMzgzNjc1M30.GfbyURYci0Y_PVqgIynmh024Zz8XOtVNQ3Q4HjFB0Es';

if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables missing; using fallback values. Set them in Vercel to enable full app functionality.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export default supabase;