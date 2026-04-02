import type { Position } from '../../../types/game';

export type DefensiveAlignmentByPosition = Partial<
  Record<Position, { playerId: string; playerName: string }>
>;

export const FIELDING_POSITION_NUMBER_TO_CODE: Record<number, Position> = {
  1: 'P',
  2: 'C',
  3: '1B',
  4: '2B',
  5: '3B',
  6: 'SS',
  7: 'LF',
  8: 'CF',
  9: 'RF',
};

export function resolveChargedPositionCode(
  chargedPosition: number | null | undefined,
): Position | null {
  if (
    typeof chargedPosition !== 'number' ||
    !(chargedPosition in FIELDING_POSITION_NUMBER_TO_CODE)
  ) {
    return null;
  }

  return FIELDING_POSITION_NUMBER_TO_CODE[chargedPosition];
}

export function resolveChargedPlayerIdFromDefensiveAlignment(
  chargedPosition: number | null | undefined,
  defendersByPosition?: DefensiveAlignmentByPosition,
): string | null {
  const positionCode = resolveChargedPositionCode(chargedPosition);
  return positionCode ? defendersByPosition?.[positionCode]?.playerId ?? null : null;
}

export function buildFieldingErrorAdjustments(
  previousChargedPlayerId: string | null,
  nextChargedPlayerId: string | null,
): Array<{ playerId: string; delta: number }> {
  const adjustments: Array<{ playerId: string; delta: number }> = [];

  if (
    previousChargedPlayerId &&
    previousChargedPlayerId !== nextChargedPlayerId
  ) {
    adjustments.push({ playerId: previousChargedPlayerId, delta: -1 });
  }

  if (
    nextChargedPlayerId &&
    nextChargedPlayerId !== previousChargedPlayerId
  ) {
    adjustments.push({ playerId: nextChargedPlayerId, delta: 1 });
  }

  return adjustments;
}
