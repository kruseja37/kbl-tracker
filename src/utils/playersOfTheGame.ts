import type { AtBatEvent } from "./eventLog";

type StoredPlayersOfTheGame = {
  first?: string;
  second?: string;
  third?: string;
};

interface PlayerStatLike {
  playerName: string;
  teamId: string;
  pa: number;
  ab: number;
  h: number;
  hr?: number;
  rbi: number;
  r: number;
  bb: number;
  k: number;
}

export interface PlayersOfTheGameSource {
  awayTeamId: string;
  homeTeamId: string;
  playerStats: Record<string, PlayerStatLike>;
  playersOfTheGame?: StoredPlayersOfTheGame;
  pogPlayerId?: string;
}

export interface PlayerOfTheGameEntry {
  playerId: string;
  name: string;
  teamId: string;
  isAway: boolean;
  pa: number;
  ab: number;
  h: number;
  hr: number;
  rbi: number;
  r: number;
  bb: number;
  so: number;
  wpa?: number;
}

type RankedPlayerCandidate = PlayerOfTheGameEntry & {
  hasOffensiveLine?: boolean;
};

function normalizeTeamId(teamId: string | undefined | null): string {
  return (teamId ?? "").trim().toLowerCase();
}

function getStoredRankedIds(source: PlayersOfTheGameSource): string[] {
  const rankedIds = [
    source.playersOfTheGame?.first,
    source.playersOfTheGame?.second,
    source.playersOfTheGame?.third,
    source.pogPlayerId,
  ].filter((playerId): playerId is string => Boolean(playerId));

  return Array.from(new Set(rankedIds));
}

export function rankPlayersOfTheGame(
  source: PlayersOfTheGameSource,
  atBatEvents: AtBatEvent[],
): PlayerOfTheGameEntry[] {
  const normalizedAwayTeamId = normalizeTeamId(source.awayTeamId);
  const normalizedHomeTeamId = normalizeTeamId(source.homeTeamId);

  const allBatters: RankedPlayerCandidate[] = Object.entries(source.playerStats)
    .filter(([, stats]) => {
      const teamId = normalizeTeamId(stats.teamId);
      return (
        (teamId === normalizedAwayTeamId || teamId === normalizedHomeTeamId) &&
        typeof stats.playerName === "string" &&
        stats.playerName.trim().length > 0
      );
    })
    .map(([playerId, stats]) => {
      const teamId = normalizeTeamId(stats.teamId);
      const isAway = teamId === normalizedAwayTeamId;
      const hasOffensiveLine =
        stats.pa > 0 || stats.h > 0 || stats.r > 0 || stats.rbi > 0;

      return {
        playerId,
        name: stats.playerName,
        teamId: stats.teamId,
        isAway,
        pa: stats.pa,
        ab: stats.ab,
        h: stats.h,
        hr: stats.hr ?? 0,
        rbi: stats.rbi,
        r: stats.r,
        bb: stats.bb,
        so: stats.k,
        hasOffensiveLine,
      };
    });

  const batterById = new Map(
    allBatters.map((batter) => [batter.playerId, batter]),
  );

  const wpaByBatter = new Map<string, number>();
  let hasWpaData = false;

  for (const event of atBatEvents) {
    if (!Number.isFinite(event.wpa)) continue;
    hasWpaData = true;
    wpaByBatter.set(
      event.batterId,
      (wpaByBatter.get(event.batterId) ?? 0) + event.wpa,
    );
  }

  const rankedCandidates: RankedPlayerCandidate[] = [];
  if (hasWpaData) {
    for (const [playerId, wpa] of wpaByBatter.entries()) {
      const batter = batterById.get(playerId);
      if (batter) {
        rankedCandidates.push({ ...batter, wpa });
      }
    }
    rankedCandidates.sort((left, right) => {
      return (
        (right.wpa ?? 0) - (left.wpa ?? 0) ||
        left.name.localeCompare(right.name)
      );
    });
  } else {
    rankedCandidates.push(
      ...allBatters
        .filter((batter) => batter.hasOffensiveLine && Boolean(batter.name))
        .map((batter): RankedPlayerCandidate => ({
          ...batter,
          wpa: undefined,
        })),
    );
    rankedCandidates.sort((left, right) => {
      const leftScore = left.h * 2 + left.rbi + left.r;
      const rightScore = right.h * 2 + right.rbi + right.r;
      return rightScore - leftScore || left.name.localeCompare(right.name);
    });
  }

  const ranked: RankedPlayerCandidate[] = [...rankedCandidates];

  for (const playerId of getStoredRankedIds(source).reverse()) {
    const index = ranked.findIndex((entry) => entry.playerId === playerId);
    const existing = index >= 0 ? ranked[index] : batterById.get(playerId);
    if (!existing) continue;
    if (index >= 0) {
      ranked.splice(index, 1);
    }
    ranked.unshift({
      ...existing,
      wpa: wpaByBatter.get(existing.playerId) ?? existing.wpa,
    });
  }

  return ranked.slice(0, 3).map(({ hasOffensiveLine: _ignored, ...player }) => player);
}

export function buildStoredPlayersOfTheGame(
  rankedPlayers: PlayerOfTheGameEntry[],
): StoredPlayersOfTheGame | undefined {
  if (rankedPlayers.length === 0) {
    return undefined;
  }

  return {
    first: rankedPlayers[0]?.playerId,
    second: rankedPlayers[1]?.playerId,
    third: rankedPlayers[2]?.playerId,
  };
}
