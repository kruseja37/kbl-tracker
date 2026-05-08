import type { PersistedGameState } from "./gameStorage";
import type { FameTier } from "../types/reporter";
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

export interface RunPromotionDecision {
  acceptedTier?: FameTier;
  dismissedTier?: FameTier;
  lastUpdatedAt: number;
}

interface StoredPlayerRunFame extends PlayerRunFame {
  playerName: string;
  gameIds: string[];
}

export interface EliminationRunFameAggregate {
  runId: string;
  playerFame: Record<string, StoredPlayerRunFame>;
  promotionDecisions?: Record<string, RunPromotionDecision>;
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
    promotionDecisions: {},
    processedGameIds: [],
    lastUpdatedAt: Date.now(),
  };
}

async function getAggregate(
  runId: string,
  mode: IDBTransactionMode,
): Promise<{
  tx: IDBTransaction;
  store: IDBObjectStore;
  aggregate: EliminationRunFameAggregate;
}> {
  const db = await getTrackerDb();
  const tx = db.transaction(STORE, mode);
  const store = tx.objectStore(STORE);
  const aggregate =
    ((await requestToPromise(
      store.get(runId),
    )) as EliminationRunFameAggregate | undefined) ?? createEmptyAggregate(runId);

  return {
    tx,
    store,
    aggregate: {
      ...aggregate,
      promotionDecisions: { ...(aggregate.promotionDecisions ?? {}) },
    },
  };
}

async function persistAggregate(
  tx: IDBTransaction,
  store: IDBObjectStore,
  aggregate: EliminationRunFameAggregate,
): Promise<EliminationRunFameAggregate> {
  await requestToPromise(store.put(aggregate));
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert("kbl-tracker", STORE, aggregate.runId, aggregate);
  }

  return aggregate;
}

export async function appendEliminationGameFameToRun(
  runId: string,
  gameId: string,
  fameEvents: FameEventRecord[],
): Promise<EliminationRunFameAggregate> {
  const { tx, store, aggregate: existing } = await getAggregate(runId, "readwrite");

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

  return persistAggregate(tx, store, updated);
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

export async function getRunPromotionDecision(
  runId: string,
  playerId: string,
): Promise<RunPromotionDecision | null> {
  const { tx, aggregate } = await getAggregate(runId, "readonly");
  await transactionToPromise(tx);
  return aggregate.promotionDecisions?.[playerId] ?? null;
}

export async function setRunPromotionDecision(
  runId: string,
  playerId: string,
  decision: Partial<RunPromotionDecision>,
): Promise<RunPromotionDecision> {
  const { tx, store, aggregate } = await getAggregate(runId, "readwrite");
  const nextDecision: RunPromotionDecision = {
    ...(aggregate.promotionDecisions?.[playerId] ?? { lastUpdatedAt: 0 }),
    ...decision,
    lastUpdatedAt: Date.now(),
  };

  const updated: EliminationRunFameAggregate = {
    ...aggregate,
    promotionDecisions: {
      ...(aggregate.promotionDecisions ?? {}),
      [playerId]: nextDecision,
    },
    lastUpdatedAt: Date.now(),
  };

  await persistAggregate(tx, store, updated);
  return nextDecision;
}

export async function deleteRunFameAggregate(runId: string): Promise<void> {
  const db = await getTrackerDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);

  await requestToPromise(store.delete(runId));
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.remove("kbl-tracker", STORE, runId);
  }
}
