import { LEGAL_ROSTER, isLegalRoster, type RosterSlotPlayer } from '../data/rosterConstruction';
import type { LuxuryCapRow } from '../data/tierParams';
import type {
  LeagueBuilderMlbDraftSession,
  SnakeDraftTradeRecord,
} from '../utils/leagueBuilderStorage';
import { auctionMarginalTaxWithCaps } from './auctionLuxuryTax';
import {
  cheapestLegalCompletion,
  type CompletionCandidate,
} from './auctionCompletionFloor';
import {
  assessSolvency,
  luxuryTax,
  validateTrade,
  type ConstructionPlayer,
  type PickValue,
  type SolvencyAssessment,
  type TradeVerdict,
} from './leagueConstruction';
import {
  playerFillsHardRequirement,
  rosterNeedBreakdown,
} from './rosterNeed';

/**
 * SNAKE POC tuning lives together so the viability test has obvious dials rather than scattered
 * literals. Values are deliberately conservative: tax carries slightly more weight than a dollar
 * of board value, while seeded texture can only move a candidate by one percent of his board value.
 */
export const SNAKE_POC_TUNING = {
  cpuTaxLambda: 1.15,
  cpuJitterFraction: 0.01,
  forecastRollouts: 50,
  cpuTradeGreedMargin: 0.05,
  runWindowPicks: 5,
  runMinimumPicks: 3,
} as const;

export interface SnakeDraftPlayerModel {
  playerId: string;
  iv: number;
  position: string;
  shape: RosterSlotPlayer;
  construction: ConstructionPlayer;
}

export interface SnakeDraftRosterEntry extends SnakeDraftPlayerModel {
  settledSalary: number;
}

export type SnakePickTone = 'clear' | 'tight' | 'blocked';

export interface SnakePickGuard {
  confirmable: boolean;
  tone: SnakePickTone;
  reason: string;
  assessment: SolvencyAssessment;
  marginalTax: number;
  trueCost: number;
  mustFill: boolean;
  completionPickIds: readonly string[];
  completionHeadroom: number;
}

export interface EvaluateSnakePickInput {
  roster: readonly SnakeDraftRosterEntry[];
  candidate: SnakeDraftPlayerModel;
  remainingPool: readonly SnakeDraftPlayerModel[];
  committedSpent: number;
  tierCap: number;
  shiftedCaps: readonly LuxuryCapRow[];
}

function money(value: number): string {
  return `$${Math.max(0, Math.round(value)).toLocaleString()}`;
}

function mustFillWords(need: ReturnType<typeof rosterNeedBreakdown>): string {
  const needs: string[] = [];
  if (need.missingPrimaries.length > 0) needs.push(need.missingPrimaries.join('/'));
  if (need.catcherCoverNeed > 0) needs.push('a second catcher option');
  if (need.rotationDeficit > 0) needs.push('a starter');
  if (need.bullpenDeficit > 0) needs.push('a reliever');
  if (need.closerDeficit > 0) needs.push('a closer');
  if (need.hitterFloorNeed > 0) needs.push('a position player');
  if (need.pitcherFloorNeed > 0) needs.push('a pitcher');
  return needs.length > 0 ? needs.join(', ') : 'an open roster seat';
}

/**
 * The POC's one pick gate. It deliberately composes, rather than replaces, the production laws:
 * assessSolvency supplies the existing money signal; cheapestLegalCompletion proves a real legal
 * 22 is still constructible; the final all-in check includes the tax on that concrete completion.
 */
export function evaluateSnakePick(input: EvaluateSnakePickInput): SnakePickGuard {
  const rosterShapes = input.roster.map((entry) => entry.shape);
  const rosterConstruction = input.roster.map((entry) => entry.construction);
  const remaining = input.remainingPool.filter((entry) => entry.playerId !== input.candidate.playerId);
  const remainingCompletion: CompletionCandidate[] = remaining.map((entry) => ({
    id: entry.playerId,
    price: entry.iv,
    shape: entry.shape,
  }));
  const assessment = assessSolvency({
    committedRoster: rosterConstruction,
    committedSalaries: input.committedSpent,
    candidate: input.candidate.construction,
    candidateSalary: input.candidate.iv,
    caps: [...input.shiftedCaps],
    mode: 'taxed',
    tierCap: input.tierCap,
    rosterSize: LEGAL_ROSTER.size,
    remainingPoolSalaries: remaining.map((entry) => entry.iv),
  });
  const marginalTax = auctionMarginalTaxWithCaps(
    rosterConstruction,
    input.candidate.construction,
    undefined,
    [...input.shiftedCaps],
  );
  const trueCost = input.candidate.iv + marginalTax;
  const needBefore = rosterNeedBreakdown(rosterShapes);
  const turnsBeforePick = LEGAL_ROSTER.size - rosterShapes.length;
  const mustFill = needBefore.minimumAdditions === turnsBeforePick;
  const fillsMustFillSeat = playerFillsHardRequirement(input.candidate.shape, needBefore);
  const rosterAfter = [...rosterShapes, input.candidate.shape];
  const openSlots = LEGAL_ROSTER.size - rosterAfter.length;
  const completion = cheapestLegalCompletion(rosterAfter, remainingCompletion, openSlots);

  const completionModels = completion.pickIds
    .map((id) => remaining.find((entry) => entry.playerId === id))
    .filter((entry): entry is SnakeDraftPlayerModel => Boolean(entry));
  const finalTax = completion.feasible
    ? luxuryTax(
      [
        ...rosterConstruction,
        input.candidate.construction,
        ...completionModels.map((entry) => entry.construction),
      ],
      [...input.shiftedCaps],
      'taxed',
    ).charged
    : Number.POSITIVE_INFINITY;
  const finalSalary = input.committedSpent
    + input.candidate.iv
    + completionModels.reduce((sum, entry) => sum + entry.iv, 0);
  const completionHeadroom = completion.feasible
    ? input.tierCap - finalSalary - finalTax
    : Number.NEGATIVE_INFINITY;

  let confirmable = true;
  let tone: SnakePickTone = 'clear';
  let reason: string;

  if (mustFill && !fillsMustFillSeat) {
    confirmable = false;
    tone = 'blocked';
    reason = `This turn has to cover ${mustFillWords(needBefore)}. Choose a player who keeps the 22 possible.`;
  } else if (!completion.feasible || completionModels.length !== completion.pickIds.length) {
    confirmable = false;
    tone = 'blocked';
    reason = 'This pick leaves no legal way to finish the 22 from the players still available.';
  } else if (!assessment.confirmable || completionHeadroom < 0) {
    confirmable = false;
    tone = 'blocked';
    const shortfall = Math.max(-assessment.slack, -completionHeadroom, 0);
    reason = `This pick leaves the club ${money(shortfall)} short after saving enough to finish the 22.`;
  } else if (assessment.signal === 'RED' || marginalTax > 0 || completionHeadroom < input.tierCap * 0.08) {
    tone = 'tight';
    reason = marginalTax > 0
      ? `It fits, but adds ${money(marginalTax)} in tax and leaves ${money(completionHeadroom)} after a legal finish.`
      : `It fits, with ${money(completionHeadroom)} left after a legal finish.`;
  } else {
    reason = `It fits and leaves ${money(completionHeadroom)} after a legal finish.`;
  }

  return {
    confirmable,
    tone,
    reason,
    assessment,
    marginalTax,
    trueCost,
    mustFill,
    completionPickIds: completion.pickIds,
    completionHeadroom,
  };
}

export interface SnakeCpuCandidate {
  playerId: string;
  blendedBoardValue: number;
  needMultiplier: number;
  fitMultiplier: number;
  marginalTax: number;
  selectable: boolean;
}

export interface SnakeCpuPickResult {
  playerId: string;
  score: number;
  baseScore: number;
  jitter: number;
}

function hash32(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(value: string): number {
  return hash32(value) / 0xffffffff;
}

export function scoreSnakeCpuCandidate(
  candidate: SnakeCpuCandidate,
  taxLambda: number = SNAKE_POC_TUNING.cpuTaxLambda,
): number {
  return candidate.blendedBoardValue * candidate.needMultiplier * candidate.fitMultiplier
    - taxLambda * candidate.marginalTax;
}

/** Same seed/pick/team/candidate produces the same texture; player-id tie-break closes the sort. */
export function pickSnakeCpuCandidate(input: {
  seed: string;
  pickIndex: number;
  teamId: string;
  candidates: readonly SnakeCpuCandidate[];
  rollout?: number;
  taxLambda?: number;
}): SnakeCpuPickResult | null {
  const selectable = input.candidates.filter((candidate) => candidate.selectable);
  let best: SnakeCpuPickResult | null = null;
  for (const candidate of selectable) {
    const baseScore = scoreSnakeCpuCandidate(candidate, input.taxLambda);
    const unit = seededUnit([
      input.seed,
      input.rollout ?? 0,
      input.pickIndex,
      input.teamId,
      candidate.playerId,
    ].join(':'));
    const jitter = (unit * 2 - 1)
      * Math.max(1, Math.abs(candidate.blendedBoardValue))
      * SNAKE_POC_TUNING.cpuJitterFraction;
    const result = { playerId: candidate.playerId, score: baseScore + jitter, baseScore, jitter };
    if (
      best === null
      || result.score > best.score
      || (result.score === best.score && result.playerId.localeCompare(best.playerId) < 0)
    ) {
      best = result;
    }
  }
  return best;
}

export function seededSnakeShuffle(teamIds: readonly string[], seed: string): string[] {
  return [...teamIds]
    .map((teamId) => ({ teamId, key: seededUnit(`${seed}:shuffle:${teamId}`) }))
    .sort((left, right) => left.key - right.key || left.teamId.localeCompare(right.teamId))
    .map((entry) => entry.teamId);
}

export function commitSnakeDraftPick(input: {
  session: LeagueBuilderMlbDraftSession;
  playerId: string;
  settledSalary: number;
  marginalTax: number;
}): LeagueBuilderMlbDraftSession {
  const slot = input.session.pickOrder[input.session.currentPickIndex];
  if (!slot) throw new Error('The draft has no pick on the clock.');
  if (input.session.completedPicks.some((pick) => pick.playerId === input.playerId)) {
    throw new Error('That player has already been drafted.');
  }
  return {
    ...input.session,
    completedPicks: [
      ...input.session.completedPicks,
      {
        ...slot,
        playerId: input.playerId,
        settledSalary: input.settledSalary,
        marginalTax: input.marginalTax,
      },
    ],
    currentPickIndex: input.session.currentPickIndex + 1,
  };
}

export interface SnakeAvailabilityCandidate {
  playerId: string;
  byTeamId: Readonly<Record<string, Omit<SnakeCpuCandidate, 'playerId'>>>;
}

export interface SnakeAvailabilityRow {
  playerId: string;
  nextPick: number | null;
  survivalPct: number | null;
  lastRealisticPick: number | null;
  survivalByPick: Readonly<Record<number, number>>;
}

export interface SnakeAvailabilityForecast {
  rollouts: number;
  nextUserPick: number | null;
  rows: SnakeAvailabilityRow[];
}

/**
 * Cheap POC forecast: CPU turns use the exact seeded CPU score function; user turns are treated as
 * passes so every candidate's survival remains conditional on the user waiting. Team score inputs
 * are snapshotted at the completed-pick seam, then memoized by the page until the next pick/trade.
 */
export function forecastSnakeAvailability(input: {
  seed: string;
  currentPickIndex: number;
  pickOrder: readonly { pick: number; teamId: string }[];
  userTeamId: string;
  candidates: readonly SnakeAvailabilityCandidate[];
  rollouts?: number;
}): SnakeAvailabilityForecast {
  const rollouts = input.rollouts ?? SNAKE_POC_TUNING.forecastRollouts;
  const futureUserSlots = input.pickOrder
    .slice(input.currentPickIndex + 1)
    .filter((slot) => slot.teamId === input.userTeamId);
  const counts = new Map<string, Map<number, number>>(
    input.candidates.map((candidate) => [candidate.playerId, new Map()]),
  );

  for (let rollout = 0; rollout < rollouts; rollout += 1) {
    const available = new Set(input.candidates.map((candidate) => candidate.playerId));
    for (let index = input.currentPickIndex + 1; index < input.pickOrder.length; index += 1) {
      const slot = input.pickOrder[index];
      if (slot.teamId === input.userTeamId) {
        for (const playerId of available) {
          const row = counts.get(playerId);
          row?.set(slot.pick, (row.get(slot.pick) ?? 0) + 1);
        }
        continue;
      }
      const cpuCandidates: SnakeCpuCandidate[] = input.candidates.flatMap((candidate) => {
        if (!available.has(candidate.playerId)) return [];
        const model = candidate.byTeamId[slot.teamId];
        return model ? [{ playerId: candidate.playerId, ...model }] : [];
      });
      const picked = pickSnakeCpuCandidate({
        seed: input.seed,
        pickIndex: index,
        teamId: slot.teamId,
        candidates: cpuCandidates,
        rollout,
      });
      if (picked) available.delete(picked.playerId);
    }
  }

  const nextUserPick = futureUserSlots[0]?.pick ?? null;
  return {
    rollouts,
    nextUserPick,
    rows: input.candidates.map((candidate) => {
      const survivalByPick = Object.fromEntries(
        futureUserSlots.map((slot) => [
          slot.pick,
          (counts.get(candidate.playerId)?.get(slot.pick) ?? 0) / Math.max(1, rollouts),
        ]),
      );
      const lastRealisticPick = [...futureUserSlots]
        .reverse()
        .find((slot) => (survivalByPick[slot.pick] ?? 0) >= 0.5)?.pick ?? null;
      return {
        playerId: candidate.playerId,
        nextPick: nextUserPick,
        survivalPct: nextUserPick === null ? null : survivalByPick[nextUserPick] ?? 0,
        lastRealisticPick,
        survivalByPick,
      };
    }),
  };
}

function uniquePicks(picks: readonly number[]): number[] {
  return [...new Set(picks)].sort((left, right) => left - right);
}

function pickValue(pick: number, chart: readonly PickValue[]): number {
  const row = chart[pick - 1];
  if (!row) throw new Error(`Pick ${pick} is outside this draft.`);
  return row.value;
}

export interface SnakeTradeResult {
  accepted: boolean;
  reason: string;
  verdict: TradeVerdict;
  session: LeagueBuilderMlbDraftSession;
  trade: SnakeDraftTradeRecord | null;
}

export function executeSnakePickTrade(input: {
  session: LeagueBuilderMlbDraftSession;
  humanTeamId: string;
  cpuTeamId: string;
  humanPickNumbers: readonly number[];
  cpuPickNumbers: readonly number[];
  pickValueChart: readonly PickValue[];
  /** Optional POC projection of the CPU's own §4.1 candidate-score value at each future pick. */
  cpuDecisionValueByPick?: Readonly<Record<number, number>>;
  /** Caller proves both affected clubs can still construct their remaining hard roster seats. */
  mustFillSurvives?: boolean;
  greedMargin?: number;
}): SnakeTradeResult {
  const humanPicks = uniquePicks(input.humanPickNumbers);
  const cpuPicks = uniquePicks(input.cpuPickNumbers);
  const verdict = validateTrade(
    humanPicks.map((pick) => ({ pick })),
    cpuPicks.map((pick) => ({ pick })),
    [...input.pickValueChart],
  );
  const reject = (reason: string): SnakeTradeResult => ({
    accepted: false,
    reason,
    verdict,
    session: input.session,
    trade: null,
  });

  if (input.humanTeamId === input.cpuTeamId) return reject('Choose another club.');
  if (humanPicks.length < 1 || humanPicks.length > 3 || cpuPicks.length < 1 || cpuPicks.length > 3) {
    return reject('Each side must choose one pick, with no more than two extra picks.');
  }
  if (humanPicks.length !== cpuPicks.length) {
    return reject('Keep the same number of roster spots on both sides so both clubs can still reach 22.');
  }
  if (input.mustFillSurvives === false) {
    return reject('The swap would leave one club without a legal path through its remaining roster seats.');
  }

  const futureSlots = input.session.pickOrder.slice(input.session.currentPickIndex + 1);
  const futureByPick = new Map(futureSlots.map((slot) => [slot.pick, slot]));
  if (humanPicks.some((pick) => futureByPick.get(pick)?.teamId !== input.humanTeamId)) {
    return reject('One of your offered picks is no longer yours or is already on the clock.');
  }
  if (cpuPicks.some((pick) => futureByPick.get(pick)?.teamId !== input.cpuTeamId)) {
    return reject("One requested pick is no longer that club's or is already on the clock.");
  }

  const humanValue = humanPicks.reduce((sum, pick) => sum + pickValue(pick, input.pickValueChart), 0);
  const cpuValue = cpuPicks.reduce((sum, pick) => sum + pickValue(pick, input.pickValueChart), 0);
  const cpuDecisionReceived = humanPicks.reduce(
    (sum, pick) => sum + (input.cpuDecisionValueByPick?.[pick] ?? pickValue(pick, input.pickValueChart)),
    0,
  );
  const cpuDecisionGiven = cpuPicks.reduce(
    (sum, pick) => sum + (input.cpuDecisionValueByPick?.[pick] ?? pickValue(pick, input.pickValueChart)),
    0,
  );
  const greedMargin = input.greedMargin ?? SNAKE_POC_TUNING.cpuTradeGreedMargin;
  if (cpuDecisionReceived + 1e-9 < cpuDecisionGiven * (1 + greedMargin)) {
    return reject(`The other club wants about ${Math.round(greedMargin * 100)}% more pick value.`);
  }

  const humanSet = new Set(humanPicks);
  const cpuSet = new Set(cpuPicks);
  const nextPickOrder = input.session.pickOrder.map((slot) => {
    if (humanSet.has(slot.pick)) return { ...slot, teamId: input.cpuTeamId };
    if (cpuSet.has(slot.pick)) return { ...slot, teamId: input.humanTeamId };
    return slot;
  });
  const completedCount = (teamId: string) => input.session.completedPicks.filter((pick) => pick.teamId === teamId).length;
  const futureCount = (teamId: string) => nextPickOrder
    .slice(input.session.currentPickIndex)
    .filter((slot) => slot.teamId === teamId).length;
  if (
    completedCount(input.humanTeamId) + futureCount(input.humanTeamId) < input.session.rounds
    || completedCount(input.cpuTeamId) + futureCount(input.cpuTeamId) < input.session.rounds
  ) {
    return reject('The swap would leave one club without enough turns to finish its 22.');
  }

  const trade: SnakeDraftTradeRecord = {
    id: `snake-trade-${input.session.currentPickIndex}-${(input.session.trades?.length ?? 0) + 1}`,
    atPickIndex: input.session.currentPickIndex,
    humanTeamId: input.humanTeamId,
    cpuTeamId: input.cpuTeamId,
    humanPickNumbers: humanPicks,
    cpuPickNumbers: cpuPicks,
    humanValue,
    cpuValue,
    cpuDecisionGain: cpuDecisionReceived - cpuDecisionGiven,
    greedMargin,
  };
  return {
    accepted: true,
    reason: 'The other club accepts. The order is updated now.',
    verdict,
    trade,
    session: {
      ...input.session,
      pickOrder: nextPickOrder,
      trades: [...(input.session.trades ?? []), trade],
    },
  };
}

export interface PositionRun {
  position: string;
  count: number;
  remaining: number;
}

export function detectSnakePositionRun(input: {
  completedPlayerIds: readonly string[];
  positionByPlayerId: ReadonlyMap<string, string>;
  availablePlayerIds: readonly string[];
}): PositionRun | null {
  const recent = input.completedPlayerIds.slice(-SNAKE_POC_TUNING.runWindowPicks);
  const counts = new Map<string, number>();
  for (const playerId of recent) {
    const position = input.positionByPlayerId.get(playerId);
    if (position) counts.set(position, (counts.get(position) ?? 0) + 1);
  }
  const run = [...counts.entries()]
    .filter(([, count]) => count >= SNAKE_POC_TUNING.runMinimumPicks)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];
  if (!run) return null;
  const [position, count] = run;
  const remaining = input.availablePlayerIds
    .filter((playerId) => input.positionByPlayerId.get(playerId) === position)
    .length;
  return { position, count, remaining };
}

export function snakeRosterIsLegal(roster: readonly SnakeDraftRosterEntry[]): boolean {
  return isLegalRoster(roster.map((entry) => entry.shape));
}
