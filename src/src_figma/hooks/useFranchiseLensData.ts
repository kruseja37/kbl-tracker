/**
 * useFranchiseLensData — the GREENLIGHT-GATED real-data adapter for the aged-Fenway
 * franchise-lens hub (Stream A).
 *
 * Per FRANCHISE_LENS_REALDATA_ADAPTER_PLAN.md: the FranchiseLensHub is a PURE VIEW
 * component fed one `{ teams, active, hub }` bundle. This hook produces that bundle from the
 * real franchise engines/stores (the same reads the legacy hub uses), so the view is unchanged.
 *
 * Phase 1 (DONE): teams / active / roster / pulse / standings.
 * Phase 2 (THIS): stadium identity + park factors, schedule, almanac (leaders + trophy case).
 *   - Stadium spray/records/aggregates are EVENT-driven (completed-game archive); that event load
 *     is shared with the Phase-3 player-drawer per-player spray, so it is folded into Phase 3.
 *     Phase 2 wires the real stadium IDENTITY + FACTORS (off the Team object) + an empty spray shell.
 * Phases 3-4 (player drawer depth / news / moments / checkpoint): still undefined here.
 *
 * With the living-season Phase-2 flags OFF (normal save), soul surfaces read their real-but-neutral
 * state. With a GAMELESS save the schedule/almanac-leaders/spray are legitimately empty until games
 * are played — CORRECT, not a bug; the surfaces fill against a real played save.
 *
 * Lens team is pinned to controlledTeams[0] (v1; multi-team selector deferred). Rival-red is left
 * undefined until this branch rebases onto the trunk's home-park-rivalry seam — degrades gracefully.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  useSeasonStats,
  type BattingLeaderEntry,
  type BattingSortKey,
  type PitchingLeaderEntry,
  type PitchingSortKey,
  type UseSeasonStatsReturn,
} from "../../hooks/useSeasonStats";
import { getFranchiseConfig } from "../../utils/franchiseManager";
import { resolveFranchiseSalaryRevealState } from "../../utils/franchiseSalary";
import { getFranchiseSeasonId } from "../../utils/franchisePersistenceContract";
import {
  callUpFranchisePlayer,
  sendDownFranchisePlayer,
} from "../../utils/franchiseRosterMovement";
import { executeManualFranchiseTrade } from "../../utils/franchiseTradeAdapter";
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
} from "../../utils/franchisePlayerStorage";
import {
  getAllTeams,
  type Player,
  type Team,
} from "../../utils/leagueBuilderStorage";
import { calculateStandings, type TeamStanding } from "../../utils/seasonStorage";
import { getFranchiseDesignationRows } from "../../utils/franchiseDesignationStorage";
import {
  getLiveDesignationBadge,
  getProjectedDesignationBadge,
  type FranchisePlayerDesignationRecord,
} from "../../utils/franchiseDesignations";
import {
  listFranchiseMoraleSnapshots,
  type FranchiseMoraleSnapshot,
} from "../../utils/franchiseMoraleState";
import { getPlayerMoraleSpecState } from "../../utils/franchisePlayerMoraleSpecAdapter";
import {
  mergeRatingsOverlays,
} from "../../engines/ratingsOverlayMerge";
import {
  getFranchiseRatingsOverlaysByScope,
  type FranchiseRatingsOverlayRow,
} from "../../utils/franchiseRatingsOverlayStorage";
import {
  getFranchiseTrueValueSnapshotRowsByScope,
  type FranchiseTrueValueSnapshotRow,
} from "../../utils/franchiseTrueValueSnapshotsStorage";
import {
  getFranchiseTraitOverlaysByScope,
  type FranchiseTraitOverlayRow,
} from "../../utils/franchiseTraitOverlayStorage";
import {
  getFranchiseRelationshipEdgesByScope,
  type RelationshipEdgeRow,
} from "../../utils/franchiseRelationshipEdgesStorage";
import {
  getFranchiseFameRecordRowsByScope,
  type FranchiseFameRecordRow,
} from "../../utils/franchiseFameRecordsStorage";
import { getCareerPhase, getCareerPhaseDisplayName } from "../../engines/agingEngine";
import {
  getAllGamesByFranchise,
  type ScheduledGame,
} from "../../utils/scheduleStorage";
import {
  getAwardWinners,
  getChampionships,
  type AwardWinner,
  type ChampionshipRecord,
} from "../../utils/museumStorage";
import {
  getPlayoffByFranchiseSeason,
  getSeriesByPlayoff,
  type PlayoffConfig,
  type PlayoffSeries,
} from "../../utils/playoffStorage";
import {
  getTransactionsByFranchiseSeason,
  type TransactionLogEntry,
} from "../../utils/transactionStorage";
import { listSeasonNewsItemsForFranchiseSeason } from "../../utils/seasonNewsStorage";
import { listGameStoriesForFranchiseSeason } from "../../utils/gameStoriesStorage";
import { listReporters } from "../../utils/reporterStorage";
import type { BeatReporter, GameStory, SeasonNewsItem } from "../../types/reporter";
import type { StoredFranchiseConfig } from "../../types/franchise";
import type {
  ActiveTeamVM,
  AlmanacVM,
  CeremonyMomentVM,
  CheckpointPlayerVM,
  CheckpointVM,
  FameVM,
  FarmPlayerVM,
  FormStateVM,
  GameRecapVM,
  HubVM,
  LineupsContextVM,
  ImpactCardVM,
  LeaderboardVM,
  LeaderEntryVM,
  MomentsVM,
  MoraleHistoryVM,
  NewsVM,
  NextGameVM,
  PlayerDetailVM,
  PlayerMoraleVM,
  PlayerRowVM,
  PlayoffMatchupVM,
  PlayoffRoundVM,
  PlayoffsVM,
  PulseVM,
  RatingBarVM,
  RatingChangeVM,
  RosterExtrasVM,
  ScheduleGameVM,
  ScheduleVM,
  SeasonHomeVM,
  SprayRoleVM,
  StadiumVM,
  StandingRowVM,
  StandingsRacesVM,
  MoveEntryVM,
  TeamPickerVM,
  TieType,
  TieVM,
  TradeCandidatePlayerVM,
  TradeCandidateTeamVM,
  TradeCardVM,
  TradesVM,
  TraitChangeVM,
  TraitTimelineVM,
  TrophyVM,
  ValuePointVM,
} from "../app/components/franchise/FranchiseLensHub";

const PITCHER_POSITIONS = new Set(["SP", "RP", "CP", "P", "SP/RP"]);
const WHITE = "#F4F1E4";
const NAVY = "#1A2433";

interface TeamMeta {
  abbr: string;
  name: string;
}

interface RawData {
  config: StoredFranchiseConfig | null;
  teams: Team[];
  players: Player[];
  standings: TeamStanding[];
  designations: FranchisePlayerDesignationRecord[];
  moraleSnapshots: FranchiseMoraleSnapshot[];
  schedule: ScheduledGame[];
  playoffs: PlayoffConfig | null;
  playoffSeries: PlayoffSeries[];
  transactions: TransactionLogEntry[];
  championships: ChampionshipRecord[];
  awards: AwardWinner[];
  ratingsOverlays: FranchiseRatingsOverlayRow[];
  trueValueSnapshots: FranchiseTrueValueSnapshotRow[];
  traitOverlays: FranchiseTraitOverlayRow[];
  relationshipEdges: RelationshipEdgeRow[];
  fameRecords: FranchiseFameRecordRow[];
  seasonNews: SeasonNewsItem[];
  gameStories: GameStory[];
  reporters: BeatReporter[];
}

/** Result of a roster move, surfaced to the confirm modal (kept engine-type-free for the pure view). */
export interface LensRosterActionResult {
  success: boolean;
  message?: string;
}

/** A manual trade proposed from the hub: your club ships `outgoing`, gets `incoming` back. */
export interface LensTradeRequest {
  sourceTeamId: string;
  targetTeamId: string;
  outgoingPlayerIds: string[];
  incomingPlayerIds: string[];
}

export interface UseFranchiseLensDataReturn {
  teams: TeamPickerVM[];
  active: ActiveTeamVM | null;
  hub: HubVM;
  isLoading: boolean;
  error: string | null;
  /** Re-read every store and rebuild the view (call after a successful mutation). */
  reload: () => void;
  /** Promote a farm player to the active roster (reveals true ratings); reloads on success. */
  callUp: (playerId: string, teamId: string) => Promise<LensRosterActionResult>;
  /** Option a player down to AAA; reloads on success. */
  sendDown: (playerId: string, teamId: string) => Promise<LensRosterActionResult>;
  /** Execute a manual in-season trade (the engine blocks unrevealed prospects); reloads on success. */
  executeTrade: (req: LensTradeRequest) => Promise<LensRosterActionResult>;
}

function isPitcher(player: Player): boolean {
  return PITCHER_POSITIONS.has(player.primaryPosition as string);
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function money(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${Math.round(value)}`;
}

function rate3(value: number): string {
  return value.toFixed(3).replace(/^0\./, ".");
}

function toMoraleHistory(snapshot: FranchiseMoraleSnapshot | null): MoraleHistoryVM[] {
  if (!snapshot) return [];
  return snapshot.history
    .slice(-6)
    .reverse()
    .map((entry) => ({ delta: Math.round(entry.delta), reason: entry.reason, week: "" }));
}

function mapDesignation(
  row: FranchisePlayerDesignationRecord | undefined,
): { label: string; kind: "gold" | "albatross" } | undefined {
  if (!row) return undefined;
  const badge =
    row.status === "active"
      ? getLiveDesignationBadge(row.type) ?? getProjectedDesignationBadge(row.type)
      : getProjectedDesignationBadge(row.type);
  if (!badge) return undefined;
  return { label: badge.label, kind: row.type === "ALBATROSS" ? "albatross" : "gold" };
}

/* ===== Phase 3: the per-player drawer (PlayerDetailVM) ===== */
const RATING_LABELS: Record<string, string> = {
  power: "Power",
  contact: "Contact",
  speed: "Speed",
  fielding: "Fielding",
  arm: "Arm",
  velocity: "Velocity",
  junk: "Junk",
  accuracy: "Accuracy",
};
const REACH_LABELS = ["Unknown", "Local", "Regional", "National", "Legendary", "Immortal"];

interface DrawerContext {
  battingWar: Map<string, number>;
  pitchingWar: Map<string, number>;
  designations: FranchisePlayerDesignationRecord[];
  moraleByPlayer: Map<string, FranchiseMoraleSnapshot>;
  ratingsByPlayer: Map<string, FranchiseRatingsOverlayRow[]>;
  valueByPlayer: Map<string, FranchiseTrueValueSnapshotRow[]>;
  traitOverlaysByPlayer: Map<string, FranchiseTraitOverlayRow[]>;
  edgesByPlayer: Map<string, RelationshipEdgeRow[]>;
  fameByPlayer: Map<string, FranchiseFameRecordRow>;
  nameById: Map<string, string>;
  currentGameNumber: number;
}

function baseRatings(player: Player): Record<string, number> {
  return isPitcher(player)
    ? { velocity: player.velocity, junk: player.junk, accuracy: player.accuracy }
    : {
        power: player.power,
        contact: player.contact,
        speed: player.speed,
        fielding: player.fielding,
        arm: player.arm,
      };
}

function buildRatingBars(
  player: Player,
  overlays: FranchiseRatingsOverlayRow[],
  currentGameNumber: number,
): RatingBarVM[] {
  const base = baseRatings(player);
  const current = mergeRatingsOverlays(base, overlays, currentGameNumber);
  return Object.entries(base).map(([key, value]) => ({
    label: RATING_LABELS[key] ?? key,
    base: value,
    current: current[key] ?? value,
  }));
}

function buildValueTrend(rows: FranchiseTrueValueSnapshotRow[]): ValuePointVM[] {
  return [...rows]
    .sort((a, b) =>
      String(a.checkpoint).localeCompare(String(b.checkpoint), undefined, { numeric: true }),
    )
    .map((row) => ({ checkpoint: String(row.checkpoint), value: Math.round(row.trueValue) }));
}

function buildTraitTimeline(rows: FranchiseTraitOverlayRow[]): TraitTimelineVM[] {
  return [...rows]
    .sort((a, b) => a.createdAtGameNumber - b.createdAtGameNumber)
    .map((row) => ({
      valence: row.valence,
      trait: row.traitName,
      displaces: row.displacesTraitName ?? undefined,
      atGame: row.createdAtGameNumber,
    }));
}

function buildTies(
  edges: RelationshipEdgeRow[],
  playerId: string,
  nameById: Map<string, string>,
): TieVM[] {
  return edges.map((edge) => {
    const partnerId = edge.player1Id === playerId ? edge.player2Id : edge.player1Id;
    return {
      partner: nameById.get(partnerId) ?? partnerId,
      type: edge.type as TieType,
      intensity: Math.round(edge.intensity * 100),
      sinceGame: edge.formedAtGameNumber ?? undefined,
      potential: edge.potential || undefined,
    };
  });
}

function buildFame(row: FranchiseFameRecordRow | undefined): FameVM | undefined {
  if (!row) return undefined;
  const reach = Math.max(0, Math.min(5, Math.round(row.reachFloor)));
  const channels = Object.entries(row.channelByChannel ?? {}).map(([label, value]) => ({
    label,
    value: Math.round(value as number),
  }));
  return {
    heat: Math.round(row.heat),
    immortality: reach,
    immortalityLabel: REACH_LABELS[reach] ?? "Unknown",
    channels,
  };
}

// Hidden personality modifiers (loyalty/ambition/resilience/charisma) are HIDDEN by product rule on ALL
// players — never surfaced. Only the public `personality` string is shown. See LIVING_SEASON_UIUX_COVERAGE_MAP.

function mojoChip(mojo: unknown): FormStateVM | undefined {
  if (!mojo) return undefined;
  const label = String(mojo);
  const tone: FormStateVM["tone"] = /fire|jacked|locked/i.test(label)
    ? "up"
    : /rattled|tense/i.test(label)
      ? "down"
      : "flat";
  return { label, tone };
}

function designationEffectLine(
  designation: { label: string; kind: "gold" | "albatross" } | undefined,
): string | undefined {
  if (!designation) return undefined;
  if (designation.kind === "albatross") return "Albatross — salary outweighs on-field value.";
  return `${designation.label} — a cornerstone designation for the club.`;
}

function buildPlayerRow(player: Player, teamId: string, ctx: DrawerContext): PlayerRowVM {
  const pitcher = isPitcher(player);
  const war = pitcher ? ctx.pitchingWar.get(player.id) : ctx.battingWar.get(player.id);
  const designation = mapDesignation(
    ctx.designations.find((row) => row.playerId === player.id && row.teamId === teamId),
  );
  const snapshot = ctx.moraleByPlayer.get(player.id) ?? null;
  const moraleValue = snapshot?.currentValue ?? player.morale ?? 50;
  const morale: PlayerMoraleVM = {
    value: moraleValue,
    state: getPlayerMoraleSpecState(moraleValue),
    trend: "flat",
    history: toMoraleHistory(snapshot),
  };

  const valueTrend = buildValueTrend(ctx.valueByPlayer.get(player.id) ?? []);
  const latestValue = valueTrend.length ? valueTrend[valueTrend.length - 1].value : undefined;
  const salary = Number(player.salary) || 0;
  const traits = [player.trait1, player.trait2].filter(Boolean) as string[];
  const traitTimeline = buildTraitTimeline(ctx.traitOverlaysByPlayer.get(player.id) ?? []);
  const ties = buildTies(ctx.edgesByPlayer.get(player.id) ?? [], player.id, ctx.nameById);

  const detail: PlayerDetailVM = {
    age: player.age,
    bats: player.bats,
    throws: player.throws,
    grade: player.overallGrade,
    bio: player.backstory,
    nickname: player.nickname,
    careerPhase: getCareerPhaseDisplayName(getCareerPhase(player.age)),
    mojo: mojoChip(player.mojo),
    personality: player.personality,
    valueTrend: valueTrend.length ? valueTrend : undefined,
    ratings: buildRatingBars(player, ctx.ratingsByPlayer.get(player.id) ?? [], ctx.currentGameNumber),
    traitsCurrent: traits.length ? traits : undefined,
    traitTimeline: traitTimeline.length ? traitTimeline : undefined,
    ties: ties.length ? ties : undefined,
    fame: buildFame(ctx.fameByPlayer.get(player.id)),
    designationEffect: designationEffectLine(designation),
  };

  return {
    id: player.id,
    number: player.jerseyNumber != null ? String(player.jerseyNumber) : undefined,
    position: player.primaryPosition,
    name: `${player.firstName} ${player.lastName}`.trim(),
    war,
    salary,
    trueValue: latestValue,
    valueGap: latestValue != null ? latestValue - salary : undefined,
    designation,
    morale,
    detail,
  };
}

function buildStandingsVM(
  teams: Team[],
  standingByTeam: Map<string, TeamStanding>,
  config: StoredFranchiseConfig | null,
): StandingsRacesVM {
  const rows: StandingRowVM[] = teams
    .map((team) => {
      const standing = standingByTeam.get(team.id);
      return {
        teamId: team.id,
        name: team.name,
        abbr: team.abbreviation,
        wins: standing?.wins ?? 0,
        losses: standing?.losses ?? 0,
        winPct: standing?.winPct ?? 0,
        gamesBack: standing?.gamesBack ?? 0,
        lastTenWins: standing?.lastTenWins ?? 0,
        streak: standing?.streak ?? { type: "W", count: 0 },
        runDiff: standing?.runDiff ?? 0,
        home: standing?.homeRecord ?? { wins: 0, losses: 0 },
        away: standing?.awayRecord ?? { wins: 0, losses: 0 },
      };
    })
    .sort((a, b) => b.winPct - a.winPct || b.wins - a.wins || a.name.localeCompare(b.name));
  const groupName = config?.leagueDetails?.name ?? config?.franchiseName ?? "League";
  return { divisions: [{ name: groupName, rows }], races: [] };
}

function buildPulse(
  teamPlayers: Player[],
  activeTeamId: string,
  fanSnapshot: FranchiseMoraleSnapshot | null,
  standings: TeamStanding[],
): PulseVM {
  const moraleValues = teamPlayers.map((player) => player.morale ?? 50);
  const clubhouseAvg = moraleValues.length
    ? Math.round(moraleValues.reduce((sum, value) => sum + value, 0) / moraleValues.length)
    : undefined;
  const payroll = teamPlayers.reduce((sum, player) => sum + (Number(player.salary) || 0), 0);

  const fanMorale = fanSnapshot
    ? { value: fanSnapshot.currentValue, trend: "flat" as const, history: toMoraleHistory(fanSnapshot) }
    : undefined;

  const ranked = [...standings].sort((a, b) => b.winPct - a.winPct);
  const rank = ranked.findIndex((standing) => standing.teamId === activeTeamId);
  const standingLabel =
    rank >= 0 && standings.length > 0 ? `${ordinal(rank + 1)} of ${standings.length}` : undefined;

  return {
    fanMorale,
    clubhouseLabel: clubhouseAvg != null ? getPlayerMoraleSpecState(clubhouseAvg) : undefined,
    clubhouseAvg,
    standingLabel,
    payrollLabel: `${money(payroll)} · ${teamPlayers.length}`,
  };
}

function deriveArchetype(overall: number): string {
  // ParkFactors are ratio-scaled (~1.0 = neutral); the UI renders Math.round(v*100).
  if (overall >= 1.05) return "Bandbox";
  if (overall <= 0.95) return "Pitcher's Cavern";
  return "Neutral";
}

function buildStadiumVM(team: Team): StadiumVM {
  const pf = team.parkFactors;
  const dims = team.stadiumDimensions;
  const factors = pf
    ? {
        overall: pf.overall,
        runs: pf.runs,
        hr: pf.homeRuns,
        confidence: pf.confidence,
        source: pf.source,
      }
    : undefined;
  const emptyRole = (role: SprayRoleVM["role"]): SprayRoleVM => ({
    role,
    dots: [],
    stats: [],
    note: "Batted-ball data fills as games are played.",
  });
  return {
    name: team.stadium || `${team.name} Park`,
    nickname: team.ballparkNickname,
    city: team.location,
    archetype: pf ? deriveArchetype(pf.overall) : undefined,
    dims: dims ? { lf: dims.lf, cf: dims.cf, rf: dims.rf } : undefined,
    factors,
    // homeParkRival deferred to the home-park-rivalry rebase; aggregates/performers/opponents/records
    // are event-driven (foundation report) and folded into Phase 3 with the drawer's per-player spray.
    spray: [emptyRole("batting"), emptyRole("pitching"), emptyRole("fielding")],
  };
}

function buildScheduleVM(
  games: ScheduledGame[],
  activeTeamId: string,
  teamMeta: Map<string, TeamMeta>,
): ScheduleVM | undefined {
  const teamGames = games.filter(
    (game) => game.homeTeamId === activeTeamId || game.awayTeamId === activeTeamId,
  );
  if (teamGames.length === 0) return undefined;

  const toVM = (game: ScheduledGame): ScheduleGameVM => {
    const home = game.homeTeamId === activeTeamId;
    const oppId = home ? game.awayTeamId : game.homeTeamId;
    const vm: ScheduleGameVM = {
      date: game.date || `Day ${game.dayNumber}`,
      opponent: teamMeta.get(oppId)?.abbr ?? oppId,
      home,
    };
    if (game.result) {
      const teamScore = home ? game.result.homeScore : game.result.awayScore;
      const oppScore = home ? game.result.awayScore : game.result.homeScore;
      vm.result = { teamScore, oppScore, win: game.result.winningTeamId === activeTeamId };
    }
    return vm;
  };

  const upcoming = teamGames.filter((game) => !game.result).map(toVM);
  const recent = teamGames.filter((game) => game.result).map(toVM);
  if (upcoming[0]) upcoming[0].isNext = true;
  return { upcoming: upcoming.slice(0, 10), recent: recent.slice(-10).reverse() };
}

/* ===== Playoffs: the franchise bracket as a club-scoped read-only view ===== */
function buildPlayoffsVM(
  playoff: PlayoffConfig | null,
  series: PlayoffSeries[],
  activeTeamId: string,
  teamMeta: Map<string, TeamMeta>,
): PlayoffsVM | undefined {
  if (!playoff) return undefined;
  const abbrFor = (teamId: string, fallback: string): string =>
    teamMeta.get(teamId)?.abbr ?? fallback;

  // Group the series by round, preserving round order; resolve names + the winner abbr.
  const byRound = new Map<number, { roundName: string; matchups: PlayoffMatchupVM[] }>();
  const sortedSeries = [...series].sort((a, b) => a.round - b.round);
  for (const s of sortedSeries) {
    const bucket = byRound.get(s.round) ?? { roundName: s.roundName, matchups: [] };
    const winnerAbbr =
      s.winner === s.higherSeed.teamId
        ? abbrFor(s.higherSeed.teamId, s.higherSeed.teamName)
        : s.winner === s.lowerSeed.teamId
          ? abbrFor(s.lowerSeed.teamId, s.lowerSeed.teamName)
          : undefined;
    const involvesActive =
      s.higherSeed.teamId === activeTeamId || s.lowerSeed.teamId === activeTeamId;
    bucket.matchups.push({
      higherSeedAbbr: abbrFor(s.higherSeed.teamId, s.higherSeed.teamName),
      higherSeedName: s.higherSeed.teamName,
      higherSeed: s.higherSeed.seed,
      higherSeedWins: s.higherSeedWins,
      lowerSeedAbbr: abbrFor(s.lowerSeed.teamId, s.lowerSeed.teamName),
      lowerSeedName: s.lowerSeed.teamName,
      lowerSeed: s.lowerSeed.seed,
      lowerSeedWins: s.lowerSeedWins,
      bestOf: s.bestOf,
      status: s.status,
      winnerAbbr,
      involvesActive,
    });
    byRound.set(s.round, bucket);
  }

  const rounds: PlayoffRoundVM[] = [...byRound.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round, bucket]) => ({ round, roundName: bucket.roundName, matchups: bucket.matchups }));

  const championTeam = playoff.champion
    ? playoff.teams.find((t) => t.teamId === playoff.champion)
    : undefined;
  const championAbbr = playoff.champion
    ? abbrFor(playoff.champion, championTeam?.teamName ?? playoff.champion)
    : undefined;
  const championName = championTeam?.teamName ?? teamMeta.get(playoff.champion ?? "")?.name;

  return {
    status: playoff.status,
    rounds,
    championAbbr,
    championName,
    mvpName: playoff.mvp?.playerName,
    mvpStats: playoff.mvp?.stats,
  };
}

/* ===== Trades: the season transaction ledger filtered to executed trades ===== */
function buildTradesVM(
  transactions: TransactionLogEntry[],
  activeTeamId: string,
  teamMeta: Map<string, TeamMeta>,
  nameById: Map<string, string>,
): TradesVM | undefined {
  const trades = transactions.filter((txn) => txn.type === "trade");
  if (trades.length === 0) return undefined;

  const resolveTeam = (teamId: string): { teamAbbr: string; teamName: string } => {
    const meta = teamMeta.get(teamId);
    return { teamAbbr: meta?.abbr ?? teamId, teamName: meta?.name ?? teamId };
  };
  const resolvePlayers = (ids: unknown): string[] => {
    if (!Array.isArray(ids)) return [];
    return ids.map((id) => {
      const key = String(id);
      return nameById.get(key) ?? key;
    });
  };
  // The trade transaction embeds the moved players as objects carrying playerName; prefer those, and
  // fall back to resolving the id arrays. (The engine writes sourcePlayers/targetPlayers + the
  // playersFromSource/playersFromTarget id arrays — NOT the team1/playersFromTeam1 shape.)
  const namesFromEmbedded = (arr: unknown): string[] =>
    Array.isArray(arr)
      ? arr
          .map((p) => {
            const rec = (p ?? {}) as Record<string, unknown>;
            return String(rec.playerName ?? rec.name ?? "");
          })
          .filter(Boolean)
      : [];
  const formatDate = (iso: string): string => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const cards: TradeCardVM[] = trades
    .slice()
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0))
    .map((txn) => {
      const data = (txn.data ?? {}) as Record<string, unknown>;
      const team1Id = String(data.sourceTeamId ?? data.team1 ?? "");
      const team2Id = String(data.targetTeamId ?? data.team2 ?? "");
      const team1Players = namesFromEmbedded(data.sourcePlayers);
      const team2Players = namesFromEmbedded(data.targetPlayers);
      return {
        date: formatDate(txn.timestamp),
        team1: {
          ...resolveTeam(team1Id),
          players: team1Players.length ? team1Players : resolvePlayers(data.playersFromSource ?? data.playersFromTeam1),
        },
        team2: {
          ...resolveTeam(team2Id),
          players: team2Players.length ? team2Players : resolvePlayers(data.playersFromTarget ?? data.playersFromTeam2),
        },
        involvesActive: team1Id === activeTeamId || team2Id === activeTeamId,
      };
    });

  // The broader wire: call-ups, send-downs, releases. Each carries playerName + teamId in `data`.
  const MOVE_META: Record<string, { kind: MoveEntryVM["kind"]; icon: string; label: string; detail?: string }> = {
    call_up: { kind: "call_up", icon: "▲", label: "Called up", detail: "to the active roster" },
    send_down: { kind: "send_down", icon: "▼", label: "Sent down", detail: "to AAA" },
    release: { kind: "release", icon: "✂", label: "Released" },
  };
  const moves: MoveEntryVM[] = transactions
    .filter((txn) => txn.type === "call_up" || txn.type === "send_down" || txn.type === "release")
    .slice()
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0))
    .map((txn) => {
      const data = (txn.data ?? {}) as Record<string, unknown>;
      const meta = MOVE_META[txn.type] ?? { kind: "other" as const, icon: "•", label: txn.type };
      const teamId = String(data.teamId ?? "");
      const playerName = data.playerName ? String(data.playerName) : nameById.get(String(data.playerId ?? ""));
      return {
        date: formatDate(txn.timestamp),
        kind: meta.kind,
        icon: meta.icon,
        label: meta.label,
        playerName,
        teamAbbr: teamMeta.get(teamId)?.abbr ?? (teamId || undefined),
        detail: meta.detail,
        involvesActive: teamId === activeTeamId,
      };
    });

  if (cards.length === 0 && moves.length === 0) return undefined;
  return { trades: cards, moves: moves.length ? moves : undefined };
}

/**
 * Trade-candidate rosters for the in-hub trade builder: every club's MLB-rostered players. MLB players
 * are uncovered under the hidden/revealed rule, so this is gate-safe; farm prospects are excluded
 * entirely (and the engine independently refuses to trade unrevealed prospects).
 */
function buildTradeCandidates(
  teams: Team[],
  players: Player[],
  activeTeamId: string,
  teamMeta: Map<string, TeamMeta>,
): TradeCandidateTeamVM[] {
  return teams
    .map((team): TradeCandidateTeamVM => {
      const roster: TradeCandidatePlayerVM[] = players
        .filter((p) =>
          p.leagueAssignments?.some((a) => a.teamId === team.id && a.rosterStatus === "MLB"),
        )
        .map((p) => ({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`.trim(),
          position: (p.primaryPosition as string) ?? "—",
          salary: Number.isFinite(Number(p.salary)) ? Number(p.salary) : undefined,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return {
        teamId: team.id,
        teamAbbr: teamMeta.get(team.id)?.abbr ?? team.abbreviation ?? team.id,
        teamName: teamMeta.get(team.id)?.name ?? team.name ?? team.id,
        isActive: team.id === activeTeamId,
        players: roster,
      };
    })
    .filter((t) => t.players.length > 0);
}

function formatBatting(key: BattingSortKey, entry: BattingLeaderEntry): string {
  switch (key) {
    case "avg":
      return rate3(entry.avg);
    case "totalWAR":
      return entry.totalWAR.toFixed(1);
    case "hr":
      return String(entry.homeRuns);
    case "rbi":
      return String(entry.rbi);
    case "sb":
      return String(entry.stolenBases);
    default:
      return String((entry as unknown as Record<string, number>)[key] ?? 0);
  }
}

function formatPitching(key: PitchingSortKey, entry: PitchingLeaderEntry): string {
  switch (key) {
    case "era":
      return entry.era.toFixed(2);
    case "pWAR":
      return entry.pWAR.toFixed(1);
    case "wins":
      return String(entry.wins);
    case "strikeouts":
      return String(entry.strikeouts);
    case "saves":
      return String(entry.saves);
    default:
      return String((entry as unknown as Record<string, number>)[key] ?? 0);
  }
}

const BATTING_BOARDS: { key: BattingSortKey; label: string }[] = [
  { key: "avg", label: "AVG" },
  { key: "hr", label: "HR" },
  { key: "rbi", label: "RBI" },
  { key: "sb", label: "SB" },
  { key: "totalWAR", label: "WAR" },
];
const PITCHING_BOARDS: { key: PitchingSortKey; label: string }[] = [
  { key: "era", label: "ERA" },
  { key: "wins", label: "W" },
  { key: "strikeouts", label: "K" },
  { key: "saves", label: "SV" },
  { key: "pWAR", label: "WAR" },
];

function buildAlmanacVM(
  seasonStats: UseSeasonStatsReturn,
  statsReady: boolean,
  teamMeta: Map<string, TeamMeta>,
  championships: ChampionshipRecord[],
  awards: AwardWinner[],
): AlmanacVM | undefined {
  const battingLeaders: LeaderboardVM[] = [];
  const pitchingLeaders: LeaderboardVM[] = [];

  if (statsReady) {
    for (const board of BATTING_BOARDS) {
      const entries: LeaderEntryVM[] = seasonStats
        .getBattingLeaders(board.key, 3)
        .map((entry, index) => ({
          rank: index + 1,
          name: entry.playerName,
          teamId: entry.teamId,
          teamAbbr: teamMeta.get(entry.teamId)?.abbr ?? entry.teamId,
          value: formatBatting(board.key, entry),
        }));
      if (entries.length) battingLeaders.push({ stat: board.label, entries });
    }
    for (const board of PITCHING_BOARDS) {
      const entries: LeaderEntryVM[] = seasonStats
        .getPitchingLeaders(board.key, 3)
        .map((entry, index) => ({
          rank: index + 1,
          name: entry.playerName,
          teamId: entry.teamId,
          teamAbbr: teamMeta.get(entry.teamId)?.abbr ?? entry.teamId,
          value: formatPitching(board.key, entry),
        }));
      if (entries.length) pitchingLeaders.push({ stat: board.label, entries });
    }
  }

  const trophyCase: TrophyVM[] = [
    ...championships.map((record) => ({
      label: `${record.year} Champions`,
      holder: record.champion,
      teamId: record.championId,
    })),
    ...awards.map((award) => ({
      label: `${award.year} ${award.awardType}`,
      holder: award.playerName,
      teamId: award.teamId,
    })),
  ];

  if (!battingLeaders.length && !pitchingLeaders.length && !trophyCase.length) return undefined;
  return {
    battingLeaders,
    pitchingLeaders,
    trophyCase: trophyCase.length ? trophyCase : undefined,
  };
}

/* ===== Phase 4: newsroom (Tootwhistle) + checkpoint takeover ===== */
function eventTone(eventType: string): "good" | "bad" | "neutral" {
  const t = eventType.toUpperCase();
  if (/INJUR|FIRING|ALBATROSS|FEUD|SLUMP|DEMAND|BUST|RETIRE|SNUB/.test(t)) return "bad";
  if (/MILESTONE|AWARD|STREAK|CALL_?UP|MVP|CHAMP|BREAKOUT|HOT|ACE/.test(t)) return "good";
  return "neutral";
}

function prettyEvent(eventType: string): string {
  return String(eventType).replace(/_/g, " ").toLowerCase();
}

function buildRecaps(
  stories: GameStory[],
  schedule: ScheduledGame[],
  teamMeta: Map<string, TeamMeta>,
): GameRecapVM[] {
  const scheduleById = new Map(schedule.map((game) => [game.id, game]));
  return [...stories]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 12)
    .map((story) => {
      const scheduled = story.scheduleGameId ? scheduleById.get(story.scheduleGameId) : undefined;
      const recap: GameRecapVM = {
        date: story.gameDate,
        away: teamMeta.get(scheduled?.awayTeamId ?? story.opponentTeamId ?? "")?.abbr ?? "—",
        home: teamMeta.get(scheduled?.homeTeamId ?? story.teamId)?.abbr ?? "—",
        headline: story.headline,
      };
      if (scheduled?.result) {
        recap.awayScore = scheduled.result.awayScore;
        recap.homeScore = scheduled.result.homeScore;
        recap.win = scheduled.result.winningTeamId === scheduled.homeTeamId ? "home" : "away";
      }
      return recap;
    });
}

function buildNewsVM(
  news: SeasonNewsItem[],
  stories: GameStory[],
  reporter: BeatReporter | undefined,
  teamMeta: Map<string, TeamMeta>,
  schedule: ScheduledGame[],
  seasonNumber: number,
): NewsVM | undefined {
  const sorted = [...news].sort((a, b) => b.dramaticWeight - a.dramaticWeight);
  const lead = sorted[0];
  const rest = lead ? sorted.slice(1) : [];
  const byline = reporter ? reporter.name : "the Tootwhistle desk";
  const recaps = buildRecaps(stories, schedule, teamMeta);

  if (!lead && rest.length === 0 && recaps.length === 0) return undefined;

  return {
    editionLabel: "The Tootwhistle Times",
    volumeLabel: `Season ${seasonNumber}`,
    lead: lead
      ? {
          kicker: prettyEvent(lead.eventType),
          headline: lead.headline,
          body: lead.body,
          byline,
          dramaticWeight: lead.dramaticWeight,
        }
      : undefined,
    stories: rest.slice(0, 8).map((item) => ({
      category: prettyEvent(item.eventType),
      headline: item.headline,
      excerpt: item.body,
      byline,
      dramaticWeight: item.dramaticWeight,
    })),
    wire: rest.slice(0, 14).map((item) => ({
      type: prettyEvent(item.eventType),
      text: item.headline,
      tone: eventTone(item.eventType),
    })),
    recaps: recaps.length ? recaps : undefined,
  };
}

function buildCheckpointVM(
  ratingsOverlays: FranchiseRatingsOverlayRow[],
  traitOverlays: FranchiseTraitOverlayRow[],
  players: Player[],
): CheckpointVM | undefined {
  const pendingRatings = ratingsOverlays.filter((row) => row.confirmationStatus === "pending");
  const pendingTraits = traitOverlays.filter((row) => row.confirmationStatus === "pending");
  if (pendingRatings.length === 0 && pendingTraits.length === 0) return undefined;

  const checkpointNumber = (sourceEventId: string | undefined): number | null => {
    const match = /checkpoint-(\d+)/i.exec(sourceEventId ?? "");
    return match ? Number(match[1]) : null;
  };
  const numbers = [...pendingRatings, ...pendingTraits]
    .map((row) => checkpointNumber(row.sourceEventId))
    .filter((value): value is number => value != null);
  if (numbers.length === 0) return undefined;
  const number = Math.max(...numbers);
  const sourceId = `checkpoint-${number}`;

  const playerById = new Map(players.map((player) => [player.id, player]));
  const byPlayer = new Map<string, { ratingChanges: RatingChangeVM[]; traitChanges: TraitChangeVM[] }>();
  const ensure = (playerId: string) => {
    const existing = byPlayer.get(playerId) ?? { ratingChanges: [], traitChanges: [] };
    byPlayer.set(playerId, existing);
    return existing;
  };

  for (const row of pendingRatings.filter((r) => r.sourceEventId === sourceId)) {
    const player = playerById.get(row.playerId);
    if (!player) continue;
    const base = (player as unknown as Record<string, number>)[row.ratingKey] ?? 0;
    ensure(row.playerId).ratingChanges.push({
      label: RATING_LABELS[row.ratingKey] ?? row.ratingKey,
      from: base,
      to: base + row.delta,
    });
  }
  for (const row of pendingTraits.filter((r) => r.sourceEventId === sourceId)) {
    ensure(row.playerId).traitChanges.push({
      valence: row.valence,
      trait: row.traitName,
      displaces: row.displacesTraitName ?? undefined,
    });
  }

  const cpPlayers: CheckpointPlayerVM[] = [...byPlayer.entries()].map(([playerId, changes]) => {
    const player = playerById.get(playerId);
    return {
      id: playerId,
      name: player ? `${player.firstName} ${player.lastName}`.trim() : playerId,
      position: player?.primaryPosition ?? "",
      ratingChanges: changes.ratingChanges,
      traitChanges: changes.traitChanges,
    };
  });

  return {
    number,
    label: `Checkpoint ${number} of 5`,
    pctLabel: `the ${number * 20}% mark`,
    players: cpPlayers,
  };
}

/* ===== Stream A finish: Clubhouse home + roster extras (the farm) + moment takeovers ===== */
function buildNextGameVM(
  schedule: ScheduledGame[],
  activeTeamId: string,
  standingByTeam: Map<string, TeamStanding>,
  teamMeta: Map<string, TeamMeta>,
): NextGameVM | undefined {
  const next = schedule
    .filter((g) => !g.result && (g.homeTeamId === activeTeamId || g.awayTeamId === activeTeamId))
    .sort((a, b) => a.gameNumber - b.gameNumber)[0];
  if (!next) return undefined;
  const rec = (teamId: string) => {
    const s = standingByTeam.get(teamId);
    return s ? `${s.wins}-${s.losses}` : "0-0";
  };
  const nameOf = (teamId: string) => teamMeta.get(teamId)?.name ?? teamId;
  const abbrOf = (teamId: string) => teamMeta.get(teamId)?.abbr ?? teamId;
  return {
    awayName: nameOf(next.awayTeamId),
    awayAbbr: abbrOf(next.awayTeamId),
    awayRecord: rec(next.awayTeamId),
    homeName: nameOf(next.homeTeamId),
    homeAbbr: abbrOf(next.homeTeamId),
    homeRecord: rec(next.homeTeamId),
    meta: next.date ? `Up next · ${next.date}` : "Up next",
  };
}

/** Raw ids the interactive Lineups board needs (it loads rosters + runs the engine seam itself). */
function buildLineupsContextVM(
  schedule: ScheduledGame[],
  activeTeamId: string,
  standingByTeam: Map<string, TeamStanding>,
  teamMeta: Map<string, TeamMeta>,
  config: StoredFranchiseConfig | null,
): LineupsContextVM {
  const next = schedule
    .filter((g) => !g.result && (g.homeTeamId === activeTeamId || g.awayTeamId === activeTeamId))
    .sort((a, b) => a.gameNumber - b.gameNumber)[0];
  const opponentTeamId = next
    ? next.homeTeamId === activeTeamId
      ? next.awayTeamId
      : next.homeTeamId
    : null;
  const opponentStanding = opponentTeamId ? standingByTeam.get(opponentTeamId) : undefined;
  return {
    franchiseId: config?.franchiseId ?? undefined,
    leagueId: config?.league ?? undefined,
    activeTeamId,
    opponentTeamId,
    opponentTeamName: opponentTeamId ? teamMeta.get(opponentTeamId)?.name ?? opponentTeamId : null,
    opponentGamesPlayed: opponentStanding ? opponentStanding.wins + opponentStanding.losses : 0,
    nextGameNumber: next ? next.gameNumber : null,
    hasNextGame: Boolean(next),
  };
}

function buildHomeVM(
  seasonNews: SeasonNewsItem[],
  schedule: ScheduledGame[],
  activeTeam: Team,
  standingByTeam: Map<string, TeamStanding>,
  teamMeta: Map<string, TeamMeta>,
  checkpoint: CheckpointVM | undefined,
  fanMoraleValue: number | undefined,
  byline: string,
): SeasonHomeVM | undefined {
  const topNews = [...seasonNews].sort((a, b) => b.dramaticWeight - a.dramaticWeight)[0];
  const leadStory = topNews
    ? { kicker: prettyEvent(topNews.eventType), headline: topNews.headline, body: topNews.body, byline }
    : undefined;

  const impactCards: ImpactCardVM[] = [];
  if (checkpoint) {
    impactCards.push({
      kind: "dated",
      icon: "📋",
      title: `${checkpoint.label} — development to enter`,
      detail: `${checkpoint.players.length} player change${checkpoint.players.length === 1 ? "" : "s"} to transcribe into SMB4 at ${checkpoint.pctLabel ?? "this checkpoint"}.`,
      cta: "Open the worklist",
      action: "checkpoint",
    });
  }
  const standing = standingByTeam.get(activeTeam.id);
  if (standing && standing.wins + standing.losses > 0) {
    const winning = standing.winPct >= 0.5;
    impactCards.push({
      kind: winning ? "good" : "info",
      icon: winning ? "📈" : "📊",
      title: `${standing.wins}-${standing.losses}${standing.streak.count > 0 ? ` · ${standing.streak.type}${standing.streak.count}` : ""}`,
      detail: winning ? "Above .500 — the club is in the hunt." : "Fighting to climb the standings.",
    });
  }
  const lastPlayed = schedule
    .filter((g) => g.result && (g.homeTeamId === activeTeam.id || g.awayTeamId === activeTeam.id))
    .sort((a, b) => b.gameNumber - a.gameNumber)[0];
  if (lastPlayed?.result) {
    const home = lastPlayed.homeTeamId === activeTeam.id;
    const us = home ? lastPlayed.result.homeScore : lastPlayed.result.awayScore;
    const them = home ? lastPlayed.result.awayScore : lastPlayed.result.homeScore;
    const won = lastPlayed.result.winningTeamId === activeTeam.id;
    const oppAbbr = teamMeta.get(home ? lastPlayed.awayTeamId : lastPlayed.homeTeamId)?.abbr ?? "OPP";
    impactCards.push({
      kind: won ? "good" : "info",
      icon: won ? "✅" : "▫️",
      title: `${won ? "Beat" : "Lost to"} ${oppAbbr} ${us}-${them}`,
      detail: won ? "Last time out — a win in the book." : "Last time out — back at it next game.",
    });
  }
  if (fanMoraleValue != null && fanMoraleValue < 40) {
    impactCards.push({
      kind: "crisis",
      icon: "🔥",
      title: "The crowd is restless",
      detail: `Fan morale has slipped to ${Math.round(fanMoraleValue)}. A few wins would settle them.`,
    });
  }

  const nextGame = buildNextGameVM(schedule, activeTeam.id, standingByTeam, teamMeta);
  if (!leadStory && impactCards.length === 0 && !nextGame) return undefined;
  return { leadStory, impactCards, nextGame };
}

function farmReadiness(grade: string): string {
  const g = grade.charAt(0).toUpperCase();
  if (g === "A" || g === "B") return "MLB-ready";
  if (g === "C") return "needs a year";
  return "raw";
}

function buildRosterExtrasVM(
  players: Player[],
  activeTeamId: string,
  payroll: number,
  mlbCount: number,
): RosterExtrasVM | undefined {
  const farmPlayers = players.filter((p) =>
    p.leagueAssignments?.some((a) => a.teamId === activeTeamId && a.rosterStatus === "FARM"),
  );
  const farm: FarmPlayerVM[] = farmPlayers.map((p) => {
    // Hidden/revealed rule: a farm prospect's TRUE grade stays hidden until call-up — surface the
    // scout-perceived grade ONLY. Readiness derives from the perceived grade (what the GM actually knows).
    const revealed = resolveFranchiseSalaryRevealState(p, "FARM") === "revealed";
    const scouted = (p as Player & { prospectProfile?: { scoutedGrade?: string } }).prospectProfile?.scoutedGrade;
    const trueGrade = String(p.overallGrade ?? "");
    const perceivedGrade = scouted ?? "";
    const shownGrade = revealed ? trueGrade : scouted ? `Scouted ${scouted}` : "Unscouted";
    const readiness = farmReadiness(revealed ? trueGrade : perceivedGrade);
    return {
      id: p.id,
      position: p.primaryPosition,
      name: `${p.firstName} ${p.lastName}`.trim(),
      grade: shownGrade || undefined,
      age: p.age,
      readiness,
      callUpReady: readiness === "MLB-ready",
    };
  });
  const capNote = `${mlbCount}/22 active · ${farm.length}/10 farm · ${money(payroll)} payroll`;
  if (farm.length === 0) return { capNote };
  return { farm, capNote };
}

function buildMomentsVM(
  championships: ChampionshipRecord[],
  awards: AwardWinner[],
  teamMeta: Map<string, TeamMeta>,
): MomentsVM | undefined {
  // Best-effort: surface a season-end ceremony if a champion exists. The firing / rebrand / random-event
  // takeovers fire from L11/rebrand/L10 engines that are dark or empty on a normal save — left undefined.
  const champ = [...championships].sort((a, b) => b.year - a.year)[0];
  if (!champ) return undefined;
  const ceremony: CeremonyMomentVM = {
    title: `${champ.year} Championship`,
    champion: champ.champion,
    awards: awards
      .filter((a) => a.year === champ.year)
      .slice(0, 8)
      .map((a) => ({
        category: prettyEvent(a.awardType),
        winner: a.playerName,
        teamAbbr: teamMeta.get(a.teamId)?.abbr ?? a.teamId,
      })),
    note: champ.mvp ? `Series MVP: ${champ.mvp}` : undefined,
  };
  return { ceremony };
}

function buildReturn(
  raw: RawData | null,
  viewedTeamId: string | undefined,
  seasonNumber: number,
  seasonStats: UseSeasonStatsReturn,
  statsReady: boolean,
  isLoading: boolean,
  error: string | null,
): Omit<UseFranchiseLensDataReturn, "reload" | "callUp" | "sendDown" | "executeTrade"> {
  if (!raw || raw.teams.length === 0) {
    return {
      teams: [],
      active: null,
      hub: {
        pulse: {},
        roster: [],
        loading: isLoading,
        emptyNote: isLoading
          ? undefined
          : "No franchise data found for this id (load a real save, or seed the demo franchise).",
      },
      isLoading,
      error,
    };
  }

  const {
    config,
    teams,
    players,
    standings,
    designations,
    moraleSnapshots,
    schedule,
    playoffs,
    playoffSeries,
    transactions,
    championships,
    awards,
    ratingsOverlays,
    trueValueSnapshots,
    traitOverlays,
    relationshipEdges,
    fameRecords,
    seasonNews,
    gameStories,
    reporters,
  } = raw;

  const teamMeta = new Map<string, TeamMeta>(
    teams.map((team) => [team.id, { abbr: team.abbreviation, name: team.name }]),
  );

  const teamPicker: TeamPickerVM[] = teams.map((team) => ({
    id: team.id,
    name: team.name,
    abbr: team.abbreviation,
    primary: team.colors?.primary ?? WHITE,
  }));

  const controlledFirst = config?.controlledTeams?.[0]?.teamId;
  const activeId = viewedTeamId ?? controlledFirst ?? teams[0].id;
  const activeTeam = teams.find((team) => team.id === activeId) ?? teams[0];

  const standingByTeam = new Map(standings.map((standing) => [standing.teamId, standing]));
  const activeStanding = standingByTeam.get(activeTeam.id);
  const recordLabel = activeStanding ? `${activeStanding.wins}-${activeStanding.losses}` : "0-0";

  const battingWar = new Map<string, number>();
  const pitchingWar = new Map<string, number>();
  if (statsReady) {
    for (const entry of seasonStats.getBattingLeaders("totalWAR", 1000)) {
      battingWar.set(entry.playerId, entry.totalWAR);
    }
    for (const entry of seasonStats.getPitchingLeaders("pWAR", 1000)) {
      pitchingWar.set(entry.playerId, entry.pWAR);
    }
  }

  const playerMoraleById = new Map(
    moraleSnapshots
      .filter((snapshot) => snapshot.targetType === "player" && snapshot.playerId)
      .map((snapshot) => [snapshot.playerId as string, snapshot]),
  );
  const fanSnapshot =
    moraleSnapshots.find(
      (snapshot) => snapshot.targetType === "team-fan" && snapshot.teamId === activeTeam.id,
    ) ?? null;

  const teamPlayers = players.filter((player) =>
    player.leagueAssignments?.some(
      (assignment) => assignment.teamId === activeTeam.id && assignment.rosterStatus === "MLB",
    ),
  );

  // Drawer context: group the scope-level soul rows by player + name lookup + current game number.
  const groupByPlayer = <T extends { playerId: string }>(rows: T[]): Map<string, T[]> => {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      const list = map.get(row.playerId) ?? [];
      list.push(row);
      map.set(row.playerId, list);
    }
    return map;
  };
  const edgesByPlayer = new Map<string, RelationshipEdgeRow[]>();
  for (const edge of relationshipEdges) {
    for (const pid of [edge.player1Id, edge.player2Id]) {
      const list = edgesByPlayer.get(pid) ?? [];
      list.push(edge);
      edgesByPlayer.set(pid, list);
    }
  }
  const completedGameNumbers = schedule.filter((game) => game.result).map((game) => game.gameNumber);
  const ctx: DrawerContext = {
    battingWar,
    pitchingWar,
    designations,
    moraleByPlayer: playerMoraleById,
    ratingsByPlayer: groupByPlayer(ratingsOverlays),
    valueByPlayer: groupByPlayer(trueValueSnapshots),
    traitOverlaysByPlayer: groupByPlayer(traitOverlays),
    edgesByPlayer,
    fameByPlayer: new Map(fameRecords.map((row) => [row.playerId, row])),
    nameById: new Map(players.map((p) => [p.id, `${p.firstName} ${p.lastName}`.trim()])),
    currentGameNumber: completedGameNumbers.length ? Math.max(...completedGameNumbers) : 0,
  };

  const roster: PlayerRowVM[] = teamPlayers
    .map((player) => buildPlayerRow(player, activeTeam.id, ctx))
    .sort((a, b) => (b.war ?? -Infinity) - (a.war ?? -Infinity) || a.name.localeCompare(b.name));

  const active: ActiveTeamVM = {
    id: activeTeam.id,
    name: activeTeam.name,
    abbr: activeTeam.abbreviation,
    recordLabel,
    primary: activeTeam.colors?.primary ?? WHITE,
    secondary: activeTeam.colors?.secondary ?? NAVY,
    rivalName: undefined,
    rivalId: undefined,
    seasonLabel: `Season ${seasonNumber}`,
    ballparkNickname: activeTeam.ballparkNickname,
    gmName: config?.gm?.displayName ?? config?.gmName,
    managerName: activeTeam.managerName,
  };

  const activeReporter = reporters.find((reporter) => reporter.teamId === activeTeam.id);
  const byline = activeReporter ? activeReporter.name : "the Tootwhistle desk";
  const payroll = teamPlayers.reduce((sum, player) => sum + (Number(player.salary) || 0), 0);
  const checkpointVM = buildCheckpointVM(ratingsOverlays, traitOverlays, players);

  const hub: HubVM = {
    home: buildHomeVM(
      seasonNews,
      schedule,
      activeTeam,
      standingByTeam,
      teamMeta,
      checkpointVM,
      fanSnapshot?.currentValue,
      byline,
    ),
    pulse: buildPulse(teamPlayers, activeTeam.id, fanSnapshot, standings),
    roster,
    rosterExtras: buildRosterExtrasVM(players, activeTeam.id, payroll, teamPlayers.length),
    standings: buildStandingsVM(teams, standingByTeam, config),
    stadium: buildStadiumVM(activeTeam),
    schedule: buildScheduleVM(schedule, activeTeam.id, teamMeta),
    playoffs: buildPlayoffsVM(playoffs, playoffSeries, activeTeam.id, teamMeta),
    trades: buildTradesVM(transactions, activeTeam.id, teamMeta, ctx.nameById),
    tradeCandidates: buildTradeCandidates(teams, players, activeTeam.id, teamMeta),
    almanac: buildAlmanacVM(seasonStats, statsReady, teamMeta, championships, awards),
    news: buildNewsVM(seasonNews, gameStories, activeReporter, teamMeta, schedule, seasonNumber),
    checkpoint: checkpointVM,
    moments: buildMomentsVM(championships, awards, teamMeta),
    lineups: buildLineupsContextVM(schedule, activeTeam.id, standingByTeam, teamMeta, config),
    loading: false,
  };

  return { teams: teamPicker, active, hub, isLoading: false, error: null };
}

export function useFranchiseLensData(
  franchiseId: string | undefined,
  seasonNumber = 1,
  viewedTeamId?: string,
): UseFranchiseLensDataReturn {
  const seasonId = franchiseId ? getFranchiseSeasonId(franchiseId, seasonNumber) : "";
  const seasonStats = useSeasonStats(seasonId);

  const [raw, setRaw] = useState<RawData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Bumping this re-runs the load effect — the post-mutation refresh seam for roster moves.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Roster moves: assemble the engine input from the lens's own context. leagueId is intentionally
  // OMITTED — the validator treats it as an optional extra filter (`!leagueId || assignment.leagueId
  // === leagueId`), so for the single-league franchise lens, matching by teamId alone is the robust
  // choice (a wrong league id would silently fail eligibility). The engines already enforce the
  // hidden-prospect gates (call-up flips reveal→'revealed'; unrevealed prospects can't be traded).
  const callUp = useCallback(
    async (playerId: string, teamId: string): Promise<LensRosterActionResult> => {
      if (!franchiseId) return { success: false, message: "No active franchise." };
      const result = await callUpFranchisePlayer({
        franchiseId,
        seasonId,
        statsScopeId: seasonId,
        seasonNumber,
        teamId,
        playerId,
        actor: "USER",
        rosterMovementPhase: "REGULAR_SEASON",
      });
      if (result.success) reload();
      return {
        success: result.success,
        message: result.success
          ? undefined
          : `${result.errorCode ?? "ROSTER_MOVE_FAILED"}: ${result.errorMessage ?? "Call-up failed."}`,
      };
    },
    [franchiseId, seasonId, seasonNumber, reload],
  );

  const sendDown = useCallback(
    async (playerId: string, teamId: string): Promise<LensRosterActionResult> => {
      if (!franchiseId) return { success: false, message: "No active franchise." };
      const result = await sendDownFranchisePlayer({
        franchiseId,
        seasonId,
        statsScopeId: seasonId,
        seasonNumber,
        teamId,
        playerId,
        actor: "USER",
        rosterMovementPhase: "REGULAR_SEASON",
        rosterLevel: "AAA",
      });
      if (result.success) reload();
      return {
        success: result.success,
        message: result.success
          ? undefined
          : `${result.errorCode ?? "ROSTER_MOVE_FAILED"}: ${result.errorMessage ?? "Send-down failed."}`,
      };
    },
    [franchiseId, seasonId, seasonNumber, reload],
  );

  // Manual in-season trade. Mirrors the legacy TradeFlow call shape exactly. The engine refuses to
  // trade unrevealed farm prospects (it protects hidden ratings) — that error surfaces in the modal.
  const executeTrade = useCallback(
    async (req: LensTradeRequest): Promise<LensRosterActionResult> => {
      if (!franchiseId) return { success: false, message: "No active franchise." };
      const result = await executeManualFranchiseTrade(
        {
          franchiseId,
          seasonId,
          statsScopeId: seasonId,
          seasonNumber,
          offseasonStateId: `regular-season-${seasonId}`,
          dryRun: false,
        },
        {
          transactionPhase: "REGULAR_SEASON",
          requestedTrade: {
            sourceTeamId: req.sourceTeamId,
            targetTeamId: req.targetTeamId,
            outgoingPlayerIds: req.outgoingPlayerIds,
            incomingPlayerIds: req.incomingPlayerIds,
          },
        },
      );
      if (result.success) reload();
      return {
        success: result.success,
        message: result.success
          ? undefined
          : `${result.errorCode ?? "TRADE_FAILED"}: ${result.message ?? "Trade failed."}`,
      };
    },
    [franchiseId, seasonId, seasonNumber, reload],
  );

  useEffect(() => {
    if (!franchiseId) {
      setRaw(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    (async () => {
      try {
        const config = await getFranchiseConfig(franchiseId);
        let teams = await getAllFranchiseTeams(franchiseId);
        if (!teams || teams.length === 0) {
          teams = await getAllTeams();
        }
        const players = await getAllFranchisePlayers(franchiseId);
        const standings = await calculateStandings(seasonId);
        const designations = await getFranchiseDesignationRows({
          franchiseId,
          seasonId,
          statsScopeId: seasonId,
        });
        const moraleSnapshots = await listFranchiseMoraleSnapshots(
          franchiseId,
          seasonId,
          seasonId,
          seasonNumber,
        );
        const schedule = await getAllGamesByFranchise(franchiseId, seasonNumber);
        // Playoffs: the franchise's October bracket + its series. Null/empty until the season reaches
        // the playoffs; the Playoffs tab shows "haven't started" against a regular-season-only save.
        const playoffs = await getPlayoffByFranchiseSeason({
          franchiseId,
          seasonNumber,
          seasonId,
        }).catch((): PlayoffConfig | null => null);
        const playoffSeries = playoffs
          ? await getSeriesByPlayoff(playoffs.id).catch((): PlayoffSeries[] => [])
          : [];
        // Moves ledger: the full season transaction ledger (trades + call-ups + send-downs + releases).
        // Empty until the first move; the VM builders narrow per type. Excludes undone rows.
        const transactions = (
          await getTransactionsByFranchiseSeason(franchiseId, seasonId).catch(
            (): TransactionLogEntry[] => [],
          )
        ).filter((txn) => !txn.undone);
        // Museum (champions / award winners) is global all-time history; empty on a fresh franchise.
        const championships = await getChampionships().catch(() => []);
        const awards = await getAwardWinners().catch(() => []);
        // Phase-3 soul stores: scope-level reads (all players' rows for the season). Empty until the
        // living season has run; each fills the per-player drawer when a real save is pointed here.
        const scope = { franchiseId, seasonId, statsScopeId: seasonId };
        const ratingsOverlays = await getFranchiseRatingsOverlaysByScope(scope).catch(() => []);
        const trueValueSnapshots = await getFranchiseTrueValueSnapshotRowsByScope(scope).catch(() => []);
        const traitOverlays = await getFranchiseTraitOverlaysByScope(scope).catch(() => []);
        const relationshipEdges = await getFranchiseRelationshipEdgesByScope(scope).catch(() => []);
        const fameRecords = await getFranchiseFameRecordRowsByScope(scope).catch(() => []);
        // Phase-4 newsroom: franchise-season news + per-game recaps + the beat reporters. Empty/null
        // until the living season writes them; the Tootwhistle tab fills on a real played save.
        const seasonNews = await listSeasonNewsItemsForFranchiseSeason(franchiseId, seasonId).catch(() => []);
        const gameStories = await listGameStoriesForFranchiseSeason(franchiseId, seasonId).catch(() => []);
        const reporters = await listReporters({ franchiseId }).catch((): BeatReporter[] => []);
        if (cancelled) return;
        setRaw({
          config,
          teams: teams ?? [],
          players: players ?? [],
          standings: standings ?? [],
          designations: designations ?? [],
          moraleSnapshots: moraleSnapshots ?? [],
          schedule: schedule ?? [],
          playoffs: playoffs ?? null,
          playoffSeries: playoffSeries ?? [],
          transactions: transactions ?? [],
          championships: championships ?? [],
          awards: awards ?? [],
          ratingsOverlays: ratingsOverlays ?? [],
          trueValueSnapshots: trueValueSnapshots ?? [],
          traitOverlays: traitOverlays ?? [],
          relationshipEdges: relationshipEdges ?? [],
          fameRecords: fameRecords ?? [],
          seasonNews: seasonNews ?? [],
          gameStories: gameStories ?? [],
          reporters: reporters ?? [],
        });
        setIsLoading(false);
      } catch (caught) {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : String(caught));
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [franchiseId, seasonId, seasonNumber, reloadKey]);

  const statsReady = !seasonStats.isLoading;
  const view = useMemo(
    () => buildReturn(raw, viewedTeamId, seasonNumber, seasonStats, statsReady, isLoading, error),
    // seasonStats getters are useCallback-stable; statsReady gates the stats-derived rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raw, viewedTeamId, seasonNumber, statsReady, isLoading, error],
  );
  return useMemo(
    () => ({ ...view, reload, callUp, sendDown, executeTrade }),
    [view, reload, callUp, sendDown, executeTrade],
  );
}

export default useFranchiseLensData;
