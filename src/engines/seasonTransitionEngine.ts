/**
 * Season Transition Engine
 *
 * Performs the 8 real operations when advancing from one season to the next:
 * 1. Archive season data
 * 2. Increment player ages
 * 3. Recalculate salaries
 * 4. Reset player mojo
 * 5. Clear seasonal statistics
 * 6. Apply rookie designations
 * 7. Increment years of service
 * 8. Finalize season transition
 *
 * Per FINALIZE_ADVANCE_FIGMA_SPEC.md §Season Transition
 */

import {
  getAllPlayers,
  getPlayer,
  savePlayer,
  type Player,
} from '../utils/leagueBuilderStorage';
import {
  getAllFranchisePlayers,
  getFranchisePlayer,
  saveFranchisePlayer,
} from '../utils/franchisePlayerStorage';
import { syncEngine } from '../utils/syncEngine';
import { calculateSalary } from './salaryCalculator';
import type { PlayerForSalary } from './salaryCalculator';

// --- Types ---

export interface TransitionStep {
  name: string;
  description: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  details?: string;
  error?: string;
}

export interface TransitionResult {
  success: boolean;
  steps: TransitionStep[];
  summary: {
    playersAged: number;
    salariesRecalculated: number;
    mojosReset: number;
    rookiesApplied: number;
    serviceIncremented: number;
    previousSeason: number;
    newSeason: number;
  };
}

export interface PlayerStorageAdapter {
  getAll: () => Promise<Player[]>;
  get: (playerId: string) => Promise<Player | null>;
  save: (player: Omit<Player, 'id' | 'createdDate' | 'lastModified'> & { id?: string }) => Promise<Player>;
}

export interface SeasonTransitionOptions {
  /**
   * Mode 2 v1 treats mojo/fitness as user-observed state. Franchise
   * finalization should not automatically normalize mojo unless a later spec
   * explicitly enables that behavior.
   */
  skipMojoReset?: boolean;
  /**
   * Franchise seasons now use canonical IndexedDB records for summary and
   * metadata. Legacy global localStorage markers remain for non-franchise
   * flows only.
   */
  skipLegacyLocalStorageMarkers?: boolean;
}

export const leagueBuilderPlayerStorageAdapter: PlayerStorageAdapter = {
  getAll: getAllPlayers,
  get: getPlayer,
  save: savePlayer,
};

function setSyncedLocalStorage(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
  if (!syncEngine.isSuppressed()) {
    syncEngine.upsertLocal(key, value);
  }
}

function removeSyncedLocalStorage(key: string): void {
  localStorage.removeItem(key);
  if (!syncEngine.isSuppressed()) {
    syncEngine.removeLocal(key);
  }
}

export function createFranchisePlayerStorageAdapter(franchiseId: string): PlayerStorageAdapter {
  return {
    getAll: () => getAllFranchisePlayers(franchiseId),
    get: (playerId: string) => getFranchisePlayer(franchiseId, playerId),
    save: (player) => saveFranchisePlayer(franchiseId, player),
  };
}

// --- Step Implementations ---

/** Step 1: Archive season data to localStorage */
export function archiveSeasonData(seasonNumber: number): { archived: boolean; key: string } {
  const key = `kbl_season_${seasonNumber}_archive`;
  const archiveData = {
    seasonNumber,
    archivedAt: new Date().toISOString(),
    // In a full implementation, this would include season stats, standings, etc.
  };
  setSyncedLocalStorage(key, archiveData);
  return { archived: true, key };
}

/** Step 2: Increment all player ages by 1 */
export async function incrementPlayerAges(
  playerStorage: PlayerStorageAdapter = leagueBuilderPlayerStorageAdapter,
): Promise<{ count: number; players: Player[] }> {
  const players = await playerStorage.getAll();
  const updated: Player[] = [];

  for (const player of players) {
    const updatedPlayer = {
      ...player,
      age: player.age + 1,
      lastModified: new Date().toISOString(),
    };
    await playerStorage.save(updatedPlayer);
    updated.push(updatedPlayer);
  }

  return { count: updated.length, players: updated };
}

/** Step 3: Recalculate all player salaries based on new age/ratings */
export async function recalculateSalaries(
  playerStorage: PlayerStorageAdapter = leagueBuilderPlayerStorageAdapter,
): Promise<{ count: number; changes: Array<{ name: string; old: number; new: number }> }> {
  const players = await playerStorage.getAll();
  const changes: Array<{ name: string; old: number; new: number }> = [];

  for (const player of players) {
    const oldSalary = player.salary;
    const isPitcher = ['SP', 'RP', 'CP', 'SP/RP'].includes(player.primaryPosition);

    // Adapt leagueBuilderStorage.Player to salaryCalculator.PlayerForSalary
    const salaryPlayer: PlayerForSalary = {
      id: player.id,
      name: `${player.firstName} ${player.lastName}`,
      isPitcher,
      primaryPosition: player.primaryPosition as PlayerForSalary['primaryPosition'],
      ratings: isPitcher
        ? { velocity: player.velocity, junk: player.junk, accuracy: player.accuracy }
        : { power: player.power, contact: player.contact, speed: player.speed, fielding: player.fielding, arm: player.arm },
      battingRatings: isPitcher
        ? { power: player.power, contact: player.contact, speed: player.speed, fielding: player.fielding, arm: player.arm }
        : undefined,
      age: player.age,
      personality: player.personality as PlayerForSalary['personality'],
      fame: player.fame,
      traits: [player.trait1, player.trait2].filter((t): t is string => !!t),
    };

    const newSalary = calculateSalary(salaryPlayer);

    if (newSalary !== oldSalary) {
      changes.push({ name: `${player.firstName} ${player.lastName}`, old: oldSalary, new: newSalary });
    }

    const updatedPlayer = {
      ...player,
      salary: newSalary,
      lastModified: new Date().toISOString(),
    };
    await playerStorage.save(updatedPlayer);
  }

  return { count: changes.length, changes };
}

/** Step 4: Reset all player mojo to NORMAL */
export async function resetAllMojo(
  playerStorage: PlayerStorageAdapter = leagueBuilderPlayerStorageAdapter,
): Promise<{ count: number }> {
  const players = await playerStorage.getAll();
  let count = 0;

  for (const player of players) {
    if (player.mojo !== 'Normal') {
      const updatedPlayer = {
        ...player,
        mojo: 'Normal' as const,
        lastModified: new Date().toISOString(),
      };
      await playerStorage.save(updatedPlayer);
      count++;
    }
  }

  return { count };
}

/** Step 5: Clear seasonal statistics (career totals preserved in separate store) */
export function clearSeasonalStats(seasonNumber: number): { cleared: boolean } {
  // Clear season-specific stats from localStorage
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(`season_${seasonNumber}_stats`)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => removeSyncedLocalStorage(key));
  return { cleared: true };
}

/** Step 6: Apply rookie designations — farm players called up last season become rookies */
export async function applyRookieDesignations(
  playerStorage: PlayerStorageAdapter = leagueBuilderPlayerStorageAdapter,
): Promise<{ count: number; rookies: string[] }> {
  const players = await playerStorage.getAll();
  const rookies: string[] = [];

  for (const player of players) {
    // Players with an MLB assignment who haven't had a full season.
    // For now, farm players who were called up get rookie tag tracked in localStorage.
    if (player.leagueAssignments?.some((assignment) => assignment.rosterStatus === 'MLB') && player.age <= 23) {
      const rookieKey = `kbl_rookie_${player.id}`;
      if (!localStorage.getItem(rookieKey)) {
        setSyncedLocalStorage(rookieKey, {
          playerId: player.id,
          name: `${player.firstName} ${player.lastName}`,
          designatedAt: new Date().toISOString(),
        });
        rookies.push(`${player.firstName} ${player.lastName}`);
      }
    }
  }

  return { count: rookies.length, rookies };
}

/** Step 7: Increment years of service for all MLB players */
export function incrementYearsOfService(): { count: number } {
  const serviceKey = 'kbl_years_of_service';
  const existing = JSON.parse(localStorage.getItem(serviceKey) || '{}') as Record<string, number>;
  let count = 0;

  // This would typically iterate MLB roster players; simplified for now
  for (const [playerId, years] of Object.entries(existing)) {
    existing[playerId] = years + 1;
    count++;
  }

  setSyncedLocalStorage(serviceKey, existing);
  return { count };
}

/** Step 8: Finalize — increment season number, mark transition complete */
export function finalizeSeasonTransition(currentSeason: number): { newSeason: number } {
  const newSeason = currentSeason + 1;
  localStorage.setItem('kbl-current-season', String(newSeason));
  if (!syncEngine.isSuppressed()) {
    syncEngine.upsertLocal('kbl-current-season', String(newSeason));
  }
  setSyncedLocalStorage('kbl_last_transition', {
    fromSeason: currentSeason,
    toSeason: newSeason,
    completedAt: new Date().toISOString(),
  });
  return { newSeason };
}

// --- Main Orchestrator ---

export type TransitionProgressCallback = (step: number, stepName: string, details?: string) => void;

/**
 * Execute the full season transition with real data mutations.
 * Reports progress via callback so UI can update step-by-step.
 */
export async function executeSeasonTransition(
  currentSeason: number,
  onProgress?: TransitionProgressCallback,
  playerStorage: PlayerStorageAdapter = leagueBuilderPlayerStorageAdapter,
  options: SeasonTransitionOptions = {},
): Promise<TransitionResult> {
  const steps: TransitionStep[] = [
    { name: 'Archive Season Data', description: 'Saving season records', status: 'pending' },
    { name: 'Increment Ages', description: 'All players age +1 year', status: 'pending' },
    { name: 'Recalculate Salaries', description: 'Based on new age and ratings', status: 'pending' },
    { name: 'Reset Mojo', description: 'All players reset to NORMAL', status: 'pending' },
    { name: 'Clear Season Stats', description: 'Career totals preserved', status: 'pending' },
    { name: 'Rookie Designations', description: 'Mark new rookies', status: 'pending' },
    { name: 'Years of Service', description: 'Increment service time', status: 'pending' },
    { name: 'Finalize Transition', description: 'Advance to new season', status: 'pending' },
  ];

  const summary = {
    playersAged: 0,
    salariesRecalculated: 0,
    mojosReset: 0,
    rookiesApplied: 0,
    serviceIncremented: 0,
    previousSeason: currentSeason,
    newSeason: currentSeason + 1,
  };

  try {
    // Step 1: Archive
    steps[0].status = 'running';
    onProgress?.(1, steps[0].name);
    if (!options.skipLegacyLocalStorageMarkers) {
      archiveSeasonData(currentSeason);
    }
    steps[0].status = 'complete';
    steps[0].details = options.skipLegacyLocalStorageMarkers
      ? 'Legacy local archive skipped; franchise summary is the durable archive'
      : `Season ${currentSeason} archived`;

    // Step 2: Ages
    steps[1].status = 'running';
    onProgress?.(2, steps[1].name);
    const ageResult = await incrementPlayerAges(playerStorage);
    summary.playersAged = ageResult.count;
    steps[1].status = 'complete';
    steps[1].details = `${ageResult.count} players aged`;

    // Step 3: Salaries
    steps[2].status = 'running';
    onProgress?.(3, steps[2].name);
    const salaryResult = await recalculateSalaries(playerStorage);
    summary.salariesRecalculated = salaryResult.count;
    steps[2].status = 'complete';
    steps[2].details = `${salaryResult.count} salaries changed`;

    // Step 4: Mojo
    steps[3].status = 'running';
    onProgress?.(4, steps[3].name);
    const mojoResult = options.skipMojoReset
      ? { count: 0 }
      : await resetAllMojo(playerStorage);
    summary.mojosReset = mojoResult.count;
    steps[3].status = 'complete';
    steps[3].details = options.skipMojoReset
      ? 'Mojo reset skipped for Mode 2 v1 franchise finalization'
      : `${mojoResult.count} mojos reset`;

    // Step 5: Clear stats
    steps[4].status = 'running';
    onProgress?.(5, steps[4].name);
    if (!options.skipLegacyLocalStorageMarkers) {
      clearSeasonalStats(currentSeason);
    }
    steps[4].status = 'complete';
    steps[4].details = options.skipLegacyLocalStorageMarkers
      ? 'Legacy local stat cleanup skipped for franchise season'
      : 'Seasonal stats cleared';

    // Step 6: Rookies
    steps[5].status = 'running';
    onProgress?.(6, steps[5].name);
    const rookieResult = options.skipLegacyLocalStorageMarkers
      ? { count: 0, rookies: [] }
      : await applyRookieDesignations(playerStorage);
    summary.rookiesApplied = rookieResult.count;
    steps[5].status = 'complete';
    steps[5].details = options.skipLegacyLocalStorageMarkers
      ? 'Legacy local rookie markers skipped for franchise season'
      : `${rookieResult.count} rookies designated`;

    // Step 7: Service
    steps[6].status = 'running';
    onProgress?.(7, steps[6].name);
    const serviceResult = options.skipLegacyLocalStorageMarkers
      ? { count: 0 }
      : incrementYearsOfService();
    summary.serviceIncremented = serviceResult.count;
    steps[6].status = 'complete';
    steps[6].details = options.skipLegacyLocalStorageMarkers
      ? 'Legacy local service markers skipped for franchise season'
      : `${serviceResult.count} service years incremented`;

    // Step 8: Finalize
    steps[7].status = 'running';
    onProgress?.(8, steps[7].name);
    const finalResult = options.skipLegacyLocalStorageMarkers
      ? { newSeason: currentSeason + 1 }
      : finalizeSeasonTransition(currentSeason);
    summary.newSeason = finalResult.newSeason;
    steps[7].status = 'complete';
    steps[7].details = options.skipLegacyLocalStorageMarkers
      ? `Franchise metadata controls Season ${finalResult.newSeason}`
      : `Now Season ${finalResult.newSeason}`;

    return { success: true, steps, summary };
  } catch (error) {
    // Mark current running step as error
    const runningStep = steps.find(s => s.status === 'running');
    if (runningStep) {
      runningStep.status = 'error';
      runningStep.error = error instanceof Error ? error.message : 'Unknown error';
    }
    return { success: false, steps, summary };
  }
}
