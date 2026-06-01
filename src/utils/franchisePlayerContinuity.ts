import type { CompletedGameRecord } from './gameStorage';
import type { Player } from './leagueBuilderStorage';
import type { FranchiseFarmRecord } from './franchiseFarmStorage';
import type { FranchisePlayerTeamStatStint } from './franchiseStatAttribution';
import type { ScheduledGame } from './scheduleStorage';
import type { TransactionLogEntry } from './transactionStorage';

export const FRANCHISE_PLAYER_CONTINUITY_VERSION = 'franchise-player-continuity-v1-readonly';

type RevealState = 'hidden' | 'revealed';

export interface FranchisePlayerContinuityInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId?: string;
  seasonNumber: number;
  player: Player;
  farmRecord?: FranchiseFarmRecord | null;
  teamId?: string;
  leagueId?: string;
  transactions?: TransactionLogEntry[];
  completedGames?: CompletedGameRecord[];
  scheduledGames?: ScheduledGame[];
  teamStints?: FranchisePlayerTeamStatStint[];
}

export interface FranchisePlayerContinuityProfileEdit {
  kind: 'profile-edit';
  source: 'player.editHistory';
  playerLocalOnly: true;
  officialTransaction: false;
  date?: string;
  field: string;
  oldValue: string;
  newValue: string;
  label: string;
}

export interface FranchisePlayerContinuityRosterEvent {
  kind: 'roster-transaction';
  source: 'transactionStorage';
  transactionId: string;
  transactionType: string;
  timestamp: string;
  phase: string;
  playerId: string;
  playerIds: string[];
  sourceTeamId?: string;
  targetTeamId?: string;
  teamId?: string;
  sourceRosterStatus?: string;
  targetRosterStatus?: string;
  scheduleGameId?: string;
  label: string;
}

export interface FranchisePlayerContinuityGameEvidence {
  kind: 'game-archive';
  source: 'completedGames';
  archiveBacked: true;
  playerStatsAvailable: true;
  gameId: string;
  gameLogId: string;
  scheduleGameId?: string;
  franchiseId?: string;
  seasonId?: string;
  statsScopeId?: string;
  competitionType?: string;
  competitionId?: string;
  playoffId?: string;
  playoffSeriesId?: string;
  playoffGameNumber?: number;
  date: number;
  teamId?: string;
  opponentTeamId?: string;
  awayTeamId: string;
  homeTeamId: string;
  label: string;
}

export interface FranchisePlayerContinuityScoreOnlyResult {
  kind: 'score-only-schedule';
  source: 'scheduledGames';
  archiveBacked: false;
  playerStatsAvailable: false;
  scheduleGameId: string;
  gameNumber: number;
  dayNumber: number;
  completedAt?: number;
  awayTeamId: string;
  homeTeamId: string;
  awayScore?: number;
  homeScore?: number;
  teamContextIds: string[];
  label: string;
}

export interface FranchisePlayerContinuityTeamStint {
  kind: 'team-stint';
  source: 'franchiseStatAttribution';
  stintId: string;
  franchiseId: string;
  seasonId?: string;
  statsScopeId?: string;
  competitionType: string;
  playerId: string;
  playerName: string;
  teamId: string;
  gameIds: string[];
  games: number;
  firstGameDate?: number;
  lastGameDate?: number;
  label: string;
}

export interface FranchisePlayerContinuityReport {
  contractVersion: typeof FRANCHISE_PLAYER_CONTINUITY_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  playerId: string;
  currentTeamId?: string;
  currentRosterStatus: string;
  revealState: RevealState;
  hiddenSafe: boolean;
  profileEdits: FranchisePlayerContinuityProfileEdit[];
  rosterTransactions: FranchisePlayerContinuityRosterEvent[];
  gameEvidence: FranchisePlayerContinuityGameEvidence[];
  scoreOnlyResults: FranchisePlayerContinuityScoreOnlyResult[];
  teamStints: FranchisePlayerContinuityTeamStint[];
  knownTeamIds: string[];
  limitations: string[];
}

interface ProspectProfileCarrier {
  prospectProfile?: {
    trueGrade?: unknown;
    trueRatings?: unknown;
    hiddenScoutTruth?: unknown;
    hiddenRatingFields?: unknown;
    [key: string]: unknown;
  };
  hiddenPersonalityModifiers?: unknown;
}

const HIDDEN_SAFE_EDIT_HISTORY_FIELDS = new Set<string>([
  'firstName',
  'lastName',
  'nickname',
  'age',
  'bats',
  'throws',
  'primaryPosition',
  'secondaryPosition',
  'trait1',
  'trait2',
  'personality',
  'chemistry',
]);

const SENSITIVE_EDIT_HISTORY_FIELDS = new Set<string>([
  'power',
  'contact',
  'speed',
  'fielding',
  'arm',
  'velocity',
  'junk',
  'accuracy',
  'arsenal',
  'overallGrade',
  'trueGrade',
  'trueRatings',
  'hiddenPersonalityModifiers',
  'hiddenScoutTruth',
  'hiddenRatingFields',
  'prospectProfile',
  'scoutedGrade',
  'potentialGrade',
  'scoutConfidence',
  'salary',
  'contractYears',
  'leagueAssignments',
  'ratingRevealState',
  'ratingRevealedAt',
]);

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function formatHistoryValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) return value.map(formatHistoryValue).join(', ');
  if (typeof value === 'object') return '[redacted]';
  return String(value);
}

function playerName(player: Player): string {
  return `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() || player.id;
}

function assignmentForPlayer(player: Player, teamId?: string, leagueId?: string) {
  const assignments = player.leagueAssignments ?? [];
  return (
    assignments.find((assignment) =>
      (!teamId || assignment.teamId === teamId) &&
      (!leagueId || assignment.leagueId === leagueId),
    ) ??
    assignments.find((assignment) => !teamId || assignment.teamId === teamId) ??
    assignments[0]
  );
}

function resolveRevealState(player: Player, rosterStatus: string, farmRecord?: FranchiseFarmRecord | null): RevealState {
  if (farmRecord?.ratingRevealState === 'revealed') return 'revealed';
  if (farmRecord?.ratingRevealState === 'hidden') return 'hidden';
  if (player.ratingRevealState === 'revealed') return 'revealed';
  if (player.ratingRevealState === 'hidden') return 'hidden';
  return rosterStatus === 'FARM' ? 'hidden' : 'revealed';
}

function transactionPlayerIds(transaction: TransactionLogEntry): string[] {
  const ids = new Set<string>();
  const direct = stringValue(transaction.data.playerId);
  if (direct) ids.add(direct);
  for (const key of ['playerIds', 'playersFromSource', 'playersFromTarget', 'playersFromTeam1', 'playersFromTeam2']) {
    for (const playerId of stringArray(transaction.data[key])) ids.add(playerId);
  }
  for (const key of ['sourcePlayers', 'targetPlayers']) {
    const records = transaction.data[key];
    if (Array.isArray(records)) {
      for (const record of records) {
        if (record && typeof record === 'object') {
          const playerId = stringValue((record as Record<string, unknown>).playerId);
          if (playerId) ids.add(playerId);
        }
      }
    }
  }
  return Array.from(ids);
}

function transactionMatchesPlayer(transaction: TransactionLogEntry, playerId: string): boolean {
  return transactionPlayerIds(transaction).includes(playerId);
}

function buildProfileEdits(player: Player, hiddenSafe: boolean): FranchisePlayerContinuityProfileEdit[] {
  return (player.editHistory ?? [])
    .filter((entry) => {
      if (!hiddenSafe) return true;
      return HIDDEN_SAFE_EDIT_HISTORY_FIELDS.has(entry.field) && !SENSITIVE_EDIT_HISTORY_FIELDS.has(entry.field);
    })
    .slice(-12)
    .reverse()
    .map((entry) => ({
      kind: 'profile-edit',
      source: 'player.editHistory',
      playerLocalOnly: true,
      officialTransaction: false,
      date: entry.date,
      field: entry.field,
      oldValue: formatHistoryValue(entry.oldValue),
      newValue: formatHistoryValue(entry.newValue),
      label: `${entry.field}: ${formatHistoryValue(entry.oldValue)} → ${formatHistoryValue(entry.newValue)}`,
    }));
}

function buildRosterTransactions(
  transactions: TransactionLogEntry[],
  playerId: string,
): FranchisePlayerContinuityRosterEvent[] {
  return transactions
    .filter((transaction) => !transaction.undone && transactionMatchesPlayer(transaction, playerId))
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .map((transaction) => {
      const sourceTeamId = stringValue(transaction.data.sourceTeamId);
      const targetTeamId = stringValue(transaction.data.targetTeamId);
      const teamId = stringValue(transaction.data.teamId);
      const sourceRosterStatus = stringValue(transaction.data.sourceRosterStatus);
      const targetRosterStatus = stringValue(transaction.data.targetRosterStatus);
      const teamMovement = sourceTeamId || targetTeamId
        ? `${sourceTeamId ?? 'UNKNOWN'} → ${targetTeamId ?? 'UNKNOWN'}`
        : teamId ?? 'team unavailable';
      return {
        kind: 'roster-transaction',
        source: 'transactionStorage',
        transactionId: transaction.id,
        transactionType: transaction.type,
        timestamp: transaction.timestamp,
        phase: transaction.phase,
        playerId,
        playerIds: transactionPlayerIds(transaction),
        sourceTeamId,
        targetTeamId,
        teamId,
        sourceRosterStatus,
        targetRosterStatus,
        scheduleGameId: transaction.scheduleGameId,
        label: `${transaction.type}: ${teamMovement}${targetRosterStatus ? ` (${targetRosterStatus})` : ''}`,
      };
    });
}

function gameTeamForPlayer(game: CompletedGameRecord, playerId: string): string | undefined {
  const battingTeam = game.playerStats?.[playerId]?.teamId;
  if (battingTeam) return battingTeam;
  const pitchingLine = (game.pitcherGameStats ?? []).find((line) => line.pitcherId === playerId);
  if (pitchingLine?.teamId) return pitchingLine.teamId;
  return undefined;
}

function buildGameEvidence(
  games: CompletedGameRecord[],
  playerId: string,
): FranchisePlayerContinuityGameEvidence[] {
  const evidence: FranchisePlayerContinuityGameEvidence[] = [];

  for (const game of games) {
    const teamId = gameTeamForPlayer(game, playerId);
    if (!teamId) continue;
    const opponentTeamId =
      teamId === game.awayTeamId ? game.homeTeamId :
      teamId === game.homeTeamId ? game.awayTeamId :
      undefined;
    evidence.push({
      kind: 'game-archive',
      source: 'completedGames',
      archiveBacked: true,
      playerStatsAvailable: true,
      gameId: game.gameId,
      gameLogId: game.gameId,
      scheduleGameId: game.scheduleGameId,
      franchiseId: game.franchiseId,
      seasonId: game.seasonId,
      statsScopeId: game.statsScopeId,
      competitionType: game.competitionType,
      competitionId: game.competitionId,
      playoffId: game.playoffId,
      playoffSeriesId: game.playoffSeriesId,
      playoffGameNumber: game.playoffGameNumber,
      date: game.date,
      teamId,
      opponentTeamId,
      awayTeamId: game.awayTeamId,
      homeTeamId: game.homeTeamId,
      label: `Archive-backed ${game.competitionType ?? 'game'} ${game.gameId}${game.scheduleGameId ? ` from schedule ${game.scheduleGameId}` : ''}`,
    });
  }

  return evidence.sort((left, right) => right.date - left.date);
}

function buildTeamStints(
  stints: FranchisePlayerTeamStatStint[],
  playerId: string,
): FranchisePlayerContinuityTeamStint[] {
  return stints
    .filter((stint) => stint.playerId === playerId)
    .sort((left, right) => (right.lastGameDate ?? 0) - (left.lastGameDate ?? 0))
    .map((stint) => ({
      kind: 'team-stint',
      source: 'franchiseStatAttribution',
      stintId: stint.id,
      franchiseId: stint.franchiseId,
      seasonId: stint.seasonId,
      statsScopeId: stint.statsScopeId,
      competitionType: stint.competitionType,
      playerId: stint.playerId,
      playerName: stint.playerName,
      teamId: stint.teamId,
      gameIds: [...stint.gameIds],
      games: stint.games,
      firstGameDate: stint.firstGameDate,
      lastGameDate: stint.lastGameDate,
      label: `${stint.teamId}: ${stint.games} archive-backed game${stint.games === 1 ? '' : 's'}`,
    }));
}

function collectKnownTeamIds(params: {
  assignmentTeamId?: string;
  transactions: FranchisePlayerContinuityRosterEvent[];
  gameEvidence: FranchisePlayerContinuityGameEvidence[];
  teamStints: FranchisePlayerContinuityTeamStint[];
}): string[] {
  const ids = new Set<string>();
  if (params.assignmentTeamId) ids.add(params.assignmentTeamId);
  for (const transaction of params.transactions) {
    if (transaction.teamId) ids.add(transaction.teamId);
    if (transaction.sourceTeamId) ids.add(transaction.sourceTeamId);
    if (transaction.targetTeamId) ids.add(transaction.targetTeamId);
  }
  for (const game of params.gameEvidence) {
    if (game.teamId) ids.add(game.teamId);
  }
  for (const stint of params.teamStints) ids.add(stint.teamId);
  return Array.from(ids);
}

function buildScoreOnlyResults(
  games: ScheduledGame[],
  knownTeamIds: string[],
): FranchisePlayerContinuityScoreOnlyResult[] {
  const teamIds = new Set(knownTeamIds);
  return games
    .filter((game) =>
      game.status === 'COMPLETED' &&
      game.completionSource === 'score-only' &&
      Boolean(game.result) &&
      (teamIds.has(game.awayTeamId) || teamIds.has(game.homeTeamId)),
    )
    .sort((left, right) => (right.completedAt ?? 0) - (left.completedAt ?? 0))
    .map((game) => ({
      kind: 'score-only-schedule',
      source: 'scheduledGames',
      archiveBacked: false,
      playerStatsAvailable: false,
      scheduleGameId: game.id,
      gameNumber: game.gameNumber,
      dayNumber: game.dayNumber,
      completedAt: game.completedAt,
      awayTeamId: game.awayTeamId,
      homeTeamId: game.homeTeamId,
      awayScore: game.result?.awayScore,
      homeScore: game.result?.homeScore,
      teamContextIds: [game.awayTeamId, game.homeTeamId].filter((teamId) => teamIds.has(teamId)),
      label: `Score-only schedule game ${game.gameNumber}: team result only, no player archive or player stats.`,
    }));
}

function hiddenLimitations(player: Player & ProspectProfileCarrier, hiddenSafe: boolean): string[] {
  if (!hiddenSafe) return [];
  const limitations = [
    'Unrevealed FARM continuity is hidden-safe: true ratings, true grade, hidden personality modifiers, hidden scout truth, and raw hidden rating fields are not exposed.',
  ];
  if (
    player.prospectProfile?.trueGrade ||
    player.prospectProfile?.trueRatings ||
    player.prospectProfile?.hiddenScoutTruth ||
    player.prospectProfile?.hiddenRatingFields ||
    player.hiddenPersonalityModifiers
  ) {
    limitations.push('Sensitive prospect fields were present on the player record and were omitted from continuity output.');
  }
  return limitations;
}

export function buildFranchisePlayerContinuity(
  input: FranchisePlayerContinuityInput,
): FranchisePlayerContinuityReport {
  const assignment = assignmentForPlayer(input.player, input.teamId, input.leagueId);
  const currentRosterStatus = String(assignment?.rosterStatus ?? 'UNKNOWN');
  const currentTeamId = assignment?.teamId ?? input.teamId;
  const revealState = resolveRevealState(input.player, currentRosterStatus, input.farmRecord);
  const hiddenSafe = currentRosterStatus === 'FARM' && revealState !== 'revealed';
  const profileEdits = buildProfileEdits(input.player, hiddenSafe);
  const rosterTransactions = buildRosterTransactions(input.transactions ?? [], input.player.id);
  const gameEvidence = buildGameEvidence(input.completedGames ?? [], input.player.id);
  const teamStints = buildTeamStints(input.teamStints ?? [], input.player.id);
  const knownTeamIds = collectKnownTeamIds({
    assignmentTeamId: currentTeamId,
    transactions: rosterTransactions,
    gameEvidence,
    teamStints,
  });
  const scoreOnlyResults = buildScoreOnlyResults(input.scheduledGames ?? [], knownTeamIds);

  return {
    contractVersion: FRANCHISE_PLAYER_CONTINUITY_VERSION,
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    statsScopeId: input.statsScopeId ?? input.seasonId,
    seasonNumber: input.seasonNumber,
    playerId: input.player.id,
    currentTeamId,
    currentRosterStatus,
    revealState,
    hiddenSafe,
    profileEdits,
    rosterTransactions,
    gameEvidence,
    scoreOnlyResults,
    teamStints,
    knownTeamIds,
    limitations: [
      'Read-only playerId continuity projection; it does not create transactions, merge histories, or mutate franchise records.',
      'Player-local profile edits remain separate from official roster transaction history.',
      ...hiddenLimitations(input.player as Player & ProspectProfileCarrier, hiddenSafe),
      ...(gameEvidence.length === 0 ? [`No archive-backed GameTracker evidence found for ${playerName(input.player)} in the provided inputs.`] : []),
    ],
  };
}
