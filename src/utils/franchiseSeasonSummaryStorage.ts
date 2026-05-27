import {
  getFranchiseSeasonId,
  getFranchiseSeasonHandoffKey,
  type FranchiseSeasonHandoff,
  buildFranchiseSeasonHandoff,
} from './franchisePersistenceContract';
import {
  getAllGamesByFranchise,
  type ScheduledGame,
} from './scheduleStorage';
import {
  getRecentGames,
  type CompletedGameRecord,
} from './gameStorage';
import {
  calculateStandings,
  getAllFieldingStats,
  getSeasonBattingStats,
  getSeasonMetadata,
  getSeasonPitchingStats,
  type PlayerSeasonBatting,
  type PlayerSeasonFielding,
  type PlayerSeasonPitching,
  type SeasonMetadata,
  type TeamStanding,
} from './seasonStorage';
import {
  getPlayoff,
  getPlayoffByFranchiseSeason,
  getPlayoffStats,
  type PlayoffConfig,
  type PlayoffPlayerStats,
} from './playoffStorage';
import { getOffseasonState } from './offseasonStorage';
import { getTrackerDb } from './trackerDb';
import { syncEngine } from './syncEngine';

const STORE_NAME = 'franchiseSeasonSummaries';

export interface FranchiseSeasonSummaryPlaceholder {
  status: 'placeholder';
  reason: string;
}

export interface FranchiseSeasonSummaryScheduleGame {
  id: string;
  gameNumber: number;
  dayNumber: number;
  awayTeamId: string;
  homeTeamId: string;
  status: ScheduledGame['status'];
  result?: ScheduledGame['result'];
  gameLogId?: string;
  completedAt?: number;
}

export interface FranchiseSeasonSummaryCompletedGame {
  gameId: string;
  date: number;
  seasonId?: string;
  statsScopeId?: string;
  franchiseId?: string;
  scheduleGameId?: string;
  competitionType?: CompletedGameRecord['competitionType'];
  competitionId?: string;
  playoffId?: string;
  playoffSeriesId?: string;
  playoffGameNumber?: number;
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName: string;
  homeTeamName: string;
  finalScore: CompletedGameRecord['finalScore'];
  innings: number;
  totalInnings?: number;
  stadiumName?: string | null;
}

export interface FranchiseSeasonSummary {
  id: string;
  franchiseId: string;
  seasonNumber: number;
  seasonId: string;
  statsScopeId: string;
  createdAt: number;
  updatedAt: number;
  handoff: FranchiseSeasonHandoff;
  seasonMetadata: SeasonMetadata | null;
  schedule: {
    franchiseId: string;
    seasonNumber: number;
    totalGames: number;
    gameIds: string[];
    completedGameIds: string[];
    skippedGameIds: string[];
    games: FranchiseSeasonSummaryScheduleGame[];
  };
  completedGames: {
    query: {
      franchiseId: string;
      seasonId: string;
    };
    gameIds: string[];
    games: FranchiseSeasonSummaryCompletedGame[];
  };
  standings: {
    generatedAt: number;
    teams: TeamStanding[];
  };
  seasonStats: {
    batting: PlayerSeasonBatting[];
    pitching: PlayerSeasonPitching[];
    fielding: PlayerSeasonFielding[];
  };
  playoffs: {
    playoffId?: string;
    status: 'none' | 'present';
    config?: PlayoffConfig;
    playerStats?: PlayoffPlayerStats[];
  };
  offseasonStateId: string;
  awards: FranchiseSeasonSummaryPlaceholder;
  milestones: FranchiseSeasonSummaryPlaceholder;
  fanMorale: FranchiseSeasonSummaryPlaceholder;
  narrative: FranchiseSeasonSummaryPlaceholder;
  parkFactors: FranchiseSeasonSummaryPlaceholder;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function placeholder(reason: string): FranchiseSeasonSummaryPlaceholder {
  return { status: 'placeholder', reason };
}

function toScheduleSnapshot(game: ScheduledGame): FranchiseSeasonSummaryScheduleGame {
  return {
    id: game.id,
    gameNumber: game.gameNumber,
    dayNumber: game.dayNumber,
    awayTeamId: game.awayTeamId,
    homeTeamId: game.homeTeamId,
    status: game.status,
    result: game.result ? deepClone(game.result) : undefined,
    gameLogId: game.gameLogId,
    completedAt: game.completedAt,
  };
}

function toCompletedGameSnapshot(game: CompletedGameRecord): FranchiseSeasonSummaryCompletedGame {
  return {
    gameId: game.gameId,
    date: game.date,
    seasonId: game.seasonId,
    statsScopeId: game.statsScopeId,
    franchiseId: game.franchiseId,
    scheduleGameId: game.scheduleGameId,
    competitionType: game.competitionType,
    competitionId: game.competitionId,
    playoffId: game.playoffId,
    playoffSeriesId: game.playoffSeriesId,
    playoffGameNumber: game.playoffGameNumber,
    awayTeamId: game.awayTeamId,
    homeTeamId: game.homeTeamId,
    awayTeamName: game.awayTeamName,
    homeTeamName: game.homeTeamName,
    finalScore: deepClone(game.finalScore),
    innings: game.innings,
    totalInnings: game.totalInnings,
    stadiumName: game.stadiumName,
  };
}

async function resolvePlayoff(
  franchiseId: string,
  seasonNumber: number,
  playoffId?: string,
): Promise<PlayoffConfig | null> {
  if (playoffId) {
    const playoff = await getPlayoff(playoffId);
    const expectedSeasonId = getFranchiseSeasonId(franchiseId, seasonNumber);
    if (!playoff) {
      return null;
    }
    if (playoff.franchiseId !== franchiseId) {
      console.warn('[FranchiseSeasonSummary] Ignoring playoff from a different franchise:', playoffId);
      return null;
    }
    if (playoff.seasonId && playoff.seasonId !== expectedSeasonId) {
      console.warn('[FranchiseSeasonSummary] Ignoring playoff from a different seasonId:', playoffId);
      return null;
    }
    if (playoff.seasonNumber !== undefined && playoff.seasonNumber !== seasonNumber) {
      console.warn('[FranchiseSeasonSummary] Ignoring playoff from a different seasonNumber:', playoffId);
      return null;
    }
    return playoff;
  }
  return getPlayoffByFranchiseSeason({
    franchiseId,
    seasonNumber,
    seasonId: getFranchiseSeasonId(franchiseId, seasonNumber),
  });
}

export async function buildFranchiseSeasonSummary(params: {
  franchiseId: string;
  seasonNumber: number;
  playoffId?: string;
}): Promise<FranchiseSeasonSummary> {
  const seasonId = getFranchiseSeasonId(params.franchiseId, params.seasonNumber);
  const [
    scheduleGames,
    completedGames,
    standings,
    batting,
    pitching,
    fielding,
    seasonMetadata,
    playoff,
    offseasonState,
  ] = await Promise.all([
    getAllGamesByFranchise(params.franchiseId, params.seasonNumber),
    getRecentGames(1000, { franchiseId: params.franchiseId, seasonId }),
    calculateStandings(seasonId),
    getSeasonBattingStats(seasonId),
    getSeasonPitchingStats(seasonId),
    getAllFieldingStats(seasonId),
    getSeasonMetadata(seasonId),
    resolvePlayoff(params.franchiseId, params.seasonNumber, params.playoffId),
    getOffseasonState(seasonId).catch(() => null),
  ]);

  const playoffStats = playoff ? await getPlayoffStats(playoff.id) : undefined;
  const handoff = buildFranchiseSeasonHandoff({
    franchiseId: params.franchiseId,
    seasonNumber: params.seasonNumber,
    playoffId: playoff?.id,
  });
  const now = Date.now();
  const completedScheduleIds = scheduleGames
    .filter((game) => game.status === 'COMPLETED')
    .map((game) => game.id);
  const skippedScheduleIds = scheduleGames
    .filter((game) => game.status === 'SKIPPED')
    .map((game) => game.id);

  return {
    id: seasonId,
    franchiseId: params.franchiseId,
    seasonNumber: params.seasonNumber,
    seasonId,
    statsScopeId: seasonId,
    createdAt: now,
    updatedAt: now,
    handoff,
    seasonMetadata: seasonMetadata ? deepClone(seasonMetadata) : null,
    schedule: {
      franchiseId: params.franchiseId,
      seasonNumber: params.seasonNumber,
      totalGames: scheduleGames.length,
      gameIds: scheduleGames.map((game) => game.id),
      completedGameIds: completedScheduleIds,
      skippedGameIds: skippedScheduleIds,
      games: scheduleGames.map(toScheduleSnapshot),
    },
    completedGames: {
      query: {
        franchiseId: params.franchiseId,
        seasonId,
      },
      gameIds: completedGames.map((game) => game.gameId),
      games: completedGames.map(toCompletedGameSnapshot),
    },
    standings: {
      generatedAt: now,
      teams: deepClone(standings),
    },
    seasonStats: {
      batting: deepClone(batting),
      pitching: deepClone(pitching),
      fielding: deepClone(fielding),
    },
    playoffs: playoff
      ? {
          playoffId: playoff.id,
          status: 'present',
          config: deepClone(playoff),
          playerStats: deepClone(playoffStats ?? []),
        }
      : {
          status: 'none',
        },
    offseasonStateId: offseasonState?.id ?? handoff.offseasonStateId,
    awards: placeholder('Awards are not finalized in Mode 2 v1 persisted season summaries.'),
    milestones: placeholder('Milestone storage is not yet promoted into the franchise season summary payload.'),
    fanMorale: placeholder('Fan morale is not finalized in Mode 2 v1 and global prototype data is excluded from persisted summaries.'),
    narrative: placeholder('Narrative/news recaps are currently generated from completed games at display time.'),
    parkFactors: placeholder('Park-factor and adaptive-standard season summaries are not yet persisted by franchise season.'),
  };
}

export async function saveFranchiseSeasonSummary(
  summary: FranchiseSeasonSummary,
): Promise<FranchiseSeasonSummary> {
  const db = await getTrackerDb();
  const record = deepClone({
    ...summary,
    id: summary.seasonId,
    updatedAt: Date.now(),
  });

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) {
        syncEngine.upsert('kbl-tracker', STORE_NAME, record.seasonId, record);
      }
      resolve(deepClone(record));
    };
  });
}

export async function createFranchiseSeasonSummary(params: {
  franchiseId: string;
  seasonNumber: number;
  playoffId?: string;
}): Promise<FranchiseSeasonSummary> {
  const summary = await buildFranchiseSeasonSummary(params);
  const saved = await saveFranchiseSeasonSummary(summary);
  const handoffKey = getFranchiseSeasonHandoffKey(params.franchiseId, params.seasonNumber);
  localStorage.setItem(handoffKey, JSON.stringify(saved.handoff));
  if (!syncEngine.isSuppressed()) {
    syncEngine.upsertLocal(handoffKey, saved.handoff);
  }
  return saved;
}

export async function getFranchiseSeasonSummary(
  seasonId: string,
): Promise<FranchiseSeasonSummary | null> {
  const db = await getTrackerDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(seasonId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve(request.result ? deepClone(request.result as FranchiseSeasonSummary) : null);
    };
  });
}

export async function getFranchiseSeasonSummaryByFranchise(
  franchiseId: string,
  seasonNumber: number,
): Promise<FranchiseSeasonSummary | null> {
  return getFranchiseSeasonSummary(getFranchiseSeasonId(franchiseId, seasonNumber));
}

export async function deleteFranchiseSeasonSummary(seasonId: string): Promise<void> {
  const db = await getTrackerDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(seasonId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) {
        syncEngine.remove('kbl-tracker', STORE_NAME, seasonId);
      }
      resolve();
    };
  });
}
