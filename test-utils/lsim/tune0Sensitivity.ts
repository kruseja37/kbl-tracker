import type { Tune0CheckpointMetrics } from './tune0Metrics';

export interface Tune0VariantForRanking {
  knobId: string;
  variantId: string;
  setting: string;
  status: 'SWEEPED' | 'NOT-SWEEPABLE' | 'UNSTABLE-RUNTIME';
  checkpoints: Tune0CheckpointMetrics[] | null;
}

export interface Tune0VariantImpact {
  variantId: string;
  setting: string;
  normalizedImpact: number;
  groupImpact: Record<string, number>;
  movedDistributions: Array<{ distribution: string; normalizedImpact: number }>;
  exactMatchToBaseline: boolean;
  unstableSignals: string[];
}

export interface Tune0KnobRanking {
  rank: number;
  knobId: string;
  normalizedImpact: number;
  inert: boolean;
  unstable: boolean;
  variants: Tune0VariantImpact[];
}

type MetricGroups = Record<string, number[]>;

function numberOrZero(value: number | null): number {
  return value ?? 0;
}

function checkpointGroups(checkpoint: Tune0CheckpointMetrics): MetricGroups {
  const development = [
    checkpoint.developmentProposals.total.count,
    checkpoint.developmentProposals.total.sum,
    checkpoint.developmentProposals.total.absoluteSum,
    ...Object.values(checkpoint.developmentProposals.byAgeBand).flatMap((band) => [band.count, band.absoluteSum]),
  ];
  const traits = [checkpoint.traitProposals.gain, checkpoint.traitProposals.lose];
  const fame = [
    numberOrZero(checkpoint.fame.heat.min),
    numberOrZero(checkpoint.fame.heat.max),
    numberOrZero(checkpoint.fame.heat.mean),
    numberOrZero(checkpoint.fame.heat.p25),
    numberOrZero(checkpoint.fame.heat.median),
    numberOrZero(checkpoint.fame.heat.p75),
    ...Object.values(checkpoint.fame.tierCounts),
  ];
  const morale = [
    checkpoint.moraleDeltas.player.changed,
    checkpoint.moraleDeltas.player.sum,
    checkpoint.moraleDeltas.player.absoluteSum,
    checkpoint.moraleDeltas.teamFan.changed,
    checkpoint.moraleDeltas.teamFan.sum,
    checkpoint.moraleDeltas.teamFan.absoluteSum,
  ];
  const events = [
    checkpoint.events.l10New,
    checkpoint.events.l10Cumulative,
    checkpoint.events.l11New,
    checkpoint.events.l11Cumulative,
  ];
  const relationships = [
    checkpoint.relationships.formedNew,
    checkpoint.relationships.formedCumulative,
    checkpoint.relationships.potentialCumulative,
    checkpoint.relationships.dissolvedCumulative,
  ];
  return { development, traits, fame, morale, events, relationships };
}

function seriesGroups(checkpoints: Tune0CheckpointMetrics[]): MetricGroups {
  const last = checkpoints.at(-1);
  if (!last) return { development: [], traits: [], fame: [], morale: [], events: [], relationships: [] };
  const ageBands = Object.keys(last.developmentProposals.byAgeBand) as Array<
    keyof typeof last.developmentProposals.byAgeBand
  >;
  return {
    development: [
      checkpoints.reduce((sum, checkpoint) => sum + checkpoint.developmentProposals.total.count, 0),
      checkpoints.reduce((sum, checkpoint) => sum + checkpoint.developmentProposals.total.sum, 0),
      checkpoints.reduce((sum, checkpoint) => sum + checkpoint.developmentProposals.total.absoluteSum, 0),
      ...ageBands.flatMap((band) => [
        checkpoints.reduce((sum, checkpoint) => sum + checkpoint.developmentProposals.byAgeBand[band].count, 0),
        checkpoints.reduce((sum, checkpoint) => sum + checkpoint.developmentProposals.byAgeBand[band].absoluteSum, 0),
      ]),
    ],
    traits: [
      checkpoints.reduce((sum, checkpoint) => sum + checkpoint.traitProposals.gain, 0),
      checkpoints.reduce((sum, checkpoint) => sum + checkpoint.traitProposals.lose, 0),
    ],
    fame: [
      numberOrZero(last.fame.heat.min),
      numberOrZero(last.fame.heat.max),
      numberOrZero(last.fame.heat.mean),
      mean(checkpoints.map((checkpoint) => numberOrZero(checkpoint.fame.heat.mean))),
      ...Object.values(last.fame.tierCounts),
    ],
    morale: [
      checkpoints.reduce((sum, checkpoint) => sum + checkpoint.moraleDeltas.player.changed, 0),
      checkpoints.reduce((sum, checkpoint) => sum + checkpoint.moraleDeltas.player.sum, 0),
      checkpoints.reduce((sum, checkpoint) => sum + checkpoint.moraleDeltas.player.absoluteSum, 0),
      checkpoints.reduce((sum, checkpoint) => sum + checkpoint.moraleDeltas.teamFan.changed, 0),
      checkpoints.reduce((sum, checkpoint) => sum + checkpoint.moraleDeltas.teamFan.sum, 0),
      checkpoints.reduce((sum, checkpoint) => sum + checkpoint.moraleDeltas.teamFan.absoluteSum, 0),
    ],
    events: [
      checkpoints.reduce((sum, checkpoint) => sum + checkpoint.events.l10New, 0),
      last.events.l10Cumulative,
      checkpoints.reduce((sum, checkpoint) => sum + checkpoint.events.l11New, 0),
      last.events.l11Cumulative,
    ],
    relationships: [
      checkpoints.reduce((sum, checkpoint) => sum + checkpoint.relationships.formedNew, 0),
      last.relationships.formedCumulative,
      last.relationships.potentialCumulative,
      last.relationships.dissolvedCumulative,
    ],
  };
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function normalizedGroupImpact(baseline: readonly number[], variant: readonly number[]): number {
  if (baseline.length !== variant.length) return Number.POSITIVE_INFINITY;
  return round(mean(baseline.map((value, index) => Math.abs(variant[index] - value) / Math.max(1, Math.abs(value)))));
}

function checkpointImpact(
  baseline: Tune0CheckpointMetrics,
  variant: Tune0CheckpointMetrics,
): number {
  const baselineGroups = checkpointGroups(baseline);
  const variantGroups = checkpointGroups(variant);
  return mean(Object.keys(baselineGroups).map((group) =>
    normalizedGroupImpact(baselineGroups[group], variantGroups[group]),
  ));
}

function signFlips(values: readonly number[]): number {
  const signs = values.map((value) => Math.sign(value)).filter((value) => value !== 0);
  let flips = 0;
  for (let index = 1; index < signs.length; index += 1) {
    if (signs[index] !== signs[index - 1]) flips += 1;
  }
  return flips;
}

function unstableSignals(
  baseline: Tune0CheckpointMetrics[],
  variant: Tune0CheckpointMetrics[],
): string[] {
  const signals: string[] = [];
  if (baseline.length !== variant.length) return signals;
  const baselineFinal = baseline.at(-1)!;
  const variantFinal = variant.at(-1)!;
  if (
    variantFinal.fame.heat.p75 === 50 &&
    numberOrZero(baselineFinal.fame.heat.p75) < 50
  ) {
    signals.push(
      `fame upper-quartile clamp saturation: p75 ${baselineFinal.fame.heat.p75} -> 50`,
    );
  }
  if (
    variantFinal.fame.heat.min === -30 &&
    numberOrZero(baselineFinal.fame.heat.min) > -30
  ) {
    signals.push(
      `fame lower-clamp saturation: min ${baselineFinal.fame.heat.min} -> -30`,
    );
  }
  const divergence = baseline.map((checkpoint, index) => checkpointImpact(checkpoint, variant[index]));
  if (
    divergence.length >= 4 &&
    divergence.at(-1)! > 1 &&
    divergence.at(-1)! > divergence.at(-2)! * 1.35 &&
    divergence.at(-2)! > divergence.at(-3)!
  ) {
    signals.push(`runaway normalized divergence ${divergence.map(round).join(' -> ')}`);
  }

  const monitored = [
    {
      name: 'fame mean heat',
      values: variant.map((checkpoint, index) =>
        numberOrZero(checkpoint.fame.heat.mean) - numberOrZero(baseline[index].fame.heat.mean)),
    },
    {
      name: 'player morale net delta',
      values: variant.map((checkpoint, index) =>
        checkpoint.moraleDeltas.player.sum - baseline[index].moraleDeltas.player.sum),
    },
    {
      name: 'development absolute magnitude',
      values: variant.map((checkpoint, index) =>
        checkpoint.developmentProposals.total.absoluteSum - baseline[index].developmentProposals.total.absoluteSum),
    },
  ];
  for (const signal of monitored) {
    if (signFlips(signal.values) >= 3) signals.push(`oscillation in ${signal.name}: ${signal.values.map(round).join(' -> ')}`);
  }
  return signals;
}

export function buildTune0SensitivityRanking(
  baseline: Tune0CheckpointMetrics[],
  variants: Tune0VariantForRanking[],
): {
  method: Record<string, string>;
  ranking: Tune0KnobRanking[];
  inertKnobs: string[];
  unstableKnobs: string[];
  notSweepable: string[];
} {
  const baselineGroups = seriesGroups(baseline);
  const grouped = new Map<string, Tune0VariantForRanking[]>();
  for (const variant of variants) {
    grouped.set(variant.knobId, [...(grouped.get(variant.knobId) ?? []), variant]);
  }

  const notSweepable = [...grouped.entries()]
    .filter(([, entries]) => entries.every((entry) => entry.status === 'NOT-SWEEPABLE'))
    .map(([knobId]) => knobId)
    .sort();
  const unranked = [...grouped.entries()]
    .filter(([, entries]) => entries.some((entry) => entry.status === 'SWEEPED'))
    .map(([knobId, entries]) => {
      const impacts: Tune0VariantImpact[] = entries
        .filter((entry): entry is Tune0VariantForRanking & { checkpoints: Tune0CheckpointMetrics[] } =>
          entry.status === 'SWEEPED' && entry.checkpoints !== null,
        )
        .map((entry) => {
          const variantGroups = seriesGroups(entry.checkpoints);
          const groupImpact = Object.fromEntries(
            Object.keys(baselineGroups).map((group) => [group, normalizedGroupImpact(baselineGroups[group], variantGroups[group])]),
          );
          const normalizedImpact = round(mean(Object.values(groupImpact)));
          return {
            variantId: entry.variantId,
            setting: entry.setting,
            normalizedImpact,
            groupImpact,
            movedDistributions: Object.entries(groupImpact)
              .filter(([, impact]) => impact > 0)
              .map(([distribution, impact]) => ({ distribution, normalizedImpact: impact }))
              .sort((left, right) => right.normalizedImpact - left.normalizedImpact),
            exactMatchToBaseline: JSON.stringify(entry.checkpoints) === JSON.stringify(baseline),
            unstableSignals: unstableSignals(baseline, entry.checkpoints),
          };
        });
      return {
        rank: 0,
        knobId,
        normalizedImpact: Math.max(...impacts.map((impact) => impact.normalizedImpact), 0),
        inert: impacts.every((impact) => impact.exactMatchToBaseline),
        unstable:
          entries.some((entry) => entry.status === 'UNSTABLE-RUNTIME') ||
          impacts.some((impact) => impact.unstableSignals.length > 0),
        variants: impacts,
      };
    })
    .sort((left, right) => right.normalizedImpact - left.normalizedImpact || left.knobId.localeCompare(right.knobId))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return {
    method: {
      componentNormalization: 'abs(variant - baseline) / max(1, abs(baseline))',
      distributionImpact: 'mean normalized component impact across all five checkpoints',
      knobImpact: 'maximum low/high variant impact; six output families receive equal weight',
      inertRule: 'all sweeped checkpoint summaries are byte-equal to baseline',
      unstableRule: 'runaway normalized divergence or at least three sign flips in a monitored checkpoint series',
    },
    ranking: unranked,
    inertKnobs: unranked.filter((entry) => entry.inert).map((entry) => entry.knobId),
    unstableKnobs: unranked.filter((entry) => entry.unstable).map((entry) => entry.knobId),
    notSweepable,
  };
}
