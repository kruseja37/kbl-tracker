/**
 * Franchise Data Hook
 *
 * Provides real season data for the FranchiseHome page, bridging
 * existing IndexedDB hooks to the Figma UI components.
 * Falls back to mock data when real data is not available.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
// Import from src/ hooks and utils
import { useSeasonData, type TeamStanding } from '../../hooks/useSeasonData';
import { useSeasonStats, type BattingLeaderEntry, type PitchingLeaderEntry } from '../../hooks/useSeasonStats';
import { calculateStandings, type SeasonMetadata, type TeamStanding as StorageTeamStanding } from '../../utils/seasonStorage';

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
}

export interface PitchingLeadersData {
  ERA: LeaderEntry[];
  W: LeaderEntry[];
  K: LeaderEntry[];
  WHIP: LeaderEntry[];
  SV: LeaderEntry[];
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

  // Actions
  refresh: () => Promise<void>;
}

// ============================================
// MOCK DATA (fallback when no real data)
// ============================================

const MOCK_STANDINGS: LeagueStandings = {
  Eastern: {
    "Atlantic": [
      { team: "Tigers", wins: 56, losses: 34, gamesBack: "-", runDiff: "+127" },
      { team: "Sox", wins: 52, losses: 38, gamesBack: "4.0", runDiff: "+89" },
      { team: "Moonstars", wins: 48, losses: 42, gamesBack: "8.0", runDiff: "+45" },
      { team: "Crocs", wins: 44, losses: 46, gamesBack: "12.0", runDiff: "-12" },
      { team: "Nemesis", wins: 38, losses: 52, gamesBack: "18.0", runDiff: "-78" },
    ],
    "Central": [
      { team: "Bears", wins: 54, losses: 36, gamesBack: "-", runDiff: "+103" },
      { team: "Jacks", wins: 49, losses: 41, gamesBack: "5.0", runDiff: "+67" },
      { team: "Blowfish", wins: 45, losses: 45, gamesBack: "9.0", runDiff: "+23" },
      { team: "Overdogs", wins: 41, losses: 49, gamesBack: "13.0", runDiff: "-34" },
      { team: "Freebooters", wins: 35, losses: 55, gamesBack: "19.0", runDiff: "-92" },
    ],
  },
  Western: {
    "Mountain": [
      { team: "Herbisaurs", wins: 58, losses: 32, gamesBack: "-", runDiff: "+145" },
      { team: "Wild Pigs", wins: 53, losses: 37, gamesBack: "5.0", runDiff: "+98" },
      { team: "Beewolves", wins: 47, losses: 43, gamesBack: "11.0", runDiff: "+56" },
      { team: "Crocodons", wins: 42, losses: 48, gamesBack: "16.0", runDiff: "-23" },
      { team: "Sirloins", wins: 36, losses: 54, gamesBack: "22.0", runDiff: "-88" },
    ],
    "Pacific": [
      { team: "Hot Corners", wins: 55, losses: 35, gamesBack: "-", runDiff: "+118" },
      { team: "Sand Cats", wins: 51, losses: 39, gamesBack: "4.0", runDiff: "+82" },
      { team: "Platypi", wins: 46, losses: 44, gamesBack: "9.0", runDiff: "+34" },
      { team: "Grapplers", wins: 40, losses: 50, gamesBack: "15.0", runDiff: "-45" },
      { team: "Moose", wins: 34, losses: 56, gamesBack: "21.0", runDiff: "-101" },
    ],
  },
};

const MOCK_BATTING_LEADERS: BattingLeadersData = {
  AVG: [
    { player: "J. Rodriguez", team: "Tigers", value: ".342" },
    { player: "K. Martinez", team: "Sox", value: ".328" },
    { player: "T. Anderson", team: "Sox", value: ".312" },
    { player: "L. Ramirez", team: "Crocs", value: ".308" },
    { player: "M. Thompson", team: "Crocs", value: ".301" },
  ],
  HR: [
    { player: "M. Thompson", team: "Crocs", value: "47" },
    { player: "J. Rodriguez", team: "Tigers", value: "41" },
    { player: "K. Martinez", team: "Sox", value: "38" },
    { player: "T. Anderson", team: "Sox", value: "32" },
    { player: "A. Brown", team: "Crocs", value: "30" },
  ],
  RBI: [
    { player: "K. Martinez", team: "Sox", value: "128" },
    { player: "M. Thompson", team: "Crocs", value: "121" },
    { player: "J. Rodriguez", team: "Tigers", value: "118" },
    { player: "T. Anderson", team: "Sox", value: "98" },
    { player: "A. Brown", team: "Crocs", value: "92" },
  ],
  SB: [
    { player: "T. Davis", team: "Sox", value: "48" },
    { player: "K. Martinez", team: "Sox", value: "38" },
    { player: "J. Rodriguez", team: "Tigers", value: "28" },
    { player: "A. Brown", team: "Crocs", value: "24" },
    { player: "M. Santos", team: "Sox", value: "19" },
  ],
  OPS: [
    { player: "J. Rodriguez", team: "Tigers", value: "1.087" },
    { player: "M. Thompson", team: "Crocs", value: "1.042" },
    { player: "K. Martinez", team: "Sox", value: ".989" },
    { player: "T. Anderson", team: "Sox", value: ".923" },
    { player: "A. Brown", team: "Crocs", value: ".901" },
  ],
};

const MOCK_PITCHING_LEADERS: PitchingLeadersData = {
  ERA: [
    { player: "T. Anderson", team: "Sox", value: "2.38" },
    { player: "J. Williams", team: "Tigers", value: "2.67" },
    { player: "K. Brown", team: "Crocs", value: "2.89" },
    { player: "M. Davis", team: "Sox", value: "3.12" },
    { player: "R. Smith", team: "Tigers", value: "3.24" },
  ],
  W: [
    { player: "T. Anderson", team: "Sox", value: "19" },
    { player: "J. Williams", team: "Tigers", value: "18" },
    { player: "K. Brown", team: "Crocs", value: "17" },
    { player: "M. Davis", team: "Sox", value: "16" },
    { player: "R. Smith", team: "Tigers", value: "15" },
  ],
  K: [
    { player: "T. Anderson", team: "Sox", value: "287" },
    { player: "J. Williams", team: "Tigers", value: "221" },
    { player: "K. Brown", team: "Crocs", value: "198" },
    { player: "M. Davis", team: "Sox", value: "187" },
    { player: "R. Smith", team: "Tigers", value: "176" },
  ],
  WHIP: [
    { player: "T. Anderson", team: "Sox", value: "1.02" },
    { player: "J. Williams", team: "Tigers", value: "1.08" },
    { player: "K. Brown", team: "Crocs", value: "1.15" },
    { player: "M. Davis", team: "Sox", value: "1.18" },
    { player: "R. Smith", team: "Tigers", value: "1.22" },
  ],
  SV: [
    { player: "C. Rivera", team: "Crocs", value: "45" },
    { player: "D. Martinez", team: "Sox", value: "38" },
    { player: "R. Smith", team: "Tigers", value: "31" },
    { player: "J. Parker", team: "Sox", value: "28" },
    { player: "K. Lee", team: "Crocs", value: "24" },
  ],
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

export function useFranchiseData(seasonId: string = 'season-1'): UseFranchiseDataReturn {
  // Get real data from existing hooks
  const seasonData = useSeasonData(seasonId);
  const seasonStats = useSeasonStats(seasonId);

  // Compute hasRealData based on whether we have actual stats
  const hasRealData = useMemo(() => {
    return seasonStats.battingLeaders.length > 0 || seasonStats.pitchingLeaders.length > 0;
  }, [seasonStats.battingLeaders.length, seasonStats.pitchingLeaders.length]);

  // Build batting leaders from real data or fallback to mock
  const battingLeaders = useMemo((): BattingLeadersData => {
    if (!hasRealData) {
      return MOCK_BATTING_LEADERS;
    }

    return {
      AVG: seasonStats.getBattingLeaders('avg', 5).map((e: BattingLeaderEntry) => toBattingLeaderEntry(e, 'AVG')),
      HR: seasonStats.getBattingLeaders('hr', 5).map((e: BattingLeaderEntry) => toBattingLeaderEntry(e, 'HR')),
      RBI: seasonStats.getBattingLeaders('rbi', 5).map((e: BattingLeaderEntry) => toBattingLeaderEntry(e, 'RBI')),
      SB: seasonStats.getBattingLeaders('sb', 5).map((e: BattingLeaderEntry) => toBattingLeaderEntry(e, 'SB')),
      OPS: seasonStats.getBattingLeaders('ops', 5).map((e: BattingLeaderEntry) => toBattingLeaderEntry(e, 'OPS')),
    };
  }, [hasRealData, seasonStats]);

  // Build pitching leaders from real data or fallback to mock
  const pitchingLeaders = useMemo((): PitchingLeadersData => {
    if (!hasRealData) {
      return MOCK_PITCHING_LEADERS;
    }

    return {
      ERA: seasonStats.getPitchingLeaders('era', 5).map((e: PitchingLeaderEntry) => toPitchingLeaderEntry(e, 'ERA')),
      W: seasonStats.getPitchingLeaders('wins', 5).map((e: PitchingLeaderEntry) => toPitchingLeaderEntry(e, 'W')),
      K: seasonStats.getPitchingLeaders('strikeouts', 5).map((e: PitchingLeaderEntry) => toPitchingLeaderEntry(e, 'K')),
      WHIP: seasonStats.getPitchingLeaders('whip', 5).map((e: PitchingLeaderEntry) => toPitchingLeaderEntry(e, 'WHIP')),
      SV: seasonStats.getPitchingLeaders('saves', 5).map((e: PitchingLeaderEntry) => toPitchingLeaderEntry(e, 'SV')),
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
    // Use mock standings if no real data
    if (!standingsLoaded || realStandings.length === 0) {
      return MOCK_STANDINGS;
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

  // Next game info (placeholder - would need schedule system)
  const nextGame = useMemo((): NextGameInfo | null => {
    // Return null if no next game scheduled
    // In future, this would come from schedule storage
    return null;
  }, []);

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
    refresh,
  };
}

export default useFranchiseData;
