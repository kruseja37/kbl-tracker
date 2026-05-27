import type { ReporterGameMode } from "../types/reporter";
import type { CommentaryFeedEntryRecord, GameStory } from "../types/reporter";
import { listAllCommentaryFeedEntries } from "./commentaryFeedStorage";
import { getAllCompletedGames, type CompletedGameRecord, type CompetitionType } from "./gameStorage";
import { listAllGameStories } from "./gameStoriesStorage";
import {
  getTransactionsByFranchiseSeason,
  type TransactionLogEntry,
} from "./transactionStorage";

export type AlmanacNarrativeKind =
  | "historical-tidbit"
  | "post-game-story"
  | "transaction-history";

export interface AlmanacNarrativeArchiveEntry {
  id: string;
  kind: AlmanacNarrativeKind;
  gameId?: string;
  transactionId?: string;
  gameMode: ReporterGameMode;
  timestamp: number;
  leagueId?: string;
  franchiseId?: string;
  seasonId?: string;
  seasonNumber?: number;
  statsScopeId?: string;
  scheduleGameId?: string;
  competitionType?: CompetitionType;
  competitionId?: string;
  playoffId?: string;
  playoffSeriesId?: string;
  playoffGameNumber?: number;
  eliminationId?: string;
  playerIds?: string[];
  teamIds?: string[];
  awayTeamId?: string;
  awayTeamName?: string;
  homeTeamId?: string;
  homeTeamName?: string;
  reporterId?: string;
  reporterTeamId?: string;
  halfInningLabel?: string;
  headline: string;
  body: string;
  sourceLabel?: string;
  sourceUrl?: string;
  factId?: string;
}

export interface AlmanacNarrativeArchiveFilters {
  kind?: AlmanacNarrativeKind | "all";
  gameMode?: ReporterGameMode | "all";
  franchiseId?: string;
  seasonId?: string;
  statsScopeId?: string;
  playerId?: string;
  teamId?: string;
  includePlayoffs?: boolean;
}

function toReporterGameMode(
  competitionType?: CompetitionType,
  game?: CompletedGameRecord,
): ReporterGameMode {
  if (competitionType === "franchise") {
    return "franchise";
  }

  if (competitionType === "playoff") {
    return game?.franchiseId ? "franchise" : "elimination";
  }

  if (competitionType === "elimination") {
    return "elimination";
  }

  return "exhibition";
}

function buildGameLookup(
  completedGames: CompletedGameRecord[],
): Map<string, CompletedGameRecord> {
  return new Map(completedGames.map((game) => [game.gameId, game]));
}

function buildTidbitHeadline(halfInningLabel: string): string {
  return `${halfInningLabel} History Note`;
}

function storyToArchiveEntry(
  story: GameStory,
  game: CompletedGameRecord,
): AlmanacNarrativeArchiveEntry {
  return {
    id: `story:${story.id}`,
    kind: "post-game-story",
    gameId: story.gameId,
    gameMode: story.gameMode,
    timestamp: game?.date ?? story.createdAt,
    leagueId: story.leagueId ?? game?.leagueId,
    franchiseId: story.franchiseId ?? game?.franchiseId,
    seasonId: story.seasonId ?? game?.seasonId,
    seasonNumber: story.seasonNumber ?? game?.seasonNumber,
    statsScopeId: story.statsScopeId ?? game?.statsScopeId,
    competitionType: story.competitionType ?? game?.competitionType,
    competitionId: story.competitionId ?? game?.competitionId,
    playoffId: story.playoffId ?? game?.playoffId,
    playoffSeriesId: story.playoffSeriesId ?? game?.playoffSeriesId,
    playoffGameNumber: story.playoffGameNumber ?? game?.playoffGameNumber,
    eliminationId: story.eliminationId ?? (game?.competitionType === "elimination" ? game.competitionId : undefined),
    playerIds: story.playerIdsMentioned,
    teamIds: [story.teamId, story.opponentTeamId].filter(Boolean) as string[],
    awayTeamId: game?.awayTeamId,
    awayTeamName: game?.awayTeamName,
    homeTeamId: game?.homeTeamId,
    homeTeamName: game?.homeTeamName,
    reporterId: story.reporterId,
    reporterTeamId: story.teamId,
    headline: story.headline,
    body: story.body,
  };
}

function tidbitToArchiveEntry(
  entry: CommentaryFeedEntryRecord,
  game: CompletedGameRecord,
): AlmanacNarrativeArchiveEntry | null {
  if (!entry.historicalTidbit) {
    return null;
  }

  const resolvedMode =
    entry.gameMode ?? toReporterGameMode(game?.competitionType, game);

  return {
    id: `tidbit:${entry.id}`,
    kind: "historical-tidbit",
    gameId: entry.gameId,
    gameMode: resolvedMode,
    timestamp: game?.date ?? entry.timestamp,
    leagueId: entry.leagueId ?? game?.leagueId,
    franchiseId: entry.franchiseId ?? game?.franchiseId,
    seasonId: entry.seasonId ?? game?.seasonId,
    seasonNumber: entry.seasonNumber ?? game?.seasonNumber,
    statsScopeId: entry.statsScopeId ?? game?.statsScopeId,
    competitionType: entry.competitionType ?? game?.competitionType,
    competitionId: entry.competitionId ?? game?.competitionId,
    playoffId: entry.playoffId ?? game?.playoffId,
    playoffSeriesId: entry.playoffSeriesId ?? game?.playoffSeriesId,
    playoffGameNumber: entry.playoffGameNumber ?? game?.playoffGameNumber,
    eliminationId: entry.eliminationId ?? (game?.competitionType === "elimination" ? game.competitionId : undefined),
    teamIds: [game.awayTeamId, game.homeTeamId],
    awayTeamId: game?.awayTeamId,
    awayTeamName: game?.awayTeamName,
    homeTeamId: game?.homeTeamId,
    homeTeamName: game?.homeTeamName,
    reporterId: entry.reporterId,
    halfInningLabel: entry.halfInningLabel,
    headline: buildTidbitHeadline(entry.halfInningLabel),
    body: entry.historicalTidbit.text,
    sourceLabel: entry.historicalTidbit.sourceLabel,
    sourceUrl: entry.historicalTidbit.sourceUrl,
    factId: entry.historicalTidbit.factId,
  };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function collectTransactionPlayerIds(transaction: TransactionLogEntry): string[] {
  const ids = new Set<string>();
  const directPlayerId = stringValue(transaction.data.playerId);
  if (directPlayerId) ids.add(directPlayerId);
  for (const playerId of stringArray(transaction.data.playerIds)) {
    ids.add(playerId);
  }
  for (const key of ["sourcePlayers", "targetPlayers"]) {
    const players = transaction.data[key];
    if (!Array.isArray(players)) continue;
    for (const player of players) {
      if (player && typeof player === "object") {
        const playerId = stringValue((player as Record<string, unknown>).playerId);
        if (playerId) ids.add(playerId);
      }
    }
  }
  return Array.from(ids).sort();
}

function collectTransactionTeamIds(transaction: TransactionLogEntry): string[] {
  const ids = new Set<string>();
  for (const key of ["teamId", "sourceTeamId", "targetTeamId", "oldTeam", "newTeam", "retiredFromTeamId"]) {
    const teamId = stringValue(transaction.data[key]);
    if (teamId) ids.add(teamId);
  }
  return Array.from(ids).sort();
}

function transactionPlayerName(transaction: TransactionLogEntry): string {
  return stringValue(transaction.data.playerName) ?? "Player";
}

function titleCaseTransactionType(type: TransactionLogEntry["type"]): string {
  return String(type)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function transactionToArchiveEntry(
  transaction: TransactionLogEntry,
): AlmanacNarrativeArchiveEntry {
  const playerIds = collectTransactionPlayerIds(transaction);
  const teamIds = collectTransactionTeamIds(transaction);
  const headline = `${titleCaseTransactionType(transaction.type)} Logged`;
  const primaryPlayerName = transactionPlayerName(transaction);
  const sourceTeamId = stringValue(transaction.data.sourceTeamId);
  const targetTeamId = stringValue(transaction.data.targetTeamId);
  const teamId = stringValue(transaction.data.teamId);
  const rosterStatus = stringValue(transaction.data.targetRosterStatus);
  const reason = stringValue(transaction.data.reason);

  const movement =
    transaction.type === "trade" && sourceTeamId && targetTeamId
      ? `between ${sourceTeamId} and ${targetTeamId}`
      : targetTeamId && targetTeamId !== sourceTeamId
        ? `from ${sourceTeamId ?? "previous club"} to ${targetTeamId}`
        : teamId
          ? `with ${teamId}`
          : "in the franchise ledger";

  const bodyParts = [
    transaction.type === "trade"
      ? `Manual trade transaction ${transaction.id} moved player identity by playerId, not current team assignment.`
      : `${primaryPlayerName} was recorded as ${titleCaseTransactionType(transaction.type).toLowerCase()} ${movement}.`,
    rosterStatus ? `Roster status: ${rosterStatus}.` : undefined,
    reason ? `Reason: ${reason}.` : undefined,
    `This is transaction history derived from the durable Mode 2 v1 transaction log; it does not apply morale, chemistry, relationship, award, or random-event outcomes.`,
  ].filter(Boolean);

  return {
    id: `transaction:${transaction.id}`,
    kind: "transaction-history",
    transactionId: transaction.id,
    gameMode: "franchise",
    timestamp: Number.isFinite(Date.parse(transaction.timestamp))
      ? Date.parse(transaction.timestamp)
      : 0,
    franchiseId: transaction.franchiseId,
    seasonId: transaction.seasonId,
    seasonNumber: transaction.season,
    statsScopeId: transaction.statsScopeId,
    scheduleGameId: transaction.scheduleGameId,
    competitionType:
      transaction.phase === "PLAYOFFS" || transaction.phase === "CHAMPIONSHIP"
        ? "playoff"
        : "franchise",
    playerIds,
    teamIds,
    headline,
    body: bodyParts.join(" "),
  };
}

function completedGameAllowsEntry(
  game: CompletedGameRecord | undefined,
  filters: AlmanacNarrativeArchiveFilters,
): game is CompletedGameRecord {
  if (!game) return false;
  if (game.aggregationStatus === "incomplete") return false;
  if (filters.franchiseId && game.franchiseId !== filters.franchiseId) return false;
  if (filters.seasonId && game.seasonId !== filters.seasonId) return false;
  if (filters.statsScopeId && game.statsScopeId !== filters.statsScopeId) return false;
  if (filters.includePlayoffs === false && game.competitionType === "playoff") return false;
  return true;
}

function archiveEntryMatchesFilters(
  entry: AlmanacNarrativeArchiveEntry,
  filters: AlmanacNarrativeArchiveFilters,
): boolean {
  if (filters.kind && filters.kind !== "all" && entry.kind !== filters.kind) {
    return false;
  }
  if (filters.gameMode && filters.gameMode !== "all" && entry.gameMode !== filters.gameMode) {
    return false;
  }
  if (filters.franchiseId && entry.franchiseId !== filters.franchiseId) {
    return false;
  }
  if (filters.seasonId && entry.seasonId !== filters.seasonId) {
    return false;
  }
  if (filters.statsScopeId && entry.statsScopeId !== filters.statsScopeId) {
    return false;
  }
  if (filters.playerId && !entry.playerIds?.includes(filters.playerId)) {
    return false;
  }
  if (filters.teamId) {
    const teamIds = new Set([
      ...(entry.teamIds ?? []),
      entry.awayTeamId,
      entry.homeTeamId,
      entry.reporterTeamId,
    ].filter(Boolean) as string[]);
    if (!teamIds.has(filters.teamId)) return false;
  }
  if (filters.includePlayoffs === false && entry.competitionType === "playoff") {
    return false;
  }
  return true;
}

export async function listAlmanacNarrativeArchive(
  filters: AlmanacNarrativeArchiveFilters = {},
): Promise<AlmanacNarrativeArchiveEntry[]> {
  const [completedGames, stories, commentaryEntries] = await Promise.all([
    getAllCompletedGames(),
    listAllGameStories(),
    listAllCommentaryFeedEntries(),
  ]);

  const gamesById = buildGameLookup(completedGames);
  const archiveEntries: AlmanacNarrativeArchiveEntry[] = [];

  for (const story of stories) {
    const game = gamesById.get(story.gameId);
    if (completedGameAllowsEntry(game, filters)) {
      archiveEntries.push(storyToArchiveEntry(story, game));
    }
  }

  for (const commentaryEntry of commentaryEntries) {
    const game = gamesById.get(commentaryEntry.gameId);
    if (!completedGameAllowsEntry(game, filters)) {
      continue;
    }
    const archiveEntry = tidbitToArchiveEntry(
      commentaryEntry,
      game,
    );

    if (archiveEntry) {
      archiveEntries.push(archiveEntry);
    }
  }

  if (filters.franchiseId && filters.seasonId) {
    const transactions = await getTransactionsByFranchiseSeason(
      filters.franchiseId,
      filters.seasonId,
    );
    for (const transaction of transactions) {
      archiveEntries.push(transactionToArchiveEntry(transaction));
    }
  }

  return archiveEntries
    .filter((entry) => archiveEntryMatchesFilters(entry, filters))
    .sort((left, right) => right.timestamp - left.timestamp);
}
