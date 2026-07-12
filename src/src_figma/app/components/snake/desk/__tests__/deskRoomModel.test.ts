import { describe, expect, it, vi } from 'vitest';

import type { RosterSlotPlayer } from '../../../../../../data/rosterConstruction';
import type { SnakeSeatingPlayer } from '../../../../../../engines/snakeSeatingProof';
import type {
  LeagueBuilderMlbDraftSession,
  Player,
  SnakeSeatBoardRecord,
  Team,
} from '../../../../../../utils/leagueBuilderStorage';
import {
  buildDeskRoomPlayer,
  __resetRationalRiskCacheForTests,
  fitWord,
  rationalRisksForRoom,
  rationalRisksForRoomUncached,
  resolveLockedSeat,
  updateSessionSeatBoard,
} from '../deskRoomModel';

function storedPlayer(id: string, ratings: Partial<Player> = {}): Player {
  return {
    id,
    firstName: id,
    lastName: '',
    primaryPosition: 'CF',
    power: 50,
    contact: 50,
    speed: 50,
    fielding: 50,
    arm: 50,
    velocity: 50,
    junk: 50,
    accuracy: 50,
    ...ratings,
  } as Player;
}

function construction(id: string, shape: RosterSlotPlayer, rating = 20) {
  return {
    id,
    isPitcher: shape.isPitcher,
    role: shape.role as 'SP' | 'SP/RP' | 'RP' | 'CP' | undefined,
    bat: { POW: rating, CON: rating, SPD: rating, FLD: rating, ARM: rating },
    ...(shape.isPitcher ? { pit: { VEL: rating, JNK: rating, ACC: rating } } : {}),
  };
}

function seating(player: Player, price = 50): SnakeSeatingPlayer {
  const shape = { isPitcher: false, position: 'CF' } as const;
  return { playerId: player.id, price, shape, construction: construction(player.id, shape) };
}

function legalTwentyOne(prefix: string): SnakeSeatingPlayer[] {
  const shapes: RosterSlotPlayer[] = [
    { isPitcher: false, position: 'C' },
    { isPitcher: false, position: '1B' },
    { isPitcher: false, position: '2B' },
    { isPitcher: false, position: '3B' },
    { isPitcher: false, position: 'SS' },
    { isPitcher: false, position: 'LF', secondaryPosition: 'C' },
    { isPitcher: false, position: 'CF' },
    { isPitcher: false, position: 'RF' },
    ...Array.from({ length: 5 }, () => ({ isPitcher: false, position: 'CF' } as RosterSlotPlayer)),
    ...Array.from({ length: 4 }, () => ({ isPitcher: true, position: 'SP', role: 'SP' } as RosterSlotPlayer)),
    ...Array.from({ length: 4 }, (_, index) => ({
      isPitcher: true,
      position: index === 0 ? 'CP' : 'RP',
      role: index === 0 ? 'CP' : 'RP',
    } as RosterSlotPlayer)),
  ];
  return shapes.map((shape, index) => ({
    playerId: `${prefix}-${index}`,
    price: 1,
    shape,
    construction: construction(`${prefix}-${index}`, shape),
  }));
}

function session(archetypeId = 'murderers-row'): LeagueBuilderMlbDraftSession {
  return {
    id: 'mlb:league:1', leagueId: 'league', seasonNumber: 1, seed: 'seed',
    workflowVersion: 'snake-v1', engineMethodVersion: 'snake-s1a', tier: 'juiced',
    balanceMode: 'taxed', rounds: 22, pickOrder: [], completedPicks: [], currentPickIndex: 0,
    revision: 0, snakeSetup: { poolPlayerIds: [], versionSelections: {}, clubs: [{ teamId: 'a', hotseat: true, archetypeId }], orderSeed: 'seed' },
    createdDate: '2026-07-10', lastModified: '2026-07-10',
  };
}

function board(playerId: string): SnakeSeatBoardRecord {
  return {
    slots: Object.fromEntries([
      'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'BACKUP_C',
      'SP1', 'SP2', 'SP3', 'SP4', 'RP1', 'RP2', 'RP3', 'CP',
      'FLEX1', 'FLEX2', 'FLEX3', 'FLEX4', 'SWING',
    ].map((slot) => [slot, `${playerId}-${slot}`])) as SnakeSeatBoardRecord['slots'],
    rankings: { global: [playerId], byPosition: { CF: [playerId] }, frozenPlayerIds: [playerId] },
    revision: 2,
  };
}

describe('private desk room assembly', () => {
  it('uses the canonical player bands so rival locked archetypes materially change the risk read', () => {
    const powerStored = storedPlayer('power', { power: 99, contact: 1, speed: 1, fielding: 1, arm: 1 });
    const speedStored = storedPlayer('speed', { power: 1, contact: 1, speed: 99, fielding: 1, arm: 1 });
    const power = buildDeskRoomPlayer({ player: powerStored, price: 50, seating: seating(powerStored) })!;
    const speed = buildDeskRoomPlayer({ player: speedStored, price: 50, seating: seating(speedStored) })!;
    expect(power.archetypeWeights.Power).toBe(1);
    expect(power.archetypeWeights.Speed).toBeCloseTo(1 / 99);

    const base = {
      session: { ...session(), pickOrder: [{ pick: 1, teamId: 'asker' }, { pick: 2, teamId: 'rival' }, { pick: 3, teamId: 'asker' }] },
      askingTeamId: 'asker',
      askedPlayerIds: ['power'],
      availablePlayers: [power, speed],
      baseCaps: [],
      realTeamCount: 2,
    };
    const asker = { teamId: 'asker', roster: legalTwentyOne('a'), committedSpent: 21, budget: 1_000, lockedArchetype: { Power: 1, Contact: 1, Speed: 1, Defense: 1, Rotation: 1, Bullpen: 1 } };
    const powerRoom = rationalRisksForRoom({ ...base, seats: [asker, { ...asker, teamId: 'rival', roster: legalTwentyOne('p'), lockedArchetype: { Power: 5, Contact: 0, Speed: 0, Defense: 0, Rotation: 0, Bullpen: 0 } }] });
    const speedRoom = rationalRisksForRoom({ ...base, seats: [asker, { ...asker, teamId: 'rival', roster: legalTwentyOne('s'), lockedArchetype: { Power: 0, Contact: 0, Speed: 5, Defense: 0, Rotation: 0, Bullpen: 0 } }] });
    expect(powerRoom[0].risk).toBe('LIKELY_GONE');
    expect(speedRoom[0].risk).toBe('SAFE_TO_WAIT');
  });

  it('warns on missing ratings and renders FIT UNKNOWN instead of a neutral fit word', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const player = storedPlayer('broken', { power: Number.NaN });
    const row = buildDeskRoomPlayer({ player, price: 50, seating: seating(player) })!;
    const locked = resolveLockedSeat({ team: { id: 'a' } as Team, session: session() });
    expect(row.fitKnown).toBe(false);
    expect(fitWord({ player: row, priorities: locked.priorities, need: null, openSlots: 22 })).toBe('FIT UNKNOWN');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('missing ratings'));
  });

  it('round-trips one seat board through the existing session shape without touching another seat', () => {
    const originalA = board('a');
    const originalB = board('b');
    const source = { ...session(), seatBoards: { a: originalA, b: originalB } };
    const changedA = { ...originalA, revision: 3, rankings: { ...originalA.rankings, byPosition: { CF: ['new-a'] } } };
    const saved = updateSessionSeatBoard(source, 'a', changedA);
    expect(saved.seatBoards?.a).toEqual(changedA);
    expect(saved.seatBoards?.b).toEqual(originalB);
    expect(saved.revision).toBe(source.revision + 1);
  });

  it('reads the archetype locked in the session instead of a later team edit', () => {
    const locked = resolveLockedSeat({
      team: { id: 'a', mlbArchetypeKey: 'whiteyball' } as Team,
      session: session('murderers-row'),
    });
    expect(locked.archetypeName).toBe("MURDERERS' ROW");
    expect(locked.priorities.Power).toBeGreaterThan(locked.priorities.Speed);
  });

  it('memoized risk reads are byte-identical to uncached reads across 30 deterministic fixtures', () => {
    let state = 0xc0ffee;
    const randomRating = () => {
      state = (Math.imul(state, 1103515245) + 12345) >>> 0;
      return 1 + (state % 99);
    };
    for (let fixtureIndex = 0; fixtureIndex < 30; fixtureIndex += 1) {
      __resetRationalRiskCacheForTests();
      const availablePlayers = Array.from({ length: 4 }, (_, index) => {
        const stored = storedPlayer(`property-${fixtureIndex}-${index}`, {
          power: randomRating(), contact: randomRating(), speed: randomRating(), fielding: randomRating(), arm: randomRating(),
        });
        return buildDeskRoomPlayer({ player: stored, price: 20 + randomRating(), seating: seating(stored) })!;
      });
      const baseSession = {
        ...session(),
        id: `property-session-${fixtureIndex}`,
        revision: fixtureIndex,
        pickOrder: [
          { pick: 1, teamId: 'asker' },
          { pick: 2, teamId: 'rival' },
          { pick: 3, teamId: 'asker' },
        ],
      };
      const asker = { teamId: 'asker', roster: legalTwentyOne(`pa-${fixtureIndex}`), committedSpent: 21, budget: 1_000, lockedArchetype: { Power: 1, Contact: 1, Speed: 1, Defense: 1, Rotation: 1, Bullpen: 1 } };
      const input = {
        session: baseSession,
        askingTeamId: 'asker',
        askedPlayerIds: availablePlayers.map((player) => player.playerId),
        availablePlayers,
        seats: [asker, { ...asker, teamId: 'rival', roster: legalTwentyOne(`pr-${fixtureIndex}`) }],
        baseCaps: [],
        realTeamCount: 2,
      };
      const original = rationalRisksForRoomUncached(input);
      expect(rationalRisksForRoom(input)).toEqual(original);
      expect(rationalRisksForRoom(input)).toEqual(original);
    }
  });
});
