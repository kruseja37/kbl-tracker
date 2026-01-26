// Storage key for app state in localStorage (simpler than IndexedDB for preferences)
const STORAGE_KEY = 'kbl-app-state';

export interface PersistedAppState {
  selectedTeamId: string | null;
  currentSeasonId: string | null;
  preferences: {
    theme: 'dark' | 'light';
    showMojoIndicators: boolean;
    showFitnessIndicators: boolean;
    autoSave: boolean;
  };
}

const defaultState: PersistedAppState = {
  selectedTeamId: null,
  currentSeasonId: null,
  preferences: {
    theme: 'dark',
    showMojoIndicators: true,
    showFitnessIndicators: true,
    autoSave: true,
  },
};

/**
 * Load persisted app state from localStorage
 * Returns default state if nothing stored or on error
 */
export function loadAppState(): PersistedAppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaultState;
    }
    const parsed = JSON.parse(stored) as Partial<PersistedAppState>;
    // Merge with defaults to handle missing fields from older versions
    return {
      selectedTeamId: parsed.selectedTeamId ?? defaultState.selectedTeamId,
      currentSeasonId: parsed.currentSeasonId ?? defaultState.currentSeasonId,
      preferences: {
        ...defaultState.preferences,
        ...parsed.preferences,
      },
    };
  } catch (err) {
    console.warn('[appStateStorage] Failed to load state:', err);
    return defaultState;
  }
}

/**
 * Save app state to localStorage
 */
export function saveAppState(state: PersistedAppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[appStateStorage] Failed to save state:', err);
  }
}

/**
 * Clear persisted app state
 */
export function clearAppState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[appStateStorage] Failed to clear state:', err);
  }
}
