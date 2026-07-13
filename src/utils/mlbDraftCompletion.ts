import type { RegisteredPool } from '../engines/leagueConstruction';
import {
  getAuctionSession,
  getMlbDraftSession,
  type LeagueBuilderAuctionSession,
  type LeagueBuilderMlbDraftSession,
} from './leagueBuilderStorage';
import { readSnakeDraftTruth } from './snakeDraftManifest';

export interface MlbDraftCompletionState {
  auctionSession: LeagueBuilderAuctionSession | null;
  snakeSession: LeagueBuilderMlbDraftSession | null;
  auctionComplete: boolean;
  snakeComplete: boolean;
  complete: boolean;
}

export function isCompletedAuctionMlbDraftSession(
  row: LeagueBuilderAuctionSession | null | undefined,
): boolean {
  return row?.session.state === 'AUCTION_COMPLETE';
}

export function isCompletedSnakeMlbDraftSession(
  session: LeagueBuilderMlbDraftSession | null | undefined,
): boolean {
  if (!session) return false;
  if (session.draftManifest) {
    try {
      readSnakeDraftTruth(session, 'MLB');
      return true;
    } catch {
      return false;
    }
  }
  return session.currentPickIndex >= session.pickOrder.length;
}

export async function readMlbDraftCompletion(
  leagueId: string,
  seasonNumber = 1,
): Promise<MlbDraftCompletionState> {
  // Keep these reads sequential: leagueBuilderStorage caches an opened DB instance,
  // not the in-flight open promise, so two cold opens can leak one connection in tests.
  const auctionSession = await getAuctionSession(leagueId, seasonNumber);
  const snakeSession = await getMlbDraftSession(leagueId, seasonNumber);
  const auctionComplete = isCompletedAuctionMlbDraftSession(auctionSession);
  const snakeComplete = isCompletedSnakeMlbDraftSession(snakeSession);

  return {
    auctionSession,
    snakeSession,
    auctionComplete,
    snakeComplete,
    complete: auctionComplete || snakeComplete,
  };
}

export async function isMlbDraftComplete(leagueId: string, seasonNumber = 1): Promise<boolean> {
  return (await readMlbDraftCompletion(leagueId, seasonNumber)).complete;
}

export function deriveSnakeMlbUnspentByTeamId(input: {
  session: LeagueBuilderMlbDraftSession;
  pool: RegisteredPool;
  salaryCap: number;
}): Map<string, number> {
  if (!isCompletedSnakeMlbDraftSession(input.session)) return new Map();

  const frozenTruth = input.session.draftManifest ? readSnakeDraftTruth(input.session, 'MLB') : null;
  const availablePoolIds = new Set(input.pool.players.map((player) => player.id));
  if (frozenTruth?.manifest && frozenTruth.manifest.pool.playerIds.some((playerId) => !availablePoolIds.has(playerId))) {
    throw new Error('The MLB snake pool no longer matches its frozen manifest.');
  }

  const poolById = new Map(input.pool.players.map((player) => [player.id, player]));
  const frozenSalaryByPlayerId = new Map(
    (frozenTruth?.completedPicks ?? []).map((pick) => [pick.playerId, pick.launchSalary]),
  );
  const spentByTeamId = new Map<string, number>();

  for (const pick of frozenTruth?.completedPicks ?? input.session.completedPicks) {
    const poolPlayer = poolById.get(pick.playerId);
    const settledSalary = frozenTruth
      ? frozenSalaryByPlayerId.get(pick.playerId)
      : Number.isFinite(pick.settledSalary)
      ? pick.settledSalary!
      : poolPlayer?.iv;
    if (!Number.isFinite(settledSalary) || settledSalary! < 0) {
      throw new Error(`Completed snake pick ${pick.pick} player "${pick.playerId}" has no finite IV settlement.`);
    }
    spentByTeamId.set(
      pick.teamId,
      (spentByTeamId.get(pick.teamId) ?? 0) + settledSalary!,
    );
  }

  return new Map(
    [...new Set((frozenTruth?.pickOrder ?? input.session.pickOrder).map((pick) => pick.teamId))].map((teamId) => [
      teamId,
      Math.max(0, input.salaryCap - (spentByTeamId.get(teamId) ?? 0)),
    ]),
  );
}
