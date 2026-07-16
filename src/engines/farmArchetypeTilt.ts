import { type Band, type BandPriorities, type TeamCapIdentity, BANDS, BAND_STATS } from './leagueConstruction';
import { CAP_MODIFICATION_FRACTIONS, type ModStat } from '../data/tierParams';
import type { AnalyzerFinding, AnalyzerConstraintKind, AnalyzerSeverity } from './rosterAnalyzerEngine';

/**
 * Build-DARK RB-9b-2 pure foundation for RB-9c's scout hole-prioritization tilt.
 * SUPERSEDES the retired farmArchetypeProfile.ts 5-category bridge per JK D-9b-2:
 * Defense is now a first-class identity band. Band weights derive from the
 * cap-modification elements so Defense-boosting elements like 'Defense First'
 * and 'Big D' raise the Defense band. tiltStrength is sim-tunable under §11.
 */

/**
 * How loudly an archetype-aligned hole "screams"; a top-band hole is x1.6.
 */
export const FARM_ARCHETYPE_TILT_TUNING = {
  tiltStrength: 0.6,
} as const;

type CapModificationDeltas = Partial<Record<ModStat, number>>;

function emptyBandWeights(): Record<Band, number> {
  const weights = {} as Record<Band, number>;
  for (const band of BANDS) {
    weights[band] = 0;
  }
  return weights;
}

function positiveBandDelta(deltas: CapModificationDeltas, band: Band): number {
  return BAND_STATS[band].reduce((sum, stat) => sum + Math.max(deltas[stat] ?? 0, 0), 0);
}

function finiteNonNegative(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

export function archetypeBandWeights(identity: TeamCapIdentity | undefined): Record<Band, number> {
  const raw = emptyBandWeights();

  if (identity?.rawShift) {
    for (const band of BANDS) {
      raw[band] = positiveBandDelta(identity.rawShift, band);
    }
  } else if (identity?.increase?.length) {
    for (const elementName of identity.increase) {
      const deltas = CAP_MODIFICATION_FRACTIONS[elementName];
      if (!deltas) continue;

      for (const band of BANDS) {
        raw[band] += positiveBandDelta(deltas, band);
      }
    }
  } else if (identity?.bandPriorities) {
    const priorities: BandPriorities = identity.bandPriorities;
    for (const band of BANDS) {
      raw[band] = finiteNonNegative(priorities[band]);
    }
  }

  const maxRaw = Math.max(0, ...BANDS.map((band) => raw[band]));
  const normalized = emptyBandWeights();
  for (const band of BANDS) {
    normalized[band] = maxRaw > 0 ? raw[band] / maxRaw : 0;
  }
  return normalized;
}

/**
 * Only positional/role HOLE kinds are archetype-tilted. Defense is first-class
 * through position_coverage/depth_chart. The join is by finding.kind because
 * AnalyzerFinding has no structured position or band field; all other analyzer
 * kinds are intentionally untilted.
 */
export const FINDING_KIND_TO_BANDS: Partial<Record<AnalyzerConstraintKind, readonly Band[]>> = {
  position_coverage: ['Defense'],
  depth_chart: ['Defense'],
  lineup: ['Power', 'Contact', 'Speed'],
  rotation: ['Rotation'],
  bullpen: ['Bullpen'],
};

export interface TiltedFinding {
  finding: AnalyzerFinding;
  bands: readonly Band[];
  bandWeight: number;
  tiltMultiplier: number;
}

export function tiltAnalyzerFindings(
  findings: readonly AnalyzerFinding[],
  identity: TeamCapIdentity | undefined,
  tuning: { tiltStrength: number } = FARM_ARCHETYPE_TILT_TUNING,
): TiltedFinding[] {
  const weights = archetypeBandWeights(identity);
  const tiltStrength = finiteNonNegative(tuning.tiltStrength);

  return findings.map((finding) => {
    const bands = FINDING_KIND_TO_BANDS[finding.kind] ?? [];
    const bandWeight = bands.length ? Math.max(...bands.map((band) => weights[band])) : 0;
    return {
      finding,
      bands,
      bandWeight,
      tiltMultiplier: 1 + bandWeight * tiltStrength,
    };
  });
}

export const TILT_SEVERITY_RANK: Record<AnalyzerSeverity, number> = {
  blocker: 3,
  critical: 2,
  warning: 1,
  info: 0,
};

export function sortByTiltedPriority(tilted: readonly TiltedFinding[]): TiltedFinding[] {
  return tilted
    .map((row, index) => ({ row, index }))
    .sort((a, b) => (
      TILT_SEVERITY_RANK[b.row.finding.severity] - TILT_SEVERITY_RANK[a.row.finding.severity]
      || b.row.tiltMultiplier - a.row.tiltMultiplier
      || a.index - b.index
    ))
    .map(({ row }) => row);
}
