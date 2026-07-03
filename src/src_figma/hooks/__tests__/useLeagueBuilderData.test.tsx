import 'fake-indexeddb/auto';

import { act, renderHook, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  __resetLeagueBuilderDatabaseForTests,
  saveTeam,
} from '../../../utils/leagueBuilderStorage';
import {
  useLeagueBuilderData,
  type Team,
} from '../useLeagueBuilderData';

vi.mock('../../../utils/syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

const DB_NAME = 'kbl-league-builder';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function makeTeam(id: string): Omit<Team, 'createdDate' | 'lastModified'> & { id: string } {
  return {
    id,
    name: 'Scroll Safe Club',
    abbreviation: 'SSC',
    location: 'Test',
    nickname: 'Club',
    colors: { primary: '#111111', secondary: '#eeeeee' },
    stadium: 'Scroll Park',
    leagueIds: ['test-league'],
  };
}

describe('useLeagueBuilderData', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME);
  });

  test('refresh reloads data without re-entering full-page loading state', async () => {
    const refreshLoadingStates: boolean[] = [];
    let trackRefreshRenders = false;

    const { result } = renderHook(() => {
      const data = useLeagueBuilderData();

      useEffect(() => {
        if (trackRefreshRenders) {
          refreshLoadingStates.push(data.isLoading);
        }
      }, [data.isLoading, data.teams]);

      return data;
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.rulesPresets.length).toBeGreaterThan(0);
    });

    expect(result.current.teams.some((team) => team.id === 'scroll-safe-team')).toBe(false);

    await saveTeam(makeTeam('scroll-safe-team'));
    trackRefreshRenders = true;

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.teams.some((team) => team.id === 'scroll-safe-team')).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(refreshLoadingStates).not.toContain(true);
    expect(refreshLoadingStates.length).toBeGreaterThan(0);
  });
});
