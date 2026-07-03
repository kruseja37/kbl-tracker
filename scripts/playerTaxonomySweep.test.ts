/**
 * PLAYER-TAXONOMY VALIDATION SWEEP — S1 coverage · S2 price ladder · S4 self-consistency
 * (design: spec-docs/FABLE_PLAYER_TAXONOMY_DESIGN_2026-07-02.md §4).
 *
 * Opt-in like the other tuning sims:  NODE_ENV= RUN_AUCTION_TUNING_SIM=1 npx vitest run scripts/playerTaxonomySweep.test.ts
 *
 * S3 (choice parity) + S5 (alignment sanity) ride the preference-aware builder harness —
 * the explicitly-planned NEXT leg; menus stay UNLOCKED until that gate runs.
 *
 * Gate philosophy (first run): hard gates only where a failure is unambiguous incoherence
 * (classifiability, generator-intent recovery floor, degenerate catch-all); ladders and
 * distributions REPORT so the findings drive menu pruning like the team-set lock did.
 */
import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  generateProspectScoutingDraft,
  gradeDistance,
  type GeneratedProspectCandidate,
} from '../src/utils/prospectScoutingDraftEngine';
import {
  clearAllLeagueBuilderData,
  getAllPlayers,
  seedFromMLBDatabase,
  type Player,
} from '../src/utils/leagueBuilderStorage';
import {
  classifyPlayerArchetype,
  type ClassifiableProfile,
} from '../src/engines/playerArchetypeClassifier';
import {
  ALL_SHAPES,
  GENERATOR_FAMILIES,
  menuForPosition,
  type TaxonomyPosition,
} from '../src/data/playerArchetypeTaxonomy';

const RUN = process.env.RUN_AUCTION_TUNING_SIM === '1';
const suite = RUN ? describe : describe.skip;

const PITCHER_POSITIONS = new Set(['SP', 'SP/RP', 'RP', 'CP', 'P']);

function candidateToProfile(candidate: GeneratedProspectCandidate): ClassifiableProfile {
  const isPitcher = PITCHER_POSITIONS.has(candidate.position);
  return {
    isPitcher,
    primaryPosition: candidate.position,
    secondaryPosition: candidate.secondaryPosition ?? null,
    bats: candidate.bats,
    throws: candidate.throws,
    // Candidates carry no age (drawn at DTO build); the rawness gap is the Project marker.
    potentialGap: gradeDistance(candidate.trueGrade, candidate.potentialGrade),
    power: candidate.ratings.power,
    contact: candidate.ratings.contact,
    speed: candidate.ratings.speed,
    fielding: candidate.ratings.fielding,
    arm: candidate.ratings.arm,
    velocity: candidate.ratings.velocity,
    junk: candidate.ratings.junk,
    accuracy: candidate.ratings.accuracy,
    traits: [candidate.trait1, candidate.trait2],
    arsenal: candidate.arsenal,
  };
}

function playerToProfile(player: Player): ClassifiableProfile {
  const isPitcher = PITCHER_POSITIONS.has(player.primaryPosition);
  return {
    isPitcher,
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPosition ?? null,
    bats: player.bats,
    throws: player.throws,
    age: player.age,
    power: player.power,
    contact: player.contact,
    speed: player.speed,
    fielding: player.fielding,
    arm: player.arm,
    velocity: player.velocity,
    junk: player.junk,
    accuracy: player.accuracy,
    traits: [player.trait1, player.trait2],
    arsenal: player.arsenal,
    personality: player.personality,
  };
}

function distribution(shapes: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const shape of shapes) counts[shape] = (counts[shape] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([, a], [, b]) => b - a));
}

function median(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

suite('player-taxonomy validation sweep (S1/S2/S4)', () => {
  let draftClass: GeneratedProspectCandidate[] = [];
  let dbPlayers: Player[] = [];

  beforeAll(async () => {
    const teams = Array.from({ length: 8 }, (_, index) => ({
      teamId: `sweep-team-${index}`,
      teamName: `Sweep ${index}`,
    }));
    const generated: GeneratedProspectCandidate[] = [];
    for (const seed of ['taxonomy-sweep-1', 'taxonomy-sweep-2', 'taxonomy-sweep-3']) {
      const draft = generateProspectScoutingDraft({
        leagueId: `taxonomy-sweep-league-${seed}`,
        seasonNumber: 1,
        seed,
        teamDraftOrder: teams,
        rounds: 10,
      });
      generated.push(...draft.draftClass);
    }
    draftClass = generated;

    await clearAllLeagueBuilderData();
    await seedFromMLBDatabase();
    dbPlayers = await getAllPlayers();
  }, 120_000);

  it('S4 — the classifier recovers the generator\'s declared families (intent recovery)', () => {
    const scored = draftClass
      .filter((candidate) => candidate.archetypeFamily && candidate.archetypeFamily !== 'Balanced')
      .map((candidate) => {
        const result = classifyPlayerArchetype(candidateToProfile(candidate), {
          shapes: GENERATOR_FAMILIES,
        });
        return {
          declared: candidate.archetypeFamily,
          top1: result.shape,
          top2: [result.shape, result.runnerUp],
        };
      });
    expect(scored.length).toBeGreaterThan(300);

    const top1 = scored.filter((row) => row.top1 === row.declared).length / scored.length;
    const top2 = scored.filter((row) => row.top2.includes(row.declared)).length / scored.length;

    const misses: Record<string, number> = {};
    for (const row of scored) {
      if (!row.top2.includes(row.declared)) {
        const key = `${row.declared}->${row.top1}`;
        misses[key] = (misses[key] ?? 0) + 1;
      }
    }
    // eslint-disable-next-line no-console
    console.log('[S4] intent recovery', {
      candidates: scored.length,
      top1: Number(top1.toFixed(3)),
      top2: Number(top2.toFixed(3)),
      topMisses: Object.entries(misses).sort(([, a], [, b]) => b - a).slice(0, 8),
    });

    // Hard floor: gross incoherence only. The report drives tuning; the taper mutes
    // extreme grades by design, so 100% was never the bar.
    expect(top2).toBeGreaterThanOrEqual(0.5);
  });

  it('S1 — every real-DB player classifies; no degenerate catch-all; menu presence reported', () => {
    expect(dbPlayers.length).toBeGreaterThan(300);
    const results = dbPlayers.map((player) => ({
      player,
      result: classifyPlayerArchetype(playerToProfile(player)),
    }));

    // 100% classifiability: every player gets a named shape.
    expect(results.every(({ result }) => typeof result.shape === 'string' && result.shape.length > 0)).toBe(true);

    const hitterShapes = results.filter(({ player }) => !PITCHER_POSITIONS.has(player.primaryPosition));
    const pitcherShapes = results.filter(({ player }) => PITCHER_POSITIONS.has(player.primaryPosition));
    const hitterDist = distribution(hitterShapes.map(({ result }) => result.shape));
    const pitcherDist = distribution(pitcherShapes.map(({ result }) => result.shape));
    // eslint-disable-next-line no-console
    console.log('[S1] real-DB shape distribution', { hitters: hitterDist, pitchers: pitcherDist });

    // Degenerate catch-all guard (design §4 S1: no class >25% of its role pool; first run
    // hard-gates at 40% to catch collapse, tightening to 25% is a tuning follow-up).
    for (const [shape, count] of Object.entries(hitterDist)) {
      expect(count / hitterShapes.length, `hitter shape ${shape} share`).toBeLessThanOrEqual(0.4);
    }
    for (const [shape, count] of Object.entries(pitcherDist)) {
      expect(count / pitcherShapes.length, `pitcher shape ${shape} share`).toBeLessThanOrEqual(0.4);
    }

    // Menu presence: report which menu entries have zero real-DB candidates at their position.
    const absent: string[] = [];
    for (const position of ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'SP/RP', 'RP', 'CP'] as TaxonomyPosition[]) {
      for (const entry of menuForPosition(position)) {
        const present = results.some(
          ({ player, result }) => player.primaryPosition === position && result.shape === entry.family,
        );
        if (!present) absent.push(`${position}:${entry.family}`);
      }
    }
    // eslint-disable-next-line no-console
    console.log('[S1] menu entries with zero real-DB presence (pruning candidates)', absent);
  });

  it('S2 — the price ladder: weak/depth shapes are genuinely cheaper (report + basic gates)', () => {
    const withSalary = dbPlayers
      .map((player) => ({ player, result: classifyPlayerArchetype(playerToProfile(player)) }))
      .filter(({ player }) => typeof player.salary === 'number' && player.salary > 0);

    const byShape: Record<string, number[]> = {};
    for (const { player, result } of withSalary) {
      (byShape[result.shape] ??= []).push(player.salary);
    }
    const ladder = Object.fromEntries(
      Object.entries(byShape)
        .map(([shape, salaries]) => [shape, { n: salaries.length, median: Math.round(median(salaries)) }] as const)
        .sort(([, a], [, b]) => b.median - a.median),
    );
    // eslint-disable-next-line no-console
    console.log('[S2] salary ladder by shape (real DB)', ladder);

    // Level strata must price monotonically (the budget-freeing premise at its coarsest).
    const strata: Record<string, number[]> = { star: [], regular: [], depth: [] };
    for (const { player, result } of withSalary) {
      strata[result.levelStratum].push(player.salary);
    }
    if (strata.star.length > 5 && strata.regular.length > 5) {
      expect(median(strata.star)).toBeGreaterThan(median(strata.regular));
    }
    if (strata.regular.length > 5 && strata.depth.length > 5) {
      expect(median(strata.regular)).toBeGreaterThan(median(strata.depth));
    }
  });
});
