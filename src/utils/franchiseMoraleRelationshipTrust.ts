import type { CompletedGameRecord } from './gameStorage';
import type { Player } from './leagueBuilderStorage';
import type { FranchiseValueInputReport, FranchiseValueInputRow } from './franchiseValueInputs';
import type { ScheduledGame } from './scheduleStorage';
import type { TransactionLogEntry } from './transactionStorage';

export const FRANCHISE_MORALE_RELATIONSHIP_TRUST_CONTRACT_VERSION =
  'franchise-morale-relationship-trust-v1-readonly';

export type FranchiseMoraleRelationshipTrustStatus =
  | 'trusted'
  | 'preview-only'
  | 'blocked'
  | 'deferred'
  | 'not-applicable';

export interface FranchiseMoraleRelationshipTrustArea {
  status: FranchiseMoraleRelationshipTrustStatus;
  reasons: string[];
  limitations: string[];
}

export interface FranchisePlayerMoraleRelationshipTrustRecord {
  contractVersion: typeof FRANCHISE_MORALE_RELATIONSHIP_TRUST_CONTRACT_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  playerId: string;
  playerName: string;
  teamId: string | null;
  rosterStatus: string | null;
  revealState: 'hidden' | 'revealed' | 'unknown';
  hiddenSafe: boolean;
  personality: FranchiseMoraleRelationshipTrustArea & {
    visibleValue: string | null;
    trustedForIdentityContext: boolean;
    trustedForMoraleMutation: false;
    trustedForRelationshipMutation: false;
  };
  chemistry: FranchiseMoraleRelationshipTrustArea & {
    visibleValue: string | null;
    trustedForIdentityContext: boolean;
    trustedForMoraleMutation: false;
    trustedForRelationshipMutation: false;
  };
  hiddenProspectPersonalityModifiers: FranchiseMoraleRelationshipTrustArea & {
    present: boolean;
    exposed: false;
    trustedForMoraleMutation: false;
    trustedForRelationshipMutation: false;
  };
  playerLocalEditHistory: FranchiseMoraleRelationshipTrustArea & {
    entries: number;
    playerLocalOnly: true;
    officialTransactionHistory: false;
    trustedForMoraleMutation: false;
    trustedForRelationshipMutation: false;
  };
  moraleChanges: FranchiseMoraleRelationshipTrustArea & {
    mutable: false;
    persistable: false;
  };
  relationshipChanges: FranchiseMoraleRelationshipTrustArea & {
    mutable: false;
    persistable: false;
  };
  limitations: string[];
}

export interface FranchiseRosterMovementMoraleContext extends FranchiseMoraleRelationshipTrustArea {
  scopedRows: number;
  callUps: number;
  sendDowns: number;
  trades: number;
  contextOnly: true;
  trustedForRelationshipMutation: false;
  trustedForMoraleMutation: false;
}

export interface FranchiseScoreOnlyMoraleContext extends FranchiseMoraleRelationshipTrustArea {
  scopedRows: number;
  trustedForScheduleAndStandings: boolean;
  trustedForPlayerMorale: false;
  trustedForRelationships: false;
  trustedForNarrativeEvents: false;
}

export interface FranchiseArchiveGameMoraleContext extends FranchiseMoraleRelationshipTrustArea {
  scopedRows: number;
  archiveBacked: boolean;
  trustedForStableGameFacts: boolean;
  trustedForPlayerMorale: false;
  trustedForRelationships: false;
  trustedForNarrativeEvents: false;
}

export interface FranchiseSalaryMoraleContext {
  baseline: FranchiseMoraleRelationshipTrustArea & {
    playerRowsWithBaseline: number;
    trustedForReadOnlyContext: boolean;
    trustedForMoraleMutation: false;
    trustedForRelationshipMutation: false;
  };
  movement: FranchiseMoraleRelationshipTrustArea & {
    active: false;
    trustedForMoraleMutation: false;
    trustedForRelationshipMutation: false;
  };
}

export interface FranchiseMoraleDesignationPrerequisiteTrust {
  fanFavorite: FranchiseMoraleRelationshipTrustArea & { persistable: false };
  captain: FranchiseMoraleRelationshipTrustArea & { persistable: false };
  fanHopeful: FranchiseMoraleRelationshipTrustArea & { persistable: false };
  albatross: FranchiseMoraleRelationshipTrustArea & { persistable: false };
  cornerstone: FranchiseMoraleRelationshipTrustArea & { persistable: false };
}

export interface FranchiseMoraleRelationshipConsumerTrust {
  moraleChanges: FranchiseMoraleRelationshipTrustArea & { mutable: false; persistable: false };
  relationshipChanges: FranchiseMoraleRelationshipTrustArea & { mutable: false; persistable: false };
  narrativeRandomEvents: FranchiseMoraleRelationshipTrustArea & { active: false; mutable: false };
  mode3Offseason: FranchiseMoraleRelationshipTrustArea & { active: false };
}

export interface FranchiseMoraleRelationshipTrustReport {
  contractVersion: typeof FRANCHISE_MORALE_RELATIONSHIP_TRUST_CONTRACT_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  generatedAt: number;
  valueInputContractVersion: FranchiseValueInputReport['contractVersion'];
  scope: FranchiseMoraleRelationshipTrustArea;
  playerRecords: FranchisePlayerMoraleRelationshipTrustRecord[];
  rosterMovementHistory: FranchiseRosterMovementMoraleContext;
  scoreOnlyResults: FranchiseScoreOnlyMoraleContext;
  gameTrackerArchives: FranchiseArchiveGameMoraleContext;
  salary: FranchiseSalaryMoraleContext;
  designationPrerequisites: FranchiseMoraleDesignationPrerequisiteTrust;
  downstreamConsumers: FranchiseMoraleRelationshipConsumerTrust;
  anyMutable: false;
  anyPersistable: false;
  hiddenSafe: boolean;
  limitations: string[];
}

export interface BuildFranchiseMoraleRelationshipTrustInput {
  valueInputReport: FranchiseValueInputReport;
  players?: Player[];
  transactions?: TransactionLogEntry[];
  completedGames?: CompletedGameRecord[];
  scheduledGames?: ScheduledGame[];
}

interface HiddenProspectCarrier {
  hiddenPersonalityModifiers?: unknown;
  ratingRevealState?: unknown;
}

function area(
  status: FranchiseMoraleRelationshipTrustStatus,
  reasons: string[],
  limitations: string[] = [],
): FranchiseMoraleRelationshipTrustArea {
  return { status, reasons: unique(reasons), limitations: unique(limitations) };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function playerName(player: Player | undefined, row: FranchiseValueInputRow): string {
  if (!player) return row.playerName;
  return `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() || row.playerName || row.playerId;
}

function playerById(players: Player[]): Map<string, Player> {
  return new Map(players.map((player) => [player.id, player]));
}

function hasRequiredScopeIdentity(record: {
  franchiseId?: string | null;
  seasonId?: string | null;
  statsScopeId?: string | null;
}, report: FranchiseValueInputReport): boolean {
  return (
    Boolean(report.franchiseId) &&
    Boolean(report.seasonId) &&
    Boolean(report.statsScopeId) &&
    record.franchiseId === report.franchiseId &&
    record.seasonId === report.seasonId &&
    record.statsScopeId === report.statsScopeId
  );
}

function scopeTrust(report: FranchiseValueInputReport): FranchiseMoraleRelationshipTrustArea {
  if (!report.franchiseId || !report.seasonId || !report.statsScopeId) {
    return area('blocked', [
      'franchiseId, seasonId, and statsScopeId are required before morale/relationship inputs can be classified.',
    ]);
  }
  return area('trusted', [
    'Franchise, season, and stats scope identity are present for read-only morale/relationship classification.',
  ], [
    'Trusted scope identity does not permit morale or relationship mutation in internal v1.',
  ]);
}

function revealState(row: FranchiseValueInputRow, player?: Player): 'hidden' | 'revealed' | 'unknown' {
  if (player?.ratingRevealState === 'hidden' || player?.ratingRevealState === 'revealed') {
    return player.ratingRevealState;
  }
  if (row.rosterStatus === 'FARM') return 'hidden';
  if (row.rosterStatus === 'MLB') return 'revealed';
  return 'unknown';
}

function identityArea(
  label: 'personality' | 'chemistry',
  value: unknown,
  scopeTrusted: boolean,
): FranchisePlayerMoraleRelationshipTrustRecord['personality'] {
  const visibleValue = nonEmptyString(value) ? value : null;
  if (!scopeTrusted) {
    return {
      ...area('blocked', [
        `Visible ${label} field cannot be trusted because franchise, season, and stats scope identity are incomplete.`,
      ], [
        `Visible ${label} context is not a morale or relationship mutation rule in internal v1.`,
      ]),
      visibleValue,
      trustedForIdentityContext: false,
      trustedForMoraleMutation: false,
      trustedForRelationshipMutation: false,
    };
  }

  return {
    ...area(
      visibleValue ? 'trusted' : 'not-applicable',
      visibleValue
        ? [`Visible ${label} field is available as stable read-only identity context.`]
        : [`No visible ${label} field is available for this player.`],
      [`Visible ${label} context is not a morale or relationship mutation rule in internal v1.`],
    ),
    visibleValue,
    trustedForIdentityContext: Boolean(visibleValue),
    trustedForMoraleMutation: false,
    trustedForRelationshipMutation: false,
  };
}

function hiddenModifierArea(
  player: (Player & HiddenProspectCarrier) | undefined,
  hiddenSafe: boolean,
): FranchisePlayerMoraleRelationshipTrustRecord['hiddenProspectPersonalityModifiers'] {
  const present = Boolean(player?.hiddenPersonalityModifiers);
  if (hiddenSafe && present) {
    return {
      ...area('blocked', [
        'Hidden prospect personality modifiers are present but blocked from read-only morale/relationship output before reveal.',
      ], [
        'True/hidden prospect fields remain hidden-safe and cannot drive morale, relationships, or narrative events in internal v1.',
      ]),
      present,
      exposed: false,
      trustedForMoraleMutation: false,
      trustedForRelationshipMutation: false,
    };
  }

  return {
    ...area(
      present ? 'blocked' : 'not-applicable',
      present
        ? ['Hidden personality modifiers are stored but are not trusted morale/relationship inputs in internal v1.']
        : ['No hidden personality modifiers were provided for this player.'],
      ['Hidden modifiers are not exposed or consumed by this read-only trust contract.'],
    ),
    present,
    exposed: false,
    trustedForMoraleMutation: false,
    trustedForRelationshipMutation: false,
  };
}

function editHistoryArea(player: Player | undefined): FranchisePlayerMoraleRelationshipTrustRecord['playerLocalEditHistory'] {
  const entries = player?.editHistory?.length ?? 0;
  return {
    ...area(
      entries > 0 ? 'preview-only' : 'not-applicable',
      entries > 0
        ? ['Player-local profile edit history is available as audit context only.']
        : ['No player-local profile edit history is available.'],
      [
        'Profile edits are not official roster transactions and cannot drive morale or relationship mutation.',
      ],
    ),
    entries,
    playerLocalOnly: true,
    officialTransactionHistory: false,
    trustedForMoraleMutation: false,
    trustedForRelationshipMutation: false,
  };
}

function playerRecord(
  row: FranchiseValueInputRow,
  player: Player | undefined,
  scopeTrusted: boolean,
): FranchisePlayerMoraleRelationshipTrustRecord {
  const state = revealState(row, player);
  const hiddenSafe = row.rosterStatus === 'FARM' && state !== 'revealed';
  const personality = identityArea('personality', player?.personality, scopeTrusted);
  const chemistry = identityArea('chemistry', player?.chemistry, scopeTrusted);
  const hiddenProspectPersonalityModifiers = hiddenModifierArea(player as (Player & HiddenProspectCarrier) | undefined, hiddenSafe);
  const playerLocalEditHistory = editHistoryArea(player);
  const moraleChanges = {
    ...area('blocked', [
      'Morale changes are blocked because canonical morale rules are not implemented for Franchise internal v1.',
    ]),
    mutable: false as const,
    persistable: false as const,
  };
  const relationshipChanges = {
    ...area('blocked', [
      'Relationship changes are blocked because canonical relationship rules are not implemented for Franchise internal v1.',
    ]),
    mutable: false as const,
    persistable: false as const,
  };

  return {
    contractVersion: FRANCHISE_MORALE_RELATIONSHIP_TRUST_CONTRACT_VERSION,
    franchiseId: row.franchiseId,
    seasonId: row.seasonId,
    statsScopeId: row.statsScopeId,
    seasonNumber: row.seasonNumber,
    playerId: row.playerId,
    playerName: playerName(player, row),
    teamId: row.currentTeamId,
    rosterStatus: row.rosterStatus,
    revealState: state,
    hiddenSafe,
    personality,
    chemistry,
    hiddenProspectPersonalityModifiers,
    playerLocalEditHistory,
    moraleChanges,
    relationshipChanges,
    limitations: unique([
      ...row.limitations,
      ...(hiddenSafe
        ? ['Unrevealed FARM/prospect output is hidden-safe; true ratings, true grade, hidden scout truth, and hidden personality modifiers are not exposed.']
        : []),
      'Player identity/personality/chemistry may be read-only context only; this report does not mutate morale or relationships.',
    ]),
  };
}

function isRosterMovementType(type: string): boolean {
  return type === 'call_up' || type === 'send_down' || type === 'trade' || type === 'TRADE_EXECUTED';
}

function rosterMovementHistory(
  report: FranchiseValueInputReport,
  transactions: TransactionLogEntry[],
): FranchiseRosterMovementMoraleContext {
  const scoped = transactions.filter((transaction) =>
    !transaction.undone &&
    isRosterMovementType(transaction.type) &&
    hasRequiredScopeIdentity(transaction, report),
  );
  const callUps = scoped.filter((transaction) => transaction.type === 'call_up').length;
  const sendDowns = scoped.filter((transaction) => transaction.type === 'send_down').length;
  const trades = scoped.filter((transaction) => transaction.type === 'trade' || transaction.type === 'TRADE_EXECUTED').length;

  return {
    ...area(
      scoped.length > 0 ? 'preview-only' : 'not-applicable',
      scoped.length > 0
        ? ['Scoped call-up/send-down/trade rows are available as roster movement context only.']
        : ['No scoped roster movement rows were provided.'],
      ['Roster movement history does not mutate morale or relationships in internal v1.'],
    ),
    scopedRows: scoped.length,
    callUps,
    sendDowns,
    trades,
    contextOnly: true,
    trustedForRelationshipMutation: false,
    trustedForMoraleMutation: false,
  };
}

function scoreOnlyResults(
  report: FranchiseValueInputReport,
  scheduledGames: ScheduledGame[],
): FranchiseScoreOnlyMoraleContext {
  const rows = scheduledGames.filter((game) =>
    hasRequiredScopeIdentity(game, report) &&
    game.status === 'COMPLETED' &&
    game.completionSource === 'score-only' &&
    Boolean(game.result),
  );

  return {
    ...area(
      rows.length > 0 ? 'trusted' : 'not-applicable',
      rows.length > 0
        ? ['Score-only schedule rows are trusted for schedule result and standings context only.']
        : ['No scoped score-only schedule rows were provided.'],
      ['Score-only rows do not create player archives, player stats, morale inputs, relationship inputs, or narrative/random events.'],
    ),
    scopedRows: rows.length,
    trustedForScheduleAndStandings: rows.length > 0,
    trustedForPlayerMorale: false,
    trustedForRelationships: false,
    trustedForNarrativeEvents: false,
  };
}

function gameTrackerArchives(
  report: FranchiseValueInputReport,
  completedGames: CompletedGameRecord[],
): FranchiseArchiveGameMoraleContext {
  const rows = completedGames.filter((game) =>
    hasRequiredScopeIdentity(game, report) &&
    game.aggregationStatus !== 'incomplete',
  );

  return {
    ...area(
      rows.length > 0 ? 'preview-only' : 'not-applicable',
      rows.length > 0
        ? ['Scoped GameTracker archive-backed games are available as stable game-fact context.']
        : ['No scoped GameTracker archive-backed games were provided.'],
      ['Archive-backed games are not canonical morale, relationship, or narrative/random-event mutation inputs in internal v1.'],
    ),
    scopedRows: rows.length,
    archiveBacked: rows.length > 0,
    trustedForStableGameFacts: rows.length > 0,
    trustedForPlayerMorale: false,
    trustedForRelationships: false,
    trustedForNarrativeEvents: false,
  };
}

function salaryContext(report: FranchiseValueInputReport, scopeTrusted: boolean): FranchiseSalaryMoraleContext {
  const playerRowsWithBaseline = report.rows.filter((row) => row.salaryBaselineAvailable).length;
  if (!scopeTrusted) {
    return {
      baseline: {
        ...area('blocked', [
          'Stored salary baseline cannot be trusted because franchise, season, and stats scope identity are incomplete.',
        ], ['Salary baseline does not drive morale or relationship mutation in internal v1.']),
        playerRowsWithBaseline,
        trustedForReadOnlyContext: false,
        trustedForMoraleMutation: false,
        trustedForRelationshipMutation: false,
      },
      movement: {
        ...area('blocked', [
          'Salary movement is blocked because canonical True Value and salary lifecycle rules are unavailable in internal v1.',
        ]),
        active: false,
        trustedForMoraleMutation: false,
        trustedForRelationshipMutation: false,
      },
    };
  }

  return {
    baseline: {
      ...area(
        playerRowsWithBaseline > 0 ? 'trusted' : 'blocked',
        playerRowsWithBaseline > 0
          ? ['Stored salary baseline is available as read-only contract context.']
          : ['Stored salary baseline is missing for all provided player rows.'],
        ['Salary baseline does not drive morale or relationship mutation in internal v1.'],
      ),
      playerRowsWithBaseline,
      trustedForReadOnlyContext: playerRowsWithBaseline > 0,
      trustedForMoraleMutation: false,
      trustedForRelationshipMutation: false,
    },
    movement: {
      ...area('blocked', [
        'Salary movement is blocked because canonical True Value and salary lifecycle rules are unavailable in internal v1.',
      ]),
      active: false,
      trustedForMoraleMutation: false,
      trustedForRelationshipMutation: false,
    },
  };
}

function designationPrerequisites(): FranchiseMoraleDesignationPrerequisiteTrust {
  return {
    fanFavorite: {
      ...area('blocked', [
        'FAN_FAVORITE requires canonical True Value, fan, morale, and relationship inputs that are unavailable in internal v1.',
      ]),
      persistable: false,
    },
    captain: {
      ...area('deferred', [
        'CAPTAIN depends on leadership, morale, relationship, and historical context rules that are deferred for internal v1.',
      ]),
      persistable: false,
    },
    fanHopeful: {
      ...area('deferred', [
        'FAN_HOPEFUL depends on fan, morale, relationship, and True Value inputs that are deferred for internal v1.',
      ]),
      persistable: false,
    },
    albatross: {
      ...area('blocked', [
        'ALBATROSS depends on canonical True Value and value-delta inputs that are unavailable in internal v1.',
      ]),
      persistable: false,
    },
    cornerstone: {
      ...area('deferred', [
        'CORNERSTONE depends on future value, contract trajectory, morale, relationship, and Mode 3 inputs that are deferred for internal v1.',
      ]),
      persistable: false,
    },
  };
}

function downstreamConsumers(): FranchiseMoraleRelationshipConsumerTrust {
  return {
    moraleChanges: {
      ...area('blocked', [
        'Morale state changes are blocked until canonical Franchise morale rules exist.',
      ]),
      mutable: false,
      persistable: false,
    },
    relationshipChanges: {
      ...area('blocked', [
        'Relationship state changes are blocked until canonical Franchise relationship rules exist.',
      ]),
      mutable: false,
      persistable: false,
    },
    narrativeRandomEvents: {
      ...area('blocked', [
        'Narrative/random-event mutation is blocked; stable facts may be used only for read-only summaries.',
      ]),
      active: false,
      mutable: false,
    },
    mode3Offseason: {
      ...area('deferred', [
        'Mode 3/offseason morale and relationship execution is deferred for internal v1.',
      ]),
      active: false,
    },
  };
}

export function buildFranchiseMoraleRelationshipTrustReport(
  input: BuildFranchiseMoraleRelationshipTrustInput,
): FranchiseMoraleRelationshipTrustReport {
  const report = input.valueInputReport;
  const players = playerById(input.players ?? []);
  const scope = scopeTrust(report);
  const scopeTrusted = scope.status === 'trusted';
  const playerRecords = report.rows.map((row) => playerRecord(row, players.get(row.playerId), scopeTrusted));
  const rosterMovement = rosterMovementHistory(report, input.transactions ?? []);
  const scoreOnly = scoreOnlyResults(report, input.scheduledGames ?? []);
  const archives = gameTrackerArchives(report, input.completedGames ?? []);
  const salary = salaryContext(report, scopeTrusted);
  const designation = designationPrerequisites();
  const downstream = downstreamConsumers();

  return {
    contractVersion: FRANCHISE_MORALE_RELATIONSHIP_TRUST_CONTRACT_VERSION,
    franchiseId: report.franchiseId,
    seasonId: report.seasonId,
    statsScopeId: report.statsScopeId,
    seasonNumber: report.seasonNumber,
    generatedAt: Date.now(),
    valueInputContractVersion: report.contractVersion,
    scope,
    playerRecords,
    rosterMovementHistory: rosterMovement,
    scoreOnlyResults: scoreOnly,
    gameTrackerArchives: archives,
    salary,
    designationPrerequisites: designation,
    downstreamConsumers: downstream,
    anyMutable: false,
    anyPersistable: false,
    hiddenSafe: playerRecords.every((record) => !record.hiddenProspectPersonalityModifiers.exposed),
    limitations: unique([
      'Read-only morale/relationship trust contract only; it does not mutate morale, relationships, narratives, random events, salary, designations, or offseason state.',
      ...report.limitations,
      ...scope.limitations,
      ...playerRecords.flatMap((record) => record.limitations),
      ...rosterMovement.limitations,
      ...scoreOnly.limitations,
      ...archives.limitations,
      ...salary.baseline.limitations,
      ...salary.movement.limitations,
      ...Object.values(designation).flatMap((areaRecord) => areaRecord.limitations),
      ...Object.values(downstream).flatMap((areaRecord) => areaRecord.limitations),
    ]),
  };
}
