/**
 * Adaptive Learning Engine - Fielding Inference Improvement
 *
 * Per INFERENTIAL_LOGIC_GAP_ANALYSIS.md - ported from src/engines/adaptiveLearningEngine.ts
 *
 * Features:
 * - Track inference vs actual fielder selections
 * - Update probability weights after N>=20 samples
 * - Per-player adjustments for unusual ranges
 * - Persist learning to localStorage
 */

import type { FieldCoordinate, SpraySector } from '../components/FieldCanvas';
import { getSpraySector } from '../components/FieldCanvas';
import type { ExitType, Direction, Position } from '../components/fielderInference';
import { inferDirection, POSITION_MAP } from '../components/fielderInference';

// ============================================
// TYPES
// ============================================

export interface FieldingEvent {
  /** Unique event ID */
  eventId: string;
  /** Game ID this event belongs to */
  gameId: string;
  /** Hit zone identifier (e.g., 'CF-deep', 'SS-hole') */
  hitZone: string;
  /** Direction of the hit */
  direction: Direction;
  /** Exit type (ground, fly, line, pop) */
  exitType: ExitType;
  /** What the system predicted */
  predictedFielder: number;
  /** What the user actually selected */
  actualFielder: number;
  /** Was the prediction correct? */
  wasCorrect: boolean;
  /** Was this an override (user changed from prediction)? */
  wasOverridden: boolean;
  /** Normalized ball location */
  ballLocation: FieldCoordinate;
  /** Timestamp of event */
  timestamp: number;

  // ============================================
  // LEVERAGE INDEX CONTEXT (per LEVERAGE_INDEX_SPEC.md)
  // ============================================

  /** Leverage Index at time of play (0.1-10.0) */
  leverageIndex?: number;
  /** LI category: LOW, MEDIUM, HIGH, EXTREME */
  leverageCategory?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  /** Whether this was a clutch situation (LI >= 1.5) */
  isClutchSituation?: boolean;
  /** Game situation snapshot */
  gameSituation?: {
    inning: number;
    isTop: boolean;
    outs: number;
    bases: { first: boolean; second: boolean; third: boolean };
    homeScore: number;
    awayScore: number;
  };
}

export interface ZoneProbability {
  zone: string;
  positionWeights: Record<number, number>; // Position number → probability
  sampleCount: number;
  lastUpdated: number;
}

export interface LearningStats {
  totalEvents: number;
  correctPredictions: number;
  overriddenPredictions: number;
  accuracyRate: number;
  lastUpdated: number;
}

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'kbl_adaptive_learning_v2';
const MIN_SAMPLES = 20; // Minimum samples before updating weights
const DEFAULT_CONFIDENCE = 0.6;
const MAX_EVENTS = 1000; // Keep last N events

// Default zone-to-position probabilities
// Zone format: "{sector}-{depth}" e.g., "CF-deep", "SS-shallow"
const DEFAULT_ZONE_WEIGHTS: Record<string, Record<number, number>> = {
  // Center field zones
  'CF-deep': { 8: 0.85, 7: 0.08, 9: 0.07 },
  'CF-wall': { 8: 0.90, 7: 0.05, 9: 0.05 },
  'CF-shallow': { 8: 0.50, 6: 0.25, 4: 0.15, 1: 0.10 },

  // Left field zones
  'LF-deep': { 7: 0.80, 8: 0.15, 6: 0.05 },
  'LF-wall': { 7: 0.90, 8: 0.10 },
  'LF-shallow': { 7: 0.60, 6: 0.25, 5: 0.15 },
  'LCF-deep': { 8: 0.55, 7: 0.40, 6: 0.05 },
  'LCF-shallow': { 8: 0.40, 7: 0.30, 6: 0.20, 5: 0.10 },

  // Right field zones
  'RF-deep': { 9: 0.80, 8: 0.15, 4: 0.05 },
  'RF-wall': { 9: 0.90, 8: 0.10 },
  'RF-shallow': { 9: 0.60, 4: 0.25, 3: 0.15 },
  'RCF-deep': { 8: 0.55, 9: 0.40, 4: 0.05 },
  'RCF-shallow': { 8: 0.40, 9: 0.30, 4: 0.20, 3: 0.10 },

  // Infield zones
  'IF_L-ground': { 5: 0.70, 6: 0.20, 1: 0.10 },
  'IF_M-ground': { 1: 0.50, 6: 0.25, 4: 0.25 },
  'IF_R-ground': { 3: 0.60, 4: 0.25, 1: 0.15 },
  'IF_L-popup': { 5: 0.60, 6: 0.30, 2: 0.10 },
  'IF_M-popup': { 6: 0.40, 4: 0.35, 1: 0.15, 2: 0.10 },
  'IF_R-popup': { 3: 0.50, 4: 0.35, 2: 0.15 },
};

// ============================================
// STORAGE FUNCTIONS
// ============================================

function getStorageData(): {
  events: FieldingEvent[];
  zones: Record<string, ZoneProbability>;
  stats: LearningStats;
} {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('[AdaptiveLearning] Error loading data:', e);
  }

  // Return defaults
  return {
    events: [],
    zones: {},
    stats: {
      totalEvents: 0,
      correctPredictions: 0,
      overriddenPredictions: 0,
      accuracyRate: 0,
      lastUpdated: Date.now(),
    },
  };
}

function saveStorageData(data: {
  events: FieldingEvent[];
  zones: Record<string, ZoneProbability>;
  stats: LearningStats;
}): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[AdaptiveLearning] Error saving data:', e);
  }
}

// ============================================
// ZONE IDENTIFICATION
// ============================================

/**
 * Build a zone identifier from location and exit type
 * Format: "{sector}-{depth}" e.g., "CF-deep", "IF_L-ground"
 */
export function buildHitZone(
  location: FieldCoordinate,
  exitType: ExitType
): string {
  const sector = getSpraySector(location.x, location.y);

  // Map depth to zone suffix
  let depthSuffix: string;
  if (sector.depth === 'infield') {
    // For infield, use exit type
    depthSuffix = exitType === 'Ground' ? 'ground' : 'popup';
  } else if (sector.depth === 'wall' || sector.depth === 'stands') {
    depthSuffix = 'wall';
  } else if (sector.depth === 'deep_outfield') {
    depthSuffix = 'deep';
  } else {
    depthSuffix = 'shallow';
  }

  return `${sector.sector}-${depthSuffix}`;
}

// ============================================
// RECORDING EVENTS
// ============================================

/**
 * Record a fielding event for learning
 * Call this after every play where a fielder was involved
 *
 * @param gameId - Unique game identifier
 * @param location - Normalized ball location (0-1 coordinate system)
 * @param exitType - How the ball left the bat (Ground, Fly Ball, etc.)
 * @param predictedFielder - Position number system predicted
 * @param actualFielder - Position number user selected
 * @param liContext - Optional leverage index context for clutch analysis
 */
export function recordFieldingEvent(
  gameId: string,
  location: FieldCoordinate,
  exitType: ExitType,
  predictedFielder: number,
  actualFielder: number,
  liContext?: {
    leverageIndex: number;
    leverageCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    isClutchSituation: boolean;
    gameSituation?: {
      inning: number;
      isTop: boolean;
      outs: number;
      bases: { first: boolean; second: boolean; third: boolean };
      homeScore: number;
      awayScore: number;
    };
  }
): void {
  const data = getStorageData();
  const sector = getSpraySector(location.x, location.y);
  const direction = inferDirection(sector);
  const hitZone = buildHitZone(location, exitType);

  const wasCorrect = predictedFielder === actualFielder;
  const wasOverridden = !wasCorrect;

  const event: FieldingEvent = {
    eventId: `${gameId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    gameId,
    hitZone,
    direction,
    exitType,
    predictedFielder,
    actualFielder,
    wasCorrect,
    wasOverridden,
    ballLocation: location,
    timestamp: Date.now(),
    // LI context (if provided)
    ...(liContext && {
      leverageIndex: liContext.leverageIndex,
      leverageCategory: liContext.leverageCategory,
      isClutchSituation: liContext.isClutchSituation,
      gameSituation: liContext.gameSituation,
    }),
  };

  // Add event
  data.events.push(event);

  // Keep only last N events
  if (data.events.length > MAX_EVENTS) {
    data.events = data.events.slice(-MAX_EVENTS);
  }

  // Update stats
  data.stats.totalEvents++;
  if (wasCorrect) data.stats.correctPredictions++;
  if (wasOverridden) data.stats.overriddenPredictions++;
  data.stats.accuracyRate = data.stats.correctPredictions / data.stats.totalEvents;
  data.stats.lastUpdated = Date.now();

  // Check if we should update zone probabilities
  const zoneEvents = data.events.filter(e => e.hitZone === hitZone);
  if (zoneEvents.length >= MIN_SAMPLES) {
    updateZoneProbabilities(data, hitZone, zoneEvents);
  }

  saveStorageData(data);

  console.log(`[AdaptiveLearning] Recorded event: zone=${hitZone}, predicted=${predictedFielder}, actual=${actualFielder}, correct=${wasCorrect}`);
}

/**
 * Update zone probabilities based on accumulated events
 */
function updateZoneProbabilities(
  data: { zones: Record<string, ZoneProbability> },
  zone: string,
  events: FieldingEvent[]
): void {
  // Calculate actual distribution
  const positionCounts: Record<number, number> = {};
  let total = 0;

  for (const event of events) {
    const pos = event.actualFielder;
    positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    total++;
  }

  // Convert to weights
  const newWeights: Record<number, number> = {};
  for (const [pos, count] of Object.entries(positionCounts)) {
    newWeights[parseInt(pos)] = count / total;
  }

  // Blend with existing (70% new, 30% old for smoothing)
  const existing = data.zones[zone]?.positionWeights || DEFAULT_ZONE_WEIGHTS[zone] || {};
  const blended: Record<number, number> = {};

  const allPositions = new Set([
    ...Object.keys(existing).map(k => parseInt(k)),
    ...Object.keys(newWeights).map(k => parseInt(k)),
  ]);

  for (const pos of allPositions) {
    const oldWeight = existing[pos] || 0;
    const newWeight = newWeights[pos] || 0;
    blended[pos] = oldWeight * 0.3 + newWeight * 0.7;
  }

  // Normalize
  const sum = Object.values(blended).reduce((a, b) => a + b, 0);
  for (const pos of Object.keys(blended)) {
    blended[parseInt(pos)] = blended[parseInt(pos)] / sum;
  }

  data.zones[zone] = {
    zone,
    positionWeights: blended,
    sampleCount: events.length,
    lastUpdated: Date.now(),
  };

  console.log(`[AdaptiveLearning] Updated zone probabilities for ${zone}:`, blended);
}

// ============================================
// PREDICTION
// ============================================

/**
 * Predict most likely fielder for a location using learned probabilities
 */
export function predictFielder(
  location: FieldCoordinate,
  exitType: ExitType
): { fielder: number; confidence: number; isLearned: boolean } {
  const data = getStorageData();
  const hitZone = buildHitZone(location, exitType);

  // Try to get learned probabilities
  const zoneProbability = data.zones[hitZone];
  const weights = zoneProbability?.positionWeights || DEFAULT_ZONE_WEIGHTS[hitZone];

  if (!weights) {
    // No data for this zone - return default CF with low confidence
    return { fielder: 8, confidence: DEFAULT_CONFIDENCE, isLearned: false };
  }

  // Find highest probability position
  let bestFielder = 8; // Default to CF
  let bestWeight = 0;

  for (const [pos, weight] of Object.entries(weights)) {
    if (weight > bestWeight) {
      bestWeight = weight;
      bestFielder = parseInt(pos);
    }
  }

  const isLearned = zoneProbability && zoneProbability.sampleCount >= MIN_SAMPLES;
  const confidence = isLearned
    ? Math.min(0.95, bestWeight + 0.1)
    : Math.min(0.85, bestWeight);

  return { fielder: bestFielder, confidence, isLearned };
}

// ============================================
// STATS & ANALYTICS
// ============================================

/**
 * Get overall inference accuracy stats
 */
export function getInferenceAccuracy(): LearningStats {
  return getStorageData().stats;
}

/**
 * Get accuracy breakdown by zone
 */
export function getZoneAccuracy(): Record<string, { correct: number; total: number; rate: number }> {
  const data = getStorageData();
  const byZone: Record<string, { correct: number; total: number }> = {};

  for (const event of data.events) {
    if (!byZone[event.hitZone]) {
      byZone[event.hitZone] = { correct: 0, total: 0 };
    }
    byZone[event.hitZone].total++;
    if (event.wasCorrect) {
      byZone[event.hitZone].correct++;
    }
  }

  const result: Record<string, { correct: number; total: number; rate: number }> = {};
  for (const [zone, stats] of Object.entries(byZone)) {
    result[zone] = {
      ...stats,
      rate: stats.total > 0 ? stats.correct / stats.total : 0,
    };
  }

  return result;
}

/**
 * Get recent override patterns (what the system got wrong)
 */
export function getOverridePatterns(): Array<{
  zone: string;
  predicted: number;
  actual: number;
  count: number;
}> {
  const data = getStorageData();
  const patterns: Record<string, { predicted: number; actual: number; count: number }> = {};

  for (const event of data.events) {
    if (event.wasOverridden) {
      const key = `${event.hitZone}:${event.predictedFielder}:${event.actualFielder}`;
      if (!patterns[key]) {
        patterns[key] = {
          predicted: event.predictedFielder,
          actual: event.actualFielder,
          count: 0,
        };
      }
      patterns[key].count++;
    }
  }

  return Object.entries(patterns)
    .map(([key, pattern]) => ({
      zone: key.split(':')[0],
      ...pattern,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Clear all learning data (reset to defaults)
 */
export function clearLearningData(): void {
  localStorage.removeItem(STORAGE_KEY);
  console.log('[AdaptiveLearning] All learning data cleared');
}

/**
 * Export learning data for backup/analysis
 */
export function exportLearningData(): string {
  const data = getStorageData();
  return JSON.stringify(data, null, 2);
}

/**
 * Import learning data from backup
 */
export function importLearningData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.events && data.zones && data.stats) {
      saveStorageData(data);
      console.log('[AdaptiveLearning] Learning data imported successfully');
      return true;
    }
    return false;
  } catch (e) {
    console.error('[AdaptiveLearning] Error importing data:', e);
    return false;
  }
}
