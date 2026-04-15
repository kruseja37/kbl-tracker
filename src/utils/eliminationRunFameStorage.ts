import type { PersistedGameState } from "./gameStorage";
import { syncEngine } from "./syncEngine";
import { getTrackerDb } from "./trackerDb";

const STORE = "eliminationRunFameAggregates";

type FameEventRecord = PersistedGameState["fameEvents"][number];

export interface PlayerRunFame {
  totalFame: number;
  events: FameEventRecord[];
  gamesPlayed: number;
}

export interface RunFameStanding extends PlayerRunFame {
  playerId: string;
  playerName: string;
}

interface StoredPlayerRunFame extends PlayerRunFame {
  playerName: string;
  gameIds: string[];
}

export interface EliminationRunFameAggregate {
  runId: string;
  playerFame: Record<string, StoredPlayerRunFame>;
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

function cloneEvents(events: FameEventRecord[]): FameEventRecord[] {
  return events.map((event) => ({ ...event }));
}

function createEmptyAggregate(runId: string): EliminationRunFameAggregate {
  return {
    runId,
    playerFame: {},
    processedGameIds: [],
    lastUpdatedAt: Date.now(),
  };
}

export async function appendEliminationGameFameToRun(
  runId: string,
  gameId: string,
  fameEvents: FameEventRecord[],
): Promise<EliminationRunFameAggregate> {
  const db = await getTrackerDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  const existing =
    ((await requestToPromise(
      store.get(runId),
    )) as EliminationRunFameAggregate | undefined) ?? createEmptyAggregate(runId);

  if (existing.processedGameIds.includes(gameId)) {
    await transactionToPromise(tx);
    return existing;
  }

  const updated: EliminationRunFameAggregate = {
    ...existing,
    playerFame: { ...existing.playerFame },
    processedGameIds: [...existing.processedGameIds, gameId],
    lastUpdatedAt: Date.now(),
  };

  for (const event of fameEvents) {
    const current = updated.playerFame[event.playerId] ?? {
      playerName: event.playerName,
      totalFame: 0,
      events: [],
      gamesPlayed: 0,
      gameIds: [],
    };
    const hasGame = current.gameIds.includes(gameId);

    updated.playerFame[event.playerId] = {
      playerName: event.playerName,
      totalFame: current.totalFame + event.fameValue,
      events: [...current.events, { ...event }],
      gamesPlayed: hasGame ? current.gamesPlayed : current.gamesPlayed + 1,
      gameIds: hasGame ? current.gameIds : [...current.gameIds, gameId],
    };
  }

  await requestToPromise(store.put(updated));
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert("kbl-tracker", STORE, updated.runId, updated);
  }

  return updated;
}

export async function getPlayerRunFame(
  runId: string,
  playerId: string,
): Promise<PlayerRunFame> {
  const db = await getTrackerDb();
  const tx = db.transaction(STORE, "readonly");
  const aggregate =
    ((await requestToPromise(
      tx.objectStore(STORE).get(runId),
    )) as EliminationRunFameAggregate | undefined) ?? null;
  await transactionToPromise(tx);

  const playerFame = aggregate?.playerFame[playerId];
  if (!playerFame) {
    return {
      totalFame: 0,
      events: [],
      gamesPlayed: 0,
    };
  }

  return {
    totalFame: playerFame.totalFame,
    events: cloneEvents(playerFame.events),
    gamesPlayed: playerFame.gamesPlayed,
  };
}

export async function getRunFameStandings(
  runId: string,
): Promise<RunFameStanding[]> {
  const db = await getTrackerDb();
  const tx = db.transaction(STORE, "readonly");
  const aggregate =
    ((await requestToPromise(
      tx.objectStore(STORE).get(runId),
    )) as EliminationRunFameAggregate | undefined) ?? null;
  await transactionToPromise(tx);

  if (!aggregate) {
    return [];
  }

  return Object.entries(aggregate.playerFame)
    .map(([playerId, playerFame]) => ({
      playerId,
      playerName: playerFame.playerName,
      totalFame: playerFame.totalFame,
      events: cloneEvents(playerFame.events),
      gamesPlayed: playerFame.gamesPlayed,
    }))
    .sort(
      (left, right) =>
        right.totalFame - left.totalFame ||
        right.events.length - left.events.length ||
        left.playerName.localeCompare(right.playerName),
    );
}
