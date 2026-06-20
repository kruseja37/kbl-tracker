import type {
  LsimInvariantCheck,
  LsimInvariantResult,
  LsimStateSnapshot,
} from './types';
import { invariantResult } from './types';

const TAG = 'CRITICAL' as const;

function nonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function findNonFinite(value: unknown, path = '$'): string | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? null : path;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const result = findNonFinite(value[index], `${path}[${index}]`);
      if (result) return result;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      const result = findNonFinite(entry, `${path}.${key}`);
      if (result) return result;
    }
  }
  return null;
}

function teamRecordsFromCompletedGames(snapshot: LsimStateSnapshot): Map<string, {
  wins: number;
  losses: number;
  runsScored: number;
  runsAllowed: number;
}> {
  const records = new Map<string, { wins: number; losses: number; runsScored: number; runsAllowed: number }>();
  const ensure = (teamId: string) => {
    const existing = records.get(teamId);
    if (existing) return existing;
    const created = { wins: 0, losses: 0, runsScored: 0, runsAllowed: 0 };
    records.set(teamId, created);
    return created;
  };

  for (const game of snapshot.completedGames) {
    const home = ensure(game.homeTeamId);
    const away = ensure(game.awayTeamId);
    home.runsScored += game.finalScore.home;
    home.runsAllowed += game.finalScore.away;
    away.runsScored += game.finalScore.away;
    away.runsAllowed += game.finalScore.home;
    if (game.finalScore.home > game.finalScore.away) {
      home.wins += 1;
      away.losses += 1;
    } else {
      away.wins += 1;
      home.losses += 1;
    }
  }

  return records;
}

function completedGameCount(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const pass = snapshot.completedGames.length === snapshot.gamesSimulated;
  return invariantResult(
    'stats.completed-games-count',
    TAG,
    pass,
    `completedGames=${snapshot.completedGames.length}; gamesSimulated=${snapshot.gamesSimulated}`,
  );
}

function teamGameConservation(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const teamGameTotal = Array.from(teamRecordsFromCompletedGames(snapshot).values())
    .reduce((sum, row) => sum + row.wins + row.losses, 0);
  const expected = snapshot.gamesSimulated * 2;
  return invariantResult(
    'stats.team-game-conservation',
    TAG,
    teamGameTotal === expected,
    `teamRecordGames=${teamGameTotal}; expected=${expected}`,
  );
}

function leagueWinsEqualLosses(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const totals = Array.from(teamRecordsFromCompletedGames(snapshot).values())
    .reduce((acc, row) => ({
      wins: acc.wins + row.wins,
      losses: acc.losses + row.losses,
    }), { wins: 0, losses: 0 });
  return invariantResult(
    'stats.league-wins-equal-losses',
    TAG,
    totals.wins === totals.losses && totals.wins === snapshot.gamesSimulated,
    `wins=${totals.wins}; losses=${totals.losses}; games=${snapshot.gamesSimulated}`,
  );
}

function leagueRunsConservation(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const totals = Array.from(teamRecordsFromCompletedGames(snapshot).values())
    .reduce((acc, row) => ({
      scored: acc.scored + row.runsScored,
      allowed: acc.allowed + row.runsAllowed,
    }), { scored: 0, allowed: 0 });
  return invariantResult(
    'stats.league-runs-scored-equal-allowed',
    TAG,
    totals.scored === totals.allowed,
    `runsScored=${totals.scored}; runsAllowed=${totals.allowed}`,
  );
}

function standingsMatchGames(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const expected = teamRecordsFromCompletedGames(snapshot);
  const mismatches = snapshot.standings
    .map((standing) => {
      const record = expected.get(standing.teamId);
      if (!record) return `${standing.teamId}: missing completed-game record`;
      const pass = standing.wins === record.wins &&
        standing.losses === record.losses &&
        standing.runsScored === record.runsScored &&
        standing.runsAllowed === record.runsAllowed;
      return pass
        ? null
        : `${standing.teamId}: standings ${standing.wins}-${standing.losses} ${standing.runsScored}/${standing.runsAllowed}, expected ${record.wins}-${record.losses} ${record.runsScored}/${record.runsAllowed}`;
    })
    .filter((entry): entry is string => Boolean(entry));
  return invariantResult(
    'stats.standings-match-completed-games',
    TAG,
    mismatches.length === 0,
    mismatches.length === 0 ? `standingsRows=${snapshot.standings.length}` : mismatches.join('; '),
  );
}

function battingRowsConsistent(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const badRows = snapshot.battingRows
    .filter((row) =>
      ![
        row.games,
        row.pa,
        row.ab,
        row.hits,
        row.singles,
        row.doubles,
        row.triples,
        row.homeRuns,
        row.rbi,
        row.runs,
        row.walks,
        row.strikeouts,
        row.hitByPitch,
        row.sacFlies,
        row.sacBunts,
      ].every(nonNegativeFinite) ||
      row.hits !== row.singles + row.doubles + row.triples + row.homeRuns ||
      row.hits > row.ab ||
      row.ab > row.pa,
    )
    .map((row) => row.playerId);
  return invariantResult(
    'stats.batting-row-arithmetic',
    TAG,
    badRows.length === 0,
    badRows.length === 0 ? `battingRows=${snapshot.battingRows.length}` : `badPlayerIds=${badRows.slice(0, 8).join(',')}`,
  );
}

function pitchingRowsConsistent(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const badRows = snapshot.pitchingRows
    .filter((row) =>
      ![
        row.games,
        row.gamesStarted,
        row.outsRecorded,
        row.hitsAllowed,
        row.runsAllowed,
        row.earnedRuns,
        row.walksAllowed,
        row.strikeouts,
        row.homeRunsAllowed,
        row.wins,
        row.losses,
        row.saves,
        row.holds,
        row.blownSaves,
      ].every(nonNegativeFinite) ||
      row.earnedRuns > row.runsAllowed ||
      row.gamesStarted > row.games,
    )
    .map((row) => row.playerId);
  return invariantResult(
    'stats.pitching-row-arithmetic',
    TAG,
    badRows.length === 0,
    badRows.length === 0 ? `pitchingRows=${snapshot.pitchingRows.length}` : `badPlayerIds=${badRows.slice(0, 8).join(',')}`,
  );
}

function fieldingRowsConsistent(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const badRows = snapshot.fieldingRows
    .filter((row) =>
      ![
        row.games,
        row.putouts,
        row.assists,
        row.errors,
        row.doublePlays,
      ].every(nonNegativeFinite),
    )
    .map((row) => row.playerId);
  return invariantResult(
    'stats.fielding-row-arithmetic',
    TAG,
    badRows.length === 0,
    badRows.length === 0 ? `fieldingRows=${snapshot.fieldingRows.length}` : `badPlayerIds=${badRows.slice(0, 8).join(',')}`,
  );
}

function warFieldsFinite(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const badBatting = snapshot.battingRows.filter((row) =>
    [row.bwar, row.rwar, row.fwar, row.totalWar].some((value) => value !== undefined && !Number.isFinite(value)),
  );
  const badPitching = snapshot.pitchingRows.filter((row) =>
    [row.pwar, row.pitchingWpa].some((value) => value !== undefined && !Number.isFinite(value)),
  );
  const pass = badBatting.length === 0 && badPitching.length === 0;
  return invariantResult(
    'stats.war-fields-finite',
    TAG,
    pass,
    pass
      ? `battingRows=${snapshot.battingRows.length}; pitchingRows=${snapshot.pitchingRows.length}`
      : `badBatting=${badBatting.slice(0, 5).map((row) => row.playerId).join(',')}; badPitching=${badPitching.slice(0, 5).map((row) => row.playerId).join(',')}`,
  );
}

function noNonFiniteStats(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const path = findNonFinite({
    battingRows: snapshot.battingRows,
    pitchingRows: snapshot.pitchingRows,
    fieldingRows: snapshot.fieldingRows,
    standings: snapshot.standings,
  });
  return invariantResult(
    'stats.no-nan-or-infinity',
    TAG,
    path === null,
    path === null ? 'all stat/standing numeric fields finite' : `nonFiniteAt=${path}`,
  );
}

function rateFieldsInRange(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const battingBad = snapshot.battingRows.filter((row) => {
    const avg = row.ab > 0 ? row.hits / row.ab : 0;
    const obpDenominator = row.ab + row.walks + row.hitByPitch + row.sacFlies;
    const obp = obpDenominator > 0 ? (row.hits + row.walks + row.hitByPitch) / obpDenominator : 0;
    return avg < 0 || avg > 1 || obp < 0 || obp > 1;
  });
  const standingsBad = snapshot.standings.filter((row) => row.winPct < 0 || row.winPct > 1);
  const pass = battingBad.length === 0 && standingsBad.length === 0;
  return invariantResult(
    'stats.derived-rate-ranges',
    TAG,
    pass,
    pass
      ? 'AVG/OBP/winPct fields are within expected ranges'
      : `badBatting=${battingBad.map((row) => row.playerId).slice(0, 5).join(',')}; badStandings=${standingsBad.map((row) => row.teamId).join(',')}`,
  );
}

function lastGameApplied(snapshot: LsimStateSnapshot): LsimInvariantResult {
  const delta = snapshot.lastGameDelta;
  const pass = Boolean(delta) &&
    delta.battingIncreasedPlayerIds.length > 0 &&
    delta.pitchingIncreasedPlayerIds.length > 0;
  return invariantResult(
    'stats.last-game-applied-to-season-totals',
    TAG,
    pass,
    delta
      ? `battingIncreased=${delta.battingIncreasedPlayerIds.length}; pitchingIncreased=${delta.pitchingIncreasedPlayerIds.length}`
      : 'missing last-game delta',
  );
}

export function getStatsInvariantChecks(): LsimInvariantCheck[] {
  return [
    completedGameCount,
    teamGameConservation,
    leagueWinsEqualLosses,
    leagueRunsConservation,
    standingsMatchGames,
    battingRowsConsistent,
    pitchingRowsConsistent,
    fieldingRowsConsistent,
    warFieldsFinite,
    noNonFiniteStats,
    rateFieldsInRange,
    lastGameApplied,
  ];
}
