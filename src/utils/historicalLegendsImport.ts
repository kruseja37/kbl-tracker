import {
  EXPECTED_HISTORICAL_LEGENDS_ASSET_SHA256,
  EXPECTED_HISTORICAL_LEGENDS_SOURCE_SHA256,
  HISTORICAL_LEGENDS_APP_DATA_URL,
  HISTORICAL_LEGENDS_EXPECTED_PROFILE_COUNT,
  HISTORICAL_LEGENDS_SOURCE_DATABASE,
  type HistoricalLegendAppPlayer,
  type HistoricalLegendProfileType,
  type HistoricalLegendsAppPayload,
} from '../data/historicalLegendsAppData';
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
  const nextIds = new Set(payload.players.map((player) => player.id));
  for (const player of payload.players) {
    const owner = existingById.get(player.id);
    if (owner && owner.sourceDatabase !== HISTORICAL_LEGENDS_SOURCE_DATABASE) {
      throw new Error(
        `Historical Legends card id ${player.id} is already owned by non-Legends source ${owner.sourceDatabase ?? 'UNKNOWN'}.`,
      );
    }
  }
  const stale = existing.filter((player) => (
    player.sourceDatabase === HISTORICAL_LEGENDS_SOURCE_DATABASE && !nextIds.has(player.id)
  ));
  for (const player of stale) {
    if ((player.leagueAssignments ?? []).length > 0) {
      throw new Error(`Assigned stale Historical Legends card ${player.id} cannot be removed by reimport.`);
    }
  }

  const playersToSave = payload.players.map((player) => {
    const matchingLegend = existingById.get(player.id);
    return {
      ...player,
      leagueAssignments: (matchingLegend?.leagueAssignments ?? []).map((assignment) => ({ ...assignment })),
    } satisfies HistoricalLegendAppPlayer;
  });

  for (const player of stale) await deletePlayer(player.id);
  for (const player of playersToSave) {
    await savePlayer(player);
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

export async function seedHistoricalLegendsDatabase(): Promise<HistoricalLegendsImportResult> {
  const payload = await loadHistoricalLegendsPayload();
  return importHistoricalLegendsPayload(payload);
}

export async function isHistoricalLegendsDatabaseSeeded(): Promise<boolean> {
  const players = await getAllPlayers();
  return players.filter((player: Player) => (
    player.sourceDatabase === HISTORICAL_LEGENDS_SOURCE_DATABASE
  )).length === HISTORICAL_LEGENDS_EXPECTED_PROFILE_COUNT;
}
