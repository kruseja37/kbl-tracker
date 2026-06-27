import type { PersistedGameState } from './gameStorage';
import { isFranchisePhase2L12Enabled } from './franchisePhase2Flags';
import { buildFranchiseAllStarCandidates } from './franchiseAwardsEngine';
import {
  computeAllStarSnubRivalryPairs,
  computeFranchiseAllStarRoster,
} from '../engines/franchiseAllStarSelector';
import { isAtOrPastAllStarLockFraction } from './franchiseAllStarLock';
import { runFranchiseAllStarLockPayouts } from './franchiseAllStarLockPayouts';
import { persistAllStarSnubRivalryEdges } from './franchiseRelationshipAllStarSnubCompute';
import {
  getFranchiseAllStarRoster,
  putFranchiseAllStarRoster,
  franchiseAllStarRosterId,
  type FranchiseAllStarRosterRow,
  type FranchiseAllStarSelection,
} from './franchiseAllStarRostersStorage';
import { resolveCheckpointGameNumber, type CompletedGameArchiveOptions } from './franchiseCheckpointSweepCompute';
import { getSeasonMetadata } from './seasonStorage';

export type AllStarRosterScope = {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
};

// Seam for test injection (mirror raceStandingsSeam in franchiseRaceStandingsCompute.ts).
export const allStarRosterSeam = {
  buildCandidates: buildFranchiseAllStarCandidates,
  getRoster: getFranchiseAllStarRoster,
  putRoster: putFranchiseAllStarRoster,
  getSeasonMetadata,
  resolveGameNumber: resolveCheckpointGameNumber,
};

export type PersistAllStarResult = {
  status: 'dark-noop' | 'locked-noop' | 'persisted' | 'persisted-locked';
  reason?: string;
};

export async function persistFranchiseAllStarRosterForCompletedGame(
  gameState: PersistedGameState,
  scope: AllStarRosterScope,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<PersistAllStarResult> {
  if (!isFranchisePhase2L12Enabled()) {
    return { status: 'dark-noop', reason: 'Phase-2 L12 disabled.' };
  }

  const rosterScope = {
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
  };

  const existing = await allStarRosterSeam.getRoster(rosterScope);
  if (existing?.locked) {
    return { status: 'locked-noop' };
  }

  const candidates = await allStarRosterSeam.buildCandidates({
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: scope.seasonNumber,
  });
  const selections: FranchiseAllStarSelection[] = computeFranchiseAllStarRoster({ candidates }).map((selection) => ({
    playerId: selection.playerId,
    teamId: selection.teamId,
    position: selection.position,
    role: selection.role,
    selectionScore: selection.selectionScore,
  }));

  const gameNumber = await allStarRosterSeam.resolveGameNumber(gameState, archiveOptions);
  const totalGames = (await allStarRosterSeam.getSeasonMetadata(scope.seasonId))?.totalGames;
  const shouldLock = gameNumber != null &&
    typeof totalGames === 'number' &&
    isAtOrPastAllStarLockFraction(gameNumber, totalGames);

  const row: FranchiseAllStarRosterRow = {
    ...rosterScope,
    id: franchiseAllStarRosterId(rosterScope),
    seasonNumber: scope.seasonNumber,
    selections,
    locked: shouldLock,
    lockedAtGameNumber: shouldLock ? gameNumber : (existing?.lockedAtGameNumber ?? null),
    createdAt: existing?.createdAt ?? gameState.savedAt,
    updatedAt: gameState.savedAt,
  };
  await allStarRosterSeam.putRoster(row);
  if (shouldLock) {
    try {
      await runFranchiseAllStarLockPayouts({
        selections,
        candidates,
        scope: {
          franchiseId: scope.franchiseId,
          seasonId: scope.seasonId,
          statsScopeId: scope.statsScopeId,
          seasonNumber: scope.seasonNumber,
        },
        timestamp: gameState.savedAt,
      });
    } catch (e) {
      console.warn('[L12] All-Star lock payouts skipped for completed game ' + gameState.gameId + ':', e);
    }
    try {
      const snubPairs = computeAllStarSnubRivalryPairs(
        candidates,
        selections.map((selection) => ({
          playerId: selection.playerId,
          position: selection.position,
          role: selection.role,
          selectionScore: selection.selectionScore ?? 0,
        })),
      );
      await persistAllStarSnubRivalryEdges({
        gameState,
        pairs: snubPairs,
        scope: {
          ...rosterScope,
          franchiseId: scope.franchiseId,
          seasonNumber: scope.seasonNumber,
        },
        lockGameNumber: gameNumber!,
        timestamp: gameState.savedAt,
      });
    } catch (e) {
      console.warn('[L13] All-Star snub rivalry edges skipped for completed game ' + gameState.gameId + ':', e);
    }
  }

  return { status: shouldLock ? 'persisted-locked' : 'persisted' };
}
