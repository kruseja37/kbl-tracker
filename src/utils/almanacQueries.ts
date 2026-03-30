import type { CompletedGameRecord } from './gameStorage';
import { getAllCompletedGames } from './gameStorage';
import type { AtBatEvent } from './eventLog';
import { getGameEvents } from './eventLog';
import { getAllCanonicalPlayers } from './almanacStorage';

export interface ExhibitionGameFilters {
  teamId?: string;
  opponentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export type ExhibitionBattingLeaderStat =
  | 'ba'
  | 'hr'
  | 'rbi'
  | 'h'
  | 'r'
  | 'doubles'
  | 'triples'
  | 'sb'
  | 'bb';

export type ExhibitionPitchingLeaderStat =
  | 'era'
  | 'w'
  | 'sv'
  | 'so'
  | 'ip'
  | 'cg'
  | 'sho';

export interface ExhibitionLeaderEntry {
  leagueId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  canonicalId: string;
  value: number;
}

export interface BattingLine {
  G: number;
  AB: number;
  H: number;
  R: number;
  '2B': number;
  '3B': number;
  HR: number;
  RBI: number;
  SB: number;
  BB: number;
  SO: number;
  BA: number;
}

export interface PitchingLine {
  G: number;
  IP: string;
  H: number;
  R: number;
  ER: number;
  BB: number;
  SO: number;
  CG: number;
  SHO: number;
  SV: number;
  W: number;
  L: number;
  ERA: number;
}

interface BattingAggregate {
  leagueId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  lastSeenDate: number;
  games: Set<string>;
  pa: number;
  ab: number;
  h: number;
  r: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  sb: number;
  bb: number;
  so: number;
}

interface PitchingAggregate {
  leagueId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  lastSeenDate: number;
  games: Set<string>;
  outsRecorded: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;
  strikeouts: number;
  wins: number;
  losses: number;
  saves: number;
  completeGames: number;
  shutouts: number;
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function battingAverage(hits: number, atBats: number): number {
  return atBats > 0 ? roundTo(hits / atBats, 3) : 0;
}

function earnedRunAverage(earnedRuns: number, outsRecorded: number): number {
  return outsRecorded > 0 ? roundTo((earnedRuns / (outsRecorded / 3)) * 9, 2) : 0;
}

function outsToDisplay(outsRecorded: number): string {
  const innings = Math.floor(outsRecorded / 3);
  const remainder = outsRecorded % 3;
  return `${innings}.${remainder}`;
}

function outsToDisplayNumber(outsRecorded: number): number {
  const innings = Math.floor(outsRecorded / 3);
  const remainder = outsRecorded % 3;
  return innings + remainder / 10;
}

function parseDateBoundary(value?: string, endOfDay: boolean = false): number | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (endOfDay) {
      parsed.setHours(23, 59, 59, 999);
    } else {
      parsed.setHours(0, 0, 0, 0);
    }
  }

  return parsed.getTime();
}

function getLeagueId(game: CompletedGameRecord): string | null {
  return game.leagueId ?? game.competitionId ?? null;
}

function isExhibitionGame(game: CompletedGameRecord): boolean {
  return game.competitionType === 'exhibition' || (!game.competitionType && Boolean(game.leagueId ?? game.competitionId));
}

async function getCanonicalIdLookup(): Promise<Map<string, string>> {
  const lookup = new Map<string, string>();
  const canonicalPlayers = await getAllCanonicalPlayers();

  for (const player of canonicalPlayers) {
    for (const instance of player.instances) {
      lookup.set(instance.playerIdInInstance, player.canonicalId);
    }
  }

  return lookup;
}

function buildTeamGameCounts(games: CompletedGameRecord[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const game of games) {
    const leagueId = getLeagueId(game);
    if (!leagueId) {
      continue;
    }

    const awayKey = `${leagueId}::${game.awayTeamId}`;
    const homeKey = `${leagueId}::${game.homeTeamId}`;

    counts.set(awayKey, (counts.get(awayKey) ?? 0) + 1);
    counts.set(homeKey, (counts.get(homeKey) ?? 0) + 1);
  }

  return counts;
}

function findTeamName(
  games: CompletedGameRecord[],
  leagueId: string,
  teamId: string
): string {
  const matchingGame = games.find(
    (game) =>
      getLeagueId(game) === leagueId &&
      (game.awayTeamId === teamId || game.homeTeamId === teamId)
  );

  if (!matchingGame) {
    return teamId;
  }

  return matchingGame.awayTeamId === teamId ? matchingGame.awayTeamName : matchingGame.homeTeamName;
}

function didPitchCompleteGame(
  game: CompletedGameRecord,
  pitcher: CompletedGameRecord['pitcherGameStats'][number]
): boolean {
  if (!pitcher.isStarter) {
    return false;
  }

  const teamOutsRecorded = game.pitcherGameStats
    .filter((stats) => stats.teamId === pitcher.teamId)
    .reduce((sum, stats) => sum + stats.outsRecorded, 0);

  return teamOutsRecorded > 0 && pitcher.outsRecorded === teamOutsRecorded;
}

function didPitchShutout(
  game: CompletedGameRecord,
  pitcher: CompletedGameRecord['pitcherGameStats'][number]
): boolean {
  if (!didPitchCompleteGame(game, pitcher)) {
    return false;
  }

  const opponentRuns = pitcher.teamId === game.awayTeamId
    ? game.finalScore.home
    : game.finalScore.away;

  return opponentRuns === 0;
}

export async function getExhibitionGames(
  filters: ExhibitionGameFilters = {}
): Promise<CompletedGameRecord[]> {
  const allGames = await getAllCompletedGames();
  const fromTs = parseDateBoundary(filters.dateFrom);
  const toTs = parseDateBoundary(filters.dateTo, true);

  const exhibitionGames = allGames
    .filter(isExhibitionGame)
    .filter((game) => {
      if (fromTs !== null && game.date < fromTs) {
        return false;
      }

      if (toTs !== null && game.date > toTs) {
        return false;
      }

      const involvesTeam = !filters.teamId ||
        game.awayTeamId === filters.teamId ||
        game.homeTeamId === filters.teamId;
      if (!involvesTeam) {
        return false;
      }

      if (!filters.opponentId) {
        return true;
      }

      if (filters.teamId) {
        const matchupIds = new Set([game.awayTeamId, game.homeTeamId]);
        return matchupIds.has(filters.teamId) && matchupIds.has(filters.opponentId);
      }

      return game.awayTeamId === filters.opponentId || game.homeTeamId === filters.opponentId;
    })
    .sort((a, b) => b.date - a.date);

  console.log('[Almanac] Exhibition games found:', exhibitionGames.length, exhibitionGames.map((game) => ({
    gameId: game.gameId,
    leagueId: getLeagueId(game),
    competitionType: game.competitionType ?? null,
  })));

  return exhibitionGames;
}

export async function getExhibitionBattingLeaders(
  stat: ExhibitionBattingLeaderStat,
  qualified: boolean,
  limit: number
): Promise<ExhibitionLeaderEntry[]> {
  const games = await getExhibitionGames();
  const canonicalIds = await getCanonicalIdLookup();
  const teamGameCounts = buildTeamGameCounts(games);
  const aggregates = new Map<string, BattingAggregate>();

  for (const game of games) {
    const leagueId = getLeagueId(game);
    if (!leagueId) {
      continue;
    }

    for (const [playerId, stats] of Object.entries(game.playerStats)) {
      const key = `${leagueId}::${playerId}`;
      const aggregate = aggregates.get(key) ?? {
        leagueId,
        playerId,
        playerName: stats.playerName,
        teamId: stats.teamId,
        lastSeenDate: game.date,
        games: new Set<string>(),
        pa: 0,
        ab: 0,
        h: 0,
        r: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        rbi: 0,
        sb: 0,
        bb: 0,
        so: 0,
      };

      if (game.date >= aggregate.lastSeenDate) {
        aggregate.playerName = stats.playerName;
        aggregate.teamId = stats.teamId;
        aggregate.lastSeenDate = game.date;
      }

      aggregate.games.add(game.gameId);
      aggregate.pa += stats.pa;
      aggregate.ab += stats.ab;
      aggregate.h += stats.h;
      aggregate.r += stats.r;
      aggregate.doubles += stats.doubles;
      aggregate.triples += stats.triples;
      aggregate.hr += stats.hr;
      aggregate.rbi += stats.rbi;
      aggregate.sb += stats.sb;
      aggregate.bb += stats.bb;
      aggregate.so += stats.k;

      aggregates.set(key, aggregate);
    }
  }

  const isRateStat = stat === 'ba';

  const leaders = Array.from(aggregates.values())
    .filter((aggregate) => {
      if (!qualified || !isRateStat) {
        return true;
      }

      const teamGames = teamGameCounts.get(`${aggregate.leagueId}::${aggregate.teamId}`) ?? 0;
      return aggregate.pa >= 2 * teamGames;
    })
    .map<ExhibitionLeaderEntry>((aggregate) => {
      const valueMap: Record<ExhibitionBattingLeaderStat, number> = {
        ba: battingAverage(aggregate.h, aggregate.ab),
        hr: aggregate.hr,
        rbi: aggregate.rbi,
        h: aggregate.h,
        r: aggregate.r,
        doubles: aggregate.doubles,
        triples: aggregate.triples,
        sb: aggregate.sb,
        bb: aggregate.bb,
      };

      return {
        leagueId: aggregate.leagueId,
        playerId: aggregate.playerId,
        playerName: aggregate.playerName,
        teamId: aggregate.teamId,
        teamName: findTeamName(games, aggregate.leagueId, aggregate.teamId),
        canonicalId: canonicalIds.get(aggregate.playerId) ?? aggregate.playerId,
        value: valueMap[stat],
      };
    })
    .sort((a, b) => b.value - a.value || a.playerName.localeCompare(b.playerName));

  return leaders.slice(0, limit);
}

export async function getExhibitionPitchingLeaders(
  stat: ExhibitionPitchingLeaderStat,
  qualified: boolean,
  limit: number
): Promise<ExhibitionLeaderEntry[]> {
  const games = await getExhibitionGames();
  const canonicalIds = await getCanonicalIdLookup();
  const teamGameCounts = buildTeamGameCounts(games);
  const aggregates = new Map<string, PitchingAggregate>();

  for (const game of games) {
    const leagueId = getLeagueId(game);
    if (!leagueId) {
      continue;
    }

    for (const pitcher of game.pitcherGameStats) {
      const key = `${leagueId}::${pitcher.pitcherId}`;
      const aggregate = aggregates.get(key) ?? {
        leagueId,
        playerId: pitcher.pitcherId,
        playerName: pitcher.pitcherName,
        teamId: pitcher.teamId,
        lastSeenDate: game.date,
        games: new Set<string>(),
        outsRecorded: 0,
        hitsAllowed: 0,
        runsAllowed: 0,
        earnedRuns: 0,
        walksAllowed: 0,
        strikeouts: 0,
        wins: 0,
        losses: 0,
        saves: 0,
        completeGames: 0,
        shutouts: 0,
      };

      if (game.date >= aggregate.lastSeenDate) {
        aggregate.playerName = pitcher.pitcherName;
        aggregate.teamId = pitcher.teamId;
        aggregate.lastSeenDate = game.date;
      }

      aggregate.games.add(game.gameId);
      aggregate.outsRecorded += pitcher.outsRecorded;
      aggregate.hitsAllowed += pitcher.hitsAllowed;
      aggregate.runsAllowed += pitcher.runsAllowed;
      aggregate.earnedRuns += pitcher.earnedRuns;
      aggregate.walksAllowed += pitcher.walksAllowed;
      aggregate.strikeouts += pitcher.strikeoutsThrown;
      aggregate.wins += pitcher.decision === 'W' ? 1 : 0;
      aggregate.losses += pitcher.decision === 'L' ? 1 : 0;
      aggregate.saves += pitcher.save ? 1 : 0;
      aggregate.completeGames += didPitchCompleteGame(game, pitcher) ? 1 : 0;
      aggregate.shutouts += didPitchShutout(game, pitcher) ? 1 : 0;

      aggregates.set(key, aggregate);
    }
  }

  const isRateStat = stat === 'era';

  const leaders = Array.from(aggregates.values())
    .filter((aggregate) => {
      if (!qualified || !isRateStat) {
        return true;
      }

      const teamGames = teamGameCounts.get(`${aggregate.leagueId}::${aggregate.teamId}`) ?? 0;
      return aggregate.outsRecorded / 3 >= 0.8 * teamGames;
    })
    .map<ExhibitionLeaderEntry>((aggregate) => {
      const valueMap: Record<ExhibitionPitchingLeaderStat, number> = {
        era: earnedRunAverage(aggregate.earnedRuns, aggregate.outsRecorded),
        w: aggregate.wins,
        sv: aggregate.saves,
        so: aggregate.strikeouts,
        ip: outsToDisplayNumber(aggregate.outsRecorded),
        cg: aggregate.completeGames,
        sho: aggregate.shutouts,
      };

      return {
        leagueId: aggregate.leagueId,
        playerId: aggregate.playerId,
        playerName: aggregate.playerName,
        teamId: aggregate.teamId,
        teamName: findTeamName(games, aggregate.leagueId, aggregate.teamId),
        canonicalId: canonicalIds.get(aggregate.playerId) ?? aggregate.playerId,
        value: valueMap[stat],
      };
    })
    .sort((a, b) => {
      if (stat === 'era') {
        return a.value - b.value || a.playerName.localeCompare(b.playerName);
      }

      return b.value - a.value || a.playerName.localeCompare(b.playerName);
    });

  return leaders.slice(0, limit);
}

export async function getPlayerExhibitionStats(
  playerId: string,
  leagueId: string
): Promise<{ batting: BattingLine | null; pitching: PitchingLine | null }> {
  const games = await getExhibitionGames();
  console.log('[Almanac] Loading exhibition stats for player:', {
    playerId,
    leagueId,
    totalGames: games.length,
  });

  const battingTotals = {
    games: new Set<string>(),
    ab: 0,
    h: 0,
    r: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 0,
    sb: 0,
    bb: 0,
    so: 0,
  };

  const pitchingTotals = {
    games: new Set<string>(),
    outsRecorded: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walksAllowed: 0,
    strikeouts: 0,
    completeGames: 0,
    shutouts: 0,
    saves: 0,
    wins: 0,
    losses: 0,
  };

  for (const game of games) {
    const gameLeagueId = getLeagueId(game);
    if (gameLeagueId !== leagueId) {
      continue;
    }

    const battingStats = game.playerStats[playerId];
    console.log('[Almanac] Checking exhibition game for player stats:', {
      gameId: game.gameId,
      gameLeagueId,
      playerId,
      hasBattingStats: Boolean(battingStats),
      battingKeys: battingStats ? undefined : Object.keys(game.playerStats),
      pitcherIds: game.pitcherGameStats.map((pitcher) => pitcher.pitcherId),
    });
    if (battingStats) {
      battingTotals.games.add(game.gameId);
      battingTotals.ab += battingStats.ab;
      battingTotals.h += battingStats.h;
      battingTotals.r += battingStats.r;
      battingTotals.doubles += battingStats.doubles;
      battingTotals.triples += battingStats.triples;
      battingTotals.hr += battingStats.hr;
      battingTotals.rbi += battingStats.rbi;
      battingTotals.sb += battingStats.sb;
      battingTotals.bb += battingStats.bb;
      battingTotals.so += battingStats.k;
    }

    const pitchingStats = game.pitcherGameStats.find((pitcher) => pitcher.pitcherId === playerId);
    if (pitchingStats) {
      pitchingTotals.games.add(game.gameId);
      pitchingTotals.outsRecorded += pitchingStats.outsRecorded;
      pitchingTotals.hitsAllowed += pitchingStats.hitsAllowed;
      pitchingTotals.runsAllowed += pitchingStats.runsAllowed;
      pitchingTotals.earnedRuns += pitchingStats.earnedRuns;
      pitchingTotals.walksAllowed += pitchingStats.walksAllowed;
      pitchingTotals.strikeouts += pitchingStats.strikeoutsThrown;
      pitchingTotals.completeGames += didPitchCompleteGame(game, pitchingStats) ? 1 : 0;
      pitchingTotals.shutouts += didPitchShutout(game, pitchingStats) ? 1 : 0;
      pitchingTotals.saves += pitchingStats.save ? 1 : 0;
      pitchingTotals.wins += pitchingStats.decision === 'W' ? 1 : 0;
      pitchingTotals.losses += pitchingStats.decision === 'L' ? 1 : 0;
    }
  }

  console.log('[Almanac] Exhibition stats totals:', {
    playerId,
    leagueId,
    battingGames: battingTotals.games.size,
    battingRbi: battingTotals.rbi,
    pitchingGames: pitchingTotals.games.size,
  });

  const batting = battingTotals.games.size > 0
    ? {
        G: battingTotals.games.size,
        AB: battingTotals.ab,
        H: battingTotals.h,
        R: battingTotals.r,
        '2B': battingTotals.doubles,
        '3B': battingTotals.triples,
        HR: battingTotals.hr,
        RBI: battingTotals.rbi,
        SB: battingTotals.sb,
        BB: battingTotals.bb,
        SO: battingTotals.so,
        BA: battingAverage(battingTotals.h, battingTotals.ab),
      }
    : null;

  const pitching = pitchingTotals.games.size > 0
    ? {
        G: pitchingTotals.games.size,
        IP: outsToDisplay(pitchingTotals.outsRecorded),
        H: pitchingTotals.hitsAllowed,
        R: pitchingTotals.runsAllowed,
        ER: pitchingTotals.earnedRuns,
        BB: pitchingTotals.walksAllowed,
        SO: pitchingTotals.strikeouts,
        CG: pitchingTotals.completeGames,
        SHO: pitchingTotals.shutouts,
        SV: pitchingTotals.saves,
        W: pitchingTotals.wins,
        L: pitchingTotals.losses,
        ERA: earnedRunAverage(pitchingTotals.earnedRuns, pitchingTotals.outsRecorded),
      }
    : null;

  return { batting, pitching };
}

export async function getTeamRosterFromGames(
  leagueId: string,
  teamId: string
): Promise<Array<{ playerId: string; playerName: string; canonicalId: string; games: number }>> {
  const games = await getExhibitionGames({ teamId });
  const canonicalIds = await getCanonicalIdLookup();
  const roster = new Map<string, { playerId: string; playerName: string; games: Set<string> }>();

  for (const game of games) {
    if (getLeagueId(game) !== leagueId) {
      continue;
    }

    for (const [playerId, stats] of Object.entries(game.playerStats)) {
      if (stats.teamId !== teamId) {
        continue;
      }

      const entry = roster.get(playerId) ?? {
        playerId,
        playerName: stats.playerName,
        games: new Set<string>(),
      };
      entry.playerName = stats.playerName;
      entry.games.add(game.gameId);
      roster.set(playerId, entry);
    }

    for (const pitcher of game.pitcherGameStats) {
      if (pitcher.teamId !== teamId) {
        continue;
      }

      const entry = roster.get(pitcher.pitcherId) ?? {
        playerId: pitcher.pitcherId,
        playerName: pitcher.pitcherName,
        games: new Set<string>(),
      };
      entry.playerName = pitcher.pitcherName;
      entry.games.add(game.gameId);
      roster.set(pitcher.pitcherId, entry);
    }
  }

  return Array.from(roster.values())
    .map((entry) => ({
      playerId: entry.playerId,
      playerName: entry.playerName,
      canonicalId: canonicalIds.get(entry.playerId) ?? entry.playerId,
      games: entry.games.size,
    }))
    .sort((a, b) => b.games - a.games || a.playerName.localeCompare(b.playerName));
}

export async function getGameAtBatEvents(gameId: string): Promise<AtBatEvent[]> {
  return getGameEvents(gameId);
}
