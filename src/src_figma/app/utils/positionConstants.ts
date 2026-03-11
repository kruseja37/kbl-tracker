import type { Position } from '../../../types/game';

export type DefensivePosition = Extract<Position, 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF'>;

export const POSITION_MAP: Record<number, DefensivePosition> = {
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

export const POSITION_NUMBER: Record<DefensivePosition, number> = {
  P: 1,
  C: 2,
  '1B': 3,
  '2B': 4,
  '3B': 5,
  SS: 6,
  LF: 7,
  CF: 8,
  RF: 9,
};
