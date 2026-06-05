import { generateHometown } from '../data/usCities';
import type {
  PersistedGameState,
  CompletedGameRecord,
  PlayerRatingsSnapshot,
  CompetitionType,
} from './gameStorage';
import { getAllCompletedGames } from './gameStorage';
import { getElimination } from './eliminationManager';
import { getLeagueTemplate, getPlayer } from './leagueBuilderStorage';
import type { CanonicalPlayer, CanonicalPlayerInstance } from './almanacStorage';
import {
  findCanonicalByPlayerId,
  getAllCanonicalPlayers,
  getCanonicalPlayer,
  upsertCanonicalPlayer,
} from './almanacStorage';
import { resolveExhibitionLeagueId } from './gameStorage';

function buildPlayerName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function buildCanonicalId(playerId: string, sourceDatabase?: string): string {
  return sourceDatabase === 'SMB4' ? `smb4_${playerId}` : `custom_${playerId}`;
}

function buildPlayerNameFromSnapshot(snapshot?: PlayerRatingsSnapshot | null): string {
  if (!snapshot) {
    return '';
  }
  return buildPlayerName(snapshot.firstName, snapshot.lastName);
}

function buildInstanceKey(
  instance: Pick<
    CanonicalPlayerInstance,
    'mode' | 'instanceId' | 'playerIdInInstance'
  >,
): string {
  return `${instance.mode}::${instance.instanceId}::${instance.playerIdInInstance}`;
}

function isPlaceholderPlayerName(
  playerName: string | undefined,
  playerId: string,
): boolean {
  if (!playerName) {
    return true;
  }

  const normalized = playerName.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return (
    normalized === playerId.toLowerCase() ||
    normalized === `custom_${playerId}`.toLowerCase() ||
    normalized.startsWith('ply-') ||
    normalized.startsWith('player-') ||
    normalized.startsWith('pitcher-') ||
    normalized.includes('unknown')
  );
}

function hasMeaningfulHometown(
  hometown?: { city: string; state: string } | null,
): boolean {
  return Boolean(
    hometown?.city &&
      hometown?.state &&
      hometown.city !== 'Unknown' &&
      hometown.state !== '--',
  );
}

function choosePreferredPlayerName(
  currentName: string | undefined,
  nextName: string,
  playerId: string,
): string {
  if (isPlaceholderPlayerName(currentName, playerId) && !isPlaceholderPlayerName(nextName, playerId)) {
    return nextName;
  }

  return currentName || nextName || playerId;
}

function choosePreferredHometown(
  currentHometown: { city: string; state: string } | undefined,
  nextHometown: { city: string; state: string },
): { city: string; state: string } {
  return hasMeaningfulHometown(currentHometown) ? currentHometown! : nextHometown;
}

function normalizeRegistrationMode(
  competitionType?: PersistedGameState['competitionType'] | CompletedGameRecord['competitionType'],
): CanonicalPlayerInstance['mode'] {
  if (competitionType === 'elimination') {
    return 'elimination';
  }

  if (competitionType === 'franchise' || competitionType === 'playoff') {
    return 'franchise';
  }

  return 'exhibition';
}

export interface AlmanacRegistrationOptions {
  competitionType?: CompetitionType;
  competitionId?: string;
  competitionName?: string;
  franchiseId?: string;
  leagueId?: string;
  instanceId?: string;
  instanceName?: string;
}

interface ResolvedAlmanacRegistrationContext {
  mode: CanonicalPlayerInstance['mode'];
  instanceId: string;
  instanceName: string;
  sourceLeagueId?: string;
}

async function resolveAlmanacRegistrationContext(
  game:
    | Pick<PersistedGameState, 'competitionType' | 'competitionId' | 'competitionName' | 'franchiseId' | 'leagueId'>
    | Pick<CompletedGameRecord, 'competitionType' | 'competitionId' | 'competitionName' | 'franchiseId' | 'leagueId'>,
  leagueId?: string,
  options: AlmanacRegistrationOptions = {},
): Promise<ResolvedAlmanacRegistrationContext | null> {
  const competitionType =
    options.competitionType ?? game.competitionType;
  const mode = normalizeRegistrationMode(competitionType);
  const sourceLeagueId =
    options.leagueId ?? leagueId ?? game.leagueId ?? resolveExhibitionLeagueId({
      leagueId: game.leagueId,
      competitionId: options.competitionId ?? game.competitionId,
      competitionType,
    });
  const competitionId =
    options.competitionId ?? game.competitionId;
  const franchiseId =
    options.franchiseId ?? game.franchiseId;
  const instanceId =
    options.instanceId ??
    (mode === 'exhibition'
      ? sourceLeagueId ?? competitionId
      : mode === 'franchise'
        ? competitionId ?? franchiseId ?? sourceLeagueId
        : competitionId ?? sourceLeagueId);

  if (!instanceId) {
    return null;
  }

  const leagueTemplate = sourceLeagueId ? await getLeagueTemplate(sourceLeagueId) : null;
  const eliminationMetadata =
    mode === 'elimination' && competitionId
      ? await getElimination(competitionId)
      : null;
  const competitionName =
    options.competitionName ?? game.competitionName;
  const instanceName =
    options.instanceName ??
    (mode === 'elimination'
      ? eliminationMetadata?.name ||
        competitionName ||
        `${leagueTemplate?.name ?? instanceId} Elimination`
      : mode === 'franchise'
        ? competitionName ||
          (leagueTemplate?.name ? `${leagueTemplate.name} Franchise` : `${instanceId} Franchise`)
        : leagueTemplate?.name ?? competitionName ?? instanceId);

  return {
    mode,
    instanceId,
    instanceName,
    sourceLeagueId,
  };
}

function getPersistedPlayerName(
  game:
    | Pick<PersistedGameState, 'playerStats' | 'pitcherGameStats'>
    | Pick<CompletedGameRecord, 'playerStats' | 'pitcherGameStats'>,
  playerId: string,
): string {
  return (
    game.playerStats[playerId]?.playerName ||
    game.pitcherGameStats.find((stats) => stats.pitcherId === playerId)?.pitcherName ||
    playerId
  );
}

async function resolveRegistrationIdentity(
  game:
    | Pick<PersistedGameState, 'playerStats' | 'pitcherGameStats' | 'playerRatingsSnapshots'>
    | Pick<CompletedGameRecord, 'playerStats' | 'pitcherGameStats' | 'playerRatingsSnapshots'>,
  playerId: string,
): Promise<{
  canonicalId: string;
  playerName: string;
  hometown: { city: string; state: string };
}> {
  const storedPlayer = await getPlayer(playerId);
  if (storedPlayer) {
    const resolved = {
      canonicalId: buildCanonicalId(playerId, storedPlayer.sourceDatabase),
      playerName: buildPlayerName(storedPlayer.firstName, storedPlayer.lastName),
      hometown: storedPlayer.hometown || generateHometown(),
    };
    console.log('[M4-1] resolveRegistrationIdentity', {
      playerId,
      source: 'league-builder',
      canonicalId: resolved.canonicalId,
      playerName: resolved.playerName,
    });
    return {
      ...resolved,
    };
  }

  const ratingsSnapshot = game.playerRatingsSnapshots?.[playerId] ?? null;
  const snapshotName = buildPlayerNameFromSnapshot(ratingsSnapshot);
  const resolved = {
    canonicalId: buildCanonicalId(playerId),
    playerName: snapshotName || getPersistedPlayerName(game, playerId),
    hometown: ratingsSnapshot?.hometown || generateHometown(),
  };
  console.log('[M4-1] resolveRegistrationIdentity', {
    playerId,
    source: ratingsSnapshot ? 'ratings-snapshot' : 'persisted-stats',
    canonicalId: resolved.canonicalId,
    playerName: resolved.playerName,
  });
  return resolved;
}

export async function registerAlmanacPlayers(
  gameState: PersistedGameState,
  leagueId?: string,
  options: AlmanacRegistrationOptions = {},
): Promise<void> {
  const registration = await resolveAlmanacRegistrationContext(gameState, leagueId, options);
  if (!registration) {
    console.warn('[M4-1] registerAlmanacPlayers skipped game without almanac instance identity', {
      gameId: gameState.gameId,
      competitionType: options.competitionType ?? gameState.competitionType ?? null,
      competitionId: options.competitionId ?? gameState.competitionId ?? null,
      franchiseId: options.franchiseId ?? gameState.franchiseId ?? null,
      leagueId: options.leagueId ?? leagueId ?? gameState.leagueId ?? null,
    });
    return;
  }

  const instanceIds = new Set<string>([
    ...Object.keys(gameState.playerStats),
    ...gameState.pitcherGameStats.map((stats) => stats.pitcherId),
  ]);

  for (const playerId of instanceIds) {
    const { canonicalId, playerName, hometown } =
      await resolveRegistrationIdentity(gameState, playerId);
    const existingByInstance = await findCanonicalByPlayerId(playerId);
    const targetCanonicalId = existingByInstance?.canonicalId ?? canonicalId;
    const exhibitionInstance: CanonicalPlayerInstance = {
      mode: registration.mode,
      instanceId: registration.instanceId,
      instanceName: registration.instanceName,
      playerIdInInstance: playerId,
    };

    const existing =
      existingByInstance ?? (await getCanonicalPlayer(targetCanonicalId));

    if (existing) {
      const hasInstance = existing.instances.some((instance) =>
        instance.mode === exhibitionInstance.mode &&
        instance.instanceId === exhibitionInstance.instanceId &&
        instance.playerIdInInstance === exhibitionInstance.playerIdInInstance
      );
      const nextPlayerName = choosePreferredPlayerName(
        existing.playerName,
        playerName,
        playerId,
      );
      const nextHometown = choosePreferredHometown(existing.hometown, hometown);
      const nextInstances = hasInstance
        ? existing.instances
        : [...existing.instances, exhibitionInstance];

      if (
        !hasInstance ||
        nextPlayerName !== existing.playerName ||
        nextHometown.city !== existing.hometown.city ||
        nextHometown.state !== existing.hometown.state
      ) {
        await upsertCanonicalPlayer({
          ...existing,
          canonicalId: targetCanonicalId,
          playerName: nextPlayerName,
          hometown: nextHometown,
          instances: nextInstances,
        });
      }

      continue;
    }

    const canonicalPlayer: CanonicalPlayer = {
      canonicalId: targetCanonicalId,
      playerName,
      hometown,
      instances: [exhibitionInstance],
    };

    await upsertCanonicalPlayer(canonicalPlayer);
  }
}

/**
 * Backfill canonical players from completed games.
 * Scans all completed games and registers any players missing from the almanac.
 * Safe to call multiple times — skips players that already exist.
 */
export async function backfillCanonicalPlayers(): Promise<number> {
  const completedGames = await getAllCompletedGames();
  if (completedGames.length === 0) return 0;

  const existingPlayers = await getAllCanonicalPlayers();
  const canonicalPlayersById = new Map<string, CanonicalPlayer>();
  const instanceOwners = new Map<string, string>();
  for (const cp of existingPlayers) {
    canonicalPlayersById.set(cp.canonicalId, cp);
    for (const instance of cp.instances) {
      instanceOwners.set(buildInstanceKey(instance), cp.canonicalId);
    }
  }

  let registered = 0;

  for (const game of completedGames) {
    const registration = await resolveAlmanacRegistrationContext(
      game,
      resolveExhibitionLeagueId(game),
    );
    if (!registration) {
      console.log('[M4-1] backfillCanonicalPlayers skipped game without almanac instance identity', {
        gameId: game.gameId,
        competitionType: game.competitionType ?? null,
        competitionId: game.competitionId ?? null,
        franchiseId: game.franchiseId ?? null,
      });
      continue;
    }

    const playerIds = new Set<string>([
      ...Object.keys(game.playerStats || {}),
      ...(game.pitcherGameStats || []).map((s) => s.pitcherId),
    ]);

    for (const playerId of playerIds) {
      const { canonicalId, playerName, hometown } =
        await resolveRegistrationIdentity(game, playerId);
      const instance: CanonicalPlayerInstance = {
        mode: registration.mode,
        instanceId: registration.instanceId,
        instanceName: registration.instanceName,
        playerIdInInstance: playerId,
      };
      const instanceKey = buildInstanceKey(instance);
      const existingCanonicalId = instanceOwners.get(instanceKey);
      const targetCanonicalId = existingCanonicalId ?? canonicalId;
      const existing = canonicalPlayersById.get(targetCanonicalId);

      if (existing) {
        if (existingCanonicalId && existingCanonicalId !== canonicalId) {
          console.log('[M4-1] backfillCanonicalPlayers reused existing canonicalId for player alias', {
            playerId,
            instanceId: registration.instanceId,
            candidateCanonicalId: canonicalId,
            existingCanonicalId,
          });
        }

        const hasInstance = existing.instances.some(
          (inst) =>
            inst.mode === instance.mode &&
            inst.instanceId === instance.instanceId &&
            inst.playerIdInInstance === instance.playerIdInInstance,
        );
        const nextPlayerName = choosePreferredPlayerName(
          existing.playerName,
          playerName,
          playerId,
        );
        const nextHometown = choosePreferredHometown(existing.hometown, hometown);
        const nextInstances = hasInstance
          ? existing.instances
          : [...existing.instances, instance];

        if (
          !hasInstance ||
          nextPlayerName !== existing.playerName ||
          nextHometown.city !== existing.hometown.city ||
          nextHometown.state !== existing.hometown.state
        ) {
          const nextCanonicalPlayer = {
            ...existing,
            playerName: nextPlayerName,
            hometown: nextHometown,
            instances: nextInstances,
          };
          await upsertCanonicalPlayer(nextCanonicalPlayer);
          canonicalPlayersById.set(targetCanonicalId, nextCanonicalPlayer);
        }
      } else {
        const nextCanonicalPlayer = {
          canonicalId: targetCanonicalId,
          playerName,
          hometown,
          instances: [instance],
        };
        await upsertCanonicalPlayer(nextCanonicalPlayer);
        canonicalPlayersById.set(targetCanonicalId, nextCanonicalPlayer);
        registered++;
      }

      instanceOwners.set(instanceKey, targetCanonicalId);
    }
  }

  console.log('[M4-1] backfillCanonicalPlayers', {
    completedGames: completedGames.length,
    registered,
    canonicalPlayers: canonicalPlayersById.size,
  });

  return registered;
}
