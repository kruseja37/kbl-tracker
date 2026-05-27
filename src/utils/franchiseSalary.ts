import {
  calculateSalary,
  type PlayerForSalary,
  type PlayerPosition as SalaryPosition,
} from '../engines/salaryCalculator';
import type { Player, Position } from './leagueBuilderStorage';

export const FRANCHISE_INITIAL_SALARY_CALCULATION_VERSION = 'franchise-initial-salary-v1-ratings-only';

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

export function withInitialFranchiseSalary<T extends Player>(player: T): T {
  return {
    ...player,
    salary: calculateFranchisePlayerSalary(player),
  };
}
