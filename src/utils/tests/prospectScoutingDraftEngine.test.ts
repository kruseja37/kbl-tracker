import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  generateProspectScoutingDraft,
  gradeDistance,
  prospectSalaryForDraftRound,
  scoutProspect,
  type GeneratedProspectCandidate,
  type ProspectScoutingDraftInput,
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
        leadership: 50,
        volatility: 50,
        adaptability: 50,
        pressure: 50,
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
        leadership: 50,
        volatility: 50,
        adaptability: 50,
        pressure: 50,
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
        leadership: expect.any(Number),
        volatility: expect.any(Number),
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

    expect(output.generatedPlayers.every((player) => player.salary >= 0.5)).toBe(true);
    expect(output.generatedPlayers[0].prospectProfile.draftRound).toBe(1);
    expect(output.generatedPlayers[0].salary).toBe(2.0);
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

    expect(prospectSalaryForDraftRound(1)).toBe(2.0);
    expect(prospectSalaryForDraftRound(2)).toBe(1.2);
    expect(prospectSalaryForDraftRound(3)).toBe(0.7);
    expect(prospectSalaryForDraftRound(4)).toBe(0.5);
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
