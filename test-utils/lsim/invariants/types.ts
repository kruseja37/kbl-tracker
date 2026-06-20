import type { CompletedGameRecord } from '../../../src/utils/gameStorage';
import type {
  PlayerSeasonBatting,
  PlayerSeasonFielding,
  PlayerSeasonPitching,
  SeasonMetadata,
  TeamStanding,
} from '../../../src/utils/seasonStorage';
import type { Player, Team } from '../../../src/utils/leagueBuilderStorage';
import type { FranchiseFameRecordRow } from '../../../src/utils/franchiseFameRecordsStorage';
import type { FranchiseTrueValueRow } from '../../../src/utils/franchiseTrueValueStorage';
import type { FranchiseTrueValueSnapshotRow } from '../../../src/utils/franchiseTrueValueSnapshotsStorage';
import type { FranchisePlayerDesignationRecord } from '../../../src/utils/franchiseDesignations';
import type { FranchiseRatingsOverlayRow } from '../../../src/utils/franchiseRatingsOverlayStorage';
import type { FranchiseTraitOverlayRow } from '../../../src/utils/franchiseTraitOverlayStorage';
import type { FranchiseL10OverlayRow } from '../../../src/utils/franchiseL10OverlayStorage';
import type { FranchiseFlashpointDecayRow } from '../../../src/utils/franchiseFlashpointDecayStorage';
import type { FranchiseAllStarRosterRow } from '../../../src/utils/franchiseAllStarRostersStorage';
import type { FranchiseAwardRow } from '../../../src/utils/franchiseAwardsStorage';
import type { FranchiseMoraleSnapshot } from '../../../src/utils/franchiseMoraleState';
import type { FranchiseTrustedValueArtifact } from '../../../src/utils/franchiseTrustedValueStorage';
import type { SeasonNewsItem } from '../../../src/types/reporter';

export type LsimInvariantTag = 'CRITICAL' | 'INVESTIGATE';
export type LsimFindingClassification = 'mechanical/wiring (auto-fixable)' | 'HALT - JK FIX DECISION';

export interface LsimInvariantResult {
  name: string;
  tag: LsimInvariantTag;
  pass: boolean;
  detail: string;
}

export type LsimInvariantCheck = (snapshot: LsimStateSnapshot) => LsimInvariantResult;

export interface LsimStoreDump {
  databases: Record<string, Record<string, unknown[]>>;
  digest: string;
  rowCounts: Record<string, number>;
}

export interface LsimLastGameDelta {
  battingIncreasedPlayerIds: string[];
  pitchingIncreasedPlayerIds: string[];
  afterFirstProcessDigest: string;
  afterReplayDigest?: string;
}

export interface LsimRunFinding {
  gameNumber: number;
  name: string;
  tag: LsimInvariantTag;
  detail: string;
  classification: LsimFindingClassification;
}

export interface LsimDeferredInvariant {
  name: string;
  section: string;
  reason: string;
}

export interface LsimPersistenceProof {
  backupRoundTripByteIdentical: boolean | null;
  migrationSurvivalChecked: boolean;
  detail: string;
}

export interface LsimL12Proof {
  status: string;
  candidateCount: number;
  categories: string[];
  hasNonFiniteScore: boolean;
  detail: string;
}

export interface LsimStateSnapshot {
  gameNumber: number;
  gamesSimulated: number;
  totalScheduledGames: number;
  gamesPerTeam: number;
  checkpointGameNumbers: number[];
  teamIds: string[];
  teams: Team[];
  players: Player[];
  seasonMetadata: SeasonMetadata | null;
  completedGames: CompletedGameRecord[];
  standings: TeamStanding[];
  battingRows: PlayerSeasonBatting[];
  pitchingRows: PlayerSeasonPitching[];
  fieldingRows: PlayerSeasonFielding[];
  fameRows: FranchiseFameRecordRow[];
  trueValueRows: FranchiseTrueValueRow[];
  trueValueSnapshots: FranchiseTrueValueSnapshotRow[];
  designationRows: FranchisePlayerDesignationRecord[];
  ratingsOverlays: FranchiseRatingsOverlayRow[];
  traitOverlays: FranchiseTraitOverlayRow[];
  l10Overlays: FranchiseL10OverlayRow[];
  flashpointRows: FranchiseFlashpointDecayRow[];
  allStarRosters: FranchiseAllStarRosterRow[];
  awardRows: FranchiseAwardRow[];
  moraleSnapshots: FranchiseMoraleSnapshot[];
  seasonNewsItems: SeasonNewsItem[];
  trustedValueArtifact: FranchiseTrustedValueArtifact | null;
  storeDump: LsimStoreDump;
  l12Proof: LsimL12Proof | null;
  persistenceProof: LsimPersistenceProof | null;
  previous?: LsimStateSnapshot;
  lastGameDelta?: LsimLastGameDelta;
}

export function invariantResult(
  name: string,
  tag: LsimInvariantTag,
  pass: boolean,
  detail: string,
): LsimInvariantResult {
  return { name, tag, pass, detail };
}
