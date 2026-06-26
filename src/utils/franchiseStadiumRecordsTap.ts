import type { PersistedGameState } from './gameStorage';
import { getRecentGames } from './gameStorage';
import { getFranchiseConfig } from './franchiseManager';
import { buildFranchiseStadiumFoundationReport } from './franchiseStadiumFoundation';
import { upsertFranchiseStadiumRecordsFromFoundationReport } from './franchiseStadiumRecordsStorage';
import { isFranchisePhase2StadiumRecordsEnabled } from './franchisePhase2Flags';
import type { CompletedGameArchiveOptions } from './franchiseCheckpointSweepCompute';
import type { PersistedTrueValueScope } from './processCompletedGame';

export const stadiumRecordsTapSeam = {
  getRecentGames,
  getFranchiseConfig,
  buildFranchiseStadiumFoundationReport,
  upsertFranchiseStadiumRecordsFromFoundationReport,
};

export type PersistDarkStadiumRecordsResult = {
  status: 'dark-noop' | 'written';
  written: number;
  changes: number;
  reason?: string;
};

export async function persistDarkStadiumRecordsForCompletedGame(
  gameState: PersistedGameState,
  scope: PersistedTrueValueScope,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<PersistDarkStadiumRecordsResult> {
  void gameState;
  void archiveOptions;

  if (!isFranchisePhase2StadiumRecordsEnabled()) {
    return {
      status: 'dark-noop',
      written: 0,
      changes: 0,
      reason: 'Phase-2 stadium-records disabled.',
    };
  }

  const completedGames = await stadiumRecordsTapSeam.getRecentGames(1000, {
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
  });
  const config = await stadiumRecordsTapSeam.getFranchiseConfig(scope.franchiseId);
  const stadiumSnapshots = config?.stadiums ?? [];
  const report = stadiumRecordsTapSeam.buildFranchiseStadiumFoundationReport({
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: scope.seasonNumber,
    stadiumSnapshots,
    completedGames,
  });
  const result = await stadiumRecordsTapSeam.upsertFranchiseStadiumRecordsFromFoundationReport(report, {
    completedGames,
  });

  return {
    status: result.persisted ? 'written' : 'dark-noop',
    written: result.records.length,
    changes: result.changes.length,
    reason: result.persisted ? undefined : (result.blockers[0] ?? 'No stadium records to persist.'),
  };
}
