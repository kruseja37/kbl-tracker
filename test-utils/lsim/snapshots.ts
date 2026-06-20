import { getRecentGames } from '../../src/utils/gameStorage';
import { getAllFranchisePlayers, getAllFranchiseTeams } from '../../src/utils/franchisePlayerStorage';
import {
  calculateStandings,
  getAllBattingStats,
  getAllFieldingStats,
  getAllPitchingStats,
  getSeasonMetadata,
} from '../../src/utils/seasonStorage';
import { getFranchiseAwardRowsByScope } from '../../src/utils/franchiseAwardsStorage';
import { getFranchiseAllStarRostersByScope } from '../../src/utils/franchiseAllStarRostersStorage';
import { isCheckpointBoundary } from '../../src/utils/franchiseCheckpointSweepCompute';
import { getFranchiseDesignationRows } from '../../src/utils/franchiseDesignationStorage';
import { getFranchiseFameRecordRowsByScope } from '../../src/utils/franchiseFameRecordsStorage';
import { getFranchiseFlashpointDecayRowsByScope } from '../../src/utils/franchiseFlashpointDecayStorage';
import { getFranchiseL10OverlaysByScope } from '../../src/utils/franchiseL10OverlayStorage';
import { listFranchiseMoraleSnapshots } from '../../src/utils/franchiseMoraleState';
import { getFranchiseRatingsOverlaysByScope } from '../../src/utils/franchiseRatingsOverlayStorage';
import { getFranchiseTraitOverlaysByScope } from '../../src/utils/franchiseTraitOverlayStorage';
import { getTrustedValueArtifact } from '../../src/utils/franchiseTrustedValueStorage';
import { getFranchiseTrueValueRows } from '../../src/utils/franchiseTrueValueStorage';
import { getFranchiseTrueValueSnapshotRowsByScope } from '../../src/utils/franchiseTrueValueSnapshotsStorage';
import { listSeasonNewsItemsForFranchiseSeason } from '../../src/utils/seasonNewsStorage';
import type {
  LsimL12Proof,
  LsimLastGameDelta,
  LsimPersistenceProof,
  LsimStateSnapshot,
} from './invariants/types';
import type { LsimSandboxContext } from './sandbox';
import { dumpLsimStores } from './storeDump';

export interface ReadLsimSnapshotOptions {
  gameNumber: number;
  gamesSimulated: number;
  previous?: LsimStateSnapshot;
  lastGameDelta?: LsimLastGameDelta;
  l12Proof?: LsimL12Proof | null;
  persistenceProof?: LsimPersistenceProof | null;
}

export function checkpointGameNumbers(totalGames: number): number[] {
  return Array.from({ length: totalGames }, (_, index) => index + 1)
    .filter((gameNumber) => isCheckpointBoundary(gameNumber, totalGames));
}

export async function readLsimStateSnapshot(
  context: LsimSandboxContext,
  options: ReadLsimSnapshotOptions,
): Promise<LsimStateSnapshot> {
  const scope = context.scope;
  const [
    seasonMetadata,
    completedGames,
    standings,
    battingRows,
    pitchingRows,
    fieldingRows,
    fameRows,
    trueValueRows,
    trueValueSnapshots,
    designationRows,
    ratingsOverlays,
    traitOverlays,
    l10Overlays,
    flashpointRows,
    allStarRosters,
    awardRows,
    moraleSnapshots,
    seasonNewsItems,
    trustedValueArtifact,
    players,
    teams,
    storeDump,
  ] = await Promise.all([
    getSeasonMetadata(scope.statsScopeId),
    getRecentGames(1000, {
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
      franchiseId: scope.franchiseId,
      competitionType: 'franchise',
      competitionId: scope.franchiseId,
    }),
    calculateStandings(scope.seasonId),
    getAllBattingStats(scope.statsScopeId),
    getAllPitchingStats(scope.statsScopeId),
    getAllFieldingStats(scope.statsScopeId),
    getFranchiseFameRecordRowsByScope(scope),
    getFranchiseTrueValueRows(scope),
    getFranchiseTrueValueSnapshotRowsByScope(scope),
    getFranchiseDesignationRows(scope),
    getFranchiseRatingsOverlaysByScope(scope),
    getFranchiseTraitOverlaysByScope(scope),
    getFranchiseL10OverlaysByScope(scope),
    getFranchiseFlashpointDecayRowsByScope(scope),
    getFranchiseAllStarRostersByScope(scope),
    getFranchiseAwardRowsByScope(scope),
    listFranchiseMoraleSnapshots(
      scope.franchiseId,
      scope.seasonId,
      scope.statsScopeId,
      context.ids.seasonNumber,
    ),
    listSeasonNewsItemsForFranchiseSeason(scope.franchiseId, scope.seasonId),
    getTrustedValueArtifact(scope.franchiseId, scope.seasonId, scope.statsScopeId),
    getAllFranchisePlayers(scope.franchiseId),
    getAllFranchiseTeams(scope.franchiseId),
    dumpLsimStores(),
  ]);

  return {
    gameNumber: options.gameNumber,
    gamesSimulated: options.gamesSimulated,
    totalScheduledGames: context.totalScheduledGames,
    gamesPerTeam: context.ids.gamesPerTeam,
    checkpointGameNumbers: checkpointGameNumbers(context.totalScheduledGames),
    teamIds: context.teams.map((team) => team.id).sort(),
    teams,
    players,
    seasonMetadata,
    completedGames: completedGames.sort((left, right) => left.date - right.date || left.gameId.localeCompare(right.gameId)),
    standings,
    battingRows,
    pitchingRows,
    fieldingRows,
    fameRows,
    trueValueRows,
    trueValueSnapshots,
    designationRows,
    ratingsOverlays,
    traitOverlays,
    l10Overlays,
    flashpointRows,
    allStarRosters,
    awardRows,
    moraleSnapshots,
    seasonNewsItems,
    trustedValueArtifact,
    storeDump,
    l12Proof: options.l12Proof ?? null,
    persistenceProof: options.persistenceProof ?? null,
    previous: options.previous,
    lastGameDelta: options.lastGameDelta,
  };
}
