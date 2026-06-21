import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { FIRST_NAMES as SMB4_FIRST_NAMES, LAST_NAMES as SMB4_LAST_NAMES } from '../../data/nameDatabase';
import { TRAIT_PRICING } from '../../data/traitPricing';
import { countTraitPolarity, normalizeTrait } from '../../engines/smb4GradeEmulator';
import {
  buildProspectPlayerForPick,
  generateProspectScoutingDraft,
  gradeDistance,
  PROSPECT_HITTER_TRAIT_POOL,
  PROSPECT_PITCHER_TRAIT_POOL,
  prospectTraitsConflict,
  prospectSalaryForDraftRound,
  scoutProspect,
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
      }
    }

    const total = output.draftClass.length;
    expect(counts[0] / total).toBeGreaterThan(0.25);
    expect(counts[0] / total).toBeLessThan(0.35);
    expect(counts[1] / total).toBeGreaterThan(0.45);
    expect(counts[1] / total).toBeLessThan(0.55);
    expect(counts[2] / total).toBeGreaterThan(0.15);
    expect(counts[2] / total).toBeLessThan(0.25);
  });

  test('generated pitchers get pitcher-pool traits and fielders get hitter-pool traits', () => {
    const output = generateProspectScoutingDraft({
      ...BASE_INPUT,
      rounds: 80,
      candidatePoolMultiplier: 5,
      seed: 'section-5-5-position-appropriate-traits-seed',
    });
    const hitterPool = new Set(PROSPECT_HITTER_TRAIT_POOL);
    const pitcherPool = new Set(PROSPECT_PITCHER_TRAIT_POOL);
    const pitchers = output.draftClass.filter((candidate) => PITCHER_POSITIONS.has(candidate.position));
    const fielders = output.draftClass.filter((candidate) => !PITCHER_POSITIONS.has(candidate.position));

    expect(pitchers.length).toBeGreaterThan(0);
    expect(fielders.length).toBeGreaterThan(0);
    for (const candidate of pitchers) {
      const traits = [candidate.trait1, candidate.trait2].filter((trait): trait is string => Boolean(trait));
      expect(traits.every((trait) => pitcherPool.has(trait))).toBe(true);
      expect(traits.every((trait) => !hitterPool.has(trait))).toBe(true);
    }
    for (const candidate of fielders) {
      const traits = [candidate.trait1, candidate.trait2].filter((trait): trait is string => Boolean(trait));
      expect(traits.every((trait) => hitterPool.has(trait))).toBe(true);
      expect(traits.every((trait) => !pitcherPool.has(trait))).toBe(true);
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

  test('scout weakness can worsen matching-position scouted-grade accuracy', () => {
    const candidate: GeneratedProspectCandidate = {
      candidateId: 'candidate-cp',
      firstName: 'Test',
      lastName: 'Closer',
      position: 'CP',
      trueGrade: 'B',
      potentialGrade: 'B+',
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
