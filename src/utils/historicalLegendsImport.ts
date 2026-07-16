import {
  EXPECTED_HISTORICAL_LEGENDS_ASSET_SHA256,
  EXPECTED_HISTORICAL_LEGENDS_SOURCE_SHA256,
  HISTORICAL_LEGENDS_APP_DATA_URL,
  HISTORICAL_LEGENDS_EXPECTED_PLAYER_COUNT,
  HISTORICAL_LEGENDS_EXPECTED_PROFILE_COUNT,
  HISTORICAL_LEGENDS_SOURCE_DATABASE,
  type HistoricalLegendAppPlayer,
  type HistoricalLegendProfileType,
  type HistoricalLegendsAppPayload,
} from '../data/historicalLegendsAppData';
import { isHistoricalLegendsLibraryId } from '../data/historicalLegendsLibraries';
import { provisionHistoricalLegendsLibraries } from './historicalLegendsLibraryProvisioner';
import { generateHiddenPersonalityModifiers } from './prospectScoutingDraftEngine';
import {
  deletePlayer,
  getAllPlayers,
  savePlayer,
  type Player,
} from './leagueBuilderStorage';

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const PROFILE_TYPES: HistoricalLegendProfileType[] = ['Career', 'Peak', 'Draft Pool'];

export interface HistoricalLegendsImportResult {
  players: number;
  playerGroups: number;
  removedStaleCards: number;
  sourceSha256: string;
}

export class HistoricalLegendsOwnershipCollisionError extends Error {
  readonly repairEligible: boolean;

  constructor(message: string, repairEligible: boolean) {
    super(message);
    this.name = 'HistoricalLegendsOwnershipCollisionError';
    this.repairEligible = repairEligible;
  }
}

export function isRecoverableHistoricalLegendsOwnershipCollision(error: unknown): boolean {
  return error instanceof HistoricalLegendsOwnershipCollisionError && error.repairEligible;
}

function legacyOwnershipRepairBlocker(
  existing: readonly Player[],
  incomingById: ReadonlyMap<string, HistoricalLegendAppPlayer>,
): string | null {
  const legacyOwnershipRows = existing.filter((player) => (
    player.id.startsWith('hl:')
    && player.sourceDatabase !== HISTORICAL_LEGENDS_SOURCE_DATABASE
  ));
  for (const current of legacyOwnershipRows) {
    if (!incomingById.has(current.id)) return `non-payload card ${current.id}`;
    if (current.sourceDatabase !== 'League Builder') {
      return `${current.id} is owned by ${current.sourceDatabase ?? 'UNKNOWN'}`;
    }
    if ((current.leagueAssignments ?? []).length > 0) return `${current.id} is assigned to a league`;
  }
  return null;
}

function assertFiniteRating(value: unknown, field: string, playerId: string): void {
  if (!Number.isFinite(value) || Number(value) < 0 || Number(value) > 99) {
    throw new Error(`Historical Legends payload has invalid ${field} for ${playerId}.`);
  }
}

export function validateHistoricalLegendsPayload(
  payload: HistoricalLegendsAppPayload,
  expectedSourceSha256: string | null,
): void {
  if (!expectedSourceSha256 || !SHA256_PATTERN.test(expectedSourceSha256)) {
    throw new Error('Historical Legends source SHA-256 is not pinned.');
  }
  if (!SHA256_PATTERN.test(payload.sourceSha256) || payload.sourceSha256 !== expectedSourceSha256) {
    throw new Error(
      `Historical Legends source SHA-256 mismatch: expected ${expectedSourceSha256}, got ${payload.sourceSha256}.`,
    );
  }
  if (payload.schemaVersion !== 'historical-legends-app-v1') {
    throw new Error(`Unsupported Historical Legends payload schema: ${String(payload.schemaVersion)}.`);
  }
  if (!Array.isArray(payload.players) || payload.players.length !== payload.profileCount) {
    throw new Error('Historical Legends payload profile count does not match its player cards.');
  }

  const cardIds = new Set<string>();
  const profileCounts = new Map(PROFILE_TYPES.map((profileType) => [profileType, 0]));
  const cardsByHuman = new Map<string, Set<HistoricalLegendProfileType>>();

  for (const player of payload.players) {
    if (!player.id.startsWith('hl:') || cardIds.has(player.id)) {
      throw new Error(`Historical Legends payload has a duplicate or unstable card id: ${player.id}.`);
    }
    cardIds.add(player.id);
    if (player.sourceDatabase !== HISTORICAL_LEGENDS_SOURCE_DATABASE) {
      throw new Error(`Historical Legends payload has an invalid source database for ${player.id}.`);
    }
    if ((player.leagueAssignments ?? []).length > 0) {
      throw new Error(`Historical Legends payload must not carry league assignments for ${player.id}.`);
    }
    const metadata = player.historicalLegend;
    if (!metadata || metadata.profileType !== player.historicalProfileType) {
      throw new Error(`Historical Legends payload has inconsistent profile metadata for ${player.id}.`);
    }
    if (!PROFILE_TYPES.includes(metadata.profileType)) {
      throw new Error(`Historical Legends payload has an invalid profile type for ${player.id}.`);
    }
    const expectedIdentity = `historical:${metadata.playerId}`;
    if (
      player.sourceId !== expectedIdentity ||
      player.historicalSourceId !== expectedIdentity ||
      player.versionGroupId !== expectedIdentity
    ) {
      throw new Error(`Historical Legends payload has inconsistent version identity for ${player.id}.`);
    }
    for (const field of ['power', 'contact', 'speed', 'fielding', 'arm', 'velocity', 'junk', 'accuracy'] as const) {
      assertFiniteRating(player[field], field, player.id);
    }
    profileCounts.set(metadata.profileType, (profileCounts.get(metadata.profileType) ?? 0) + 1);
    const humanCards = cardsByHuman.get(metadata.playerId) ?? new Set<HistoricalLegendProfileType>();
    if (humanCards.has(metadata.profileType)) {
      throw new Error(`Historical Legends payload has duplicate ${metadata.profileType} cards for ${metadata.playerId}.`);
    }
    humanCards.add(metadata.profileType);
    cardsByHuman.set(metadata.playerId, humanCards);
  }

  if (cardsByHuman.size !== payload.playerCount) {
    throw new Error('Historical Legends payload player-group count does not match its cards.');
  }
  for (const profileType of PROFILE_TYPES) {
    if (profileCounts.get(profileType) !== payload.profileCounts[profileType]) {
      throw new Error(`Historical Legends payload ${profileType} count is inconsistent.`);
    }
  }
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Historical Legends asset SHA-256 verification is unavailable.');
  }
  const stableBytes = new Uint8Array(bytes);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', stableBytes.buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function parseHistoricalLegendsPayloadBytes(
  bytes: Uint8Array,
  expectedAssetSha256: string | null,
): Promise<HistoricalLegendsAppPayload> {
  if (!expectedAssetSha256 || !SHA256_PATTERN.test(expectedAssetSha256)) {
    throw new Error('Historical Legends app-asset SHA-256 is not pinned.');
  }
  const actualAssetSha256 = await sha256Hex(bytes);
  if (actualAssetSha256 !== expectedAssetSha256) {
    throw new Error(
      `Historical Legends app-asset SHA-256 mismatch: expected ${expectedAssetSha256}, got ${actualAssetSha256}.`,
    );
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as HistoricalLegendsAppPayload;
  } catch (error) {
    throw new Error(
      `Historical Legends app asset is not valid JSON: ${error instanceof Error ? error.message : String(error)}.`,
    );
  }
}

export async function loadHistoricalLegendsPayload(
  url = HISTORICAL_LEGENDS_APP_DATA_URL,
  expectedAssetSha256: string | null = EXPECTED_HISTORICAL_LEGENDS_ASSET_SHA256,
): Promise<HistoricalLegendsAppPayload> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Historical Legends data is not available (${response.status}).`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  return parseHistoricalLegendsPayloadBytes(bytes, expectedAssetSha256);
}

export async function importHistoricalLegendsPayload(
  payload: HistoricalLegendsAppPayload,
  expectedSourceSha256: string | null = EXPECTED_HISTORICAL_LEGENDS_SOURCE_SHA256,
): Promise<HistoricalLegendsImportResult> {
  validateHistoricalLegendsPayload(payload, expectedSourceSha256);

  const existing = await getAllPlayers();
  const existingById = new Map(existing.map((player) => [player.id, player]));
  const incomingById = new Map(payload.players.map((player) => [player.id, player]));
  const nextIds = new Set(incomingById.keys());
  for (const player of payload.players) {
    const owner = existingById.get(player.id);
    if (owner && owner.sourceDatabase !== HISTORICAL_LEGENDS_SOURCE_DATABASE) {
      throw new HistoricalLegendsOwnershipCollisionError(
        `Historical Legends card id ${player.id} is already owned by non-Legends source ${owner.sourceDatabase ?? 'UNKNOWN'}.`,
        legacyOwnershipRepairBlocker(existing, incomingById) === null,
      );
    }
  }
  const stale = existing.filter((player) => (
    player.sourceDatabase === HISTORICAL_LEGENDS_SOURCE_DATABASE && !nextIds.has(player.id)
  ));
  for (const player of stale) {
    if ((player.leagueAssignments ?? []).some((assignment) => !isHistoricalLegendsLibraryId(assignment.leagueId))) {
      throw new Error(`Assigned stale Historical Legends card ${player.id} cannot be removed by reimport.`);
    }
  }

  const curatedHiddenByPersonId = new Map<string, HistoricalLegendAppPlayer['hiddenPersonalityModifiers']>();
  for (const player of payload.players) {
    if (!player.hiddenPersonalityModifiers) continue;
    const personId = player.historicalSourceId;
    const existingCurated = curatedHiddenByPersonId.get(personId);
    if (existingCurated && JSON.stringify(existingCurated) !== JSON.stringify(player.hiddenPersonalityModifiers)) {
      throw new Error(`Historical Legends payload has conflicting hidden personality evidence for ${personId}.`);
    }
    curatedHiddenByPersonId.set(personId, player.hiddenPersonalityModifiers);
  }

  const playersToSave = payload.players.map((player) => {
    const matchingLegend = existingById.get(player.id);
    return {
      ...player,
      // Hidden personality truth is person-level for Legends: every card version shares curated
      // evidence when it exists, otherwise every version receives the same stable fallback.
      // Visible personality remains exactly as authored by the frozen source payload.
      hiddenPersonalityModifiers: curatedHiddenByPersonId.get(player.historicalSourceId)
        ?? generateHiddenPersonalityModifiers(`historical-legend:${player.historicalSourceId}`),
      leagueAssignments: (matchingLegend?.leagueAssignments ?? []).map((assignment) => ({ ...assignment })),
    } satisfies HistoricalLegendAppPlayer;
  });

  const sameImportedLegend = (current: Player | undefined, incoming: HistoricalLegendAppPlayer): boolean => {
    if (!current) return false;
    const sourceId = incoming.historicalSourceId.trim();
    const comparable = {
      ...incoming,
      sourceId,
      versionGroupId: incoming.versionGroupId?.trim() || sourceId,
      leagueAssignments: incoming.leagueAssignments ?? [],
    } as Record<string, unknown>;
    delete comparable.historicalSourceId;
    delete comparable.createdDate;
    delete comparable.lastModified;
    return Object.entries(comparable).every(([key, value]) => (
      JSON.stringify((current as unknown as Record<string, unknown>)[key] ?? null)
      === JSON.stringify(value ?? null)
    ));
  };

  for (const player of stale) await deletePlayer(player.id);
  for (const player of playersToSave) {
    if (sameImportedLegend(existingById.get(player.id), player)) continue;
    await savePlayer(player);
  }

  // Unit fixtures intentionally exercise partial payloads. Only the pinned full
  // app asset owns the system source libraries and their complete 242-card core.
  if (
    payload.playerCount === HISTORICAL_LEGENDS_EXPECTED_PLAYER_COUNT
    && payload.profileCount === HISTORICAL_LEGENDS_EXPECTED_PROFILE_COUNT
  ) {
    await provisionHistoricalLegendsLibraries();
  }

  const persisted = (await getAllPlayers()).filter((player) => (
    player.sourceDatabase === HISTORICAL_LEGENDS_SOURCE_DATABASE
  ));
  if (persisted.length !== payload.profileCount) {
    throw new Error(
      `Historical Legends import verification failed: expected ${payload.profileCount} cards, found ${persisted.length}.`,
    );
  }

  return {
    players: persisted.length,
    playerGroups: payload.playerCount,
    removedStaleCards: stale.length,
    sourceSha256: payload.sourceSha256,
  };
}

/**
 * Repairs only the narrow legacy state where verified Historical Legends card IDs were stored as
 * unassigned League Builder players. Ordinary import deliberately remains fail-closed.
 */
export async function repairHistoricalLegendsPayload(
  payload: HistoricalLegendsAppPayload,
  expectedSourceSha256: string | null = EXPECTED_HISTORICAL_LEGENDS_SOURCE_SHA256,
): Promise<HistoricalLegendsImportResult> {
  // Validation must finish before storage is even inspected so an unpinned or modified payload can
  // never authorize ownership changes.
  validateHistoricalLegendsPayload(payload, expectedSourceSha256);

  const incomingById = new Map(payload.players.map((player) => [player.id, player]));
  const existing = await getAllPlayers();
  const legacyOwnershipRows = existing.filter((player) => (
    player.id.startsWith('hl:')
    && player.sourceDatabase !== HISTORICAL_LEGENDS_SOURCE_DATABASE
  ));

  // Complete preflight precedes the first write. One unsafe or unknown card blocks the whole repair.
  const blocker = legacyOwnershipRepairBlocker(existing, incomingById);
  if (blocker) throw new Error(`Historical Legends repair blocked by ${blocker}.`);

  // Adopt ownership only after every candidate is proven safe. If a write is interrupted, the rows
  // already written are merely safe Legends-owned rows; the next repair/import completes normally.
  for (const current of legacyOwnershipRows) {
    await savePlayer({
      ...current,
      sourceDatabase: HISTORICAL_LEGENDS_SOURCE_DATABASE,
    });
  }

  return importHistoricalLegendsPayload(payload, expectedSourceSha256);
}

export async function seedHistoricalLegendsDatabase(): Promise<HistoricalLegendsImportResult> {
  const payload = await loadHistoricalLegendsPayload();
  return importHistoricalLegendsPayload(payload);
}

export async function repairHistoricalLegendsDatabase(): Promise<HistoricalLegendsImportResult> {
  // The production repair always starts from the hash-pinned app asset.
  const payload = await loadHistoricalLegendsPayload();
  return repairHistoricalLegendsPayload(payload);
}

export async function isHistoricalLegendsDatabaseSeeded(): Promise<boolean> {
  const players = await getAllPlayers();
  return players.filter((player: Player) => (
    player.sourceDatabase === HISTORICAL_LEGENDS_SOURCE_DATABASE
  )).length === HISTORICAL_LEGENDS_EXPECTED_PROFILE_COUNT;
}
