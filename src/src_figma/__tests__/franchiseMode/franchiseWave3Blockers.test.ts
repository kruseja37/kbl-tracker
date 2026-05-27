import 'fake-indexeddb/auto';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../utils/syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
    upsertLocal: vi.fn(),
    removeLocal: vi.fn(),
  },
}));

import {
  createFranchise,
  deleteFranchise,
  updateFranchiseMetadata,
} from '../../../utils/franchiseManager';
import {
  getInitialRouteSeasonNumber,
  loadRouteSeasonNumber,
} from '../../app/utils/franchiseRouteSeason';
import {
  FRANCHISE_OFFSEASON_TEMPLATE_MUTATION_MESSAGE,
  parseSeasonNumberFromSeasonId,
  shouldBlockFranchiseTemplateMutation,
} from '../../app/utils/franchiseOffseasonGuards';
import {
  aggregateGameToPlayoffStats,
  createPlayoff,
  getPlayoff,
  getPlayoffStats,
} from '../../../utils/playoffStorage';
import { getFranchiseSeasonId } from '../../../utils/franchisePersistenceContract';

const createdFranchiseIds: string[] = [];

afterEach(async () => {
  for (const franchiseId of createdFranchiseIds.splice(0)) {
    await deleteFranchise(franchiseId).catch(() => undefined);
  }
  localStorage.clear();
});

describe('Wave 3 blocker fixes', () => {
  test('franchise route season comes from franchise metadata instead of global current season', async () => {
    localStorage.setItem('kbl-current-season', '99');
    const franchiseA = await createFranchise('Franchise A');
    const franchiseB = await createFranchise('Franchise B');
    createdFranchiseIds.push(franchiseA, franchiseB);

    await updateFranchiseMetadata(franchiseA, { currentSeason: 3 });
    await updateFranchiseMetadata(franchiseB, { currentSeason: 1 });

    expect(getInitialRouteSeasonNumber(franchiseA)).toBe(1);
    await expect(loadRouteSeasonNumber(franchiseA)).resolves.toBe(3);
    await expect(loadRouteSeasonNumber(franchiseB)).resolves.toBe(1);
    await expect(loadRouteSeasonNumber()).resolves.toBe(99);
  });

  test('canonical franchise season ids parse correctly for offseason flows', () => {
    expect(parseSeasonNumberFromSeasonId('season-2')).toBe(2);
    expect(parseSeasonNumberFromSeasonId('franchise-a-season-7')).toBe(7);
    expect(parseSeasonNumberFromSeasonId('bad-season-id', 4)).toBe(4);
  });

  test('franchise offseason prototype mutations are blocked before template storage writes', () => {
    expect(shouldBlockFranchiseTemplateMutation('franchise-a')).toBe(true);
    expect(shouldBlockFranchiseTemplateMutation(undefined)).toBe(false);
    expect(FRANCHISE_OFFSEASON_TEMPLATE_MUTATION_MESSAGE).toContain('would mutate the League Builder template');
  });

  test('playoff stat aggregation can resolve a franchise playoff by launch playoffId', async () => {
    const franchiseId = 'playoff-launch-franchise';
    const playoff = await createPlayoff({
      seasonNumber: 2,
      seasonId: getFranchiseSeasonId(franchiseId, 2),
      franchiseId,
      sourceType: 'franchise',
      status: 'IN_PROGRESS',
      teamsQualifying: 2,
      rounds: 1,
      gamesPerRound: [3],
      inningsPerGame: 9,
      useDH: true,
      leagues: ['Eastern', 'Western'],
      conferenceChampionship: false,
      teams: [],
      currentRound: 1,
    });

    await expect(getPlayoff(playoff.id)).resolves.toMatchObject({
      id: playoff.id,
      franchiseId,
      seasonId: getFranchiseSeasonId(franchiseId, 2),
    });

    await aggregateGameToPlayoffStats(playoff.id, {
      gameId: 'playoff-game-franchise-a-s2',
      seasonNumber: 2,
      seasonId: getFranchiseSeasonId(franchiseId, 2),
      statsScopeId: getFranchiseSeasonId(franchiseId, 2),
      competitionType: 'playoff',
      competitionId: playoff.id,
      franchiseId,
      playerStats: {
        batter_1: {
          playerName: 'Playoff Batter',
          teamId: 'team-a',
          pa: 4,
          ab: 4,
          h: 2,
          singles: 1,
          doubles: 1,
          triples: 0,
          hr: 0,
          rbi: 1,
          r: 1,
          bb: 0,
          hbp: 0,
          k: 1,
          sb: 0,
          cs: 0,
          sf: 0,
          sh: 0,
          gidp: 0,
          putouts: 0,
          assists: 0,
          fieldingErrors: 0,
        },
      },
      pitcherGameStats: [],
    } as any);

    await expect(getPlayoffStats(playoff.id)).resolves.toEqual([
      expect.objectContaining({
        playoffId: playoff.id,
        playerId: 'batter_1',
        playerName: 'Playoff Batter',
        hits: 2,
      }),
    ]);
  });
});
