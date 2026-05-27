import {
  createFranchisePlayerStorageAdapter,
  executeSeasonTransition,
  type TransitionResult,
} from '../engines/seasonTransitionEngine';
import { initializeEmptyFranchiseSeasonSchedule } from './franchiseInitializer';
import { updateFranchiseMetadata } from './franchiseManager';
import { getFranchiseSeasonId } from './franchisePersistenceContract';
import { createFranchiseSeasonSummary } from './franchiseSeasonSummaryStorage';
import { getAllGamesByFranchise } from './scheduleStorage';
import {
  commitFranchiseTransitionJournal,
  createFranchiseTransitionJournal,
  failFranchiseTransitionJournal,
  recordTransitionStaging,
  recordTransitionSummary,
  rollbackFranchiseTransitionStaging,
  type FranchiseTransitionJournalDiagnostics,
  type FranchiseTransitionJournalRecord,
} from './franchiseTransitionJournal';

export interface JournaledSeasonTransitionResult {
  success: boolean;
  journal?: FranchiseTransitionJournalRecord;
  transitionResult?: TransitionResult;
  error?: string;
  failedStage?: string;
}

export interface JournaledSeasonTransitionInput {
  franchiseId: string;
  fromSeasonNumber: number;
  playoffId?: string;
  onStep?: (stepNumber: number, stepName: string, details?: string) => void;
  dependencies?: Partial<JournaledSeasonTransitionDependencies>;
}

export interface JournaledSeasonTransitionDependencies {
  createJournal: typeof createFranchiseTransitionJournal;
  recordSummary: typeof recordTransitionSummary;
  executeTransition: typeof executeSeasonTransition;
  initializeSchedule: typeof initializeEmptyFranchiseSeasonSchedule;
  getScheduleGames: typeof getAllGamesByFranchise;
  recordStaging: typeof recordTransitionStaging;
  updateMetadata: typeof updateFranchiseMetadata;
  commitJournal: typeof commitFranchiseTransitionJournal;
  failJournal: typeof failFranchiseTransitionJournal;
  rollbackStaging: typeof rollbackFranchiseTransitionStaging;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || 'season transition failed');
}

function failedStepMessage(result: TransitionResult): string {
  const failedStep = result.steps.find((step) => step.status === 'error');
  return failedStep?.error || failedStep?.name || 'season transition failed';
}

function transitionDiagnostics(
  result: TransitionResult,
): FranchiseTransitionJournalDiagnostics {
  return {
    failedStage: 'executeSeasonTransition',
    transitionResultSummary: { ...result.summary },
    transitionSteps: result.steps.map((step) => ({ ...step })),
    playerSideEffectsPossible: true,
  };
}

async function restoreMetadataIfNeeded(params: {
  dependencies: JournaledSeasonTransitionDependencies;
  franchiseId: string;
  fromSeasonNumber: number;
  metadataAdvanced: boolean;
}): Promise<FranchiseTransitionJournalDiagnostics> {
  if (!params.metadataAdvanced) {
    return {};
  }

  try {
    await params.dependencies.updateMetadata(params.franchiseId, {
      currentSeason: params.fromSeasonNumber,
    });
    return {
      metadataRollbackAttempted: true,
      metadataRollbackSucceeded: true,
    };
  } catch (error) {
    return {
      metadataRollbackAttempted: true,
      metadataRollbackSucceeded: false,
      metadataRollbackError: errorMessage(error),
    };
  }
}

/**
 * Runs the franchise-only season handoff behind a durable transition journal.
 *
 * This intentionally does not try to reverse internal player-side effects from
 * executeSeasonTransition. It does prevent the known unsafe window where summary,
 * next empty schedule/season metadata, and FranchiseMetadata.currentSeason could
 * drift without an operation record or staged-record cleanup.
 */
export async function runJournaledFranchiseSeasonTransition(
  input: JournaledSeasonTransitionInput,
): Promise<JournaledSeasonTransitionResult> {
  const toSeasonNumber = input.fromSeasonNumber + 1;
  const fromSeasonId = getFranchiseSeasonId(input.franchiseId, input.fromSeasonNumber);
  const toSeasonId = getFranchiseSeasonId(input.franchiseId, toSeasonNumber);
  const dependencies: JournaledSeasonTransitionDependencies = {
    createJournal: createFranchiseTransitionJournal,
    recordSummary: recordTransitionSummary,
    executeTransition: executeSeasonTransition,
    initializeSchedule: initializeEmptyFranchiseSeasonSchedule,
    getScheduleGames: getAllGamesByFranchise,
    recordStaging: recordTransitionStaging,
    updateMetadata: updateFranchiseMetadata,
    commitJournal: commitFranchiseTransitionJournal,
    failJournal: failFranchiseTransitionJournal,
    rollbackStaging: rollbackFranchiseTransitionStaging,
    ...input.dependencies,
  };

  let journal: FranchiseTransitionJournalRecord | undefined;
  let transitionResult: TransitionResult | undefined;
  let nextSeasonStaged = false;
  let attemptedNextSeasonStaging = false;
  let metadataAdvanced = false;

  try {
    journal = await dependencies.createJournal({
      franchiseId: input.franchiseId,
      fromSeasonNumber: input.fromSeasonNumber,
      toSeasonNumber,
      fromSeasonId,
      toSeasonId,
    });

    const summary = await createFranchiseSeasonSummary({
      franchiseId: input.franchiseId,
      seasonNumber: input.fromSeasonNumber,
      playoffId: input.playoffId,
    });
    journal = await dependencies.recordSummary(journal.id, summary.id || fromSeasonId);

    transitionResult = await dependencies.executeTransition(
      input.fromSeasonNumber,
      input.onStep,
      createFranchisePlayerStorageAdapter(input.franchiseId),
      {
        skipMojoReset: true,
        skipLegacyLocalStorageMarkers: true,
      },
    );

    if (!transitionResult.success) {
      const diagnostics = transitionDiagnostics(transitionResult);
      journal = await dependencies.failJournal(
        journal.id,
        'executeSeasonTransition',
        failedStepMessage(transitionResult),
        diagnostics,
      );
      return {
        success: false,
        journal,
        transitionResult,
        error: failedStepMessage(transitionResult),
        failedStage: 'executeSeasonTransition',
      };
    }

    attemptedNextSeasonStaging = true;
    await dependencies.initializeSchedule(input.franchiseId, toSeasonNumber);
    nextSeasonStaged = true;
    const stagedGames = await dependencies.getScheduleGames(input.franchiseId, toSeasonNumber);
    journal = await dependencies.recordStaging(journal.id, {
      stagedScheduleIds: stagedGames.map((game) => game.id),
      stagedSeasonMetadataId: toSeasonId,
    });

    await dependencies.updateMetadata(input.franchiseId, {
      currentSeason: toSeasonNumber,
    });
    metadataAdvanced = true;

    journal = await dependencies.commitJournal(journal.id);
    return {
      success: true,
      journal,
      transitionResult,
    };
  } catch (error) {
    if (!journal) {
      return {
        success: false,
        error: errorMessage(error),
        failedStage: 'createTransitionJournal',
      };
    }

    const stage = attemptedNextSeasonStaging || nextSeasonStaged || journal.stagedScheduleIds.length > 0 || journal.stagedSeasonMetadataId
      ? 'commitOrStagedTransition'
      : 'preStagingTransition';
    const metadataDiagnostics = await restoreMetadataIfNeeded({
      dependencies,
      franchiseId: input.franchiseId,
      fromSeasonNumber: input.fromSeasonNumber,
      metadataAdvanced,
    });

    try {
      journal = stage === 'commitOrStagedTransition'
        ? await dependencies.rollbackStaging(journal.id, stage, error, metadataDiagnostics)
        : await dependencies.failJournal(journal.id, stage, error, metadataDiagnostics);
    } catch (journalError) {
      return {
        success: false,
        journal,
        transitionResult,
        error: `${errorMessage(error)}; journal update failed: ${errorMessage(journalError)}`,
        failedStage: stage,
      };
    }

    return {
      success: false,
      journal,
      transitionResult,
      error: errorMessage(error),
      failedStage: stage,
    };
  }
}
