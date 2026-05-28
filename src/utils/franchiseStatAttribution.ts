import {
  getAllCompletedGames,
  type CompletedGameRecord,
  type CompetitionType,
} from './gameStorage';

export type FranchiseStatAttributionCompetition = Extract<
  CompetitionType,
  'franchise' | 'playoff'
>;

export interface FranchiseStatAttributionQuery {
  franchiseId: string;
  seasonId?: string;
  statsScopeId?: string;
  competitionType?: FranchiseStatAttributionCompetition;
}

export interface FranchisePlayerTeamStatStint {
  id: string;
  franchiseId: string;
  seasonId?: string;
  statsScopeId?: string;
  competitionType: FranchiseStatAttributionCompetition;
  playerId: string;
  playerName: string;
  teamId: string;
  gameIds: string[];
  games: number;
  firstGameDate?: number;
  lastGameDate?: number;
  batting: {
    games: number;
    pa: number;
    ab: number;
    hits: number;
    singles: number;
    doubles: number;
    triples: number;
    homeRuns: number;
    rbi: number;
    runs: number;
    walks: number;
    strikeouts: number;
    hitByPitch: number;
    sacFlies: number;
    sacBunts: number;
    stolenBases: number;
    caughtStealing: number;
    gidp: number;
  };
  pitching: {
    games: number;
    gamesStarted: number;
    outsRecorded: number;
    hitsAllowed: number;
    runsAllowed: number;
    earnedRuns: number;
    walksAllowed: number;
    strikeouts: number;
    homeRunsAllowed: number;
    hitBatters: number;
    wildPitches: number;
    wins: number;
    losses: number;
    saves: number;
    holds: number;
    blownSaves: number;
  };
  fielding: {
    games: number;
    putouts: number;
    assists: number;
    errors: number;
  };
}

interface MutableStint extends Omit<FranchisePlayerTeamStatStint, 'gameIds'> {
  gameIds: Set<string>;
}

function createEmptyBatting(): FranchisePlayerTeamStatStint['batting'] {
  return {
    games: 0,
    pa: 0,
    ab: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbi: 0,
    runs: 0,
    walks: 0,
    strikeouts: 0,
    hitByPitch: 0,
    sacFlies: 0,
    sacBunts: 0,
    stolenBases: 0,
    caughtStealing: 0,
    gidp: 0,
  };
}

function createEmptyPitching(): FranchisePlayerTeamStatStint['pitching'] {
  return {
    games: 0,
    gamesStarted: 0,
    outsRecorded: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walksAllowed: 0,
    strikeouts: 0,
    homeRunsAllowed: 0,
    hitBatters: 0,
    wildPitches: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    holds: 0,
    blownSaves: 0,
  };
}

function createEmptyFielding(): FranchisePlayerTeamStatStint['fielding'] {
  return {
    games: 0,
    putouts: 0,
    assists: 0,
    errors: 0,
  };
}

function normalizeCompetitionType(
  competitionType: CompetitionType | undefined,
): FranchiseStatAttributionCompetition | null {
  if (competitionType === 'franchise' || competitionType === 'playoff') {
    return competitionType;
  }
  return null;
}

function gameMatchesQuery(
  game: CompletedGameRecord,
  query: FranchiseStatAttributionQuery,
): game is CompletedGameRecord & {
  franchiseId: string;
  competitionType: FranchiseStatAttributionCompetition;
} {
  if (game.aggregationStatus === 'incomplete') return false;
  if (!game.franchiseId || game.franchiseId !== query.franchiseId) return false;
  if (query.seasonId && game.seasonId !== query.seasonId) return false;
  if (query.statsScopeId && game.statsScopeId !== query.statsScopeId) return false;

  const competitionType = normalizeCompetitionType(game.competitionType);
  if (!competitionType) return false;
  if ((query.competitionType ?? 'franchise') !== competitionType) return false;

  return true;
}

function getOrCreateStint(
  stints: Map<string, MutableStint>,
  game: CompletedGameRecord & {
    franchiseId: string;
    competitionType: FranchiseStatAttributionCompetition;
  },
  playerId: string,
  playerName: string,
  teamId: string,
): MutableStint {
  const id = [
    game.franchiseId,
    game.statsScopeId ?? game.seasonId ?? 'unscoped',
    game.competitionType,
    teamId,
    playerId,
  ].join('::');
  const existing = stints.get(id);
  if (existing) {
    existing.playerName = playerName || existing.playerName;
    existing.firstGameDate =
      existing.firstGameDate === undefined
        ? game.date
        : Math.min(existing.firstGameDate, game.date);
    existing.lastGameDate =
      existing.lastGameDate === undefined
        ? game.date
        : Math.max(existing.lastGameDate, game.date);
    return existing;
  }

  const created: MutableStint = {
    id,
    franchiseId: game.franchiseId,
    seasonId: game.seasonId,
    statsScopeId: game.statsScopeId,
    competitionType: game.competitionType,
    playerId,
    playerName: playerName || playerId,
    teamId,
    gameIds: new Set<string>(),
    games: 0,
    firstGameDate: game.date,
    lastGameDate: game.date,
    batting: createEmptyBatting(),
    pitching: createEmptyPitching(),
    fielding: createEmptyFielding(),
  };
  stints.set(id, created);
  return created;
}

function addGameToStint(stint: MutableStint, gameId: string): void {
  const previousSize = stint.gameIds.size;
  stint.gameIds.add(gameId);
  if (stint.gameIds.size !== previousSize) {
    stint.games += 1;
  }
}

export function buildFranchisePlayerTeamStatStints(
  games: CompletedGameRecord[],
  query: FranchiseStatAttributionQuery,
): FranchisePlayerTeamStatStint[] {
  const stints = new Map<string, MutableStint>();

  for (const game of games) {
    if (!gameMatchesQuery(game, query)) continue;

    for (const [playerId, stats] of Object.entries(game.playerStats)) {
      const stint = getOrCreateStint(
        stints,
        game,
        playerId,
        stats.playerName,
        stats.teamId,
      );
      addGameToStint(stint, game.gameId);
      stint.batting.games += 1;
      stint.batting.pa += stats.pa;
      stint.batting.ab += stats.ab;
      stint.batting.hits += stats.h;
      stint.batting.singles += stats.singles;
      stint.batting.doubles += stats.doubles;
      stint.batting.triples += stats.triples;
      stint.batting.homeRuns += stats.hr;
      stint.batting.rbi += stats.rbi;
      stint.batting.runs += stats.r;
      stint.batting.walks += stats.bb;
      stint.batting.strikeouts += stats.k;
      stint.batting.hitByPitch += stats.hbp ?? 0;
      stint.batting.sacFlies += stats.sf ?? 0;
      stint.batting.sacBunts += stats.sh ?? 0;
      stint.batting.stolenBases += stats.sb;
      stint.batting.caughtStealing += stats.cs;
      stint.batting.gidp += stats.gidp ?? 0;
      stint.fielding.games += 1;
      stint.fielding.putouts += stats.putouts;
      stint.fielding.assists += stats.assists;
      stint.fielding.errors += stats.fieldingErrors;
    }

    for (const stats of game.pitcherGameStats) {
      const stint = getOrCreateStint(
        stints,
        game,
        stats.pitcherId,
        stats.pitcherName,
        stats.teamId,
      );
      addGameToStint(stint, game.gameId);
      stint.pitching.games += 1;
      stint.pitching.gamesStarted += stats.isStarter ? 1 : 0;
      stint.pitching.outsRecorded += stats.outsRecorded;
      stint.pitching.hitsAllowed += stats.hitsAllowed;
      stint.pitching.runsAllowed += stats.runsAllowed;
      stint.pitching.earnedRuns += stats.earnedRuns;
      stint.pitching.walksAllowed += stats.walksAllowed;
      stint.pitching.strikeouts += stats.strikeoutsThrown;
      stint.pitching.homeRunsAllowed += stats.homeRunsAllowed;
      stint.pitching.hitBatters += stats.hitBatters;
      stint.pitching.wildPitches += stats.wildPitches;
      stint.pitching.wins += stats.decision === 'W' ? 1 : 0;
      stint.pitching.losses += stats.decision === 'L' ? 1 : 0;
      stint.pitching.saves += stats.save ? 1 : 0;
      stint.pitching.holds += stats.hold ? 1 : 0;
      stint.pitching.blownSaves += stats.blownSave ? 1 : 0;
    }
  }

  return [...stints.values()]
    .map((stint) => ({
      ...stint,
      gameIds: [...stint.gameIds].sort(),
      batting: { ...stint.batting },
      pitching: { ...stint.pitching },
      fielding: { ...stint.fielding },
    }))
    .sort((left, right) => {
      if (left.teamId !== right.teamId) return left.teamId.localeCompare(right.teamId);
      if (left.playerName !== right.playerName) return left.playerName.localeCompare(right.playerName);
      return left.playerId.localeCompare(right.playerId);
    });
}

export async function getFranchisePlayerTeamStatStints(
  query: FranchiseStatAttributionQuery,
): Promise<FranchisePlayerTeamStatStint[]> {
  const games = await getAllCompletedGames();
  return buildFranchisePlayerTeamStatStints(games, query);
}
