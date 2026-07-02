/**
 * PLAYER-ARCHETYPE CLASSIFIER — the reverse map (Move 2; design:
 * spec-docs/FABLE_PLAYER_TAXONOMY_DESIGN_2026-07-02.md §3).
 *
 * Deterministic, pure, materialize-on-read: ratings + the WHOLE profile in, a named shape +
 * orthogonal tags out. No storage — the persisted `prospectProfile.archetypeFamily` remains
 * the generator's declared family, and the self-consistency sim (§4 S4) holds the two
 * accountable to each other.
 *
 * Shape = tool-DEVIATION pattern with the level removed (a B-grade Slugger and a superstar
 * Slugger classify identically — that is what makes "the cheap version of this shape" a
 * real menu concept). Flat-shape profiles stratify by LEVEL: high → Five-Tool (hitters),
 * mid → Balanced, depth → the deliberate Filler classes.
 */

import {
  AGE_BANDS,
  ALL_SHAPES,
  EXTENDED_SHAPES,
  PERSONALITY_GROUPS,
  TAXONOMY_TUNING,
  type AgeBand,
  type ArchetypeFamilyDefinition,
  type ExtendedShapeDefinition,
  type PersonalityGroup,
  type ShapeBiasVector,
  type TaxonomyPosition,
  type TaxonomyTool,
} from '../data/playerArchetypeTaxonomy';
import { archetypeCapShift, type HistoricalArchetype } from '../data/historicalArchetypes';

const HITTER_TOOLS = ['power', 'contact', 'speed', 'fielding', 'arm'] as const;
const PITCHER_TOOLS = ['velocity', 'junk', 'accuracy'] as const;

const DEPTH_SHAPES = new Set(
  EXTENDED_SHAPES.filter((shape) => shape.depthClass).map((shape) => shape.family),
);

export interface ClassifiableProfile {
  isPitcher: boolean;
  primaryPosition: string;
  secondaryPosition?: string | null;
  bats?: string;
  throws?: string;
  age?: number;
  power?: number;
  contact?: number;
  speed?: number;
  fielding?: number;
  arm?: number;
  velocity?: number;
  junk?: number;
  accuracy?: number;
  traits?: readonly (string | undefined | null)[];
  arsenal?: readonly string[];
  personality?: string;
}

export interface ProfileTags {
  bats: 'L' | 'R' | 'S' | null;
  leftArm: boolean;
  utility: string | null;
  twoWay: boolean;
  platoonSides: readonly ('vs-LHP' | 'vs-RHP')[];
  ageBand: AgeBand | null;
  deepArsenal: boolean;
  personalityGroup: PersonalityGroup | 'UNKNOWN';
}

export interface ShapeClassification {
  shape: string;
  similarity: number;
  runnerUp: string | null;
  runnerUpSimilarity: number;
  levelStratum: 'star' | 'regular' | 'depth';
  toolLevel: number;
  tags: ProfileTags;
}

function toolValues(profile: ClassifiableProfile, tools: readonly TaxonomyTool[]): number[] {
  return tools.map((tool) => {
    const value = profile[tool];
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  });
}

function center(values: number[]): { centered: number[]; mean: number } {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return { centered: values.map((value) => value - mean), mean };
}

function templateVector(template: ShapeBiasVector, tools: readonly TaxonomyTool[]): number[] {
  return tools.map((tool) => template[tool] ?? 0);
}

function cosine(left: number[], right: number[]): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function extractTags(profile: ClassifiableProfile): ProfileTags {
  const traits = (profile.traits ?? []).filter(
    (trait): trait is string => typeof trait === 'string' && trait.length > 0,
  );
  const platoonSides: ('vs-LHP' | 'vs-RHP')[] = [];
  for (const trait of traits) {
    if (trait === 'POW vs LHP' || trait === 'CON vs LHP') {
      if (!platoonSides.includes('vs-LHP')) platoonSides.push('vs-LHP');
    }
    if (trait === 'POW vs RHP' || trait === 'CON vs RHP') {
      if (!platoonSides.includes('vs-RHP')) platoonSides.push('vs-RHP');
    }
  }
  const bats = profile.bats === 'L' || profile.bats === 'R' || profile.bats === 'S' ? profile.bats : null;
  const ageBand =
    typeof profile.age === 'number' && Number.isFinite(profile.age)
      ? AGE_BANDS.find((band) => (profile.age as number) <= band.maxAge)?.band ?? null
      : null;
  return {
    bats,
    leftArm: profile.isPitcher && profile.throws === 'L',
    utility: profile.secondaryPosition ? String(profile.secondaryPosition) : null,
    twoWay: traits.some((trait) => trait.startsWith('Two Way')),
    platoonSides,
    ageBand,
    deepArsenal: profile.isPitcher && (profile.arsenal?.length ?? 0) >= 4,
    personalityGroup:
      (profile.personality && PERSONALITY_GROUPS[profile.personality]) || 'UNKNOWN',
  };
}

function candidateShapes(
  role: 'hitter' | 'pitcher',
  stratum: 'star' | 'regular' | 'depth',
  arsenalSize: number,
  pool: readonly ArchetypeFamilyDefinition[],
): ArchetypeFamilyDefinition[] {
  return pool.filter((shape) => {
    if (shape.role !== role) return false; // 'both' (Balanced) is flat-path only
    if (DEPTH_SHAPES.has(shape.family) && stratum !== 'depth') return false;
    const extended = shape as ExtendedShapeDefinition;
    if (typeof extended.maxArsenal === 'number' && arsenalSize > extended.maxArsenal) return false;
    // Empty templates (the Fillers) never win by similarity; the flat path assigns them.
    if (Object.keys(shape.template).length === 0) return false;
    return true;
  });
}

export interface ClassifyOptions {
  /**
   * Restrict similarity matching to these shapes (default ALL_SHAPES). The
   * self-consistency sim uses the generator's 17 to measure intent-recovery separately
   * from absorption by the extended menu.
   */
  shapes?: readonly ArchetypeFamilyDefinition[];
}

/**
 * Classify the WHOLE profile (JK rider 2026-07-02) into shape + tags.
 */
export function classifyPlayerArchetype(
  profile: ClassifiableProfile,
  options: ClassifyOptions = {},
): ShapeClassification {
  const role = profile.isPitcher ? 'pitcher' : 'hitter';
  const tools = profile.isPitcher ? PITCHER_TOOLS : HITTER_TOOLS;
  const { centered, mean } = center(toolValues(profile, tools));
  const maxDeviation = Math.max(...centered.map((value) => Math.abs(value)));
  const stratum: 'star' | 'regular' | 'depth' =
    mean >= TAXONOMY_TUNING.fiveToolLevelMin
      ? 'star'
      : mean < TAXONOMY_TUNING.depthLevelMax
        ? 'depth'
        : 'regular';
  const tags = extractTags(profile);

  if (maxDeviation < TAXONOMY_TUNING.flatShapeNorm) {
    const flatShape = profile.isPitcher
      ? stratum === 'depth'
        ? 'Bullpen-Filler'
        : 'Balanced'
      : stratum === 'star'
        ? 'Five-Tool'
        : stratum === 'depth'
          ? 'Roster-Filler'
          : 'Balanced';
    return {
      shape: flatShape,
      similarity: 1,
      runnerUp: 'Balanced',
      runnerUpSimilarity: 0,
      levelStratum: stratum,
      toolLevel: mean,
      tags,
    };
  }

  const candidates = candidateShapes(role, stratum, profile.arsenal?.length ?? 0, options.shapes ?? ALL_SHAPES);
  let best: { family: string; score: number } | null = null;
  let second: { family: string; score: number } | null = null;
  for (const shape of candidates) {
    const template = center(templateVector(shape.template, tools)).centered;
    const score = cosine(centered, template);
    if (!best || score > best.score) {
      second = best;
      best = { family: shape.family, score };
    } else if (!second || score > second.score) {
      second = { family: shape.family, score };
    }
  }

  return {
    shape: best?.family ?? 'Balanced',
    similarity: best?.score ?? 0,
    runnerUp: second?.family ?? null,
    runnerUpSimilarity: second?.score ?? 0,
    levelStratum: stratum,
    toolLevel: mean,
    tags,
  };
}

/**
 * ALIGNMENT (design §2.4 — the KEY FEATURE, with the trap guard): the cap-shift fit rule
 * applied to the shape's signed template. Positive = this shape is CHEAP under the
 * identity's cap shifts (strong where boosted AND weak where nerfed both align). This is
 * IDENTITY FIT, deliberately not a value ranking — the market brain prices value.
 * Single-math: consumes archetypeCapShift (the same resolver the auction cap math uses).
 */
const HITTER_LUX_KEY: Partial<Record<TaxonomyTool, string>> = {
  power: 'hitters/POW',
  contact: 'hitters/CON',
  speed: 'hitters/SPD',
  fielding: 'hitters/FLD',
  arm: 'hitters/ARM',
};

export type PitcherAlignmentGroup = 'rotation' | 'bullpen';

function luxKeyFor(tool: TaxonomyTool, group: PitcherAlignmentGroup): string | undefined {
  if (tool === 'velocity') return `${group}/VEL`;
  if (tool === 'junk') return `${group}/JNK`;
  if (tool === 'accuracy') return `${group}/ACC`;
  return HITTER_LUX_KEY[tool];
}

export function shapeAlignmentScore(
  shape: ArchetypeFamilyDefinition,
  archetype: HistoricalArchetype,
  group: PitcherAlignmentGroup = 'rotation',
): number {
  const shift = archetypeCapShift(archetype);
  let score = 0;
  for (const [tool, weight] of Object.entries(shape.template) as [TaxonomyTool, number][]) {
    const key = luxKeyFor(tool, group);
    if (!key) continue;
    score += weight * (shift[key] ?? 0);
  }
  return score;
}

export function pitcherAlignmentGroupFor(position: TaxonomyPosition): PitcherAlignmentGroup {
  return position === 'RP' || position === 'CP' ? 'bullpen' : 'rotation';
}
