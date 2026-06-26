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
import { useEffect, useMemo, useState } from "react";

import {
  useSeasonStats,
  type BattingLeaderEntry,
  type BattingSortKey,
  type PitchingLeaderEntry,
  type PitchingSortKey,
  type UseSeasonStatsReturn,
} from "../../hooks/useSeasonStats";
import { getFranchiseConfig } from "../../utils/franchiseManager";
import { getFranchiseSeasonId } from "../../utils/franchisePersistenceContract";
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
import type { StoredFranchiseConfig } from "../../types/franchise";
import type {
  ActiveTeamVM,
  AlmanacVM,
  FameVM,
  FormStateVM,
  HubVM,
  LeaderboardVM,
  LeaderEntryVM,
  MakeupModVM,
  MoraleHistoryVM,
  PlayerDetailVM,
  PlayerMoraleVM,
  PlayerRowVM,
  PulseVM,
  RatingBarVM,
  ScheduleGameVM,
  ScheduleVM,
  SprayRoleVM,
  StadiumVM,
  StandingRowVM,
  StandingsRacesVM,
  TeamPickerVM,
  TieType,
  TieVM,
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
  championships: ChampionshipRecord[];
  awards: AwardWinner[];
  ratingsOverlays: FranchiseRatingsOverlayRow[];
  trueValueSnapshots: FranchiseTrueValueSnapshotRow[];
  traitOverlays: FranchiseTraitOverlayRow[];
  relationshipEdges: RelationshipEdgeRow[];
  fameRecords: FranchiseFameRecordRow[];
}

export interface UseFranchiseLensDataReturn {
  teams: TeamPickerVM[];
  active: ActiveTeamVM | null;
  hub: HubVM;
  isLoading: boolean;
  error: string | null;
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

function buildModifiers(player: Player): MakeupModVM[] | undefined {
  const m = player.hiddenPersonalityModifiers;
  if (!m) return undefined;
  return [
    { label: "Loyalty", value: Math.round(m.loyalty) },
    { label: "Ambition", value: Math.round(m.ambition) },
    { label: "Resilience", value: Math.round(m.resilience) },
    { label: "Charisma", value: Math.round(m.charisma) },
  ];
}

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
    modifiers: buildModifiers(player),
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

function buildReturn(
  raw: RawData | null,
  viewedTeamId: string | undefined,
  seasonNumber: number,
  seasonStats: UseSeasonStatsReturn,
  statsReady: boolean,
  isLoading: boolean,
  error: string | null,
): UseFranchiseLensDataReturn {
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
    championships,
    awards,
    ratingsOverlays,
    trueValueSnapshots,
    traitOverlays,
    relationshipEdges,
    fameRecords,
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

  const hub: HubVM = {
    pulse: buildPulse(teamPlayers, activeTeam.id, fanSnapshot, standings),
    roster,
    standings: buildStandingsVM(teams, standingByTeam, config),
    stadium: buildStadiumVM(activeTeam),
    schedule: buildScheduleVM(schedule, activeTeam.id, teamMeta),
    almanac: buildAlmanacVM(seasonStats, statsReady, teamMeta, championships, awards),
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
        if (cancelled) return;
        setRaw({
          config,
          teams: teams ?? [],
          players: players ?? [],
          standings: standings ?? [],
          designations: designations ?? [],
          moraleSnapshots: moraleSnapshots ?? [],
          schedule: schedule ?? [],
          championships: championships ?? [],
          awards: awards ?? [],
          ratingsOverlays: ratingsOverlays ?? [],
          trueValueSnapshots: trueValueSnapshots ?? [],
          traitOverlays: traitOverlays ?? [],
          relationshipEdges: relationshipEdges ?? [],
          fameRecords: fameRecords ?? [],
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
  }, [franchiseId, seasonId, seasonNumber]);

  const statsReady = !seasonStats.isLoading;
  return useMemo(
    () => buildReturn(raw, viewedTeamId, seasonNumber, seasonStats, statsReady, isLoading, error),
    // seasonStats getters are useCallback-stable; statsReady gates the stats-derived rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raw, viewedTeamId, seasonNumber, statsReady, isLoading, error],
  );
}

export default useFranchiseLensData;
