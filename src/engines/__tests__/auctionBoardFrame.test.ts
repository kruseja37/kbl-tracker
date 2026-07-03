import { describe, expect, it } from 'vitest';

import { LEGAL_ROSTER, isLegalRoster, type RosterSlotPlayer } from '../../data/rosterConstruction';
import {
  AUCTION_BOARD_SEATS,
  buildAuctionBoardFrame,
  type AuctionBoardRosterEntry,
} from '../auctionBoardFrame';
import { toRosterSlotPlayer, type PositionInfoSource, type RosterPositionMap } from '../rosterNeed';

type SourceSpec = PositionInfoSource & { id: string; name?: string };

function source(id: string, primaryPosition: string, options: Partial<PositionInfoSource> = {}): SourceSpec {
  return {
    id,
    name: id,
    primaryPosition,
    ...options,
  };
}

function starters(): SourceSpec[] {
  return LEGAL_ROSTER.fieldPositions.map((position) => source(`starter-${position}`, position));
}

function bench(count: number, options: { secondaryC?: boolean } = {}): SourceSpec[] {
  const positions = ['1B', '2B', '3B', 'SS', 'LF', 'CF'];
  return Array.from({ length: count }, (_, index) => (
    source(`bench-${index + 1}`, positions[index] ?? 'RF', index === 0 && options.secondaryC ? { secondaryPosition: 'C' } : {})
  ));
}

function arms(roles: readonly string[], options: { twoWayCIndex?: number } = {}): SourceSpec[] {
  return roles.map((role, index) => (
    source(`arm-${index + 1}`, role, index === options.twoWayCIndex ? { traits: ['Two Way (C)'] } : {})
  ));
}

function buildFixture(specs: readonly SourceSpec[]): {
  roster: AuctionBoardRosterEntry[];
  positions: RosterPositionMap;
  players: RosterSlotPlayer[];
} {
  const roster = specs.map((spec, index) => ({
    playerId: spec.id,
    name: spec.name ?? spec.id,
    salary: 10_000 + index,
  }));
  const map: Record<string, RosterSlotPlayer> = {};
  for (const spec of specs) {
    map[spec.id] = toRosterSlotPlayer({
      primaryPosition: spec.primaryPosition,
      secondaryPosition: spec.secondaryPosition,
      traits: spec.traits,
    });
  }
  return { roster, positions: map, players: roster.map((entry) => map[entry.playerId]) };
}

function legal14And8SecondaryC(): SourceSpec[] {
  return [
    ...starters(),
    ...bench(6, { secondaryC: true }),
    ...arms(['SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'CP']),
  ];
}

function legal13And9TwoWayCStaff(): SourceSpec[] {
  return [
    ...starters(),
    ...bench(5),
    ...arms(['SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'RP', 'RP'], { twoWayCIndex: 4 }),
  ];
}

function legal13And9SeatedSecondaryC(): SourceSpec[] {
  return [
    ...LEGAL_ROSTER.fieldPositions.map((position) => (
      source(`starter-${position}`, position, position === 'SS' ? { secondaryPosition: 'C' } : {})
    )),
    ...bench(5),
    ...arms(['SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'RP', 'RP']),
  ];
}

function legalFivePureSp(): SourceSpec[] {
  return [
    ...starters(),
    ...bench(5, { secondaryC: true }),
    ...arms(['SP', 'SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'RP']),
  ];
}

function legalCpHeavyPen(): SourceSpec[] {
  return [
    ...starters(),
    ...bench(6, { secondaryC: true }),
    ...arms(['SP', 'SP', 'SP', 'SP', 'CP', 'CP', 'CP', 'CP']),
  ];
}

function legalFiveRelieversViaSwing(): SourceSpec[] {
  return [
    ...starters(),
    ...bench(5, { secondaryC: true }),
    ...arms(['SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'RP', 'RP']),
  ];
}

function glowingSeatIds(specs: readonly SourceSpec[]): string[] {
  const fixture = buildFixture(specs);
  return buildAuctionBoardFrame(fixture.roster, fixture.positions)
    .seats
    .filter((seat) => seat.isGap)
    .map((seat) => seat.slotId);
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function rosterShape(specs: readonly SourceSpec[]): string {
  return specs
    .map((spec) => {
      const parts = [spec.id, spec.primaryPosition];
      if (spec.secondaryPosition) parts.push(`sec=${spec.secondaryPosition}`);
      if (spec.traits?.length) parts.push(`traits=${spec.traits.join('|')}`);
      return parts.join(':');
    })
    .join('\n');
}

function legalRandomRoster(draw: number, random: () => number, hitterCount: 13 | 14): SourceSpec[] {
  const secondaryCMode = pick(['bench', 'field', 'arm'] as const, random);
  const field = LEGAL_ROSTER.fieldPositions.map((position) => (
    source(
      `r${draw}-starter-${position}`,
      position,
      secondaryCMode === 'field' && position === 'SS' ? { secondaryPosition: 'C' } : {},
    )
  ));
  const benchCount = hitterCount - field.length;
  const benchPositions = shuffle(['1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'], random);
  const benchSpecs = Array.from({ length: benchCount }, (_, index) => (
    source(
      `r${draw}-bench-${index + 1}`,
      benchPositions[index] ?? pick(LEGAL_ROSTER.fieldPositions, random),
      secondaryCMode === 'bench' && index === 0
        ? { secondaryPosition: 'C' }
        : { secondaryPosition: pick([undefined, 'IF', 'OF', 'IF/OF', '1B/OF'] as const, random) },
    )
  ));

  const pitcherCount = LEGAL_ROSTER.size - hitterCount;
  const roles = hitterCount === 14
    ? ['SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'CP']
    : ['SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'RP', 'CP'];
  const armSpecs = roles.slice(0, pitcherCount).map((role, index) => (
    source(
      `r${draw}-arm-${index + 1}`,
      role,
      secondaryCMode === 'arm' && index === 4 ? { traits: ['Two Way (C)'] } : {},
    )
  ));

  return shuffle([...field, ...benchSpecs, ...armSpecs], random);
}

function illegalRandomRoster(draw: number, random: () => number, hitterCount: 12 | 13 | 14 | 15): SourceSpec[] {
  const legalBase = legalRandomRoster(draw, random, hitterCount <= 13 ? 13 : 14);
  const desiredPitchers = LEGAL_ROSTER.size - hitterCount;
  let hitters = legalBase.filter((spec) => !['SP', 'RP', 'CP', 'SP/RP'].includes(spec.primaryPosition));
  let pitchers = legalBase.filter((spec) => ['SP', 'RP', 'CP', 'SP/RP'].includes(spec.primaryPosition));

  while (hitters.length > hitterCount) {
    hitters = hitters.slice(0, -1);
    pitchers = [...pitchers, source(`r${draw}-extra-arm-${pitchers.length + 1}`, pick(['SP', 'RP', 'CP', 'SP/RP'], random))];
  }
  while (pitchers.length > desiredPitchers) {
    pitchers = pitchers.slice(0, -1);
    hitters = [...hitters, source(`r${draw}-extra-bench-${hitters.length + 1}`, pick(LEGAL_ROSTER.fieldPositions, random))];
  }

  const mutation = pick(['missingPrimary', 'oneCatcher', 'threeStartable', 'threeRelievable'] as const, random);
  if (mutation === 'missingPrimary') {
    hitters = hitters.map((spec) => (
      spec.primaryPosition === 'SS' ? { ...spec, primaryPosition: '1B', secondaryPosition: undefined } : spec
    ));
  } else if (mutation === 'oneCatcher') {
    hitters = hitters.map((spec) => (
      spec.primaryPosition === 'C'
        ? spec
        : { ...spec, secondaryPosition: spec.secondaryPosition === 'C' ? undefined : spec.secondaryPosition }
    ));
    pitchers = pitchers.map((spec) => ({ ...spec, traits: spec.traits?.filter((trait) => trait !== 'Two Way (C)') }));
  } else if (mutation === 'threeStartable') {
    let startable = 0;
    pitchers = pitchers.map((spec) => {
      if (spec.primaryPosition === 'SP' || spec.primaryPosition === 'SP/RP') {
        startable += 1;
        if (startable > 3) return { ...spec, primaryPosition: 'RP' };
      }
      return spec;
    });
  } else {
    let relievable = 0;
    pitchers = pitchers.map((spec) => {
      if (spec.primaryPosition === 'RP' || spec.primaryPosition === 'CP' || spec.primaryPosition === 'SP/RP') {
        relievable += 1;
        if (relievable > 3) return { ...spec, primaryPosition: 'SP' };
      }
      return spec;
    });
  }

  return shuffle([...hitters, ...pitchers], random);
}

describe('buildAuctionBoardFrame', () => {
  it('legal rosters render clean: zero glows and empty overflow', () => {
    const legalCorpus = [
      legal14And8SecondaryC(),
      legal13And9TwoWayCStaff(),
      legal13And9SeatedSecondaryC(),
      legalFivePureSp(),
      legalCpHeavyPen(),
      legalFiveRelieversViaSwing(),
    ];

    for (const specs of legalCorpus) {
      const fixture = buildFixture(specs);
      expect(fixture.roster).toHaveLength(LEGAL_ROSTER.size);
      expect(isLegalRoster(fixture.players), specs.map((spec) => spec.id).join(',')).toBe(true);

      const frame = buildAuctionBoardFrame(fixture.roster, fixture.positions);
      expect(frame.seats.filter((seat) => seat.isGap)).toHaveLength(0);
      expect(frame.overflow).toHaveLength(0);
    }

    const twoWayCorner = buildFixture(legal13And9TwoWayCStaff());
    const cornerFrame = buildAuctionBoardFrame(twoWayCorner.roster, twoWayCorner.positions);
    expect(cornerFrame.seats.find((seat) => seat.slotId === 'backupC')?.depthNote).toBe(
      'depth via arm-5 (Two Way C)',
    );
  });

  it('seats backupC as capacity when the second catcher is seated at his field position', () => {
    const fixture = buildFixture(legal13And9SeatedSecondaryC());
    expect(fixture.roster).toHaveLength(LEGAL_ROSTER.size);
    expect(isLegalRoster(fixture.players)).toBe(true);

    const frame = buildAuctionBoardFrame(fixture.roster, fixture.positions);
    const backupC = frame.seats.find((seat) => seat.slotId === 'backupC');

    expect(frame.seats.filter((seat) => seat.isGap)).toHaveLength(0);
    expect(frame.overflow).toHaveLength(0);
    expect(backupC?.player?.playerId).toBe('bench-1');
    expect(backupC?.depthNote).toBe('depth via starter-SS (SS, covers C)');
  });

  it('keeps legal/illegal board invariants across seeded random rosters', () => {
    const random = mulberry32(0xd001b01);
    const draws = 6_000;
    let legalCount = 0;
    const splitKeys = new Set<string>();

    for (let draw = 0; draw < draws; draw += 1) {
      const hitterCount = pick([12, 13, 14, 15] as const, random);
      const specs = random() < 0.55 && (hitterCount === 13 || hitterCount === 14)
        ? legalRandomRoster(draw, random, hitterCount)
        : illegalRandomRoster(draw, random, hitterCount);
      splitKeys.add(`${hitterCount}/${LEGAL_ROSTER.size - hitterCount}`);

      const fixture = buildFixture(specs);
      const frame = buildAuctionBoardFrame(fixture.roster, fixture.positions);
      const glows = frame.seats.filter((seat) => seat.isGap);
      const occupiedSeats = frame.seats.filter((seat) => seat.player).length;
      const noDropCount = occupiedSeats + frame.overflow.length;
      const legal = isLegalRoster(fixture.players);

      try {
        expect(noDropCount).toBe(fixture.roster.length);
        if (legal) {
          legalCount += 1;
          expect(glows).toHaveLength(0);
          expect(frame.overflow).toHaveLength(0);
          expect(occupiedSeats).toBe(LEGAL_ROSTER.size);
        } else {
          expect(glows.length).toBeGreaterThanOrEqual(1);
        }
      } catch (error) {
        throw new Error(
          `auctionBoardFrame fuzz counterexample draw=${draw} legal=${legal} split=${hitterCount}/${LEGAL_ROSTER.size - hitterCount}\n` +
            `glows=${glows.map((seat) => seat.slotId).join(',') || 'none'} overflow=${frame.overflow.map((player) => player.playerId).join(',') || 'none'} occupied=${occupiedSeats}\n` +
            rosterShape(specs),
          { cause: error },
        );
      }
    }

    expect(splitKeys).toEqual(new Set(['12/10', '13/9', '14/8', '15/7']));
    expect(legalCount).toBeGreaterThan(0);
    console.info(`auctionBoardFrame fuzz verified legal rosters: ${legalCount}/${draws}`);
  });

  it('illegal roster mutations surface at least one law glow', () => {
    const missingPrimarySs = legal14And8SecondaryC().map((spec) => (
      spec.primaryPosition === 'SS' ? { ...spec, primaryPosition: '1B' } : spec
    ));
    const oneCatcher = legal14And8SecondaryC().map((spec) => (
      spec.id === 'bench-1' ? { ...spec, secondaryPosition: undefined } : spec
    ));
    const threeStartable = legal14And8SecondaryC().map((spec) => (
      spec.id === 'arm-4' ? { ...spec, primaryPosition: 'RP' } : spec
    ));
    const twentyOneBodies = legal14And8SecondaryC().slice(0, LEGAL_ROSTER.size - 1);

    for (const specs of [missingPrimarySs, oneCatcher, threeStartable, twentyOneBodies]) {
      const fixture = buildFixture(specs);
      expect(isLegalRoster(fixture.players)).toBe(false);
      expect(glowingSeatIds(specs).length).toBeGreaterThanOrEqual(1);
    }

    expect(glowingSeatIds(missingPrimarySs)).toContain('SS');
    expect(glowingSeatIds(oneCatcher)).toContain('backupC');
    expect(glowingSeatIds(threeStartable)).toContain('SP4');
  });

  it('never drops input bodies, including a 23rd overflow body and missing position data', () => {
    const specs = [...legal14And8SecondaryC(), source('mystery-23', 'DH')];
    const fixture = buildFixture(specs);
    const positions = { ...fixture.positions };
    delete positions['mystery-23'];

    const frame = buildAuctionBoardFrame(fixture.roster, positions);
    const seatedCount = frame.seats.filter((seat) => seat.player).length;
    expect(seatedCount + frame.overflow.length).toBe(fixture.roster.length);
    expect(frame.overflow.map((player) => player.playerId)).toContain('mystery-23');
  });

  it('is deterministic for the same roster order', () => {
    const fixture = buildFixture(legalFiveRelieversViaSwing());
    const first = buildAuctionBoardFrame(fixture.roster, fixture.positions);
    const second = buildAuctionBoardFrame(fixture.roster, fixture.positions);

    expect(second).toEqual(first);
  });

  it('has no DH or CP seat and derives exactly the legal roster seat count', () => {
    const slotIds = AUCTION_BOARD_SEATS.map((seat) => seat.slotId);
    expect(slotIds).toHaveLength(LEGAL_ROSTER.size);
    expect(slotIds).not.toContain('DH');
    expect(slotIds).not.toContain('CP');
  });
});
