import { generateHometown } from '../data/usCities';
import type { PersistedGameState, CompletedGameRecord } from './gameStorage';
import { getAllCompletedGames } from './gameStorage';
import { getLeagueTemplate, getPlayer } from './leagueBuilderStorage';
import type { CanonicalPlayer, CanonicalPlayerInstance } from './almanacStorage';
import { getCanonicalPlayer, getAllCanonicalPlayers, upsertCanonicalPlayer } from './almanacStorage';

function buildPlayerName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function buildCanonicalId(playerId: string, sourceDatabase?: string): string {
  return sourceDatabase === 'SMB4' ? `smb4_${playerId}` : `custom_${playerId}`;
}

export async function registerAlmanacPlayers(
  gameState: PersistedGameState,
  leagueId: string
): Promise<void> {
  const leagueTemplate = await getLeagueTemplate(leagueId);
  const instanceName = leagueTemplate?.name ?? leagueId;

  const instanceIds = new Set<string>([
    ...Object.keys(gameState.playerStats),
    ...gameState.pitcherGameStats.map((stats) => stats.pitcherId),
  ]);

  for (const playerId of instanceIds) {
    console.log('[Almanac] Attempting registration for playerId:', playerId);
    const player = await getPlayer(playerId);
    console.log('[Almanac] getPlayer result:', playerId, player ? 'FOUND' : 'NULL');

    if (!player) {
      console.warn(`[Almanac] Skipping canonical registration for missing player "${playerId}"`);
      continue;
    }

    const canonicalId = buildCanonicalId(playerId, player.sourceDatabase);
    const playerName = buildPlayerName(player.firstName, player.lastName);
    const exhibitionInstance: CanonicalPlayerInstance = {
      mode: 'exhibition',
      instanceId: leagueId,
      instanceName,
      playerIdInInstance: playerId,
    };

    const existing = await getCanonicalPlayer(canonicalId);

    if (existing) {
      const hasInstance = existing.instances.some((instance) =>
        instance.mode === exhibitionInstance.mode &&
        instance.instanceId === exhibitionInstance.instanceId &&
        instance.playerIdInInstance === exhibitionInstance.playerIdInInstance
      );

      await upsertCanonicalPlayer({
        ...existing,
        playerName: existing.playerName || playerName,
        hometown: existing.hometown || player.hometown || generateHometown(),
        instances: hasInstance
          ? existing.instances
          : [...existing.instances, exhibitionInstance],
      });

      continue;
    }

    const canonicalPlayer: CanonicalPlayer = {
      canonicalId,
      playerName,
      hometown: player.hometown || generateHometown(),
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

  // Build set of existing canonical player IDs for fast lookup
  const existingPlayers = await getAllCanonicalPlayers();
  const existingPlayerIds = new Set<string>();
  for (const cp of existingPlayers) {
    for (const inst of cp.instances) {
      existingPlayerIds.add(inst.playerIdInInstance);
    }
  }

  let registered = 0;

  for (const game of completedGames) {
    const leagueId = game.leagueId || game.competitionId;
    if (!leagueId) continue;

    // Collect all player IDs from this game
    const playerIds = new Set<string>([
      ...Object.keys(game.playerStats || {}),
      ...(game.pitcherGameStats || []).map((s) => s.pitcherId),
    ]);

    // Skip games where all players are already registered
    const unregistered = [...playerIds].filter((id) => !existingPlayerIds.has(id));
    if (unregistered.length === 0) continue;

    const leagueTemplate = await getLeagueTemplate(leagueId);
    const instanceName = leagueTemplate?.name ?? leagueId;
    const rawMode = game.competitionType || 'exhibition';
    const mode: CanonicalPlayerInstance['mode'] =
      rawMode === 'playoff' ? 'franchise' : rawMode;

    for (const playerId of unregistered) {
      const player = await getPlayer(playerId);
      if (!player) continue;

      const canonicalId = buildCanonicalId(playerId, player.sourceDatabase);
      const playerName = buildPlayerName(player.firstName, player.lastName);
      const instance: CanonicalPlayerInstance = {
        mode,
        instanceId: leagueId,
        instanceName,
        playerIdInInstance: playerId,
      };

      const existing = await getCanonicalPlayer(canonicalId);
      if (existing) {
        const hasInstance = existing.instances.some(
          (inst) =>
            inst.mode === instance.mode &&
            inst.instanceId === instance.instanceId &&
            inst.playerIdInInstance === instance.playerIdInInstance,
        );
        if (!hasInstance) {
          await upsertCanonicalPlayer({
            ...existing,
            instances: [...existing.instances, instance],
          });
        }
      } else {
        await upsertCanonicalPlayer({
          canonicalId,
          playerName,
          hometown: player.hometown || generateHometown(),
          instances: [instance],
        });
        registered++;
      }

      existingPlayerIds.add(playerId);
    }
  }

  if (registered > 0) {
    console.log(`[Almanac] Backfilled ${registered} canonical players from ${completedGames.length} completed games`);
  }

  return registered;
}
