/**
 * Elimination Manager — CRUD for elimination bracket instances. Per ELIMINATION_MODE_SPEC.md §2.5.
 */

import { initMetaDatabase as openMetaDatabase } from './franchiseManager';
import { deleteEliminationDatabase } from './eliminationPlayerStorage';
import { deleteEliminationRosterSnapshots } from './eliminationRosterStorage';
import type { EliminationAward } from './eliminationAwards';
import { deleteMojoFitnessSnapshots } from './mojoFitnessStorage';
import { getAllCompletedGames } from './gameStorage';
import {
  createPlayoff,
  createSeries,
  deletePlayoff,
  getEliminationRoundName,
  getPlayoffByElimination,
  startPlayoff,
  type PlayoffTeam,
} from './playoffStorage';
import { syncEngine } from './syncEngine';
import { createRosterSnapshots } from './eliminationRosterStorage';
import { deepCopyLeagueToBracket } from './eliminationPlayerStorage';
import {
  getAllOverridesForLeague,
  removeLeaguePlayerOverride,
} from './leagueBuilderStorage';
import {
  deleteManagerAssignmentsForInstance,
  LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
  seedManagerAssignmentsForTeams,
} from './managerIdentityStorage';

const ELIMINATION_STORE = 'eliminationList';

function normalizeEliminationInningsPerGame(value: number): number {
  if (!Number.isInteger(value) || value < 3 || value > 9) {
    throw new Error('Elimination games must be between 3 and 9 innings.');
  }
  return value;
}

export type EliminationSelectorState = 'ACTIVE' | 'ARCHIVED' | 'DISCARDED';

export interface EliminationMetadata {
  eliminationId: string;
  name: string;
  leagueId: string;
  leagueName: string;
  status: 'SETUP' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: number;
  lastPlayedAt: number;
  teamsCount: number;
  inningsPerGame?: number;
  currentRound: number;
  champion?: string;
  awards?: EliminationAward[];
  archivedAt?: number;
  selectorState?: EliminationSelectorState;
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

/**
 * Generate a unique elimination bracket ID.
 */
export function generateEliminationId(): string {
  return `elim-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create and persist elimination bracket metadata in `kbl-app-meta` -> `eliminationList`.
 */
export async function createElimination(params: {
  eliminationId?: string;
  name: string;
  leagueId: string;
  leagueName: string;
  teamsCount: number;
  inningsPerGame?: number;
  status?: EliminationMetadata['status'];
  currentRound?: number;
}): Promise<EliminationMetadata> {
  const db = await openMetaDatabase();
  const tx = db.transaction(ELIMINATION_STORE, 'readwrite');
  const store = tx.objectStore(ELIMINATION_STORE);
  const now = Date.now();

  const metadata: EliminationMetadata = {
    eliminationId: params.eliminationId ?? generateEliminationId(),
    name: params.name,
    leagueId: params.leagueId,
    leagueName: params.leagueName,
    status: params.status ?? 'IN_PROGRESS',
    createdAt: now,
    lastPlayedAt: now,
    teamsCount: params.teamsCount,
    inningsPerGame: params.inningsPerGame,
    currentRound: params.currentRound ?? 1,
  };

  await requestToPromise(store.put(metadata));
  await transactionToPromise(tx);
  if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-app-meta', 'eliminationList', metadata.eliminationId, metadata);
  return metadata;
}

/**
 * Load a single elimination bracket metadata record by ID.
 */
export async function getElimination(eliminationId: string): Promise<EliminationMetadata | null> {
  const db = await openMetaDatabase();
  const tx = db.transaction(ELIMINATION_STORE, 'readonly');
  const store = tx.objectStore(ELIMINATION_STORE);
  const result = await requestToPromise(store.get(eliminationId));

  return (result as EliminationMetadata | undefined) ?? null;
}

/**
 * List all elimination bracket metadata records, newest activity first.
 */
export async function listEliminations(): Promise<EliminationMetadata[]> {
  const db = await openMetaDatabase();
  const tx = db.transaction(ELIMINATION_STORE, 'readonly');
  const store = tx.objectStore(ELIMINATION_STORE);
  const results = await requestToPromise(store.getAll());

  return (results as EliminationMetadata[]).sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
}

export function isEliminationHiddenFromSelector(metadata: EliminationMetadata): boolean {
  return Boolean(metadata.archivedAt) ||
    metadata.selectorState === 'ARCHIVED' ||
    metadata.selectorState === 'DISCARDED';
}

export async function listActiveEliminations(): Promise<EliminationMetadata[]> {
  const eliminations = await listEliminations();
  return eliminations.filter((elimination) => !isEliminationHiddenFromSelector(elimination));
}

/**
 * Update an existing elimination bracket metadata record by merging partial fields.
 */
export async function updateElimination(
  eliminationId: string,
  updates: Partial<Omit<EliminationMetadata, 'eliminationId' | 'createdAt'>>
): Promise<void> {
  const db = await openMetaDatabase();
  const tx = db.transaction(ELIMINATION_STORE, 'readwrite');
  const store = tx.objectStore(ELIMINATION_STORE);
  const existing = (await requestToPromise(store.get(eliminationId))) as EliminationMetadata | undefined;

  if (!existing) {
    throw new Error(`Elimination bracket not found: ${eliminationId}`);
  }

  const updated: EliminationMetadata = {
    ...existing,
    ...updates,
    eliminationId: existing.eliminationId,
    createdAt: existing.createdAt,
    lastPlayedAt: updates.lastPlayedAt ?? Date.now(),
  };

  await requestToPromise(store.put(updated));
  await transactionToPromise(tx);
  if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-app-meta', 'eliminationList', updated.eliminationId, updated);
}

async function hasCompletedGamesForElimination(eliminationId: string): Promise<boolean> {
  const games = await getAllCompletedGames();
  return games.some(
    (game) =>
      game.competitionType === 'elimination' &&
      game.competitionId === eliminationId,
  );
}

/**
 * Permanently purge elimination metadata and active run-only storage.
 */
export async function purgeElimination(eliminationId: string): Promise<void> {
  const db = await openMetaDatabase();
  const tx = db.transaction(ELIMINATION_STORE, 'readwrite');
  const store = tx.objectStore(ELIMINATION_STORE);

  await requestToPromise(store.delete(eliminationId));
  await transactionToPromise(tx);
  if (!syncEngine.isSuppressed()) syncEngine.remove('kbl-app-meta', 'eliminationList', eliminationId);

  const playoff = await getPlayoffByElimination(eliminationId);
  const promotionOverrides = await getAllOverridesForLeague(eliminationId);

  await Promise.all([
    playoff ? deletePlayoff(playoff.id) : Promise.resolve(),
    deleteEliminationRosterSnapshots(eliminationId),
    deleteMojoFitnessSnapshots(eliminationId),
    deleteEliminationDatabase(eliminationId),
    deleteManagerAssignmentsForInstance({ mode: 'elimination', instanceId: eliminationId }),
    ...promotionOverrides.map((override) =>
      removeLeaguePlayerOverride(eliminationId, override.playerId),
    ),
  ]);
}

export type EliminationSelectorRemovalResult = 'archived' | 'discarded' | 'purged';

/**
 * Hide an elimination run from the active selector without destroying completed history.
 */
export async function removeEliminationFromSelector(
  eliminationId: string,
): Promise<EliminationSelectorRemovalResult> {
  const metadata = await getElimination(eliminationId);
  if (!metadata) {
    throw new Error(`Elimination bracket not found: ${eliminationId}`);
  }

  if (metadata.status === 'COMPLETED') {
    await updateElimination(eliminationId, {
      archivedAt: Date.now(),
      lastPlayedAt: metadata.lastPlayedAt,
      selectorState: 'ARCHIVED',
    });
    return 'archived';
  }

  const hasHistoricalGames = await hasCompletedGamesForElimination(eliminationId);
  if (hasHistoricalGames) {
    await updateElimination(eliminationId, {
      archivedAt: Date.now(),
      lastPlayedAt: metadata.lastPlayedAt,
      selectorState: 'DISCARDED',
    });
    return 'discarded';
  }

  await purgeElimination(eliminationId);
  return 'purged';
}

export async function createEliminationRun(params: {
  name: string;
  leagueId: string;
  leagueName: string;
  teamsCount: number;
  seededTeams: Array<{ id: string; name: string; managerId?: string; managerName?: string }>;
  seriesLengths: number[];
  inningsPerGame: number;
  useDH: boolean;
  liveBeatReporterEnabled: boolean;
  postGameColumnsEnabled: boolean;
}): Promise<{ eliminationId: string; playoffId: string }> {
  const eliminationId = generateEliminationId();
  let playoffId: string | null = null;

  try {
    if (!params.name.trim()) {
      throw new Error('Enter a bracket name before starting playoffs.');
    }
    if (params.seededTeams.length !== params.teamsCount) {
      throw new Error(`Select exactly ${params.teamsCount} teams before starting playoffs.`);
    }
    if (!Number.isInteger(Math.log2(params.teamsCount))) {
      throw new Error('Elimination brackets require 4, 8, or 16 teams.');
    }
    if (params.seriesLengths.length !== Math.log2(params.teamsCount)) {
      throw new Error('Choose a series length for every bracket round.');
    }
    const inningsPerGame = normalizeEliminationInningsPerGame(params.inningsPerGame);

    const teamIds = params.seededTeams.map((team) => team.id);
    await deepCopyLeagueToBracket(eliminationId, params.leagueId);
    await createRosterSnapshots(eliminationId, teamIds);
    await seedManagerAssignmentsForTeams({
      teams: params.seededTeams,
      mode: 'elimination',
      instanceId: eliminationId,
      fallbackMode: 'franchise',
      fallbackInstanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
    });

    const playoffTeams: PlayoffTeam[] = params.seededTeams.map((team, index) => ({
      teamId: team.id,
      teamName: team.name,
      seed: index + 1,
      league: 'Eastern' as const,
      regularSeasonRecord: { wins: 0, losses: 0 },
      eliminated: false,
    }));
    const rounds = Math.log2(params.teamsCount);
    const playoff = await createPlayoff({
      seasonNumber: 1,
      seasonId: `elimination-${eliminationId}`,
      status: 'NOT_STARTED',
      teamsQualifying: params.teamsCount,
      rounds,
      gamesPerRound: params.seriesLengths,
      inningsPerGame,
      useDH: params.useDH,
      liveBeatReporterEnabled: params.liveBeatReporterEnabled,
      postGameColumnsEnabled: params.postGameColumnsEnabled,
      beatReporterEnabled:
        params.liveBeatReporterEnabled || params.postGameColumnsEnabled,
      leagues: ['Eastern'],
      conferenceChampionship: false,
      teams: playoffTeams,
      currentRound: 0,
      sourceType: 'elimination',
      eliminationId,
    });
    playoffId = playoff.id;

    for (let index = 0; index < params.teamsCount / 2; index += 1) {
      const higher = playoffTeams[index];
      const lower = playoffTeams[params.teamsCount - 1 - index];
      await createSeries({
        playoffId: playoff.id,
        round: 1,
        roundName: getEliminationRoundName(1, rounds),
        higherSeed: { teamId: higher.teamId, teamName: higher.teamName, seed: higher.seed },
        lowerSeed: { teamId: lower.teamId, teamName: lower.teamName, seed: lower.seed },
        status: 'PENDING',
        gamesRequired: Math.ceil(params.seriesLengths[0] / 2),
        bestOf: params.seriesLengths[0],
        higherSeedWins: 0,
        lowerSeedWins: 0,
        games: [],
      });
    }

    await startPlayoff(playoff.id);
    await createElimination({
      eliminationId,
      name: params.name.trim(),
      leagueId: params.leagueId,
      leagueName: params.leagueName,
      teamsCount: params.teamsCount,
      inningsPerGame,
      status: 'IN_PROGRESS',
      currentRound: 1,
    });
    return { eliminationId, playoffId: playoff.id };
  } catch (error) {
    try {
      await Promise.all([
        playoffId ? deletePlayoff(playoffId) : Promise.resolve(),
        deleteEliminationRosterSnapshots(eliminationId),
        deleteMojoFitnessSnapshots(eliminationId),
        deleteEliminationDatabase(eliminationId),
        deleteManagerAssignmentsForInstance({ mode: 'elimination', instanceId: eliminationId }),
      ]);
    } catch (cleanupError) {
      console.error('[Elimination] Failed to clean up partial bracket creation:', cleanupError);
    }
    throw error;
  }
}
