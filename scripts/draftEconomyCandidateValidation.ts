import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  LEGAL_ROSTER,
  canCover,
  canRelieve,
  canStart,
  depthReport,
  isCloser,
  isLegalRoster,
  type RosterSlotPlayer,
} from '../src/data/rosterConstruction';
import {
  NUMERIC_GRADE_TARGET,
  currentPool,
  quotaShapeFromPool,
  resolveNumericGrade,
  simulateAuction,
  type AuctionSimBiddingPolicy,
  type AuctionSimConfig,
  type AuctionSimLiquidityPenaltyShape,
  type AuctionSimPlayer,
  type AuctionSimResult,
  type AuctionSimRosterEntry,
  type PoolShapePolicyName,
  type PoolShapeResult,
} from '../src/engines/auctionSim';

const FIELD_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const;
const PITCHER_ROLES = ['SP', 'SP', 'SP/RP', 'RP', 'RP', 'CP'] as const;
const TEAMS = ['Blowfish', 'Crocodons', 'Moonstars', 'Sirloins'].map((teamId) => ({ teamId }));
const SEEDS = Array.from({ length: 12 }, (_, index) => `validation-seed-${String(index + 1).padStart(2, '0')}`);
const DOC_PATH = resolve(process.cwd(), 'docs/V2_1_CANDIDATE_VALIDATION.md');
const BUDGET = 1_000_000;

interface Stat {
  min: number | null;
  median: number | null;
  p90: number | null;
  max: number | null;
}

interface ScenarioSpec {
  id: string;
  label: string;
  poolPolicy: PoolShapePolicyName;
  poolSize: number;
  biddingPolicy: AuctionSimBiddingPolicy;
  reserveFractionK: number;
  liquidityPenaltyWeight: number;
  qualityCompletionTargetPercentile: number;
  liquidityPenaltyShape: AuctionSimLiquidityPenaltyShape;
}

interface ScenarioRun {
  seed: string;
  sim: AuctionSimResult;
  runtimeMs: number;
}

interface ScenarioSummary {
  spec: ScenarioSpec;
  shape: PoolShapeResult;
  runs: readonly ScenarioRun[];
  spot11Cash: Stat;
  finalCash: Stat;
  finalQualitySurplus: Stat;
  rosterSpread: Stat;
  freeFill: Stat;
  paidFill: Stat;
  nearFreeLate: Stat;
  unsold: Stat;
  eliteConcentration: Stat;
  middleDraftRate: Stat;
  hardInvariantFailures: number;
  moderateGate: 'PASS' | 'FAIL';
  excellentGate: 'PASS' | 'FAIL';
  failReasons: readonly string[];
}

interface TeamAuditRow {
  teamId: string;
  spend: number;
  finalCash: number;
  strength: number;
  elite: number;
  strong: number;
  core: number;
  filler: number;
  hitters: number;
  pitchers: number;
  starters: number;
  relievers: number;
  closers: number;
  catcherCoverers: number;
  legal: boolean;
  thinPositions: readonly string[];
  budget5: number | null;
  budget11: number | null;
  budget16: number | null;
  budget22: number | null;
}

interface SegmentSpend {
  label: string;
  median: number | null;
}

function shapeForIndex(index: number): RosterSlotPlayer {
  const slot = index % (FIELD_POSITIONS.length + PITCHER_ROLES.length);
  if (slot < FIELD_POSITIONS.length) {
    const position = FIELD_POSITIONS[slot];
    return {
      isPitcher: false,
      position,
      secondaryPosition: position === 'C' ? null : slot % 3 === 0 ? 'C' : slot % 2 === 0 ? 'IF/OF' : null,
    };
  }
  const role = PITCHER_ROLES[slot - FIELD_POSITIONS.length];
  return {
    isPitcher: true,
    position: role,
    role,
    twoWayVariant: role === 'SP/RP' && index % 5 === 0 ? 'C' : null,
  };
}

function numericGradeForIndex(index: number): number {
  if (index < 50) return 92 - index * 0.34;
  if (index < 130) return 75.5 - (index - 50) * 0.22;
  return Math.max(42, 57 - (index - 130) * 0.28);
}

function ivForNumericGrade(numericGrade: number, index: number): number {
  if (numericGrade >= 76) return Math.round(210_000 + (numericGrade - 76) * 8_200 - index * 180);
  if (numericGrade >= 58) return Math.round(38_000 + (numericGrade - 58) * 2_900 + (index % 9) * 750);
  return Math.round(2_500 + Math.max(0, numericGrade - 42) * 820 + (index % 5) * 200);
}

function buildStressPool(size = 180): AuctionSimPlayer[] {
  return Array.from({ length: size }, (_, index) => {
    const numericGrade = numericGradeForIndex(index);
    return {
      playerId: `matrix-player-${String(index + 1).padStart(3, '0')}`,
      iv: ivForNumericGrade(numericGrade, index),
      numericGrade,
      ivPercentile: Math.max(1, 100 - (index / size) * 100),
      pos: shapeForIndex(index),
      fitScore: ((index * 37) % 100) / 100,
    };
  });
}

function shapePool(
  policy: PoolShapePolicyName,
  universe: readonly AuctionSimPlayer[],
  poolSize: number,
): PoolShapeResult {
  if (policy === 'currentPool') return currentPool(universe.slice(0, poolSize));
  return quotaShapeFromPool(universe, { targetSize: poolSize });
}

function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * Math.min(1, Math.max(0, p));
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function stat(values: readonly number[]): Stat {
  return {
    min: percentile(values, 0),
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    max: percentile(values, 1),
  };
}

function finiteOrFallback(value: number | null | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function fmtPct(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'n/a';
}

function fmtMoney(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `$${Math.round(value).toLocaleString('en-US')}`
    : 'n/a';
}

function fmtNum(value: number | null | undefined, digits = 1): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'n/a';
}

function baseConfig(spec: ScenarioSpec, seed: string): AuctionSimConfig {
  return {
    teamCount: TEAMS.length,
    rosterSize: 22,
    budgetPerTeam: BUDGET,
    bidIncrement: 1_000,
    reserveFractionK: spec.reserveFractionK,
    autoFillPriceMode: spec.reserveFractionK === 0 ? 'zero' : 'reserve',
    nominationPolicy: 'starFirst',
    biddingPolicy: spec.biddingPolicy,
    seed,
    spotBudgetCheckpoint: 11,
    minimumCompletionPrice: 0,
    completionSearchMode: 'beam',
    maxCandidatesPerNeed: 4,
    beamWidth: 1,
    marginalBidSearchMode: 'singlePass',
    rosterProjectionMode: 'completionQuote',
    liquidityPenaltyWeight: spec.liquidityPenaltyWeight,
    liquidityPenaltyShape: spec.liquidityPenaltyShape,
    liquidityAuditV1Baseline: true,
    targetSpot11CashRatio: 0.40,
    qualityCompletionTargetPercentile: spec.qualityCompletionTargetPercentile,
    minQualitySurplusRatio: 0.05,
    openSlotPenaltyExponent: 1.25,
    detailedLogs: true,
    poolPolicyName: spec.poolPolicy,
    reserveCostBasis: 'iv',
    valueBasis: 'iv',
  };
}

function runScenario(
  universe: readonly AuctionSimPlayer[],
  spec: ScenarioSpec,
): ScenarioSummary {
  const shape = shapePool(spec.poolPolicy, universe, spec.poolSize);
  const runs: ScenarioRun[] = [];
  for (const seed of SEEDS) {
    const started = performance.now();
    const sim = simulateAuction(shape.players, TEAMS, baseConfig(spec, `${seed}:${spec.id}`));
    runs.push({ seed, sim, runtimeMs: performance.now() - started });
  }
  const hardInvariantFailures = runs.reduce(
    (sum, run) => sum + run.sim.economyDiagnostics.invariantFailures.length,
    0,
  );
  const summaryBase = {
    spec,
    shape,
    runs,
    spot11Cash: stat(runs.map((run) =>
      finiteOrFallback(run.sim.economyDiagnostics.medianBudgetRemainingAtRosterSpot11Ratio, -1)
    )),
    finalCash: stat(runs.map((run) =>
      finiteOrFallback(run.sim.economyDiagnostics.finalCashRemainingRatio, -1)
    )),
    finalQualitySurplus: stat(runs.map((run) =>
      finiteOrFallback(run.sim.economyDiagnostics.finalQualityCompletionSurplusRatio, -1)
    )),
    rosterSpread: stat(runs.map((run) => run.sim.rosterStrengthMetrics.rosterStrengthSpread)),
    freeFill: stat(runs.map((run) => run.sim.economyDiagnostics.freeAutoFillCount)),
    paidFill: stat(runs.map((run) => run.sim.economyDiagnostics.paidAutoFillCount)),
    nearFreeLate: stat(runs.map((run) => nearFreeLatePickCount(run.sim))),
    unsold: stat(runs.map((run) => run.sim.pickLog.filter((entry) => entry.disposition === 'unsold').length)),
    eliteConcentration: stat(runs.map((run) => run.sim.rosterStrengthMetrics.eliteConcentration)),
    middleDraftRate: stat(runs.map((run) => middleDraftRate(shape.players, run.sim))),
    hardInvariantFailures,
  };
  const failReasons = gateFailReasons(summaryBase);
  return {
    ...summaryBase,
    moderateGate: failReasons.length === 0 ? 'PASS' : 'FAIL',
    excellentGate: excellentGatePass(summaryBase) ? 'PASS' : 'FAIL',
    failReasons,
  };
}

function nearFreeLatePickCount(sim: AuctionSimResult): number {
  const lateThreshold = Math.floor((TEAMS.length * LEGAL_ROSTER.size) / 2);
  return sim.pickLog.filter((entry) =>
    entry.nominationNumber > lateThreshold &&
    entry.disposition === 'sold' &&
    (entry.price ?? Number.POSITIVE_INFINITY) <= 1_000
  ).length;
}

function draftedIds(sim: AuctionSimResult): Set<string> {
  return new Set(Object.values(sim.rosters).flat().map((entry) => entry.playerId));
}

function middleDraftRate(pool: readonly AuctionSimPlayer[], sim: AuctionSimResult): number {
  const middle = pool.filter((player) => {
    const grade = resolveNumericGrade(player).numericGrade;
    return grade !== null && grade >= NUMERIC_GRADE_TARGET.middleMin && grade < NUMERIC_GRADE_TARGET.middleMax;
  });
  if (middle.length === 0) return 0;
  const drafted = draftedIds(sim);
  return middle.filter((player) => drafted.has(player.playerId)).length / middle.length;
}

function gateFailReasons(row: Pick<
  ScenarioSummary,
  | 'spot11Cash'
  | 'finalCash'
  | 'finalQualitySurplus'
  | 'rosterSpread'
  | 'freeFill'
  | 'hardInvariantFailures'
> & { shape: PoolShapeResult; runs: readonly ScenarioRun[] }): string[] {
  const reasons: string[] = [];
  const firstRun = row.runs[0]?.sim;
  const highTail = firstRun?.poolMetrics.highTailShare ?? 1;
  const middleMass = firstRun?.poolMetrics.middleMassShare ?? 0;
  const spot11 = finiteOrFallback(row.spot11Cash.median, -1);
  if (spot11 < 0.20 || spot11 > 0.35) reasons.push('spot11 cash outside 20-35% moderate band');
  if (finiteOrFallback(row.finalCash.min, -1) < 0) reasons.push('final cash below 0');
  if (finiteOrFallback(row.finalQualitySurplus.min, -1) < 0) reasons.push('final quality surplus below 0');
  if (finiteOrFallback(row.rosterSpread.p90, 1) > 0.07) reasons.push('roster strength spread p90 above 7%');
  if (finiteOrFallback(row.freeFill.max, 1) !== 0) reasons.push('free fill above 0');
  if (highTail > 0.15) reasons.push('high tail above 15%');
  if (middleMass < 0.70) reasons.push('middle mass below 70%');
  if (row.hardInvariantFailures > 0) reasons.push('hard invariant failures present');
  return reasons;
}

function excellentGatePass(row: Pick<ScenarioSummary, 'spot11Cash' | 'rosterSpread' | 'freeFill' | 'hardInvariantFailures'>): boolean {
  return (
    finiteOrFallback(row.spot11Cash.median, -1) >= 0.25 &&
    finiteOrFallback(row.rosterSpread.p90, 1) <= 0.05 &&
    finiteOrFallback(row.freeFill.max, 1) === 0 &&
    row.hardInvariantFailures === 0
  );
}

function rosterShapes(roster: readonly AuctionSimRosterEntry[]): RosterSlotPlayer[] {
  return roster.map((entry) => entry.pos).filter((pos): pos is RosterSlotPlayer => pos !== undefined);
}

function budgetAtSpot(
  curve: readonly { rosterSize: number; budgetRemaining: number }[] | undefined,
  spot: number,
): number | null {
  if (!curve) return null;
  const exact = curve.find((entry) => entry.rosterSize >= spot);
  return exact?.budgetRemaining ?? null;
}

function teamAuditRows(sim: AuctionSimResult): TeamAuditRow[] {
  return Object.entries(sim.rosters).map(([teamId, roster]) => {
    const shapes = rosterShapes(roster);
    const strength = sim.rosterStrengthMetrics.rosterStrengthByTeam[teamId] ?? 0;
    const budget = sim.economyDiagnostics.finalBudgetByTeam[teamId] ?? 0;
    const report = shapes.length === LEGAL_ROSTER.size ? depthReport(shapes) : { thinPositions: [] };
    return {
      teamId,
      spend: BUDGET - budget,
      finalCash: budget,
      strength,
      elite: roster.filter((entry) => entry.gradeBand === 'elite').length,
      strong: roster.filter((entry) => entry.gradeBand === 'strong').length,
      core: roster.filter((entry) => entry.gradeBand === 'core').length,
      filler: roster.filter((entry) => entry.gradeBand === 'filler').length,
      hitters: shapes.filter((pos) => !pos.isPitcher).length,
      pitchers: shapes.filter((pos) => pos.isPitcher).length,
      starters: shapes.filter(canStart).length,
      relievers: shapes.filter(canRelieve).length,
      closers: shapes.filter(isCloser).length,
      catcherCoverers: shapes.filter((pos) => canCover(pos, 'C')).length,
      legal: shapes.length === LEGAL_ROSTER.size && isLegalRoster(shapes),
      thinPositions: report.thinPositions,
      budget5: budgetAtSpot(sim.budgetCurves[teamId], 5),
      budget11: budgetAtSpot(sim.budgetCurves[teamId], 11),
      budget16: budgetAtSpot(sim.budgetCurves[teamId], 16),
      budget22: budgetAtSpot(sim.budgetCurves[teamId], 22),
    };
  });
}

function segmentSpends(sim: AuctionSimResult): SegmentSpend[] {
  const segments = [
    { label: '1-5', start: 0, end: 5 },
    { label: '6-11', start: 5, end: 11 },
    { label: '12-16', start: 11, end: 16 },
    { label: '17-22', start: 16, end: 22 },
  ];
  return segments.map((segment) => {
    const prices = Object.values(sim.rosters).flatMap((roster) =>
      roster.slice(segment.start, segment.end).map((entry) => entry.salary),
    );
    return { label: segment.label, median: percentile(prices, 0.5) };
  });
}

function representativeRun(summary: ScenarioSummary): ScenarioRun {
  const targetSpot11 = finiteOrFallback(summary.spot11Cash.median, 0);
  const targetSpread = finiteOrFallback(summary.rosterSpread.median, 0);
  return [...summary.runs].sort((left, right) => {
    const leftScore = Math.abs(finiteOrFallback(left.sim.economyDiagnostics.medianBudgetRemainingAtRosterSpot11Ratio) - targetSpot11) +
      Math.abs(left.sim.rosterStrengthMetrics.rosterStrengthSpread - targetSpread);
    const rightScore = Math.abs(finiteOrFallback(right.sim.economyDiagnostics.medianBudgetRemainingAtRosterSpot11Ratio) - targetSpot11) +
      Math.abs(right.sim.rosterStrengthMetrics.rosterStrengthSpread - targetSpread);
    return leftScore - rightScore || left.seed.localeCompare(right.seed);
  })[0];
}

function playerRole(entry: Pick<AuctionSimRosterEntry, 'pos'>): string {
  const pos = entry.pos;
  if (!pos) return 'unknown';
  return pos.isPitcher ? pos.role ?? pos.position : pos.position;
}

function rosterLines(sim: AuctionSimResult): string {
  const lines: string[] = [];
  for (const [teamId, roster] of Object.entries(sim.rosters)) {
    lines.push(`### ${teamId}`);
    lines.push('| Slot | Player | Role | Grade | Band | Price | Source |');
    lines.push('|---:|---|---|---:|---|---:|---|');
    roster.forEach((entry, index) => {
      lines.push(
        `| ${index + 1} | ${entry.playerId} | ${playerRole(entry)} | ${
          fmtNum(entry.numericGrade, 1)
        } | ${entry.gradeBand} | ${fmtMoney(entry.salary)} | ${entry.source} |`,
      );
    });
    lines.push('');
  }
  return lines.join('\n');
}

function teamAuditTable(rows: readonly TeamAuditRow[]): string {
  return [
    '| Team | Spend | Final Cash | Strength | Stars/Core/Filler | Roles | Legal | Thin Depth | Budget 5 | Budget 11 | Budget 16 | Budget 22 |',
    '|---|---:|---:|---:|---|---|---|---|---:|---:|---:|---:|',
    ...rows.map((row) =>
      `| ${row.teamId} | ${fmtMoney(row.spend)} | ${fmtMoney(row.finalCash)} | ${fmtMoney(row.strength)} | ${
        row.elite
      }/${row.strong + row.core}/${row.filler} | H${row.hitters}/P${row.pitchers}/SP${row.starters}/RP${
        row.relievers
      }/CP${row.closers}/C${row.catcherCoverers} | ${row.legal ? 'yes' : 'NO'} | ${
        row.thinPositions.join(', ') || 'none'
      } | ${fmtMoney(row.budget5)} | ${fmtMoney(row.budget11)} | ${fmtMoney(row.budget16)} | ${
        fmtMoney(row.budget22)
      } |`
    ),
  ].join('\n');
}

function segmentSpendTable(spends: readonly SegmentSpend[]): string {
  return [
    '| Roster Segment | Median Pick Price |',
    '|---|---:|',
    ...spends.map((segment) => `| ${segment.label} | ${fmtMoney(segment.median)} |`),
  ].join('\n');
}

function topExpensiveTable(sim: AuctionSimResult): string {
  const sold = sim.pickLog
    .filter((entry) => entry.disposition === 'sold' && entry.price !== null)
    .sort((left, right) => (right.price ?? 0) - (left.price ?? 0) || left.playerId.localeCompare(right.playerId))
    .slice(0, 20);
  return [
    '| Rank | Player | Team | Price | Grade | Band | Role | Nomination |',
    '|---:|---|---|---:|---:|---|---|---:|',
    ...sold.map((entry, index) =>
      `| ${index + 1} | ${entry.playerId} | ${entry.winnerTeamId ?? 'unsold'} | ${
        fmtMoney(entry.price)
      } | ${fmtNum(entry.numericGrade, 1)} | ${entry.gradeBand} | ${entry.roleBucket ?? 'unknown'} | ${
        entry.nominationNumber
      } |`
    ),
  ].join('\n');
}

function topGradeTable(pool: readonly AuctionSimPlayer[], sim: AuctionSimResult): string {
  const pickById = new Map(sim.pickLog.map((entry) => [entry.playerId, entry]));
  return [
    '| Rank | Player | Grade | IV | Status | Team | Price |',
    '|---:|---|---:|---:|---|---|---:|',
    ...[...pool]
      .sort((left, right) =>
        finiteOrFallback(resolveNumericGrade(right).numericGrade) - finiteOrFallback(resolveNumericGrade(left).numericGrade) ||
        left.playerId.localeCompare(right.playerId)
      )
      .slice(0, 20)
      .map((player, index) => {
        const pick = pickById.get(player.playerId);
        const rosterTeam = Object.entries(sim.rosters).find(([, roster]) =>
          roster.some((entry) => entry.playerId === player.playerId)
        )?.[0];
        const status = rosterTeam ? 'drafted' : pick?.disposition ?? 'not nominated';
        return `| ${index + 1} | ${player.playerId} | ${fmtNum(resolveNumericGrade(player).numericGrade, 1)} | ${
          fmtMoney(player.iv)
        } | ${status} | ${rosterTeam ?? pick?.winnerTeamId ?? 'none'} | ${fmtMoney(pick?.price)} |`;
      }),
  ].join('\n');
}

function scenarioSummaryTable(summaries: readonly ScenarioSummary[]): string {
  return [
    '| Scenario | Pool | Bidder | Spot11 Cash | Final Cash | Final Quality | Spread p90 | High Tail | Middle Mass | Free Fill max | Near-Free Late p90 | Middle Draft Rate | Elite Conc p90 | Quota Shortfalls | Hard Inv | Moderate | Excellent |',
    '|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|',
    ...summaries.map((summary) =>
      `| ${summary.spec.label} | ${summary.spec.poolPolicy} n=${summary.spec.poolSize} | ${
        summary.spec.biddingPolicy
      } | ${fmtPct(summary.spot11Cash.median)} | ${fmtPct(summary.finalCash.median)} | ${
        fmtPct(summary.finalQualitySurplus.median)
      } | ${fmtPct(summary.rosterSpread.p90)} | ${fmtPct(summary.runs[0]?.sim.poolMetrics.highTailShare)} | ${
        fmtPct(summary.runs[0]?.sim.poolMetrics.middleMassShare)
      } | ${fmtNum(summary.freeFill.max, 0)} | ${
        fmtNum(summary.nearFreeLate.p90, 0)
      } | ${fmtPct(summary.middleDraftRate.median)} | ${fmtPct(summary.eliteConcentration.p90)} | ${
        summary.shape.quotaShortfalls.length
      } | ${
        summary.hardInvariantFailures
      } | ${summary.moderateGate} | ${summary.excellentGate} |`
    ),
  ].join('\n');
}

function weirdnessExamples(summary: ScenarioSummary, run: ScenarioRun): string[] {
  const rows = teamAuditRows(run.sim);
  const examples: string[] = [];
  const illegal = rows.filter((row) => !row.legal);
  if (illegal.length > 0) examples.push(`Illegal roster shapes: ${illegal.map((row) => row.teamId).join(', ')}`);
  const nearFree = nearFreeLatePickCount(run.sim);
  if (nearFree > 0) examples.push(`${nearFree} late sold picks were at or below one bid increment.`);
  const middleRate = middleDraftRate(summary.shape.players, run.sim);
  if (middleRate < 0.70) examples.push(`Middle-class draft rate is only ${fmtPct(middleRate)}.`);
  const eliteCounts = rows.map((row) => row.elite);
  const totalElite = eliteCounts.reduce((sum, count) => sum + count, 0);
  const maxElite = Math.max(...eliteCounts);
  if (totalElite > 0 && maxElite / totalElite > 0.45) examples.push(`Elite concentration is high: one team has ${maxElite}/${totalElite} elite players.`);
  const hoarders = rows.filter((row) => row.finalCash / BUDGET > 0.35);
  if (hoarders.length > 0) examples.push(`Cash hoarding watch: ${hoarders.map((row) => row.teamId).join(', ')} finished above 35% cash.`);
  const thin = rows.filter((row) => row.thinPositions.length > 0);
  if (thin.length > 0) examples.push(`Soft depth warnings: ${thin.map((row) => `${row.teamId} (${row.thinPositions.join('/')})`).join('; ')}.`);
  if (examples.length === 0) examples.push('No configured weirdness heuristic tripped on the representative run.');
  return examples;
}

function writeDoc(summaries: readonly ScenarioSummary[]): string {
  const candidate = summaries.find((summary) => summary.spec.id === 'candidate-v21-n110');
  if (!candidate) throw new Error('candidate summary missing');
  const representative = representativeRun(candidate);
  const teamRows = teamAuditRows(representative.sim);
  const weirdness = weirdnessExamples(candidate, representative);
  const recommendation = candidate.moderateGate === 'PASS' && candidate.excellentGate === 'PASS'
    ? 'ACCEPT_AS_SIM_CANDIDATE'
    : candidate.moderateGate === 'PASS'
      ? 'ACCEPT_AS_SIM_CANDIDATE'
      : 'NEEDS_TUNING';

  const doc = [
    '# V2.1 Candidate Validation',
    '',
    '## Scope',
    '',
    'This is a sim-only validation pass. It does not change live auction behavior, UI, storage, schema, production pool builders, chemistry, tax, personality, or reserve-price rollout behavior.',
    '',
    '## Command',
    '',
    '- `node --input-type=module -e "import(\'vite\').then(async ({ createServer }) => { const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: \'custom\', logLevel: \'error\' }); await server.ssrLoadModule(\'/scripts/draftEconomyCandidateValidation.ts\'); await server.close(); })"`',
    `- Seeds: ${SEEDS.length}`,
    '',
    '## Candidate Validation Table',
    '',
    scenarioSummaryTable(summaries),
    '',
    '## Gate Result',
    '',
    `- Candidate: \`${candidate.spec.id}\``,
    `- Moderate gate: ${candidate.moderateGate}`,
    `- Excellent gate: ${candidate.excellentGate}`,
    `- Fail reasons: ${candidate.failReasons.join('; ') || 'none'}`,
    `- Quota shortfalls: ${candidate.shape.quotaShortfalls.length} (reported as a diagnostic, not a proposed hard gate)`,
    `- Recommendation: ${recommendation}`,
    '',
    '## Representative Run',
    '',
    `Representative seed: ${representative.seed}`,
    '',
    '### Team Summary',
    '',
    teamAuditTable(teamRows),
    '',
    '### Spend Curve By Roster Segment',
    '',
    segmentSpendTable(segmentSpends(representative.sim)),
    '',
    '### Top 20 Most Expensive Players',
    '',
    topExpensiveTable(representative.sim),
    '',
    '### Top 20 Highest Numeric-Grade Players',
    '',
    topGradeTable(candidate.shape.players, representative.sim),
    '',
    '### Final Rosters',
    '',
    rosterLines(representative.sim),
    '## Pick-Log Weirdness Audit',
    '',
    ...weirdness.map((item) => `- ${item}`),
    '',
    '## Read',
    '',
    `- Middle-class draft rate median: ${fmtPct(candidate.middleDraftRate.median)}`,
    `- Elite concentration p90: ${fmtPct(candidate.eliteConcentration.p90)}`,
    `- Best/worst roster spread p90: ${fmtPct(candidate.rosterSpread.p90)}`,
    `- Near-free late picks p90: ${fmtNum(candidate.nearFreeLate.p90, 0)}`,
    `- Quota shortfalls: ${candidate.shape.quotaShortfalls.length}`,
    `- Free fill max: ${fmtNum(candidate.freeFill.max, 0)}`,
    `- Hard invariant failures: ${candidate.hardInvariantFailures}`,
    '',
    'The candidate validates as a believable sim candidate if the product accepts the moderate gate. It still should not be wired to production until a separate design contract decides how this sim policy maps to the real pool extractor and live bidder.',
    '',
    '## Next Production-Design Recommendation',
    '',
    'Do not ship this bidder directly. Use it to write a production design contract around the moderate gate: spot11 cash 20-35%, non-negative final cash/surplus, spread p90 <=7%, free fill 0, high tail <=15%, middle mass >=70%, and no hard invariants. Then decide whether the live auction should use liquidity-aware WTP, pool-shape controls, or both.',
    '',
  ].join('\n');
  writeFileSync(DOC_PATH, doc);
  return doc;
}

function main(): void {
  const universe = buildStressPool(180);
  const specs: ScenarioSpec[] = [
    {
      id: 'candidate-v21-n110',
      label: 'V2.1 candidate',
      poolPolicy: 'quotaShapeFromPool',
      poolSize: 110,
      biddingPolicy: 'marginalValueV2Liquidity',
      reserveFractionK: 0,
      liquidityPenaltyWeight: 0.95,
      qualityCompletionTargetPercentile: 0.35,
      liquidityPenaltyShape: 'softplus',
    },
    {
      id: 'candidate-v21-n132',
      label: 'V2.1 candidate n132',
      poolPolicy: 'quotaShapeFromPool',
      poolSize: 132,
      biddingPolicy: 'marginalValueV2Liquidity',
      reserveFractionK: 0,
      liquidityPenaltyWeight: 0.95,
      qualityCompletionTargetPercentile: 0.35,
      liquidityPenaltyShape: 'softplus',
    },
    {
      id: 'v1-best',
      label: 'V1 best',
      poolPolicy: 'quotaShapeFromPool',
      poolSize: 110,
      biddingPolicy: 'marginalValueV1',
      reserveFractionK: 0,
      liquidityPenaltyWeight: 0,
      qualityCompletionTargetPercentile: 0.5,
      liquidityPenaltyShape: 'linear',
    },
    {
      id: 'v2-strict-cash-reference',
      label: 'V2 strict-cash reference',
      poolPolicy: 'quotaShapeFromPool',
      poolSize: 110,
      biddingPolicy: 'marginalValueV2Liquidity',
      reserveFractionK: 0,
      liquidityPenaltyWeight: 1,
      qualityCompletionTargetPercentile: 0.35,
      liquidityPenaltyShape: 'linear',
    },
    {
      id: 'rational-baseline',
      label: 'Rational baseline',
      poolPolicy: 'quotaShapeFromPool',
      poolSize: 110,
      biddingPolicy: 'rationalBaseline',
      reserveFractionK: 0,
      liquidityPenaltyWeight: 0,
      qualityCompletionTargetPercentile: 0.5,
      liquidityPenaltyShape: 'linear',
    },
    {
      id: 'current-pool-v2-n110',
      label: 'Current pool V2 n110',
      poolPolicy: 'currentPool',
      poolSize: 110,
      biddingPolicy: 'marginalValueV2Liquidity',
      reserveFractionK: 0,
      liquidityPenaltyWeight: 0.95,
      qualityCompletionTargetPercentile: 0.25,
      liquidityPenaltyShape: 'linear',
    },
    {
      id: 'current-pool-v2-n132',
      label: 'Current pool V2 n132',
      poolPolicy: 'currentPool',
      poolSize: 132,
      biddingPolicy: 'marginalValueV2Liquidity',
      reserveFractionK: 0,
      liquidityPenaltyWeight: 0.95,
      qualityCompletionTargetPercentile: 0.25,
      liquidityPenaltyShape: 'linear',
    },
  ];
  const summaries = specs.map((spec) => runScenario(universe, spec));
  const doc = writeDoc(summaries);
  console.log(doc);
}

main();
