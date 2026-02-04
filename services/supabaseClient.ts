import { createClient } from '@supabase/supabase-js';

// Access environment variables using Vite's import.meta.env
// Fallback to the provided credentials if env vars are missing
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://ypevnzikukgmixjvyzki.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_14y1KL0RVvOJYjcjeS3Xpg_R1lO5ewb';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Key is missing. The app will fall back to local storage or strictly read-only mode depending on implementation.");
}

// We ensure valid strings are passed to avoid "supabaseUrl is required" error
// Even if they are placeholders, the isSupabaseConfigured check handles logic downstream
const validUrl = supabaseUrl || 'https://placeholder.supabase.co';
const validKey = supabaseAnonKey || 'placeholder';

export const supabase = createClient(validUrl, validKey);

// Helper to check if we are configured with non-placeholder values
export const isSupabaseConfigured = () => {
    return !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co';
}