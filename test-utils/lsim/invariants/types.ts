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
import type { CheckpointCadence } from '../../../src/data/rosterEngineConstants';
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
  /** A REAL version-bump leg: a franchise written at an early trackerDb version survives the upgrade to current. */
  migrationSurvivalAcrossVersionBump: boolean;
  detail: string;
}

export interface LsimL12Proof {
  status: string;
  candidateCount: number;
  categories: string[];
  hasNonFiniteScore: boolean;
  /** rank order == weighted-composite desc, rank = index + 1, across every category. */
  rankingMatchesComposite: boolean;
  /** Categories ABSENT from standings whose eligibility POOL is non-empty (eligible candidates dropped = corruption). */
  missingCategoriesWithNonEmptyPool: string[];
  detail: string;
}

/**
 * §5.3 season-finalize proof — recorded by the runner after it invokes the GENUINE production finalize chain
 * (freezeTrustedValueArtifactForSeason -> computeAndPersistFranchiseWarAwards -> emitFranchiseSeasonEndHonors).
 * The TV-freeze idempotency + anti-thaw assertions REQUIRE an active runtime re-test (re-freeze / refused unfreeze),
 * so they cannot be read from a static snapshot — they live here (mirrors the persistenceProof / l12Proof pattern).
 */
export interface LsimFinalizeProof {
  /** the production finalize chain actually ran this leg (season-end only) */
  ran: boolean;
  /** the genuine production functions invoked, with file:line — guards against a hallucinated finalize reimplementation */
  invoked: string[];
  /** a D6a trusted-value artifact existed to freeze (else freeze returns null and the whole chain is inert) */
  artifactPresent: boolean;
  /** a SECOND freeze returned the identical frozenAt — the post-freeze recompute is a no-op (§5.3 idempotency) */
  reFreezeIdempotent: boolean;
  /** a frozen->unfrozen overwrite was REFUSED by persistTrustedValueArtifact's guard; the artifact stayed frozen (§5.3 anti-thaw) */
  antiThawHeld: boolean;
  /** emitFranchiseSeasonEndHonors().status ('processed' | 'dark-noop') */
  emissionStatus: string;
  /** the honorKinds that emitted an AWARD_RESULT nod (empty offline — the nod is reporter+LLM-gated) */
  emittedHonors: string[];
  /** finalized award rows the awards engine persisted */
  awardsFinalizedCount: number;
  /** finalized award rows that named a winner */
  awardsWithWinnerCount: number;
  detail: string;
}

export interface LsimStateSnapshot {
  gameNumber: number;
  gamesSimulated: number;
  totalScheduledGames: number;
  gamesPerTeam: number;
  checkpointCadence: CheckpointCadence;
  checkpointCount: number;
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
  finalizeProof: LsimFinalizeProof | null;
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
