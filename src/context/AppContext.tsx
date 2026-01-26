import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// Types
export interface AppState {
  selectedTeamId: string | null;
  currentSeasonId: string | null;
  preferences: AppPreferences;
  isHydrated: boolean;
}

export interface AppPreferences {
  theme: 'dark' | 'light';
  showMojoIndicators: boolean;
  showFitnessIndicators: boolean;
  autoSave: boolean;
}

export interface AppContextValue extends AppState {
  setSelectedTeam: (teamId: string | null) => void;
  setCurrentSeason: (seasonId: string | null) => void;
  updatePreferences: (prefs: Partial<AppPreferences>) => void;
  setHydrated: (hydrated: boolean) => void;
}

// Default values
const defaultPreferences: AppPreferences = {
  theme: 'dark',
  showMojoIndicators: true,
  showFitnessIndicators: true,
  autoSave: true,
};

const defaultState: AppState = {
  selectedTeamId: null,
  currentSeasonId: null,
  preferences: defaultPreferences,
  isHydrated: false,
};

// Create context
const AppContext = createContext<AppContextValue | null>(null);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, setState] = useState<AppState>(defaultState);

  const setSelectedTeam = useCallback((teamId: string | null) => {
    setState(prev => ({ ...prev, selectedTeamId: teamId }));
  }, []);

  const setCurrentSeason = useCallback((seasonId: string | null) => {
    setState(prev => ({ ...prev, currentSeasonId: seasonId }));
  }, []);

  const updatePreferences = useCallback((prefs: Partial<AppPreferences>) => {
    setState(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...prefs },
    }));
  }, []);

  const setHydrated = useCallback((hydrated: boolean) => {
    setState(prev => ({ ...prev, isHydrated: hydrated }));
  }, []);

  const value: AppContextValue = {
    ...state,
    setSelectedTeam,
    setCurrentSeason,
    updatePreferences,
    setHydrated,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// Hook for consuming context
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

// Optional hook that returns null instead of throwing (for components that may be outside provider)
export function useAppContextSafe(): AppContextValue | null {
  return useContext(AppContext);
}
