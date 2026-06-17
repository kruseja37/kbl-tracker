import type { FranchiseAnalyticsTrustReport } from './franchiseAnalyticsTrust';
import type {
  FranchiseDesignationEligibilityReport,
  FranchiseDesignationEligibilityType,
} from './franchiseDesignationEligibility';
import type { FranchiseMoraleRelationshipTrustReport } from './franchiseMoraleRelationshipTrust';
import type { FranchiseSalaryLifecycleReport } from './franchiseSalaryLifecycle';
import type { FranchiseValueInputReport } from './franchiseValueInputs';

export const FRANCHISE_NARRATIVE_EVENT_ELIGIBILITY_CONTRACT_VERSION =
  'franchise-narrative-event-eligibility-v1-readonly';

export type FranchiseNarrativeEventEligibilityStatus =
  | 'eligible-context'
  | 'preview-only'
  | 'blocked'
  | 'deferred'
  | 'not-applicable';

export interface FranchiseNarrativeEventEligibilityArea {
  status: FranchiseNarrativeEventEligibilityStatus;
  reasons: string[];
  limitations: string[];
  eligibleForReadOnlySummaryContext: boolean;
  eligibleForNarrativeGeneration: false;
  eligibleForRandomEventGeneration: false;
  mutable: false;
  persistable: false;
}

export interface FranchiseNarrativeDesignationPrerequisiteEligibility {
  teamMvpAcePreview: FranchiseNarrativeEventEligibilityArea & {
    previewRecords: number;
  };
  fanFavorite: FranchiseNarrativeEventEligibilityArea;
  albatross: FranchiseNarrativeEventEligibilityArea;
  captain: FranchiseNarrativeEventEligibilityArea;
  fanHopeful: FranchiseNarrativeEventEligibilityArea;
}

export interface FranchiseNarrativeEventConsumerEligibility {
  readOnlySummaries: FranchiseNarrativeEventEligibilityArea;
  narrativeGeneration: FranchiseNarrativeEventEligibilityArea;
  randomEventGeneration: FranchiseNarrativeEventEligibilityArea;
  storyPersistence: FranchiseNarrativeEventEligibilityArea;
  moraleMutation: FranchiseNarrativeEventEligibilityArea;
  relationshipMutation: FranchiseNarrativeEventEligibilityArea;
  mode3OffseasonExecution: FranchiseNarrativeEventEligibilityArea;
}

export interface FranchiseNarrativeEventEligibilityReport {
  contractVersion: typeof FRANCHISE_NARRATIVE_EVENT_ELIGIBILITY_CONTRACT_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  generatedAt: number;
  sourceContracts: {
    analyticsTrust: FranchiseAnalyticsTrustReport['contractVersion'];
    valueInputs?: FranchiseValueInputReport['contractVersion'];
    salaryLifecycle?: FranchiseSalaryLifecycleReport['contractVersion'];
    designationEligibility?: FranchiseDesignationEligibilityReport['contractVersion'];
    moraleRelationshipTrust?: FranchiseMoraleRelationshipTrustReport['contractVersion'];
  };
  scope: FranchiseNarrativeEventEligibilityArea;
  gameTrackerArchiveBackedGames: FranchiseNarrativeEventEligibilityArea & {
    scopedRows: number;
    archiveBacked: boolean;
  };
  scoreOnlyCompletedGames: FranchiseNarrativeEventEligibilityArea & {
    scopedRows: number;
    scheduleStandingsContextOnly: boolean;
  };
  rosterMovementTransactions: FranchiseNarrativeEventEligibilityArea & {
    scopedRows: number;
    contextOnly: boolean;
  };
  playerLocalProfileEdits: FranchiseNarrativeEventEligibilityArea & {
    entries: number;
    playerLocalOnly: boolean;
  };
  salaryBaseline: FranchiseNarrativeEventEligibilityArea & {
    stableRows: number;
  };
  salaryMovement: FranchiseNarrativeEventEligibilityArea;
  trueValueAndValueDelta: FranchiseNarrativeEventEligibilityArea;
  designationPrerequisites: FranchiseNarrativeDesignationPrerequisiteEligibility;
  personalityChemistryContext: FranchiseNarrativeEventEligibilityArea & {
    visibleContextRows: number;
  };
  hiddenFarmProspectData: FranchiseNarrativeEventEligibilityArea & {
    hiddenSafeRows: number;
    hiddenModifierRows: number;
    hiddenDataExposed: false;
  };
  moraleRelationshipState: FranchiseNarrativeEventEligibilityArea;
  playoffChampionContext: FranchiseNarrativeEventEligibilityArea;
  downstreamConsumers: FranchiseNarrativeEventConsumerEligibility;
  anyNarrativeGenerationAllowed: false;
  anyRandomEventGenerationAllowed: false;
  anyMutable: false;
  anyPersistable: false;
  hiddenSafe: boolean;
  limitations: string[];
}

export interface BuildFranchiseNarrativeEventEligibilityInput {
  analyticsTrustReport: FranchiseAnalyticsTrustReport;
  valueInputReport?: FranchiseValueInputReport;
  salaryLifecycleReport?: FranchiseSalaryLifecycleReport;
  designationEligibilityReport?: FranchiseDesignationEligibilityReport;
  moraleRelationshipTrustReport?: FranchiseMoraleRelationshipTrustReport;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function area(
  status: FranchiseNarrativeEventEligibilityStatus,
  reasons: string[],
  limitations: string[] = [],
  eligibleForReadOnlySummaryContext = false,
): FranchiseNarrativeEventEligibilityArea {
  return {
    status,
    reasons: unique(reasons),
    limitations: unique(limitations),
    eligibleForReadOnlySummaryContext,
    eligibleForNarrativeGeneration: false,
    eligibleForRandomEventGeneration: false,
    mutable: false,
    persistable: false,
  };
}

function scopeComplete(input: BuildFranchiseNarrativeEventEligibilityInput): boolean {
  const analytics = input.analyticsTrustReport;
  const reports = [
    input.valueInputReport,
    input.salaryLifecycleReport,
    input.designationEligibilityReport,
    input.moraleRelationshipTrustReport,
  ].filter((report): report is Exclude<typeof report, undefined> => Boolean(report));
  return Boolean(analytics.franchiseId && analytics.seasonId && analytics.statsScopeId) &&
    reports.every((report) =>
      report.franchiseId === analytics.franchiseId &&
      report.seasonId === analytics.seasonId &&
      report.statsScopeId === analytics.statsScopeId,
    );
}

function scopeArea(input: BuildFranchiseNarrativeEventEligibilityInput): FranchiseNarrativeEventEligibilityArea {
  if (!scopeComplete(input)) {
    return area('blocked', [
      'franchiseId, seasonId, and statsScopeId are required before facts can be eligible for narrative/random-event consideration.',
    ]);
  }
  return area('eligible-context', [
    'Franchise, season, and stats scope identity are present across provided foundation contracts.',
  ], [
    'Scope identity only permits read-only context classification; it does not allow narrative/random-event generation.',
  ], true);
}

function archiveGamesArea(
  analytics: FranchiseAnalyticsTrustReport,
  scopeTrusted: boolean,
): FranchiseNarrativeEventEligibilityReport['gameTrackerArchiveBackedGames'] {
  const scopedRows = analytics.coreStats.scopedArchiveRows;
  if (!scopeTrusted) {
    return {
      ...area('blocked', [
        'GameTracker archive-backed games require complete franchiseId, seasonId, and statsScopeId before narrative eligibility.',
      ]),
      scopedRows: 0,
      archiveBacked: false,
    };
  }
  return {
    ...area(
      scopedRows > 0 ? 'eligible-context' : 'not-applicable',
      scopedRows > 0
        ? ['Scoped GameTracker archive-backed games are eligible as stable read-only game-fact summary context.']
        : ['No scoped GameTracker archive-backed completed games are available.'],
      ['Archive-backed games do not permit narrative generation, random-event generation, or story persistence in this gate.'],
      scopedRows > 0,
    ),
    scopedRows,
    archiveBacked: scopedRows > 0,
  };
}

function scoreOnlyArea(
  analytics: FranchiseAnalyticsTrustReport,
  scopeTrusted: boolean,
): FranchiseNarrativeEventEligibilityReport['scoreOnlyCompletedGames'] {
  const scopedRows = analytics.scoreOnlyBoundary.scoreOnlyRows;
  if (!scopeTrusted) {
    return {
      ...area('blocked', [
        'Score-only rows require complete franchiseId, seasonId, and statsScopeId before narrative eligibility.',
      ]),
      scopedRows: 0,
      scheduleStandingsContextOnly: false,
    };
  }
  return {
    ...area(
      scopedRows > 0 ? 'eligible-context' : 'not-applicable',
      scopedRows > 0
        ? ['Score-only completed games are eligible only as schedule result and standings summary context.']
        : ['No scoped score-only completed games are available.'],
      ['Score-only rows have no player archive, player stats, WPA, morale, relationship, or random-event input authority.'],
      scopedRows > 0,
    ),
    scopedRows,
    scheduleStandingsContextOnly: scopedRows > 0,
  };
}

function rosterMovementArea(
  moraleReport: FranchiseMoraleRelationshipTrustReport | undefined,
  scopeTrusted: boolean,
): FranchiseNarrativeEventEligibilityReport['rosterMovementTransactions'] {
  const scopedRows = moraleReport?.rosterMovementHistory.scopedRows ?? 0;
  if (!scopeTrusted) {
    return {
      ...area('blocked', [
        'Roster movement transaction context requires complete franchiseId, seasonId, and statsScopeId.',
      ]),
      scopedRows: 0,
      contextOnly: false,
    };
  }
  return {
    ...area(
      scopedRows > 0 ? 'eligible-context' : 'not-applicable',
      scopedRows > 0
        ? ['Scoped call-up/send-down/trade transactions are eligible as read-only roster movement summary context.']
        : ['No scoped roster movement transactions are available.'],
      ['Roster movement context does not permit morale, relationship, narrative, or random-event mutation.'],
      scopedRows > 0,
    ),
    scopedRows,
    contextOnly: scopedRows > 0,
  };
}

function playerLocalProfileEditArea(
  moraleReport: FranchiseMoraleRelationshipTrustReport | undefined,
  scopeTrusted: boolean,
): FranchiseNarrativeEventEligibilityReport['playerLocalProfileEdits'] {
  const entries = moraleReport?.playerRecords.reduce(
    (sum, record) => sum + record.playerLocalEditHistory.entries,
    0,
  ) ?? 0;
  if (!scopeTrusted) {
    return {
      ...area('blocked', [
        'Player-local edit history requires complete franchiseId, seasonId, and statsScopeId before narrative eligibility.',
      ]),
      entries: 0,
      playerLocalOnly: true,
    };
  }
  return {
    ...area(
      entries > 0 ? 'eligible-context' : 'not-applicable',
      entries > 0
        ? ['Player-local profile edit history is eligible as read-only profile audit context only.']
        : ['No player-local profile edit history is available.'],
      ['Profile edit history is not official transaction history and cannot create narratives or random events in this gate.'],
      entries > 0,
    ),
    entries,
    playerLocalOnly: true,
  };
}

function salaryBaselineArea(
  salaryReport: FranchiseSalaryLifecycleReport | undefined,
  moraleReport: FranchiseMoraleRelationshipTrustReport | undefined,
  scopeTrusted: boolean,
): FranchiseNarrativeEventEligibilityReport['salaryBaseline'] {
  const stableRows = salaryReport?.playerRecords.filter((record) =>
    record.initialSalaryBaseline.status === 'stable-baseline',
  ).length ?? moraleReport?.salary.baseline.playerRowsWithBaseline ?? 0;
  if (!scopeTrusted) {
    return {
      ...area('blocked', [
        'Salary baseline context requires complete franchiseId, seasonId, and statsScopeId before narrative eligibility.',
      ]),
      stableRows: 0,
    };
  }
  return {
    ...area(
      stableRows > 0 ? 'eligible-context' : 'blocked',
      stableRows > 0
        ? ['Stored salary baseline is eligible as read-only financial context.']
        : ['Stored salary baseline is unavailable.'],
      ['Salary baseline context does not permit salary movement, narratives, random events, or morale/relationship changes.'],
      stableRows > 0,
    ),
    stableRows,
  };
}

function salaryMovementArea(): FranchiseNarrativeEventEligibilityArea {
  return area('blocked', [
    'Salary movement is blocked because canonical True Value, value delta, and salary lifecycle rules are unavailable in internal v1.',
  ]);
}

function trueValueArea(valueReport: FranchiseValueInputReport | undefined): FranchiseNarrativeEventEligibilityArea {
  const trueValueAvailable = Boolean(valueReport?.trueValuePolicy.finalTrueValueCalculated);
  return area(
    trueValueAvailable ? 'preview-only' : 'blocked',
    trueValueAvailable
      ? ['True Value is present only as read-only preview input; narrative/random-event generation remains blocked.']
      : ['True Value and value delta are unavailable and cannot be narrative/random-event inputs in internal v1.'],
    ['No True Value or value-delta event records are created or persisted by this gate.'],
    false,
  );
}

function previewDesignationCount(
  designationReport: FranchiseDesignationEligibilityReport | undefined,
  types: FranchiseDesignationEligibilityType[],
): number {
  return designationReport?.records.filter((record) =>
    types.includes(record.designationType) && record.status === 'preview-only',
  ).length ?? 0;
}

function designationStatusArea(
  status: FranchiseNarrativeEventEligibilityStatus,
  reasons: string[],
): FranchiseNarrativeEventEligibilityArea {
  return area(status, reasons, ['Designation prerequisites do not permit designation persistence, narratives, or random events in internal v1.']);
}

function designationPrerequisites(
  designationReport: FranchiseDesignationEligibilityReport | undefined,
  moraleReport: FranchiseMoraleRelationshipTrustReport | undefined,
  scopeTrusted: boolean,
): FranchiseNarrativeDesignationPrerequisiteEligibility {
  const previewRecords = previewDesignationCount(designationReport, ['TEAM_MVP', 'ACE']);
  if (!scopeTrusted) {
    return {
      teamMvpAcePreview: {
        ...area('blocked', [
          'TEAM_MVP/ACE preview eligibility requires matching franchiseId, seasonId, and statsScopeId across foundation contracts.',
        ], ['TEAM_MVP/ACE preview eligibility is not a finalized award, designation, narrative, or random-event input.']),
        previewRecords: 0,
      },
      fanFavorite: designationStatusArea('blocked', [
        'Fan Favorite prerequisites require matching franchise/season/stats scope plus canonical True Value, fan, morale, and relationship systems.',
      ]),
      albatross: designationStatusArea('blocked', [
        'Albatross prerequisites require matching franchise/season/stats scope plus canonical True Value and value-delta inputs.',
      ]),
      captain: designationStatusArea('blocked', [
        'Captain prerequisites require matching franchise/season/stats scope before deferred lifecycle rules can be evaluated.',
      ]),
      fanHopeful: designationStatusArea('blocked', [
        'Fan Hopeful prerequisites require matching franchise/season/stats scope before deferred lifecycle rules can be evaluated.',
      ]),
    };
  }

  return {
    teamMvpAcePreview: {
      ...area(
        previewRecords > 0 ? 'preview-only' : 'not-applicable',
        previewRecords > 0
          ? ['TEAM_MVP/ACE eligibility exists as read-only preview context only.']
          : ['No TEAM_MVP/ACE preview eligibility is available.'],
        ['TEAM_MVP/ACE preview eligibility is not a finalized award, designation, narrative, or random-event input.'],
        previewRecords > 0,
      ),
      previewRecords,
    },
    fanFavorite: designationStatusArea(
      moraleReport?.designationPrerequisites.fanFavorite.status === 'deferred' ? 'deferred' : 'blocked',
      ['Fan Favorite prerequisites require canonical True Value, fan, morale, and relationship systems.'],
    ),
    albatross: designationStatusArea('blocked', [
      'Albatross prerequisites require canonical True Value and value-delta inputs.',
    ]),
    captain: designationStatusArea('deferred', [
      'Captain prerequisites depend on leadership, morale, relationship, and historical rules that are deferred.',
    ]),
    fanHopeful: designationStatusArea('deferred', [
      'Fan Hopeful prerequisites depend on fan, morale, relationship, and True Value rules that are deferred.',
    ]),
  };
}

function personalityChemistryArea(
  moraleReport: FranchiseMoraleRelationshipTrustReport | undefined,
  scopeTrusted: boolean,
): FranchiseNarrativeEventEligibilityReport['personalityChemistryContext'] {
  const visibleContextRows = moraleReport?.playerRecords.filter((record) =>
    record.personality.trustedForIdentityContext || record.chemistry.trustedForIdentityContext,
  ).length ?? 0;
  if (!scopeTrusted) {
    return {
      ...area('blocked', [
        'Personality/chemistry context requires complete franchiseId, seasonId, and statsScopeId.',
      ]),
      visibleContextRows: 0,
    };
  }
  return {
    ...area(
      visibleContextRows > 0 ? 'eligible-context' : 'not-applicable',
      visibleContextRows > 0
        ? ['Visible personality/chemistry fields are eligible as read-only player identity context.']
        : ['No visible personality/chemistry context is available.'],
      ['Personality/chemistry context cannot drive morale, relationship, narrative, or random-event mutation in internal v1.'],
      visibleContextRows > 0,
    ),
    visibleContextRows,
  };
}

function hiddenFarmProspectArea(
  moraleReport: FranchiseMoraleRelationshipTrustReport | undefined,
): FranchiseNarrativeEventEligibilityReport['hiddenFarmProspectData'] {
  const hiddenSafeRows = moraleReport?.playerRecords.filter((record) => record.hiddenSafe).length ?? 0;
  const hiddenModifierRows = moraleReport?.playerRecords.filter((record) =>
    record.hiddenProspectPersonalityModifiers.present,
  ).length ?? 0;
  return {
    ...area(
      hiddenSafeRows > 0 || hiddenModifierRows > 0 ? 'blocked' : 'not-applicable',
      hiddenSafeRows > 0 || hiddenModifierRows > 0
        ? ['Unrevealed FARM/prospect hidden data is blocked from narrative/random-event eligibility.']
        : ['No unrevealed FARM/prospect hidden data was provided.'],
      ['True ratings, true grade, hidden scout truth, and hidden personality modifiers must not be event inputs before reveal.'],
    ),
    hiddenSafeRows,
    hiddenModifierRows,
    hiddenDataExposed: false,
  };
}

function moraleRelationshipStateArea(): FranchiseNarrativeEventEligibilityArea {
  return area('blocked', [
    'Morale and relationship state changes are blocked until canonical Franchise morale/relationship rules exist.',
  ]);
}

function playoffChampionArea(analytics: FranchiseAnalyticsTrustReport, scopeTrusted: boolean): FranchiseNarrativeEventEligibilityArea {
  if (!scopeTrusted) {
    return area('blocked', [
      'Playoff/champion context requires complete franchiseId, seasonId, and statsScopeId.',
    ]);
  }
  if (analytics.playoffBoundary.status === 'trusted') {
    return area('eligible-context', [
      'Stored playoff/stat boundary context is eligible as read-only summary context.',
    ], [
      'Champion ceremonies, awards, and narrative/event persistence are not created by this gate.',
    ], true);
  }
  return area('preview-only', [
    'Playoff/champion context is incomplete or requires additional boundary verification.',
  ], [
    'Champion narratives and random events remain blocked.',
  ]);
}

function downstreamConsumers(hasReadOnlyFacts: boolean): FranchiseNarrativeEventConsumerEligibility {
  return {
    readOnlySummaries: area(
      hasReadOnlyFacts ? 'eligible-context' : 'not-applicable',
      hasReadOnlyFacts
        ? ['Stable scoped facts may be used as read-only summary context.']
        : ['No stable scoped facts are available for read-only summary context.'],
      ['Read-only summaries must not create or persist narrative/random-event records.'],
      hasReadOnlyFacts,
    ),
    narrativeGeneration: area('blocked', [
      'Narrative generation is blocked until canonical Franchise narrative rules exist.',
    ]),
    randomEventGeneration: area('blocked', [
      'Random event generation is blocked until canonical Franchise random-event rules exist.',
    ]),
    storyPersistence: area('blocked', [
      'Narrative/event record persistence is blocked in internal v1.',
    ]),
    moraleMutation: area('blocked', [
      'Morale mutation is blocked and cannot be triggered by narrative eligibility.',
    ]),
    relationshipMutation: area('blocked', [
      'Relationship mutation is blocked and cannot be triggered by narrative eligibility.',
    ]),
    mode3OffseasonExecution: area('deferred', [
      'Mode 3/offseason execution is deferred and cannot be triggered by narrative eligibility.',
    ]),
  };
}

export function buildFranchiseNarrativeEventEligibilityReport(
  input: BuildFranchiseNarrativeEventEligibilityInput,
): FranchiseNarrativeEventEligibilityReport {
  const analytics = input.analyticsTrustReport;
  const scope = scopeArea(input);
  const scopeTrusted = scope.status === 'eligible-context';
  const gameTrackerArchiveBackedGames = archiveGamesArea(analytics, scopeTrusted);
  const scoreOnlyCompletedGames = scoreOnlyArea(analytics, scopeTrusted);
  const rosterMovementTransactions = rosterMovementArea(input.moraleRelationshipTrustReport, scopeTrusted);
  const playerLocalProfileEdits = playerLocalProfileEditArea(input.moraleRelationshipTrustReport, scopeTrusted);
  const salaryBaseline = salaryBaselineArea(input.salaryLifecycleReport, input.moraleRelationshipTrustReport, scopeTrusted);
  const salaryMovement = salaryMovementArea();
  const trueValueAndValueDelta = trueValueArea(input.valueInputReport);
  const designation = designationPrerequisites(input.designationEligibilityReport, input.moraleRelationshipTrustReport, scopeTrusted);
  const personalityChemistryContext = personalityChemistryArea(input.moraleRelationshipTrustReport, scopeTrusted);
  const hiddenFarmProspectData = hiddenFarmProspectArea(input.moraleRelationshipTrustReport);
  const moraleRelationshipState = moraleRelationshipStateArea();
  const playoffChampionContext = playoffChampionArea(analytics, scopeTrusted);
  const hasReadOnlyFacts = [
    gameTrackerArchiveBackedGames,
    scoreOnlyCompletedGames,
    rosterMovementTransactions,
    playerLocalProfileEdits,
    salaryBaseline,
    designation.teamMvpAcePreview,
    personalityChemistryContext,
    playoffChampionContext,
  ].some((record) => record.eligibleForReadOnlySummaryContext);
  const downstreamConsumersRecord = downstreamConsumers(hasReadOnlyFacts);

  return {
    contractVersion: FRANCHISE_NARRATIVE_EVENT_ELIGIBILITY_CONTRACT_VERSION,
    franchiseId: analytics.franchiseId,
    seasonId: analytics.seasonId,
    statsScopeId: analytics.statsScopeId,
    seasonNumber: analytics.seasonNumber,
    generatedAt: Date.now(),
    sourceContracts: {
      analyticsTrust: analytics.contractVersion,
      valueInputs: input.valueInputReport?.contractVersion,
      salaryLifecycle: input.salaryLifecycleReport?.contractVersion,
      designationEligibility: input.designationEligibilityReport?.contractVersion,
      moraleRelationshipTrust: input.moraleRelationshipTrustReport?.contractVersion,
    },
    scope,
    gameTrackerArchiveBackedGames,
    scoreOnlyCompletedGames,
    rosterMovementTransactions,
    playerLocalProfileEdits,
    salaryBaseline,
    salaryMovement,
    trueValueAndValueDelta,
    designationPrerequisites: designation,
    personalityChemistryContext,
    hiddenFarmProspectData,
    moraleRelationshipState,
    playoffChampionContext,
    downstreamConsumers: downstreamConsumersRecord,
    anyNarrativeGenerationAllowed: false,
    anyRandomEventGenerationAllowed: false,
    anyMutable: false,
    anyPersistable: false,
    hiddenSafe: !hiddenFarmProspectData.hiddenDataExposed,
    limitations: unique([
      'Narrative/random-event eligibility gate only; it does not generate narratives, generate random events, mutate state, or persist story/event records.',
      ...analytics.limitations,
      ...(input.valueInputReport?.limitations ?? []),
      ...(input.salaryLifecycleReport?.limitations ?? []),
      ...(input.designationEligibilityReport?.limitations ?? []),
      ...(input.moraleRelationshipTrustReport?.limitations ?? []),
      ...scope.limitations,
      ...gameTrackerArchiveBackedGames.limitations,
      ...scoreOnlyCompletedGames.limitations,
      ...rosterMovementTransactions.limitations,
      ...playerLocalProfileEdits.limitations,
      ...salaryBaseline.limitations,
      ...salaryMovement.limitations,
      ...trueValueAndValueDelta.limitations,
      ...Object.values(designation).flatMap((record) => record.limitations),
      ...personalityChemistryContext.limitations,
      ...hiddenFarmProspectData.limitations,
      ...moraleRelationshipState.limitations,
      ...playoffChampionContext.limitations,
      ...Object.values(downstreamConsumersRecord).flatMap((record) => record.limitations),
    ]),
  };
}
