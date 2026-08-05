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

/**
 * Crea (o reutiliza) la cuenta de Supabase Auth de un repartidor y devuelve su auth_id.
 *
 * Por que existe: las politicas RLS (sales_insert, products_update, etc.) exigen
 * `TO authenticated` + `userid = my_user_id()`, y `my_user_id()` resuelve el id del
 * repartidor a partir de `users.auth_id = auth.uid()`. La pantalla de admin (Users.jsx)
 * solo guardaba nombre+PIN en la tabla `users` local — nunca creaba la cuenta de Auth
 * correspondiente. Resultado: `login()` intentaba `signInWithPassword` (fallaba porque
 * la cuenta no existe), caia en silencio al modo PIN offline, y CADA sync de ese
 * repartidor se mandaba como usuario anonimo — RLS lo rechazaba siempre con
 * "new row violates row-level security policy", sin importar la señal o los reintentos.
 *
 * Usa un cliente Supabase aislado (persistSession:false) para no pisar la sesion ya
 * iniciada del admin en el cliente principal (`supabase`) al hacer signUp.
 *
 * @param {string} name  Nombre del repartidor (se usa para el email {slug}@lacteoslatoba.local)
 * @param {string} pin   PIN que tambien se usa como password de Supabase Auth
 * @returns {Promise<{authId: string|null, error: string|null}>}
 */
export async function provisionRepartidorAuth(name, pin) {
    if (!supabaseUrl || !supabaseAnonKey) return { authId: null, error: 'Supabase desactivado' };
    const cleanPin = (pin || '').trim();
    if (!cleanPin) return { authId: null, error: 'PIN vacío' };

    const slug = (name || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!slug) return { authId: null, error: 'Nombre vacío' };
    const email = `${slug}@lacteoslatoba.local`;

    const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    try {
        const { data, error } = await tempClient.auth.signUp({ email, password: cleanPin });
        if (error) {
            // Ya existe una cuenta con ese email: intentar iniciar sesión con el PIN actual
            // para recuperar su auth_id (cubre el caso de re-guardar un repartidor existente).
            if (/already registered|already exists/i.test(error.message)) {
                const { data: signInData, error: signInError } = await tempClient.auth.signInWithPassword({ email, password: cleanPin });
                if (signInError) {
                    return { authId: null, error: `Cuenta ya existe con otro PIN — no se pudo vincular (${signInError.message})` };
                }
                await tempClient.auth.signOut().catch(() => {});
                return { authId: signInData.user?.id || null, error: null };
            }
            return { authId: null, error: error.message };
        }
        return { authId: data.user?.id || null, error: null };
    } catch (e) {
        return { authId: null, error: e?.message || 'Error desconocido al crear cuenta' };
    }
}
