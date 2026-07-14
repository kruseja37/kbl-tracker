import {
  SNAKE_BOARD_SLOT_IDS,
  type LeagueBuilderMlbDraftSession,
  type SnakeSeatBoardRecord,
} from '../utils/leagueBuilderStorage';
import { withLatestSnakeCorrection } from './snakeCorrection';
import {
  deriveVersionGroupId,
  emptySnakeVersionState,
  retireDraftedVersion,
  type VersionedPlayerIdentity,
} from './snakeVersioning';

export {
  restoreLatestSnakeCorrection,
  withLatestSnakeCorrection,
} from './snakeCorrection';

export interface SeatBoardValidation {
  valid: boolean;
  errors: string[];
}

export function validateSeatBoard(board: SnakeSeatBoardRecord): SeatBoardValidation {
  const keys = Object.keys(board.slots).sort();
  const expected = [...SNAKE_BOARD_SLOT_IDS].sort();
  const playerIds = Object.values(board.slots);
  const errors: string[] = [];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    errors.push('The board must contain the canonical 22 roster slots.');
  }
  if (playerIds.some((playerId) => !playerId)) errors.push('Every board slot needs a player.');
  if (new Set(playerIds).size !== playerIds.length) errors.push('The board must contain 22 unique player IDs.');
  return { valid: errors.length === 0, errors };
}

export function applySnakePickWithCorrection<T extends VersionedPlayerIdentity>(input: {
  session: LeagueBuilderMlbDraftSession;
  player: T;
  settledSalary: number;
  marginalTax: number;
  versionPool: readonly T[];
}): LeagueBuilderMlbDraftSession {
  const slot = input.session.pickOrder[input.session.currentPickIndex];
  if (!slot) throw new Error('The draft has no pick on the clock.');
  if (input.session.completedPicks.some((pick) => pick.playerId === input.player.playerId)) {
    throw new Error('That player has already been drafted.');
  }
  const groupId = deriveVersionGroupId(input.player);
  if (input.session.versionState?.draftedPlayerIdByGroupId[groupId]) {
    throw new Error('Another card of that player has already been drafted.');
  }
  const base = withLatestSnakeCorrection(input.session, 'pick');
  const retired = retireDraftedVersion({
    state: input.session.versionState ?? emptySnakeVersionState(),
    drafted: input.player,
    pool: input.versionPool,
  });
  return {
    ...base,
    completedPicks: [...input.session.completedPicks, {
      ...slot,
      playerId: input.player.playerId,
      settledSalary: input.settledSalary,
      marginalTax: input.marginalTax,
    }],
    currentPickIndex: input.session.currentPickIndex + 1,
    versionState: retired.state,
    openTradeOffers: [],
    revision: (input.session.revision ?? 0) + 1,
  };
}
