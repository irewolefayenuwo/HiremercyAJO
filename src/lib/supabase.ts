import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

// Pair VITE_SUPABASE_PUBLISHABLE_KEY (the latest standard) with a fallback to the old key format
const supabaseKey = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  '';

export const supabase = createClient(supabaseUrl, supabaseKey);