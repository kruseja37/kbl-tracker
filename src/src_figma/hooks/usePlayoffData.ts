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
  getPlayoffByFranchiseSeason,
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
import { calculateStandings } from '../../utils/seasonStorage';
import { qualifyTeams, type TeamStanding as EngineTeamStanding, type QualificationConfig } from '../../engines/playoffEngine';
import { getAllLeagueTemplates, getAllTeams, type LeagueTemplate } from '../../utils/leagueBuilderStorage';
import { getFranchiseSeasonId } from '../../utils/franchisePersistenceContract';
import { getAllFranchiseTeams } from '../../utils/franchisePlayerStorage';
import { getFranchiseConfig } from '../../utils/franchiseManager';
import { getAllGamesByFranchise, type ScheduledGame } from '../../utils/scheduleStorage';
import type { FranchisePlayoffSetupSnapshot, StoredFranchiseConfig } from '../../types/franchise';
import {
  buildFranchisePlayoffSeedingReview,
  reviewMatchesPlayoffScope,
  type FranchisePlayoffSeedingReview,
} from '../../utils/franchisePlayoffSeedingReview';

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
    preSeededTeams?: PlayoffTeam[];
    franchiseId?: string;
    confirmedSeedingReview?: FranchisePlayoffSeedingReview;
  }) => Promise<PlayoffConfig>;
  preparePlayoffSeedingReview: (config: {
    seasonNumber: number;
    seasonId: string;
    teamsQualifying: number;
    franchiseId?: string;
  }) => Promise<FranchisePlayoffSeedingReview>;
  startPlayoffs: () => Promise<void>;
  recordGameResult: (seriesId: string, game: SeriesGame) => Promise<void>;
  advanceRound: () => Promise<void>;
  completePlayoffs: (championId: string, mvp?: PlayoffMVP) => Promise<void>;
  refresh: () => Promise<void>;

  // Leaders
  getBattingLeaders: (stat: keyof PlayoffPlayerStats, limit?: number) => Promise<PlayoffPlayerStats[]>;
  getPitchingLeaders: (stat: keyof PlayoffPlayerStats, limit?: number) => Promise<PlayoffPlayerStats[]>;
}

export interface UsePlayoffDataOptions {
  franchiseId?: string;
}

// ============================================
// EMPTY FALLBACK (no mock data — shows empty state)
// ============================================

const EMPTY_PLAYOFF_TEAMS: PlayoffTeam[] = [];

function parseSeriesLength(value: string | undefined, fallback: number): number {
  const match = value?.match(/(\d+)/);
  const parsed = match ? Number.parseInt(match[1], 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildGamesPerRoundFromSetup(setup: FranchisePlayoffSetupSnapshot): number[] {
  const roundCount = Math.max(1, Math.ceil(Math.log2(Math.max(2, setup.teamsQualifying))));
  const lengths = setup.seriesLengths;
  const availableRounds = [
    parseSeriesLength(lengths.wildCard, 3),
    parseSeriesLength(lengths.divisionSeries, 5),
    parseSeriesLength(lengths.championship, 7),
    parseSeriesLength(lengths.worldSeries, 7),
  ];

  return availableRounds.slice(-roundCount);
}

function getStoredFranchisePlayoffSetup(config: StoredFranchiseConfig): FranchisePlayoffSetupSnapshot {
  return config.playoffSetupSnapshot ?? config.playoffs;
}

type FranchiseTeamSnapshot = {
  id?: string;
  teamId?: string;
  name?: string;
  league?: string;
  conference?: string;
  conferenceName?: string;
  conferenceId?: string;
};

function regularSeasonScheduleCompletionBlockers(
  games: ScheduledGame[],
  seasonId: string,
): string[] {
  const scopedGames = games.filter((game) => !game.seasonId || game.seasonId === seasonId);
  const blockers: string[] = [];

  if (scopedGames.length === 0) {
    return ['Cannot review playoff seeding without a regular-season schedule.'];
  }

  const wrongScopeRows = games.filter((game) => game.seasonId && game.seasonId !== seasonId);
  if (wrongScopeRows.length > 0) {
    blockers.push(`Cannot review playoff seeding: ${wrongScopeRows.length} schedule row(s) belong to another season scope.`);
  }

  const incompleteRows = scopedGames.filter((game) => game.status !== 'COMPLETED' || !game.result);
  if (incompleteRows.length > 0) {
    blockers.push(`Cannot review playoff seeding until all regular-season schedule rows are completed (${incompleteRows.length} incomplete).`);
  }

  return blockers;
}

async function prepareFranchisePlayoffSeedingReview(config: {
  seasonId: string;
  seasonNumber: number;
  teamsQualifying: number;
}, playoffFranchiseId: string): Promise<FranchisePlayoffSeedingReview> {
  const [scheduleGames, standings, franchiseTeams] = await Promise.all([
    getAllGamesByFranchise(playoffFranchiseId, config.seasonNumber),
    calculateStandings(config.seasonId),
    getAllFranchiseTeams(playoffFranchiseId),
  ]);

  const scheduleBlockers = regularSeasonScheduleCompletionBlockers(scheduleGames, config.seasonId);
  if (scheduleBlockers.length > 0) {
    console.warn('[usePlayoffData] Cannot review franchise playoff seeding.', {
      franchiseId: playoffFranchiseId,
      seasonId: config.seasonId,
      blockers: scheduleBlockers,
    });
    throw new Error(scheduleBlockers[0]);
  }

  const review = buildFranchisePlayoffSeedingReview({
    franchiseId: playoffFranchiseId,
    seasonId: config.seasonId,
    statsScopeId: config.seasonId,
    seasonNumber: config.seasonNumber,
    standings,
    franchiseTeams: franchiseTeams as FranchiseTeamSnapshot[],
    teamsQualifying: config.teamsQualifying,
  });

  if (review.blockers.length > 0) {
    console.warn('[usePlayoffData] Cannot review franchise playoff seeding.', {
      franchiseId: playoffFranchiseId,
      seasonId: config.seasonId,
      blockers: review.blockers,
    });
    throw new Error(review.blockers[0]);
  }

  return review;
}

function buildPlayoffTeamsFromConfirmedReview(review: FranchisePlayoffSeedingReview): PlayoffTeam[] {
  return review.qualifiedTeams.map((team) => {
    return {
      teamId: team.teamId,
      teamName: team.teamName,
      seed: team.seed ?? 0,
      league: team.league,
      regularSeasonRecord: { wins: team.wins, losses: team.losses },
      eliminated: false,
    };
  });
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function usePlayoffData(
  seasonNumber: number = 1,
  options: UsePlayoffDataOptions = {},
): UsePlayoffDataReturn {
  const { franchiseId } = options;
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
      let playoffData = franchiseId
        ? await getPlayoffByFranchiseSeason({
            franchiseId,
            seasonNumber,
            seasonId: getFranchiseSeasonId(franchiseId, seasonNumber),
          })
        : await getPlayoffBySeason(seasonNumber, 'franchise');

      // Legacy global views can fall back to any active bracket. Franchise views
      // must stay locked to the requested franchise season.
      if (!playoffData && !franchiseId) {
        playoffData = await getCurrentPlayoff('franchise');
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
  }, [seasonNumber, franchiseId]);

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

  const preparePlayoffSeedingReview = useCallback(async (config: {
    seasonNumber: number;
    seasonId: string;
    teamsQualifying: number;
    franchiseId?: string;
  }): Promise<FranchisePlayoffSeedingReview> => {
    const playoffFranchiseId = config.franchiseId ?? franchiseId;
    if (!playoffFranchiseId) {
      throw new Error('Playoff seeding review requires a franchise id.');
    }

    const existingPlayoff = await getPlayoffByFranchiseSeason({
      franchiseId: playoffFranchiseId,
      seasonNumber: config.seasonNumber,
      seasonId: config.seasonId,
    });
    if (existingPlayoff?.seedingConfirmation) {
      const teams = existingPlayoff.seedingConfirmation.teams.map((team) => {
        const playoffTeam = existingPlayoff.teams.find((candidate) => candidate.teamId === team.teamId);
        const games = team.wins + team.losses;
        return {
          teamId: team.teamId,
          teamName: team.teamName,
          seed: team.seed,
          league: playoffTeam?.league ?? (team.seed !== null && team.seed <= Math.ceil(existingPlayoff.teamsQualifying / 2) ? 'Eastern' : 'Western'),
          wins: team.wins,
          losses: team.losses,
          runDiff: team.runDiff,
          winPct: games > 0 ? team.wins / games : 0,
          qualifying: team.qualifying,
          eliminated: team.eliminated,
          tiebreakerNote: team.tiebreakerNote,
        };
      });
      return {
        franchiseId: playoffFranchiseId,
        seasonId: existingPlayoff.seasonId,
        statsScopeId: existingPlayoff.seasonId,
        seasonNumber: existingPlayoff.seasonNumber,
        teamsQualifying: existingPlayoff.teamsQualifying,
        tiebreakerPolicy: existingPlayoff.seedingConfirmation.tiebreakerPolicy,
        teams,
        qualifiedTeams: teams.filter((team) => team.qualifying),
        eliminatedTeams: teams.filter((team) => team.eliminated),
        tieGroups: existingPlayoff.seedingConfirmation.tieGroups,
        blockers: [],
        generatedAt: existingPlayoff.seedingConfirmation.confirmedAt,
      };
    }

    const franchiseConfig = await getFranchiseConfig(playoffFranchiseId);
    if (!franchiseConfig) {
      throw new Error('Cannot review playoff seeding without stored Mode 1 playoff setup.');
    }
    const storedPlayoffSetup = getStoredFranchisePlayoffSetup(franchiseConfig);

    return prepareFranchisePlayoffSeedingReview({
      seasonNumber: config.seasonNumber,
      seasonId: config.seasonId,
      teamsQualifying: storedPlayoffSetup.teamsQualifying,
    }, playoffFranchiseId);
  }, [franchiseId]);

  // Create new playoff
  const createNewPlayoff = useCallback(async (config: {
    seasonNumber: number;
    seasonId: string;
    teamsQualifying: number;
    gamesPerRound: number[];
    inningsPerGame?: number;
    useDH?: boolean;
    preSeededTeams?: PlayoffTeam[];
    franchiseId?: string;
    confirmedSeedingReview?: FranchisePlayoffSeedingReview;
  }): Promise<PlayoffConfig> => {
    try {
      // Get standings + league structure to determine playoff teams via qualifyTeams()
      let playoffTeams: PlayoffTeam[];
      const playoffFranchiseId = config.franchiseId ?? franchiseId;

      if (playoffFranchiseId) {
        const existingPlayoff = await getPlayoffByFranchiseSeason({
          franchiseId: playoffFranchiseId,
          seasonNumber: config.seasonNumber,
          seasonId: config.seasonId,
        });
        if (existingPlayoff?.seedingConfirmation) {
          await refresh();
          return existingPlayoff;
        }

        const franchiseConfig = await getFranchiseConfig(playoffFranchiseId);
        if (!franchiseConfig) {
          throw new Error('Cannot create franchise playoff without stored Mode 1 playoff setup.');
        }
        const storedPlayoffSetup = getStoredFranchisePlayoffSetup(franchiseConfig);
        config = {
          ...config,
          teamsQualifying: storedPlayoffSetup.teamsQualifying,
          gamesPerRound: buildGamesPerRoundFromSetup(storedPlayoffSetup),
          inningsPerGame: franchiseConfig.seasonLength?.inningsPerGame
            ?? franchiseConfig.rulesSnapshot?.inningsPerGame
            ?? franchiseConfig.season?.inningsPerGame
            ?? config.inningsPerGame,
          useDH: franchiseConfig.rulesSnapshot?.useDH
            ?? franchiseConfig.season?.useDH
            ?? config.useDH,
          preSeededTeams: undefined,
        };

        if (!config.confirmedSeedingReview) {
          throw new Error('Confirm playoff seeding before creating the bracket.');
        }
        if (existingPlayoff && existingPlayoff.status !== 'NOT_STARTED') {
          throw new Error('Existing playoff is already in progress; unconfirmed bracket repair is available only before playoff play begins.');
        }
        const scheduleGames = await getAllGamesByFranchise(playoffFranchiseId, config.seasonNumber);
        const scheduleBlockers = regularSeasonScheduleCompletionBlockers(scheduleGames, config.seasonId);
        if (scheduleBlockers.length > 0) {
          throw new Error(scheduleBlockers[0]);
        }
        if (!reviewMatchesPlayoffScope(config.confirmedSeedingReview, {
          franchiseId: playoffFranchiseId,
          seasonId: config.seasonId,
          statsScopeId: config.seasonId,
          seasonNumber: config.seasonNumber,
          teamsQualifying: config.teamsQualifying,
        })) {
          throw new Error('Confirmed playoff seeding no longer matches this franchise season.');
        }

        // Franchise playoffs must be seeded from confirmed franchise-owned
        // standings review, not mutable League Builder templates.
        playoffTeams = buildPlayoffTeamsFromConfirmedReview(config.confirmedSeedingReview);
      } else if (config.preSeededTeams && config.preSeededTeams.length > 0) {
        // Non-franchise playoff helpers may still accept explicit pre-seeding.
        playoffTeams = config.preSeededTeams;
      } else try {
        const [standings, leagueTemplates, allTeams] = await Promise.all([
          calculateStandings(config.seasonId),
          getAllLeagueTemplates(),
          getAllTeams(),
        ]);

        // Build team name lookup
        const teamNameLookup: Record<string, string> = {};
        for (const t of allTeams) {
          teamNameLookup[t.id] = t.name;
        }

        const template: LeagueTemplate | undefined = leagueTemplates[0];

        if (standings.length >= config.teamsQualifying && template && template.divisions.length > 0) {
          // Build teamId → { conferenceId, divisionId } from league structure
          const teamStructure: Record<string, { conferenceId: string; divisionId: string }> = {};
          for (const div of template.divisions) {
            for (const teamId of div.teamIds) {
              teamStructure[teamId] = {
                conferenceId: div.conferenceId,
                divisionId: div.id,
              };
            }
          }

          // Convert seasonStorage standings to playoffEngine standings
          const engineStandings: EngineTeamStanding[] = standings.map(s => ({
            teamId: s.teamId,
            wins: s.wins,
            losses: s.losses,
            divisionId: teamStructure[s.teamId]?.divisionId || 'unknown',
            conferenceId: teamStructure[s.teamId]?.conferenceId || 'unknown',
            h2hRecord: {},  // Not available from seasonStorage; tiebreaker falls to runDiff
            runDiff: s.runDiff,
          }));

          // Determine division winners + wildcard spots per conference
          const numConferences = template.conferences.length || 2;
          const divisionsPerConference = template.divisions.length / numConferences;
          const teamsPerConference = Math.ceil(config.teamsQualifying / numConferences);
          const divWinnersPerConf = Math.min(Math.floor(divisionsPerConference), teamsPerConference);
          const wildcardsPerConf = Math.max(0, teamsPerConference - divWinnersPerConf);

          const qualConfig: QualificationConfig = {
            divisionWinners: divWinnersPerConf,
            wildcards: wildcardsPerConf,
          };

          const qualified = qualifyTeams(engineStandings, qualConfig);

          // Map conferenceId → conference index (0=Eastern, 1=Western)
          const confIdToLeague: Record<string, 'Eastern' | 'Western'> = {};
          template.conferences.forEach((conf, idx) => {
            confIdToLeague[conf.id] = idx === 0 ? 'Eastern' : 'Western';
          });

          // Convert QualifiedTeam[] → PlayoffTeam[]
          playoffTeams = qualified.map(q => ({
            teamId: q.teamId,
            teamName: teamNameLookup[q.teamId] || q.teamId,
            seed: q.seed,
            league: confIdToLeague[q.conferenceId] || 'Eastern',
            regularSeasonRecord: { wins: q.wins, losses: q.losses },
            eliminated: false,
          }));
        } else if (standings.length >= config.teamsQualifying) {
          // Fallback: no league template divisions — seed by overall record
          playoffTeams = standings.slice(0, config.teamsQualifying).map((s, i) => ({
            teamId: s.teamId,
            teamName: s.teamName,
            seed: i + 1,
            league: (i < Math.ceil(config.teamsQualifying / 2) ? 'Eastern' : 'Western') as 'Eastern' | 'Western',
            regularSeasonRecord: { wins: s.wins, losses: s.losses },
            eliminated: false,
          }));
        } else {
          // Not enough teams with standings
          playoffTeams = EMPTY_PLAYOFF_TEAMS.slice(0, config.teamsQualifying);
        }
      } catch {
        // Fall back to empty teams
        playoffTeams = EMPTY_PLAYOFF_TEAMS.slice(0, config.teamsQualifying);
      }

      const newPlayoff = await createPlayoff({
        seasonNumber: config.seasonNumber,
        seasonId: config.seasonId,
        sourceType: 'franchise',
        franchiseId: playoffFranchiseId,
        status: 'NOT_STARTED',
        teamsQualifying: config.teamsQualifying,
        rounds: config.gamesPerRound.length,
        gamesPerRound: config.gamesPerRound,
        inningsPerGame: config.inningsPerGame ?? 9,
        useDH: config.useDH ?? true,
        leagues: ['Eastern', 'Western'],
        conferenceChampionship: true,
        teams: playoffTeams,
        seedingConfirmation: playoffFranchiseId && config.confirmedSeedingReview
          ? {
              confirmedAt: Date.now(),
              confirmedBy: 'user',
              source: 'season-end-review',
              tiebreakerPolicy: config.confirmedSeedingReview.tiebreakerPolicy,
              teamsQualifying: config.confirmedSeedingReview.teamsQualifying,
              teams: config.confirmedSeedingReview.teams.map((team) => ({
                teamId: team.teamId,
                teamName: team.teamName,
                seed: team.seed,
                wins: team.wins,
                losses: team.losses,
                runDiff: team.runDiff,
                qualifying: team.qualifying,
                eliminated: team.eliminated,
                tiebreakerNote: team.tiebreakerNote,
              })),
              tieGroups: config.confirmedSeedingReview.tieGroups,
            }
          : undefined,
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
  }, [franchiseId, refresh]);

  // Start playoffs
  const startPlayoffs = useCallback(async () => {
    if (!playoff) {
      throw new Error('No playoff to start');
    }
    if (!playoff.seedingConfirmation) {
      throw new Error('Confirm playoff seeding and bracket before starting playoffs.');
    }

    try {
      const firstRoundSeries = await getSeriesByRound(playoff.id, 1);
      await updatePlayoff(playoff.id, {
        bracketConfirmation: {
          confirmedAt: Date.now(),
          confirmedBy: 'user',
          source: 'confirmed-seeding',
          teamCount: playoff.teams.length,
          seriesCount: firstRoundSeries.length,
        },
      });
      await startPlayoff(playoff.id);

      // Mark first round series as IN_PROGRESS
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

  // Record game result — also checks for series completion and auto-advances
  const recordGameResult = useCallback(async (seriesId: string, game: SeriesGame) => {
    if (!playoff) {
      throw new Error('No playoff to record game result');
    }
    if ((playoff.franchiseId || franchiseId) && !playoff.seedingConfirmation) {
      throw new Error('Confirm playoff seeding before recording franchise playoff games.');
    }

    try {
      // Record the game — recordSeriesGame handles win counting + series completion
      const updatedSeries = await recordSeriesGame(seriesId, game);

      // If the series just completed, handle advancement
      if (updatedSeries.status === 'COMPLETED' && updatedSeries.winner) {
        console.log(`[Playoff] Series ${seriesId} completed. Winner: ${updatedSeries.winner}`);

        // Mark losing team as eliminated
        const loserId = updatedSeries.winner === updatedSeries.higherSeed.teamId
          ? updatedSeries.lowerSeed.teamId
          : updatedSeries.higherSeed.teamId;

        const updatedTeams = playoff.teams.map(t =>
          t.teamId === loserId
            ? { ...t, eliminated: true, eliminatedInRound: updatedSeries.round }
            : t
        );
        await updatePlayoff(playoff.id, { teams: updatedTeams });

        // Check if ALL series in this round are now complete
        const roundSeries = await getSeriesByRound(playoff.id, updatedSeries.round);
        const allRoundComplete = roundSeries.every(s => s.status === 'COMPLETED');

        if (allRoundComplete) {
          console.log(`[Playoff] All series in round ${updatedSeries.round} complete. Advancing...`);

          // Check if this was the championship (final round)
          if (updatedSeries.round === playoff.rounds) {
            // Championship complete — crown the winner
            const champSeries = roundSeries.find(s => s.winner);
            if (champSeries?.winner) {
              await completePlayoff(playoff.id, champSeries.winner);
              console.log(`[Playoff] Champion crowned: ${champSeries.winner}`);
            }
          } else {
            // Generate next round matchups from winners
            const { createNextRoundSeries } = await import('../../utils/playoffStorage');
            const latestPlayoff = playoff.franchiseId ?? franchiseId
              ? await getPlayoffByFranchiseSeason({
                  franchiseId: (playoff.franchiseId ?? franchiseId)!,
                  seasonNumber: playoff.seasonNumber,
                  seasonId: playoff.seasonId,
                  playoffId: playoff.id,
                })
              : await getPlayoffBySeason(playoff.seasonNumber, 'franchise');
            if (latestPlayoff) {
              await createNextRoundSeries(playoff.id, updatedSeries.round, latestPlayoff);
              // Advance the currentRound pointer
              await updatePlayoff(playoff.id, { currentRound: updatedSeries.round + 1 });
              console.log(`[Playoff] Advanced to round ${updatedSeries.round + 1}`);
            }
          }
        }
      }

      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record game result';
      setError(message);
      throw err;
    }
  }, [franchiseId, playoff, refresh]);

  // Advance to next round (manual trigger — auto-advancement happens in recordGameResult)
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

      // Check if next-round series already exist (from auto-advancement)
      const existingNextRound = await getSeriesByRound(playoff.id, nextRound);
      if (existingNextRound.length === 0) {
        // Generate next round matchups
        const { createNextRoundSeries } = await import('../../utils/playoffStorage');
        await createNextRoundSeries(playoff.id, playoff.currentRound, playoff);
      } else {
        // Mark existing next-round series as IN_PROGRESS if still PENDING
        for (const s of existingNextRound) {
          if (s.status === 'PENDING') {
            await updateSeries(s.id, { status: 'IN_PROGRESS' });
          }
        }
      }

      // Update playoff to next round
      await updatePlayoff(playoff.id, { currentRound: nextRound });

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
    preparePlayoffSeedingReview,
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
