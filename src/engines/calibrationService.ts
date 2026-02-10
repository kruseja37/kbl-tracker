/**
 * Calibration Service
 *
 * Per BWAR_CALCULATION_SPEC.md §9 and ADAPTIVE_STANDARDS_ENGINE_SPEC.md §3:
 * - Season-end calibration data aggregation pipeline (GAP-B1-001)
 * - Calibration scheduling + blend logic (GAP-B1-002)
 * - AdaptiveStandardsEngine with IndexedDB persistence (MAJ-B9-001)
 *
 * Collects aggregate league data after each season, recalibrates
 * linear weights, replacement level, and run environment baselines.
 */

import {
  SMB4_BASELINES,
  SMB4_LINEAR_WEIGHTS,
  SMB4_WOBA_WEIGHTS,
  MLB_BASELINES,
  type LeagueContext,
  type LinearWeights,
  type WOBAWeights,
  createDefaultLeagueContext,
} from '../types/war';

// ============================================
// TYPES
// ============================================

/** Raw aggregate stats collected at season end */
export interface SeasonAggregateStats {
  seasonId: string;
  seasonNumber: number;
  totalPA: number;
  totalAB: number;
  totalHits: number;
  totalSingles: number;
  totalDoubles: number;
  totalTriples: number;
  totalHR: number;
  totalBB: number;
  totalHBP: number;
  totalK: number;
  totalSF: number;
  totalOuts: number;
  totalRuns: number;
  totalGames: number;
  totalTeams: number;
  gamesPerTeam: number;
  inningsPerGame: number;

  // Pitching aggregates
  totalIP: number;
  totalER: number;
  totalPitchingK: number;
  totalPitchingBB: number;
  totalPitchingHBP: number;
  totalPitchingHR: number;

  collectedAt: number;
}

/** Calibration config per spec */
export interface CalibrationConfig {
  /** How much to trust new data vs existing (0-1). Default: 0.3 */
  blendWeight: number;
  /** Minimum completed seasons before first calibration */
  minSeasons: number;
  /** Minimum total PA across all seasons before calibrating */
  minPA: number;
}

/** Stored calibration record */
export interface CalibrationRecord {
  id: string;
  seasonId: string;
  calibratedAt: number;
  seasonCount: number;
  totalPASampled: number;
  previousContext: LeagueContext;
  newContext: LeagueContext;
  config: CalibrationConfig;
}

/** Adaptive engine state persisted to IndexedDB */
export interface AdaptiveEngineState {
  id: string; // Always 'adaptive-engine-state'
  currentContext: LeagueContext;
  seasonHistory: SeasonAggregateStats[];
  calibrationHistory: CalibrationRecord[];
  lastCalibratedSeason: number; // season number
  totalPAAllTime: number;
}

// ============================================
// CONSTANTS
// ============================================

export const DEFAULT_CALIBRATION_CONFIG: CalibrationConfig = {
  blendWeight: 0.3,
  minSeasons: 2,
  minPA: 10000,
};

// ============================================
// CALIBRATION FUNCTIONS
// ============================================

/**
 * Check if we should run calibration after this season.
 * Per BWAR spec §9: min 2 seasons, min 10,000 total PA.
 */
export function shouldCalibrate(
  seasonCount: number,
  totalPA: number,
  config: CalibrationConfig = DEFAULT_CALIBRATION_CONFIG
): boolean {
  return seasonCount >= config.minSeasons && totalPA >= config.minPA;
}

/**
 * Recalibrate linear weights from aggregate data.
 * Per BWAR spec §9: scale MLB weights by (ourRunsPerPA / mlbRunsPerPA).
 */
export function recalibrateLinearWeights(
  aggregateStats: SeasonAggregateStats,
  currentWeights: LinearWeights = SMB4_LINEAR_WEIGHTS,
  blendWeight: number = DEFAULT_CALIBRATION_CONFIG.blendWeight
): LinearWeights {
  if (aggregateStats.totalPA < 500) return currentWeights;

  const ourRunsPerPA = aggregateStats.totalRuns / aggregateStats.totalPA;
  const mlbRunsPerPA = MLB_BASELINES.runsPerPA;
  const scaleFactor = ourRunsPerPA / mlbRunsPerPA;

  // Scale all weights by the run environment ratio
  const newWeights: LinearWeights = {
    uBB: currentWeights.uBB * scaleFactor,
    HBP: currentWeights.HBP * scaleFactor,
    single: currentWeights.single * scaleFactor,
    double: currentWeights.double * scaleFactor,
    triple: currentWeights.triple * scaleFactor,
    homeRun: currentWeights.homeRun * scaleFactor,
    out: currentWeights.out * scaleFactor,
    strikeout: currentWeights.strikeout * scaleFactor,
  };

  // Blend with existing
  return {
    uBB: blend(currentWeights.uBB, newWeights.uBB, blendWeight),
    HBP: blend(currentWeights.HBP, newWeights.HBP, blendWeight),
    single: blend(currentWeights.single, newWeights.single, blendWeight),
    double: blend(currentWeights.double, newWeights.double, blendWeight),
    triple: blend(currentWeights.triple, newWeights.triple, blendWeight),
    homeRun: blend(currentWeights.homeRun, newWeights.homeRun, blendWeight),
    out: blend(currentWeights.out, newWeights.out, blendWeight),
    strikeout: blend(currentWeights.strikeout, newWeights.strikeout, blendWeight),
  };
}

/**
 * Recalibrate wOBA weights from linear weights.
 * wOBA weight = linear weight × wOBA scale.
 */
export function recalibrateWOBAWeights(
  linearWeights: LinearWeights,
  wobaScale: number = SMB4_BASELINES.wobaScale
): WOBAWeights {
  return {
    uBB: round4(linearWeights.uBB * wobaScale),
    HBP: round4(linearWeights.HBP * wobaScale),
    single: round4(linearWeights.single * wobaScale),
    double: round4(linearWeights.double * wobaScale),
    triple: round4(linearWeights.triple * wobaScale),
    homeRun: round4(linearWeights.homeRun * wobaScale),
  };
}

/**
 * Recalibrate replacement level from season data.
 * Per BWAR spec §9: find bottom 20% of qualified batters.
 * Simplified: use aggregate runs per PA to scale the existing replacement level.
 */
export function recalibrateReplacementLevel(
  aggregateStats: SeasonAggregateStats,
  currentReplacement: number = SMB4_BASELINES.replacementRunsPer600PA,
  blendWeight: number = DEFAULT_CALIBRATION_CONFIG.blendWeight
): number {
  if (aggregateStats.totalPA < 500) return currentReplacement;

  const ourRunsPerPA = aggregateStats.totalRuns / aggregateStats.totalPA;
  const baseRunsPerPA = SMB4_BASELINES.runsPerGame / 27.5;
  const scaleFactor = ourRunsPerPA / baseRunsPerPA;

  const newReplacement = SMB4_BASELINES.replacementRunsPer600PA * scaleFactor;
  return round4(blend(currentReplacement, newReplacement, blendWeight));
}

/**
 * Build a full recalibrated LeagueContext from aggregate season data.
 * This is the main calibration entry point.
 */
export function calibrateLeagueContext(
  aggregateStats: SeasonAggregateStats,
  currentContext: LeagueContext,
  config: CalibrationConfig = DEFAULT_CALIBRATION_CONFIG
): LeagueContext {
  const { blendWeight } = config;

  // Recalibrate components
  const newLinearWeights = recalibrateLinearWeights(
    aggregateStats,
    currentContext.linearWeights,
    blendWeight
  );
  const newWOBAWeights = recalibrateWOBAWeights(
    newLinearWeights,
    currentContext.wobaScale
  );
  const newReplacementLevel = recalibrateReplacementLevel(
    aggregateStats,
    currentContext.replacementRunsPer600PA,
    blendWeight
  );

  // Recalibrate run environment
  const ourRunsPerGame = aggregateStats.totalRuns / aggregateStats.totalGames;
  const newRunsPerPA = blend(
    currentContext.runsPerPA,
    aggregateStats.totalRuns / aggregateStats.totalPA,
    blendWeight
  );

  // wOBA recalculation
  const totalOnBase = aggregateStats.totalHits + aggregateStats.totalBB + aggregateStats.totalHBP;
  const newWOBA = totalOnBase > 0
    ? (
        (newWOBAWeights.uBB * aggregateStats.totalBB) +
        (newWOBAWeights.HBP * aggregateStats.totalHBP) +
        (newWOBAWeights.single * aggregateStats.totalSingles) +
        (newWOBAWeights.double * aggregateStats.totalDoubles) +
        (newWOBAWeights.triple * aggregateStats.totalTriples) +
        (newWOBAWeights.homeRun * aggregateStats.totalHR)
      ) / (aggregateStats.totalAB + aggregateStats.totalBB + aggregateStats.totalSF + aggregateStats.totalHBP)
    : currentContext.leagueWOBA;

  // Determine confidence based on sample size
  const confidence: 'LOW' | 'MEDIUM' | 'HIGH' =
    aggregateStats.totalPA >= 20000 ? 'HIGH' :
    aggregateStats.totalPA >= 10000 ? 'MEDIUM' : 'LOW';

  return {
    ...currentContext,
    seasonId: aggregateStats.seasonId,
    runsPerPA: round4(newRunsPerPA),
    leagueWOBA: round4(blend(currentContext.leagueWOBA, newWOBA, blendWeight)),
    linearWeights: newLinearWeights,
    wobaWeights: newWOBAWeights,
    replacementRunsPer600PA: newReplacementLevel,
    calibrationDate: Date.now(),
    sampleSize: aggregateStats.totalPA,
    confidence,
  };
}

/**
 * Aggregate multiple seasons of stats for calibration.
 */
export function aggregateSeasonStats(
  seasons: SeasonAggregateStats[]
): SeasonAggregateStats {
  if (seasons.length === 0) throw new Error('No seasons to aggregate');
  if (seasons.length === 1) return seasons[0];

  const latest = seasons[seasons.length - 1];

  return {
    seasonId: latest.seasonId,
    seasonNumber: latest.seasonNumber,
    totalPA: sum(seasons, s => s.totalPA),
    totalAB: sum(seasons, s => s.totalAB),
    totalHits: sum(seasons, s => s.totalHits),
    totalSingles: sum(seasons, s => s.totalSingles),
    totalDoubles: sum(seasons, s => s.totalDoubles),
    totalTriples: sum(seasons, s => s.totalTriples),
    totalHR: sum(seasons, s => s.totalHR),
    totalBB: sum(seasons, s => s.totalBB),
    totalHBP: sum(seasons, s => s.totalHBP),
    totalK: sum(seasons, s => s.totalK),
    totalSF: sum(seasons, s => s.totalSF),
    totalOuts: sum(seasons, s => s.totalOuts),
    totalRuns: sum(seasons, s => s.totalRuns),
    totalGames: sum(seasons, s => s.totalGames),
    totalTeams: latest.totalTeams,
    gamesPerTeam: latest.gamesPerTeam,
    inningsPerGame: latest.inningsPerGame,
    totalIP: sum(seasons, s => s.totalIP),
    totalER: sum(seasons, s => s.totalER),
    totalPitchingK: sum(seasons, s => s.totalPitchingK),
    totalPitchingBB: sum(seasons, s => s.totalPitchingBB),
    totalPitchingHBP: sum(seasons, s => s.totalPitchingHBP),
    totalPitchingHR: sum(seasons, s => s.totalPitchingHR),
    collectedAt: Date.now(),
  };
}

// ============================================
// ADAPTIVE STANDARDS ENGINE (MAJ-B9-001)
// ============================================

const ADAPTIVE_DB_NAME = 'kbl-adaptive-standards';
const ADAPTIVE_DB_VERSION = 1;
const STATE_STORE = 'engineState';
const STATE_KEY = 'adaptive-engine-state';

let adaptiveDbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize the adaptive standards IndexedDB.
 */
export async function initAdaptiveDatabase(): Promise<IDBDatabase> {
  if (adaptiveDbPromise) return adaptiveDbPromise;

  adaptiveDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(ADAPTIVE_DB_NAME, ADAPTIVE_DB_VERSION);

    request.onerror = () => {
      adaptiveDbPromise = null;
      reject(request.error);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
  });

  return adaptiveDbPromise;
}

/**
 * Get the current adaptive engine state.
 */
export async function getAdaptiveState(): Promise<AdaptiveEngineState | null> {
  const db = await initAdaptiveDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readonly');
    const store = tx.objectStore(STATE_STORE);
    const request = store.get(STATE_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Save adaptive engine state.
 */
export async function saveAdaptiveState(state: AdaptiveEngineState): Promise<void> {
  const db = await initAdaptiveDatabase();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readwrite');
    const store = tx.objectStore(STATE_STORE);
    const request = store.put(state);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Create initial adaptive engine state with SMB4 defaults.
 */
export function createInitialAdaptiveState(
  seasonId: string,
  seasonGames: number
): AdaptiveEngineState {
  return {
    id: STATE_KEY,
    currentContext: createDefaultLeagueContext(seasonId, seasonGames),
    seasonHistory: [],
    calibrationHistory: [],
    lastCalibratedSeason: 0,
    totalPAAllTime: 0,
  };
}

/**
 * Record a completed season's stats and optionally run calibration.
 * This is the main season-end entry point.
 *
 * Returns the updated state and whether calibration was performed.
 */
export async function recordSeasonAndCalibrate(
  seasonStats: SeasonAggregateStats,
  config: CalibrationConfig = DEFAULT_CALIBRATION_CONFIG
): Promise<{ state: AdaptiveEngineState; calibrated: boolean }> {
  let state = await getAdaptiveState();

  if (!state) {
    state = createInitialAdaptiveState(
      seasonStats.seasonId,
      seasonStats.gamesPerTeam
    );
  }

  // Add to history
  state.seasonHistory.push(seasonStats);
  state.totalPAAllTime += seasonStats.totalPA;

  const seasonCount = state.seasonHistory.length;
  let calibrated = false;

  // Check if we should calibrate
  if (shouldCalibrate(seasonCount, state.totalPAAllTime, config)) {
    // Aggregate all seasons
    const aggregated = aggregateSeasonStats(state.seasonHistory);

    // Run calibration
    const previousContext = { ...state.currentContext };
    const newContext = calibrateLeagueContext(aggregated, state.currentContext, config);

    // Record calibration
    const record: CalibrationRecord = {
      id: `calibration-${seasonStats.seasonId}`,
      seasonId: seasonStats.seasonId,
      calibratedAt: Date.now(),
      seasonCount,
      totalPASampled: state.totalPAAllTime,
      previousContext,
      newContext,
      config,
    };

    state.currentContext = newContext;
    state.calibrationHistory.push(record);
    state.lastCalibratedSeason = seasonStats.seasonNumber;
    calibrated = true;
  }

  // Persist
  await saveAdaptiveState(state);

  return { state, calibrated };
}

/**
 * Get the current league context (from DB or defaults).
 */
export async function getCurrentLeagueContext(
  fallbackSeasonId: string = 'default',
  fallbackSeasonGames: number = SMB4_BASELINES.gamesPerTeam
): Promise<LeagueContext> {
  const state = await getAdaptiveState();
  if (state) return state.currentContext;
  return createDefaultLeagueContext(fallbackSeasonId, fallbackSeasonGames);
}

/**
 * Reset the adaptive DB singleton (for testing).
 */
export function resetAdaptiveDb(): void {
  adaptiveDbPromise = null;
}

// ============================================
// HELPERS
// ============================================

function blend(current: number, next: number, weight: number): number {
  return current * (1 - weight) + next * weight;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function sum<T>(arr: T[], fn: (item: T) => number): number {
  return arr.reduce((acc, item) => acc + fn(item), 0);
}
