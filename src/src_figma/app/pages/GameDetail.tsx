import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Loader2, Trophy, TrendingUp } from "lucide-react";
import { getTeamColors } from "@/config/teamColors";
import { getCompletedGameById, type CompletedGameRecord } from "../../utils/gameStorage";
import { getAllCanonicalPlayers } from "../../../utils/almanacStorage";
import { getArchiveInstanceIdForGame } from "../../../utils/almanacQueries";
import { listManagerProfiles } from "../../../utils/managerIdentityStorage";
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
  aggregateKblWpaCredits,
  deriveActualAtBatWpa,
  deriveKblWpaCredits,
  type KblWpaCredit,
} from "../../../utils/kblWpaAttribution";
import {
  getGamePogAwardSet,
  getPogAwardDisplayLabel,
  getPogAwardPointsLabel,
  type PogAward,
  type PogAwardSet,
} from "../../../utils/pogAwards";
import { ManagerWpaOverlay } from "../components/ManagerWpaOverlay";
import { WinProbChart } from "../components/WinProbChart";
import type { ManagerProfile } from "../../../types/managerWpa";

type CanonicalLookup = Record<string, string>;

interface LoadedGameData {
  game: CompletedGameRecord;
  atBatEvents: AtBatEvent[];
  fieldingEvents: FieldingEvent[];
  betweenPlayEvents: BetweenPlayEvent[];
  gameHeader: GameHeader | null;
  canonicalLookup: CanonicalLookup;
  managerProfiles: ManagerProfile[];
}

function normalizeTeamId(teamId: string | undefined | null): string {
  return (teamId ?? "").trim().toLowerCase();
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

function formatBattingAverage(hits: number, atBats: number): string {
  if (atBats <= 0) {
    return ".000";
  }

  return (hits / atBats).toFixed(3).replace(/^0/, "");
}

function formatIP(outsRecorded: number): string {
  const fullInnings = Math.floor(outsRecorded / 3);
  const remainder = outsRecorded % 3;
  return `${fullInnings}.${remainder}`;
}

function formatERA(earnedRuns: number, outsRecorded: number): string {
  if (outsRecorded <= 0) {
    return earnedRuns > 0 ? "INF" : "0.00";
  }

  return ((earnedRuns * 27) / outsRecorded).toFixed(2);
}

function formatSignedDecimal(value: number, digits: number = 3): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

function formatLI(value: number): string {
  return value.toFixed(2);
}

function humanizeToken(value: string | undefined | null): string {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatAllocationMode(mode: KblWpaCredit["allocationMode"]): string {
  switch (mode) {
    case "raw_unit":
      return "Raw Unit";
    case "counterfactual":
      return "Counterfactual";
    case "overlay":
      return "Overlay";
    default:
      return "Ratio";
  }
}

function formatBaseNumber(base: number | undefined): string {
  if (base === 1) return "1B";
  if (base === 2) return "2B";
  if (base === 3) return "3B";
  if (base === 4) return "Home";
  return "Base";
}

function getVisiblePogAwards(awardSet: PogAwardSet): PogAward[] {
  return [
    ...((awardSet.overall ? [awardSet.overall] : []) as PogAward[]),
    ...awardSet.playerRoleAwards,
    ...((awardSet.managerAward ? [awardSet.managerAward] : []) as PogAward[]),
  ];
}

function buildBaseStateLabel(runners: AtBatEvent["runners"]): string {
  const occupied = ([
    ["1B", runners.first?.runnerName],
    ["2B", runners.second?.runnerName],
    ["3B", runners.third?.runnerName],
  ] as const).filter(([, name]) => Boolean(name));

  if (occupied.length === 0) {
    return "Bases empty";
  }

  return occupied.map(([base, name]) => `${base} ${name}`).join(" | ");
}

function buildSituationLabel(event: AtBatEvent): string {
  const teamAtBat = event.halfInning === "TOP" ? "Away" : "Home";
  return `${event.halfInning === "TOP" ? "T" : "B"}${event.inning} | ${event.outs} out${event.outs === 1 ? "" : "s"} | ${teamAtBat} batting | ${event.awayScore}-${event.homeScore} | ${buildBaseStateLabel(event.runners)}`;
}

function loadCanonicalLookup(players: Awaited<ReturnType<typeof getAllCanonicalPlayers>>): CanonicalLookup {
  const lookup: CanonicalLookup = {};

  for (const player of players) {
    for (const instance of player.instances) {
      lookup[instance.playerIdInInstance] = player.canonicalId;
    }
  }

  return lookup;
}

function SectionFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-[6px] border-[#23262F] bg-[#101217] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.65)] sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[11px] uppercase tracking-[0.32em] text-[#D8A84A]">{title}</h2>
          {subtitle ? (
            <p className="mt-2 text-[8px] leading-5 text-[#98A1B3] sm:text-[9px]">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="border-[4px] border-dashed border-[#2C3140] bg-[#0C0E13] px-4 py-6 text-center text-[8px] uppercase tracking-[0.24em] text-[#7F8798] sm:text-[9px]">
      {label}
    </div>
  );
}

function PlayerNameLink({
  playerId,
  playerName,
  canonicalLookup,
  className = "",
}: {
  playerId: string;
  playerName: string;
  canonicalLookup: CanonicalLookup;
  className?: string;
}) {
  const canonicalId = canonicalLookup[playerId];
  const fallbackQuery = `/almanac/players?q=${encodeURIComponent(playerName)}`;

  return (
    <Link
      to={canonicalId ? `/almanac/players/${canonicalId}` : fallbackQuery}
      className={`text-[#8CCBFF] underline decoration-[#35597C] decoration-2 underline-offset-4 hover:text-white ${className}`.trim()}
    >
      {playerName}
    </Link>
  );
}

function TeamNameLink({
  leagueId,
  teamId,
  teamName,
  className = "",
}: {
  leagueId: string;
  teamId: string;
  teamName: string;
  className?: string;
}) {
  return (
    <Link
      to={`/almanac/teams/${encodeURIComponent(leagueId)}/${encodeURIComponent(teamId)}`}
      className={`underline decoration-white/30 decoration-2 underline-offset-4 hover:text-white ${className}`.trim()}
    >
      {teamName}
    </Link>
  );
}

export function GameDetail() {
  const { gameId } = useParams<{ gameId: string }>();
  const [data, setData] = useState<LoadedGameData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setData(null);
      setError(null);
      setIsLoading(true);

      if (!gameId) {
        setError("No game ID provided.");
        setIsLoading(false);
        return;
      }

      try {
        const [game, atBatEvents, fieldingEvents, betweenPlayEvents, gameHeader, canonicalPlayers, managerProfiles] = await Promise.all([
          getCompletedGameById(gameId),
          getGameEvents(gameId),
          getGameFieldingEvents(gameId).catch(() => []),
          getBetweenPlayEvents(gameId).catch(() => []),
          getGameHeader(gameId).catch(() => null),
          getAllCanonicalPlayers().catch(() => []),
          listManagerProfiles().catch(() => []),
        ]);

        if (cancelled) {
          return;
        }

        if (!game) {
          setError("Game not found.");
          return;
        }

        setData({
          game,
          atBatEvents,
          fieldingEvents,
          betweenPlayEvents,
          gameHeader,
          canonicalLookup: loadCanonicalLookup(canonicalPlayers),
          managerProfiles,
        });
      } catch (loadError) {
        console.error("Failed to load game detail:", loadError);
        if (!cancelled) {
          setError("Failed to load game detail.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const derived = useMemo(() => {
    if (!data) {
      return null;
    }

    const { game, atBatEvents, fieldingEvents, betweenPlayEvents, gameHeader } = data;
    const awayTeamId = normalizeTeamId(game.awayTeamId);
    const homeTeamId = normalizeTeamId(game.homeTeamId);

    const playerNames = new Map<string, string>();
    const teamByPlayer = new Map<string, string>();
    const positionByPlayer = new Map<string, string>();
    const battingOrderByPlayer = new Map<string, number>();

    for (const [playerId, stats] of Object.entries(game.playerStats)) {
      playerNames.set(playerId, stats.playerName);
      teamByPlayer.set(playerId, stats.teamId);
      const snapshotPosition = game.playerRatingsSnapshots?.[playerId]?.primaryPosition;
      if (snapshotPosition) {
        positionByPlayer.set(playerId, snapshotPosition);
      }
    }

    for (const pitcher of game.pitcherGameStats) {
      playerNames.set(pitcher.pitcherId, pitcher.pitcherName);
      teamByPlayer.set(pitcher.pitcherId, pitcher.teamId);
      positionByPlayer.set(pitcher.pitcherId, "P");
    }

    atBatEvents.forEach((event, index) => {
      playerNames.set(event.batterId, event.batterName);
      playerNames.set(event.pitcherId, event.pitcherName);
      teamByPlayer.set(event.batterId, event.batterTeamId);
      teamByPlayer.set(event.pitcherId, event.pitcherTeamId);

      if (event.batterContext?.position && !positionByPlayer.has(event.batterId)) {
        positionByPlayer.set(event.batterId, event.batterContext.position);
      }

      if (
        typeof event.batterContext?.battingOrder === "number" &&
        !battingOrderByPlayer.has(event.batterId)
      ) {
        battingOrderByPlayer.set(event.batterId, event.batterContext.battingOrder);
      }

      if (!battingOrderByPlayer.has(event.batterId)) {
        battingOrderByPlayer.set(event.batterId, index + 1);
      }
    });

    const kblWpaCredits: KblWpaCredit[] = deriveKblWpaCredits({
      atBatEvents,
      fieldingEvents,
      betweenPlayEvents,
      totalInnings: game.totalInnings,
      awayTeamId: game.awayTeamId,
      homeTeamId: game.homeTeamId,
      startingLineups: gameHeader?.startingLineups,
    });
    const kblCreditsByEvent = new Map<string, KblWpaCredit[]>();
    for (const credit of kblWpaCredits) {
      const rows = kblCreditsByEvent.get(credit.eventId) ?? [];
      rows.push(credit);
      kblCreditsByEvent.set(credit.eventId, rows);
    }
    const teamNameFor = (teamId: string) => {
      const normalized = normalizeTeamId(teamId);
      if (normalized === awayTeamId) return game.awayTeamName;
      if (normalized === homeTeamId) return game.homeTeamName;
      return humanizeToken(teamId);
    };
    const decorateAuditCredits = (
      credits: KblWpaCredit[],
      battingTeamId: string,
      defensiveTeamId: string,
    ) =>
      credits
        .slice()
        .sort((left, right) => Math.abs(right.wpa) - Math.abs(left.wpa) || left.playerName.localeCompare(right.playerName))
        .map((credit) => {
          const normalizedTeamId = normalizeTeamId(credit.teamId);
          const side = credit.isOverlay
            ? "Overlay"
            : normalizedTeamId === normalizeTeamId(battingTeamId)
              ? "Batting"
              : normalizedTeamId === normalizeTeamId(defensiveTeamId)
                ? "Defense"
                : "Team";
          return {
            ...credit,
            side,
            teamName: teamNameFor(credit.teamId),
          };
        });
    const kblWpaAuditRows = [
      ...atBatEvents.map((event) => {
        const credits = kblCreditsByEvent.get(event.eventId) ?? [];
        const actual = deriveActualAtBatWpa(event, game.totalInnings);
        const battingBudget = actual.wpa;
        const defensiveBudget = -actual.wpa;
        const nonOverlayCredits = credits.filter((credit) => !credit.isOverlay);
        const battingTotal = nonOverlayCredits
          .filter((credit) => normalizeTeamId(credit.teamId) === normalizeTeamId(event.batterTeamId))
          .reduce((sum, credit) => sum + credit.wpa, 0);
        const defensiveTotal = nonOverlayCredits
          .filter((credit) => normalizeTeamId(credit.teamId) === normalizeTeamId(event.pitcherTeamId))
          .reduce((sum, credit) => sum + credit.wpa, 0);
        return {
          eventId: event.eventId,
          eventIndex: event.eventIndex,
          timestamp: event.timestamp,
          source: "At-Bat",
          label: `${event.batterName} vs ${event.pitcherName}`,
          result: humanizeToken(event.result),
          situation: `${event.halfInning === "TOP" ? "T" : "B"}${event.inning} | ${event.outs} out${event.outs === 1 ? "" : "s"} | ${event.awayScore}-${event.homeScore}`,
          battingBudget,
          defensiveBudget,
          battingTotal,
          defensiveTotal,
          allocationModes: Array.from(new Set(credits.map((credit) => credit.allocationMode))).map(formatAllocationMode).join(" / ") || "None",
          credits: decorateAuditCredits(credits, event.batterTeamId, event.pitcherTeamId),
        };
      }),
      ...betweenPlayEvents.map((event) => {
        const credits = kblCreditsByEvent.get(event.eventId) ?? [];
        const isTop = event.gameState?.halfInning === "TOP";
        const battingTeamId = isTop ? game.awayTeamId : game.homeTeamId;
        const defensiveTeamId = isTop ? game.homeTeamId : game.awayTeamId;
        const nonOverlayCredits = credits.filter((credit) => !credit.isOverlay);
        const battingTotal = nonOverlayCredits
          .filter((credit) => normalizeTeamId(credit.teamId) === normalizeTeamId(battingTeamId))
          .reduce((sum, credit) => sum + credit.wpa, 0);
        const defensiveTotal = nonOverlayCredits
          .filter((credit) => normalizeTeamId(credit.teamId) === normalizeTeamId(defensiveTeamId))
          .reduce((sum, credit) => sum + credit.wpa, 0);
        const runnerLabel = event.runnerAction
          ? `${event.runnerAction.runnerName ?? event.runnerAction.runnerId} ${formatBaseNumber(event.runnerAction.fromBase)} to ${formatBaseNumber(event.runnerAction.toBase)}`
          : humanizeToken(event.type);
        return {
          eventId: event.eventId,
          eventIndex: event.eventIndex,
          timestamp: event.timestamp,
          source: "Between Play",
          label: runnerLabel,
          result: humanizeToken(event.type),
          situation: event.gameState
            ? `${event.gameState.halfInning === "TOP" ? "T" : "B"}${event.gameState.inning} | ${event.gameState.outs} out${event.gameState.outs === 1 ? "" : "s"} | ${event.gameState.score.away}-${event.gameState.score.home}`
            : "No game state",
          battingBudget: battingTotal,
          defensiveBudget: defensiveTotal,
          battingTotal,
          defensiveTotal,
          allocationModes: Array.from(new Set(credits.map((credit) => credit.allocationMode))).map(formatAllocationMode).join(" / ") || "None",
          credits: decorateAuditCredits(credits, battingTeamId, defensiveTeamId),
        };
      }),
    ]
      .filter((row) => row.credits.length > 0)
      .sort((left, right) => left.eventIndex - right.eventIndex || left.timestamp - right.timestamp);
    const wpaLeaderboard = aggregateKblWpaCredits(kblWpaCredits).map((entry) => ({
      playerId: entry.playerId,
      playerName: entry.playerName,
      teamId: entry.teamId,
      wpa: entry.totalWpa,
      roles: [
        entry.battingWpa ? "BAT" : null,
        entry.pitchingWpa ? "PIT" : null,
        entry.catchingWpa ? "C" : null,
        entry.fieldingWpa ? "FLD" : null,
        entry.baserunningWpa ? "BSR" : null,
      ].filter(Boolean).join(" / "),
    }));

    const pogAwardSet = getGamePogAwardSet({
      kblWpaCredits,
      playersOfTheGame: game.playersOfTheGame,
      pogPlayerId: game.pogPlayerId,
      playerStats: game.playerStats,
      pitcherGameStats: game.pitcherGameStats,
      managerProfiles: data.managerProfiles,
      managerDecisions: game.managerDecisions,
      managerDeploymentStints: game.managerDeploymentStints,
      managerLineupDeltas: game.managerLineupDeltas,
      eventLogAvailable:
        atBatEvents.length > 0 ||
        fieldingEvents.length > 0 ||
        betweenPlayEvents.length > 0,
    });
    const pogAwards = getVisiblePogAwards(pogAwardSet);
    const teamStandouts = pogAwardSet.teamStandouts;

    const battingLines = Object.entries(game.playerStats)
      .filter(([, stats]) => {
        const teamId = normalizeTeamId(stats.teamId);
        return teamId === awayTeamId || teamId === homeTeamId;
      })
      .map(([playerId, stats]) => ({
        playerId,
        playerName: stats.playerName,
        teamId: stats.teamId,
        pos: positionByPlayer.get(playerId) ?? "DH",
        sortOrder: battingOrderByPlayer.get(playerId) ?? 999,
        ab: stats.ab,
        r: stats.r,
        h: stats.h,
        rbi: stats.rbi,
        bb: stats.bb,
        so: stats.k,
        ba: formatBattingAverage(stats.h, stats.ab),
        hasLine:
          stats.pa > 0 ||
          stats.ab > 0 ||
          stats.h > 0 ||
          stats.r > 0 ||
          stats.rbi > 0 ||
          stats.bb > 0 ||
          stats.k > 0,
      }))
      .filter((line) => line.hasLine)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.playerName.localeCompare(right.playerName));

    const pitchingLines = game.pitcherGameStats
      .filter((pitcher) => {
        const teamId = normalizeTeamId(pitcher.teamId);
        return teamId === awayTeamId || teamId === homeTeamId;
      })
      .map((pitcher) => ({
        playerId: pitcher.pitcherId,
        playerName: pitcher.pitcherName,
        teamId: pitcher.teamId,
        isStarter: pitcher.isStarter,
        entryInning: pitcher.entryInning,
        ip: formatIP(pitcher.outsRecorded),
        h: pitcher.hitsAllowed,
        r: pitcher.runsAllowed,
        er: pitcher.earnedRuns,
        bb: pitcher.walksAllowed,
        so: pitcher.strikeoutsThrown,
        era: formatERA(pitcher.earnedRuns, pitcher.outsRecorded),
        decision: pitcher.decision,
        save: pitcher.save,
        hold: pitcher.hold,
      }))
      .sort((left, right) => {
        if (left.isStarter !== right.isStarter) {
          return left.isStarter ? -1 : 1;
        }
        return left.entryInning - right.entryInning || left.playerName.localeCompare(right.playerName);
      });

    const playLog = atBatEvents.map((event) => ({
      eventId: event.eventId,
      inning: `${event.halfInning === "TOP" ? "T" : "B"}${event.inning}`,
      matchup: `${event.batterName} vs ${event.pitcherName}`,
      result: humanizeToken(event.result),
      rbi: event.rbiCount,
      runners: buildBaseStateLabel(event.runners),
      wpa: event.wpa,
      detail: `${buildBaseStateLabel(event.runnersAfter)} | Score ${event.awayScoreAfter}-${event.homeScoreAfter}`,
    }));

    const clutchMoments = atBatEvents
      .filter((event) => event.isClutch || event.leverageIndex >= 1.5)
      .sort((left, right) => Math.abs(right.wpa) - Math.abs(left.wpa) || right.leverageIndex - left.leverageIndex);

    const notableEvents = atBatEvents
      .filter((event) => Math.abs(event.wpa) > 0.15 || event.leverageIndex > 3)
      .sort((left, right) => Math.abs(right.wpa) - Math.abs(left.wpa) || right.leverageIndex - left.leverageIndex);

    const pitcherDecisions = {
      wins: pitchingLines.filter((line) => line.decision === "W"),
      losses: pitchingLines.filter((line) => line.decision === "L"),
      saves: pitchingLines.filter((line) => line.save),
      holds: pitchingLines.filter((line) => line.hold),
    };

    return {
      pogAwards,
      teamStandouts,
      wpaLeaderboard,
      battingLines,
      pitchingLines,
      kblWpaAuditRows,
      playLog,
      clutchMoments,
      notableEvents,
      pitcherDecisions,
      playerNames,
      teamByPlayer,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black px-4 py-10 text-white font-['Press_Start_2P'] sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-center py-24">
          <div className="flex flex-col items-center gap-5 border-[6px] border-[#23262F] bg-[#101217] px-8 py-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.7)]">
            <Loader2 className="h-8 w-8 animate-spin text-[#D8A84A]" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E7E9F1]">Loading Game</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data || !derived) {
    return (
      <div className="min-h-screen bg-black px-4 py-10 text-white font-['Press_Start_2P'] sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 border-[6px] border-[#341717] bg-[#140C0C] px-8 py-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,0.7)]">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#FF9E9E]">{error ?? "Game detail unavailable."}</div>
          <Link
            to="/almanac/games"
            className="inline-flex items-center gap-3 border-[5px] border-[#3366FF] bg-[#111111] px-4 py-3 text-[10px] text-white shadow-[6px_6px_0px_0px_rgba(221,0,0,0.85)] transition hover:bg-[#1a1a1a]"
          >
            <ArrowLeft className="h-4 w-4" />
            GAME BROWSER
          </Link>
        </div>
      </div>
    );
  }

  const { game, atBatEvents, canonicalLookup } = data;
  const {
    pogAwards,
    teamStandouts,
    wpaLeaderboard,
    battingLines,
    pitchingLines,
    kblWpaAuditRows,
    playLog,
    clutchMoments,
    notableEvents,
    pitcherDecisions,
  } = derived;

  const leagueId =
    getArchiveInstanceIdForGame(game) ??
    game.leagueId ??
    game.competitionId ??
    "exhibition";
  const awayColors = getTeamColors(game.awayTeamId);
  const homeColors = getTeamColors(game.homeTeamId);

  const battingByTeam = {
    away: battingLines.filter((line) => normalizeTeamId(line.teamId) === normalizeTeamId(game.awayTeamId)),
    home: battingLines.filter((line) => normalizeTeamId(line.teamId) === normalizeTeamId(game.homeTeamId)),
  };

  const pitchingByTeam = {
    away: pitchingLines.filter((line) => normalizeTeamId(line.teamId) === normalizeTeamId(game.awayTeamId)),
    home: pitchingLines.filter((line) => normalizeTeamId(line.teamId) === normalizeTeamId(game.homeTeamId)),
  };

  return (
    <div className="min-h-screen bg-black px-4 py-6 text-white font-['Press_Start_2P'] sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/almanac/games"
            className="inline-flex items-center gap-3 self-start border-[5px] border-[#3366FF] bg-[#111111] px-4 py-3 text-[10px] text-white shadow-[6px_6px_0px_0px_rgba(221,0,0,0.85)] transition hover:bg-[#1a1a1a]"
          >
            <ArrowLeft className="h-4 w-4" />
            GAME BROWSER
          </Link>
          <div className="self-start border-[6px] border-[#3366FF] bg-white px-4 py-4 text-black shadow-[8px_8px_0px_0px_#DD0000] sm:self-auto">
            <div className="text-[10px] tracking-[0.28em] text-[#3366FF]">SMB</div>
            <div className="mt-2 text-xs leading-5 text-[#DD0000]">ALMANAC GAME FILE</div>
          </div>
        </div>

        <section className="border-[6px] border-[#23262F] bg-[#101217] p-5 shadow-[10px_10px_0px_0px_rgba(0,0,0,0.72)] sm:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[9px] uppercase tracking-[0.32em] text-[#D8A84A]">Score Header</div>
              <div className="mt-3 text-[9px] leading-5 text-[#B0B8CA]">
                FINAL | {formatDate(game.date)} | {game.stadiumName ?? "Archived Venue"}
              </div>
            </div>
            <div className="inline-flex items-center gap-2 self-start border-[4px] border-[#31384A] bg-[#0C0F15] px-3 py-2 text-[8px] uppercase tracking-[0.26em] text-[#B0B8CA]">
              <TrendingUp className="h-4 w-4 text-[#D8A84A]" />
              {atBatEvents.length} Logged At-Bats
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
            <div
              className="border-[5px] p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,0.35)]"
              style={{ backgroundColor: awayColors.primary, borderColor: awayColors.secondary }}
            >
              <div className="text-[8px] uppercase tracking-[0.28em] text-white/75">Away</div>
              <div className="mt-3 text-sm leading-6 text-white">
                <TeamNameLink
                  leagueId={leagueId}
                  teamId={game.awayTeamId}
                  teamName={game.awayTeamName}
                />
              </div>
            </div>

            <div className="flex min-w-[170px] items-center justify-center border-[5px] border-[#353C4B] bg-[#0A0D12] px-4 py-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.45)]">
              <div className="flex items-end gap-3 text-center">
                <div className="text-3xl text-[#E7E9F1] sm:text-4xl">{game.finalScore.away}</div>
                <div className="pb-1 text-[10px] uppercase tracking-[0.28em] text-[#77819A]">Final</div>
                <div className="text-3xl text-[#E7E9F1] sm:text-4xl">{game.finalScore.home}</div>
              </div>
            </div>

            <div
              className="border-[5px] p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,0.35)]"
              style={{ backgroundColor: homeColors.primary, borderColor: homeColors.secondary }}
            >
              <div className="text-[8px] uppercase tracking-[0.28em] text-white/75">Home</div>
              <div className="mt-3 text-sm leading-6 text-white">
                <TeamNameLink
                  leagueId={leagueId}
                  teamId={game.homeTeamId}
                  teamName={game.homeTeamName}
                />
              </div>
            </div>
          </div>
        </section>

        <SectionFrame
          title="POG Awards"
          subtitle="Canonical per-game awards derived from KBL WPA first, with legacy stored POG used only when WPA awards are unavailable."
        >
          {pogAwards.length === 0 ? (
            <EmptyState label="No POG awards available." />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {pogAwards.map((award) => {
                const displayName =
                  award.playerName ??
                  award.managerName ??
                  award.playerId ??
                  award.managerId ??
                  "Unknown";
                return (
                  <div
                    key={`${award.awardType}-${award.playerId ?? award.managerId}`}
                    className="border-[4px] border-[#32394B] bg-[#0B0E14] p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.45)]"
                  >
                    <div className="flex items-center gap-3 text-[#D8A84A]">
                      <Trophy className="h-5 w-5" />
                      <span className="text-[9px] uppercase tracking-[0.25em]">
                        {getPogAwardDisplayLabel(award.awardType)}
                      </span>
                    </div>
                    <div className="mt-3 text-[8px] uppercase tracking-[0.24em] text-[#98A1B3]">
                      {getPogAwardPointsLabel(award)}
                    </div>
                    <div className="mt-4 text-[10px] leading-6 text-white">
                      {award.playerId ? (
                        <PlayerNameLink
                          playerId={award.playerId}
                          playerName={displayName}
                          canonicalLookup={canonicalLookup}
                        />
                      ) : (
                        displayName
                      )}
                    </div>
                    <div className="mt-3 text-[8px] uppercase tracking-[0.24em] text-[#98A1B3]">
                      {award.teamId
                        ? normalizeTeamId(award.teamId) === normalizeTeamId(game.awayTeamId)
                          ? game.awayTeamName
                          : game.homeTeamName
                        : "Archived Award"}
                    </div>
                    <div className="mt-4 text-[12px] text-[#E7E9F1]">
                      {award.valueLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionFrame>

        {teamStandouts.length > 0 ? (
          <SectionFrame
            title="Team Standouts"
            subtitle="Display-only recognition for each team's top positive player WPA; these do not add POG points."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {teamStandouts.map((award) => {
                const displayName =
                  award.playerName ??
                  award.playerId ??
                  "Unknown";
                return (
                  <div
                    key={`${award.awardType}-${award.teamId}-${award.playerId}`}
                    className="border-[4px] border-[#32394B] bg-[#0B0E14] p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.45)]"
                  >
                    <div className="flex items-center gap-3 text-[#D8A84A]">
                      <Trophy className="h-5 w-5" />
                      <span className="text-[9px] uppercase tracking-[0.25em]">
                        {getPogAwardDisplayLabel(award.awardType)}
                      </span>
                    </div>
                    <div className="mt-3 text-[8px] uppercase tracking-[0.24em] text-[#98A1B3]">
                      {getPogAwardPointsLabel(award)}
                    </div>
                    <div className="mt-4 text-[10px] leading-6 text-white">
                      {award.playerId ? (
                        <PlayerNameLink
                          playerId={award.playerId}
                          playerName={displayName}
                          canonicalLookup={canonicalLookup}
                        />
                      ) : (
                        displayName
                      )}
                    </div>
                    <div className="mt-3 text-[8px] uppercase tracking-[0.24em] text-[#98A1B3]">
                      {award.teamId
                        ? normalizeTeamId(award.teamId) === normalizeTeamId(game.awayTeamId)
                          ? game.awayTeamName
                          : game.homeTeamName
                        : "Archived Recognition"}
                    </div>
                    <div className="mt-4 text-[12px] text-[#E7E9F1]">
                      {award.valueLabel} · Recognition only
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionFrame>
        ) : null}

        <ManagerWpaOverlay game={game} managerProfiles={data.managerProfiles} />

        <SectionFrame
          title="Pitcher Decisions"
          subtitle="Winning, losing, save, and hold decisions pulled straight from the archived pitcher game lines."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "W", items: pitcherDecisions.wins },
              { label: "L", items: pitcherDecisions.losses },
              { label: "SV", items: pitcherDecisions.saves },
              { label: "HLD", items: pitcherDecisions.holds },
            ].map((group) => (
              <div
                key={group.label}
                className="border-[4px] border-[#32394B] bg-[#0B0E14] p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.45)]"
              >
                <div className="text-[9px] uppercase tracking-[0.28em] text-[#D8A84A]">{group.label}</div>
                <div className="mt-4 flex flex-col gap-3">
                  {group.items.length === 0 ? (
                    <span className="text-[8px] uppercase tracking-[0.24em] text-[#7F8798]">None</span>
                  ) : (
                    group.items.map((pitcher) => (
                      <div key={`${group.label}-${pitcher.playerId}`} className="text-[9px] leading-5 text-white">
                        <PlayerNameLink
                          playerId={pitcher.playerId}
                          playerName={pitcher.playerName}
                          canonicalLookup={canonicalLookup}
                        />
                        <div className="mt-1 text-[8px] uppercase tracking-[0.24em] text-[#98A1B3]">{pitcher.ip} IP</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionFrame>

        <SectionFrame title="Box Score — Batting" subtitle="Single-game batting lines for both clubs.">
          <div className="grid gap-5 xl:grid-cols-2">
            {[
              { key: "away", teamName: game.awayTeamName, teamId: game.awayTeamId, rows: battingByTeam.away },
              { key: "home", teamName: game.homeTeamName, teamId: game.homeTeamId, rows: battingByTeam.home },
            ].map((team) => (
              <div key={team.key} className="border-[4px] border-[#32394B] bg-[#0B0E14] p-4">
                <div className="mb-4 text-[9px] uppercase tracking-[0.28em] text-[#D8A84A]">
                  <TeamNameLink leagueId={leagueId} teamId={team.teamId} teamName={team.teamName} />
                </div>
                {team.rows.length === 0 ? (
                  <EmptyState label="No batting lines." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-[8px] text-[#E7E9F1]">
                      <thead className="text-[#8C94A6]">
                        <tr>
                          <th className="pb-3 pr-3">Player</th>
                          <th className="pb-3 pr-3">Pos</th>
                          <th className="pb-3 pr-3">AB</th>
                          <th className="pb-3 pr-3">R</th>
                          <th className="pb-3 pr-3">H</th>
                          <th className="pb-3 pr-3">RBI</th>
                          <th className="pb-3 pr-3">BB</th>
                          <th className="pb-3 pr-3">SO</th>
                          <th className="pb-3">BA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {team.rows.map((row) => (
                          <tr key={row.playerId} className="border-t border-white/8 align-top">
                            <td className="py-3 pr-3 leading-5">
                              <PlayerNameLink
                                playerId={row.playerId}
                                playerName={row.playerName}
                                canonicalLookup={canonicalLookup}
                              />
                            </td>
                            <td className="py-3 pr-3 text-[#9FA7B8]">{row.pos}</td>
                            <td className="py-3 pr-3">{row.ab}</td>
                            <td className="py-3 pr-3">{row.r}</td>
                            <td className="py-3 pr-3">{row.h}</td>
                            <td className="py-3 pr-3">{row.rbi}</td>
                            <td className="py-3 pr-3">{row.bb}</td>
                            <td className="py-3 pr-3">{row.so}</td>
                            <td className="py-3">{row.ba}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionFrame>

        <SectionFrame title="Box Score — Pitching" subtitle="Single-game pitching lines with innings pitched shown as outs/3.">
          <div className="grid gap-5 xl:grid-cols-2">
            {[
              { key: "away", teamName: game.awayTeamName, teamId: game.awayTeamId, rows: pitchingByTeam.away },
              { key: "home", teamName: game.homeTeamName, teamId: game.homeTeamId, rows: pitchingByTeam.home },
            ].map((team) => (
              <div key={team.key} className="border-[4px] border-[#32394B] bg-[#0B0E14] p-4">
                <div className="mb-4 text-[9px] uppercase tracking-[0.28em] text-[#D8A84A]">
                  <TeamNameLink leagueId={leagueId} teamId={team.teamId} teamName={team.teamName} />
                </div>
                {team.rows.length === 0 ? (
                  <EmptyState label="No pitching lines." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-[8px] text-[#E7E9F1]">
                      <thead className="text-[#8C94A6]">
                        <tr>
                          <th className="pb-3 pr-3">Pitcher</th>
                          <th className="pb-3 pr-3">IP</th>
                          <th className="pb-3 pr-3">H</th>
                          <th className="pb-3 pr-3">R</th>
                          <th className="pb-3 pr-3">ER</th>
                          <th className="pb-3 pr-3">BB</th>
                          <th className="pb-3 pr-3">SO</th>
                          <th className="pb-3">ERA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {team.rows.map((row) => (
                          <tr key={row.playerId} className="border-t border-white/8 align-top">
                            <td className="py-3 pr-3 leading-5">
                              <PlayerNameLink
                                playerId={row.playerId}
                                playerName={row.playerName}
                                canonicalLookup={canonicalLookup}
                              />
                            </td>
                            <td className="py-3 pr-3">{row.ip}</td>
                            <td className="py-3 pr-3">{row.h}</td>
                            <td className="py-3 pr-3">{row.r}</td>
                            <td className="py-3 pr-3">{row.er}</td>
                            <td className="py-3 pr-3">{row.bb}</td>
                            <td className="py-3 pr-3">{row.so}</td>
                            <td className="py-3">{row.era}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionFrame>

        <SectionFrame title="KBL WPA Leaderboard" subtitle="Derived batting, pitching, catching, fielding, and baserunning attribution from the current event log.">
          {wpaLeaderboard.length === 0 ? (
            <EmptyState label="No WPA events recorded." />
          ) : (
            <div className="overflow-x-auto border-[4px] border-[#32394B] bg-[#0B0E14] p-4">
              <table className="min-w-full text-left text-[8px] text-[#E7E9F1]">
                <thead className="text-[#8C94A6]">
                  <tr>
                    <th className="pb-3 pr-3">Player</th>
                    <th className="pb-3 pr-3">Team</th>
                    <th className="pb-3 pr-3">Roles</th>
                    <th className="pb-3">WPA</th>
                  </tr>
                </thead>
                <tbody>
                  {wpaLeaderboard.map((entry) => (
                    <tr key={entry.playerId} className="border-t border-white/8">
                      <td className="py-3 pr-3 leading-5">
                        <PlayerNameLink
                          playerId={entry.playerId}
                          playerName={entry.playerName}
                          canonicalLookup={canonicalLookup}
                        />
                      </td>
                      <td className="py-3 pr-3 text-[#9FA7B8]">
                        {normalizeTeamId(entry.teamId) === normalizeTeamId(game.awayTeamId)
                          ? game.awayTeamName
                          : normalizeTeamId(entry.teamId) === normalizeTeamId(game.homeTeamId)
                            ? game.homeTeamName
                            : humanizeToken(entry.teamId)}
                      </td>
                      <td className="py-3 pr-3 text-[#9FA7B8]">{entry.roles || "KBL"}</td>
                      <td className={`py-3 ${entry.wpa >= 0 ? "text-[#7EF0A8]" : "text-[#FF9E9E]"}`}>
                        {formatSignedDecimal(entry.wpa)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionFrame>

        <SectionFrame title="KBL WPA Play Audit" subtitle="Per-play budget math for reviewing attribution rules before awards and Almanac rollout.">
          {kblWpaAuditRows.length === 0 ? (
            <EmptyState label="No KBL WPA credits to audit." />
          ) : (
            <div className="max-h-[620px] overflow-y-auto border-[4px] border-[#32394B] bg-[#0B0E14] p-4">
              <div className="space-y-4">
                {kblWpaAuditRows.map((row) => (
                  <div key={row.eventId} className="border-[3px] border-[#262C39] bg-[#111620] p-3">
                    <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="text-[8px] uppercase tracking-[0.26em] text-[#D8A84A]">
                          {row.source} | {row.result} | {row.allocationModes}
                        </div>
                        <div className="mt-2 text-[9px] leading-5 text-[#E7E9F1]">{row.label}</div>
                        <div className="mt-1 text-[8px] leading-5 text-[#7F8798]">{row.situation}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[8px] xl:min-w-[360px]">
                        <div className="border border-[#32394B] bg-black/30 p-2">
                          <div className="text-[#8C94A6]">Batting Budget</div>
                          <div className={row.battingBudget >= 0 ? "text-[#7EF0A8]" : "text-[#FF9E9E]"}>
                            {formatSignedDecimal(row.battingBudget, 4)}
                          </div>
                        </div>
                        <div className="border border-[#32394B] bg-black/30 p-2">
                          <div className="text-[#8C94A6]">Defense Budget</div>
                          <div className={row.defensiveBudget >= 0 ? "text-[#7EF0A8]" : "text-[#FF9E9E]"}>
                            {formatSignedDecimal(row.defensiveBudget, 4)}
                          </div>
                        </div>
                        <div className="border border-[#32394B] bg-black/30 p-2">
                          <div className="text-[#8C94A6]">Batting Total</div>
                          <div className={row.battingTotal >= 0 ? "text-[#7EF0A8]" : "text-[#FF9E9E]"}>
                            {formatSignedDecimal(row.battingTotal, 4)}
                          </div>
                        </div>
                        <div className="border border-[#32394B] bg-black/30 p-2">
                          <div className="text-[#8C94A6]">Defense Total</div>
                          <div className={row.defensiveTotal >= 0 ? "text-[#7EF0A8]" : "text-[#FF9E9E]"}>
                            {formatSignedDecimal(row.defensiveTotal, 4)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-left text-[8px] text-[#E7E9F1]">
                        <thead className="text-[#8C94A6]">
                          <tr>
                            <th className="pb-2 pr-3">Player</th>
                            <th className="pb-2 pr-3">Side</th>
                            <th className="pb-2 pr-3">Role</th>
                            <th className="pb-2 pr-3">Mode</th>
                            <th className="pb-2 pr-3">Confidence</th>
                            <th className="pb-2 pr-3">WPA</th>
                            <th className="pb-2">Basis</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.credits.map((credit) => (
                            <tr key={`${row.eventId}-${credit.playerId}-${credit.role}-${credit.basis}`} className="border-t border-white/8 align-top">
                              <td className="py-2 pr-3 leading-5">
                                <PlayerNameLink
                                  playerId={credit.playerId}
                                  playerName={credit.playerName}
                                  canonicalLookup={canonicalLookup}
                                />
                                <div className="mt-1 text-[#7F8798]">{credit.teamName}</div>
                              </td>
                              <td className="py-2 pr-3 text-[#B0B8CA]">{credit.side}</td>
                              <td className="py-2 pr-3 text-[#B0B8CA]">{humanizeToken(credit.role)}</td>
                              <td className="py-2 pr-3 text-[#B0B8CA]">{formatAllocationMode(credit.allocationMode)}</td>
                              <td className="py-2 pr-3 text-[#B0B8CA]">{humanizeToken(credit.confidence)}</td>
                              <td className={`py-2 pr-3 ${credit.wpa >= 0 ? "text-[#7EF0A8]" : "text-[#FF9E9E]"}`}>
                                {formatSignedDecimal(credit.wpa, 4)}
                              </td>
                              <td className="py-2 leading-5 text-[#9FA7B8]">{credit.basis}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionFrame>

        <SectionFrame title="Play Log" subtitle="Chronological at-bat ledger with inning, matchup, result, runners, and WPA.">
          {playLog.length === 0 ? (
            <EmptyState label="No at-bat events logged." />
          ) : (
            <div className="max-h-[460px] overflow-y-auto border-[4px] border-[#32394B] bg-[#0B0E14] p-4">
              <div className="space-y-3">
                {playLog.map((entry) => (
                  <div key={entry.eventId} className="border-[3px] border-[#262C39] bg-[#111620] p-3">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div className="text-[8px] uppercase tracking-[0.26em] text-[#D8A84A]">{entry.inning}</div>
                      <div className={`text-[8px] ${entry.wpa >= 0 ? "text-[#7EF0A8]" : "text-[#FF9E9E]"}`}>
                        {formatSignedDecimal(entry.wpa)}
                      </div>
                    </div>
                    <div className="mt-3 text-[9px] leading-5 text-[#E7E9F1]">{entry.matchup}</div>
                    <div className="mt-2 text-[8px] leading-5 text-[#B0B8CA]">
                      {entry.result} | RBI {entry.rbi} | {entry.runners}
                    </div>
                    <div className="mt-2 text-[8px] leading-5 text-[#7F8798]">{entry.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionFrame>

        <SectionFrame title="Fame Events" subtitle="Archived fame swings captured on the completed game record.">
          {game.fameEvents.length === 0 ? (
            <EmptyState label="No fame events in this game." />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {game.fameEvents.map((event) => (
                <div
                  key={event.id}
                  className="border-[4px] border-[#503A0D] bg-[#181208] p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.4)]"
                >
                  <div className="text-[9px] leading-5 text-[#E7E9F1]">
                    <PlayerNameLink
                      playerId={event.playerId}
                      playerName={event.playerName}
                      canonicalLookup={canonicalLookup}
                    />
                  </div>
                  <div className="mt-3 text-[8px] uppercase tracking-[0.26em] text-[#D8A84A]">
                    {humanizeToken(event.eventType)}
                  </div>
                  <div className={`mt-3 text-[10px] ${event.fameType === "bonus" ? "text-[#7EF0A8]" : "text-[#FF9E9E]"}`}>
                    {event.fameType === "bonus" ? "+" : "-"}{Math.abs(event.fameValue)}
                  </div>
                  <div className="mt-3 text-[8px] leading-5 text-[#BDAE8B]">
                    {event.description ?? "No description saved."}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionFrame>

        <SectionFrame title="Clutch Moments" subtitle="At-bats flagged as clutch, or any at-bat with leverage index at or above 1.50.">
          {clutchMoments.length === 0 ? (
            <EmptyState label="No clutch moments found." />
          ) : (
            <div className="space-y-3">
              {clutchMoments.map((event) => (
                <div key={event.eventId} className="border-[4px] border-[#32394B] bg-[#0B0E14] p-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="text-[9px] leading-5 text-[#E7E9F1]">
                      <PlayerNameLink
                        playerId={event.batterId}
                        playerName={event.batterName}
                        canonicalLookup={canonicalLookup}
                      />
                    </div>
                    <div className="flex gap-4 text-[8px] uppercase tracking-[0.22em] text-[#B0B8CA]">
                      <span>LI {formatLI(event.leverageIndex)}</span>
                      <span className={event.wpa >= 0 ? "text-[#7EF0A8]" : "text-[#FF9E9E]"}>{formatSignedDecimal(event.wpa)}</span>
                    </div>
                  </div>
                  <div className="mt-3 text-[8px] leading-5 text-[#B0B8CA]">{buildSituationLabel(event)}</div>
                  <div className="mt-3 text-[8px] uppercase tracking-[0.22em] text-[#D8A84A]">{humanizeToken(event.result)}</div>
                </div>
              ))}
            </div>
          )}
        </SectionFrame>

        <SectionFrame title="Notable Events" subtitle="Algorithmic flags: |WPA| greater than 0.15 or leverage index above 3.00.">
          {notableEvents.length === 0 ? (
            <EmptyState label="No notable events crossed the threshold." />
          ) : (
            <div className="space-y-3">
              {notableEvents.map((event) => (
                <div key={event.eventId} className="border-[4px] border-[#32394B] bg-[#0B0E14] p-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="text-[9px] leading-5 text-[#E7E9F1]">
                      <PlayerNameLink
                        playerId={event.batterId}
                        playerName={event.batterName}
                        canonicalLookup={canonicalLookup}
                      />
                    </div>
                    <div className="flex gap-4 text-[8px] uppercase tracking-[0.22em] text-[#B0B8CA]">
                      <span>LI {formatLI(event.leverageIndex)}</span>
                      <span className={event.wpa >= 0 ? "text-[#7EF0A8]" : "text-[#FF9E9E]"}>{formatSignedDecimal(event.wpa)}</span>
                    </div>
                  </div>
                  <div className="mt-3 text-[8px] leading-5 text-[#B0B8CA]">{buildSituationLabel(event)}</div>
                  <div className="mt-3 text-[8px] uppercase tracking-[0.22em] text-[#D8A84A]">{humanizeToken(event.result)}</div>
                </div>
              ))}
            </div>
          )}
        </SectionFrame>

        <SectionFrame title="Win Probability Chart" subtitle="Home-team perspective. Notable swings are marked when |WPA| exceeds 0.15.">
          <WinProbChart atBatEvents={atBatEvents} />
        </SectionFrame>
      </div>
    </div>
  );
}
