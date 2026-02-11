/**
 * Franchise Data Hook
 *
 * Provides real season data for the FranchiseHome page, bridging
 * existing IndexedDB hooks to the Figma UI components.
 * Shows empty states when no real data exists yet.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
// Import from src/ hooks and utils
import { useSeasonData, type TeamStanding } from '../../hooks/useSeasonData';
import { useSeasonStats, type BattingLeaderEntry, type PitchingLeaderEntry } from '../../hooks/useSeasonStats';
import { calculateStandings, type SeasonMetadata, type TeamStanding as StorageTeamStanding } from '../../utils/seasonStorage';
import { useRelationshipData, type UseRelationshipDataReturn } from '../app/hooks/useRelationshipData';
import { getFranchiseConfig, loadFranchise } from '../../utils/franchiseManager';
import { getNextFranchiseGame } from '../../utils/scheduleStorage';
import type { StoredFranchiseConfig } from '../../types/franchise';

// ============================================
// TYPES
// ============================================

export interface StandingEntry {
  team: string;
  wins: number;
  losses: number;
  gamesBack: string;
  runDiff: string;
}

export interface DivisionStandings {
  [division: string]: StandingEntry[];
}

export interface LeagueStandings {
  Eastern: DivisionStandings;
  Western: DivisionStandings;
}

export interface LeaderEntry {
  player: string;
  team: string;
  value: string;
}

export interface BattingLeadersData {
  AVG: LeaderEntry[];
  HR: LeaderEntry[];
  RBI: LeaderEntry[];
  SB: LeaderEntry[];
  OPS: LeaderEntry[];
  WAR: LeaderEntry[];
}

export interface PitchingLeadersData {
  ERA: LeaderEntry[];
  W: LeaderEntry[];
  K: LeaderEntry[];
  WHIP: LeaderEntry[];
  SV: LeaderEntry[];
  WAR: LeaderEntry[];
}

export interface NextGameInfo {
  id: string;
  awayTeam: string;
  homeTeam: string;
  awayRecord: string;
  homeRecord: string;
  gameNumber: number;
  totalGames: number;
  date?: string;
}

export interface UseFranchiseDataReturn {
  // Loading state
  isLoading: boolean;
  error: string | null;

  // Franchise info
  franchiseConfig: StoredFranchiseConfig | null;
  leagueName: string;

  // Season info
  seasonNumber: number;
  seasonName: string;
  currentWeek: number;
  gamesPlayed: number;
  totalGames: number;

  // Data
  standings: LeagueStandings;
  battingLeaders: BattingLeadersData;
  pitchingLeaders: PitchingLeadersData;
  nextGame: NextGameInfo | null;

  // Flags
  hasRealData: boolean;

  // Relationships & team chemistry (wired from relationship engine)
  relationshipData: UseRelationshipDataReturn;

  // Actions
  refresh: () => Promise<void>;
}

// ============================================
// EMPTY DATA (shown when no real data exists yet)
// ============================================

const EMPTY_STANDINGS: LeagueStandings = {
  Eastern: {},
  Western: {},
};

const EMPTY_BATTING_LEADERS: BattingLeadersData = {
  AVG: [],
  HR: [],
  RBI: [],
  SB: [],
  OPS: [],
  WAR: [],
};

const EMPTY_PITCHING_LEADERS: PitchingLeadersData = {
  ERA: [],
  W: [],
  K: [],
  WHIP: [],
  SV: [],
  WAR: [],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert BattingLeaderEntry to LeaderEntry format
 */
function toBattingLeaderEntry(entry: BattingLeaderEntry, stat: keyof BattingLeadersData): LeaderEntry {
  let value: string;
  switch (stat) {
    case 'AVG':
      value = entry.avg.toFixed(3).replace(/^0/, '');
      break;
    case 'HR':
      value = entry.homeRuns.toString();
      break;
    case 'RBI':
      value = entry.rbi.toString();
      break;
    case 'SB':
      value = entry.stolenBases.toString();
      break;
    case 'OPS':
      value = entry.ops.toFixed(3);
      break;
    case 'WAR':
      value = entry.totalWAR.toFixed(1);
      break;
    default:
      value = '0';
  }

  return {
    player: entry.playerName,
    team: entry.teamId,
    value,
  };
}

/**
 * Convert PitchingLeaderEntry to LeaderEntry format
 */
function toPitchingLeaderEntry(entry: PitchingLeaderEntry, stat: keyof PitchingLeadersData): LeaderEntry {
  let value: string;
  switch (stat) {
    case 'ERA':
      value = entry.era.toFixed(2);
      break;
    case 'W':
      value = entry.wins.toString();
      break;
    case 'K':
      value = entry.strikeouts.toString();
      break;
    case 'WHIP':
      value = entry.whip.toFixed(2);
      break;
    case 'SV':
      value = entry.saves.toString();
      break;
    case 'WAR':
      value = entry.pWAR.toFixed(1);
      break;
    default:
      value = '0';
  }

  return {
    player: entry.playerName,
    team: entry.teamId,
    value,
  };
}

/**
 * Calculate current week from games played
 */
function calculateWeek(gamesPlayed: number, gamesPerWeek: number = 6): number {
  return Math.floor(gamesPlayed / gamesPerWeek) + 1;
}

// ============================================
// HOOK
// ============================================

export function useFranchiseData(franchiseId?: string): UseFranchiseDataReturn {
  // Derive seasonId from franchiseId (or fallback for legacy usage)
  const seasonId = franchiseId ? `${franchiseId}-season-1` : 'season-1';

  // Franchise config loaded from IndexedDB
  const [franchiseConfig, setFranchiseConfig] = useState<StoredFranchiseConfig | null>(null);
  const [franchiseLeagueName, setFranchiseLeagueName] = useState<string>('');

  // Load franchise config when franchiseId changes
  useEffect(() => {
    if (!franchiseId) {
      setFranchiseConfig(null);
      setFranchiseLeagueName('');
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const config = await getFranchiseConfig(franchiseId!);
        if (!cancelled) {
          setFranchiseConfig(config);
          setFranchiseLeagueName(
            config?.leagueDetails?.name || 'League'
          );
        }
        // Also load franchise metadata for additional fields
        const meta = await loadFranchise(franchiseId!);
        if (!cancelled && meta) {
          // Prefer metadata leagueName if available (set during initialization)
          if (meta.leagueName) {
            setFranchiseLeagueName(meta.leagueName);
          }
        }
      } catch (err) {
        console.error('[useFranchiseData] Failed to load franchise config:', err);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [franchiseId]);

  // Get real data from existing hooks
  const seasonData = useSeasonData(seasonId);
  const seasonStats = useSeasonStats(seasonId);

  // Relationship engine — wired here so it's available throughout franchise UI
  const relationshipData = useRelationshipData();

  // Compute hasRealData based on whether we have actual stats
  const hasRealData = useMemo(() => {
    return seasonStats.battingLeaders.length > 0 || seasonStats.pitchingLeaders.length > 0;
  }, [seasonStats.battingLeaders.length, seasonStats.pitchingLeaders.length]);

  // Build batting leaders from real data or fallback to mock
  const battingLeaders = useMemo((): BattingLeadersData => {
    if (!hasRealData) {
      return EMPTY_BATTING_LEADERS;
    }

    return {
      AVG: seasonStats.getBattingLeaders('avg', 5).map((e: BattingLeaderEntry) => toBattingLeaderEntry(e, 'AVG')),
      HR: seasonStats.getBattingLeaders('hr', 5).map((e: BattingLeaderEntry) => toBattingLeaderEntry(e, 'HR')),
      RBI: seasonStats.getBattingLeaders('rbi', 5).map((e: BattingLeaderEntry) => toBattingLeaderEntry(e, 'RBI')),
      SB: seasonStats.getBattingLeaders('sb', 5).map((e: BattingLeaderEntry) => toBattingLeaderEntry(e, 'SB')),
      OPS: seasonStats.getBattingLeaders('ops', 5).map((e: BattingLeaderEntry) => toBattingLeaderEntry(e, 'OPS')),
      WAR: seasonStats.getBattingLeaders('totalWAR', 5).map((e: BattingLeaderEntry) => toBattingLeaderEntry(e, 'WAR')),
    };
  }, [hasRealData, seasonStats]);

  // Build pitching leaders from real data or fallback to mock
  const pitchingLeaders = useMemo((): PitchingLeadersData => {
    if (!hasRealData) {
      return EMPTY_PITCHING_LEADERS;
    }

    return {
      ERA: seasonStats.getPitchingLeaders('era', 5).map((e: PitchingLeaderEntry) => toPitchingLeaderEntry(e, 'ERA')),
      W: seasonStats.getPitchingLeaders('wins', 5).map((e: PitchingLeaderEntry) => toPitchingLeaderEntry(e, 'W')),
      K: seasonStats.getPitchingLeaders('strikeouts', 5).map((e: PitchingLeaderEntry) => toPitchingLeaderEntry(e, 'K')),
      WHIP: seasonStats.getPitchingLeaders('whip', 5).map((e: PitchingLeaderEntry) => toPitchingLeaderEntry(e, 'WHIP')),
      SV: seasonStats.getPitchingLeaders('saves', 5).map((e: PitchingLeaderEntry) => toPitchingLeaderEntry(e, 'SV')),
      WAR: seasonStats.getPitchingLeaders('pWAR', 5).map((e: PitchingLeaderEntry) => toPitchingLeaderEntry(e, 'WAR')),
    };
  }, [hasRealData, seasonStats]);

  // Real standings from completed games
  const [realStandings, setRealStandings] = useState<StorageTeamStanding[]>([]);
  const [standingsLoaded, setStandingsLoaded] = useState(false);

  // Load real standings from IndexedDB
  useEffect(() => {
    async function loadStandings() {
      try {
        const standings = await calculateStandings(seasonId);
        setRealStandings(standings);
        setStandingsLoaded(true);
      } catch (err) {
        console.error('[useFranchiseData] Failed to load standings:', err);
        setStandingsLoaded(true);
      }
    }
    loadStandings();
  }, [seasonId]);

  // Convert real standings to league/division format
  // For now, we group all teams into a simple structure
  // TODO: Add proper league/division configuration
  const standings = useMemo((): LeagueStandings => {
    // Show empty standings if no real data exists yet
    if (!standingsLoaded || realStandings.length === 0) {
      return EMPTY_STANDINGS;
    }

    // Convert real standings to UI format
    const convertToEntry = (s: StorageTeamStanding): StandingEntry => ({
      team: s.teamName,
      wins: s.wins,
      losses: s.losses,
      gamesBack: s.gamesBack === 0 ? "-" : s.gamesBack.toFixed(1),
      runDiff: s.runDiff >= 0 ? `+${s.runDiff}` : `${s.runDiff}`,
    });

    // Split teams into leagues/divisions based on the 20 SML teams
    // Using the same structure as the mock data
    const allTeams = realStandings.map(convertToEntry);

    // If we have game data, organize into divisions
    // For now, put first half in Eastern, second half in Western
    const half = Math.ceil(allTeams.length / 2);
    const eastern = allTeams.slice(0, half);
    const western = allTeams.slice(half);

    // Split each league into two divisions
    const eastHalf = Math.ceil(eastern.length / 2);
    const westHalf = Math.ceil(western.length / 2);

    return {
      Eastern: {
        "Division 1": eastern.slice(0, eastHalf),
        "Division 2": eastern.slice(eastHalf),
      },
      Western: {
        "Division 1": western.slice(0, westHalf),
        "Division 2": western.slice(westHalf),
      },
    };
  }, [standingsLoaded, realStandings]);

  // Season info
  const seasonNumber = seasonData.seasonMetadata?.seasonNumber ?? 1;
  const seasonName = seasonData.seasonMetadata?.seasonName ?? 'Season 1';
  const gamesPlayed = seasonData.seasonMetadata?.gamesPlayed ?? 0;
  const totalGames = seasonData.seasonMetadata?.totalGames ?? 64;
  const currentWeek = calculateWeek(gamesPlayed);

  // Next game info — loaded from franchise schedule
  const [nextGame, setNextGame] = useState<NextGameInfo | null>(null);

  useEffect(() => {
    if (!franchiseId) {
      setNextGame(null);
      return;
    }
    let cancelled = false;
    async function loadNextGame() {
      try {
        const game = await getNextFranchiseGame(franchiseId!, 1);
        if (!cancelled && game) {
          // Look up real W-L records from standings
          const awayStanding = realStandings.find(s => s.teamId === game.awayTeamId);
          const homeStanding = realStandings.find(s => s.teamId === game.homeTeamId);
          setNextGame({
            id: game.id,
            awayTeam: game.awayTeamId,
            homeTeam: game.homeTeamId,
            awayRecord: awayStanding ? `${awayStanding.wins}-${awayStanding.losses}` : '0-0',
            homeRecord: homeStanding ? `${homeStanding.wins}-${homeStanding.losses}` : '0-0',
            gameNumber: game.gameNumber,
            totalGames: totalGames,
          });
        } else if (!cancelled) {
          setNextGame(null);
        }
      } catch (err) {
        console.error('[useFranchiseData] Failed to load next game:', err);
      }
    }
    loadNextGame();
    return () => { cancelled = true; };
  }, [franchiseId, totalGames, gamesPlayed, realStandings]);

  // Refresh function
  const refresh = useCallback(async () => {
    // Also refresh standings
    const [, , newStandings] = await Promise.all([
      seasonData.refresh(),
      seasonStats.refresh(),
      calculateStandings(seasonId),
    ]);
    setRealStandings(newStandings);
  }, [seasonData, seasonStats, seasonId]);

  // Combined loading/error state
  const isLoading = seasonData.isLoading || seasonStats.isLoading;
  const error = seasonData.error || seasonStats.error;

  return {
    isLoading,
    error,
    franchiseConfig,
    leagueName: franchiseLeagueName,
    seasonNumber,
    seasonName,
    currentWeek,
    gamesPlayed,
    totalGames,
    standings,
    battingLeaders,
    pitchingLeaders,
    nextGame,
    hasRealData,
    relationshipData,
    refresh,
  };
}

export default useFranchiseData;
