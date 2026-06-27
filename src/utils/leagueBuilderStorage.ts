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
import {
  BALANCE_MODE_DEFAULT,
  CHECKPOINT_CADENCE_DEFAULT,
  normalizeCheckpointCadence,
  type CheckpointCadence,
} from '../data/rosterEngineConstants';
import { CHEMISTRY_CODE_TO_WORD, normalizeToChemistryCode } from '../data/chemistryCanonical';
import type { BalanceMode, RegisteredPool, TeamCapIdentity } from '../engines/leagueConstruction';
import type { CpuShillAuctionSession } from '../engines/cpuShillBidding';
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

export type { EditHistoryEntry } from './editHistoryTracker';
export type { EraFlavor, FameTier, PlayerArchetype } from '../types/reporter';
export { FAME_TIER_LABEL } from '../types/reporter';

const DB_NAME = 'kbl-league-builder';
const DB_VERSION = 8;

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

export type Personality = 'Competitive' | 'Spirited' | 'Crafty' | 'Scholarly' |
  'Disciplined' | 'Tough' | 'Relaxed' | 'Egotistical' |
  'Jolly' | 'Timid' | 'Droopy';

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
  tier?: TierKey;
  balanceMode?: BalanceMode;
  checkpointCadence?: CheckpointCadence;
  logoUrl?: string;
  color?: string;
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
  }>;
  prospectPool: unknown[];
  completedPicks: unknown[];
  currentPickIndex: number;
  createdDate: string;
  lastModified: string;
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
  pickOrder: Array<{ round: number; pick: number; teamId: string }>;
  completedPicks: Array<{ round: number; pick: number; teamId: string; playerId: string }>;
  currentPickIndex: number;
  createdDate: string;
  lastModified: string;
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
  const normalized = {
    ...player,
    baseFameTier: player.baseFameTier ?? 3,
    leagueAssignments: buildLeagueAssignmentsFromLegacyPlayer(player),
  };

  delete normalized.currentTeamId;
  delete normalized.rosterStatus;

  return normalized;
}

function normalizeLeagueTemplateRecord(template: LegacyLeagueTemplateRecord): LeagueTemplate {
  return {
    ...template,
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
    const tx = db.transaction(STORES.REGISTERED_POOLS, 'readwrite');
    const store = tx.objectStore(STORES.REGISTERED_POOLS);
    const request = store.put(pool);

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-league-builder', 'registeredPools', pool.leagueId, pool);
      resolve();
    };
    tx.onerror = () => reject(tx.error);
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

export async function deleteTeam(id: string): Promise<void> {
  const db = await initLeagueBuilderDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.GLOBAL_TEAMS, 'readwrite');
    const store = tx.objectStore(STORES.GLOBAL_TEAMS);
    const request = store.delete(id);

    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.remove('kbl-league-builder', 'globalTeams', id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
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

  const fullPlayer: Player = {
    ...player,
    leagueAssignments: player.leagueAssignments ?? [],
    editHistory,
    id: player.id || generateId('player'),
    createdDate: player.id ? existingPlayer?.createdDate || now : now,
    lastModified: now,
  };

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

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MLB_DRAFT_SESSIONS, 'readonly');
    const store = tx.objectStore(STORES.MLB_DRAFT_SESSIONS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMlbDraftSession(
  session: Omit<LeagueBuilderMlbDraftSession, 'createdDate' | 'lastModified'> & {
    createdDate?: string;
    lastModified?: string;
  },
): Promise<LeagueBuilderMlbDraftSession> {
  const db = await initLeagueBuilderDatabase();
  const now = nowISO();
  const existing = await getMlbDraftSession(session.leagueId, session.seasonNumber);
  const fullSession: LeagueBuilderMlbDraftSession = {
    ...session,
    createdDate: session.createdDate ?? existing?.createdDate ?? now,
    lastModified: now,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MLB_DRAFT_SESSIONS, 'readwrite');
    const store = tx.objectStore(STORES.MLB_DRAFT_SESSIONS);
    const request = store.put(fullSession);

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-league-builder', 'mlbDraftSessions', fullSession.id, fullSession);
      resolve(fullSession);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteMlbDraftSession(leagueId: string, seasonNumber = 1): Promise<void> {
  const db = await initLeagueBuilderDatabase();
  const id = createMlbDraftSessionId(leagueId, seasonNumber);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MLB_DRAFT_SESSIONS, 'readwrite');
    const store = tx.objectStore(STORES.MLB_DRAFT_SESSIONS);
    const request = store.delete(id);

    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.remove('kbl-league-builder', 'mlbDraftSessions', id);
      resolve();
    };
    request.onerror = () => reject(request.error);
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
  const db = await initLeagueBuilderDatabase();
  const id = createAuctionSessionId(leagueId, seasonNumber);

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
const ROTATION_POSITIONS: Position[] = ['SP', 'SP/RP'];

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
