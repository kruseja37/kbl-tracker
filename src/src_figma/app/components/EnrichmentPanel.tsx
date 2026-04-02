import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAtBatEvent, type AtBatEvent } from '../../../utils/eventLog';
import {
  inferFielder,
  type AtBatResult,
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
} from '../utils/gameTrackerRunnerCorrection';
import {
  inferAssistChain,
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
  hrDistance?: number;
  pitchType?: string;
  pitchesInAtBat?: number;
}

// ──────────────────────────────────────────────────────────────
// Layer D — Modifiers (§8.1)
// Removed: BUNT (now contact type), TOOTBLAN (now runner-level)
// Added: BEAT_RUNNER
// ──────────────────────────────────────────────────────────────

const MODIFIER_OPTIONS = [
  { value: 'SEVEN_PLUS_PITCH_AB', label: '7+' },
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

const ALL_CONTACT_MODIFIERS: AtBatModifierValue[] = ['SEVEN_PLUS_PITCH_AB', 'ROBBERY', 'KILLED_PITCHER', 'NUT_SHOT', 'BEAT_THROW', 'BEAT_RUNNER'];
const NO_KP_NUT: AtBatModifierValue[] = ['SEVEN_PLUS_PITCH_AB', 'ROBBERY', 'BEAT_THROW', 'BEAT_RUNNER'];
const HR_FIELDING_PLAY_TYPES = new Set<FieldingPlayTypeValue>([
  'failed_robbery',
]);
const SAVED_BASES_ATTEMPT_TYPES = new Set<FieldingAttemptType>([
  'diving',
  'sliding',
  'charging',
  'over_shoulder',
]);

function supportsSavedBases(attemptType?: FieldingAttemptType): boolean {
  return !!attemptType && SAVED_BASES_ATTEMPT_TYPES.has(attemptType);
}

export const ENRICHMENT_CONFIG: Record<string, EnrichmentConfig> = {
  // Outs — §8.2 zone counts
  GO:  { spray: true,  sprayZones: 18, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['SEVEN_PLUS_PITCH_AB', 'KILLED_PITCHER', 'NUT_SHOT', 'BEAT_RUNNER'], hrDistance: false },
  FO:  { spray: true,  sprayZones: 27, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['SEVEN_PLUS_PITCH_AB', 'KILLED_PITCHER', 'NUT_SHOT', 'BEAT_RUNNER'], hrDistance: false },
  FLO: { spray: true,  sprayZones: 27, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['SEVEN_PLUS_PITCH_AB', 'KILLED_PITCHER', 'NUT_SHOT', 'BEAT_RUNNER'], hrDistance: false },
  LO:  { spray: true,  sprayZones: 39, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['SEVEN_PLUS_PITCH_AB', 'KILLED_PITCHER', 'NUT_SHOT', 'BEAT_RUNNER'], hrDistance: false },
  PO:  { spray: true,  sprayZones: 27, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['SEVEN_PLUS_PITCH_AB', 'KILLED_PITCHER', 'NUT_SHOT', 'BEAT_RUNNER'], hrDistance: false },
  DP:  { spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['SEVEN_PLUS_PITCH_AB', 'KILLED_PITCHER', 'NUT_SHOT', 'BEAT_RUNNER'], hrDistance: false },
  TP:  { spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['SEVEN_PLUS_PITCH_AB', 'KILLED_PITCHER', 'NUT_SHOT', 'BEAT_RUNNER'], hrDistance: false },
  FC:  { spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['SEVEN_PLUS_PITCH_AB', 'KILLED_PITCHER', 'NUT_SHOT', 'BEAT_THROW', 'BEAT_RUNNER'], hrDistance: false },
  // Hits — §8.2: 6 dirs × (3 IF + 4 OF) = 42
  '1B': { spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['SEVEN_PLUS_PITCH_AB', 'KILLED_PITCHER', 'NUT_SHOT', 'BEAT_THROW'], hrDistance: false },
  '2B': { spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['SEVEN_PLUS_PITCH_AB', 'KILLED_PITCHER', 'NUT_SHOT', 'BEAT_THROW'], hrDistance: false },
  '3B': { spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['SEVEN_PLUS_PITCH_AB', 'KILLED_PITCHER', 'NUT_SHOT', 'BEAT_THROW'], hrDistance: false },
  GRD: { spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['SEVEN_PLUS_PITCH_AB', 'KILLED_PITCHER', 'NUT_SHOT', 'BEAT_THROW'], hrDistance: false },
  ITPHR:{ spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['SEVEN_PLUS_PITCH_AB', 'KILLED_PITCHER', 'NUT_SHOT', 'BEAT_THROW'], hrDistance: false },
  // HR — §8.2: 7 dirs × 3 depths = 21
  HR:  { spray: true,  sprayZones: 21, chase: true,  fieldingAttempt: true,  playMechanic: false, contactType: true, modifiers: ['SEVEN_PLUS_PITCH_AB'], hrDistance: true },
  // Sacrifices — no KP/NUT per §8.5
  SAC: { spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['SEVEN_PLUS_PITCH_AB'], hrDistance: false },
  SF:  { spray: true,  sprayZones: 27, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['SEVEN_PLUS_PITCH_AB'], hrDistance: false },
  // Errors — §8.2: IF + OF = 42
  E:   { spray: true,  sprayZones: 42, chase: true,  fieldingAttempt: true,  playMechanic: true,  contactType: true, modifiers: ['SEVEN_PLUS_PITCH_AB', 'KILLED_PITCHER', 'NUT_SHOT'], hrDistance: false },
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
// dirs = angular divisions, depths = radial bands, foul = extra foul zones
interface SprayZoneLayout {
  dirs: number;
  depths: number;
  foul: number;
  /** Radial range [0..1] — 0 = home plate, 0.45 = IF boundary, 1.0 = fence */
  innerR: number;
  outerR: number;
}

const SPRAY_ZONE_LAYOUTS: Record<string, SprayZoneLayout> = {
  HR:  { dirs: 7, depths: 3, foul: 0, innerR: 0.65, outerR: 1.0 },  // 21: beyond fence
  GO:  { dirs: 6, depths: 3, foul: 0, innerR: 0.0,  outerR: 0.45 }, // 18: infield only
  FO:  { dirs: 6, depths: 4, foul: 3, innerR: 0.4,  outerR: 1.0 },  // 27: OF + foul
  FLO: { dirs: 6, depths: 4, foul: 3, innerR: 0.4,  outerR: 1.0 },  // 27: OF + foul
  LO:  { dirs: 6, depths: 6, foul: 3, innerR: 0.2,  outerR: 1.0 },  // 39: OF + med/deep IF + foul
  PO:  { dirs: 6, depths: 4, foul: 3, innerR: 0.0,  outerR: 0.55 }, // 27: IF + shallow OF + foul
  DEFAULT: { dirs: 6, depths: 7, foul: 0, innerR: 0.0, outerR: 1.0 }, // 42: IF + OF (1B/2B/3B/E/ITPHR/GRD)
};

function getZoneLayout(result: string): SprayZoneLayout {
  if (SPRAY_ZONE_LAYOUTS[result]) return SPRAY_ZONE_LAYOUTS[result];
  // Map result types to their layout
  if (['1B', '2B', '3B', 'E', 'GRD', 'DP', 'TP', 'FC', 'SAC'].includes(result)) return SPRAY_ZONE_LAYOUTS.DEFAULT;
  if (result === 'SF') return SPRAY_ZONE_LAYOUTS.FO; // SF uses same as FO (OF + foul)
  return SPRAY_ZONE_LAYOUTS.DEFAULT;
}

// Polar-to-cartesian for zone path generation
// Fan apex at (100, 115), full radius ≈ 110px
const CX = 100;
const CY = 115;
const MAX_R = 110;
// Fan angular range: from ~228° to ~312° (centered on 270° = straight up)
const FAN_START = (228 * Math.PI) / 180;
const FAN_END = (312 * Math.PI) / 180;

function polarToXY(angle: number, radius: number): [number, number] {
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
}

function buildZonePath(a1: number, a2: number, r1: number, r2: number): string {
  const [x1, y1] = polarToXY(a1, r1);
  const [x2, y2] = polarToXY(a2, r1);
  const [x3, y3] = polarToXY(a2, r2);
  const [x4, y4] = polarToXY(a1, r2);
  const largeArc = Math.abs(a2 - a1) > Math.PI ? 1 : 0;
  // Inner arc → line → outer arc → close
  return `M ${x1} ${y1} A ${r1} ${r1} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${r2} ${r2} 0 ${largeArc} 0 ${x4} ${y4} Z`;
}

interface ZoneData {
  id: string;
  path: string;
  centerX: number;
  centerY: number;
}

interface SpraySelection {
  x: number;
  y: number;
  zone?: string;
  direction?: Direction | null;
}

const FAIR_SPRAY_DIRECTIONS: Direction[] = [
  'Left',
  'Left-Center',
  'Center',
  'Right-Center',
  'Right',
];

function getDirectionFromZone(zone: ZoneData): Direction | null {
  if (zone.id === 'foul_l') return 'Foul-Left';
  if (zone.id === 'foul_r') return 'Foul-Right';
  if (zone.id === 'foul_c') return null;

  let angle = Math.atan2(zone.centerY - CY, zone.centerX - CX);
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

function getStoredSprayZone(zone: ZoneData, direction: Direction | null): string | undefined {
  if (direction) return direction;
  if (zone.id === 'foul_c') return 'Behind-Plate';
  return undefined;
}

function getPositionNumber(position: Position | null): number | null {
  if (!position) return null;
  return FIELDER_POSITIONS.find((fielder) => fielder.label === position)?.num ?? null;
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

function generateZones(layout: SprayZoneLayout): ZoneData[] {
  const zones: ZoneData[] = [];
  const angularSpan = FAN_END - FAN_START;
  const dirStep = angularSpan / layout.dirs;
  const radialSpan = (layout.outerR - layout.innerR) * MAX_R;
  const depthStep = radialSpan / layout.depths;
  const innerPx = layout.innerR * MAX_R;

  // Main zones: dirs × depths
  for (let d = 0; d < layout.dirs; d++) {
    const a1 = FAN_START + d * dirStep;
    const a2 = FAN_START + (d + 1) * dirStep;
    const aMid = (a1 + a2) / 2;

    for (let r = 0; r < layout.depths; r++) {
      const r1 = innerPx + r * depthStep;
      const r2 = innerPx + (r + 1) * depthStep;
      const rMid = (r1 + r2) / 2;
      const [cx, cy] = polarToXY(aMid, rMid);
      zones.push({
        id: `d${d}r${r}`,
        path: buildZonePath(a1, a2, r1, r2),
        centerX: cx,
        centerY: cy,
      });
    }
  }

  // Foul zones: 3 zones outside the foul lines (left, right, behind plate)
  if (layout.foul > 0) {
    const foulR1 = innerPx + depthStep;
    const foulR2 = innerPx + depthStep * Math.min(3, layout.depths);
    // Left foul (beyond LF foul line)
    const lfFoulA1 = FAN_START - (15 * Math.PI) / 180;
    const lfFoulA2 = FAN_START;
    const [flCx, flCy] = polarToXY((lfFoulA1 + lfFoulA2) / 2, (foulR1 + foulR2) / 2);
    zones.push({ id: 'foul_l', path: buildZonePath(lfFoulA1, lfFoulA2, foulR1, foulR2), centerX: flCx, centerY: flCy });
    // Right foul (beyond RF foul line)
    const rfFoulA1 = FAN_END;
    const rfFoulA2 = FAN_END + (15 * Math.PI) / 180;
    const [frCx, frCy] = polarToXY((rfFoulA1 + rfFoulA2) / 2, (foulR1 + foulR2) / 2);
    zones.push({ id: 'foul_r', path: buildZonePath(rfFoulA1, rfFoulA2, foulR1, foulR2), centerX: frCx, centerY: frCy });
    // Behind plate (foul popup)
    const behindA1 = FAN_START - (8 * Math.PI) / 180;
    const behindA2 = FAN_END + (8 * Math.PI) / 180;
    const behindR1 = 2;
    const behindR2 = innerPx > 5 ? innerPx : 15;
    const [bCx, bCy] = polarToXY((behindA1 + behindA2) / 2, (behindR1 + behindR2) / 2);
    zones.push({ id: 'foul_c', path: buildZonePath(behindA1, behindA2, behindR1, behindR2), centerX: bCx, centerY: bCy });
  }

  return zones;
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
  const zones = useMemo(() => generateZones(layout), [layout]);

  const handleZoneClick = useCallback((zone: ZoneData) => {
    // Convert zone center from SVG coords (200×120) to 0-100 percentage space
    const x = Math.round((zone.centerX / 200) * 100);
    const y = Math.round((zone.centerY / 120) * 100);
    const direction = getDirectionFromZone(zone);

    onTap({
      x,
      y,
      zone: getStoredSprayZone(zone, direction),
      direction,
    });
  }, [onTap]);

  // Fallback: click anywhere on the field for free placement
  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Only handle if clicking on the SVG background (not a zone)
    if ((e.target as SVGElement).tagName === 'svg') {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
      const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
      onTap({ x, y });
    }
  }, [onTap]);

  return (
    <svg
      viewBox="0 0 200 120"
      className="w-full h-[140px] cursor-crosshair bg-[#2a5a2d]/60 rounded border border-[#4a6a4a] touch-manipulation"
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
      {/* Zone sectors — clickable regions per §8.2 */}
      {zones.map((zone) => (
        <path
          key={zone.id}
          d={zone.path}
          data-testid={`spray-zone-${zone.id}`}
          fill={location && Math.abs(zone.centerX - location.x * 2) < 10 && Math.abs(zone.centerY - location.y * 1.2) < 8
            ? '#f59e0b33'
            : 'transparent'}
          stroke="#3a5a3a"
          strokeWidth="0.3"
          className="cursor-pointer hover:fill-[#C4A853]/20"
          onClick={(e) => { e.stopPropagation(); handleZoneClick(zone); }}
        />
      ))}
      {/* Sector lines (6 directions: LF line, LF, LC, C, RC, RF line) */}
      <line x1="100" y1="115" x2="15" y2="40" stroke="#4a6a4a" strokeWidth="0.3" />
      <line x1="100" y1="115" x2="40" y2="25" stroke="#3a5a3a" strokeWidth="0.3" />
      <line x1="100" y1="115" x2="65" y2="15" stroke="#3a5a3a" strokeWidth="0.3" />
      <line x1="100" y1="115" x2="100" y2="5" stroke="#3a5a3a" strokeWidth="0.3" />
      <line x1="100" y1="115" x2="135" y2="15" stroke="#3a5a3a" strokeWidth="0.3" />
      <line x1="100" y1="115" x2="160" y2="25" stroke="#3a5a3a" strokeWidth="0.3" />
      <line x1="100" y1="115" x2="185" y2="40" stroke="#4a6a4a" strokeWidth="0.3" />
      {/* Base markers */}
      <rect x="98" y="108" width="4" height="4" fill="#E8E8D8" rx="0.5" />
      <rect x="70" y="83" width="3" height="3" fill="#E8E8D8" rx="0.5" />
      <rect x="98" y="58" width="3" height="3" fill="#E8E8D8" rx="0.5" />
      <rect x="126" y="83" width="3" height="3" fill="#E8E8D8" rx="0.5" />
      {/* Placed dot */}
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
                : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
            onClick={() => onChange([...sequence, f.num])}
          >
            {f.num}
          </button>
        ))}
      </div>
      {sequence.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-[#88AA88] font-mono">
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
    setLocalFieldingSeq(currentEnrichment?.fieldingSequence || []);
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
  const canTrackSavedBases = supportsSavedBases(attemptType);
  const isSavedBasesEnabled = typeof basesSaved === 'number';

  const isK = entry.result === 'K' || entry.result === 'Kc';
  const supportsBatterOutAdvancing = ['1B', '2B', '3B', 'GRD'].includes(entry.result);

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

  const applyInferredAssistChain = useCallback((primaryFielder: number) => {
    const inferredSequence = inferAssistChain(
      entry.result,
      primaryFielder,
      baseOccupancy
    );

    lastAutoInferredSeqRef.current = {
      primary: primaryFielder,
      sequence: inferredSequence,
    };

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
    applyInferredAssistChain(positionNumber);
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

    const inferredPrimaryFielder = inferFielder(
      entry.result as AtBatResult,
      selection.direction
    );
    const inferredPrimaryNumber = getPositionNumber(inferredPrimaryFielder);

    if (!inferredPrimaryFielder || !inferredPrimaryNumber) return;

    console.log(`[M2-3-fix] Inferred fielder: ${inferredPrimaryFielder}`);
    applyInferredAssistChain(inferredPrimaryNumber);
  }, [applyInferredAssistChain, entry.result, onUpdate]);

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
    <div className="bg-[#2a3a2d] border-l-2 border-[#C4A853] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#1a2a1d] border-b border-[#4a6a4a]">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#88AA88] font-mono">{entry.inningLabel}</span>
          <span className="text-[11px] text-[#E8E8D8] font-bold">{entry.batterName}</span>
          <span className="text-[11px] font-bold" style={{ color: getResultColorLocal(entry.result) }}>
            {entry.result}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[11px] min-h-[36px] text-[#E8E8D8] bg-[#3d5240] border border-[#4a6a4a] px-3 py-2 rounded hover:bg-[#4a6a4a] touch-manipulation"
        >
          {closeLabel}
        </button>
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
                      : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
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
                          : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
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
                            : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
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
                              : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
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
                    : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
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
                        : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
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
                      : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
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
                  : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
              onClick={() => onUpdate('batterOutAdvancing', !currentEnrichment?.batterOutAdvancing)}
            >
              Out Advancing
            </button>
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
                className="w-full min-h-[40px] bg-[#1f2937] border border-[#4a6a4a] text-[#E8E8D8] text-sm px-3 py-2 rounded"
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
            {(putoutLabel || assistLabel || errorLabel) && (
              <div className="mt-2 bg-[#1f2937]/60 border border-[#4a6a4a] rounded px-2 py-2 space-y-1">
                {putoutLabel && (
                  <div className="text-[10px] text-[#E8E8D8]">
                    Putouts: <span className="font-mono text-[#C4A853]">{putoutLabel}</span>
                  </div>
                )}
                {assistLabel && (
                  <div className="text-[10px] text-[#E8E8D8]">
                    Assists: <span className="font-mono text-[#C4A853]">{assistLabel}</span>
                  </div>
                )}
                {errorLabel && (
                  <div className="text-[10px] text-[#E8E8D8]">
                    Errors: <span className="font-mono text-[#f59e0b]">{errorLabel}</span>
                  </div>
                )}
              </div>
            )}
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
            className="w-full min-h-[40px] bg-[#1f2937] border border-[#4a6a4a] text-[#E8E8D8] text-sm px-3 py-2 rounded"
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
                    : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                onClick={() => onUpdate('pitchType', pt.abbr)}
                title={pt.label}
              >
                {pt.abbr}
              </button>
            ))}
          </div>
        </EnrichmentSection>

        {/* Pitches in At-Bat */}
        <EnrichmentSection label="Pitches in AB" filled={!!currentEnrichment?.pitchesInAtBat}>
          <input
            type="number"
            min={1}
            max={20}
            defaultValue={currentEnrichment?.pitchesInAtBat || ''}
            placeholder="1-20"
            className="w-full min-h-[40px] bg-[#1f2937] border border-[#4a6a4a] text-[#E8E8D8] text-sm px-3 py-2 rounded"
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val >= 1 && val <= 20) onUpdate('pitchesInAtBat', val);
            }}
          />
          {(currentEnrichment?.pitchesInAtBat ?? 0) >= 7 && (
            <div className="text-[10px] text-[#34d399] mt-1">Quality At-Bat (7+ pitches)</div>
          )}
        </EnrichmentSection>

        {config.chase && (
          <EnrichmentSection label="Chase" filled={!!currentEnrichment?.chased}>
            <button
              aria-pressed={!!currentEnrichment?.chased}
              className={`text-xs min-h-[36px] px-3 py-2 rounded border transition-colors touch-manipulation
                ${currentEnrichment?.chased
                  ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#fbbf24]'
                  : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#6b7280] hover:bg-[#4a6a4a]/40'}`}
              onClick={handleChaseToggle}
            >
              {currentEnrichment?.chased ? 'CHASE' : 'chase'}
            </button>
          </EnrichmentSection>
        )}

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
                        : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
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
                    : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                onClick={() => {/* K toggle handled by parent */}}
              >
                K (Swinging)
              </button>
              <button
                className={`text-[11px] min-h-[36px] px-3 py-2 rounded border flex-1 touch-manipulation
                  ${entry.result === 'Kc'
                    ? 'bg-[#f87171]/20 border-[#f87171] text-[#f87171]'
                    : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
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

const isRunnerOutcomeOut = (toBase: RunnerSubEntry['toBase']) => toBase === 'out';

interface RunnerEnrichmentPanelProps {
  subEntry: RunnerSubEntry;
  outfielderByPosition?: Partial<Record<OutfieldPosition, { playerId: string; playerName: string }>>;
  onUpdate: (
    subEntryId: string,
    field: keyof Pick<RunnerSubEntry, 'fieldingSequence' | 'playMechanic' | 'fielderId' | 'fielderPosition' | 'heldByOf' | 'holdingFielder' | 'baseSaved' | 'isTootblan' | 'isOutAdvancing' | 'toBase' | 'errorType' | 'errorChargedTo'>,
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
  const destinationOptions = getRunnerDestinationOptions(subEntry.fromBase);
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
    isRunnerOutcomeOut(initialToBase) !== isRunnerOutcomeOut(subEntry.toBase) ||
    !!subEntry.errorType ||
    typeof subEntry.errorChargedTo === 'number';

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

  return (
    <div className="bg-[#2a3a2d] border-l-2 border-[#C4A853] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#1a2a1d] border-b border-[#4a6a4a]">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#6b7280]">└</span>
          <span className={`text-[11px] font-bold ${isScored ? 'text-[#34d399]' : isOut ? 'text-[#f87171]' : isInningEnd ? 'text-[#fbbf24]' : 'text-[#E8E8D8]'}`}>
            {subEntry.runnerName}
          </span>
          <span className="text-[10px] text-[#88AA88] font-mono">
            {BASE_DISPLAY[subEntry.fromBase]}→{BASE_DISPLAY[subEntry.toBase]}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[11px] min-h-[36px] text-[#E8E8D8] bg-[#3d5240] border border-[#4a6a4a] px-3 py-2 rounded hover:bg-[#4a6a4a] touch-manipulation"
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
                    : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                onClick={() => onUpdate(subEntry.id, 'toBase', destination)}
              >
                {BASE_DISPLAY[destination]}
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
                : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}
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
                : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}
              ${isScored || isInningEnd ? ' opacity-40 cursor-not-allowed' : ''}`}
            onClick={() => onUpdate(subEntry.id, 'isOutAdvancing', !subEntry.isOutAdvancing)}
            disabled={isScored || isInningEnd}
          >
            {subEntry.isOutAdvancing ? 'Out Advancing (mgr fault)' : 'Mark Out Advancing'}
          </button>
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
                        : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
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
                            : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
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
                  : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
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
                        : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
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
                    : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
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
