import {
  calculateSalary,
  type PlayerForSalary,
  type PlayerPosition as SalaryPosition,
} from '../engines/salaryCalculator';
import type { Player, Position } from './leagueBuilderStorage';
import { prospectSalaryForDraftRound } from './prospectSalary';

export const FRANCHISE_INITIAL_SALARY_CALCULATION_VERSION = 'franchise-initial-salary-v1-ratings-and-hidden-prospect-safe';

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

export function buildFranchiseSalaryPlayer(player: Player): PlayerForSalary {
  const pitcher = isFranchiseSalaryPitcher(player);

  return {
    id: player.id,
    name: `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() || player.id,
    isPitcher: pitcher,
    isTwoWay: isFranchiseSalaryTwoWay(player),
    primaryPosition: mapFranchiseSalaryPosition(player.primaryPosition),
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
    fame: rating(player.fame),
    traits: [player.trait1, player.trait2].filter((trait): trait is string => Boolean(trait)),
  };
}

export function calculateFranchisePlayerSalary(player: Player): number {
  return calculateSalary(buildFranchiseSalaryPlayer(player));
}

export function calculateInitialFranchisePlayerSalary(player: Player): number {
  return calculateHiddenFarmProspectSalaryFromPublicContext(player) ?? calculateFranchisePlayerSalary(player);
}

export function withInitialFranchiseSalary<T extends Player>(player: T): T {
  return {
    ...player,
    salary: calculateInitialFranchisePlayerSalary(player),
  };
}
