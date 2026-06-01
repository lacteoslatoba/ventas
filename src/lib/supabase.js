import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (import.meta.env.DEV && (!supabaseUrl || !supabaseAnonKey)) {
    console.warn('[supabase] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env — Supabase desactivado.');
}

// Inicializamos Supabase SOLO si tenemos las llaves configuradas en el archivo .env
export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
