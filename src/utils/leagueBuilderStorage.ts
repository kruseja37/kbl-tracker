/**
 * League Builder Storage Utility
 * Per LEAGUE_BUILDER_SPEC.md LB-005
 *
 * Provides IndexedDB storage for:
 * - leagueTemplates: League configuration templates
 * - globalTeams: Team definitions
 * - globalPlayers: Player database
 * - leaguePlayerOverrides: Per-league player attribute overrides
 * - rulesPresets: Game rules configurations
 * - teamRosters: Roster assignments and lineups
 */

import { generateHometown } from '../data/usCities';
import { TIER_CAPS } from '../data/tierParams';
import {
  BALANCE_MODE_DEFAULT,
  CHECKPOINT_CADENCE_DEFAULT,
  normalizeCheckpointCadence,
  type CheckpointCadence,
} from '../data/rosterEngineConstants';
import { CHEMISTRY_CODE_TO_WORD, normalizeToChemistryCode } from '../data/chemistryCanonical';
import { normalizePersonality, type CanonicalPersonality } from '../engines/masterMoraleMatrix';
import type { BalanceMode, RegisteredPool, TeamCapIdentity } from '../engines/leagueConstruction';
import type { CpuShillAuctionSession } from '../engines/cpuShillBidding';
import type { DesignSlot } from '../engines/rosterDesignFeasibility';
import type { TaxonomyPosition } from '../data/playerArchetypeTaxonomy';
import type { TierKey } from '../data/tierParams';
import type { OptimalLineupSnapshot } from '../types/managerWpa';
import type { ParkFactors } from '../types/war';
import type { ParkDimensions } from '../data/parkLookup';
import type { EraFlavor, FameTier, PlayerArchetype } from '../types/reporter';
import type { RebrandRelocationMarker } from '../engines/franchiseRebrandCascade';
import { trackFieldChanges, type EditHistoryEntry } from './editHistoryTracker';
import type { FarmAuctionPool } from './farmAuctionPool';
import type { HiddenPersonalityModifiers } from './prospectScoutingDraftEngine';
import {
  markOptimalLineupSnapshotsStaleForChange,
  OPTIMAL_LINEUP_SNAPSHOT_FIELDS,
} from './optimalLineup';
import { syncEngine } from './syncEngine';
import {
  buildSnakeDraftResetReceipt,
  buildSnakeRosterHandoff,
  preservePersistedSnakeDraftManifest,
  preservePersistedSnakeRosterHandoff,
  readSnakeDraftTruth,
  validateSnakeRosterHandoff,
  type SnakeDraftResetReceipt,
} from './snakeDraftManifest';

export type { EditHistoryEntry } from './editHistoryTracker';
export type { EraFlavor, FameTier, PlayerArchetype } from '../types/reporter';
export { FAME_TIER_LABEL } from '../types/reporter';

const DB_NAME = 'kbl-league-builder';
const DB_VERSION = 9;

const STORES = {
  LEAGUE_TEMPLATES: 'leagueTemplates',
  GLOBAL_TEAMS: 'globalTeams',
  GLOBAL_PLAYERS: 'globalPlayers',
  LEAGUE_PLAYER_OVERRIDES: 'leaguePlayerOverrides',
  RULES_PRESETS: 'rulesPresets',
  TEAM_ROSTERS: 'teamRosters',
  SCOUT_PROFILES: 'scoutProfiles',
  STARTUP_DRAFT_SESSIONS: 'startupDraftSessions',
  REGISTERED_POOLS: 'registeredPools',
  MLB_DRAFT_SESSIONS: 'mlbDraftSessions',
  SNAKE_SEAT_BOARDS: 'snakeSeatBoards',
  AUCTION_SESSIONS: 'auctionSessions',
} as const;

// ============================================
// TYPES
// ============================================

// Position types
export type Position = 'C' | '1B' | '2B' | 'SS' | '3B' | 'LF' | 'CF' | 'RF' | 'DH' |
  'SP' | 'RP' | 'CP' | 'SP/RP' | 'TWO-WAY' | 'P' | 'IF' | 'OF' | 'IF/OF' | '1B/OF';

export type Grade = 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-';

export type PitchType = '4F' | '2F' | 'CB' | 'SL' | 'CH' | 'FK' | 'CF' | 'SB' | 'SC' | 'KN';

// Canonical 7 personalities (salaryCalculator.ts + masterMoraleMatrix.ts CANONICAL_PERSONALITIES).
// NOTE: this used to also include the 4 chemistry words (Crafty/Disciplined/Scholarly/Spirited) —
// those leaked in from the Chemistry list by mistake. See normalizeStoredPersonality() below for
// safely reconciling any already-persisted players who picked one of those bad values.
export type Personality = 'Competitive' | 'Tough' | 'Relaxed' | 'Egotistical' |
  'Jolly' | 'Timid' | 'Droopy';

const CANONICAL_PERSONALITY_TO_TITLE_CASE: Record<CanonicalPersonality, Personality> = {
  COMPETITIVE: 'Competitive',
  TOUGH: 'Tough',
  RELAXED: 'Relaxed',
  EGOTISTICAL: 'Egotistical',
  JOLLY: 'Jolly',
  TIMID: 'Timid',
  DROOPY: 'Droopy',
};

/**
 * Reconciles a possibly-stale/legacy personality value (e.g. a chemistry word like "Scholarly"
 * picked from an old bad dropdown) into one of the canonical 7. Reuses masterMoraleMatrix's
 * LEGACY_PERSONALITY_RECONCILIATION table so there is one source of truth for the mapping;
 * anything unmapped falls back to "Relaxed", matching that engine's own fallback.
 */
export function normalizeStoredPersonality(value: unknown): Personality {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'Relaxed';
  }
  return CANONICAL_PERSONALITY_TO_TITLE_CASE[normalizePersonality(value)];
}

export type Chemistry = 'Competitive' | 'Spirited' | 'Crafty' | 'Scholarly' | 'Disciplined';

export type MojoState = 'On Fire' | 'Hot' | 'Normal' | 'Cold' | 'Ice Cold';

export type RosterStatus = 'MLB' | 'FARM' | 'FREE_AGENT';

// League Template
export interface Conference {
  id: string;
  name: string;
  abbreviation: string;
  divisionIds: string[];
}

export interface Division {
  id: string;
  name: string;
  conferenceId: string;
  teamIds: string[];
}

export type DraftPoolMode = 'pool-first' | 'design-first';

export interface DraftSetupSeat {
  id: string;
  name: string;
}

export interface LeagueTemplate {
  id: string;
  name: string;
  description?: string;
  createdDate: string;
  lastModified: string;
  teamIds: string[];
  conferences: Conference[];
  divisions: Division[];
  defaultRulesPreset: string;
  draftFormat?: 'auction' | 'snake';
  draftPoolMode?: DraftPoolMode;
  draftSeats?: DraftSetupSeat[];
  draftShillCount?: number;
  poolExtractedAt?: string;
  poolExtractedBasis?: {
    cap: number;
    poolSizeMultiplier: number;
    shills?: number;
    identityByTeamId: Record<string, string | null>;
    /** Sorted sourceLeagueIds at extraction time (DRAFT_POOL_UNIVERSE_SPEC_2026-07-08 §8) — feeds
     * poolBasisStaleLines so a source-league change is flagged the same way a cap/dial/shill/
     * identity change already is. Absent = extracted from the unfiltered universe (a pre-feature
     * record or an untouched post-feature default — the two are equivalent, so legacy records
     * never retro-nag). */
    sourceLeagueIds?: string[];
    /** CONTRACT_STALEPARITY_2026-07-09: the numeric quality-curve dial and the pool-first-only
     * balance-shape dial at basis-capture time — a basis input like cap/dial/shills/identity, so a
     * live move must trip the same staleness signal. Both optional and undefined-guarded on
     * comparison so a pre-feature record never retro-nags. */
    poolQualityCenter?: number;
    poolBalancePreset?: string;
  };
  modeAExtractedIds?: string[];
  modeAHandAdds?: string[];
  modeAHandRemoves?: string[];
  /** Full reversible card set captured before snake version trimming at lock. */
  snakeVersionSourcePlayerIds?: string[];
  /** Draft-available player universe (DRAFT_POOL_UNIVERSE_SPEC_2026-07-08): which leagues' player
   * pools feed this league's draft extraction. Absent field = UNFILTERED — all leagues checked, the
   * universe filter skipped entirely, byte-identical to pre-feature behavior (see
   * resolveSourceLeagueIds in leagueBuilderPoolBuilder.ts; captain correction 2026-07-08
   * post-audit — an earlier own-league-only default was a contract framing error, not a JK
   * ruling). The field becomes an explicit array on the first user toggle and is filtered from
   * then on. An explicit empty array is a real, distinct state (the user unchecked every league,
   * including their own — resolves to unclaimed free agents only) and must NOT be treated as
   * "absent" / defaulted back. */
  sourceLeagueIds?: string[];
  tier?: TierKey;
  salaryCap?: number;
  poolSizeMultiplier?: number;
  balanceMode?: BalanceMode;
  checkpointCadence?: CheckpointCadence;
  logoUrl?: string;
  color?: string;
}

export function resolveLeagueSalaryCap(league: Pick<LeagueTemplate, 'salaryCap' | 'tier'> | null | undefined): number {
  return league?.salaryCap ?? TIER_CAPS[league?.tier ?? 'juiced'].tierCap;
}

export function getLeagueDraftFormat(template: Pick<LeagueTemplate, 'draftFormat'> | null | undefined): 'auction' | 'snake' {
  return template?.draftFormat ?? 'auction';
}

// Team
export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  location: string;
  nickname: string;
  colors: {
    primary: string;
    secondary: string;
    accent?: string;
  };
  logoUrl?: string;
  stadium: string;
  stadiumId?: string;
  stadiumDimensions?: ParkDimensions;
  parkFactors?: ParkFactors;
  controlledBy?: 'human' | 'ai';
  stadiumCapacity?: number;
  leagueIds: string[];
  foundedYear?: number;
  championships?: number;
  retiredNumbers?: number[];
  managerId?: string;
  managerName?: string;
  backstory?: string;
  era?: EraFlavor;
  cityVibe?: string;
  ballparkNickname?: string;
  heritageFacts?: string[];
  rivalries?: TeamRivalry[];
  capIdentity?: TeamCapIdentity;
  farmCapIdentity?: TeamCapIdentity;
  mlbArchetypeKey?: string;   // HistoricalArchetype.id; provenance for the MLB capIdentity
  farmArchetypeKey?: string;  // HistoricalArchetype.id; provenance for the farm capIdentity
  gmSeatId?: string;
  gmSeatName?: string;
  rosterDesign?: {
    slots: DesignSlot[];
    lockedAt?: string;
    pins?: Record<string, string>;
    rankOverrides?: Record<string, string[]>;
  };
  /**
   * COCKPIT WAVE 2 (ASST_GM_DRAFT_INTELLIGENCE_SPEC_2026-07-04.md Correction 5/7): the GM's own
   * explicit big-board + per-position order, distinct from and orthogonal to
   * `rosterDesign.rankOverrides` above (which feeds `buildBest22Target`'s per-SLOT preference
   * bonus). This field feeds `assembleBoard`'s live Tier-3 board rank blend (auction-picking
   * priority — "who do I chase next"), both at setup (RANK YOUR BOARD) and live in the whisper.
   * Absent = pure engine order (no write until the GM reorders something) — no DB version bump,
   * same as any other new optional field on an already-stored record.
   */
  boardRankOverrides?: {
    global?: string[];
    byPosition?: Partial<Record<TaxonomyPosition, string[]>>;
  };
  captainPlayerId?: string | null;
  fanHopefulPlayerId?: string | null;
  teamHistory?: RebrandRelocationMarker[];
  lineupWithDH?: LineupSlot[];
  lineupWithoutDH?: LineupSlot[];
  startingRotation?: string[];
  optimalLineupVsRHPWithDH?: OptimalLineupSnapshot;
  optimalLineupVsLHPWithDH?: OptimalLineupSnapshot;
  optimalLineupVsRHPWithoutDH?: OptimalLineupSnapshot;
  optimalLineupVsLHPWithoutDH?: OptimalLineupSnapshot;
  createdDate: string;
  lastModified: string;
}

export interface TeamRivalry {
  opponentTeamId: string;
  intensity: number;
  origin?: string;
}

export interface LeagueAssignment {
  leagueId: string;
  teamId: string;
  rosterStatus: RosterStatus;
}

export interface PlayerProspectProfile {
  methodVersion?: string;
  source?: string;
  draftYear?: number;
  draftRound?: number;
  draftPick?: number;
  teamId?: string;
  trueGrade?: unknown;
  scoutedGrade?: unknown;
  potentialGrade?: unknown;
  scoutId?: string;
  scoutName?: string;
  scoutAccuracy?: number;
  scoutConfidence?: unknown;
  scoutGradeError?: number;
  scoutSpecialtiesVisible?: string[];
  scoutWeaknessesVisible?: string[];
  archetypeFamily?: string;
}

export interface LeagueBuilderScoutProfile {
  id: string;
  leagueId: string;
  teamId?: string;
  name: string;
  specialties: string[];
  weaknesses: string[];
  accuracyByPosition: Record<string, number>;
  seed: string;
  hiredPick?: {
    round: number;
    pickNumber: number;
    teamId: string;
  };
  createdDate: string;
  lastModified: string;
}

export interface LeagueBuilderStartupDraftSession {
  id: string;
  leagueId: string;
  seasonNumber: number;
  seed: string;
  workflowVersion: string;
  engineMethodVersion: string;
  scoutOrder: string[];
  scoutPool: LeagueBuilderScoutProfile[];
  hiredScoutIdsByTeamId: Record<string, string[]>;
  prospectPickOrder: Array<{
    round: number;
    pickNumber: number;
    teamId: string;
    teamName?: string;
    farmArchetypeKey?: string;
  }>;
  prospectPool: unknown[];
  completedPicks: unknown[];
  currentPickIndex: number;
  createdDate: string;
  lastModified: string;
}

export const SNAKE_BOARD_SLOT_IDS = [
  'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'BACKUP_C',
  'SP1', 'SP2', 'SP3', 'SP4', 'RP1', 'RP2', 'RP3', 'CP',
  'FLEX1', 'FLEX2', 'FLEX3', 'FLEX4', 'SWING',
] as const;

export type SnakeBoardSlotId = (typeof SNAKE_BOARD_SLOT_IDS)[number];

export interface SnakeSeatBoardRecord {
  /** Exactly one unique player id per canonical 22-man board slot. */
  slots: Record<SnakeBoardSlotId, string>;
  /** The GM's own order. A hand-touched id remains frozen in this record forever. */
  rankings: {
    global?: string[];
    byPosition?: Partial<Record<TaxonomyPosition, string[]>>;
    frozenPlayerIds?: string[];
  };
  /** Last-write-wins revision scoped to this seat record. */
  revision: number;
}

/** FARM-only private ordering. Ids only: scout/true evaluation never persists here. */
export interface FarmSeatBoardRecord {
  overall: string[];
  byPosition: Record<string, string[]>;
  frozenProspectIds: string[];
  plannedProspectIds: string[];
  revision: number;
}

export interface SnakeSeatBoardStoreRecord {
  id: string;
  sessionId: string;
  leagueId: string;
  seasonNumber: number;
  teamId: string;
  phase: 'MLB' | 'FARM';
  board: SnakeSeatBoardRecord | FarmSeatBoardRecord;
  revision: number;
  lastModified: string;
}

export interface SnakeVersionState {
  draftedPlayerIdByGroupId: Record<string, string>;
  retiredPlayerIdsByGroupId: Record<string, string[]>;
}

export interface SnakeOpenTradeOffer {
  id: string;
  phase: 'MLB' | 'FARM';
  buyerTeamId: string;
  sellerTeamId: string;
  targetPick: number;
  offerPickNumbers: number[];
  receivePickNumbers: number[];
  offerValue: number;
  receiveValue: number;
  /** Stored canonical guide value. Legacy offers may not have it. */
  sellerPremium?: number;
  /** Revision at guide creation; execution always rebuilds this against live state. */
  postedSessionRevision: number;
  buyerNod: boolean;
  sellerNod: boolean;
  postedAt: string;
}

export interface SnakeRoomLogRecord {
  id: string;
  kind: 'ADVISOR' | 'BACKFILL' | 'TRADE' | 'CORRECTION' | 'SYSTEM';
  text: string;
  createdAt: string;
  actionable: boolean;
  expired?: boolean;
}

export interface SnakeDraftCorrectionSnapshot {
  action: 'pick' | 'trade';
  /** Full pre-action value, excluding an older correction window by construction. */
  priorSession: Omit<LeagueBuilderMlbDraftSession, 'correctionSnapshots'>;
  /** System-generated MLB board state immediately after the action. */
  postActionSeatBoards?: Record<string, SnakeSeatBoardRecord>;
  /** System-generated farm board state immediately after the action. */
  postActionFarmSeatBoards?: Record<string, FarmSeatBoardRecord>;
}

export interface SnakeDraftManifestPick {
  round: number;
  pick: number;
  teamId: string;
  playerId: string;
  /** Null is an explicit legacy/unknown recap value, never an omitted field. */
  settledSalary: number | null;
  /** Null is an explicit legacy/unknown recap value, never an omitted field. */
  marginalTax: number | null;
  /** Exact immutable salary used by roster/freeze/launch consumers. */
  launchSalary: number;
  salarySource: 'pick' | 'pool-legacy' | 'farm-slot';
}

export interface SnakeDraftManifest {
  formatVersion: 'snake-draft-manifest-v1';
  phase: 'MLB' | 'FARM';
  leagueId: string;
  seasonNumber: number;
  frozenAt: string;
  source: { sessionId: string; revision: number };
  versions: { workflow: string; engine: string };
  seed: string;
  tier: TierKey;
  balanceMode: BalanceMode;
  rounds: number;
  lockedClubs: Array<{
    teamId: string;
    gmName: string | null;
    hotseat: boolean;
    archetypeId: string | null;
  }>;
  pickOrder: Array<{ round: number; pick: number; teamId: string }>;
  completedPicks: SnakeDraftManifestPick[];
  versionState: SnakeVersionState | null;
  pool: {
    identity: string;
    playerIds: string[];
    /** MLB-only public IV snapshot for complete active-pool provenance. FARM must stay null. */
    mlbIvByPlayerId: Record<string, number> | null;
  };
}

/**
 * Durable proof that a frozen snake manifest has been copied into League
 * Builder rosters.  A complete manifest alone is not enough to launch the next
 * leg: roster writes can fail after the recap is frozen and must be retried.
 */
export interface SnakeRosterHandoff {
  formatVersion: 'snake-roster-handoff-v1';
  phase: 'MLB' | 'FARM';
  sourceSessionId: string;
  manifestPoolIdentity: string;
  /** Canonical checksum of the entire immutable manifest, including frozenAt and picks. */
  manifestIdentity: string;
  committedAt: string;
}

export interface LeagueBuilderMlbDraftSession {
  id: string;
  leagueId: string;
  seasonNumber: number;
  seed: string;
  workflowVersion: string;
  engineMethodVersion: string;
  tier: TierKey;
  balanceMode: BalanceMode;
  rounds: number;
  /** S6 reuses the snake room/session record for the short farm draft. */
  draftPhase?: 'MLB' | 'FARM';
  /** Frozen once when a FARM session is created; index = absolute pick - 1. */
  farmSlotSalaries?: number[];
  /** Exact immutable generated prospect DTOs; retries never regenerate launch players. */
  farmProspectSnapshot?: FarmAuctionPool['prospects'];
  pickOrder: Array<{ round: number; pick: number; teamId: string }>;
  completedPicks: Array<{
    round: number;
    pick: number;
    teamId: string;
    playerId: string;
    /** Snake POC settlement: the player's frozen IV at pick commit. Optional for old sessions. */
    settledSalary?: number;
    /** The pick's incremental rating tax, accumulated for the live POC ledger. */
    marginalTax?: number;
  }>;
  /** Snake POC-only pick-ownership changes. Additive so pre-POC sessions remain readable. */
  trades?: SnakeDraftTradeRecord[];
  /** One durable open offer per unordered club pair. */
  openTradeOffers?: SnakeOpenTradeOffer[];
  /** Private, fact-only room history keyed by seat. */
  roomLogByTeamId?: Record<string, SnakeRoomLogRecord[]>;
  /** S1A session-v2 additions. All are optional so old sessions remain readable in-place. */
  seatBoards?: Record<string, SnakeSeatBoardRecord>;
  /** Optional so old FARM sessions seed deterministically on first use. */
  farmSeatBoards?: Record<string, FarmSeatBoardRecord>;
  versionState?: SnakeVersionState;
  /** Confirmation-time immutable truth. Optional so all pre-manifest sessions remain loadable. */
  draftManifest?: SnakeDraftManifest;
  /** Written only after the frozen picks are durably committed to team rosters. */
  rosterHandoff?: SnakeRosterHandoff;
  snakeSetup?: {
    /** Final trimmed pool: the chosen version card per human, plus all non-versioned picks. */
    poolPlayerIds: string[];
    /** versionGroupId -> chosen playerId (only groups with >1 card). */
    versionSelections: Record<string, string>;
    /** Per seat, locked at GO. */
    clubs: Array<{
      teamId: string;
      gmName?: string;
      hotseat: boolean;
      archetypeId?: string;
    }>;
    /** The visible shuffle seed shown on the ORDER card. */
    orderSeed: string;
    /** Last exact constructive completion certificate; advanced atomically with every pick. */
    seatingCertificate?: {
      feasible: true;
      assignments: Array<{
        teamId: string;
        playerIds: string[];
        salaryCost: number;
        addedTax: number;
        allInCost: number;
      }>;
      shortfall: null;
      message: string;
    };
  };
  /**
   * CONTRACT_S5_COMPANIONS_2026-07-10 Amendment 1: v1 companions are the league
   * owner's own same-account devices. This is a render-level table-consent record;
   * server-side seat ACLs for guest accounts are deliberately deferred to v2.
   */
  snakeCompanions?: {
    roomCode: string;
    claims: Array<{
      /** Immutable identity for one claim attempt. Optional only for pre-identity legacy rows. */
      claimId?: string;
      /** Monotonic row version; every status transition increments it. Legacy rows read as 0. */
      claimVersion?: number;
      deviceId: string;
      gmName: string;
      teamId: string;
      status: 'pending' | 'approved' | 'revoked';
    }>;
  };
  paused?: boolean;
  correctionSnapshots?: SnakeDraftCorrectionSnapshot[];
  /** Monotonic session revision used to reject stale guide packages at execution. */
  revision?: number;
  currentPickIndex: number;
  createdDate: string;
  lastModified: string;
}

function preservePersistedFarmProspectSnapshot(
  current: LeagueBuilderMlbDraftSession | null | undefined,
  incoming: LeagueBuilderMlbDraftSession,
): LeagueBuilderMlbDraftSession['farmProspectSnapshot'] {
  const persisted = current?.farmProspectSnapshot;
  if (!persisted) {
    if (incoming.farmProspectSnapshot && (current?.currentPickIndex ?? 0) > 0) {
      throw new Error('A farm prospect snapshot cannot be introduced after drafting starts.');
    }
    return incoming.farmProspectSnapshot;
  }
  if (!incoming.farmProspectSnapshot || JSON.stringify(incoming.farmProspectSnapshot) !== JSON.stringify(persisted)) {
    throw new Error('The frozen farm prospect snapshot cannot be removed or replaced.');
  }
  return persisted;
}

export interface SnakeDraftTradeRecord {
  id: string;
  atPickIndex: number;
  humanTeamId: string;
  cpuTeamId: string;
  humanPickNumbers: number[];
  cpuPickNumbers: number[];
  humanValue: number;
  cpuValue: number;
  /** CPU's own §4.1 score gain for the picks it receives, minus the picks it gives. */
  cpuDecisionGain?: number;
  greedMargin: number;
}

export interface LeagueBuilderAuctionSession {
  id: string;
  leagueId: string;
  seasonNumber: number;
  seed: string;
  session: CpuShillAuctionSession;
  pool?: FarmAuctionPool;
  createdDate: string;
  lastModified: string;
}

// Player
export interface Player {
  id: string;
  /** Stable real-person/source identity shared by alternate historical cards. */
  sourceId?: string;
  /** Explicit grouping override when source identity alone is not sufficient. */
  versionGroupId?: string;
  /** Human-readable card tag, for example "1927 Yankees" or "1998 Mariners". */
  versionLabel?: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  backstory?: string;
  nicknames?: string[];
  archetype?: PlayerArchetype;
  signatureMoment?: string;
  baseFameTier?: FameTier;
  gender: 'M' | 'F';
  jerseyNumber?: number;
  age: number;
  bats: 'L' | 'R' | 'S';
  throws: 'L' | 'R';
  armSlot?: 'High' | 'Mid' | 'Low' | 'Sub' | null;
  primaryPosition: Position;
  secondaryPosition?: Position;
  // Batting ratings
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
  // Pitching ratings
  velocity: number;
  junk: number;
  accuracy: number;
  arsenal: PitchType[];
  overallGrade: Grade;
  trait1?: string;
  trait2?: string;
  personality: Personality;
  chemistry: Chemistry;
  hiddenPersonalityModifiers?: HiddenPersonalityModifiers;
  morale: number;
  mojo: MojoState;
  fame: number;
  salary: number;
  // §10 freeze: the auction winning bid (RB-7c); additive, no consumer in v1
  settledSalary?: number;
  salaryCalculationVersion?: string;
  salarySeasonId?: string;
  salaryStatsScopeId?: string;
  salarySeasonNumber?: number;
  rookieScaleActiveBySeason?: Record<string, boolean>;
  draftedAsFarmProspect?: boolean;
  rookieStatus?: { activatedSeasonId: string };
  salaryUpdatedAt?: string;
  salaryFactors?: {
    source: 'multifactor-current-season' | 'hidden-farm-public-context';
    baseSalary?: number;
    positionMultiplier?: number;
    traitModifier?: number;
    ageFactor?: number;
    performanceModifier?: number;
    fameModifier?: number;
    personalityModifier?: number;
    actualWar?: number | null;
    expectedWar?: number | null;
    gamesPerSeason?: number | null;
    inningsPerGame?: number | null;
    rookieScaleActive?: boolean;
  };
  contractYears?: number;
  leagueAssignments?: LeagueAssignment[];
  optionsUsedBySeason?: Record<string, number>;
  optionDatesBySeason?: Record<string, string[]>;
  ratingRevealState?: 'hidden' | 'revealed';
  ratingRevealedAt?: string;
  prospectProfile?: PlayerProspectProfile;
  createdDate: string;
  lastModified: string;
  isCustom: boolean;
  sourceDatabase?: string;
  hometown?: { city: string; state: string };
  editHistory?: EditHistoryEntry[];
}

export type PlayerAttributes = Pick<
  Player,
  | 'power'
  | 'contact'
  | 'speed'
  | 'fielding'
  | 'arm'
  | 'velocity'
  | 'junk'
  | 'accuracy'
  | 'arsenal'
  | 'overallGrade'
  | 'trait1'
  | 'trait2'
  | 'personality'
  | 'chemistry'
  | 'primaryPosition'
  | 'secondaryPosition'
  | 'jerseyNumber'
  | 'age'
  | 'bats'
  | 'throws'
  | 'armSlot'
  | 'nickname'
  | 'hometown'
>;

export interface LeaguePlayerOverrideRecord {
  id: string;
  leagueId: string;
  playerId: string;
  overrides: Partial<PlayerAttributes>;
  fameTierOverride?: FameTier;
  lastModified: string;
}

// Roster
export interface LineupSlot {
  battingOrder: number;
  playerId: string;
  fieldingPosition: Position;
}

export interface DepthChart {
  C: string[];
  '1B': string[];
  '2B': string[];
  SS: string[];
  '3B': string[];
  LF: string[];
  CF: string[];
  RF: string[];
  DH: string[];
  SP: string[];
  RP: string[];
  CP: string[];
}

export interface TeamRoster {
  teamId: string;
  mlbRoster: string[];
  farmRoster: string[];
  lineupWithDH: LineupSlot[];
  lineupWithoutDH: LineupSlot[];
  optimalLineupVsRHPWithDH?: OptimalLineupSnapshot;
  optimalLineupVsLHPWithDH?: OptimalLineupSnapshot;
  optimalLineupVsRHPWithoutDH?: OptimalLineupSnapshot;
  optimalLineupVsLHPWithoutDH?: OptimalLineupSnapshot;
  startingRotation: string[];
  longRelievers: string[];
  closingPitcher: string;
  setupPitchers: string[];
  depthChart: DepthChart;
  pinchHitOrder: string[];
  pinchRunOrder: string[];
  defensiveSubOrder: string[];
  lastModified: string;
}

// Rules Preset
export interface RulesPreset {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isEditable: boolean;
  game: {
    inningsPerGame: 6 | 7 | 9;
    extraInningsRule: 'standard' | 'runner_on_second' | 'sudden_death';
    mercyRule: {
      enabled: boolean;
      runDifferential: number;
      afterInning: number;
    };
    pitchCounts: {
      enabled: boolean;
      starterLimit: number;
      relieverLimit: number;
    };
    moundVisits: {
      enabled: boolean;
      perGame: number;
    };
  };
  season: {
    gamesPerTeam: number;
    scheduleType: 'balanced' | 'division_heavy' | 'rivalry_focused';
    allStarGame: boolean;
    allStarTiming: number;
    tradeDeadline: {
      enabled: boolean;
      timing: number;
    };
  };
  playoffs: {
    teamsQualifying: number;
    format: 'bracket' | 'pool' | 'best_record_bye';
    seriesLengths: number[];
    homeFieldAdvantage: 'higher_seed' | 'alternating' | 'fixed';
  };
  createdDate: string;
  lastModified: string;
}

// ============================================
// DATABASE INITIALIZATION
// ============================================

let dbInstance: IDBDatabase | null = null;
const MIGRATION_LEAGUE_PLACEHOLDER = '__migrate__';

type LegacyRosterStatus = RosterStatus | 'RETIRED';

type LegacyPlayerRecord = Player & {
  currentTeamId?: string | null;
  rosterStatus?: LegacyRosterStatus;
  historicalSourceId?: string;
};

type LegacyLeagueTemplateRecord = LeagueTemplate;
type LegacyLeaguePlayerOverrideRecord = LeaguePlayerOverrideRecord;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getLeagueAssignment(player: Player, leagueId: string): LeagueAssignment | undefined {
  return player.leagueAssignments?.find((assignment) => assignment.leagueId === leagueId);
}

export function getPlayerLeagueAssignment(player: Player, leagueId: string): LeagueAssignment | undefined {
  return getLeagueAssignment(player, leagueId);
}

export function getPlayerTeamIdForLeague(player: Player, leagueId: string): string | null {
  return getLeagueAssignment(player, leagueId)?.teamId ?? null;
}

export function getPlayerRosterStatusForLeague(player: Player, leagueId: string): RosterStatus | null {
  return getLeagueAssignment(player, leagueId)?.rosterStatus ?? null;
}

const LINEUP_RELEVANT_PLAYER_FIELDS: Array<keyof Player> = [
  'power',
  'contact',
  'speed',
  'fielding',
  'arm',
  'primaryPosition',
  'secondaryPosition',
  'bats',
  'mojo',
  'overallGrade',
  'leagueAssignments',
];

function serializeComparablePlayerField(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function getAssignedTeamIds(player: Player | null | undefined): string[] {
  return Array.from(
    new Set(
      (player?.leagueAssignments ?? [])
        .filter((assignment) => assignment.rosterStatus !== 'FREE_AGENT')
        .map((assignment) => assignment.teamId)
        .filter(Boolean),
    ),
  );
}

function hasLineupRelevantPlayerChange(previous: Player | null, next: Player): boolean {
  if (!previous) {
    return getAssignedTeamIds(next).length > 0;
  }

  return LINEUP_RELEVANT_PLAYER_FIELDS.some(
    (field) =>
      serializeComparablePlayerField(previous[field]) !==
      serializeComparablePlayerField(next[field]),
  );
}

async function markTeamRostersStaleForPlayerChange(
  previous: Player | null,
  next: Player,
): Promise<void> {
  if (!hasLineupRelevantPlayerChange(previous, next)) return;

  const teamIds = Array.from(
    new Set([...getAssignedTeamIds(previous), ...getAssignedTeamIds(next)]),
  );

  for (const teamId of teamIds) {
    const roster = await getTeamRoster(teamId);
    if (!roster) continue;
    await saveTeamRoster(
      markOptimalLineupSnapshotsStaleForChange(
        roster,
        OPTIMAL_LINEUP_SNAPSHOT_FIELDS,
      ),
    );
  }
}

function buildLeagueAssignmentsFromLegacyPlayer(player: LegacyPlayerRecord): LeagueAssignment[] {
  if (player.leagueAssignments) {
    return player.leagueAssignments;
  }

  if (player.rosterStatus === 'RETIRED') {
    return [];
  }

  if (player.currentTeamId) {
    return [{
      leagueId: MIGRATION_LEAGUE_PLACEHOLDER,
      teamId: player.currentTeamId,
      rosterStatus: player.rosterStatus ?? 'MLB',
    }];
  }

  if (player.rosterStatus === 'FREE_AGENT') {
    return [{
      leagueId: MIGRATION_LEAGUE_PLACEHOLDER,
      teamId: '',
      rosterStatus: 'FREE_AGENT',
    }];
  }

  return [];
}

function normalizePlayerRecord(player: LegacyPlayerRecord): Player {
  const sourceId = player.sourceId?.trim() || player.historicalSourceId?.trim() || undefined;
  const normalized = {
    ...player,
    ...(sourceId ? { sourceId, versionGroupId: player.versionGroupId?.trim() || sourceId } : {}),
    baseFameTier: player.baseFameTier ?? 3,
    leagueAssignments: buildLeagueAssignmentsFromLegacyPlayer(player),
  };

  delete normalized.currentTeamId;
  delete normalized.rosterStatus;
  delete normalized.historicalSourceId;

  return normalized;
}

function normalizeLeagueTemplateRecord(template: LegacyLeagueTemplateRecord): LeagueTemplate {
  return {
    ...template,
    conferences: template.conferences ?? [],
    divisions: template.divisions ?? [],
    tier: template.tier ?? 'juiced',
    balanceMode: template.balanceMode ?? BALANCE_MODE_DEFAULT,
    checkpointCadence: normalizeCheckpointCadence(
      (template as LegacyLeagueTemplateRecord & { checkpointCadence?: unknown }).checkpointCadence ??
        CHECKPOINT_CADENCE_DEFAULT,
    ),
  };
}

function migratePlayerBaseFameTier(store: IDBObjectStore): void {
  const cursorRequest = store.openCursor();
  cursorRequest.onsuccess = () => {
    const cursor = cursorRequest.result;
    if (!cursor) return;

    const player = normalizePlayerRecord(cursor.value as LegacyPlayerRecord);
    if ((cursor.value as LegacyPlayerRecord).baseFameTier === undefined) {
      cursor.update(player);
    }
    cursor.continue();
  };
}

function normalizeLeaguePlayerOverrideRecord(
  record: LegacyLeaguePlayerOverrideRecord,
): LeaguePlayerOverrideRecord {
  return { ...record };
}

async function resolveMigratedLeagueAssignments(db: IDBDatabase): Promise<void> {
  const tx = db.transaction(
    [STORES.GLOBAL_PLAYERS, STORES.GLOBAL_TEAMS, STORES.LEAGUE_TEMPLATES],
    'readwrite',
  );
  const playerStore = tx.objectStore(STORES.GLOBAL_PLAYERS);
  const teamStore = tx.objectStore(STORES.GLOBAL_TEAMS);
  const leagueStore = tx.objectStore(STORES.LEAGUE_TEMPLATES);

  const [teams, leagues, players] = await Promise.all([
    requestToPromise(teamStore.getAll()) as Promise<Team[]>,
    requestToPromise(leagueStore.getAll()) as Promise<LeagueTemplate[]>,
    requestToPromise(playerStore.getAll()) as Promise<LegacyPlayerRecord[]>,
  ]);

  const firstLeagueId = leagues[0]?.id ?? '';
  const teamLeagueIdById = new Map(
    teams.map((team) => [team.id, team.leagueIds?.[0] ?? firstLeagueId]),
  );

  for (const legacyPlayer of players) {
    const player = normalizePlayerRecord(legacyPlayer);
    const nextAssignments = (player.leagueAssignments ?? []).flatMap((assignment) => {
      if (
        assignment.leagueId !== MIGRATION_LEAGUE_PLACEHOLDER &&
        leagues.some((l) => l.id === assignment.leagueId)
      ) {
        return assignment;
      }

      const resolvedLeagueId = assignment.teamId
        ? teamLeagueIdById.get(assignment.teamId) ?? firstLeagueId
        : firstLeagueId;

      return resolvedLeagueId
        ? [{ ...assignment, leagueId: resolvedLeagueId }]
        : [];
    });

    const needsUpdate =
      legacyPlayer.currentTeamId !== undefined ||
      legacyPlayer.rosterStatus !== undefined ||
      JSON.stringify(player.leagueAssignments ?? []) !== JSON.stringify(nextAssignments);

    if (needsUpdate) {
      await requestToPromise(
        playerStore.put({
          ...player,
          leagueAssignments: nextAssignments,
        }),
      );
    }
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function initLeagueBuilderDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[leagueBuilderStorage] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      // Auto-invalidate singleton if the database is externally closed or version-changed
      dbInstance.onclose = () => { dbInstance = null; };
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };

      resolveMigratedLeagueAssignments(dbInstance)
        .then(() => resolve(dbInstance!))
        .catch((error) => reject(error));
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const { oldVersion } = event;

      // League Templates store
      if (!db.objectStoreNames.contains(STORES.LEAGUE_TEMPLATES)) {
        const store = db.createObjectStore(STORES.LEAGUE_TEMPLATES, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
      }

      // Global Teams store
      if (!db.objectStoreNames.contains(STORES.GLOBAL_TEAMS)) {
        const store = db.createObjectStore(STORES.GLOBAL_TEAMS, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('abbreviation', 'abbreviation', { unique: false });
      }

      // Global Players store
      let globalPlayersStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORES.GLOBAL_PLAYERS)) {
        globalPlayersStore = db.createObjectStore(STORES.GLOBAL_PLAYERS, { keyPath: 'id' });
      } else {
        globalPlayersStore = (event.target as IDBOpenDBRequest).transaction!.objectStore(STORES.GLOBAL_PLAYERS);
      }

      if (!globalPlayersStore.indexNames.contains('lastName')) {
        globalPlayersStore.createIndex('lastName', 'lastName', { unique: false });
      }
      if (!globalPlayersStore.indexNames.contains('primaryPosition')) {
        globalPlayersStore.createIndex('primaryPosition', 'primaryPosition', { unique: false });
      }
      if (!globalPlayersStore.indexNames.contains('overallGrade')) {
        globalPlayersStore.createIndex('overallGrade', 'overallGrade', { unique: false });
      }
      if (oldVersion < 3) {
        if (globalPlayersStore.indexNames.contains('currentTeamId')) {
          globalPlayersStore.deleteIndex('currentTeamId');
        }
        migratePlayerBaseFameTier(globalPlayersStore);
      } else if (oldVersion < 4) {
        migratePlayerBaseFameTier(globalPlayersStore);
      }

      // Rules Presets store
      if (!db.objectStoreNames.contains(STORES.RULES_PRESETS)) {
        const store = db.createObjectStore(STORES.RULES_PRESETS, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('isDefault', 'isDefault', { unique: false });
      }

      // Team Rosters store
      if (!db.objectStoreNames.contains(STORES.TEAM_ROSTERS)) {
        db.createObjectStore(STORES.TEAM_ROSTERS, { keyPath: 'teamId' });
      }

      if (!db.objectStoreNames.contains(STORES.SCOUT_PROFILES)) {
        const store = db.createObjectStore(STORES.SCOUT_PROFILES, { keyPath: 'id' });
        store.createIndex('leagueId', 'leagueId', { unique: false });
        store.createIndex('teamId', 'teamId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.STARTUP_DRAFT_SESSIONS)) {
        const store = db.createObjectStore(STORES.STARTUP_DRAFT_SESSIONS, { keyPath: 'id' });
        store.createIndex('leagueId', 'leagueId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.REGISTERED_POOLS)) {
        db.createObjectStore(STORES.REGISTERED_POOLS, { keyPath: 'leagueId' });
      }

      if (!db.objectStoreNames.contains(STORES.MLB_DRAFT_SESSIONS)) {
        const store = db.createObjectStore(STORES.MLB_DRAFT_SESSIONS, { keyPath: 'id' });
        store.createIndex('leagueId', 'leagueId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SNAKE_SEAT_BOARDS)) {
        const store = db.createObjectStore(STORES.SNAKE_SEAT_BOARDS, { keyPath: 'id' });
        store.createIndex('sessionId', 'sessionId', { unique: false });
        store.createIndex('leagueId', 'leagueId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.AUCTION_SESSIONS)) {
        const store = db.createObjectStore(STORES.AUCTION_SESSIONS, { keyPath: 'id' });
        store.createIndex('leagueId', 'leagueId', { unique: false });
      }

      // League Player Overrides store
      if (oldVersion < 2 && !db.objectStoreNames.contains(STORES.LEAGUE_PLAYER_OVERRIDES)) {
        const store = db.createObjectStore(STORES.LEAGUE_PLAYER_OVERRIDES, { keyPath: 'id' });
        store.createIndex('leagueId', 'leagueId', { unique: false });
        store.createIndex('playerId', 'playerId', { unique: false });
      }
    };
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

// ============================================
// LEAGUE TEMPLATE OPERATIONS
// ============================================

export async function getAllLeagueTemplates(): Promise<LeagueTemplate[]> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.LEAGUE_TEMPLATES, 'readonly');
    const store = tx.objectStore(STORES.LEAGUE_TEMPLATES);
    const request = store.getAll();

    request.onsuccess = () => resolve((request.result || []).map((template) => normalizeLeagueTemplateRecord(template)));
    request.onerror = () => reject(request.error);
  });
}

export async function getLeagueTemplate(id: string): Promise<LeagueTemplate | null> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.LEAGUE_TEMPLATES, 'readonly');
    const store = tx.objectStore(STORES.LEAGUE_TEMPLATES);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result ? normalizeLeagueTemplateRecord(request.result) : null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLeagueTemplate(template: Omit<LeagueTemplate, 'id' | 'createdDate' | 'lastModified'> & { id?: string }): Promise<LeagueTemplate> {
  const db = await initLeagueBuilderDatabase();
  const now = nowISO();

  const fullTemplate: LeagueTemplate = {
    ...template,
    id: template.id || generateId('league'),
    createdDate: template.id ? (await getLeagueTemplate(template.id))?.createdDate || now : now,
    lastModified: now,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.LEAGUE_TEMPLATES, 'readwrite');
    const store = tx.objectStore(STORES.LEAGUE_TEMPLATES);
    const request = store.put(fullTemplate);

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-league-builder', 'leagueTemplates', fullTemplate.id, fullTemplate);
      resolve(fullTemplate);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteLeagueTemplate(id: string): Promise<void> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.LEAGUE_TEMPLATES, 'readwrite');
    const store = tx.objectStore(STORES.LEAGUE_TEMPLATES);
    const request = store.delete(id);

    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.remove('kbl-league-builder', 'leagueTemplates', id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveRegisteredPool(pool: RegisteredPool): Promise<void> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    // The completed MLB snake manifest and its RegisteredPool are one launch
    // truth. Read them in the same transaction so a late setup tab cannot
    // mutate the pool between a manifest check and the pool write.
    const tx = db.transaction([STORES.REGISTERED_POOLS, STORES.MLB_DRAFT_SESSIONS], 'readwrite');
    const store = tx.objectStore(STORES.REGISTERED_POOLS);
    const currentPoolRequest = store.get(pool.leagueId);
    const sessionRequest = tx.objectStore(STORES.MLB_DRAFT_SESSIONS)
      .get(createMlbDraftSessionId(pool.leagueId, 1));
    let currentPool: RegisteredPool | null = null;
    let currentSession: LeagueBuilderMlbDraftSession | null = null;
    let readsComplete = 0;
    let writeStarted = false;

    const writeWhenReady = () => {
      readsComplete += 1;
      if (readsComplete !== 2 || writeStarted) return;
      writeStarted = true;
      try {
        if (currentSession?.draftManifest) {
          readSnakeDraftTruth(currentSession, 'MLB');
          if (!currentPool || JSON.stringify(currentPool) !== JSON.stringify(pool)) {
            throw new Error('A completed snake draft has frozen this player pool. Run It Back before changing it.');
          }
        }
        store.put(pool);
      } catch (error) {
        reject(error);
        tx.abort();
      }
    };

    currentPoolRequest.onsuccess = () => {
      currentPool = currentPoolRequest.result ?? null;
      writeWhenReady();
    };
    currentPoolRequest.onerror = () => reject(currentPoolRequest.error);
    sessionRequest.onsuccess = () => {
      currentSession = sessionRequest.result ?? null;
      writeWhenReady();
    };
    sessionRequest.onerror = () => reject(sessionRequest.error);
    tx.oncomplete = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-league-builder', 'registeredPools', pool.leagueId, pool);
      resolve();
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error(`Registered pool ${pool.leagueId} write was aborted.`));
  });
}

export async function getRegisteredPool(leagueId: string): Promise<RegisteredPool | null> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.REGISTERED_POOLS, 'readonly');
    const store = tx.objectStore(STORES.REGISTERED_POOLS);
    const request = store.get(leagueId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteRegisteredPool(leagueId: string): Promise<void> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.REGISTERED_POOLS, 'readwrite');
    const store = tx.objectStore(STORES.REGISTERED_POOLS);
    const request = store.delete(leagueId);

    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.remove('kbl-league-builder', 'registeredPools', leagueId);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// TEAM OPERATIONS
// ============================================

export async function getAllTeams(): Promise<Team[]> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_TEAMS, 'readonly');
    const store = tx.objectStore(STORES.GLOBAL_TEAMS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getTeam(id: string): Promise<Team | null> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_TEAMS, 'readonly');
    const store = tx.objectStore(STORES.GLOBAL_TEAMS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTeam(team: Omit<Team, 'id' | 'createdDate' | 'lastModified'> & { id?: string }): Promise<Team> {
  const db = await initLeagueBuilderDatabase();
  const now = nowISO();

  const fullTeam: Team = {
    ...team,
    id: team.id || generateId('team'),
    createdDate: team.id ? (await getTeam(team.id))?.createdDate || now : now,
    lastModified: now,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_TEAMS, 'readwrite');
    const store = tx.objectStore(STORES.GLOBAL_TEAMS);
    const request = store.put(fullTeam);

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-league-builder', 'globalTeams', fullTeam.id, fullTeam);
      resolve(fullTeam);
    };
    tx.onerror = () => reject(tx.error);
  });
}

function pruneTeamIdFromLeagueTemplate(league: LeagueTemplate, teamId: string): LeagueTemplate {
  return {
    ...league,
    teamIds: league.teamIds.filter((id) => id !== teamId),
    divisions: league.divisions.map((division) => ({
      ...division,
      teamIds: division.teamIds.filter((id) => id !== teamId),
    })),
  };
}

export async function deleteTeam(id: string): Promise<void> {
  const db = await initLeagueBuilderDatabase();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_TEAMS, 'readwrite');
    const store = tx.objectStore(STORES.GLOBAL_TEAMS);
    const request = store.delete(id);

    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.remove('kbl-league-builder', 'globalTeams', id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });

  const leagues = await getAllLeagueTemplates();
  for (const league of leagues) {
    if (!league.teamIds.includes(id) && !league.divisions.some((division) => division.teamIds.includes(id))) {
      continue;
    }
    await saveLeagueTemplate(pruneTeamIdFromLeagueTemplate(league, id));
  }
}

// ============================================
// PLAYER OPERATIONS
// ============================================

export async function getAllPlayers(): Promise<Player[]> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_PLAYERS, 'readonly');
    const store = tx.objectStore(STORES.GLOBAL_PLAYERS);
    const request = store.getAll();

    request.onsuccess = () => resolve((request.result || []).map((player) => normalizePlayerRecord(player)));
    request.onerror = () => reject(request.error);
  });
}

export async function getPlayer(id: string): Promise<Player | null> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_PLAYERS, 'readonly');
    const store = tx.objectStore(STORES.GLOBAL_PLAYERS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result ? normalizePlayerRecord(request.result) : null);
    request.onerror = () => reject(request.error);
  });
}

export async function getPlayersByTeam(teamId: string, leagueId: string): Promise<Player[]> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_PLAYERS, 'readonly');
    const store = tx.objectStore(STORES.GLOBAL_PLAYERS);
    const request = store.getAll();

    request.onsuccess = () => {
      const players = (request.result || []).map((player) => normalizePlayerRecord(player));
      resolve(players.filter((player) => getPlayerTeamIdForLeague(player, leagueId) === teamId));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function savePlayer(
  player: Omit<Player, 'id' | 'createdDate' | 'lastModified'> & { id?: string },
  options?: { trackChanges?: boolean },
): Promise<Player> {
  const db = await initLeagueBuilderDatabase();
  const now = nowISO();
  const existingPlayer = player.id ? await getPlayer(player.id) : null;

  // If tracking changes and this is an update (has id), compute edit history diff
  let editHistory = player.editHistory ?? [];
  if (options?.trackChanges && player.id) {
    const existing = existingPlayer;
    if (existing) {
      const newEntries = trackFieldChanges(
        existing as unknown as Record<string, unknown>,
        player as unknown as Record<string, unknown>,
        'base',
      );
      editHistory = [...(existing.editHistory ?? []), ...newEntries];
    }
  }

  const legacySourceId = (player as typeof player & { historicalSourceId?: unknown }).historicalSourceId;
  const sourceId = player.sourceId?.trim()
    || (typeof legacySourceId === 'string' ? legacySourceId.trim() : '')
    || undefined;
  const fullPlayer: Player = {
    ...player,
    ...(sourceId ? { sourceId, versionGroupId: player.versionGroupId?.trim() || sourceId } : {}),
    leagueAssignments: player.leagueAssignments ?? [],
    editHistory,
    id: player.id || generateId('player'),
    createdDate: player.id ? existingPlayer?.createdDate || now : now,
    lastModified: now,
  };
  delete (fullPlayer as Player & { historicalSourceId?: unknown }).historicalSourceId;

  const savedPlayer = await new Promise<Player>((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_PLAYERS, 'readwrite');
    const store = tx.objectStore(STORES.GLOBAL_PLAYERS);
    const request = store.put(fullPlayer);

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-league-builder', 'globalPlayers', fullPlayer.id, fullPlayer);
      resolve(fullPlayer);
    };
    tx.onerror = () => reject(tx.error);
  });

  await markTeamRostersStaleForPlayerChange(existingPlayer, savedPlayer);
  return savedPlayer;
}

export async function deletePlayer(id: string): Promise<void> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_PLAYERS, 'readwrite');
    const store = tx.objectStore(STORES.GLOBAL_PLAYERS);
    const request = store.delete(id);

    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.remove('kbl-league-builder', 'globalPlayers', id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

function createLeaguePlayerOverrideId(leagueId: string, playerId: string): string {
  return `${leagueId}::${playerId}`;
}

export async function getLeaguePlayerOverride(
  leagueId: string,
  playerId: string,
): Promise<LeaguePlayerOverrideRecord | null> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.LEAGUE_PLAYER_OVERRIDES, 'readonly');
    const store = tx.objectStore(STORES.LEAGUE_PLAYER_OVERRIDES);
    const request = store.get(createLeaguePlayerOverrideId(leagueId, playerId));

    request.onsuccess = () => resolve(
      request.result ? normalizeLeaguePlayerOverrideRecord(request.result) : null,
    );
    request.onerror = () => reject(request.error);
  });
}

export async function setLeaguePlayerOverride(
  leagueId: string,
  playerId: string,
  overrides: Partial<PlayerAttributes>,
  options?: { fameTierOverride?: FameTier },
): Promise<LeaguePlayerOverrideRecord> {
  const db = await initLeagueBuilderDatabase();

  const record: LeaguePlayerOverrideRecord = {
    id: createLeaguePlayerOverrideId(leagueId, playerId),
    leagueId,
    playerId,
    overrides,
    fameTierOverride: options?.fameTierOverride,
    lastModified: nowISO(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.LEAGUE_PLAYER_OVERRIDES, 'readwrite');
    const store = tx.objectStore(STORES.LEAGUE_PLAYER_OVERRIDES);
    const request = store.put(record);

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-league-builder', 'leaguePlayerOverrides', record.id, record);
      resolve(record);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeLeaguePlayerOverride(leagueId: string, playerId: string): Promise<void> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.LEAGUE_PLAYER_OVERRIDES, 'readwrite');
    const store = tx.objectStore(STORES.LEAGUE_PLAYER_OVERRIDES);
    const overrideId = createLeaguePlayerOverrideId(leagueId, playerId);
    const request = store.delete(overrideId);

    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.remove('kbl-league-builder', 'leaguePlayerOverrides', overrideId);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getAllOverridesForLeague(leagueId: string): Promise<LeaguePlayerOverrideRecord[]> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.LEAGUE_PLAYER_OVERRIDES, 'readonly');
    const store = tx.objectStore(STORES.LEAGUE_PLAYER_OVERRIDES);
    const index = store.index('leagueId');
    const request = index.getAll(leagueId);

    request.onsuccess = () => resolve(
      (request.result || []).map((record) => normalizeLeaguePlayerOverrideRecord(record)),
    );
    request.onerror = () => reject(request.error);
  });
}

export function __resetLeagueBuilderDatabaseForTests(): void {
  dbInstance?.close();
  dbInstance = null;
}

function removePlayerIdFromRoster(roster: TeamRoster, playerId: string): TeamRoster {
  const removeId = (arr: string[]) => arr.filter(id => id !== playerId);
  const removeFromLineup = (slots: LineupSlot[]) => slots.filter(s => s.playerId !== playerId);
  const removeFromDepth = (dc: DepthChart): DepthChart => {
    const cleaned = { ...dc };
    for (const pos of Object.keys(cleaned) as (keyof DepthChart)[]) {
      cleaned[pos] = removeId(cleaned[pos]);
    }
    return cleaned;
  };

  return markOptimalLineupSnapshotsStaleForChange({
    ...roster,
    mlbRoster: removeId(roster.mlbRoster),
    farmRoster: removeId(roster.farmRoster),
    lineupWithDH: removeFromLineup(roster.lineupWithDH),
    lineupWithoutDH: removeFromLineup(roster.lineupWithoutDH),
    startingRotation: removeId(roster.startingRotation),
    longRelievers: removeId(roster.longRelievers || []),
    closingPitcher: roster.closingPitcher === playerId ? '' : roster.closingPitcher,
    setupPitchers: removeId(roster.setupPitchers),
    depthChart: removeFromDepth(roster.depthChart),
    pinchHitOrder: removeId(roster.pinchHitOrder),
    pinchRunOrder: removeId(roster.pinchRunOrder),
    defensiveSubOrder: removeId(roster.defensiveSubOrder),
  }, OPTIMAL_LINEUP_SNAPSHOT_FIELDS);
}

/**
 * Retire a player by removing all league assignments and clearing them from
 * any team roster (mlbRoster, lineups, rotation, bullpen, depth chart, etc.).
 */
export async function retirePlayer(playerId: string): Promise<void> {
  const player = await getPlayer(playerId);
  if (!player) return;
  const previousTeamIds = Array.from(
    new Set((player.leagueAssignments ?? []).map((assignment) => assignment.teamId).filter(Boolean)),
  );

  const db = await initLeagueBuilderDatabase();
  const now = nowISO();
  const updatedPlayer: Player = {
    ...player,
    leagueAssignments: [],
    lastModified: now,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_PLAYERS, 'readwrite');
    const store = tx.objectStore(STORES.GLOBAL_PLAYERS);
    const request = store.put(updatedPlayer);
    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-league-builder', 'globalPlayers', updatedPlayer.id, updatedPlayer);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });

  for (const teamId of previousTeamIds) {
    const roster = await getTeamRoster(teamId);
    if (roster) {
      await saveTeamRoster(removePlayerIdFromRoster(roster, playerId));
    }
  }
}

/**
 * Transfer a player from one team to another.
 * Removes from old team roster arrays, adds to new team's mlbRoster,
 * and updates the player's assignment for the supplied league.
 */
export async function transferPlayer(playerId: string, newTeamId: string, leagueId: string): Promise<void> {
  const player = await getPlayer(playerId);
  if (!player) return;

  const oldAssignment = getLeagueAssignment(player, leagueId);
  const oldTeamId = oldAssignment?.teamId ?? null;

  const db = await initLeagueBuilderDatabase();
  const now = nowISO();
  const remainingAssignments = (player.leagueAssignments ?? []).filter(
    (assignment) => assignment.leagueId !== leagueId,
  );
  const updatedPlayer: Player = {
    ...player,
    leagueAssignments: [
      ...remainingAssignments,
      {
        leagueId,
        teamId: newTeamId,
        rosterStatus: oldAssignment?.rosterStatus === 'FREE_AGENT' ? 'MLB' : oldAssignment?.rosterStatus ?? 'MLB',
      },
    ],
    lastModified: now,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_PLAYERS, 'readwrite');
    const store = tx.objectStore(STORES.GLOBAL_PLAYERS);
    const request = store.put(updatedPlayer);
    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-league-builder', 'globalPlayers', updatedPlayer.id, updatedPlayer);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });

  if (oldTeamId) {
    const oldRoster = await getTeamRoster(oldTeamId);
    if (oldRoster) {
      await saveTeamRoster(removePlayerIdFromRoster(oldRoster, playerId));
    }
  }

  const newRoster = await getTeamRoster(newTeamId);
  if (newRoster && !newRoster.mlbRoster.includes(playerId)) {
    await saveTeamRoster(
      markOptimalLineupSnapshotsStaleForChange(
        {
          ...newRoster,
          mlbRoster: [...newRoster.mlbRoster, playerId],
        },
        OPTIMAL_LINEUP_SNAPSHOT_FIELDS,
      ),
    );
  }
}

// ============================================
// RULES PRESET OPERATIONS
// ============================================

export async function getAllRulesPresets(): Promise<RulesPreset[]> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RULES_PRESETS, 'readonly');
    const store = tx.objectStore(STORES.RULES_PRESETS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getRulesPreset(id: string): Promise<RulesPreset | null> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RULES_PRESETS, 'readonly');
    const store = tx.objectStore(STORES.RULES_PRESETS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRulesPreset(preset: Omit<RulesPreset, 'id' | 'createdDate' | 'lastModified'> & { id?: string }): Promise<RulesPreset> {
  const db = await initLeagueBuilderDatabase();
  const now = nowISO();

  const fullPreset: RulesPreset = {
    ...preset,
    id: preset.id || generateId('rules'),
    createdDate: preset.id ? (await getRulesPreset(preset.id))?.createdDate || now : now,
    lastModified: now,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RULES_PRESETS, 'readwrite');
    const store = tx.objectStore(STORES.RULES_PRESETS);
    const request = store.put(fullPreset);

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-league-builder', 'rulesPresets', fullPreset.id, fullPreset);
      resolve(fullPreset);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteRulesPreset(id: string): Promise<void> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RULES_PRESETS, 'readwrite');
    const store = tx.objectStore(STORES.RULES_PRESETS);
    const request = store.delete(id);

    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.remove('kbl-league-builder', 'rulesPresets', id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// TEAM ROSTER OPERATIONS
// ============================================

export async function getTeamRoster(teamId: string): Promise<TeamRoster | null> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TEAM_ROSTERS, 'readonly');
    const store = tx.objectStore(STORES.TEAM_ROSTERS);
    const request = store.get(teamId);

    request.onsuccess = () => {
      const raw = request.result;
      if (!raw) return resolve(null);
      // Migrate old lineupVsRHP/lineupVsLHP → lineupWithDH/lineupWithoutDH
      const migrated = { ...raw } as TeamRoster & Record<string, unknown>;
      if (!migrated.lineupWithDH && (raw as Record<string, unknown>).lineupVsRHP) {
        migrated.lineupWithDH = (raw as Record<string, unknown>).lineupVsRHP as LineupSlot[];
      }
      if (!migrated.lineupWithoutDH && (raw as Record<string, unknown>).lineupVsLHP) {
        migrated.lineupWithoutDH = (raw as Record<string, unknown>).lineupVsLHP as LineupSlot[];
      }
      if (!migrated.lineupWithDH) migrated.lineupWithDH = [];
      if (!migrated.lineupWithoutDH) migrated.lineupWithoutDH = [];
      if (!migrated.longRelievers) migrated.longRelievers = [];
      resolve(migrated as TeamRoster);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveTeamRoster(roster: TeamRoster): Promise<TeamRoster> {
  const db = await initLeagueBuilderDatabase();
  const now = nowISO();

  const fullRoster: TeamRoster = {
    ...roster,
    lastModified: now,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TEAM_ROSTERS, 'readwrite');
    const store = tx.objectStore(STORES.TEAM_ROSTERS);
    const request = store.put(fullRoster);

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-league-builder', 'teamRosters', fullRoster.teamId, fullRoster);
      resolve(fullRoster);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export function createEmptyTeamRoster(teamId: string): TeamRoster {
  return {
    teamId,
    mlbRoster: [],
    farmRoster: [],
    lineupWithDH: [],
    lineupWithoutDH: [],
    optimalLineupVsRHPWithDH: undefined,
    optimalLineupVsLHPWithDH: undefined,
    optimalLineupVsRHPWithoutDH: undefined,
    optimalLineupVsLHPWithoutDH: undefined,
    startingRotation: [],
    longRelievers: [],
    closingPitcher: '',
    setupPitchers: [],
    depthChart: createEmptyDepthChart(),
    pinchHitOrder: [],
    pinchRunOrder: [],
    defensiveSubOrder: [],
    lastModified: nowISO(),
  };
}

async function clearTeamAssignmentsFromPlayers(teamId: string, leagueId?: string): Promise<void> {
  const players = await getAllPlayers();

  for (const player of players) {
    let changed = false;
    const nextAssignments = (player.leagueAssignments ?? []).map((assignment) => {
      if (assignment.teamId !== teamId) return assignment;
      if (leagueId && assignment.leagueId !== leagueId) return assignment;
      if (!assignment.teamId && assignment.rosterStatus === 'FREE_AGENT') return assignment;

      changed = true;
      return {
        ...assignment,
        teamId: '',
        rosterStatus: 'FREE_AGENT' as const,
      };
    });

    if (!changed) continue;
    await savePlayer({
      ...player,
      leagueAssignments: nextAssignments,
    });
  }
}

export async function clearTeamRoster(teamId: string, leagueId?: string): Promise<TeamRoster> {
  const existing = await getTeamRoster(teamId);
  const base = existing ?? createEmptyTeamRoster(teamId);
  const cleared: TeamRoster = {
    ...base,
    mlbRoster: [],
    farmRoster: [],
    lineupWithDH: [],
    lineupWithoutDH: [],
    optimalLineupVsRHPWithDH: undefined,
    optimalLineupVsLHPWithDH: undefined,
    optimalLineupVsRHPWithoutDH: undefined,
    optimalLineupVsLHPWithoutDH: undefined,
    startingRotation: [],
    longRelievers: [],
    closingPitcher: '',
    setupPitchers: [],
    depthChart: createEmptyDepthChart(),
    pinchHitOrder: [],
    pinchRunOrder: [],
    defensiveSubOrder: [],
  };

  const saved = await saveTeamRoster(cleared);
  await clearTeamAssignmentsFromPlayers(teamId, leagueId);
  return saved;
}

export async function deleteTeamRoster(teamId: string): Promise<void> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TEAM_ROSTERS, 'readwrite');
    const store = tx.objectStore(STORES.TEAM_ROSTERS);
    const request = store.delete(teamId);

    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.remove('kbl-league-builder', 'teamRosters', teamId);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// SCOUT / STARTUP DRAFT OPERATIONS
// ============================================

export function createStartupDraftSessionId(leagueId: string, seasonNumber = 1): string {
  return `${leagueId}::startup-farm-draft::${seasonNumber}`;
}

export function createMlbDraftSessionId(leagueId: string, seasonNumber = 1): string {
  return `${leagueId}::startup-mlb-draft::${seasonNumber}`;
}

export function createAuctionSessionId(leagueId: string, seasonNumber = 1): string {
  return `${leagueId}::startup-auction-draft::${seasonNumber}`;
}

export function createFarmAuctionSessionId(leagueId: string, seasonNumber = 1): string {
  return `${leagueId}::startup-farm-auction-draft::${seasonNumber}`;
}

export async function getAllScoutProfiles(): Promise<LeagueBuilderScoutProfile[]> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCOUT_PROFILES, 'readonly');
    const store = tx.objectStore(STORES.SCOUT_PROFILES);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getScoutProfilesForLeague(leagueId: string): Promise<LeagueBuilderScoutProfile[]> {
  const scouts = await getAllScoutProfiles();
  return scouts.filter((scout) => scout.leagueId === leagueId);
}

export async function saveScoutProfile(
  scout: Omit<LeagueBuilderScoutProfile, 'createdDate' | 'lastModified'> & {
    createdDate?: string;
    lastModified?: string;
  },
): Promise<LeagueBuilderScoutProfile> {
  const db = await initLeagueBuilderDatabase();
  const now = nowISO();
  const existing = (await getAllScoutProfiles()).find((candidate) => candidate.id === scout.id);
  const fullScout: LeagueBuilderScoutProfile = {
    ...scout,
    createdDate: scout.createdDate ?? existing?.createdDate ?? now,
    lastModified: now,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCOUT_PROFILES, 'readwrite');
    const store = tx.objectStore(STORES.SCOUT_PROFILES);
    const request = store.put(fullScout);

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-league-builder', 'scoutProfiles', fullScout.id, fullScout);
      resolve(fullScout);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteScoutProfilesForLeague(leagueId: string): Promise<void> {
  const scouts = await getScoutProfilesForLeague(leagueId);
  const db = await initLeagueBuilderDatabase();

  await Promise.all(scouts.map((scout) => new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.SCOUT_PROFILES, 'readwrite');
    const store = tx.objectStore(STORES.SCOUT_PROFILES);
    const request = store.delete(scout.id);
    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.remove('kbl-league-builder', 'scoutProfiles', scout.id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  })));
}

/**
 * Replace one league's scout set in a single IndexedDB transaction. The old
 * complete set remains durable if any delete or write in the replacement fails.
 */
export async function replaceScoutProfilesForLeague(
  leagueId: string,
  scouts: readonly (Omit<LeagueBuilderScoutProfile, 'createdDate' | 'lastModified'> & {
    createdDate?: string;
    lastModified?: string;
  })[],
): Promise<LeagueBuilderScoutProfile[]> {
  const db = await initLeagueBuilderDatabase();
  const now = nowISO();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCOUT_PROFILES, 'readwrite');
    const store = tx.objectStore(STORES.SCOUT_PROFILES);
    const readRequest = store.getAll();
    let removedIds: string[] = [];
    let replacements: LeagueBuilderScoutProfile[] = [];
    let operationError: Error | null = null;

    readRequest.onerror = () => reject(readRequest.error);
    readRequest.onsuccess = () => {
      const existing = (readRequest.result ?? []) as LeagueBuilderScoutProfile[];
      const existingById = new Map(existing.map((scout) => [scout.id, scout]));
      removedIds = existing.filter((scout) => scout.leagueId === leagueId).map((scout) => scout.id);
      replacements = scouts.map((scout) => ({
        ...scout,
        leagueId,
        createdDate: scout.createdDate ?? existingById.get(scout.id)?.createdDate ?? now,
        lastModified: now,
      }));
      try {
        for (const id of removedIds) store.delete(id);
        for (const scout of replacements) store.put(scout);
      } catch (caught) {
        operationError = caught instanceof Error ? caught : new Error(String(caught));
        tx.abort();
      }
    };

    tx.oncomplete = () => {
      if (!syncEngine.isSuppressed()) {
        for (const id of removedIds) syncEngine.remove('kbl-league-builder', 'scoutProfiles', id);
        for (const scout of replacements) syncEngine.upsert('kbl-league-builder', 'scoutProfiles', scout.id, scout);
      }
      resolve(replacements);
    };
    tx.onerror = () => reject(operationError ?? tx.error ?? new Error('Scout replacement transaction failed'));
    tx.onabort = () => reject(operationError ?? tx.error ?? new Error('Scout replacement transaction aborted'));
  });
}

export async function getStartupDraftSession(
  leagueId: string,
  seasonNumber = 1,
): Promise<LeagueBuilderStartupDraftSession | null> {
  const db = await initLeagueBuilderDatabase();
  const id = createStartupDraftSessionId(leagueId, seasonNumber);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.STARTUP_DRAFT_SESSIONS, 'readonly');
    const store = tx.objectStore(STORES.STARTUP_DRAFT_SESSIONS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveStartupDraftSession(
  session: Omit<LeagueBuilderStartupDraftSession, 'createdDate' | 'lastModified'> & {
    createdDate?: string;
    lastModified?: string;
  },
): Promise<LeagueBuilderStartupDraftSession> {
  const db = await initLeagueBuilderDatabase();
  const now = nowISO();
  const existing = await getStartupDraftSession(session.leagueId, session.seasonNumber);
  const fullSession: LeagueBuilderStartupDraftSession = {
    ...session,
    createdDate: session.createdDate ?? existing?.createdDate ?? now,
    lastModified: now,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.STARTUP_DRAFT_SESSIONS, 'readwrite');
    const store = tx.objectStore(STORES.STARTUP_DRAFT_SESSIONS);
    const request = store.put(fullSession);

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-league-builder', 'startupDraftSessions', fullSession.id, fullSession);
      resolve(fullSession);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteStartupDraftSession(leagueId: string, seasonNumber = 1): Promise<void> {
  const db = await initLeagueBuilderDatabase();
  const id = createStartupDraftSessionId(leagueId, seasonNumber);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.STARTUP_DRAFT_SESSIONS, 'readwrite');
    const store = tx.objectStore(STORES.STARTUP_DRAFT_SESSIONS);
    const request = store.delete(id);

    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.remove('kbl-league-builder', 'startupDraftSessions', id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getMlbDraftSession(
  leagueId: string,
  seasonNumber = 1,
): Promise<LeagueBuilderMlbDraftSession | null> {
  const db = await initLeagueBuilderDatabase();
  const id = createMlbDraftSessionId(leagueId, seasonNumber);

  const tx = db.transaction([STORES.MLB_DRAFT_SESSIONS, STORES.SNAKE_SEAT_BOARDS], 'readonly');
  const [stored, boardRows] = await Promise.all([
    requestToPromise(tx.objectStore(STORES.MLB_DRAFT_SESSIONS).get(id)),
    requestToPromise(tx.objectStore(STORES.SNAKE_SEAT_BOARDS).index('sessionId').getAll(id)),
  ]);
  const session = stored as LeagueBuilderMlbDraftSession | undefined;
  if (!session) return null;
  return hydrateIndependentSeatBoards(session, boardRows as SnakeSeatBoardStoreRecord[]);
}

function hydrateIndependentSeatBoards(
  session: LeagueBuilderMlbDraftSession,
  rows: SnakeSeatBoardStoreRecord[],
): LeagueBuilderMlbDraftSession {
  const seatBoards = { ...(session.seatBoards ?? {}) };
  const farmSeatBoards = { ...(session.farmSeatBoards ?? {}) };
  for (const row of rows) {
    if (row.phase === 'MLB') {
      const current = seatBoards[row.teamId];
      if (!current || row.revision >= current.revision) seatBoards[row.teamId] = row.board as SnakeSeatBoardRecord;
    } else {
      const current = farmSeatBoards[row.teamId];
      if (!current || row.revision >= current.revision) farmSeatBoards[row.teamId] = row.board as FarmSeatBoardRecord;
    }
  }
  return {
    ...session,
    ...(Object.keys(seatBoards).length > 0 ? { seatBoards } : {}),
    ...(Object.keys(farmSeatBoards).length > 0 ? { farmSeatBoards } : {}),
  };
}

function snakeSeatBoardStoreId(sessionId: string, phase: 'MLB' | 'FARM', teamId: string): string {
  return `${sessionId}::${phase.toLocaleLowerCase()}-seat::${teamId}`;
}

async function persistIndependentSeatBoards(session: LeagueBuilderMlbDraftSession): Promise<void> {
  const rows = [
    ...Object.entries(session.seatBoards ?? {}).map(([teamId, board]) => ({ teamId, board, phase: 'MLB' as const })),
    ...Object.entries(session.farmSeatBoards ?? {}).map(([teamId, board]) => ({ teamId, board, phase: 'FARM' as const })),
  ];
  for (const row of rows) {
    const db = await initLeagueBuilderDatabase();
    const id = snakeSeatBoardStoreId(session.id, row.phase, row.teamId);
    const existing = await requestToPromise(db.transaction(STORES.SNAKE_SEAT_BOARDS, 'readonly').objectStore(STORES.SNAKE_SEAT_BOARDS).get(id)) as SnakeSeatBoardStoreRecord | undefined;
    if (existing && existing.revision >= row.board.revision) continue;
    const record: SnakeSeatBoardStoreRecord = {
      id,
      sessionId: session.id,
      leagueId: session.leagueId,
      seasonNumber: session.seasonNumber,
      teamId: row.teamId,
      phase: row.phase,
      board: row.board,
      revision: row.board.revision,
      lastModified: nowISO(),
    };
    await requestToPromise(db.transaction(STORES.SNAKE_SEAT_BOARDS, 'readwrite').objectStore(STORES.SNAKE_SEAT_BOARDS).put(record));
    if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-league-builder', 'snakeSeatBoards', record.id, record);
  }
}

export async function saveMlbDraftSession(
  session: Omit<LeagueBuilderMlbDraftSession, 'createdDate' | 'lastModified'> & {
    createdDate?: string;
    lastModified?: string;
  },
): Promise<LeagueBuilderMlbDraftSession> {
  const db = await initLeagueBuilderDatabase();
  const now = nowISO();
  const id = createMlbDraftSessionId(session.leagueId, session.seasonNumber);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MLB_DRAFT_SESSIONS, 'readwrite');
    const store = tx.objectStore(STORES.MLB_DRAFT_SESSIONS);
    const read = store.get(id);
    let fullSession: LeagueBuilderMlbDraftSession | null = null;
    read.onsuccess = () => {
      const existing = read.result as LeagueBuilderMlbDraftSession | undefined;
      try {
        const candidate: LeagueBuilderMlbDraftSession = {
          ...session,
          createdDate: session.createdDate ?? existing?.createdDate ?? now,
          lastModified: now,
        };
        if (!existing?.draftManifest && candidate.draftManifest?.phase === 'MLB') {
          throw new Error('MLB draft confirmation must freeze the session and RegisteredPool together.');
        }
        const draftManifest = preservePersistedSnakeDraftManifest(existing, candidate);
        const rosterHandoff = preservePersistedSnakeRosterHandoff(existing, candidate);
        const farmProspectSnapshot = preservePersistedFarmProspectSnapshot(existing, candidate);
        fullSession = {
          ...candidate,
          ...(draftManifest ? { draftManifest } : {}),
          ...(rosterHandoff ? { rosterHandoff } : {}),
          ...(farmProspectSnapshot ? { farmProspectSnapshot } : {}),
        };
        store.put(fullSession);
      } catch (error) {
        reject(error);
        tx.abort();
      }
    };
    read.onerror = () => reject(read.error);
    tx.oncomplete = () => {
      if (!fullSession) {
        reject(new Error(`MLB draft session ${id} was not saved.`));
        return;
      }
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-league-builder', 'mlbDraftSessions', fullSession.id, fullSession);
      void persistIndependentSeatBoards(fullSession)
        .then(() => getMlbDraftSession(fullSession!.leagueId, fullSession!.seasonNumber))
        .then((hydrated) => resolve(hydrated ?? fullSession!))
        .catch(reject);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export type SnakeCompanionState = NonNullable<LeagueBuilderMlbDraftSession['snakeCompanions']>;

export async function updateMlbDraftSessionAtomically(
  leagueId: string,
  seasonNumber: number,
  update: (current: LeagueBuilderMlbDraftSession) => LeagueBuilderMlbDraftSession,
): Promise<LeagueBuilderMlbDraftSession> {
  const db = await initLeagueBuilderDatabase();
  const id = createMlbDraftSessionId(leagueId, seasonNumber);
  const now = nowISO();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.MLB_DRAFT_SESSIONS, STORES.SNAKE_SEAT_BOARDS], 'readwrite');
    const store = tx.objectStore(STORES.MLB_DRAFT_SESSIONS);
    const read = store.get(id);
    const boardsRead = tx.objectStore(STORES.SNAKE_SEAT_BOARDS).index('sessionId').getAll(id);
    let saved: LeagueBuilderMlbDraftSession | null = null;
    let wrote = false;
    const boardRowsWritten: SnakeSeatBoardStoreRecord[] = [];
    let completedReads = 0;

    const apply = () => {
      completedReads += 1;
      if (completedReads !== 2) return;
      const stored = read.result as LeagueBuilderMlbDraftSession | undefined;
      if (!stored) {
        reject(new Error(`MLB draft session ${id} does not exist.`));
        tx.abort();
        return;
      }
      const current = hydrateIndependentSeatBoards(
        stored,
        boardsRead.result as SnakeSeatBoardStoreRecord[],
      );
      let updated: LeagueBuilderMlbDraftSession;
      try {
        updated = update(current);
      } catch (error) {
        reject(error);
        tx.abort();
        return;
      }
      if (updated === current) {
        saved = current;
        return;
      }
      saved = {
        ...updated,
        id: current.id,
        leagueId: current.leagueId,
        seasonNumber: current.seasonNumber,
        createdDate: current.createdDate,
        lastModified: now,
      };
      wrote = true;
      store.put(saved);
      const seatBoardStore = tx.objectStore(STORES.SNAKE_SEAT_BOARDS);
      const existingRows = new Map(
        (boardsRead.result as SnakeSeatBoardStoreRecord[]).map((row) => [row.id, row]),
      );
      const nextRows = [
        ...Object.entries(saved.seatBoards ?? {}).map(([teamId, board]) => ({ teamId, board, phase: 'MLB' as const })),
        ...Object.entries(saved.farmSeatBoards ?? {}).map(([teamId, board]) => ({ teamId, board, phase: 'FARM' as const })),
      ];
      for (const row of nextRows) {
        const boardId = snakeSeatBoardStoreId(saved.id, row.phase, row.teamId);
        const existing = existingRows.get(boardId);
        if (existing && existing.revision >= row.board.revision) continue;
        const record: SnakeSeatBoardStoreRecord = {
          id: boardId,
          sessionId: saved.id,
          leagueId: saved.leagueId,
          seasonNumber: saved.seasonNumber,
          teamId: row.teamId,
          phase: row.phase,
          board: row.board,
          revision: row.board.revision,
          lastModified: now,
        };
        seatBoardStore.put(record);
        boardRowsWritten.push(record);
      }
    };
    read.onsuccess = apply;
    boardsRead.onsuccess = apply;
    read.onerror = () => reject(read.error);
    boardsRead.onerror = () => reject(boardsRead.error);
    tx.oncomplete = () => {
      if (!saved) {
        reject(new Error(`MLB draft session ${id} was not updated.`));
        return;
      }
      if (wrote && !syncEngine.isSuppressed()) {
        syncEngine.upsert('kbl-league-builder', 'mlbDraftSessions', saved.id, saved);
        for (const row of boardRowsWritten) {
          syncEngine.upsert('kbl-league-builder', 'snakeSeatBoards', row.id, row);
        }
      }
      void getMlbDraftSession(saved.leagueId, saved.seasonNumber)
        .then((hydrated) => resolve(hydrated ?? saved!))
        .catch(reject);
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error(`MLB draft session ${id} update was aborted.`));
  });
}

async function patchIndependentSeatBoard(input: {
  leagueId: string;
  seasonNumber: number;
  teamId: string;
  phase: 'MLB';
  board: SnakeSeatBoardRecord;
  expectedBoardRevision: number;
  authorize?: (session: LeagueBuilderMlbDraftSession) => void;
} | {
  leagueId: string;
  seasonNumber: number;
  teamId: string;
  phase: 'FARM';
  board: FarmSeatBoardRecord;
  expectedBoardRevision: number;
  authorize?: (session: LeagueBuilderMlbDraftSession) => void;
}): Promise<LeagueBuilderMlbDraftSession> {
  const db = await initLeagueBuilderDatabase();
  const sessionId = createMlbDraftSessionId(input.leagueId, input.seasonNumber);
  const boardId = snakeSeatBoardStoreId(sessionId, input.phase, input.teamId);
  const now = nowISO();
  let record: SnakeSeatBoardStoreRecord | null = null;

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORES.MLB_DRAFT_SESSIONS, STORES.SNAKE_SEAT_BOARDS], 'readwrite');
    const sessionRead = tx.objectStore(STORES.MLB_DRAFT_SESSIONS).get(sessionId);
    const boardStore = tx.objectStore(STORES.SNAKE_SEAT_BOARDS);
    const boardRead = boardStore.get(boardId);
    let completedReads = 0;
    const apply = () => {
      completedReads += 1;
      if (completedReads !== 2) return;
      try {
        const session = sessionRead.result as LeagueBuilderMlbDraftSession | undefined;
        if (!session) throw new Error(`MLB draft session ${sessionId} does not exist.`);
        input.authorize?.(session);
        const storedRecord = boardRead.result as SnakeSeatBoardStoreRecord | undefined;
        const embeddedBoard = input.phase === 'MLB'
          ? session.seatBoards?.[input.teamId]
          : session.farmSeatBoards?.[input.teamId];
        const currentBoard = storedRecord?.board ?? embeddedBoard;
        if (!currentBoard || currentBoard.revision !== input.expectedBoardRevision) {
          throw new Error(`${input.phase === 'FARM' ? 'Farm seat' : 'Seat'} board ${input.teamId} changed before it could be saved.`);
        }
        if (input.board.revision !== input.expectedBoardRevision + 1) {
          throw new Error(`${input.phase === 'FARM' ? 'Farm seat' : 'Seat'} board ${input.teamId} submitted an invalid next revision.`);
        }
        record = {
          id: boardId,
          sessionId,
          leagueId: input.leagueId,
          seasonNumber: input.seasonNumber,
          teamId: input.teamId,
          phase: input.phase,
          board: input.board,
          revision: input.board.revision,
          lastModified: now,
        };
        boardStore.put(record);
      } catch (error) {
        reject(error);
        tx.abort();
      }
    };
    sessionRead.onsuccess = apply;
    boardRead.onsuccess = apply;
    sessionRead.onerror = () => reject(sessionRead.error);
    boardRead.onerror = () => reject(boardRead.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error(`Seat board ${input.teamId} update was aborted.`));
  });

  const syncedRecord = record as SnakeSeatBoardStoreRecord | null;
  if (!syncedRecord) throw new Error(`Seat board ${input.teamId} was not saved.`);
  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert('kbl-league-builder', 'snakeSeatBoards', syncedRecord.id, syncedRecord);
  }
  const hydrated = await getMlbDraftSession(input.leagueId, input.seasonNumber);
  if (!hydrated) throw new Error(`MLB draft session ${sessionId} does not exist.`);
  return hydrated;
}

/**
 * Companion writer: re-read the freshest session and replace only snakeCompanions.
 * Once a valid room code exists, this helper preserves it for the session lifetime.
 */
export async function patchMlbDraftSessionSnakeCompanions(input: {
  leagueId: string;
  seasonNumber?: number;
  patch: (
    current: SnakeCompanionState | undefined,
    session: LeagueBuilderMlbDraftSession,
  ) => SnakeCompanionState;
}): Promise<LeagueBuilderMlbDraftSession> {
  return updateMlbDraftSessionAtomically(input.leagueId, input.seasonNumber ?? 1, (current) => {
    const requested = input.patch(current.snakeCompanions, current);
    const currentCode = current.snakeCompanions?.roomCode;
    const snakeCompanions = currentCode && /^\d{4}$/.test(currentCode)
      ? { ...requested, roomCode: currentCode }
      : requested;
    if (JSON.stringify(snakeCompanions) === JSON.stringify(current.snakeCompanions)) return current;
    return {
      ...current,
      snakeCompanions,
    };
  });
}

/**
 * Main-device emergency path when an approved companion disappears. The claim
 * revocation and privacy-cover switch are one session transaction, so there is
 * no frame in which the shared iPad can expose that club's desk uncovered.
 */
export async function fallBackCompanionSeatToHotseat(input: {
  leagueId: string;
  seasonNumber?: number;
  claimId?: string;
  claimVersion?: number;
  deviceId: string;
  teamId: string;
}): Promise<LeagueBuilderMlbDraftSession> {
  return updateMlbDraftSessionAtomically(input.leagueId, input.seasonNumber ?? 1, (current) => {
    const claims = current.snakeCompanions?.claims ?? [];
    const claim = claims.find((candidate) => (
      candidate.deviceId === input.deviceId
      && candidate.teamId === input.teamId
      && (input.claimId === undefined || candidate.claimId === input.claimId)
    ));
    if (!claim || claim.status !== 'approved' || (claim.claimVersion ?? 0) !== (input.claimVersion ?? 0)) {
      throw new Error('THAT COMPANION SEAT CHANGED. RELOAD THE ROOM.');
    }
    const club = current.snakeSetup?.clubs.find((candidate) => candidate.teamId === input.teamId);
    if (!club) throw new Error('THAT DRAFT SEAT NO LONGER EXISTS.');
    return {
      ...current,
      snakeCompanions: current.snakeCompanions ? {
        ...current.snakeCompanions,
        claims: claims.map((candidate) => candidate.teamId === input.teamId && candidate.status !== 'revoked'
          ? { ...candidate, status: 'revoked' as const, claimVersion: (candidate.claimVersion ?? 0) + 1 }
          : candidate),
      } : undefined,
      snakeSetup: current.snakeSetup ? {
        ...current.snakeSetup,
        clubs: current.snakeSetup.clubs.map((candidate) => candidate.teamId === input.teamId
          ? { ...candidate, hotseat: true }
          : candidate),
      } : undefined,
      revision: (current.revision ?? 0) + 1,
    };
  });
}

function approvedCompanionClaimForSeat(
  session: LeagueBuilderMlbDraftSession,
  deviceId: string,
  teamId: string,
): void {
  const claim = session.snakeCompanions?.claims.find((candidate) => (
    candidate.deviceId === deviceId && candidate.teamId === teamId && candidate.status === 'approved'
  ));
  if (!claim) throw new Error('MAIN-DEVICE APPROVAL IS REQUIRED.');
}

/** Authorized companion offer writer with current-revision and seat checks. */
export async function postApprovedCompanionTradeOffer(input: {
  leagueId: string;
  seasonNumber?: number;
  deviceId: string;
  teamId: string;
  proposal: {
    buyerTeamId: string;
    sellerTeamId: string;
    targetPick: number;
    offerPickNumbers: number[];
    receivePickNumbers: number[];
    offerValue: number;
    receiveValue: number;
    sellerPremium: number;
    sessionRevision: number;
  };
  postedAt: string;
}): Promise<LeagueBuilderMlbDraftSession> {
  return updateMlbDraftSessionAtomically(input.leagueId, input.seasonNumber ?? 1, (current) => {
    approvedCompanionClaimForSeat(current, input.deviceId, input.teamId);
    if (input.teamId !== input.proposal.buyerTeamId) throw new Error('YOU CAN ONLY POST FOR YOUR OWN CLUB.');
    if ((current.revision ?? 0) !== input.proposal.sessionRevision) throw new Error('THE DRAFT MOVED ON — REFRESH.');
    if (!Number.isFinite(input.proposal.sellerPremium)) throw new Error('THIS PACKAGE NO LONGER MATCHES THE POSTED GUIDE.');
    const offer: SnakeOpenTradeOffer = {
      id: `snake-offer-mlb-${current.id}-${(current.revision ?? 0) + 1}`,
      phase: 'MLB',
      buyerTeamId: input.proposal.buyerTeamId,
      sellerTeamId: input.proposal.sellerTeamId,
      targetPick: input.proposal.targetPick,
      offerPickNumbers: [...input.proposal.offerPickNumbers],
      receivePickNumbers: [...input.proposal.receivePickNumbers],
      offerValue: input.proposal.offerValue,
      receiveValue: input.proposal.receiveValue,
      sellerPremium: input.proposal.sellerPremium,
      postedSessionRevision: input.proposal.sessionRevision,
      buyerNod: true,
      sellerNod: false,
      postedAt: input.postedAt,
    };
    const pair = [offer.buyerTeamId, offer.sellerTeamId].sort().join('::');
    return {
      ...current,
      openTradeOffers: [
        ...(current.openTradeOffers ?? []).filter((row) => [row.buyerTeamId, row.sellerTeamId].sort().join('::') !== pair),
        offer,
      ],
      revision: (current.revision ?? 0) + 1,
    };
  });
}

export async function respondApprovedCompanionTradeOffer(input: {
  leagueId: string;
  seasonNumber?: number;
  deviceId: string;
  teamId: string;
  offerId: string;
  action: 'NOD' | 'WITHDRAW' | 'DECLINE';
}): Promise<LeagueBuilderMlbDraftSession> {
  return updateMlbDraftSessionAtomically(input.leagueId, input.seasonNumber ?? 1, (current) => {
    approvedCompanionClaimForSeat(current, input.deviceId, input.teamId);
    const offer = current.openTradeOffers?.find((row) => row.id === input.offerId);
    if (!offer) throw new Error('THAT OFFER IS NO LONGER OPEN.');
    if (input.teamId !== offer.buyerTeamId && input.teamId !== offer.sellerTeamId) {
      throw new Error('THAT OFFER DOES NOT BELONG TO YOUR CLUB.');
    }
    if (input.action === 'WITHDRAW' && input.teamId !== offer.buyerTeamId) {
      throw new Error('ONLY THE BUYING CLUB CAN WITHDRAW THIS OFFER.');
    }
    const openTradeOffers = input.action === 'NOD'
      ? current.openTradeOffers?.map((row) => row.id !== input.offerId ? row : {
          ...row,
          ...(input.teamId === row.buyerTeamId ? { buyerNod: true } : { sellerNod: true }),
        })
      : current.openTradeOffers?.filter((row) => row.id !== input.offerId);
    return { ...current, openTradeOffers, revision: (current.revision ?? 0) + 1 };
  });
}

/**
 * The only writer allowed to introduce a roster-handoff marker. Call it after
 * the idempotent roster commit succeeds; retries return the first durable proof.
 */
export async function markSnakeRosterHandoff(input: {
  leagueId: string;
  seasonNumber: number;
  phase: 'MLB' | 'FARM';
  sourceSessionId: string;
  manifestPoolIdentity: string;
  committedAt: string;
}): Promise<LeagueBuilderMlbDraftSession> {
  return updateMlbDraftSessionAtomically(input.leagueId, input.seasonNumber, (current) => {
    const manifest = readSnakeDraftTruth(current, input.phase).manifest;
    if (!manifest
      || manifest.source.sessionId !== input.sourceSessionId
      || manifest.pool.identity !== input.manifestPoolIdentity) {
      throw new Error('The roster commit does not match the current frozen snake draft.');
    }
    if (current.rosterHandoff) {
      validateSnakeRosterHandoff(current, input.phase);
      return current;
    }
    return {
      ...current,
      rosterHandoff: buildSnakeRosterHandoff(current, input.phase, input.committedAt),
      revision: (current.revision ?? 0) + 1,
    };
  });
}

/**
 * Companion-only board writer. Authorization, seat binding, completion state,
 * and the seat-local optimistic lock are all checked against the same fresh
 * session row inside one IndexedDB transaction.
 */
export async function patchApprovedCompanionSeatBoard(input: {
  leagueId: string;
  seasonNumber?: number;
  deviceId: string;
  teamId: string;
  board: SnakeSeatBoardRecord;
  expectedBoardRevision: number;
}): Promise<LeagueBuilderMlbDraftSession> {
  return patchIndependentSeatBoard({
    ...input,
    seasonNumber: input.seasonNumber ?? 1,
    phase: 'MLB',
    authorize: (current) => {
      const complete = Boolean(current.draftManifest)
        || (current.pickOrder.length > 0 && current.currentPickIndex >= current.pickOrder.length);
      if (complete) throw new Error('THIS DRAFT IS COMPLETE.');
      const claim = current.snakeCompanions?.claims.find((candidate) => (
        candidate.deviceId === input.deviceId && candidate.status === 'approved'
      ));
      if (!claim || claim.teamId !== input.teamId) {
        throw new Error('MAIN-DEVICE APPROVAL IS REQUIRED.');
      }
    },
  });
}

/**
 * Companion board writer: replace only one seat's board after checking that
 * seat's revision. Session-level draft progress is deliberately not part of
 * the optimistic-lock check because picks may advance while a GM edits a board.
 */
export async function patchMlbDraftSessionSeatBoard(input: {
  leagueId: string;
  seasonNumber?: number;
  teamId: string;
  board: SnakeSeatBoardRecord;
  expectedBoardRevision: number;
}): Promise<LeagueBuilderMlbDraftSession> {
  return patchIndependentSeatBoard({
    ...input,
    seasonNumber: input.seasonNumber ?? 1,
    phase: 'MLB',
  });
}

/** FARM companion/main-desk writer with the same seat-local optimistic lock. */
export async function patchMlbDraftSessionFarmSeatBoard(input: {
  leagueId: string;
  seasonNumber: number;
  teamId: string;
  board: FarmSeatBoardRecord;
  expectedBoardRevision: number;
}): Promise<LeagueBuilderMlbDraftSession> {
  return patchIndependentSeatBoard({ ...input, phase: 'FARM' });
}

function mergeFreshSeatBoards(
  fresh: LeagueBuilderMlbDraftSession['seatBoards'],
  incoming: LeagueBuilderMlbDraftSession['seatBoards'],
): LeagueBuilderMlbDraftSession['seatBoards'] {
  if (!fresh) return incoming;
  if (!incoming) return fresh;
  const merged = { ...fresh };
  for (const [teamId, board] of Object.entries(incoming)) {
    const current = fresh[teamId];
    if (current && board.revision === current.revision && JSON.stringify(board) !== JSON.stringify(current)) {
      throw new Error(`Seat board ${teamId} changed before this room action could be saved.`);
    }
    if (!current || board.revision > current.revision) merged[teamId] = board;
  }
  return merged;
}

function mergeFreshFarmSeatBoards(
  fresh: LeagueBuilderMlbDraftSession['farmSeatBoards'],
  incoming: LeagueBuilderMlbDraftSession['farmSeatBoards'],
): LeagueBuilderMlbDraftSession['farmSeatBoards'] {
  if (!fresh) return incoming;
  if (!incoming) return fresh;
  const merged = { ...fresh };
  for (const [teamId, board] of Object.entries(incoming)) {
    const current = fresh[teamId];
    if (current && board.revision === current.revision && JSON.stringify(board) !== JSON.stringify(current)) {
      throw new Error(`Farm seat board ${teamId} changed before this room action could be saved.`);
    }
    if (!current || board.revision > current.revision) merged[teamId] = board;
  }
  return merged;
}

function restoreCorrectionSeatBoards(
  fresh: LeagueBuilderMlbDraftSession['seatBoards'],
  prior: LeagueBuilderMlbDraftSession['seatBoards'],
  postAction: LeagueBuilderMlbDraftSession['seatBoards'],
): LeagueBuilderMlbDraftSession['seatBoards'] {
  if (!prior) return fresh;
  const restored = { ...(fresh ?? {}) };
  for (const [teamId, priorBoard] of Object.entries(prior)) {
    const current = fresh?.[teamId];
    const systemBoard = postAction?.[teamId];
    const safeToRestore = !current
      || JSON.stringify(current) === JSON.stringify(priorBoard)
      || (systemBoard !== undefined && JSON.stringify(current) === JSON.stringify(systemBoard));
    if (safeToRestore) {
      restored[teamId] = {
        ...priorBoard,
        revision: Math.max(priorBoard.revision, current?.revision ?? priorBoard.revision) + 1,
      };
    }
  }
  return restored;
}

function restoreCorrectionFarmSeatBoards(
  fresh: LeagueBuilderMlbDraftSession['farmSeatBoards'],
  prior: LeagueBuilderMlbDraftSession['farmSeatBoards'],
  postAction: LeagueBuilderMlbDraftSession['farmSeatBoards'],
): LeagueBuilderMlbDraftSession['farmSeatBoards'] {
  if (!prior) return fresh;
  const restored = { ...(fresh ?? {}) };
  for (const [teamId, priorBoard] of Object.entries(prior)) {
    const current = fresh?.[teamId];
    const systemBoard = postAction?.[teamId];
    const safeToRestore = !current
      || JSON.stringify(current) === JSON.stringify(priorBoard)
      || (systemBoard !== undefined && JSON.stringify(current) === JSON.stringify(systemBoard));
    if (safeToRestore) {
      restored[teamId] = {
        ...priorBoard,
        revision: Math.max(priorBoard.revision, current?.revision ?? priorBoard.revision) + 1,
      };
    }
  }
  return restored;
}

function assertRegisteredPoolMatchesMlbManifest(
  pool: RegisteredPool,
  session: LeagueBuilderMlbDraftSession,
): void {
  const truth = readSnakeDraftTruth(session, 'MLB');
  const manifest = truth.manifest;
  if (!manifest) throw new Error('The MLB snake draft must have a manifest before its pool can freeze.');
  if (pool.leagueId !== manifest.leagueId) throw new Error('The frozen RegisteredPool belongs to a different league.');
  const poolRows = [...pool.players].sort((left, right) => left.id.localeCompare(right.id));
  const manifestIds = [...manifest.pool.playerIds].sort((left, right) => left.localeCompare(right));
  if (poolRows.length !== manifestIds.length || poolRows.some((row, index) => row.id !== manifestIds[index])) {
    throw new Error('The completed snake manifest does not match the exact RegisteredPool membership.');
  }
  for (const row of poolRows) {
    if (manifest.pool.mlbIvByPlayerId?.[row.id] !== row.iv) {
      throw new Error(`The completed snake manifest does not match RegisteredPool IV for ${row.id}.`);
    }
  }
}

/**
 * MLB confirmation boundary: validate and persist the immutable manifest and
 * its exact RegisteredPool in one transaction. This closes the final pool-edit
 * vs. confirmation race; neither row can land without the other.
 */
export async function freezeMlbDraftRoomSessionWithRegisteredPool(input: {
  session: LeagueBuilderMlbDraftSession;
  registeredPool: RegisteredPool;
  expectedRevision: number;
}): Promise<LeagueBuilderMlbDraftSession> {
  const db = await initLeagueBuilderDatabase();
  const id = createMlbDraftSessionId(input.session.leagueId, input.session.seasonNumber);
  const now = nowISO();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.MLB_DRAFT_SESSIONS, STORES.REGISTERED_POOLS], 'readwrite');
    const sessionStore = tx.objectStore(STORES.MLB_DRAFT_SESSIONS);
    const poolStore = tx.objectStore(STORES.REGISTERED_POOLS);
    const sessionRead = sessionStore.get(id);
    const poolRead = poolStore.get(input.session.leagueId);
    let currentSession: LeagueBuilderMlbDraftSession | null = null;
    let currentPool: RegisteredPool | null = null;
    let reads = 0;
    let saved: LeagueBuilderMlbDraftSession | null = null;
    let wrote = false;
    const finishRead = () => {
      reads += 1;
      if (reads !== 2) return;
      try {
        if (!currentSession || !currentPool) throw new Error('The snake draft session or RegisteredPool is missing.');
        if (currentSession.draftManifest) {
          assertRegisteredPoolMatchesMlbManifest(currentPool, currentSession);
          if (!input.session.draftManifest) throw new Error('A persisted snake draft manifest cannot be removed.');
          readSnakeDraftTruth(input.session, 'MLB');
          saved = currentSession;
          return;
        }
        if ((currentSession.revision ?? 0) !== input.expectedRevision) {
          throw new Error('The draft moved before confirmation could be saved. Refresh and try again.');
        }
        if (JSON.stringify(currentPool) !== JSON.stringify(input.registeredPool)) {
          throw new Error('The player pool changed before confirmation. Refresh and review the final pool.');
        }
        assertRegisteredPoolMatchesMlbManifest(input.registeredPool, input.session);
        saved = {
          ...input.session,
          id: currentSession.id,
          leagueId: currentSession.leagueId,
          seasonNumber: currentSession.seasonNumber,
          createdDate: currentSession.createdDate,
          lastModified: now,
          snakeCompanions: currentSession.snakeCompanions ?? input.session.snakeCompanions,
          seatBoards: mergeFreshSeatBoards(currentSession.seatBoards, input.session.seatBoards),
          farmSeatBoards: mergeFreshFarmSeatBoards(currentSession.farmSeatBoards, input.session.farmSeatBoards),
          revision: Math.max(input.session.revision ?? 0, (currentSession.revision ?? 0) + 1),
        };
        sessionStore.put(saved);
        poolStore.put(input.registeredPool);
        wrote = true;
      } catch (error) {
        reject(error);
        tx.abort();
      }
    };
    sessionRead.onsuccess = () => { currentSession = sessionRead.result ?? null; finishRead(); };
    poolRead.onsuccess = () => { currentPool = poolRead.result ?? null; finishRead(); };
    sessionRead.onerror = () => reject(sessionRead.error);
    poolRead.onerror = () => reject(poolRead.error);
    tx.oncomplete = () => {
      if (!saved) return reject(new Error(`MLB draft session ${id} was not frozen.`));
      if (wrote && !syncEngine.isSuppressed()) {
        syncEngine.upsert('kbl-league-builder', 'registeredPools', input.registeredPool.leagueId, input.registeredPool);
        syncEngine.upsert('kbl-league-builder', 'mlbDraftSessions', saved.id, saved);
      }
      resolve(saved);
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error(`MLB draft session ${id} freeze was aborted.`));
  });
}

/**
 * Main-room writer: saves room-owned state while carrying forward the freshest
 * companion field and the newest revision of every seat board.
 */
export async function saveMlbDraftRoomSession(
  incoming: LeagueBuilderMlbDraftSession,
  expectedRevision: number,
): Promise<LeagueBuilderMlbDraftSession> {
  const latest = incoming.correctionSnapshots?.[0];
  const prepared = latest && !latest.postActionSeatBoards && !latest.postActionFarmSeatBoards
    ? {
        ...incoming,
        correctionSnapshots: [{
          ...latest,
          ...(incoming.seatBoards ? { postActionSeatBoards: structuredClone(incoming.seatBoards) } : {}),
          ...(incoming.farmSeatBoards ? { postActionFarmSeatBoards: structuredClone(incoming.farmSeatBoards) } : {}),
        }],
      }
    : incoming;
  const saved = await updateMlbDraftSessionAtomically(prepared.leagueId, prepared.seasonNumber, (fresh) => {
    if (fresh.draftManifest && prepared.draftManifest) {
      // Two devices may confirm from the same pre-freeze revision with different
      // timestamps. Validate both candidates, then let the first persisted truth win.
      readSnakeDraftTruth(fresh, fresh.draftManifest.phase);
      readSnakeDraftTruth(prepared, fresh.draftManifest.phase);
      return fresh;
    }
    if (fresh.draftManifest && !prepared.draftManifest) {
      preservePersistedSnakeDraftManifest(fresh, prepared);
    }
    if ((fresh.revision ?? 0) !== expectedRevision) {
      throw new Error('The draft moved before this action could be saved. Refresh and try again.');
    }
    if (prepared.draftManifest?.phase === 'MLB') {
      throw new Error('MLB draft confirmation must freeze the session and RegisteredPool together.');
    }
    const draftManifest = preservePersistedSnakeDraftManifest(fresh, prepared);
    const rosterHandoff = preservePersistedSnakeRosterHandoff(fresh, prepared);
    const farmProspectSnapshot = preservePersistedFarmProspectSnapshot(fresh, prepared);
    const correction = fresh.correctionSnapshots?.[0];
    const restoringCorrection = Boolean(correction && !prepared.correctionSnapshots);
    const seatBoards = restoringCorrection
      ? restoreCorrectionSeatBoards(fresh.seatBoards, prepared.seatBoards, correction?.postActionSeatBoards)
      : mergeFreshSeatBoards(fresh.seatBoards, prepared.seatBoards);
    const farmSeatBoards = restoringCorrection
      ? restoreCorrectionFarmSeatBoards(fresh.farmSeatBoards, prepared.farmSeatBoards, correction?.postActionFarmSeatBoards)
      : mergeFreshFarmSeatBoards(fresh.farmSeatBoards, prepared.farmSeatBoards);
    return {
      ...prepared,
      ...(draftManifest ? { draftManifest } : {}),
      ...(rosterHandoff ? { rosterHandoff } : {}),
      ...(farmProspectSnapshot ? { farmProspectSnapshot } : {}),
      snakeCompanions: fresh.snakeCompanions ?? prepared.snakeCompanions,
      seatBoards,
      farmSeatBoards,
      revision: Math.max(prepared.revision ?? 0, (fresh.revision ?? 0) + 1),
    };
  });
  await persistIndependentSeatBoards(saved);
  return (await getMlbDraftSession(saved.leagueId, saved.seasonNumber)) ?? saved;
}

/** One-transaction Run It Back reset across every League Builder store it mutates. */
export async function resetCompletedDraftArcAtomically(leagueId: string): Promise<void> {
  const db = await initLeagueBuilderDatabase();
  const mlbId = createMlbDraftSessionId(leagueId, 1);
  const farmSnakeId = createMlbDraftSessionId(leagueId, 2);
  const startupId = createStartupDraftSessionId(leagueId, 1);
  const auctionId = createAuctionSessionId(leagueId, 1);
  const farmAuctionId = createFarmAuctionSessionId(leagueId, 1);
  const storeNames = [
    STORES.LEAGUE_TEMPLATES,
    STORES.GLOBAL_PLAYERS,
    STORES.TEAM_ROSTERS,
    STORES.SCOUT_PROFILES,
    STORES.STARTUP_DRAFT_SESSIONS,
    STORES.REGISTERED_POOLS,
    STORES.MLB_DRAFT_SESSIONS,
    STORES.SNAKE_SEAT_BOARDS,
    STORES.AUCTION_SESSIONS,
  ];
  const resetAt = nowISO();
  let mlbResetReceipt: SnakeDraftResetReceipt | undefined;
  let farmResetReceipt: SnakeDraftResetReceipt | undefined;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite');
    const leagueRead = tx.objectStore(STORES.LEAGUE_TEMPLATES).get(leagueId);
    const playersRead = tx.objectStore(STORES.GLOBAL_PLAYERS).getAll();
    const rostersRead = tx.objectStore(STORES.TEAM_ROSTERS).getAll();
    const scoutsRead = tx.objectStore(STORES.SCOUT_PROFILES).getAll();
    const poolRead = tx.objectStore(STORES.REGISTERED_POOLS).get(leagueId);
    const mlbRead = tx.objectStore(STORES.MLB_DRAFT_SESSIONS).get(mlbId);
    const farmSnakeRead = tx.objectStore(STORES.MLB_DRAFT_SESSIONS).get(farmSnakeId);
    const seatBoardsRead = tx.objectStore(STORES.SNAKE_SEAT_BOARDS).index('leagueId').getAll(leagueId);
    const farmAuctionRead = tx.objectStore(STORES.AUCTION_SESSIONS).get(farmAuctionId);
    const requests = [leagueRead, playersRead, rostersRead, scoutsRead, poolRead, mlbRead, farmSnakeRead, seatBoardsRead, farmAuctionRead];
    let completedReads = 0;
    const updatedPlayers: Player[] = [];
    const deletedPlayerIds: string[] = [];
    const updatedRosters: TeamRoster[] = [];
    const deletedScoutIds: string[] = [];
    const deletedSeatBoardIds: string[] = [];
    const apply = () => {
      completedReads += 1;
      if (completedReads !== requests.length) return;
      try {
        const league = leagueRead.result as LeagueTemplate | undefined;
        if (!league) throw new Error('Run It Back could not find the league.');
        const pool = poolRead.result as RegisteredPool | undefined;
        const mlbSnake = mlbRead.result as LeagueBuilderMlbDraftSession | undefined;
        const askSalaryByPlayerId = new Map((pool?.players ?? []).map((row) => [row.id, row.salary]));
        const farmSnake = farmSnakeRead.result as LeagueBuilderMlbDraftSession | undefined;
        const farmAuction = farmAuctionRead.result as LeagueBuilderAuctionSession | undefined;
        const generatedFarmIds = new Set<string>();
        if (mlbSnake?.draftManifest) mlbResetReceipt = buildSnakeDraftResetReceipt(mlbSnake, resetAt);
        if (farmSnake?.draftManifest) farmResetReceipt = buildSnakeDraftResetReceipt(farmSnake, resetAt);
        if (farmSnake) {
          const picks = farmSnake.draftManifest
            ? readSnakeDraftTruth(farmSnake, 'FARM').completedPicks
            : farmSnake.draftPhase === 'FARM' ? farmSnake.completedPicks : [];
          for (const pick of picks) generatedFarmIds.add(pick.playerId);
        }
        if (farmAuction?.session.state === 'AUCTION_COMPLETE') {
          for (const result of farmAuction.session.results) {
            if (result.disposition === 'SOLD') generatedFarmIds.add(result.playerId);
          }
        }
        const playerStore = tx.objectStore(STORES.GLOBAL_PLAYERS);
        for (const player of playersRead.result as Player[]) {
          const assignment = player.leagueAssignments?.find((row) => row.leagueId === leagueId);
          if (!assignment?.teamId) continue;
          if (
            assignment.rosterStatus === 'FARM'
            && generatedFarmIds.has(player.id)
            && player.draftedAsFarmProspect === true
          ) {
            playerStore.delete(player.id);
            deletedPlayerIds.push(player.id);
            continue;
          }
          const withoutSettlement = { ...player };
          delete withoutSettlement.settledSalary;
          const next: Player = {
            ...withoutSettlement,
            ...(askSalaryByPlayerId.has(player.id) ? { salary: askSalaryByPlayerId.get(player.id)! } : {}),
            leagueAssignments: (player.leagueAssignments ?? []).map((row) => row.leagueId === leagueId
              ? { ...row, teamId: '', rosterStatus: 'FREE_AGENT' as const }
              : row),
          };
          playerStore.put(next);
          updatedPlayers.push(next);
        }
        const leagueTeamIds = new Set(league.teamIds);
        const rosterStore = tx.objectStore(STORES.TEAM_ROSTERS);
        for (const roster of rostersRead.result as TeamRoster[]) {
          if (!leagueTeamIds.has(roster.teamId)) continue;
          const next: TeamRoster = { ...roster, mlbRoster: [], farmRoster: [] };
          rosterStore.put(next);
          updatedRosters.push(next);
        }
        const scoutStore = tx.objectStore(STORES.SCOUT_PROFILES);
        for (const scout of scoutsRead.result as LeagueBuilderScoutProfile[]) {
          if (scout.leagueId !== leagueId) continue;
          scoutStore.delete(scout.id);
          deletedScoutIds.push(scout.id);
        }
        tx.objectStore(STORES.STARTUP_DRAFT_SESSIONS).delete(startupId);
        const snakeStore = tx.objectStore(STORES.MLB_DRAFT_SESSIONS);
        snakeStore.delete(mlbId);
        snakeStore.delete(farmSnakeId);
        const seatBoardStore = tx.objectStore(STORES.SNAKE_SEAT_BOARDS);
        for (const row of seatBoardsRead.result as SnakeSeatBoardStoreRecord[]) {
          if (row.sessionId !== mlbId && row.sessionId !== farmSnakeId) continue;
          seatBoardStore.delete(row.id);
          deletedSeatBoardIds.push(row.id);
        }
        const auctionStore = tx.objectStore(STORES.AUCTION_SESSIONS);
        auctionStore.delete(auctionId);
        auctionStore.delete(farmAuctionId);
      } catch (error) {
        reject(error);
        tx.abort();
      }
    };
    for (const request of requests) {
      request.onsuccess = apply;
      request.onerror = () => reject(request.error);
    }
    tx.oncomplete = () => {
      if (!syncEngine.isSuppressed()) {
        for (const player of updatedPlayers) syncEngine.upsert('kbl-league-builder', 'globalPlayers', player.id, player);
        for (const id of deletedPlayerIds) syncEngine.remove('kbl-league-builder', 'globalPlayers', id);
        for (const roster of updatedRosters) syncEngine.upsert('kbl-league-builder', 'teamRosters', roster.teamId, roster);
        for (const id of deletedScoutIds) syncEngine.remove('kbl-league-builder', 'scoutProfiles', id);
        syncEngine.remove('kbl-league-builder', 'startupDraftSessions', startupId);
        syncEngine.remove('kbl-league-builder', 'mlbDraftSessions', mlbId, mlbResetReceipt);
        syncEngine.remove('kbl-league-builder', 'mlbDraftSessions', farmSnakeId, farmResetReceipt);
        for (const id of deletedSeatBoardIds) syncEngine.remove('kbl-league-builder', 'snakeSeatBoards', id);
        syncEngine.remove('kbl-league-builder', 'auctionSessions', auctionId);
        syncEngine.remove('kbl-league-builder', 'auctionSessions', farmAuctionId);
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error(`Run It Back for ${leagueId} was aborted.`));
  });
}

export async function getAuctionSession(
  leagueId: string,
  seasonNumber = 1,
): Promise<LeagueBuilderAuctionSession | null> {
  return getAuctionSessionById(createAuctionSessionId(leagueId, seasonNumber));
}

export async function getAuctionSessionById(id: string): Promise<LeagueBuilderAuctionSession | null> {
  const db = await initLeagueBuilderDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.AUCTION_SESSIONS, 'readonly');
    const store = tx.objectStore(STORES.AUCTION_SESSIONS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAuctionSession(
  session: Omit<LeagueBuilderAuctionSession, 'createdDate' | 'lastModified'> & {
    createdDate?: string;
    lastModified?: string;
  },
): Promise<LeagueBuilderAuctionSession> {
  return saveAuctionSessionById(session);
}

export async function saveAuctionSessionById(
  session: Omit<LeagueBuilderAuctionSession, 'createdDate' | 'lastModified'> & {
    createdDate?: string;
    lastModified?: string;
  },
): Promise<LeagueBuilderAuctionSession> {
  const db = await initLeagueBuilderDatabase();
  const now = nowISO();
  const existing = await getAuctionSessionById(session.id);
  const fullSession: LeagueBuilderAuctionSession = {
    ...session,
    seed: session.session.config.nominationOrderSeed,
    createdDate: session.createdDate ?? existing?.createdDate ?? now,
    lastModified: now,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.AUCTION_SESSIONS, 'readwrite');
    const store = tx.objectStore(STORES.AUCTION_SESSIONS);
    const request = store.put(fullSession);

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-league-builder', 'auctionSessions', fullSession.id, fullSession);
      resolve(fullSession);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteAuctionSession(leagueId: string, seasonNumber = 1): Promise<void> {
  return deleteAuctionSessionById(createAuctionSessionId(leagueId, seasonNumber));
}

export async function deleteAuctionSessionById(id: string): Promise<void> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.AUCTION_SESSIONS, 'readwrite');
    const store = tx.objectStore(STORES.AUCTION_SESSIONS);
    const request = store.delete(id);

    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.remove('kbl-league-builder', 'auctionSessions', id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// DEFAULT PRESETS
// ============================================

export const DEFAULT_RULES_PRESETS: Omit<RulesPreset, 'id' | 'createdDate' | 'lastModified'>[] = [
  {
    name: 'Standard',
    description: 'Balanced settings for typical play',
    isDefault: true,
    isEditable: false,
    game: {
      inningsPerGame: 9,
      extraInningsRule: 'standard',
      mercyRule: { enabled: false, runDifferential: 10, afterInning: 7 },
      pitchCounts: { enabled: true, starterLimit: 100, relieverLimit: 40 },
      moundVisits: { enabled: true, perGame: 5 },
    },
    season: {
      gamesPerTeam: 50,
      scheduleType: 'balanced',
      allStarGame: true,
      allStarTiming: 0.5,
      tradeDeadline: { enabled: true, timing: 0.75 },
    },
    playoffs: {
      teamsQualifying: 4,
      format: 'bracket',
      seriesLengths: [5, 7, 7],
      homeFieldAdvantage: 'higher_seed',
    },
  },
  {
    name: 'Quick Play',
    description: 'Shorter games and seasons for faster completion',
    isDefault: false,
    isEditable: false,
    game: {
      inningsPerGame: 6,
      extraInningsRule: 'runner_on_second',
      mercyRule: { enabled: true, runDifferential: 8, afterInning: 4 },
      pitchCounts: { enabled: false, starterLimit: 100, relieverLimit: 40 },
      moundVisits: { enabled: false, perGame: 5 },
    },
    season: {
      gamesPerTeam: 16,
      scheduleType: 'balanced',
      allStarGame: false,
      allStarTiming: 0.5,
      tradeDeadline: { enabled: false, timing: 0.75 },
    },
    playoffs: {
      teamsQualifying: 4,
      format: 'bracket',
      seriesLengths: [3, 5],
      homeFieldAdvantage: 'higher_seed',
    },
  },
  {
    name: 'Full Simulation',
    description: 'MLB-style 162 game season with full rules',
    isDefault: false,
    isEditable: false,
    game: {
      inningsPerGame: 9,
      extraInningsRule: 'standard',
      mercyRule: { enabled: false, runDifferential: 10, afterInning: 7 },
      pitchCounts: { enabled: true, starterLimit: 120, relieverLimit: 50 },
      moundVisits: { enabled: true, perGame: 6 },
    },
    season: {
      gamesPerTeam: 162,
      scheduleType: 'division_heavy',
      allStarGame: true,
      allStarTiming: 0.55,
      tradeDeadline: { enabled: true, timing: 0.65 },
    },
    playoffs: {
      teamsQualifying: 10,
      format: 'best_record_bye',
      seriesLengths: [3, 5, 7, 7],
      homeFieldAdvantage: 'higher_seed',
    },
  },
];

export async function initializeDefaultPresets(): Promise<void> {
  const existing = await getAllRulesPresets();
  if (existing.length > 0) return;

  for (const preset of DEFAULT_RULES_PRESETS) {
    await saveRulesPreset(preset);
  }
}

// ============================================
// CLEAR OPERATIONS
// ============================================

export async function clearAllLeagueBuilderData(): Promise<void> {
  const db = await initLeagueBuilderDatabase();

  // Push tombstones for all existing records before clearing
  if (!syncEngine.isSuppressed()) {
    const storeConfigs: Array<{ store: string; keyField: string }> = [
      { store: STORES.LEAGUE_TEMPLATES, keyField: 'id' },
      { store: STORES.GLOBAL_TEAMS, keyField: 'id' },
      { store: STORES.GLOBAL_PLAYERS, keyField: 'id' },
      { store: STORES.LEAGUE_PLAYER_OVERRIDES, keyField: 'id' },
      { store: STORES.RULES_PRESETS, keyField: 'id' },
      { store: STORES.TEAM_ROSTERS, keyField: 'teamId' },
      { store: STORES.SCOUT_PROFILES, keyField: 'id' },
      { store: STORES.STARTUP_DRAFT_SESSIONS, keyField: 'id' },
      { store: STORES.REGISTERED_POOLS, keyField: 'leagueId' },
      { store: STORES.MLB_DRAFT_SESSIONS, keyField: 'id' },
      { store: STORES.SNAKE_SEAT_BOARDS, keyField: 'id' },
      { store: STORES.AUCTION_SESSIONS, keyField: 'id' },
    ];

    for (const { store: storeName, keyField } of storeConfigs) {
      const records: Array<Record<string, unknown>> = await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      for (const r of records) syncEngine.remove('kbl-league-builder', storeName, r[keyField] as string);
    }
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [
        STORES.LEAGUE_TEMPLATES,
        STORES.GLOBAL_TEAMS,
        STORES.GLOBAL_PLAYERS,
        STORES.LEAGUE_PLAYER_OVERRIDES,
        STORES.RULES_PRESETS,
        STORES.TEAM_ROSTERS,
        STORES.SCOUT_PROFILES,
        STORES.STARTUP_DRAFT_SESSIONS,
        STORES.REGISTERED_POOLS,
        STORES.MLB_DRAFT_SESSIONS,
        STORES.SNAKE_SEAT_BOARDS,
        STORES.AUCTION_SESSIONS,
      ],
      'readwrite'
    );

    tx.objectStore(STORES.LEAGUE_TEMPLATES).clear();
    tx.objectStore(STORES.GLOBAL_TEAMS).clear();
    tx.objectStore(STORES.GLOBAL_PLAYERS).clear();
    tx.objectStore(STORES.LEAGUE_PLAYER_OVERRIDES).clear();
    tx.objectStore(STORES.RULES_PRESETS).clear();
    tx.objectStore(STORES.TEAM_ROSTERS).clear();
    tx.objectStore(STORES.SCOUT_PROFILES).clear();
    tx.objectStore(STORES.STARTUP_DRAFT_SESSIONS).clear();
    tx.objectStore(STORES.REGISTERED_POOLS).clear();
    tx.objectStore(STORES.MLB_DRAFT_SESSIONS).clear();
    tx.objectStore(STORES.SNAKE_SEAT_BOARDS).clear();
    tx.objectStore(STORES.AUCTION_SESSIONS).clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ============================================
// SMB4 DATABASE SEEDING
// ============================================

import { TEAMS as SMB4_TEAMS, PLAYERS as SMB4_PLAYERS, type PlayerData, type TeamData } from '../data/playerDatabase';
import { SUPER_MEGA_LEAGUE, MAJOR_LEAGUE_BASEBALL } from '../data/leagueStructure';
import { MLB_TEAMS } from '../data/teams/mlbTeams';
import { ALL_MLB_PLAYERS } from '../data/players/mlb';
import { calculateSalary, type PlayerForSalary, type PlayerPosition as SalaryPosition } from '../engines/salaryCalculator';

/**
 * Compute salary from SMB4 player ratings using the salary engine
 */
function computeInitialSalary(player: PlayerData, primaryPosition: Position): number {
  const posMap: Record<string, SalaryPosition> = {
    'C': 'C', '1B': '1B', '2B': '2B', 'SS': 'SS', '3B': '3B',
    'LF': 'LF', 'CF': 'CF', 'RF': 'RF', 'DH': 'DH',
    'SP': 'SP', 'RP': 'RP', 'CP': 'CP', 'SP/RP': 'SP/RP',
  };
  const salaryPlayer: PlayerForSalary = {
    id: player.id,
    name: player.name,
    isPitcher: player.isPitcher,
    primaryPosition: posMap[primaryPosition] || 'UTIL',
    secondaryPosition: player.secondaryPosition,
    pitcherRole: player.isPitcher ? (player.pitcherRole ?? 'SP') : undefined,
    ratings: player.isPitcher
      ? { velocity: player.pitcherRatings?.velocity ?? 50, junk: player.pitcherRatings?.junk ?? 50, accuracy: player.pitcherRatings?.accuracy ?? 50 }
      : { power: player.batterRatings?.power ?? 50, contact: player.batterRatings?.contact ?? 50, speed: player.batterRatings?.speed ?? 50, fielding: player.batterRatings?.fielding ?? 50, arm: player.batterRatings?.arm ?? 50 },
    battingRatings: player.isPitcher && player.batterRatings
      ? { power: player.batterRatings.power, contact: player.batterRatings.contact, speed: player.batterRatings.speed, fielding: player.batterRatings.fielding, arm: player.batterRatings.arm }
      : undefined,
    age: player.age,
    bats: player.bats,
    personality: 'Competitive',
    fame: 0,
    traits: [player.traits.trait1, player.traits.trait2].filter((t): t is string => !!t),
    arsenal: player.arsenal,
    armSlot: player.armSlot,
  };
  return calculateSalary(salaryPlayer);
}

/**
 * Convert SMB4 PlayerData to League Builder Player format
 */
function convertPlayer(player: PlayerData, leagueId = 'sml'): Omit<Player, 'createdDate' | 'lastModified'> {
  // Split name into first/last
  const nameParts = player.name.split(' ');
  const firstName = nameParts[0] || 'Unknown';
  const lastName = nameParts.slice(1).join(' ') || player.id;

  // Map player chemistry code to the League Builder title-case name.
  const chemistry: Chemistry = CHEMISTRY_CODE_TO_WORD[normalizeToChemistryCode(player.chemistry)];

  // Determine position for League Builder format
  let primaryPosition: Position = player.primaryPosition as Position;
  if (player.isPitcher && player.pitcherRole) {
    // Map pitcher role to position
    if (player.pitcherRole === 'CP') {
      primaryPosition = 'CP';
    } else if (player.pitcherRole === 'RP') {
      primaryPosition = 'RP';
    } else if (player.pitcherRole === 'SP/RP') {
      primaryPosition = 'SP/RP';
    } else {
      primaryPosition = 'SP';
    }
  }

  if (player.id === 'sir-dee') {
    console.log('[R3-R5] Seeding corrected Shay Dee pitcher profile', {
      junk: player.pitcherRatings?.junk,
      accuracy: player.pitcherRatings?.accuracy,
      arsenal: player.arsenal,
    });
  }

  return {
    id: player.id,
    firstName,
    lastName,
    gender: player.gender,
    age: player.age,
    bats: player.bats,
    throws: player.throws,
    armSlot: player.armSlot ?? null,
    primaryPosition,
    secondaryPosition: player.secondaryPosition as Position | undefined,
    // Batting ratings (default to 50 if not present)
    power: player.batterRatings?.power ?? 50,
    contact: player.batterRatings?.contact ?? 50,
    speed: player.batterRatings?.speed ?? 50,
    fielding: player.batterRatings?.fielding ?? 50,
    arm: player.batterRatings?.arm ?? 50,
    // Pitching ratings (default to 50 if not present)
    velocity: player.pitcherRatings?.velocity ?? 50,
    junk: player.pitcherRatings?.junk ?? 50,
    accuracy: player.pitcherRatings?.accuracy ?? 50,
    arsenal: (player.arsenal as PitchType[]) || [],
    overallGrade: player.overall as Grade,
    trait1: player.traits.trait1,
    trait2: player.traits.trait2,
    personality: 'Competitive', // Default personality
    chemistry,
    morale: 75, // Default morale
    mojo: 'Normal',
    fame: 0,
    salary: computeInitialSalary(player, primaryPosition),
    leagueAssignments: player.teamId === 'free-agent'
      ? []
      : [{
          leagueId,
          teamId: player.teamId,
          rosterStatus: 'MLB',
        }],
    isCustom: false,
    sourceDatabase: 'SMB4',
    hometown: generateHometown(),
  };
}

// Team abbreviations for scorebug display
const TEAM_ABBREVIATIONS: Record<string, string> = {
  // SML teams (4-letter)
  'beewolves': 'BEES',
  'blowfish': 'FISH',
  'buzzards': 'BUZZ',
  'crocodons': 'DONS',
  'freebooters': 'ARGH',
  'grapplers': 'GRAP',
  'heaters': 'HEAT',
  'herbisaurs': 'HERB',
  'hot-corners': 'CORN',
  'jacks': 'JACK',
  'moonstars': 'STARS',
  'moose': 'MOOS',
  'nemesis': 'NEMS',
  'overdogs': 'DOGS',
  'platypi': 'PLAT',
  'sand-cats': 'CATS',
  'sawteeth': 'SAWS',
  'sirloins': 'LOIN',
  'wideloads': 'LOAD',
  'wild-pigs': 'PIGS',
  // MLB teams (real broadcast scorebug)
  'blue-jays': 'TOR',
  'yankees': 'NYY',
  'orioles': 'BAL',
  'rays': 'TB',
  'red-sox': 'BOS',
  'white-sox': 'CWS',
  'twins': 'MIN',
  'indians': 'CLE',
  'royals': 'KC',
  'tigers': 'DET',
  'mariners': 'SEA',
  'astros': 'HOU',
  'angels': 'CAL',
  'rangers': 'TEX',
  'athletics': 'OAK',
  'marlins': 'FLA',
  'expos': 'MTL',
  'phillies': 'PHI',
  'mets': 'NYM',
  'braves': 'ATL',
  'cardinals': 'STL',
  'reds': 'CIN',
  'brewers': 'MIL',
  'pirates': 'PIT',
  'cubs': 'CHC',
  'padres': 'SD',
  'dodgers': 'LAD',
  'diamondbacks': 'ARI',
  'rockies': 'COL',
  'giants': 'SF',
};

/**
 * Convert SMB4 TeamData to League Builder Team format
 */
function convertTeam(team: TeamData): Omit<Team, 'createdDate' | 'lastModified'> {
  // Extract location and nickname from team name
  // Most teams are just a nickname (e.g., "Sirloins", "Beewolves")
  const name = team.name;

  return {
    id: team.id,
    name: team.name,
    abbreviation: TEAM_ABBREVIATIONS[team.id] || team.id.substring(0, 3).toUpperCase(),
    location: '', // SMB4 teams don't have locations
    nickname: name,
    colors: {
      primary: team.primaryColor,
      secondary: team.secondaryColor,
    },
    stadium: team.homePark,
    leagueIds: team.leagueId ? [team.leagueId] : [],
  };
}

const LINEUP_FIELD_POSITIONS: Position[] = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH'];
const PITCHING_POSITIONS: Position[] = ['SP', 'RP', 'CP', 'SP/RP'];

function createEmptyDepthChart(): DepthChart {
  return {
    C: [],
    '1B': [],
    '2B': [],
    SS: [],
    '3B': [],
    LF: [],
    CF: [],
    RF: [],
    DH: [],
    SP: [],
    RP: [],
    CP: [],
  };
}

function isPitcherPosition(position: Position): boolean {
  return PITCHING_POSITIONS.includes(position);
}

function getPreferredFieldPosition(player: Player): Position {
  if (LINEUP_FIELD_POSITIONS.includes(player.primaryPosition)) {
    return player.primaryPosition;
  }
  if (player.secondaryPosition && LINEUP_FIELD_POSITIONS.includes(player.secondaryPosition)) {
    return player.secondaryPosition;
  }
  if (player.primaryPosition === 'TWO-WAY') {
    return 'DH';
  }
  return 'DH';
}

function assignLineupSlots(players: Player[]): LineupSlot[] {
  const selectedPlayers = players.slice(0, 9);
  const availablePositions = [...LINEUP_FIELD_POSITIONS];

  return selectedPlayers.map((player, index) => {
    const preferredPosition = getPreferredFieldPosition(player);
    const preferredIndex = availablePositions.indexOf(preferredPosition);
    const fieldingPosition = preferredIndex >= 0
      ? availablePositions.splice(preferredIndex, 1)[0]
      : availablePositions.shift() || 'DH';

    return {
      battingOrder: index + 1,
      playerId: player.id,
      fieldingPosition,
    };
  });
}

function buildDepthChart(players: Player[]): DepthChart {
  const depthChart = createEmptyDepthChart();

  for (const player of players) {
    if (player.primaryPosition === 'TWO-WAY') {
      depthChart.DH.push(player.id);
      depthChart.SP.push(player.id);
      continue;
    }

    // SP/RP swingmen are eligible for BOTH pitching roles — never DH (no SP/RP depth bucket exists,
    // so the generic branch below would otherwise dump them at DH). JK ruling 2026-06-25.
    if (player.primaryPosition === 'SP/RP') {
      depthChart.SP.push(player.id);
      depthChart.RP.push(player.id);
      continue;
    }

    if (player.primaryPosition in depthChart) {
      depthChart[player.primaryPosition as keyof DepthChart].push(player.id);
    } else {
      depthChart.DH.push(player.id);
    }

    if (player.secondaryPosition && player.secondaryPosition in depthChart) {
      const bucket = depthChart[player.secondaryPosition as keyof DepthChart];
      if (!bucket.includes(player.id)) {
        bucket.push(player.id);
      }
    }
  }

  return depthChart;
}

function buildSeedRoster(teamId: string, teamPlayers: Player[], sourceData?: Record<string, PlayerData>): TeamRoster {
  const positionPlayers = teamPlayers.filter((player) => !isPitcherPosition(player.primaryPosition));
  const pitchers = teamPlayers.filter((player) => isPitcherPosition(player.primaryPosition));
  const lineupPool = [...positionPlayers];

  if (lineupPool.length < 9) {
    const fillerPlayers = teamPlayers.filter((player) => !lineupPool.some((candidate) => candidate.id === player.id));
    lineupPool.push(...fillerPlayers);
  }

  const lineupWithDH = assignLineupSlots(lineupPool);

  // Use source PlayerData role to distinguish rotation SP from bullpen SP
  const getSourceRole = (id: string) => sourceData?.[id]?.role;

  // SMB4 uses a 4-man rotation. Pure SP fill the rotation first; SP/RP swingmen backfill and
  // overflow to long relief. This mirrors the "SP/RPs need the option to start" ruling (2026-06-25).
  const ROTATION_SIZE = 4;
  const pureStarters = pitchers
    .filter((player) => player.primaryPosition === 'SP' && getSourceRole(player.id) !== 'BULLPEN')
    .map((player) => player.id);
  const swingmen = pitchers
    .filter((player) => player.primaryPosition === 'SP/RP')
    .map((player) => player.id);
  const rotationCandidates = [...pureStarters, ...swingmen];
  const startingRotation = rotationCandidates.slice(0, ROTATION_SIZE);
  const startingSet = new Set(startingRotation);
  const longRelievers = rotationCandidates.filter((id) => !startingSet.has(id));
  const closingPitcher = pitchers.find((player) => player.primaryPosition === 'CP')?.id || '';
  const assignedIds = new Set([...startingRotation, ...longRelievers, closingPitcher].filter(Boolean));
  const setupPitchers = pitchers
    .filter((player) => !assignedIds.has(player.id))
    .map((player) => player.id);

  return {
    teamId,
    mlbRoster: teamPlayers.map((player) => player.id),
    farmRoster: [],
    lineupWithDH,
    lineupWithoutDH: lineupWithDH.map((slot) => ({ ...slot })),
    startingRotation,
    longRelievers,
    closingPitcher,
    setupPitchers,
    depthChart: buildDepthChart(teamPlayers),
    pinchHitOrder: [],
    pinchRunOrder: [],
    defensiveSubOrder: [],
    lastModified: nowISO(),
  };
}

/**
 * Seed the League Builder database with SMB4 teams and players
 * @param clearExisting - If true, removes existing SML teams/players before seeding (preserves other leagues)
 * @returns Object with counts of seeded teams and players
 */
export async function seedFromSMB4Database(clearExisting = true): Promise<{ teams: number; players: number }> {
  return syncEngine.batchMutations(() => seedFromSMB4DatabaseWrites(clearExisting));
}

async function seedFromSMB4DatabaseWrites(clearExisting: boolean): Promise<{ teams: number; players: number }> {
  // Force-reset the DB singleton to ensure a fresh connection.
  // This prevents silent failures when IndexedDB was externally cleared
  // (e.g., via devtools) and the cached connection is stale.
  dbInstance = null;

  await initLeagueBuilderDatabase();

  if (clearExisting) {
    // Only remove SML teams/players — preserve other leagues (e.g., MLB)
    const smlTeamIds = new Set(Object.values(SMB4_TEAMS).map(t => t.id).filter(id => id !== 'free-agent'));
    const existingTeams = await getAllTeams();
    const existingPlayers = await getAllPlayers();

    for (const t of existingTeams) {
      if (smlTeamIds.has(t.id)) {
        await deleteTeam(t.id);
      }
    }
    for (const p of existingPlayers) {
      if (p.leagueAssignments?.some(a => a.leagueId === 'sml') || (p.leagueAssignments?.[0]?.teamId && smlTeamIds.has(p.leagueAssignments[0].teamId))) {
        await deletePlayer(p.id);
      }
    }
  }

  let teamCount = 0;
  let playerCount = 0;
  const seededTeams: Team[] = [];
  const seededPlayers: Player[] = [];

  // Seed teams (excluding free-agent pool)
  for (const teamData of Object.values(SMB4_TEAMS)) {
    if (teamData.id === 'free-agent') continue; // Skip free agent pool

    const team = convertTeam(teamData);
    seededTeams.push(await saveTeam(team));
    teamCount++;
  }

  // Seed players
  for (const playerData of Object.values(SMB4_PLAYERS)) {
    const player = convertPlayer(playerData);
    seededPlayers.push(await savePlayer(player));
    playerCount++;
  }

  for (const team of seededTeams) {
    const teamPlayers = seededPlayers.filter((player) =>
      player.leagueAssignments?.some((assignment) => assignment.teamId === team.id),
    );
    await saveTeamRoster(buildSeedRoster(team.id, teamPlayers, SMB4_PLAYERS));
  }

  console.log(`[LeagueBuilder] Seeded ${teamCount} teams and ${playerCount} players from SMB4 database`);

  // Post-seed verification: read back counts to confirm writes persisted
  const verifyTeams = await getAllTeams();
  const verifyPlayers = await getAllPlayers();
  const persistedTeams = verifyTeams.length;
  const persistedPlayers = verifyPlayers.length;

  if (persistedTeams === 0 && teamCount > 0) {
    throw new Error(
      `SMB4 import verification failed: wrote ${teamCount} teams but read back 0. ` +
      `Database may have been cleared externally. Please try again.`
    );
  }
  if (persistedPlayers === 0 && playerCount > 0) {
    throw new Error(
      `SMB4 import verification failed: wrote ${playerCount} players but read back 0. ` +
      `Database may have been cleared externally. Please try again.`
    );
  }

  console.log(`[LeagueBuilder] Verified: ${persistedTeams} teams, ${persistedPlayers} players in DB`);

  // Step 3: Auto-create "Super Mega League" template from leagueStructure.ts
  // This ensures IMPORT SMB4 DATA is a single-click full recovery.
  const allTeamIds: string[] = [];
  const conferences: Conference[] = [];
  const divisions: Division[] = [];

  for (const conf of SUPER_MEGA_LEAGUE.conferences) {
    const divisionIds: string[] = [];
    for (const div of conf.divisions) {
      divisionIds.push(div.id);
      allTeamIds.push(...div.teamIds);
      divisions.push({
        id: div.id,
        name: div.name,
        conferenceId: conf.id,
        teamIds: [...div.teamIds],
      });
    }
    conferences.push({
      id: conf.id,
      name: conf.name,
      abbreviation: conf.name === 'Super Conference' ? 'SUP' : 'MEG',
      divisionIds,
    });
  }

  await saveLeagueTemplate({
    id: 'sml',
    name: SUPER_MEGA_LEAGUE.name,
    description: 'Default SMB4 league — 20 teams, 2 conferences, 4 divisions',
    teamIds: allTeamIds,
    conferences,
    divisions,
    defaultRulesPreset: 'standard',
  });

  console.log(`[LeagueBuilder] Created "${SUPER_MEGA_LEAGUE.name}" league template with ${allTeamIds.length} teams`);

  return { teams: persistedTeams, players: persistedPlayers };
}

/**
 * Check if the database has been seeded with SMB4 data
 */
export async function isSMB4DatabaseSeeded(): Promise<boolean> {
  const players = await getAllPlayers();
  return players.some(p => p.sourceDatabase === 'SMB4');
}

// ============================================
// MLB DATABASE SEEDING
// ============================================

/**
 * Seed the League Builder database with MLB teams and players (30 teams, 660 players)
 * @param clearExisting - If true, removes existing MLB teams/players before seeding (preserves other leagues)
 * @returns Object with counts of seeded teams and players
 */
export async function seedFromMLBDatabase(clearExisting = true): Promise<{ teams: number; players: number }> {
  return syncEngine.batchMutations(() => seedFromMLBDatabaseWrites(clearExisting));
}

async function seedFromMLBDatabaseWrites(clearExisting: boolean): Promise<{ teams: number; players: number }> {
  dbInstance = null;
  await initLeagueBuilderDatabase();

  if (clearExisting) {
    // Only remove MLB teams/players — preserve other leagues (e.g., SML)
    const mlbTeamIds = new Set(Object.keys(MLB_TEAMS));
    const existingTeams = await getAllTeams();
    const existingPlayers = await getAllPlayers();

    for (const t of existingTeams) {
      if (mlbTeamIds.has(t.id)) {
        await deleteTeam(t.id);
      }
    }
    for (const p of existingPlayers) {
      if (p.leagueAssignments?.some(a => a.leagueId === 'mlb') || (p.leagueAssignments?.[0]?.teamId && mlbTeamIds.has(p.leagueAssignments[0].teamId))) {
        await deletePlayer(p.id);
      }
    }
  }

  let teamCount = 0;
  let playerCount = 0;
  const seededTeams: Team[] = [];
  const seededPlayers: Player[] = [];

  // Seed 30 MLB teams
  for (const teamData of Object.values(MLB_TEAMS)) {
    const team = convertTeam(teamData);
    seededTeams.push(await saveTeam(team));
    teamCount++;
  }

  // Convert ALL_MLB_PLAYERS array to record for iteration
  for (const playerData of ALL_MLB_PLAYERS) {
    const player = convertPlayer(playerData, 'mlb');
    seededPlayers.push(await savePlayer(player));
    playerCount++;
  }

  // Build rosters for each team
  const mlbPlayerMap = Object.fromEntries(ALL_MLB_PLAYERS.map((p) => [p.id, p]));
  for (const team of seededTeams) {
    const teamPlayers = seededPlayers.filter((player) =>
      player.leagueAssignments?.some((assignment) => assignment.teamId === team.id),
    );
    await saveTeamRoster(buildSeedRoster(team.id, teamPlayers, mlbPlayerMap));
  }

  console.log(`[LeagueBuilder] Seeded ${teamCount} MLB teams and ${playerCount} MLB players`);

  // Post-seed verification
  const verifyTeams = await getAllTeams();
  const verifyPlayers = await getAllPlayers();
  const persistedTeams = verifyTeams.length;
  const persistedPlayers = verifyPlayers.length;

  if (persistedTeams === 0 && teamCount > 0) {
    throw new Error(
      `MLB import verification failed: wrote ${teamCount} teams but read back 0. ` +
      `Database may have been cleared externally. Please try again.`
    );
  }
  if (persistedPlayers === 0 && playerCount > 0) {
    throw new Error(
      `MLB import verification failed: wrote ${playerCount} players but read back 0. ` +
      `Database may have been cleared externally. Please try again.`
    );
  }

  console.log(`[LeagueBuilder] Verified: ${persistedTeams} teams, ${persistedPlayers} players in DB`);

  // Auto-create "Major League Baseball" league template
  const allTeamIds: string[] = [];
  const conferences: Conference[] = [];
  const divisions: Division[] = [];

  for (const conf of MAJOR_LEAGUE_BASEBALL.conferences) {
    const divisionIds: string[] = [];
    for (const div of conf.divisions) {
      divisionIds.push(div.id);
      allTeamIds.push(...div.teamIds);
      divisions.push({
        id: div.id,
        name: div.name,
        conferenceId: conf.id,
        teamIds: [...div.teamIds],
      });
    }
    conferences.push({
      id: conf.id,
      name: conf.name,
      abbreviation: conf.name === 'American League' ? 'AL' : 'NL',
      divisionIds,
    });
  }

  await saveLeagueTemplate({
    id: 'mlb',
    name: MAJOR_LEAGUE_BASEBALL.name,
    description: 'MLB league — 30 teams, 2 conferences (AL/NL), 6 divisions',
    teamIds: allTeamIds,
    conferences,
    divisions,
    defaultRulesPreset: 'standard',
  });

  console.log(`[LeagueBuilder] Created "${MAJOR_LEAGUE_BASEBALL.name}" league template with ${allTeamIds.length} teams`);

  return { teams: persistedTeams, players: persistedPlayers };
}

/**
 * Check if the database has been seeded with MLB data
 */
export async function isMLBDatabaseSeeded(): Promise<boolean> {
  const teams = await getAllTeams();
  return teams.some(t => t.id === 'yankees' || t.id === 'dodgers');
}
