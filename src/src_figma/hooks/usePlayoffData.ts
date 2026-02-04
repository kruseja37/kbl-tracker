/**
 * Playoff Data Hook
 *
 * Connects playoffStorage to Figma UI components with:
 * - Loading states
 * - CRUD operations
 * - Bracket generation
 * - Series tracking
 * - Auto-refresh on changes
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  initPlayoffDatabase,
  getPlayoffBySeason,
  getCurrentPlayoff,
  createPlayoff,
  updatePlayoff,
  startPlayoff,
  completePlayoff,
  getSeriesByPlayoff,
  getSeriesByRound,
  updateSeries,
  recordSeriesGame,
  generateBracket,
  getPlayoffLeaders,
  getRoundName,
  type PlayoffConfig,
  type PlayoffSeries,
  type PlayoffTeam,
  type PlayoffMVP,
  type SeriesGame,
  type PlayoffPlayerStats,
  type PlayoffStatus,
} from '../../utils/playoffStorage';
import { calculateStandings, type TeamStanding } from '../../utils/seasonStorage';

// Re-export types
export type {
  PlayoffConfig,
  PlayoffSeries,
  PlayoffTeam,
  PlayoffMVP,
  SeriesGame,
  PlayoffPlayerStats,
  PlayoffStatus,
};

// ============================================
// HOOK INTERFACE
// ============================================

export interface UsePlayoffDataReturn {
  // State
  playoff: PlayoffConfig | null;
  series: PlayoffSeries[];
  isLoading: boolean;
  error: string | null;

  // Derived state
  currentRoundSeries: PlayoffSeries[];
  completedSeries: PlayoffSeries[];
  inProgressSeries: PlayoffSeries[];
  pendingSeries: PlayoffSeries[];

  // Bracket structure (for display)
  bracketByRound: Map<number, PlayoffSeries[]>;
  bracketByLeague: {
    Eastern: PlayoffSeries[];
    Western: PlayoffSeries[];
    Championship: PlayoffSeries | null;
  };

  // Queries
  hasActivePlayoff: boolean;
  getRoundName: (round: number) => string;
  getSeriesForTeam: (teamId: string) => PlayoffSeries | null;

  // Actions
  createNewPlayoff: (config: {
    seasonNumber: number;
    seasonId: string;
    teamsQualifying: number;
    gamesPerRound: number[];
    inningsPerGame?: number;
    useDH?: boolean;
  }) => Promise<PlayoffConfig>;
  startPlayoffs: () => Promise<void>;
  recordGameResult: (seriesId: string, game: SeriesGame) => Promise<void>;
  advanceRound: () => Promise<void>;
  completePlayoffs: (championId: string, mvp?: PlayoffMVP) => Promise<void>;
  refresh: () => Promise<void>;

  // Leaders
  getBattingLeaders: (stat: keyof PlayoffPlayerStats, limit?: number) => Promise<PlayoffPlayerStats[]>;
  getPitchingLeaders: (stat: keyof PlayoffPlayerStats, limit?: number) => Promise<PlayoffPlayerStats[]>;
}

// ============================================
// DEFAULT/MOCK DATA
// ============================================

const MOCK_PLAYOFF_TEAMS: PlayoffTeam[] = [
  // Eastern Conference
  { teamId: 'tigers', teamName: 'Tigers', seed: 1, league: 'Eastern', regularSeasonRecord: { wins: 56, losses: 34 }, eliminated: false },
  { teamId: 'sox', teamName: 'Sox', seed: 2, league: 'Eastern', regularSeasonRecord: { wins: 52, losses: 38 }, eliminated: false },
  { teamId: 'moonstars', teamName: 'Moonstars', seed: 3, league: 'Eastern', regularSeasonRecord: { wins: 48, losses: 42 }, eliminated: false },
  { teamId: 'bears', teamName: 'Bears', seed: 4, league: 'Eastern', regularSeasonRecord: { wins: 54, losses: 36 }, eliminated: false },
  // Western Conference
  { teamId: 'herbisaurs', teamName: 'Herbisaurs', seed: 1, league: 'Western', regularSeasonRecord: { wins: 58, losses: 32 }, eliminated: false },
  { teamId: 'wild-pigs', teamName: 'Wild Pigs', seed: 2, league: 'Western', regularSeasonRecord: { wins: 53, losses: 37 }, eliminated: false },
  { teamId: 'hot-corners', teamName: 'Hot Corners', seed: 3, league: 'Western', regularSeasonRecord: { wins: 55, losses: 35 }, eliminated: false },
  { teamId: 'sand-cats', teamName: 'Sand Cats', seed: 4, league: 'Western', regularSeasonRecord: { wins: 51, losses: 39 }, eliminated: false },
];

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function usePlayoffData(seasonNumber: number = 1): UsePlayoffDataReturn {
  const [playoff, setPlayoff] = useState<PlayoffConfig | null>(null);
  const [series, setSeries] = useState<PlayoffSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await initPlayoffDatabase();

      // Try to get playoff for this season
      let playoffData = await getPlayoffBySeason(seasonNumber);

      // If no playoff, also check for any active playoff
      if (!playoffData) {
        playoffData = await getCurrentPlayoff();
      }

      if (playoffData) {
        setPlayoff(playoffData);
        const seriesData = await getSeriesByPlayoff(playoffData.id);
        setSeries(seriesData);
      } else {
        setPlayoff(null);
        setSeries([]);
      }
    } catch (err) {
      console.error('[usePlayoffData] Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load playoff data');
    } finally {
      setIsLoading(false);
    }
  }, [seasonNumber]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh function
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Derived state
  const currentRoundSeries = useMemo(() => {
    if (!playoff) return [];
    return series.filter(s => s.round === playoff.currentRound);
  }, [playoff, series]);

  const completedSeries = useMemo(() => {
    return series.filter(s => s.status === 'COMPLETED');
  }, [series]);

  const inProgressSeries = useMemo(() => {
    return series.filter(s => s.status === 'IN_PROGRESS');
  }, [series]);

  const pendingSeries = useMemo(() => {
    return series.filter(s => s.status === 'PENDING');
  }, [series]);

  // Bracket structure by round
  const bracketByRound = useMemo(() => {
    const map = new Map<number, PlayoffSeries[]>();
    for (const s of series) {
      const existing = map.get(s.round) || [];
      existing.push(s);
      map.set(s.round, existing);
    }
    return map;
  }, [series]);

  // Bracket structure by league (for visual display)
  const bracketByLeague = useMemo(() => {
    // Group series by which teams are involved (infer league from teams)
    const eastern: PlayoffSeries[] = [];
    const western: PlayoffSeries[] = [];
    let championship: PlayoffSeries | null = null;

    for (const s of series) {
      // Check if it's the championship (final round)
      if (playoff && s.round === playoff.rounds) {
        championship = s;
      } else {
        // Determine league from teams in the series
        const team = playoff?.teams.find(t => t.teamId === s.higherSeed.teamId);
        if (team?.league === 'Eastern') {
          eastern.push(s);
        } else {
          western.push(s);
        }
      }
    }

    return { Eastern: eastern, Western: western, Championship: championship };
  }, [series, playoff]);

  const hasActivePlayoff = useMemo(() => {
    return playoff !== null && playoff.status !== 'COMPLETED';
  }, [playoff]);

  // Get round name helper
  const getRoundNameFn = useCallback((round: number) => {
    if (!playoff) return `Round ${round}`;
    return getRoundName(round, playoff.rounds);
  }, [playoff]);

  // Get series for a specific team
  const getSeriesForTeam = useCallback((teamId: string): PlayoffSeries | null => {
    // Find active or most recent series for this team
    const teamSeries = series.filter(
      s => s.higherSeed.teamId === teamId || s.lowerSeed.teamId === teamId
    );

    // Return in-progress first, then most recent
    const inProgress = teamSeries.find(s => s.status === 'IN_PROGRESS');
    if (inProgress) return inProgress;

    // Return pending next
    const pending = teamSeries.find(s => s.status === 'PENDING');
    if (pending) return pending;

    // Return most recent completed
    return teamSeries.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0] || null;
  }, [series]);

  // Create new playoff
  const createNewPlayoff = useCallback(async (config: {
    seasonNumber: number;
    seasonId: string;
    teamsQualifying: number;
    gamesPerRound: number[];
    inningsPerGame?: number;
    useDH?: boolean;
  }): Promise<PlayoffConfig> => {
    try {
      // Get standings to determine playoff teams
      let playoffTeams: PlayoffTeam[];

      try {
        const standings = await calculateStandings(config.seasonId);
        if (standings.length >= config.teamsQualifying) {
          // Convert standings to playoff teams
          // Split into leagues (assume first half Eastern, second half Western)
          const half = Math.ceil(standings.length / 2);
          const eastern = standings.slice(0, half);
          const western = standings.slice(half);

          // Take top teams from each
          const teamsPerLeague = Math.ceil(config.teamsQualifying / 2);

          playoffTeams = [
            ...eastern.slice(0, teamsPerLeague).map((s, i) => ({
              teamId: s.teamId,
              teamName: s.teamName,
              seed: i + 1,
              league: 'Eastern' as const,
              regularSeasonRecord: { wins: s.wins, losses: s.losses },
              eliminated: false,
            })),
            ...western.slice(0, teamsPerLeague).map((s, i) => ({
              teamId: s.teamId,
              teamName: s.teamName,
              seed: i + 1,
              league: 'Western' as const,
              regularSeasonRecord: { wins: s.wins, losses: s.losses },
              eliminated: false,
            })),
          ];
        } else {
          // Fall back to mock teams
          playoffTeams = MOCK_PLAYOFF_TEAMS.slice(0, config.teamsQualifying);
        }
      } catch {
        // Fall back to mock teams
        playoffTeams = MOCK_PLAYOFF_TEAMS.slice(0, config.teamsQualifying);
      }

      const newPlayoff = await createPlayoff({
        seasonNumber: config.seasonNumber,
        seasonId: config.seasonId,
        status: 'NOT_STARTED',
        teamsQualifying: config.teamsQualifying,
        rounds: config.gamesPerRound.length,
        gamesPerRound: config.gamesPerRound,
        inningsPerGame: config.inningsPerGame ?? 9,
        useDH: config.useDH ?? true,
        leagues: ['Eastern', 'Western'],
        conferenceChampionship: true,
        teams: playoffTeams,
        currentRound: 0,
      });

      // Generate initial bracket
      await generateBracket(newPlayoff.id, playoffTeams, config.gamesPerRound);

      await refresh();
      return newPlayoff;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create playoff';
      setError(message);
      throw err;
    }
  }, [refresh]);

  // Start playoffs
  const startPlayoffs = useCallback(async () => {
    if (!playoff) {
      throw new Error('No playoff to start');
    }

    try {
      await startPlayoff(playoff.id);

      // Mark first round series as IN_PROGRESS
      const firstRoundSeries = await getSeriesByRound(playoff.id, 1);
      for (const s of firstRoundSeries) {
        await updateSeries(s.id, { status: 'IN_PROGRESS' });
      }

      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start playoffs';
      setError(message);
      throw err;
    }
  }, [playoff, refresh]);

  // Record game result
  const recordGameResult = useCallback(async (seriesId: string, game: SeriesGame) => {
    try {
      await recordSeriesGame(seriesId, game);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record game result';
      setError(message);
      throw err;
    }
  }, [refresh]);

  // Advance to next round
  const advanceRound = useCallback(async () => {
    if (!playoff) {
      throw new Error('No playoff to advance');
    }

    try {
      const nextRound = playoff.currentRound + 1;

      if (nextRound > playoff.rounds) {
        throw new Error('Already at final round');
      }

      // Check all current round series are complete
      const currentSeries = await getSeriesByRound(playoff.id, playoff.currentRound);
      const allComplete = currentSeries.every(s => s.status === 'COMPLETED');

      if (!allComplete) {
        throw new Error('Not all series in current round are complete');
      }

      // Update playoff to next round
      await updatePlayoff(playoff.id, { currentRound: nextRound });

      // Mark next round series as IN_PROGRESS
      const nextRoundSeries = await getSeriesByRound(playoff.id, nextRound);
      for (const s of nextRoundSeries) {
        await updateSeries(s.id, { status: 'IN_PROGRESS' });
      }

      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to advance round';
      setError(message);
      throw err;
    }
  }, [playoff, refresh]);

  // Complete playoffs
  const completePlayoffs = useCallback(async (championId: string, mvp?: PlayoffMVP) => {
    if (!playoff) {
      throw new Error('No playoff to complete');
    }

    try {
      await completePlayoff(playoff.id, championId, mvp);

      // Mark the champion team in teams array
      const updatedTeams = playoff.teams.map(t => ({
        ...t,
        eliminated: t.teamId !== championId,
      }));

      await updatePlayoff(playoff.id, { teams: updatedTeams });
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete playoffs';
      setError(message);
      throw err;
    }
  }, [playoff, refresh]);

  // Get leaders
  const getBattingLeaders = useCallback(async (
    stat: keyof PlayoffPlayerStats,
    limit: number = 5
  ): Promise<PlayoffPlayerStats[]> => {
    if (!playoff) return [];
    return getPlayoffLeaders(playoff.id, stat, limit);
  }, [playoff]);

  const getPitchingLeaders = useCallback(async (
    stat: keyof PlayoffPlayerStats,
    limit: number = 5
  ): Promise<PlayoffPlayerStats[]> => {
    if (!playoff) return [];
    return getPlayoffLeaders(playoff.id, stat, limit);
  }, [playoff]);

  return {
    // State
    playoff,
    series,
    isLoading,
    error,

    // Derived state
    currentRoundSeries,
    completedSeries,
    inProgressSeries,
    pendingSeries,
    bracketByRound,
    bracketByLeague,

    // Queries
    hasActivePlayoff,
    getRoundName: getRoundNameFn,
    getSeriesForTeam,

    // Actions
    createNewPlayoff,
    startPlayoffs,
    recordGameResult,
    advanceRound,
    completePlayoffs,
    refresh,

    // Leaders
    getBattingLeaders,
    getPitchingLeaders,
  };
}

export default usePlayoffData;
