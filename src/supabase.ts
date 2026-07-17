import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type AuthStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface AuthStorageSources {
  local?: AuthStorage;
  session?: AuthStorage;
}

function isQuotaExceededError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const { name, code } = error as { name?: unknown; code?: unknown };
  return name === 'QuotaExceededError'
    || name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || code === 22
    || code === 1014;
}

/**
 * Keep Supabase Auth persistent by default. If this browser origin is full,
 * preserve the current login in this tab without clearing unrelated app data.
 */
export function createResilientAuthStorage(
  sources: AuthStorageSources = {},
): AuthStorage {
  const local = sources.local ?? globalThis.localStorage;
  const session = sources.session ?? globalThis.sessionStorage;

  return {
    getItem(key) {
      return session.getItem(key) ?? local.getItem(key);
    },
    setItem(key, value) {
      try {
        local.setItem(key, value);
        session.removeItem(key);
      } catch (error) {
        if (!isQuotaExceededError(error)) throw error;
        session.setItem(key, value);
      }
    },
    removeItem(key) {
      session.removeItem(key);
      local.removeItem(key);
    },
  };
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Supabase client — null when env vars are not configured.
 * All sync code must check for null before using.
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { storage: createResilientAuthStorage() },
    })
    : null;
