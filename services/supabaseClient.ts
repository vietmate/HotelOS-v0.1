import { createClient } from '@supabase/supabase-js';

// --- INSTRUCTIONS ---
// 1. Go to Supabase Dashboard -> Project Settings -> API
// 2. Copy "Project URL" and paste it below.
// 3. Copy "anon public" key and paste it below.

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'PASTE_YOUR_SUPABASE_URL_HERE';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'PASTE_YOUR_SUPABASE_ANON_KEY_HERE';

// Check if keys are still placeholders
const isPlaceholder = supabaseUrl.includes('PASTE_YOUR') || supabaseAnonKey.includes('PASTE_YOUR');

if (isPlaceholder) {
  console.warn("Supabase keys are missing! The app will run in offline mode (LocalStorage).");
} else {
  console.log("Supabase Client initialized");
}

// Create the client
export const supabase = createClient(
  isPlaceholder ? 'https://placeholder.supabase.co' : supabaseUrl, 
  isPlaceholder ? 'placeholder' : supabaseAnonKey
);

export const isSupabaseConfigured = () => {
    return !isPlaceholder && supabaseUrl !== 'https://placeholder.supabase.co';
}