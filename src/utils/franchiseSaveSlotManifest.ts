import {
  getFranchiseDatabaseName,
  getFranchiseSeasonId,
} from './franchisePersistenceContract';
import { syncEngine } from './syncEngine';

export type FranchiseSaveSlotOwnerKind =
  | 'per-franchise-db'
  | 'global-scoped'
  | 'global-via-owned-parent'
  | 'global-template'
  | 'device-global'
  | 'derived'
  | 'deferred-prototype';

export type FranchiseSaveSlotLifecycle =
  | 'required'
  | 'optional'
  | 'derived'
  | 'excluded'
  | 'deferred';

export type FranchiseSaveSlotResponsibility =
  | 'include'
  | 'delete-scoped'
  | 'derive'
  | 'exclude'
  | 'defer';

export type FranchiseSaveSlotValidationStrategy =
  | 'keyed-record'
  | 'record-count'
  | 'scoped-record-count'
  | 'owned-game-children'
  | 'owned-playoff-children'
  | 'current-game-scope'
  | 'derived-from-source'
  | 'manifest-only';

export type FranchiseSaveSlotValidationStatus =
  | 'pass'
  | 'warning'
  | 'fail'
  | 'skipped';

export type FranchiseSaveSlotOverallStatus =
  | 'valid'
  | 'warning'
  | 'invalid';

export interface FranchiseSaveSlotManifestEntry {
  id: string;
  domain: string;
  databaseName: string;
  storeName: string;
  ownerKind: FranchiseSaveSlotOwnerKind;
  lifecycle: FranchiseSaveSlotLifecycle;
  requiredScopeKeys: string[];
  supportedEmptyState: boolean;
  validationStrategy: FranchiseSaveSlotValidationStrategy;
  exportResponsibility: FranchiseSaveSlotResponsibility;
  deleteResponsibility: FranchiseSaveSlotResponsibility;
  notes: string;
}

export interface FranchiseSaveSlotValidationOptions {
  seasonNumber?: number;
  seasonId?: string;
}

export interface FranchiseSaveSlotValidationEntry {
  manifestEntryId: string;
  domain: string;
  databaseName: string;
  storeName: string;
  lifecycle: FranchiseSaveSlotLifecycle;
  status: FranchiseSaveSlotValidationStatus;
  recordCount: number;
  messages: string[];
  requiredScopeKeys: string[];
}

export interface FranchiseSaveSlotValidationSummary {
  requiredPassed: number;
  requiredFailed: number;
  optionalEmpty: number;
  warnings: number;
  skipped: number;
  totalEntries: number;
}

export interface FranchiseSaveSlotValidationReport {
  franchiseId: string;
  seasonNumber: number;
  seasonId: string;
  checkedAt: number;
  status: FranchiseSaveSlotOverallStatus;
  entries: FranchiseSaveSlotValidationEntry[];
  summary: FranchiseSaveSlotValidationSummary;
}

export const FRANCHISE_SAVE_SLOT_MANIFEST_VERSION = 1;
export const FRANCHISE_SAVE_SLOT_EXPORT_VERSION = 1;

export interface FranchiseSaveSlotLifecycleDomainReport {
  manifestEntryId: string;
  domain: string;
  databaseName: string;
  storeName: string;
  lifecycle: FranchiseSaveSlotLifecycle;
  responsibility: FranchiseSaveSlotResponsibility;
  recordCount: number;
  status: FranchiseSaveSlotValidationStatus;
  messages: string[];
}

export interface FranchiseSaveSlotExportDomain extends FranchiseSaveSlotLifecycleDomainReport {
  records: unknown[];
}

export interface FranchiseSaveSlotImportPlan {
  supported: false;
  strategy: 'validate-only';
  messages: string[];
}

export interface FranchiseSaveSlotExportPayload {
  kind: 'kbl-franchise-save-slot';
  payloadVersion: number;
  manifestVersion: number;
  exportedAt: number;
  franchiseId: string;
  seasonNumber: number;
  seasonId: string;
  validation: FranchiseSaveSlotValidationReport;
  manifest: FranchiseSaveSlotManifestEntry[];
  domains: FranchiseSaveSlotExportDomain[];
  importPlan: FranchiseSaveSlotImportPlan;
}

export interface FranchiseSaveSlotDeleteReport {
  franchiseId: string;
  deletedAt: number;
  validation: FranchiseSaveSlotValidationReport;
  domains: FranchiseSaveSlotLifecycleDomainReport[];
  status: FranchiseSaveSlotOverallStatus;
}

export interface FranchiseSaveSlotImportValidationReport {
  status: FranchiseSaveSlotOverallStatus;
  payloadVersion?: number;
  manifestVersion?: number;
  franchiseId?: string;
  checkedAt: number;
  messages: string[];
  domainCounts: Record<string, number>;
}

type IndexedDbFactoryWithDatabases = IDBFactory & {
  databases?: () => Promise<Array<{ name?: string }>>;
};

type StoreReadResult<T> =
  | { kind: 'ok'; records: T[] }
  | { kind: 'missing-database'; records: [] }
  | { kind: 'missing-store'; records: [] }
  | { kind: 'unavailable'; records: []; message: string };

type KeyReadResult<T> =
  | { kind: 'ok'; record: T | null }
  | { kind: 'missing-database'; record: null }
  | { kind: 'missing-store'; record: null }
  | { kind: 'unavailable'; record: null; message: string };

type StorageReadKind = StoreReadResult<unknown>['kind'] | KeyReadResult<unknown>['kind'];

interface ValidationContext {
  franchiseId: string;
  seasonNumber: number;
  seasonId: string;
  metadataRecord: Record<string, unknown> | null;
  configRecord: Record<string, unknown> | null;
  ownedGameIds: Set<string>;
  ownedPlayoffIds: Set<string>;
}

interface LifecycleContext extends ValidationContext {
  seasonIds: Set<string>;
  seasonNumbers: Set<number>;
  ownedPlayerIds: Set<string>;
}

export const FRANCHISE_SAVE_SLOT_MANIFEST: FranchiseSaveSlotManifestEntry[] = [
  {
    id: 'franchise.metadata',
    domain: 'Franchise metadata',
    databaseName: 'kbl-app-meta',
    storeName: 'franchiseList',
    ownerKind: 'global-scoped',
    lifecycle: 'required',
    requiredScopeKeys: ['franchiseId'],
    supportedEmptyState: false,
    validationStrategy: 'keyed-record',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Root save-slot metadata and currentSeason pointer.',
  },
  {
    id: 'franchise.config',
    domain: 'Franchise config',
    databaseName: 'kbl-app-meta',
    storeName: 'franchiseConfigs',
    ownerKind: 'global-scoped',
    lifecycle: 'required',
    requiredScopeKeys: ['franchiseId'],
    supportedEmptyState: false,
    validationStrategy: 'keyed-record',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Stored setup rules, selected league, and team ownership config.',
  },
  {
    id: 'franchise.players',
    domain: 'Per-franchise player snapshots',
    databaseName: 'kbl-franchise-{franchiseId}',
    storeName: 'players',
    ownerKind: 'per-franchise-db',
    lifecycle: 'required',
    requiredScopeKeys: ['databaseName'],
    supportedEmptyState: false,
    validationStrategy: 'record-count',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Copied player snapshots owned by the franchise save.',
  },
  {
    id: 'franchise.teams',
    domain: 'Per-franchise team/roster snapshots',
    databaseName: 'kbl-franchise-{franchiseId}',
    storeName: 'teams',
    ownerKind: 'per-franchise-db',
    lifecycle: 'required',
    requiredScopeKeys: ['databaseName'],
    supportedEmptyState: false,
    validationStrategy: 'record-count',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Copied team snapshots, lineups, rotation, colors, stadium, and manager metadata.',
  },
  {
    id: 'schedule.games',
    domain: 'Franchise schedule games',
    databaseName: 'kbl-schedule',
    storeName: 'scheduledGames',
    ownerKind: 'global-scoped',
    lifecycle: 'required',
    requiredScopeKeys: ['franchiseId', 'seasonNumber'],
    supportedEmptyState: false,
    validationStrategy: 'scoped-record-count',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Scheduled rows for the active franchise season.',
  },
  {
    id: 'schedule.metadata',
    domain: 'Schedule metadata',
    databaseName: 'kbl-schedule',
    storeName: 'scheduleMetadata',
    ownerKind: 'derived',
    lifecycle: 'derived',
    requiredScopeKeys: ['franchiseId', 'seasonNumber'],
    supportedEmptyState: true,
    validationStrategy: 'derived-from-source',
    exportResponsibility: 'derive',
    deleteResponsibility: 'derive',
    notes: 'Currently keyed by seasonNumber only; franchise metadata must be derived from scheduledGames.',
  },
  {
    id: 'season.metadata',
    domain: 'Season metadata',
    databaseName: 'kbl-tracker',
    storeName: 'seasonMetadata',
    ownerKind: 'global-scoped',
    lifecycle: 'required',
    requiredScopeKeys: ['seasonId'],
    supportedEmptyState: false,
    validationStrategy: 'keyed-record',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Canonical season row keyed by {franchiseId}-season-{n}.',
  },
  {
    id: 'season.stats.batting',
    domain: 'Season batting stats',
    databaseName: 'kbl-tracker',
    storeName: 'playerSeasonBatting',
    ownerKind: 'global-scoped',
    lifecycle: 'optional',
    requiredScopeKeys: ['seasonId'],
    supportedEmptyState: true,
    validationStrategy: 'scoped-record-count',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Empty is supported before games are played or aggregated.',
  },
  {
    id: 'season.stats.pitching',
    domain: 'Season pitching stats',
    databaseName: 'kbl-tracker',
    storeName: 'playerSeasonPitching',
    ownerKind: 'global-scoped',
    lifecycle: 'optional',
    requiredScopeKeys: ['seasonId'],
    supportedEmptyState: true,
    validationStrategy: 'scoped-record-count',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Empty is supported before games are played or aggregated.',
  },
  {
    id: 'season.stats.fielding',
    domain: 'Season fielding stats',
    databaseName: 'kbl-tracker',
    storeName: 'playerSeasonFielding',
    ownerKind: 'global-scoped',
    lifecycle: 'optional',
    requiredScopeKeys: ['seasonId'],
    supportedEmptyState: true,
    validationStrategy: 'scoped-record-count',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Empty is supported before games are played or aggregated.',
  },
  {
    id: 'career.stats.batting',
    domain: 'Career batting stats',
    databaseName: 'kbl-tracker',
    storeName: 'playerCareerBatting',
    ownerKind: 'deferred-prototype',
    lifecycle: 'deferred',
    requiredScopeKeys: ['franchiseId', 'playerId'],
    supportedEmptyState: true,
    validationStrategy: 'manifest-only',
    exportResponsibility: 'defer',
    deleteResponsibility: 'defer',
    notes: 'Deferred until career records carry canonical franchise scope; copied playerId alone is not ownership proof.',
  },
  {
    id: 'career.stats.pitching',
    domain: 'Career pitching stats',
    databaseName: 'kbl-tracker',
    storeName: 'playerCareerPitching',
    ownerKind: 'deferred-prototype',
    lifecycle: 'deferred',
    requiredScopeKeys: ['franchiseId', 'playerId'],
    supportedEmptyState: true,
    validationStrategy: 'manifest-only',
    exportResponsibility: 'defer',
    deleteResponsibility: 'defer',
    notes: 'Deferred until career records carry canonical franchise scope; copied playerId alone is not ownership proof.',
  },
  {
    id: 'career.stats.fielding',
    domain: 'Career fielding stats',
    databaseName: 'kbl-tracker',
    storeName: 'playerCareerFielding',
    ownerKind: 'deferred-prototype',
    lifecycle: 'deferred',
    requiredScopeKeys: ['franchiseId', 'playerId'],
    supportedEmptyState: true,
    validationStrategy: 'manifest-only',
    exportResponsibility: 'defer',
    deleteResponsibility: 'defer',
    notes: 'Deferred until career records carry canonical franchise scope; copied playerId alone is not ownership proof.',
  },
  {
    id: 'game.current',
    domain: 'Current GameTracker snapshot',
    databaseName: 'kbl-tracker',
    storeName: 'currentGame',
    ownerKind: 'global-scoped',
    lifecycle: 'optional',
    requiredScopeKeys: ['franchiseId', 'seasonId', 'statsScopeId'],
    supportedEmptyState: true,
    validationStrategy: 'current-game-scope',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Only belongs to the save slot when the current snapshot has franchise scope.',
  },
  {
    id: 'game.completed',
    domain: 'Completed games archive',
    databaseName: 'kbl-tracker',
    storeName: 'completedGames',
    ownerKind: 'global-scoped',
    lifecycle: 'optional',
    requiredScopeKeys: ['franchiseId', 'seasonId', 'statsScopeId', 'competitionType'],
    supportedEmptyState: true,
    validationStrategy: 'scoped-record-count',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Empty is supported for a fresh franchise.',
  },
  {
    id: 'game.headers',
    domain: 'Game headers',
    databaseName: 'kbl-event-log',
    storeName: 'gameHeaders',
    ownerKind: 'global-scoped',
    lifecycle: 'optional',
    requiredScopeKeys: ['franchiseId', 'seasonId', 'statsScopeId', 'competitionType'],
    supportedEmptyState: true,
    validationStrategy: 'scoped-record-count',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Headers define ownership for event-log child stores.',
  },
  {
    id: 'event.atBats',
    domain: 'At-bat event log',
    databaseName: 'kbl-event-log',
    storeName: 'atBatEvents',
    ownerKind: 'global-via-owned-parent',
    lifecycle: 'optional',
    requiredScopeKeys: ['gameId'],
    supportedEmptyState: true,
    validationStrategy: 'owned-game-children',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Export/delete via owned gameHeaders/completed game IDs.',
  },
  {
    id: 'event.betweenPlay',
    domain: 'Between-play event log',
    databaseName: 'kbl-event-log',
    storeName: 'betweenPlayEvents',
    ownerKind: 'global-via-owned-parent',
    lifecycle: 'optional',
    requiredScopeKeys: ['gameId'],
    supportedEmptyState: true,
    validationStrategy: 'owned-game-children',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Export/delete via owned gameHeaders/completed game IDs.',
  },
  {
    id: 'event.pitchingAppearances',
    domain: 'Pitching appearance event log',
    databaseName: 'kbl-event-log',
    storeName: 'pitchingAppearances',
    ownerKind: 'global-via-owned-parent',
    lifecycle: 'optional',
    requiredScopeKeys: ['gameId'],
    supportedEmptyState: true,
    validationStrategy: 'owned-game-children',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Export/delete via owned gameHeaders/completed game IDs.',
  },
  {
    id: 'event.fielding',
    domain: 'Fielding event log',
    databaseName: 'kbl-event-log',
    storeName: 'fieldingEvents',
    ownerKind: 'global-via-owned-parent',
    lifecycle: 'optional',
    requiredScopeKeys: ['gameId'],
    supportedEmptyState: true,
    validationStrategy: 'owned-game-children',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Export/delete via owned gameHeaders/completed game IDs.',
  },
  {
    id: 'transactions',
    domain: 'Transaction log',
    databaseName: 'kbl-transactions',
    storeName: 'transactions',
    ownerKind: 'global-scoped',
    lifecycle: 'optional',
    requiredScopeKeys: ['franchiseId', 'seasonId'],
    supportedEmptyState: true,
    validationStrategy: 'scoped-record-count',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Mode 2 v1 writes should use canonical narrowed transaction types.',
  },
  {
    id: 'season.summary',
    domain: 'Franchise season summary',
    databaseName: 'kbl-tracker',
    storeName: 'franchiseSeasonSummaries',
    ownerKind: 'global-scoped',
    lifecycle: 'optional',
    requiredScopeKeys: ['franchiseId', 'seasonId', 'seasonNumber'],
    supportedEmptyState: true,
    validationStrategy: 'keyed-record',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Optional until a season is finalized.',
  },
  {
    id: 'transition.journals',
    domain: 'Franchise transition journals',
    databaseName: 'kbl-franchise-transition-journal',
    storeName: 'transitionJournals',
    ownerKind: 'global-scoped',
    lifecycle: 'optional',
    requiredScopeKeys: ['franchiseId'],
    supportedEmptyState: true,
    validationStrategy: 'scoped-record-count',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Durable season transition operation records. Pending/failed journals are exported but reported as warnings for repair visibility.',
  },
  {
    id: 'playoff.configs',
    domain: 'Playoff configs',
    databaseName: 'kbl-playoffs',
    storeName: 'playoffs',
    ownerKind: 'global-scoped',
    lifecycle: 'optional',
    requiredScopeKeys: ['sourceType', 'franchiseId', 'seasonId', 'seasonNumber'],
    supportedEmptyState: true,
    validationStrategy: 'scoped-record-count',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Must exclude elimination playoffs.',
  },
  {
    id: 'playoff.series',
    domain: 'Playoff series',
    databaseName: 'kbl-playoffs',
    storeName: 'series',
    ownerKind: 'global-via-owned-parent',
    lifecycle: 'optional',
    requiredScopeKeys: ['playoffId'],
    supportedEmptyState: true,
    validationStrategy: 'owned-playoff-children',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Owned by playoffId from franchise playoff configs.',
  },
  {
    id: 'playoff.games',
    domain: 'Playoff games',
    databaseName: 'kbl-playoffs',
    storeName: 'playoffGames',
    ownerKind: 'global-via-owned-parent',
    lifecycle: 'optional',
    requiredScopeKeys: ['playoffId'],
    supportedEmptyState: true,
    validationStrategy: 'owned-playoff-children',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Owned by playoffId from franchise playoff configs.',
  },
  {
    id: 'playoff.stats',
    domain: 'Playoff stats',
    databaseName: 'kbl-playoffs',
    storeName: 'playoffStats',
    ownerKind: 'global-via-owned-parent',
    lifecycle: 'optional',
    requiredScopeKeys: ['playoffId'],
    supportedEmptyState: true,
    validationStrategy: 'owned-playoff-children',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Owned by playoffId from franchise playoff configs.',
  },
  {
    id: 'offseason.state',
    domain: 'Offseason state',
    databaseName: 'kbl-offseason',
    storeName: 'offseasonState',
    ownerKind: 'global-scoped',
    lifecycle: 'optional',
    requiredScopeKeys: ['seasonId', 'franchiseId'],
    supportedEmptyState: true,
    validationStrategy: 'keyed-record',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Optional until season-end handoff starts offseason state.',
  },
  {
    id: 'offseason.phaseData',
    domain: 'Offseason phase data',
    databaseName: 'kbl-offseason',
    storeName: 'awards,ratings,retirements,freeAgency,draft,trades',
    ownerKind: 'deferred-prototype',
    lifecycle: 'deferred',
    requiredScopeKeys: ['seasonId'],
    supportedEmptyState: true,
    validationStrategy: 'manifest-only',
    exportResponsibility: 'defer',
    deleteResponsibility: 'defer',
    notes: 'Classified for manifest completeness; full franchise-owned adapters are future work.',
  },
  {
    id: 'derived.standings',
    domain: 'Standings',
    databaseName: 'derived',
    storeName: 'calculateStandings(seasonId)',
    ownerKind: 'derived',
    lifecycle: 'derived',
    requiredScopeKeys: ['seasonId'],
    supportedEmptyState: true,
    validationStrategy: 'derived-from-source',
    exportResponsibility: 'derive',
    deleteResponsibility: 'derive',
    notes: 'Derived from completed games and season stats for canonical seasonId.',
  },
  {
    id: 'derived.parkFactors',
    domain: 'Park factor placeholders',
    databaseName: 'derived',
    storeName: 'team.stadium/parkFactors',
    ownerKind: 'derived',
    lifecycle: 'derived',
    requiredScopeKeys: ['teamId'],
    supportedEmptyState: true,
    validationStrategy: 'derived-from-source',
    exportResponsibility: 'derive',
    deleteResponsibility: 'derive',
    notes: 'Mode 2 v1 summaries currently persist explicit park-factor placeholders.',
  },
  {
    id: 'narrative.context',
    domain: 'Narrative/news context',
    databaseName: 'kbl-tracker',
    storeName: 'narrativeContext/gameStories/commentaryFeedEntries',
    ownerKind: 'deferred-prototype',
    lifecycle: 'deferred',
    requiredScopeKeys: ['franchiseId', 'seasonId', 'gameId'],
    supportedEmptyState: true,
    validationStrategy: 'manifest-only',
    exportResponsibility: 'defer',
    deleteResponsibility: 'defer',
    notes: 'Derived/flavor systems need a later pass before save-slot execution.',
  },
  {
    id: 'fanMorale.legacyPrototype',
    domain: 'Legacy fan morale placeholders',
    databaseName: 'localStorage/kbl-tracker',
    storeName: 'kbl-fan-morale-*',
    ownerKind: 'deferred-prototype',
    lifecycle: 'deferred',
    requiredScopeKeys: ['franchiseId', 'seasonId'],
    supportedEmptyState: true,
    validationStrategy: 'manifest-only',
    exportResponsibility: 'defer',
    deleteResponsibility: 'defer',
    notes: 'Legacy/prototype fan morale is not canonical Franchise v1 morale storage.',
  },
  {
    id: 'randomEventLog',
    domain: 'Franchise random event log',
    databaseName: 'kbl-franchise-random-events',
    storeName: 'randomEventEntries',
    ownerKind: 'global-scoped',
    lifecycle: 'optional',
    requiredScopeKeys: ['franchiseId', 'seasonId', 'statsScopeId'],
    supportedEmptyState: true,
    validationStrategy: 'scoped-record-count',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Durable Mode 2 v1 prompt records; confirmation does not automate profile, relationship, salary, story, designation, or Mode 3 changes.',
  },
  {
    id: 'fanMorale',
    domain: 'Canonical franchise morale',
    databaseName: 'kbl-franchise-morale',
    storeName: 'moraleSnapshots',
    ownerKind: 'global-scoped',
    lifecycle: 'optional',
    requiredScopeKeys: ['franchiseId', 'seasonId', 'statsScopeId'],
    supportedEmptyState: true,
    validationStrategy: 'scoped-record-count',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Canonical Franchise v1 fan/player morale snapshots are event-backed and scoped by franchise, season, and stats scope.',
  },
  {
    id: 'expectedWinsBaselines',
    domain: 'Expected-wins baseline evidence',
    databaseName: 'kbl-franchise-expected-wins-baselines',
    storeName: 'expectedWinsBaselineSnapshots',
    ownerKind: 'global-scoped',
    lifecycle: 'optional',
    requiredScopeKeys: ['franchiseId', 'seasonId', 'statsScopeId', 'seasonNumber'],
    supportedEmptyState: true,
    validationStrategy: 'scoped-record-count',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Durable read-only expected-wins preview baseline evidence; does not authorize fan morale mutation, salary/designation/relationship effects, or Mode 3 handoff.',
  },
  {
    id: 'dailyMoraleSnapshots',
    domain: 'Daily morale snapshot evidence',
    databaseName: 'kbl-franchise-morale-daily-snapshots',
    storeName: 'moraleDailySnapshots',
    ownerKind: 'global-scoped',
    lifecycle: 'optional',
    requiredScopeKeys: ['franchiseId', 'seasonId', 'statsScopeId', 'seasonNumber'],
    supportedEmptyState: true,
    validationStrategy: 'scoped-record-count',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Durable read-only fan/player morale daily snapshot evidence; drift, recovery, relationship effects, and Mode 3 consumers remain blocked.',
  },
  {
    id: 'stadiumRecords',
    domain: 'Franchise stadium record evidence',
    databaseName: 'kbl-franchise-stadium-records',
    storeName: 'stadiumRecords',
    ownerKind: 'global-scoped',
    lifecycle: 'optional',
    requiredScopeKeys: ['franchiseId', 'seasonId', 'statsScopeId', 'seasonNumber'],
    supportedEmptyState: true,
    validationStrategy: 'scoped-record-count',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Durable read-only stadium evidence records; adaptive park-factor persistence and park-adjusted WAR/value consumers remain blocked.',
  },
  {
    id: 'milestones',
    domain: 'Milestones',
    databaseName: 'kbl-tracker',
    storeName: 'careerMilestones',
    ownerKind: 'deferred-prototype',
    lifecycle: 'deferred',
    requiredScopeKeys: ['franchiseId', 'playerId'],
    supportedEmptyState: true,
    validationStrategy: 'manifest-only',
    exportResponsibility: 'defer',
    deleteResponsibility: 'defer',
    notes: 'Deferred until milestone records carry canonical franchise scope; copied playerId alone is not ownership proof.',
  },
  {
    id: 'designations',
    domain: 'Designations',
    databaseName: 'deferred',
    storeName: 'designations',
    ownerKind: 'deferred-prototype',
    lifecycle: 'deferred',
    requiredScopeKeys: ['franchiseId', 'playerId'],
    supportedEmptyState: true,
    validationStrategy: 'manifest-only',
    exportResponsibility: 'defer',
    deleteResponsibility: 'defer',
    notes: 'Spine domain is acknowledged; concrete v1 storage is not implemented.',
  },
  {
    id: 'leagueBuilder.templates',
    domain: 'League Builder templates',
    databaseName: 'kbl-league-builder',
    storeName: 'leagueTemplates,globalTeams,globalPlayers,teamRosters',
    ownerKind: 'global-template',
    lifecycle: 'excluded',
    requiredScopeKeys: ['leagueId'],
    supportedEmptyState: true,
    validationStrategy: 'manifest-only',
    exportResponsibility: 'exclude',
    deleteResponsibility: 'exclude',
    notes: 'Template source is not franchise runtime state after setup.',
  },
  {
    id: 'farm',
    domain: 'Franchise farm roster records',
    databaseName: 'kbl-franchise-farm',
    storeName: 'franchiseFarmRecords',
    ownerKind: 'global-scoped',
    lifecycle: 'optional',
    requiredScopeKeys: ['franchiseId', 'seasonId', 'teamId', 'playerId'],
    supportedEmptyState: true,
    validationStrategy: 'scoped-record-count',
    exportResponsibility: 'include',
    deleteResponsibility: 'delete-scoped',
    notes: 'Scoped farm roster boundary for franchise call-up/send-down state; full farm systems remain future work.',
  },
  {
    id: 'localStorage.legacyMarkers',
    domain: 'Legacy localStorage markers',
    databaseName: 'localStorage',
    storeName: 'kbl-current-season,kbl_last_transition,kbl-season-*',
    ownerKind: 'device-global',
    lifecycle: 'excluded',
    requiredScopeKeys: [],
    supportedEmptyState: true,
    validationStrategy: 'manifest-only',
    exportResponsibility: 'exclude',
    deleteResponsibility: 'exclude',
    notes: 'Compatibility markers must not drive franchise save-slot identity.',
  },
];

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

async function databaseExists(dbName: string): Promise<boolean | 'unknown'> {
  if (!hasIndexedDb()) return false;

  const factory = indexedDB as IndexedDbFactoryWithDatabases;
  if (typeof factory.databases !== 'function') {
    return 'unknown';
  }

  try {
    const databases = await factory.databases();
    return databases.some((db) => db.name === dbName);
  } catch {
    return 'unknown';
  }
}

async function openExistingDatabase(dbName: string): Promise<IDBDatabase | null | 'unknown'> {
  const exists = await databaseExists(dbName);
  if (exists === false) return null;
  if (exists === 'unknown') return 'unknown';

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function readStoreRecords<T = Record<string, unknown>>(
  dbName: string,
  storeName: string,
): Promise<StoreReadResult<T>> {
  const db = await openExistingDatabase(dbName);
  if (db === null) return { kind: 'missing-database', records: [] };
  if (db === 'unknown') {
    return {
      kind: 'unavailable',
      records: [],
      message: 'IndexedDB database enumeration is unavailable; validation did not create/open unknown databases.',
    };
  }

  try {
    if (!db.objectStoreNames.contains(storeName)) {
      return { kind: 'missing-store', records: [] };
    }

    return await new Promise<StoreReadResult<T>>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve({ kind: 'ok', records: request.result as T[] });
    });
  } finally {
    db.close();
  }
}

async function readRecordByKey<T = Record<string, unknown>>(
  dbName: string,
  storeName: string,
  key: IDBValidKey,
): Promise<KeyReadResult<T>> {
  const db = await openExistingDatabase(dbName);
  if (db === null) return { kind: 'missing-database', record: null };
  if (db === 'unknown') {
    return {
      kind: 'unavailable',
      record: null,
      message: 'IndexedDB database enumeration is unavailable; validation did not create/open unknown databases.',
    };
  }

  try {
    if (!db.objectStoreNames.contains(storeName)) {
      return { kind: 'missing-store', record: null };
    }

    return await new Promise<KeyReadResult<T>>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve({ kind: 'ok', record: (request.result as T | undefined) ?? null });
    });
  } finally {
    db.close();
  }
}

function resolvedDatabaseName(entry: FranchiseSaveSlotManifestEntry, franchiseId: string): string {
  return entry.databaseName === 'kbl-franchise-{franchiseId}'
    ? getFranchiseDatabaseName(franchiseId)
    : entry.databaseName;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasPresentKey(record: Record<string, unknown>, key: string): boolean {
  return record[key] !== undefined && record[key] !== null && record[key] !== '';
}

function scopeKeyMatches(
  record: Record<string, unknown>,
  key: string,
  context: ValidationContext,
): boolean {
  if (!hasPresentKey(record, key)) return false;

  switch (key) {
    case 'franchiseId':
      return record.franchiseId === context.franchiseId;
    case 'seasonId':
      return record.seasonId === context.seasonId;
    case 'statsScopeId':
      return record.statsScopeId === context.seasonId;
    case 'seasonNumber':
      return record.seasonNumber === context.seasonNumber;
    case 'sourceType':
      return record.sourceType === 'franchise';
    case 'competitionType':
      return record.competitionType === 'franchise' || record.competitionType === 'playoff';
    case 'gameId':
    case 'playoffId':
    case 'playerId':
    case 'teamId':
      return typeof record[key] === 'string' && record[key] !== '';
    default:
      return hasPresentKey(record, key);
  }
}

function recordMatchesRequiredScope(
  record: Record<string, unknown>,
  context: ValidationContext,
  requiredScopeKeys: string[],
): boolean {
  return requiredScopeKeys.every((key) => scopeKeyMatches(record, key, context));
}

function isClearlyOtherOwner(record: Record<string, unknown>, context: ValidationContext): boolean {
  if (record.franchiseId && record.franchiseId !== context.franchiseId) return true;
  if (
    typeof record.seasonId === 'string' &&
    record.seasonId.includes('-season-') &&
    record.seasonId !== context.seasonId
  ) {
    return true;
  }
  if (
    typeof record.statsScopeId === 'string' &&
    record.statsScopeId.includes('-season-') &&
    record.statsScopeId !== context.seasonId
  ) {
    return true;
  }
  if (record.sourceType === 'elimination') return true;
  if (record.competitionType === 'elimination') return true;
  return false;
}

function recordLooksLikeSameSeason(record: Record<string, unknown>, context: ValidationContext): boolean {
  return (
    record.seasonId === context.seasonId ||
    record.statsScopeId === context.seasonId ||
    record.seasonNumber === context.seasonNumber ||
    record.season === context.seasonNumber
  );
}

function recordIsLegacyOrAmbiguous(
  record: Record<string, unknown>,
  context: ValidationContext,
  requiredScopeKeys: string[],
): boolean {
  if (recordMatchesRequiredScope(record, context, requiredScopeKeys)) return false;
  if (isClearlyOtherOwner(record, context)) return false;
  return recordLooksLikeSameSeason(record, context);
}

function recordPlayerIsOwned(record: Record<string, unknown>, playerIds: Set<string>): boolean {
  return typeof record.playerId === 'string' && playerIds.has(record.playerId);
}

function parseCanonicalFranchiseSeasonNumber(franchiseId: string, seasonId: unknown): number | null {
  if (typeof seasonId !== 'string') return null;
  const prefix = `${franchiseId}-season-`;
  if (!seasonId.startsWith(prefix)) return null;
  const parsed = Number(seasonId.slice(prefix.length));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isCanonicalFranchiseSeasonId(franchiseId: string, seasonId: unknown): seasonId is string {
  return parseCanonicalFranchiseSeasonNumber(franchiseId, seasonId) !== null;
}

function addLifecycleSeasonFromRecord(context: LifecycleContext, record: Record<string, unknown>): void {
  const seasonNumber = parseCanonicalFranchiseSeasonNumber(context.franchiseId, record.seasonId);
  if (seasonNumber !== null) {
    context.seasonIds.add(record.seasonId as string);
    context.seasonNumbers.add(seasonNumber);
  }

  if (record.franchiseId === context.franchiseId && typeof record.seasonNumber === 'number') {
    context.seasonNumbers.add(record.seasonNumber);
    context.seasonIds.add(getFranchiseSeasonId(context.franchiseId, record.seasonNumber));
  }
}

function lifecycleScopeKeyMatches(
  record: Record<string, unknown>,
  key: string,
  context: LifecycleContext,
): boolean {
  if (!hasPresentKey(record, key)) return false;

  switch (key) {
    case 'databaseName':
      return true;
    case 'franchiseId':
      return record.franchiseId === context.franchiseId;
    case 'seasonId':
      return context.seasonIds.has(record.seasonId as string);
    case 'statsScopeId':
      return context.seasonIds.has(record.statsScopeId as string);
    case 'seasonNumber':
      return context.seasonNumbers.has(record.seasonNumber as number);
    case 'sourceType':
      return record.sourceType === 'franchise';
    case 'competitionType':
      return record.competitionType === 'franchise' || record.competitionType === 'playoff';
    case 'gameId':
      return typeof record.gameId === 'string' && context.ownedGameIds.has(record.gameId);
    case 'playoffId':
      return typeof record.playoffId === 'string' && context.ownedPlayoffIds.has(record.playoffId);
    case 'playerId':
      return typeof record.playerId === 'string' && context.ownedPlayerIds.has(record.playerId);
    case 'teamId':
      return typeof record.teamId === 'string' && record.teamId !== '';
    default:
      return hasPresentKey(record, key);
  }
}

function recordMatchesLifecycleScope(
  record: Record<string, unknown>,
  context: LifecycleContext,
  requiredScopeKeys: string[],
): boolean {
  return requiredScopeKeys.every((key) => lifecycleScopeKeyMatches(record, key, context));
}

function recordBelongsToLifecycleEntry(
  entry: FranchiseSaveSlotManifestEntry,
  record: Record<string, unknown>,
  context: LifecycleContext,
): boolean {
  switch (entry.id) {
    case 'franchise.metadata':
    case 'franchise.config':
      return record.franchiseId === context.franchiseId;
    case 'franchise.players':
    case 'franchise.teams':
      return true;
    case 'schedule.games':
      return record.franchiseId === context.franchiseId;
    case 'season.metadata':
      return isCanonicalFranchiseSeasonId(context.franchiseId, record.seasonId);
    case 'event.atBats':
    case 'event.betweenPlay':
    case 'event.pitchingAppearances':
    case 'event.fielding':
      return typeof record.gameId === 'string' && context.ownedGameIds.has(record.gameId);
    case 'playoff.series':
    case 'playoff.games':
    case 'playoff.stats':
      return typeof record.playoffId === 'string' && context.ownedPlayoffIds.has(record.playoffId);
    default:
      return recordMatchesLifecycleScope(record, context, entry.requiredScopeKeys);
  }
}

function makeLifecycleDomainReport(
  entry: FranchiseSaveSlotManifestEntry,
  responsibility: FranchiseSaveSlotResponsibility,
  recordCount: number,
  status: FranchiseSaveSlotValidationStatus,
  messages: string[],
  databaseName?: string,
): FranchiseSaveSlotLifecycleDomainReport {
  return {
    manifestEntryId: entry.id,
    domain: entry.domain,
    databaseName: databaseName ?? entry.databaseName,
    storeName: entry.storeName,
    lifecycle: entry.lifecycle,
    responsibility,
    recordCount,
    status,
    messages,
  };
}

function cloneRecord<T>(record: T): T {
  return JSON.parse(JSON.stringify(record)) as T;
}

function scopedResultFromCounts(
  entry: FranchiseSaveSlotManifestEntry,
  databaseName: string,
  ownedCount: number,
  ambiguousCount: number,
): FranchiseSaveSlotValidationEntry {
  const messages: string[] = [];
  if (ownedCount > 0) messages.push('Scoped records found.');
  if (ownedCount === 0 && entry.supportedEmptyState) messages.push('Supported empty state.');
  if (ownedCount === 0 && !entry.supportedEmptyState) messages.push('Required scoped records are missing.');
  if (ambiguousCount > 0) {
    messages.push(
      `${ambiguousCount} same-season legacy/ambiguous record(s) were ignored because required franchise scope keys were missing or mismatched.`,
    );
  }

  if (ownedCount === 0 && !entry.supportedEmptyState) {
    return makeEntryResult(entry, 'fail', 0, messages, databaseName);
  }
  if (ambiguousCount > 0) {
    return makeEntryResult(entry, 'warning', ownedCount, messages, databaseName);
  }
  return makeEntryResult(entry, 'pass', ownedCount, messages, databaseName);
}

function makeEntryResult(
  entry: FranchiseSaveSlotManifestEntry,
  status: FranchiseSaveSlotValidationStatus,
  recordCount: number,
  messages: string[],
  databaseName?: string,
): FranchiseSaveSlotValidationEntry {
  return {
    manifestEntryId: entry.id,
    domain: entry.domain,
    databaseName: databaseName ?? entry.databaseName,
    storeName: entry.storeName,
    lifecycle: entry.lifecycle,
    status,
    recordCount,
    messages,
    requiredScopeKeys: entry.requiredScopeKeys,
  };
}

function resultFromReadState(
  entry: FranchiseSaveSlotManifestEntry,
  readKind: StorageReadKind,
  databaseName: string,
  recordCount: number,
  unavailableMessage?: string,
): FranchiseSaveSlotValidationEntry {
  if (readKind === 'ok') {
    if (recordCount > 0) {
      return makeEntryResult(entry, 'pass', recordCount, ['Scoped records found.'], databaseName);
    }
    if (entry.supportedEmptyState) {
      return makeEntryResult(entry, 'pass', 0, ['Supported empty state.'], databaseName);
    }
    return makeEntryResult(entry, 'fail', 0, ['Required scoped records are missing.'], databaseName);
  }

  if (readKind === 'unavailable') {
    return makeEntryResult(
      entry,
      entry.lifecycle === 'required' ? 'warning' : 'skipped',
      0,
      [unavailableMessage ?? 'Storage inspection unavailable.'],
      databaseName,
    );
  }

  if (entry.supportedEmptyState) {
    return makeEntryResult(
      entry,
      'pass',
      0,
      [`${readKind === 'missing-database' ? 'Database' : 'Store'} is absent; empty state is supported.`],
      databaseName,
    );
  }

  return makeEntryResult(
    entry,
    'fail',
    0,
    [`Required ${readKind === 'missing-database' ? 'database' : 'store'} is missing.`],
    databaseName,
  );
}

async function getMetadataAndConfig(franchiseId: string): Promise<{
  metadata: KeyReadResult<Record<string, unknown>>;
  config: KeyReadResult<Record<string, unknown>>;
}> {
  const [metadata, config] = await Promise.all([
    readRecordByKey<Record<string, unknown>>('kbl-app-meta', 'franchiseList', franchiseId),
    readRecordByKey<Record<string, unknown>>('kbl-app-meta', 'franchiseConfigs', franchiseId),
  ]);

  return { metadata, config };
}

function resolveSeasonNumber(
  metadataRecord: Record<string, unknown> | null,
  options: FranchiseSaveSlotValidationOptions,
): number {
  if (typeof options.seasonNumber === 'number' && Number.isFinite(options.seasonNumber)) {
    return options.seasonNumber;
  }

  const metadataSeason = metadataRecord?.currentSeason;
  return typeof metadataSeason === 'number' && Number.isFinite(metadataSeason)
    ? metadataSeason
    : 1;
}

async function getOwnedPlayerIds(franchiseId: string): Promise<Set<string>> {
  const players = await readStoreRecords<Record<string, unknown>>(
    getFranchiseDatabaseName(franchiseId),
    'players',
  );
  if (players.kind !== 'ok') return new Set();
  return new Set(
    players.records
      .map((record) => record.id)
      .filter((id): id is string => typeof id === 'string'),
  );
}

async function collectContext(
  franchiseId: string,
  options: FranchiseSaveSlotValidationOptions,
): Promise<ValidationContext> {
  const { metadata, config } = await getMetadataAndConfig(franchiseId);
  const metadataRecord = metadata.kind === 'ok' && isRecord(metadata.record) ? metadata.record : null;
  const configRecord = config.kind === 'ok' && isRecord(config.record) ? config.record : null;
  const seasonNumber = resolveSeasonNumber(metadataRecord, options);
  const seasonId = options.seasonId ?? getFranchiseSeasonId(franchiseId, seasonNumber);
  const context: ValidationContext = {
    franchiseId,
    seasonNumber,
    seasonId,
    metadataRecord,
    configRecord,
    ownedGameIds: new Set(),
    ownedPlayoffIds: new Set(),
  };

  const [completedGames, gameHeaders, playoffs] = await Promise.all([
    readStoreRecords<Record<string, unknown>>('kbl-tracker', 'completedGames'),
    readStoreRecords<Record<string, unknown>>('kbl-event-log', 'gameHeaders'),
    readStoreRecords<Record<string, unknown>>('kbl-playoffs', 'playoffs'),
  ]);

  if (completedGames.kind === 'ok') {
    for (const game of completedGames.records) {
      if (
        recordMatchesRequiredScope(
          game,
          context,
          ['franchiseId', 'seasonId', 'statsScopeId', 'competitionType'],
        ) &&
        typeof game.gameId === 'string'
      ) {
        context.ownedGameIds.add(game.gameId);
      }
    }
  }

  if (gameHeaders.kind === 'ok') {
    for (const header of gameHeaders.records) {
      if (
        recordMatchesRequiredScope(
          header,
          context,
          ['franchiseId', 'seasonId', 'statsScopeId', 'competitionType'],
        ) &&
        typeof header.gameId === 'string'
      ) {
        context.ownedGameIds.add(header.gameId);
      }
    }
  }

  if (playoffs.kind === 'ok') {
    for (const playoff of playoffs.records) {
      if (
        recordMatchesRequiredScope(
          playoff,
          context,
          ['sourceType', 'franchiseId', 'seasonId', 'seasonNumber'],
        ) &&
        typeof playoff.id === 'string'
      ) {
        context.ownedPlayoffIds.add(playoff.id);
      }
    }
  }

  return context;
}

async function collectLifecycleContext(
  franchiseId: string,
  options: FranchiseSaveSlotValidationOptions,
): Promise<LifecycleContext> {
  const baseContext = await collectContext(franchiseId, options);
  const ownedPlayerIds = await getOwnedPlayerIds(franchiseId);
  const context: LifecycleContext = {
    ...baseContext,
    seasonIds: new Set([baseContext.seasonId]),
    seasonNumbers: new Set([baseContext.seasonNumber]),
    ownedPlayerIds,
  };

  const storesToScan: Array<[string, string]> = [
    ['kbl-tracker', 'seasonMetadata'],
    ['kbl-tracker', 'completedGames'],
    ['kbl-tracker', 'franchiseSeasonSummaries'],
    ['kbl-event-log', 'gameHeaders'],
    ['kbl-schedule', 'scheduledGames'],
    ['kbl-transactions', 'transactions'],
    ['kbl-playoffs', 'playoffs'],
    ['kbl-offseason', 'offseasonState'],
    ['kbl-franchise-farm', 'franchiseFarmRecords'],
    ['kbl-franchise-random-events', 'randomEventEntries'],
    ['kbl-franchise-morale', 'moraleSnapshots'],
    ['kbl-franchise-expected-wins-baselines', 'expectedWinsBaselineSnapshots'],
    ['kbl-franchise-morale-daily-snapshots', 'moraleDailySnapshots'],
    ['kbl-franchise-stadium-records', 'stadiumRecords'],
  ];

  const scannedStores = await Promise.all(
    storesToScan.map(async ([databaseName, storeName]) => ({
      databaseName,
      storeName,
      result: await readStoreRecords<Record<string, unknown>>(databaseName, storeName),
    })),
  );

  for (const { result } of scannedStores) {
    if (result.kind !== 'ok') continue;
    for (const record of result.records) {
      addLifecycleSeasonFromRecord(context, record);
    }
  }

  const [completedGames, gameHeaders, playoffs] = await Promise.all([
    readStoreRecords<Record<string, unknown>>('kbl-tracker', 'completedGames'),
    readStoreRecords<Record<string, unknown>>('kbl-event-log', 'gameHeaders'),
    readStoreRecords<Record<string, unknown>>('kbl-playoffs', 'playoffs'),
  ]);

  if (completedGames.kind === 'ok') {
    for (const game of completedGames.records) {
      if (
        recordMatchesLifecycleScope(
          game,
          context,
          ['franchiseId', 'seasonId', 'statsScopeId', 'competitionType'],
        ) &&
        typeof game.gameId === 'string'
      ) {
        context.ownedGameIds.add(game.gameId);
      }
    }
  }

  if (gameHeaders.kind === 'ok') {
    for (const header of gameHeaders.records) {
      if (
        recordMatchesLifecycleScope(
          header,
          context,
          ['franchiseId', 'seasonId', 'statsScopeId', 'competitionType'],
        ) &&
        typeof header.gameId === 'string'
      ) {
        context.ownedGameIds.add(header.gameId);
      }
    }
  }

  if (playoffs.kind === 'ok') {
    for (const playoff of playoffs.records) {
      if (
        recordMatchesLifecycleScope(
          playoff,
          context,
          ['sourceType', 'franchiseId', 'seasonId', 'seasonNumber'],
        ) &&
        typeof playoff.id === 'string'
      ) {
        context.ownedPlayoffIds.add(playoff.id);
      }
    }
  }

  return context;
}

async function validateKeyedRecord(
  entry: FranchiseSaveSlotManifestEntry,
  context: ValidationContext,
): Promise<FranchiseSaveSlotValidationEntry> {
  const databaseName = resolvedDatabaseName(entry, context.franchiseId);
  const key = entry.id === 'season.metadata' || entry.id === 'season.summary'
    ? context.seasonId
    : entry.id === 'offseason.state'
      ? `offseason-${context.seasonId}`
      : context.franchiseId;

  const result = await readRecordByKey<Record<string, unknown>>(databaseName, entry.storeName, key);
  if (result.kind !== 'ok') {
    return resultFromReadState(
      entry,
      result.kind,
      databaseName,
      0,
      result.kind === 'unavailable' ? result.message : undefined,
    );
  }

  const ownedCount =
    result.record && recordMatchesRequiredScope(result.record, context, entry.requiredScopeKeys)
      ? 1
      : 0;
  let ambiguousCount =
    result.record && recordIsLegacyOrAmbiguous(result.record, context, entry.requiredScopeKeys)
      ? 1
      : 0;

  const storeRecords = await readStoreRecords<Record<string, unknown>>(databaseName, entry.storeName);
  if (storeRecords.kind === 'ok') {
    ambiguousCount += storeRecords.records.filter(
      (record) =>
        record.id !== key &&
        record.franchiseId !== key &&
        record.seasonId !== key &&
        recordIsLegacyOrAmbiguous(record, context, entry.requiredScopeKeys),
    ).length;
  }

  return scopedResultFromCounts(entry, databaseName, ownedCount, ambiguousCount);
}

async function validateRecordCount(
  entry: FranchiseSaveSlotManifestEntry,
  context: ValidationContext,
): Promise<FranchiseSaveSlotValidationEntry> {
  const databaseName = resolvedDatabaseName(entry, context.franchiseId);
  const result = await readStoreRecords<Record<string, unknown>>(databaseName, entry.storeName);
  const count = result.kind === 'ok' ? result.records.length : 0;
  return resultFromReadState(
    entry,
    result.kind,
    databaseName,
    count,
    result.kind === 'unavailable' ? result.message : undefined,
  );
}

async function validateScopedRecordCount(
  entry: FranchiseSaveSlotManifestEntry,
  context: ValidationContext,
  playerIds: Set<string>,
): Promise<FranchiseSaveSlotValidationEntry> {
  const databaseName = resolvedDatabaseName(entry, context.franchiseId);
  const result = await readStoreRecords<Record<string, unknown>>(databaseName, entry.storeName);
  if (result.kind !== 'ok') {
    return resultFromReadState(
      entry,
      result.kind,
      databaseName,
      0,
      result.kind === 'unavailable' ? result.message : undefined,
    );
  }

  let records: Record<string, unknown>[] = [];
  if (entry.id === 'schedule.games') {
    records = result.records.filter(
      (record) =>
        record.franchiseId === context.franchiseId &&
        record.seasonNumber === context.seasonNumber,
    );
  } else if (entry.id.startsWith('career.stats') || entry.id === 'milestones') {
    records = result.records.filter((record) => recordPlayerIsOwned(record, playerIds));
  } else if (entry.id === 'playoff.configs') {
    records = result.records.filter((record) =>
      recordMatchesRequiredScope(record, context, entry.requiredScopeKeys),
    );
  } else if (entry.id === 'transition.journals') {
    records = result.records.filter((record) => record.franchiseId === context.franchiseId);
  } else {
    records = result.records.filter((record) =>
      recordMatchesRequiredScope(record, context, entry.requiredScopeKeys),
    );
  }

  const ambiguousCount = result.records.filter((record) =>
    recordIsLegacyOrAmbiguous(record, context, entry.requiredScopeKeys),
  ).length;
  const scopedResult = scopedResultFromCounts(entry, databaseName, records.length, ambiguousCount);
  if (entry.id === 'transition.journals') {
    const actionableCount = records.filter(
      (record) => record.status === 'pending' || record.status === 'failed',
    ).length;
    if (actionableCount > 0) {
      return {
        ...scopedResult,
        status: 'warning',
        messages: [
          ...scopedResult.messages,
          `${actionableCount} pending/failed transition journal(s) require review before assuming the save is clean.`,
        ],
      };
    }
  }

  return scopedResult;
}

async function validateCurrentGame(
  entry: FranchiseSaveSlotManifestEntry,
  context: ValidationContext,
): Promise<FranchiseSaveSlotValidationEntry> {
  const result = await readRecordByKey<Record<string, unknown>>('kbl-tracker', 'currentGame', 'current');
  if (result.kind !== 'ok') {
    return resultFromReadState(
      entry,
      result.kind,
      'kbl-tracker',
      0,
      result.kind === 'unavailable' ? result.message : undefined,
    );
  }

  const belongsToFranchise =
    result.record &&
    isRecord(result.record) &&
    recordMatchesRequiredScope(result.record, context, entry.requiredScopeKeys);
  const ambiguous =
    result.record &&
    isRecord(result.record) &&
    recordIsLegacyOrAmbiguous(result.record, context, entry.requiredScopeKeys);

  return scopedResultFromCounts(entry, 'kbl-tracker', belongsToFranchise ? 1 : 0, ambiguous ? 1 : 0);
}

async function validateOwnedGameChildren(
  entry: FranchiseSaveSlotManifestEntry,
  context: ValidationContext,
): Promise<FranchiseSaveSlotValidationEntry> {
  const result = await readStoreRecords<Record<string, unknown>>(entry.databaseName, entry.storeName);
  if (result.kind !== 'ok') {
    return resultFromReadState(
      entry,
      result.kind,
      entry.databaseName,
      0,
      result.kind === 'unavailable' ? result.message : undefined,
    );
  }

  const count = result.records.filter(
    (record) => typeof record.gameId === 'string' && context.ownedGameIds.has(record.gameId),
  ).length;
  const ambiguousCount = result.records.filter(
    (record) =>
      typeof record.gameId === 'string' &&
      !context.ownedGameIds.has(record.gameId) &&
      recordIsLegacyOrAmbiguous(record, context, ['seasonId']),
  ).length;
  return scopedResultFromCounts(entry, entry.databaseName, count, ambiguousCount);
}

async function validateOwnedPlayoffChildren(
  entry: FranchiseSaveSlotManifestEntry,
  context: ValidationContext,
): Promise<FranchiseSaveSlotValidationEntry> {
  const result = await readStoreRecords<Record<string, unknown>>(entry.databaseName, entry.storeName);
  if (result.kind !== 'ok') {
    return resultFromReadState(
      entry,
      result.kind,
      entry.databaseName,
      0,
      result.kind === 'unavailable' ? result.message : undefined,
    );
  }

  const count = result.records.filter(
    (record) => typeof record.playoffId === 'string' && context.ownedPlayoffIds.has(record.playoffId),
  ).length;
  const ambiguousCount = result.records.filter(
    (record) =>
      typeof record.playoffId === 'string' &&
      !context.ownedPlayoffIds.has(record.playoffId) &&
      recordIsLegacyOrAmbiguous(record, context, ['playoffId']),
  ).length;
  return scopedResultFromCounts(entry, entry.databaseName, count, ambiguousCount);
}

function validateManifestOnly(entry: FranchiseSaveSlotManifestEntry): FranchiseSaveSlotValidationEntry {
  return makeEntryResult(
    entry,
    entry.lifecycle === 'excluded' || entry.lifecycle === 'deferred' ? 'skipped' : 'pass',
    0,
    [`${entry.lifecycle} manifest entry; no runtime records required in Pass 1C.`],
  );
}

function validateDerived(entry: FranchiseSaveSlotManifestEntry): FranchiseSaveSlotValidationEntry {
  return makeEntryResult(
    entry,
    'pass',
    0,
    ['Derived domain; validation is based on source records.'],
  );
}

async function validateEntry(
  entry: FranchiseSaveSlotManifestEntry,
  context: ValidationContext,
  playerIds: Set<string>,
): Promise<FranchiseSaveSlotValidationEntry> {
  switch (entry.validationStrategy) {
    case 'keyed-record':
      return validateKeyedRecord(entry, context);
    case 'record-count':
      return validateRecordCount(entry, context);
    case 'scoped-record-count':
      return validateScopedRecordCount(entry, context, playerIds);
    case 'current-game-scope':
      return validateCurrentGame(entry, context);
    case 'owned-game-children':
      return validateOwnedGameChildren(entry, context);
    case 'owned-playoff-children':
      return validateOwnedPlayoffChildren(entry, context);
    case 'derived-from-source':
      return validateDerived(entry);
    case 'manifest-only':
      return validateManifestOnly(entry);
    default: {
      const exhaustive: never = entry.validationStrategy;
      return exhaustive;
    }
  }
}

function summarize(entries: FranchiseSaveSlotValidationEntry[]): FranchiseSaveSlotValidationSummary {
  return entries.reduce<FranchiseSaveSlotValidationSummary>(
    (summary, entry) => {
      if (entry.lifecycle === 'required' && entry.status === 'pass') summary.requiredPassed += 1;
      if (entry.lifecycle === 'required' && entry.status === 'fail') summary.requiredFailed += 1;
      if (entry.lifecycle !== 'required' && entry.status === 'pass' && entry.recordCount === 0) summary.optionalEmpty += 1;
      if (entry.status === 'warning') summary.warnings += 1;
      if (entry.status === 'skipped') summary.skipped += 1;
      summary.totalEntries += 1;
      return summary;
    },
    {
      requiredPassed: 0,
      requiredFailed: 0,
      optionalEmpty: 0,
      warnings: 0,
      skipped: 0,
      totalEntries: 0,
    },
  );
}

function overallStatus(summary: FranchiseSaveSlotValidationSummary): FranchiseSaveSlotOverallStatus {
  if (summary.requiredFailed > 0) return 'invalid';
  if (summary.warnings > 0) return 'warning';
  return 'valid';
}

export function getFranchiseSaveSlotManifest(): FranchiseSaveSlotManifestEntry[] {
  return FRANCHISE_SAVE_SLOT_MANIFEST.map((entry) => ({ ...entry }));
}

export async function validateFranchiseSaveSlot(
  franchiseId: string,
  options: FranchiseSaveSlotValidationOptions = {},
): Promise<FranchiseSaveSlotValidationReport> {
  const context = await collectContext(franchiseId, options);
  const playerIds = await getOwnedPlayerIds(franchiseId);
  const entries: FranchiseSaveSlotValidationEntry[] = [];

  for (const entry of FRANCHISE_SAVE_SLOT_MANIFEST) {
    entries.push(await validateEntry(entry, context, playerIds));
  }

  const summary = summarize(entries);
  return {
    franchiseId,
    seasonNumber: context.seasonNumber,
    seasonId: context.seasonId,
    checkedAt: Date.now(),
    status: overallStatus(summary),
    entries,
    summary,
  };
}

async function collectOwnedRecordsForEntry(
  entry: FranchiseSaveSlotManifestEntry,
  context: LifecycleContext,
): Promise<{
  databaseName: string;
  records: Record<string, unknown>[];
  status: FranchiseSaveSlotValidationStatus;
  messages: string[];
}> {
  const databaseName = resolvedDatabaseName(entry, context.franchiseId);

  if (entry.exportResponsibility !== 'include' && entry.deleteResponsibility !== 'delete-scoped') {
    return {
      databaseName,
      records: [],
      status: entry.lifecycle === 'excluded' || entry.lifecycle === 'deferred' ? 'skipped' : 'pass',
      messages: [`${entry.lifecycle} manifest entry; lifecycle execution is ${entry.exportResponsibility}.`],
    };
  }

  const result = await readStoreRecords<Record<string, unknown>>(databaseName, entry.storeName);
  if (result.kind !== 'ok') {
    const missingIsSupported = entry.supportedEmptyState || entry.lifecycle !== 'required';
    return {
      databaseName,
      records: [],
      status: missingIsSupported ? 'pass' : 'fail',
      messages: [
        result.kind === 'unavailable'
          ? result.message
          : `${result.kind === 'missing-database' ? 'Database' : 'Store'} is absent${missingIsSupported ? '; empty state is supported.' : '.'}`,
      ],
    };
  }

  const records = result.records.filter((record) =>
    recordBelongsToLifecycleEntry(entry, record, context),
  );
  const ambiguousCount = result.records.filter((record) =>
    recordIsLegacyOrAmbiguous(record, context, entry.requiredScopeKeys),
  ).length;
  const messages: string[] = [];
  if (records.length > 0) messages.push('Owned records found.');
  if (records.length === 0 && entry.supportedEmptyState) messages.push('Supported empty state.');
  if (records.length === 0 && !entry.supportedEmptyState) messages.push('Required owned records are missing.');
  if (entry.id === 'transition.journals') {
    const actionableCount = records.filter(
      (record) => record.status === 'pending' || record.status === 'failed',
    ).length;
    if (actionableCount > 0) {
      messages.push(`${actionableCount} pending/failed transition journal(s) included for repair visibility.`);
    }
  }
  if (ambiguousCount > 0) {
    messages.push(
      `${ambiguousCount} same-season legacy/ambiguous record(s) were ignored because required franchise scope keys were missing or mismatched.`,
    );
  }

  return {
    databaseName,
    records,
    status: records.length === 0 && !entry.supportedEmptyState
      ? 'fail'
      : ambiguousCount > 0 || (entry.id === 'transition.journals' && records.some((record) => record.status === 'pending' || record.status === 'failed'))
        ? 'warning'
        : 'pass',
    messages,
  };
}

export async function exportFranchiseSaveSlot(
  franchiseId: string,
  options: FranchiseSaveSlotValidationOptions = {},
): Promise<FranchiseSaveSlotExportPayload> {
  const validation = await validateFranchiseSaveSlot(franchiseId, options);
  const context = await collectLifecycleContext(franchiseId, {
    seasonNumber: validation.seasonNumber,
    seasonId: validation.seasonId,
    ...options,
  });
  const domains: FranchiseSaveSlotExportDomain[] = [];

  for (const entry of FRANCHISE_SAVE_SLOT_MANIFEST) {
    if (entry.exportResponsibility !== 'include') {
      domains.push({
        ...makeLifecycleDomainReport(
          entry,
          entry.exportResponsibility,
          0,
          entry.lifecycle === 'excluded' || entry.lifecycle === 'deferred' ? 'skipped' : 'pass',
          [`${entry.exportResponsibility} domain; no records exported.`],
        ),
        records: [],
      });
      continue;
    }

    const result = await collectOwnedRecordsForEntry(entry, context);
    domains.push({
      ...makeLifecycleDomainReport(
        entry,
        entry.exportResponsibility,
        result.records.length,
        result.status,
        result.messages,
        result.databaseName,
      ),
      records: result.records.map(cloneRecord),
    });
  }

  return {
    kind: 'kbl-franchise-save-slot',
    payloadVersion: FRANCHISE_SAVE_SLOT_EXPORT_VERSION,
    manifestVersion: FRANCHISE_SAVE_SLOT_MANIFEST_VERSION,
    exportedAt: Date.now(),
    franchiseId,
    seasonNumber: validation.seasonNumber,
    seasonId: validation.seasonId,
    validation,
    manifest: getFranchiseSaveSlotManifest(),
    domains,
    importPlan: {
      supported: false,
      strategy: 'validate-only',
      messages: [
        'Wave A defines and validates the import payload shape, but does not write imported records.',
        'Future import must be manifest-driven and collision-safe for exact restore and remapped clone flows.',
      ],
    },
  };
}

async function deleteOwnedRecordsForEntry(
  entry: FranchiseSaveSlotManifestEntry,
  context: LifecycleContext,
): Promise<FranchiseSaveSlotLifecycleDomainReport> {
  if (entry.deleteResponsibility !== 'delete-scoped') {
    return makeLifecycleDomainReport(
      entry,
      entry.deleteResponsibility,
      0,
      entry.lifecycle === 'excluded' || entry.lifecycle === 'deferred' ? 'skipped' : 'pass',
      [`${entry.deleteResponsibility} domain; no records deleted.`],
    );
  }

  const databaseName = resolvedDatabaseName(entry, context.franchiseId);
  const db = await openExistingDatabase(databaseName);
  if (db === null) {
    return makeLifecycleDomainReport(
      entry,
      entry.deleteResponsibility,
      0,
      entry.supportedEmptyState ? 'pass' : 'warning',
      ['Database is absent; no records deleted.'],
      databaseName,
    );
  }
  if (db === 'unknown') {
    return makeLifecycleDomainReport(
      entry,
      entry.deleteResponsibility,
      0,
      'warning',
      ['IndexedDB database enumeration is unavailable; delete skipped to avoid creating unknown databases.'],
      databaseName,
    );
  }

  const deletedKeys: IDBValidKey[] = [];
  let deletedActionableTransitionJournals = 0;
  try {
    if (!db.objectStoreNames.contains(entry.storeName)) {
      return makeLifecycleDomainReport(
        entry,
        entry.deleteResponsibility,
        0,
        entry.supportedEmptyState ? 'pass' : 'warning',
        ['Store is absent; no records deleted.'],
        databaseName,
      );
    }

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(entry.storeName, 'readwrite');
      const store = tx.objectStore(entry.storeName);
      const request = store.openCursor();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const record = cursor.value as Record<string, unknown>;
        if (recordBelongsToLifecycleEntry(entry, record, context)) {
          if (entry.id === 'transition.journals' && (record.status === 'pending' || record.status === 'failed')) {
            deletedActionableTransitionJournals += 1;
          }
          deletedKeys.push(cursor.primaryKey);
          cursor.delete();
        }
        cursor.continue();
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }

  for (const key of deletedKeys) {
    if (!syncEngine.isSuppressed()) {
      syncEngine.remove(databaseName, entry.storeName, key);
    }
  }

  return makeLifecycleDomainReport(
    entry,
    entry.deleteResponsibility,
    deletedKeys.length,
    deletedActionableTransitionJournals > 0 ? 'warning' : 'pass',
    deletedKeys.length > 0
      ? [
          'Owned records deleted.',
          ...(deletedActionableTransitionJournals > 0
            ? [`${deletedActionableTransitionJournals} pending/failed transition journal(s) were deleted with the save slot.`]
            : []),
        ]
      : ['No owned records found.'],
    databaseName,
  );
}

export async function deleteFranchiseSaveSlot(
  franchiseId: string,
  options: FranchiseSaveSlotValidationOptions = {},
): Promise<FranchiseSaveSlotDeleteReport> {
  const validation = await validateFranchiseSaveSlot(franchiseId, options);
  const context = await collectLifecycleContext(franchiseId, {
    seasonNumber: validation.seasonNumber,
    seasonId: validation.seasonId,
    ...options,
  });
  const domains: FranchiseSaveSlotLifecycleDomainReport[] = [];

  for (const entry of FRANCHISE_SAVE_SLOT_MANIFEST) {
    domains.push(await deleteOwnedRecordsForEntry(entry, context));
  }

  try {
    const { removeCanonicalPlayerInstancesForFranchise } = await import('./almanacStorage');
    const almanacCleanup = await removeCanonicalPlayerInstancesForFranchise(franchiseId);
    const affectedRecords = almanacCleanup.updated + almanacCleanup.deleted;
    domains.push({
      manifestEntryId: 'almanac.canonicalPlayers',
      domain: 'Almanac canonical player franchise instances',
      databaseName: 'kbl-tracker',
      storeName: 'almanacCanonicalPlayers',
      lifecycle: 'optional',
      responsibility: 'delete-scoped',
      recordCount: affectedRecords,
      status: 'pass',
      messages:
        affectedRecords > 0
          ? [
              `Removed ${almanacCleanup.updated} franchise instance set(s) and deleted ${almanacCleanup.deleted} orphan canonical player record(s).`,
            ]
          : ['No owned Almanac canonical player instances found.'],
    });
  } catch (error) {
    domains.push({
      manifestEntryId: 'almanac.canonicalPlayers',
      domain: 'Almanac canonical player franchise instances',
      databaseName: 'kbl-tracker',
      storeName: 'almanacCanonicalPlayers',
      lifecycle: 'optional',
      responsibility: 'delete-scoped',
      recordCount: 0,
      status: 'warning',
      messages: [`Almanac canonical player cleanup did not complete: ${error instanceof Error ? error.message : String(error)}`],
    });
  }

  try {
    const { deleteFranchiseDatabase } = await import('./franchisePlayerStorage');
    await deleteFranchiseDatabase(franchiseId);
  } catch (error) {
    domains.push({
      manifestEntryId: 'franchise.database',
      domain: 'Per-franchise IndexedDB',
      databaseName: getFranchiseDatabaseName(franchiseId),
      storeName: '*',
      lifecycle: 'required',
      responsibility: 'delete-scoped',
      recordCount: 0,
      status: 'warning',
      messages: [`Per-franchise database deletion did not complete: ${error instanceof Error ? error.message : String(error)}`],
    });
  }

  const hasWarnings = domains.some((domain) => domain.status === 'warning');
  const hasFailures = domains.some((domain) => domain.status === 'fail');
  return {
    franchiseId,
    deletedAt: Date.now(),
    validation,
    domains,
    status: hasFailures ? 'invalid' : hasWarnings ? 'warning' : 'valid',
  };
}

export function validateFranchiseSaveSlotImportPayload(
  payload: unknown,
): FranchiseSaveSlotImportValidationReport {
  const messages: string[] = [];
  const domainCounts: Record<string, number> = {};

  if (!isRecord(payload)) {
    return {
      status: 'invalid',
      checkedAt: Date.now(),
      messages: ['Import payload must be an object.'],
      domainCounts,
    };
  }

  if (payload.kind !== 'kbl-franchise-save-slot') {
    messages.push('Unsupported import payload kind; legacy partial franchise imports are not safe for Wave A.');
  }
  if (payload.payloadVersion !== FRANCHISE_SAVE_SLOT_EXPORT_VERSION) {
    messages.push(`Unsupported payload version: ${String(payload.payloadVersion ?? 'missing')}.`);
  }
  if (payload.manifestVersion !== FRANCHISE_SAVE_SLOT_MANIFEST_VERSION) {
    messages.push(`Unsupported manifest version: ${String(payload.manifestVersion ?? 'missing')}.`);
  }
  if (typeof payload.franchiseId !== 'string' || payload.franchiseId.length === 0) {
    messages.push('Missing franchiseId.');
  }
  if (!Array.isArray(payload.domains)) {
    messages.push('Missing domains array.');
  } else {
    for (const domain of payload.domains) {
      if (!isRecord(domain)) {
        messages.push('Domain entry must be an object.');
        continue;
      }
      const manifestEntryId = typeof domain.manifestEntryId === 'string' ? domain.manifestEntryId : '';
      if (!manifestEntryId) {
        messages.push('Domain entry missing manifestEntryId.');
        continue;
      }
      const records = Array.isArray(domain.records) ? domain.records : [];
      domainCounts[manifestEntryId] = records.length;
    }

    const exportedIds = new Set(Object.keys(domainCounts));
    for (const manifestEntry of FRANCHISE_SAVE_SLOT_MANIFEST) {
      if (manifestEntry.exportResponsibility === 'include' && !exportedIds.has(manifestEntry.id)) {
        messages.push(`Missing exported domain: ${manifestEntry.id}.`);
      }
    }
  }

  return {
    status: messages.length > 0 ? 'invalid' : 'valid',
    payloadVersion: typeof payload.payloadVersion === 'number' ? payload.payloadVersion : undefined,
    manifestVersion: typeof payload.manifestVersion === 'number' ? payload.manifestVersion : undefined,
    franchiseId: typeof payload.franchiseId === 'string' ? payload.franchiseId : undefined,
    checkedAt: Date.now(),
    messages,
    domainCounts,
  };
}
