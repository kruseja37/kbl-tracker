/**
 * Field Zone Definitions & Mapping Functions
 * Per FIELD_ZONE_INPUT_SPEC.md
 *
 * 25-zone system: 18 fair territory (Z00-Z17) + 7 foul territory (F00-F06)
 * Normalized coordinate system (0-100 for both axes)
 * Home plate at (50, 95), center field at (50, 5)
 */

import type { Position, BatterHand } from '../types/game';

// ============================================
// ZONE TYPES
// ============================================

export type ZoneArea =
  | 'infield' | 'shallow_outfield' | 'deep_outfield' | 'wall'
  | 'foul_shallow' | 'foul_medium' | 'foul_deep' | 'foul_catcher';

export type FoulSide = 'left' | 'right' | 'back';

export type ZoneDepth =
  | 'infield' | 'shallow' | 'medium' | 'deep'
  | 'foul_shallow' | 'foul_medium' | 'foul_deep' | 'foul_catcher';

export type SprayDirection =
  | 'pull' | 'pull_center' | 'center' | 'oppo_center' | 'oppo'
  | 'foul_left' | 'foul_right' | 'foul_back';

export type RawDirection =
  | 'left' | 'center_left' | 'center' | 'center_right' | 'right'
  | 'foul_left' | 'foul_right' | 'foul_back';

export interface FieldZone {
  id: string;
  name: string;
  area: ZoneArea;
  position: Position;
  isFoul: boolean;
  foulSide?: FoulSide;
}

export interface ZoneTapResult {
  zoneId: string;
  zoneName: string;
  direction: SprayDirection;
  depth: ZoneDepth;
  likelyFielder: Position;
  area: ZoneArea;
  isFoul: boolean;
  foulSide: FoulSide | null;
  isInfield: boolean;
  isWall: boolean;
}

// ============================================
// ZONE DEFINITIONS
// ============================================

export const FIELD_ZONES: Record<string, FieldZone> = {
  // Fair Territory (Z00-Z17)
  Z00: { id: 'Z00', name: 'Pitcher', area: 'infield', position: 'P', isFoul: false },
  Z01: { id: 'Z01', name: '1B Area', area: 'infield', position: '1B', isFoul: false },
  Z02: { id: 'Z02', name: '2B Area', area: 'infield', position: '2B', isFoul: false },
  Z03: { id: 'Z03', name: 'SS Area', area: 'infield', position: 'SS', isFoul: false },
  Z04: { id: 'Z04', name: '3B Area', area: 'infield', position: '3B', isFoul: false },
  Z05: { id: 'Z05', name: 'Shallow RF', area: 'shallow_outfield', position: 'RF', isFoul: false },
  Z06: { id: 'Z06', name: 'Shallow CF', area: 'shallow_outfield', position: 'CF', isFoul: false },
  Z07: { id: 'Z07', name: 'Shallow LF', area: 'shallow_outfield', position: 'LF', isFoul: false },
  Z08: { id: 'Z08', name: 'Deep RF', area: 'deep_outfield', position: 'RF', isFoul: false },
  Z09: { id: 'Z09', name: 'Deep RCF', area: 'deep_outfield', position: 'CF', isFoul: false },
  Z10: { id: 'Z10', name: 'Deep CF', area: 'deep_outfield', position: 'CF', isFoul: false },
  Z11: { id: 'Z11', name: 'Deep LCF', area: 'deep_outfield', position: 'CF', isFoul: false },
  Z12: { id: 'Z12', name: 'Deep LF', area: 'deep_outfield', position: 'LF', isFoul: false },
  Z13: { id: 'Z13', name: 'RF Wall', area: 'wall', position: 'RF', isFoul: false },
  Z14: { id: 'Z14', name: 'RCF Wall', area: 'wall', position: 'CF', isFoul: false },
  Z15: { id: 'Z15', name: 'CF Wall', area: 'wall', position: 'CF', isFoul: false },
  Z16: { id: 'Z16', name: 'LCF Wall', area: 'wall', position: 'CF', isFoul: false },
  Z17: { id: 'Z17', name: 'LF Wall', area: 'wall', position: 'LF', isFoul: false },
  // Foul Territory (F00-F06)
  F00: { id: 'F00', name: 'RF Foul Deep', area: 'foul_deep', position: 'RF', isFoul: true, foulSide: 'right' },
  F01: { id: 'F01', name: 'RF Foul Medium', area: 'foul_medium', position: 'RF', isFoul: true, foulSide: 'right' },
  F02: { id: 'F02', name: 'RF Foul Shallow', area: 'foul_shallow', position: '1B', isFoul: true, foulSide: 'right' },
  F03: { id: 'F03', name: 'LF Foul Shallow', area: 'foul_shallow', position: '3B', isFoul: true, foulSide: 'left' },
  F04: { id: 'F04', name: 'LF Foul Medium', area: 'foul_medium', position: 'LF', isFoul: true, foulSide: 'left' },
  F05: { id: 'F05', name: 'LF Foul Deep', area: 'foul_deep', position: 'LF', isFoul: true, foulSide: 'left' },
  F06: { id: 'F06', name: 'Catcher Foul', area: 'foul_catcher', position: 'C', isFoul: true, foulSide: 'back' },
};

// ============================================
// ZONE POLYGON PATHS (SVG, normalized 0-100)
// ============================================

export const ZONE_POLYGONS: Record<string, string> = {
  // ============================================
  // INFIELD ZONES - Tessellated, no gaps
  // Home plate at (50,92), foul lines radiate to corners
  // Infield ends at roughly y=48 (grass/dirt boundary)
  // Foul lines: left goes to (0,5), right goes to (100,5)
  // At y=48: left foul line x≈26, right foul line x≈74
  // At y=70: left foul line x≈38, right foul line x≈62 (approx)
  // ============================================

  // Z00 - Pitcher/mound area (center of infield diamond)
  Z00: 'M 44,72 L 50,66 L 56,72 L 56,60 L 50,54 L 44,60 Z',

  // Z01 - 1B area (right side infield, from 1B line to right foul)
  Z01: 'M 56,72 L 65,80 L 75,68 L 68,55 L 62,48 L 56,60 Z',

  // Z02 - 2B area (right-center infield, between pitcher and 1B/RF gap)
  Z02: 'M 56,60 L 62,48 L 55,42 L 50,48 L 50,54 Z',

  // Z03 - SS area (left-center infield, between pitcher and 3B/LF gap)
  Z03: 'M 44,60 L 50,54 L 50,48 L 45,42 L 38,48 Z',

  // Z04 - 3B area (left side infield, from 3B line to left foul)
  Z04: 'M 44,72 L 44,60 L 38,48 L 32,55 L 25,68 L 35,80 Z',

  // ============================================
  // SHALLOW OUTFIELD ZONES - Connect to infield at y≈48
  // Extend to y≈30 (shallow-deep boundary)
  // ============================================

  // Z05 - Shallow RF
  Z05: 'M 68,55 L 75,68 L 88,50 L 80,38 L 67,30 L 62,48 Z',

  // Z06 - Shallow CF (wide, covers center)
  Z06: 'M 62,48 L 67,30 L 50,22 L 33,30 L 38,48 L 45,42 L 50,48 L 55,42 Z',

  // Z07 - Shallow LF
  Z07: 'M 38,48 L 33,30 L 20,38 L 12,50 L 25,68 L 32,55 Z',

  // ============================================
  // DEEP OUTFIELD ZONES - Connect to shallow at y≈30
  // Extend to y≈15 (deep-wall boundary)
  // ============================================

  // Z08 - Deep RF
  Z08: 'M 80,38 L 88,50 L 95,32 L 88,18 L 75,15 L 67,30 Z',

  // Z09 - Deep RCF
  Z09: 'M 67,30 L 75,15 L 60,10 L 55,22 L 50,22 Z',

  // Z10 - Deep CF
  Z10: 'M 55,22 L 60,10 L 40,10 L 45,22 L 50,22 Z',

  // Z11 - Deep LCF
  Z11: 'M 50,22 L 45,22 L 40,10 L 25,15 L 33,30 Z',

  // Z12 - Deep LF
  Z12: 'M 33,30 L 25,15 L 12,18 L 5,32 L 12,50 Z',

  // ============================================
  // WALL ZONES - Connect to deep outfield at y≈15
  // Extend to top of field (y≈3)
  // ============================================

  // Z13 - RF Wall
  Z13: 'M 88,18 L 95,32 L 98,18 L 92,8 L 75,15 Z',

  // Z14 - RCF Wall
  Z14: 'M 75,15 L 92,8 L 70,3 L 60,10 Z',

  // Z15 - CF Wall
  Z15: 'M 60,10 L 70,3 L 30,3 L 40,10 Z',

  // Z16 - LCF Wall
  Z16: 'M 40,10 L 30,3 L 8,8 L 25,15 Z',

  // Z17 - LF Wall
  Z17: 'M 25,15 L 8,8 L 2,18 L 5,32 L 12,18 Z',

  // ============================================
  // FOUL TERRITORY - Outside foul lines
  // Right foul line: (50,92) → (100,5) approx
  // Left foul line: (50,92) → (0,5) approx
  // ============================================

  // F00 - RF Foul Deep (beyond wall, right side)
  F00: 'M 98,18 L 100,3 L 100,22 Z',

  // F01 - RF Foul Medium (right side, outfield depth)
  F01: 'M 88,50 L 95,32 L 98,18 L 100,22 L 100,55 Z',

  // F02 - RF Foul Shallow (right side, infield depth to home)
  F02: 'M 65,80 L 75,68 L 88,50 L 100,55 L 100,92 L 80,92 Z',

  // F03 - LF Foul Shallow (left side, infield depth to home)
  F03: 'M 35,80 L 25,68 L 12,50 L 0,55 L 0,92 L 20,92 Z',

  // F04 - LF Foul Medium (left side, outfield depth)
  F04: 'M 12,50 L 5,32 L 2,18 L 0,22 L 0,55 Z',

  // F05 - LF Foul Deep (beyond wall, left side)
  F05: 'M 2,18 L 0,3 L 0,22 Z',

  // F06 - Catcher/backstop foul (behind home plate)
  F06: 'M 20,92 L 35,80 L 44,72 L 50,66 L 56,72 L 65,80 L 80,92 L 100,92 L 100,100 L 0,100 L 0,92 Z',
};

// ============================================
// ZONE CENTERS (for nearest-zone fallback)
// ============================================

export const ZONE_CENTERS: Record<string, { x: number; y: number }> = {
  // Infield
  Z00: { x: 50, y: 63 },
  Z01: { x: 64, y: 64 },
  Z02: { x: 55, y: 50 },
  Z03: { x: 45, y: 50 },
  Z04: { x: 36, y: 64 },
  // Shallow outfield
  Z05: { x: 74, y: 48 },
  Z06: { x: 50, y: 38 },
  Z07: { x: 26, y: 48 },
  // Deep outfield
  Z08: { x: 83, y: 30 },
  Z09: { x: 62, y: 20 },
  Z10: { x: 50, y: 17 },
  Z11: { x: 38, y: 20 },
  Z12: { x: 17, y: 30 },
  // Wall
  Z13: { x: 90, y: 16 },
  Z14: { x: 74, y: 9 },
  Z15: { x: 50, y: 7 },
  Z16: { x: 26, y: 9 },
  Z17: { x: 10, y: 16 },
  // Foul
  F00: { x: 99, y: 14 },
  F01: { x: 96, y: 38 },
  F02: { x: 88, y: 72 },
  F03: { x: 12, y: 72 },
  F04: { x: 4, y: 38 },
  F05: { x: 1, y: 14 },
  F06: { x: 50, y: 92 },
};

// ============================================
// ZONE → DIRECTION MAPPING
// ============================================

const ZONE_TO_RAW_DIRECTION: Record<string, RawDirection> = {
  // Right side of field
  Z01: 'right', Z05: 'right', Z08: 'right', Z13: 'right',
  Z02: 'center_right', Z09: 'center_right', Z14: 'center_right',
  // Center
  Z00: 'center', Z06: 'center', Z10: 'center', Z15: 'center',
  // Left side of field
  Z03: 'center_left', Z11: 'center_left', Z16: 'center_left',
  Z04: 'left', Z07: 'left', Z12: 'left', Z17: 'left',
  // Foul territory
  F00: 'foul_right', F01: 'foul_right', F02: 'foul_right',
  F03: 'foul_left', F04: 'foul_left', F05: 'foul_left',
  F06: 'foul_back',
};

const LEFT_HAND_MAP: Record<string, SprayDirection> = {
  right: 'pull',
  center_right: 'pull_center',
  center: 'center',
  center_left: 'oppo_center',
  left: 'oppo',
};

const RIGHT_HAND_MAP: Record<string, SprayDirection> = {
  left: 'pull',
  center_left: 'pull_center',
  center: 'center',
  center_right: 'oppo_center',
  right: 'oppo',
};

export function getDirectionFromZone(zoneId: string, batterHand: BatterHand): SprayDirection {
  const raw = ZONE_TO_RAW_DIRECTION[zoneId] || 'center';

  // Foul zones don't convert to pull/oppo
  if (raw.startsWith('foul_')) {
    return raw as SprayDirection;
  }

  if (batterHand === 'L') {
    return LEFT_HAND_MAP[raw] || 'center';
  }
  // Default to right-handed for 'R' and 'S' (switch)
  return RIGHT_HAND_MAP[raw] || 'center';
}

// ============================================
// ZONE → DEPTH MAPPING
// ============================================

const ZONE_TO_DEPTH: Record<string, ZoneDepth> = {
  Z00: 'infield', Z01: 'infield', Z02: 'infield', Z03: 'infield', Z04: 'infield',
  Z05: 'shallow', Z06: 'shallow', Z07: 'shallow',
  Z08: 'medium', Z09: 'medium', Z10: 'medium', Z11: 'medium', Z12: 'medium',
  Z13: 'deep', Z14: 'deep', Z15: 'deep', Z16: 'deep', Z17: 'deep',
  F00: 'foul_deep', F01: 'foul_medium', F02: 'foul_shallow',
  F03: 'foul_shallow', F04: 'foul_medium', F05: 'foul_deep',
  F06: 'foul_catcher',
};

export function getDepthFromZone(zoneId: string): ZoneDepth {
  return ZONE_TO_DEPTH[zoneId] || 'medium';
}

// ============================================
// COMPLETE ZONE DATA EXPORT
// ============================================

export function getZoneData(zoneId: string, batterHand: BatterHand): ZoneTapResult {
  const zone = FIELD_ZONES[zoneId];
  if (!zone) {
    // Fallback for unknown zones
    return {
      zoneId,
      zoneName: 'Unknown',
      direction: 'center',
      depth: 'medium',
      likelyFielder: 'CF',
      area: 'deep_outfield',
      isFoul: false,
      foulSide: null,
      isInfield: false,
      isWall: false,
    };
  }

  return {
    zoneId,
    zoneName: zone.name,
    direction: getDirectionFromZone(zoneId, batterHand),
    depth: getDepthFromZone(zoneId),
    likelyFielder: zone.position,
    area: zone.area,
    isFoul: zone.isFoul,
    foulSide: zone.foulSide || null,
    isInfield: zone.area === 'infield',
    isWall: zone.area === 'wall',
  };
}

// ============================================
// FIELDER SUGGESTIONS
// ============================================

export function getFielderSuggestions(zoneId: string): Position[] {
  const suggestions: Record<string, Position[]> = {
    Z00: ['P', 'C', '1B', '3B'],
    Z01: ['1B', '2B', 'P'],
    Z02: ['2B', 'SS', '1B'],
    Z03: ['SS', '3B', '2B'],
    Z04: ['3B', 'SS', 'P'],
    Z05: ['RF', '2B', '1B'],
    Z06: ['CF', 'SS', '2B'],
    Z07: ['LF', 'SS', '3B'],
    Z08: ['RF'],
    Z09: ['CF', 'RF'],
    Z10: ['CF'],
    Z11: ['CF', 'LF'],
    Z12: ['LF'],
    Z13: ['RF'],
    Z14: ['CF', 'RF'],
    Z15: ['CF'],
    Z16: ['CF', 'LF'],
    Z17: ['LF'],
    F00: ['RF'],
    F01: ['RF', '1B'],
    F02: ['1B', 'C', '2B'],
    F03: ['3B', 'C', 'SS'],
    F04: ['LF', '3B'],
    F05: ['LF'],
    F06: ['C', 'P', '1B', '3B'],
  };
  return suggestions[zoneId] || ['CF'];
}

// ============================================
// POINT-IN-POLYGON DETECTION
// ============================================

interface Point {
  x: number;
  y: number;
}

/**
 * Parse an SVG path string into an array of points.
 * Only handles M and L commands (which is all our zones use).
 */
function parseSVGPath(path: string): Point[] {
  const points: Point[] = [];
  // Match M or L followed by coordinates
  const regex = /[ML]\s*([\d.]+),([\d.]+)/g;
  let match;
  while ((match = regex.exec(path)) !== null) {
    points.push({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
  }
  return points;
}

/**
 * Ray-casting algorithm for point-in-polygon detection.
 */
function pointInPolygon(point: Point, vertices: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Find which zone contains a given point.
 * Returns zone ID or null if no exact match.
 */
export function findZoneAtPoint(point: Point): string | null {
  for (const [zoneId, path] of Object.entries(ZONE_POLYGONS)) {
    const vertices = parseSVGPath(path);
    if (pointInPolygon(point, vertices)) {
      return zoneId;
    }
  }
  return null;
}

/**
 * Find nearest zone center to a point (fallback when no polygon match).
 */
export function findNearestZone(point: Point): string {
  let nearestZone = 'Z06'; // Default to shallow CF
  let nearestDistance = Infinity;

  for (const [zoneId, center] of Object.entries(ZONE_CENTERS)) {
    const dist = Math.hypot(point.x - center.x, point.y - center.y);
    if (dist < nearestDistance) {
      nearestDistance = dist;
      nearestZone = zoneId;
    }
  }

  return nearestZone;
}

/**
 * Find zone at point with nearest-zone fallback.
 */
export function resolveZoneAtPoint(point: Point): string {
  return findZoneAtPoint(point) || findNearestZone(point);
}

// ============================================
// AREA COLOR MAPPING (for SVG rendering)
// ============================================

export const AREA_COLORS: Record<ZoneArea, { base: string; highlight: string }> = {
  infield: { base: '#8B4513', highlight: '#CD853F' },
  shallow_outfield: { base: '#228B22', highlight: '#32CD32' },
  deep_outfield: { base: '#006400', highlight: '#228B22' },
  wall: { base: '#4169E1', highlight: '#6495ED' },
  foul_shallow: { base: '#A9A9A9', highlight: '#C0C0C0' },
  foul_medium: { base: '#808080', highlight: '#A9A9A9' },
  foul_deep: { base: '#696969', highlight: '#808080' },
  foul_catcher: { base: '#778899', highlight: '#B0C4DE' },
};

// ============================================
// QUICK TAP SHORTCUTS
// ============================================

export interface QuickTapButton {
  id: string;
  label: string;
  zone: string | null;
  special?: string;
}

export const QUICK_TAP_BUTTONS: QuickTapButton[] = [
  { id: 'popup', label: 'POPUP', zone: 'Z00' },
  { id: 'hr_left', label: 'HR L', zone: 'Z17' },
  { id: 'hr_center', label: 'HR C', zone: 'Z15' },
  { id: 'hr_right', label: 'HR R', zone: 'Z13' },
];

// ============================================
// ZONE-TO-CQ INTEGRATION (GAP-B3-025)
// ============================================

/**
 * Get trajectory modifiers (depth/speed) from zone + ball type.
 * Used to enrich contact quality data.
 */
export function getCQTrajectoryFromZone(
  zoneId: string,
  ballType: string,
): Record<string, string> {
  const depth = ZONE_TO_DEPTH[zoneId] || 'medium';

  if (ballType === 'Fly Ball') {
    // Map zone depth to trajectory depth
    if (depth === 'infield' || depth === 'foul_catcher' || depth === 'foul_shallow') {
      return { depth: 'shallow' };
    }
    if (depth === 'shallow') return { depth: 'medium' };
    if (depth === 'medium') return { depth: 'deep' };
    if (depth === 'deep') return { depth: 'deep' };
    return { depth: 'shallow' };
  }

  if (ballType === 'Ground Ball') {
    // Infield grounders are medium speed; through-the-hole (shallow OF) are hard
    if (depth === 'infield') return { speed: 'medium' };
    if (depth === 'shallow') return { speed: 'hard' };
    if (depth === 'medium' || depth === 'deep') return { speed: 'hard' };
    return { speed: 'medium' };
  }

  // Line drives and pop-ups: no trajectory modification
  return {};
}

/**
 * Estimate contact quality (0.0 – 1.0) from zone, ball type, and result.
 */
export function getContactQualityFromZone(
  zoneId: string,
  ballType: string,
  result: string,
): number {
  // Foul zones delegate to dedicated function
  if (zoneId.startsWith('F')) {
    return getFoulContactQuality(zoneId, ballType);
  }

  // HR is always maximum contact quality
  if (result === 'HR') return 1.0;

  // Line drives are always hard contact
  if (ballType === 'Line Drive') return 0.85;

  // Pop ups are always weak contact
  if (ballType === 'Pop Up') return 0.20;

  const depth = ZONE_TO_DEPTH[zoneId] || 'medium';

  if (ballType === 'Fly Ball') {
    if (depth === 'deep') return 0.75;
    if (depth === 'medium') return 0.55;
    if (depth === 'shallow') return 0.35;
    return 0.35; // infield pop fly
  }

  if (ballType === 'Ground Ball') {
    if (depth === 'shallow' || depth === 'medium' || depth === 'deep') return 0.70; // through the hole
    return 0.50; // infield grounder
  }

  return 0.50; // fallback
}

/**
 * Contact quality for foul territory balls.
 */
export function getFoulContactQuality(
  zoneId: string,
  ballType: string,
): number {
  // Line drives in foul territory are still hard contact
  if (ballType === 'Line Drive') return 0.70;

  const zone = FIELD_ZONES[zoneId];
  if (!zone) return 0.25; // unknown foul zone

  switch (zone.area) {
    case 'foul_catcher': return 0.15;
    case 'foul_shallow': return 0.20;
    case 'foul_medium': return 0.35;
    case 'foul_deep': return 0.50;
    default: return 0.25;
  }
}

// ============================================
// SPRAY CHART GENERATION (GAP-B3-026)
// ============================================

/** Color map for spray chart dots by result category */
export const SPRAY_COLORS: Record<string, string> = {
  HR: '#FF4444',
  triple: '#FF8800',
  double: '#FFCC00',
  single: '#44CC44',
  out: '#888888',
  error: '#8844FF',
};

/** Size map for spray chart dots by result category */
export const SPRAY_SIZES: Record<string, number> = {
  HR: 12,
  triple: 10,
  double: 8,
  single: 7,
  out: 6,
  error: 7,
};

/**
 * Generate a spray chart point (normalized 0-1) from a zone ID.
 * When randomize=true, adds small jitter around the zone center.
 */
export function generateSprayPoint(
  zoneId: string,
  randomize: boolean,
): { x: number; y: number } {
  const center = ZONE_CENTERS[zoneId];
  if (!center) return { x: 0.5, y: 0.5 };

  // Normalize from 0-100 to 0-1
  let x = center.x / 100;
  let y = center.y / 100;

  if (randomize) {
    // Add ±3% jitter
    x += (Math.random() - 0.5) * 0.06;
    y += (Math.random() - 0.5) * 0.06;
    // Clamp to [0, 1]
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));
  }

  return { x, y };
}

/** Spray chart entry stored per at-bat */
export interface SprayChartEntry {
  zoneId: string;
  result: string;
  exitType: string;
  isHit: boolean;
  isHR: boolean;
  point: { x: number; y: number };
  batterHand: string;
}

const HIT_RESULTS = new Set(['HR', 'single', 'double', 'triple', '1B', '2B', '3B']);

/**
 * Create a spray chart entry from zone tap + at-bat result.
 */
export function createSprayChartEntry(
  zoneId: string,
  batterHand: string,
  result: string,
  exitType: string,
): SprayChartEntry {
  return {
    zoneId,
    result,
    exitType,
    isHit: HIT_RESULTS.has(result),
    isHR: result === 'HR',
    point: generateSprayPoint(zoneId, true),
    batterHand,
  };
}

// ============================================
// STADIUM SPRAY INTEGRATION (GAP-B3-027)
// ============================================

type StadiumZone =
  | 'LEFT_LINE' | 'LEFT_FIELD' | 'LEFT_CENTER'
  | 'CENTER'
  | 'RIGHT_CENTER' | 'RIGHT_FIELD' | 'RIGHT_LINE';

/**
 * Map a field zone to a coarser stadium spray zone.
 */
const ZONE_TO_STADIUM: Record<string, StadiumZone> = {
  // Wall zones
  Z13: 'RIGHT_LINE',
  Z14: 'RIGHT_CENTER',
  Z15: 'CENTER',
  Z16: 'LEFT_CENTER',
  Z17: 'LEFT_LINE',
  // Deep outfield
  Z08: 'RIGHT_FIELD',
  Z09: 'RIGHT_CENTER',
  Z10: 'CENTER',
  Z11: 'LEFT_CENTER',
  Z12: 'LEFT_FIELD',
  // Shallow outfield
  Z05: 'RIGHT_FIELD',
  Z06: 'CENTER',
  Z07: 'LEFT_FIELD',
  // Infield
  Z00: 'CENTER',
  Z01: 'RIGHT_FIELD',
  Z02: 'RIGHT_CENTER',
  Z03: 'LEFT_CENTER',
  Z04: 'LEFT_FIELD',
  // Foul
  F00: 'RIGHT_LINE',
  F01: 'RIGHT_LINE',
  F02: 'RIGHT_LINE',
  F03: 'LEFT_LINE',
  F04: 'LEFT_LINE',
  F05: 'LEFT_LINE',
  F06: 'CENTER',
};

export function mapToStadiumSprayZone(zoneId: string): StadiumZone {
  return ZONE_TO_STADIUM[zoneId] || 'CENTER';
}

/**
 * Base distances (feet) for HR estimation by zone.
 * Wall zones get park-specific bases; others use a generic default.
 */
const HR_DISTANCE_BASE: Record<string, number> = {
  Z13: 330,  // RF wall (short porch)
  Z14: 370,  // RCF wall
  Z15: 400,  // CF wall
  Z16: 370,  // LCF wall
  Z17: 330,  // LF wall
};

/**
 * Estimate HR distance in feet. Non-HR results return 0.
 */
export function estimateDistance(zoneId: string, result: string): number {
  if (result !== 'HR') return 0;

  const base = HR_DISTANCE_BASE[zoneId] || 370;
  // Add random variance: (random - 0.3) * 60 → range about -18 to +42
  const offset = Math.floor((Math.random() - 0.3) * 60);
  return base + offset;
}

/**
 * Estimate angle in degrees from zone center.
 * 0° = dead center, negative = left, positive = right.
 */
export function estimateAngle(zoneId: string): number {
  const center = ZONE_CENTERS[zoneId];
  if (!center) return 0;

  // Convert x (0-100) to angle: center (50) = 0°, edges = ±45°
  return (center.x - 50) * 0.9;
}

/** Context for a stadium batted ball event */
export interface BattedBallContext {
  gameId: string;
  inning: number;
  batterId: string;
  pitcherId: string;
}

/** Full stadium-spray batted ball event */
export interface StadiumBattedBallEvent {
  gameId: string;
  inning: number;
  batterId: string;
  pitcherId: string;
  zone: StadiumZone;
  inputZone: string;
  distance: number;
  angle: number;
  outcome: string;
  outType: string;
  batterHandedness: string;
}

const EXIT_TYPE_MAP: Record<string, string> = {
  'Fly Ball': 'FLY',
  'Ground Ball': 'GROUND',
  'Line Drive': 'LINE',
  'Pop Up': 'POPUP',
};

/**
 * Create a stadium-level batted ball event from zone tap data.
 */
export function createStadiumBattedBallEvent(
  zoneId: string,
  context: BattedBallContext,
  batterHand: string,
  result: string,
  exitType: string,
): StadiumBattedBallEvent {
  return {
    gameId: context.gameId,
    inning: context.inning,
    batterId: context.batterId,
    pitcherId: context.pitcherId,
    zone: mapToStadiumSprayZone(zoneId),
    inputZone: zoneId,
    distance: estimateDistance(zoneId, result),
    angle: estimateAngle(zoneId),
    outcome: result,
    outType: EXIT_TYPE_MAP[exitType] || exitType,
    batterHandedness: batterHand,
  };
}
