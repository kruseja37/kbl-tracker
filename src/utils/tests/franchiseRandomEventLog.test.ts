import { describe, expect, test, vi } from 'vitest';

import {
  buildFranchiseRandomEventLogReport,
  FRANCHISE_RANDOM_EVENT_LOG_CONTRACT_VERSION,
} from '../franchiseRandomEventLog';
import {
  FRANCHISE_NARRATIVE_EVENT_ELIGIBILITY_CONTRACT_VERSION,
  type FranchiseNarrativeEventEligibilityReport,
} from '../franchiseNarrativeEventEligibility';
import {
  FRANCHISE_STADIUM_FOUNDATION_CONTRACT_VERSION,
  type FranchiseStadiumFoundationReport,
} from '../franchiseStadiumFoundation';

const scope = {
  franchiseId: 'franchise-1',
  seasonId: 'franchise-1-season-2',
  statsScopeId: 'franchise-1-season-2',
  seasonNumber: 2,
};

function area(status = 'eligible-context', eligibleForReadOnlySummaryContext = true) {
  return {
    status,
    reasons: [`${status} reason`],
    limitations: [],
    eligibleForReadOnlySummaryContext,
    eligibleForNarrativeGeneration: false,
    eligibleForRandomEventGeneration: false,
    mutable: false,
    persistable: false,
  };
}

function narrativeReport(
  overrides: Partial<FranchiseNarrativeEventEligibilityReport> = {},
): FranchiseNarrativeEventEligibilityReport {
  return {
    contractVersion: FRANCHISE_NARRATIVE_EVENT_ELIGIBILITY_CONTRACT_VERSION,
    ...scope,
    generatedAt: 100,
    sourceContracts: {
      analyticsTrust: 'franchise-analytics-trust-v1-readonly',
    },
    scope: area(),
    gameTrackerArchiveBackedGames: {
      ...area(),
      scopedRows: 2,
      archiveBacked: true,
    },
    scoreOnlyCompletedGames: {
      ...area(),
      scopedRows: 1,
      scheduleStandingsContextOnly: true,
    },
    rosterMovementTransactions: {
      ...area(),
      scopedRows: 3,
      contextOnly: true,
    },
    playerLocalProfileEdits: {
      ...area(),
      entries: 4,
      playerLocalOnly: true,
    },
    salaryBaseline: {
      ...area(),
      stableRows: 6,
    },
    salaryMovement: area('blocked', false),
    trueValueAndValueDelta: area('blocked', false),
    designationPrerequisites: {
      teamMvpAcePreview: {
        ...area('preview-only', true),
        previewRecords: 2,
      },
      fanFavorite: area('blocked', false),
      albatross: area('blocked', false),
      captain: area('deferred', false),
      fanHopeful: area('deferred', false),
    },
    personalityChemistryContext: {
      ...area(),
      visibleContextRows: 7,
    },
    hiddenFarmProspectData: {
      ...area('blocked', false),
      hiddenSafeRows: 1,
      hiddenModifierRows: 1,
      hiddenDataExposed: false,
    },
    moraleRelationshipState: area('blocked', false),
    playoffChampionContext: area('preview-only', false),
    downstreamConsumers: {
      readOnlySummaries: area(),
      narrativeGeneration: area('blocked', false),
      randomEventGeneration: area('blocked', false),
      storyPersistence: area('blocked', false),
      moraleMutation: area('blocked', false),
      relationshipMutation: area('blocked', false),
      mode3OffseasonExecution: area('deferred', false),
    },
    anyNarrativeGenerationAllowed: false,
    anyRandomEventGenerationAllowed: false,
    anyMutable: false,
    anyPersistable: false,
    hiddenSafe: true,
    limitations: [],
    ...overrides,
  } as FranchiseNarrativeEventEligibilityReport;
}

function stadiumReport(
  overrides: Partial<FranchiseStadiumFoundationReport> = {},
): FranchiseStadiumFoundationReport {
  return {
    contractVersion: FRANCHISE_STADIUM_FOUNDATION_CONTRACT_VERSION,
    generatedAt: 100,
    scope: {
      ...scope,
      status: 'trusted',
      reasons: ['scope trusted'],
      limitations: [],
    },
    stadiumIdentity: {
      status: 'trusted',
      reasons: ['identity'],
      limitations: [],
      stadiums: [],
    },
    sprayCharts: {
      status: 'trusted',
      reasons: ['spray'],
      limitations: [],
      rows: [],
      summary: {
        rows: 3,
        battingRows: 1,
        pitchingRows: 1,
        fieldingRows: 1,
        stadiumIds: ['apple-field'],
        teamIds: ['team-1', 'team-2'],
        playerIds: ['player-1'],
        outcomeCounts: { '1B': 1 },
        zoneCounts: { Z05: 1 },
        limitations: [],
      },
      trustedForBatting: true,
      trustedForPitching: true,
      trustedForFielding: true,
      source: 'completed-game-archive-events',
    },
    parkFactors: {
      status: 'trusted',
      reasons: ['seed'],
      limitations: ['adaptive preview only'],
      seedFactorsTrusted: true,
      adaptiveFactorsPreviewOnly: true,
      adaptiveFactorsPersisted: false,
    },
    downstreamConsumers: {
      warParkAdjustment: { status: 'preview-only', reasons: [], limitations: [] },
      randomEventGenerator: { status: 'preview-only', reasons: [], limitations: [] },
      fanPlayerMorale: { status: 'preview-only', reasons: [], limitations: [] },
      mode3Handoff: { status: 'preview-only', reasons: [], limitations: [] },
    },
    limitations: [],
    ...overrides,
  };
}

describe('franchise random event log foundation', () => {
  test('builds draft-only prompt records from eligible archive roster profile and stadium context', () => {
    vi.setSystemTime(new Date('2026-06-02T12:00:00.000Z'));

    const report = buildFranchiseRandomEventLogReport({
      narrativeEventEligibilityReport: narrativeReport(),
      stadiumFoundationReport: stadiumReport(),
    });

    expect(report.contractVersion).toBe(FRANCHISE_RANDOM_EVENT_LOG_CONTRACT_VERSION);
    expect(report.entries.map((entry) => entry.kind)).toEqual([
      'gametracker-archive-fact',
      'score-only-context',
      'roster-movement-context',
      'player-profile-edit-context',
      'stadium-spray-context',
    ]);
    expect(report.readyForReview).toBe(5);
    expect(report.confirmedManualChanges).toBe(0);
    expect(report.persistable).toBe(false);
    expect(report.mutable).toBe(false);
    expect(report.automaticProfileMutationAllowed).toBe(false);
    expect(report.automaticMoraleMutationAllowed).toBe(false);
    expect(report.automaticRelationshipMutationAllowed).toBe(false);
    expect(report.automaticStoryPersistenceAllowed).toBe(false);

    const stadium = report.entries.find((entry) => entry.kind === 'stadium-spray-context');
    expect(stadium).toMatchObject({
      status: 'ready-for-review',
      hiddenSafe: true,
      persistable: false,
      mutable: false,
      suggestedManualChange: {
        target: 'story-note',
        requiresUserConfirmation: true,
        automaticProfileMutationAllowed: false,
        automaticMoraleMutationAllowed: false,
        automaticRelationshipMutationAllowed: false,
      },
    });
    expect(stadium?.reason).toContain('3 scoped spray row(s)');
    expect(stadium?.evidenceReferences[0]).toMatchObject({
      type: 'stadium-spray-summary',
      count: 3,
      hiddenProspectTruth: false,
      stadiumId: 'apple-field',
    });
  });

  test('keeps score-only rows as schedule context only with confirmation-gated team fan morale', () => {
    const report = buildFranchiseRandomEventLogReport({
      narrativeEventEligibilityReport: narrativeReport(),
    });

    const scoreOnly = report.entries.find((entry) => entry.kind === 'score-only-context');
    expect(scoreOnly).toBeDefined();
    expect(scoreOnly?.suggestedManualChange).toMatchObject({
      target: 'story-note',
      automaticProfileMutationAllowed: false,
      automaticMoraleMutationAllowed: false,
      automaticRelationshipMutationAllowed: false,
    });
    expect(scoreOnly?.evidenceReferences[0]).toMatchObject({
      type: 'score-only-schedule-summary',
      scoreOnlyContextOnly: true,
      hiddenProspectTruth: false,
    });
    expect(scoreOnly?.suggestedManualChange.summary).toMatch(/team-fan morale review after confirmation/i);
    expect(scoreOnly?.warnings.join(' ')).toMatch(/no player archive, player stats, WPA, WAR, player morale, fame, milestones, awards, designations, relationships, or Game Detail archive authority/i);
    expect(scoreOnly?.warnings.join(' ')).toMatch(/Team-fan morale can change only after Random Event Log confirmation/i);
  });

  test('applies confirmation checkbox state without enabling persistence or mutation', () => {
    const confirmedId = 'franchise-1:franchise-1-season-2:franchise-1-season-2:random-event:stadium-spray-context:stadium-spray';

    const report = buildFranchiseRandomEventLogReport({
      narrativeEventEligibilityReport: narrativeReport(),
      stadiumFoundationReport: stadiumReport(),
      confirmations: {
        [confirmedId]: {
          state: 'confirmed',
          actorDisplayName: 'Commissioner',
          confirmedAt: '2026-06-02T12:00:00.000Z',
          note: 'Manual story note added.',
        },
      },
    });

    const confirmed = report.entries.find((entry) => entry.id === confirmedId);
    expect(confirmed).toMatchObject({
      status: 'confirmed-manual-change',
      persistable: false,
      mutable: false,
      confirmation: {
        state: 'confirmed',
        checked: true,
        checkboxLabel: 'Manual change completed',
        actorDisplayName: 'Commissioner',
      },
    });
    expect(confirmed?.narrativeReadableStatus).toMatch(/user-confirmed context/i);
    expect(report.confirmedManualChanges).toBe(1);
    expect(report.automaticProfileMutationAllowed).toBe(false);
  });

  test('blocks context generation when composed report scopes do not match', () => {
    const report = buildFranchiseRandomEventLogReport({
      narrativeEventEligibilityReport: narrativeReport(),
      stadiumFoundationReport: stadiumReport({
        scope: {
          ...scope,
          statsScopeId: 'wrong-scope',
          status: 'trusted',
          reasons: [],
          limitations: [],
        },
      }),
    });

    expect(report.entries).toEqual([]);
    expect(report.blockers).toContain('Stadium foundation report scope does not match narrative/random-event scope.');
    expect(report.persistable).toBe(false);
    expect(report.mutable).toBe(false);
  });

  test('blocks all prompts when narrative eligibility scope is blocked', () => {
    const report = buildFranchiseRandomEventLogReport({
      narrativeEventEligibilityReport: narrativeReport({
        scope: area('blocked', false),
      }),
      stadiumFoundationReport: stadiumReport(),
    });

    expect(report.entries).toEqual([]);
    expect(report.blockers).toContain('Narrative/random-event eligibility scope is blocked.');
  });

  test('keeps hidden FARM prospect truth out of warnings evidence and prompt entries', () => {
    const report = buildFranchiseRandomEventLogReport({
      narrativeEventEligibilityReport: narrativeReport(),
      stadiumFoundationReport: stadiumReport(),
    });

    expect(report.hiddenSafe).toBe(true);
    expect(report.warnings).toContain('Unrevealed FARM/prospect hidden truth remains blocked from random-event prompts.');
    for (const entry of report.entries) {
      expect(entry.hiddenSafe).toBe(true);
      expect(entry.evidenceReferences.every((reference) => reference.hiddenProspectTruth === false)).toBe(true);
      expect(JSON.stringify(entry)).not.toContain('hiddenPersonalityModifiers');
      expect(JSON.stringify(entry)).not.toContain('trueGrade');
      expect(JSON.stringify(entry)).not.toContain('loyalty');
    }
  });
});
