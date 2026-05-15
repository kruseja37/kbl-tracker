import type { PersistedGameState } from "./gameStorage";
import { getTrackerDb } from "./trackerDb";
import { syncEngine } from "./syncEngine";

const STORE = "eliminationAllTimePlayerStats";

export interface EliminationAllTimePlayerStats {
  playerId: string;
  playerName: string;
  battingGames: number;
  atBats: number;
  hits: number;
  runs: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  stolenBases: number;
  walks: number;
  strikeouts: number;
  pitchingGames: number;
  outsRecorded: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;
  pitchingStrikeouts: number;
  wins: number;
  losses: number;
  saves: number;
  completeGames: number;
  shutouts: number;
  processedGameIds: string[];
  lastUpdatedAt: number;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function createEmptyPlayerStats(
  playerId: string,
  playerName: string,
): EliminationAllTimePlayerStats {
  return {
    playerId,
    playerName,
    battingGames: 0,
    atBats: 0,
    hits: 0,
    runs: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbi: 0,
    stolenBases: 0,
    walks: 0,
    strikeouts: 0,
    pitchingGames: 0,
    outsRecorded: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walksAllowed: 0,
    pitchingStrikeouts: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    completeGames: 0,
    shutouts: 0,
    processedGameIds: [],
    lastUpdatedAt: Date.now(),
  };
}

async function getPlayerStats(
  store: IDBObjectStore,
  playerId: string,
  playerName: string,
): Promise<EliminationAllTimePlayerStats> {
  return (
    ((await requestToPromise(
      store.get(playerId),
    )) as EliminationAllTimePlayerStats | undefined) ??
    createEmptyPlayerStats(playerId, playerName)
  );
}

function pitchOutsToCompleteGames(
  pitcher: PersistedGameState["pitcherGameStats"][number],
  allPitchers: PersistedGameState["pitcherGameStats"],
): { completeGames: number; shutouts: number } {
  if (!pitcher.isStarter) {
    return { completeGames: 0, shutouts: 0 };
  }

  const teamOutsRecorded = allPitchers
    .filter((entry) => entry.teamId === pitcher.teamId)
    .reduce((sum, entry) => sum + entry.outsRecorded, 0);
  if (teamOutsRecorded === 0 || pitcher.outsRecorded !== teamOutsRecorded) {
    return { completeGames: 0, shutouts: 0 };
  }

  return {
    completeGames: 1,
    shutouts: pitcher.runsAllowed === 0 ? 1 : 0,
  };
}

export async function appendEliminationGameToAllTimeStats(
  gameState: PersistedGameState,
): Promise<void> {
  const db = await getTrackerDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  const contributions = new Map<
    string,
    {
      playerName: string;
      battingGames: number;
      atBats: number;
      hits: number;
      runs: number;
      doubles: number;
      triples: number;
      homeRuns: number;
      rbi: number;
      stolenBases: number;
      walks: number;
      strikeouts: number;
      pitchingGames: number;
      outsRecorded: number;
      hitsAllowed: number;
      runsAllowed: number;
      earnedRuns: number;
      walksAllowed: number;
      pitchingStrikeouts: number;
      wins: number;
      losses: number;
      saves: number;
      completeGames: number;
      shutouts: number;
    }
  >();
  const touched = new Set<string>();

  for (const [playerId, stats] of Object.entries(gameState.playerStats)) {
    contributions.set(playerId, {
      playerName: stats.playerName,
      battingGames: 1,
      atBats: stats.ab,
      hits: stats.h,
      runs: stats.r,
      doubles: stats.doubles,
      triples: stats.triples,
      homeRuns: stats.hr,
      rbi: stats.rbi,
      stolenBases: stats.sb,
      walks: stats.bb,
      strikeouts: stats.k,
      pitchingGames: 0,
      outsRecorded: 0,
      hitsAllowed: 0,
      runsAllowed: 0,
      earnedRuns: 0,
      walksAllowed: 0,
      pitchingStrikeouts: 0,
      wins: 0,
      losses: 0,
      saves: 0,
      completeGames: 0,
      shutouts: 0,
    });
  }

  for (const pitcher of gameState.pitcherGameStats) {
    const currentContribution =
      contributions.get(pitcher.pitcherId) ??
      {
        playerName: pitcher.pitcherName,
        battingGames: 0,
        atBats: 0,
        hits: 0,
        runs: 0,
        doubles: 0,
        triples: 0,
        homeRuns: 0,
        rbi: 0,
        stolenBases: 0,
        walks: 0,
        strikeouts: 0,
        pitchingGames: 0,
        outsRecorded: 0,
        hitsAllowed: 0,
        runsAllowed: 0,
        earnedRuns: 0,
        walksAllowed: 0,
        pitchingStrikeouts: 0,
        wins: 0,
        losses: 0,
        saves: 0,
        completeGames: 0,
        shutouts: 0,
      };
    const { completeGames, shutouts } = pitchOutsToCompleteGames(
      pitcher,
      gameState.pitcherGameStats,
    );
    contributions.set(pitcher.pitcherId, {
      ...currentContribution,
      playerName: pitcher.pitcherName,
      pitchingGames: currentContribution.pitchingGames + 1,
      outsRecorded: currentContribution.outsRecorded + pitcher.outsRecorded,
      hitsAllowed: currentContribution.hitsAllowed + pitcher.hitsAllowed,
      runsAllowed: currentContribution.runsAllowed + pitcher.runsAllowed,
      earnedRuns: currentContribution.earnedRuns + pitcher.earnedRuns,
      walksAllowed: currentContribution.walksAllowed + pitcher.walksAllowed,
      pitchingStrikeouts:
        currentContribution.pitchingStrikeouts + pitcher.strikeoutsThrown,
      wins: currentContribution.wins + (pitcher.decision === "W" ? 1 : 0),
      losses: currentContribution.losses + (pitcher.decision === "L" ? 1 : 0),
      saves: currentContribution.saves + (pitcher.save ? 1 : 0),
      completeGames: currentContribution.completeGames + completeGames,
      shutouts: currentContribution.shutouts + shutouts,
    });
  }

  for (const [playerId, contribution] of contributions.entries()) {
    const current = await getPlayerStats(store, playerId, contribution.playerName);
    if (current.processedGameIds.includes(gameState.gameId)) {
      continue;
    }
    current.playerName = contribution.playerName;
    current.battingGames += contribution.battingGames;
    current.atBats += contribution.atBats;
    current.hits += contribution.hits;
    current.runs += contribution.runs;
    current.doubles += contribution.doubles;
    current.triples += contribution.triples;
    current.homeRuns += contribution.homeRuns;
    current.rbi += contribution.rbi;
    current.stolenBases += contribution.stolenBases;
    current.walks += contribution.walks;
    current.strikeouts += contribution.strikeouts;
    current.pitchingGames += contribution.pitchingGames;
    current.outsRecorded += contribution.outsRecorded;
    current.hitsAllowed += contribution.hitsAllowed;
    current.runsAllowed += contribution.runsAllowed;
    current.earnedRuns += contribution.earnedRuns;
    current.walksAllowed += contribution.walksAllowed;
    current.pitchingStrikeouts += contribution.pitchingStrikeouts;
    current.wins += contribution.wins;
    current.losses += contribution.losses;
    current.saves += contribution.saves;
    current.completeGames += contribution.completeGames;
    current.shutouts += contribution.shutouts;
    current.processedGameIds = [...current.processedGameIds, gameState.gameId];
    current.lastUpdatedAt = Date.now();
    await requestToPromise(store.put(current));
    touched.add(playerId);
  }

  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    for (const playerId of touched) {
      const refreshed = await getEliminationAllTimePlayerStats(playerId);
      if (refreshed) {
        syncEngine.upsert("kbl-tracker", STORE, playerId, refreshed);
      }
    }
  }
}

export async function getEliminationAllTimePlayerStats(
  playerId: string,
): Promise<EliminationAllTimePlayerStats | null> {
  const db = await getTrackerDb();
  const tx = db.transaction(STORE, "readonly");
  const store = tx.objectStore(STORE);
  const result = (await requestToPromise(
    store.get(playerId),
  )) as EliminationAllTimePlayerStats | undefined;
  await transactionToPromise(tx);
  return result ?? null;
}

export async function deleteEliminationAllTimeStats(): Promise<void> {
  const db = await getTrackerDb();
  const tx = db.transaction(STORE, "readwrite");
  await requestToPromise(tx.objectStore(STORE).clear());
  await transactionToPromise(tx);
}
