import type { ParkDimensions } from '../data/parkLookup';

export type BattedBallCarryDirection =
  | 'Left'
  | 'Left-Center'
  | 'Center'
  | 'Right-Center'
  | 'Right'
  | 'Foul';

export type BattedBallCarrySource = 'computed' | 'user-entered' | 'none';

export interface BattedBallCarryInput {
  ballLocation: { x: number; y: number };
  park: ParkDimensions;
  outcome: string;
  outCode?: string;
  hrDistance?: number | null;
}

export interface BattedBallCarryResult {
  carryFeet: number | null;
  eligible: boolean;
  source: BattedBallCarrySource;
  r: number;
  direction: BattedBallCarryDirection;
  reason: string;
}

const MODEL_CX = 100;
const MODEL_CY = 115;
const NORMALIZED_SCALE_X = 2;
const NORMALIZED_SCALE_Y = 1.2;
const HOME_PLATE_NORMALIZED_X = MODEL_CX / NORMALIZED_SCALE_X;
const HOME_PLATE_NORMALIZED_Y = MODEL_CY / NORMALIZED_SCALE_Y;

export const FENCE_REFERENCE_RADIUS_PX = 110;

const FAN_START_DEG = 228;
const FAN_CENTER_DEG = 270;
const FAN_END_DEG = 312;
const LEFT_HALF_DEG = FAN_CENTER_DEG - FAN_START_DEG;
const RIGHT_HALF_DEG = FAN_END_DEG - FAN_CENTER_DEG;
const INFIELD_OUTFIELD_BOUNDARY_R = 0.45;
const ANGLE_EPSILON_DEG = 1e-9;
const R_EPSILON = 1e-9;

const FAIR_DIRECTIONS: Exclude<BattedBallCarryDirection, 'Foul'>[] = [
  'Left',
  'Left-Center',
  'Center',
  'Right-Center',
  'Right',
];

const AIR_OUT_CODES = new Set(['LO', 'FO']);
const NO_CARRY_OUT_CODES = new Set(['GO', 'PO', 'FLO']);
const OUT_CODES = new Set([...AIR_OUT_CODES, ...NO_CARRY_OUT_CODES]);
const HIT_OUTCOMES = new Set(['1B', '2B', '3B', 'GRD', 'ITPHR']);

function toUiDegrees(ballLocation: { x: number; y: number }): {
  uiDeg: number;
  r: number;
} {
  const dx = (ballLocation.x - HOME_PLATE_NORMALIZED_X) * NORMALIZED_SCALE_X;
  const dy = (ballLocation.y - HOME_PLATE_NORMALIZED_Y) * NORMALIZED_SCALE_Y;
  const radiusPx = Math.hypot(dx, dy);
  const uiDeg = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;

  return {
    uiDeg,
    r: radiusPx / FENCE_REFERENCE_RADIUS_PX,
  };
}

function isFair(uiDeg: number): boolean {
  return uiDeg >= FAN_START_DEG - ANGLE_EPSILON_DEG &&
    uiDeg <= FAN_END_DEG + ANGLE_EPSILON_DEG;
}

function clampFairAngle(uiDeg: number): number {
  return Math.min(FAN_END_DEG, Math.max(FAN_START_DEG, uiDeg));
}

function getFairDirection(uiDeg: number): Exclude<BattedBallCarryDirection, 'Foul'> {
  const normalized = Math.min(
    0.999,
    Math.max(0, (uiDeg - FAN_START_DEG) / (FAN_END_DEG - FAN_START_DEG)),
  );
  const index = Math.min(
    FAIR_DIRECTIONS.length - 1,
    Math.floor(normalized * FAIR_DIRECTIONS.length),
  );

  return FAIR_DIRECTIONS[index];
}

function fenceDistanceAtAngle(park: ParkDimensions, uiDeg: number): number {
  if (uiDeg <= FAN_CENTER_DEG) {
    const t = (uiDeg - FAN_START_DEG) / LEFT_HALF_DEG;
    return park.lf + ((park.cf - park.lf) * t);
  }

  const t = (uiDeg - FAN_CENTER_DEG) / RIGHT_HALF_DEG;
  return park.cf + ((park.rf - park.cf) * t);
}

function noCarryResult(
  r: number,
  direction: BattedBallCarryDirection,
  reason: string,
): BattedBallCarryResult {
  return {
    carryFeet: null,
    eligible: false,
    source: 'none',
    r,
    direction,
    reason,
  };
}

export function computeBattedBallCarry(input: BattedBallCarryInput): BattedBallCarryResult {
  const { uiDeg, r } = toUiDegrees(input.ballLocation);
  const fair = isFair(uiDeg);
  const fairAngle = fair ? clampFairAngle(uiDeg) : uiDeg;
  const direction: BattedBallCarryDirection = fair ? getFairDirection(fairAngle) : 'Foul';
  const outCode = input.outCode ?? (OUT_CODES.has(input.outcome) ? input.outcome : undefined);

  if (input.outcome === 'HR') {
    if (input.hrDistance != null) {
      return {
        carryFeet: input.hrDistance,
        eligible: true,
        source: 'user-entered',
        r,
        direction,
        reason: 'hr-user-entered',
      };
    }

    return noCarryResult(r, direction, 'hr-distance-missing');
  }

  if (!fair) {
    return noCarryResult(r, direction, 'foul');
  }

  if (outCode === 'FLO') {
    return noCarryResult(r, direction, 'foul-out');
  }

  if (outCode === 'GO') {
    return noCarryResult(r, direction, 'ground-ball');
  }

  if (outCode === 'PO') {
    return noCarryResult(r, direction, 'pop-up');
  }

  if (r <= INFIELD_OUTFIELD_BOUNDARY_R + R_EPSILON) {
    return noCarryResult(r, direction, 'infield-landing');
  }

  const isAirOut = outCode != null && AIR_OUT_CODES.has(outCode);
  const isOutWithoutCarry = outCode != null && NO_CARRY_OUT_CODES.has(outCode);
  const isAirHit = outCode == null && HIT_OUTCOMES.has(input.outcome);

  if (!isAirOut && !isAirHit || isOutWithoutCarry) {
    return noCarryResult(r, direction, 'not-air-ball');
  }

  return {
    carryFeet: Math.min(r, 1.0) * fenceDistanceAtAngle(input.park, fairAngle),
    eligible: true,
    source: 'computed',
    r,
    direction,
    reason: 'computed-air-ball',
  };
}
