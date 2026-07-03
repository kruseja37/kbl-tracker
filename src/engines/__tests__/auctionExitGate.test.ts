import { describe, expect, it } from 'vitest';

import { LEGAL_ROSTER, isLegalRoster, type RosterSlotPlayer } from '../../data/rosterConstruction';
import {
  buildAuctionExitReport,
  describeRosterLawGaps,
  type ExitClubInput,
} from '../auctionExitGate';
import type { RosterPositionMap } from '../rosterNeed';

const hitter = (position: string, secondaryPosition?: string | null): RosterSlotPlayer => ({
  isPitcher: false,
  position,
  secondaryPosition: secondaryPosition ?? null,
});

const pitcher = (
  role: 'SP' | 'RP' | 'CP' | 'SP/RP',
  twoWayVariant?: 'IF' | 'OF' | 'C' | null,
): RosterSlotPlayer => ({
  isPitcher: true,
  position: role,
  role,
  twoWayVariant: twoWayVariant ?? null,
});

function rosterFromShapes(shapes: readonly RosterSlotPlayer[], prefix = 'p'): {
  club: ExitClubInput;
  positions: RosterPositionMap;
  shapes: RosterSlotPlayer[];
} {
  const positions: Record<string, RosterSlotPlayer> = {};
  const rosterIds = shapes.map((shape, index) => {
    const id = `${prefix}-${index + 1}`;
    positions[id] = shape;
    return id;
  });
  return { club: { teamId: prefix, rosterIds }, positions, shapes: [...shapes] };
}

function starters(): RosterSlotPlayer[] {
  return LEGAL_ROSTER.fieldPositions.map((position) => hitter(position));
}

function legal14And8SecondaryC(): RosterSlotPlayer[] {
  return [
    ...starters(),
    hitter('1B', 'C'),
    hitter('2B'),
    hitter('SS'),
    hitter('LF'),
    hitter('CF'),
    hitter('RF'),
    pitcher('SP'),
    pitcher('SP'),
    pitcher('SP'),
    pitcher('SP'),
    pitcher('RP'),
    pitcher('RP'),
    pitcher('RP'),
    pitcher('CP'),
  ];
}

function legal13And9TwoWayCReliever(): RosterSlotPlayer[] {
  return [
    ...starters(),
    hitter('1B'),
    hitter('2B'),
    hitter('SS'),
    hitter('LF'),
    hitter('RF'),
    pitcher('SP'),
    pitcher('SP'),
    pitcher('SP'),
    pitcher('SP'),
    pitcher('RP', 'C'),
    pitcher('RP'),
    pitcher('RP'),
    pitcher('RP'),
    pitcher('CP'),
  ];
}

function legal13And9TwoWayCStarter(): RosterSlotPlayer[] {
  return [
    ...starters(),
    hitter('1B'),
    hitter('2B'),
    hitter('SS'),
    hitter('LF'),
    hitter('RF'),
    pitcher('SP'),
    pitcher('SP'),
    pitcher('SP'),
    pitcher('RP'),
    pitcher('RP'),
    pitcher('RP'),
    pitcher('RP'),
    pitcher('CP'),
    pitcher('SP', 'C'),
  ];
}

function legal14And8TwoWayCBullpen(): RosterSlotPlayer[] {
  return [
    ...starters(),
    hitter('1B'),
    hitter('2B'),
    hitter('SS'),
    hitter('LF'),
    hitter('CF'),
    hitter('RF'),
    pitcher('SP'),
    pitcher('SP'),
    pitcher('SP'),
    pitcher('SP'),
    pitcher('RP'),
    pitcher('RP'),
    pitcher('RP'),
    pitcher('RP', 'C'),
  ];
}

function reportFor(shapes: readonly RosterSlotPlayer[]) {
  const fixture = rosterFromShapes(shapes, 'club-a');
  return buildAuctionExitReport([fixture.club], fixture.positions).clubs[0];
}

describe('auction exit gate', () => {
  it('E1: marks a legal 22 as legal with no blockers', () => {
    const verdict = reportFor(legal14And8SecondaryC());

    expect(verdict).toMatchObject({
      teamId: 'club-a',
      rosterCount: LEGAL_ROSTER.size,
      target: LEGAL_ROSTER.size,
      known: true,
      legal: true,
      blockers: [],
    });
    expect(verdict.need).not.toBeNull();
  });

  it('E2: blocks 21 bodies with the singular short-body sentence', () => {
    const verdict = reportFor(legal14And8SecondaryC().slice(0, 21));

    expect(verdict.legal).toBe(false);
    expect(verdict.blockers[0]).toBe('Short 1 body — 21 of 22.');
  });

  it('E3: blocks a 22 with only one catcher coverer', () => {
    const shapes = legal14And8SecondaryC().map((shape) => (
      !shape.isPitcher && shape.secondaryPosition === 'C'
        ? { ...shape, secondaryPosition: null }
        : shape
    ));

    const verdict = reportFor(shapes);

    expect(verdict.legal).toBe(false);
    expect(verdict.blockers).toContain('Needs a second catcher — a backup C or a Two Way (C) arm.');
  });

  it('E4: blocks a 22 with three relievable arms', () => {
    const shapes = legal14And8SecondaryC().map((shape, index) => (
      index === 20 ? pitcher('SP') : shape
    ));

    const verdict = reportFor(shapes);

    expect(verdict.legal).toBe(false);
    expect(verdict.blockers).toContain('Needs 1 more reliever.');
  });

  it('E5: blocks unknown records with only the unknown sentence', () => {
    const fixture = rosterFromShapes(legal14And8SecondaryC());
    delete (fixture.positions as Record<string, RosterSlotPlayer>)[fixture.club.rosterIds[4]];

    const verdict = buildAuctionExitReport([fixture.club], fixture.positions).clubs[0];

    expect(verdict.known).toBe(false);
    expect(verdict.legal).toBe(false);
    expect(verdict.need).toBeNull();
    expect(verdict.blockers).toEqual([
      "Can't read 1 player's positions — legality can't be verified.",
    ]);
  });

  it('E6: caller-side shill exclusion lets allLegal stay true for real clubs', () => {
    const legal = rosterFromShapes(legal14And8SecondaryC(), 'real');
    const illegalShill = rosterFromShapes(legal14And8SecondaryC().slice(0, 20), 'shill');
    const report = buildAuctionExitReport(
      [legal.club],
      { ...legal.positions, ...illegalShill.positions },
    );

    expect(report.clubs).toHaveLength(1);
    expect(report.allLegal).toBe(true);
    expect(report.blockedCount).toBe(0);
  });

  it('E7: pins legal verdict identity to count === 22 && isLegalRoster over a broad corpus', () => {
    const corpus: RosterSlotPlayer[][] = [
      legal14And8SecondaryC(),
      legal13And9TwoWayCReliever(),
      legal13And9TwoWayCStarter(),
      legal14And8TwoWayCBullpen(),
      legal14And8SecondaryC().slice(0, 21),
      [...legal14And8SecondaryC(), hitter('RF')],
      legal14And8SecondaryC().map((shape) => (!shape.isPitcher && shape.position === 'SS' ? hitter('1B') : shape)),
      legal14And8SecondaryC().map((shape) => (!shape.isPitcher && shape.secondaryPosition === 'C' ? hitter(shape.position) : shape)),
      legal14And8SecondaryC().map((shape, index) => (index === 14 ? pitcher('RP') : shape)),
      legal14And8SecondaryC().map((shape, index) => (index === 18 ? pitcher('SP') : shape)),
      legal14And8SecondaryC().map((shape, index) => (index === 8 ? pitcher('RP') : shape)),
      legal14And8SecondaryC().map((shape, index) => (index === 21 ? hitter('RF') : shape)),
    ];

    expect(corpus).toHaveLength(12);
    for (const [index, shapes] of corpus.entries()) {
      const fixture = rosterFromShapes(shapes, `law-${index}`);
      const verdict = buildAuctionExitReport([fixture.club], fixture.positions).clubs[0];
      expect(verdict.legal, `case ${index}`).toBe(
        shapes.length === LEGAL_ROSTER.size && isLegalRoster(fixture.shapes),
      );
    }

    expect(reportFor(legal13And9TwoWayCStarter()).legal).toBe(true);
    expect(reportFor(legal14And8TwoWayCBullpen()).legal).toBe(true);
  });

  it('exports the shared blocker sentence helper in the board voice', () => {
    const verdict = reportFor(legal14And8SecondaryC().slice(0, 21));
    expect(verdict.need).not.toBeNull();
    expect(describeRosterLawGaps(verdict.rosterCount, verdict.need!)[0]).toBe(verdict.blockers[0]);
  });
});
