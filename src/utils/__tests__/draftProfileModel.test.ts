import { describe, expect, test } from 'vitest';

import { buildDraftProfileModel } from '../draftProfileModel';
import type { Player } from '../leagueBuilderStorage';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'profile-player',
    firstName: 'Mara',
    lastName: 'Slate',
    gender: 'F',
    age: 24,
    bats: 'R',
    throws: 'R',
    armSlot: 'High',
    primaryPosition: 'CF',
    secondaryPosition: 'LF',
    power: 91,
    contact: 84,
    speed: 77,
    fielding: 66,
    arm: 55,
    velocity: 44,
    junk: 33,
    accuracy: 22,
    arsenal: ['4F', 'SL'],
    overallGrade: 'A',
    trait1: 'Disciplined',
    trait2: 'RBI Man',
    personality: 'Competitive',
    chemistry: 'Scholarly',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 1_000_000,
    createdDate: '2026-07-04',
    lastModified: '2026-07-04',
    isCustom: true,
    ...overrides,
  };
}

describe('buildDraftProfileModel', () => {
  test('REVEALED MLB hitter includes all ratings, archetype, and no scout bands', () => {
    const model = buildDraftProfileModel(makePlayer({ ratingRevealState: 'revealed' }), { revealFull: true });

    expect(model.fullRatings).toMatchObject({
      power: 91,
      contact: 84,
      speed: 77,
      fielding: 66,
      arm: 55,
      velocity: 44,
      junk: 33,
      accuracy: 22,
      arsenal: ['4F', 'SL'],
    });
    expect(model.archetype).toEqual(expect.any(String));
    expect(model.archetype).not.toBe('');
    expect(model.scoutBands).toBeNull();
  });

  test('REVEALED MLB pitcher still includes batting and pitching ratings', () => {
    const model = buildDraftProfileModel(
      makePlayer({
        primaryPosition: 'SP',
        power: 41,
        contact: 42,
        speed: 43,
        fielding: 44,
        arm: 45,
        velocity: 94,
        junk: 82,
        accuracy: 73,
      }),
      { revealFull: true },
    );

    expect(model.fullRatings).toMatchObject({
      power: 41,
      contact: 42,
      speed: 43,
      fielding: 44,
      arm: 45,
      velocity: 94,
      junk: 82,
      accuracy: 73,
    });
  });

  test('HIDDEN farm suppresses true ratings and returns scout bands', () => {
    const model = buildDraftProfileModel(
      makePlayer({
        ratingRevealState: 'hidden',
        power: 99,
        contact: 98,
        speed: 97,
        fielding: 96,
        arm: 95,
        velocity: 94,
        junk: 93,
        accuracy: 92,
        prospectProfile: {
          scoutedGrade: 'B',
          potentialGrade: 'A-',
          scoutConfidence: 'medium',
          scoutName: 'Scout Vale',
        },
      }),
      { revealFull: true },
    );

    expect(model.fullRatings).toBeNull();
    expect(model.scoutBands).toEqual({
      scoutedGrade: 'B',
      potentialGrade: 'A-',
      scoutConfidence: 'medium',
      scoutName: 'Scout Vale',
    });
    const serialized = JSON.stringify(model);
    for (const leakedRating of ['99', '98', '97', '96', '95', '94', '93', '92']) {
      expect(serialized).not.toContain(leakedRating);
    }
  });

  test('HIDDEN farm without prospect profile uses unscouted labels', () => {
    const model = buildDraftProfileModel(
      makePlayer({ ratingRevealState: 'hidden', prospectProfile: undefined }),
      { revealFull: true },
    );

    expect(model.fullRatings).toBeNull();
    expect(model.scoutBands).toEqual({
      scoutedGrade: 'Unscouted',
      potentialGrade: '—',
      scoutConfidence: '—',
      scoutName: '—',
    });
  });

  test('revealFull false forces hidden when ratingRevealState is undefined', () => {
    const model = buildDraftProfileModel(makePlayer({ ratingRevealState: undefined }), { revealFull: false });

    expect(model.fullRatings).toBeNull();
    expect(model.scoutBands).not.toBeNull();
  });

  test("ratingRevealState 'revealed' overrides revealFull false", () => {
    const model = buildDraftProfileModel(makePlayer({ ratingRevealState: 'revealed' }), { revealFull: false });

    expect(model.fullRatings?.power).toBe(91);
    expect(model.scoutBands).toBeNull();
  });
});
