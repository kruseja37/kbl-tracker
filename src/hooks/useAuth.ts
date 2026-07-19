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

export function useAuth(): UseAuthReturn {
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
        void syncEngine.setAuthenticatedUser(session?.user.id ?? null).catch(() => undefined);
      })
      .catch((authError) => {
        setError(authError instanceof Error ? authError.message : 'Could not read this account.');
      })
      .finally(() => setIsLoading(false));

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void syncEngine.setAuthenticatedUser(session?.user.id ?? null).catch(() => undefined);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    await syncEngine.prepareForSignOut().catch(() => undefined);
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    signIn,
    signOut,
  };
}
