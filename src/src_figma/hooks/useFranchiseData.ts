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
import { getAllTeams, getAllLeagueTemplates, type LeagueTemplate, type Conference, type Division } from '../../utils/leagueBuilderStorage';
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

  // Team stadium lookup (teamId → stadium name)
  stadiumMap: Record<string, string>;

  // Team name lookup (teamId → display name)
  teamNameMap: Record<string, string>;

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

  // Stadium lookup map — loaded from real team data in IndexedDB
  const [stadiumMap, setStadiumMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function loadStadiums() {
      try {
        const teams = await getAllTeams();
        if (!cancelled) {
          const map: Record<string, string> = {};
          for (const team of teams) {
            if (team.stadium) {
              map[team.id] = team.stadium;
            }
          }
          setStadiumMap(map);
        }
      } catch (err) {
        console.error('[useFranchiseData] Failed to load stadium map:', err);
      }
    }
    loadStadiums();
    return () => { cancelled = true; };
  }, []);

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

  // League template for conference/division structure
  const [leagueTemplate, setLeagueTemplate] = useState<LeagueTemplate | null>(null);
  // Team name lookup (teamId → name)
  const [teamNameMap, setTeamNameMap] = useState<Record<string, string>>({});

  // Load league template + team names for standings structure
  useEffect(() => {
    let cancelled = false;
    async function loadLeagueStructure() {
      try {
        const [templates, teams] = await Promise.all([
          getAllLeagueTemplates(),
          getAllTeams(),
        ]);
        if (cancelled) return;
        if (templates.length > 0) {
          setLeagueTemplate(templates[0]); // Use first league template
        }
        const nameMap: Record<string, string> = {};
        for (const t of teams) {
          nameMap[t.id] = t.name;
        }
        setTeamNameMap(nameMap);
      } catch (err) {
        console.error('[useFranchiseData] Failed to load league structure:', err);
      }
    }
    loadLeagueStructure();
    return () => { cancelled = true; };
  }, []);

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

  // Convert real standings to league/division format using the actual
  // conference/division structure from the league template.
  // When no games have been played, seed ALL teams at 0-0.
  const standings = useMemo((): LeagueStandings => {
    if (!standingsLoaded) return EMPTY_STANDINGS;

    // Build a lookup of teamId → standing entry from real game data
    const standingsByTeamId = new Map<string, StorageTeamStanding>();
    for (const s of realStandings) {
      standingsByTeamId.set(s.teamId, s);
    }

    // Helper: build a StandingEntry for a teamId (0-0 fallback if no games)
    const entryForTeam = (teamId: string): StandingEntry => {
      const s = standingsByTeamId.get(teamId);
      if (s) {
        return {
          team: s.teamName,
          wins: s.wins,
          losses: s.losses,
          gamesBack: s.gamesBack === 0 ? "-" : s.gamesBack.toFixed(1),
          runDiff: s.runDiff >= 0 ? `+${s.runDiff}` : `${s.runDiff}`,
        };
      }
      // No game data yet — show 0-0
      return {
        team: teamNameMap[teamId] || teamId,
        wins: 0,
        losses: 0,
        gamesBack: "-",
        runDiff: "+0",
      };
    };

    // If we have a league template, use its real conference/division names
    if (leagueTemplate && leagueTemplate.conferences.length > 0) {
      const result: LeagueStandings = { Eastern: {}, Western: {} };

      leagueTemplate.conferences.forEach((conf: Conference, confIdx: number) => {
        const confKey = confIdx === 0 ? 'Eastern' : 'Western';
        const divisions = leagueTemplate.divisions?.filter(
          (d: Division) => d.conferenceId === conf.id
        ) || [];

        if (divisions.length > 0) {
          for (const div of divisions) {
            const entries = div.teamIds.map(entryForTeam);
            // Sort by wins desc, then run diff
            entries.sort((a, b) => b.wins - a.wins || parseInt(b.runDiff) - parseInt(a.runDiff));
            // Recalculate games back within division
            if (entries.length > 0) {
              const leaderWins = entries[0].wins;
              const leaderLosses = entries[0].losses;
              for (const entry of entries) {
                const gb = ((leaderWins - entry.wins) + (entry.losses - leaderLosses)) / 2;
                entry.gamesBack = gb === 0 ? "-" : gb.toFixed(1);
              }
            }
            result[confKey][div.name] = entries;
          }
        } else {
          // No divisions defined — put all conference teams in one group
          const teamIds = leagueTemplate.teamIds.slice(
            confIdx * Math.ceil(leagueTemplate.teamIds.length / 2),
            (confIdx + 1) * Math.ceil(leagueTemplate.teamIds.length / 2),
          );
          result[confKey][conf.name] = teamIds.map(entryForTeam);
        }
      });

      return result;
    }

    // Fallback: no league template — if we have standings from games, split generically
    if (realStandings.length > 0) {
      const allEntries = realStandings.map(s => entryForTeam(s.teamId));
      const half = Math.ceil(allEntries.length / 2);
      const eastHalf = Math.ceil(half / 2);
      const westHalf = Math.ceil((allEntries.length - half) / 2);
      return {
        Eastern: {
          "Division 1": allEntries.slice(0, eastHalf),
          "Division 2": allEntries.slice(eastHalf, half),
        },
        Western: {
          "Division 1": allEntries.slice(half, half + westHalf),
          "Division 2": allEntries.slice(half + westHalf),
        },
      };
    }

    return EMPTY_STANDINGS;
  }, [standingsLoaded, realStandings, leagueTemplate, teamNameMap]);

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
    stadiumMap,
    teamNameMap,
    relationshipData,
    refresh,
  };
}

export default useFranchiseData;
