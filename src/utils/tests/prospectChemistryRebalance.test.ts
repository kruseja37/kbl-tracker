import { describe, expect, test } from 'vitest';

import {
  CHEMISTRY_CODES,
  CHEMISTRY_CODE_TO_WORD,
  CHEMISTRY_TARGET_DISTRIBUTION,
  CHEMISTRY_TARGET_SOURCE_TOLERANCE,
  type ChemistryCode,
} from '../../data/chemistryCanonical';
import {
  generateProspectPool,
  generateProspectScoutingDraft,
  rebalanceProspectChemistryToTarget,
  type GeneratedProspectCandidate,
  type ProspectScoutingDraftInput,
} from '../prospectScoutingDraftEngine';

const WORD_TO_CODE = new Map<string, ChemistryCode>(
  CHEMISTRY_CODES.map((code) => [CHEMISTRY_CODE_TO_WORD[code], code]),
);

const LARGE_BATCH_INPUT = {
  leagueId: 'rb0b2-large-batch',
  seasonNumber: 1,
  seed: 'rb0b2-large-batch-seed',
  teamDraftOrder: [
    { teamId: 'team-a', teamName: 'Alpha' },
    { teamId: 'team-b', teamName: 'Beta' },
    { teamId: 'team-c', teamName: 'Gamma' },
    { teamId: 'team-d', teamName: 'Delta' },
  ],
} as const;

const NO_PERTURB_INPUT: ProspectScoutingDraftInput = {
  leagueId: 'rb0b2-league',
  seasonNumber: 1,
  teamDraftOrder: [{ teamId: 'a' }, { teamId: 'b' }],
  rounds: 2,
  seed: 'rb0b2-no-perturb-seed',
  existingPlayerIds: [],
  existingTeamIds: ['a', 'b'],
  scoutsByTeamId: {
    a: { scoutId: 'sa', scoutName: 'Scout A' },
    b: { scoutId: 'sb', scoutName: 'Scout B' },
  },
  candidatePoolMultiplier: 2,
};

const PRE_REBALANCE_NON_CHEMISTRY_GOLDEN = [
  {
    candidateId: 'candidate-rb0b2-league-1-1',
    position: 'SP',
    bats: 'S',
    throws: 'R',
    trueGrade: 'B',
    potentialGrade: 'B+',
    ratings: { power: 20, contact: 35, speed: 31, fielding: 33, arm: 41, velocity: 50, junk: 63, accuracy: 56 },
    arsenal: ['CF', 'SB', '4F', 'FK'],
    trait1: 'K Collector',
    personality: 'Jolly',
    hiddenPersonalityModifiers: { loyalty: 54, ambition: 82, resilience: 46, charisma: 69 },
  },
  {
    candidateId: 'candidate-rb0b2-league-1-2',
    position: 'SP',
    bats: 'R',
    throws: 'R',
    trueGrade: 'A-',
    potentialGrade: 'A-',
    ratings: { power: 48, contact: 50, speed: 64, fielding: 67, arm: 69, velocity: 66, junk: 66, accuracy: 74 },
    arsenal: ['2F', 'FK', '4F', 'CH'],
    trait1: 'Elite 2F',
    personality: 'Relaxed',
    hiddenPersonalityModifiers: { loyalty: 25, ambition: 57, resilience: 39, charisma: 56 },
  },
  {
    candidateId: 'candidate-rb0b2-league-1-3',
    position: 'LF',
    secondaryPosition: 'RF',
    bats: 'L',
    throws: 'R',
    trueGrade: 'C+',
    potentialGrade: 'C+',
    ratings: { power: 59, contact: 51, speed: 45, fielding: 39, arm: 49, velocity: 0, junk: 0, accuracy: 0 },
    arsenal: [],
    trait1: 'Base Rounder',
    trait2: 'Big Hack',
    personality: 'Relaxed',
    hiddenPersonalityModifiers: { loyalty: 26, ambition: 50, resilience: 56, charisma: 95 },
  },
  {
    candidateId: 'candidate-rb0b2-league-1-4',
    position: 'SS',
    secondaryPosition: '3B',
    bats: 'L',
    throws: 'L',
    trueGrade: 'D',
    potentialGrade: 'D',
    ratings: { power: 23, contact: 35, speed: 39, fielding: 50, arm: 38, velocity: 0, junk: 0, accuracy: 0 },
    arsenal: [],
    personality: 'Jolly',
    hiddenPersonalityModifiers: { loyalty: 26, ambition: 46, resilience: 41, charisma: 31 },
  },
  {
    candidateId: 'candidate-rb0b2-league-1-5',
    position: 'LF',
    secondaryPosition: 'C',
    bats: 'L',
    throws: 'R',
    trueGrade: 'C+',
    potentialGrade: 'B',
    ratings: { power: 59, contact: 52, speed: 49, fielding: 46, arm: 52, velocity: 0, junk: 0, accuracy: 0 },
    arsenal: [],
    personality: 'Timid',
    hiddenPersonalityModifiers: { loyalty: 56, ambition: 51, resilience: 56, charisma: 53 },
  },
  {
    candidateId: 'candidate-rb0b2-league-1-6',
    position: 'SS',
    secondaryPosition: '2B',
    bats: 'R',
    throws: 'R',
    trueGrade: 'C+',
    potentialGrade: 'B-',
    ratings: { power: 46, contact: 61, speed: 53, fielding: 44, arm: 48, velocity: 0, junk: 0, accuracy: 0 },
    arsenal: [],
    trait1: 'Bad Ball Hitter',
    trait2: 'Ace Exterminator',
    personality: 'Jolly',
    hiddenPersonalityModifiers: { loyalty: 58, ambition: 37, resilience: 53, charisma: 86 },
  },
  {
    candidateId: 'candidate-rb0b2-league-1-7',
    position: 'SP',
    bats: 'R',
    throws: 'R',
    trueGrade: 'B-',
    potentialGrade: 'B-',
    ratings: { power: 21, contact: 28, speed: 33, fielding: 43, arm: 57, velocity: 59, junk: 42, accuracy: 58 },
    arsenal: ['4F', 'CB', 'CF', '2F'],
    personality: 'Egotistical',
    hiddenPersonalityModifiers: { loyalty: 29, ambition: 47, resilience: 26, charisma: 57 },
  },
  {
    candidateId: 'candidate-rb0b2-league-1-8',
    position: 'SS',
    secondaryPosition: '2B',
    bats: 'R',
    throws: 'R',
    trueGrade: 'B-',
    potentialGrade: 'B+',
    ratings: { power: 44, contact: 67, speed: 59, fielding: 71, arm: 55, velocity: 0, junk: 0, accuracy: 0 },
    arsenal: [],
    trait1: 'POW vs RHP',
    personality: 'Egotistical',
    hiddenPersonalityModifiers: { loyalty: 44, ambition: 81, resilience: 27, charisma: 34 },
  },
];

function countChemistry(items: Array<{ chemistry: string }>): Record<ChemistryCode, number> {
  const counts = Object.fromEntries(CHEMISTRY_CODES.map((code) => [code, 0])) as Record<ChemistryCode, number>;
  for (const item of items) {
    const code = WORD_TO_CODE.get(item.chemistry);
    if (!code) {
      throw new Error(`Unexpected chemistry word "${item.chemistry}".`);
    }
    counts[code] += 1;
  }
  return counts;
}

function nonChemistrySnapshot(candidate: GeneratedProspectCandidate): Record<string, unknown> {
  return Object.fromEntries(Object.entries({
    candidateId: candidate.candidateId,
    position: candidate.position,
    secondaryPosition: candidate.secondaryPosition,
    bats: candidate.bats,
    throws: candidate.throws,
    trueGrade: candidate.trueGrade,
    potentialGrade: candidate.potentialGrade,
    ratings: candidate.ratings,
    arsenal: candidate.arsenal,
    trait1: candidate.trait1,
    trait2: candidate.trait2,
    personality: candidate.personality,
    hiddenPersonalityModifiers: candidate.hiddenPersonalityModifiers,
  }).filter(([, value]) => value !== undefined));
}

describe('RB-0b-2 prospect chemistry rebalance', () => {
  test('large generated farm prospect batch matches the canonical chemistry target distribution', () => {
    const prospects = generateProspectPool(LARGE_BATCH_INPUT, 1000);
    const counts = countChemistry(prospects);

    for (const code of CHEMISTRY_CODES) {
      const share = counts[code] / prospects.length;
      expect(Math.abs(share - CHEMISTRY_TARGET_DISTRIBUTION[code])).toBeLessThanOrEqual(
        CHEMISTRY_TARGET_SOURCE_TOLERANCE,
      );
    }
  });

  test('same seed produces identical per-prospect chemistry assignment', () => {
    const first = generateProspectPool(LARGE_BATCH_INPUT, 120);
    const second = generateProspectPool(LARGE_BATCH_INPUT, 120);

    expect(second.map((prospect) => [prospect.id, prospect.chemistry])).toEqual(
      first.map((prospect) => [prospect.id, prospect.chemistry]),
    );
  });

  test('chemistry post-pass does not perturb non-chemistry candidate draws', () => {
    const output = generateProspectScoutingDraft(NO_PERTURB_INPUT);

    expect(output.draftClass.map(nonChemistrySnapshot)).toEqual(PRE_REBALANCE_NON_CHEMISTRY_GOLDEN);
  });

  test('rebalance helper returns a new batch without mutating input candidates', () => {
    const output = generateProspectScoutingDraft(NO_PERTURB_INPUT);
    const originalChemistry = output.draftClass.map((candidate) => candidate.chemistry);
    const originalNonChemistry = output.draftClass.map(nonChemistrySnapshot);
    const rebalanced = rebalanceProspectChemistryToTarget(output.draftClass, 'rb0b2-direct-helper-seed');

    expect(rebalanced).not.toBe(output.draftClass);
    expect(rebalanced.every((candidate, index) => candidate !== output.draftClass[index])).toBe(true);
    expect(output.draftClass.map((candidate) => candidate.chemistry)).toEqual(originalChemistry);
    expect(rebalanced.map(nonChemistrySnapshot)).toEqual(originalNonChemistry);
  });

  test('small generated batch keeps quota integrity and exact total count', () => {
    const prospects = generateProspectPool({
      ...LARGE_BATCH_INPUT,
      leagueId: 'rb0b2-small-batch',
      seed: 'rb0b2-small-batch-seed',
    }, 23);
    const counts = countChemistry(prospects);

    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(23);
    expect(counts).toEqual({
      SPI: 5,
      DIS: 5,
      CMP: 5,
      SCH: 4,
      CRA: 4,
    });
  });
});
