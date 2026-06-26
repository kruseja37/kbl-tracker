import type {
  FranchiseSprayChartRole,
  FranchiseSprayChartRow,
  FranchiseStadiumFoundationReport,
  FranchiseStadiumFoundationScope,
} from './franchiseStadiumFoundation';
import type { CompletedGameRecord } from './gameStorage';

export const FRANCHISE_STADIUM_RECORDS_STORAGE_VERSION = 'franchise-stadium-records-storage-v1';

export type FranchiseStadiumRecordType =
  | 'highest-team-runs-game'
  | 'highest-combined-runs-game'
  | 'largest-run-differential-game'
  | 'most-batting-spray-events-player'
  | 'most-pitching-spray-events-pitcher'
  | 'most-fielding-spray-events-fielder'
  | 'no-hitter'
  | 'perfect-game';

export interface FranchiseStadiumRecordPolicies {
  adaptiveParkFactorPersistenceAllowed: false;
  parkAdjustedWarAllowed: false;
  moraleMutationAllowed: false;
  randomEventPromptAllowed: false;
  designationMutationAllowed: false;
  salaryMovementAllowed: false;
  relationshipMutationAllowed: false;
  mode3HandoffAllowed: false;
}

export interface FranchiseStadiumRecord extends FranchiseStadiumFoundationScope {
  id: string;
  storageVersion: typeof FRANCHISE_STADIUM_RECORDS_STORAGE_VERSION;
  stadiumId: string;
  stadiumName: string | null;
  recordType: FranchiseStadiumRecordType;
  recordKey: string;
  value: number;
  valueLabel: string;
  leaderTeamIds: string[];
  leaderPlayerIds: string[];
  leaderPlayerNames: string[];
  sourceGameIds: string[];
  evidenceIds: string[];
  evidenceSummary: string;
  blockers: string[];
  limitations: string[];
  policies: FranchiseStadiumRecordPolicies;
  scopeKey: string;
  stadiumScopeKey: string;
  identityKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface FranchiseStadiumRecordsScopeInput extends FranchiseStadiumFoundationScope {}

export interface FranchiseStadiumRecordChange {
  stadiumId: string;
  recordType: FranchiseStadiumRecordType;
  recordKey: string;
  changeKind: 'set' | 'overtake';
  priorValue: number | null;
  priorLeaderPlayerIds: string[];
  newValue: number;
  newLeaderPlayerIds: string[];
}

export interface UpsertFranchiseStadiumRecordsResult {
  records: FranchiseStadiumRecord[];
  changes: FranchiseStadiumRecordChange[];
  policies: FranchiseStadiumRecordPolicies;
  blockers: string[];
  persisted: boolean;
  persistsAdaptiveParkFactors: false;
  allowsParkAdjustedWar: false;
  mutatesMorale: false;
  createsRandomEventPrompts: false;
  mutatesDesignations: false;
  movesSalary: false;
  mutatesRelationships: false;
  mode3HandoffAllowed: false;
}

interface RecordCandidate {
  stadiumId: string;
  stadiumName: string | null;
  recordType: FranchiseStadiumRecordType;
  recordKey: string;
  value: number;
  valueLabel: string;
  leaderTeamIds: string[];
  leaderPlayerIds: string[];
  leaderPlayerNames: string[];
  sourceGameIds: string[];
  evidenceIds: string[];
  evidenceSummary: string;
}

const DB_NAME = 'kbl-franchise-stadium-records';
const DB_VERSION = 1;
const STORES = {
  RECORDS: 'stadiumRecords',
} as const;

let dbInstance: IDBDatabase | null = null;

export function resetFranchiseStadiumRecordsDatabaseForTests(): void {
  dbInstance?.close();
  dbInstance = null;
}

export async function clearFranchiseStadiumRecordsDatabaseForTests(): Promise<void> {
  const db = await initFranchiseStadiumRecordsDatabase();
  const tx = db.transaction(STORES.RECORDS, 'readwrite');
  tx.objectStore(STORES.RECORDS).clear();
  await transactionToPromise(tx);
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function ensureIndex(
  store: IDBObjectStore,
  name: string,
  keyPath: string | string[],
  options?: IDBIndexParameters,
): void {
  if (!store.indexNames.contains(name)) {
    store.createIndex(name, keyPath, options);
  }
}

export async function initFranchiseStadiumRecordsDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORES.RECORDS)) {
        store = db.createObjectStore(STORES.RECORDS, { keyPath: 'id' });
      } else {
        store = (event.target as IDBOpenDBRequest).transaction!.objectStore(STORES.RECORDS);
      }
      ensureIndex(store, 'by_scope', 'scopeKey', { unique: false });
      ensureIndex(store, 'by_stadium_scope', 'stadiumScopeKey', { unique: false });
      ensureIndex(store, 'by_identity', 'identityKey', { unique: true });
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };
  });
}

function nowISO(): string {
  return new Date().toISOString();
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasExplicitScope(scope: FranchiseStadiumRecordsScopeInput): boolean {
  return Boolean(
    hasText(scope.franchiseId) &&
    hasText(scope.seasonId) &&
    hasText(scope.statsScopeId) &&
    Number.isInteger(scope.seasonNumber) &&
    scope.seasonNumber > 0,
  );
}

function recordsPolicies(): FranchiseStadiumRecordPolicies {
  return {
    adaptiveParkFactorPersistenceAllowed: false,
    parkAdjustedWarAllowed: false,
    moraleMutationAllowed: false,
    randomEventPromptAllowed: false,
    designationMutationAllowed: false,
    salaryMovementAllowed: false,
    relationshipMutationAllowed: false,
    mode3HandoffAllowed: false,
  };
}

function scopeKey(scope: FranchiseStadiumRecordsScopeInput): string {
  return [
    scope.franchiseId,
    scope.seasonId,
    scope.statsScopeId,
    String(scope.seasonNumber),
  ].join(':');
}

function stadiumScopeKey(scope: FranchiseStadiumRecordsScopeInput, stadiumId: string): string {
  return `${scopeKey(scope)}:${stadiumId}`;
}

function identityKey(
  scope: FranchiseStadiumRecordsScopeInput,
  stadiumId: string,
  recordType: FranchiseStadiumRecordType,
  recordKey: string,
): string {
  return `${stadiumScopeKey(scope, stadiumId)}:${recordType}:${recordKey}`;
}

function recordId(identity: string): string {
  return `stadium-record:${identity}`;
}

function sameScope(
  scope: FranchiseStadiumRecordsScopeInput,
  row: {
    franchiseId?: string | null;
    seasonId?: string | null;
    statsScopeId?: string | null;
    seasonNumber?: number | null;
  },
): boolean {
  return (
    row.franchiseId === scope.franchiseId &&
    row.seasonId === scope.seasonId &&
    row.statsScopeId === scope.statsScopeId &&
    row.seasonNumber === scope.seasonNumber
  );
}

function gameIsComplete(game: CompletedGameRecord): boolean {
  return (game as CompletedGameRecord & { aggregationStatus?: string }).aggregationStatus !== 'incomplete';
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => hasText(value))))
    .sort((left, right) => left.localeCompare(right));
}

function recordLimitations(): string[] {
  return [
    'Stadium record is scoped read-only evidence from completed archive/foundation data.',
    'Stadium records do not persist adaptive park factors or feed final park-adjusted WAR/value in this slice.',
    'Stadium records do not mutate morale, designations, salary, relationships, stories, GameTracker, or Mode 3.',
  ];
}

function candidateSummary(
  candidate: Pick<RecordCandidate, 'recordType' | 'value' | 'sourceGameIds' | 'leaderPlayerNames' | 'leaderTeamIds'>,
): string {
  if (candidate.recordType === 'highest-team-runs-game') {
    return `Highest team runs at stadium: ${candidate.value}.`;
  }
  if (candidate.recordType === 'highest-combined-runs-game') {
    return `Highest combined runs at stadium: ${candidate.value}.`;
  }
  if (candidate.recordType === 'largest-run-differential-game') {
    return `Largest run differential at stadium: ${candidate.value}.`;
  }
  if (candidate.recordType === 'no-hitter') {
    return `No-hitter context at stadium from ${candidate.sourceGameIds.length} completed game(s).`;
  }
  if (candidate.recordType === 'perfect-game') {
    return `Perfect-game context at stadium from ${candidate.sourceGameIds.length} completed game(s).`;
  }
  const leaderLabel = candidate.leaderPlayerNames.length > 0
    ? candidate.leaderPlayerNames.join(', ')
    : candidate.leaderTeamIds.join(', ');
  return `${leaderLabel || 'Leader'} has ${candidate.value} scoped spray event(s) at stadium.`;
}

function recordFromCandidate(
  scope: FranchiseStadiumRecordsScopeInput,
  candidate: RecordCandidate,
  timestamp: string,
  existing?: FranchiseStadiumRecord,
): FranchiseStadiumRecord {
  const identity = identityKey(scope, candidate.stadiumId, candidate.recordType, candidate.recordKey);
  return {
    id: recordId(identity),
    storageVersion: FRANCHISE_STADIUM_RECORDS_STORAGE_VERSION,
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: scope.seasonNumber,
    stadiumId: candidate.stadiumId,
    stadiumName: candidate.stadiumName,
    recordType: candidate.recordType,
    recordKey: candidate.recordKey,
    value: candidate.value,
    valueLabel: candidate.valueLabel,
    leaderTeamIds: uniqueSorted(candidate.leaderTeamIds),
    leaderPlayerIds: uniqueSorted(candidate.leaderPlayerIds),
    leaderPlayerNames: uniqueSorted(candidate.leaderPlayerNames),
    sourceGameIds: uniqueSorted(candidate.sourceGameIds),
    evidenceIds: uniqueSorted(candidate.evidenceIds),
    evidenceSummary: candidate.evidenceSummary || candidateSummary(candidate),
    blockers: [],
    limitations: recordLimitations(),
    policies: recordsPolicies(),
    scopeKey: scopeKey(scope),
    stadiumScopeKey: stadiumScopeKey(scope, candidate.stadiumId),
    identityKey: identity,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

async function getRecordById(id: string): Promise<FranchiseStadiumRecord | null> {
  const db = await initFranchiseStadiumRecordsDatabase();
  const tx = db.transaction(STORES.RECORDS, 'readonly');
  const record = await requestToPromise<FranchiseStadiumRecord | undefined>(
    tx.objectStore(STORES.RECORDS).get(id),
  );
  return record ?? null;
}

function scoreRecordCandidates(
  scope: FranchiseStadiumRecordsScopeInput,
  completedGames: CompletedGameRecord[],
  blockers: string[],
): RecordCandidate[] {
  const stadiumGames = new Map<string, CompletedGameRecord[]>();
  for (const game of completedGames) {
    if (!sameScope(scope, game)) {
      blockers.push(`Stadium record skipped for game ${game.gameId}: completed game scope mismatch.`);
      continue;
    }
    if (!gameIsComplete(game)) continue;
    if (!hasText(game.stadiumId)) {
      blockers.push(`Stadium record skipped for game ${game.gameId}: non-empty stadium id is required.`);
      continue;
    }
    const games = stadiumGames.get(game.stadiumId) ?? [];
    games.push(game);
    stadiumGames.set(game.stadiumId, games);
  }

  const candidates: RecordCandidate[] = [];
  for (const [stadiumId, games] of stadiumGames.entries()) {
    const stadiumName = games.find((game) => hasText(game.stadiumName))?.stadiumName ?? null;
    const teamRunRows = games.flatMap((game) => [
      {
        value: game.finalScore.away,
        teamId: game.awayTeamId,
        gameId: game.gameId,
      },
      {
        value: game.finalScore.home,
        teamId: game.homeTeamId,
        gameId: game.gameId,
      },
    ]);
    const highestTeamRuns = Math.max(...teamRunRows.map((row) => row.value));
    const teamRunLeaders = teamRunRows.filter((row) => row.value === highestTeamRuns);
    candidates.push({
      stadiumId,
      stadiumName,
      recordType: 'highest-team-runs-game',
      recordKey: 'single-game',
      value: highestTeamRuns,
      valueLabel: `${highestTeamRuns} runs`,
      leaderTeamIds: teamRunLeaders.map((row) => row.teamId),
      leaderPlayerIds: [],
      leaderPlayerNames: [],
      sourceGameIds: teamRunLeaders.map((row) => row.gameId),
      evidenceIds: teamRunLeaders.map((row) => `${row.gameId}:${row.teamId}:runs`),
      evidenceSummary: `Highest team runs at ${stadiumName ?? stadiumId}: ${highestTeamRuns}.`,
    });

    const combinedRows = games.map((game) => ({
      value: game.finalScore.away + game.finalScore.home,
      gameId: game.gameId,
      teamIds: [game.awayTeamId, game.homeTeamId],
    }));
    const highestCombinedRuns = Math.max(...combinedRows.map((row) => row.value));
    const combinedLeaders = combinedRows.filter((row) => row.value === highestCombinedRuns);
    candidates.push({
      stadiumId,
      stadiumName,
      recordType: 'highest-combined-runs-game',
      recordKey: 'single-game',
      value: highestCombinedRuns,
      valueLabel: `${highestCombinedRuns} combined runs`,
      leaderTeamIds: combinedLeaders.flatMap((row) => row.teamIds),
      leaderPlayerIds: [],
      leaderPlayerNames: [],
      sourceGameIds: combinedLeaders.map((row) => row.gameId),
      evidenceIds: combinedLeaders.map((row) => `${row.gameId}:combined-runs`),
      evidenceSummary: `Highest combined runs at ${stadiumName ?? stadiumId}: ${highestCombinedRuns}.`,
    });

    const differentialRows = games.map((game) => ({
      value: Math.abs(game.finalScore.away - game.finalScore.home),
      gameId: game.gameId,
      teamIds: [game.awayTeamId, game.homeTeamId],
    }));
    const largestDifferential = Math.max(...differentialRows.map((row) => row.value));
    const differentialLeaders = differentialRows.filter((row) => row.value === largestDifferential);
    candidates.push({
      stadiumId,
      stadiumName,
      recordType: 'largest-run-differential-game',
      recordKey: 'single-game',
      value: largestDifferential,
      valueLabel: `${largestDifferential} run differential`,
      leaderTeamIds: differentialLeaders.flatMap((row) => row.teamIds),
      leaderPlayerIds: [],
      leaderPlayerNames: [],
      sourceGameIds: differentialLeaders.map((row) => row.gameId),
      evidenceIds: differentialLeaders.map((row) => `${row.gameId}:run-differential`),
      evidenceSummary: `Largest run differential at ${stadiumName ?? stadiumId}: ${largestDifferential}.`,
    });

    candidates.push(...achievementCandidates(stadiumId, stadiumName, games));
  }
  return candidates;
}

function fameEventTypeKey(eventType: string): string {
  return eventType.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function achievementCandidates(
  stadiumId: string,
  stadiumName: string | null,
  games: CompletedGameRecord[],
): RecordCandidate[] {
  const candidates: RecordCandidate[] = [];
  for (const game of games) {
    for (const event of game.fameEvents ?? []) {
      const typeKey = fameEventTypeKey(event.eventType);
      const recordType = typeKey.includes('perfect-game')
        ? 'perfect-game'
        : typeKey.includes('no-hitter')
          ? 'no-hitter'
          : null;
      if (!recordType) continue;
      const eventId = hasText(event.id) ? event.id : `${game.gameId}:${event.eventType}:${event.playerId}`;
      candidates.push({
        stadiumId,
        stadiumName,
        recordType,
        recordKey: eventId,
        value: 1,
        valueLabel: recordType === 'perfect-game' ? 'Perfect game' : 'No-hitter',
        leaderTeamIds: [event.playerTeam],
        leaderPlayerIds: [event.playerId],
        leaderPlayerNames: [event.playerName],
        sourceGameIds: [game.gameId],
        evidenceIds: [eventId],
        evidenceSummary: event.description ?? `${event.playerName} recorded a ${recordType.replace('-', ' ')} at ${stadiumName ?? stadiumId}.`,
      });
    }
  }
  return candidates;
}

function sprayRecordTypeForRole(role: FranchiseSprayChartRole): FranchiseStadiumRecordType {
  if (role === 'batting') return 'most-batting-spray-events-player';
  if (role === 'pitching') return 'most-pitching-spray-events-pitcher';
  return 'most-fielding-spray-events-fielder';
}

function sprayCandidates(rows: FranchiseSprayChartRow[]): RecordCandidate[] {
  const grouped = new Map<string, FranchiseSprayChartRow[]>();
  for (const row of rows) {
    if (!hasText(row.stadiumId) || !hasText(row.playerId)) continue;
    const key = `${row.stadiumId}:${row.role}:${row.playerId}`;
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }

  const byStadiumRole = new Map<string, Array<{ playerId: string; rows: FranchiseSprayChartRow[] }>>();
  for (const group of grouped.values()) {
    const first = group[0];
    const key = `${first.stadiumId}:${first.role}`;
    const rowsForRole = byStadiumRole.get(key) ?? [];
    rowsForRole.push({ playerId: first.playerId, rows: group });
    byStadiumRole.set(key, rowsForRole);
  }

  const candidates: RecordCandidate[] = [];
  for (const groups of byStadiumRole.values()) {
    const maxCount = Math.max(...groups.map((group) => group.rows.length));
    const leaders = groups.filter((group) => group.rows.length === maxCount);
    const first = leaders[0].rows[0];
    const role = first.role;
    const recordType = sprayRecordTypeForRole(role);
    candidates.push({
      stadiumId: first.stadiumId,
      stadiumName: first.stadiumName,
      recordType,
      recordKey: 'leader',
      value: maxCount,
      valueLabel: `${maxCount} ${role} spray event${maxCount === 1 ? '' : 's'}`,
      leaderTeamIds: leaders.flatMap((leader) => leader.rows.map((row) => row.teamId)),
      leaderPlayerIds: leaders.map((leader) => leader.playerId),
      leaderPlayerNames: leaders.map((leader) => leader.rows[0].playerName),
      sourceGameIds: leaders.flatMap((leader) => leader.rows.map((row) => row.gameId)),
      evidenceIds: leaders.flatMap((leader) => leader.rows.map((row) => row.eventId)),
      evidenceSummary: `Most ${role} spray events at ${first.stadiumName}: ${maxCount}.`,
    });
  }
  return candidates;
}

function buildCandidatesFromFoundation(
  report: FranchiseStadiumFoundationReport,
  completedGames: CompletedGameRecord[],
  blockers: string[],
): RecordCandidate[] {
  return [
    ...scoreRecordCandidates(report.scope, completedGames, blockers),
    ...sprayCandidates(report.sprayCharts.rows),
  ];
}

export async function upsertFranchiseStadiumRecordsFromFoundationReport(
  report: FranchiseStadiumFoundationReport,
  options: {
    completedGames?: CompletedGameRecord[];
    timestamp?: string;
  } = {},
): Promise<UpsertFranchiseStadiumRecordsResult> {
  const scope = {
    franchiseId: report.scope.franchiseId,
    seasonId: report.scope.seasonId,
    statsScopeId: report.scope.statsScopeId,
    seasonNumber: report.scope.seasonNumber,
  };
  const policies = recordsPolicies();
  const blockers: string[] = [];
  if (!hasExplicitScope(scope)) {
    blockers.push('Explicit non-empty franchise, season, stats scope, and positive season number are required before stadium records can be stored.');
  }
  if (blockers.length > 0) {
    return emptyResult(policies, blockers);
  }

  const timestamp = options.timestamp ?? nowISO();
  const candidates = buildCandidatesFromFoundation(report, options.completedGames ?? [], blockers);
  const records: FranchiseStadiumRecord[] = [];
  const changes: FranchiseStadiumRecordChange[] = [];
  for (const candidate of candidates) {
    if (!hasText(candidate.stadiumId)) {
      blockers.push(`Stadium record skipped for ${candidate.recordType}: non-empty stadium id is required.`);
      continue;
    }
    const identity = identityKey(scope, candidate.stadiumId, candidate.recordType, candidate.recordKey);
    const existing = await getRecordById(recordId(identity));
    const newRecord = recordFromCandidate(scope, candidate, timestamp, existing ?? undefined);
    const newSole = newRecord.leaderPlayerIds.length === 1 ? newRecord.leaderPlayerIds[0] : null;
    const priorSole = existing && existing.leaderPlayerIds.length === 1 ? existing.leaderPlayerIds[0] : null;
    if (newSole !== null && newSole !== priorSole) {
      changes.push({
        stadiumId: newRecord.stadiumId,
        recordType: newRecord.recordType,
        recordKey: newRecord.recordKey,
        changeKind: existing ? 'overtake' : 'set',
        priorValue: existing?.value ?? null,
        priorLeaderPlayerIds: existing?.leaderPlayerIds ?? [],
        newValue: newRecord.value,
        newLeaderPlayerIds: newRecord.leaderPlayerIds,
      });
    }
    records.push(newRecord);
  }

  if (records.length === 0) {
    return emptyResult(policies, blockers);
  }

  const db = await initFranchiseStadiumRecordsDatabase();
  const tx = db.transaction(STORES.RECORDS, 'readwrite');
  const store = tx.objectStore(STORES.RECORDS);
  for (const record of records) {
    store.put(record);
  }
  await transactionToPromise(tx);

  return {
    records,
    changes: changes.sort((left, right) =>
      left.stadiumId.localeCompare(right.stadiumId) ||
      left.recordType.localeCompare(right.recordType) ||
      left.recordKey.localeCompare(right.recordKey),
    ),
    policies,
    blockers,
    persisted: true,
    persistsAdaptiveParkFactors: false,
    allowsParkAdjustedWar: false,
    mutatesMorale: false,
    createsRandomEventPrompts: false,
    mutatesDesignations: false,
    movesSalary: false,
    mutatesRelationships: false,
    mode3HandoffAllowed: false,
  };
}

function emptyResult(
  policies: FranchiseStadiumRecordPolicies,
  blockers: string[],
): UpsertFranchiseStadiumRecordsResult {
  return {
    records: [],
    changes: [],
    policies,
    blockers,
    persisted: false,
    persistsAdaptiveParkFactors: false,
    allowsParkAdjustedWar: false,
    mutatesMorale: false,
    createsRandomEventPrompts: false,
    mutatesDesignations: false,
    movesSalary: false,
    mutatesRelationships: false,
    mode3HandoffAllowed: false,
  };
}

export async function listFranchiseStadiumRecords(
  scope: FranchiseStadiumRecordsScopeInput,
): Promise<FranchiseStadiumRecord[]> {
  if (!hasExplicitScope(scope)) return [];
  const db = await initFranchiseStadiumRecordsDatabase();
  const tx = db.transaction(STORES.RECORDS, 'readonly');
  const records = await requestToPromise<FranchiseStadiumRecord[]>(
    tx.objectStore(STORES.RECORDS).index('by_scope').getAll(scopeKey(scope)),
  );
  return (records ?? [])
    .filter((record) =>
      record.franchiseId === scope.franchiseId &&
      record.seasonId === scope.seasonId &&
      record.statsScopeId === scope.statsScopeId &&
      record.seasonNumber === scope.seasonNumber,
    )
    .sort((left, right) =>
      left.stadiumId.localeCompare(right.stadiumId) ||
      left.recordType.localeCompare(right.recordType) ||
      left.recordKey.localeCompare(right.recordKey),
    );
}

export async function getFranchiseStadiumRecord(
  scope: FranchiseStadiumRecordsScopeInput & {
    stadiumId: string;
    recordType: FranchiseStadiumRecordType;
    recordKey: string;
  },
): Promise<FranchiseStadiumRecord | null> {
  if (!hasExplicitScope(scope) || !hasText(scope.stadiumId) || !hasText(scope.recordKey)) return null;
  const db = await initFranchiseStadiumRecordsDatabase();
  const tx = db.transaction(STORES.RECORDS, 'readonly');
  const records = await requestToPromise<FranchiseStadiumRecord[]>(
    tx.objectStore(STORES.RECORDS).index('by_stadium_scope').getAll(stadiumScopeKey(scope, scope.stadiumId)),
  );
  return (records ?? []).find((record) =>
    record.franchiseId === scope.franchiseId &&
    record.seasonId === scope.seasonId &&
    record.statsScopeId === scope.statsScopeId &&
    record.seasonNumber === scope.seasonNumber &&
    record.stadiumId === scope.stadiumId &&
    record.recordType === scope.recordType &&
    record.recordKey === scope.recordKey,
  ) ?? null;
}
