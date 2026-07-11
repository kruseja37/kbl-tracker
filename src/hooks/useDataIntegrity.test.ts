import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { GameHeader } from '../utils/eventLog';
import type { CompletedGameRecord } from '../utils/gameStorage';

const mocks = vi.hoisted(() => ({
  getCompletedGameById: vi.fn(),
  markGameAggregated: vi.fn().mockResolvedValue(undefined),
  processCompletedGame: vi.fn().mockResolvedValue({
    aggregation: { success: true, milestones: null },
  }),
}));

vi.mock('../utils/eventLog', () => ({
  checkDataIntegrity: vi.fn(),
  markGameAggregated: mocks.markGameAggregated,
  markAggregationFailed: vi.fn(),
}));

vi.mock('../utils/gameStorage', () => ({
  getCompletedGameById: mocks.getCompletedGameById,
  resolveExhibitionLeagueId: (game: CompletedGameRecord) =>
    game.leagueId ?? (game.competitionType === 'exhibition' ? game.competitionId : undefined),
  classifyCompletedGameMode: (game: CompletedGameRecord) => {
    if (game.competitionType === 'exhibition' && (game.leagueId || game.competitionId)) {
      return 'exhibition';
    }
    if (game.competitionType === 'elimination' && (game.competitionId || game.isEliminationGame)) {
      return 'elimination';
    }
    if (game.competitionType === 'franchise' && game.franchiseId) {
      return 'franchise';
    }
    return null;
  },
}));

vi.mock('../utils/processCompletedGame', () => ({
  processCompletedGame: mocks.processCompletedGame,
  shouldAggregateToRegularSeasonStats: (
    game: CompletedGameRecord,
    archiveOptions?: { context?: CompletedGameRecord },
  ) => {
    const source = archiveOptions?.context ?? game;
    return source.competitionType === 'franchise'
      && Boolean(source.franchiseId)
      && !source.playoffId
      && !source.playoffSeriesId
      && source.playoffGameNumber === undefined
      && source.isEliminationGame !== true;
  },
}));

import { recoverArchivedGame } from './useDataIntegrity';

function header(gameId: string): GameHeader {
  return { gameId } as GameHeader;
}

function archive(overrides: Partial<CompletedGameRecord>): CompletedGameRecord {
  return {
    gameId: 'recovery-game',
    date: 1,
    awayTeamId: 'away',
    homeTeamId: 'home',
    awayTeamName: 'Away',
    homeTeamName: 'Home',
    finalScore: { away: 1, home: 2 },
    innings: 9,
    fameEvents: [],
    playerStats: {},
    pitcherGameStats: [],
    ...overrides,
  };
}

describe('mode-aware completed-game recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('franchise regular season resumes through processCompletedGame', async () => {
    mocks.getCompletedGameById.mockResolvedValue(archive({
      competitionType: 'franchise',
      competitionId: 'franchise-1',
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-1',
      statsScopeId: 'franchise-1-season-1',
    }));

    await expect(recoverArchivedGame(header('recovery-game'))).resolves.toBe('recovered');
    expect(mocks.processCompletedGame).toHaveBeenCalledTimes(1);
    expect(mocks.markGameAggregated).not.toHaveBeenCalled();
  });

  test('exhibition is reconciled without regular-season processing', async () => {
    mocks.getCompletedGameById.mockResolvedValue(archive({
      competitionType: 'exhibition',
      competitionId: 'league-1',
      leagueId: 'league-1',
    }));

    await expect(recoverArchivedGame(header('recovery-game'))).resolves.toBe('recovered');
    expect(mocks.processCompletedGame).not.toHaveBeenCalled();
    expect(mocks.markGameAggregated).toHaveBeenCalledWith('recovery-game');
  });

  test('elimination is reconciled without touching its writers', async () => {
    mocks.getCompletedGameById.mockResolvedValue(archive({
      competitionType: 'elimination',
      competitionId: 'elimination-1',
      isEliminationGame: true,
    }));

    await expect(recoverArchivedGame(header('recovery-game'))).resolves.toBe('recovered');
    expect(mocks.processCompletedGame).not.toHaveBeenCalled();
    expect(mocks.markGameAggregated).toHaveBeenCalledWith('recovery-game');
  });

  test('franchise postseason is reconciled without regular-season writes', async () => {
    mocks.getCompletedGameById.mockResolvedValue(archive({
      competitionType: 'franchise',
      franchiseId: 'franchise-1',
      playoffId: 'playoff-1',
      playoffSeriesId: 'series-1',
      playoffGameNumber: 1,
    }));

    await expect(recoverArchivedGame(header('recovery-game'))).resolves.toBe('recovered');
    expect(mocks.processCompletedGame).not.toHaveBeenCalled();
    expect(mocks.markGameAggregated).toHaveBeenCalledWith('recovery-game');
  });

  test('unclassifiable archive is quarantined without any write', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.getCompletedGameById.mockResolvedValue(archive({}));

    await expect(recoverArchivedGame(header('recovery-game'))).resolves.toBe('quarantined');
    expect(mocks.processCompletedGame).not.toHaveBeenCalled();
    expect(mocks.markGameAggregated).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('recovery-game'));
    error.mockRestore();
  });
});
