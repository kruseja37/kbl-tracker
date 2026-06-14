import {
  BATTING_ORDER_SLOT_WEIGHTS,
  CALIBRATE,
  type EffectiveMojoState,
  type PitcherRoleKey,
} from '../data/rosterEngineConstants';
import { computeIV, type IVPlayerInput } from './ivEngine';
import { defensivePlacementRisk, effectiveRatings } from './effectiveRatings';
import type { Player, Team } from '../utils/leagueBuilderStorage';

type FitnessState = 'JUICED' | 'FIT' | 'WELL' | 'STRAINED' | 'WEAK' | 'HURT';
type PlayerState = {
  mojo: EffectiveMojoState;
  fitness: FitnessState;
  workload?: {
    role?: PitcherRoleKey;
    pitchesThrown?: number;
    gamesSinceLastAppearance?: number;
    catcherConsecutiveGames?: number;
  };
};
type PlayerStates = Record<string, PlayerState>;
type VsHand = 'L' | 'R';
type FieldPosition = 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF';
type LineupPosition = FieldPosition | 'DH';
type AnalysisPlayer = Partial<Player> & {
  playerId?: string;
  playerName?: string;
  name?: string;
  currentPosition?: string;
  traits?: string[] | Record<string, string | undefined>;
  pitcherRole?: string;
};
type LineupSlotOverride = {
  playerId: string;
  battingOrderSlot: number;
  defensivePosition: string;
};
type AnalysisTeam = Team & {
  dhEnabled?: boolean;
  players?: AnalysisPlayer[];
  rosterPlayers?: AnalysisPlayer[];
  roster?: AnalysisPlayer[];
  activeRoster?: AnalysisPlayer[];
  candidates?: AnalysisPlayer[];
  lineupSlotsOverride?: LineupSlotOverride[];
};

interface RecommendedLineupSlot {
  slot: number;
  playerId: string;
  playerName: string;
  defensivePosition: LineupPosition;
  slotScore: number;
  rawKblIV: number;
  projectedValueScore: number;
  justification: string;
}

interface DefensiveAssignment {
  playerId: string;
  playerName: string;
  score: number;
}

interface LineupRecommendation {
  recommendedBattingOrder: RecommendedLineupSlot[];
  defensiveAssignment: Partial<Record<LineupPosition, DefensiveAssignment>>;
  perSlotJustifications: Record<number, string>;
  totalScore: number;
}

const FIELD_POSITIONS: FieldPosition[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
const DEFENSIVE_PRIORITY: FieldPosition[] = ['C', 'SS', 'CF', '2B', '3B', 'RF', 'LF', '1B'];
const PITCHER_POSITIONS = new Set(['P', 'SP', 'RP', 'CP', 'SP/RP']);
export function optimizeLineup(team: Team, vs: VsHand, states: PlayerStates): LineupRecommendation {
  const analysisTeam = team as AnalysisTeam;
  const players = rosterPlayers(analysisTeam).filter((player) => !isUnavailable(player));
  const override = analysisTeam.lineupSlotsOverride;
  const entries = override?.length
    ? scoreLockedLineup(players, override, vs, states)
    : optimizePlayers(players.filter((player) => !isPitcher(player)), analysisTeam.dhEnabled === true, vs, states);
  const ordered = assignBattingSlots(entries);
  const defensiveAssignment: Partial<Record<LineupPosition, DefensiveAssignment>> = {};
  const perSlotJustifications: Record<number, string> = {};
  for (const entry of ordered) {
    if (entry.defensivePosition !== 'DH') {
      defensiveAssignment[entry.defensivePosition] = {
        playerId: playerId(entry.player),
        playerName: playerName(entry.player),
        score: round(entry.assignmentScore),
      };
    }
    perSlotJustifications[entry.slot] = entry.justification;
  }

  return {
    recommendedBattingOrder: ordered.map((entry) => ({
      slot: entry.slot,
      playerId: playerId(entry.player),
      playerName: playerName(entry.player),
      defensivePosition: entry.defensivePosition,
      slotScore: round(entry.slotScore),
      rawKblIV: round(entry.rawKblIV),
      projectedValueScore: round(entry.slotScore / CALIBRATE.lineupSnapshotIvDisplayDivisor),
      justification: entry.justification,
    })).sort((left, right) => left.slot - right.slot),
    defensiveAssignment,
    perSlotJustifications,
    totalScore: round(ordered.reduce((sum, entry) => sum + entry.slotScore, 0)),
  };
}

type AssignmentEntry = {
  player: AnalysisPlayer;
  defensivePosition: LineupPosition;
  assignmentScore: number;
  rawKblIV: number;
  defensivePenalty: number;
  state: PlayerState;
};

type OrderedEntry = AssignmentEntry & {
  slot: number;
  slotScore: number;
  justification: string;
};

function rosterPlayers(team: AnalysisTeam): AnalysisPlayer[] {
  return team.rosterPlayers ?? team.players ?? team.roster ?? team.activeRoster ?? team.candidates ?? [];
}

function optimizePlayers(
  players: AnalysisPlayer[],
  dhEnabled: boolean,
  vs: VsHand,
  states: PlayerStates,
): AssignmentEntry[] {
  const selected: AssignmentEntry[] = [];
  const used = new Set<string>();
  for (const position of DEFENSIVE_PRIORITY) {
    const best = players
      .filter((player) => !used.has(playerId(player)))
      .map((player) => assignmentEntry(player, position, vs, states))
      .sort(compareAssignment)[0];
    if (!best) continue;
    used.add(playerId(best.player));
    selected.push(best);
  }
  improveWithLocalSwaps(selected, players, used, vs, states);
  if (dhEnabled) {
    const dh = players
      .filter((player) => !used.has(playerId(player)))
      .map((player) => assignmentEntry(player, 'DH', vs, states))
      .sort(compareAssignment)[0];
    if (dh) selected.push(dh);
  }
  return selected;
}

function scoreLockedLineup(
  players: AnalysisPlayer[],
  slots: LineupSlotOverride[],
  vs: VsHand,
  states: PlayerStates,
): AssignmentEntry[] {
  const byId = new Map(players.map((player) => [playerId(player), player]));
  return slots
    .map((slot) => {
      const player = byId.get(slot.playerId);
      if (!player) return undefined;
      return assignmentEntry(player, normalizeLineupPosition(slot.defensivePosition), vs, states);
    })
    .filter((entry): entry is AssignmentEntry => entry !== undefined);
}

function improveWithLocalSwaps(
  selected: AssignmentEntry[],
  players: AnalysisPlayer[],
  used: Set<string>,
  vs: VsHand,
  states: PlayerStates,
): void {
  let improved = true;
  while (improved) {
    improved = false;
    for (let leftIndex = 0; leftIndex < selected.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < selected.length; rightIndex += 1) {
        const left = selected[leftIndex];
        const right = selected[rightIndex];
        if (left.defensivePosition === 'DH' || right.defensivePosition === 'DH') continue;
        const swappedLeft = assignmentEntry(left.player, right.defensivePosition, vs, states);
        const swappedRight = assignmentEntry(right.player, left.defensivePosition, vs, states);
        if (swappedLeft.assignmentScore + swappedRight.assignmentScore > left.assignmentScore + right.assignmentScore) {
          selected[leftIndex] = swappedLeft;
          selected[rightIndex] = swappedRight;
          improved = true;
        }
      }
    }
  }

  const selectedIds = new Set(selected.map((entry) => playerId(entry.player)));
  for (const id of [...used]) {
    if (!selectedIds.has(id)) used.delete(id);
  }
  for (const entry of selected) {
    used.add(playerId(entry.player));
  }
  void players;
}

function assignBattingSlots(entries: AssignmentEntry[]): OrderedEntry[] {
  const slotOrder = [...Array(entries.length)].map((_, index) => index + 1)
    .sort((left, right) => slotWeight(right) - slotWeight(left) || left - right);
  return [...entries]
    .sort((left, right) => right.rawKblIV - left.rawKblIV || playerName(left.player).localeCompare(playerName(right.player)))
    .map((entry, index) => {
      const slot = slotOrder[index] ?? index + 1;
      return {
        ...entry,
        slot,
        slotScore: entry.assignmentScore * slotWeight(slot),
        justification: justificationFor(entry.player, entry.defensivePosition, entry.rawKblIV, entry.defensivePenalty, entry.state),
      };
    })
    .sort((left, right) => left.slot - right.slot);
}

function assignmentEntry(
  player: AnalysisPlayer,
  position: LineupPosition,
  vs: VsHand,
  states: PlayerStates,
): AssignmentEntry {
  const state = stateFor(player, states);
  const rawKblIV = ivOfEffectiveRatings(player, position, vs, state);
  const risk = position === 'DH' ? undefined : defensivePlacementRisk(player, position);
  const defensivePenalty = risk
    ? risk.chanceFrequency * risk.errorLikelihood * CALIBRATE.lineupDefensiveRiskIvPenalty
    : 0;
  return {
    player,
    defensivePosition: position,
    assignmentScore: rawKblIV - defensivePenalty,
    rawKblIV,
    defensivePenalty,
    state,
  };
}

function ivOfEffectiveRatings(
  player: AnalysisPlayer,
  position: LineupPosition,
  vs: VsHand,
  state: PlayerState,
): number {
  const ctx = {
    pressure: 'none' as const,
    runnersOn: false,
    risp: false,
    opposingHand: vs,
    inning: 1,
    playingPosition: position,
    batterHand: normalizeBats(player.bats),
    pitcherHand: vs,
    basesEmpty: true,
  };
  const eff = effectiveRatings(player, state, ctx);
  const input: IVPlayerInput = {
    id: playerId(player),
    name: playerName(player),
    isPitcher: isPitcher(player),
    bats: player.bats,
    primaryPosition: normalizePrimaryPosition(player),
    secondaryPosition: player.secondaryPosition ?? null,
    pitcherRole: pitcherRole(player),
    traits: traitsFor(player),
    arsenal: Array.isArray(player.arsenal) ? player.arsenal : undefined,
    armSlot: player.armSlot ?? null,
    ratings: {
      POW: clampRating(eff.POW),
      CON: clampRating(eff.CON),
      SPD: clampRating(eff.SPD),
      FLD: clampRating(eff.FLD),
      ARM: clampRating(eff.ARM),
    },
    pitcherRatings: {
      velocity: clampRating(eff.VEL),
      junk: clampRating(eff.JNK),
      accuracy: clampRating(eff.ACC),
    },
  };
  return computeIV(input).kblIV;
}

function stateFor(player: AnalysisPlayer, states: PlayerStates): PlayerState {
  const state = states[playerId(player)];
  if (state) {
    return {
      mojo: normalizeMojo(state.mojo),
      fitness: normalizeFitness(state.fitness),
      workload: state.workload,
    };
  }
  return {
    mojo: normalizeMojo(player.mojo),
    fitness: normalizeFitness((player as { fitness?: string }).fitness),
  };
}

function justificationFor(
  player: AnalysisPlayer,
  position: LineupPosition,
  rawKblIV: number,
  defensivePenalty: number,
  state: PlayerState,
): string {
  const traits = traitsFor(player);
  if (state.mojo !== 'Normal') return `${state.mojo} mojo`;
  if (state.fitness !== 'FIT') return `${state.fitness} fitness`;
  const split = traits.find((trait) => trait.includes('vs LHP') || trait.includes('vs RHP'));
  if (split) return `${split} active`;
  if (defensivePenalty > 0 && position !== 'DH') return `${position} defensive risk priced`;
  return `IV-of-effectiveRatings ${Math.round(rawKblIV).toLocaleString()}`;
}

function compareAssignment(left: AssignmentEntry, right: AssignmentEntry): number {
  return right.assignmentScore - left.assignmentScore || playerName(left.player).localeCompare(playerName(right.player));
}

function slotWeight(slot: number): number {
  const key = Math.max(1, Math.min(9, slot)) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  return BATTING_ORDER_SLOT_WEIGHTS[key];
}

function playerId(player: AnalysisPlayer): string {
  return player.id ?? player.playerId ?? player.name ?? player.playerName ?? 'unknown-player';
}

function playerName(player: AnalysisPlayer): string {
  if (player.playerName) return player.playerName;
  if (player.name) return player.name;
  const first = typeof player.firstName === 'string' ? player.firstName : '';
  const last = typeof player.lastName === 'string' ? player.lastName : '';
  return `${first} ${last}`.trim() || playerId(player);
}

function isUnavailable(player: AnalysisPlayer): boolean {
  return (player as { unavailable?: boolean }).unavailable === true;
}

function isPitcher(player: AnalysisPlayer): boolean {
  const positions = [player.primaryPosition, player.currentPosition, player.secondaryPosition].map((position) =>
    String(position ?? '').toUpperCase(),
  );
  return positions.some((position) => PITCHER_POSITIONS.has(position));
}

function normalizePrimaryPosition(player: AnalysisPlayer): string {
  const position = String(player.primaryPosition ?? player.currentPosition ?? '1B').toUpperCase();
  if (position === 'P') return 'SP';
  if (position === 'TWO-WAY') return 'SP/RP';
  return position;
}

function pitcherRole(player: AnalysisPlayer): string | undefined {
  if (!isPitcher(player)) return undefined;
  const explicit = player.pitcherRole;
  if (explicit === 'SP' || explicit === 'RP' || explicit === 'CP' || explicit === 'SP/RP') return explicit;
  const position = normalizePrimaryPosition(player);
  if (position === 'CP') return 'CP';
  if (position === 'RP') return 'RP';
  if (position === 'SP/RP') return 'SP/RP';
  return 'SP';
}

function traitsFor(player: AnalysisPlayer): string[] {
  const traitValues = [
    player.trait1,
    player.trait2,
    ...(Array.isArray(player.traits) ? player.traits : Object.values(player.traits ?? {})),
  ];
  return traitValues.filter((trait): trait is string => typeof trait === 'string' && trait.trim().length > 0);
}

function normalizeLineupPosition(position: string): LineupPosition {
  const normalized = position.toUpperCase();
  if (normalized === 'DH') return 'DH';
  if (FIELD_POSITIONS.includes(normalized as FieldPosition)) return normalized as FieldPosition;
  return '1B';
}

function normalizeBats(value: unknown): 'L' | 'R' | 'S' | undefined {
  if (value === 'L' || value === 'R' || value === 'S') return value;
  return undefined;
}

function normalizeMojo(value: unknown): EffectiveMojoState {
  if (value === 'Rattled' || value === 'Tense' || value === 'Normal' || value === 'Locked In'
    || value === 'On Fire' || value === 'Jacked') {
    return value;
  }
  if (value === 'Hot') return 'Locked In';
  if (value === 'Cold') return 'Tense';
  if (value === 'Ice Cold') return 'Rattled';
  if (typeof value === 'number') {
    if (value <= -2) return 'Rattled';
    if (value < 0) return 'Tense';
    if (value > 2) return 'On Fire';
    if (value > 0) return 'Locked In';
  }
  return 'Normal';
}

function normalizeFitness(value: unknown): FitnessState {
  if (value === 'JUICED' || value === 'FIT' || value === 'WELL' || value === 'STRAINED'
    || value === 'WEAK' || value === 'HURT') {
    return value;
  }
  return 'FIT';
}

function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(99, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
