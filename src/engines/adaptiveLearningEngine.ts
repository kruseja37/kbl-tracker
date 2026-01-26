/**
 * AdaptiveLearningEngine - Fielding inference improvement
 * Per Ralph Framework S-F010
 *
 * Features:
 * - Track inference vs actual fielder
 * - Update probability weights after N>=20 samples
 * - Per-player adjustments for unusual ranges
 */

export interface FieldingEvent {
  eventId: string;
  gameId: string;
  hitZone: string; // e.g., 'CF-deep', 'SS-hole', 'LF-line'
  predictedFielder: string;
  actualFielder: string;
  playerId: string;
  position: string;
  timestamp: number;
}

interface ZoneProbability {
  zone: string;
  positionWeights: Record<string, number>;
  sampleCount: number;
  lastUpdated: number;
}

interface PlayerZoneAdjustment {
  playerId: string;
  playerName: string;
  zone: string;
  adjustmentFactor: number; // >1 = more likely, <1 = less likely
  sampleCount: number;
}

const STORAGE_KEY = 'kbl_adaptive_learning';
const MIN_SAMPLES = 20;
const DEFAULT_CONFIDENCE = 0.6;

// Default zone-to-position probabilities
const DEFAULT_ZONE_WEIGHTS: Record<string, Record<string, number>> = {
  'CF-deep': { CF: 0.70, RF: 0.15, LF: 0.15 },
  'CF-shallow': { CF: 0.50, SS: 0.20, '2B': 0.20, P: 0.10 },
  'LF-line': { LF: 0.80, '3B': 0.15, SS: 0.05 },
  'LF-gap': { LF: 0.60, CF: 0.40 },
  'RF-line': { RF: 0.80, '1B': 0.15, '2B': 0.05 },
  'RF-gap': { RF: 0.60, CF: 0.40 },
  'SS-hole': { SS: 0.70, '3B': 0.20, LF: 0.10 },
  '2B-hole': { '2B': 0.70, SS: 0.15, '1B': 0.15 },
  'P-range': { P: 0.60, '1B': 0.20, '3B': 0.20 },
  'C-range': { C: 0.90, P: 0.10 },
  '1B-range': { '1B': 0.85, '2B': 0.10, P: 0.05 },
  '3B-range': { '3B': 0.85, SS: 0.10, P: 0.05 },
};

export function getZoneProbabilities(): Record<string, ZoneProbability> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY + '_zones');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading zone probabilities:', e);
  }

  // Initialize with defaults
  const initial: Record<string, ZoneProbability> = {};
  for (const [zone, weights] of Object.entries(DEFAULT_ZONE_WEIGHTS)) {
    initial[zone] = {
      zone,
      positionWeights: { ...weights },
      sampleCount: 0,
      lastUpdated: Date.now(),
    };
  }
  return initial;
}

function saveZoneProbabilities(probs: Record<string, ZoneProbability>): void {
  try {
    localStorage.setItem(STORAGE_KEY + '_zones', JSON.stringify(probs));
  } catch (e) {
    console.error('Error saving zone probabilities:', e);
  }
}

export function getPlayerAdjustments(): PlayerZoneAdjustment[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY + '_players');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading player adjustments:', e);
  }
  return [];
}

function savePlayerAdjustments(adjustments: PlayerZoneAdjustment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY + '_players', JSON.stringify(adjustments));
  } catch (e) {
    console.error('Error saving player adjustments:', e);
  }
}

export function recordFieldingEvent(event: FieldingEvent): void {
  // Store event
  const events = getFieldingEvents();
  events.push(event);

  // Keep last 1000 events
  if (events.length > 1000) {
    events.splice(0, events.length - 1000);
  }

  try {
    localStorage.setItem(STORAGE_KEY + '_events', JSON.stringify(events));
  } catch (e) {
    console.error('Error saving fielding event:', e);
  }

  // Check if we should update probabilities
  updateProbabilitiesIfNeeded(event.hitZone);
  updatePlayerAdjustmentsIfNeeded(event.playerId, event.hitZone);
}

function getFieldingEvents(): FieldingEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY + '_events');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading fielding events:', e);
  }
  return [];
}

function updateProbabilitiesIfNeeded(zone: string): void {
  const events = getFieldingEvents().filter((e) => e.hitZone === zone);

  if (events.length < MIN_SAMPLES) {
    return;
  }

  // Calculate actual distribution
  const positionCounts: Record<string, number> = {};
  let total = 0;

  for (const event of events) {
    const pos = event.position;
    positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    total++;
  }

  // Convert to weights
  const newWeights: Record<string, number> = {};
  for (const [pos, count] of Object.entries(positionCounts)) {
    newWeights[pos] = count / total;
  }

  // Blend with existing (70% new, 30% old for smoothing)
  const probs = getZoneProbabilities();
  const existing = probs[zone]?.positionWeights || DEFAULT_ZONE_WEIGHTS[zone] || {};

  const blended: Record<string, number> = {};
  const allPositions = new Set([...Object.keys(existing), ...Object.keys(newWeights)]);

  for (const pos of allPositions) {
    const oldWeight = existing[pos] || 0;
    const newWeight = newWeights[pos] || 0;
    blended[pos] = oldWeight * 0.3 + newWeight * 0.7;
  }

  // Normalize
  const sum = Object.values(blended).reduce((a, b) => a + b, 0);
  for (const pos of Object.keys(blended)) {
    blended[pos] = blended[pos] / sum;
  }

  probs[zone] = {
    zone,
    positionWeights: blended,
    sampleCount: events.length,
    lastUpdated: Date.now(),
  };

  saveZoneProbabilities(probs);
}

function updatePlayerAdjustmentsIfNeeded(playerId: string, zone: string): void {
  const playerEvents = getFieldingEvents().filter(
    (e) => e.playerId === playerId && e.hitZone === zone
  );

  if (playerEvents.length < MIN_SAMPLES) {
    return;
  }

  // Calculate how often this player makes plays in this zone vs expected
  const zoneProbs = getZoneProbabilities()[zone];
  if (!zoneProbs) return;

  const playerPosition = playerEvents[0]?.position;
  if (!playerPosition) return;

  const expectedRate = zoneProbs.positionWeights[playerPosition] || 0.1;
  const actualRate = playerEvents.length / getFieldingEvents().filter((e) => e.hitZone === zone).length;

  const adjustmentFactor = actualRate / Math.max(expectedRate, 0.01);

  // Update or create adjustment
  const adjustments = getPlayerAdjustments();
  const existingIndex = adjustments.findIndex(
    (a) => a.playerId === playerId && a.zone === zone
  );

  const newAdjustment: PlayerZoneAdjustment = {
    playerId,
    playerName: '', // Would be filled from player data
    zone,
    adjustmentFactor: Math.max(0.5, Math.min(2.0, adjustmentFactor)),
    sampleCount: playerEvents.length,
  };

  if (existingIndex >= 0) {
    adjustments[existingIndex] = newAdjustment;
  } else {
    adjustments.push(newAdjustment);
  }

  savePlayerAdjustments(adjustments);
}

export function predictFielder(
  zone: string,
  availableFielders: { playerId: string; position: string }[]
): { playerId: string; position: string; confidence: number } | null {
  if (availableFielders.length === 0) return null;

  const probs = getZoneProbabilities()[zone];
  const weights = probs?.positionWeights || DEFAULT_ZONE_WEIGHTS[zone];

  if (!weights) {
    // Unknown zone, return first available
    return { ...availableFielders[0], confidence: DEFAULT_CONFIDENCE };
  }

  // Get player adjustments
  const adjustments = getPlayerAdjustments();

  // Score each fielder
  let bestFielder = availableFielders[0];
  let bestScore = 0;

  for (const fielder of availableFielders) {
    let score = weights[fielder.position] || 0;

    // Apply player-specific adjustment
    const playerAdj = adjustments.find(
      (a) => a.playerId === fielder.playerId && a.zone === zone
    );
    if (playerAdj) {
      score *= playerAdj.adjustmentFactor;
    }

    if (score > bestScore) {
      bestScore = score;
      bestFielder = fielder;
    }
  }

  const hasLearned = probs && probs.sampleCount >= MIN_SAMPLES;
  const confidence = hasLearned ? Math.min(0.95, bestScore + 0.1) : DEFAULT_CONFIDENCE;

  return { ...bestFielder, confidence };
}

export function getInferenceAccuracy(): { correct: number; total: number; rate: number } {
  const events = getFieldingEvents();
  const correct = events.filter((e) => e.predictedFielder === e.actualFielder).length;
  const total = events.length;
  const rate = total > 0 ? correct / total : 0;

  return { correct, total, rate };
}

export function clearLearningData(): void {
  localStorage.removeItem(STORAGE_KEY + '_zones');
  localStorage.removeItem(STORAGE_KEY + '_players');
  localStorage.removeItem(STORAGE_KEY + '_events');
}
