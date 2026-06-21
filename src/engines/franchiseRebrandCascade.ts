import {
  FAME_TUNING,
  applyTradeReset,
  type FameModelRecord,
} from './fameModel';
import { REBRAND_RESET_MORALE } from '../utils/franchiseRebrandDwell';

export { REBRAND_RESET_MORALE };

export const REBRAND_BADGE_TYPES = [
  'TEAM_MVP',
  'ACE',
  'ALBATROSS',
  'FAN_FAVORITE',
] as const;

export type RebrandBadgeType = typeof REBRAND_BADGE_TYPES[number];

export interface RebrandRelocationMarkerInput {
  formerTeamName: string;
  formerStadiumName: string;
  relocatedAtSeason: number;
  relocatedAtGame: number;
}

export type RebrandRelocationMarker = RebrandRelocationMarkerInput;

const REBRAND_BADGE_TYPE_SET = new Set<string>(REBRAND_BADGE_TYPES);

export function applyRebrandFameReset<T extends FameModelRecord>(
  fameRow: T,
  tuning: Parameters<typeof applyTradeReset>[1] = FAME_TUNING,
): T {
  const reset = applyTradeReset(fameRow, tuning);

  return {
    ...fameRow,
    ...reset,
  };
}

export function selectRebrandDesignationRowsToClear<T extends { type: string }>(
  teamDesignationRows: readonly T[],
): T[] {
  return teamDesignationRows.filter((row) => REBRAND_BADGE_TYPE_SET.has(row.type));
}

export function buildRelocationMarker(
  input: RebrandRelocationMarkerInput,
): RebrandRelocationMarker {
  return {
    formerTeamName: input.formerTeamName,
    formerStadiumName: input.formerStadiumName,
    relocatedAtSeason: input.relocatedAtSeason,
    relocatedAtGame: input.relocatedAtGame,
  };
}
