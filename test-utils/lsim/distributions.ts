import { FAME_TIER_ORDER, resolveFameTier, type FameTier } from '../../src/engines/fameModel';
import type { LsimStateSnapshot } from './invariants/types';

export interface LsimDistributions {
  fameTierDistribution: Record<FameTier, number>;
  traitGrantLossCounts: {
    gain: number;
    lose: number;
    byTrait: Record<string, { gain: number; lose: number }>;
  };
  awardMargins: Array<{
    category: string;
    winnerPlayerId: string | null;
    topMarginToWinner: number | null;
    candidateCount: number;
    finalized: boolean;
  }>;
  randomEventFrequencyByFamily: Record<string, number>;
  moraleRanges: {
    player: { min: number | null; max: number | null; count: number };
    teamFan: { min: number | null; max: number | null; count: number };
    autoBackstopFirings: number;
    autoBackstopFiringRate: number;
  };
  flashpointTaxMagnitudes: {
    count: number;
    minLastGameTax: number | null;
    maxLastGameTax: number | null;
    totalAccumulatedFanMoraleTax: number;
    byKind: Record<string, { count: number; accumulatedFanMoraleTax: number }>;
  };
}

function range(values: number[]): { min: number | null; max: number | null; count: number } {
  if (values.length === 0) return { min: null, max: null, count: 0 };
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
  };
}

function managerBackstopFirings(snapshot: LsimStateSnapshot): number {
  const rows = snapshot.storeDump.databases['kbl-manager-identity']?.managerAssignments ?? [];
  return rows.filter((row) => {
    const record = row as Record<string, unknown>;
    return record.tenureStatus === 'fired' ||
      record.tenureEndReason === 'fan_morale_backstop' ||
      record.firedReason === 'fan_morale_backstop';
  }).length;
}

export function computeLsimDistributions(snapshot: LsimStateSnapshot): LsimDistributions {
  const fameTierDistribution = Object.fromEntries(
    FAME_TIER_ORDER.map((tier) => [tier, 0]),
  ) as Record<FameTier, number>;
  for (const row of snapshot.fameRows) {
    const tier = resolveFameTier(row.heat, row.reachFloor);
    fameTierDistribution[tier] += 1;
  }

  const byTrait: Record<string, { gain: number; lose: number }> = {};
  for (const row of snapshot.traitOverlays) {
    byTrait[row.traitName] ??= { gain: 0, lose: 0 };
    byTrait[row.traitName][row.valence] += 1;
  }

  const familyCounts: Record<string, number> = {};
  for (const row of snapshot.l10Overlays) {
    familyCounts[row.family] = (familyCounts[row.family] ?? 0) + 1;
  }

  const playerMorale = snapshot.moraleSnapshots
    .filter((row) => row.targetType === 'player')
    .map((row) => row.currentValue);
  const teamFanMorale = snapshot.moraleSnapshots
    .filter((row) => row.targetType === 'team-fan')
    .map((row) => row.currentValue);
  const autoBackstopFirings = managerBackstopFirings(snapshot);

  const flashByKind: Record<string, { count: number; accumulatedFanMoraleTax: number }> = {};
  for (const row of snapshot.flashpointRows) {
    flashByKind[row.flashpointKind] ??= { count: 0, accumulatedFanMoraleTax: 0 };
    flashByKind[row.flashpointKind].count += 1;
    flashByKind[row.flashpointKind].accumulatedFanMoraleTax += row.accumulatedFanMoraleTax;
  }
  const lastGameTaxes = snapshot.flashpointRows.map((row) => row.lastGameTax);

  return {
    fameTierDistribution,
    traitGrantLossCounts: {
      gain: snapshot.traitOverlays.filter((row) => row.valence === 'gain').length,
      lose: snapshot.traitOverlays.filter((row) => row.valence === 'lose').length,
      byTrait,
    },
    awardMargins: snapshot.awardRows.map((row) => ({
      category: row.category,
      winnerPlayerId: row.winnerPlayerId,
      topMarginToWinner: row.candidates[0]?.marginToWinner ?? null,
      candidateCount: row.candidates.length,
      finalized: row.finalized,
    })),
    randomEventFrequencyByFamily: familyCounts,
    moraleRanges: {
      player: range(playerMorale),
      teamFan: range(teamFanMorale),
      autoBackstopFirings,
      autoBackstopFiringRate: snapshot.gamesSimulated > 0 ? autoBackstopFirings / snapshot.gamesSimulated : 0,
    },
    flashpointTaxMagnitudes: {
      count: snapshot.flashpointRows.length,
      minLastGameTax: lastGameTaxes.length > 0 ? Math.min(...lastGameTaxes) : null,
      maxLastGameTax: lastGameTaxes.length > 0 ? Math.max(...lastGameTaxes) : null,
      totalAccumulatedFanMoraleTax: snapshot.flashpointRows.reduce(
        (sum, row) => sum + row.accumulatedFanMoraleTax,
        0,
      ),
      byKind: flashByKind,
    },
  };
}
