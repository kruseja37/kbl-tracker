import { useNavigate, useLocation, useParams } from "react-router";
import { Trophy, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { getTeamColors } from "@/config/teamColors";
import { useState, useEffect } from "react";
import {
  getCompletedGameById,
  type CompletedGameRecord,
} from "../../utils/gameStorage";
import {
  getRunFameStandings,
  type RunFameStanding,
} from "../../../utils/eliminationRunFameStorage";
import {
  getBetweenPlayEvents,
  getGameEvents,
  getGameFieldingEvents,
  getGameHeader,
  type AtBatEvent,
  type BetweenPlayEvent,
  type FieldingEvent,
  type GameHeader,
} from "../../../utils/eventLog";
import {
  deriveKblWpaCredits,
  type KblWpaCredit,
} from "../../../utils/kblWpaAttribution";
import { listManagerProfiles } from "../../../utils/managerIdentityStorage";
import {
  getGamePogAwardSet,
  getPogAwardDisplayLabel,
  getPogAwardPointsLabel,
  type PogAward,
  type PogAwardSet,
} from "../../../utils/pogAwards";
import chalkBgImg from '../../../assets/chalk-bg.png';
import chalkBgFaintImg from '../../../assets/chalk-bg-faint.png';
import { FameLeaderboardCard } from "../components/FameLeaderboardCard";
import { FamePromotionBanner } from "../components/FamePromotionBanner";
import { ManagerWpaOverlay } from "../components/ManagerWpaOverlay";
import { PostGameColumns } from "../components/PostGameColumns";
import {
  buildRunStandingsEntries,
  RunStandingsTable,
} from "../components/RunStandingsTable";
import {
  acceptFamePromotion,
  dismissFamePromotion,
  getRunPromotionCandidates,
  type FamePromotionCandidate,
} from "../engines/famePromotion";
import type { ManagerProfile } from "../../../types/managerWpa";

// Helper to format innings pitched from outs recorded
function formatIP(outsRecorded: number): string {
  const fullInnings = Math.floor(outsRecorded / 3);
  const partialOuts = outsRecorded % 3;
  return partialOuts === 0
    ? `${fullInnings}.0`
    : `${fullInnings}.${partialOuts}`;
}

// Helper to format batting average
function formatAvg(hits: number, atBats: number): string {
  if (atBats === 0) return ".000";
  const avg = hits / atBats;
  return avg.toFixed(3).replace(/^0/, "");
}

function normalizeTeamId(teamId: string | undefined | null): string {
  return (teamId ?? "").trim().toLowerCase();
}

type BadgeVariant = "default" | "success" | "fame";

interface BadgeData {
  label: string;
  variant?: BadgeVariant;
}

type FameEventRecord =
  CompletedGameRecord["fameEvents"] extends Array<infer U> ? U : never;

const badgeVariantClasses: Record<BadgeVariant, string> = {
  default: "bg-[#2b3a2e]/60 border-[#556B55] text-[#a0a898]",
  success: "bg-[#C4A853]/20 border-[#C4A853] text-[#C4A853]",
  fame: "bg-[#CC44CC]/20 border-[#CC44CC] text-[#CC44CC]",
};

function SummaryBadge({
  label,
  variant = "default",
}: {
  label: string;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] tracking-[0.3em] uppercase px-2 py-0.5 rounded-full border ${badgeVariantClasses[variant]}`}
    >
      {label}
    </span>
  );
}

function BadgeGroup({ badges }: { badges: BadgeData[] }) {
  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {badges.map((badge, idx) => (
        <SummaryBadge
          key={`${badge.label}-${idx}`}
          label={badge.label}
          variant={badge.variant}
        />
      ))}
    </div>
  );
}

function normalizeBadgeLabel(value: string | undefined): string {
  if (!value) return "Fame Event";
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getFameBadgeLabel(event: FameEventRecord): string {
  const type = event?.eventType?.toLowerCase() ?? "";
  if (type.includes("walkoff")) {
    if (type.includes("hr")) {
      return "Walk-off HR";
    }
    return "Walk-off";
  }
  if (type.includes("clutch")) {
    return "Clutch Moment";
  }
  if (type.includes("web")) {
    return "Web Gem";
  }
  if (event.description) {
    return event.description;
  }
  if (event.eventType) {
    return normalizeBadgeLabel(event.eventType);
  }
  return "Fame Event";
}

interface PlayerBadgeInputs {
  playerId: string;
  hr: number;
  rbi: number;
  r: number;
  bb: number;
  so: number;
  h: number;
}

function buildPlayerBadgeData(
  player: PlayerBadgeInputs,
  fameMap: Map<string, FameEventRecord[]>,
): BadgeData[] {
  const badges: BadgeData[] = [];
  if (player.hr > 0) {
    badges.push({ label: `${player.hr} HR`, variant: "success" });
  }
  if (player.h >= 2) {
    badges.push({ label: `${player.h} Hits`, variant: "success" });
  }
  if (player.r >= 2) {
    badges.push({ label: `${player.r} R`, variant: "default" });
  }
  if (player.rbi >= 2) {
    badges.push({ label: `${player.rbi} RBI`, variant: "default" });
  }
  if (player.bb >= 3) {
    badges.push({ label: `${player.bb} BB`, variant: "default" });
  }
  const fameForPlayer = fameMap.get(player.playerId) ?? [];
  fameForPlayer.forEach((event) => {
    badges.push({ label: getFameBadgeLabel(event), variant: "fame" });
  });
  return Array.from(new Map(badges.map((b) => [b.label, b])).values());
}

interface PitcherBadgeInputs {
  pitcherId: string;
  outsRecorded: number;
  earnedRuns: number;
  hitsAllowed: number;
  walksAllowed: number;
  strikeoutsThrown: number;
  isStarter: boolean;
}

function getPitcherBadgeData(
  pitcher: PitcherBadgeInputs,
  fameMap: Map<string, FameEventRecord[]>,
): BadgeData[] {
  const badges: BadgeData[] = [];
  if (pitcher.outsRecorded >= 3) {
    badges.push({ label: "1+ IP", variant: "default" });
  }
  if (pitcher.earnedRuns === 0 && pitcher.outsRecorded > 0) {
    badges.push({ label: "Scoreless", variant: "success" });
  }
  if (pitcher.hitsAllowed === 0 && pitcher.outsRecorded > 0) {
    badges.push({ label: "Hitless", variant: "success" });
  }
  if (pitcher.strikeoutsThrown >= 3) {
    badges.push({ label: `${pitcher.strikeoutsThrown} K`, variant: "success" });
  }
  if (pitcher.walksAllowed === 0 && pitcher.outsRecorded > 0) {
    badges.push({ label: "No BB", variant: "default" });
  }
  if (pitcher.isStarter) {
    badges.push({ label: "Starter", variant: "default" });
  }

  const fameForPitcher = fameMap.get(pitcher.pitcherId) ?? [];
  fameForPitcher.forEach((event) => {
    badges.push({ label: getFameBadgeLabel(event), variant: "fame" });
  });

  return Array.from(new Map(badges.map((b) => [b.label, b])).values());
}

function getVisiblePogAwards(awardSet: PogAwardSet): PogAward[] {
  return [
    ...((awardSet.overall ? [awardSet.overall] : []) as PogAward[]),
    ...awardSet.playerRoleAwards,
    ...((awardSet.managerAward ? [awardSet.managerAward] : []) as PogAward[]),
  ];
}

export function PostGameSummary({
  gameId: gameIdProp,
}: { gameId?: string } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId: gameIdFromRoute } = useParams<{ gameId: string }>();
  const gameId = gameIdProp ?? gameIdFromRoute;
  const [boxScoreExpanded, setBoxScoreExpanded] = useState(false);
  const [gameData, setGameData] = useState<CompletedGameRecord | null>(null);
  const [atBatEvents, setAtBatEvents] = useState<AtBatEvent[]>([]);
  const [fieldingEvents, setFieldingEvents] = useState<FieldingEvent[]>([]);
  const [betweenPlayEvents, setBetweenPlayEvents] = useState<BetweenPlayEvent[]>([]);
  const [gameHeader, setGameHeader] = useState<GameHeader | null>(null);
  const [managerProfiles, setManagerProfiles] = useState<ManagerProfile[]>([]);
  const [runStandings, setRunStandings] = useState<RunFameStanding[]>([]);
  const [isRunStandingsLoading, setIsRunStandingsLoading] = useState(false);
  const [promotionCandidates, setPromotionCandidates] = useState<FamePromotionCandidate[]>([]);
  const [pendingPromotionPlayerId, setPendingPromotionPlayerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get game mode from navigation state to route back appropriately
  const navigationState = (location.state ?? {}) as {
    gameMode?: "exhibition" | "franchise" | "playoff" | "elimination";
    franchiseId?: string;
    eliminationId?: string;
    seasonId?: string;
    statsScopeId?: string;
    competitionType?: "exhibition" | "franchise" | "playoff" | "elimination";
    competitionId?: string;
  };

  const gameMode = navigationState?.gameMode;
  const franchiseId = navigationState?.franchiseId || "1";
  const eliminationId = navigationState?.eliminationId;
  const resolvedCompetitionId =
    navigationState?.competitionId ?? gameData?.competitionId;
  const eliminationRunId =
    resolvedCompetitionId ?? eliminationId;
  const baseNavigationState = {
    ...navigationState,
    franchiseId,
    eliminationId: eliminationRunId,
    competitionId: resolvedCompetitionId,
  };
  const resolvedGameMode = gameMode ?? gameData?.competitionType ?? "exhibition";

  // Load game data from IndexedDB
  useEffect(() => {
    let cancelled = false;

    async function loadGameData() {
      // Hard reset prior game state before loading next summary.
      setGameData(null);
      setAtBatEvents([]);
      setFieldingEvents([]);
      setBetweenPlayEvents([]);
      setGameHeader(null);
      setManagerProfiles([]);
      setError(null);
      setIsLoading(true);
      setBoxScoreExpanded(false);

      if (!gameId) {
        if (!cancelled) {
          setError("No game ID provided");
          setIsLoading(false);
        }
        return;
      }

      try {
        const [data, events, fieldingRows, betweenPlayRows, header, profiles] = await Promise.all([
          getCompletedGameById(gameId),
          Promise.resolve(getGameEvents(gameId)).catch((eventsError) => {
            console.warn(
              "Failed to load at-bat events for WPA fallback:",
              eventsError,
            );
            return [];
          }),
          getGameFieldingEvents(gameId).catch(() => []),
          getBetweenPlayEvents(gameId).catch(() => []),
          getGameHeader(gameId).catch(() => null),
          listManagerProfiles().catch(() => []),
        ]);
        if (cancelled) return;
        if (data && data.gameId === gameId) {
          setGameData(data);
          setAtBatEvents(Array.isArray(events) ? events : []);
          setFieldingEvents(Array.isArray(fieldingRows) ? fieldingRows : []);
          setBetweenPlayEvents(Array.isArray(betweenPlayRows) ? betweenPlayRows : []);
          setGameHeader(header);
          setManagerProfiles(Array.isArray(profiles) ? profiles : []);
        } else {
          setError("Game not found");
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load game data:", err);
        setError("Failed to load game data");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadGameData();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  useEffect(() => {
    let cancelled = false;

    async function loadRunStandings() {
      if (resolvedGameMode !== "elimination" || !eliminationRunId) {
        setRunStandings([]);
        setIsRunStandingsLoading(false);
        return;
      }

      setIsRunStandingsLoading(true);

      try {
        const standings = await getRunFameStandings(eliminationRunId);
        if (!cancelled) {
          setRunStandings(standings);
        }
      } catch (runStandingsError) {
        console.error("Failed to load elimination run standings:", runStandingsError);
        if (!cancelled) {
          setRunStandings([]);
        }
      } finally {
        if (!cancelled) {
          setIsRunStandingsLoading(false);
        }
      }
    }

    loadRunStandings();

    return () => {
      cancelled = true;
    };
  }, [eliminationRunId, resolvedGameMode]);

  useEffect(() => {
    let cancelled = false;

    async function loadPromotionCandidates() {
      if (
        resolvedGameMode !== "elimination" ||
        !eliminationRunId ||
        runStandings.length === 0
      ) {
        setPromotionCandidates([]);
        return;
      }

      try {
        const teamNamesById = gameData
          ? {
              [gameData.awayTeamId]: gameData.awayTeamName,
              [gameData.homeTeamId]: gameData.homeTeamName,
            }
          : {};
        const candidates = await getRunPromotionCandidates(
          eliminationRunId,
          runStandings,
          teamNamesById,
        );

        if (!cancelled) {
          setPromotionCandidates(candidates);
        }
      } catch (promotionError) {
        console.error("Failed to load fame promotion candidates:", promotionError);
        if (!cancelled) {
          setPromotionCandidates([]);
        }
      }
    }

    loadPromotionCandidates();

    return () => {
      cancelled = true;
    };
  }, [
    eliminationRunId,
    gameData?.awayTeamId,
    gameData?.awayTeamName,
    gameData?.homeTeamId,
    gameData?.homeTeamName,
    resolvedGameMode,
    runStandings,
  ]);

  async function handleAcceptPromotion(candidate: FamePromotionCandidate) {
    if (!eliminationRunId) {
      return;
    }

    setPendingPromotionPlayerId(candidate.playerId);

    try {
      await acceptFamePromotion(eliminationRunId, candidate.playerId, candidate.targetTier);
      setPromotionCandidates((currentCandidates) =>
        currentCandidates.filter(
          (currentCandidate) =>
            currentCandidate.playerId !== candidate.playerId ||
            currentCandidate.targetTier !== candidate.targetTier,
        ),
      );
    } catch (promotionError) {
      console.error("Failed to accept fame promotion:", promotionError);
    } finally {
      setPendingPromotionPlayerId(null);
    }
  }

  async function handleDismissPromotion(candidate: FamePromotionCandidate) {
    if (!eliminationRunId) {
      return;
    }

    setPendingPromotionPlayerId(candidate.playerId);

    try {
      await dismissFamePromotion(eliminationRunId, candidate.playerId, candidate.targetTier);
      setPromotionCandidates((currentCandidates) =>
        currentCandidates.filter(
          (currentCandidate) =>
            currentCandidate.playerId !== candidate.playerId ||
            currentCandidate.targetTier !== candidate.targetTier,
        ),
      );
    } catch (promotionError) {
      console.error("Failed to dismiss fame promotion:", promotionError);
    } finally {
      setPendingPromotionPlayerId(null);
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#2b3a2e] text-[#E8E8D8] p-6 flex items-center justify-center" style={{ fontFamily: "'Moms Typewriter', monospace" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#C4A853]" />
          <div className="text-lg tracking-wider">Loading game summary...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !gameData) {
    return (
      <div className="min-h-screen bg-[#2b3a2e] text-[#E8E8D8] p-6 flex items-center justify-center" style={{ fontFamily: "'Moms Typewriter', monospace" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="text-lg text-red-400">
            {error || "Game data not available"}
          </div>
          <button
            onClick={() => navigate("/exhibition")}
            className="bg-[#3d4a42] border-2 border-[#C4A853] px-6 py-3 text-sm text-[#E8E8D8] tracking-wider hover:bg-[#4a5a50]"
            style={{ backgroundImage: `url(${chalkBgFaintImg})`, backgroundRepeat: 'repeat' }}
          >
            BACK TO MENU
          </button>
        </div>
      </div>
    );
  }

  // Extract data from game record
  const homeTeamId = gameData.homeTeamId;
  const awayTeamId = gameData.awayTeamId;
  const homeTeamName = gameData.homeTeamName;
  const awayTeamName = gameData.awayTeamName;
  const stadiumLabel = gameData.stadiumName;

  // Build batter stats from playerStats
  const normalizedAwayTeamId = normalizeTeamId(awayTeamId);
  const normalizedHomeTeamId = normalizeTeamId(homeTeamId);

  const allBatters = Object.entries(gameData.playerStats)
    .filter(([, stats]) => {
      const teamId = normalizeTeamId(stats.teamId);
      return (
        (teamId === normalizedAwayTeamId || teamId === normalizedHomeTeamId) &&
        typeof stats.playerName === "string" &&
        stats.playerName.trim().length > 0
      );
    })
    .map(([playerId, stats]) => {
      const teamId = normalizeTeamId(stats.teamId);
      const isAway = teamId === normalizedAwayTeamId;
      const plateAppearances = stats.pa;
      const hasOffensiveLine =
        plateAppearances > 0 || stats.h > 0 || stats.r > 0 || stats.rbi > 0;

      return {
        playerId,
        name: stats.playerName,
        isAway,
        teamId: stats.teamId,
        pa: plateAppearances,
        ab: stats.ab,
        r: stats.r,
        h: stats.h,
        hr: stats.hr,
        rbi: stats.rbi,
        bb: stats.bb,
        so: stats.k,
        avg: formatAvg(stats.h, stats.ab),
        hasOffensiveLine,
      };
    });

  // Build pitcher stats
  const allPitchers = gameData.pitcherGameStats
    .filter((pitcher) => {
      const teamId = normalizeTeamId(pitcher.teamId);
      return (
        (teamId === normalizedAwayTeamId || teamId === normalizedHomeTeamId) &&
        typeof pitcher.pitcherName === "string" &&
        pitcher.pitcherName.trim().length > 0 &&
        Number.isFinite(pitcher.outsRecorded)
      );
    })
    .map((pitcher) => {
      const teamId = normalizeTeamId(pitcher.teamId);
      const isAway = teamId === normalizedAwayTeamId;
      const outsRecorded = pitcher.outsRecorded;

      return {
        pitcherId: pitcher.pitcherId,
        name: pitcher.pitcherName,
        teamId: pitcher.teamId,
        isAway,
        ip: formatIP(outsRecorded),
        h: pitcher.hitsAllowed,
        r: pitcher.runsAllowed,
        er: pitcher.earnedRuns,
        bb: pitcher.walksAllowed,
        so: pitcher.strikeoutsThrown,
        isStarter: pitcher.isStarter,
        outsRecorded,
        hitsAllowed: pitcher.hitsAllowed,
        earnedRuns: pitcher.earnedRuns,
        walksAllowed: pitcher.walksAllowed,
        strikeoutsThrown: pitcher.strikeoutsThrown,
      };
    });

  const awayPitchers = allPitchers.filter((p) => p.isAway);
  const homePitchers = allPitchers.filter((p) => !p.isAway);
  const awayBatters = allBatters.filter((b) => b.isAway && b.hasOffensiveLine);
  const homeBatters = allBatters.filter((b) => !b.isAway && b.hasOffensiveLine);

  // Calculate team totals strictly from this game's playerStats rows.
  const awayHits = awayBatters.reduce((sum, batter) => sum + batter.h, 0);
  const homeHits = homeBatters.reduce((sum, batter) => sum + batter.h, 0);
  const awayErrors = allBatters
    .filter((batter) => batter.isAway)
    .reduce(
      (sum, batter) =>
        sum + gameData.playerStats[batter.playerId].fieldingErrors,
      0,
    );
  const homeErrors = allBatters
    .filter((batter) => !batter.isAway)
    .reduce(
      (sum, batter) =>
        sum + gameData.playerStats[batter.playerId].fieldingErrors,
      0,
    );

  // Inning-by-inning scoring from this completed game only.
  const archivedInningScores = gameData.inningScores ?? [];
  const regulationInnings = gameData.totalInnings ?? archivedInningScores.length;
  const playedInnings = Math.max(gameData.innings, regulationInnings);
  const numInnings = Math.min(archivedInningScores.length, playedInnings);
  const inningScores = archivedInningScores.slice(0, numInnings);
  console.log("[R3-R5] Rendering archived linescore with regulation cap", {
    gameId: gameData.gameId,
    archivedColumns: archivedInningScores.length,
    regulationInnings,
    displayedColumns: numInnings,
  });
  const scoreboard = {
    innings: inningScores,
    away: {
      runs: gameData.finalScore.away,
      hits: awayHits,
      errors: awayErrors,
    },
    home: {
      runs: gameData.finalScore.home,
      hits: homeHits,
      errors: homeErrors,
    },
  };

  // Determine winner
  const homeWon = gameData.finalScore.home > gameData.finalScore.away;
  const winnerName = homeWon ? homeTeamName : awayTeamName;

  const kblWpaCredits: KblWpaCredit[] = deriveKblWpaCredits({
    atBatEvents,
    fieldingEvents,
    betweenPlayEvents,
    totalInnings: gameData.totalInnings,
    awayTeamId,
    homeTeamId,
    startingLineups: gameHeader?.startingLineups,
  });
  const pogAwardSet = getGamePogAwardSet({
    kblWpaCredits,
    playersOfTheGame: gameData.playersOfTheGame,
    pogPlayerId: gameData.pogPlayerId,
    playerStats: gameData.playerStats,
    pitcherGameStats: gameData.pitcherGameStats,
    managerProfiles,
    managerDecisions: gameData.managerDecisions,
    managerDeploymentStints: gameData.managerDeploymentStints,
    managerLineupDeltas: gameData.managerLineupDeltas,
    eventLogAvailable:
      atBatEvents.length > 0 ||
      fieldingEvents.length > 0 ||
      betweenPlayEvents.length > 0,
  });
  const pogAwardCards = getVisiblePogAwards(pogAwardSet);
  const teamStandoutCards = pogAwardSet.teamStandouts;
  const currentGamePlayerIds = new Set<string>([
    ...Object.keys(gameData.playerStats ?? {}),
    ...gameData.pitcherGameStats.map((pitcher) => pitcher.pitcherId),
  ]);
  const runStandingsEntries = buildRunStandingsEntries(runStandings, currentGamePlayerIds, {
    [awayTeamId]: awayTeamName,
    [homeTeamId]: homeTeamName,
  });

  return (
    <div className="min-h-screen bg-[#2b3a2e] text-[#E8E8D8] p-6" style={{ fontFamily: "'Moms Typewriter', monospace" }}>
      <div className="max-w-4xl mx-auto">
        {/* Chalkboard container */}
        <div className="bg-[#3d4a42] border-2 border-[#556B55] rounded shadow-[0_0_30px_rgba(0,0,0,0.6)] relative" style={{ backgroundImage: `url(${chalkBgImg})`, backgroundRepeat: 'repeat' }}>
              {/* Header */}
              <div className="bg-[#1a2420] border-b border-[#C4A853]/30 px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#C4A853] text-[#1a2420] text-[10px] font-bold px-2 py-1 tracking-[0.2em]">
                      FINAL
                    </div>
                    <div
                      className="text-[#E8E8D8] text-lg font-bold tracking-[0.15em]"
                      style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
                    >
                      POST-GAME REPORT
                    </div>
                  </div>
                </div>
              </div>

              {/* Screen content */}
              <div className="p-6">
                {/* Final Score Banner - Fenway-style Scoreboard */}
                <div className="bg-[#1f2b21] border-2 border-[#314437] p-2 mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]">
                  {/* Stadium name header */}
                  <div className="text-center text-[#C4A853] text-xs font-bold tracking-[0.3em] mb-1">
                    {stadiumLabel}
                  </div>

                  {/* Scoreboard grid */}
                  <div
                    className="grid gap-[1px] mb-2"
                    style={{
                      gridTemplateColumns: `90px repeat(${numInnings}, 24px) 6px 28px 28px 28px`,
                    }}
                  >
                    {/* Header row */}
                    <div></div>
                    {Array.from({ length: numInnings }, (_, i) => i + 1).map(
                      (inning) => (
                        <div
                          key={inning}
                          className="text-[#E8E8D8] text-[9px] font-bold text-center"
                        >
                          {inning}
                        </div>
                      ),
                    )}
                    <div></div>
                    <div className="text-[#E8E8D8] text-[9px] font-bold text-center">
                      R
                    </div>
                    <div className="text-[#E8E8D8] text-[9px] font-bold text-center">
                      H
                    </div>
                    <div className="text-[#E8E8D8] text-[9px] font-bold text-center">
                      E
                    </div>

                    {/* Away team row */}
                    <div
                      className="text-[#E8E8D8] text-[11px] font-bold flex items-center pl-2"
                      style={{
                        textShadow: "1px 1px 0px rgba(0,0,0,0.7)",
                      }}
                    >
                      {awayTeamName.toUpperCase()}
                    </div>
                    {Array.from({ length: numInnings }, (_, idx) => {
                      const score = scoreboard.innings[idx]?.away;
                      return (
                        <div
                          key={idx}
                          className="bg-[#283828] border border-[#1a2420] text-[#E8E8D8] text-xs font-bold min-h-[20px] flex items-center justify-center"
                        >
                          {score !== undefined ? score : "-"}
                        </div>
                      );
                    })}
                    <div></div>
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">
                      {scoreboard.away.runs}
                    </div>
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">
                      {scoreboard.away.hits}
                    </div>
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">
                      {scoreboard.away.errors}
                    </div>

                    {/* Home team row */}
                    <div
                      className="text-[#E8E8D8] text-[11px] font-bold flex items-center pl-2"
                      style={{
                        textShadow: "1px 1px 0px rgba(0,0,0,0.7)",
                      }}
                    >
                      {homeTeamName.toUpperCase()}
                    </div>
                    {Array.from({ length: numInnings }, (_, idx) => {
                      const score = scoreboard.innings[idx]?.home;
                      return (
                        <div
                          key={idx}
                          className="bg-[#283828] border border-[#1a2420] text-[#E8E8D8] text-xs font-bold min-h-[20px] flex items-center justify-center"
                        >
                          {score !== undefined ? score : "-"}
                        </div>
                      );
                    })}
                    <div></div>
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">
                      {scoreboard.home.runs}
                    </div>
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">
                      {scoreboard.home.hits}
                    </div>
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">
                      {scoreboard.home.errors}
                    </div>
                  </div>

                  {/* Bottom indicator row - FINAL message */}
                  <div className="border-t border-[#C4A853]/40 pt-2 text-center">
                    <div
                      className="text-sm font-bold"
                      style={{
                        color: "#CBB89C",
                        textShadow: "1px 1px 2px black",
                      }}
                    >
                      ★ {winnerName.toUpperCase()} WIN! ★
                    </div>
                  </div>
                </div>

                <PostGameColumns
                  gameId={gameData.gameId}
                  homeTeamId={homeTeamId}
                  awayTeamId={awayTeamId}
                  homeTeamName={homeTeamName}
                  awayTeamName={awayTeamName}
                />

                <FameLeaderboardCard
                  game={gameData}
                  gameMode={resolvedGameMode}
                />

                {resolvedGameMode === "elimination" ? (
                  <FamePromotionBanner
                    candidates={promotionCandidates}
                    pendingPlayerId={pendingPromotionPlayerId}
                    onAccept={handleAcceptPromotion}
                    onDismiss={handleDismissPromotion}
                  />
                ) : null}

                {resolvedGameMode === "elimination" ? (
                  <RunStandingsTable
                    standings={runStandingsEntries}
                    isLoading={isRunStandingsLoading}
                  />
                ) : null}

                {/* Players of the game */}
                {pogAwardCards.map((award) => {
                  const playerStats = award.playerId
                    ? gameData.playerStats[award.playerId]
                    : undefined;
                  const pitcherStats = award.playerId
                    ? gameData.pitcherGameStats.find(
                        (pitcher) => pitcher.pitcherId === award.playerId,
                      )
                    : undefined;
                  const borderColor =
                    award.awardType === "overall" ? "#C4A853" : "#556B55";
                  const teamColor =
                    getTeamColors(award.teamId).primary || "#2b3a2e";
                  const displayName =
                    award.playerName ??
                    award.managerName ??
                    award.playerId ??
                    award.managerId ??
                    "Unknown";
                  return (
                    <div
                      key={`${award.awardType}-${award.playerId ?? award.managerId}`}
                      className="border-2 p-4 mb-3 rounded-sm"
                      style={{
                        borderColor,
                        background: `linear-gradient(${teamColor}30, ${teamColor}30), #1f2b21`,
                        backgroundImage: `url(${chalkBgImg}), linear-gradient(${teamColor}30, ${teamColor}30)`,
                        backgroundRepeat: 'repeat',
                        backgroundColor: '#1f2b21',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-4 h-4 text-[#C4A853]" />
                        <div className="text-xs text-[#C4A853] tracking-[0.2em] font-bold">
                          {getPogAwardDisplayLabel(award.awardType)}
                        </div>
                        <div className="text-[9px] text-[#a0a898] tracking-[0.16em]">
                          {getPogAwardPointsLabel(award)}
                        </div>
                      </div>
                      <div className="text-base text-[#E8E8D8] flex items-baseline gap-2" style={{ fontFamily: "'Tox Typewriter', monospace" }}>
                        <span>{displayName}</span>
                        <span className="text-[10px] text-[#a0a898]" style={{ fontFamily: "'Moms Typewriter', monospace" }}>
                          {award.valueLabel}
                        </span>
                      </div>
                      {playerStats ? (
                        <div className="text-[9px] text-[#a0a898] space-y-0.5 mt-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#E8E8D8]">{playerStats.h}</span>
                            <span>-</span>
                            <span>{playerStats.ab} AB</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{playerStats.bb} BB</span>
                            <span>•</span>
                            <span>{playerStats.k} SO</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{playerStats.rbi} RBI</span>
                            <span>•</span>
                            <span>{playerStats.r} R</span>
                          </div>
                        </div>
                      ) : pitcherStats ? (
                        <div className="text-[9px] text-[#a0a898] space-y-0.5 mt-1">
                          <div className="flex items-center gap-2">
                            <span>{formatIP(pitcherStats.outsRecorded)} IP</span>
                            <span>•</span>
                            <span>{pitcherStats.strikeoutsThrown} SO</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{pitcherStats.earnedRuns} ER</span>
                            <span>•</span>
                            <span>{pitcherStats.walksAllowed} BB</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[9px] text-[#a0a898] mt-1">
                          {award.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}

                {teamStandoutCards.length > 0 ? (
                  <div className="bg-[#1f2b21] border-2 border-[#314437] p-4 mb-4 rounded-sm">
                    <div className="text-xs text-[#C4A853] tracking-[0.3em] font-bold mb-3">
                      TEAM STANDOUTS
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {teamStandoutCards.map((award) => {
                        const teamColor =
                          getTeamColors(award.teamId).primary || "#2b3a2e";
                        const displayName =
                          award.playerName ?? award.playerId ?? "Unknown";
                        return (
                          <div
                            key={`${award.awardType}-${award.teamId}-${award.playerId}`}
                            className="border-2 border-[#556B55] p-3 rounded-sm"
                            style={{
                              background: `linear-gradient(${teamColor}24, ${teamColor}24), #1f2b21`,
                            }}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <Trophy className="w-4 h-4 text-[#C4A853]" />
                              <div className="text-[10px] text-[#C4A853] tracking-[0.18em] font-bold">
                                {getPogAwardDisplayLabel(award.awardType)}
                              </div>
                              <div className="text-[9px] text-[#a0a898] tracking-[0.16em]">
                                {getPogAwardPointsLabel(award)}
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-[#E8E8D8]" style={{ fontFamily: "'Tox Typewriter', monospace" }}>
                              {displayName}
                            </div>
                            <div className="mt-1 text-[9px] text-[#a0a898]">
                              {award.valueLabel} · Recognition only
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <ManagerWpaOverlay game={gameData} managerProfiles={managerProfiles} />

                {/* Box score preview */}
                <div className="bg-[#1f2b21] border-2 border-[#314437] p-4 mb-4 rounded-sm">
                  <button
                    onClick={() => setBoxScoreExpanded(!boxScoreExpanded)}
                    className="w-full text-center hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
                  >
                    <div className="text-xs text-[#C4A853] tracking-[0.3em] font-bold">BOX SCORE</div>
                    {boxScoreExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#E8E8D8]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#E8E8D8]" />
                    )}
                  </button>

                  {boxScoreExpanded && (
                    <div className="space-y-4 mt-3">
                      {/* Away Team Batting */}
                      {awayBatters.length > 0 && (
                        <div>
                          <div className="text-[10px] text-[#C4A853] mb-2 font-bold tracking-[0.2em]">
                            {awayTeamName.toUpperCase()} BATTING
                          </div>
                          <div className="text-[8px]">
                            <div className="grid grid-cols-9 gap-1 mb-1 text-[#a0a898]">
                              <div className="col-span-2 text-left">BATTER</div>
                              <div className="text-center">AB</div>
                              <div className="text-center">R</div>
                              <div className="text-center">H</div>
                              <div className="text-center">HR</div>
                              <div className="text-center">RBI</div>
                              <div className="text-center">BB</div>
                              <div className="text-center">SO</div>
                            </div>
                            {awayBatters.map((batter, idx) => (
                              <div
                                key={`${batter.playerId}-${idx}`}
                                className="grid grid-cols-9 gap-1 text-[#E8E8D8] py-[2px]"
                              >
                                <div className="col-span-2 text-left" style={{ fontFamily: "'Tox Typewriter', monospace" }}>
                                  {batter.name}
                                </div>
                                <div className="text-center">{batter.ab}</div>
                                <div className="text-center">{batter.r}</div>
                                <div className="text-center">{batter.h}</div>
                                <div className="text-center">{batter.hr}</div>
                                <div className="text-center">{batter.rbi}</div>
                                <div className="text-center">{batter.bb}</div>
                                <div className="text-center">{batter.so}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Divider */}
                      <div className="border-t border-[#314437]"></div>

                      {/* Home Team Batting */}
                      {homeBatters.length > 0 && (
                        <div>
                          <div className="text-[10px] text-[#C4A853] mb-2 font-bold tracking-[0.2em]">
                            {homeTeamName.toUpperCase()} BATTING
                          </div>
                          <div className="text-[8px]">
                            <div className="grid grid-cols-9 gap-1 mb-1 text-[#a0a898]">
                              <div className="col-span-2 text-left">BATTER</div>
                              <div className="text-center">AB</div>
                              <div className="text-center">R</div>
                              <div className="text-center">H</div>
                              <div className="text-center">HR</div>
                              <div className="text-center">RBI</div>
                              <div className="text-center">BB</div>
                              <div className="text-center">SO</div>
                            </div>
                            {homeBatters.map((batter, idx) => (
                              <div
                                key={`${batter.playerId}-${idx}`}
                                className="grid grid-cols-9 gap-1 text-[#E8E8D8] py-[2px]"
                              >
                                <div className="col-span-2 text-left" style={{ fontFamily: "'Tox Typewriter', monospace" }}>
                                  {batter.name}
                                </div>
                                <div className="text-center">{batter.ab}</div>
                                <div className="text-center">{batter.r}</div>
                                <div className="text-center">{batter.h}</div>
                                <div className="text-center">{batter.hr}</div>
                                <div className="text-center">{batter.rbi}</div>
                                <div className="text-center">{batter.bb}</div>
                                <div className="text-center">{batter.so}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Divider */}
                      <div className="border-t border-[#314437]"></div>

                      {/* Away Team Pitching */}
                      {awayPitchers.length > 0 && (
                        <div>
                          <div className="text-[10px] text-[#C4A853] mb-2 font-bold tracking-[0.2em]">
                            {awayTeamName.toUpperCase()} PITCHING
                          </div>
                          <div className="text-[8px]">
                            <div className="grid grid-cols-8 gap-1 mb-1 text-[#a0a898]">
                              <div className="col-span-2 text-left">
                                PITCHER
                              </div>
                              <div className="text-center">IP</div>
                              <div className="text-center">H</div>
                              <div className="text-center">R</div>
                              <div className="text-center">ER</div>
                              <div className="text-center">BB</div>
                              <div className="text-center">SO</div>
                            </div>
                            {awayPitchers.map((pitcher, idx) => (
                              <div
                                key={idx}
                                className="grid grid-cols-8 gap-1 text-[#E8E8D8] py-[2px]"
                              >
                                <div className="col-span-2 text-left" style={{ fontFamily: "'Tox Typewriter', monospace" }}>
                                  {pitcher.name}
                                </div>
                                <div className="text-center">{pitcher.ip}</div>
                                <div className="text-center">{pitcher.h}</div>
                                <div className="text-center">{pitcher.r}</div>
                                <div className="text-center">{pitcher.er}</div>
                                <div className="text-center">{pitcher.bb}</div>
                                <div className="text-center">{pitcher.so}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Divider */}
                      <div className="border-t border-[#314437]"></div>

                      {/* Home Team Pitching */}
                      {homePitchers.length > 0 && (
                        <div>
                          <div className="text-[10px] text-[#C4A853] mb-2 font-bold tracking-[0.2em]">
                            {homeTeamName.toUpperCase()} PITCHING
                          </div>
                          <div className="text-[8px]">
                            <div className="grid grid-cols-8 gap-1 mb-1 text-[#a0a898]">
                              <div className="col-span-2 text-left">
                                PITCHER
                              </div>
                              <div className="text-center">IP</div>
                              <div className="text-center">H</div>
                              <div className="text-center">R</div>
                              <div className="text-center">ER</div>
                              <div className="text-center">BB</div>
                              <div className="text-center">SO</div>
                            </div>
                            {homePitchers.map((pitcher, idx) => (
                              <div
                                key={idx}
                                className="grid grid-cols-8 gap-1 text-[#E8E8D8] py-[2px]"
                              >
                                <div className="col-span-2 text-left" style={{ fontFamily: "'Tox Typewriter', monospace" }}>
                                  {pitcher.name}
                                </div>
                                <div className="text-center">{pitcher.ip}</div>
                                <div className="text-center">{pitcher.h}</div>
                                <div className="text-center">{pitcher.r}</div>
                                <div className="text-center">{pitcher.er}</div>
                                <div className="text-center">{pitcher.bb}</div>
                                <div className="text-center">{pitcher.so}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Show message if no pitcher stats */}
                      {awayPitchers.length === 0 &&
                        homePitchers.length === 0 &&
                        awayBatters.length === 0 &&
                        homeBatters.length === 0 && (
                          <div className="text-center text-[#a0a898] text-xs py-4">
                            No box score statistics recorded
                          </div>
                        )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-stretch justify-between">
                  {/* Super Mega Baseball Logo — keeps original branding + Press Start 2P font */}
                  <div className="bg-white border-[3px] border-[#0066FF] px-[10px] flex flex-col items-center justify-center shadow-[1px_1px_0px_0px_#DD0000]" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                    <div className="text-[5px] text-[#DD0000] tracking-wide leading-tight">
                      SUPER MEGA
                    </div>
                    <div className="text-[7px] text-[#0066FF] tracking-wide leading-tight mt-[2px]">
                      BASEBALL
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      // Route based on game mode
                      if (resolvedGameMode === "exhibition") {
                        navigate("/exhibition");
                      } else if (resolvedGameMode === "elimination" && eliminationRunId) {
                        // Return to elimination bracket home
                        navigate(`/elimination/${eliminationRunId}`);
                      } else if (resolvedGameMode === "playoff") {
                        // Return to franchise home (bracket tab)
                        navigate(`/franchise/${franchiseId}`, {
                          state: {
                            ...baseNavigationState,
                            refreshAfterGame: true,
                            refreshToken: Date.now(),
                          },
                        });
                      } else if (resolvedGameMode === "franchise") {
                        navigate(`/franchise/${franchiseId}`, {
                          state: {
                            ...baseNavigationState,
                            refreshAfterGame: true,
                            refreshToken: Date.now(),
                          },
                        });
                      } else {
                        navigate("/");
                      }
                    }}
                    className="bg-[#3d4a42] border-2 border-[#C4A853] py-3 px-6 text-sm text-[#E8E8D8] tracking-[0.2em] font-bold hover:bg-[#4a5a50] active:scale-95 transition-transform"
                    style={{ backgroundImage: `url(${chalkBgFaintImg})`, backgroundRepeat: 'repeat' }}
                  >
                    CONTINUE
                  </button>
                </div>
              </div>
        </div>
      </div>
    </div>
  );
}
