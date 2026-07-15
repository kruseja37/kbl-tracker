import { HISTORICAL_ARCHETYPES } from '../data/historicalArchetypes';
import type { LeagueBuilderMlbDraftSession, Player } from '../utils/leagueBuilderStorage';
import { archetypeStatFitMultiplier, archetypeToCapIdentity } from './archetypeIdentity';

export type SnakeDraftAlignmentGrade = 'STRONG' | 'SOLID' | 'WEAK';

export interface SnakeDraftAlignmentTeamInput {
  teamId: string;
  fitMultipliers: readonly number[];
}

export interface SnakeDraftAlignmentResult {
  teamId: string;
  pickCount: number;
  alignmentScore: number;
  alignmentGrade: SnakeDraftAlignmentGrade;
  normalizedRank: number;
  delta: number;
  startingFanMorale: number;
}

export const SNAKE_DRAFT_ALIGNMENT_TUNING = {
  neutralMorale: 50,
  maxBoost: 15,
  maxPenalty: 15,
  curveExponent: 1.35,
  strongThreshold: 1.04,
  weakThreshold: 0.96,
} as const;

function round(value: number, places = 4): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function mean(values: readonly number[]): number {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return 1;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

export function snakeDraftAlignmentGrade(score: number): SnakeDraftAlignmentGrade {
  if (score >= SNAKE_DRAFT_ALIGNMENT_TUNING.strongThreshold) return 'STRONG';
  if (score <= SNAKE_DRAFT_ALIGNMENT_TUNING.weakThreshold) return 'WEAK';
  return 'SOLID';
}

function normalizedRanks(rows: readonly { teamId: string; alignmentScore: number }[]): Map<string, number> {
  if (rows.length <= 1 || rows.every((row) => row.alignmentScore === rows[0]?.alignmentScore)) {
    return new Map(rows.map((row) => [row.teamId, 0.5]));
  }
  const sorted = [...rows].sort((left, right) => (
    left.alignmentScore - right.alignmentScore || left.teamId.localeCompare(right.teamId)
  ));
  const result = new Map<string, number>();
  for (let start = 0; start < sorted.length;) {
    let end = start;
    while (end + 1 < sorted.length && sorted[end + 1].alignmentScore === sorted[start].alignmentScore) {
      end += 1;
    }
    const rank = ((start + end) / 2) / (sorted.length - 1);
    for (let index = start; index <= end; index += 1) result.set(sorted[index].teamId, rank);
    start = end + 1;
  }
  return result;
}

/** Snake-only fan baseline: relative roster-to-archetype alignment, never payroll. */
export function computeSnakeDraftAlignment(
  teams: readonly SnakeDraftAlignmentTeamInput[],
): SnakeDraftAlignmentResult[] {
  const scored = teams.map((team) => ({
    teamId: team.teamId,
    pickCount: team.fitMultipliers.filter(Number.isFinite).length,
    alignmentScore: round(mean(team.fitMultipliers)),
  }));
  const ranks = normalizedRanks(scored);

  return scored.map((team) => {
    const normalizedRank = ranks.get(team.teamId) ?? 0.5;
    const centered = (normalizedRank - 0.5) * 2;
    const limit = centered >= 0
      ? SNAKE_DRAFT_ALIGNMENT_TUNING.maxBoost
      : SNAKE_DRAFT_ALIGNMENT_TUNING.maxPenalty;
    const delta = round(
      Math.sign(centered) * limit * (Math.abs(centered) ** SNAKE_DRAFT_ALIGNMENT_TUNING.curveExponent),
      2,
    );
    return {
      ...team,
      alignmentGrade: snakeDraftAlignmentGrade(team.alignmentScore),
      normalizedRank,
      delta,
      startingFanMorale: Math.max(0, Math.min(100, SNAKE_DRAFT_ALIGNMENT_TUNING.neutralMorale + delta)),
    };
  });
}

/** Shared competition rank: clubs with the same score occupy the same room rank. */
export function snakeDraftAlignmentRoomRank(
  results: readonly SnakeDraftAlignmentResult[],
  teamId: string,
): number | null {
  const team = results.find((row) => row.teamId === teamId);
  if (!team) return null;
  return 1 + results.filter((row) => row.alignmentScore > team.alignmentScore).length;
}

export function snakePlayerArchetypeFitMultiplier(
  player: Pick<Player, 'primaryPosition' | 'power' | 'contact' | 'speed' | 'fielding' | 'arm' | 'velocity' | 'junk' | 'accuracy'>,
  archetypeId: string | null | undefined,
): number {
  const archetype = archetypeId
    ? HISTORICAL_ARCHETYPES.find((candidate) => candidate.id === archetypeId)
    : undefined;
  if (!archetype) return 1;
  const position = player.primaryPosition.toUpperCase();
  const isPitcher = ['SP', 'SP/RP', 'RP', 'CP', 'P'].includes(position);
  return archetypeStatFitMultiplier(archetypeToCapIdentity(archetype), {
    isPitcher,
    role: position,
    power: player.power,
    contact: player.contact,
    speed: player.speed,
    fielding: player.fielding,
    arm: player.arm,
    velocity: player.velocity,
    junk: player.junk,
    accuracy: player.accuracy,
  }) ?? 1;
}

/** Build the same private per-team alignment input for live room and franchise freeze. */
export function buildSnakeDraftAlignmentInputs(args: {
  session: LeagueBuilderMlbDraftSession;
  playersById: ReadonlyMap<string, Player>;
}): SnakeDraftAlignmentTeamInput[] {
  const lockedClubs = args.session.draftManifest?.lockedClubs
    ?? args.session.snakeSetup?.clubs
    ?? [];
  const pickOrder = args.session.draftManifest?.pickOrder ?? args.session.pickOrder;
  const completedPicks = args.session.draftManifest?.completedPicks ?? args.session.completedPicks;
  const archetypeByTeamId = new Map(lockedClubs.map((club) => [club.teamId, club.archetypeId]));
  const teamIds = [...new Set([
    ...lockedClubs.map((club) => club.teamId),
    ...pickOrder.map((pick) => pick.teamId),
  ])];
  const fitsByTeamId = new Map(teamIds.map((teamId) => [teamId, [] as number[]]));

  for (const pick of completedPicks) {
    const player = args.playersById.get(pick.playerId);
    if (!player) throw new Error(`Snake alignment is missing drafted player ${pick.playerId}.`);
    const fits = fitsByTeamId.get(pick.teamId);
    if (!fits) throw new Error(`Snake alignment is missing drafting club ${pick.teamId}.`);
    fits.push(snakePlayerArchetypeFitMultiplier(player, archetypeByTeamId.get(pick.teamId)));
  }

  return teamIds.map((teamId) => ({ teamId, fitMultipliers: fitsByTeamId.get(teamId) ?? [] }));
}
