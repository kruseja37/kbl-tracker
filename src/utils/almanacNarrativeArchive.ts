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

function toReporterGameMode(competitionType?: CompetitionType): ReporterGameMode {
  if (competitionType === "franchise") {
    return "franchise";
  }

  if (competitionType === "elimination" || competitionType === "playoff") {
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
    entry.gameMode ?? toReporterGameMode(game?.competitionType);

  return {
    id: `tidbit:${entry.id}`,
    kind: "historical-tidbit",
    gameId: entry.gameId,
    gameMode: resolvedMode,
    timestamp: game?.date ?? entry.timestamp,
    leagueId: entry.leagueId ?? game?.leagueId,
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
