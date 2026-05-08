import type { AtBatEvent } from "./eventLog";
import { aggregateKblWpaCredits, type KblWpaCredit } from "./kblWpaAttribution";

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

interface PitcherStatLike {
  pitcherId: string;
  pitcherName: string;
  teamId: string;
}

export interface PlayersOfTheGameSource {
  awayTeamId: string;
  homeTeamId: string;
  playerStats: Record<string, PlayerStatLike>;
  pitcherGameStats?: PitcherStatLike[];
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
  kblWpaCredits: KblWpaCredit[] = [],
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
  const pitcherById = new Map(
    (source.pitcherGameStats ?? []).map((pitcher) => [
      pitcher.pitcherId,
      {
        playerId: pitcher.pitcherId,
        name: pitcher.pitcherName,
        teamId: pitcher.teamId,
        isAway: normalizeTeamId(pitcher.teamId) === normalizedAwayTeamId,
        pa: 0,
        ab: 0,
        h: 0,
        hr: 0,
        rbi: 0,
        r: 0,
        bb: 0,
        so: 0,
        hasOffensiveLine: false,
      } satisfies RankedPlayerCandidate,
    ]),
  );

  const wpaByBatter = new Map<string, number>();
  const kblTotalById = new Map<string, ReturnType<typeof aggregateKblWpaCredits>[number]>();
  let hasWpaData = false;

  if (kblWpaCredits.length > 0) {
    for (const total of aggregateKblWpaCredits(kblWpaCredits)) {
      hasWpaData = true;
      wpaByBatter.set(total.playerId, total.totalWpa);
      kblTotalById.set(total.playerId, total);
    }
  } else {
    for (const event of atBatEvents) {
      if (!Number.isFinite(event.wpa)) continue;
      hasWpaData = true;
      wpaByBatter.set(
        event.batterId,
        (wpaByBatter.get(event.batterId) ?? 0) + event.wpa,
      );
    }
  }

  const rankedCandidates: RankedPlayerCandidate[] = [];
  if (hasWpaData) {
    for (const [playerId, wpa] of wpaByBatter.entries()) {
      const knownPlayer = batterById.get(playerId) ?? pitcherById.get(playerId);
      const total = kblTotalById.get(playerId);
      const candidate =
        knownPlayer ??
        (total
          ? {
              playerId: total.playerId,
              name: total.playerName,
              teamId: total.teamId,
              isAway: normalizeTeamId(total.teamId) === normalizedAwayTeamId,
              pa: 0,
              ab: 0,
              h: 0,
              hr: 0,
              rbi: 0,
              r: 0,
              bb: 0,
              so: 0,
              hasOffensiveLine: false,
            }
          : undefined);
      if (candidate) {
        rankedCandidates.push({ ...candidate, wpa });
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
