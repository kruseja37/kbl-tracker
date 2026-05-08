import { listEliminations, deleteElimination } from "./eliminationManager";
import { deleteCompetitionEventLogData } from "./eventLog";
import { deleteCompetitionGameData } from "./gameStorage";
import { deleteRunFameAggregate } from "./eliminationRunFameStorage";
import { deleteEliminationAllTimeStats } from "./eliminationAllTimeStatsStorage";
import { getTrackerDb } from "./trackerDb";

const TRACKER_STORES_TO_CLEAR = [
  "completedGames",
  "currentGame",
  "playerSeasonBatting",
  "playerSeasonPitching",
  "playerSeasonFielding",
  "seasonMetadata",
  "playerCareerBatting",
  "playerCareerPitching",
  "playerCareerFielding",
  "careerMilestones",
  "almanacCanonicalPlayers",
  "eliminationRunFameAggregates",
  "eliminationAllTimePlayerStats",
  "commentaryFeedEntries",
  "gameStories",
  "narrativeContext",
  "reporterPlayerAlmanacCaches",
  "reporterTeamAlmanacCaches",
  "reporterAlmanacEntries",
  "reporterLegacySummaryJobs",
  "rivalryScores",
] as const;

function transactionToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function clearTrackerStores(): Promise<void> {
  const db = await getTrackerDb();
  const existingStores = TRACKER_STORES_TO_CLEAR.filter((storeName) =>
    db.objectStoreNames.contains(storeName),
  );
  if (existingStores.length === 0) {
    return;
  }

  const tx = db.transaction(existingStores as string[], "readwrite");
  for (const storeName of existingStores) {
    tx.objectStore(storeName).clear();
  }
  await transactionToPromise(tx);
}

async function deleteDatabase(name: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

export async function resetDerivedCompetitionData(): Promise<void> {
  const eliminations = await listEliminations();
  for (const elimination of eliminations) {
    await deleteElimination(elimination.eliminationId);
    await Promise.all([
      deleteRunFameAggregate(elimination.eliminationId),
      deleteCompetitionGameData("elimination", elimination.eliminationId),
      deleteCompetitionEventLogData("elimination", elimination.eliminationId),
    ]);
  }

  await clearTrackerStores();
  await deleteEliminationAllTimeStats();
  await Promise.allSettled([
    deleteDatabase("kbl-playoffs"),
    deleteDatabase("kbl-event-log"),
  ]);
}
