import { useState, useEffect, useMemo, createContext, useContext, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
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
import { TradeFlow } from "@/app/components/TradeFlow";
import { SpringTrainingFlow } from "@/app/components/SpringTrainingFlow";
import { AddGameModal, type GameFormData } from "@/app/components/AddGameModal";
import { ScheduleContent } from "@/app/components/ScheduleContent";
import { useFranchiseData, type UseFranchiseDataReturn } from "@/hooks/useFranchiseData";
import { useScheduleData, type ScheduledGame } from "@/hooks/useScheduleData";
import { usePlayoffData, type PlayoffPlayerStats } from "@/hooks/usePlayoffData";
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
import { getAllGames, getAllGamesByFranchise } from "../../../utils/scheduleStorage";
import { getSeasonIdForScope } from "../../../utils/franchisePersistenceContract";
import { startOffseason, OFFSEASON_PHASES, type OffseasonPhase } from "../../../utils/offseasonStorage";
import { useOffseasonState } from "@/hooks/useOffseasonState";
import {
  repairFranchisePersistence,
} from "../../../utils/franchiseInitializer";
import { executeSeasonTransition } from "../../../engines/seasonTransitionEngine";
import { runJournaledFranchiseSeasonTransition } from "../../../utils/franchiseSeasonTransitionOrchestrator";
import { getTeam } from "../../../utils/leagueBuilderStorage";
import { getFranchiseTeam, saveFranchiseTeam } from "../../../utils/franchisePlayerStorage";
import { syncEngine } from "../../../utils/syncEngine";
import { getRecentGames } from "../../utils/gameStorage";
import { generateGameRecap } from "../engines/narrativeIntegration";
import type { Player as TeamRosterPlayer, Pitcher as TeamRosterPitcher } from "@/app/components/TeamRoster";
import { LineupPreview } from "@/app/components/LineupPreview";
import { PregameBenchmarkChecklist } from "@/app/components/PregameBenchmarkChecklist";
import { MilestoneWatchPanel } from "@/app/components/MilestoneWatchPanel";
import { getApproachingMilestones, type MilestoneWatch } from "../../../utils/milestoneDetector";
import { getAllCareerBatting, getAllCareerPitching } from "../../../utils/careerStorage";
import { getSeasonBattingStats, getSeasonPitchingStats } from "../../../utils/seasonStorage";
import {
  buildFranchiseGameTrackerRoster,
  buildFranchisePregameReadiness,
  collectFranchiseRosterPlayerIds,
} from "../utils/franchiseGameTrackerRoster";
import { withPregameManagerNavigationState } from "../utils/pregameNavigationState";
import {
  optimalLineupField,
  selectOptimalLineupForOpposingPitcher,
} from "../../../utils/optimalLineup";
import {
  buildCurrentLineupOptimalBenchmark,
  buildPregameBenchmarkIssues,
  buildPregameBenchmarkRows,
  upsertPregameBenchmark,
} from "../utils/pregameLineupBenchmarks";
import {
  LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
  resolveManagerForTeam,
} from "../../../utils/managerIdentityStorage";
import {
  getInitialRouteSeasonNumber,
  loadRouteSeasonNumber,
} from "../utils/franchiseRouteSeason";
import type {
  GameLockLineupSnapshots,
  OpposingPitcherHand,
  OptimalLineupSnapshot,
} from "../../../types/managerWpa";

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

const MODE_2_V1_SYNTHETIC_SIM_ENABLED = false;
const MODE_2_V1_TRANSACTION_UI_ENABLED = true;
const MODE_2_V1_ALL_STAR_UI_ENABLED = false;

async function getVisibleFranchiseTeam(franchiseId: string | undefined, teamId: string) {
  if (franchiseId) {
    const franchiseTeam = await getFranchiseTeam(franchiseId, teamId);
    if (franchiseTeam) return franchiseTeam;
  }
  return getTeam(teamId);
}

// ScheduledGame type is imported from useScheduleData hook

// Pre-game lineup review data
interface PreGameData {
  awayPlayers: TeamRosterPlayer[];
  awayPitchers: TeamRosterPitcher[];
  homePlayers: TeamRosterPlayer[];
  homePitchers: TeamRosterPitcher[];
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName: string;
  homeTeamName: string;
  gameNumber: number;
  scheduleGameId?: string;
  useDH: boolean;
  selectedAwayStarterIdx: number;
  selectedHomeStarterIdx: number;
  awayOptimalLineups?: {
    vsRHP?: OptimalLineupSnapshot;
    vsLHP?: OptimalLineupSnapshot;
  };
  homeOptimalLineups?: {
    vsRHP?: OptimalLineupSnapshot;
    vsLHP?: OptimalLineupSnapshot;
  };
  milestoneWatches?: MilestoneWatch[];
}

function getFranchiseStarterHand(
  pitcher: TeamRosterPitcher | undefined,
): OpposingPitcherHand {
  return (pitcher?.throwingHand || "R") === "L" ? "L" : "R";
}

export function resolveFranchiseGameUseDH(franchiseConfig: UseFranchiseDataReturn["franchiseConfig"]): boolean {
  return franchiseConfig?.season?.useDH ?? false;
}

function saveCurrentSeasonNumber(season: number): void {
  const value = String(season);
  localStorage.setItem('kbl-current-season', value);
  if (!syncEngine.isSuppressed()) {
    syncEngine.upsertLocal('kbl-current-season', value);
  }
}

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
  const [startSeasonError, setStartSeasonError] = useState<string | null>(null);
  const [isStartingNewSeason, setIsStartingNewSeason] = useState(false);
  const [retiredJerseys, setRetiredJerseys] = useState<RetiredJersey[]>([]);
  const [selectedScheduleTeam, setSelectedScheduleTeam] = useState<string>("FULL LEAGUE");

  // Schedule System State - Persisted to IndexedDB via useScheduleData
  // Franchise routes derive season from franchise metadata, not the global season marker.
  const [currentSeason, setCurrentSeason] = useState(() => getInitialRouteSeasonNumber(franchiseId));
  const activeSeasonId = getSeasonIdForScope(franchiseId, currentSeason);
  const scheduleData = useScheduleData(currentSeason, { franchiseId });

  // Real season data from IndexedDB (with mock fallbacks)
  const franchiseData = useFranchiseData(franchiseId, currentSeason);
  const franchiseLeagueId = franchiseData.franchiseConfig?.league || 'sml';
  const franchiseRepairPromise = useRef<Promise<void> | null>(null);

  const runFranchisePersistenceRepair = async () => {
    if (!franchiseId || !franchiseData.franchiseConfig?.league) return;

    if (!franchiseRepairPromise.current) {
      franchiseRepairPromise.current = repairFranchisePersistence(franchiseId, currentSeason)
        .then(async (result) => {
          if (
            result.rosterBackfilled ||
            result.seasonMetadataCreated ||
            result.seasonMetadataUpdated
          ) {
            await Promise.all([
              franchiseData.refresh(),
              scheduleData.refresh(),
            ]);
          }
        })
        .finally(() => {
          franchiseRepairPromise.current = null;
        });
    }

    await franchiseRepairPromise.current;
  };
  const [addGameModalOpen, setAddGameModalOpen] = useState(false);
  const [editingScheduleGame, setEditingScheduleGame] = useState<{
    id: string;
    gameNumber: number;
    dayNumber: number;
    date?: string;
    time?: string;
    awayTeamId: string;
    homeTeamId: string;
  } | null>(null);
  const [scoreOnlyGame, setScoreOnlyGame] = useState<ScheduledGame | null>(null);
  const [scoreOnlyAwayScore, setScoreOnlyAwayScore] = useState("");
  const [scoreOnlyHomeScore, setScoreOnlyHomeScore] = useState("");
  const [scoreOnlyError, setScoreOnlyError] = useState<string | null>(null);
  const [scoreOnlySaving, setScoreOnlySaving] = useState(false);

  // Bracket UI state
  const [expandedSeriesId, setExpandedSeriesId] = useState<string | null>(null);

  // Playoff System State - Persisted to IndexedDB via usePlayoffData
  const playoffData = usePlayoffData(currentSeason, { franchiseId });
  const location = useLocation();
  const locationState = (location.state ?? {}) as {
    refreshAfterGame?: boolean;
    refreshToken?: number;
  };
  const shouldRefreshAfterGame = Boolean(locationState.refreshAfterGame);
  const refreshToken = locationState.refreshToken ?? null;
  const lastRefreshToken = useRef<number | null>(null);
  const [playoffLeaderBatting, setPlayoffLeaderBatting] = useState<Record<string, PlayoffPlayerStats[]>>({});
  const [playoffLeaderPitching, setPlayoffLeaderPitching] = useState<Record<string, PlayoffPlayerStats[]>>({});
  const [playoffLeaderFielding, setPlayoffLeaderFielding] = useState<Record<string, PlayoffPlayerStats[]>>({});
  const [playoffLeadersLoading, setPlayoffLeadersLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadRouteSeasonNumber(franchiseId)
      .then((seasonNumber) => {
        if (!cancelled) {
          setCurrentSeason(seasonNumber);
        }
      })
      .catch((err) => {
        console.warn('[FranchiseHome] Failed to load route season number:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [franchiseId]);

  useEffect(() => {
    if (!franchiseId || !franchiseData.franchiseConfig?.league) return;

    void runFranchisePersistenceRepair().catch((err) => {
      console.warn('[FranchiseHome] Franchise persistence repair failed:', err);
    });
  }, [
    franchiseId,
    currentSeason,
    franchiseData.franchiseConfig?.league,
  ]);

  useEffect(() => {
    if (!shouldRefreshAfterGame || refreshToken === null) return;
    if (lastRefreshToken.current === refreshToken) return;
    lastRefreshToken.current = refreshToken;

    const refreshAll = async () => {
      try {
        await Promise.all([
          franchiseData.refresh(),
          scheduleData.refresh(),
          playoffData.refresh(),
        ]);
      } catch (err) {
        console.error('[FranchiseHome] Failed to refresh data after game completion:', err);
      }
    };

    refreshAll();
  }, [
    shouldRefreshAfterGame,
    refreshToken,
    franchiseData.refresh,
    scheduleData.refresh,
    playoffData.refresh,
  ]);

  useEffect(() => {
    if (activeTab !== "playoff-leaders" && activeTab !== "playoff-stats") return;
    if (!playoffData.playoff || playoffData.playoff.status === 'NOT_STARTED') {
      setPlayoffLeaderBatting({});
      setPlayoffLeaderPitching({});
      setPlayoffLeaderFielding({});
      setPlayoffLeadersLoading(false);
      return;
    }

    let cancelled = false;

    async function loadPlayoffLeaders() {
      try {
        setPlayoffLeadersLoading(true);

        const battingStats = {
          AVG: 'avg',
          HR: 'homeRuns',
          RBI: 'rbi',
          OPS: 'ops',
        } as const;
        const pitchingStats = {
          ERA: 'era',
          W: 'wins',
          K: 'pitchingStrikeouts',
          WHIP: 'whip',
        } as const;
        const fieldingStats = {
          FWAR: 'fieldingWAR',
          RS: 'fieldingRunsSaved',
          PLAYS: 'fieldingPlays',
        } as const;

        const [battingEntries, pitchingEntries, fieldingEntries] = await Promise.all([
          Promise.all(
            Object.entries(battingStats).map(async ([label, stat]) => [label, await playoffData.getBattingLeaders(stat, 5)] as const)
          ),
          Promise.all(
            Object.entries(pitchingStats).map(async ([label, stat]) => [label, await playoffData.getPitchingLeaders(stat, 5)] as const)
          ),
          Promise.all(
            Object.entries(fieldingStats).map(async ([label, stat]) => [label, await playoffData.getBattingLeaders(stat, 5)] as const)
          ),
        ]);

        if (cancelled) return;
        setPlayoffLeaderBatting(Object.fromEntries(battingEntries));
        setPlayoffLeaderPitching(Object.fromEntries(pitchingEntries));
        setPlayoffLeaderFielding(Object.fromEntries(fieldingEntries));
      } catch (err) {
        if (!cancelled) {
          console.error('[FranchiseHome] Failed to load playoff leaders:', err);
        }
      } finally {
        if (!cancelled) {
          setPlayoffLeadersLoading(false);
        }
      }
    }

    void loadPlayoffLeaders();
    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    playoffData.playoff,
    playoffData.getBattingLeaders,
    playoffData.getPitchingLeaders,
  ]);

  // Offseason State - tracks current phase progression
  const offseasonState = useOffseasonState(activeSeasonId, currentSeason, { franchiseId });

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
    TRADES: "spring-training",
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
    setStartSeasonError(null);
    setIsStartingNewSeason(true);

    if (franchiseId) {
      const result = await runJournaledFranchiseSeasonTransition({
        franchiseId,
        fromSeasonNumber: currentSeason,
        playoffId: playoffData.playoff?.id,
      });

      if (!result.success) {
        console.error('[handleStartNewSeason] Journaled franchise transition failed:', result);
        setStartSeasonError(
          `Could not start Season ${newSeason}: ${result.error || 'season transition failed'}.`,
        );
        setIsStartingNewSeason(false);
        return;
      }
    } else {
      // Non-franchise/global routes keep the legacy transition path.
      try {
        const result = await executeSeasonTransition(currentSeason);
        console.log(`[handleStartNewSeason] Season transition complete:`, result);

        if (!result.success) {
          const failedStep = result.steps.find((step) => step.status === 'error');
          setStartSeasonError(
            `Could not start Season ${newSeason}: ${failedStep?.error || failedStep?.name || 'season transition failed'}.`,
          );
          setIsStartingNewSeason(false);
          return;
        }
      } catch (err) {
        console.error('[handleStartNewSeason] Season transition failed:', err);
        setStartSeasonError(
          `Could not start Season ${newSeason}: ${err instanceof Error ? err.message : 'season handoff failed'}.`,
        );
        setIsStartingNewSeason(false);
        return;
      }
    }

    // 4. Update React state; only global/non-franchise routes write the global season marker.
    setCurrentSeason(newSeason);
    if (!franchiseId) {
      saveCurrentSeasonNumber(newSeason);
    }
    setSeasonPhase("regular");
    setActiveTab("todays-game");
    setIsStartingNewSeason(false);
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
      await startOffseason(activeSeasonId, currentSeason, { franchiseId });
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
  }, [activeSeasonId, franchiseData.standings, franchiseData.teamNameMap, playoffData, currentSeason, scheduleData.games.length]);

  const handleCreatePlayoffBracket = async () => {
    if (!franchiseId) return;

    try {
      const playoffSetup = franchiseData.franchiseConfig?.playoffSetupSnapshot
        ?? franchiseData.franchiseConfig?.playoffs;
      await playoffData.createNewPlayoff({
        seasonNumber: currentSeason,
        seasonId: activeSeasonId,
        franchiseId,
        teamsQualifying: playoffSetup?.teamsQualifying ?? 8,
        gamesPerRound: [5, 7, 7],
        inningsPerGame: franchiseData.franchiseConfig?.seasonLength?.inningsPerGame
          ?? franchiseData.franchiseConfig?.season?.inningsPerGame
          ?? 9,
        useDH: franchiseData.franchiseConfig?.rulesSnapshot?.useDH
          ?? franchiseData.franchiseConfig?.season?.useDH
          ?? true,
      });
    } catch (err) {
      console.error('Failed to create playoff from stored franchise setup:', err);
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
        seasonId: activeSeasonId,
        statsScopeId: activeSeasonId,
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

  const handleUpdateGame = async (gameId: string, gameData: GameFormData) => {
    try {
      await scheduleData.updateGame(gameId, {
        gameNumber: gameData.gameNumber,
        dayNumber: gameData.dayNumber,
        date: gameData.date,
        time: gameData.time,
        awayTeamId: gameData.awayTeamId,
        homeTeamId: gameData.homeTeamId,
      });
      setEditingScheduleGame(null);
    } catch (err) {
      console.error('[FranchiseHome] Failed to update game:', err);
    }
  };

  // Add series - persisted to IndexedDB via useScheduleData hook
  const handleAddSeries = async (gameData: GameFormData, count: number) => {
    try {
      await scheduleData.addSeries({
        seasonId: activeSeasonId,
        statsScopeId: activeSeasonId,
        date: gameData.date,
        time: gameData.time,
        awayTeamId: gameData.awayTeamId,
        homeTeamId: gameData.homeTeamId,
      }, count);
    } catch (err) {
      console.error('[FranchiseHome] Failed to add series:', err);
    }
  };

  const openScoreOnlyModal = (game: ScheduledGame) => {
    setScoreOnlyGame(game);
    setScoreOnlyAwayScore("");
    setScoreOnlyHomeScore("");
    setScoreOnlyError(null);
  };

  const closeScoreOnlyModal = () => {
    setScoreOnlyGame(null);
    setScoreOnlyAwayScore("");
    setScoreOnlyHomeScore("");
    setScoreOnlyError(null);
    setScoreOnlySaving(false);
  };

  const handleScoreOnlySubmit = async () => {
    if (!scoreOnlyGame) return;
    if (scoreOnlyAwayScore.trim() === "" || scoreOnlyHomeScore.trim() === "") {
      setScoreOnlyError('Enter both final scores');
      return;
    }
    const awayScore = Number(scoreOnlyAwayScore);
    const homeScore = Number(scoreOnlyHomeScore);

    try {
      setScoreOnlySaving(true);
      setScoreOnlyError(null);
      await scheduleData.completeFranchiseScoreOnly({
        scheduleGameId: scoreOnlyGame.id,
        seasonId: activeSeasonId,
        awayScore,
        homeScore,
      });
      await franchiseData.refresh();
      closeScoreOnlyModal();
    } catch (err) {
      setScoreOnlyError(err instanceof Error ? err.message : 'Failed to save final score');
      setScoreOnlySaving(false);
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
    const playoffUseDH = playoffData.playoff?.useDH ?? true;

    // T0-08: Load real rosters and franchise-owned team snapshots for both teams.
    // League Builder fallback is only for damaged legacy contexts with missing franchise teams.
    const [awayRoster, homeRoster, awayTeamData, homeTeamData] = await Promise.all([
      buildFranchiseGameTrackerRoster(awayTeamId, { franchiseId, leagueId: franchiseLeagueId, useDH: playoffUseDH }),
      buildFranchiseGameTrackerRoster(homeTeamId, { franchiseId, leagueId: franchiseLeagueId, useDH: playoffUseDH }),
      getVisibleFranchiseTeam(franchiseId, awayTeamId),
      getVisibleFranchiseTeam(franchiseId, homeTeamId),
    ]);
    const awayDisplayName = awayTeamData?.name ?? awayTeamName;
    const homeDisplayName = homeTeamData?.name ?? homeTeamName;
    const managerInstanceId =
      franchiseId || franchiseLeagueId || LEAGUE_BUILDER_MANAGER_INSTANCE_ID;
    const [awayManager, homeManager] = await Promise.all([
      resolveManagerForTeam({
        team: {
          id: awayTeamId,
          name: awayDisplayName,
          managerId: awayTeamData?.managerId,
          managerName: awayTeamData?.managerName,
        },
        mode: "franchise",
        instanceId: managerInstanceId,
        fallbackMode: "franchise",
        fallbackInstanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
        persistAssignment: true,
      }),
      resolveManagerForTeam({
        team: {
          id: homeTeamId,
          name: homeDisplayName,
          managerId: homeTeamData?.managerId,
          managerName: homeTeamData?.managerName,
        },
        mode: "franchise",
        instanceId: managerInstanceId,
        fallbackMode: "franchise",
        fallbackInstanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
        persistAssignment: true,
      }),
    ]);
    const awayStarter = awayRoster.pitchers.find((pitcher) => pitcher.isStarter);
    const homeStarter = homeRoster.pitchers.find((pitcher) => pitcher.isStarter);
    const optimalLineupSnapshots: GameLockLineupSnapshots = {
      away: selectOptimalLineupForOpposingPitcher(awayRoster.optimalLineups, homeStarter),
      home: selectOptimalLineupForOpposingPitcher(homeRoster.optimalLineups, awayStarter),
    };
    const lineupBenchmarkIssues = buildPregameBenchmarkIssues([
      {
        teamName: awayTeamName.toUpperCase(),
        opposingPitcherHand: getFranchiseStarterHand(homeStarter),
        dhEnabled: playoffUseDH,
        snapshot: optimalLineupSnapshots.away,
      },
      {
        teamName: homeTeamName.toUpperCase(),
        opposingPitcherHand: getFranchiseStarterHand(awayStarter),
        dhEnabled: playoffUseDH,
        snapshot: optimalLineupSnapshots.home,
      },
    ]);
    if (lineupBenchmarkIssues.length > 0) {
      window.alert(
        `Lineup Delta benchmarks need attention before first pitch: ${lineupBenchmarkIssues.join(" • ")} Use Team Hub to recalculate/apply or set the current lineup as optimal.`,
      );
      return;
    }

    navigate(`/game-tracker/playoff-${series.id}-g${nextGameNumber}`, {
      state: withPregameManagerNavigationState({
        gameMode: 'playoff' as const,
        playoffSeriesId: series.id,
        playoffGameNumber: nextGameNumber,
        awayTeamId,
        homeTeamId,
        awayTeamName: awayDisplayName.toUpperCase(),
        homeTeamName: homeDisplayName.toUpperCase(),
        awayTeamAbbreviation: awayTeamData?.abbreviation,
        homeTeamAbbreviation: homeTeamData?.abbreviation,
        awayPlayers: awayRoster.players.length > 0 ? awayRoster.players : undefined,
        awayPitchers: awayRoster.pitchers.length > 0 ? awayRoster.pitchers : undefined,
        homePlayers: homeRoster.players.length > 0 ? homeRoster.players : undefined,
        homePitchers: homeRoster.pitchers.length > 0 ? homeRoster.pitchers : undefined,
        awayTeamColor: awayTeamData?.colors.primary || getTeamColors(awayTeamId).primary,
        awayTeamBorderColor: awayTeamData?.colors.secondary || getTeamColors(awayTeamId).secondary,
        homeTeamColor: homeTeamData?.colors.primary || getTeamColors(homeTeamId).primary,
        homeTeamBorderColor: homeTeamData?.colors.secondary || getTeamColors(homeTeamId).secondary,
        awayRecord: getTeamRecord(awayTeamId), // MAJ-15: Pass actual team records to GameTracker
        homeRecord: getTeamRecord(homeTeamId), // MAJ-15: Pass actual team records to GameTracker
        franchiseId,
        leagueId: franchiseLeagueId,
        seasonId: activeSeasonId,
        statsScopeId: activeSeasonId,
        competitionType: 'playoff' as const,
        competitionId: playoffData.playoff?.id,
        playoffId: playoffData.playoff?.id,
        useDH: playoffUseDH,
        optimalLineupSnapshots,
        stadiumName: homeTeamData?.stadium ?? franchiseData.stadiumMap?.[homeTeamId] ?? homeDisplayName.toUpperCase(),
        // T0-05: Pass season number for playoff persistence
        seasonNumber: currentSeason,
        // T0-01: Pass total innings for auto game-end detection
        totalInnings: franchiseData?.franchiseConfig?.season?.inningsPerGame ?? 9,
      }, {
        awayManagerId: awayManager.managerId,
        awayManagerName: awayManager.managerName,
        homeManagerId: homeManager.managerId,
        homeManagerName: homeManager.managerName,
      }),
    });
  };

  // --- Playoff SIM state ---
  const [isPlayoffSimulating, setIsPlayoffSimulating] = useState(false);
  const [playoffSimPlayByPlay, setPlayoffSimPlayByPlay] = useState<PlayByPlayEntry[]>([]);
  const [playoffSimResult, setPlayoffSimResult] = useState<{ away: number; home: number } | null>(null);
  const [playoffSimAwayName, setPlayoffSimAwayName] = useState('');
  const [playoffSimHomeName, setPlayoffSimHomeName] = useState('');

  const handleSimPlayoffGame = async (series: ReturnType<typeof playoffData.getSeriesForTeam> & {}) => {
    if (!MODE_2_V1_SYNTHETIC_SIM_ENABLED) return;
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
    // T1-10: Use game number as rotation index (cycles through starters in playoff series)
    const awayRoster = await buildRosterFromPlayers(awayTeamId, awayTeamName.toUpperCase(), completedGames);
    const homeRoster = await buildRosterFromPlayers(homeTeamId, homeTeamName.toUpperCase(), completedGames);

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
    ...(MODE_2_V1_TRANSACTION_UI_ENABLED
      ? [{ id: "rosters", label: "ROSTER & TRADES", icon: <Folder className="w-4 h-4" /> }]
      : []),
    ...(MODE_2_V1_ALL_STAR_UI_ENABLED
      ? [{ id: "allstar", label: "ALL-STAR", icon: <Star className="w-4 h-4" /> }]
      : []),
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
    // Phase 4: expansion/contraction is deferred in Mode 2 v1.
    { id: "contraction", label: "EXPANSION NOTE", icon: <Shuffle className="w-4 h-4" /> },
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
                    disabled={isStartingNewSeason}
                    className="bg-[#C4A853] text-black px-6 py-3 text-sm font-bold hover:bg-[#D4B863] active:scale-95 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isStartingNewSeason ? "STARTING..." : `START SEASON ${currentSeason + 1}`}
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
            {startSeasonError && (
              <div role="alert" className="mt-3 bg-[#DD0000]/20 border-2 border-[#DD0000] p-3 text-xs text-[#E8E8D8]">
                {startSeasonError}
              </div>
            )}
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
            activeSeasonId={activeSeasonId}
            onDataRefresh={() => franchiseData.refresh()}
            onRepairFranchisePersistence={runFranchisePersistenceRepair}
            onAddGame={() => setAddGameModalOpen(true)}
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
            onDeleteGame={async (gameId) => { await scheduleData.deleteGame(gameId); }}
            onEditGame={(game) => {
              setEditingScheduleGame({
                id: game.id,
                gameNumber: game.gameNumber,
                dayNumber: game.dayNumber,
                date: game.date,
                time: game.time,
                awayTeamId: game.awayTeamId,
                homeTeamId: game.homeTeamId,
              });
              setAddGameModalOpen(true);
            }}
            onEnterFinalScore={openScoreOnlyModal}
            onImportCsvRows={async (rows) => {
              await scheduleData.importFranchiseRows(rows, {
                seasonId: activeSeasonId,
                statsScopeId: activeSeasonId,
              });
            }}
          />
        )}
        {activeTab === "news" && (
          <BeatReporterNews franchiseId={franchiseId} seasonId={activeSeasonId} />
        )}
        {activeTab === "standings" && (
          <StandingsContent />
        )}
        {activeTab === "leaders" && (
          <LeagueLeadersContent />
        )}
        {activeTab === "rosters" && (
          <TradeFlow seasonId={activeSeasonId} seasonNumber={currentSeason} franchiseId={franchiseId} />
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
                  onClick={handleCreatePlayoffBracket}
                  className="bg-[#5599FF] border-[3px] border-[#3366FF] px-6 py-3 text-sm text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform"
                >
                  CREATE PLAYOFF BRACKET
                </button>
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
                                    {MODE_2_V1_SYNTHETIC_SIM_ENABLED && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleSimPlayoffGame(s); }}
                                        className="bg-[#4A6844] border-[2px] border-[#5A8352] py-1.5 px-2 text-[10px] text-[#E8E8D8] font-bold hover:bg-[#3F5A3A] active:scale-95 transition-transform"
                                      >
                                        SIM
                                      </button>
                                    )}
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
                                    {MODE_2_V1_SYNTHETIC_SIM_ENABLED && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleSimPlayoffGame(s); }}
                                        className="bg-[#4A6844] border-[2px] border-[#5A8352] py-1.5 px-2 text-[10px] text-[#E8E8D8] font-bold hover:bg-[#3F5A3A] active:scale-95 transition-transform"
                                      >
                                        SIM
                                      </button>
                                    )}
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
                          {MODE_2_V1_SYNTHETIC_SIM_ENABLED && (
                            <button
                              onClick={() => handleSimPlayoffGame(playoffData.bracketByLeague.Championship!)}
                              className="bg-[#4A6844] border-[2px] border-[#5A8352] py-2 px-3 text-[10px] text-[#E8E8D8] font-bold hover:bg-[#3F5A3A] active:scale-95 transition-transform"
                            >
                              SIM
                            </button>
                          )}
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

                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                  <div className="text-lg text-[#E8E8D8] font-bold mb-4">TOP PERFORMERS</div>
                  {playoffLeadersLoading ? (
                    <div className="bg-[#4A6844] p-4">
                      <div className="text-xs text-[#E8E8D8]/60 text-center py-4">
                        Loading tracked playoff performers...
                      </div>
                    </div>
                  ) : !Object.values(playoffLeaderBatting).some((items) => items.length > 0)
                    && !Object.values(playoffLeaderPitching).some((items) => items.length > 0)
                    && !Object.values(playoffLeaderFielding).some((items) => items.length > 0) ? (
                    <div className="bg-[#4A6844] p-4">
                      <div className="text-xs text-[#E8E8D8]/60 text-center py-4">
                        Track playoff games via GameTracker to populate player performance
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                      {buildPlayoffTopPerformerCards(
                        playoffLeaderBatting,
                        playoffLeaderPitching,
                        playoffLeaderFielding
                      ).map((card) => (
                        <div key={card.label} className="bg-[#4A6844] p-4 border-2 border-[#E8E8D8]/30">
                          <div className="text-[10px] text-[#E8E8D8]/60 mb-2">{card.label}</div>
                          <div className="text-sm text-[#E8E8D8] font-bold mb-1">{card.playerName}</div>
                          <div className="text-[10px] text-[#E8E8D8]/70 mb-2">{card.teamId}</div>
                          <div className="text-[10px] text-[#E8E8D8]/90">{card.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
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
            ) : playoffLeadersLoading ? (
              <div className="text-center text-[#E8E8D8]/60 py-8">Loading tracked playoff leaders...</div>
            ) : !Object.values(playoffLeaderBatting).some((items) => items.length > 0)
              && !Object.values(playoffLeaderPitching).some((items) => items.length > 0)
              && !Object.values(playoffLeaderFielding).some((items) => items.length > 0) ? (
              <div className="text-center text-[#E8E8D8]/60 py-8">Track playoff games via GameTracker to populate leaders</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <FranchisePlayoffLeaderPanel title="BATTING LEADERS" entries={playoffLeaderBatting} />
                <FranchisePlayoffLeaderPanel title="PITCHING LEADERS" entries={playoffLeaderPitching} />
                <FranchisePlayoffLeaderPanel title="FIELDING LEADERS" entries={playoffLeaderFielding} />

                {/* Series MVP - if champion exists */}
                {playoffData.playoff.champion && playoffData.playoff.mvp && (
                  <div className="lg:col-span-3 bg-[#5A8352] border-[4px] border-[#FFD700] p-6">
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
        {MODE_2_V1_SYNTHETIC_SIM_ENABLED && (
          <SimulationOverlay
            isOpen={isPlayoffSimulating}
            playByPlay={playoffSimPlayByPlay}
            awayTeamName={playoffSimAwayName}
            homeTeamName={playoffSimHomeName}
            finalAwayScore={playoffSimResult?.away ?? 0}
            finalHomeScore={playoffSimResult?.home ?? 0}
            onComplete={handlePlayoffSimComplete}
          />
        )}
        
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
                seasonId={activeSeasonId}
                seasonNumber={currentSeason}
                franchiseId={franchiseId}
                onClose={() => setShowFreeAgency(false)}
              />
            )}
          </div>
        )}
        
        {/* Ratings Adjustment Modal */}
        {showRatingsAdjustment && (
          <RatingsAdjustmentFlow
            seasonId={activeSeasonId}
            franchiseId={franchiseId}
            onClose={() => setShowRatingsAdjustment(false)}
          />
        )}
        
        {/* Retirements Modal */}
        {showRetirements && (
          <RetirementFlow
            seasonId={activeSeasonId}
            seasonNumber={currentSeason}
            franchiseId={franchiseId}
            onClose={() => setShowRetirements(false)}
            onRetirementsComplete={(newJerseys) => {
              setRetiredJerseys([...retiredJerseys, ...newJerseys]);
            }}
          />
        )}

        {/* Awards Ceremony Modal */}
        {showAwards && (
          <AwardsCeremonyFlow
            seasonId={activeSeasonId}
            seasonNumber={currentSeason}
            franchiseId={franchiseId}
            onClose={() => setShowAwards(false)}
          />
        )}

        {/* Contraction/Expansion Modal */}
        {showContraction && (
          <ContractionExpansionFlow
            seasonId={activeSeasonId}
            seasonNumber={currentSeason}
            franchiseId={franchiseId}
            onComplete={() => setShowContraction(false)}
          />
        )}

        {/* Draft Modal */}
        {showDraft && (
          <DraftFlow
            seasonId={activeSeasonId}
            seasonNumber={currentSeason}
            franchiseId={franchiseId}
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
                seasonId={activeSeasonId}
                franchiseId={franchiseId}
                playoffId={playoffData.playoff?.id}
                onClose={() => setShowFinalize(false)}
                onAdvanceComplete={() => {
                  // Increment season number locally. Franchise metadata is updated by FinalizeAdvanceFlow.
                  const newSeason = currentSeason + 1;
                  setCurrentSeason(newSeason);
                  if (!franchiseId) {
                    saveCurrentSeasonNumber(newSeason);
                  }

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
                  <div className="text-2xl text-[#E8E8D8]">EXPANSION BOUNDARY</div>
                  <div className="text-sm text-[#E8E8D8]/80">Offseason Phase 4</div>
                </div>
              </div>
              <div className="text-sm text-[#E8E8D8]/80 mb-4">
                League contraction and expansion workflows are deferred in Mode 2 v1. This phase is skip-only until franchise-owned offseason adapters are implemented.
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">⏸</div>
                  <div className="text-xs text-[#E8E8D8]/60">Deferred</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">V1</div>
                  <div className="text-xs text-[#E8E8D8]/60">Skip Only</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">🏛️</div>
                  <div className="text-xs text-[#E8E8D8]/60">No Mutation</div>
                </div>
              </div>
            </div>

            <button
              onClick={handleAdvancePhase}
              className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-6 text-xl text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              SKIP DEFERRED EXPANSION PHASE →
            </button>

            <div className="bg-[#4169E1]/20 border-l-4 border-[#4169E1] p-4">
              <div className="text-xs text-[#E8E8D8]/90 mb-2 flex items-center gap-2">
                <span>💡</span>
                <span className="font-bold">Phase 4 Boundary</span>
              </div>
              <div className="text-xs text-[#E8E8D8]/70 space-y-1">
                Expansion and contraction are not active franchise workflows in Mode 2 v1. Use the skip button to continue the offseason without mutating franchise or League Builder data.
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
        onClose={() => { setAddGameModalOpen(false); setEditingScheduleGame(null); }}
        onAddGame={handleAddGame}
        onAddSeries={handleAddSeries}
        onUpdateGame={handleUpdateGame}
        editingGame={editingScheduleGame}
        nextGameNumber={getNextGameNumber()}
        nextDayNumber={getNextDayNumber()}
        nextDate={getNextDate()}
        teams={availableTeams}
      />

      {scoreOnlyGame && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-6 max-w-md w-full mx-4">
            <div className="text-lg text-[#E8E8D8] mb-2 text-center">ENTER FINAL SCORE</div>
            <div className="text-[10px] text-[#E8E8D8]/70 mb-5 text-center">
              Score-only updates schedule results and team standings only.
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className="block">
                <span className="block text-[9px] text-[#E8E8D8]/80 mb-1">
                  {franchiseData.teamNameMap[scoreOnlyGame.awayTeamId] ?? scoreOnlyGame.awayTeamId}
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={scoreOnlyAwayScore}
                  onChange={(event) => setScoreOnlyAwayScore(event.target.value)}
                  className="w-full bg-[#4A6844] border-[3px] border-[#3F5A3A] p-2 text-sm text-[#E8E8D8]"
                />
              </label>
              <label className="block">
                <span className="block text-[9px] text-[#E8E8D8]/80 mb-1">
                  {franchiseData.teamNameMap[scoreOnlyGame.homeTeamId] ?? scoreOnlyGame.homeTeamId}
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={scoreOnlyHomeScore}
                  onChange={(event) => setScoreOnlyHomeScore(event.target.value)}
                  className="w-full bg-[#4A6844] border-[3px] border-[#3F5A3A] p-2 text-sm text-[#E8E8D8]"
                />
              </label>
            </div>

            {scoreOnlyError && (
              <div className="bg-[#8B0000] border-[3px] border-[#DC3545] p-2 text-[9px] text-white mb-4">
                {scoreOnlyError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={closeScoreOnlyModal}
                disabled={scoreOnlySaving}
                className="flex-1 bg-[#4A6844] border-[5px] border-[#5A8352] py-3 text-sm text-[#E8E8D8] hover:bg-[#3F5A3A] disabled:opacity-50"
              >
                CANCEL
              </button>
              <button
                onClick={() => void handleScoreOnlySubmit()}
                disabled={scoreOnlySaving}
                className="flex-1 bg-[#5A8352] border-[5px] border-[#4A6844] py-3 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-50"
              >
                {scoreOnlySaving ? 'SAVING' : 'SAVE FINAL'}
              </button>
            </div>
          </div>
        </div>
      )}

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
  activeSeasonId: string;
  onDataRefresh: () => Promise<void>;
  onRepairFranchisePersistence: () => Promise<void>;
  onAddGame: () => void;
}

function GameDayContent({
  scheduleData,
  currentSeason,
  activeSeasonId,
  onDataRefresh,
  onRepairFranchisePersistence,
  onAddGame,
}: GameDayContentProps) {
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

  // T3-01: Pre-game lineup review state
  const [preGameData, setPreGameData] = useState<PreGameData | null>(null);

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
  const franchiseLeagueId = franchiseData.franchiseConfig?.league || 'sml';
  const franchiseUseDH = resolveFranchiseGameUseDH(franchiseData.franchiseConfig);

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
  const hasNextGame = Boolean(scheduleData.nextGame);

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
      const freshGames = franchiseId
        ? await getAllGamesByFranchise(franchiseId, currentSeason)
        : await getAllGames(currentSeason);
      if (freshGames.length === 0) return;

      const stillScheduled = freshGames.filter(g => g.status === 'SCHEDULED').length;
      if (stillScheduled === 0) {
        await markSeasonComplete(activeSeasonId);
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

  // T3-01: Show pre-game lineup review before launching game
  const handlePlayGame = async () => {
    const nextGame = scheduleData.nextGame;
    const away = nextGame?.awayTeamId || awayTeamId;
    const home = nextGame?.homeTeamId || homeTeamId;
    const awayName = franchiseData.teamNameMap?.[away] || away;
    const homeName = franchiseData.teamNameMap?.[home] || home;
    const gameNum = nextGame?.gameNumber ?? 1;

    try {
      await onRepairFranchisePersistence();
    } catch (err) {
      console.error('[FranchiseHome] Failed to prepare franchise persistence for GameTracker launch:', err);
      setToastMessage('Franchise roster data could not be prepared. Try reloading the franchise.');
      setConfirmAction(null);
      return;
    }

    // Load real rosters from IndexedDB for both teams
    const [awayRoster, homeRoster] = await Promise.all([
      buildFranchiseGameTrackerRoster(away, { franchiseId, leagueId: franchiseLeagueId, useDH: franchiseUseDH }),
      buildFranchiseGameTrackerRoster(home, { franchiseId, leagueId: franchiseLeagueId, useDH: franchiseUseDH }),
    ]);

    const missingRosterTeams: string[] = [];
    if (awayRoster.players.length === 0 || awayRoster.pitchers.length === 0) {
      missingRosterTeams.push(awayName.toUpperCase());
    }
    if (homeRoster.players.length === 0 || homeRoster.pitchers.length === 0) {
      missingRosterTeams.push(homeName.toUpperCase());
    }
    if (missingRosterTeams.length > 0) {
      setToastMessage(
        `Franchise roster data is incomplete for ${missingRosterTeams.join(' and ')}. Game launch blocked.`,
      );
      setConfirmAction(null);
      return;
    }

    // Find default starter indices (first SP)
    const awayStarterIdx = awayRoster.pitchers.findIndex(p => p.isStarter);
    const homeStarterIdx = homeRoster.pitchers.findIndex(p => p.isStarter);

    setPreGameData({
      awayPlayers: awayRoster.players,
      awayPitchers: awayRoster.pitchers,
      homePlayers: homeRoster.players,
      homePitchers: homeRoster.pitchers,
      awayTeamId: away,
      homeTeamId: home,
      awayTeamName: awayName.toUpperCase(),
      homeTeamName: homeName.toUpperCase(),
      gameNumber: gameNum,
      scheduleGameId: nextGame?.id,
      useDH: franchiseUseDH,
      selectedAwayStarterIdx: awayStarterIdx >= 0 ? awayStarterIdx : 0,
      selectedHomeStarterIdx: homeStarterIdx >= 0 ? homeStarterIdx : 0,
      awayOptimalLineups: awayRoster.optimalLineups,
      homeOptimalLineups: homeRoster.optimalLineups,
    });
    setConfirmAction(null);

    // T3-06: Async milestone watch computation (non-blocking)
    (async () => {
      try {
        const [careerBatters, careerPitchers] = await Promise.all([
          getAllCareerBatting(),
          getAllCareerPitching(),
        ]);
        const seasonId = activeSeasonId || '';
        const [seasonBatters, seasonPitchers] = seasonId
          ? await Promise.all([
              getSeasonBattingStats(seasonId),
              getSeasonPitchingStats(seasonId),
            ])
          : [[], []];

        // Build lookup maps
        const careerBatMap = new Map(careerBatters.map(b => [b.playerId, b]));
        const careerPitMap = new Map(careerPitchers.map(p => [p.playerId, p]));
        const seasonBatMap = new Map(seasonBatters.map(b => [b.playerId, b]));
        const seasonPitMap = new Map(seasonPitchers.map(p => [p.playerId, p]));
        const achieved = new Set<string>(); // TODO: load from careerStorage milestones

        const playerIds = collectFranchiseRosterPlayerIds([awayRoster, homeRoster]);

        const watches: MilestoneWatch[] = [];
        for (const pid of playerIds) {
          const pw = getApproachingMilestones(
            careerBatMap.get(pid) || null,
            careerPitMap.get(pid) || null,
            seasonBatMap.get(pid) || null,
            seasonPitMap.get(pid) || null,
            achieved,
          );
          watches.push(...pw);
        }

        // Sort by closest to milestone
        watches.sort((a, b) => a.neededForMilestone - b.neededForMilestone);

        setPreGameData(prev => prev ? { ...prev, milestoneWatches: watches } : prev);
      } catch (err) {
        console.warn('[FranchiseHome] Milestone watch computation failed:', err);
      }
    })();
  };

  const persistPregameBenchmark = async (
    teamId: string,
    snapshot: OptimalLineupSnapshot,
    useDH: boolean,
  ) => {
    if (!franchiseId || typeof indexedDB === "undefined") return;
    try {
      const team = await getFranchiseTeam(franchiseId, teamId);
      if (!team) return;
      await saveFranchiseTeam(franchiseId, {
        ...team,
        [optimalLineupField(snapshot.opposingPitcherHand, useDH)]: snapshot,
      });
    } catch (err) {
      console.warn("[FranchiseHome] Failed to persist pregame optimal benchmark:", err);
    }
  };

  const getPregameReadiness = (data: PreGameData) =>
    buildFranchisePregameReadiness({
      teams: [
        {
          teamName: data.awayTeamName,
          players: data.awayPlayers,
          pitchers: data.awayPitchers,
          selectedStarterIdx: data.selectedAwayStarterIdx,
          useDH: data.useDH,
        },
        {
          teamName: data.homeTeamName,
          players: data.homePlayers,
          pitchers: data.homePitchers,
          selectedStarterIdx: data.selectedHomeStarterIdx,
          useDH: data.useDH,
        },
      ],
    });

  const handleRegisterPregameBenchmarks = async () => {
    if (!preGameData) return;
    const readiness = getPregameReadiness(preGameData);
    if (!readiness.isReady) {
      setToastMessage(`Lineup readiness required: ${readiness.issues.join(" | ")}`);
      return;
    }
    const awayStarter = preGameData.awayPitchers[preGameData.selectedAwayStarterIdx];
    const homeStarter = preGameData.homePitchers[preGameData.selectedHomeStarterIdx];
    const awaySnapshot = buildCurrentLineupOptimalBenchmark({
      teamId: preGameData.awayTeamId,
      mode: "franchise",
      instanceId: franchiseId,
      opposingPitcherHand: getFranchiseStarterHand(homeStarter),
      players: preGameData.awayPlayers,
      pitchers: preGameData.awayPitchers,
      dhEnabled: preGameData.useDH,
    });
    const homeSnapshot = buildCurrentLineupOptimalBenchmark({
      teamId: preGameData.homeTeamId,
      mode: "franchise",
      instanceId: franchiseId,
      opposingPitcherHand: getFranchiseStarterHand(awayStarter),
      players: preGameData.homePlayers,
      pitchers: preGameData.homePitchers,
      dhEnabled: preGameData.useDH,
    });

    setPreGameData((current) =>
      current
        ? {
            ...current,
            awayOptimalLineups: upsertPregameBenchmark(current.awayOptimalLineups, awaySnapshot),
            homeOptimalLineups: upsertPregameBenchmark(current.homeOptimalLineups, homeSnapshot),
          }
        : current,
    );
    await Promise.all([
      persistPregameBenchmark(preGameData.awayTeamId, awaySnapshot, preGameData.useDH),
      persistPregameBenchmark(preGameData.homeTeamId, homeSnapshot, preGameData.useDH),
    ]);
    setToastMessage("Current lineups registered as Lineup Delta benchmarks.");
  };

  // T3-01: Launch game with selected starters from pre-game screen
  const handleLaunchGame = async () => {
    if (!preGameData) return;
    const readiness = getPregameReadiness(preGameData);
    if (!readiness.isReady) {
      setToastMessage(`Lineup readiness required: ${readiness.issues.join(" | ")}`);
      return;
    }
    const { awayPlayers, awayPitchers, homePlayers, homePitchers } = preGameData;

    const [awayTeamData, homeTeamData] = await Promise.all([
      getVisibleFranchiseTeam(franchiseId, preGameData.awayTeamId),
      getVisibleFranchiseTeam(franchiseId, preGameData.homeTeamId),
    ]);
    const managerInstanceId =
      franchiseId || franchiseLeagueId || LEAGUE_BUILDER_MANAGER_INSTANCE_ID;
    const [awayManager, homeManager] = await Promise.all([
      resolveManagerForTeam({
        team: {
          id: preGameData.awayTeamId,
          name: preGameData.awayTeamName,
          managerId: awayTeamData?.managerId,
          managerName: awayTeamData?.managerName,
        },
        mode: "franchise",
        instanceId: managerInstanceId,
        fallbackMode: "franchise",
        fallbackInstanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
        persistAssignment: true,
      }),
      resolveManagerForTeam({
        team: {
          id: preGameData.homeTeamId,
          name: preGameData.homeTeamName,
          managerId: homeTeamData?.managerId,
          managerName: homeTeamData?.managerName,
        },
        mode: "franchise",
        instanceId: managerInstanceId,
        fallbackMode: "franchise",
        fallbackInstanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
        persistAssignment: true,
      }),
    ]);

    // Apply selected starter: mark the chosen pitcher as isStarter/isActive
    const finalAwayPitchers = awayPitchers.map((p, i) => ({
      ...p,
      isStarter: i === preGameData.selectedAwayStarterIdx,
      isActive: i === preGameData.selectedAwayStarterIdx,
    }));
    const finalHomePitchers = homePitchers.map((p, i) => ({
      ...p,
      isStarter: i === preGameData.selectedHomeStarterIdx,
      isActive: i === preGameData.selectedHomeStarterIdx,
    }));
    const awayStarter = finalAwayPitchers.find((pitcher) => pitcher.isStarter);
    const homeStarter = finalHomePitchers.find((pitcher) => pitcher.isStarter);
    const optimalLineupSnapshots: GameLockLineupSnapshots = {
      away: selectOptimalLineupForOpposingPitcher(preGameData.awayOptimalLineups, homeStarter),
      home: selectOptimalLineupForOpposingPitcher(preGameData.homeOptimalLineups, awayStarter),
    };
    const lineupBenchmarkIssues = buildPregameBenchmarkIssues([
      {
        teamName: preGameData.awayTeamName,
        opposingPitcherHand: getFranchiseStarterHand(homeStarter),
        dhEnabled: preGameData.useDH,
        snapshot: optimalLineupSnapshots.away,
      },
      {
        teamName: preGameData.homeTeamName,
        opposingPitcherHand: getFranchiseStarterHand(awayStarter),
        dhEnabled: preGameData.useDH,
        snapshot: optimalLineupSnapshots.home,
      },
    ]);
    if (lineupBenchmarkIssues.length > 0) {
      setToastMessage(
        `Lineup Delta benchmarks need attention: ${lineupBenchmarkIssues.join(" | ")}`,
      );
      return;
    }

    navigate(`/game-tracker/franchise-g${preGameData.gameNumber}`, {
      state: withPregameManagerNavigationState({
        gameMode: 'franchise' as const,
        awayTeamId: preGameData.awayTeamId,
        homeTeamId: preGameData.homeTeamId,
        awayTeamName: preGameData.awayTeamName,
        homeTeamName: preGameData.homeTeamName,
        awayTeamAbbreviation: awayTeamData?.abbreviation,
        homeTeamAbbreviation: homeTeamData?.abbreviation,
        awayPlayers: awayPlayers.length > 0 ? awayPlayers : undefined,
        awayPitchers: finalAwayPitchers.length > 0 ? finalAwayPitchers : undefined,
        homePlayers: homePlayers.length > 0 ? homePlayers : undefined,
        homePitchers: finalHomePitchers.length > 0 ? finalHomePitchers : undefined,
        awayTeamColor: awayTeamData?.colors.primary || getTeamColors(preGameData.awayTeamId).primary,
        awayTeamBorderColor: awayTeamData?.colors.secondary || getTeamColors(preGameData.awayTeamId).secondary,
        homeTeamColor: homeTeamData?.colors.primary || getTeamColors(preGameData.homeTeamId).primary,
        homeTeamBorderColor: homeTeamData?.colors.secondary || getTeamColors(preGameData.homeTeamId).secondary,
        awayRecord: getTeamRecord(preGameData.awayTeamId),
        homeRecord: getTeamRecord(preGameData.homeTeamId),
        stadiumName: franchiseData.stadiumMap?.[preGameData.homeTeamId] ?? preGameData.homeTeamName,
        franchiseId,
        leagueId: franchiseLeagueId,
        seasonId: activeSeasonId,
        statsScopeId: activeSeasonId,
        competitionType: 'franchise' as const,
        competitionId: franchiseId,
        useDH: preGameData.useDH,
        optimalLineupSnapshots,
        scheduleGameId: preGameData.scheduleGameId,
        seasonNumber: currentSeason,
        gameNumber: preGameData.gameNumber,
        totalInnings: franchiseData.franchiseConfig?.season?.inningsPerGame ?? 9,
      }, {
        awayManagerId: awayManager.managerId,
        awayManagerName: awayManager.managerName,
        homeManagerId: homeManager.managerId,
        homeManagerName: homeManager.managerName,
      }),
    });
    setPreGameData(null);
  };

  const handleSimulate = async () => {
    setConfirmAction(null);
    if (!MODE_2_V1_SYNTHETIC_SIM_ENABLED) return;

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
    try {
      await processCompletedGame(game, { seasonId: activeSeasonId });
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
    if (!MODE_2_V1_SYNTHETIC_SIM_ENABLED) return;

    const games = getGamesByScope(scope);
    if (games.length === 0) return;

    setBatchType('simulate');
    setBatchTotal(games.length);
    setBatchCurrent(0);
    setIsBatchRunning(true);

    const batchSeasonId = activeSeasonId;
    let processed = 0;

    // T1-10: Track rotation index per team across batch games
    const rotationIndices = new Map<string, number>();

    for (const game of games) {
      try {
        // T1-10: Get and advance rotation index for each team
        const awayRotIdx = rotationIndices.get(game.awayTeamId) ?? 0;
        const homeRotIdx = rotationIndices.get(game.homeTeamId) ?? 0;

        const awayRoster = await buildRosterFromPlayers(game.awayTeamId, game.awayTeamId.toUpperCase(), awayRotIdx);
        const homeRoster = await buildRosterFromPlayers(game.homeTeamId, game.homeTeamId.toUpperCase(), homeRotIdx);

        // Advance rotation for next game
        rotationIndices.set(game.awayTeamId, awayRotIdx + 1);
        rotationIndices.set(game.homeTeamId, homeRotIdx + 1);

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
      // Mark as SKIPPED — no stats, no standings impact, and no later score entry.
      await scheduleData.updateStatus(nextGame.id, 'SKIPPED');

      // Refresh data so nextGame advances
      await onDataRefresh();

      // Show toast
      setToastMessage(`Game skipped — ${away} vs ${home} marked SKIPPED`);

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
  const pregameAwayStarter = preGameData?.awayPitchers[preGameData.selectedAwayStarterIdx];
  const pregameHomeStarter = preGameData?.homePitchers[preGameData.selectedHomeStarterIdx];
  const pregameAwayBenchmark = preGameData
    ? selectOptimalLineupForOpposingPitcher(preGameData.awayOptimalLineups, pregameHomeStarter)
    : undefined;
  const pregameHomeBenchmark = preGameData
    ? selectOptimalLineupForOpposingPitcher(preGameData.homeOptimalLineups, pregameAwayStarter)
    : undefined;
  const pregameBenchmarkRequirements = preGameData
    ? [
        {
          teamName: preGameData.awayTeamName,
          opposingPitcherHand: getFranchiseStarterHand(pregameHomeStarter),
          dhEnabled: preGameData.useDH,
          snapshot: pregameAwayBenchmark,
        },
        {
          teamName: preGameData.homeTeamName,
          opposingPitcherHand: getFranchiseStarterHand(pregameAwayStarter),
          dhEnabled: preGameData.useDH,
          snapshot: pregameHomeBenchmark,
        },
      ]
    : [];
  const pregameBenchmarkRows = buildPregameBenchmarkRows(pregameBenchmarkRequirements);
  const pregameBenchmarkIssues = buildPregameBenchmarkIssues(pregameBenchmarkRequirements);
  const pregameReadiness = preGameData ? getPregameReadiness(preGameData) : undefined;
  const pregameReadinessIssues = pregameReadiness?.issues ?? [];
  const canRegisterPregameBenchmarks = pregameReadiness?.isReady ?? false;
  const canLaunchPregame = canRegisterPregameBenchmarks && pregameBenchmarkIssues.length === 0;

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
      {!seasonComplete && !scheduleData.isLoading && !hasNextGame && (
        <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-8 text-center">
          <div className="text-lg text-[#E8E8D8] mb-2">NO GAMES SCHEDULED</div>
          <div className="text-sm text-[#E8E8D8]/80 mb-6">
            Season {currentSeason} starts empty. Add SMB4 games manually as you play them.
          </div>
          <button
            onClick={onAddGame}
            className="bg-[#5599FF] border-[3px] border-[#3366FF] px-6 py-3 text-sm text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Game
          </button>
        </div>
      )}

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
          {/* Mode 2 v1: user is the bridge for every result; synthetic simulation stays unavailable. */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setConfirmAction("score")}
              className="bg-[#5A8352] border-[5px] border-[#4A6844] py-3 px-8 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              SCORE GAME
            </button>
            {MODE_2_V1_SYNTHETIC_SIM_ENABLED && (
              <button
                onClick={() => setConfirmAction("simulate")}
                className="bg-[#4A6844] border-[5px] border-[#5A8352] py-3 px-4 text-[10px] text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] whitespace-nowrap"
              >
                SIM 1 GAME
              </button>
            )}
            <button
              onClick={() => setConfirmAction("skip")}
              className="bg-[#4A6844] border-[5px] border-[#5A8352] py-3 px-4 text-[10px] text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] whitespace-nowrap"
            >
              SKIP GAME
            </button>
          </div>

          {/* Row 3: Batch simulate options */}
          {MODE_2_V1_SYNTHETIC_SIM_ENABLED && (
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
          )}

        </div>

        <div className="absolute bottom-2 right-2 text-[8px] text-[#E8E8D8]">
          GAME {resolvedCount + 1}/{totalScheduled}
        </div>
      </div>
      )}

      {hasNextGame && (
        <>
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
        </>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-6 max-w-md">
            <div className="text-lg text-[#E8E8D8] mb-4 text-center">ARE YOU SURE?</div>
            <div className="text-sm text-[#E8E8D8] mb-6 text-center">
              {confirmAction === "score" && "Score this game in GameTracker?"}
              {MODE_2_V1_SYNTHETIC_SIM_ENABLED && confirmAction === "simulate" && "Simulate this game? Full player stats will be generated."}
              {confirmAction === "skip" && "Skip this game? It will be marked SKIPPED and cannot be scored later."}
              {MODE_2_V1_SYNTHETIC_SIM_ENABLED && confirmAction === "sim-today" && `Simulate ${getGamesByScope('today').length} game(s) for today? W/L outcomes and standings will be updated.`}
              {MODE_2_V1_SYNTHETIC_SIM_ENABLED && confirmAction === "sim-week" && `Simulate ${getGamesByScope('week').length} game(s) this week? W/L outcomes and standings will be updated.`}
              {MODE_2_V1_SYNTHETIC_SIM_ENABLED && confirmAction === "sim-season" && `Simulate ${getGamesByScope('season').length} remaining game(s)? W/L outcomes and standings will be updated.`}
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
                  if (confirmAction === "score") handlePlayGame();
                  else if (MODE_2_V1_SYNTHETIC_SIM_ENABLED && confirmAction === "simulate") handleSimulate();
                  else if (confirmAction === "skip") handleSkip();
                  else if (MODE_2_V1_SYNTHETIC_SIM_ENABLED && confirmAction === "sim-today") handleBatchSimulate('today');
                  else if (MODE_2_V1_SYNTHETIC_SIM_ENABLED && confirmAction === "sim-week") handleBatchSimulate('week');
                  else if (MODE_2_V1_SYNTHETIC_SIM_ENABLED && confirmAction === "sim-season") handleBatchSimulate('season');
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
      {MODE_2_V1_SYNTHETIC_SIM_ENABLED && (
        <SimulationOverlay
          isOpen={isSimulating}
          playByPlay={simPlayByPlay}
          awayTeamName={simAwayName || awayTeamId.toUpperCase()}
          homeTeamName={simHomeName || homeTeamId.toUpperCase()}
          finalAwayScore={simResult?.away ?? 0}
          finalHomeScore={simResult?.home ?? 0}
          onComplete={handleSimulationComplete}
        />
      )}

      {/* Batch operation overlay */}
      <BatchOperationOverlay
        isOpen={isBatchRunning}
        operationType={batchType ?? 'skip'}
        current={batchCurrent}
        total={batchTotal}
        onComplete={handleBatchComplete}
      />

      {/* T3-01: Pre-game lineup review overlay */}
      {preGameData && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-6 max-w-3xl w-full my-4">
            {/* Header */}
            <div className="text-center mb-4">
              <div className="text-lg text-[#E8E8D8] font-bold mb-1" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.5)' }}>
                PRE-GAME LINEUP
              </div>
              <div className="text-xs text-[#E8E8D8]/70">
                Game {preGameData.gameNumber} &bull; {preGameData.awayTeamName} @ {preGameData.homeTeamName}
              </div>
              {pregameReadinessIssues.length > 0 && (
                <div
                  className="mt-4 border-2 border-[#C4A853] bg-[#1f2b21] p-3 text-left text-[10px] text-[#E8E8D8]"
                  data-testid="franchise-pregame-readiness"
                >
                  <div className="mb-2 font-bold tracking-[0.16em] text-[#C4A853]">
                    LINEUP READINESS REQUIRED
                  </div>
                  <div className="text-[#E8E8D8]/75">
                    {pregameReadinessIssues.join(" • ")}
                  </div>
                </div>
              )}
              <PregameBenchmarkChecklist
                rows={pregameBenchmarkRows}
                onAction={canRegisterPregameBenchmarks ? handleRegisterPregameBenchmarks : undefined}
              />
            </div>

            {/* Starter Selection */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Away Starter */}
              <div>
                <div className="text-[9px] text-[#E8E8D8]/60 mb-1 uppercase tracking-wider">Away Starting Pitcher</div>
                <select
                  value={preGameData.selectedAwayStarterIdx}
                  onChange={(e) => setPreGameData({ ...preGameData, selectedAwayStarterIdx: Number(e.target.value) })}
                  className="w-full bg-[#3d5240] border-[3px] border-[#2a3a2d] text-[#E8E8D8] text-xs px-2 py-2"
                >
                  {preGameData.awayPitchers.map((p, i) => (
                    <option key={i} value={i}>{p.name} ({p.throwingHand})</option>
                  ))}
                </select>
              </div>
              {/* Home Starter */}
              <div>
                <div className="text-[9px] text-[#E8E8D8]/60 mb-1 uppercase tracking-wider">Home Starting Pitcher</div>
                <select
                  value={preGameData.selectedHomeStarterIdx}
                  onChange={(e) => setPreGameData({ ...preGameData, selectedHomeStarterIdx: Number(e.target.value) })}
                  className="w-full bg-[#3d5240] border-[3px] border-[#2a3a2d] text-[#E8E8D8] text-xs px-2 py-2"
                >
                  {preGameData.homePitchers.map((p, i) => (
                    <option key={i} value={i}>{p.name} ({p.throwingHand})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lineups Side by Side */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <LineupPreview
                teamName={preGameData.awayTeamName}
                lineup={preGameData.awayPlayers.filter(p => p.battingOrder != null)}
                bench={preGameData.awayPlayers.filter(p => p.battingOrder == null)}
                startingPitcher={preGameData.awayPitchers[preGameData.selectedAwayStarterIdx]}
                teamColor="#E8E8D8"
                isAway={true}
              />
              <LineupPreview
                teamName={preGameData.homeTeamName}
                lineup={preGameData.homePlayers.filter(p => p.battingOrder != null)}
                bench={preGameData.homePlayers.filter(p => p.battingOrder == null)}
                startingPitcher={preGameData.homePitchers[preGameData.selectedHomeStarterIdx]}
                teamColor="#E8E8D8"
                isAway={false}
              />
            </div>

            {/* T3-06: Milestone Watch */}
            <div className="mb-4">
              <MilestoneWatchPanel
                watches={preGameData.milestoneWatches || []}
                isLoading={!preGameData.milestoneWatches}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setPreGameData(null)}
                className="flex-1 bg-[#4A6844] border-[5px] border-[#5A8352] py-3 text-sm text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
              >
                BACK
              </button>
              <button
                onClick={handleLaunchGame}
                disabled={!canLaunchPregame}
                className={`flex-[2] border-[5px] py-3 text-sm font-bold transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] ${
                  !canLaunchPregame
                    ? "border-[#4A6844] bg-[#3F5A3A] text-[#E8E8D8]/50 cursor-not-allowed"
                    : "border-[#8B7635] bg-[#C4A853] text-[#1a3020] hover:bg-[#D4B863] active:scale-95"
                }`}
              >
                START GAME
              </button>
            </div>
          </div>
        </div>
      )}
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


function BeatReporterNews({
  franchiseId,
  seasonId,
}: {
  franchiseId?: string;
  seasonId: string;
}) {
  const [newsFilter, setNewsFilter] = useState<"all" | "league" | "team">("all");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);

  // Load narratives from recent completed games
  const [newsArticles, setNewsArticles] = useState<{
    id: number;
    type: string;
    headline: string;
    excerpt: string;
    fullText: string;
    reporter: string;
    team: string | null;
    timestamp: string;
    category: string;
  }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const recentGames = await getRecentGames(20, { franchiseId, seasonId });
        if (cancelled) return;
        const articles = recentGames.flatMap((game, idx) => {
          const results: typeof newsArticles = [];
          // Generate home perspective narrative
          const homeNarr = generateGameRecap({
            teamName: game.homeTeamName,
            opponentName: game.awayTeamName,
            teamScore: game.finalScore.home,
            opponentScore: game.finalScore.away,
            isShutout: game.finalScore.away === 0 && game.finalScore.home > game.finalScore.away,
          });
          results.push({
            id: idx * 2,
            type: 'team',
            headline: homeNarr.headline,
            excerpt: homeNarr.body,
            fullText: homeNarr.body + (homeNarr.quote ? `\n\n"${homeNarr.quote}"` : ''),
            reporter: homeNarr.reporter.name,
            team: game.homeTeamName,
            timestamp: new Date(game.date).toLocaleDateString(),
            category: game.finalScore.home > game.finalScore.away ? 'CLUBHOUSE' : 'STANDINGS',
          });
          // Generate away perspective narrative
          const awayNarr = generateGameRecap({
            teamName: game.awayTeamName,
            opponentName: game.homeTeamName,
            teamScore: game.finalScore.away,
            opponentScore: game.finalScore.home,
            isShutout: game.finalScore.home === 0 && game.finalScore.away > game.finalScore.home,
          });
          results.push({
            id: idx * 2 + 1,
            type: 'team',
            headline: awayNarr.headline,
            excerpt: awayNarr.body,
            fullText: awayNarr.body + (awayNarr.quote ? `\n\n"${awayNarr.quote}"` : ''),
            reporter: awayNarr.reporter.name,
            team: game.awayTeamName,
            timestamp: new Date(game.date).toLocaleDateString(),
            category: game.finalScore.away > game.finalScore.home ? 'CLUBHOUSE' : 'STANDINGS',
          });
          return results;
        });
        if (!cancelled) setNewsArticles(articles);
      } catch (err) {
        console.warn('[BeatReporterNews] Failed to load narratives:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [franchiseId, seasonId]);

  const teams = useMemo(() => [...new Set(newsArticles.map(a => a.team).filter((t): t is string => !!t))].sort(), [newsArticles]);

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

function FranchisePlayoffLeaderPanel({
  title,
  entries,
}: {
  title: string;
  entries: Record<string, PlayoffPlayerStats[]>;
}) {
  return (
    <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
      <div className="text-lg text-[#E8E8D8] font-bold mb-4">{title}</div>
      <div className="space-y-3">
        {Object.entries(entries).map(([label, stats]) => (
          <div key={label} className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
            <div className="text-xs text-[#E8E8D8]/60 mb-2">{label}</div>
            {stats.length === 0 ? (
              <div className="text-sm text-[#E8E8D8]/60">No data</div>
            ) : (
              <div className="space-y-1">
                {stats.map((stat, index) => (
                  <div key={`${label}-${stat.playerId}-${index}`} className="flex items-center justify-between text-[10px] text-[#E8E8D8]">
                    <span>{index + 1}. {stat.playerName}</span>
                    <span>{formatFranchisePlayoffLeaderValue(label, stat)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatFranchisePlayoffLeaderValue(label: string, stat: PlayoffPlayerStats): string {
  switch (label) {
    case 'AVG':
      return stat.avg.toFixed(3);
    case 'OPS':
      return stat.ops.toFixed(3);
    case 'HR':
      return String(stat.homeRuns);
    case 'RBI':
      return String(stat.rbi);
    case 'ERA':
      return (stat.era ?? 0).toFixed(2);
    case 'W':
      return String(stat.wins ?? 0);
    case 'K':
      return String(stat.pitchingStrikeouts ?? 0);
    case 'WHIP':
      return (stat.whip ?? 0).toFixed(2);
    case 'FWAR':
      return `${(stat.fieldingWAR ?? 0).toFixed(2)}${stat.fieldingPrimaryPosition ? ` ${stat.fieldingPrimaryPosition}` : ''}`;
    case 'RS':
      return `${(stat.fieldingRunsSaved ?? 0) >= 0 ? '+' : ''}${(stat.fieldingRunsSaved ?? 0).toFixed(2)}`;
    case 'PLAYS':
      return String(stat.fieldingPlays ?? 0);
    default:
      return '0';
  }
}

function buildPlayoffTopPerformerCards(
  batting: Record<string, PlayoffPlayerStats[]>,
  pitching: Record<string, PlayoffPlayerStats[]>,
  fielding: Record<string, PlayoffPlayerStats[]>
): Array<{ label: string; playerName: string; teamId: string; value: string }> {
  const cards: Array<{ label: string; playerName: string; teamId: string; value: string }> = [];

  const mvpBat = batting.OPS?.[0];
  if (mvpBat) {
    cards.push({
      label: 'TOP BAT',
      playerName: mvpBat.playerName,
      teamId: mvpBat.teamId,
      value: `${mvpBat.ops.toFixed(3)} OPS · ${mvpBat.rbi} RBI · ${mvpBat.homeRuns} HR`,
    });
  }

  const slugger = batting.HR?.[0];
  if (slugger) {
    cards.push({
      label: 'POWER BAT',
      playerName: slugger.playerName,
      teamId: slugger.teamId,
      value: `${slugger.homeRuns} HR · ${slugger.hits} H · ${slugger.slg.toFixed(3)} SLG`,
    });
  }

  const ace = pitching.ERA?.[0];
  if (ace) {
    cards.push({
      label: 'TOP ARM',
      playerName: ace.playerName,
      teamId: ace.teamId,
      value: `${(ace.era ?? 0).toFixed(2)} ERA · ${ace.pitchingStrikeouts ?? 0} K · ${ace.inningsPitched ?? 0} IP`,
    });
  }

  const fielder = fielding.FWAR?.[0];
  if (fielder) {
    cards.push({
      label: 'TOP GLOVE',
      playerName: fielder.playerName,
      teamId: fielder.teamId,
      value: `${(fielder.fieldingWAR ?? 0).toFixed(2)} fWAR${fielder.fieldingPrimaryPosition ? ` · ${fielder.fieldingPrimaryPosition}` : ''}`,
    });
  }

  return cards;
}
