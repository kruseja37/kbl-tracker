import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { FIRST_NAMES as SMB4_FIRST_NAMES, LAST_NAMES as SMB4_LAST_NAMES } from '../../data/nameDatabase';
import { TRAIT_PRICING } from '../../data/traitPricing';
import { assignTier, ELITE_PITCH_TRAITS } from '../../data/traitTierConfig';
import { TRAIT_OPPOSITES } from '../../engines/traitAcquisition';
import { isTraitEligibleForRole } from '../../engines/traitRealityScorer';
import { countTraitPolarity, normalizeTrait, scoreSmb4Player } from '../../engines/smb4GradeEmulator';
import {
  buildProspectPlayerForPick,
  drawProspectAge,
  generateProspectPool,
  generateProspectScoutingDraft,
  gradeDistance,
  PROSPECT_AGE_BANDS,
  PROSPECT_ELITE_PITCH_TRAITS,
  PROSPECT_HITTER_NEGATIVE_TRAIT_POOL,
  PROSPECT_HITTER_TRAIT_POOL,
  PROSPECT_PITCHER_NEGATIVE_TRAIT_POOL,
  PROSPECT_PITCHER_TRAIT_POOL,
  prospectTraitsConflict,
  prospectSalaryForDraftRound,
  HITTER_SCOUT_TOOLS,
  PITCHER_SCOUT_TOOLS,
  SCOUT_OVERALL_BAND_WIDTHS,
  SCOUT_TOOL_BAND_WIDTHS,
  scoutProspect,
  scoutOverallGradeBand,
  scoutTierForPosition,
  scoutToolBand,
  scoutToolBands,
  type GeneratedProspectCandidate,
  type ProspectScoutingDraftInput,
  type ProspectScoutingReport,
} from '../prospectScoutingDraftEngine';

const BASE_INPUT: ProspectScoutingDraftInput = {
  leagueId: 'league-1',
  seasonNumber: 1,
  teamDraftOrder: [
    { teamId: 'team-a', teamName: 'Alpha' },
    { teamId: 'team-b', teamName: 'Beta' },
  ],
  rounds: 10,
  seed: 'deterministic-seed',
  existingPlayerIds: [],
  existingTeamIds: ['team-a', 'team-b'],
  scoutsByTeamId: {
    'team-a': {
      scoutId: 'scout-a',
      scoutName: 'Scout Alpha',
      specialties: ['CF', 'outfield'],
      weaknesses: ['CP'],
    },
    'team-b': {
      scoutId: 'scout-b',
      scoutName: 'Scout Beta',
      specialties: ['pitching'],
      weaknesses: ['CF'],
    },
  },
};

const PITCHER_POSITIONS = new Set(['SP', 'SP/RP', 'RP', 'CP']);
const SECTION_3_2_GRADE_TARGETS = {
  A: 0.02,
  'A-': 0.05,
  'B+': 0.10,
  B: 0.15,
  'B-': 0.15,
  'C+': 0.15,
  C: 0.18,
  'C-': 0.12,
  D: 0.08,
} as const;
const SECTION_3_4_TRAIT_COUNT_TARGETS = [0.30, 0.50, 0.20] as const;
const SECTION_13_SAMPLE_SIZE = 40_000;
const SECTION_13_GRADE_TOLERANCE = 0.015;
const SECTION_13_TRAIT_TOLERANCE = 0.03;
const SECTION_13_POSITION_PLAYER_MIN_SHARE = 0.50;
const SECTION_13_POSITION_PLAYER_MAX_SHARE = 0.70;
const SECTION_10_AGE_SAMPLE_SIZE = 20_000;
const SECTION_10_AGE_TOLERANCE = 0.015;
const SECTION_10_GRADE_CORRELATION_TOLERANCE = 0.05;
const B11_B8_NON_AGE_RNG_PROOF = {
  length: 29715,
  hash: '3fb2b9cd',
} as const;

const B11_B8_RNG_PROOF_INPUT: ProspectScoutingDraftInput = {
  leagueId: 'b11-b8-age-rng-proof',
  seasonNumber: 1,
  teamDraftOrder: [
    { teamId: 'team-a', teamName: 'Alpha' },
    { teamId: 'team-b', teamName: 'Beta' },
  ],
  rounds: 3,
  seed: 'b11-b8-age-rng-proof-seed',
  existingPlayerIds: [],
  existingTeamIds: ['team-a', 'team-b'],
  scoutsByTeamId: {
    'team-a': {
      scoutId: 'scout-a',
      scoutName: 'Scout Alpha',
      specialties: ['CF', 'outfield'],
      weaknesses: ['CP'],
    },
    'team-b': {
      scoutId: 'scout-b',
      scoutName: 'Scout Beta',
      specialties: ['pitching'],
      weaknesses: ['CF'],
    },
  },
  candidatePoolMultiplier: 2,
};
const SECTION_10_GRADE_SCORE: Record<string, number> = {
  A: 8,
  'A-': 7,
  'B+': 6,
  B: 5,
  'B-': 4,
  'C+': 3,
  C: 2,
  'C-': 1,
  D: 0,
};
const LOCAL_OVERALL_GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'] as const;

type LocalOverallGrade = typeof LOCAL_OVERALL_GRADES[number];

function overallGradeIndex(grade: string): number {
  return LOCAL_OVERALL_GRADES.indexOf(grade as LocalOverallGrade);
}

type Section32Grade = keyof typeof SECTION_3_2_GRADE_TARGETS;

function bucketSection32AnalyzerGrade(grade: string): Section32Grade | undefined {
  if (grade in SECTION_3_2_GRADE_TARGETS) return grade as Section32Grade;
  if (grade !== 'S' && grade !== 'A+') return 'D';
  return undefined;
}

function compact(output: ReturnType<typeof generateProspectScoutingDraft>) {
  return {
    pickOrder: output.pickOrder,
    players: output.generatedPlayers.map((player) => ({
      id: player.id,
      name: `${player.firstName} ${player.lastName}`,
      position: player.primaryPosition,
      grade: player.overallGrade,
      scoutedGrade: player.prospectProfile.scoutedGrade,
      salary: player.salary,
      assignment: player.leagueAssignments[0],
      hidden: player.ratingRevealState,
      modifiers: player.hiddenPersonalityModifiers,
    })),
    visibleReports: output.visibleReports,
  };
}

function stripAge(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (key, nestedValue) => key === 'age' ? undefined : nestedValue));
}

function fnv1aHex(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function pearsonCorrelation(left: readonly number[], right: readonly number[]): number {
  const count = Math.min(left.length, right.length);
  const leftAverage = left.reduce((sum, value) => sum + value, 0) / count;
  const rightAverage = right.reduce((sum, value) => sum + value, 0) / count;
  let covariance = 0;
  let leftVariance = 0;
  let rightVariance = 0;

  for (let index = 0; index < count; index += 1) {
    const leftDelta = left[index] - leftAverage;
    const rightDelta = right[index] - rightAverage;
    covariance += leftDelta * rightDelta;
    leftVariance += leftDelta * leftDelta;
    rightVariance += rightDelta * rightDelta;
  }

  if (leftVariance === 0 || rightVariance === 0) return 0;
  return covariance / Math.sqrt(leftVariance * rightVariance);
}

function scoreCandidate(candidate: GeneratedProspectCandidate): string {
  return scoreSmb4Player({
    primaryPosition: candidate.position,
    secondaryPosition: candidate.secondaryPosition,
    bats: candidate.bats,
    throws: candidate.throws,
    power: candidate.ratings.power,
    contact: candidate.ratings.contact,
    speed: candidate.ratings.speed,
    fielding: candidate.ratings.fielding,
    arm: candidate.ratings.arm,
    velocity: candidate.ratings.velocity,
    junk: candidate.ratings.junk,
    accuracy: candidate.ratings.accuracy,
    arsenal: candidate.arsenal,
    trait1: candidate.trait1,
    trait2: candidate.trait2,
  }).grade;
}

function hitterShapeSignature(candidate: GeneratedProspectCandidate): string {
  const tools = [
    ['power', candidate.ratings.power],
    ['contact', candidate.ratings.contact],
    ['speed', candidate.ratings.speed],
    ['fielding', candidate.ratings.fielding],
    ['arm', candidate.ratings.arm],
  ] as const;
  const sorted = [...tools].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const spread = sorted[0][1] - sorted[sorted.length - 1][1];
  return `${sorted[0][0]}>${sorted[sorted.length - 1][0]}:${Math.floor(spread / 5)}`;
}

function pitcherShapeSignature(candidate: GeneratedProspectCandidate): string {
  const tools = [
    ['velocity', candidate.ratings.velocity],
    ['junk', candidate.ratings.junk],
    ['accuracy', candidate.ratings.accuracy],
  ] as const;
  const sorted = [...tools].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const spread = sorted[0][1] - sorted[sorted.length - 1][1];
  return `${sorted[0][0]}>${sorted[sorted.length - 1][0]}:${Math.floor(spread / 5)}`;
}

describe('shared deterministic prospect/scouting draft engine', () => {
  test('same seed produces identical draft output', () => {
    const first = generateProspectScoutingDraft(BASE_INPUT);
    const second = generateProspectScoutingDraft(BASE_INPUT);

    expect(compact(first)).toEqual(compact(second));
  });

  test('different seed produces different draft output', () => {
    const first = generateProspectScoutingDraft(BASE_INPUT);
    const second = generateProspectScoutingDraft({
      ...BASE_INPUT,
      seed: 'different-deterministic-seed',
    });

    expect(compact(second)).not.toEqual(compact(first));
  });

  test('generated franchise prospects never use DH primary or secondary position', () => {
    const output = generateProspectScoutingDraft({
      ...BASE_INPUT,
      rounds: 12,
      candidatePoolMultiplier: 5,
      seed: 'no-dh-policy-seed',
    });

    expect(output.draftClass).toHaveLength(120);
    expect(output.draftClass.every((candidate) => candidate.position !== 'DH')).toBe(true);
    expect(output.generatedPlayers.every((player) =>
      player.primaryPosition !== 'DH' &&
      player.secondaryPosition !== 'DH',
    )).toBe(true);
    expect(output.visibleReports.every((report) => report.position !== 'DH')).toBe(true);
  });

  test('RB-14 primary positions follow the §3.3 weighted distribution', () => {
    const output = generateProspectScoutingDraft({
      ...BASE_INPUT,
      rounds: 250,
      candidatePoolMultiplier: 1,
      seed: 'rb14-section-3-3-primary-position-distribution-seed',
    });
    const positionCounts = new Map<string, number>();
    const count = (position: string) => positionCounts.get(position) ?? 0;

    for (const player of output.generatedPlayers) {
      positionCounts.set(player.primaryPosition, count(player.primaryPosition) + 1);
      expect(player.primaryPosition).not.toBe('DH');
      expect(player.secondaryPosition).not.toBe('DH');
    }

    const pitcherCount = [...PITCHER_POSITIONS].reduce((sum, position) => sum + count(position), 0);
    const pitcherShare = pitcherCount / output.generatedPlayers.length;

    expect(output.generatedPlayers).toHaveLength(500);
    expect(count('SP/RP')).toBeGreaterThan(0);
    expect(count('DH')).toBe(0);
    expect(count('SP')).toBeGreaterThan(count('RP'));
    expect(count('SP')).toBeGreaterThan(count('SP/RP'));
    expect(count('SP')).toBeGreaterThan(count('CP'));
    expect(pitcherShare).toBeGreaterThanOrEqual(0.30);
    expect(pitcherShare).toBeLessThanOrEqual(0.52);
  });

  test('generated secondary positions follow §6 map and pitchers carry none', () => {
    const output = generateProspectScoutingDraft({
      ...BASE_INPUT,
      rounds: 12,
      candidatePoolMultiplier: 5,
      seed: 'section-6-secondary-position-policy-seed',
    });
    const pitcherPositions = PITCHER_POSITIONS;
    const validSecondaryByPrimary: Record<string, Set<string>> = {
      C: new Set(['1B', 'RF', 'LF', '3B', 'IF/OF']),
      '1B': new Set(['3B', 'C', 'LF', 'RF', '2B']),
      '2B': new Set(['SS', '3B', 'IF', 'IF/OF']),
      '3B': new Set(['SS', '1B', 'IF', '2B']),
      SS: new Set(['2B', '3B', 'IF', 'IF/OF', 'OF']),
      LF: new Set(['OF', 'RF', 'C', '1B/OF', '1B']),
      CF: new Set(['OF', '1B/OF']),
      RF: new Set(['OF', 'C', 'LF', '1B/OF']),
    };

    const pitcherPlayers = output.generatedPlayers.filter((player) =>
      pitcherPositions.has(player.primaryPosition),
    );
    const fielderPlayers = output.generatedPlayers.filter((player) =>
      !pitcherPositions.has(player.primaryPosition),
    );
    const fielderWithSecondary = fielderPlayers.find((player) => player.secondaryPosition);

    expect(pitcherPlayers.length).toBeGreaterThan(0);
    expect(pitcherPlayers.every((player) => player.secondaryPosition === undefined)).toBe(true);
    expect(fielderPlayers.length).toBeGreaterThan(0);
    expect(fielderWithSecondary).toBeDefined();
    expect(fielderPlayers.every((player) =>
      player.secondaryPosition === undefined ||
      validSecondaryByPrimary[player.primaryPosition]?.has(player.secondaryPosition) === true,
    )).toBe(true);
  });

  test('prospect trait pools are positive analyzer-recognized display names', () => {
    const pricingByName = new Map(TRAIT_PRICING.map((entry) => [entry.name, entry]));
    const hitterFlagTraits = new Set([
      'First Pitch Slayer',
      'Little Hack',
      'Mind Gamer',
      'Rally Starter',
      'Magic Hands',
      'Utility',
      'Big Hack',
      'Sprinter',
      'Cannon Arm',
      'Fastball Hitter',
      'Bad Ball Hitter',
    ]);
    const pitcherFlagTraits = new Set([
      'K Collector',
      'Gets Ahead',
      'Elite 2F',
      'Elite 4F',
      'Elite CF',
      'Rally Stopper',
      'Elite FK',
      'Specialist',
      'Elite CB',
    ]);

    for (const [pool, flagTraits] of [
      [PROSPECT_HITTER_TRAIT_POOL, hitterFlagTraits],
      [PROSPECT_PITCHER_TRAIT_POOL, pitcherFlagTraits],
    ] as const) {
      expect(new Set(pool).size).toBe(pool.length);
      for (const trait of pool) {
        const normalized = normalizeTrait(trait);
        const pricing = pricingByName.get(normalized);
        const polarity = countTraitPolarity([normalized]);

        expect(pricing?.polarity).toBe('positive');
        expect(polarity).toEqual({
          positiveTraits: 1,
          negativeTraits: 0,
          unknownTraits: [],
        });
        expect(flagTraits.has(normalized) || pricing?.name === normalized).toBe(true);
      }
    }
  });

  test('§5 negative prospect trait pools are negative and role-eligible', () => {
    const observed = {
      hitter: [] as Array<{ trait: string; tier: string; roleEligible: boolean }>,
      pitcher: [] as Array<{ trait: string; tier: string; roleEligible: boolean }>,
    };

    for (const [poolName, pool, role] of [
      ['hitter', PROSPECT_HITTER_NEGATIVE_TRAIT_POOL, 'position'],
      ['pitcher', PROSPECT_PITCHER_NEGATIVE_TRAIT_POOL, 'pitcher'],
    ] as const) {
      expect(new Set(pool).size).toBe(pool.length);
      for (const trait of pool) {
        const tier = assignTier(trait);
        const roleEligible = isTraitEligibleForRole(trait, role);

        observed[poolName].push({ trait, tier: tier.tier, roleEligible });
        expect(tier.polarity).toBe('negative');
        expect(['MINOR', 'MODERATE', 'SEVERE']).toContain(tier.tier);
        expect(roleEligible).toBe(true);
      }
    }

    console.info('§5 negative prospect trait pools', observed);
  });

  test('T-4c Elite-pitch traits are exactly the pitcher-pool mutual-exclusion group', () => {
    const pitcherPool = new Set(PROSPECT_PITCHER_TRAIT_POOL);

    expect(PROSPECT_ELITE_PITCH_TRAITS).toBe(ELITE_PITCH_TRAITS);
    expect(PROSPECT_ELITE_PITCH_TRAITS.size).toBe(8);
    for (const trait of PROSPECT_ELITE_PITCH_TRAITS) {
      expect(pitcherPool.has(trait)).toBe(true);
    }
  });

  test('T-4c Elite-pitch conflicts only block a second Elite pitch', () => {
    expect(prospectTraitsConflict('Elite 4F', 'Elite SB')).toBe(true);
    expect(prospectTraitsConflict('Elite 4F', 'Cannon Arm')).toBe(false);
    expect(prospectTraitsConflict('Cannon Arm', 'K Collector')).toBe(false);
  });

  test('generated prospect traits follow 30/50/20 count split with no duplicate or conflict pairs', () => {
    const output = generateProspectScoutingDraft({
      ...BASE_INPUT,
      rounds: 120,
      candidatePoolMultiplier: 5,
      seed: 'section-3-4-trait-count-distribution-seed',
    });
    const counts = [0, 0, 0];

    for (const candidate of output.draftClass) {
      const traits = [candidate.trait1, candidate.trait2].filter((trait): trait is string => Boolean(trait));
      counts[traits.length] += 1;

      expect(new Set(traits).size).toBe(traits.length);
      if (traits.length === 2) {
        expect(prospectTraitsConflict(traits[0], traits[1])).toBe(false);
        expect(TRAIT_OPPOSITES[traits[0]]).not.toBe(traits[1]);
        expect(TRAIT_OPPOSITES[traits[1]]).not.toBe(traits[0]);
      }
      expect(traits.filter((trait) => assignTier(trait).polarity === 'negative').length).toBeLessThanOrEqual(1);
    }

    const total = output.draftClass.length;
    expect(counts[0] / total).toBeGreaterThan(0.25);
    expect(counts[0] / total).toBeLessThan(0.35);
    expect(counts[1] / total).toBeGreaterThan(0.45);
    expect(counts[1] / total).toBeLessThan(0.55);
    expect(counts[2] / total).toBeGreaterThan(0.15);
    expect(counts[2] / total).toBeLessThan(0.25);
  });

  test('§5 positive prospect trait selection is rarity-weighted by genWeight', () => {
    const commonTrait = 'Base Rounder';
    const rareTrait = 'Cannon Arm';
    const commonTier = assignTier(commonTrait);
    const rareTier = assignTier(rareTrait);
    const prospects = generateProspectPool({
      leagueId: 'section-5-positive-trait-rarity-weighting',
      seasonNumber: 1,
      seed: 'section-5-positive-trait-rarity-weighting-seed',
      teamDraftOrder: BASE_INPUT.teamDraftOrder,
    }, 20_000);
    const counts = { common: 0, rare: 0 };

    expect(commonTier.tier).toBe('COMMON');
    expect(rareTier.tier).toBe('RARE');
    expect(commonTier.genWeight).toBeGreaterThan(rareTier.genWeight);

    for (const prospect of prospects) {
      if (PITCHER_POSITIONS.has(prospect.primaryPosition)) {
        continue;
      }
      for (const trait of [prospect.trait1, prospect.trait2]) {
        if (trait === commonTrait) counts.common += 1;
        if (trait === rareTrait) counts.rare += 1;
      }
    }

    console.info('§5 positive trait rarity counts', {
      [commonTrait]: counts.common,
      [rareTrait]: counts.rare,
      commonGenWeight: commonTier.genWeight,
      rareGenWeight: rareTier.genWeight,
    });

    expect(prospects).toHaveLength(20_000);
    expect(counts.rare).toBeGreaterThan(0);
    expect(counts.common).toBeGreaterThan(counts.rare * 2);
  }, 120_000);

  test('§5 negative prospect trait polarity draw stays bounded with no two negatives or opposite pairs', () => {
    const prospects = generateProspectPool({
      leagueId: 'section-5-negative-trait-polarity',
      seasonNumber: 1,
      seed: 'section-5-negative-trait-polarity-seed',
      teamDraftOrder: BASE_INPUT.teamDraftOrder,
    }, 20_000);
    const traitCounts = [0, 0, 0];
    let slot1Traits = 0;
    let slot1Negative = 0;

    for (const prospect of prospects) {
      const traits = [prospect.trait1, prospect.trait2].filter((trait): trait is string => Boolean(trait));
      const negativeTraits = traits.filter((trait) => assignTier(trait).polarity === 'negative');

      traitCounts[traits.length] += 1;
      if (prospect.trait1) {
        slot1Traits += 1;
        if (assignTier(prospect.trait1).polarity === 'negative') {
          slot1Negative += 1;
        }
      }

      expect(negativeTraits.length).toBeLessThanOrEqual(1);
      expect(new Set(traits).size).toBe(traits.length);
      if (traits.length === 2) {
        expect(prospectTraitsConflict(traits[0], traits[1])).toBe(false);
        expect(TRAIT_OPPOSITES[traits[0]]).not.toBe(traits[1]);
        expect(TRAIT_OPPOSITES[traits[1]]).not.toBe(traits[0]);
      }
    }

    const slot1NegativeRate = slot1Negative / slot1Traits;
    const traitCountRates = traitCounts.map((count) => count / prospects.length);

    console.info('§5 negative slot-1 rate', Number(slot1NegativeRate.toFixed(4)));
    console.info('§5 negative trait-count rates', {
      zero: Number(traitCountRates[0].toFixed(4)),
      one: Number(traitCountRates[1].toFixed(4)),
      two: Number(traitCountRates[2].toFixed(4)),
    });

    expect(prospects).toHaveLength(20_000);
    expect(slot1NegativeRate).toBeGreaterThanOrEqual(0.20);
    expect(slot1NegativeRate).toBeLessThanOrEqual(0.32);
    for (const [index, target] of SECTION_3_4_TRAIT_COUNT_TARGETS.entries()) {
      expect(Math.abs(traitCountRates[index] - target)).toBeLessThanOrEqual(SECTION_13_TRAIT_TOLERANCE);
    }
  }, 120_000);

  test('T-4c generated prospects never hold two Elite-pitch traits', () => {
    const prospects = generateProspectPool({
      leagueId: 't4c-elite-pitch-mutual-exclusion',
      seasonNumber: 1,
      seed: 't4c-elite-pitch-mutual-exclusion-seed',
      teamDraftOrder: BASE_INPUT.teamDraftOrder,
    }, 20_000);

    expect(prospects).toHaveLength(20_000);
    for (const prospect of prospects) {
      const traits = [prospect.trait1, prospect.trait2].filter((trait): trait is string => Boolean(trait));

      expect(traits.filter((trait) => PROSPECT_ELITE_PITCH_TRAITS.has(trait)).length).toBeLessThanOrEqual(1);
    }
  }, 120_000);

  test('generated pitchers get pitcher-pool traits and fielders get hitter-pool traits', () => {
    const output = generateProspectScoutingDraft({
      ...BASE_INPUT,
      rounds: 80,
      candidatePoolMultiplier: 5,
      seed: 'section-5-5-position-appropriate-traits-seed',
    });
    const hitterPool = new Set([...PROSPECT_HITTER_TRAIT_POOL, ...PROSPECT_HITTER_NEGATIVE_TRAIT_POOL]);
    const pitcherPool = new Set([...PROSPECT_PITCHER_TRAIT_POOL, ...PROSPECT_PITCHER_NEGATIVE_TRAIT_POOL]);
    const pitchers = output.draftClass.filter((candidate) => PITCHER_POSITIONS.has(candidate.position));
    const fielders = output.draftClass.filter((candidate) => !PITCHER_POSITIONS.has(candidate.position));

    expect(pitchers.length).toBeGreaterThan(0);
    expect(fielders.length).toBeGreaterThan(0);
    for (const candidate of pitchers) {
      const traits = [candidate.trait1, candidate.trait2].filter((trait): trait is string => Boolean(trait));
      expect(traits.every((trait) => pitcherPool.has(trait))).toBe(true);
      expect(traits.every((trait) => isTraitEligibleForRole(trait, 'pitcher'))).toBe(true);
    }
    for (const candidate of fielders) {
      const traits = [candidate.trait1, candidate.trait2].filter((trait): trait is string => Boolean(trait));
      expect(traits.every((trait) => hitterPool.has(trait))).toBe(true);
      expect(traits.every((trait) => isTraitEligibleForRole(trait, 'position'))).toBe(true);
    }
  });

  test('generated bats and throws follow §7 conditional handedness split', () => {
    const candidate: GeneratedProspectCandidate = {
      candidateId: 'candidate-handedness',
      firstName: 'Test',
      lastName: 'Handedness',
      position: 'CF',
      trueGrade: 'B',
      potentialGrade: 'B+',
      archetypeFamily: 'Balanced',
      ratings: {
        power: 60,
        contact: 60,
        speed: 70,
        fielding: 70,
        arm: 60,
        velocity: 0,
        junk: 0,
        accuracy: 0,
      },
      arsenal: [],
      personality: 'Competitive',
      chemistry: 'Competitive',
      hiddenPersonalityModifiers: {
        loyalty: 50,
        ambition: 50,
        resilience: 50,
        charisma: 50,
      },
    };
    const report: ProspectScoutingReport = {
      candidateId: candidate.candidateId,
      scoutedGrade: 'B',
      scoutAccuracy: 0,
      scoutConfidence: 'medium',
      gradeError: 0,
      scout: {
        specialties: [],
        weaknesses: [],
      },
    };
    const stats = {
      L: { total: 0, throwsL: 0 },
      R: { total: 0, throwsL: 0 },
      S: { total: 0, throwsL: 0 },
    };
    const validBats = new Set(['L', 'R', 'S']);
    const validThrows = new Set(['L', 'R']);
    const sampleSize = 6000;

    for (let index = 0; index < sampleSize; index += 1) {
      const player = buildProspectPlayerForPick({
        engineInput: {
          ...BASE_INPUT,
          seed: `section-7-handedness-seed-${index}`,
        },
        candidate,
        report,
        pick: { round: 1, pickNumber: index + 1, teamId: 'team-a' },
        playerId: `section-7-player-${index}`,
      });

      expect(validBats.has(player.bats)).toBe(true);
      expect(validThrows.has(player.throws)).toBe(true);
      stats[player.bats].total += 1;
      if (player.throws === 'L') {
        stats[player.bats].throwsL += 1;
      }
    }

    const batsR = stats.R.total / sampleSize;
    const batsL = stats.L.total / sampleSize;
    const batsS = stats.S.total / sampleSize;
    const throwsLeftGivenBatsL = stats.L.throwsL / stats.L.total;
    const throwsLeftGivenBatsR = stats.R.throwsL / stats.R.total;
    const throwsLeftGivenBatsS = stats.S.throwsL / stats.S.total;

    expect(batsR).toBeGreaterThan(0.48);
    expect(batsR).toBeLessThan(0.55);
    expect(batsL).toBeGreaterThan(0.38);
    expect(batsL).toBeLessThan(0.45);
    expect(batsS).toBeGreaterThan(0.05);
    expect(batsS).toBeLessThan(0.09);
    expect(throwsLeftGivenBatsL).toBeGreaterThan(0.36);
    expect(throwsLeftGivenBatsL).toBeLessThan(0.44);
    expect(throwsLeftGivenBatsR).toBeGreaterThan(0.07);
    expect(throwsLeftGivenBatsR).toBeLessThan(0.13);
    expect(throwsLeftGivenBatsS).toBeGreaterThan(0.13);
    expect(throwsLeftGivenBatsS).toBeLessThan(0.25);
    expect(throwsLeftGivenBatsL).toBeGreaterThan(throwsLeftGivenBatsS);
    expect(throwsLeftGivenBatsS).toBeGreaterThan(throwsLeftGivenBatsR);
  });

  test('generated non-pitcher prospects do not carry visible pitching ratings or arsenal', () => {
    const output = generateProspectScoutingDraft({
      ...BASE_INPUT,
      rounds: 12,
      candidatePoolMultiplier: 5,
      seed: 'non-pitcher-pitching-model-policy-seed',
    });
    const pitcherPositions = PITCHER_POSITIONS;
    const nonPitcherCandidates = output.draftClass.filter((candidate) => !pitcherPositions.has(candidate.position));
    const nonPitcherPlayers = output.generatedPlayers.filter((player) => !pitcherPositions.has(player.primaryPosition));

    expect(nonPitcherCandidates.length).toBeGreaterThan(0);
    expect(nonPitcherCandidates.every((candidate) =>
      candidate.ratings.velocity === 0 &&
      candidate.ratings.junk === 0 &&
      candidate.ratings.accuracy === 0 &&
      candidate.arsenal.length === 0,
    )).toBe(true);
    expect(nonPitcherPlayers.every((player) =>
      player.velocity === 0 &&
      player.junk === 0 &&
      player.accuracy === 0 &&
      player.arsenal.length === 0,
    )).toBe(true);
  });

  test('generated pitcher prospects keep pitching ratings and arsenal', () => {
    const output = generateProspectScoutingDraft({
      ...BASE_INPUT,
      rounds: 12,
      candidatePoolMultiplier: 5,
      seed: 'pitcher-pitching-model-policy-seed',
    });
    const pitcherPositions = PITCHER_POSITIONS;
    const pitcherPlayers = output.generatedPlayers.filter((player) => pitcherPositions.has(player.primaryPosition));

    expect(pitcherPlayers.length).toBeGreaterThan(0);
    expect(pitcherPlayers.every((player) =>
      player.velocity > 0 &&
      player.junk > 0 &&
      player.accuracy > 0 &&
      player.arsenal.length > 0,
    )).toBe(true);
  });

  test('generated pitcher arsenals follow the §8 canonical family and role taper', () => {
    const output = generateProspectScoutingDraft({
      ...BASE_INPUT,
      rounds: 80,
      candidatePoolMultiplier: 5,
      seed: 'section-8-canonical-arsenal-policy-seed',
    });
    const fastballs = new Set(['4F', '2F', 'CF']);
    const offspeed = new Set(['SL', 'CB', 'CH', 'FK', 'SB']);
    const roleRanges: Record<string, [number, number]> = {
      SP: [3, 5],
      'SP/RP': [3, 5],
      RP: [2, 4],
      CP: [2, 3],
    };
    const pitchers = output.draftClass.filter((candidate) => PITCHER_POSITIONS.has(candidate.position));
    const fielders = output.draftClass.filter((candidate) => !PITCHER_POSITIONS.has(candidate.position));

    expect(pitchers.length).toBeGreaterThan(0);
    expect(fielders.length).toBeGreaterThan(0);
    expect(fielders.every((candidate) => candidate.arsenal.length === 0)).toBe(true);

    for (const candidate of pitchers) {
      const [min, max] = roleRanges[candidate.position];

      expect(candidate.arsenal.length).toBeGreaterThanOrEqual(min);
      expect(candidate.arsenal.length).toBeLessThanOrEqual(max);
      expect(candidate.arsenal.some((pitch) => fastballs.has(pitch))).toBe(true);
      expect(candidate.arsenal.some((pitch) => offspeed.has(pitch))).toBe(true);
      expect(new Set(candidate.arsenal).size).toBe(candidate.arsenal.length);
    }

    for (const player of output.generatedPlayers) {
      if (!PITCHER_POSITIONS.has(player.primaryPosition)) {
        expect(player.arsenal).toEqual([]);
        continue;
      }

      const [min, max] = roleRanges[player.primaryPosition];
      expect(player.arsenal.length).toBeGreaterThanOrEqual(min);
      expect(player.arsenal.length).toBeLessThanOrEqual(max);
      expect(player.arsenal.some((pitch) => fastballs.has(pitch))).toBe(true);
      expect(player.arsenal.some((pitch) => offspeed.has(pitch))).toBe(true);
      expect(new Set(player.arsenal).size).toBe(player.arsenal.length);
    }

    expect(pitchers.some((candidate) =>
      !(candidate.arsenal.includes('4F') && candidate.arsenal.includes('2F')),
    )).toBe(true);
  });

  test('generated prospects round-trip to their assigned §3.2 analyzer grade', () => {
    const output = generateProspectScoutingDraft({
      ...BASE_INPUT,
      rounds: 80,
      candidatePoolMultiplier: 5,
      seed: 'section-5-2-analyzer-round-trip-seed',
    });
    const targetGrades = new Set(['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D']);
    const seenGrades = new Set<string>();

    for (const candidate of output.draftClass) {
      expect(candidate.bats).toBeDefined();
      expect(candidate.throws).toBeDefined();
      seenGrades.add(candidate.trueGrade);
      expect(scoreSmb4Player({
        primaryPosition: candidate.position,
        secondaryPosition: candidate.secondaryPosition,
        bats: candidate.bats,
        throws: candidate.throws,
        power: candidate.ratings.power,
        contact: candidate.ratings.contact,
        speed: candidate.ratings.speed,
        fielding: candidate.ratings.fielding,
        arm: candidate.ratings.arm,
        velocity: candidate.ratings.velocity,
        junk: candidate.ratings.junk,
        accuracy: candidate.ratings.accuracy,
        arsenal: candidate.arsenal,
        trait1: candidate.trait1,
        trait2: candidate.trait2,
      }).grade).toBe(candidate.trueGrade);
    }

    for (const player of output.generatedPlayers) {
      expect(scoreSmb4Player({
        primaryPosition: player.primaryPosition,
        secondaryPosition: player.secondaryPosition,
        bats: player.bats,
        throws: player.throws,
        power: player.power,
        contact: player.contact,
        speed: player.speed,
        fielding: player.fielding,
        arm: player.arm,
        velocity: player.velocity,
        junk: player.junk,
        accuracy: player.accuracy,
        arsenal: player.arsenal,
        trait1: player.trait1,
        trait2: player.trait2,
      }).grade).toBe(player.overallGrade);
    }

    expect(seenGrades).toEqual(targetGrades);
  });

  test('§5.6 archetype bias creates same-grade non-repeating tool spreads without analyzer drift', () => {
    const output = generateProspectScoutingDraft({
      ...BASE_INPUT,
      rounds: 120,
      candidatePoolMultiplier: 5,
      seed: 'section-5-6-archetype-variety-seed',
    });
    const hitterGroups = new Map<string, GeneratedProspectCandidate[]>();
    const pitcherGroups = new Map<string, GeneratedProspectCandidate[]>();

    for (const candidate of output.draftClass) {
      expect(candidate.archetypeFamily).toEqual(expect.any(String));
      expect(scoreCandidate(candidate)).toBe(candidate.trueGrade);
      const group = PITCHER_POSITIONS.has(candidate.position) ? pitcherGroups : hitterGroups;
      group.set(candidate.trueGrade, [...(group.get(candidate.trueGrade) ?? []), candidate]);
    }

    const sameGradeHitters = [...hitterGroups.values()].sort((left, right) => right.length - left.length)[0] ?? [];
    const sameGradePitchers = [...pitcherGroups.values()].sort((left, right) => right.length - left.length)[0] ?? [];
    const hitterFamilies = new Set(sameGradeHitters.map((candidate) => candidate.archetypeFamily));
    const hitterShapes = new Set(sameGradeHitters.map(hitterShapeSignature));
    const hitterSpreads = sameGradeHitters.map((candidate) =>
      Math.max(
        candidate.ratings.power,
        candidate.ratings.contact,
        candidate.ratings.speed,
        candidate.ratings.fielding,
        candidate.ratings.arm,
      ) -
      Math.min(
        candidate.ratings.power,
        candidate.ratings.contact,
        candidate.ratings.speed,
        candidate.ratings.fielding,
        candidate.ratings.arm,
      ),
    );
    const pitcherShapes = new Set(sameGradePitchers.map(pitcherShapeSignature));

    expect(new Set(output.draftClass.map((candidate) => candidate.archetypeFamily)).size).toBeGreaterThanOrEqual(12);
    expect(output.generatedPlayers.every((player) => player.prospectProfile.archetypeFamily)).toBe(true);
    expect(output.visibleReports.every((report) => 'archetypeFamily' in report)).toBe(true);
    for (const report of output.visibleReports) {
      const player = output.generatedPlayers.find((generatedPlayer) => generatedPlayer.id === report.playerId);

      expect(player).toBeDefined();
      expect(report.traitCount).toEqual(expect.any(Number));
      expect([0, 1, 2]).toContain(report.traitCount);
      expect(report).not.toHaveProperty('trait1');
      expect(report).not.toHaveProperty('trait2');
      expect(report.archetypeFamily).toEqual(expect.any(String));
      expect(report.archetypeFamily).toBe(player?.prospectProfile.archetypeFamily);
      expect(report.secondaryPosition).toBe(player?.secondaryPosition);
      expect(report.traitCount).toBe([player?.trait1, player?.trait2].filter(Boolean).length);
    }
    expect(sameGradeHitters.length).toBeGreaterThanOrEqual(40);
    expect(hitterFamilies.size).toBeGreaterThanOrEqual(7);
    expect(hitterShapes.size).toBeGreaterThanOrEqual(12);
    expect(Math.max(...hitterSpreads)).toBeGreaterThanOrEqual(30);
    expect(sameGradePitchers.length).toBeGreaterThanOrEqual(20);
    expect(pitcherShapes.size).toBeGreaterThanOrEqual(5);
  });

  test('§13 generated draft class reproduces §3.2 analyzer-grade distribution and §3.4 trait sanity', () => {
    const output = generateProspectScoutingDraft({
      ...BASE_INPUT,
      rounds: 200,
      candidatePoolMultiplier: 100,
      seed: 'section-13-distribution-validation-seed',
    });
    const gradeCounts = Object.fromEntries(
      Object.keys(SECTION_3_2_GRADE_TARGETS).map((grade) => [grade, 0]),
    ) as Record<Section32Grade, number>;
    const traitCounts = [0, 0, 0];
    const positionCounts = new Map<string, number>();
    const hitterPool = new Set([...PROSPECT_HITTER_TRAIT_POOL, ...PROSPECT_HITTER_NEGATIVE_TRAIT_POOL]);
    const pitcherPool = new Set([...PROSPECT_PITCHER_TRAIT_POOL, ...PROSPECT_PITCHER_NEGATIVE_TRAIT_POOL]);
    let pitcherCount = 0;
    let fielderCount = 0;

    expect(output.draftClass).toHaveLength(SECTION_13_SAMPLE_SIZE);

    for (const candidate of output.draftClass) {
      const scored = scoreSmb4Player({
        primaryPosition: candidate.position,
        secondaryPosition: candidate.secondaryPosition,
        bats: candidate.bats,
        throws: candidate.throws,
        power: candidate.ratings.power,
        contact: candidate.ratings.contact,
        speed: candidate.ratings.speed,
        fielding: candidate.ratings.fielding,
        arm: candidate.ratings.arm,
        velocity: candidate.ratings.velocity,
        junk: candidate.ratings.junk,
        accuracy: candidate.ratings.accuracy,
        arsenal: candidate.arsenal,
        trait1: candidate.trait1,
        trait2: candidate.trait2,
      });
      const analyzerGrade = bucketSection32AnalyzerGrade(scored.grade);
      const traits = [candidate.trait1, candidate.trait2].filter((trait): trait is string => Boolean(trait));
      const isPitcher = PITCHER_POSITIONS.has(candidate.position);

      expect(analyzerGrade).toBeDefined();
      expect(candidate.position).not.toBe('DH');
      expect(candidate.position).not.toBe('UTIL');
      expect(candidate.secondaryPosition).not.toBe('DH');
      expect(candidate.secondaryPosition).not.toBe('UTIL');
      expect(new Set(traits).size).toBe(traits.length);
      if (traits.length === 2) {
        expect(prospectTraitsConflict(traits[0], traits[1])).toBe(false);
        expect(TRAIT_OPPOSITES[traits[0]]).not.toBe(traits[1]);
        expect(TRAIT_OPPOSITES[traits[1]]).not.toBe(traits[0]);
      }
      expect(traits.filter((trait) => assignTier(trait).polarity === 'negative').length).toBeLessThanOrEqual(1);

      gradeCounts[analyzerGrade!] += 1;
      traitCounts[traits.length] += 1;
      positionCounts.set(candidate.position, (positionCounts.get(candidate.position) ?? 0) + 1);

      if (isPitcher) {
        pitcherCount += 1;
        expect(candidate.secondaryPosition).toBeUndefined();
        expect(candidate.arsenal.length).toBeGreaterThan(0);
        expect(candidate.ratings.velocity).toBeGreaterThan(0);
        expect(candidate.ratings.junk).toBeGreaterThan(0);
        expect(candidate.ratings.accuracy).toBeGreaterThan(0);
        expect(traits.every((trait) => pitcherPool.has(trait))).toBe(true);
        expect(traits.every((trait) => isTraitEligibleForRole(trait, 'pitcher'))).toBe(true);
      } else {
        fielderCount += 1;
        expect(candidate.arsenal).toEqual([]);
        expect(candidate.ratings.velocity).toBe(0);
        expect(candidate.ratings.junk).toBe(0);
        expect(candidate.ratings.accuracy).toBe(0);
        expect(traits.every((trait) => hitterPool.has(trait))).toBe(true);
        expect(traits.every((trait) => isTraitEligibleForRole(trait, 'position'))).toBe(true);
      }
    }

    const realizedGradeDeviations = Object.fromEntries(
      Object.entries(SECTION_3_2_GRADE_TARGETS).map(([grade, target]) => {
        const realized = gradeCounts[grade as Section32Grade] / SECTION_13_SAMPLE_SIZE;
        return [grade, Number(((realized - target) * 100).toFixed(3))];
      }),
    ) as Record<Section32Grade, number>;
    const realizedTraitDeviations = SECTION_3_4_TRAIT_COUNT_TARGETS.map((target, index) =>
      Number((((traitCounts[index] / SECTION_13_SAMPLE_SIZE) - target) * 100).toFixed(3)),
    );
    const fielderShare = fielderCount / SECTION_13_SAMPLE_SIZE;

    console.info('§13 N', SECTION_13_SAMPLE_SIZE);
    console.info('§13 grade deviations pp', realizedGradeDeviations);
    console.info('§13 trait-count deviations pp', {
      zero: realizedTraitDeviations[0],
      one: realizedTraitDeviations[1],
      two: realizedTraitDeviations[2],
    });
    console.info('§13 position counts', Object.fromEntries([...positionCounts.entries()].sort()));

    for (const [grade, target] of Object.entries(SECTION_3_2_GRADE_TARGETS)) {
      const realized = gradeCounts[grade as Section32Grade] / SECTION_13_SAMPLE_SIZE;
      expect(Math.abs(realized - target)).toBeLessThanOrEqual(SECTION_13_GRADE_TOLERANCE);
    }
    for (const [index, target] of SECTION_3_4_TRAIT_COUNT_TARGETS.entries()) {
      const realized = traitCounts[index] / SECTION_13_SAMPLE_SIZE;
      expect(Math.abs(realized - target)).toBeLessThanOrEqual(SECTION_13_TRAIT_TOLERANCE);
    }
    expect(pitcherCount).toBeGreaterThan(0);
    expect(fielderCount).toBeGreaterThan(0);
    expect(fielderShare).toBeGreaterThanOrEqual(SECTION_13_POSITION_PLAYER_MIN_SHARE);
    expect(fielderShare).toBeLessThanOrEqual(SECTION_13_POSITION_PLAYER_MAX_SHARE);
    for (const position of ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'SP/RP', 'RP', 'CP']) {
      expect(positionCounts.get(position)).toBeGreaterThan(0);
    }
  }, 120_000);

  test('§10 prospect ages use the seeded wide band-weighted young-skewed draw independent of grade', () => {
    const prospects = generateProspectPool({
      leagueId: 'section-10-age-distribution',
      seasonNumber: 1,
      seed: 'section-10-age-distribution-seed',
      teamDraftOrder: BASE_INPUT.teamDraftOrder,
    }, SECTION_10_AGE_SAMPLE_SIZE);
    const bandCounts = PROSPECT_AGE_BANDS.map(() => 0);
    const ageCounts = new Map<number, number>();
    const ages: number[] = [];
    const gradeScores: number[] = [];

    for (const prospect of prospects) {
      const bandIndex = PROSPECT_AGE_BANDS.findIndex((band) =>
        prospect.age >= band.min && prospect.age <= band.max,
      );

      expect(Number.isInteger(prospect.age)).toBe(true);
      expect(prospect.age).toBeGreaterThanOrEqual(18);
      expect(prospect.age).toBeLessThanOrEqual(42);
      expect(bandIndex).toBeGreaterThanOrEqual(0);

      bandCounts[bandIndex] += 1;
      ageCounts.set(prospect.age, (ageCounts.get(prospect.age) ?? 0) + 1);
      ages.push(prospect.age);
      gradeScores.push(SECTION_10_GRADE_SCORE[prospect.overallGrade]);
    }

    const histogram = Object.fromEntries(
      PROSPECT_AGE_BANDS.map((band, index) => [
        `${band.min}-${band.max}`,
        Number((bandCounts[index] / prospects.length).toFixed(4)),
      ]),
    );
    const youngShare = (bandCounts[0] + bandCounts[1]) / prospects.length;
    const olderShare = (bandCounts[3] + bandCounts[4]) / prospects.length;
    const ageGradeCorrelation = pearsonCorrelation(ages, gradeScores);

    console.info('§10 age histogram', histogram);
    console.info('§10 age-grade correlation', Number(ageGradeCorrelation.toFixed(4)));

    expect(prospects).toHaveLength(SECTION_10_AGE_SAMPLE_SIZE);
    expect(Math.min(...ages)).toBe(18);
    expect(Math.max(...ages)).toBe(42);
    for (const [index, band] of PROSPECT_AGE_BANDS.entries()) {
      const realized = bandCounts[index] / prospects.length;
      expect(Math.abs(realized - band.weight)).toBeLessThanOrEqual(SECTION_10_AGE_TOLERANCE);
    }
    expect(youngShare).toBeGreaterThanOrEqual(0.68);
    expect(youngShare).toBeLessThanOrEqual(0.72);
    expect(olderShare).toBeGreaterThanOrEqual(0.10);
    expect(olderShare).toBeLessThanOrEqual(0.14);
    expect((ageCounts.get(18) ?? 0) / prospects.length).toBeLessThan(0.13);
    expect(Math.abs(ageGradeCorrelation)).toBeLessThanOrEqual(SECTION_10_GRADE_CORRELATION_TOLERANCE);
    expect(drawProspectAge('section-10-determinism')).toBe(drawProspectAge('section-10-determinism'));
  }, 120_000);

  test('§10 age draw is isolated from all non-age generated prospect output', () => {
    const output = generateProspectScoutingDraft(B11_B8_RNG_PROOF_INPUT);
    const nonAgeJson = JSON.stringify(stripAge(output));

    expect({
      length: nonAgeJson.length,
      hash: fnv1aHex(nonAgeJson),
    }).toEqual(B11_B8_NON_AGE_RNG_PROOF);
  });

  test('generated prospect names come from the SMB4 database with deterministic variety', () => {
    const output = generateProspectScoutingDraft({
      ...BASE_INPUT,
      rounds: 12,
      candidatePoolMultiplier: 5,
      seed: 'smb4-name-policy-seed',
    });
    const names = output.draftClass.map((candidate) => `${candidate.firstName} ${candidate.lastName}`);

    expect(output.draftClass.every((candidate) => SMB4_FIRST_NAMES.includes(candidate.firstName))).toBe(true);
    expect(output.draftClass.every((candidate) => SMB4_LAST_NAMES.includes(candidate.lastName))).toBe(true);
    expect(new Set(output.draftClass.map((candidate) => candidate.firstName)).size).toBeGreaterThan(40);
    expect(new Set(output.draftClass.map((candidate) => candidate.lastName)).size).toBeGreaterThan(40);
    expect(new Set(names).size).toBe(names.length);
    expect(generateProspectScoutingDraft({
      ...BASE_INPUT,
      rounds: 12,
      candidatePoolMultiplier: 5,
      seed: 'smb4-name-policy-seed',
    }).draftClass.map((candidate) => `${candidate.firstName} ${candidate.lastName}`)).toEqual(names);
  });

  test('generated ids are deterministic and collision-safe', () => {
    const baseFirstPickId = 'prospect-league-1-1-team-a-1-1';
    const output = generateProspectScoutingDraft({
      ...BASE_INPUT,
      existingPlayerIds: [baseFirstPickId],
    });

    expect(output.generatedPlayers[0].id).toBe(`${baseFirstPickId}-alt-1`);
    expect(new Set(output.generatedPlayers.map((player) => player.id)).size).toBe(
      output.generatedPlayers.length,
    );
    expect(generateProspectScoutingDraft({
      ...BASE_INPUT,
      existingPlayerIds: [baseFirstPickId],
    }).generatedPlayers[0].id).toBe(`${baseFirstPickId}-alt-1`);
  });

  test('scout specialty improves matching-position scouted-grade accuracy on average', () => {
    const candidate: GeneratedProspectCandidate = {
      candidateId: 'candidate-cf',
      firstName: 'Test',
      lastName: 'Center',
      position: 'CF',
      trueGrade: 'B',
      potentialGrade: 'B+',
      archetypeFamily: 'Balanced',
      ratings: {
        power: 60,
        contact: 60,
        speed: 70,
        fielding: 70,
        arm: 60,
        velocity: 30,
        junk: 30,
        accuracy: 30,
      },
      arsenal: [],
      personality: 'Competitive',
      chemistry: 'Competitive',
      hiddenPersonalityModifiers: {
        loyalty: 50,
        ambition: 50,
        resilience: 50,
        charisma: 50,
      },
    };
    const seeds = Array.from({ length: 80 }, (_, index) => `accuracy-seed-${index}`);
    const neutralErrors = seeds.map((seed) =>
      scoutProspect(candidate, undefined, seed).gradeError,
    );
    const specialistErrors = seeds.map((seed) =>
      scoutProspect(candidate, {
        scoutId: 'cf-specialist',
        scoutName: 'Center Field Specialist',
        specialties: ['CF'],
      }, seed).gradeError,
    );

    const average = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(average(specialistErrors)).toBeLessThan(average(neutralErrors));
    expect(neutralErrors.some((error) => error > 0)).toBe(true);
  });

  test('scout tier uses exact position membership', () => {
    expect(scoutTierForPosition('CF', {
      specialties: ['CF', 'outfield'],
      weaknesses: ['CP', 'pitching'],
    })).toBe('high');
    expect(scoutTierForPosition('CP', {
      specialties: ['CF', 'outfield'],
      weaknesses: ['CP', 'pitching'],
    })).toBe('low');
    expect(scoutTierForPosition('LF', {
      specialties: ['outfield'],
      weaknesses: ['pitching'],
    })).toBe('medium');
  });

  test('S3 scout tool bands contain the true value with tier-width deterministic ranges', () => {
    const tiers = ['high', 'medium', 'low'] as const;
    const trueValues = [20, 50, 99] as const;

    for (const tier of tiers) {
      for (const trueValue of trueValues) {
        const first = scoutToolBand(trueValue, tier, `s3-band:${tier}:${trueValue}`);
        const second = scoutToolBand(trueValue, tier, `s3-band:${tier}:${trueValue}`);

        expect(first.lower).toBeLessThanOrEqual(trueValue);
        expect(first.upper).toBeGreaterThanOrEqual(trueValue);
        expect(first.lower).toBeGreaterThanOrEqual(0);
        expect(first.upper).toBeLessThanOrEqual(99);
        expect(first.upper - first.lower).toBe(SCOUT_TOOL_BAND_WIDTHS[tier]);
        expect(second).toEqual(first);
      }
    }
  });

  test('S3 scout tool band seed controls the in-band offset when the feasible span is open', () => {
    for (const tier of ['high', 'medium', 'low'] as const) {
      const first = scoutToolBand(50, tier, 's3-seed-a');
      const second = scoutToolBand(50, tier, 's3-seed-b');

      expect(second.lower).not.toBe(first.lower);
    }
  });

  test('S4 scout overall grade bands contain the true grade with tier-width deterministic ranges', () => {
    const tiers = ['high', 'medium', 'low'] as const;
    const trueGrades = ['A', 'B', 'D'] as const;
    const lastIndex = LOCAL_OVERALL_GRADES.length - 1;

    for (const tier of tiers) {
      for (const trueGrade of trueGrades) {
        const first = scoutOverallGradeBand(trueGrade, tier, `s4-band:${tier}:${trueGrade}`);
        const second = scoutOverallGradeBand(trueGrade, tier, `s4-band:${tier}:${trueGrade}`);
        const trueIndex = overallGradeIndex(trueGrade);
        const bestIndex = overallGradeIndex(first.best);
        const worstIndex = overallGradeIndex(first.worst);
        const coveredCount = worstIndex - bestIndex + 1;
        const expectedWidth = SCOUT_OVERALL_BAND_WIDTHS[tier];
        const touchesLadderEnd = bestIndex === 0 || worstIndex === lastIndex;

        expect(bestIndex).toBeGreaterThanOrEqual(0);
        expect(worstIndex).toBeLessThanOrEqual(lastIndex);
        expect(bestIndex).toBeLessThanOrEqual(trueIndex);
        expect(worstIndex).toBeGreaterThanOrEqual(trueIndex);
        expect(LOCAL_OVERALL_GRADES).toContain(first.best);
        expect(LOCAL_OVERALL_GRADES).toContain(first.worst);
        if (touchesLadderEnd) {
          expect(coveredCount).toBeLessThanOrEqual(expectedWidth);
        } else {
          expect(coveredCount).toBe(expectedWidth);
        }
        expect(second).toEqual(first);
      }
    }
  });

  test('S4 scout overall grade band seed controls the in-band placement for a mid-grade open span', () => {
    const first = scoutOverallGradeBand('B', 'medium', 's4-open-0');
    const second = scoutOverallGradeBand('B', 'medium', 's4-open-10');

    expect(second.best).not.toBe(first.best);
  });

  test('S4 scout overall grade band clamps an A high-tier band to A through B+', () => {
    expect(scoutOverallGradeBand('A', 'high', 's4-extreme-a-high')).toEqual({
      best: 'A',
      worst: 'B+',
    });
  });

  test('S3 scout tool band maps expose hitter and pitcher tool sets using S2 position tiers', () => {
    const ratings = {
      power: 58,
      contact: 61,
      speed: 64,
      fielding: 67,
      arm: 70,
      velocity: 73,
      junk: 76,
      accuracy: 79,
    };
    const hitterBands = scoutToolBands({
      ratings,
      position: 'CF',
      scout: { specialties: ['CF'] },
      seed: 's3-hitter-tools',
    });
    const pitcherBands = scoutToolBands({
      ratings,
      position: 'SP',
      scout: { weaknesses: ['SP'] },
      seed: 's3-pitcher-tools',
    });
    const mediumBands = scoutToolBands({
      ratings,
      position: 'CF',
      scout: { specialties: ['SS'] },
      seed: 's3-medium-tools',
    });

    expect(Object.keys(hitterBands).sort()).toEqual([...HITTER_SCOUT_TOOLS].sort());
    expect(hitterBands).not.toHaveProperty('velocity');
    expect(hitterBands).not.toHaveProperty('junk');
    expect(hitterBands).not.toHaveProperty('accuracy');
    expect(Object.keys(pitcherBands).sort()).toEqual([...PITCHER_SCOUT_TOOLS].sort());
    expect(pitcherBands).not.toHaveProperty('arm');
    expect(Object.values(hitterBands).every((band) =>
      band.upper - band.lower === SCOUT_TOOL_BAND_WIDTHS.high,
    )).toBe(true);
    expect(Object.values(mediumBands).every((band) =>
      band.upper - band.lower === SCOUT_TOOL_BAND_WIDTHS.medium,
    )).toBe(true);
    expect(Object.values(pitcherBands).every((band) =>
      band.upper - band.lower === SCOUT_TOOL_BAND_WIDTHS.low,
    )).toBe(true);
  });

  test('scout weakness can worsen matching-position scouted-grade accuracy', () => {
    const candidate: GeneratedProspectCandidate = {
      candidateId: 'candidate-cp',
      firstName: 'Test',
      lastName: 'Closer',
      position: 'CP',
      trueGrade: 'B',
      potentialGrade: 'B+',
      archetypeFamily: 'Balanced',
      ratings: {
        power: 30,
        contact: 30,
        speed: 45,
        fielding: 60,
        arm: 60,
        velocity: 75,
        junk: 70,
        accuracy: 65,
      },
      arsenal: ['4F', 'SL'],
      personality: 'Competitive',
      chemistry: 'Competitive',
      hiddenPersonalityModifiers: {
        loyalty: 50,
        ambition: 50,
        resilience: 50,
        charisma: 50,
      },
    };
    const seeds = Array.from({ length: 80 }, (_, index) => `weakness-seed-${index}`);
    const neutralErrors = seeds.map((seed) =>
      scoutProspect(candidate, undefined, seed).gradeError,
    );
    const weakScoutErrors = seeds.map((seed) =>
      scoutProspect(candidate, {
        scoutId: 'cp-weak',
        scoutName: 'Closer Weakness',
        weaknesses: ['CP', 'pitching'],
      }, seed).gradeError,
    );

    const average = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(average(weakScoutErrors)).toBeGreaterThan(average(neutralErrors));
  });

  test('hidden true ratings and hidden personality modifiers stay out of visible-safe reports', () => {
    const output = generateProspectScoutingDraft(BASE_INPUT);
    const player = output.generatedPlayers[0];
    const visibleReport = output.visibleReports[0];

    expect(player.ratingRevealState).toBe('hidden');
    expect(player.power).toEqual(expect.any(Number));
    expect(player.prospectProfile.trueGrade).toBe(player.overallGrade);
    expect(player.hiddenPersonalityModifiers).toEqual(
      expect.objectContaining({
        loyalty: expect.any(Number),
        ambition: expect.any(Number),
        resilience: expect.any(Number),
        charisma: expect.any(Number),
      }),
    );
    expect(visibleReport).not.toHaveProperty('power');
    expect(visibleReport).not.toHaveProperty('contact');
    expect(visibleReport).not.toHaveProperty('trueGrade');
    expect(visibleReport).not.toHaveProperty('hiddenPersonalityModifiers');
    expect(visibleReport.scoutedGrade).toBe(player.prospectProfile.scoutedGrade);
  });

  test('rookie salary is assigned at draft time and FARM assignments fill exactly ten per team', () => {
    const output = generateProspectScoutingDraft(BASE_INPUT);
    const byTeam = new Map<string, number>();
    for (const assignment of output.farmAssignments) {
      byTeam.set(assignment.teamId, (byTeam.get(assignment.teamId) ?? 0) + 1);
    }

    expect(output.generatedPlayers.every((player) => player.salary >= 1666.49)).toBe(true);
    expect(output.generatedPlayers[0].prospectProfile.draftRound).toBe(1);
    expect(output.generatedPlayers[0].salary).toBe(6665.94);
    expect(byTeam.get('team-a')).toBe(10);
    expect(byTeam.get('team-b')).toBe(10);
    expect(output.farmAssignments.every((assignment) => assignment.ratingRevealState === 'hidden')).toBe(true);
  });

  test('round-based prospect salary helper is shared with visible reports and persisted players', () => {
    const output = generateProspectScoutingDraft(BASE_INPUT);
    const firstRound = output.selectedPicks.find((pick) => pick.round === 1);
    const secondRound = output.selectedPicks.find((pick) => pick.round === 2);
    const thirdRound = output.selectedPicks.find((pick) => pick.round === 3);
    const laterRound = output.selectedPicks.find((pick) => pick.round === 4);

    expect(prospectSalaryForDraftRound(1)).toBe(6665.94);
    expect(prospectSalaryForDraftRound(2)).toBe(3999.57);
    expect(prospectSalaryForDraftRound(3)).toBe(2333.08);
    expect(prospectSalaryForDraftRound(4)).toBe(1666.49);
    for (const pick of [firstRound, secondRound, thirdRound, laterRound]) {
      expect(pick?.salary).toBe(prospectSalaryForDraftRound(pick!.round));
      expect(pick?.player.salary).toBe(pick?.salary);
      expect(pick?.visibleReport.salary).toBe(pick?.salary);
    }
  });

  test('pure engine has no storage imports and no raw runtime randomness', () => {
    const source = readFileSync('src/utils/prospectScoutingDraftEngine.ts', 'utf8');

    expect(source).not.toMatch(/leagueBuilderStorage|savePlayer|saveTeamRoster|indexedDB/);
    expect(source).not.toMatch(/Math\.random|Date\.now/);
  });

  test('grade distance helper reports true/scouted grade separation', () => {
    expect(gradeDistance('B', 'B')).toBe(0);
    expect(gradeDistance('B', 'C+')).toBe(2);
  });
});
