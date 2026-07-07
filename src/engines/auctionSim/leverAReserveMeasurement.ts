import type { RosterSlotPlayer } from '../../data/rosterConstruction';
import { simulateAuction } from './runAuctionSim';
import type {
  AutoFillPriceMode,
  AuctionSimBiddingPolicy,
  AuctionSimConfig,
  AuctionSimNominationPolicy,
  AuctionSimPlayer,
  AuctionSimResult,
  AuctionSimTeamInput,
} from './types';

export type LeverAMeasurementPreset = 'grounded' | 'balanced';
export type LeverAMeasurementLegId = 'k0-baseline' | 'k065-reserve';

export interface LeverAMeasurementRun {
  preset: LeverAMeasurementPreset;
  legId: LeverAMeasurementLegId;
  reserveFractionK: number;
  autoFillPriceMode: AutoFillPriceMode;
  seed: string;
  nominationPolicy: AuctionSimNominationPolicy;
  spot11BudgetRatio: number;
  belowReserveSaleCount: number;
  stuckTeamCount: number;
  incompleteTeamCount: number;
  illegalFullTeamCount: number;
  rosterStrengthSpread: number;
  invariantFailureCount: number;
}

export interface LeverAMeasurementRow {
  preset: LeverAMeasurementPreset;
  legId: LeverAMeasurementLegId;
  reserveFractionK: number;
  autoFillPriceMode: AutoFillPriceMode;
  runs: number;
  spot11BudgetMean: number;
  spot11BudgetMedian: number;
  belowReserveSaleCount: number;
  stuckTeamCount: number;
  incompleteTeamCount: number;
  illegalFullTeamCount: number;
  rosterStrengthSpreadMean: number;
  rosterStrengthSpreadMedian: number;
  invariantFailureCount: number;
}

export interface LeverAMeasurementReport {
  rows: LeverAMeasurementRow[];
  baselineReproduced: boolean;
}

const TEAM_COUNT = 4;
const ROSTER_SIZE = 22;
const BUDGET_PER_TEAM = 1_000_000;
const BID_INCREMENT = 1_000;
const SPOT_BUDGET_CHECKPOINT = 11;
const SEEDS = ['kbl-econ-s1', 'kbl-econ-s2', 'kbl-econ-s3', 'kbl-econ-s4', 'kbl-econ-s5'] as const;
const NOMINATION_POLICIES = ['starFirst', 'randomSeeded'] as const satisfies readonly AuctionSimNominationPolicy[];

const LEGS: readonly {
  legId: LeverAMeasurementLegId;
  reserveFractionK: number;
  autoFillPriceMode: AutoFillPriceMode;
}[] = [
  { legId: 'k0-baseline', reserveFractionK: 0, autoFillPriceMode: 'zero' },
  { legId: 'k065-reserve', reserveFractionK: 0.65, autoFillPriceMode: 'reserve' },
];

const PRESET_PROFILES: Record<LeverAMeasurementPreset, {
  poolSize: number;
  lowShare: number;
  middleShare: number;
  highShare: number;
}> = {
  grounded: { poolSize: 106, lowShare: 0.104, middleShare: 0.802, highShare: 0.094 },
  balanced: { poolSize: 110, lowShare: 0.118, middleShare: 0.745, highShare: 0.136 },
};

const LEGAL_SLOT_SEQUENCE: readonly string[] = [
  'C',
  '1B',
  '2B',
  '3B',
  'SS',
  'LF',
  'CF',
  'RF',
  'C',
  '1B',
  '2B',
  '3B',
  'LF',
  'RF',
  'SS',
  'SP',
  'SP',
  'SP',
  'SP',
  'SP',
  'RP',
  'RP',
  'RP',
  'RP',
  'CP',
  'CP',
];

function hitter(position: string): RosterSlotPlayer {
  const secondaryPosition =
    position === 'C' ? null :
    ['1B', '2B', '3B', 'SS'].includes(position) ? 'IF' :
    ['LF', 'CF', 'RF'].includes(position) ? 'OF' :
    null;
  return { isPitcher: false, position, secondaryPosition };
}

function pitcher(role: string): RosterSlotPlayer {
  return { isPitcher: true, position: role, role };
}

function posForIndex(index: number): RosterSlotPlayer {
  const slot = LEGAL_SLOT_SEQUENCE[index % LEGAL_SLOT_SEQUENCE.length];
  return slot === 'SP' || slot === 'RP' || slot === 'CP' ? pitcher(slot) : hitter(slot);
}

function gradeAt(preset: LeverAMeasurementPreset, index: number, poolSize: number): number {
  const profile = PRESET_PROFILES[preset];
  const lowCount = Math.round(poolSize * profile.lowShare);
  const highCount = Math.round(poolSize * profile.highShare);
  const middleCount = Math.max(0, poolSize - lowCount - highCount);
  if (index < highCount) return 78 + (index % 9) * 1.15;
  if (index < highCount + middleCount) return 59 + ((index - highCount) % 17);
  return 49 + ((index - highCount - middleCount) % 9);
}

function ivForGrade(grade: number, index: number): number {
  const roleBump = (index % LEGAL_SLOT_SEQUENCE.length) * 120;
  return Math.round(1_500 + grade * 500 + roleBump);
}

export function buildLeverAMeasurementPool(preset: LeverAMeasurementPreset): AuctionSimPlayer[] {
  const { poolSize } = PRESET_PROFILES[preset];
  return Array.from({ length: poolSize }, (_, index) => {
    const numericGrade = gradeAt(preset, index, poolSize);
    return {
      playerId: `${preset}-${String(index + 1).padStart(3, '0')}`,
      iv: ivForGrade(numericGrade, index),
      numericGrade,
      pos: undefined,
      fitScore: ((index * 37) % 100) / 100,
    };
  }).sort((left, right) => right.iv - left.iv || left.playerId.localeCompare(right.playerId));
}

function teams(): AuctionSimTeamInput[] {
  return Array.from({ length: TEAM_COUNT }, (_, index) => ({ teamId: `team-${index + 1}` }));
}

function config(
  leg: (typeof LEGS)[number],
  nominationPolicy: AuctionSimNominationPolicy,
  seed: string,
): Partial<AuctionSimConfig> {
  return {
    teamCount: TEAM_COUNT,
    rosterSize: ROSTER_SIZE,
    budgetPerTeam: BUDGET_PER_TEAM,
    bidIncrement: BID_INCREMENT,
    spotBudgetCheckpoint: SPOT_BUDGET_CHECKPOINT,
    biddingPolicy: 'rationalBaseline' satisfies AuctionSimBiddingPolicy,
    nominationPolicy,
    seed,
    reserveFractionK: leg.reserveFractionK,
    autoFillPriceMode: leg.autoFillPriceMode,
    completionSearchMode: 'exact',
  };
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stuckTeamCounts(sim: AuctionSimResult): {
  stuckTeamCount: number;
  incompleteTeamCount: number;
  illegalFullTeamCount: number;
} {
  let incompleteTeamCount = 0;
  let illegalFullTeamCount = 0;
  for (const [teamId, roster] of Object.entries(sim.rosters)) {
    if (roster.length < ROSTER_SIZE) {
      incompleteTeamCount += 1;
      continue;
    }
    if ((sim.economyDiagnostics.finalCompletionSurplusByTeam[teamId] ?? -BUDGET_PER_TEAM) < 0) {
      illegalFullTeamCount += 1;
    }
  }
  return {
    stuckTeamCount: incompleteTeamCount + illegalFullTeamCount,
    incompleteTeamCount,
    illegalFullTeamCount,
  };
}

function runOne(
  preset: LeverAMeasurementPreset,
  leg: (typeof LEGS)[number],
  seed: string,
  nominationPolicy: AuctionSimNominationPolicy,
): LeverAMeasurementRun {
  const simSeed = `${seed}:4t:${preset}:q68:${nominationPolicy}:${leg.legId}`;
  const sim = simulateAuction(buildLeverAMeasurementPool(preset), teams(), config(leg, nominationPolicy, simSeed));
  const stuck = stuckTeamCounts(sim);
  return {
    preset,
    legId: leg.legId,
    reserveFractionK: leg.reserveFractionK,
    autoFillPriceMode: leg.autoFillPriceMode,
    seed,
    nominationPolicy,
    spot11BudgetRatio: sim.economyDiagnostics.medianBudgetRemainingAtRosterSpot11Ratio ?? 0,
    belowReserveSaleCount: sim.economyDiagnostics.belowReserveSaleCount,
    stuckTeamCount: stuck.stuckTeamCount,
    incompleteTeamCount: stuck.incompleteTeamCount,
    illegalFullTeamCount: stuck.illegalFullTeamCount,
    rosterStrengthSpread: sim.rosterStrengthMetrics.rosterStrengthSpread,
    invariantFailureCount: sim.economyDiagnostics.invariantFailures.length,
  };
}

function summarize(runs: readonly LeverAMeasurementRun[]): LeverAMeasurementRow {
  const first = runs[0];
  return {
    preset: first.preset,
    legId: first.legId,
    reserveFractionK: first.reserveFractionK,
    autoFillPriceMode: first.autoFillPriceMode,
    runs: runs.length,
    spot11BudgetMean: mean(runs.map((run) => run.spot11BudgetRatio)),
    spot11BudgetMedian: median(runs.map((run) => run.spot11BudgetRatio)),
    belowReserveSaleCount: runs.reduce((sum, run) => sum + run.belowReserveSaleCount, 0),
    stuckTeamCount: runs.reduce((sum, run) => sum + run.stuckTeamCount, 0),
    incompleteTeamCount: runs.reduce((sum, run) => sum + run.incompleteTeamCount, 0),
    illegalFullTeamCount: runs.reduce((sum, run) => sum + run.illegalFullTeamCount, 0),
    rosterStrengthSpreadMean: mean(runs.map((run) => run.rosterStrengthSpread)),
    rosterStrengthSpreadMedian: median(runs.map((run) => run.rosterStrengthSpread)),
    invariantFailureCount: runs.reduce((sum, run) => sum + run.invariantFailureCount, 0),
  };
}

function runRows(): LeverAMeasurementRow[] {
  const rows: LeverAMeasurementRow[] = [];
  for (const preset of ['grounded', 'balanced'] as const) {
    for (const leg of LEGS) {
      const runs: LeverAMeasurementRun[] = [];
      for (const nominationPolicy of NOMINATION_POLICIES) {
        for (const seed of SEEDS) {
          runs.push(runOne(preset, leg, seed, nominationPolicy));
        }
      }
      rows.push(summarize(runs));
    }
  }
  return rows;
}

export function runLeverAReserveMeasurement(): LeverAMeasurementReport {
  const rows = runRows();
  return {
    rows,
    baselineReproduced: JSON.stringify(rows) === JSON.stringify(runRows()),
  };
}
