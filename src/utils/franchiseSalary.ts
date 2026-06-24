import {
  calculateSalary,
  calculateSalaryWithBreakdown,
  calculateExpectedWAR,
  type ExpectedPerformance,
  type PlayerForSalary,
  type PlayerPosition as SalaryPosition,
  type SalaryBreakdown,
  type SeasonStatsForSalary,
} from '../engines/salaryCalculator';
import type { Player, Position } from './leagueBuilderStorage';
import { prospectSalaryForDraftRound } from './prospectSalary';
import {
  deriveAdaptiveStandardsConfig,
  type AdaptiveStandardsConfig,
} from './franchiseAdaptiveStandards';

export const FRANCHISE_INITIAL_SALARY_CALCULATION_VERSION = 'franchise-initial-salary-v1-ratings-and-hidden-prospect-safe';
export const FRANCHISE_CURRENT_SALARY_CALCULATION_VERSION = 'franchise-salary-v1-spec-multifactor-hidden-safe';

const PITCHING_POSITIONS = new Set<Position>(['SP', 'RP', 'CP', 'SP/RP', 'P', 'TWO-WAY']);

const POSITION_MAP: Partial<Record<Position, SalaryPosition>> = {
  C: 'C',
  '1B': '1B',
  '2B': '2B',
  SS: 'SS',
  '3B': '3B',
  LF: 'LF',
  CF: 'CF',
  RF: 'RF',
  DH: 'DH',
  SP: 'SP',
  RP: 'RP',
  CP: 'CP',
  'SP/RP': 'SP/RP',
  'TWO-WAY': 'TWO-WAY',
  IF: 'UTIL',
  OF: 'UTIL',
  'IF/OF': 'UTIL',
  '1B/OF': 'UTIL',
  P: 'SP',
};

function rating(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function finitePositive(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function currentRosterStatus(player: Pick<Player, 'leagueAssignments'>): string | null {
  return player.leagueAssignments?.find((assignment) =>
    assignment.rosterStatus && assignment.rosterStatus !== 'FREE_AGENT',
  )?.rosterStatus ?? null;
}

function prospectProfile(player: Player): Record<string, unknown> {
  const carrier = player as Player & { prospectProfile?: Record<string, unknown> };
  return carrier.prospectProfile ?? {};
}

function safeRoundFromScoutedGrade(grade: unknown): number {
  switch (grade) {
    case 'A':
    case 'A-':
    case 'B+':
      return 1;
    case 'B':
    case 'B-':
      return 2;
    case 'C+':
      return 3;
    default:
      return 4;
  }
}

export function resolveFranchiseSalaryRevealState(
  player: Pick<Player, 'ratingRevealState' | 'leagueAssignments'>,
  rosterStatus: string | null = currentRosterStatus(player),
): 'hidden' | 'revealed' {
  if (player.ratingRevealState === 'revealed') return 'revealed';
  if (player.ratingRevealState === 'hidden') return 'hidden';
  return rosterStatus === 'FARM' ? 'hidden' : 'revealed';
}

export function isHiddenFarmProspectSalaryContext(player: Player): boolean {
  return currentRosterStatus(player) === 'FARM' &&
    resolveFranchiseSalaryRevealState(player, 'FARM') !== 'revealed';
}

export function calculateHiddenFarmProspectSalaryFromPublicContext(player: Player): number | null {
  if (!isHiddenFarmProspectSalaryContext(player)) return null;
  const profile = prospectProfile(player);
  const draftRound = Number(profile.draftRound);
  if (Number.isInteger(draftRound) && draftRound > 0) {
    return prospectSalaryForDraftRound(draftRound);
  }
  return prospectSalaryForDraftRound(safeRoundFromScoutedGrade(profile.scoutedGrade));
}

export function getVisibleSafeFranchisePlayerSalary(player: Player): number | null {
  if (isHiddenFarmProspectSalaryContext(player)) {
    const wonBid = finitePositive(player.settledSalary);
    if (wonBid !== null) return wonBid;
  }
  return calculateHiddenFarmProspectSalaryFromPublicContext(player) ?? finitePositive(player.salary);
}

export function isFranchiseSalaryPitcher(player: Pick<Player, 'primaryPosition'>): boolean {
  return PITCHING_POSITIONS.has(player.primaryPosition);
}

export function isFranchiseSalaryTwoWay(player: Pick<Player, 'primaryPosition'>): boolean {
  return player.primaryPosition === 'TWO-WAY';
}

export function mapFranchiseSalaryPosition(position?: Position): SalaryPosition {
  if (!position) return 'UTIL';
  return POSITION_MAP[position] ?? 'UTIL';
}

function mapFranchiseSalaryPitcherRole(position?: Position): PlayerForSalary['pitcherRole'] {
  if (position === 'RP' || position === 'CP' || position === 'SP/RP') return position;
  return 'SP';
}

export function buildFranchiseSalaryPlayer(player: Player): PlayerForSalary {
  const pitcher = isFranchiseSalaryPitcher(player);

  return {
    id: player.id,
    name: `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() || player.id,
    isPitcher: pitcher,
    isTwoWay: isFranchiseSalaryTwoWay(player),
    primaryPosition: mapFranchiseSalaryPosition(player.primaryPosition),
    secondaryPosition: player.secondaryPosition ? mapFranchiseSalaryPosition(player.secondaryPosition) : undefined,
    pitcherRole: pitcher ? mapFranchiseSalaryPitcherRole(player.primaryPosition) : undefined,
    bats: player.bats,
    armSlot: player.armSlot ?? null,
    ratings: pitcher
      ? {
          velocity: rating(player.velocity),
          junk: rating(player.junk),
          accuracy: rating(player.accuracy),
        }
      : {
          power: rating(player.power),
          contact: rating(player.contact),
          speed: rating(player.speed),
          fielding: rating(player.fielding),
          arm: rating(player.arm),
        },
    battingRatings: pitcher
      ? {
          power: rating(player.power),
          contact: rating(player.contact),
          speed: rating(player.speed),
          fielding: rating(player.fielding),
          arm: rating(player.arm),
        }
      : undefined,
    age: rating(player.age),
    personality: player.personality as PlayerForSalary['personality'],
    // Fame is present in the salary spec, but Franchise v1 reserves it as a
    // neutral field until fame authority is approved.
    fame: 0,
    traits: [player.trait1, player.trait2].filter((trait): trait is string => Boolean(trait)),
    arsenal: player.arsenal,
  };
}

export interface FranchiseSalarySeasonStatInput {
  battingWar?: number | null;
  pitchingWar?: number | null;
  fieldingWar?: number | null;
  baserunningWar?: number | null;
  totalWar?: number | null;
}

export interface FranchiseSalarySeasonContextInput {
  gamesPerSeason?: number | null;
  gamesPerTeam?: number | null;
  inningsPerGame?: number | null;
}

export interface FranchiseCurrentSalaryOptions {
  seasonStats?: FranchiseSalarySeasonStatInput | null;
  seasonContext?: FranchiseSalarySeasonContextInput | null;
  expectedPerformance?: ExpectedPerformance | null;
  isNewTeam?: boolean;
  rookieScaleActive?: boolean;
}

export interface FranchiseCurrentSalaryCalculation {
  calculationVersion: typeof FRANCHISE_CURRENT_SALARY_CALCULATION_VERSION;
  status: 'calculated' | 'hidden-farm-public-context' | 'blocked';
  salary: number | null;
  breakdown: SalaryBreakdown | null;
  expectedPerformance: ExpectedPerformance | null;
  adaptiveStandards: AdaptiveStandardsConfig;
  source: 'multifactor-current-season' | 'hidden-farm-public-context' | 'unavailable';
  limitations: string[];
}

function seasonStatsForSalary(
  stats: FranchiseSalarySeasonStatInput | null | undefined,
): SeasonStatsForSalary | null {
  const total = finiteNumber(stats?.totalWar);
  if (total === null) return null;
  return {
    war: {
      total,
      batting: finiteNumber(stats?.battingWar) ?? undefined,
      pitching: finiteNumber(stats?.pitchingWar) ?? undefined,
      fielding: finiteNumber(stats?.fieldingWar) ?? undefined,
      baserunning: finiteNumber(stats?.baserunningWar) ?? undefined,
    },
    games: 0,
  };
}

export function deriveFranchiseSalaryAdaptiveStandards(
  seasonContext: FranchiseSalarySeasonContextInput | null | undefined,
): AdaptiveStandardsConfig {
  return deriveAdaptiveStandardsConfig({
    gamesPerSeason: seasonContext?.gamesPerSeason ?? seasonContext?.gamesPerTeam ?? null,
    inningsPerGame: seasonContext?.inningsPerGame ?? null,
  });
}

export function calculateFranchiseCurrentSalary(
  player: Player,
  options: FranchiseCurrentSalaryOptions = {},
): FranchiseCurrentSalaryCalculation {
  const hiddenSalary = calculateHiddenFarmProspectSalaryFromPublicContext(player);
  const adaptiveStandards = deriveFranchiseSalaryAdaptiveStandards(options.seasonContext);

  if (hiddenSalary !== null) {
    return {
      calculationVersion: FRANCHISE_CURRENT_SALARY_CALCULATION_VERSION,
      status: 'hidden-farm-public-context',
      salary: hiddenSalary,
      breakdown: null,
      expectedPerformance: null,
      adaptiveStandards,
      source: 'hidden-farm-public-context',
      limitations: [
        'Hidden FARM prospect salary uses draft/scouting-safe public context; true ratings and true grade are not salary inputs.',
        'Fame modifier is reserved and neutral at 1.0 for Franchise v1.',
      ],
    };
  }

  const salaryPlayer = buildFranchiseSalaryPlayer(player);
  const seasonStats = seasonStatsForSalary(options.seasonStats);
  const expectedPerformance = options.expectedPerformance ?? (seasonStats
    ? calculateExpectedWAR(salaryPlayer, adaptiveStandards.gamesPerSeason)
    : null);
  const breakdown = calculateSalaryWithBreakdown(
    salaryPlayer,
    seasonStats ?? undefined,
    expectedPerformance ?? undefined,
    options.isNewTeam ?? false,
    undefined,
    { rookieScaleActive: options.rookieScaleActive === true },
  );

  return {
    calculationVersion: FRANCHISE_CURRENT_SALARY_CALCULATION_VERSION,
    status: 'calculated',
    salary: breakdown.finalSalary,
    breakdown,
    expectedPerformance,
    adaptiveStandards,
    source: 'multifactor-current-season',
    limitations: [
      seasonStats
        ? 'Performance modifier uses scoped current-season WAR-like stat inputs for salary only; this does not promote final True Value or designations.'
        : 'No scoped season WAR-like stats are available; performance modifier remains neutral at 1.0.',
      'Fame modifier is reserved and neutral at 1.0 for Franchise v1.',
    ],
  };
}

export function calculateFranchisePlayerSalary(
  player: Player,
  options: FranchiseCurrentSalaryOptions = {},
): number {
  const current = calculateFranchiseCurrentSalary(player, options);
  return current.salary ?? calculateSalary(buildFranchiseSalaryPlayer(player));
}

export function calculateInitialFranchisePlayerSalary(player: Player): number {
  return calculateHiddenFarmProspectSalaryFromPublicContext(player) ?? calculateFranchisePlayerSalary(player);
}

export function withInitialFranchiseSalary<T extends Player>(player: T): T {
  return {
    ...player,
    salary: calculateInitialFranchisePlayerSalary(player),
    salaryCalculationVersion: FRANCHISE_CURRENT_SALARY_CALCULATION_VERSION,
  };
}
