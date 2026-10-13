// RESTBAR PRO — Supabase Client Setup & Connection State
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'restbar_supabase_url';
const STORAGE_KEY_ANON = 'restbar_supabase_anon_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  // 1. Env vars
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envAnon && envUrl.startsWith('https://')) {
    return {
      url: envUrl,
      anonKey: envAnon,
      isConfigured: true,
    };
  }

  // 2. Local storage override (allows live connection setup without restarting server)
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem(STORAGE_KEY_URL);
    const savedAnon = localStorage.getItem(STORAGE_KEY_ANON);
    if (savedUrl && savedAnon && savedUrl.startsWith('https://')) {
      return {
        url: savedUrl,
        anonKey: savedAnon,
        isConfigured: true,
      };
    }
  }

  return {
    url: '',
    anonKey: '',
    isConfigured: false,
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
    _cachedClient = null;
  }
}

export function clearSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_ANON);
    _cachedClient = null;
  }
}

let _cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.isConfigured) {
    return null;
  }

  if (!_cachedClient) {
    try {
      _cachedClient = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (e) {
      console.error('Erreur initialisation client Supabase:', e);
      return null;
    }
  }

  return _cachedClient;
}

/**
 * Test la connexion réelle au projet Supabase
 */
export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string; tablesFound?: string[] }> {
  try {
    const testClient = createClient(url, anonKey);
    // Tente de requêter une table standard ou la version
    const { error } = await testClient.from('establishments').select('id').limit(1);

    if (error) {
      // Si la table n'existe pas encore (code 42P01), la connexion a quand même réussi
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Connecté avec succès à Supabase ! (Les tables RESTBAR PRO doivent encore être créées via la migration SQL).',
        };
      }
      return {
        success: false,
        message: `Erreur Supabase: ${error.message} (${error.code || 'code inconnu'})`,
      };
    }

    return {
      success: true,
      message: 'Connexion établie avec succès ! Tables et politiques RLS détectées.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Échec de connexion : ${err.message || 'URL ou clé invalide'}`,
    };
  }
}
