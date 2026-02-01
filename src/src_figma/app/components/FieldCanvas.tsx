/**
 * FieldCanvas - Baseball field with mathematically correct geometry
 *
 * COORDINATE SYSTEM:
 * Based on CAD layout where home plate is at origin (0,0):
 * - Right foul line: positive X-axis (0°)
 * - Left foul line: positive Y-axis (90°)
 * - Fair territory: 90° wedge between foul lines
 * - Second base at (90, 90) ft from home
 *
 * For screen display, we rotate 45° so:
 * - Home plate at bottom center
 * - Second base straight up (center field direction)
 * - First base to the right, third base to the left
 *
 * All distances in feet, then scaled to SVG units.
 */

import { useCallback, useMemo, createContext, useContext } from 'react';

// ============================================
// TYPES
// ============================================

export interface FieldCoordinate {
  x: number; // 0.0 to 1.0 (normalized screen coordinates)
  y: number; // 0.0 to 1.0
}

export interface SpraySector {
  horizontal: 'pull' | 'center' | 'opposite';
  depth: 'infield' | 'shallow_outfield' | 'deep_outfield' | 'wall' | 'stands';
  sector: 'IF_L' | 'IF_M' | 'IF_R' | 'LF' | 'LCF' | 'CF' | 'RCF' | 'RF' | 'STANDS_LF' | 'STANDS_CF' | 'STANDS_RF';
  x: number;
  y: number;
}

export type FoulType = 'left_foul' | 'right_foul' | 'behind_home' | null;
export type HomeRunType = 'wall_scraper' | 'deep' | 'bomb';

export interface FielderPosition {
  positionNumber: number;
  x: number;
  y: number;
  label: string;
}

export interface FieldCanvasProps {
  width?: number;
  height?: number;
  showStands?: boolean;
  shadeFoulTerritory?: boolean;
  onFieldClick?: (coord: FieldCoordinate, isFoul: boolean) => void;
  children?: React.ReactNode;
  className?: string;
  /**
   * Zoom level for the field view (0-1)
   * 0 = full field view (shows fence and stands)
   * 1 = maximum infield zoom (shows just the diamond)
   * Default: 0.3 (balanced view showing infield prominently but fence visible)
   */
  zoomLevel?: number;
}

// ============================================
// BASEBALL FIELD CONSTANTS (in feet)
// ============================================

// Base distances
const BASE_DISTANCE = 90; // ft between bases
const PITCHER_DISTANCE = 60.5; // ft from home to rubber front

// Fence distances (typical MLB park) - logical values, visually compressed
const FENCE_LF = 330; // Left field line
const FENCE_CF = 400; // Center field
const FENCE_RF = 330; // Right field line
const FENCE_LCF = 380; // Left-center gap
const FENCE_RCF = 380; // Right-center gap

// Stands depth - zone behind fence for HR landing spots
// Wall scraper: just over fence (~0-10ft in)
// Deep HR: ~10-25ft into stands
// Bomb: 25ft+ (back of stands, 440ft+ HRs)
const STANDS_DEPTH = 40; // ft of stands behind fence - allows 440ft+ bombs

// Foul territory width (narrowed for iPad view)
const FOUL_TERRITORY_WIDTH = 20; // ft visible along foul lines

// ============================================
// SVG GEOMETRY - "Little League" Style
// ============================================

// SVG dimensions - wider for iPad horizontal view
const SVG_WIDTH = 1600;
const SVG_HEIGHT = 900; // Shorter height = wider aspect ratio

// Home plate position in SVG (bottom center)
const HOME_SVG_X = SVG_WIDTH / 2;
const HOME_SVG_Y = SVG_HEIGHT - 60; // Closer to bottom edge

// ============================================
// NON-LINEAR SCALING (Little League Effect)
// ============================================
//
// The key to making the infield appear larger is using non-linear scaling:
// - Infield (0-130ft): Gets MORE pixels per foot (expanded)
// - Outfield (130-400ft): Gets FEWER pixels per foot (compressed)
//
// We use a power curve: scaledDist = dist^power * factor
// With power < 1, closer distances expand and farther distances compress.

const INFIELD_BOUNDARY = 130; // ft - edge of infield dirt arc
const MAX_FIELD_DIST = FENCE_CF + STANDS_DEPTH; // Maximum distance to render

// Non-linear scaling exponent (0.7 = significant compression of outfield)
// Lower values = more infield emphasis, higher = more linear
const DISTANCE_POWER = 0.7;

// Calculate how much vertical SVG space we have for the field
const AVAILABLE_HEIGHT = HOME_SVG_Y - 40; // Leave margin at top

// Pre-calculate the scaled max distance for normalization
const SCALED_MAX = Math.pow(MAX_FIELD_DIST, DISTANCE_POWER);

// Linear scale that would fit max distance in available height
const LINEAR_SCALE = AVAILABLE_HEIGHT / SCALED_MAX;

/**
 * Apply non-linear distance scaling (Little League effect)
 * Distances near home get more pixels, distances near fence get fewer.
 */
function scaleDistance(distFeet: number): number {
  if (distFeet <= 0) return 0;
  // Power scaling: closer = expanded, farther = compressed
  return Math.pow(distFeet, DISTANCE_POWER) * LINEAR_SCALE;
}

/**
 * Reverse the non-linear scaling (for click detection)
 */
function unscaleDistance(scaledDist: number): number {
  if (scaledDist <= 0) return 0;
  return Math.pow(scaledDist / LINEAR_SCALE, 1 / DISTANCE_POWER);
}

// Legacy SCALE constant for any remaining linear calculations
const SCALE = AVAILABLE_HEIGHT / MAX_FIELD_DIST;

// ============================================
// VIEW BOX CONTEXT (for child positioning)
// ============================================

/**
 * ViewBox parameters for dynamic zoom
 */
export interface ViewBoxParams {
  x: number;      // left edge in SVG units
  y: number;      // top edge in SVG units
  width: number;  // visible width in SVG units
  height: number; // visible height in SVG units
}

/**
 * Context to provide viewBox info to children for correct positioning
 */
export const ViewBoxContext = createContext<ViewBoxParams>({
  x: 0,
  y: 0,
  width: SVG_WIDTH,
  height: SVG_HEIGHT,
});

/**
 * Hook to get current viewBox parameters
 */
export function useViewBox(): ViewBoxParams {
  return useContext(ViewBoxContext);
}

/**
 * Convert SVG coordinates to visible percentage position (accounting for viewBox zoom).
 * This is what children should use to position themselves when viewBox changes.
 *
 * @param svgX - X coordinate in SVG units
 * @param svgY - Y coordinate in SVG units
 * @param viewBox - Current viewBox parameters
 * @returns percentage positions (0-100) for left/top CSS
 */
export function svgToViewBoxPercent(
  svgX: number,
  svgY: number,
  viewBox: ViewBoxParams
): { leftPercent: number; topPercent: number } {
  // Transform from SVG coords to viewBox-relative coords
  const relX = svgX - viewBox.x;
  const relY = svgY - viewBox.y;

  // Convert to percentage of visible area
  const leftPercent = (relX / viewBox.width) * 100;
  const topPercent = (relY / viewBox.height) * 100;

  return { leftPercent, topPercent };
}

/**
 * Convert normalized (0-1) coordinates to visible percentage (accounting for viewBox).
 * Convenience function combining normalizedToSvg and svgToViewBoxPercent.
 */
export function normalizedToViewBoxPercent(
  normX: number,
  normY: number,
  viewBox: ViewBoxParams
): { leftPercent: number; topPercent: number } {
  const svg = normalizedToSvg(normX, normY);
  return svgToViewBoxPercent(svg.svgX, svg.svgY, viewBox);
}

// ============================================
// COORDINATE CONVERSION FUNCTIONS
// ============================================

/**
 * Convert baseball field coordinates (feet from home) to SVG coordinates
 * Uses NON-LINEAR scaling for "Little League" effect:
 * - Infield appears larger (more pixels per foot)
 * - Outfield appears compressed (fewer pixels per foot)
 *
 * Baseball coords: home at (0,0), right foul line = +X, left foul line = +Y
 * We rotate 45° CCW so second base (90,90) points straight up on screen
 */
function fieldToSvg(fieldX: number, fieldY: number): { svgX: number; svgY: number } {
  // Calculate distance from home plate
  const dist = Math.sqrt(fieldX * fieldX + fieldY * fieldY);

  if (dist < 0.001) {
    // At home plate
    return { svgX: HOME_SVG_X, svgY: HOME_SVG_Y };
  }

  // Get angle in field coordinates (0° = RF line, 90° = LF line)
  const angle = Math.atan2(fieldY, fieldX);

  // Apply non-linear distance scaling
  const scaledDist = scaleDistance(dist);

  // Rotate 45° counter-clockwise for screen display
  // In rotated coords: positive X = toward RF, positive Y = toward CF
  const cos45 = Math.SQRT1_2;
  const sin45 = Math.SQRT1_2;

  // Direction unit vector in field coords
  const dirX = fieldX / dist;
  const dirY = fieldY / dist;

  // Rotate direction
  const rotDirX = dirX * cos45 - dirY * sin45;
  const rotDirY = dirX * sin45 + dirY * cos45;

  // Apply scaled distance
  const svgX = HOME_SVG_X + rotDirX * scaledDist;
  const svgY = HOME_SVG_Y - rotDirY * scaledDist; // SVG Y is inverted

  return { svgX, svgY };
}

/**
 * Convert SVG coordinates back to field coordinates
 * Reverses the non-linear scaling
 */
function svgToField(svgX: number, svgY: number): { fieldX: number; fieldY: number } {
  // Get offset from home plate in SVG coords
  const offsetX = svgX - HOME_SVG_X;
  const offsetY = HOME_SVG_Y - svgY; // Un-invert Y

  const scaledDist = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

  if (scaledDist < 0.001) {
    return { fieldX: 0, fieldY: 0 };
  }

  // Un-scale the distance
  const dist = unscaleDistance(scaledDist);

  // Get direction in rotated coords
  const rotDirX = offsetX / scaledDist;
  const rotDirY = offsetY / scaledDist;

  // Rotate 45° clockwise to get back to field coords
  const cos45 = Math.SQRT1_2;
  const sin45 = Math.SQRT1_2;

  const dirX = rotDirX * cos45 + rotDirY * sin45;
  const dirY = -rotDirX * sin45 + rotDirY * cos45;

  // Apply original distance
  const fieldX = dirX * dist;
  const fieldY = dirY * dist;

  return { fieldX, fieldY };
}

/**
 * Convert normalized (0-1) screen coordinates to SVG coordinates
 */
export function normalizedToSvg(x: number, y: number): { svgX: number; svgY: number } {
  return {
    svgX: x * SVG_WIDTH,
    svgY: (1 - y) * SVG_HEIGHT, // Flip Y: normalized y=0 at bottom
  };
}

/**
 * Convert SVG coordinates to normalized (0-1) coordinates
 */
export function svgToNormalized(svgX: number, svgY: number): FieldCoordinate {
  return {
    x: svgX / SVG_WIDTH,
    y: 1 - (svgY / SVG_HEIGHT),
  };
}

/**
 * Convert field coordinates (feet) to normalized screen coordinates (0-1)
 */
function fieldToNormalized(fieldX: number, fieldY: number): FieldCoordinate {
  const svg = fieldToSvg(fieldX, fieldY);
  return svgToNormalized(svg.svgX, svg.svgY);
}

// ============================================
// BASE POSITIONS (in feet from home)
// ============================================

// In baseball CAD coords: home=(0,0), 1B=(90,0), 2B=(90,90), 3B=(0,90)
const BASES_FEET = {
  home: { x: 0, y: 0 },
  first: { x: BASE_DISTANCE, y: 0 },
  second: { x: BASE_DISTANCE, y: BASE_DISTANCE },
  third: { x: 0, y: BASE_DISTANCE },
};

// Pitcher's rubber: 60.5 ft along the diagonal from home to second
// That diagonal has direction (1,1)/√2, so position = 60.5 * (1/√2, 1/√2)
const PITCHER_FEET = {
  x: PITCHER_DISTANCE * Math.SQRT1_2,
  y: PITCHER_DISTANCE * Math.SQRT1_2,
};

// Convert to normalized screen coordinates
export const BASE_POSITIONS = {
  home: fieldToNormalized(BASES_FEET.home.x, BASES_FEET.home.y),
  first: fieldToNormalized(BASES_FEET.first.x, BASES_FEET.first.y),
  second: fieldToNormalized(BASES_FEET.second.x, BASES_FEET.second.y),
  third: fieldToNormalized(BASES_FEET.third.x, BASES_FEET.third.y),
};

// ============================================
// FIELDER POSITIONS (in feet from home)
// ============================================

// Fielder positions in field coordinates (feet)
// These are approximate typical defensive alignments
// In field coords: x = toward RF foul line, y = toward LF foul line
// After 45° rotation: positive x goes right, positive y goes up
const FIELDERS_FEET: Record<number, { x: number; y: number; label: string }> = {
  1: { x: PITCHER_FEET.x, y: PITCHER_FEET.y, label: 'P' }, // Pitcher on mound
  2: { x: 5, y: 5, label: 'C' }, // Catcher just behind home plate (in fair territory slightly)
  3: { x: 90, y: 25, label: '1B' }, // First baseman
  4: { x: 95, y: 65, label: '2B' }, // Second baseman (between 1B and 2B)
  5: { x: 25, y: 90, label: '3B' }, // Third baseman
  6: { x: 65, y: 95, label: 'SS' }, // Shortstop (between 2B and 3B)
  7: { x: 100, y: 250, label: 'LF' }, // Left fielder - more centered in LF
  8: { x: 190, y: 190, label: 'CF' }, // Center fielder (along diagonal)
  9: { x: 250, y: 100, label: 'RF' }, // Right fielder - more centered in RF
};

// Convert to normalized screen coordinates
export const FIELDER_POSITIONS: Record<number, FielderPosition> = {};
for (const [num, pos] of Object.entries(FIELDERS_FEET)) {
  const normalized = fieldToNormalized(pos.x, pos.y);
  FIELDER_POSITIONS[Number(num)] = {
    positionNumber: Number(num),
    x: normalized.x,
    y: normalized.y,
    label: pos.label,
  };
}

// ============================================
// FENCE AND STANDS GEOMETRY
// ============================================

/**
 * Get fence distance at a given angle (in degrees, where 0° = RF line, 90° = LF line)
 * Uses smooth interpolation between the key points
 */
function getFenceDistanceAtAngle(angleDeg: number): number {
  // Key angles and distances
  const points = [
    { angle: 0, dist: FENCE_RF },    // Right field line
    { angle: 22.5, dist: FENCE_RCF }, // Right-center
    { angle: 45, dist: FENCE_CF },    // Center field
    { angle: 67.5, dist: FENCE_LCF }, // Left-center
    { angle: 90, dist: FENCE_LF },    // Left field line
  ];

  // Find surrounding points and interpolate
  for (let i = 0; i < points.length - 1; i++) {
    if (angleDeg >= points[i].angle && angleDeg <= points[i + 1].angle) {
      const t = (angleDeg - points[i].angle) / (points[i + 1].angle - points[i].angle);
      // Smooth interpolation (cosine)
      const smooth = (1 - Math.cos(t * Math.PI)) / 2;
      return points[i].dist + smooth * (points[i + 1].dist - points[i].dist);
    }
  }

  return FENCE_CF; // Default
}

/**
 * Get fence position in field coordinates at a given angle
 */
function getFencePointAtAngle(angleDeg: number): { x: number; y: number } {
  const dist = getFenceDistanceAtAngle(angleDeg);
  const angleRad = angleDeg * Math.PI / 180;
  return {
    x: dist * Math.cos(angleRad),
    y: dist * Math.sin(angleRad),
  };
}

/**
 * Get stands position (behind fence) at a given angle
 */
function getStandsPointAtAngle(angleDeg: number): { x: number; y: number } {
  const fenceDist = getFenceDistanceAtAngle(angleDeg);
  const standsDist = fenceDist + STANDS_DEPTH;
  const angleRad = angleDeg * Math.PI / 180;
  return {
    x: standsDist * Math.cos(angleRad),
    y: standsDist * Math.sin(angleRad),
  };
}

// ============================================
// CLASSIFICATION FUNCTIONS
// ============================================

/**
 * Check if a point (in field coords) is in foul territory
 * Fair territory is where both x >= 0 AND y >= 0 (first quadrant)
 */
function isFoulInFieldCoords(fieldX: number, fieldY: number): boolean {
  // Behind home plate
  if (fieldX < 0 && fieldY < 0) return true;
  // Foul right side (behind RF line)
  if (fieldX > 0 && fieldY < 0) return true;
  // Foul left side (behind LF line)
  if (fieldX < 0 && fieldY > 0) return true;
  return false;
}

/**
 * Check if normalized screen coordinate is in foul territory
 */
export function isFoulTerritory(normX: number, normY: number): boolean {
  // Convert to SVG
  const svg = normalizedToSvg(normX, normY);
  // Convert to field coords
  const field = svgToField(svg.svgX, svg.svgY);
  return isFoulInFieldCoords(field.fieldX, field.fieldY);
}

export function getFoulType(x: number, y: number): FoulType {
  const svg = normalizedToSvg(x, y);
  const field = svgToField(svg.svgX, svg.svgY);

  if (!isFoulInFieldCoords(field.fieldX, field.fieldY)) return null;

  if (field.fieldX < 0 && field.fieldY < 0) return 'behind_home';
  if (field.fieldY < 0) return 'right_foul';
  return 'left_foul';
}

/**
 * Get fence Y coordinate for a given normalized X
 * (For compatibility with existing code)
 */
export function getFenceY(normX: number): number {
  // Convert X to angle estimate
  // This is approximate - proper calculation would need full coordinate conversion
  const svg = normalizedToSvg(normX, 0.5);
  const field = svgToField(svg.svgX, svg.svgY);

  if (field.fieldX <= 0 || field.fieldY <= 0) return 0.9; // Foul territory

  const angle = Math.atan2(field.fieldY, field.fieldX) * 180 / Math.PI;
  const fencePoint = getFencePointAtAngle(Math.max(0, Math.min(90, angle)));
  const fenceNorm = fieldToNormalized(fencePoint.x, fencePoint.y);

  return fenceNorm.y;
}

export function classifyHomeRun(y: number): HomeRunType {
  // Based on how deep into stands
  if (y < 0.88) return 'wall_scraper';
  if (y < 0.94) return 'deep';
  return 'bomb';
}

export function isInStands(y: number, x?: number): boolean {
  const fenceY = x !== undefined ? getFenceY(x) : 0.85;
  return y >= fenceY;
}

export function getSpraySector(x: number, y: number): SpraySector {
  // Convert to field coordinates for proper analysis
  const svg = normalizedToSvg(x, y);
  const field = svgToField(svg.svgX, svg.svgY);

  // Calculate angle from home (0° = RF line, 90° = LF line)
  const angle = Math.atan2(field.fieldY, field.fieldX) * 180 / Math.PI;

  // Horizontal spray direction
  let horizontal: SpraySector['horizontal'];
  if (angle < 30) horizontal = 'opposite'; // Pull for RHB = RF
  else if (angle > 60) horizontal = 'pull'; // Pull for RHB = LF
  else horizontal = 'center';

  // Distance from home
  const dist = Math.sqrt(field.fieldX ** 2 + field.fieldY ** 2);
  const fenceDist = getFenceDistanceAtAngle(Math.max(0, Math.min(90, angle)));

  let depth: SpraySector['depth'];
  if (dist < 150) depth = 'infield';
  else if (dist < 250) depth = 'shallow_outfield';
  else if (dist < fenceDist - 20) depth = 'deep_outfield';
  else if (dist < fenceDist) depth = 'wall';
  else depth = 'stands';

  // Sector classification
  let sector: SpraySector['sector'];
  if (dist < 150) {
    sector = angle < 30 ? 'IF_R' : angle > 60 ? 'IF_L' : 'IF_M';
  } else if (dist >= fenceDist) {
    sector = angle < 30 ? 'STANDS_RF' : angle > 60 ? 'STANDS_LF' : 'STANDS_CF';
  } else {
    if (angle < 18) sector = 'RF';
    else if (angle < 36) sector = 'RCF';
    else if (angle < 54) sector = 'CF';
    else if (angle < 72) sector = 'LCF';
    else sector = 'LF';
  }

  return { horizontal, depth, sector, x, y };
}

// ============================================
// COMPONENT
// ============================================

export function FieldCanvas({
  showStands = true,
  shadeFoulTerritory = true,
  onFieldClick,
  children,
  className = '',
  zoomLevel = 0,
}: FieldCanvasProps) {
  // Simple CSS-based zoom approach
  // Instead of changing viewBox (which breaks overlay alignment),
  // we use CSS transform: scale() on the entire container.
  // This zooms SVG + children overlay together uniformly.
  //
  // zoomLevel 0 = no zoom (scale 1.0)
  // zoomLevel 1 = max zoom (scale ~1.5, centered on infield)

  // Calculate scale and translation based on zoomLevel
  const zoomConfig = useMemo(() => {
    // At zoomLevel 0: scale=1.0, no translation
    // At zoomLevel 1: scale=1.05, very modest zoom keeping full field visible
    // Keep scale minimal so CF home run area stays accessible
    // Using 1.05 instead of 1.1 to prevent clipping at CF
    const scale = 1 + zoomLevel * 0.05; // 1.0 to 1.05 (very subtle zoom)

    // With transformOrigin: 'center bottom', scaling up pushes top content up
    // Apply negative translateY to pull expanded content back into view
    // At scale 1.05, top extends by 5% of container, but we're centered so it's ~2.5% each way
    // Small negative translation to keep top visible
    const translateY = zoomLevel * -1.5; // -1.5% at max zoom

    return { scale, translateY };
  }, [zoomLevel]);

  // Fixed viewBox - never changes, keeps coordinate system stable
  const viewBox: ViewBoxParams = { x: 0, y: 0, width: SVG_WIDTH, height: SVG_HEIGHT };
  const viewBoxString = `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`;

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!onFieldClick) return;

      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // With CSS transform zoom, the SVG still uses its original coordinate system
      // The browser handles the transform, so we just convert normally
      const svgX = (clickX / rect.width) * SVG_WIDTH;
      const svgY = (clickY / rect.height) * SVG_HEIGHT;

      const coord = svgToNormalized(svgX, svgY);
      const isFoul = isFoulTerritory(coord.x, coord.y);

      onFieldClick(coord, isFoul);
    },
    [onFieldClick]
  );

  // Generate SVG paths
  const paths = useMemo(() => {
    // Base positions in SVG
    const home = fieldToSvg(BASES_FEET.home.x, BASES_FEET.home.y);
    const first = fieldToSvg(BASES_FEET.first.x, BASES_FEET.first.y);
    const second = fieldToSvg(BASES_FEET.second.x, BASES_FEET.second.y);
    const third = fieldToSvg(BASES_FEET.third.x, BASES_FEET.third.y);
    const pitcher = fieldToSvg(PITCHER_FEET.x, PITCHER_FEET.y);

    // Foul lines - extend from home to past the fence
    const foulRightEnd = fieldToSvg(FENCE_RF + 50, 0);
    const foulLeftEnd = fieldToSvg(0, FENCE_LF + 50);

    // Generate fence path (arc from RF pole to LF pole)
    const fencePoints: string[] = [];
    const steps = 36;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 90; // 0° to 90°
      const pt = getFencePointAtAngle(angle);
      const svg = fieldToSvg(pt.x, pt.y);
      fencePoints.push(`${svg.svgX},${svg.svgY}`);
    }
    const fencePath = `M ${fencePoints.join(' L ')}`;

    // Generate stands path - compact zone just behind the fence
    // This is where home runs land - uses grass-like coloring
    const standsPoints: string[] = [];

    // Inner edge (along fence) - from RF line to LF line
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 90;
      const pt = getFencePointAtAngle(angle);
      const svg = fieldToSvg(pt.x, pt.y);
      standsPoints.push(`${svg.svgX},${svg.svgY}`);
    }

    // Outer edge (behind fence) - go backwards from LF to RF
    for (let i = steps; i >= 0; i--) {
      const angle = (i / steps) * 90;
      const pt = getStandsPointAtAngle(angle);
      const svg = fieldToSvg(pt.x, pt.y);
      standsPoints.push(`${svg.svgX},${svg.svgY}`);
    }

    const standsPath = `M ${standsPoints.join(' L ')} Z`;

    // Infield dirt (diamond shape)
    const infieldPath = `
      M ${home.svgX} ${home.svgY}
      L ${first.svgX} ${first.svgY}
      L ${second.svgX} ${second.svgY}
      L ${third.svgX} ${third.svgY}
      Z
    `;

    // Fair territory triangle (for highlighting)
    const fairPath = `
      M ${home.svgX} ${home.svgY}
      L ${foulRightEnd.svgX} ${foulRightEnd.svgY}
      L ${foulLeftEnd.svgX} ${foulLeftEnd.svgY}
      Z
    `;

    return {
      home,
      first,
      second,
      third,
      pitcher,
      foulRightEnd,
      foulLeftEnd,
      fencePath,
      standsPath,
      infieldPath,
      fairPath,
    };
  }, []);

  return (
    <div
      className={`relative ${className}`}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden', // Hide overflowing content when zoomed
      }}
    >
      {/* Inner container with CSS transform for zoom */}
      {/* Both SVG and children overlay are inside, so they zoom together */}
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${zoomConfig.scale}) translateY(${zoomConfig.translateY}%)`,
          transformOrigin: 'center bottom', // Zoom from home plate area
          transition: 'transform 0.3s ease-out', // Smooth zoom animation
        }}
      >
      <svg
        viewBox={viewBoxString}
        preserveAspectRatio="xMidYMax meet"
        onClick={handleClick}
        className="cursor-crosshair w-full h-full"
        style={{ backgroundColor: '#6B9462' }}
      >
        <defs>
          <pattern id="grass-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
            <rect width="30" height="30" fill="#6B9462" />
            <line x1="0" y1="15" x2="30" y2="15" stroke="#5A8352" strokeWidth="1" opacity="0.2" />
          </pattern>

          <pattern id="stands-pattern" width="40" height="25" patternUnits="userSpaceOnUse">
            <rect width="40" height="25" fill="#3d5240" />
            <rect x="2" y="2" width="16" height="10" fill="#4d6250" rx="2" />
            <rect x="22" y="2" width="16" height="10" fill="#4d6250" rx="2" />
            <rect x="2" y="14" width="16" height="9" fill="#5d7260" rx="1" />
            <rect x="22" y="14" width="16" height="9" fill="#5d7260" rx="1" />
          </pattern>

          <pattern id="dirt-pattern" width="15" height="15" patternUnits="userSpaceOnUse">
            <rect width="15" height="15" fill="#B8935F" />
            <circle cx="4" cy="4" r="1.5" fill="#A07840" opacity="0.4" />
            <circle cx="11" cy="10" r="1" fill="#C9A46F" opacity="0.4" />
          </pattern>
        </defs>

        {/* Background grass */}
        <rect x="0" y="0" width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#grass-pattern)" />

        {/* Stands area - grass-colored zone behind fence for HR landing */}
        {showStands && (
          <path d={paths.standsPath} fill="#5A8352" opacity="0.7" />
        )}

        {/* Fair territory (lighter green) */}
        <path d={paths.fairPath} fill="#7AAB6F" opacity="0.4" />

        {/* Foul territory shading */}
        {shadeFoulTerritory && (
          <>
            {/* Right side foul */}
            <polygon
              points={`
                ${paths.home.svgX},${paths.home.svgY}
                ${paths.foulRightEnd.svgX},${paths.foulRightEnd.svgY}
                ${SVG_WIDTH},${SVG_HEIGHT}
                ${paths.home.svgX},${SVG_HEIGHT}
              `}
              fill="#8B7355"
              opacity="0.15"
            />
            {/* Left side foul */}
            <polygon
              points={`
                ${paths.home.svgX},${paths.home.svgY}
                ${paths.foulLeftEnd.svgX},${paths.foulLeftEnd.svgY}
                0,${SVG_HEIGHT}
                ${paths.home.svgX},${SVG_HEIGHT}
              `}
              fill="#8B7355"
              opacity="0.15"
            />
          </>
        )}

        {/* Warning track (brown strip before fence) */}
        <path
          d={paths.fencePath}
          fill="none"
          stroke="#A07840"
          strokeWidth="18"
          opacity="0.5"
        />

        {/* Infield dirt */}
        <path d={paths.infieldPath} fill="url(#dirt-pattern)" stroke="#C9A46F" strokeWidth="3" />

        {/* Infield grass (circle in center) */}
        <circle
          cx={(paths.home.svgX + paths.second.svgX) / 2}
          cy={(paths.home.svgY + paths.second.svgY) / 2}
          r={45 * SCALE}
          fill="#6B9462"
          opacity="0.8"
        />

        {/* Pitcher's mound */}
        <circle
          cx={paths.pitcher.svgX}
          cy={paths.pitcher.svgY}
          r={9 * SCALE}
          fill="#B8935F"
          stroke="#A07840"
          strokeWidth="2"
        />
        {/* Pitcher's rubber */}
        <rect
          x={paths.pitcher.svgX - 12}
          y={paths.pitcher.svgY - 3}
          width="24"
          height="6"
          fill="#E8E8D8"
        />

        {/* Foul lines */}
        <line
          x1={paths.home.svgX}
          y1={paths.home.svgY}
          x2={paths.foulRightEnd.svgX}
          y2={paths.foulRightEnd.svgY}
          stroke="#E8E8D8"
          strokeWidth="4"
        />
        <line
          x1={paths.home.svgX}
          y1={paths.home.svgY}
          x2={paths.foulLeftEnd.svgX}
          y2={paths.foulLeftEnd.svgY}
          stroke="#E8E8D8"
          strokeWidth="4"
        />

        {/* Outfield fence */}
        <path
          d={paths.fencePath}
          fill="none"
          stroke="#E8C547"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Base paths (white lines) */}
        <line x1={paths.home.svgX} y1={paths.home.svgY} x2={paths.first.svgX} y2={paths.first.svgY} stroke="#E8E8D8" strokeWidth="2" opacity="0.6" />
        <line x1={paths.first.svgX} y1={paths.first.svgY} x2={paths.second.svgX} y2={paths.second.svgY} stroke="#E8E8D8" strokeWidth="2" opacity="0.6" />
        <line x1={paths.second.svgX} y1={paths.second.svgY} x2={paths.third.svgX} y2={paths.third.svgY} stroke="#E8E8D8" strokeWidth="2" opacity="0.6" />
        <line x1={paths.third.svgX} y1={paths.third.svgY} x2={paths.home.svgX} y2={paths.home.svgY} stroke="#E8E8D8" strokeWidth="2" opacity="0.6" />

        {/* Bases */}
        {/* Home plate (pentagon) */}
        <polygon
          points={`
            ${paths.home.svgX},${paths.home.svgY - 12}
            ${paths.home.svgX + 10},${paths.home.svgY - 5}
            ${paths.home.svgX + 10},${paths.home.svgY + 7}
            ${paths.home.svgX - 10},${paths.home.svgY + 7}
            ${paths.home.svgX - 10},${paths.home.svgY - 5}
          `}
          fill="#E8E8D8"
          stroke="#333"
          strokeWidth="2"
        />

        {/* First base */}
        <rect
          x={paths.first.svgX - 10}
          y={paths.first.svgY - 10}
          width="20"
          height="20"
          fill="#E8E8D8"
          stroke="#333"
          strokeWidth="2"
          transform={`rotate(45, ${paths.first.svgX}, ${paths.first.svgY})`}
        />

        {/* Second base */}
        <rect
          x={paths.second.svgX - 10}
          y={paths.second.svgY - 10}
          width="20"
          height="20"
          fill="#E8E8D8"
          stroke="#333"
          strokeWidth="2"
          transform={`rotate(45, ${paths.second.svgX}, ${paths.second.svgY})`}
        />

        {/* Third base */}
        <rect
          x={paths.third.svgX - 10}
          y={paths.third.svgY - 10}
          width="20"
          height="20"
          fill="#E8E8D8"
          stroke="#333"
          strokeWidth="2"
          transform={`rotate(45, ${paths.third.svgX}, ${paths.third.svgY})`}
        />
      </svg>

      {/* Children overlay (fielders, runners, etc.) - positioned over the SVG */}
      {/* INSIDE the zoom container so they scale with the field */}
      {/* ViewBoxContext provides viewBox params for coordinate conversion */}
      {children && (
        <ViewBoxContext.Provider value={viewBox}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="relative w-full h-full pointer-events-auto">
              {children}
            </div>
          </div>
        </ViewBoxContext.Provider>
      )}
      </div>{/* End of zoom container */}
    </div>
  );
}

export { normalizedToSvg as fieldToSvg };
