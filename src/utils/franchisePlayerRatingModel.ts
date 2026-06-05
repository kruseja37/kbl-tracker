import {
  calculatePitcherGrade,
  calculatePositionPlayerGrade,
  calculateTwoWayPlayerGrade,
  type Grade as EngineGrade,
} from '../engines/gradeEngine';
import type { Grade, Player, Position } from './leagueBuilderStorage';

export const FRANCHISE_PITCHING_PRIMARY_POSITIONS: readonly Position[] = [
  'P',
  'SP',
  'RP',
  'CP',
  'SP/RP',
  'TWO-WAY',
];

const FRANCHISE_PITCHING_PRIMARY_POSITION_SET = new Set<string>(
  FRANCHISE_PITCHING_PRIMARY_POSITIONS,
);

function rating(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toStorageGrade(grade: EngineGrade): Grade {
  return grade as Grade;
}

export function isFranchiseTwoWayPosition(position: unknown): boolean {
  return String(position ?? '') === 'TWO-WAY';
}

export function isFranchisePitchingPrimaryPosition(position: unknown): boolean {
  return FRANCHISE_PITCHING_PRIMARY_POSITION_SET.has(String(position ?? ''));
}

export function playerHasFranchisePitchingModel(
  player: Pick<Player, 'primaryPosition'>,
): boolean {
  return isFranchisePitchingPrimaryPosition(player.primaryPosition);
}

export function calculateFranchisePlayerRatingModelGrade(
  player: Pick<
    Player,
    | 'primaryPosition'
    | 'power'
    | 'contact'
    | 'speed'
    | 'fielding'
    | 'arm'
    | 'velocity'
    | 'junk'
    | 'accuracy'
  >,
): Grade {
  const positionRatings = {
    power: rating(player.power),
    contact: rating(player.contact),
    speed: rating(player.speed),
    fielding: rating(player.fielding),
    arm: rating(player.arm),
  };
  const pitcherRatings = {
    velocity: rating(player.velocity),
    junk: rating(player.junk),
    accuracy: rating(player.accuracy),
  };

  if (isFranchiseTwoWayPosition(player.primaryPosition)) {
    return toStorageGrade(calculateTwoWayPlayerGrade(positionRatings, pitcherRatings));
  }

  if (isFranchisePitchingPrimaryPosition(player.primaryPosition)) {
    return toStorageGrade(calculatePitcherGrade(pitcherRatings));
  }

  return toStorageGrade(calculatePositionPlayerGrade(positionRatings));
}
