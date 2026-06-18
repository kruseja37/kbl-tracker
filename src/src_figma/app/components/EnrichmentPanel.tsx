import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAtBatEvent, type AtBatEvent } from '../../../utils/eventLog';
import {
  type Direction,
  type Position,
} from '../../../types/game';
import type { PlayLogEntry, RunnerSubEntry } from '../utils/playLogTypes';
import {
  FIELDING_ATTEMPT_TYPE_OPTIONS,
  FIELDING_ATTEMPT_OUTCOME_OPTIONS,
  FIELDING_PLAY_TYPE_OPTIONS,
  PLAY_MECHANIC_OPTIONS,
  mapAttemptToLegacyFieldingPlayType,
  mapLegacyFieldingPlayTypeToAttempt,
  type FieldingAttemptType,
  type FieldingAttemptOutcome,
  type PlayMechanic,
  type FieldingPlayTypeValue,
} from '../utils/fieldingPlayType';
import {
  getHeldByOfBaseSaved,
  getRunnerDestinationOptions,
  isCorrectableBatterResult,
} from '../utils/gameTrackerRunnerCorrection';
import {
  inferAssistChain,
  inferPrimaryFielderPositionFromSpray,
  type BaseOccupancy,
} from '../utils/gameTrackerFieldTypes';

// ──────────────────────────────────────────────────────────────
// Pitch Type Constants (§4.3)
// ──────────────────────────────────────────────────────────────

export const PITCH_TYPES = [
  { abbr: '4F', label: 'Four-seam' },
  { abbr: '2F', label: 'Two-seam' },
  { abbr: 'CB', label: 'Curveball' },
  { abbr: 'SL', label: 'Slider' },
  { abbr: 'CH', label: 'Changeup' },
  { abbr: 'FK', label: 'Forkball' },
  { abbr: 'CF', label: 'Cutter' },
  { abbr: 'SB', label: 'Screwball' },
  { abbr: 'UNK', label: 'Unknown' },
] as const;

export type PitchTypeAbbr = typeof PITCH_TYPES[number]['abbr'];

export const PITCH_LOCATIONS = [
  { value: 'low', label: 'Low' },
  { value: 'high', label: 'High' },
  { value: 'inside', label: 'Inside' },
  { value: 'outside', label: 'Outside' },
  { value: 'outOfZone', label: 'Out of Zone' },
] as const;

export type PitchLocationValue = typeof PITCH_LOCATIONS[number]['value'];

// ──────────────────────────────────────────────────────────────
// Layer C — Contact Type (§8.1) — renamed from exitType
// ──────────────────────────────────────────────────────────────

export const CONTACT_TYPE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'weak', label: 'Weak' },
  { value: 'hard', label: 'Hard' },
  { value: 'bloop', label: 'Bloop' },
  { value: 'bunt', label: 'Bunt' },
] as const;

export type ContactTypeValue = typeof CONTACT_TYPE_OPTIONS[number]['value'];

/**
 * Map UI contactType → persisted exitType for backward compatibility.
 * eventLog.ts stores exitType as ground_ball | fly_ball | line_drive | popup | bunt | string.
 * Contact type is orthogonal to trajectory, so we only map 'bunt' directly.
 * Other contact types are stored as-is in the exitType field (allowed by `| string`).
 */
export function mapContactTypeToExitType(contactType: ContactTypeValue): string {
  return contactType;
}

/**
 * Map persisted exitType back to UI contactType (for loading enrichment data).
 * Legacy values (ground_ball, fly_ball, etc.) are no longer shown as contact type —
 * they were trajectory, not contact quality.
 */
export function mapExitTypeToContactType(exitType?: string): ContactTypeValue | undefined {
  if (!exitType) return undefined;
  const mapping: Record<string, ContactTypeValue> = {
    normal: 'normal',
    weak: 'weak',
    hard: 'hard',
    bloop: 'bloop',
    bunt: 'bunt',
  };
  return mapping[exitType];
}

// ──────────────────────────────────────────────────────────────
// Enrichment data that can be saved
// ──────────────────────────────────────────────────────────────

export interface EnrichmentUpdate {
  fieldLocation?: { x: number; y: number; zone?: string };
  exitType?: string; // persisted as exitType, UI shows as contactType
  chased?: boolean;
  fieldingSequence?: number[];
  fieldingDifficulty?: 'ROUTINE' | 'DIVING' | 'WALL' | 'RUNNING' | 'LEAPING';
  fieldingPlayType?: FieldingPlayTypeValue;
  fieldingAttemptType?: FieldingAttemptType;
  fieldingAttemptOutcome?: FieldingAttemptOutcome;
  playMechanic?: PlayMechanic;
  batterOutAdvancing?: boolean;
  basesSaved?: 1 | 2;
  savedRun?: boolean;
  extraGemCreditPositions?: number[];
  rescuedThrow?: boolean;
  hrDistance?: number;
  pitchType?: string;
  pitchLocation?: PitchLocationValue;
  pitchesInAtBat?: number;
}

// ──────────────────────────────────────────────────────────────
// Layer D — Modifiers (§8.1)
// Removed: BUNT (now contact type), TOOTBLAN (now runner-level)
// Added: BEAT_RUNNER
// ──────────────────────────────────────────────────────────────

const MODIFIER_OPTIONS = [
  { value: 'ROBBERY', label: 'ROB' },
  { value: 'KILLED_PITCHER', label: 'KP' },
  { value: 'NUT_SHOT', label: 'NUT' },
  { value: 'BEAT_THROW', label: 'BT' },
  { value: 'BEAT_RUNNER', label: 'BR' },
] as const;

export type AtBatModifierValue = typeof MODIFIER_OPTIONS[number]['value'];

// ──────────────────────────────────────────────────────────────
// Per-result enrichment gating (§8.5 ENRICHMENT_CONFIG)
// ──────────────────────────────────────────────────────────────

interface EnrichmentConfig {
  spray: boolean;
  /** §8.2: Context-sensitive spray zone count per result type */
  sprayZones: number;
  chase: boolean;
  fieldingAttempt: boolean;
  playMechanic: boolean;
  contactType: boolean;
  modifiers: AtBatModifierValue[];
  hrDistance: boolean;
}

const ALL_CONTACT_MODIFIERS: AtBatModifierValue[] = ['ROBBERY', 'KILLED_PITCHER', 'NUT_SHOT', 'BEAT_THROW', 'BEAT_RUNNER'];
const NO_KP_NUT: AtBatModifierValue[] = ['ROBBERY', 'BEAT_THROW', 'BEAT_RUNNER'];
const HR_FIELDING_PLAY_TYPES = new Set<FieldingPlayTypeValue>([
  'failed_robbery',
]);
const RESCUED_THROW_RESULTS = new Set(['GO', 'FC', 'DP', 'TP', 'SAC']);
const EXTRA_GEM_SEQUENCE_RESULTS = new Set(['GO', 'FO', 'FLO', 'LO', 'PO', 'DP', 'TP', 'FC', 'SF', 'SAC']);
const SAVED_BASES_ATTEMPT_TYPES = new Set<FieldingAttemptType>([
  'diving',
  'sliding',
  'charging',
  'running',
  'over_shoulder',
]);

function supportsSavedBases(attemptType?: FieldingAttemptType): boolean {
  return !!attemptType && SAVED_BASES_ATTEMPT_TYPES.has(attemptType);
}

export const ENRICHMENT_CONFIG: Record<string, EnrichmentConfig> = {
  // Outs — §8.2 zone counts
  GO:  { spray: true,  sprayZones: 18, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['KILLED_PITCHER', 'NUT_SHOT', 'BEAT_RUNNER'], hrDistance: false },
  FO:  { spray: true,  sprayZones: 27, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['KILLED_PITCHER', 'NUT_SHOT', 'BEAT_RUNNER'], hrDistance: false },
  FLO: { spray: true,  sprayZones: 27, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['KILLED_PITCHER', 'NUT_SHOT', 'BEAT_RUNNER'], hrDistance: false },
  LO:  { spray: true,  sprayZones: 39, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['KILLED_PITCHER', 'NUT_SHOT', 'BEAT_RUNNER'], hrDistance: false },
  PO:  { spray: true,  sprayZones: 27, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['KILLED_PITCHER', 'NUT_SHOT', 'BEAT_RUNNER'], hrDistance: false },
  DP:  { spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['KILLED_PITCHER', 'NUT_SHOT', 'BEAT_RUNNER'], hrDistance: false },
  TP:  { spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['KILLED_PITCHER', 'NUT_SHOT', 'BEAT_RUNNER'], hrDistance: false },
  FC:  { spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['KILLED_PITCHER', 'NUT_SHOT', 'BEAT_THROW', 'BEAT_RUNNER'], hrDistance: false },
  // Hits — §8.2: 6 dirs × (3 IF + 4 OF) = 42
  '1B': { spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['KILLED_PITCHER', 'NUT_SHOT', 'BEAT_THROW'], hrDistance: false },
  '2B': { spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['KILLED_PITCHER', 'NUT_SHOT', 'BEAT_THROW'], hrDistance: false },
  '3B': { spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['KILLED_PITCHER', 'NUT_SHOT', 'BEAT_THROW'], hrDistance: false },
  GRD: { spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['KILLED_PITCHER', 'NUT_SHOT', 'BEAT_THROW'], hrDistance: false },
  ITPHR:{ spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['KILLED_PITCHER', 'NUT_SHOT', 'BEAT_THROW'], hrDistance: false },
  // HR — expanded to 9 dirs × 3 depths = 27 for easier tap targets with more detail
  HR:  { spray: true,  sprayZones: 27, chase: true,  fieldingAttempt: true,  playMechanic: false, contactType: true, modifiers: [], hrDistance: true },
  // Sacrifices — no KP/NUT per §8.5
  SAC: { spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: [], hrDistance: false },
  SF:  { spray: true,  sprayZones: 27, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: [], hrDistance: false },
  // Errors — §8.2: IF + OF = 42
  E:   { spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['KILLED_PITCHER', 'NUT_SHOT'], hrDistance: false },
  // Non-contact plays — only pitch type + pitch count
  K:   { spray: false, sprayZones: 0,  chase: true,  fieldingAttempt: false, playMechanic: false, contactType: false, modifiers: [], hrDistance: false },
  Kc:  { spray: false, sprayZones: 0,  chase: false, fieldingAttempt: false, playMechanic: false, contactType: false, modifiers: [], hrDistance: false },
  WP_K:{ spray: false, sprayZones: 0,  chase: true,  fieldingAttempt: true,  playMechanic: false, contactType: false, modifiers: [], hrDistance: false },
  PB_K:{ spray: false, sprayZones: 0,  chase: true,  fieldingAttempt: true,  playMechanic: false, contactType: false, modifiers: [], hrDistance: false },
  BB:  { spray: false, sprayZones: 0,  chase: false, fieldingAttempt: false, playMechanic: false, contactType: false, modifiers: [], hrDistance: false },
  IBB: { spray: false, sprayZones: 0,  chase: false, fieldingAttempt: false, playMechanic: false, contactType: false, modifiers: [], hrDistance: false },
  HBP: { spray: false, sprayZones: 0,  chase: false, fieldingAttempt: false, playMechanic: false, contactType: false, modifiers: [], hrDistance: false },
};

function getEnrichmentConfig(result: string): EnrichmentConfig {
  return ENRICHMENT_CONFIG[result] || {
    spray: false, sprayZones: 0, fieldingAttempt: false, playMechanic: false,
    chase: false, contactType: false, modifiers: [], hrDistance: false,
  };
}

// ──────────────────────────────────────────────────────────────
// SprayGraphic — Fan-shaped inline SVG (§8.2)
// Replaces MiniDiamond. Zone-based, chalk-line aesthetic.
// Context-sensitive zone counts per result type.
// ──────────────────────────────────────────────────────────────

// §8.2: Zone layout configuration per result type
interface SprayZoneLayout {
  fairDirs: number;
  fairDepths: number;
  foulRegions: number;
  /** Radial range [0..1] — 0 = home plate, 0.45 = IF boundary, 1.0 = fence */
  innerR: number;
  outerR: number;
  fairLaneWeights?: number[];
}

const SPRAY_ZONE_LAYOUTS: Record<string, SprayZoneLayout> = {
  HR:  { fairDirs: 9, fairDepths: 3, foulRegions: 0, innerR: 0.65, outerR: 1.0, fairLaneWeights: [0.4, 0.62, 0.86, 1.02, 1.2, 1.02, 0.86, 0.62, 0.4] },  // 27: over-fence band
  GO:  { fairDirs: 6, fairDepths: 3, foulRegions: 0, innerR: 0.0,  outerR: 0.45, fairLaneWeights: [0.42, 0.88, 1.2, 1.2, 0.88, 0.42] }, // 18: line-aware infield wedge
  FO:  { fairDirs: 7, fairDepths: 3, foulRegions: 6, innerR: 0.4,  outerR: 1.0, fairLaneWeights: [0.34, 0.8, 1.08, 1.24, 1.08, 0.8, 0.34] },  // 21 fair + 6 foul
  FLO: { fairDirs: 7, fairDepths: 3, foulRegions: 6, innerR: 0.4,  outerR: 1.0, fairLaneWeights: [0.34, 0.8, 1.08, 1.24, 1.08, 0.8, 0.34] },  // 21 fair + 6 foul
  LO:  { fairDirs: 11, fairDepths: 3, foulRegions: 6, innerR: 0.2,  outerR: 1.0, fairLaneWeights: [0.24, 0.38, 0.58, 0.8, 0.98, 1.1, 0.98, 0.8, 0.58, 0.38, 0.24] }, // 33 fair + 6 foul
  PO:  { fairDirs: 7, fairDepths: 3, foulRegions: 6, innerR: 0.0,  outerR: 0.55, fairLaneWeights: [0.34, 0.8, 1.08, 1.24, 1.08, 0.8, 0.34] }, // 21 fair/shallow + 6 foul
  DEFAULT: { fairDirs: 6, fairDepths: 7, foulRegions: 0, innerR: 0.0, outerR: 1.0, fairLaneWeights: [0.42, 0.88, 1.2, 1.2, 0.88, 0.42] }, // 42: full fair wedge with line strips
};

function getZoneLayout(result: string): SprayZoneLayout {
  if (SPRAY_ZONE_LAYOUTS[result]) return SPRAY_ZONE_LAYOUTS[result];
  // Map result types to their layout
  if (['1B', '2B', '3B', 'E', 'GRD', 'DP', 'TP', 'FC', 'SAC'].includes(result)) return SPRAY_ZONE_LAYOUTS.DEFAULT;
  if (result === 'SF') return SPRAY_ZONE_LAYOUTS.FO; // SF uses same as FO (OF + foul)
  return SPRAY_ZONE_LAYOUTS.DEFAULT;
}

// Polar-to-cartesian for spray region generation
// Fan apex at (100, 115), full radius ≈ 110px
const CX = 100;
const CY = 115;
const MAX_R = 110;
const SVG_WIDTH = 200;
const SVG_HEIGHT = 120;
// Fan angular range: from ~228° to ~312° (centered on 270° = straight up)
const FAN_START = (228 * Math.PI) / 180;
const FAN_END = (312 * Math.PI) / 180;
const LINE_FOUL_PAD = (18 * Math.PI) / 180;
const NEAREST_REGION_EDGE_TOLERANCE = 1.5;

function polarToXY(angle: number, radius: number): [number, number] {
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
}

export interface SprayPoint {
  x: number;
  y: number;
}

export interface SprayRegion {
  id: string;
  polygon: SprayPoint[];
  svgPoints: string;
  center: SprayPoint;
  storedZone?: string;
  direction: Direction | null;
  kind: 'fair' | 'foul-left' | 'foul-right' | 'behind-plate';
  depthIndex?: number;
  depthCount?: number;
}

interface SpraySelection {
  x: number;
  y: number;
  zone?: string;
  direction?: Direction | null;
  depthIndex?: number;
  depthCount?: number;
}

const FAIR_SPRAY_DIRECTIONS: Direction[] = [
  'Left',
  'Left-Center',
  'Center',
  'Right-Center',
  'Right',
];

function svgToNormalizedPoint(point: { x: number; y: number }): SprayPoint {
  return {
    x: point.x / 2,
    y: point.y / 1.2,
  };
}

function normalizedToSvgPoint(point: SprayPoint): { x: number; y: number } {
  return {
    x: point.x * 2,
    y: point.y * 1.2,
  };
}

function polarToNormalizedPoint(angle: number, radius: number): SprayPoint {
  const [x, y] = polarToXY(angle, radius);
  return svgToNormalizedPoint({ x, y });
}

function buildArcPoints(angleStart: number, angleEnd: number, radius: number, steps = 4): SprayPoint[] {
  if (steps <= 0) {
    return [polarToNormalizedPoint(angleStart, radius)];
  }

  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const angle = angleStart + ((angleEnd - angleStart) * t);
    return polarToNormalizedPoint(angle, radius);
  });
}

function buildRingSegmentPolygon(
  angleStart: number,
  angleEnd: number,
  innerRadius: number,
  outerRadius: number,
  arcSteps = 5,
): SprayPoint[] {
  if (innerRadius <= 0.75) {
    return [
      svgToNormalizedPoint({ x: CX, y: CY }),
      ...buildArcPoints(angleStart, angleEnd, outerRadius, arcSteps),
    ];
  }

  return [
    ...buildArcPoints(angleStart, angleEnd, innerRadius, arcSteps),
    ...buildArcPoints(angleEnd, angleStart, outerRadius, arcSteps),
  ];
}

function buildWeightedAngleBoundaries(layout: SprayZoneLayout): number[] {
  const weights = layout.fairLaneWeights?.length === layout.fairDirs
    ? layout.fairLaneWeights
    : Array.from({ length: layout.fairDirs }, () => 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const span = FAN_END - FAN_START;
  const boundaries = [FAN_START];
  let current = FAN_START;

  weights.forEach((weight) => {
    current += span * (weight / totalWeight);
    boundaries.push(current);
  });

  boundaries[boundaries.length - 1] = FAN_END;
  return boundaries;
}

function buildRadialBoundaries(innerRadius: number, outerRadius: number, segments: number): number[] {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    return innerRadius + ((outerRadius - innerRadius) * t);
  });
}

function buildSvgPointsString(points: SprayPoint[]): string {
  return points
    .map((point) => {
      const svgPoint = normalizedToSvgPoint(point);
      return `${svgPoint.x},${svgPoint.y}`;
    })
    .join(' ');
}

function getPolygonCenter(points: SprayPoint[]): SprayPoint {
  const total = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 },
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
  };
}

function pointInPolygon(point: SprayPoint, vertices: SprayPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;

    const intersects = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function distancePointToSegment(point: SprayPoint, start: SprayPoint, end: SprayPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  const projectedX = start.x + t * dx;
  const projectedY = start.y + t * dy;
  return Math.hypot(point.x - projectedX, point.y - projectedY);
}

function distanceToPolygonEdges(point: SprayPoint, polygon: SprayPoint[]): number {
  let distance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    distance = Math.min(distance, distancePointToSegment(point, start, end));
  }
  return distance;
}

function getFairDirectionFromAngle(angle: number): Direction {
  if (angle < 0) angle += Math.PI * 2;

  const normalized = Math.min(
    0.999,
    Math.max(0, (angle - FAN_START) / (FAN_END - FAN_START))
  );
  const index = Math.min(
    FAIR_SPRAY_DIRECTIONS.length - 1,
    Math.floor(normalized * FAIR_SPRAY_DIRECTIONS.length)
  );

  return FAIR_SPRAY_DIRECTIONS[index];
}

function createSprayRegion(
  id: string,
  polygon: SprayPoint[],
  storedZone: string | undefined,
  direction: Direction | null,
  kind: SprayRegion['kind'],
  depthIndex?: number,
  depthCount?: number,
): SprayRegion {
  return {
    id,
    polygon,
    svgPoints: buildSvgPointsString(polygon),
    center: getPolygonCenter(polygon),
    storedZone,
    direction,
    kind,
    depthIndex,
    depthCount,
  };
}

function generateFairRegions(layout: SprayZoneLayout): SprayRegion[] {
  const angleBoundaries = buildWeightedAngleBoundaries(layout);
  const radialBoundaries = buildRadialBoundaries(layout.innerR * MAX_R, layout.outerR * MAX_R, layout.fairDepths);
  const regions: SprayRegion[] = [];

  for (let laneIndex = 0; laneIndex < layout.fairDirs; laneIndex += 1) {
    const angleStart = angleBoundaries[laneIndex];
    const angleEnd = angleBoundaries[laneIndex + 1];
    const direction = getFairDirectionFromAngle((angleStart + angleEnd) / 2);

    for (let depthIndex = 0; depthIndex < layout.fairDepths; depthIndex += 1) {
      const polygon = buildRingSegmentPolygon(
        angleStart,
        angleEnd,
        radialBoundaries[depthIndex],
        radialBoundaries[depthIndex + 1],
      );
      regions.push(
        createSprayRegion(
          `d${laneIndex}r${depthIndex}`,
          polygon,
          direction,
          direction,
          'fair',
          depthIndex,
          layout.fairDepths,
        ),
      );
    }
  }

  return regions;
}

function generateFoulRegions(layout: SprayZoneLayout): SprayRegion[] {
  if (layout.foulRegions <= 0) {
    return [];
  }

  const innerSvgRadius = layout.innerR * MAX_R;
  const fairBandSize = ((layout.outerR - layout.innerR) * MAX_R) / layout.fairDepths;
  const lineRadiusBoundaries = buildRadialBoundaries(
    Math.max(8, innerSvgRadius + fairBandSize * 0.55),
    innerSvgRadius + fairBandSize * 3.2,
    2,
  );
  const leftAngles = [FAN_START - LINE_FOUL_PAD, FAN_START];
  const rightAngles = [FAN_END, FAN_END + LINE_FOUL_PAD];
  const backstopBaseY = svgToNormalizedPoint({ x: CX, y: CY }).y;
  const backstopLeftPolygon: SprayPoint[] = [
    { x: 50, y: backstopBaseY },
    { x: 39, y: 96 },
    { x: 42, y: 100 },
    { x: 50, y: 100 },
  ];
  const backstopRightPolygon: SprayPoint[] = [
    { x: 50, y: backstopBaseY },
    { x: 61, y: 96 },
    { x: 58, y: 100 },
    { x: 50, y: 100 },
  ];

  return [
    createSprayRegion(
      'foul_l_near',
      buildRingSegmentPolygon(leftAngles[0], leftAngles[1], lineRadiusBoundaries[0], lineRadiusBoundaries[1]),
      'Foul-Left',
      'Foul-Left',
      'foul-left',
    ),
    createSprayRegion(
      'foul_l_far',
      buildRingSegmentPolygon(leftAngles[0], leftAngles[1], lineRadiusBoundaries[1], lineRadiusBoundaries[2]),
      'Foul-Left',
      'Foul-Left',
      'foul-left',
    ),
    createSprayRegion(
      'foul_r_near',
      buildRingSegmentPolygon(rightAngles[0], rightAngles[1], lineRadiusBoundaries[0], lineRadiusBoundaries[1]),
      'Foul-Right',
      'Foul-Right',
      'foul-right',
    ),
    createSprayRegion(
      'foul_r_far',
      buildRingSegmentPolygon(rightAngles[0], rightAngles[1], lineRadiusBoundaries[1], lineRadiusBoundaries[2]),
      'Foul-Right',
      'Foul-Right',
      'foul-right',
    ),
    createSprayRegion(
      'foul_c_left',
      backstopLeftPolygon,
      'Behind-Plate',
      null,
      'behind-plate',
    ),
    createSprayRegion(
      'foul_c_right',
      backstopRightPolygon,
      'Behind-Plate',
      null,
      'behind-plate',
    ),
  ];
}

function generateSprayRegions(layout: SprayZoneLayout): SprayRegion[] {
  return [
    ...generateFairRegions(layout),
    ...generateFoulRegions(layout),
  ];
}

function findSprayRegionAtPoint(point: SprayPoint, regions: SprayRegion[]): SprayRegion | null {
  return regions.find((region) => pointInPolygon(point, region.polygon)) ?? null;
}

function findNearestSprayRegion(point: SprayPoint, regions: SprayRegion[]): SprayRegion | null {
  let nearestRegion: SprayRegion | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  regions.forEach((region) => {
    const distance = distanceToPolygonEdges(point, region.polygon);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestRegion = region;
    }
  });

  if (!nearestRegion || nearestDistance > NEAREST_REGION_EDGE_TOLERANCE) {
    return null;
  }

  return nearestRegion;
}

export function getSprayRegionsForResult(result?: string): SprayRegion[] {
  return generateSprayRegions(getZoneLayout(result ?? ''));
}

export function resolveSprayRegionForPoint(
  point: SprayPoint,
  result?: string,
  options?: { allowNearestFallback?: boolean },
): SprayRegion | null {
  const regions = getSprayRegionsForResult(result);
  const exactRegion = findSprayRegionAtPoint(point, regions);
  if (exactRegion) {
    return exactRegion;
  }

  if (!options?.allowNearestFallback) {
    return null;
  }

  return findNearestSprayRegion(point, regions);
}

function areSequencesEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

const EMPTY_BASE_OCCUPANCY: BaseOccupancy = {
  first: false,
  second: false,
  third: false,
};

function areBaseOccupanciesEqual(a: BaseOccupancy, b: BaseOccupancy): boolean {
  return a.first === b.first && a.second === b.second && a.third === b.third;
}

function toBaseOccupancy(event?: Pick<AtBatEvent, 'runners'> | null): BaseOccupancy {
  return {
    first: !!event?.runners?.first,
    second: !!event?.runners?.second,
    third: !!event?.runners?.third,
  };
}

function SprayGraphic({
  location,
  onTap,
  result,
}: {
  location?: { x: number; y: number } | null;
  onTap: (selection: SpraySelection) => void;
  /** Result type for context-sensitive zone generation */
  result?: string;
}) {
  const layout = result ? getZoneLayout(result) : SPRAY_ZONE_LAYOUTS.DEFAULT;
  const regions = useMemo(() => generateSprayRegions(layout), [layout]);
  const fairLaneAngles = useMemo(() => buildWeightedAngleBoundaries(layout), [layout]);

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;

    // Use the SVG coordinate transform matrix to correctly convert screen
    // coordinates into viewBox coordinates.  This handles viewBox scaling,
    // preserveAspectRatio centering, and any CSS transforms — the naive
    // getBoundingClientRect() / width approach does NOT.
    let svgX: number;
    let svgY: number;
    const ctm = typeof svg.getScreenCTM === 'function' ? svg.getScreenCTM() : null;
    if (ctm && typeof svg.createSVGPoint === 'function') {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPt = pt.matrixTransform(ctm.inverse());
      svgX = svgPt.x;
      svgY = svgPt.y;
    } else {
      // Fallback for environments where getScreenCTM is unavailable (e.g. jsdom)
      const rect = svg.getBoundingClientRect();
      svgX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
      svgY = ((e.clientY - rect.top) / rect.height) * SVG_HEIGHT;
    }

    const normalizedPoint = svgToNormalizedPoint({ x: svgX, y: svgY });

    const x = Math.round(Math.max(0, Math.min(100, normalizedPoint.x)));
    const y = Math.round(Math.max(0, Math.min(100, normalizedPoint.y)));

    // Best-effort zone inference — never gates whether the dot appears
    const mappedRegion = resolveSprayRegionForPoint(
      { x, y },
      result,
      { allowNearestFallback: true },
    );

    onTap({
      x,
      y,
      zone: mappedRegion?.storedZone,
      direction: mappedRegion?.direction ?? null,
      depthIndex: mappedRegion?.depthIndex,
      depthCount: mappedRegion?.depthCount,
    });
  }, [result, onTap]);

  return (
    <svg
      viewBox="0 0 200 120"
      className="w-full h-[220px] cursor-crosshair bg-[#2d4a35]/60 rounded border border-[#4a6a4a] touch-manipulation"
      onClick={handleSvgClick}
    >
      {/* Fan shape — outfield arc from LF foul line to RF foul line */}
      <path
        d="M 100 115 L 15 40 Q 100 -10 185 40 Z"
        fill="none"
        stroke="#5a7a5a"
        strokeWidth="0.8"
      />
      {/* Warning track arc */}
      <path
        d="M 30 50 Q 100 5 170 50"
        fill="none"
        stroke="#4a6a4a"
        strokeWidth="0.5"
        strokeDasharray="3 2"
      />
      {/* Outfield boundary */}
      <path
        d="M 45 55 Q 100 20 155 55"
        fill="none"
        stroke="#4a6a4a"
        strokeWidth="0.5"
      />
      {/* Infield diamond */}
      <polygon
        points="100,110 72,85 100,60 128,85"
        fill="none"
        stroke="#88AA88"
        strokeWidth="0.8"
      />
      {/* Hidden polygon grid for zone inference — not interactive, kept for test hooks */}
      {regions.map((region) => (
        <polygon
          key={region.id}
          points={region.svgPoints}
          data-testid={`spray-zone-${region.id}`}
          fill="transparent"
          stroke="none"
          pointerEvents="none"
        />
      ))}
      {/* Fair-territory guide lines */}
      {fairLaneAngles.map((angle, index) => {
        const [x, y] = polarToXY(angle, MAX_R);
        const isBoundary = index === 0 || index === fairLaneAngles.length - 1;
        return (
          <line
            key={`sector-${index}`}
            x1="100"
            y1="115"
            x2={x}
            y2={y}
            stroke={isBoundary ? '#4a6a4a' : '#3a5a3a'}
            strokeWidth="0.3"
            pointerEvents="none"
          />
        );
      })}
      {/* Base markers */}
      <rect x="98" y="108" width="4" height="4" fill="#E8E8D8" rx="0.5" />
      <rect x="70" y="83" width="3" height="3" fill="#E8E8D8" rx="0.5" />
      <rect x="98" y="58" width="3" height="3" fill="#E8E8D8" rx="0.5" />
      <rect x="126" y="83" width="3" height="3" fill="#E8E8D8" rx="0.5" />
      {/* Placed dot — always at the exact tap point */}
      {location && (
        <circle cx={location.x * 2} cy={location.y * 1.2} r="4" fill="#f59e0b" stroke="#fff" strokeWidth="0.7" />
      )}
    </svg>
  );
}

const FIELDER_POSITIONS = [
  { num: 1, label: 'P' },
  { num: 2, label: 'C' },
  { num: 3, label: '1B' },
  { num: 4, label: '2B' },
  { num: 5, label: '3B' },
  { num: 6, label: 'SS' },
  { num: 7, label: 'LF' },
  { num: 8, label: 'CF' },
  { num: 9, label: 'RF' },
];

type OutfieldPosition = Extract<Position, 'LF' | 'CF' | 'RF'>;

const OUTFIELD_POSITION_OPTIONS: Array<{
  value: OutfieldPosition;
  label: string;
}> = [
  { value: 'LF', label: 'LF' },
  { value: 'CF', label: 'CF' },
  { value: 'RF', label: 'RF' },
];

function FieldingSequenceInput({
  sequence,
  onChange,
}: {
  sequence: number[];
  onChange: (seq: number[]) => void;
}) {
  return (
    <div>
      <div className="flex gap-1.5 flex-wrap mb-2">
        {FIELDER_POSITIONS.map((f) => (
          <button
            key={f.num}
            className={`text-xs min-h-[36px] min-w-[36px] px-3 py-2 rounded border touch-manipulation
              ${sequence.includes(f.num)
                ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
            onClick={() => onChange([...sequence, f.num])}
          >
            {f.num}
          </button>
        ))}
      </div>
      {sequence.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-[#88AA88]">
            {sequence.join('-')}
          </span>
          <button
            className="text-xs min-h-[36px] px-3 py-2 rounded border border-[#7f1d1d] bg-[#3f1515]/50 text-[#f87171] hover:text-[#ef4444] touch-manipulation"
            onClick={() => onChange(sequence.slice(0, -1))}
          >
            undo
          </button>
          <button
            className="text-xs min-h-[36px] px-3 py-2 rounded border border-[#7f1d1d] bg-[#3f1515]/50 text-[#f87171] hover:text-[#ef4444] touch-manipulation"
            onClick={() => onChange([])}
          >
            clear
          </button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// EnrichmentPanel Component (§4.2 — opens on Play Log entry tap)
// ──────────────────────────────────────────────────────────────

interface EnrichmentPanelProps {
  entry: PlayLogEntry;
  currentEnrichment?: AtBatEvent['enrichment'];
  onUpdate: (field: keyof EnrichmentUpdate, value: unknown) => void;
  onModifierRecord?: (modifier: AtBatModifierValue) => void;
  onClose: () => void;
  closeLabel?: string;
}

export function EnrichmentPanel({
  entry,
  currentEnrichment,
  onUpdate,
  onModifierRecord,
  onClose,
  closeLabel = 'Done',
}: EnrichmentPanelProps) {
  const [baseOccupancy, setBaseOccupancy] = useState<BaseOccupancy>(EMPTY_BASE_OCCUPANCY);
  const [localFieldingSeq, setLocalFieldingSeq] = useState<number[]>(
    currentEnrichment?.fieldingSequence || []
  );
  const lastAutoInferredSeqRef = useRef<{
    primary: number;
    sequence: number[];
  } | null>(null);

  useEffect(() => {
    const nextFieldingSeq = currentEnrichment?.fieldingSequence || [];
    setLocalFieldingSeq(nextFieldingSeq);

    const lastAutoInferred = lastAutoInferredSeqRef.current;
    if (lastAutoInferred && areSequencesEqual(nextFieldingSeq, lastAutoInferred.sequence)) {
      return;
    }

    lastAutoInferredSeqRef.current = null;
  }, [currentEnrichment?.fieldingSequence]);

  useEffect(() => {
    if (!entry.eventId) {
      setBaseOccupancy((prev) =>
        areBaseOccupanciesEqual(prev, EMPTY_BASE_OCCUPANCY) ? prev : EMPTY_BASE_OCCUPANCY
      );
      return;
    }

    let cancelled = false;
    void getAtBatEvent(entry.eventId).then((event) => {
      if (cancelled) return;
      const nextBaseOccupancy = toBaseOccupancy(event);
      setBaseOccupancy((prev) =>
        areBaseOccupanciesEqual(prev, nextBaseOccupancy) ? prev : nextBaseOccupancy
      );
    });

    return () => {
      cancelled = true;
    };
  }, [entry.eventId]);

  const config = getEnrichmentConfig(entry.result);
  const isHomeRunResult = entry.result === 'HR';

  // Load existing attempt type/outcome — these fields may exist on persisted enrichment
  // but are not yet on the AtBatEvent['enrichment'] TS type
  const enrichmentAny = currentEnrichment as Record<string, unknown> | undefined;
  const persistedFieldingPlayType = currentEnrichment?.fieldingPlayType as FieldingPlayTypeValue | undefined;
  const derivedAttempt = mapLegacyFieldingPlayTypeToAttempt(persistedFieldingPlayType);
  const [attemptType, setAttemptType] = useState<FieldingAttemptType | undefined>(
    (enrichmentAny?.fieldingAttemptType as FieldingAttemptType | undefined) ?? derivedAttempt.attemptType
  );
  const [attemptOutcome, setAttemptOutcome] = useState<FieldingAttemptOutcome | undefined>(
    (enrichmentAny?.fieldingAttemptOutcome as FieldingAttemptOutcome | undefined) ?? derivedAttempt.attemptOutcome
  );
  const [playMechanic, setPlayMechanic] = useState<PlayMechanic | undefined>(
    enrichmentAny?.playMechanic as PlayMechanic | undefined
  );
  const basesSaved = currentEnrichment?.basesSaved;
  const extraGemCreditPositions =
    ((currentEnrichment as Record<string, unknown> | undefined)
      ?.extraGemCreditPositions as number[] | undefined) ?? [];
  const canTrackSavedBases = supportsSavedBases(attemptType);
  const isSavedBasesEnabled = typeof basesSaved === 'number';
  const allowsExtraGemCredit = useMemo(
    () =>
      Boolean(
        (persistedFieldingPlayType &&
          ['diving', 'leaping', 'wall', 'robbed_hr', 'sliding'].includes(
            persistedFieldingPlayType,
          )) ||
          (EXTRA_GEM_SEQUENCE_RESULTS.has(entry.result) && localFieldingSeq.length > 1),
      ),
    [entry.result, localFieldingSeq.length, persistedFieldingPlayType],
  );

  const isK = entry.result === 'K' || entry.result === 'Kc';
  const supportsBatterOutAdvancing = ['1B', '2B', '3B', 'GRD'].includes(entry.result);
  const canTrackRescuedThrow =
    RESCUED_THROW_RESULTS.has(entry.result) &&
    localFieldingSeq.length >= 2 &&
    localFieldingSeq[localFieldingSeq.length - 1] === 3;

  const positionLabel = (num: number) => FIELDER_POSITIONS.find((fielder) => fielder.num === num)?.label || `${num}`;
  const putoutLabel = currentEnrichment?.putouts?.map(positionLabel).join(', ');
  const assistLabel = currentEnrichment?.assists?.map(positionLabel).join(', ');
  const errorLabel = currentEnrichment?.errors?.map((error) => `${positionLabel(error.position)} (${error.type})`).join(', ');
  const selectedHrFieldingPlayType = persistedFieldingPlayType && HR_FIELDING_PLAY_TYPES.has(persistedFieldingPlayType)
    ? persistedFieldingPlayType
    : attemptType
      ? mapAttemptToLegacyFieldingPlayType(attemptType, attemptOutcome || 'made')
      : undefined;
  const hrFieldingAttemptOptions = FIELDING_PLAY_TYPE_OPTIONS.filter((option) => HR_FIELDING_PLAY_TYPES.has(option.value));

  // Derive contactType from persisted exitType
  const currentContactType = mapExitTypeToContactType(currentEnrichment?.exitType);
  const primaryFielderNumber = localFieldingSeq[0] ?? null;

  const applyFieldingSequenceChange = useCallback((seq: number[]) => {
    setLocalFieldingSeq(seq);
    onUpdate('fieldingSequence', seq);
  }, [onUpdate]);

  const applyInferredAssistChain = useCallback((
    primaryFielder: number,
    options: { trackAsAuto?: boolean } = {},
  ) => {
    const inferredSequence = inferAssistChain(
      entry.result,
      primaryFielder,
      baseOccupancy
    );

    if (options.trackAsAuto ?? true) {
      lastAutoInferredSeqRef.current = {
        primary: primaryFielder,
        sequence: inferredSequence,
      };
    } else {
      lastAutoInferredSeqRef.current = null;
    }

    console.log('[M2-3-fix] Inferred assist chain', {
      eventId: entry.eventId,
      result: entry.result,
      primaryFielder,
      bases: baseOccupancy,
      sequence: inferredSequence,
    });

    applyFieldingSequenceChange(inferredSequence);
  }, [applyFieldingSequenceChange, baseOccupancy, entry.eventId, entry.result]);

  const handleFieldingSeqChange = useCallback((seq: number[]) => {
    lastAutoInferredSeqRef.current = null;
    applyFieldingSequenceChange(seq);
  }, [applyFieldingSequenceChange]);

  const handlePrimaryFielderChange = useCallback((positionNumber: number) => {
    applyInferredAssistChain(positionNumber, { trackAsAuto: false });
  }, [applyInferredAssistChain]);

  useEffect(() => {
    const lastAutoInferred = lastAutoInferredSeqRef.current;
    if (!lastAutoInferred) {
      return;
    }

    if (!areSequencesEqual(localFieldingSeq, lastAutoInferred.sequence)) {
      return;
    }

    const refinedSequence = inferAssistChain(
      entry.result,
      lastAutoInferred.primary,
      baseOccupancy
    );

    if (areSequencesEqual(refinedSequence, lastAutoInferred.sequence)) {
      return;
    }

    lastAutoInferredSeqRef.current = {
      primary: lastAutoInferred.primary,
      sequence: refinedSequence,
    };

    console.log('[M2-3-fix] Refined assist chain from base state', {
      eventId: entry.eventId,
      result: entry.result,
      primaryFielder: lastAutoInferred.primary,
      bases: baseOccupancy,
      sequence: refinedSequence,
    });

    applyFieldingSequenceChange(refinedSequence);
  }, [
    applyFieldingSequenceChange,
    baseOccupancy,
    entry.eventId,
    entry.result,
    localFieldingSeq,
  ]);

  const handleSpraySelection = useCallback((selection: SpraySelection) => {
    onUpdate(
      'fieldLocation',
      selection.zone
        ? { x: selection.x, y: selection.y, zone: selection.zone }
        : { x: selection.x, y: selection.y }
    );

    if (!selection.direction) return;

    const inferredPrimaryNumber = inferPrimaryFielderPositionFromSpray({
      result: entry.result,
      direction: selection.direction,
      depthIndex: selection.depthIndex,
      depthCount: selection.depthCount,
    });

    if (!inferredPrimaryNumber) return;

    const lastAutoInferred = lastAutoInferredSeqRef.current;
    const canApplySprayInference =
      localFieldingSeq.length === 0 ||
      (lastAutoInferred !== null &&
        areSequencesEqual(localFieldingSeq, lastAutoInferred.sequence));

    if (!canApplySprayInference) {
      return;
    }

    console.log(`[M2-3-fix] Inferred fielder: ${positionLabel(inferredPrimaryNumber)}`);
    applyInferredAssistChain(inferredPrimaryNumber, { trackAsAuto: true });
  }, [applyInferredAssistChain, entry.result, localFieldingSeq, onUpdate]);

  const handleAttemptTypeChange = useCallback((type: FieldingAttemptType) => {
    setAttemptType(type);
    onUpdate('fieldingAttemptType', type);
    // Also write legacy fieldingPlayType for persistence compatibility
    const outcome = attemptOutcome || 'made';
    onUpdate('fieldingPlayType', mapAttemptToLegacyFieldingPlayType(type, outcome));
    if (!supportsSavedBases(type)) {
      onUpdate('basesSaved', undefined);
    }
  }, [onUpdate, attemptOutcome]);

  const handleAttemptOutcomeChange = useCallback((outcome: FieldingAttemptOutcome) => {
    setAttemptOutcome(outcome);
    onUpdate('fieldingAttemptOutcome', outcome);
    // Update legacy fieldingPlayType
    if (attemptType) {
      onUpdate('fieldingPlayType', mapAttemptToLegacyFieldingPlayType(attemptType, outcome));
    }
    if (!supportsSavedBases(attemptType)) {
      onUpdate('basesSaved', undefined);
    }
  }, [onUpdate, attemptType]);

  const handleHrFieldingPlayTypeChange = useCallback((playType: Extract<FieldingPlayTypeValue, 'failed_robbery'>) => {
    const { attemptType: nextAttemptType, attemptOutcome: nextAttemptOutcome } =
      mapLegacyFieldingPlayTypeToAttempt(playType);

    setAttemptType(nextAttemptType);
    setAttemptOutcome(nextAttemptOutcome);

    if (nextAttemptType) {
      onUpdate('fieldingAttemptType', nextAttemptType);
    }
    if (nextAttemptOutcome) {
      onUpdate('fieldingAttemptOutcome', nextAttemptOutcome);
    }
    console.log('[M2-2-fix] HR fielding attempt selected', { playType });
    onUpdate('fieldingPlayType', playType);
  }, [onUpdate]);

  const handlePlayMechanicChange = useCallback((mechanic: PlayMechanic) => {
    setPlayMechanic(mechanic);
    onUpdate('playMechanic', mechanic);
  }, [onUpdate]);

  const handleSavedBasesToggle = useCallback(() => {
    onUpdate('basesSaved', isSavedBasesEnabled ? undefined : 1);
  }, [isSavedBasesEnabled, onUpdate]);

  const handleBasesSavedChange = useCallback((nextBasesSaved: 1 | 2) => {
    onUpdate('basesSaved', nextBasesSaved);
  }, [onUpdate]);

  const handleContactTypeChange = useCallback((contactType: ContactTypeValue) => {
    // Store as exitType for persistence compatibility
    onUpdate('exitType', mapContactTypeToExitType(contactType));
  }, [onUpdate]);

  const handleChaseToggle = useCallback(() => {
    const nextChased = !currentEnrichment?.chased;
    console.log(`[M3-4] Chase toggled: ${nextChased ? 'ON' : 'OFF'}`, {
      eventId: entry.eventId,
      result: entry.result,
      chased: nextChased,
    });
    onUpdate('chased', nextChased ? true : undefined);
  }, [currentEnrichment?.chased, entry.eventId, entry.result, onUpdate]);

  return (
    <div className="bg-[#364038] border-l-2 border-[#C4A853] flex flex-col h-full" style={{ fontFamily: "'Moms Typewriter', monospace" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#243028]">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#88AA88]">{entry.inningLabel}</span>
          <span className="text-[11px] text-[#E8E8D8] font-bold" style={{ fontFamily: "'Tox Typewriter', monospace" }}>{entry.batterName}</span>
          <span className="text-[11px] font-bold" style={{ color: getResultColorLocal(entry.result) }}>
            {entry.result}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[11px] min-h-[36px] text-[#E8E8D8] bg-[#3d4a42] border border-[#4a6a4a] px-3 py-2 rounded hover:bg-[#4a6a4a] touch-manipulation"
        >
          {closeLabel}
        </button>
      </div>

      <div className="border-t border-[#4a6a4a] bg-[#2a3530] px-2 py-2">
        <div className={`grid gap-2 ${config.chase ? 'grid-cols-[minmax(80px,1fr)_minmax(0,4fr)]' : 'grid-cols-1'}`}>
          {config.chase && (
            <div>
              <button
                aria-pressed={!!currentEnrichment?.chased}
                className={`w-full text-xs min-h-[36px] px-3 py-2 rounded border transition-colors touch-manipulation
                  ${currentEnrichment?.chased
                    ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#fbbf24]'
                    : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                onClick={handleChaseToggle}
              >
                {currentEnrichment?.chased ? 'CHASE' : 'chase'}
              </button>
            </div>
          )}
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pitchCount) => (
              <button
                key={pitchCount}
                type="button"
                aria-label={`At-bat pitches ${pitchCount === 10 ? '10+' : pitchCount}`}
                className={`text-xs min-h-[36px] px-3 py-2 rounded border transition-colors touch-manipulation ${
                  currentEnrichment?.pitchesInAtBat === pitchCount
                    ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                    : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'
                }`}
                onClick={() => onUpdate('pitchesInAtBat', pitchCount)}
              >
                {pitchCount === 10 ? '10+' : pitchCount}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Scrollable enrichment fields */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">

        {/* Field Location (spray chart) — §8.2 */}
        {config.spray && (
          <EnrichmentSection label="Field Location" filled={!!currentEnrichment?.fieldLocation}>
            <SprayGraphic
              location={currentEnrichment?.fieldLocation}
              onTap={handleSpraySelection}
              result={entry.result}
            />
          </EnrichmentSection>
        )}

        {/* Fielding Attribution (sequence + existing putout/assist/error data) */}
        {(config.fieldingAttempt || config.playMechanic) && (
          <EnrichmentSection label="Fielding Attribution" filled={(currentEnrichment?.fieldingSequence?.length ?? 0) > 0 || !!(putoutLabel || assistLabel || errorLabel)}>
            <div className="mb-2">
              <label
                htmlFor="primary-fielder-select"
                className="block text-[10px] text-[#88AA88] font-bold uppercase tracking-wider mb-1"
              >
                Primary Fielder
              </label>
              <select
                id="primary-fielder-select"
                aria-label="Primary Fielder"
                value={primaryFielderNumber ? String(primaryFielderNumber) : ''}
                className="w-full min-h-[40px] bg-[#2a3530] border border-[#4a6a4a] text-[#E8E8D8] text-sm px-3 py-2 rounded"
                onChange={(e) => {
                  const nextValue = Number(e.target.value);
                  if (nextValue > 0) {
                    handlePrimaryFielderChange(nextValue);
                  }
                }}
              >
                <option value="">Select primary fielder</option>
                {FIELDER_POSITIONS.map((fielder) => (
                  <option key={fielder.num} value={fielder.num}>
                    {fielder.label}
                  </option>
                ))}
              </select>
            </div>
            <FieldingSequenceInput
              sequence={localFieldingSeq}
              onChange={handleFieldingSeqChange}
            />
            {canTrackRescuedThrow && (
              <div className="mt-2">
                <EnrichmentSection label="Rescued Throw" filled={!!currentEnrichment?.rescuedThrow}>
                  <button
                    className={`text-xs min-h-[36px] px-3 py-2 rounded border transition-colors touch-manipulation
                      ${currentEnrichment?.rescuedThrow
                        ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                        : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                    onClick={() => onUpdate('rescuedThrow', !currentEnrichment?.rescuedThrow)}
                  >
                    1B Rescued Throw
                  </button>
                </EnrichmentSection>
              </div>
            )}
            {allowsExtraGemCredit && localFieldingSeq.length > 1 && (
              <div className="mt-2">
                <EnrichmentSection label="Extra Gem Credit" filled={extraGemCreditPositions.length > 0}>
                  <div className="flex flex-wrap gap-1.5">
                    {localFieldingSeq.slice(1).map((positionNumber) => {
                      const isSelected = extraGemCreditPositions.includes(positionNumber);
                      return (
                        <button
                          key={positionNumber}
                          className={`text-xs min-h-[36px] px-3 py-2 rounded border transition-colors touch-manipulation ${
                            isSelected
                              ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                              : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'
                          }`}
                          onClick={() =>
                            onUpdate(
                              'extraGemCreditPositions',
                              isSelected
                                ? extraGemCreditPositions.filter((entry) => entry !== positionNumber)
                                : [...extraGemCreditPositions, positionNumber],
                            )
                          }
                        >
                          {positionLabel(positionNumber)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-[10px] text-[#88AA88]">
                    Use this only when a later fielder also made a gem-worthy dig, tag, or stretch.
                  </div>
                </EnrichmentSection>
              </div>
            )}
            {(putoutLabel || assistLabel || errorLabel) && (
              <div className="mt-2 bg-[#2a3530]/60 border border-[#4a6a4a] rounded px-2 py-2 space-y-1">
                {putoutLabel && (
                  <div className="text-[10px] text-[#E8E8D8]">
                    Putouts: <span className="text-[#C4A853]">{putoutLabel}</span>
                  </div>
                )}
                {assistLabel && (
                  <div className="text-[10px] text-[#E8E8D8]">
                    Assists: <span className="text-[#C4A853]">{assistLabel}</span>
                  </div>
                )}
                {errorLabel && (
                  <div className="text-[10px] text-[#E8E8D8]">
                    Errors: <span className="text-[#f59e0b]">{errorLabel}</span>
                  </div>
                )}
              </div>
            )}
          </EnrichmentSection>
        )}

        {/* Layer C — Contact Type (§8.1) */}
        {config.contactType && (
          <EnrichmentSection label="Contact Type" filled={!!currentContactType}>
            <div className="flex flex-wrap gap-1.5">
              {CONTACT_TYPE_OPTIONS.map((ct) => (
                <button
                  key={ct.value}
                  className={`text-xs min-h-[36px] px-3 py-2 rounded border transition-colors touch-manipulation
                    ${currentContactType === ct.value
                      ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                      : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                  onClick={() => handleContactTypeChange(ct.value)}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </EnrichmentSection>
        )}

        {/* Layer A — Fielding Attempt (§8.1): Attempt Type + Outcome */}
        {config.fieldingAttempt && (
          <>
            <EnrichmentSection label="Fielding Attempt" filled={isHomeRunResult ? !!selectedHrFieldingPlayType : !!attemptType}>
              {isHomeRunResult ? (
                <div className="flex flex-wrap gap-1.5">
                  {hrFieldingAttemptOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`text-xs min-h-[36px] px-3 py-2 rounded border transition-colors touch-manipulation
                        ${selectedHrFieldingPlayType === option.value
                          ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                          : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                      onClick={() => handleHrFieldingPlayTypeChange(option.value as Extract<FieldingPlayTypeValue, 'failed_robbery'>)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {FIELDING_ATTEMPT_TYPE_OPTIONS.map((at) => (
                      <button
                        key={at.value}
                        className={`text-xs min-h-[36px] px-3 py-2 rounded border transition-colors touch-manipulation
                          ${attemptType === at.value
                            ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                            : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                        onClick={() => handleAttemptTypeChange(at.value)}
                      >
                        {at.label}
                      </button>
                    ))}
                  </div>
                  {attemptType && attemptType !== 'routine' && (
                    <div className="flex gap-1.5 mt-2">
                      {FIELDING_ATTEMPT_OUTCOME_OPTIONS.map((ao) => (
                        <button
                          key={ao.value}
                          className={`text-xs min-h-[36px] px-3 py-2 rounded border transition-colors flex-1 touch-manipulation
                            ${attemptOutcome === ao.value
                              ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                              : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                          onClick={() => handleAttemptOutcomeChange(ao.value)}
                        >
                          {ao.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </EnrichmentSection>
          </>
        )}

        {canTrackSavedBases && (
          <EnrichmentSection label="Saved Extra Bases" filled={isSavedBasesEnabled}>
            <div className="flex gap-1.5">
              <button
                className={`text-xs min-h-[36px] px-3 py-2 rounded border transition-colors flex-1 touch-manipulation
                  ${isSavedBasesEnabled
                    ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                    : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                onClick={handleSavedBasesToggle}
              >
                Saved Extra Bases?
              </button>
            </div>
            {isSavedBasesEnabled && (
              <div className="flex gap-1.5 mt-2">
                {[1, 2].map((option) => (
                  <button
                    key={option}
                    className={`text-xs min-h-[36px] px-3 py-2 rounded border transition-colors flex-1 touch-manipulation
                      ${basesSaved === option
                        ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                        : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                    onClick={() => handleBasesSavedChange(option as 1 | 2)}
                  >
                    {option === 1 ? '1 base' : '2 bases'}
                  </button>
                ))}
              </div>
            )}
          </EnrichmentSection>
        )}

        {/* Layer B — Play Mechanic (§8.1) */}
        {config.playMechanic && (
          <EnrichmentSection label="Play Mechanic" filled={!!playMechanic && playMechanic !== 'routine'}>
            <div className="flex flex-wrap gap-1.5">
              {PLAY_MECHANIC_OPTIONS.filter((pm) => pm.value !== 'hold').map((pm) => (
                <button
                  key={pm.value}
                  className={`text-xs min-h-[36px] px-3 py-2 rounded border transition-colors touch-manipulation
                    ${playMechanic === pm.value
                      ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                      : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                  onClick={() => handlePlayMechanicChange(pm.value)}
                >
                  {pm.label}
                </button>
              ))}
            </div>
          </EnrichmentSection>
        )}

        {supportsBatterOutAdvancing && (
          <EnrichmentSection label="Batter Result" filled={!!currentEnrichment?.batterOutAdvancing}>
            <button
              className={`text-xs min-h-[36px] px-3 py-2 rounded border transition-colors touch-manipulation
                ${currentEnrichment?.batterOutAdvancing
                  ? 'bg-[#f87171]/20 border-[#f87171] text-[#fca5a5]'
                  : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
              onClick={() => onUpdate('batterOutAdvancing', !currentEnrichment?.batterOutAdvancing)}
            >
              Out Advancing
            </button>
          </EnrichmentSection>
        )}

        {/* HR Distance */}
        {config.hrDistance && (
          <EnrichmentSection label="HR Distance (ft)" filled={!!currentEnrichment?.hrDistance}>
            <input
            type="number"
            min={200}
            max={600}
            defaultValue={currentEnrichment?.hrDistance || ''}
            placeholder="350"
            className="w-full min-h-[40px] bg-[#2a3530] border border-[#4a6a4a] text-[#E8E8D8] text-sm px-3 py-2 rounded"
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val >= 200 && val <= 600) onUpdate('hrDistance', val);
              }}
            />
          </EnrichmentSection>
        )}

        {/* Pitch Type (§4.3) — for all enrichable plays */}
        <EnrichmentSection label="Pitch Type" filled={!!currentEnrichment?.pitchType}>
          <div className="flex flex-wrap gap-1.5">
            {PITCH_TYPES.map((pt) => (
              <button
                key={pt.abbr}
                className={`text-xs min-h-[36px] px-3 py-2 rounded border transition-colors touch-manipulation
                  ${currentEnrichment?.pitchType === pt.abbr
                    ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                    : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                onClick={() => onUpdate('pitchType', pt.abbr)}
                title={pt.label}
              >
                {pt.abbr}
              </button>
            ))}
          </div>
        </EnrichmentSection>

        {/* Pitch Location (§9 / OD-5) — optional manual strike-zone capture */}
        <EnrichmentSection label="Pitch Location" filled={!!currentEnrichment?.pitchLocation}>
          <div className="flex flex-wrap gap-1.5">
            {PITCH_LOCATIONS.map((location) => (
              <button
                key={location.value}
                className={`text-xs min-h-[36px] px-3 py-2 rounded border transition-colors touch-manipulation
                  ${currentEnrichment?.pitchLocation === location.value
                    ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                    : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                onClick={() => onUpdate(
                  'pitchLocation',
                  currentEnrichment?.pitchLocation === location.value ? undefined : location.value,
                )}
              >
                {location.label}
              </button>
            ))}
          </div>
        </EnrichmentSection>

        {/* Layer D — Modifiers (§8.1) — context-sensitive per result */}
        {config.modifiers.length > 0 && (
          <EnrichmentSection label="Modifiers" filled={(currentEnrichment?.modifiers?.length ?? 0) > 0}>
            <div className="flex flex-wrap gap-1.5">
              {MODIFIER_OPTIONS.filter(m => config.modifiers.includes(m.value)).map((modifier) => {
                const isActive = currentEnrichment?.modifiers?.includes(modifier.value) ?? false;
                return (
                  <button
                    key={modifier.value}
                    className={`text-xs min-h-[36px] px-3 py-2 rounded border transition-colors touch-manipulation
                      ${isActive
                        ? 'bg-[#6c3483]/40 border-[#af7ac5] text-[#f5e9ff]'
                        : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                    disabled={isActive || !onModifierRecord}
                    onClick={() => onModifierRecord?.(modifier.value)}
                  >
                    {modifier.label}
                  </button>
                );
              })}
            </div>
          </EnrichmentSection>
        )}

        {/* K/Kc distinction (shown only for strikeouts without type set) */}
        {isK && (
          <EnrichmentSection label="Strikeout Type" filled={entry.hasKType}>
            <div className="flex gap-1.5">
              <button
                className={`text-[11px] min-h-[36px] px-3 py-2 rounded border flex-1 touch-manipulation
                  ${entry.result === 'K'
                    ? 'bg-[#f87171]/20 border-[#f87171] text-[#f87171]'
                    : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                onClick={() => {/* K toggle handled by parent */}}
              >
                K (Swinging)
              </button>
              <button
                className={`text-[11px] min-h-[36px] px-3 py-2 rounded border flex-1 touch-manipulation
                  ${entry.result === 'Kc'
                    ? 'bg-[#f87171]/20 border-[#f87171] text-[#f87171]'
                    : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                onClick={() => {/* K toggle handled by parent */}}
              >
                Kc (Called)
              </button>
            </div>
          </EnrichmentSection>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Enrichment Section wrapper
// ──────────────────────────────────────────────────────────────

function EnrichmentSection({
  label,
  filled,
  children,
}: {
  label: string;
  filled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[10px] text-[#88AA88] font-bold uppercase tracking-wider">{label}</span>
        {filled && (
          <span className="text-[9px] text-[#34d399]">&#10003;</span>
        )}
      </div>
      {children}
    </div>
  );
}

// Local result color (avoid importing circular)
function getResultColorLocal(result: string): string {
  const colors: Record<string, string> = {
    '1B': '#60a5fa', '2B': '#60a5fa', '3B': '#60a5fa', 'GRD': '#60a5fa',
    'HR': '#c084fc',
    'BB': '#4ade80', 'IBB': '#4ade80', 'HBP': '#4ade80',
    'K': '#f87171', 'Kc': '#f87171', 'GO': '#f87171', 'FO': '#f87171', 'FLO': '#f87171',
    'LO': '#f87171', 'PO': '#f87171', 'DP': '#f87171', 'TP': '#f87171',
    'SF': '#f87171', 'SAC': '#f87171', 'FC': '#f87171',
    'E': '#fbbf24',
  };
  return colors[result] || '#E8E8D8';
}

// ──────────────────────────────────────────────────────────────
// Runner Enrichment Panel (UX-050 / §8.6)
// Inline enrichment for individual runner sub-entries
// ──────────────────────────────────────────────────────────────

const BASE_DISPLAY: Record<string, string> = {
  batter: 'BAT', first: '1B', second: '2B', third: '3B', home: 'HOME', out: 'OUT', end: 'END',
};

const RUNNER_ERROR_OPTIONS = [
  { value: 'none', label: 'No Error' },
  { value: 'fielding', label: 'Fielding' },
  { value: 'throwing', label: 'Throwing' },
  { value: 'mental', label: 'Mental' },
] as const;

const POSITION_CHARGE_OPTIONS = [
  { value: 1, label: 'P(1)' },
  { value: 2, label: 'C(2)' },
  { value: 3, label: '1B(3)' },
  { value: 4, label: '2B(4)' },
  { value: 5, label: '3B(5)' },
  { value: 6, label: 'SS(6)' },
  { value: 7, label: 'LF(7)' },
  { value: 8, label: 'CF(8)' },
  { value: 9, label: 'RF(9)' },
] as const;

const MANAGER_INTENT_OPTIONS = [
  { value: 'runner_choice', label: 'Runner Choice' },
  { value: 'manager_send', label: 'Manager Send' },
  { value: 'manager_hold', label: 'Hold Runner' },
  { value: 'runner_responsibility', label: 'Runner Fault' },
] as const;

const MANAGER_RUN_PLAY_OPTIONS = [
  { value: 'hit_and_run', label: 'Hit & Run' },
] as const;

const isRunnerOutcomeOut = (toBase: RunnerSubEntry['toBase']) => toBase === 'out';

function isBattedBallRunnerPlay(result?: string): boolean {
  return !!result && !['K', 'Kc', 'WP_K', 'PB_K', 'BB', 'IBB', 'HBP'].includes(result);
}

interface RunnerEnrichmentPanelProps {
  subEntry: RunnerSubEntry;
  outfielderByPosition?: Partial<Record<OutfieldPosition, { playerId: string; playerName: string }>>;
  onUpdate: (
    subEntryId: string,
    field: keyof Pick<RunnerSubEntry, 'fieldingSequence' | 'playMechanic' | 'fielderId' | 'fielderPosition' | 'heldByOf' | 'holdingFielder' | 'baseSaved' | 'isTootblan' | 'isOutAdvancing' | 'managerIntent' | 'managerRunPlay' | 'managerDecisionSource' | 'managerDecisionNote' | 'toBase' | 'errorType' | 'errorChargedTo'>,
    value: unknown,
  ) => void | Promise<void>;
  onClose: () => void;
}

export function RunnerEnrichmentPanel({
  subEntry,
  outfielderByPosition,
  onUpdate,
  onClose,
}: RunnerEnrichmentPanelProps) {
  const [localFieldingSeq, setLocalFieldingSeq] = useState<number[]>(subEntry.fieldingSequence || []);
  const [initialToBase, setInitialToBase] = useState(subEntry.toBase);
  const isBatterOutcomeToggle = subEntry.fromBase === 'batter' && isCorrectableBatterResult(subEntry.parentResult as AtBatEvent['result'] | undefined);
  const destinationOptions = isBatterOutcomeToggle
    ? (['out', 'first'] as RunnerSubEntry['toBase'][])
    : getRunnerDestinationOptions(subEntry.fromBase);
  const heldBaseSaved = getHeldByOfBaseSaved(subEntry.toBase, subEntry.parentResult);

  useEffect(() => {
    setInitialToBase(subEntry.toBase);
  }, [subEntry.id]);

  const handleFieldingSeqChange = useCallback((seq: number[]) => {
    setLocalFieldingSeq(seq);
    onUpdate(subEntry.id, 'fieldingSequence', seq);
  }, [onUpdate, subEntry.id]);

  const isScored = subEntry.toBase === 'home';
  const isOut = subEntry.toBase === 'out';
  const isInningEnd = subEntry.toBase === 'end';
  const isHeldByOutfielder = Boolean(subEntry.heldByOf || subEntry.playMechanic === 'hold');
  const errorSelection = subEntry.errorType || 'none';
  const shouldShowErrorAttribution =
    isScored ||
    isRunnerOutcomeOut(initialToBase) !== isRunnerOutcomeOut(subEntry.toBase) ||
    !!subEntry.errorType ||
    typeof subEntry.errorChargedTo === 'number';
  const shouldShowRunPlay =
    subEntry.fromBase !== 'batter' && isBattedBallRunnerPlay(subEntry.parentResult);
  const subjectLabel = subEntry.fromBase === 'batter'
    ? `Batter: ${subEntry.runnerName}`
    : subEntry.runnerName;

  const getDestinationLabel = useCallback((destination: RunnerSubEntry['toBase']) => {
    if (isBatterOutcomeToggle) {
      if (destination === 'out') {
        return 'OUT';
      }

      if (destination === 'first') {
        return subEntry.parentResult === 'DP'
          ? 'SAFE AT 1B (error broke up DP)'
          : 'SAFE AT 1B';
      }
    }

    return BASE_DISPLAY[destination];
  }, [isBatterOutcomeToggle, subEntry.parentResult]);

  const handleHoldToggle = useCallback(async () => {
    if (isHeldByOutfielder) {
      await onUpdate(subEntry.id, 'heldByOf', undefined);
      await onUpdate(subEntry.id, 'holdingFielder', undefined);
      await onUpdate(subEntry.id, 'baseSaved', undefined);
      await onUpdate(subEntry.id, 'playMechanic', undefined);
      await onUpdate(subEntry.id, 'fielderId', undefined);
      await onUpdate(subEntry.id, 'fielderPosition', undefined);
      return;
    }

    if (!heldBaseSaved) {
      return;
    }

    await onUpdate(subEntry.id, 'heldByOf', true);
    await onUpdate(subEntry.id, 'baseSaved', heldBaseSaved);
    await onUpdate(subEntry.id, 'playMechanic', 'hold');
  }, [heldBaseSaved, isHeldByOutfielder, onUpdate, subEntry.id]);

  const handleHoldFielderSelect = useCallback(async (position: OutfieldPosition) => {
    if (heldBaseSaved) {
      await onUpdate(subEntry.id, 'heldByOf', true);
      await onUpdate(subEntry.id, 'baseSaved', heldBaseSaved);
    }
    await onUpdate(subEntry.id, 'holdingFielder', position);
    await onUpdate(subEntry.id, 'playMechanic', 'hold');
    await onUpdate(subEntry.id, 'fielderPosition', position);
    await onUpdate(subEntry.id, 'fielderId', outfielderByPosition?.[position]?.playerId);
  }, [heldBaseSaved, onUpdate, outfielderByPosition, subEntry.id]);

  const handleErrorTypeChange = useCallback(async (nextValue: 'none' | 'fielding' | 'throwing' | 'mental') => {
    if (nextValue === 'none') {
      await onUpdate(subEntry.id, 'errorType', undefined);
      return;
    }

    await onUpdate(subEntry.id, 'errorType', nextValue);
  }, [onUpdate, subEntry.id]);

  const handleManagerIntentChange = useCallback(async (
    nextIntent: RunnerSubEntry['managerIntent'] | undefined,
  ) => {
    await onUpdate(subEntry.id, 'managerIntent', nextIntent);
    if (nextIntent) {
      await onUpdate(subEntry.id, 'managerDecisionSource', 'play_log_enhancement');
    }
  }, [onUpdate, subEntry.id]);

  const handleManagerRunPlayChange = useCallback(async (
    nextRunPlay: RunnerSubEntry['managerRunPlay'] | undefined,
  ) => {
    await onUpdate(subEntry.id, 'managerRunPlay', nextRunPlay);
    if (nextRunPlay) {
      await onUpdate(subEntry.id, 'managerDecisionSource', 'play_log_enhancement');
    }
  }, [onUpdate, subEntry.id]);

  return (
    <div className="bg-[#364038] border-l-2 border-[#C4A853] flex flex-col h-full" style={{ fontFamily: "'Moms Typewriter', monospace" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#243028]">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#6b7280]">└</span>
          <span className={`text-[11px] font-bold ${isScored ? 'text-[#34d399]' : isOut ? 'text-[#f87171]' : isInningEnd ? 'text-[#fbbf24]' : 'text-[#E8E8D8]'}`} style={{ fontFamily: "'Tox Typewriter', monospace" }}>
            {subjectLabel}
          </span>
          <span className="text-[10px] text-[#88AA88]">
            {BASE_DISPLAY[subEntry.fromBase]}→{BASE_DISPLAY[subEntry.toBase]}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[11px] min-h-[36px] text-[#E8E8D8] bg-[#3d4a42] border border-[#4a6a4a] px-3 py-2 rounded hover:bg-[#4a6a4a] touch-manipulation"
        >
          Done
        </button>
      </div>

      {/* Scrollable enrichment fields */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <EnrichmentSection label="Destination" filled={subEntry.toBase !== subEntry.fromBase}>
          <div className="flex flex-wrap gap-1.5">
            {destinationOptions.map((destination) => (
              <button
                key={destination}
                className={`text-xs min-h-[36px] px-3 py-2 rounded border transition-colors touch-manipulation
                  ${subEntry.toBase === destination
                    ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                    : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                onClick={() => onUpdate(subEntry.id, 'toBase', destination)}
              >
                {getDestinationLabel(destination)}
              </button>
            ))}
          </div>
        </EnrichmentSection>

        {/* TOOTBLAN toggle */}
        <EnrichmentSection label="TOOTBLAN" filled={!!subEntry.isTootblan}>
          <button
            className={`text-[11px] min-h-[36px] px-3 py-2 rounded border w-full transition-colors touch-manipulation
              ${subEntry.isTootblan
                ? 'bg-[#f87171]/20 border-[#f87171] text-[#f87171]'
                : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}
              ${isScored || isInningEnd ? ' opacity-40 cursor-not-allowed' : ''}`}
            onClick={() => onUpdate(subEntry.id, 'isTootblan', !subEntry.isTootblan)}
            disabled={isScored || isInningEnd}
          >
            {subEntry.isTootblan ? 'TOOTBLAN (runner fault)' : 'Mark TOOTBLAN'}
          </button>
        </EnrichmentSection>

        {/* Out Advancing toggle */}
        <EnrichmentSection label="Out Advancing" filled={!!subEntry.isOutAdvancing}>
          <button
            className={`text-[11px] min-h-[36px] px-3 py-2 rounded border w-full transition-colors touch-manipulation
              ${subEntry.isOutAdvancing
                ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b]'
                : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}
              ${isScored || isInningEnd ? ' opacity-40 cursor-not-allowed' : ''}`}
            onClick={() => onUpdate(subEntry.id, 'isOutAdvancing', !subEntry.isOutAdvancing)}
            disabled={isScored || isInningEnd}
          >
            {subEntry.isOutAdvancing ? 'Out Advancing (mgr fault)' : 'Mark Out Advancing'}
          </button>
        </EnrichmentSection>

        {shouldShowRunPlay && (
          <EnrichmentSection label="Run Play" filled={!!subEntry.managerRunPlay}>
            <div className="grid grid-cols-1 gap-1.5">
              {MANAGER_RUN_PLAY_OPTIONS.map((option) => {
                const isSelected = subEntry.managerRunPlay === option.value;
                return (
                  <button
                    key={option.value}
                    className={`text-[11px] min-h-[36px] px-3 py-2 rounded border transition-colors touch-manipulation
                      ${isSelected
                        ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                        : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                    onClick={() => {
                      void handleManagerRunPlayChange(
                        isSelected ? undefined : option.value,
                      );
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-1 text-[10px] text-[#88AA88]">
              Use when the runner broke with the pitch on a batted ball.
            </div>
          </EnrichmentSection>
        )}

        <EnrichmentSection label="Manager Runner Call" filled={!!subEntry.managerIntent}>
          <div className="grid grid-cols-2 gap-1.5">
            {MANAGER_INTENT_OPTIONS.map((option) => {
              const isSelected = subEntry.managerIntent === option.value;
              return (
                <button
                  key={option.value}
                  className={`text-[11px] min-h-[36px] px-3 py-2 rounded border transition-colors touch-manipulation
                    ${isSelected
                      ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                      : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                  onClick={() => {
                    void handleManagerIntentChange(
                      isSelected ? undefined : option.value,
                    );
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="mt-1 text-[10px] text-[#88AA88]">
            Use only when the runner move was a recorded tactical call.
          </div>
        </EnrichmentSection>

        {shouldShowErrorAttribution && (
          <EnrichmentSection label="Error on the play?" filled={!!subEntry.errorType}>
            <div className="grid grid-cols-2 gap-2">
              {RUNNER_ERROR_OPTIONS.map((option) => {
                const isSelected = errorSelection === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex min-h-[36px] cursor-pointer items-center gap-2 rounded border px-3 py-2 text-[11px] transition-colors touch-manipulation
                      ${isSelected
                        ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#E8E8D8]'
                        : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                  >
                    <input
                      type="radio"
                      name={`runner-error-${subEntry.id}`}
                      checked={isSelected}
                      onChange={() => {
                        void handleErrorTypeChange(option.value);
                      }}
                      className="h-3.5 w-3.5 accent-[#C4A853]"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>

            {!!subEntry.errorType && (
              <div className="mt-2 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#C4A853]">
                  Charged To
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {POSITION_CHARGE_OPTIONS.map((option) => {
                    const isSelected = subEntry.errorChargedTo === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`text-[11px] min-h-[36px] rounded border px-2 py-2 transition-colors touch-manipulation
                          ${isSelected
                            ? 'bg-[#f87171]/20 border-[#f87171] text-[#f87171]'
                            : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                        onClick={() => onUpdate(subEntry.id, 'errorChargedTo', option.value)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </EnrichmentSection>
        )}

        {heldBaseSaved && (
          <EnrichmentSection label="Held by OF" filled={isHeldByOutfielder}>
            <button
              className={`text-[11px] min-h-[36px] px-3 py-2 rounded border w-full transition-colors touch-manipulation
                ${isHeldByOutfielder
                  ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                  : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
              onClick={() => {
                void handleHoldToggle();
              }}
            >
              {isHeldByOutfielder ? 'Held by OF' : 'Mark Held by OF'}
            </button>
            {isHeldByOutfielder && (
              <div className="flex gap-1.5 mt-2">
                {OUTFIELD_POSITION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`text-xs min-h-[36px] px-3 py-2 rounded border flex-1 transition-colors touch-manipulation
                      ${(subEntry.holdingFielder || subEntry.fielderPosition) === option.value
                        ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                        : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                    onClick={() => {
                      void handleHoldFielderSelect(option.value);
                    }}
                    title={outfielderByPosition?.[option.value]?.playerName}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </EnrichmentSection>
        )}

        {/* Play Mechanic */}
        <EnrichmentSection label="Play Mechanic" filled={!!subEntry.playMechanic && subEntry.playMechanic !== 'routine'}>
          <div className="flex flex-wrap gap-1.5">
            {PLAY_MECHANIC_OPTIONS.filter((pm) => pm.value !== 'hold').map((pm) => (
              <button
                key={pm.value}
                className={`text-xs min-h-[36px] px-3 py-2 rounded border transition-colors touch-manipulation
                  ${subEntry.playMechanic === pm.value
                    ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                    : 'bg-[#2a3530]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                onClick={() => onUpdate(subEntry.id, 'playMechanic', pm.value)}
              >
                {pm.label}
              </button>
            ))}
          </div>
        </EnrichmentSection>

        {/* Fielding Sequence */}
        <EnrichmentSection label="Fielding Sequence" filled={localFieldingSeq.length > 0}>
          <FieldingSequenceInput
            sequence={localFieldingSeq}
            onChange={handleFieldingSeqChange}
          />
        </EnrichmentSection>
      </div>
    </div>
  );
}

export default EnrichmentPanel;
