import { useState, useEffect, useMemo, createContext, useContext } from "react";
import { useNavigate, useParams } from "react-router";
import { Calendar, Users, TrendingUp, Newspaper, Trophy, Folder, Home, ChevronDown, ChevronUp, DollarSign, ClipboardList, Star, Award, TrendingDown, Shuffle, UserMinus, CheckCircle, ArrowRight, BarChart3, Plus, GitMerge, FlaskConical, Sunrise } from "lucide-react";
import { getTeamColors } from "@/config/teamColors";
import { TeamHubContent } from "@/app/components/TeamHubContent";
import { MuseumContent, type RetiredJersey } from "@/app/components/MuseumContent";
import { FreeAgencyFlow } from "@/app/components/FreeAgencyFlow";
import { RatingsAdjustmentFlow } from "@/app/components/RatingsAdjustmentFlow";
import { RetirementFlow } from "@/app/components/RetirementFlow";
import { AwardsCeremonyFlow } from "@/app/components/AwardsCeremonyFlow";
import { ContractionExpansionFlow } from "@/app/components/ContractionExpansionFlow";
import { DraftFlow } from "@/app/components/DraftFlow";
import { FinalizeAdvanceFlow } from "@/app/components/FinalizeAdvanceFlow";
import { SeasonEndFlow } from "@/app/components/SeasonEndFlow";
import { PlayoffSeedingFlow } from "@/app/components/PlayoffSeedingFlow";
import { TradeFlow } from "@/app/components/TradeFlow";
import { SpringTrainingFlow } from "@/app/components/SpringTrainingFlow";
import { AddGameModal, type GameFormData } from "@/app/components/AddGameModal";
import { ScheduleContent } from "@/app/components/ScheduleContent";
import { useFranchiseData, type UseFranchiseDataReturn } from "@/hooks/useFranchiseData";
import { useScheduleData, type ScheduledGame } from "@/hooks/useScheduleData";
import { usePlayoffData, type PlayoffTeam } from "@/hooks/usePlayoffData";
import { getHomeFieldPattern, detectClinch } from "../../../engines/playoffEngine";
import { SimulationOverlay } from "@/app/components/SimulationOverlay";
import { BatchOperationOverlay, type BatchOperationType } from "@/app/components/BatchOperationOverlay";
import {
  buildRosterFromPlayers,
  generateSyntheticGame,
  generatePlayByPlay,
  type PlayByPlayEntry,
} from "../../../utils/syntheticGameFactory";
import { processCompletedGame } from "../../../utils/processCompletedGame";
import { markSeasonComplete } from "../../../utils/seasonStorage";
import { getAllGames } from "../../../utils/scheduleStorage";
import { startOffseason, OFFSEASON_PHASES, type OffseasonPhase } from "../../../utils/offseasonStorage";
import { useOffseasonState } from "@/hooks/useOffseasonState";
import { generateNewSeasonSchedule } from "../../../utils/franchiseInitializer";
import { executeSeasonTransition } from "../../../engines/seasonTransitionEngine";
import { updateFranchiseMetadata } from "../../../utils/franchiseManager";
import { getPlayersByTeam } from "../../../utils/leagueBuilderStorage";
import type { Player as TeamRosterPlayer, Pitcher as TeamRosterPitcher } from "@/app/components/TeamRoster";

// Pitcher positions for separating roster
const PITCHER_POS = new Set(['SP', 'RP', 'CP', 'P', 'SP/RP', 'TWO-WAY']);

/**
 * Load real players from IndexedDB and convert to GameTracker format.
 * Returns { players, pitchers } ready for navigation state.
 *
 * Falls back to empty arrays if no data (GameTracker.tsx will use its defaults).
 */
async function buildGameTrackerRoster(teamId: string): Promise<{
  players: TeamRosterPlayer[];
  pitchers: TeamRosterPitcher[];
}> {
  let dbPlayers;
  try {
    dbPlayers = await getPlayersByTeam(teamId);
  } catch {
    return { players: [], pitchers: [] };
  }

  if (!dbPlayers || dbPlayers.length === 0) {
    return { players: [], pitchers: [] };
  }

  // Format name as "F. LASTNAME" — matches GameTracker convention
  const formatName = (first: string, last: string) => {
    const initial = first?.charAt(0)?.toUpperCase() || '?';
    const upper = last?.toUpperCase() || 'PLAYER';
    return `${initial}. ${upper}`;
  };

  const emptyBatterStats = { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 };
  const emptyPitcherStats = { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 };

  // Split into position players and pitchers
  const positionPlayers = dbPlayers.filter(p => !PITCHER_POS.has(p.primaryPosition));
  const pitcherPlayers = dbPlayers.filter(p => PITCHER_POS.has(p.primaryPosition));

  // Build position player roster: first 9 as starters (with battingOrder), rest as bench
  const players: TeamRosterPlayer[] = [];
  positionPlayers.forEach((p, idx) => {
    players.push({
      name: formatName(p.firstName, p.lastName),
      position: idx < 9 ? p.primaryPosition : (p.primaryPosition === 'SP' || p.primaryPosition === 'RP' ? undefined : p.primaryPosition),
      battingOrder: idx < 9 ? idx + 1 : undefined,
      stats: { ...emptyBatterStats },
      battingHand: p.bats,
    });
  });

  // Add pitcher to batting 9th spot if we have <9 position players
  // (pitcher bats last in the lineup)
  if (players.filter(p => p.battingOrder !== undefined).length < 9 && pitcherPlayers.length > 0) {
    const starter = pitcherPlayers.find(p => p.primaryPosition === 'SP') || pitcherPlayers[0];
    const nextOrder = players.filter(p => p.battingOrder !== undefined).length + 1;
    players.push({
      name: formatName(starter.firstName, starter.lastName),
      position: 'P',
      battingOrder: nextOrder,
      stats: { ...emptyBatterStats },
      battingHand: starter.bats,
    });
  }

  // Build pitcher roster
  const pitchers: TeamRosterPitcher[] = [];
  const starterPitcher = pitcherPlayers.find(p => p.primaryPosition === 'SP') || pitcherPlayers[0];
  pitcherPlayers.forEach(p => {
    const isStarter = starterPitcher && p.id === starterPitcher.id;
    pitchers.push({
      name: formatName(p.firstName, p.lastName),
      stats: { ...emptyPitcherStats },
      throwingHand: p.throws,
      isStarter: isStarter || false,
      isActive: isStarter || false,
    });
  });

  return { players, pitchers };
}

// Context for passing franchise data to child components
const FranchiseDataContext = createContext<UseFranchiseDataReturn | null>(null);

export function useFranchiseDataContext() {
  const context = useContext(FranchiseDataContext);
  if (!context) {
    throw new Error('useFranchiseDataContext must be used within FranchiseDataProvider');
  }
  return context;
}

type TabType = "todays-game" | "team" | "schedule" | "standings" | "news" | "leaders" | "rosters" | "allstar" | "museum" | "awards" | "ratings-adj" | "contraction" | "retirements" | "free-agency" | "draft" | "farm-reconciliation" | "chemistry" | "spring-training" | "finalize" | "advance" | "bracket" | "series" | "playoff-stats" | "playoff-leaders";
type SeasonPhase = "regular" | "playoffs" | "offseason";

// ScheduledGame type is imported from useScheduleData hook

export function FranchiseHome() {
  const navigate = useNavigate();
  const { franchiseId } = useParams<{ franchiseId: string }>();

  const [seasonPhase, setSeasonPhase] = useState<SeasonPhase>("regular");
  const [activeTab, setActiveTab] = useState<TabType>("todays-game");
  const [leagueName, setLeagueName] = useState<string>("KRUSE BASEBALL");
  const [scheduleDropdownOpen, setScheduleDropdownOpen] = useState(false);
  const [showFreeAgency, setShowFreeAgency] = useState(false);
  const [showRatingsAdjustment, setShowRatingsAdjustment] = useState(false);
  const [showRetirements, setShowRetirements] = useState(false);
  const [showAwards, setShowAwards] = useState(false);
  const [showContraction, setShowContraction] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const [showFinalize, setShowFinalize] = useState(false);
  const [showSeasonEnd, setShowSeasonEnd] = useState(false);
  const [showPlayoffSeeding, setShowPlayoffSeeding] = useState(false);
  const [retiredJerseys, setRetiredJerseys] = useState<RetiredJersey[]>([]);
  const [selectedScheduleTeam, setSelectedScheduleTeam] = useState<string>("FULL LEAGUE");

  // Schedule System State - Persisted to IndexedDB via useScheduleData
  // Load initial season from localStorage or default to 1
  const [currentSeason, setCurrentSeason] = useState(() => {
    const stored = localStorage.getItem('kbl-current-season');
    return stored ? parseInt(stored, 10) : 1;
  });
  const scheduleData = useScheduleData(currentSeason);

  // Real season data from IndexedDB (with mock fallbacks)
  const franchiseData = useFranchiseData(franchiseId, currentSeason);
  const [addGameModalOpen, setAddGameModalOpen] = useState(false);

  // Bracket UI state
  const [expandedSeriesId, setExpandedSeriesId] = useState<string | null>(null);

  // Playoff System State - Persisted to IndexedDB via usePlayoffData
  const playoffData = usePlayoffData(currentSeason);

  // Offseason State - tracks current phase progression
  const offseasonState = useOffseasonState(`season-${currentSeason}`, currentSeason);

  // Map offseason phases to their corresponding tab IDs
  const phaseToTab: Record<OffseasonPhase, TabType> = {
    STANDINGS_FINAL: "news",
    AWARDS: "awards",
    RATINGS_ADJUSTMENTS: "ratings-adj",
    CONTRACTION_EXPANSION: "contraction",
    RETIREMENTS: "retirements",
    FREE_AGENCY: "free-agency",
    DRAFT: "draft",
    FARM_RECONCILIATION: "farm-reconciliation",
    CHEMISTRY_REBALANCING: "chemistry",
    TRADES: "rosters",
    SPRING_TRAINING: "spring-training",
  };

  // Complete current phase and advance to next, then navigate to the new phase's tab
  const handleAdvancePhase = async () => {
    try {
      // Figure out what the next phase will be before advancing
      const currentIdx = offseasonState.currentPhase
        ? OFFSEASON_PHASES.indexOf(offseasonState.currentPhase)
        : -1;
      const nextPhase = currentIdx >= 0 && currentIdx < OFFSEASON_PHASES.length - 1
        ? OFFSEASON_PHASES[currentIdx + 1]
        : null;

      if (offseasonState.canAdvance) {
        await offseasonState.advanceToNextPhase();
      } else {
        // completeCurrentPhase also advances internally
        await offseasonState.completeCurrentPhase();
      }

      // Navigate to the new phase's tab
      if (nextPhase && phaseToTab[nextPhase]) {
        setActiveTab(phaseToTab[nextPhase]);
      }
    } catch (err) {
      console.error('Failed to advance offseason phase:', err);
    }
  };

  const handleStartNewSeason = async () => {
    const newSeason = currentSeason + 1;

    // 1. Execute season transition (age players, recalculate salaries, reset mojo, etc.)
    try {
      const result = await executeSeasonTransition(currentSeason);
      console.log(`[handleStartNewSeason] Season transition complete:`, result);
    } catch (err) {
      console.error('[handleStartNewSeason] Season transition failed:', err);
    }

    // 2. Update franchise metadata in IndexedDB
    if (franchiseId) {
      try {
        await updateFranchiseMetadata(franchiseId, { currentSeason: newSeason });
        console.log(`[handleStartNewSeason] Franchise metadata updated to Season ${newSeason}`);
      } catch (err) {
        console.error('[handleStartNewSeason] Failed to update franchise metadata:', err);
      }
    }

    // 3. Generate schedule for the new season
    if (franchiseId) {
      try {
        const gamesScheduled = await generateNewSeasonSchedule(franchiseId, newSeason);
        console.log(`[handleStartNewSeason] Generated ${gamesScheduled} games for Season ${newSeason}`);
      } catch (err) {
        console.error('[handleStartNewSeason] Failed to generate schedule:', err);
      }
    }

    // 4. Update React state and localStorage
    setCurrentSeason(newSeason);
    localStorage.setItem('kbl-current-season', String(newSeason));
    setSeasonPhase("regular");
    setActiveTab("todays-game");
  };

  // Sync league name from franchise config when loaded
  useEffect(() => {
    if (franchiseData.leagueName) {
      setLeagueName(franchiseData.leagueName);
    }
  }, [franchiseData.leagueName]);

  // All-Star voting state
  const [allStarLeague, setAllStarLeague] = useState<"Eastern" | "Western">("Eastern");

  // All-Star voting helpers — return empty until season stats engine populates data
  type AllStarPlayer = { name: string; team: string; pos: string; votes: number };
  const getTopPlayerByPosition = (_league: "Eastern" | "Western", _position: string): AllStarPlayer | undefined => undefined;
  const getBenchPlayers = (_league: "Eastern" | "Western"): AllStarPlayer[] => [];
  const getStartingPitchers = (_league: "Eastern" | "Western"): AllStarPlayer[] => [];
  const getReliefPitchers = (_league: "Eastern" | "Western"): AllStarPlayer[] => [];

  useEffect(() => {
    // Try to load the selected league from localStorage
    const storedLeague = localStorage.getItem("selectedLeague");
    if (storedLeague) {
      try {
        const league = JSON.parse(storedLeague);
        if (league.name) {
          setLeagueName(league.name);
        }
      } catch (e) {
        console.error("Error loading league:", e);
      }
    }
  }, []);

  // Reset to first tab when switching seasons
  useEffect(() => {
    if (seasonPhase === "regular") {
      setActiveTab("todays-game");
    } else {
      setActiveTab("news");
    }
  }, [seasonPhase]);

  const handleLogoClick = () => {
    navigate("/");
  };

  // Begin offseason: initialize offseason state in IndexedDB, then switch phase
  const handleBeginOffseason = async () => {
    try {
      const seasonId = `season-${currentSeason}`;
      await startOffseason(seasonId, currentSeason);
      setSeasonPhase("offseason");
      setActiveTab("awards");
    } catch (err) {
      console.error('Failed to start offseason:', err);
      // Still switch phase even if DB init fails — UI tabs work regardless
      setSeasonPhase("offseason");
      setActiveTab("awards");
    }
  };

  // Build SeasonEndFlow props from franchise + playoff data
  const seasonEndProps = useMemo(() => {
    // Flatten standings from { Eastern: { div: entry[] }, Western: { div: entry[] } } to TeamStanding[]
    const flatStandings: Array<{
      teamId: string; teamName: string; shortName: string;
      wins: number; losses: number; division: string;
      primaryColor: string;
    }> = [];

    const standings = franchiseData.standings;
    if (standings) {
      for (const [, conf] of Object.entries(standings)) {
        if (!conf || typeof conf !== 'object') continue;
        for (const [divName, entries] of Object.entries(conf as Record<string, unknown>)) {
          if (!Array.isArray(entries)) continue;
          entries.forEach((entry: { team?: string; wins?: number; losses?: number }) => {
            if (!entry || !entry.team) return;
            const teamName = entry.team;
            // Find teamId by name from teamNameMap (reverse lookup)
            const teamId = Object.entries(franchiseData.teamNameMap ?? {})
              .find(([, name]) => name === teamName)?.[0] || teamName;
            const colors = getTeamColors(teamId);
            flatStandings.push({
              teamId,
              teamName,
              shortName: teamName.slice(0, 3).toUpperCase(),
              wins: entry.wins ?? 0,
              losses: entry.losses ?? 0,
              division: divName,
              primaryColor: colors.primary || '#5A8352',
            });
          });
        }
      }
    }

    // Championship data from playoff bracket
    const championship = playoffData.bracketByLeague?.Championship ?? null;
    const championTeam = playoffData.playoff?.champion
      ? playoffData.playoff.teams.find(t => t.teamId === playoffData.playoff?.champion)
      : null;

    const championshipData = championship && championTeam ? {
      teamName: championTeam.teamName,
      opponentName: championship.winner === championship.higherSeed.teamId
        ? championship.lowerSeed.teamName
        : championship.higherSeed.teamName,
      seriesResult: `${championship.higherSeedWins}-${championship.lowerSeedWins}`,
      seasonNumber: currentSeason,
      rosterCount: 0,
      pitchers: [] as { name: string; position: string }[],
      positionPlayers: [] as { name: string; position: string }[],
    } : undefined;

    const totalPlayers = flatStandings.length * 22; // Approximate roster size

    return {
      seasonNumber: currentSeason,
      standings: flatStandings,
      hadPlayoffs: playoffData.playoff?.status === 'COMPLETED',
      championship: championshipData,
      mojoReset: {
        hotPlayers: 0,
        coldPlayers: 0,
        specialMojo: 0,
        normalPlayers: totalPlayers,
        totalPlayers,
      },
      archive: {
        seasonNumber: currentSeason,
        champion: championTeam?.teamName,
        championResult: championship
          ? `${championship.higherSeedWins}-${championship.lowerSeedWins}`
          : undefined,
        divisionWinners: [],
        playoffTeams: playoffData.playoff?.teams.length ?? 0,
        totalGames: scheduleData.games.length,
        totalPlayers,
      },
      mvpCandidates: undefined, // Playoff stats not yet tracked per player
    };
  }, [franchiseData.standings, franchiseData.teamNameMap, playoffData, currentSeason, scheduleData.games.length]);

  // Build PlayoffSeedingFlow teams from standings (sorted by win% descending)
  const playoffSeedingTeams = useMemo(() => {
    const teams: Array<{
      teamId: string; teamName: string; shortName: string;
      grade: string; record: { wins: number; losses: number };
      seed: number; primaryColor: string;
    }> = [];

    const standings = franchiseData.standings;
    if (standings) {
      for (const [, conf] of Object.entries(standings)) {
        if (!conf || typeof conf !== 'object') continue;
        for (const [, entries] of Object.entries(conf as Record<string, unknown>)) {
          if (!Array.isArray(entries)) continue;
          entries.forEach((entry: { team?: string; wins?: number; losses?: number }) => {
            if (!entry || !entry.team) return;
            const teamName = entry.team;
            const teamId = Object.entries(franchiseData.teamNameMap ?? {})
              .find(([, name]) => name === teamName)?.[0] || teamName;
            const colors = getTeamColors(teamId);
            teams.push({
              teamId,
              teamName,
              shortName: teamName.split(' ').pop()?.slice(0, 3).toUpperCase() || teamName.slice(0, 3).toUpperCase(),
              grade: '-', // Team grade not tracked in standings
              record: { wins: entry.wins ?? 0, losses: entry.losses ?? 0 },
              seed: 0, // Will be assigned by position
              primaryColor: colors.primary || '#5A8352',
            });
          });
        }
      }
    }

    // Sort by win% descending, assign seeds
    teams.sort((a, b) => {
      const aWinPct = a.record.wins + a.record.losses > 0 ? a.record.wins / (a.record.wins + a.record.losses) : 0;
      const bWinPct = b.record.wins + b.record.losses > 0 ? b.record.wins / (b.record.wins + b.record.losses) : 0;
      return bWinPct - aWinPct;
    });
    teams.forEach((t, i) => { t.seed = i + 1; });

    return teams;
  }, [franchiseData.standings, franchiseData.teamNameMap]);

  // Handle playoff seeding completion → create bracket with user's seed order
  const handleSeedingComplete = async (seededTeams: Array<{
    teamId: string; teamName: string; shortName: string;
    grade: string; record: { wins: number; losses: number };
    seed: number; primaryColor: string;
  }>) => {
    setShowPlayoffSeeding(false);
    try {
      // Transform PlayoffTeamSeed[] → PlayoffTeam[] for createNewPlayoff
      const half = Math.ceil(seededTeams.length / 2);
      const preSeededTeams: PlayoffTeam[] = seededTeams.map((t, i) => ({
        teamId: t.teamId,
        teamName: t.teamName,
        seed: t.seed,
        league: (i < half ? 'Eastern' : 'Western') as 'Eastern' | 'Western',
        regularSeasonRecord: { wins: t.record.wins, losses: t.record.losses },
        eliminated: false,
      }));

      await playoffData.createNewPlayoff({
        seasonNumber: currentSeason,
        seasonId: `season-${currentSeason}`,
        teamsQualifying: seededTeams.length,
        gamesPerRound: [5, 7, 7],
        preSeededTeams,
      });
    } catch (err) {
      console.error('Failed to create playoff from seeding:', err);
    }
  };

  // Schedule System Functions — team list derived from franchise league structure
  const availableTeams = useMemo(() => Object.keys(franchiseData.teamNameMap ?? {}), [franchiseData.teamNameMap]);

  // Schedule helper functions - now use scheduleData from hook
  const getNextGameNumber = (): number => {
    if (scheduleData.games.length === 0) return 1;
    const maxGameNumber = Math.max(...scheduleData.games.map(g => g.gameNumber));
    return maxGameNumber + 1;
  };

  const getNextDayNumber = (): number => {
    if (scheduleData.games.length === 0) return 1;
    const maxDayNumber = Math.max(...scheduleData.games.map(g => g.dayNumber));
    return maxDayNumber + 1;
  };

  const getNextDate = (): string => {
    if (scheduleData.games.length === 0) {
      // Start with today's date
      const today = new Date();
      return today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }

    // Find the most recent game with a date
    const gamesWithDates = scheduleData.games
      .filter(g => g.date)
      .sort((a, b) => b.gameNumber - a.gameNumber);

    if (gamesWithDates.length === 0) {
      const today = new Date();
      return today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }

    // Parse the last date and add one day
    const lastGame = gamesWithDates[0];
    const lastDate = lastGame.date || '';

    // Try to parse "Month Day" format (e.g., "July 12")
    try {
      const currentYear = new Date().getFullYear();
      const parsedDate = new Date(`${lastDate}, ${currentYear}`);

      if (!isNaN(parsedDate.getTime())) {
        parsedDate.setDate(parsedDate.getDate() + 1);
        return parsedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      }
    } catch (e) {
      // If parsing fails, just use today
    }

    const today = new Date();
    return today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const getFilteredSchedule = (filter: string): ScheduledGame[] => {
    if (filter === "FULL LEAGUE") {
      return [...scheduleData.games].sort((a, b) => a.gameNumber - b.gameNumber);
    }

    return scheduleData.games
      .filter(g => g.awayTeamId === filter || g.homeTeamId === filter)
      .sort((a, b) => a.gameNumber - b.gameNumber);
  };

  // Add game - persisted to IndexedDB via useScheduleData hook
  const handleAddGame = async (gameData: GameFormData) => {
    try {
      await scheduleData.addGame({
        gameNumber: gameData.gameNumber,
        dayNumber: gameData.dayNumber,
        date: gameData.date,
        time: gameData.time,
        awayTeamId: gameData.awayTeamId,
        homeTeamId: gameData.homeTeamId,
      });
    } catch (err) {
      console.error('[FranchiseHome] Failed to add game:', err);
    }
  };

  // Add series - persisted to IndexedDB via useScheduleData hook
  const handleAddSeries = async (gameData: GameFormData, count: number) => {
    try {
      await scheduleData.addSeries({
        date: gameData.date,
        time: gameData.time,
        awayTeamId: gameData.awayTeamId,
        homeTeamId: gameData.homeTeamId,
      }, count);
    } catch (err) {
      console.error('[FranchiseHome] Failed to add series:', err);
    }
  };

  // Lookup team record from standings (handles nested LeagueStandings shape)
  // MAJ-15: Moved before playoff handler so it's in scope for all navigate() calls
  const getTeamRecord = (teamId: string): string => {
    const standings = franchiseData.standings;
    if (!standings || typeof standings !== 'object') return '0-0';
    try {
      for (const conference of Object.values(standings)) {
        if (!conference || typeof conference !== 'object') continue;
        for (const division of Object.values(conference as Record<string, unknown>)) {
          if (!Array.isArray(division)) continue;
          const entry = division.find(
            (s: { team?: string; wins?: number; losses?: number }) =>
              s.team && s.team.toLowerCase() === teamId.toLowerCase()
          );
          if (entry) return `${entry.wins}-${entry.losses}`;
        }
      }
    } catch {
      // Standings shape doesn't match expected — return default
    }
    return '0-0';
  };

  // Launch a playoff game in the GameTracker
  const handlePlayPlayoffGame = async (series: ReturnType<typeof playoffData.getSeriesForTeam> & {}) => {
    if (!series || series.status !== 'IN_PROGRESS') return;

    // Determine next game number (count completed games + 1)
    const completedGames = series.games.filter(g => g.status === 'COMPLETED').length;
    const nextGameNumber = completedGames + 1;

    // Determine home/away using playoff engine
    const homeTeamId = getHomeFieldPattern(
      nextGameNumber,
      series.bestOf,
      series.higherSeed.teamId,
      series.lowerSeed.teamId
    );
    const isHigherSeedHome = homeTeamId === series.higherSeed.teamId;

    const awayTeamId = isHigherSeedHome ? series.lowerSeed.teamId : series.higherSeed.teamId;
    const awayTeamName = isHigherSeedHome ? series.lowerSeed.teamName : series.higherSeed.teamName;
    const homeTeamName = isHigherSeedHome ? series.higherSeed.teamName : series.lowerSeed.teamName;

    // T0-08: Load real rosters from IndexedDB for both teams
    const [awayRoster, homeRoster] = await Promise.all([
      buildGameTrackerRoster(awayTeamId),
      buildGameTrackerRoster(homeTeamId),
    ]);

    navigate(`/game-tracker/playoff-${series.id}-g${nextGameNumber}`, {
      state: {
        gameMode: 'playoff' as const,
        playoffSeriesId: series.id,
        playoffGameNumber: nextGameNumber,
        awayTeamId,
        homeTeamId,
        awayTeamName: awayTeamName.toUpperCase(),
        homeTeamName: homeTeamName.toUpperCase(),
        awayPlayers: awayRoster.players.length > 0 ? awayRoster.players : undefined,
        awayPitchers: awayRoster.pitchers.length > 0 ? awayRoster.pitchers : undefined,
        homePlayers: homeRoster.players.length > 0 ? homeRoster.players : undefined,
        homePitchers: homeRoster.pitchers.length > 0 ? homeRoster.pitchers : undefined,
        awayRecord: getTeamRecord(awayTeamId), // MAJ-15: Pass actual team records to GameTracker
        homeRecord: getTeamRecord(homeTeamId), // MAJ-15: Pass actual team records to GameTracker
        franchiseId,
        leagueId: 'sml',
        // T0-05: Pass season number for playoff persistence
        seasonNumber: currentSeason,
        // T0-01: Pass total innings for auto game-end detection
        totalInnings: franchiseData?.franchiseConfig?.season?.inningsPerGame ?? 9,
      },
    });
  };

  // --- Playoff SIM state ---
  const [isPlayoffSimulating, setIsPlayoffSimulating] = useState(false);
  const [playoffSimPlayByPlay, setPlayoffSimPlayByPlay] = useState<PlayByPlayEntry[]>([]);
  const [playoffSimResult, setPlayoffSimResult] = useState<{ away: number; home: number } | null>(null);
  const [playoffSimAwayName, setPlayoffSimAwayName] = useState('');
  const [playoffSimHomeName, setPlayoffSimHomeName] = useState('');

  const handleSimPlayoffGame = async (series: ReturnType<typeof playoffData.getSeriesForTeam> & {}) => {
    if (!series || series.status !== 'IN_PROGRESS') return;

    const completedGames = series.games.filter(g => g.status === 'COMPLETED').length;
    const nextGameNumber = completedGames + 1;

    // Determine home/away using playoff engine (same as handlePlayPlayoffGame)
    const homeTeamId = getHomeFieldPattern(
      nextGameNumber,
      series.bestOf,
      series.higherSeed.teamId,
      series.lowerSeed.teamId
    );
    const isHigherSeedHome = homeTeamId === series.higherSeed.teamId;
    const awayTeamId = isHigherSeedHome ? series.lowerSeed.teamId : series.higherSeed.teamId;
    const awayTeamName = isHigherSeedHome ? series.lowerSeed.teamName : series.higherSeed.teamName;
    const homeTeamName = isHigherSeedHome ? series.higherSeed.teamName : series.lowerSeed.teamName;

    // Build rosters from real franchise player data (same as regular season SIM)
    const awayRoster = await buildRosterFromPlayers(awayTeamId, awayTeamName.toUpperCase());
    const homeRoster = await buildRosterFromPlayers(homeTeamId, homeTeamName.toUpperCase());

    // Generate synthetic game
    const game = generateSyntheticGame(awayRoster, homeRoster, {
      seed: Date.now(),
      gameNumber: nextGameNumber,
    });

    // Generate play-by-play for overlay animation
    const playByPlay = generatePlayByPlay(game);

    // Show overlay
    setPlayoffSimPlayByPlay(playByPlay);
    setPlayoffSimResult({ away: game.awayScore, home: game.homeScore });
    setPlayoffSimAwayName(game.awayTeamName);
    setPlayoffSimHomeName(game.homeTeamName);
    setIsPlayoffSimulating(true);

    // Record result to playoffStorage (same path as played games)
    try {
      const winnerId = game.homeScore > game.awayScore ? homeTeamId : awayTeamId;
      await playoffData.recordGameResult(series.id, {
        gameNumber: nextGameNumber,
        homeTeamId,
        awayTeamId,
        status: 'COMPLETED',
        result: {
          homeScore: game.homeScore,
          awayScore: game.awayScore,
          winnerId,
          innings: 9,
        },
        gameLogId: game.gameId,
        playedAt: Date.now(),
      });
    } catch (err) {
      console.error('[handleSimPlayoffGame] recordGameResult failed:', err);
    }
  };

  const handlePlayoffSimComplete = async () => {
    setIsPlayoffSimulating(false);
    setPlayoffSimPlayByPlay([]);
    setPlayoffSimResult(null);
    setPlayoffSimAwayName('');
    setPlayoffSimHomeName('');
    await playoffData.refresh();
  };

  const regularSeasonTabs = [
    { id: "news", label: "THE TOOTWHISTLE TIMES", icon: <Newspaper className="w-4 h-4" /> },
    { id: "todays-game", label: "Today's Game", icon: <Calendar className="w-4 h-4" /> },
    { id: "schedule", label: "SCHEDULE", icon: <Calendar className="w-4 h-4" /> },
    { id: "standings", label: "STANDINGS", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "team", label: "TEAM HUB", icon: <Users className="w-4 h-4" /> },
    { id: "leaders", label: "LEAGUE LEADERS", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "rosters", label: "TRADES", icon: <Folder className="w-4 h-4" /> },
    { id: "allstar", label: "ALL-STAR", icon: <Star className="w-4 h-4" /> },
    { id: "museum", label: "MUSEUM", icon: <Trophy className="w-4 h-4" /> },
  ];

  const playoffTabs = [
    { id: "news", label: "THE TOOTWHISTLE TIMES", icon: <Newspaper className="w-4 h-4" /> },
    { id: "bracket", label: "BRACKET", icon: <Trophy className="w-4 h-4" /> },
    { id: "series", label: "SERIES RESULTS", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "playoff-stats", label: "PLAYOFF STATS", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "playoff-leaders", label: "PLAYOFF LEADERS", icon: <Star className="w-4 h-4" /> },
    { id: "team", label: "TEAM HUB", icon: <Users className="w-4 h-4" /> },
    { id: "advance", label: "ADVANCE TO OFFSEASON", icon: <ArrowRight className="w-4 h-4" /> },
    { id: "museum", label: "MUSEUM", icon: <Trophy className="w-4 h-4" /> },
  ];

  // Offseason tabs: phases 1-11 in state machine order, then utility tabs (finalize, museum)
  const offseasonTabs = [
    // Phase 1: STANDINGS_FINAL
    { id: "news", label: "THE TOOTWHISTLE TIMES", icon: <Newspaper className="w-4 h-4" /> },
    // Phase 2: AWARDS
    { id: "awards", label: "AWARDS", icon: <Award className="w-4 h-4" /> },
    // Phase 3: RATINGS_ADJUSTMENTS
    { id: "ratings-adj", label: "RATINGS ADJ", icon: <TrendingDown className="w-4 h-4" /> },
    // Phase 4: CONTRACTION_EXPANSION
    { id: "contraction", label: "CONTRACT/EXPAND", icon: <Shuffle className="w-4 h-4" /> },
    // Phase 5: RETIREMENTS
    { id: "retirements", label: "RETIREMENTS", icon: <UserMinus className="w-4 h-4" /> },
    // Phase 6: FREE_AGENCY
    { id: "free-agency", label: "FREE AGENCY", icon: <DollarSign className="w-4 h-4" /> },
    // Phase 7: DRAFT
    { id: "draft", label: "DRAFT", icon: <ClipboardList className="w-4 h-4" /> },
    // Phase 8: FARM_RECONCILIATION
    { id: "farm-reconciliation", label: "FARM SYSTEM", icon: <GitMerge className="w-4 h-4" /> },
    // Phase 9: CHEMISTRY_REBALANCING
    { id: "chemistry", label: "CHEMISTRY", icon: <FlaskConical className="w-4 h-4" /> },
    // Phase 10: TRADES
    { id: "rosters", label: "TRADES", icon: <Folder className="w-4 h-4" /> },
    // Phase 11: SPRING_TRAINING
    { id: "spring-training", label: "SPRING TRAINING", icon: <Sunrise className="w-4 h-4" /> },
    // Utility tabs (not offseason phases)
    { id: "finalize", label: "FINALIZE & ADVANCE", icon: <CheckCircle className="w-4 h-4" /> },
    { id: "museum", label: "MUSEUM", icon: <Trophy className="w-4 h-4" /> },
  ];

  const currentTabs = seasonPhase === "regular" ? regularSeasonTabs : seasonPhase === "playoffs" ? playoffTabs : offseasonTabs;

  // Schedule data is now loaded from IndexedDB via useScheduleData hook
  // No mock initialization needed - schedule starts empty per Figma spec

  return (
    <FranchiseDataContext.Provider value={franchiseData}>
    <div className="min-h-screen bg-[#567A50] text-white">
      {/* Header with logo */}
      <div className="bg-[#6B9462] border-b-[6px] border-[#4A6844] px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between bg-[#5A8352] px-6 py-4">
          <button
            onClick={handleLogoClick}
            className="hover:scale-105 transition-transform active:scale-95"
          >
            <div className="bg-white border-2 border-[#0066FF] px-2 py-1 shadow-[3px_3px_0px_0px_#DD0000]">
              <div className="text-[8px] text-[#DD0000] leading-tight tracking-wide">SUPER</div>
              <div className="text-[8px] text-[#DD0000] leading-tight tracking-wide">MEGA</div>
              <div className="text-[9px] text-[#0066FF] leading-tight tracking-wide">BASEBALL</div>
            </div>
          </button>

          {/* League name - centered */}
          <div className="text-center">
            <div className="text-[16px] text-[#E8E8D8]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{leagueName}</div>
            <div className="text-[8px] text-[#E8E8D8]/70">
              SEASON {currentSeason} • WEEK {franchiseData.currentWeek}
              {franchiseData.hasRealData && <span className="ml-2 text-[#C4A853]">●</span>}
            </div>
          </div>

          <button
            onClick={handleLogoClick}
            className="p-2 hover:bg-[#4A6844] border-2 border-[#4A6844] active:scale-95 transition"
          >
            <Home className="w-5 h-5 text-[#E8E8D8]" />
          </button>
        </div>
      </div>

      {/* Season phase toggle */}
      <div className="bg-[#6B9462] border-b-4 border-[#4A6844]">
        <div className="max-w-7xl mx-auto flex">
          <button
            onClick={() => setSeasonPhase("regular")}
            className={`flex-1 py-2 text-sm border-r-4 border-[#4A6844] transition ${
              seasonPhase === "regular"
                ? "bg-[#4A6844] text-[#E8E8D8]"
                : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
            }`}
          >
            REGULAR SEASON
          </button>
          <button
            onClick={() => setSeasonPhase("playoffs")}
            className={`flex-1 py-2 text-sm border-r-4 border-[#4A6844] transition ${
              seasonPhase === "playoffs"
                ? "bg-[#4A6844] text-[#E8E8D8]"
                : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
            }`}
          >
            PLAYOFFS
          </button>
          <button
            onClick={() => setSeasonPhase("offseason")}
            className={`flex-1 py-2 text-sm transition ${
              seasonPhase === "offseason"
                ? "bg-[#4A6844] text-[#E8E8D8]"
                : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
            }`}
          >
            OFFSEASON
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="bg-[#6B9462] overflow-x-auto border-b-4 border-[#4A6844]">
        <div className={`max-w-7xl mx-auto flex ${seasonPhase === "regular" ? "gap-0" : "gap-0"}`}>
          {currentTabs.map((tab, index) => {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex-1 px-2 py-2 text-[8px] whitespace-nowrap transition border-r-2 border-[#4A6844] ${
                  activeTab === tab.id
                    ? "bg-[#4A6844] text-[#E8E8D8]"
                    : "text-[#E8E8D8]/60 hover:bg-[#5A8352]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-7xl mx-auto p-4 bg-[#567A50]">
        {/* Offseason Phase Progress Banner */}
        {seasonPhase === "offseason" && offseasonState.state && (
          <div className="mb-4 bg-[#6B9462] border-[5px] border-[#C4A853] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[14px] text-[#C4A853] font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                  OFFSEASON — PHASE {offseasonState.currentPhaseIndex + 1} OF {offseasonState.totalPhases}
                </div>
                <div className="text-[11px] text-[#E8E8D8] mt-1">
                  {offseasonState.phaseName}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {offseasonState.isOffseasonComplete ? (
                  <button
                    onClick={handleStartNewSeason}
                    className="bg-[#C4A853] text-black px-6 py-3 text-sm font-bold hover:bg-[#D4B863] active:scale-95 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)]"
                  >
                    START SEASON {currentSeason + 1}
                  </button>
                ) : (
                  <button
                    onClick={handleAdvancePhase}
                    disabled={offseasonState.isLoading}
                    className="bg-[#5A8352] border-[3px] border-[#4A6844] px-5 py-2 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {offseasonState.isLoading ? "ADVANCING..." : offseasonState.canAdvance ? "ADVANCE TO NEXT PHASE" : "COMPLETE PHASE & ADVANCE"}
                  </button>
                )}
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-[#4A6844] h-2 border border-[#3A5834]">
              <div
                className="bg-[#C4A853] h-full transition-all duration-500"
                style={{ width: `${offseasonState.progress}%` }}
              />
            </div>
            {/* Phase dots */}
            <div className="flex justify-between mt-2 px-1">
              {OFFSEASON_PHASES.map((phase, i) => {
                const isComplete = offseasonState.isPhaseComplete(phase);
                const isCurrent = offseasonState.currentPhase === phase;
                return (
                  <button
                    key={phase}
                    onClick={() => {
                      const tabForPhase = phaseToTab[phase];
                      if (tabForPhase) setActiveTab(tabForPhase);
                    }}
                    className={`w-5 h-5 rounded-full border-2 text-[7px] flex items-center justify-center transition-all ${
                      isComplete
                        ? "bg-[#C4A853] border-[#C4A853] text-black"
                        : isCurrent
                        ? "bg-[#5A8352] border-[#C4A853] text-[#E8E8D8] animate-pulse"
                        : "bg-[#4A6844] border-[#4A6844] text-[#E8E8D8]/40"
                    }`}
                    title={offseasonState.getPhaseDisplayName(phase)}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "todays-game" && (
          <GameDayContent
            scheduleData={scheduleData}
            currentSeason={currentSeason}
            onDataRefresh={() => franchiseData.refresh()}
          />
        )}
        {activeTab === "team" && (
          <TeamHubContent />
        )}
        {activeTab === "schedule" && (
          <ScheduleContent
            games={getFilteredSchedule(selectedScheduleTeam)}
            selectedTeam={selectedScheduleTeam}
            onTeamChange={setSelectedScheduleTeam}
            availableTeams={availableTeams}
            onAddGame={() => setAddGameModalOpen(true)}
            dropdownOpen={scheduleDropdownOpen}
            setDropdownOpen={setScheduleDropdownOpen}
            stadiumMap={franchiseData.stadiumMap}
            seasonNumber={currentSeason}
            teamNameMap={franchiseData.teamNameMap}
          />
        )}
        {activeTab === "news" && (
          <BeatReporterNews />
        )}
        {activeTab === "standings" && (
          <StandingsContent />
        )}
        {activeTab === "leaders" && (
          <LeagueLeadersContent />
        )}
        {activeTab === "rosters" && (
          <TradeFlow seasonId={`season-${currentSeason}`} />
        )}
        {activeTab === "allstar" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-6">
            {/* League Toggle */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setAllStarLeague("Eastern")}
                className={`flex-1 py-3 px-4 border-[4px] border-[#4A6844] transition ${
                  allStarLeague === "Eastern" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[11px] font-bold">EASTERN LEAGUE</div>
              </button>
              <button
                onClick={() => setAllStarLeague("Western")}
                className={`flex-1 py-3 px-4 border-[4px] border-[#4A6844] transition ${
                  allStarLeague === "Western" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[11px] font-bold">WESTERN LEAGUE</div>
              </button>
            </div>

            {/* Baseball Field Layout - Outfield */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Left Field */}
              <div className="col-span-1">
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="text-[9px] text-[#E8E8D8] font-bold mb-2 text-center">LF</div>
                  {getTopPlayerByPosition(allStarLeague, "LF") && (
                    <div className="bg-[#4A6844] border-[3px] border-[#C4A853] p-2">
                      <div className="text-[9px] text-[#E8E8D8] font-bold">{getTopPlayerByPosition(allStarLeague, "LF")?.name}</div>
                      <div className="text-[7px] text-[#E8E8D8]/70">{getTopPlayerByPosition(allStarLeague, "LF")?.team}</div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold mt-1">
                        <Star className="w-3 h-3 inline mr-1 text-[#C4A853]" />
                        {getTopPlayerByPosition(allStarLeague, "LF")?.votes.toLocaleString()} votes
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Center Field */}
              <div className="col-span-1">
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="text-[9px] text-[#E8E8D8] font-bold mb-2 text-center">CF</div>
                  {getTopPlayerByPosition(allStarLeague, "CF") && (
                    <div className="bg-[#4A6844] border-[3px] border-[#C4A853] p-2">
                      <div className="text-[9px] text-[#E8E8D8] font-bold">{getTopPlayerByPosition(allStarLeague, "CF")?.name}</div>
                      <div className="text-[7px] text-[#E8E8D8]/70">{getTopPlayerByPosition(allStarLeague, "CF")?.team}</div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold mt-1">
                        <Star className="w-3 h-3 inline mr-1 text-[#C4A853]" />
                        {getTopPlayerByPosition(allStarLeague, "CF")?.votes.toLocaleString()} votes
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Field */}
              <div className="col-span-1">
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="text-[9px] text-[#E8E8D8] font-bold mb-2 text-center">RF</div>
                  {getTopPlayerByPosition(allStarLeague, "RF") && (
                    <div className="bg-[#4A6844] border-[3px] border-[#C4A853] p-2">
                      <div className="text-[9px] text-[#E8E8D8] font-bold">{getTopPlayerByPosition(allStarLeague, "RF")?.name}</div>
                      <div className="text-[7px] text-[#E8E8D8]/70">{getTopPlayerByPosition(allStarLeague, "RF")?.team}</div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold mt-1">
                        <Star className="w-3 h-3 inline mr-1 text-[#C4A853]" />
                        {getTopPlayerByPosition(allStarLeague, "RF")?.votes.toLocaleString()} votes
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Infield */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {/* Third Base */}
              <div className="col-span-1">
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="text-[9px] text-[#E8E8D8] font-bold mb-2 text-center">3B</div>
                  {getTopPlayerByPosition(allStarLeague, "3B") && (
                    <div className="bg-[#4A6844] border-[3px] border-[#C4A853] p-2">
                      <div className="text-[9px] text-[#E8E8D8] font-bold">{getTopPlayerByPosition(allStarLeague, "3B")?.name}</div>
                      <div className="text-[7px] text-[#E8E8D8]/70">{getTopPlayerByPosition(allStarLeague, "3B")?.team}</div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold mt-1">
                        <Star className="w-3 h-3 inline mr-1 text-[#C4A853]" />
                        {getTopPlayerByPosition(allStarLeague, "3B")?.votes.toLocaleString()} votes
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Shortstop */}
              <div className="col-span-1">
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="text-[9px] text-[#E8E8D8] font-bold mb-2 text-center">SS</div>
                  {getTopPlayerByPosition(allStarLeague, "SS") && (
                    <div className="bg-[#4A6844] border-[3px] border-[#C4A853] p-2">
                      <div className="text-[9px] text-[#E8E8D8] font-bold">{getTopPlayerByPosition(allStarLeague, "SS")?.name}</div>
                      <div className="text-[7px] text-[#E8E8D8]/70">{getTopPlayerByPosition(allStarLeague, "SS")?.team}</div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold mt-1">
                        <Star className="w-3 h-3 inline mr-1 text-[#C4A853]" />
                        {getTopPlayerByPosition(allStarLeague, "SS")?.votes.toLocaleString()} votes
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Second Base */}
              <div className="col-span-1">
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="text-[9px] text-[#E8E8D8] font-bold mb-2 text-center">2B</div>
                  {getTopPlayerByPosition(allStarLeague, "2B") && (
                    <div className="bg-[#4A6844] border-[3px] border-[#C4A853] p-2">
                      <div className="text-[9px] text-[#E8E8D8] font-bold">{getTopPlayerByPosition(allStarLeague, "2B")?.name}</div>
                      <div className="text-[7px] text-[#E8E8D8]/70">{getTopPlayerByPosition(allStarLeague, "2B")?.team}</div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold mt-1">
                        <Star className="w-3 h-3 inline mr-1 text-[#C4A853]" />
                        {getTopPlayerByPosition(allStarLeague, "2B")?.votes.toLocaleString()} votes
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* First Base */}
              <div className="col-span-1">
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="text-[9px] text-[#E8E8D8] font-bold mb-2 text-center">1B</div>
                  {getTopPlayerByPosition(allStarLeague, "1B") && (
                    <div className="bg-[#4A6844] border-[3px] border-[#C4A853] p-2">
                      <div className="text-[9px] text-[#E8E8D8] font-bold">{getTopPlayerByPosition(allStarLeague, "1B")?.name}</div>
                      <div className="text-[7px] text-[#E8E8D8]/70">{getTopPlayerByPosition(allStarLeague, "1B")?.team}</div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold mt-1">
                        <Star className="w-3 h-3 inline mr-1 text-[#C4A853]" />
                        {getTopPlayerByPosition(allStarLeague, "1B")?.votes.toLocaleString()} votes
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Catcher */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="col-start-2">
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="text-[9px] text-[#E8E8D8] font-bold mb-2 text-center">C</div>
                  {getTopPlayerByPosition(allStarLeague, "C") && (
                    <div className="bg-[#4A6844] border-[3px] border-[#C4A853] p-2">
                      <div className="text-[9px] text-[#E8E8D8] font-bold">{getTopPlayerByPosition(allStarLeague, "C")?.name}</div>
                      <div className="text-[7px] text-[#E8E8D8]/70">{getTopPlayerByPosition(allStarLeague, "C")?.team}</div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold mt-1">
                        <Star className="w-3 h-3 inline mr-1 text-[#C4A853]" />
                        {getTopPlayerByPosition(allStarLeague, "C")?.votes.toLocaleString()} votes
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bench Players */}
            <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-4 mb-6">
              <div className="text-[10px] text-[#E8E8D8] font-bold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                BENCH (POSITION PLAYERS)
              </div>
              <div className="grid grid-cols-5 gap-3">
                {getBenchPlayers(allStarLeague).map((player, idx) => (
                  <div key={idx} className="bg-[#4A6844] border-[3px] border-[#E8E8D8]/30 p-2">
                    <div className="text-[8px] text-[#E8E8D8] font-bold">{player.name}</div>
                    <div className="text-[7px] text-[#E8E8D8]/70">{player.pos} • {player.team}</div>
                    <div className="text-[7px] text-[#E8E8D8] font-bold mt-1">
                      {player.votes.toLocaleString()} votes
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pitchers Section */}
            <div className="grid grid-cols-2 gap-4">
              {/* Starting Pitchers */}
              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-4">
                <div className="text-[10px] text-[#E8E8D8] font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  STARTING PITCHERS
                </div>
                <div className="space-y-2">
                  {getStartingPitchers(allStarLeague).map((player, idx) => (
                    <div key={idx} className={`bg-[#4A6844] border-[3px] p-2 ${idx === 0 ? 'border-[#C4A853]' : 'border-[#E8E8D8]/30'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className={`text-[8px] font-bold ${idx === 0 ? 'text-[#C4A853]' : 'text-[#E8E8D8]'}`}>
                            {idx === 0 && <Star className="w-3 h-3 inline mr-1" />}
                            {player.name}
                          </div>
                          <div className="text-[7px] text-[#E8E8D8]/70">{player.team}</div>
                        </div>
                        <div className="text-[7px] text-[#E8E8D8] font-bold">
                          {player.votes.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Relief Pitchers */}
              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-4">
                <div className="text-[10px] text-[#E8E8D8] font-bold mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  RELIEF PITCHERS
                </div>
                <div className="space-y-2">
                  {getReliefPitchers(allStarLeague).map((player, idx) => (
                    <div key={idx} className={`bg-[#4A6844] border-[3px] p-2 ${idx === 0 ? 'border-[#C4A853]' : 'border-[#E8E8D8]/30'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className={`text-[8px] font-bold ${idx === 0 ? 'text-[#C4A853]' : 'text-[#E8E8D8]'}`}>
                            {idx === 0 && <Star className="w-3 h-3 inline mr-1" />}
                            {player.name}
                          </div>
                          <div className="text-[7px] text-[#E8E8D8]/70">{player.team}</div>
                        </div>
                        <div className="text-[7px] text-[#E8E8D8] font-bold">
                          {player.votes.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "museum" && (
          <MuseumContent retiredJerseys={retiredJerseys} />
        )}
        
        {/* Playoff Tabs Content */}
        {activeTab === "bracket" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl text-[#E8E8D8] font-bold mb-2">PLAYOFF BRACKET</h2>
              <div className="text-sm text-[#E8E8D8]/70">
                {playoffData.playoff ? `Season ${playoffData.playoff.seasonNumber} Postseason` : `Season ${currentSeason} Postseason`}
              </div>
              {playoffData.playoff?.status === 'COMPLETED' && playoffData.playoff.champion && (() => {
                const champ = playoffData.playoff!;
                const championTeam = champ.teams.find(t => t.teamId === champ.champion);
                const champSeries = playoffData.bracketByLeague.Championship;
                const loserName = champSeries
                  ? (champSeries.winner === champSeries.higherSeed.teamId
                    ? champSeries.lowerSeed.teamName
                    : champSeries.higherSeed.teamName)
                  : null;
                const seriesScore = champSeries
                  ? `${Math.max(champSeries.higherSeedWins, champSeries.lowerSeedWins)}-${Math.min(champSeries.higherSeedWins, champSeries.lowerSeedWins)}`
                  : null;

                return (
                  <div className="mt-6 space-y-4">
                    {/* Champion Banner */}
                    <div className="bg-gradient-to-b from-[#4A6844] via-[#FFD700]/10 to-[#4A6844] border-[4px] border-[#FFD700] p-8">
                      <div className="text-3xl text-[#FFD700] font-bold animate-pulse mb-2">
                        🏆 CHAMPION 🏆
                      </div>
                      <div className="text-2xl text-[#FFD700] mb-1" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                        {championTeam?.teamName.toUpperCase() ?? 'CHAMPION'}
                      </div>
                      <div className="text-sm text-[#E8E8D8]/80 mb-1">
                        Season {champ.seasonNumber} World Series Champions
                      </div>
                      {loserName && seriesScore && (
                        <div className="text-xs text-[#E8E8D8]/60">
                          Won World Series {seriesScore} vs {loserName}
                        </div>
                      )}
                      {championTeam?.regularSeasonRecord && (
                        <div className="text-[10px] text-[#E8E8D8]/40 mt-1">
                          Regular Season: {championTeam.regularSeasonRecord.wins}-{championTeam.regularSeasonRecord.losses}
                        </div>
                      )}
                    </div>

                    {/* Playoff MVP */}
                    {champ.mvp && (
                      <div className="bg-[#5A8352] border-[3px] border-[#FFD700] p-4">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Trophy className="w-5 h-5 text-[#FFD700]" />
                          <div className="text-sm text-[#FFD700] font-bold">PLAYOFF MVP</div>
                        </div>
                        <div className="text-lg text-[#E8E8D8] font-bold">{champ.mvp.playerName}</div>
                        <div className="text-xs text-[#E8E8D8]/70 mt-1">
                          {champ.teams.find(t => t.teamId === champ.mvp?.teamId)?.teamName ?? champ.mvp.teamId}
                        </div>
                        {champ.mvp.stats && (
                          <div className="text-[10px] text-[#C4A853] mt-1">{champ.mvp.stats}</div>
                        )}
                      </div>
                    )}

                    {/* Playoff Series Summary */}
                    <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4">
                      <div className="text-xs text-[#C4A853] mb-3 uppercase">Playoff Path</div>
                      <div className="space-y-2">
                        {playoffData.completedSeries
                          .filter(s => s.winner === champ.champion)
                          .map(s => {
                            const opponent = s.winner === s.higherSeed.teamId ? s.lowerSeed : s.higherSeed;
                            const winnerWins = s.winner === s.higherSeed.teamId ? s.higherSeedWins : s.lowerSeedWins;
                            const loserWins = s.winner === s.higherSeed.teamId ? s.lowerSeedWins : s.higherSeedWins;
                            return (
                              <div key={s.id} className="flex justify-between items-center text-[10px] text-[#E8E8D8] bg-[#4A6844] p-2">
                                <span className="text-[#E8E8D8]/60 w-24">{s.roundName}</span>
                                <span>vs {opponent.teamName}</span>
                                <span className="text-[#00DD00] font-bold">{winnerWins}-{loserWins}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* BEGIN OFFSEASON Button */}
                    <button
                      onClick={handleBeginOffseason}
                      className="w-full bg-[#C4A853] border-[5px] border-[#9A7B2C] py-4 px-8 text-lg text-[#1a1a1a] hover:bg-[#D4B863] active:scale-[0.98] transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-center gap-3"
                      style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.3)' }}
                    >
                      <span>BEGIN OFFSEASON</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                );
              })()}
            </div>

            {!playoffData.playoff ? (
              // No playoff exists - show create option
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-[#E8E8D8]/30 mx-auto mb-4" />
                <div className="text-lg text-[#E8E8D8] mb-2">No Playoffs Configured</div>
                <div className="text-sm text-[#E8E8D8]/70 mb-6">
                  Create a playoff bracket based on current standings
                </div>
                <button
                  onClick={() => setShowPlayoffSeeding(true)}
                  className="bg-[#5599FF] border-[3px] border-[#3366FF] px-6 py-3 text-sm text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform"
                >
                  CREATE PLAYOFF BRACKET
                </button>

                {showPlayoffSeeding && (
                  <PlayoffSeedingFlow
                    teams={playoffSeedingTeams}
                    teamsQualifying={Math.min(8, playoffSeedingTeams.length)}
                    onComplete={handleSeedingComplete}
                    onCancel={() => setShowPlayoffSeeding(false)}
                  />
                )}
              </div>
            ) : (
              // Playoff exists - show bracket
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Eastern Conference */}
                  <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                    <div className="text-lg text-[#E8E8D8] font-bold mb-4 text-center border-b-2 border-[#4A6844] pb-2">
                      EASTERN CONFERENCE
                    </div>
                    <div className="space-y-4">
                      {playoffData.bracketByLeague.Eastern.length > 0 ? (
                        playoffData.bracketByLeague.Eastern.map((s) => {
                          const higherStatus = s.status === 'IN_PROGRESS' ? detectClinch(s.higherSeedWins, s.lowerSeedWins, s.bestOf) : null;
                          const lowerStatus = s.status === 'IN_PROGRESS' ? detectClinch(s.lowerSeedWins, s.higherSeedWins, s.bestOf) : null;
                          const isExpanded = expandedSeriesId === s.id;
                          return (
                          <div key={s.id}>
                            <div className="text-xs text-[#E8E8D8]/60 mb-2">{s.roundName.toUpperCase()}</div>
                            <div
                              className={`bg-[#4A6844] p-3 border-2 cursor-pointer transition-all ${
                                s.status === 'COMPLETED' ? 'border-[#00DD00]' :
                                s.status === 'IN_PROGRESS' ? 'border-[#5599FF]' :
                                'border-[#E8E8D8]/30'
                              }`}
                              onClick={() => setExpandedSeriesId(isExpanded ? null : s.id)}
                            >
                              {/* Clinch/Elimination badges */}
                              {higherStatus?.isClinchGame && (
                                <div className="text-[8px] text-[#FFD700] text-center mb-1">⭐ {s.higherSeed.teamName} can clinch</div>
                              )}
                              {lowerStatus?.isEliminationGame && (
                                <div className="text-[8px] text-[#DC3545] text-center mb-1">⚠️ {s.lowerSeed.teamName} facing elimination</div>
                              )}
                              {lowerStatus?.isClinchGame && (
                                <div className="text-[8px] text-[#FFD700] text-center mb-1">⭐ {s.lowerSeed.teamName} can clinch</div>
                              )}
                              {higherStatus?.isEliminationGame && (
                                <div className="text-[8px] text-[#DC3545] text-center mb-1">⚠️ {s.higherSeed.teamName} facing elimination</div>
                              )}
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-xs ${s.winner === s.higherSeed.teamId ? 'text-[#00DD00] font-bold' : 'text-[#E8E8D8]'}`}>
                                  ({s.higherSeed.seed}) {s.higherSeed.teamName}
                                </span>
                                <span className="text-xs text-[#E8E8D8]">{s.higherSeedWins}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className={`text-xs ${s.winner === s.lowerSeed.teamId ? 'text-[#00DD00] font-bold' : 'text-[#E8E8D8]'}`}>
                                  ({s.lowerSeed.seed}) {s.lowerSeed.teamName}
                                </span>
                                <span className="text-xs text-[#E8E8D8]">{s.lowerSeedWins}</span>
                              </div>
                              {/* Expanded: game-by-game results */}
                              {isExpanded && s.games.filter(g => g.status === 'COMPLETED').length > 0 && (
                                <div className="mt-2 pt-2 border-t border-[#E8E8D8]/20">
                                  <div className="grid grid-cols-3 gap-1">
                                    {s.games.filter(g => g.status === 'COMPLETED' && g.result).map(g => (
                                      <div key={g.gameNumber} className="bg-[#5A8352] p-1 text-center">
                                        <div className="text-[8px] text-[#E8E8D8]/60">G{g.gameNumber}</div>
                                        <div className={`text-[9px] font-bold ${g.result!.winnerId === s.higherSeed.teamId ? 'text-[#00DD00]' : 'text-[#E8E8D8]'}`}>
                                          {g.result!.awayScore}-{g.result!.homeScore}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {s.status === 'IN_PROGRESS' && (
                                <div className="mt-2 space-y-2">
                                  <div className="text-[8px] text-[#5599FF] text-center">IN PROGRESS - Best of {s.bestOf}</div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handlePlayPlayoffGame(s); }}
                                      className="flex-1 bg-[#5599FF] border-[2px] border-[#3366FF] py-1.5 text-[10px] text-white font-bold hover:bg-[#3366FF] active:scale-95 transition-transform"
                                    >
                                      ⚾ PLAY GAME {s.games.filter(g => g.status === 'COMPLETED').length + 1}
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleSimPlayoffGame(s); }}
                                      className="bg-[#4A6844] border-[2px] border-[#5A8352] py-1.5 px-2 text-[10px] text-[#E8E8D8] font-bold hover:bg-[#3F5A3A] active:scale-95 transition-transform"
                                    >
                                      SIM
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          );
                        })
                      ) : (
                        <div className="text-xs text-[#E8E8D8]/60 text-center py-4">
                          {playoffData.playoff.teams.filter(t => t.league === 'Eastern').slice(0, 4).map((t, i) => (
                            <div key={t.teamId} className="py-1">({i + 1}) {t.teamName}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Western Conference */}
                  <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                    <div className="text-lg text-[#E8E8D8] font-bold mb-4 text-center border-b-2 border-[#4A6844] pb-2">
                      WESTERN CONFERENCE
                    </div>
                    <div className="space-y-4">
                      {playoffData.bracketByLeague.Western.length > 0 ? (
                        playoffData.bracketByLeague.Western.map((s) => {
                          const higherStatus = s.status === 'IN_PROGRESS' ? detectClinch(s.higherSeedWins, s.lowerSeedWins, s.bestOf) : null;
                          const lowerStatus = s.status === 'IN_PROGRESS' ? detectClinch(s.lowerSeedWins, s.higherSeedWins, s.bestOf) : null;
                          const isExpanded = expandedSeriesId === s.id;
                          return (
                          <div key={s.id}>
                            <div className="text-xs text-[#E8E8D8]/60 mb-2">{s.roundName.toUpperCase()}</div>
                            <div
                              className={`bg-[#4A6844] p-3 border-2 cursor-pointer transition-all ${
                                s.status === 'COMPLETED' ? 'border-[#00DD00]' :
                                s.status === 'IN_PROGRESS' ? 'border-[#5599FF]' :
                                'border-[#E8E8D8]/30'
                              }`}
                              onClick={() => setExpandedSeriesId(isExpanded ? null : s.id)}
                            >
                              {/* Clinch/Elimination badges */}
                              {higherStatus?.isClinchGame && (
                                <div className="text-[8px] text-[#FFD700] text-center mb-1">⭐ {s.higherSeed.teamName} can clinch</div>
                              )}
                              {lowerStatus?.isEliminationGame && (
                                <div className="text-[8px] text-[#DC3545] text-center mb-1">⚠️ {s.lowerSeed.teamName} facing elimination</div>
                              )}
                              {lowerStatus?.isClinchGame && (
                                <div className="text-[8px] text-[#FFD700] text-center mb-1">⭐ {s.lowerSeed.teamName} can clinch</div>
                              )}
                              {higherStatus?.isEliminationGame && (
                                <div className="text-[8px] text-[#DC3545] text-center mb-1">⚠️ {s.higherSeed.teamName} facing elimination</div>
                              )}
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-xs ${s.winner === s.higherSeed.teamId ? 'text-[#00DD00] font-bold' : 'text-[#E8E8D8]'}`}>
                                  ({s.higherSeed.seed}) {s.higherSeed.teamName}
                                </span>
                                <span className="text-xs text-[#E8E8D8]">{s.higherSeedWins}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className={`text-xs ${s.winner === s.lowerSeed.teamId ? 'text-[#00DD00] font-bold' : 'text-[#E8E8D8]'}`}>
                                  ({s.lowerSeed.seed}) {s.lowerSeed.teamName}
                                </span>
                                <span className="text-xs text-[#E8E8D8]">{s.lowerSeedWins}</span>
                              </div>
                              {/* Expanded: game-by-game results */}
                              {isExpanded && s.games.filter(g => g.status === 'COMPLETED').length > 0 && (
                                <div className="mt-2 pt-2 border-t border-[#E8E8D8]/20">
                                  <div className="grid grid-cols-3 gap-1">
                                    {s.games.filter(g => g.status === 'COMPLETED' && g.result).map(g => (
                                      <div key={g.gameNumber} className="bg-[#5A8352] p-1 text-center">
                                        <div className="text-[8px] text-[#E8E8D8]/60">G{g.gameNumber}</div>
                                        <div className={`text-[9px] font-bold ${g.result!.winnerId === s.higherSeed.teamId ? 'text-[#00DD00]' : 'text-[#E8E8D8]'}`}>
                                          {g.result!.awayScore}-{g.result!.homeScore}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {s.status === 'IN_PROGRESS' && (
                                <div className="mt-2 space-y-2">
                                  <div className="text-[8px] text-[#5599FF] text-center">IN PROGRESS - Best of {s.bestOf}</div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handlePlayPlayoffGame(s); }}
                                      className="flex-1 bg-[#5599FF] border-[2px] border-[#3366FF] py-1.5 text-[10px] text-white font-bold hover:bg-[#3366FF] active:scale-95 transition-transform"
                                    >
                                      ⚾ PLAY GAME {s.games.filter(g => g.status === 'COMPLETED').length + 1}
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleSimPlayoffGame(s); }}
                                      className="bg-[#4A6844] border-[2px] border-[#5A8352] py-1.5 px-2 text-[10px] text-[#E8E8D8] font-bold hover:bg-[#3F5A3A] active:scale-95 transition-transform"
                                    >
                                      SIM
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          );
                        })
                      ) : (
                        <div className="text-xs text-[#E8E8D8]/60 text-center py-4">
                          {playoffData.playoff.teams.filter(t => t.league === 'Western').slice(0, 4).map((t, i) => (
                            <div key={t.teamId} className="py-1">({i + 1}) {t.teamName}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Championship Series */}
                <div className="mt-8 bg-[#5A8352] border-[4px] border-[#FFD700] p-6">
                  <div className="text-xl text-[#FFD700] font-bold mb-4 text-center">
                    <Trophy className="w-6 h-6 inline mr-2" />
                    CHAMPIONSHIP SERIES
                  </div>
                  {playoffData.bracketByLeague.Championship ? (
                    <div className={`bg-[#4A6844] p-4 border-2 ${
                      playoffData.bracketByLeague.Championship.status === 'COMPLETED' ? 'border-[#FFD700]' :
                      playoffData.bracketByLeague.Championship.status === 'IN_PROGRESS' ? 'border-[#5599FF]' :
                      'border-[#FFD700]/50'
                    }`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-sm ${playoffData.bracketByLeague.Championship.winner === playoffData.bracketByLeague.Championship.higherSeed.teamId ? 'text-[#FFD700] font-bold' : 'text-[#E8E8D8]'}`}>
                          {playoffData.bracketByLeague.Championship.higherSeed.teamName}
                        </span>
                        <span className="text-lg text-[#E8E8D8]">{playoffData.bracketByLeague.Championship.higherSeedWins}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${playoffData.bracketByLeague.Championship.winner === playoffData.bracketByLeague.Championship.lowerSeed.teamId ? 'text-[#FFD700] font-bold' : 'text-[#E8E8D8]'}`}>
                          {playoffData.bracketByLeague.Championship.lowerSeed.teamName}
                        </span>
                        <span className="text-lg text-[#E8E8D8]">{playoffData.bracketByLeague.Championship.lowerSeedWins}</span>
                      </div>
                      {playoffData.bracketByLeague.Championship.status === 'IN_PROGRESS' && (
                        <div className="flex gap-1 mt-3">
                          <button
                            onClick={() => handlePlayPlayoffGame(playoffData.bracketByLeague.Championship!)}
                            className="flex-1 bg-[#FFD700] border-[2px] border-[#CC9900] py-2 text-[11px] text-[#1a1a1a] font-bold hover:bg-[#CC9900] hover:text-white active:scale-95 transition-transform"
                          >
                            🏆 PLAY GAME {playoffData.bracketByLeague.Championship.games.filter(g => g.status === 'COMPLETED').length + 1}
                          </button>
                          <button
                            onClick={() => handleSimPlayoffGame(playoffData.bracketByLeague.Championship!)}
                            className="bg-[#4A6844] border-[2px] border-[#5A8352] py-2 px-3 text-[10px] text-[#E8E8D8] font-bold hover:bg-[#3F5A3A] active:scale-95 transition-transform"
                          >
                            SIM
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-[#4A6844] p-4 border-2 border-[#FFD700]/50">
                      <div className="text-sm text-[#E8E8D8] text-center">Eastern Champion vs Western Champion</div>
                    </div>
                  )}
                </div>

                {/* Start Playoffs Button */}
                {playoffData.playoff.status === 'NOT_STARTED' && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={async () => {
                        try {
                          await playoffData.startPlayoffs();
                        } catch (err) {
                          console.error('Failed to start playoffs:', err);
                        }
                      }}
                      className="bg-[#5599FF] border-[3px] border-[#3366FF] px-6 py-3 text-sm text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform"
                    >
                      START PLAYOFFS
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        {activeTab === "series" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl text-[#E8E8D8] font-bold mb-2">SERIES RESULTS</h2>
              <div className="text-sm text-[#E8E8D8]/70">Complete playoff series breakdowns</div>
            </div>

            {playoffData.isLoading ? (
              <div className="text-center text-[#E8E8D8]/60 py-8">Loading series data...</div>
            ) : !playoffData.playoff ? (
              <div className="text-center text-[#E8E8D8]/60 py-8">No playoff data available</div>
            ) : playoffData.series.length === 0 ? (
              <div className="text-center text-[#E8E8D8]/60 py-8">No series have started yet</div>
            ) : (
              <div className="space-y-6">
                {/* Group series by round */}
                {Array.from(playoffData.bracketByRound.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([round, roundSeries]) => (
                    <div key={round} className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                      <div className="text-lg text-[#E8E8D8] font-bold mb-4 border-b-2 border-[#E8E8D8]/30 pb-2">
                        {playoffData.getRoundName(round)}
                      </div>

                      <div className="space-y-4">
                        {roundSeries.map((s) => (
                          <div key={s.id} className={`bg-[#4A6844] p-4 border-2 ${
                            s.status === 'COMPLETED' ? 'border-[#00DD00]' :
                            s.status === 'IN_PROGRESS' ? 'border-[#5599FF]' :
                            'border-[#E8E8D8]/30'
                          }`}>
                            {/* Series header */}
                            <div className="flex justify-between items-center mb-3">
                              <div className="text-xs text-[#E8E8D8]/60">
                                {s.status === 'COMPLETED' ? (
                                  <span className="text-[#00DD00]">FINAL</span>
                                ) : s.status === 'IN_PROGRESS' ? (
                                  <span className="text-[#5599FF]">IN PROGRESS</span>
                                ) : (
                                  <span>PENDING</span>
                                )}
                                {' • Best of '}{s.bestOf}
                              </div>
                              <div className="text-xs text-[#E8E8D8]/60">
                                {s.higherSeedWins}-{s.lowerSeedWins}
                              </div>
                            </div>

                            {/* Matchup */}
                            <div className="flex justify-between items-center mb-2">
                              <div className={`text-sm ${s.winner === s.higherSeed.teamId ? 'text-[#00DD00] font-bold' : 'text-[#E8E8D8]'}`}>
                                ({s.higherSeed.seed}) {s.higherSeed.teamName}
                              </div>
                              <div className="text-lg text-[#E8E8D8] font-bold">{s.higherSeedWins}</div>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className={`text-sm ${s.winner === s.lowerSeed.teamId ? 'text-[#00DD00] font-bold' : 'text-[#E8E8D8]'}`}>
                                ({s.lowerSeed.seed}) {s.lowerSeed.teamName}
                              </div>
                              <div className="text-lg text-[#E8E8D8] font-bold">{s.lowerSeedWins}</div>
                            </div>

                            {/* Individual games */}
                            {s.games && s.games.filter(g => g.status === 'COMPLETED').length > 0 && (
                              <div className="mt-3 pt-3 border-t border-[#E8E8D8]/20">
                                <div className="text-[10px] text-[#E8E8D8]/60 mb-2">GAME RESULTS</div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                                  {s.games.filter(g => g.status === 'COMPLETED' && g.result).map((game) => (
                                    <div key={game.gameNumber} className="bg-[#5A8352] p-2 text-center">
                                      <div className="text-[10px] text-[#E8E8D8]/60 mb-1">Game {game.gameNumber}</div>
                                      <div className="text-xs">
                                        <span className={game.result!.winnerId === s.higherSeed.teamId ? 'text-[#00DD00] font-bold' : 'text-[#E8E8D8]/60'}>
                                          {game.result!.homeScore}
                                        </span>
                                        <span className="text-[#E8E8D8]/40 mx-1">-</span>
                                        <span className={game.result!.winnerId === s.lowerSeed.teamId ? 'text-[#00DD00] font-bold' : 'text-[#E8E8D8]/60'}>
                                          {game.result!.awayScore}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                {playoffData.pendingSeries.length > 0 && (
                  <div className="text-center text-xs text-[#E8E8D8]/60 py-4">
                    {playoffData.pendingSeries.length} series pending • {playoffData.inProgressSeries.length} in progress
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {activeTab === "playoff-stats" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl text-[#E8E8D8] font-bold mb-2">PLAYOFF STATISTICS</h2>
              <div className="text-sm text-[#E8E8D8]/70">Team and player performance in the postseason</div>
            </div>

            {playoffData.isLoading ? (
              <div className="text-center text-[#E8E8D8]/60 py-8">Loading playoff stats...</div>
            ) : !playoffData.playoff ? (
              <div className="text-center text-[#E8E8D8]/60 py-8">No playoff data available</div>
            ) : (
              <div className="space-y-6">
                {/* Team Stats - derived from series data */}
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                  <div className="text-lg text-[#E8E8D8] font-bold mb-4">TEAM PLAYOFF RECORDS</div>
                  <div className="bg-[#4A6844] p-4">
                    <table className="w-full text-xs text-[#E8E8D8]">
                      <thead className="border-b-2 border-[#E8E8D8]/30">
                        <tr>
                          <th className="text-left py-2">Team</th>
                          <th className="text-center py-2">Seed</th>
                          <th className="text-center py-2">League</th>
                          <th className="text-center py-2">Series W</th>
                          <th className="text-center py-2">Series L</th>
                          <th className="text-center py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playoffData.playoff.teams
                          .sort((a, b) => {
                            // Sort by league, then seed
                            if (a.league !== b.league) return a.league.localeCompare(b.league);
                            return a.seed - b.seed;
                          })
                          .map((team) => {
                            // Calculate series wins/losses for this team
                            const teamSeries = playoffData.series.filter(
                              s => s.higherSeed.teamId === team.teamId || s.lowerSeed.teamId === team.teamId
                            );
                            const seriesWins = teamSeries.filter(
                              s => s.status === 'COMPLETED' && s.winner === team.teamId
                            ).length;
                            const seriesLosses = teamSeries.filter(
                              s => s.status === 'COMPLETED' && s.winner && s.winner !== team.teamId
                            ).length;

                            return (
                              <tr key={team.teamId} className={`border-b border-[#E8E8D8]/10 ${team.eliminated ? 'opacity-50' : ''}`}>
                                <td className="py-2">{team.teamName}</td>
                                <td className="text-center">{team.seed}</td>
                                <td className="text-center">{team.league}</td>
                                <td className="text-center">{seriesWins}</td>
                                <td className="text-center">{seriesLosses}</td>
                                <td className="text-center">
                                  {team.eliminated ? (
                                    <span className="text-[#FF6B6B]">ELIMINATED</span>
                                  ) : playoffData.playoff?.champion === team.teamId ? (
                                    <span className="text-[#FFD700]">CHAMPION</span>
                                  ) : (
                                    <span className="text-[#00DD00]">ACTIVE</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Player Stats Placeholder */}
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                  <div className="text-lg text-[#E8E8D8] font-bold mb-4">TOP PERFORMERS</div>
                  <div className="bg-[#4A6844] p-4">
                    <div className="text-xs text-[#E8E8D8]/60 text-center py-4">
                      Individual player stats will be tracked when games are played via GameTracker
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === "playoff-leaders" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl text-[#E8E8D8] font-bold mb-2">PLAYOFF LEADERS</h2>
              <div className="text-sm text-[#E8E8D8]/70">Top individual performances</div>
            </div>

            {playoffData.isLoading ? (
              <div className="text-center text-[#E8E8D8]/60 py-8">Loading playoff leaders...</div>
            ) : !playoffData.playoff ? (
              <div className="text-center text-[#E8E8D8]/60 py-8">No playoff data available</div>
            ) : playoffData.playoff.status === 'NOT_STARTED' ? (
              <div className="text-center text-[#E8E8D8]/60 py-8">Playoffs have not started yet</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Batting Leaders */}
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                  <div className="text-lg text-[#E8E8D8] font-bold mb-4">BATTING LEADERS</div>
                  <div className="space-y-3">
                    <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                      <div className="text-xs text-[#E8E8D8]/60 mb-1">Home Runs</div>
                      <div className="text-sm text-[#E8E8D8]/60">Track games via GameTracker to see leaders</div>
                    </div>
                    <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                      <div className="text-xs text-[#E8E8D8]/60 mb-1">Batting Average</div>
                      <div className="text-sm text-[#E8E8D8]/60">Track games via GameTracker to see leaders</div>
                    </div>
                    <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                      <div className="text-xs text-[#E8E8D8]/60 mb-1">RBIs</div>
                      <div className="text-sm text-[#E8E8D8]/60">Track games via GameTracker to see leaders</div>
                    </div>
                  </div>
                </div>

                {/* Pitching Leaders */}
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                  <div className="text-lg text-[#E8E8D8] font-bold mb-4">PITCHING LEADERS</div>
                  <div className="space-y-3">
                    <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                      <div className="text-xs text-[#E8E8D8]/60 mb-1">Wins</div>
                      <div className="text-sm text-[#E8E8D8]/60">Track games via GameTracker to see leaders</div>
                    </div>
                    <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                      <div className="text-xs text-[#E8E8D8]/60 mb-1">ERA</div>
                      <div className="text-sm text-[#E8E8D8]/60">Track games via GameTracker to see leaders</div>
                    </div>
                    <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                      <div className="text-xs text-[#E8E8D8]/60 mb-1">Strikeouts</div>
                      <div className="text-sm text-[#E8E8D8]/60">Track games via GameTracker to see leaders</div>
                    </div>
                  </div>
                </div>

                {/* Series MVP - if champion exists */}
                {playoffData.playoff.champion && playoffData.playoff.mvp && (
                  <div className="lg:col-span-2 bg-[#5A8352] border-[4px] border-[#FFD700] p-6">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Trophy className="w-6 h-6 text-[#FFD700]" />
                      <div className="text-lg text-[#FFD700] font-bold">PLAYOFF MVP</div>
                    </div>
                    <div className="bg-[#4A6844] p-4 border-2 border-[#FFD700] text-center">
                      <div className="text-xl text-[#FFD700] font-bold mb-1">
                        {playoffData.playoff.mvp.playerName}
                      </div>
                      <div className="text-sm text-[#E8E8D8]/70">
                        {playoffData.playoff.mvp.stats}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {activeTab === "advance" && seasonPhase === "playoffs" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl text-[#E8E8D8] font-bold mb-2">ADVANCE TO OFFSEASON</h2>
              <div className="text-sm text-[#E8E8D8]/70">Complete playoffs and begin offseason activities</div>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              {/* Championship Summary */}
              {playoffData.playoff?.status === 'COMPLETED' && playoffData.playoff.champion ? (
                <div className="bg-[#5A8352] p-6">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Trophy className="w-8 h-8 text-[#FFD700]" />
                    <div className="text-xl text-[#E8E8D8] font-bold">SEASON {playoffData.playoff.seasonNumber} CHAMPION</div>
                  </div>
                  <div className="bg-[#4A6844] p-4 border-2 border-[#FFD700] text-center">
                    <div className="text-2xl text-[#FFD700] font-bold mb-2">
                      {playoffData.playoff.teams.find(t => t.teamId === playoffData.playoff?.champion)?.teamName || 'Champion'}
                    </div>
                    {playoffData.bracketByLeague.Championship && (
                      <div className="text-xs text-[#E8E8D8]/70">
                        Defeated {
                          playoffData.bracketByLeague.Championship.winner === playoffData.bracketByLeague.Championship.higherSeed.teamId
                            ? playoffData.bracketByLeague.Championship.lowerSeed.teamName
                            : playoffData.bracketByLeague.Championship.higherSeed.teamName
                        } {playoffData.bracketByLeague.Championship.higherSeedWins}-{playoffData.bracketByLeague.Championship.lowerSeedWins}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-[#5A8352] p-6">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Trophy className="w-8 h-8 text-[#E8E8D8]/40" />
                    <div className="text-xl text-[#E8E8D8]/60 font-bold">AWAITING CHAMPION</div>
                  </div>
                  <div className="bg-[#4A6844] p-4 border-2 border-[#E8E8D8]/30 text-center">
                    <div className="text-sm text-[#E8E8D8]/60">
                      Complete all playoff series to crown a champion
                    </div>
                  </div>
                </div>
              )}

              {/* Playoff Summary Stats */}
              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                <div className="text-lg text-[#E8E8D8] font-bold mb-4">PLAYOFF SUMMARY</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                    <div className="text-xs text-[#E8E8D8]/60 mb-1">Total Series</div>
                    <div className="text-2xl text-[#E8E8D8] font-bold">{playoffData.series.length}</div>
                  </div>
                  <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                    <div className="text-xs text-[#E8E8D8]/60 mb-1">Completed Series</div>
                    <div className="text-2xl text-[#E8E8D8] font-bold">{playoffData.completedSeries.length}</div>
                  </div>
                  <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                    <div className="text-xs text-[#E8E8D8]/60 mb-1">In Progress</div>
                    <div className="text-2xl text-[#E8E8D8] font-bold">{playoffData.inProgressSeries.length}</div>
                  </div>
                  <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                    <div className="text-xs text-[#E8E8D8]/60 mb-1">Pending</div>
                    <div className="text-2xl text-[#E8E8D8] font-bold">{playoffData.pendingSeries.length}</div>
                  </div>
                </div>
              </div>

              {/* Advance Button */}
              <button
                onClick={() => setShowSeasonEnd(true)}
                disabled={playoffData.playoff?.status !== 'COMPLETED'}
                className={`w-full border-[5px] p-8 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] group ${
                  playoffData.playoff?.status === 'COMPLETED'
                    ? 'bg-[#5A8352] border-[#C4A853] hover:bg-[#4F7D4B] active:scale-95'
                    : 'bg-[#4A6844] border-[#E8E8D8]/30 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="flex items-center justify-center gap-4">
                  <ArrowRight className={`w-12 h-12 ${
                    playoffData.playoff?.status === 'COMPLETED'
                      ? 'text-[#E8E8D8] group-hover:text-[#5599FF] transition-colors'
                      : 'text-[#E8E8D8]/40'
                  }`} />
                  <div className="text-left">
                    <div className={`text-2xl font-bold mb-1 ${
                      playoffData.playoff?.status === 'COMPLETED' ? 'text-[#E8E8D8]' : 'text-[#E8E8D8]/60'
                    }`}>PROCEED TO OFFSEASON</div>
                    <div className={`text-sm ${
                      playoffData.playoff?.status === 'COMPLETED' ? 'text-[#E8E8D8]/80' : 'text-[#E8E8D8]/40'
                    }`}>Begin Awards, Free Agency, Draft, and more</div>
                  </div>
                </div>
              </button>

              {playoffData.playoff?.status !== 'COMPLETED' && (
                <div className="text-center text-xs text-[#FF9944] mt-4">
                  ⚠️ Complete all playoff series before advancing to offseason
                </div>
              )}

              {showSeasonEnd && (
                <SeasonEndFlow
                  {...seasonEndProps}
                  onComplete={() => {
                    setShowSeasonEnd(false);
                    handleBeginOffseason();
                  }}
                  onCancel={() => setShowSeasonEnd(false)}
                />
              )}
            </div>
          </div>
        )}

        {/* Playoff SIM overlay */}
        <SimulationOverlay
          isOpen={isPlayoffSimulating}
          playByPlay={playoffSimPlayByPlay}
          awayTeamName={playoffSimAwayName}
          homeTeamName={playoffSimHomeName}
          finalAwayScore={playoffSimResult?.away ?? 0}
          finalHomeScore={playoffSimResult?.home ?? 0}
          onComplete={handlePlayoffSimComplete}
        />
        
        {activeTab === "free-agency" && (
          <div>
            <div className="text-center py-12">
              <button
                onClick={() => setShowFreeAgency(true)}
                className="bg-[#5A8352] border-[5px] border-[#C4A853] px-12 py-6 text-xl text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
              >
                START FREE AGENCY
              </button>
            </div>
            
            {showFreeAgency && (
              <FreeAgencyFlow
                seasonId={`season-${currentSeason}`}
                seasonNumber={currentSeason}
                onClose={() => setShowFreeAgency(false)}
              />
            )}
          </div>
        )}
        
        {/* Ratings Adjustment Modal */}
        {showRatingsAdjustment && (
          <RatingsAdjustmentFlow
            seasonId={`season-${currentSeason}`}
            onClose={() => setShowRatingsAdjustment(false)}
          />
        )}
        
        {/* Retirements Modal */}
        {showRetirements && (
          <RetirementFlow
            seasonId={`season-${currentSeason}`}
            seasonNumber={currentSeason}
            onClose={() => setShowRetirements(false)}
            onRetirementsComplete={(newJerseys) => {
              setRetiredJerseys([...retiredJerseys, ...newJerseys]);
            }}
          />
        )}

        {/* Awards Ceremony Modal */}
        {showAwards && (
          <AwardsCeremonyFlow
            seasonId={`season-${currentSeason}`}
            seasonNumber={currentSeason}
            onClose={() => setShowAwards(false)}
          />
        )}

        {/* Contraction/Expansion Modal */}
        {showContraction && (
          <ContractionExpansionFlow seasonNumber={currentSeason} onComplete={() => setShowContraction(false)} />
        )}

        {/* Draft Modal */}
        {showDraft && (
          <DraftFlow
            seasonId={`season-${currentSeason}`}
            seasonNumber={currentSeason}
            onComplete={() => {
              setShowDraft(false);
              setActiveTab("todays-game");
            }}
            onCancel={() => setShowDraft(false)}
          />
        )}

        {activeTab === "draft" && (
          <button
            onClick={() => setShowDraft(true)}
            className="w-full bg-[#6B9462] border-[5px] border-[#C4A853] p-8 hover:bg-[#5A8352] transition-colors group"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Trophy className="w-12 h-12 text-[#C4A853] group-hover:text-[#5599FF] transition-colors" />
                <div className="text-left">
                  <div className="text-3xl text-[#E8E8D8] font-bold">SEASON {currentSeason} DRAFT</div>
                  <div className="text-base text-[#E8E8D8]/70 mt-1">Draft 10 prospects to your farm system</div>
                </div>
              </div>
              <div className="bg-[#C4A853] text-black px-6 py-3 text-xl font-bold group-hover:bg-[#5599FF] transition-colors">
                START →
              </div>
            </div>
            <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4 max-w-3xl mx-auto">
              <div className="flex items-center justify-around text-center">
                <div className="flex-1">
                  <div className="text-sm text-[#E8E8D8]/60 mb-1">STEP 1</div>
                  <div className="text-base text-[#E8E8D8]">Choose Inactive Players</div>
                </div>
                <ArrowRight className="w-5 h-5 text-[#E8E8D8]/40" />
                <div className="flex-1">
                  <div className="text-sm text-[#E8E8D8]/60 mb-1">STEP 2</div>
                  <div className="text-base text-[#E8E8D8]">Draft Farm Prospects</div>
                </div>
                <ArrowRight className="w-5 h-5 text-[#E8E8D8]/40" />
                <div className="flex-1">
                  <div className="text-sm text-[#E8E8D8]/60 mb-1">STEP 3</div>
                  <div className="text-base text-[#E8E8D8]">Review & Confirm</div>
                </div>
              </div>
            </div>
          </button>
        )}
        {activeTab === "farm-reconciliation" && (
          <div className="p-8 space-y-6">
            <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center text-3xl">
                  🌾
                </div>
                <div>
                  <div className="text-2xl text-[#E8E8D8]">FARM SYSTEM RECONCILIATION</div>
                  <div className="text-sm text-[#E8E8D8]/80">Offseason Phase 8</div>
                </div>
              </div>
              <div className="text-sm text-[#E8E8D8]/80 mb-4">
                Review and balance farm system rosters across all teams. Ensure each team has the correct number of farm players after draft picks, retirements, and free agency moves.
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">🌱</div>
                  <div className="text-xs text-[#E8E8D8]/60">Prospects</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">📋</div>
                  <div className="text-xs text-[#E8E8D8]/60">Roster Slots</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">⚖️</div>
                  <div className="text-xs text-[#E8E8D8]/60">Balance</div>
                </div>
              </div>
            </div>

            <div className="bg-[#4169E1]/20 border-l-4 border-[#4169E1] p-4">
              <div className="text-xs text-[#E8E8D8]/90 mb-2 flex items-center gap-2">
                <span>💡</span>
                <span className="font-bold">Phase 8 — Coming Soon</span>
              </div>
              <div className="text-xs text-[#E8E8D8]/70">
                Farm system reconciliation will automatically balance rosters after the draft and free agency phases. For now, use the "Complete Phase & Advance" button to skip to the next phase.
              </div>
            </div>
          </div>
        )}
        {activeTab === "chemistry" && (
          <div className="p-8 space-y-6">
            <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center text-3xl">
                  ⚗️
                </div>
                <div>
                  <div className="text-2xl text-[#E8E8D8]">CHEMISTRY REBALANCING</div>
                  <div className="text-sm text-[#E8E8D8]/80">Offseason Phase 9</div>
                </div>
              </div>
              <div className="text-sm text-[#E8E8D8]/80 mb-4">
                Team chemistry shifts based on roster changes during the offseason. New acquisitions, departures, and trades all affect how well your team gels heading into the new season.
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">📈</div>
                  <div className="text-xs text-[#E8E8D8]/60">Improved</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">📉</div>
                  <div className="text-xs text-[#E8E8D8]/60">Declined</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">➖</div>
                  <div className="text-xs text-[#E8E8D8]/60">Unchanged</div>
                </div>
              </div>
            </div>

            <div className="bg-[#4169E1]/20 border-l-4 border-[#4169E1] p-4">
              <div className="text-xs text-[#E8E8D8]/90 mb-2 flex items-center gap-2">
                <span>💡</span>
                <span className="font-bold">Phase 9 — Coming Soon</span>
              </div>
              <div className="text-xs text-[#E8E8D8]/70">
                Chemistry rebalancing will calculate team chemistry changes based on roster moves. For now, use the "Complete Phase & Advance" button to skip to the next phase.
              </div>
            </div>
          </div>
        )}
        {activeTab === "spring-training" && (
          <div className="p-8">
            <SpringTrainingFlow onComplete={handleAdvancePhase} />
          </div>
        )}
        {activeTab === "finalize" && (
          <div>
            <div className="text-center py-12">
              <button
                onClick={() => setShowFinalize(true)}
                className="bg-[#5A8352] border-[5px] border-[#C4A853] px-12 py-6 text-xl text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
              >
                START FINALIZE & ADVANCE
              </button>
            </div>
            
            {showFinalize && (
              <FinalizeAdvanceFlow
                seasonNumber={currentSeason}
                onClose={() => setShowFinalize(false)}
                onAdvanceComplete={() => {
                  // Increment season number and persist to localStorage
                  const newSeason = currentSeason + 1;
                  setCurrentSeason(newSeason);
                  localStorage.setItem('kbl-current-season', String(newSeason));

                  // Reset to regular season
                  setSeasonPhase("regular");
                  setActiveTab("todays-game");
                }}
              />
            )}
          </div>
        )}
        {activeTab === "ratings-adj" && (
          <button
            onClick={() => setShowRatingsAdjustment(true)}
            className="w-full bg-[#6B9462] border-[5px] border-[#C4A853] p-8 hover:bg-[#5A8352] transition-colors group"
          >
            <div className="flex items-center justify-center gap-4 mb-4">
              <BarChart3 className="w-16 h-16 text-[#E8E8D8] group-hover:text-[#DD0000] transition-colors" />
              <div className="text-left">
                <div className="text-2xl text-[#E8E8D8] font-bold mb-1">END-OF-SEASON RATINGS ADJUSTMENTS</div>
                <div className="text-sm text-[#E8E8D8]/80">Review player performance and adjust ratings for Season 4</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4">
                <div className="text-3xl text-[#E8E8D8] mb-1">📊</div>
                <div className="text-xs text-[#E8E8D8]/60">WAR-Based Adjustments</div>
              </div>
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4">
                <div className="text-3xl text-[#E8E8D8] mb-1">💰</div>
                <div className="text-xs text-[#E8E8D8]/60">Salary Updates</div>
              </div>
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4">
                <div className="text-3xl text-[#E8E8D8] mb-1">🏆</div>
                <div className="text-xs text-[#E8E8D8]/60">Manager Bonuses</div>
              </div>
            </div>
            <div className="mt-6 text-sm text-[#E8E8D8] flex items-center justify-center gap-2">
              <span>Click to begin</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}
        {activeTab === "awards" && (
          <div className="p-8 space-y-6">
            <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center text-3xl">
                  🏆
                </div>
                <div>
                  <div className="text-2xl text-[#E8E8D8]">AWARDS CEREMONY</div>
                  <div className="text-sm text-[#E8E8D8]/80">Offseason Phase 2</div>
                </div>
              </div>
              <div className="text-sm text-[#E8E8D8]/80 mb-4">
                Celebrate the season's best performers across 13 award categories. League leaders receive automatic rewards, while major awards use hybrid voting with user override capability.
              </div>
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">13</div>
                  <div className="text-xs text-[#E8E8D8]/60">Award Screens</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">42+</div>
                  <div className="text-xs text-[#E8E8D8]/60">Total Awards</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">🥇</div>
                  <div className="text-xs text-[#E8E8D8]/60">Gold Gloves</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">👑</div>
                  <div className="text-xs text-[#E8E8D8]/60">MVP Awards</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAwards(true)}
              className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-6 text-xl text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              🏆 BEGIN AWARDS CEREMONY 🏆
            </button>

            <div className="bg-[#4169E1]/20 border-l-4 border-[#4169E1] p-4">
              <div className="flex items-start gap-2 text-sm text-[#E8E8D8]">
                <span className="text-lg">ℹ️</span>
                <div>
                  <div className="font-bold mb-1">Award Categories:</div>
                  <ul className="text-[#E8E8D8]/80 space-y-1 ml-4 list-disc">
                    <li>League Leaders (auto-calculated rewards)</li>
                    <li>Gold Glove (9 positions) + Platinum Glove</li>
                    <li>Silver Slugger (9 positions) + Booger Glove</li>
                    <li>Cy Young, MVP, Rookie of the Year (AL/NL)</li>
                    <li>Reliever of Year, Bench Player, Manager of Year</li>
                    <li>Special Awards: Kara Kawaguchi, Bust, Comeback</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "contraction" && (
          <div className="p-8 space-y-6">
            <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center text-3xl">
                  ⚠️
                </div>
                <div>
                  <div className="text-2xl text-[#E8E8D8]">CONTRACTION/EXPANSION</div>
                  <div className="text-sm text-[#E8E8D8]/80">Offseason Phase 4</div>
                </div>
              </div>
              <div className="text-sm text-[#E8E8D8]/80 mb-4">
                Teams with low fan morale face contraction risk. Roll dice to determine which teams survive. Protected players from contracted teams enter the expansion draft, while others face retirement checks. Create new expansion teams to fill the void.
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">🎲</div>
                  <div className="text-xs text-[#E8E8D8]/60">Risk Roll</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">4</div>
                  <div className="text-xs text-[#E8E8D8]/60">Protected</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">🏛️</div>
                  <div className="text-xs text-[#E8E8D8]/60">Legacy</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowContraction(true)}
              className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-6 text-xl text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              ⚠️ BEGIN CONTRACTION/EXPANSION PHASE ⚠️
            </button>

            <div className="bg-[#4169E1]/20 border-l-4 border-[#4169E1] p-4">
              <div className="text-xs text-[#E8E8D8]/90 mb-2 flex items-center gap-2">
                <span>💡</span>
                <span className="font-bold">Phase 4 Details</span>
              </div>
              <div className="text-xs text-[#E8E8D8]/70 space-y-1">
                <div className="mb-2">Complete 12-screen flow:</div>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Risk Assessment: See all teams at contraction risk</li>
                  <li>Contraction Rolls: Dice determine team survival</li>
                  <li>Voluntary Sales: Option to sell additional teams</li>
                  <li>Protection Selection: Choose 4 players to protect</li>
                  <li>Legacy Cornerstone: Honor franchise cornerstones</li>
                  <li>Expansion Draft: Teams select from contraction pool</li>
                  <li>Player Disposal: Retirement checks (+30% probability)</li>
                  <li>Museum Entries: Defunct teams preserved in history</li>
                  <li>Expansion Creation: Build new franchises (optional)</li>
                  <li>Phase Summary: Complete contraction/expansion report</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        {activeTab === "retirements" && (
          <div className="p-8 space-y-6">
            <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center text-3xl">
                  🎩
                </div>
                <div>
                  <div className="text-2xl text-[#E8E8D8]">RETIREMENTS</div>
                  <div className="text-sm text-[#E8E8D8]/80">Offseason Phase 5</div>
                </div>
              </div>
              <div className="text-sm text-[#E8E8D8]/80 mb-4">
                Players retire based on age-weighted dice rolls. The goal is 1-2 retirements per team per season. Celebrate retiring players and optionally retire their jersey numbers.
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">8</div>
                  <div className="text-xs text-[#E8E8D8]/60">Teams</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">1-2</div>
                  <div className="text-xs text-[#E8E8D8]/60">Per Team</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">🎲</div>
                  <div className="text-xs text-[#E8E8D8]/60">Dice Roll</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowRetirements(true)}
              className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-6 text-xl text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              🎩 BEGIN RETIREMENT PHASE 🎩
            </button>

            <div className="bg-[#4169E1]/20 border-l-4 border-[#4169E1] p-4">
              <div className="flex items-start gap-2 text-sm text-[#E8E8D8]">
                <span className="text-lg">ℹ️</span>
                <div>
                  <div className="font-bold mb-1">How it works:</div>
                  <ul className="text-[#E8E8D8]/80 space-y-1 ml-4 list-disc">
                    <li>Review retirement probabilities for each team (based on player age)</li>
                    <li>Roll dice to see if anyone retires</li>
                    <li>Celebrate retiring players with career highlights</li>
                    <li>Optionally retire jersey numbers</li>
                    <li>Each team may have 0-2 retirements</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "advance" && (
          <div className="text-center py-12 text-[#E8E8D8]/60 text-xs">ADVANCE COMING SOON</div>
        )}
      </div>

      {/* Add Game Modal */}
      <AddGameModal
        isOpen={addGameModalOpen}
        onClose={() => setAddGameModalOpen(false)}
        onAddGame={handleAddGame}
        onAddSeries={handleAddSeries}
        nextGameNumber={getNextGameNumber()}
        nextDayNumber={getNextDayNumber()}
        nextDate={getNextDate()}
        teams={availableTeams}
      />
    </div>
    </FranchiseDataContext.Provider>
  );
}

function StandingsContent() {
  const [selectedLeague, setSelectedLeague] = useState<"Eastern" | "Western">("Eastern");

  // Get standings from context (real data or mock fallback)
  const franchiseData = useFranchiseDataContext();
  const standings = franchiseData.standings;

  const currentLeagueStandings = standings[selectedLeague];

  return (
    <div className="space-y-4">
      {/* League Toggle */}
      <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedLeague("Eastern")}
            className={`flex-1 py-2 px-4 text-[10px] transition ${
              selectedLeague === "Eastern"
                ? "bg-[#4A6844] text-[#E8E8D8]"
                : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
            }`}
          >
            EASTERN LEAGUE
          </button>
          <button
            onClick={() => setSelectedLeague("Western")}
            className={`flex-1 py-2 px-4 text-[10px] transition ${
              selectedLeague === "Western"
                ? "bg-[#4A6844] text-[#E8E8D8]"
                : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
            }`}
          >
            WESTERN LEAGUE
          </button>
        </div>
      </div>

      {/* Divisions */}
      {Object.entries(currentLeagueStandings).map(([division, teams]) => (
        <div key={division} className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
          <div 
            className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
          >
            {division.toUpperCase()}
          </div>
          
          {/* Table Header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 mb-2 px-2 pb-1 border-b border-[#4A6844]">
            <div className="text-[8px] text-[#E8E8D8]/70">TEAM</div>
            <div className="text-[8px] text-[#E8E8D8]/70 text-center">W</div>
            <div className="text-[8px] text-[#E8E8D8]/70 text-center">L</div>
            <div className="text-[8px] text-[#E8E8D8]/70 text-center">GB</div>
            <div className="text-[8px] text-[#E8E8D8]/70 text-center">RD</div>
          </div>

          {/* Team Rows */}
          {teams.map((teamData, index) => (
            <div 
              key={teamData.team}
              className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 px-2 py-1.5 ${
                index % 2 === 0 ? 'bg-[#5A8352]/30' : ''
              }`}
            >
              <div className="text-[10px] text-[#E8E8D8]">{teamData.team}</div>
              <div className="text-[10px] text-[#E8E8D8] text-center">{teamData.wins}</div>
              <div className="text-[10px] text-[#E8E8D8] text-center">{teamData.losses}</div>
              <div className="text-[10px] text-[#E8E8D8] text-center">{teamData.gamesBack}</div>
              <div className={`text-[10px] text-center ${
                teamData.runDiff.startsWith('+') ? 'text-[#E8E8D8]' : 'text-[#E8E8D8]/80'
              }`}>
                {teamData.runDiff}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

interface GameDayContentProps {
  scheduleData: ReturnType<typeof useScheduleData>;
  currentSeason: number;
  onDataRefresh: () => Promise<void>;
}

function GameDayContent({ scheduleData, currentSeason, onDataRefresh }: GameDayContentProps) {
  const navigate = useNavigate();
  const { franchiseId } = useParams<{ franchiseId: string }>();
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [showHeadToHead, setShowHeadToHead] = useState(false);
  const [showBeatWriters, setShowBeatWriters] = useState(false);
  const [showAwayTeamStats, setShowAwayTeamStats] = useState(false);
  const [showHomeTeamStats, setShowHomeTeamStats] = useState(false);

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simPlayByPlay, setSimPlayByPlay] = useState<PlayByPlayEntry[]>([]);
  const [simResult, setSimResult] = useState<{ away: number; home: number } | null>(null);
  const [simAwayName, setSimAwayName] = useState('');
  const [simHomeName, setSimHomeName] = useState('');

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Batch operation state
  const [batchType, setBatchType] = useState<BatchOperationType | null>(null);
  const [batchCurrent, setBatchCurrent] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  // Season completion state
  const [seasonComplete, setSeasonComplete] = useState(false);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Access franchise data for season config
  const franchiseData = useFranchiseDataContext();

  // Lookup team record from standings (handles nested LeagueStandings shape)
  // MAJ-15: Needed by handlePlayGame and JSX display
  const getTeamRecord = (teamId: string): string => {
    const standings = franchiseData.standings;
    if (!standings || typeof standings !== 'object') return '0-0';
    try {
      for (const conference of Object.values(standings)) {
        if (!conference || typeof conference !== 'object') continue;
        for (const division of Object.values(conference as Record<string, unknown>)) {
          if (!Array.isArray(division)) continue;
          const entry = division.find(
            (s: { team?: string; wins?: number; losses?: number }) =>
              s.team && s.team.toLowerCase() === teamId.toLowerCase()
          );
          if (entry) return `${entry.wins}-${entry.losses}`;
        }
      }
    } catch {
      // Standings shape doesn't match expected — return default
    }
    return '0-0';
  };

  // Derive season complete: all games resolved (no SCHEDULED games remain)
  // Only true when we have loaded games AND none are SCHEDULED
  const allGames = scheduleData.games ?? [];
  const hasGames = allGames.length > 0;
  const upcomingCount = (scheduleData.upcomingGames ?? []).length;
  const isSeasonOver = hasGames && upcomingCount === 0;

  // Sync seasonComplete from schedule data on load / refresh
  useEffect(() => {
    if (isSeasonOver && !seasonComplete) {
      setSeasonComplete(true);
    }
  }, [isSeasonOver]);

  /**
   * Check if season is now complete after a game action.
   * Reads directly from IndexedDB (not React state) to avoid stale data.
   * If all scheduled games are resolved, mark season in storage.
   */
  const checkSeasonComplete = async () => {
    try {
      // Read fresh from DB — React state may not have updated yet
      const freshGames = await getAllGames(currentSeason);
      if (freshGames.length === 0) return;

      const stillScheduled = freshGames.filter(g => g.status === 'SCHEDULED').length;
      if (stillScheduled === 0) {
        const seasonId = `season-${currentSeason}`;
        await markSeasonComplete(seasonId);
        setSeasonComplete(true);
        setToastMessage('REGULAR SEASON COMPLETE!');
      }
    } catch (err) {
      console.error('Failed to check season completion:', err);
    }
  };

  // Team IDs for the matchup — pull from schedule if available
  const awayTeamId = scheduleData.nextGame?.awayTeamId ?? '';
  const homeTeamId = scheduleData.nextGame?.homeTeamId ?? '';

  const handlePlayGame = async () => {
    const nextGame = scheduleData.nextGame;
    const away = nextGame?.awayTeamId || awayTeamId;
    const home = nextGame?.homeTeamId || homeTeamId;
    const awayName = franchiseData.teamNameMap?.[away] || away;
    const homeName = franchiseData.teamNameMap?.[home] || home;
    const gameNum = nextGame?.gameNumber ?? 1;

    // T0-08: Load real rosters from IndexedDB for both teams
    const [awayRoster, homeRoster] = await Promise.all([
      buildGameTrackerRoster(away),
      buildGameTrackerRoster(home),
    ]);

    navigate(`/game-tracker/franchise-g${gameNum}`, {
      state: {
        gameMode: 'franchise' as const,
        awayTeamId: away,
        homeTeamId: home,
        awayTeamName: awayName.toUpperCase(),
        homeTeamName: homeName.toUpperCase(),
        awayPlayers: awayRoster.players.length > 0 ? awayRoster.players : undefined,
        awayPitchers: awayRoster.pitchers.length > 0 ? awayRoster.pitchers : undefined,
        homePlayers: homeRoster.players.length > 0 ? homeRoster.players : undefined,
        homePitchers: homeRoster.pitchers.length > 0 ? homeRoster.pitchers : undefined,
        awayRecord: getTeamRecord(away),
        homeRecord: getTeamRecord(home),
        stadiumName: franchiseData.stadiumMap?.[home],
        franchiseId,
        leagueId: 'sml',
        // T0-05: Pass schedule game ID so GameTracker can mark it completed
        scheduleGameId: nextGame?.id,
        seasonNumber: currentSeason,
        // T0-01: Pass total innings for auto game-end detection
        totalInnings: franchiseData.franchiseConfig?.season?.inningsPerGame ?? 9,
      },
    });
    setConfirmAction(null);
  };

  const handleSimulate = async () => {
    setConfirmAction(null);

    // Get next game from schedule — pull real team IDs and game number
    const nextGame = scheduleData.nextGame;
    const awayId = nextGame?.awayTeamId ?? awayTeamId;
    const homeId = nextGame?.homeTeamId ?? homeTeamId;
    const gameNum = nextGame?.gameNumber ?? 1;

    // Build rosters from real franchise player data
    const awayRoster = await buildRosterFromPlayers(awayId, awayId.toUpperCase());
    const homeRoster = await buildRosterFromPlayers(homeId, homeId.toUpperCase());

    // Generate synthetic game with real player names
    const game = generateSyntheticGame(awayRoster, homeRoster, {
      seed: Date.now(),
      gameNumber: gameNum,
    });

    // Generate play-by-play entries
    const playByPlay = generatePlayByPlay(game);

    // Show overlay with team names from the generated game
    setSimPlayByPlay(playByPlay);
    setSimResult({ away: game.awayScore, home: game.homeScore });
    setSimAwayName(game.awayTeamName);
    setSimHomeName(game.homeTeamName);
    setIsSimulating(true);

    // Process through real pipeline (runs while animation plays)
    const seasonId = franchiseId ? `${franchiseId}-season-${currentSeason}` : `season-${currentSeason}`;

    try {
      await processCompletedGame(game, { seasonId });
    } catch (err) {
      console.error('[handleSimulate] processCompletedGame failed:', err);
    }

    try {
      if (nextGame) {
        const winningTeam = game.homeScore > game.awayScore ? homeId : awayId;
        const losingTeam = game.homeScore > game.awayScore ? awayId : homeId;
        const result = {
          awayScore: game.awayScore,
          homeScore: game.homeScore,
          winningTeamId: winningTeam,
          losingTeamId: losingTeam,
          gameLogId: game.gameId,
        };
        await scheduleData.completeGame(nextGame.id, result);
      }
    } catch (err) {
      console.error('[handleSimulate] scheduleData.completeGame failed:', err);
    }
  };

  const handleSimulationComplete = async () => {
    setIsSimulating(false);
    setSimPlayByPlay([]);
    setSimResult(null);
    setSimAwayName('');
    setSimHomeName('');
    await onDataRefresh();
    await scheduleData.refresh();
    await checkSeasonComplete();
  };

  // ============================================
  // SCOPE HELPERS — get games by scope
  // ============================================

  /**
   * Get upcoming (SCHEDULED) games for a given scope.
   * - "today": all games on the same dayNumber as the next game
   * - "week": next 7 unique dayNumbers worth of games
   * - "season": all remaining scheduled games
   */
  function getGamesByScope(scope: 'today' | 'week' | 'season'): ScheduledGame[] {
    const upcoming = scheduleData.upcomingGames ?? []; // already filtered to SCHEDULED
    if (upcoming.length === 0) return [];

    const firstDay = upcoming[0].dayNumber;

    switch (scope) {
      case 'today':
        return upcoming.filter((g) => g.dayNumber === firstDay);
      case 'week': {
        // Collect up to 7 unique day numbers
        const days = new Set<number>();
        for (const g of upcoming) {
          days.add(g.dayNumber);
          if (days.size >= 7) break;
        }
        return upcoming.filter((g) => days.has(g.dayNumber));
      }
      case 'season':
        return [...upcoming];
    }
  }

  // ============================================
  // BATCH SIMULATE
  // ============================================

  const handleBatchSimulate = async (scope: 'today' | 'week' | 'season') => {
    setConfirmAction(null);

    const games = getGamesByScope(scope);
    if (games.length === 0) return;

    setBatchType('simulate');
    setBatchTotal(games.length);
    setBatchCurrent(0);
    setIsBatchRunning(true);

    const batchSeasonId = franchiseId ? `${franchiseId}-season-${currentSeason}` : `season-${currentSeason}`;
    let processed = 0;

    for (const game of games) {
      try {
        // Build real rosters and generate full synthetic game with player stats
        const awayRoster = await buildRosterFromPlayers(game.awayTeamId, game.awayTeamId.toUpperCase());
        const homeRoster = await buildRosterFromPlayers(game.homeTeamId, game.homeTeamId.toUpperCase());

        const syntheticGame = generateSyntheticGame(awayRoster, homeRoster, {
          seed: Date.now() + processed,
          gameNumber: game.gameNumber ?? processed + 1,
        });

        // Process through full stats pipeline (batting, pitching, fielding, fame)
        await processCompletedGame(syntheticGame, { seasonId: batchSeasonId });

        // Update schedule with result
        const winningTeam = syntheticGame.homeScore > syntheticGame.awayScore ? game.homeTeamId : game.awayTeamId;
        const losingTeam = syntheticGame.homeScore > syntheticGame.awayScore ? game.awayTeamId : game.homeTeamId;

        await scheduleData.completeGame(game.id, {
          awayScore: syntheticGame.awayScore,
          homeScore: syntheticGame.homeScore,
          winningTeamId: winningTeam,
          losingTeamId: losingTeam,
          gameLogId: syntheticGame.gameId,
        });
      } catch (err) {
        console.error(`Failed to simulate game ${game.id}:`, err);
      }

      processed++;
      setBatchCurrent(processed);
    }

    // Refresh will happen in handleBatchComplete
  };

  // ============================================
  // BATCH SKIP
  // ============================================

  const handleBatchSkip = async (scope: 'today' | 'week' | 'season') => {
    setConfirmAction(null);

    const games = getGamesByScope(scope);
    if (games.length === 0) return;

    setBatchType('skip');
    setBatchTotal(games.length);
    setBatchCurrent(0);
    setIsBatchRunning(true);

    let processed = 0;

    for (const game of games) {
      try {
        await scheduleData.updateStatus(game.id, 'SKIPPED');
      } catch (err) {
        console.error(`Failed to skip game ${game.id}:`, err);
      }

      processed++;
      setBatchCurrent(processed);
    }

    // Refresh will happen in handleBatchComplete
  };

  const handleBatchComplete = async () => {
    const type = batchType;
    const count = batchTotal;

    setIsBatchRunning(false);
    setBatchType(null);
    setBatchCurrent(0);
    setBatchTotal(0);

    await onDataRefresh();
    await scheduleData.refresh();

    if (type === 'simulate') {
      setToastMessage(`${count} game${count !== 1 ? 's' : ''} simulated`);
    } else {
      setToastMessage(`${count} game${count !== 1 ? 's' : ''} skipped`);
    }

    // Check if season is now complete
    await checkSeasonComplete();
  };

  const handleSkip = async () => {
    setConfirmAction(null);

    const nextGame = scheduleData.nextGame;
    if (!nextGame) return;

    const away = nextGame.awayTeamId.toUpperCase();
    const home = nextGame.homeTeamId.toUpperCase();

    try {
      // Mark as SKIPPED — no stats, no standings impact, game ceases to exist
      await scheduleData.updateStatus(nextGame.id, 'SKIPPED');

      // Refresh data so nextGame advances
      await onDataRefresh();

      // Show toast
      setToastMessage(`Game skipped \u2014 ${away} vs ${home} removed from schedule`);

      // Check if season is now complete
      await checkSeasonComplete();
    } catch (err) {
      console.error('Failed to skip game:', err);
    }
  };

  // Season progress numbers
  const completedCount = (scheduleData.completedGames ?? []).length;
  const skippedCount = allGames.filter(g => g.status === 'SKIPPED').length;
  const resolvedCount = completedCount + skippedCount;
  const totalScheduled = allGames.length;
  const gamesPerTeam = franchiseData.franchiseConfig?.season?.gamesPerTeam ?? totalScheduled;

  return (
    <div className="space-y-4">
      {/* Season complete banner */}
      {seasonComplete && (
        <div className="bg-[#C4A853] border-[6px] border-[#9A7B2C] p-6 text-center">
          <div className="text-2xl text-[#1a1a1a] mb-2" style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.3)' }}>
            REGULAR SEASON COMPLETE
          </div>
          <div className="text-sm text-[#1a1a1a]/80 mb-1">
            {completedCount} game{completedCount !== 1 ? 's' : ''} played
            {skippedCount > 0 && ` / ${skippedCount} skipped`}
          </div>
          <div className="text-[10px] text-[#1a1a1a]/60 mb-3">
            Season {currentSeason} ({gamesPerTeam} games per team)
          </div>
          <button
            onClick={() => navigate(`/franchise/${franchiseId}/season-summary`)}
            className="bg-[#1a1a1a] border-[4px] border-[#9A7B2C] py-3 px-8 text-sm text-[#C4A853] hover:bg-[#2a2a2a] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]"
            style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.5)' }}
          >
            VIEW SEASON SUMMARY
          </button>
        </div>
      )}

      {/* Next game card */}
      {!seasonComplete && scheduleData.nextGame && (
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4 relative">
        <div className="text-[8px] text-[#E8E8D8] mb-3">▶ NEXT GAME{scheduleData.nextGame.date ? ` • ${scheduleData.nextGame.date}` : ''}</div>
        <div className="grid grid-cols-3 gap-4 items-center mb-4">
          <div className="text-center">
            <div className="text-lg text-[#E8E8D8]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{awayTeamId.toUpperCase()}</div>
            <div className="text-[8px] text-[#E8E8D8]">{franchiseData.nextGame?.awayRecord ?? ''}</div>
          </div>

          <div className="text-center">
            <div className="text-2xl text-[#E8E8D8]">vs</div>
            <div className="text-[7px] text-[#E8E8D8]/70 italic mt-1">{franchiseData.stadiumMap[homeTeamId] || homeTeamId.toUpperCase()}</div>
          </div>

          <div className="text-center">
            <div className="text-lg text-[#E8E8D8]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{homeTeamId.toUpperCase()}</div>
            <div className="text-[8px] text-[#E8E8D8]">{franchiseData.nextGame?.homeRecord ?? ''}</div>
          </div>
        </div>

        <div className="space-y-2">
          {/* Row 1: Play / Score */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setConfirmAction("play")}
              className="bg-[#5A8352] border-[5px] border-[#4A6844] py-3 px-8 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              PLAY GAME
            </button>
            <button
              onClick={() => setConfirmAction("watch")}
              className="bg-[#4A6844] border-[5px] border-[#5A8352] py-3 px-4 text-[10px] text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              SCORE GAME
            </button>
          </div>

          {/* Row 2: Single game simulate / skip */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setConfirmAction("simulate")}
              className="bg-[#4A6844] border-[5px] border-[#5A8352] py-2 px-4 text-[10px] text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] whitespace-nowrap"
            >
              SIM 1 GAME
            </button>
            <button
              onClick={() => setConfirmAction("skip")}
              className="bg-[#4A6844] border-[5px] border-[#5A8352] py-2 px-4 text-[10px] text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] whitespace-nowrap"
            >
              SKIP 1 GAME
            </button>
          </div>

          {/* Row 3: Batch simulate options */}
          <div className="flex gap-1 justify-center flex-wrap">
            <button
              onClick={() => setConfirmAction("sim-today")}
              className="bg-[#3F5A3A] border-[3px] border-[#5A8352] py-1 px-3 text-[8px] text-[#E8E8D8] hover:bg-[#4A6844] active:scale-95 transition-transform"
            >
              SIM TODAY ({getGamesByScope('today').length})
            </button>
            <button
              onClick={() => setConfirmAction("sim-week")}
              className="bg-[#3F5A3A] border-[3px] border-[#5A8352] py-1 px-3 text-[8px] text-[#E8E8D8] hover:bg-[#4A6844] active:scale-95 transition-transform"
            >
              SIM WEEK ({getGamesByScope('week').length})
            </button>
            <button
              onClick={() => setConfirmAction("sim-season")}
              className="bg-[#3F5A3A] border-[3px] border-[#5A8352] py-1 px-3 text-[8px] text-[#E8E8D8] hover:bg-[#4A6844] active:scale-95 transition-transform"
            >
              SIM SEASON ({getGamesByScope('season').length})
            </button>
          </div>

          {/* Row 4: Batch skip options */}
          <div className="flex gap-1 justify-center flex-wrap">
            <button
              onClick={() => setConfirmAction("skip-today")}
              className="bg-[#3F5A3A] border-[3px] border-[#5A8352] py-1 px-3 text-[8px] text-[#E8E8D8]/70 hover:bg-[#4A6844] active:scale-95 transition-transform"
            >
              SKIP TODAY ({getGamesByScope('today').length})
            </button>
            <button
              onClick={() => setConfirmAction("skip-week")}
              className="bg-[#3F5A3A] border-[3px] border-[#5A8352] py-1 px-3 text-[8px] text-[#E8E8D8]/70 hover:bg-[#4A6844] active:scale-95 transition-transform"
            >
              SKIP WEEK ({getGamesByScope('week').length})
            </button>
            <button
              onClick={() => setConfirmAction("skip-season")}
              className="bg-[#3F5A3A] border-[3px] border-[#5A8352] py-1 px-3 text-[8px] text-[#E8E8D8]/70 hover:bg-[#4A6844] active:scale-95 transition-transform"
            >
              SKIP SEASON ({getGamesByScope('season').length})
            </button>
          </div>
        </div>

        <div className="absolute bottom-2 right-2 text-[8px] text-[#E8E8D8]">
          GAME {resolvedCount + 1}/{totalScheduled}
        </div>
      </div>
      )}

      {/* Beat writers button */}
      <div>
        <button
          onClick={() => setShowBeatWriters(!showBeatWriters)}
          className="bg-[#6B9462] border-[5px] border-[#4A6844] py-3 px-6 text-[10px] text-[#E8E8D8] hover:bg-[#5A8352] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center gap-2"
        >
          <span>BEAT WRITERS</span>
          {showBeatWriters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Beat writers expandable section — empty state (no narrative engine yet) */}
      {showBeatWriters && (
        <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-4">
          <div className="text-[8px] text-[#E8E8D8] mb-3">▶ LATEST FROM BEAT WRITERS</div>
          <div className="text-center py-6">
            <div className="text-[10px] text-[#E8E8D8]/50">No beat writer stories yet</div>
            <div className="text-[8px] text-[#E8E8D8]/30 mt-1">Stories will appear as the season progresses</div>
          </div>
          <div className="mt-3 text-[8px] text-[#E8E8D8] text-center">
            FOLLOW BEAT WRITERS ON X FOR REAL-TIME UPDATES
          </div>
        </div>
      )}

      {/* Head-to-head button */}
      <div>
        <button
          onClick={() => setShowHeadToHead(!showHeadToHead)}
          className="bg-[#6B9462] border-[5px] border-[#4A6844] py-3 px-6 text-[10px] text-[#E8E8D8] hover:bg-[#5A8352] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center gap-2"
        >
          <span>HEAD-TO-HEAD HISTORY</span>
          {showHeadToHead ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Head-to-head expandable section — empty state (needs completedGames query) */}
      {showHeadToHead && (
        <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-4">
          <div className="text-[8px] text-[#E8E8D8] mb-3">▶ RECENT MATCHUPS ({awayTeamId.toUpperCase()} vs {homeTeamId.toUpperCase()})</div>
          <div className="text-center py-6">
            <div className="text-[10px] text-[#E8E8D8]/50">No head-to-head history yet</div>
            <div className="text-[8px] text-[#E8E8D8]/30 mt-1">Results will appear after these teams play each other</div>
          </div>
        </div>
      )}

      {/* Team status */}
      <div className="grid grid-cols-2 gap-4">
        {/* Away Team Stats */}
        <div>
          <button
            onClick={() => setShowAwayTeamStats(!showAwayTeamStats)}
            className="w-full bg-[#6B9462] border-[5px] border-[#4A6844] py-3 px-6 text-[10px] text-[#E8E8D8] hover:bg-[#5A8352] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-between"
          >
            <div className="flex-1 text-center">
              <div className="text-[10px] tracking-wide uppercase" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.4)' }}>
                {awayTeamId}
              </div>
              <div className="text-[7px] text-[#E8E8D8]/80 mt-1">{getTeamRecord(awayTeamId)}</div>
            </div>
            {showAwayTeamStats ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showAwayTeamStats && (
            <div className="bg-[#6B9462] border-4 border-[#4A6844] border-t-0 p-4 overflow-y-auto max-h-[600px]">
              <div className="text-center text-[9px] text-[#E8E8D8]/50 py-4">
                No stats yet — play games to see team leaders.
              </div>
            </div>
          )}
        </div>

        {/* Home Team Stats */}
        <div>
          <button
            onClick={() => setShowHomeTeamStats(!showHomeTeamStats)}
            className="w-full bg-[#6B9462] border-[5px] border-[#4A6844] py-3 px-6 text-[10px] text-[#E8E8D8] hover:bg-[#5A8352] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-between"
          >
            <div className="flex-1 text-center">
              <div className="text-[10px] tracking-wide uppercase" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.4)' }}>
                {homeTeamId}
              </div>
              <div className="text-[7px] text-[#E8E8D8]/80 mt-1">{getTeamRecord(homeTeamId)}</div>
            </div>
            {showHomeTeamStats ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showHomeTeamStats && (
            <div className="bg-[#6B9462] border-4 border-[#4A6844] border-t-0 p-4 overflow-y-auto max-h-[600px]">
              <div className="text-center text-[9px] text-[#E8E8D8]/50 py-4">
                No stats yet — play games to see team leaders.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-6 max-w-md">
            <div className="text-lg text-[#E8E8D8] mb-4 text-center">ARE YOU SURE?</div>
            <div className="text-sm text-[#E8E8D8] mb-6 text-center">
              {confirmAction === "play" && "Start playing this game?"}
              {confirmAction === "watch" && "Watch this game?"}
              {confirmAction === "simulate" && "Simulate this game? Full player stats will be generated."}
              {confirmAction === "skip" && "Skip this game? It will be removed from the schedule entirely."}
              {confirmAction === "sim-today" && `Simulate ${getGamesByScope('today').length} game(s) for today? W/L outcomes and standings will be updated.`}
              {confirmAction === "sim-week" && `Simulate ${getGamesByScope('week').length} game(s) this week? W/L outcomes and standings will be updated.`}
              {confirmAction === "sim-season" && `Simulate ${getGamesByScope('season').length} remaining game(s)? W/L outcomes and standings will be updated.`}
              {confirmAction === "skip-today" && `Skip ${getGamesByScope('today').length} game(s) for today? They will be removed from the schedule.`}
              {confirmAction === "skip-week" && `Skip ${getGamesByScope('week').length} game(s) this week? They will be removed from the schedule.`}
              {confirmAction === "skip-season" && `Skip ${getGamesByScope('season').length} remaining game(s)? They will be removed from the schedule.`}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 bg-[#4A6844] border-[5px] border-[#5A8352] py-3 text-sm text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  if (confirmAction === "play") handlePlayGame();
                  else if (confirmAction === "watch") handlePlayGame();
                  else if (confirmAction === "simulate") handleSimulate();
                  else if (confirmAction === "skip") handleSkip();
                  else if (confirmAction === "sim-today") handleBatchSimulate('today');
                  else if (confirmAction === "sim-week") handleBatchSimulate('week');
                  else if (confirmAction === "sim-season") handleBatchSimulate('season');
                  else if (confirmAction === "skip-today") handleBatchSkip('today');
                  else if (confirmAction === "skip-week") handleBatchSkip('week');
                  else if (confirmAction === "skip-season") handleBatchSkip('season');
                }}
                className="flex-1 bg-[#5A8352] border-[5px] border-[#4A6844] py-3 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-[#4A6844] border-[4px] border-[#C4A853] px-6 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">
            <div className="text-[11px] text-[#E8E8D8] whitespace-nowrap">
              {toastMessage}
            </div>
          </div>
        </div>
      )}

      {/* Simulation overlay */}
      <SimulationOverlay
        isOpen={isSimulating}
        playByPlay={simPlayByPlay}
        awayTeamName={simAwayName || awayTeamId.toUpperCase()}
        homeTeamName={simHomeName || homeTeamId.toUpperCase()}
        finalAwayScore={simResult?.away ?? 0}
        finalHomeScore={simResult?.home ?? 0}
        onComplete={handleSimulationComplete}
      />

      {/* Batch operation overlay */}
      <BatchOperationOverlay
        isOpen={isBatchRunning}
        operationType={batchType ?? 'simulate'}
        current={batchCurrent}
        total={batchTotal}
        onComplete={handleBatchComplete}
      />
    </div>
  );
}


function LeagueLeadersContent() {
  const [expandedSection, setExpandedSection] = useState<string | null>("leaders");
  const [expandedBattingStat, setExpandedBattingStat] = useState<string | null>(null);
  const [expandedPitchingStat, setExpandedPitchingStat] = useState<string | null>(null);
  const [expandedLeague, setExpandedLeague] = useState<string | null>("al");

  // Get leaders from context (real data or mock fallback)
  const franchiseData = useFranchiseDataContext();

  // Use real batting/pitching leaders from franchise data
  // Single league — both AL/NL views show the same real data
  const battingLeadersDataAL = franchiseData.battingLeaders;
  const pitchingLeadersDataAL = franchiseData.pitchingLeaders;
  const battingLeadersDataNL = franchiseData.battingLeaders;
  const pitchingLeadersDataNL = franchiseData.pitchingLeaders;

  // Derive summary cards from real leaders data (top value per category)
  const makeSummary = (data: Record<string, { value: string }[]>) =>
    Object.entries(data).map(([stat, entries]) => ({
      stat,
      value: entries[0]?.value ?? '—',
    }));

  const battingLeadersAL = makeSummary(battingLeadersDataAL as unknown as Record<string, { value: string }[]>);
  const battingLeadersNL = makeSummary(battingLeadersDataNL as unknown as Record<string, { value: string }[]>);
  const pitchingLeadersAL = makeSummary(pitchingLeadersDataAL as unknown as Record<string, { value: string }[]>);
  const pitchingLeadersNL = makeSummary(pitchingLeadersDataNL as unknown as Record<string, { value: string }[]>);

  // Empty award race data — will be populated from fWAR calculations when games are played
  const goldGloveLeadersAL: { position: string; player: string; team: string; tier: string; fWAR: string }[] = [];
  const boogerGloveLeaderAL = { position: "", player: "", team: "", tier: "BOOGER", fWAR: "" };
  const goldGloveLeadersNL: { position: string; player: string; team: string; tier: string; fWAR: string }[] = [];
  const boogerGloveLeaderNL = { position: "", player: "", team: "", tier: "BOOGER", fWAR: "" };

  const silverSluggerLeadersAL: { position: string; player: string; team: string }[] = [];
  const silverSluggerLeadersNL: { position: string; player: string; team: string }[] = [];

  const majorAwardsLeadersAL: { award: string; player: string; team: string; stats: string }[] = [];
  const majorAwardsLeadersNL: { award: string; player: string; team: string; stats: string }[] = [];

  const leagueWideAwardsLeaders: { award: string; player: string; team: string; stats: string }[] = [];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "PLATINUM": return "#E5E4E2";
      case "GOLD": return "#FFD700";
      case "BOOGER": return "#9ACD32";
      default: return "#FFD700";
    }
  };

  return (
    <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
      {/* Season 1 Leaders Header */}
      <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-4 text-center">
        <div className="text-2xl text-[#E8E8D8] mb-1" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.2)' }}>
          SEASON 1 AWARDS RACE
        </div>
        <div className="text-[8px] text-[#E8E8D8]/70">CURRENT LEADERS & VOTING TRACKER</div>
      </div>

      {/* League Leaders Section */}
      <div>
        <button
          onClick={() => toggleSection("leaders")}
          className="w-full bg-[#6B9462] border-[5px] border-[#4A6844] py-3 px-4 text-[10px] text-[#E8E8D8] hover:bg-[#5A8352] active:scale-[0.99] transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-between"
        >
          <span>▶ LEAGUE LEADERS</span>
          {expandedSection === "leaders" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {expandedSection === "leaders" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] border-t-0 p-4">
            {/* League toggles */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setExpandedLeague("al")}
                className={`flex-1 py-2 px-4 border-[4px] border-[#4A6844] transition ${
                  expandedLeague === "al" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[10px] font-bold">EASTERN LEAGUE</div>
              </button>
              <button
                onClick={() => setExpandedLeague("nl")}
                className={`flex-1 py-2 px-4 border-[4px] border-[#4A6844] transition ${
                  expandedLeague === "nl" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[10px] font-bold">WESTERN LEAGUE</div>
              </button>
            </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Batting Leaders */}
          <div>
            <div className="bg-[#4A6844] border-[4px] border-[#5A8352] p-2 mb-2">
              <div className="text-[8px] text-[#E8E8D8] text-center">BATTING LEADERS</div>
            </div>
            <div className="space-y-1">
              {(expandedLeague === "al" ? battingLeadersAL : battingLeadersNL).map((leader, index) => {
                const battingData = expandedLeague === "al" ? battingLeadersDataAL : battingLeadersDataNL;
                return (
                  <div key={index}>
                    <button
                      onClick={() => setExpandedBattingStat(expandedBattingStat === leader.stat ? null : leader.stat)}
                      className="w-full bg-[#5A8352] border-[3px] border-[#4A6844] p-2 hover:bg-[#4F7D4B] transition"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="text-[8px] text-[#E8E8D8] font-bold">{leader.stat}</div>
                          {expandedBattingStat === leader.stat ? (
                            <ChevronUp className="w-3 h-3 text-[#E8E8D8]" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-[#E8E8D8]" />
                          )}
                        </div>
                        <div className="text-[10px] text-[#E8E8D8] font-bold">{leader.value}</div>
                      </div>
                      <div className="text-[8px] text-[#E8E8D8]/70 text-left">
                        {battingData[leader.stat as keyof typeof battingData]?.[0]?.player ?? 'N/A'} (
                        {battingData[leader.stat as keyof typeof battingData]?.[0]?.team ?? 'N/A'})
                      </div>
                    </button>
                    
                    {expandedBattingStat === leader.stat && (
                      <div className="bg-[#4A6844] border-[3px] border-[#5A8352] border-t-0 p-2">
                        <div className="text-[7px] text-[#E8E8D8] font-bold mb-1">TOP 5</div>
                        {(battingData[leader.stat as keyof typeof battingData] ?? []).map((player, pIndex) => (
                          <div 
                            key={pIndex} 
                            className="flex justify-between items-center py-1 border-b border-[#5A8352] last:border-b-0"
                          >
                            <div className="text-[8px] text-[#E8E8D8]">
                              {pIndex + 1}. {player.player} ({player.team})
                            </div>
                            <div className="text-[8px] text-[#E8E8D8] font-bold">{player.value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pitching Leaders */}
          <div>
            <div className="bg-[#4A6844] border-[4px] border-[#5A8352] p-2 mb-2">
              <div className="text-[8px] text-[#E8E8D8] text-center">PITCHING LEADERS</div>
            </div>
            <div className="space-y-1">
              {(expandedLeague === "al" ? pitchingLeadersAL : pitchingLeadersNL).map((leader, index) => {
                const pitchingData = expandedLeague === "al" ? pitchingLeadersDataAL : pitchingLeadersDataNL;
                return (
                  <div key={index}>
                    <button
                      onClick={() => setExpandedPitchingStat(expandedPitchingStat === leader.stat ? null : leader.stat)}
                      className="w-full bg-[#5A8352] border-[3px] border-[#4A6844] p-2 hover:bg-[#4F7D4B] transition"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="text-[8px] text-[#E8E8D8] font-bold">{leader.stat}</div>
                          {expandedPitchingStat === leader.stat ? (
                            <ChevronUp className="w-3 h-3 text-[#E8E8D8]" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-[#E8E8D8]" />
                          )}
                        </div>
                        <div className="text-[10px] text-[#E8E8D8] font-bold">{leader.value}</div>
                      </div>
                      <div className="text-[8px] text-[#E8E8D8]/70 text-left">
                        {pitchingData[leader.stat as keyof typeof pitchingData]?.[0]?.player ?? 'N/A'} (
                        {pitchingData[leader.stat as keyof typeof pitchingData]?.[0]?.team ?? 'N/A'})
                      </div>
                    </button>

                    {expandedPitchingStat === leader.stat && (
                      <div className="bg-[#4A6844] border-[3px] border-[#5A8352] border-t-0 p-2">
                        <div className="text-[7px] text-[#E8E8D8] font-bold mb-1">TOP 5</div>
                        {(pitchingData[leader.stat as keyof typeof pitchingData] ?? []).map((player, pIndex) => (
                          <div 
                            key={pIndex} 
                            className="flex justify-between items-center py-1 border-b border-[#5A8352] last:border-b-0"
                          >
                            <div className="text-[8px] text-[#E8E8D8]">
                              {pIndex + 1}. {player.player} ({player.team})
                            </div>
                            <div className="text-[8px] text-[#E8E8D8] font-bold">{player.value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
          </div>
        )}
      </div>

      {/* Fielding Awards Section */}
      <div>
        <button
          onClick={() => toggleSection("gloves")}
          className="w-full bg-[#FFD700] border-[5px] border-black py-3 px-4 text-[10px] text-black hover:bg-[#DAA520] active:scale-[0.99] transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-between"
        >
          <span>▶ GOLD / PLATINUM / BOOGER GLOVES RACE</span>
          {expandedSection === "gloves" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {expandedSection === "gloves" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] border-t-0 p-4">
            {/* League toggles */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setExpandedLeague("al")}
                className={`flex-1 py-2 px-4 border-[4px] border-[#4A6844] transition ${
                  expandedLeague === "al" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[10px] font-bold">EASTERN LEAGUE</div>
              </button>
              <button
                onClick={() => setExpandedLeague("nl")}
                className={`flex-1 py-2 px-4 border-[4px] border-[#4A6844] transition ${
                  expandedLeague === "nl" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[10px] font-bold">WESTERN LEAGUE</div>
              </button>
            </div>

            {/* Display selected league */}
            <div className="grid grid-cols-3 gap-2">
              {(expandedLeague === "al" ? goldGloveLeadersAL : goldGloveLeadersNL).map((leader, index) => (
                <div 
                  key={index} 
                  className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm text-[#E8E8D8] font-bold">{leader.position}</div>
                    {leader.tier === "Gold Glove" && (
                      <Trophy className="w-5 h-5 text-[#FFD700]" />
                    )}
                    {leader.tier === "Platinum Glove" && (
                      <Trophy className="w-5 h-5 text-[#C0C0C0]" />
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-[#E8E8D8]">{leader.player}</div>
                    <div className="text-[8px] text-[#E8E8D8]/70">{leader.team}</div>
                    <div className="mt-2 text-[7px] text-[#E8E8D8] font-bold">{leader.tier}</div>
                    <div className="text-[7px] text-[#E8E8D8]/70">fWAR: {leader.fWAR}</div>
                  </div>
                </div>
              ))}
              <div 
                className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3"
              >
                <div className="text-sm text-[#E8E8D8] font-bold mb-2">{expandedLeague === "al" ? boogerGloveLeaderAL.position : boogerGloveLeaderNL.position}</div>
                <div className="text-center">
                  <div className="text-[8px] text-[#E8E8D8]">{expandedLeague === "al" ? boogerGloveLeaderAL.player : boogerGloveLeaderNL.player}</div>
                  <div className="text-[8px] text-[#E8E8D8]/70">{expandedLeague === "al" ? boogerGloveLeaderAL.team : boogerGloveLeaderNL.team}</div>
                  <div className="mt-2 text-[7px] text-[#E8E8D8] font-bold">{expandedLeague === "al" ? boogerGloveLeaderAL.tier : boogerGloveLeaderNL.tier}</div>
                  <div className="text-[7px] text-[#E8E8D8]/70">fWAR: {expandedLeague === "al" ? boogerGloveLeaderAL.fWAR : boogerGloveLeaderNL.fWAR}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Silver Sluggers Section */}
      <div>
        <button
          onClick={() => toggleSection("sluggers")}
          className="w-full bg-[#C0C0C0] border-[5px] border-black py-3 px-4 text-[10px] text-black hover:bg-[#D0D0D0] active:scale-[0.99] transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-between"
        >
          <span>▶ SILVER SLUGGERS RACE</span>
          {expandedSection === "sluggers" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {expandedSection === "sluggers" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] border-t-0 p-4">
            {/* League toggles */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setExpandedLeague("al")}
                className={`flex-1 py-2 px-4 border-[4px] border-[#4A6844] transition ${
                  expandedLeague === "al" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[10px] font-bold">EASTERN LEAGUE</div>
              </button>
              <button
                onClick={() => setExpandedLeague("nl")}
                className={`flex-1 py-2 px-4 border-[4px] border-[#4A6844] transition ${
                  expandedLeague === "nl" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[10px] font-bold">WESTERN LEAGUE</div>
              </button>
            </div>

            {/* Display selected league */}
            <div className="grid grid-cols-3 gap-2">
              {(expandedLeague === "al" ? silverSluggerLeadersAL : silverSluggerLeadersNL).map((leader, index) => (
                <div key={index} className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="text-center">
                    <div className="text-sm text-[#E8E8D8] font-bold mb-1">{leader.position}</div>
                    <div className="text-[8px] text-[#E8E8D8]">{leader.player}</div>
                    <div className="text-[8px] text-[#E8E8D8]/70">{leader.team}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Major Awards Section */}
      <div>
        <button
          onClick={() => toggleSection("major")}
          className="w-full bg-[#DD0000] border-[5px] border-black py-3 px-4 text-[10px] text-white hover:bg-[#EE1111] active:scale-[0.99] transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-between"
        >
          <span>▶ MAJOR AWARDS RACE</span>
          {expandedSection === "major" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {expandedSection === "major" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] border-t-0 p-4">
            {/* League toggles */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setExpandedLeague("al")}
                className={`flex-1 py-2 px-4 border-[4px] border-[#4A6844] transition ${
                  expandedLeague === "al" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[10px] font-bold">EASTERN LEAGUE</div>
              </button>
              <button
                onClick={() => setExpandedLeague("nl")}
                className={`flex-1 py-2 px-4 border-[4px] border-[#4A6844] transition ${
                  expandedLeague === "nl" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[10px] font-bold">WESTERN LEAGUE</div>
              </button>
            </div>

            {/* Display selected league */}
            <div className="space-y-2">
              {(expandedLeague === "al" ? majorAwardsLeadersAL : majorAwardsLeadersNL).map((award, index) => (
                <div key={index} className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[10px] text-[#E8E8D8] font-bold mb-1">{award.award}</div>
                      <div className="text-[8px] text-[#E8E8D8]">{award.player} ({award.team})</div>
                      <div className="text-[8px] text-[#E8E8D8]/70 mt-1">{award.stats}</div>
                    </div>
                    {!award.award.includes("BUST OF THE YEAR") && (
                      <Trophy className="w-6 h-6 text-[#FFD700]" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* League-wide awards */}
            <div className="mt-4">
              <div className="bg-[#4A6844] border-[4px] border-[#5A8352] p-2 mb-2">
                <div className="text-[10px] text-[#E8E8D8] text-center font-bold">LEAGUE-WIDE AWARDS</div>
              </div>
              <div className="space-y-2">
                {leagueWideAwardsLeaders.map((award, index) => (
                  <div key={index} className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[10px] text-[#E8E8D8] font-bold mb-1">{award.award}</div>
                        <div className="text-[8px] text-[#E8E8D8]">{award.player} ({award.team})</div>
                        <div className="text-[8px] text-[#E8E8D8]/70 mt-1">{award.stats}</div>
                      </div>
                      <Trophy className="w-6 h-6 text-[#FFD700]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function BeatReporterNews() {
  const [newsFilter, setNewsFilter] = useState<"all" | "league" | "team">("all");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);

  // Empty news data — will be populated by narrative engine when games are played
  const newsArticles: {
    id: number;
    type: string;
    headline: string;
    excerpt: string;
    fullText: string;
    reporter: string;
    team: string | null;
    timestamp: string;
    category: string;
  }[] = [];

  const teams: string[] = [];

  const filteredArticles = newsArticles.filter(article => {
    if (newsFilter === "league") return article.type === "league";
    if (newsFilter === "team") {
      if (selectedTeam) return article.team === selectedTeam;
      return article.type === "team";
    }
    return true;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "STANDINGS": return "#0066FF";
      case "INJURY REPORT": return "#DD0000";
      case "LEAGUE NEWS": return "#7733DD";
      case "RECORDS WATCH": return "#FFD700";
      case "TRADE RUMORS": return "#CC44CC";
      case "COMMUNITY": return "#5599FF";
      case "CLUBHOUSE": return "#3366FF";
      case "FRANCHISE": return "#0066FF";
      case "AWARDS WATCH": return "#FFD700";
      case "PROSPECTS": return "#5599FF";
      default: return "#7733DD";
    }
  };

  return (
    <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
      {/* Header */}
      <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-4 text-center">
        <div className="text-2xl text-[#E8E8D8] mb-1" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.2)' }}>
          YOUR DAILY SQUINCH
        </div>
        <div className="text-[8px] text-[#E8E8D8]/70">LATEST STORIES FROM AROUND THE LEAGUE</div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setNewsFilter("all");
              setSelectedTeam(null);
            }}
            className={`flex-1 py-3 px-4 border-[5px] transition shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] ${
              newsFilter === "all" 
                ? "bg-[#5A8352] border-[#4A6844] text-[#E8E8D8]" 
                : "bg-[#4A6844] border-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#3F5A3A]"
            }`}
          >
            <div className="text-[10px] font-bold">ALL NEWS</div>
          </button>
          <button
            onClick={() => {
              setNewsFilter("league");
              setSelectedTeam(null);
            }}
            className={`flex-1 py-3 px-4 border-[5px] transition shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] ${
              newsFilter === "league" 
                ? "bg-[#5A8352] border-[#4A6844] text-[#E8E8D8]" 
                : "bg-[#4A6844] border-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#3F5A3A]"
            }`}
          >
            <div className="text-[10px] font-bold">LEAGUE-WIDE</div>
          </button>
          <button
            onClick={() => setNewsFilter("team")}
            className={`flex-1 py-3 px-4 border-[5px] transition shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] ${
              newsFilter === "team" 
                ? "bg-[#5A8352] border-[#4A6844] text-[#E8E8D8]" 
                : "bg-[#4A6844] border-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#3F5A3A]"
            }`}
          >
            <div className="text-[10px] font-bold">TEAM REPORTS</div>
          </button>
        </div>

        {/* Team Filter */}
        {newsFilter === "team" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-3">
            <div className="text-[8px] text-[#E8E8D8] mb-2">FILTER BY TEAM</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedTeam(null)}
                className={`py-2 px-3 border-[4px] transition text-[8px] ${
                  selectedTeam === null
                    ? "bg-[#5A8352] border-[#4A6844] text-[#E8E8D8]"
                    : "bg-[#4A6844] border-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#3F5A3A]"
                }`}
              >
                ALL TEAMS
              </button>
              {teams.map(team => (
                <button
                  key={team}
                  onClick={() => setSelectedTeam(team)}
                  className={`py-2 px-3 border-[4px] transition text-[8px] ${
                    selectedTeam === team
                      ? "bg-[#5A8352] border-[#4A6844] text-[#E8E8D8]"
                      : "bg-[#4A6844] border-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#3F5A3A]"
                  }`}
                >
                  {team.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* News Articles */}
      <div className="space-y-3">
        {filteredArticles.map(article => {
          const isExpanded = expandedArticle === article.id;
          return (
            <div
              key={article.id}
              onClick={() => setExpandedArticle(isExpanded ? null : article.id)}
              className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4 hover:bg-[#5A8352] transition cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              {/* Article Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div 
                      className="px-2 py-1 border-[3px] border-black text-[7px] font-bold"
                      style={{ backgroundColor: getCategoryColor(article.category), color: '#000' }}
                    >
                      {article.category}
                    </div>
                    {article.team && (
                      <div className="px-2 py-1 bg-[#4A6844] border-[3px] border-[#5A8352] text-[7px] text-[#E8E8D8]">
                        {article.team.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm text-[#E8E8D8] font-bold leading-tight mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
                    {article.headline}
                  </h3>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[#E8E8D8] ml-2 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#E8E8D8] ml-2 flex-shrink-0" />
                )}
              </div>

              {/* Article Body */}
              <p className="text-[10px] text-[#E8E8D8]/90 leading-relaxed mb-3">
                {isExpanded ? article.fullText : article.excerpt}
              </p>

              {/* Read More Indicator */}
              {!isExpanded && (
                <div className="text-[8px] text-[#E8E8D8]/70 mb-2 italic">
                  Click to read more...
                </div>
              )}

              {/* Article Footer */}
              <div className="flex items-center justify-between pt-2 border-t-2 border-[#4A6844]">
                <div className="flex items-center gap-2">
                  <Newspaper className="w-3 h-3 text-[#E8E8D8]/60" />
                  <span className="text-[8px] text-[#E8E8D8]/80">{article.reporter}</span>
                </div>
                <span className="text-[8px] text-[#E8E8D8]/60">{article.timestamp}</span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredArticles.length === 0 && (
        <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8 text-center">
          <div className="text-[10px] text-[#E8E8D8]/60">NO ARTICLES FOUND</div>
        </div>
      )}
    </div>
  );
}