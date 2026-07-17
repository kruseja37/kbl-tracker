import { describe, expect, it, vi } from 'vitest';

import type { RosterSlotPlayer } from '../../../../../../data/rosterConstruction';
import type { SnakeSeatingPlayer } from '../../../../../../engines/snakeSeatingProof';
import type {
  LeagueBuilderMlbDraftSession,
  Player,
  SnakeBoardSlotId,
  SnakeSeatBoardRecord,
  Team,
} from '../../../../../../utils/leagueBuilderStorage';
import type { DeskEligibilityCandidate } from '../deskModel';
import {
  buildDeskRoomPlayer,
  buildRationalSeats,
  __resetRationalRiskCacheForTests,
  fitWord,
  rationalRiskCacheKey,
  rationalRisksForRoom,
  rationalRisksForRoomUncached,
  reconcileExistingSeatBoards,
  resolveLockedSeat,
  updateSessionSeatBoard,
} from '../deskRoomModel';
import { snakeBoardOverBudgetReason } from '../snakeDeskMoneyCopy';

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

function rationalSeat(
  teamId: string,
  roster: SnakeSeatingPlayer[],
  lockedArchetype = { Power: 1, Contact: 1, Speed: 1, Defense: 1, Rotation: 1, Bullpen: 1 },
) {
  return {
    teamId,
    roster,
    settledRosterPrices: roster.map((player) => ({ playerId: player.playerId, settledPrice: player.price })),
    committedSpent: roster.reduce((sum, player) => sum + player.price, 0),
    budget: 1_000,
    lockedArchetype,
  };
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

function canonicalBackfillFixture(prefix: string): {
  board: SnakeSeatBoardRecord;
  candidates: DeskEligibilityCandidate[];
} {
  const slotRows: Array<[SnakeBoardSlotId, DeskEligibilityCandidate['position'], RosterSlotPlayer]> = [
    ['C', 'C', { isPitcher: false, position: 'C' }],
    ['1B', '1B', { isPitcher: false, position: '1B' }],
    ['2B', '2B', { isPitcher: false, position: '2B' }],
    ['3B', '3B', { isPitcher: false, position: '3B' }],
    ['SS', 'SS', { isPitcher: false, position: 'SS' }],
    ['LF', 'LF', { isPitcher: false, position: 'LF' }],
    ['CF', 'CF', { isPitcher: false, position: 'CF' }],
    ['RF', 'RF', { isPitcher: false, position: 'RF' }],
    ['BACKUP_C', 'C', { isPitcher: false, position: 'C' }],
    ['SP1', 'SP', { isPitcher: true, position: 'SP', role: 'SP' }],
    ['SP2', 'SP', { isPitcher: true, position: 'SP', role: 'SP' }],
    ['SP3', 'SP', { isPitcher: true, position: 'SP', role: 'SP' }],
    ['SP4', 'SP', { isPitcher: true, position: 'SP', role: 'SP' }],
    ['RP1', 'RP', { isPitcher: true, position: 'RP', role: 'RP' }],
    ['RP2', 'RP', { isPitcher: true, position: 'RP', role: 'RP' }],
    ['RP3', 'RP', { isPitcher: true, position: 'RP', role: 'RP' }],
    ['CP', 'CP', { isPitcher: true, position: 'CP', role: 'CP' }],
    ['FLEX1', '1B', { isPitcher: false, position: '1B' }],
    ['FLEX2', '2B', { isPitcher: false, position: '2B' }],
    ['FLEX3', '3B', { isPitcher: false, position: '3B' }],
    ['FLEX4', 'SS', { isPitcher: false, position: 'SS' }],
    ['SWING', 'CF', { isPitcher: false, position: 'CF' }],
  ];
  const candidates = slotRows.map(([slotId, position, rosterShape]) => ({
    id: `${prefix}-${slotId}`,
    position,
    eligiblePositions: [position],
    rosterShape,
    versionGroupId: `${prefix}-human-${slotId}`,
  }));
  return {
    board: {
      slots: Object.fromEntries(slotRows.map(([slotId]) => [slotId, `${prefix}-${slotId}`])) as SnakeSeatBoardRecord['slots'],
      rankings: {
        global: candidates.map((candidate) => candidate.id),
        byPosition: {},
        frozenPlayerIds: [`${prefix}-frozen`],
      },
      revision: 2,
    },
    candidates,
  };
}

describe('private desk room assembly', () => {
  it('shares one sub-cent over-budget copy law between main and companion', () => {
    expect(snakeBoardOverBudgetReason(-0.0000005)).toBeNull();
    expect(snakeBoardOverBudgetReason(-1)).toBe('YOUR 22-MAN BOARD IS $1 OVER BUDGET.');
  });

  it('backfills every existing seat board in one next session without revealing a private seat', () => {
    const fixtures = Object.fromEntries(['a', 'b', 'c'].map((teamId) => [teamId, canonicalBackfillFixture(teamId)]));
    const sourceBoards = Object.fromEntries(['a', 'b', 'c'].map((teamId) => {
      const source = fixtures[teamId].board;
      return [teamId, {
        ...source,
        slots: { ...source.slots, C: 'drafted-catcher' },
        rankings: {
          global: [`${teamId}-replacement`],
          byPosition: { C: ['drafted-catcher', `${teamId}-replacement`] },
          frozenPlayerIds: [`${teamId}-frozen`],
        },
      }];
    })) as Record<string, SnakeSeatBoardRecord>;
    const source = { ...session(), seatBoards: sourceBoards };
    const replacements = ['a', 'b', 'c'].map((teamId): DeskEligibilityCandidate => ({
      id: `${teamId}-replacement`,
      position: 'C',
      eligiblePositions: ['C'],
      rosterShape: { isPitcher: false, position: 'C' },
      versionGroupId: `${teamId}-replacement-human`,
    }));
    const result = reconcileExistingSeatBoards({
      session: source,
      candidates: [...Object.values(fixtures).flatMap((fixture) => fixture.candidates), ...replacements],
      unavailablePlayerIds: new Set(['drafted-catcher']),
    });

    expect(result.changed).toBe(true);
    expect(result.session.revision).toBe(source.revision + 1);
    expect(result.eventsByTeamId).toEqual({
      a: [{ slotId: 'C', gonePlayerId: 'drafted-catcher', promotedPlayerId: 'a-replacement' }],
      b: [{ slotId: 'C', gonePlayerId: 'drafted-catcher', promotedPlayerId: 'b-replacement' }],
      c: [{ slotId: 'C', gonePlayerId: 'drafted-catcher', promotedPlayerId: 'c-replacement' }],
    });
    for (const teamId of ['a', 'b', 'c']) {
      expect(result.session.seatBoards?.[teamId].slots.C).toBe(`${teamId}-replacement`);
      expect(result.session.seatBoards?.[teamId].rankings).toBe(sourceBoards[teamId].rankings);
      expect(sourceBoards[teamId].slots.C).toBe('drafted-catcher');
    }
  });

  it("locks a team's own drafted player into its board while removing that player from every rival board", () => {
    const own = canonicalBackfillFixture('own');
    const rival = canonicalBackfillFixture('rival');
    const punchie: DeskEligibilityCandidate = {
      id: 'punchie-patterson',
      position: 'SP',
      eligiblePositions: ['SP'],
      rosterShape: { isPitcher: true, position: 'SP', role: 'SP' },
      versionGroupId: 'punchie-patterson-human',
    };
    const rivalBoard: SnakeSeatBoardRecord = {
      ...rival.board,
      slots: { ...rival.board.slots, SP1: punchie.id },
      rankings: {
        ...rival.board.rankings,
        global: [punchie.id, ...rival.board.rankings.global],
      },
    };
    const source = {
      ...session(),
      completedPicks: [{
        round: 1, pick: 1, pickIndex: 0, teamId: 'a', playerId: punchie.id,
        versionGroupId: punchie.versionGroupId!, settledSalary: 37, marginalTax: 0,
      }],
      seatBoards: { a: own.board, b: rivalBoard },
    } as LeagueBuilderMlbDraftSession;

    const result = reconcileExistingSeatBoards({
      session: source,
      candidates: [...own.candidates, ...rival.candidates, punchie],
      unavailablePlayerIds: new Set([punchie.id]),
    });

    expect(Object.values(result.session.seatBoards?.a.slots ?? {})).toContain(punchie.id);
    expect(Object.values(result.session.seatBoards?.b.slots ?? {})).not.toContain(punchie.id);
    expect(result.eventsByTeamId.a).toBeUndefined();
    expect(result.eventsByTeamId.b).toContainEqual({
      slotId: 'SP1',
      gonePlayerId: punchie.id,
      promotedPlayerId: rival.board.slots.SP1,
    });
  });

  it('repairs a complete saved board so the highest-IV committed closer owns CP', () => {
    const fixture = canonicalBackfillFixture('closer-order');
    const lower: DeskEligibilityCandidate = {
      id: 'lower-owned-cp', iv: 40, position: 'CP', eligiblePositions: ['CP'],
      rosterShape: { isPitcher: true, position: 'CP', role: 'CP' }, versionGroupId: 'lower-owned-cp-human',
    };
    const higher: DeskEligibilityCandidate = {
      id: 'higher-owned-cp', iv: 80, position: 'CP', eligiblePositions: ['CP'],
      rosterShape: { isPitcher: true, position: 'CP', role: 'CP' }, versionGroupId: 'higher-owned-cp-human',
    };
    const savedBoard: SnakeSeatBoardRecord = {
      ...fixture.board,
      slots: { ...fixture.board.slots, CP: lower.id, RP1: higher.id },
      rankings: {
        ...fixture.board.rankings,
        global: [lower.id, higher.id, ...fixture.board.rankings.global],
        byPosition: { CP: [lower.id, higher.id] },
      },
    };
    const source = {
      ...session(),
      completedPicks: [lower, higher].map((candidate, index) => ({
        round: 1, pick: index + 1, pickIndex: index, teamId: 'a', playerId: candidate.id,
        versionGroupId: candidate.versionGroupId!, settledSalary: candidate.iv!, marginalTax: 0,
      })),
      seatBoards: { a: savedBoard },
    } as LeagueBuilderMlbDraftSession;

    const result = reconcileExistingSeatBoards({
      session: source,
      candidates: [...fixture.candidates, lower, higher],
      unavailablePlayerIds: new Set([lower.id, higher.id]),
    });

    expect(result.changed).toBe(true);
    expect(result.session.seatBoards?.a.slots.CP).toBe(higher.id);
    expect(Object.values(result.session.seatBoards?.a.slots ?? {})).toContain(lower.id);
    expect(savedBoard.slots.CP).toBe(lower.id);
  });

  it('repairs a complete saved board that carries an undrafted extra closer as relief depth', () => {
    const fixture = canonicalBackfillFixture('extra-closer');
    const owned: DeskEligibilityCandidate = {
      id: 'owned-cp', iv: 80, position: 'CP', eligiblePositions: ['CP'],
      rosterShape: { isPitcher: true, position: 'CP', role: 'CP' }, versionGroupId: 'owned-cp-human',
    };
    const availableExtra: DeskEligibilityCandidate = {
      id: 'available-extra-cp', iv: 90, position: 'CP', eligiblePositions: ['CP'],
      rosterShape: { isPitcher: true, position: 'CP', role: 'CP' }, versionGroupId: 'available-extra-cp-human',
    };
    const savedBoard: SnakeSeatBoardRecord = {
      ...fixture.board,
      slots: { ...fixture.board.slots, CP: owned.id, RP1: availableExtra.id },
      rankings: {
        ...fixture.board.rankings,
        global: [availableExtra.id, owned.id, ...fixture.board.rankings.global],
        byPosition: { CP: [availableExtra.id, owned.id] },
      },
    };
    const source = {
      ...session(),
      completedPicks: [{
        round: 1, pick: 1, pickIndex: 0, teamId: 'a', playerId: owned.id,
        versionGroupId: owned.versionGroupId!, settledSalary: owned.iv!, marginalTax: 0,
      }],
      seatBoards: { a: savedBoard },
    } as LeagueBuilderMlbDraftSession;

    const result = reconcileExistingSeatBoards({
      session: source,
      candidates: [...fixture.candidates, owned, availableExtra],
      unavailablePlayerIds: new Set([owned.id]),
    });

    expect(result.changed).toBe(true);
    expect(result.session.seatBoards?.a.slots.CP).toBe(owned.id);
    expect(Object.values(result.session.seatBoards?.a.slots ?? {})).not.toContain(availableExtra.id);
    expect(result.session.seatBoards?.a.slots.RP1).toBe(fixture.board.slots.RP1);
  });

  it('only marks an existing board changed when automatic FLEX backfill can prove canonical version-unique truth', () => {
    const fixture = canonicalBackfillFixture('automatic');
    const gonePlayerId = fixture.board.slots.FLEX1;
    const catcherId = fixture.board.slots.C;
    const catcher = fixture.candidates.find((candidate) => candidate.id === catcherId)!;
    const duplicateCatcher: DeskEligibilityCandidate = {
      id: 'automatic-catcher-alt',
      position: 'C',
      eligiblePositions: ['C'],
      rosterShape: { isPitcher: false, position: 'C' },
      versionGroupId: catcher.versionGroupId,
    };
    const safeHitter: DeskEligibilityCandidate = {
      id: 'automatic-safe-flex',
      position: '1B',
      eligiblePositions: ['1B'],
      rosterShape: { isPitcher: false, position: '1B' },
      versionGroupId: 'automatic-safe-flex-human',
    };
    const boardWithAttack = {
      ...fixture.board,
      rankings: {
        ...fixture.board.rankings,
        global: [duplicateCatcher.id, safeHitter.id, ...fixture.board.rankings.global],
      },
    };
    const source = { ...session(), seatBoards: { a: boardWithAttack } };
    const safe = reconcileExistingSeatBoards({
      session: source,
      candidates: [...fixture.candidates, duplicateCatcher, safeHitter],
      unavailablePlayerIds: new Set([gonePlayerId]),
    });

    expect(safe.changed).toBe(true);
    expect(safe.session.seatBoards?.a.slots.FLEX1).toBe(safeHitter.id);
    expect(source.seatBoards.a).toBe(boardWithAttack);

    const unresolved = reconcileExistingSeatBoards({
      session: source,
      candidates: [...fixture.candidates, duplicateCatcher],
      unavailablePlayerIds: new Set([gonePlayerId]),
    });
    expect(unresolved.changed).toBe(false);
    expect(unresolved.session).toBe(source);
    expect(unresolved.session.seatBoards?.a).toBe(boardWithAttack);
    expect(unresolved.eventsByTeamId.a).toEqual([{
      slotId: 'FLEX1',
      gonePlayerId,
      promotedPlayerId: null,
    }]);
  });

  it('uses the canonical player bands so rival locked archetypes materially change the risk read', () => {
    const powerStored = storedPlayer('power', { power: 99, contact: 1, speed: 1, fielding: 1, arm: 1 });
    const speedStored = storedPlayer('speed', { power: 1, contact: 1, speed: 99, fielding: 1, arm: 1 });
    const neutralStored = storedPlayer('neutral');
    const power = buildDeskRoomPlayer({ player: powerStored, price: 50, seating: seating(powerStored) })!;
    const speed = buildDeskRoomPlayer({ player: speedStored, price: 50, seating: seating(speedStored) })!;
    const neutral = buildDeskRoomPlayer({ player: neutralStored, price: 50, seating: seating(neutralStored) })!;
    expect(power.archetypeWeights.Power).toBe(1);
    expect(power.archetypeWeights.Speed).toBeCloseTo(1 / 99);

    const base = {
      session: { ...session(), pickOrder: [{ pick: 1, teamId: 'asker' }, { pick: 2, teamId: 'rival' }, { pick: 3, teamId: 'asker' }] },
      askingTeamId: 'asker',
      askedPlayerIds: ['power'],
      availablePlayers: [power, speed, neutral],
      baseCaps: [],
      realTeamCount: 2,
    };
    const asker = rationalSeat('asker', legalTwentyOne('a'));
    const powerRoom = rationalRisksForRoom({ ...base, seats: [asker, rationalSeat('rival', legalTwentyOne('p'), { Power: 5, Contact: 0, Speed: 0, Defense: 0, Rotation: 0, Bullpen: 0 })] });
    const speedRoom = rationalRisksForRoom({ ...base, seats: [asker, rationalSeat('rival', legalTwentyOne('s'), { Power: 0, Contact: 0, Speed: 5, Defense: 0, Rotation: 0, Bullpen: 0 })] });
    expect(powerRoom[0].risk).toBe('AT_RISK');
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

  it('inherits the team archetype when an older snake setup has no locked archetype', () => {
    const source = session('BALANCED');
    source.snakeSetup!.clubs = [{ teamId: 'a', hotseat: true }];
    const locked = resolveLockedSeat({
      team: { id: 'a', mlbArchetypeKey: 'whiteyball' } as Team,
      session: source,
    });
    expect(locked.archetypeName).toBe('WHITEYBALL');
    expect(locked.priorities.Speed).toBeGreaterThan(locked.priorities.Power);
  });

  it('scores high-velocity relievers against the Nasty Boys exact bullpen identity', () => {
    const locked = resolveLockedSeat({ team: { id: 'a' } as Team, session: session('nasty-boys') });
    const pitcherShape = { isPitcher: true, position: 'RP', role: 'RP' } as const;
    const highVelocity = storedPlayer('high-velocity', {
      primaryPosition: 'RP', velocity: 95, junk: 50, accuracy: 55,
    });
    const lowVelocity = storedPlayer('low-velocity', {
      primaryPosition: 'RP', velocity: 25, junk: 50, accuracy: 85,
    });
    const highRow = buildDeskRoomPlayer({
      player: highVelocity,
      price: 50,
      seating: { playerId: highVelocity.id, price: 50, shape: pitcherShape, construction: construction(highVelocity.id, pitcherShape, 50) },
    })!;
    const lowRow = buildDeskRoomPlayer({
      player: lowVelocity,
      price: 50,
      seating: { playerId: lowVelocity.id, price: 50, shape: pitcherShape, construction: construction(lowVelocity.id, pitcherShape, 50) },
    })!;

    expect(fitWord({ player: highRow, priorities: locked.priorities, capIdentity: locked.capIdentity, need: null, openSlots: 22 }))
      .toBe('STRONG FIT');
    expect(fitWord({ player: lowRow, priorities: locked.priorities, capIdentity: locked.capIdentity, need: null, openSlots: 22 }))
      .toBe('WEAK FIT');
  });

  it('keeps archetype FIT independent when other rating rows create material tax pressure', () => {
    const locked = resolveLockedSeat({ team: { id: 'a' } as Team, session: session('junkball-surgeons') });
    const hitterShape = { isPitcher: false, position: 'CF' } as const;
    const hitter = storedPlayer('one-lever-fit', {
      power: 5,
      contact: 99,
      speed: 99,
      fielding: 99,
      arm: 99,
    });
    const row = buildDeskRoomPlayer({
      player: hitter,
      price: 50_000,
      seating: {
        playerId: hitter.id,
        price: 50_000,
        shape: hitterShape,
        construction: {
          id: hitter.id,
          isPitcher: false,
          bat: { POW: 5, CON: 99, SPD: 99, FLD: 99, ARM: 99 },
        },
      },
    })!;
    const caps = [{
      group: 'hitters' as const,
      stat: 'CON' as const,
      topN: 8,
      cap: 400,
      penaltyCurve: 1,
      penaltyPer100: 100_000,
      minAdder: 0,
    }];

    expect(fitWord({
      player: row,
      priorities: locked.priorities,
      capIdentity: locked.capIdentity,
      baseCaps: caps,
      need: null,
      openSlots: 22,
    })).toBe('STRONG FIT');
  });

  it('keys exact settled public prices and uses them instead of frozen card prices', () => {
    const drafted = storedPlayer('drafted');
    const deskPlayer = buildDeskRoomPlayer({ player: drafted, price: 50, seating: seating(drafted, 50) })!;
    const source = {
      ...session(),
      revision: 9,
      completedPicks: [{
        round: 1, pick: 1, pickIndex: 0, teamId: 'a', playerId: drafted.id,
        versionGroupId: `player:${drafted.id}`, settledSalary: 37, marginalTax: 0,
      }],
    } as LeagueBuilderMlbDraftSession;
    const seats = buildRationalSeats({
      teams: [{ id: 'a' } as Team],
      session: source,
      playersById: new Map([[drafted.id, deskPlayer]]),
      budget: 1_000,
    });
    expect(seats[0].committedSpent).toBe(37);
    expect(seats[0].settledRosterPrices).toEqual([{ playerId: drafted.id, settledPrice: 37 }]);

    const keyInput = {
      session: source,
      askingTeamId: 'a',
      askedPlayerIds: [drafted.id],
      availablePlayers: [deskPlayer],
      seats,
      baseCaps: [],
      realTeamCount: 1,
    };
    const original = rationalRiskCacheKey(keyInput);
    expect(rationalRiskCacheKey({
      ...keyInput,
      seats: [{ ...seats[0], settledRosterPrices: [{ playerId: drafted.id, settledPrice: 38 }] }],
    })).not.toBe(original);
    expect(rationalRiskCacheKey({
      ...keyInput,
      session: { ...source, revision: 10 },
    })).not.toBe(original);
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
      const asker = rationalSeat('asker', legalTwentyOne(`pa-${fixtureIndex}`));
      const input = {
        session: baseSession,
        askingTeamId: 'asker',
        askedPlayerIds: availablePlayers.map((player) => player.playerId),
        availablePlayers,
        seats: [asker, rationalSeat('rival', legalTwentyOne(`pr-${fixtureIndex}`))],
        baseCaps: [],
        realTeamCount: 2,
      };
      const original = rationalRisksForRoomUncached(input);
      expect(rationalRisksForRoom(input)).toEqual(original);
      expect(rationalRisksForRoom(input)).toEqual(original);
    }
  });
});
