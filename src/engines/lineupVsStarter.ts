import { BATTING_ORDER_SLOT_WEIGHTS, CALIBRATE, type EffectiveMojoState, type PitcherRoleKey } from '../data/rosterEngineConstants';
import { defensivePlacementRisk, effectiveRatings, type EffectiveRatingsPlayer, type FitnessState, type GameContext, type PlayerState, type Position } from './effectiveRatings';
import { computeIV, type IVPlayerInput } from './ivEngine';
import { computeTrueValue } from './trueValue';
import type { OptimalLineupModeContext, OptimalLineupSnapshot } from '../types/managerWpa';
import { buildOptimalLineupSnapshot, type BuildOptimalLineupSnapshotInput, type OptimalLineupCandidate } from '../utils/optimalLineup';

export type ScoutPlayer = OptimalLineupCandidate;

export interface OpponentStarterProfile {
  pitcherId: string;
  pitcherName: string;
  throws: 'L' | 'R';
  velocity?: number;
  junk?: number;
  accuracy?: number;
  trait1?: string | null;
  trait2?: string | null;
  traits?: string[];
  arsenal?: string[];
  armSlot?: 'High' | 'Mid' | 'Low' | 'Sub' | null;
  pitcherRole?: 'SP' | 'SP/RP' | 'RP' | 'CP';
}

export interface OptimizeLineupVsStarterInput {
  teamId: string;
  mode: OptimalLineupModeContext;
  instanceId?: string;
  dhEnabled?: boolean;
  roster: ScoutPlayer[];
  opponentStarter: OpponentStarterProfile;
  chosenLineup?: { playerId: string; battingOrderSlot: number; defensivePosition: string }[];
}

export const LINEUP_VS_STARTER_ALGORITHM_VERSION = 'lineup-vs-starter-1.0.0';

export function optimizeLineupVsStarter(input: OptimizeLineupVsStarterInput): OptimalLineupSnapshot {
  const baseInput: BuildOptimalLineupSnapshotInput = {
    candidates: input.roster,
    teamId: input.teamId,
    dhEnabled: input.dhEnabled,
    opposingPitcherHand: input.opponentStarter.throws,
    mode: input.mode,
    instanceId: input.instanceId,
    generatedAt: 0,
    generatedFrom: 'pregame_recalculate',
    sourceConfidence: 'engine_calculated',
  };
  const base = buildOptimalLineupSnapshot(baseInput);
  const playerById = new Map(input.roster.map((player) => [playerId(player), player]));

  // v1 limitation: the unchanged hand-based optimizer still chooses who plays where and bats
  // where. This step only re-scores the resulting slots on full-starter true value. A
  // full-opponent true-value assignment and matchup substrate are Mode-2/later.
  const slots = base.slots.map((slot) => {
    const player = playerById.get(slot.playerId);
    return {
      ...slot,
      projectedSlotKblWpa: player
        ? scoreSlotVsStarter(player, slot.defensivePosition, slot.battingOrderSlot, input.opponentStarter)
        : slot.projectedSlotKblWpa,
    };
  });
  const projectedTeamLineupKblWpa = roundWpa(
    slots.reduce((sum, slot) => sum + slot.projectedSlotKblWpa, 0),
  );

  return {
    ...base,
    snapshotId: '',
    algorithmVersion: LINEUP_VS_STARTER_ALGORITHM_VERSION,
    generatedAt: 0,
    slots,
    projectedTeamLineupKblWpa,
  };
}

function scoreSlotVsStarter(
  player: ScoutPlayer,
  defensivePosition: string,
  battingOrderSlot: number,
  opponentStarter: OpponentStarterProfile,
): number {
  const playingPosition = normalizePosition(defensivePosition);
  const ctx = buildGameContext(opponentStarter, playingPosition);
  const eff = effectiveRatings(player as EffectiveRatingsPlayer, toPlayerState(player), ctx);
  const kblIV = computeIV(toIvInput(player, eff)).kblIV;
  const tv = computeTrueValue(
    {
      kblIV,
      // v1 limitation: lineup candidates carry no chemistry-count substrate here, so chemistry
      // potency is intentionally deferred; this applies only the true-value fielding correction.
      traits: [],
      fielding: clampRating(player.fielding),
      isPitcher: false,
    },
    {},
  ).trueValue;
  const defensivePenalty = playingPosition === 'DH'
    ? 0
    : defensiveRiskPenalty(player, playingPosition);
  const slotScore =
    (tv - defensivePenalty) * BATTING_ORDER_SLOT_WEIGHTS[clampBattingOrderSlot(battingOrderSlot)];

  return roundWpa(slotScore / CALIBRATE.lineupSnapshotWpaDivisor);
}

function buildGameContext(
  opponentStarter: OpponentStarterProfile,
  playingPosition: Position,
): GameContext {
  return {
    pressure: 'none',
    runnersOn: false,
    risp: false,
    opposingHand: opponentStarter.throws,
    opposingPlayer: toOpponentPlayer(opponentStarter),
    inning: 1,
    basesEmpty: true,
    playingPosition,
    pitcherHand: opponentStarter.throws,
  };
}

function toOpponentPlayer(opponentStarter: OpponentStarterProfile): EffectiveRatingsPlayer {
  return {
    id: opponentStarter.pitcherId,
    name: opponentStarter.pitcherName,
    throws: opponentStarter.throws,
    primaryPosition: opponentStarter.pitcherRole ?? 'SP',
    role: opponentStarter.pitcherRole ?? 'SP',
    velocity: opponentStarter.velocity,
    junk: opponentStarter.junk,
    accuracy: opponentStarter.accuracy,
    trait1: opponentStarter.trait1,
    trait2: opponentStarter.trait2,
    traits: opponentStarter.traits,
  };
}

function toIvInput(player: ScoutPlayer, eff: Record<string, number>): IVPlayerInput {
  return {
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
}

function defensiveRiskPenalty(player: ScoutPlayer, position: Position): number {
  const risk = defensivePlacementRisk(player as EffectiveRatingsPlayer, position);
  return risk.chanceFrequency * risk.errorLikelihood * CALIBRATE.lineupDefensiveRiskIvPenalty;
}

function toPlayerState(player: ScoutPlayer): PlayerState {
  return {
    mojo: normalizeMojo(player.mojo),
    fitness: normalizeFitness(player.fitness),
    workload: { role: pitcherRole(player) },
  };
}

function playerId(player: ScoutPlayer): string {
  return player.playerId
    ?? (player as { id?: string }).id
    ?? player.playerName
    ?? (player as { name?: string }).name
    ?? 'unknown-player';
}

function playerName(player: ScoutPlayer): string {
  return player.playerName ?? (player as { name?: string }).name ?? playerId(player);
}

function isPitcher(player: ScoutPlayer): boolean {
  return [player.primaryPosition, player.currentPosition, player.secondaryPosition, player.pitcherRole]
    .map((position) => String(position ?? '').toUpperCase())
    .some((position) => ['P', 'SP', 'SP/RP', 'RP', 'CP', 'TWO-WAY'].includes(position));
}

function normalizePrimaryPosition(player: ScoutPlayer): string {
  const position = String(player.primaryPosition ?? player.currentPosition ?? (isPitcher(player) ? 'SP' : '1B')).toUpperCase();
  if (position === 'P') return 'SP';
  if (position === 'TWO-WAY') return 'SP/RP';
  return position || '1B';
}

function pitcherRole(player: ScoutPlayer): PitcherRoleKey | undefined {
  if (!isPitcher(player)) return undefined;
  const explicit = player.pitcherRole;
  if (explicit === 'SP' || explicit === 'RP' || explicit === 'CP' || explicit === 'SP/RP') return explicit;
  const position = normalizePrimaryPosition(player);
  if (position === 'CP') return 'CP';
  if (position === 'RP') return 'RP';
  if (position === 'SP/RP') return 'SP/RP';
  return 'SP';
}

function traitsFor(player: ScoutPlayer): string[] {
  const raw = [
    player.trait1,
    player.trait2,
    ...(Array.isArray(player.traits) ? player.traits : Object.values(player.traits ?? {})),
  ];
  return raw.filter((trait): trait is string => typeof trait === 'string' && trait.trim().length > 0);
}

function normalizePosition(position: string | undefined): Position {
  const normalized = String(position ?? '').toUpperCase();
  if (
    normalized === 'C' ||
    normalized === '1B' ||
    normalized === '2B' ||
    normalized === 'SS' ||
    normalized === '3B' ||
    normalized === 'LF' ||
    normalized === 'CF' ||
    normalized === 'RF' ||
    normalized === 'DH' ||
    normalized === 'SP' ||
    normalized === 'RP' ||
    normalized === 'CP'
  ) {
    return normalized;
  }
  if (normalized === 'P') return 'SP';
  return 'DH';
}

function normalizeMojo(value: unknown): EffectiveMojoState {
  if (
    value === 'Rattled' ||
    value === 'Tense' ||
    value === 'Normal' ||
    value === 'Locked In' ||
    value === 'On Fire' ||
    value === 'Jacked'
  ) {
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
  if (
    value === 'JUICED' ||
    value === 'FIT' ||
    value === 'WELL' ||
    value === 'STRAINED' ||
    value === 'WEAK' ||
    value === 'HURT'
  ) {
    return value;
  }
  return 'FIT';
}

function clampBattingOrderSlot(slot: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 {
  return Math.max(1, Math.min(9, Math.trunc(slot))) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
}

function clampRating(value: unknown): number {
  return Math.max(0, Math.min(99, finiteOr(value, 0)));
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function roundWpa(value: number): number {
  return Math.round(value * 10000) / 10000;
}
