import type { ReporterGameMode } from "../types/reporter";
import type { CommentaryFeedEntryRecord, GameStory } from "../types/reporter";
import { listAllCommentaryFeedEntries } from "./commentaryFeedStorage";
import { getAllCompletedGames, type CompletedGameRecord, type CompetitionType } from "./gameStorage";
import { listAllGameStories } from "./gameStoriesStorage";

export type AlmanacNarrativeKind = "historical-tidbit" | "post-game-story";

export interface AlmanacNarrativeArchiveEntry {
  id: string;
  kind: AlmanacNarrativeKind;
  gameId: string;
  gameMode: ReporterGameMode;
  timestamp: number;
  leagueId?: string;
  franchiseId?: string;
  seasonId?: string;
  seasonNumber?: number;
  statsScopeId?: string;
  competitionType?: CompetitionType;
  competitionId?: string;
  playoffId?: string;
  playoffSeriesId?: string;
  playoffGameNumber?: number;
  eliminationId?: string;
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
  game: CompletedGameRecord | undefined,
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
  game: CompletedGameRecord | undefined,
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
    archiveEntries.push(storyToArchiveEntry(story, gamesById.get(story.gameId)));
  }

  for (const commentaryEntry of commentaryEntries) {
    const archiveEntry = tidbitToArchiveEntry(
      commentaryEntry,
      gamesById.get(commentaryEntry.gameId),
    );

    if (archiveEntry) {
      archiveEntries.push(archiveEntry);
    }
  }

  return archiveEntries
    .filter((entry) => (filters.kind && filters.kind !== "all" ? entry.kind === filters.kind : true))
    .filter((entry) =>
      filters.gameMode && filters.gameMode !== "all"
        ? entry.gameMode === filters.gameMode
        : true,
    )
    .sort((left, right) => right.timestamp - left.timestamp);
}
