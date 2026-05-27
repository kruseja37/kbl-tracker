import 'fake-indexeddb/auto';
import { describe, expect, test, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mocks = vi.hoisted(() => ({
  createFranchiseSeasonSummary: vi.fn(),
  executeSeasonTransition: vi.fn(),
  initializeEmptyFranchiseSeasonSchedule: vi.fn(),
  updateFranchiseMetadata: vi.fn(),
  getAllGamesByFranchise: vi.fn(),
  clearFranchiseSeasonSchedule: vi.fn(),
  deleteSeasonMetadata: vi.fn(),
}));

vi.mock('../franchiseSeasonSummaryStorage', () => ({
  createFranchiseSeasonSummary: mocks.createFranchiseSeasonSummary,
}));

vi.mock('../../engines/seasonTransitionEngine', () => ({
  createFranchisePlayerStorageAdapter: vi.fn(() => ({
    getAll: vi.fn(),
    get: vi.fn(),
    save: vi.fn(),
  })),
  executeSeasonTransition: mocks.executeSeasonTransition,
}));

vi.mock('../franchiseInitializer', () => ({
  initializeEmptyFranchiseSeasonSchedule: mocks.initializeEmptyFranchiseSeasonSchedule,
}));

vi.mock('../franchiseManager', () => ({
  updateFranchiseMetadata: mocks.updateFranchiseMetadata,
}));

vi.mock('../scheduleStorage', () => ({
  getAllGamesByFranchise: mocks.getAllGamesByFranchise,
  clearFranchiseSeasonSchedule: mocks.clearFranchiseSeasonSchedule,
}));

vi.mock('../seasonStorage', () => ({
  deleteSeasonMetadata: mocks.deleteSeasonMetadata,
}));

import { runJournaledFranchiseSeasonTransition } from '../franchiseSeasonTransitionOrchestrator';
import {
  getFranchiseTransitionReadiness,
  listFranchiseTransitionJournals,
  resetFranchiseTransitionJournalDatabaseForTests,
} from '../franchiseTransitionJournal';

function successfulTransition() {
  return {
    success: true,
    steps: [],
    summary: {
      playersAged: 1,
      salariesRecalculated: 1,
      mojosReset: 0,
      rookiesApplied: 1,
      serviceIncremented: 1,
      previousSeason: 1,
      newSeason: 2,
    },
  };
}

beforeEach(async () => {
  await resetFranchiseTransitionJournalDatabaseForTests();
  vi.clearAllMocks();
  mocks.createFranchiseSeasonSummary.mockImplementation(async ({
    franchiseId,
    seasonNumber,
  }: { franchiseId: string; seasonNumber: number }) => ({
    id: `${franchiseId}-season-${seasonNumber}`,
  }));
  mocks.executeSeasonTransition.mockResolvedValue(successfulTransition());
  mocks.initializeEmptyFranchiseSeasonSchedule.mockResolvedValue(0);
  mocks.getAllGamesByFranchise.mockResolvedValue([]);
  mocks.updateFranchiseMetadata.mockResolvedValue(undefined);
  mocks.clearFranchiseSeasonSchedule.mockResolvedValue(undefined);
  mocks.deleteSeasonMetadata.mockResolvedValue(undefined);
});

describe('runJournaledFranchiseSeasonTransition', () => {
  test('commits a journal after summary, empty schedule metadata, and franchise metadata succeed', async () => {
    const result = await runJournaledFranchiseSeasonTransition({
      franchiseId: 'franchise-a',
      fromSeasonNumber: 1,
      playoffId: 'playoff-a',
    });

    expect(result.success).toBe(true);
    expect(mocks.createFranchiseSeasonSummary).toHaveBeenCalledWith({
      franchiseId: 'franchise-a',
      seasonNumber: 1,
      playoffId: 'playoff-a',
    });
    expect(mocks.initializeEmptyFranchiseSeasonSchedule).toHaveBeenCalledWith('franchise-a', 2);
    expect(mocks.updateFranchiseMetadata).toHaveBeenCalledWith('franchise-a', {
      currentSeason: 2,
    });

    const journals = await listFranchiseTransitionJournals('franchise-a');
    expect(journals).toHaveLength(1);
    expect(journals[0]).toMatchObject({
      franchiseId: 'franchise-a',
      fromSeasonNumber: 1,
      toSeasonNumber: 2,
      fromSeasonId: 'franchise-a-season-1',
      toSeasonId: 'franchise-a-season-2',
      createdSummaryId: 'franchise-a-season-1',
      stagedScheduleIds: [],
      stagedSeasonMetadataId: 'franchise-a-season-2',
      status: 'committed',
    });

    await expect(getFranchiseTransitionReadiness('franchise-a')).resolves.toMatchObject({
      status: 'clear',
      journals: [],
    });
  });

  test('rolls back staged schedule and season metadata when metadata commit fails', async () => {
    mocks.updateFranchiseMetadata.mockRejectedValueOnce(new Error('metadata write failed'));

    const result = await runJournaledFranchiseSeasonTransition({
      franchiseId: 'franchise-b',
      fromSeasonNumber: 2,
    });

    expect(result.success).toBe(false);
    expect(result.failedStage).toBe('commitOrStagedTransition');
    expect(mocks.clearFranchiseSeasonSchedule).toHaveBeenCalledWith('franchise-b', 3);
    expect(mocks.deleteSeasonMetadata).toHaveBeenCalledWith('franchise-b-season-3');

    const journals = await listFranchiseTransitionJournals('franchise-b');
    expect(journals[0]).toMatchObject({
      status: 'rolled_back',
      stagedScheduleIds: [],
      stagedSeasonMetadataId: 'franchise-b-season-3',
    });
  });

  test('restores franchise metadata when journal commit fails after metadata advances', async () => {
    const commitJournal = vi.fn().mockRejectedValue(new Error('journal commit failed'));

    const result = await runJournaledFranchiseSeasonTransition({
      franchiseId: 'franchise-late',
      fromSeasonNumber: 4,
      dependencies: {
        commitJournal,
      },
    });

    expect(result.success).toBe(false);
    expect(result.failedStage).toBe('commitOrStagedTransition');
    expect(mocks.updateFranchiseMetadata).toHaveBeenNthCalledWith(1, 'franchise-late', {
      currentSeason: 5,
    });
    expect(mocks.updateFranchiseMetadata).toHaveBeenNthCalledWith(2, 'franchise-late', {
      currentSeason: 4,
    });
    expect(mocks.clearFranchiseSeasonSchedule).toHaveBeenCalledWith('franchise-late', 5);
    expect(mocks.deleteSeasonMetadata).toHaveBeenCalledWith('franchise-late-season-5');

    const journals = await listFranchiseTransitionJournals('franchise-late');
    expect(journals[0]).toMatchObject({
      status: 'rolled_back',
      diagnostics: {
        failedStage: 'commitOrStagedTransition',
        metadataRollbackAttempted: true,
        metadataRollbackSucceeded: true,
      },
      error: {
        stage: 'commitOrStagedTransition',
        message: 'journal commit failed',
      },
    });
  });

  test('records failed rollback when metadata restore fails after metadata advances', async () => {
    const commitJournal = vi.fn().mockRejectedValue(new Error('journal commit failed'));
    mocks.updateFranchiseMetadata
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('restore failed'));

    const result = await runJournaledFranchiseSeasonTransition({
      franchiseId: 'franchise-restore-fail',
      fromSeasonNumber: 5,
      dependencies: {
        commitJournal,
      },
    });

    expect(result.success).toBe(false);
    const journals = await listFranchiseTransitionJournals('franchise-restore-fail');
    expect(journals[0]).toMatchObject({
      status: 'failed',
      diagnostics: {
        metadataRollbackAttempted: true,
        metadataRollbackSucceeded: false,
        metadataRollbackError: 'restore failed',
      },
    });
    expect(journals[0].error?.message).toContain('metadata rollback failed');
  });

  test('rolls back staged schedule and metadata when staging lookup fails before metadata advances', async () => {
    mocks.getAllGamesByFranchise.mockRejectedValueOnce(new Error('staged schedule unreadable'));

    const result = await runJournaledFranchiseSeasonTransition({
      franchiseId: 'franchise-staging',
      fromSeasonNumber: 6,
    });

    expect(result.success).toBe(false);
    expect(mocks.updateFranchiseMetadata).not.toHaveBeenCalled();
    expect(mocks.clearFranchiseSeasonSchedule).toHaveBeenCalledWith('franchise-staging', 7);
    expect(mocks.deleteSeasonMetadata).toHaveBeenCalledWith('franchise-staging-season-7');

    const journals = await listFranchiseTransitionJournals('franchise-staging');
    expect(journals[0]).toMatchObject({
      status: 'rolled_back',
      error: {
        stage: 'commitOrStagedTransition',
        message: 'staged schedule unreadable',
      },
    });
  });

  test('records rollback cleanup failure after staging', async () => {
    mocks.updateFranchiseMetadata.mockRejectedValueOnce(new Error('metadata write failed'));
    mocks.clearFranchiseSeasonSchedule.mockRejectedValueOnce(new Error('schedule cleanup failed'));

    const result = await runJournaledFranchiseSeasonTransition({
      franchiseId: 'franchise-cleanup',
      fromSeasonNumber: 7,
    });

    expect(result.success).toBe(false);
    const journals = await listFranchiseTransitionJournals('franchise-cleanup');
    expect(journals[0]).toMatchObject({
      status: 'failed',
      diagnostics: {
        rollbackCleanupErrors: ['schedule cleanup failed'],
      },
    });
    expect(journals[0].error?.message).toContain('rollback cleanup failed');
  });

  test('surfaces journal creation failure without running transition side effects', async () => {
    const createJournal = vi.fn().mockRejectedValue(new Error('journal unavailable'));

    const result = await runJournaledFranchiseSeasonTransition({
      franchiseId: 'franchise-journal-create',
      fromSeasonNumber: 8,
      dependencies: {
        createJournal,
      },
    });

    expect(result).toMatchObject({
      success: false,
      error: 'journal unavailable',
      failedStage: 'createTransitionJournal',
    });
    expect(result.journal).toBeUndefined();
    expect(mocks.createFranchiseSeasonSummary).not.toHaveBeenCalled();
    expect(mocks.executeSeasonTransition).not.toHaveBeenCalled();
    expect(mocks.initializeEmptyFranchiseSeasonSchedule).not.toHaveBeenCalled();
    expect(mocks.updateFranchiseMetadata).not.toHaveBeenCalled();
  });

  test('records a failed journal when transition engine fails after summary creation', async () => {
    mocks.executeSeasonTransition.mockResolvedValueOnce({
      success: false,
      steps: [{ name: 'Clear stats', description: '', status: 'error', error: 'stat reset failed' }],
      summary: {
        playersAged: 0,
        salariesRecalculated: 0,
        mojosReset: 0,
        rookiesApplied: 0,
        serviceIncremented: 0,
        previousSeason: 3,
        newSeason: 4,
      },
    });

    const result = await runJournaledFranchiseSeasonTransition({
      franchiseId: 'franchise-c',
      fromSeasonNumber: 3,
    });

    expect(result.success).toBe(false);
    expect(result.failedStage).toBe('executeSeasonTransition');
    expect(mocks.initializeEmptyFranchiseSeasonSchedule).not.toHaveBeenCalled();
    expect(mocks.updateFranchiseMetadata).not.toHaveBeenCalled();

    const journals = await listFranchiseTransitionJournals('franchise-c');
    expect(journals[0]).toMatchObject({
      status: 'failed',
      createdSummaryId: 'franchise-c-season-3',
      error: {
        stage: 'executeSeasonTransition',
        message: 'stat reset failed',
      },
      diagnostics: {
        failedStage: 'executeSeasonTransition',
        transitionResultSummary: {
          playersAged: 0,
          salariesRecalculated: 0,
          mojosReset: 0,
          rookiesApplied: 0,
          serviceIncremented: 0,
          previousSeason: 3,
          newSeason: 4,
        },
        transitionSteps: [
          { name: 'Clear stats', description: '', status: 'error', error: 'stat reset failed' },
        ],
        playerSideEffectsPossible: true,
      },
    });

    const readiness = await getFranchiseTransitionReadiness('franchise-c');
    expect(readiness.status).toBe('attention_required');
    expect(readiness.journals.map((journal) => journal.id)).toEqual([journals[0].id]);
  });

  test('direct start and FinalizeAdvanceFlow both call the journaled transition orchestrator', () => {
    const root = resolve(__dirname, '../../..');
    const franchiseHome = readFileSync(
      resolve(root, 'src/src_figma/app/pages/FranchiseHome.tsx'),
      'utf8',
    );
    const finalizeAdvance = readFileSync(
      resolve(root, 'src/src_figma/app/components/FinalizeAdvanceFlow.tsx'),
      'utf8',
    );

    expect(franchiseHome).toContain('runJournaledFranchiseSeasonTransition');
    expect(finalizeAdvance).toContain('runJournaledFranchiseSeasonTransition');
  });
});
