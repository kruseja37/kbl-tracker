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
  | 'perfect-game'
  | 'farthest-hr-rhb'
  | 'farthest-hr-lhb'
  | 'most-hr-here-season'
  | 'most-hr-allowed-pitcher'
  | 'highest-cumulative-wpa-position'
  | 'lowest-cumulative-wpa-position'
  | 'highest-cumulative-wpa-pitcher'
  | 'lowest-cumulative-wpa-pitcher'
  | 'largest-positive-wpa-swing'
  | 'largest-negative-wpa-swing';

export const FRANCHISE_STADIUM_RECORD_TYPE_POLARITY: Record<FranchiseStadiumRecordType, 1 | -1 | 0> = {
  'highest-team-runs-game': 0,
  'highest-combined-runs-game': 0,
  'largest-run-differential-game': 0,
  'most-batting-spray-events-player': 0,
  'most-pitching-spray-events-pitcher': 0,
  'most-fielding-spray-events-fielder': 0,
  'no-hitter': 0,
  'perfect-game': 0,
  'farthest-hr-rhb': 1,
  'farthest-hr-lhb': 1,
  'most-hr-here-season': 1,
  'most-hr-allowed-pitcher': -1,
  'highest-cumulative-wpa-position': 1,
  'lowest-cumulative-wpa-position': -1,
  'highest-cumulative-wpa-pitcher': 1,
  'lowest-cumulative-wpa-pitcher': -1,
  'largest-positive-wpa-swing': 1,
  'largest-negative-wpa-swing': -1,
};

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

type StadiumEvent = NonNullable<CompletedGameRecord['atBatEvents']>[number] & {
  sourceGameId: string;
};

type StadiumWpaRow = NonNullable<CompletedGameRecord['playerWpaTotals']>[number] & {
  sourceGameId: string;
};

interface PlayerAggregate {
  playerId: string;
  playerName: string;
  teamIds: string[];
  sourceGameIds: string[];
  evidenceIds: string[];
  value: number;
}

function isHomeRunResult(result: string): boolean {
  return result === 'HR' || result === 'ITPHR';
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function playerAggregate(
  map: Map<string, PlayerAggregate>,
  playerId: string,
  playerName: string,
  teamId: string,
): PlayerAggregate {
  const existing = map.get(playerId);
  if (existing) {
    if (hasText(teamId)) existing.teamIds.push(teamId);
    return existing;
  }
  const aggregate: PlayerAggregate = {
    playerId,
    playerName,
    teamIds: hasText(teamId) ? [teamId] : [],
    sourceGameIds: [],
    evidenceIds: [],
    value: 0,
  };
  map.set(playerId, aggregate);
  return aggregate;
}

function leadersByValue(
  aggregates: Iterable<PlayerAggregate>,
  value: number,
): PlayerAggregate[] {
  return Array.from(aggregates).filter((aggregate) => aggregate.value === value);
}

function candidateFromAggregates(input: {
  stadiumId: string;
  stadiumName: string | null;
  recordType: FranchiseStadiumRecordType;
  value: number;
  valueLabel: string;
  leaders: PlayerAggregate[];
  evidenceSummary: string;
}): RecordCandidate {
  return {
    stadiumId: input.stadiumId,
    stadiumName: input.stadiumName,
    recordType: input.recordType,
    recordKey: 'leader',
    value: input.value,
    valueLabel: input.valueLabel,
    leaderTeamIds: input.leaders.flatMap((leader) => leader.teamIds),
    leaderPlayerIds: input.leaders.map((leader) => leader.playerId),
    leaderPlayerNames: input.leaders.map((leader) => leader.playerName),
    sourceGameIds: input.leaders.flatMap((leader) => leader.sourceGameIds),
    evidenceIds: input.leaders.flatMap((leader) => leader.evidenceIds),
    evidenceSummary: input.evidenceSummary,
  };
}

function pushFarthestHrCandidate(
  candidates: RecordCandidate[],
  stadiumId: string,
  stadiumName: string | null,
  events: StadiumEvent[],
  handedness: 'R' | 'L',
  recordType: 'farthest-hr-rhb' | 'farthest-hr-lhb',
): void {
  const hrEvents = events.filter((event) =>
    isHomeRunResult(event.result) &&
    event.batterContext?.handedness === handedness &&
    typeof event.enrichment?.hrDistance === 'number' &&
    Number.isFinite(event.enrichment.hrDistance),
  );
  if (hrEvents.length === 0) return;

  const maxDistance = Math.max(...hrEvents.map((event) => event.enrichment!.hrDistance!));
  const leaders = hrEvents.filter((event) => event.enrichment!.hrDistance === maxDistance);
  candidates.push({
    stadiumId,
    stadiumName,
    recordType,
    recordKey: 'leader',
    value: maxDistance,
    valueLabel: `${maxDistance} ft`,
    leaderTeamIds: leaders.map((event) => event.batterTeamId),
    leaderPlayerIds: leaders.map((event) => event.batterId),
    leaderPlayerNames: leaders.map((event) => event.batterName),
    sourceGameIds: leaders.map((event) => event.sourceGameId),
    evidenceIds: leaders.map((event) => event.eventId),
    evidenceSummary: `Farthest ${handedness === 'R' ? 'right-handed' : 'left-handed'} home run at ${stadiumName ?? stadiumId}: ${maxDistance} ft.`,
  });
}

function pushHomeRunCountCandidates(
  candidates: RecordCandidate[],
  stadiumId: string,
  stadiumName: string | null,
  events: StadiumEvent[],
): void {
  const batterCounts = new Map<string, PlayerAggregate>();
  const pitcherCounts = new Map<string, PlayerAggregate>();
  for (const event of events) {
    if (!isHomeRunResult(event.result)) continue;
    if (hasText(event.batterId)) {
      const batter = playerAggregate(batterCounts, event.batterId, event.batterName, event.batterTeamId);
      batter.value += 1;
      batter.sourceGameIds.push(event.sourceGameId);
      batter.evidenceIds.push(event.eventId);
    }
    if (hasText(event.pitcherId)) {
      const pitcher = playerAggregate(pitcherCounts, event.pitcherId, event.pitcherName, event.pitcherTeamId);
      pitcher.value += 1;
      pitcher.sourceGameIds.push(event.sourceGameId);
      pitcher.evidenceIds.push(event.eventId);
    }
  }

  if (batterCounts.size > 0) {
    const maxCount = Math.max(...Array.from(batterCounts.values()).map((aggregate) => aggregate.value));
    candidates.push(candidateFromAggregates({
      stadiumId,
      stadiumName,
      recordType: 'most-hr-here-season',
      value: maxCount,
      valueLabel: `${maxCount} HR${maxCount === 1 ? '' : 's'}`,
      leaders: leadersByValue(batterCounts.values(), maxCount),
      evidenceSummary: `Most home runs hit at ${stadiumName ?? stadiumId}: ${maxCount}.`,
    }));
  }

  if (pitcherCounts.size > 0) {
    const maxCount = Math.max(...Array.from(pitcherCounts.values()).map((aggregate) => aggregate.value));
    candidates.push(candidateFromAggregates({
      stadiumId,
      stadiumName,
      recordType: 'most-hr-allowed-pitcher',
      value: maxCount,
      valueLabel: `${maxCount} HR${maxCount === 1 ? '' : 's'} allowed`,
      leaders: leadersByValue(pitcherCounts.values(), maxCount),
      evidenceSummary: `Most home runs allowed at ${stadiumName ?? stadiumId}: ${maxCount}.`,
    }));
  }
}

function pushCumulativeWpaCandidates(
  candidates: RecordCandidate[],
  stadiumId: string,
  stadiumName: string | null,
  wpaRows: StadiumWpaRow[],
): void {
  if (wpaRows.length === 0) return;

  const positionWpa = new Map<string, PlayerAggregate>();
  const pitcherWpa = new Map<string, PlayerAggregate>();
  for (const row of wpaRows) {
    if (!hasText(row.playerId)) continue;
    const position = playerAggregate(positionWpa, row.playerId, row.playerName, row.teamId);
    position.value += finiteNumber(row.totalWpa) - finiteNumber(row.pitchingWpa);
    position.sourceGameIds.push(row.sourceGameId);
    position.evidenceIds.push(`${row.sourceGameId}:${row.playerId}:position-wpa`);

    const pitcher = playerAggregate(pitcherWpa, row.playerId, row.playerName, row.teamId);
    pitcher.value += finiteNumber(row.pitchingWpa);
    pitcher.sourceGameIds.push(row.sourceGameId);
    pitcher.evidenceIds.push(`${row.sourceGameId}:${row.playerId}:pitching-wpa`);
  }

  const positionEligible = Array.from(positionWpa.values()).filter((aggregate) => aggregate.value !== 0);
  if (positionEligible.length > 0) {
    const positionValues = positionEligible.map((aggregate) => aggregate.value);
    const highest = Math.max(...positionValues);
    const lowest = Math.min(...positionValues);
    candidates.push(candidateFromAggregates({
      stadiumId,
      stadiumName,
      recordType: 'highest-cumulative-wpa-position',
      value: highest,
      valueLabel: `${highest.toFixed(3)} position WPA`,
      leaders: leadersByValue(positionEligible, highest),
      evidenceSummary: `Highest cumulative position-player WPA at ${stadiumName ?? stadiumId}: ${highest.toFixed(3)}.`,
    }));
    candidates.push(candidateFromAggregates({
      stadiumId,
      stadiumName,
      recordType: 'lowest-cumulative-wpa-position',
      value: lowest,
      valueLabel: `${lowest.toFixed(3)} position WPA`,
      leaders: leadersByValue(positionEligible, lowest),
      evidenceSummary: `Lowest cumulative position-player WPA at ${stadiumName ?? stadiumId}: ${lowest.toFixed(3)}.`,
    }));
  }

  const pitcherEligible = Array.from(pitcherWpa.values()).filter((aggregate) => aggregate.value !== 0);
  if (pitcherEligible.length > 0) {
    const pitcherValues = pitcherEligible.map((aggregate) => aggregate.value);
    const highest = Math.max(...pitcherValues);
    const lowest = Math.min(...pitcherValues);
    candidates.push(candidateFromAggregates({
      stadiumId,
      stadiumName,
      recordType: 'highest-cumulative-wpa-pitcher',
      value: highest,
      valueLabel: `${highest.toFixed(3)} pitching WPA`,
      leaders: leadersByValue(pitcherEligible, highest),
      evidenceSummary: `Highest cumulative pitching WPA at ${stadiumName ?? stadiumId}: ${highest.toFixed(3)}.`,
    }));
    candidates.push(candidateFromAggregates({
      stadiumId,
      stadiumName,
      recordType: 'lowest-cumulative-wpa-pitcher',
      value: lowest,
      valueLabel: `${lowest.toFixed(3)} pitching WPA`,
      leaders: leadersByValue(pitcherEligible, lowest),
      evidenceSummary: `Lowest cumulative pitching WPA at ${stadiumName ?? stadiumId}: ${lowest.toFixed(3)}.`,
    }));
  }
}

function swingEvidenceSummary(
  event: StadiumEvent,
  stadiumId: string,
  stadiumName: string | null,
): string {
  return `${event.batterName} ${event.result} (inning ${event.inning} ${event.halfInning}, WPA ${event.wpa.toFixed(3)}) at ${stadiumName ?? stadiumId}`;
}

function pushSinglePlayWpaCandidates(
  candidates: RecordCandidate[],
  stadiumId: string,
  stadiumName: string | null,
  events: StadiumEvent[],
): void {
  const eventsWithWpa = events.filter((event) => Number.isFinite(event.wpa));
  if (eventsWithWpa.length === 0) return;

  const maxWpa = Math.max(...eventsWithWpa.map((event) => event.wpa));
  if (maxWpa > 0) {
    const leaders = eventsWithWpa.filter((event) => event.wpa === maxWpa);
    candidates.push({
      stadiumId,
      stadiumName,
      recordType: 'largest-positive-wpa-swing',
      recordKey: 'leader',
      value: maxWpa,
      valueLabel: `${maxWpa.toFixed(3)} WPA`,
      leaderTeamIds: leaders.map((event) => event.batterTeamId),
      leaderPlayerIds: leaders.map((event) => event.batterId),
      leaderPlayerNames: leaders.map((event) => event.batterName),
      sourceGameIds: leaders.map((event) => event.sourceGameId),
      evidenceIds: leaders.map((event) => event.eventId),
      evidenceSummary: swingEvidenceSummary(leaders[0], stadiumId, stadiumName),
    });
  }

  const minWpa = Math.min(...eventsWithWpa.map((event) => event.wpa));
  if (minWpa < 0) {
    const leaders = eventsWithWpa.filter((event) => event.wpa === minWpa);
    candidates.push({
      stadiumId,
      stadiumName,
      recordType: 'largest-negative-wpa-swing',
      recordKey: 'leader',
      value: minWpa,
      valueLabel: `${minWpa.toFixed(3)} WPA`,
      leaderTeamIds: leaders.map((event) => event.batterTeamId),
      leaderPlayerIds: leaders.map((event) => event.batterId),
      leaderPlayerNames: leaders.map((event) => event.batterName),
      sourceGameIds: leaders.map((event) => event.sourceGameId),
      evidenceIds: leaders.map((event) => event.eventId),
      evidenceSummary: swingEvidenceSummary(leaders[0], stadiumId, stadiumName),
    });
  }
}

function fameBearingCandidates(
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
    const events = games.flatMap((game) =>
      (game.atBatEvents ?? [])
        .filter((event) => !event.undoneAt)
        .map((event) => ({ ...event, sourceGameId: game.gameId })),
    );
    const wpaRows = games.flatMap((game) =>
      (game.playerWpaTotals ?? []).map((row) => ({ ...row, sourceGameId: game.gameId })),
    );

    pushFarthestHrCandidate(candidates, stadiumId, stadiumName, events, 'R', 'farthest-hr-rhb');
    pushFarthestHrCandidate(candidates, stadiumId, stadiumName, events, 'L', 'farthest-hr-lhb');
    pushHomeRunCountCandidates(candidates, stadiumId, stadiumName, events);
    pushCumulativeWpaCandidates(candidates, stadiumId, stadiumName, wpaRows);
    pushSinglePlayWpaCandidates(candidates, stadiumId, stadiumName, events);
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
    ...fameBearingCandidates(report.scope, completedGames, blockers),
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
