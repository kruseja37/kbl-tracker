/**
 * Auth hook for Supabase session management.
 * Wraps supabase.auth with React state.
 */

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { syncEngine } from '../utils/syncEngine';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

interface UseAuthOptions {
  /**
   * The companion route uses Supabase Auth without starting the account-wide
   * backup engine. Live draft transport has its own narrow cloud authority.
   */
  bindGenericSync?: boolean;
}

export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const bindGenericSync = options.bindGenericSync ?? true;
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    // Load initial session
    void supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (bindGenericSync) {
          void syncEngine.setAuthenticatedUser(session?.user.id ?? null).catch(() => undefined);
        }
      })
      .catch((authError) => {
        setError(authError instanceof Error ? authError.message : 'Could not read this account.');
      })
      .finally(() => setIsLoading(false));

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (bindGenericSync) {
        void syncEngine.setAuthenticatedUser(session?.user.id ?? null).catch(() => undefined);
      }
    });

    return () => subscription.unsubscribe();
  }, [bindGenericSync]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      setError('Supabase not configured');
      return;
    }

    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    if (bindGenericSync) {
      await syncEngine.prepareForSignOut().catch(() => undefined);
    }
    await supabase.auth.signOut();
    setUser(null);
  }, [bindGenericSync]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    signIn,
    signOut,
  };
}
