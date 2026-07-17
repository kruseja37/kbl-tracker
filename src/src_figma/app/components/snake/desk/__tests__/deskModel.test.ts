import { describe, expect, it } from 'vitest';

import {
  buildAdvisorLog,
  buildSeededSeatBoard,
  buildTaxCoreRows,
  isCandidateEligibleForBoardSlot,
  isCanonicalSnakeBoard,
  reconcileBoardAvailability,
  refitBoardSlots,
  reorderSeatBoardRankings,
  seedPositionalRankings,
  type DeskCandidate,
} from '../deskModel';

function candidate(id: string, position: DeskCandidate['position'], worth: number, eligiblePositions = [position]): DeskCandidate {
  return {
    id,
    name: id.toUpperCase(),
    position,
    eligiblePositions,
    advisorWorth: worth,
    iv: worth,
    marginalTax: 0,
    trueCost: worth,
    archetypeChip: 'BALANCED',
    fitWord: 'SOLID FIT',
    risk: 'SAFE_TO_WAIT',
    legalFinishLine: 'AFTER THIS PICK AND A LEGAL FINISH: $1,000 LEFT.',
    construction: {
      id,
      isPitcher: ['SP', 'SP/RP', 'RP', 'CP'].includes(position),
      role: position === 'SP/RP' ? 'SP/RP' : position === 'SP' ? 'SP' : position === 'CP' ? 'CP' : position === 'RP' ? 'RP' : undefined,
      bat: { POW: worth, CON: worth, SPD: worth, FLD: worth, ARM: worth },
      pit: { VEL: worth, JNK: worth, ACC: worth },
    },
  };
}

const positions: DeskCandidate['position'][] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'SP/RP', 'RP', 'CP'];

function fullPool(): DeskCandidate[] {
  return positions.flatMap((position, positionIndex) => Array.from({ length: 6 }, (_, index) => (
    candidate(`${position}-${index + 1}`, position, 1000 - positionIndex * 10 - index)
  )));
}

function canonicalControlPool(split: '13/9' | '14/8'): DeskCandidate[] {
  const hitters = [
    candidate('CONTROL-C-1', 'C', 2_000), candidate('CONTROL-C-2', 'C', 1_990),
    ...(['1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const)
      .map((position, index) => candidate(`CONTROL-${position}`, position, 1_980 - index)),
    candidate('CONTROL-FLEX-1', '1B', 1_800), candidate('CONTROL-FLEX-2', '2B', 1_790),
    candidate('CONTROL-FLEX-3', '3B', 1_780), candidate('CONTROL-FLEX-4', 'SS', 1_770),
  ];
  const pitchers = [
    ...Array.from({ length: 4 }, (_, index) => candidate(`CONTROL-SP-${index + 1}`, 'SP', 1_500 - index)),
    ...Array.from({ length: 3 }, (_, index) => candidate(`CONTROL-RP-${index + 1}`, 'RP', 1_400 - index)),
    candidate('CONTROL-CP', 'CP', 1_300),
  ];
  return split === '13/9'
    ? [...hitters, ...pitchers, candidate('CONTROL-NINTH-ARM', 'RP', 1_200)]
    : [...hitters, candidate('CONTROL-FIFTH-BENCH', 'CF', 1_200), ...pitchers];
}

describe('private desk model', () => {
  it('seeds a unique 22-slot board from positional rankings without exposing an optimizer', () => {
    const moduleKeys = Object.keys({ buildAdvisorLog, buildSeededSeatBoard, buildTaxCoreRows, reconcileBoardAvailability });
    expect(moduleKeys.some((key) => /optimi|suggest|best.?swap/i.test(key))).toBe(false);

    const seeded = buildSeededSeatBoard(fullPool());
    expect(seeded.brokenSlots).toEqual([]);
    expect(Object.keys(seeded.board!.slots)).toHaveLength(22);
    expect(new Set(Object.values(seeded.board!.slots))).toHaveLength(22);
  });

  it('uses swing pitchers in rotation and bullpen slots when the legal pool needs them', () => {
    const pool = [
      ...fullPool().filter((row) => row.position !== 'SP' && row.position !== 'RP'),
      ...Array.from({ length: 6 }, (_, index) => candidate(`SWING-EXTRA-${index}`, 'SP/RP', 700 - index)),
    ];
    const seeded = buildSeededSeatBoard(pool);
    expect(seeded.board).not.toBeNull();
    expect(['SP/RP']).toContain(pool.find((row) => row.id === seeded.board!.slots.SP1)?.position);
    expect(['SP/RP']).toContain(pool.find((row) => row.id === seeded.board!.slots.RP1)?.position);
  });

  it('rejects an illegal what-if slot without inventing a roster solver', () => {
    expect(isCandidateEligibleForBoardSlot('SP1', candidate('cf', 'CF', 50))).toBe(false);
    expect(isCandidateEligibleForBoardSlot('SP1', candidate('swing', 'SP/RP', 50))).toBe(true);
  });

  it('uses secondary eligibility in rankings but primary-only eligibility in starting field slots', () => {
    const dual = candidate('dual-corner', '1B', 2_000, ['1B', 'C']);
    const rankings = buildSeededSeatBoard([...fullPool(), dual]).board!.rankings.byPosition!;
    expect(rankings.C).toContain(dual.id);
    expect(rankings['1B']).toContain(dual.id);
    expect(isCandidateEligibleForBoardSlot('C', dual)).toBe(false);
    expect(isCandidateEligibleForBoardSlot('1B', dual)).toBe(true);
    expect(isCandidateEligibleForBoardSlot('SS', dual)).toBe(false);
    expect(isCandidateEligibleForBoardSlot('SP1', dual)).toBe(false);
  });

  it('deterministically refits overall and position reorders, changes plan totals, and never duplicates a player', () => {
    const pool = fullPool();
    const seeded = buildSeededSeatBoard(pool).board!;
    const total = (slots: Partial<Record<string, string>>) => Object.values(slots)
      .reduce((sum, id) => sum + (pool.find((row) => row.id === id)?.iv ?? 0), 0);

    const overallTarget = '1B-6';
    const overall = refitBoardSlots({
      candidates: pool,
      rankings: { ...seeded.rankings, global: [overallTarget, ...seeded.rankings.global.filter((id) => id !== overallTarget)] },
    });
    expect(overall.brokenSlots).toEqual([]);
    expect(Object.values(overall.slots)).toContain(overallTarget);
    expect(total(overall.slots)).not.toBe(total(seeded.slots));
    expect(new Set(Object.values(overall.slots)).size).toBe(22);

    const positionTarget = 'SS-6';
    const position = refitBoardSlots({
      candidates: pool,
      rankings: {
        ...seeded.rankings,
        byPosition: { ...seeded.rankings.byPosition, SS: [positionTarget, ...(seeded.rankings.byPosition?.SS ?? []).filter((id) => id !== positionTarget)] },
      },
    });
    expect(position.brokenSlots).toEqual([]);
    expect(position.slots.SS).toBe(positionTarget);
    expect(total(position.slots)).not.toBe(total(seeded.slots));
    expect(new Set(Object.values(position.slots)).size).toBe(22);
  });

  it('immediately refits a unique 22-player plan when a GM reorders a ranking', () => {
    const pool = fullPool();
    const board = buildSeededSeatBoard(pool).board!;
    const priorSlots = structuredClone(board.slots);
    const target = '1B-6';
    const orderedIds = [target, ...board.rankings.global.filter((id) => id !== target)];

    const reordered = reorderSeatBoardRankings({ board, view: 'OVERALL', orderedIds, candidates: pool });

    expect(reordered.brokenSlots).toEqual([]);
    expect(reordered.board).not.toBeNull();
    expect(reordered.board!.slots).not.toEqual(priorSlots);
    expect(Object.values(reordered.board!.slots)).toContain(target);
    expect(new Set(Object.values(reordered.board!.slots))).toHaveLength(22);
    const exactChangedSlotCount = Object.keys(priorSlots)
      .filter((slotId) => priorSlots[slotId as keyof typeof priorSlots] !== reordered.board!.slots[slotId as keyof typeof priorSlots]).length;
    expect(exactChangedSlotCount).toBeGreaterThan(0);
    expect(reordered.changedSlotCount).toBe(exactChangedSlotCount);
    expect(reordered.board!.rankings.global?.[0]).toBe(target);
    expect(reordered.board!.revision).toBe(board.revision + 1);
    expect(reordered.board!.rankings.frozenPlayerIds).toContain(target);
    expect(board.slots).toEqual(priorSlots);
  });

  it('locks drafted closers into the plan, assigns the highest-IV owned closer to CP, and excludes undrafted extra closers', () => {
    const pool = fullPool();
    const board = buildSeededSeatBoard(pool).board!;
    const higherOwned = pool.find((row) => row.id === 'CP-5')!;
    const lowerOwned = pool.find((row) => row.id === 'CP-6')!;
    const committedPlayerIds = new Set([higherOwned.id, lowerOwned.id]);
    const refit = refitBoardSlots({
      candidates: pool,
      rankings: board.rankings,
      committedPlayerIds,
    });

    expect(refit.brokenSlots).toEqual([]);
    expect(refit.slots.CP).toBe(higherOwned.id);
    expect(Object.values(refit.slots)).toContain(lowerOwned.id);
    expect(Object.values(refit.slots).filter((id) => id.startsWith('CP-')).sort()).toEqual([
      higherOwned.id,
      lowerOwned.id,
    ].sort());

    const reordered = reorderSeatBoardRankings({
      board,
      view: 'OVERALL',
      orderedIds: [...board.rankings.global].reverse(),
      candidates: pool,
      committedPlayerIds,
    });
    expect(reordered.board).not.toBeNull();
    expect(reordered.board!.slots.CP).toBe(higherOwned.id);
    expect(Object.values(reordered.board!.slots)).toContain(lowerOwned.id);
  });

  it('reports the exact broken slot instead of inventing a player', () => {
    const full = fullPool();
    const rankings = buildSeededSeatBoard(full).board!.rankings;
    const refit = refitBoardSlots({ candidates: full.filter((row) => row.position !== 'CP'), rankings });
    expect(refit.brokenSlots).toEqual(['CP']);
    expect(refit.slots.CP).toBeUndefined();
  });

  it('fails a ranking refit closed instead of returning a partial board', () => {
    const full = fullPool();
    const board = buildSeededSeatBoard(full).board!;
    const prior = structuredClone(board);
    const orderedIds = [...board.rankings.global].reverse();

    const reordered = reorderSeatBoardRankings({
      board,
      view: 'OVERALL',
      orderedIds,
      candidates: full.filter((row) => row.position !== 'CP'),
    });

    expect(reordered.board).toBeNull();
    expect(reordered.brokenSlots).toEqual(['CP']);
    expect(reordered.changedSlotCount).toBe(0);
    expect(board).toEqual(prior);
  });

  it('protects a scarce C/1B dual from the 1B slot when only that player can finish BACKUP_C', () => {
    const pureC = candidate('pure-c', 'C', 3_000);
    const dual = candidate('dual-corner', '1B', 2_000, ['1B', 'C']);
    const pureFirst = candidate('pure-first', '1B', 1_000);
    const pool = [
      ...fullPool().filter((row) => row.position !== 'C' && row.position !== '1B'),
      pureC,
      dual,
      pureFirst,
    ];
    const byPosition = seedPositionalRankings(pool);
    const refit = refitBoardSlots({
      candidates: pool,
      rankings: {
        global: [pureC.id, dual.id, pureFirst.id, ...pool.map((row) => row.id).filter((id) => ![pureC.id, dual.id, pureFirst.id].includes(id))],
        byPosition: {
          ...byPosition,
          C: [pureC.id, dual.id],
          '1B': [dual.id, pureFirst.id],
        },
      },
    });

    expect(refit.brokenSlots).toEqual([]);
    expect(refit.slots.C).toBe(pureC.id);
    expect(refit.slots['1B']).toBe(pureFirst.id);
    expect(refit.slots.BACKUP_C).toBe(dual.id);
  });

  it('lets SWING hold the canonical 22nd bench bat or reliever without requiring an SP/RP card', () => {
    expect(isCandidateEligibleForBoardSlot('SWING', candidate('bench', '1B', 5_000))).toBe(true);
    expect(isCandidateEligibleForBoardSlot('SWING', candidate('relief', 'RP', 5_000))).toBe(true);
    expect(isCandidateEligibleForBoardSlot('SWING', candidate('starter', 'SP', 5_000))).toBe(false);
  });

  it('refuses to fill FLEX1-4 with pure starters on a nine-hitter, thirteen-pitcher board', () => {
    const hitters = [
      candidate('C-1', 'C', 2_000),
      candidate('C-2', 'C', 1_990),
      ...(['1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const)
        .map((position, index) => candidate(`${position}-1`, position, 1_980 - index)),
    ];
    const pitchers = [
      ...Array.from({ length: 8 }, (_, index) => candidate(`SP-${index + 1}`, 'SP', 1_500 - index)),
      ...Array.from({ length: 4 }, (_, index) => candidate(`RP-${index + 1}`, 'RP', 1_400 - index)),
      candidate('CP-1', 'CP', 1_300),
    ];
    const pool = [...hitters, ...pitchers];
    const refit = refitBoardSlots({
      candidates: pool,
      rankings: {
        global: pool.map((row) => row.id),
        byPosition: seedPositionalRankings(pool),
        frozenPlayerIds: [],
      },
    });

    expect(refit.brokenSlots).toEqual(['FLEX1', 'FLEX2', 'FLEX3', 'FLEX4']);
    expect(Object.values(refit.slots)).toHaveLength(18);
    expect(Object.values(refit.slots).filter((id) => id.startsWith('SP-'))).toHaveLength(4);
  });

  it('keeps deterministic valid 13/9 and 14/8 boards with the swing body in the right family', () => {
    const hitters = [
      candidate('C-1', 'C', 2_000), candidate('C-2', 'C', 1_990),
      ...(['1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const)
        .map((position, index) => candidate(`${position}-1`, position, 1_980 - index)),
      candidate('FLEX-BAT-1', '1B', 1_800), candidate('FLEX-BAT-2', '2B', 1_790),
      candidate('FLEX-BAT-3', '3B', 1_780), candidate('FLEX-BAT-4', 'SS', 1_770),
    ];
    const corePitchers = [
      ...Array.from({ length: 4 }, (_, index) => candidate(`SP-${index + 1}`, 'SP', 1_500 - index)),
      ...Array.from({ length: 3 }, (_, index) => candidate(`RP-${index + 1}`, 'RP', 1_400 - index)),
      candidate('CP-1', 'CP', 1_300),
    ];
    const fit = (pool: DeskCandidate[]) => refitBoardSlots({
      candidates: pool,
      rankings: {
        global: pool.map((row) => row.id),
        byPosition: seedPositionalRankings(pool),
        frozenPlayerIds: [],
      },
    });

    const thirteenNinePool = [...hitters, ...corePitchers, candidate('NINTH-ARM', 'RP', 1_200)];
    const thirteenNine = fit(thirteenNinePool);
    expect(thirteenNine.brokenSlots).toEqual([]);
    expect(thirteenNine.invalidRoster).toBe(false);
    expect(thirteenNine.slots.SWING).toBe('NINTH-ARM');
    expect(fit(thirteenNinePool)).toEqual(thirteenNine);

    const fourteenEightPool = [...hitters, candidate('FIFTH-BENCH-BAT', 'CF', 1_200), ...corePitchers];
    const fourteenEight = fit(fourteenEightPool);
    expect(fourteenEight.brokenSlots).toEqual([]);
    expect(fourteenEight.invalidRoster).toBe(false);
    expect(fourteenEight.slots.SWING).toBe('FIFTH-BENCH-BAT');
    expect(fit(fourteenEightPool)).toEqual(fourteenEight);
  });

  it('treats sibling cards as alternatives and finds a complete unique-person refit', () => {
    const pool = fullPool();
    const board = buildSeededSeatBoard(pool).board!;
    const duplicateVersionIds = Object.values(board.slots).slice(0, 2);
    const versionedPool = pool.map((row) => duplicateVersionIds.includes(row.id)
      ? { ...row, versionGroupId: 'same-human' }
      : row);
    const refit = refitBoardSlots({ candidates: versionedPool, rankings: board.rankings });

    expect(refit.brokenSlots).toEqual([]);
    expect(refit.invalidRoster).toBe(false);
    const selectedGroups = Object.values(refit.slots).map((id) => (
      versionedPool.find((row) => row.id === id)?.versionGroupId ?? `player:${id}`
    ));
    expect(new Set(selectedGroups).size).toBe(22);
    expect(reorderSeatBoardRankings({
      board,
      view: 'OVERALL',
      orderedIds: board.rankings.global,
      candidates: versionedPool,
    })).toMatchObject({ invalidRoster: false, brokenSlots: [] });
  });

  it('never moves a hand-touched survivor and only backfills the unavailable slot from the GM ranking', () => {
    const seeded = buildSeededSeatBoard(fullPool());
    const board = seeded.board!;
    const untouchedSecondBase = board.slots['2B'];
    const gone = board.slots.SS;
    const expected = board.rankings.byPosition?.SS?.find((id) => id !== gone);

    const reconciled = reconcileBoardAvailability({
      board,
      candidates: fullPool(),
      unavailablePlayerIds: new Set([gone]),
    });

    expect(reconciled.board.slots.SS).toBe(expected);
    expect(reconciled.board.slots['2B']).toBe(untouchedSecondBase);
    expect(reconciled.events).toEqual([{ slotId: 'SS', gonePlayerId: gone, promotedPlayerId: expected }]);
    expect(reconciled.board.rankings.byPosition?.SS).toEqual(board.rankings.byPosition?.SS);
  });

  it('skips a ranked FLEX backfill that duplicates the existing catcher version and uses the later safe hitter', () => {
    const sourcePool = canonicalControlPool('14/8');
    const sourceBoard = buildSeededSeatBoard(sourcePool).board!;
    const gonePlayerId = sourceBoard.slots.FLEX1;
    const existingCatcherId = sourceBoard.slots.C;
    const duplicateCatcher = {
      ...candidate('CONTROL-C-ALT', 'C', 3_000),
      versionGroupId: 'control-catcher-human',
    };
    const safeHitter = candidate('CONTROL-SAFE-FLEX', '1B', 2_900);
    const candidates = [
      ...sourcePool.map((row) => row.id === existingCatcherId
        ? { ...row, versionGroupId: 'control-catcher-human' }
        : row),
      duplicateCatcher,
      safeHitter,
    ];
    const board = {
      ...sourceBoard,
      rankings: {
        ...sourceBoard.rankings,
        global: [duplicateCatcher.id, safeHitter.id, ...sourceBoard.rankings.global],
      },
    };

    const reconciled = reconcileBoardAvailability({
      board,
      candidates,
      unavailablePlayerIds: new Set([gonePlayerId]),
    });

    expect(reconciled.board.slots.FLEX1).toBe(safeHitter.id);
    expect(reconciled.events).toEqual([{
      slotId: 'FLEX1',
      gonePlayerId,
      promotedPlayerId: safeHitter.id,
    }]);
    expect(reconciled.board.rankings).toBe(board.rankings);
    for (const slotId of Object.keys(board.slots) as Array<keyof typeof board.slots>) {
      if (slotId !== 'FLEX1') expect(reconciled.board.slots[slotId]).toBe(board.slots[slotId]);
    }
  });

  it('leaves an unresolved duplicate-version FLEX backfill byte-stable when no safe candidate exists', () => {
    const sourcePool = canonicalControlPool('14/8');
    const sourceBoard = buildSeededSeatBoard(sourcePool).board!;
    const gonePlayerId = sourceBoard.slots.FLEX1;
    const existingCatcherId = sourceBoard.slots.C;
    const duplicateCatcher = {
      ...candidate('CONTROL-C-ONLY-ALT', 'C', 3_000),
      versionGroupId: 'control-only-catcher-human',
    };
    const candidates = [
      ...sourcePool
        .filter((row) => Object.values(sourceBoard.slots).includes(row.id))
        .map((row) => row.id === existingCatcherId
          ? { ...row, versionGroupId: 'control-only-catcher-human' }
          : row),
      duplicateCatcher,
    ];
    const board = {
      ...sourceBoard,
      rankings: {
        ...sourceBoard.rankings,
        global: [duplicateCatcher.id, ...sourceBoard.rankings.global],
      },
    };

    const reconciled = reconcileBoardAvailability({
      board,
      candidates,
      unavailablePlayerIds: new Set([gonePlayerId]),
    });

    expect(reconciled.board).toBe(board);
    expect(reconciled.board).toEqual(board);
    expect(reconciled.events).toEqual([{
      slotId: 'FLEX1',
      gonePlayerId,
      promotedPlayerId: null,
    }]);
    expect(reconciled.brokenSlots).toEqual(['FLEX1']);
  });

  it('preserves a canonical 13/9 board while backfilling one unavailable FLEX hitter', () => {
    const sourcePool = canonicalControlPool('13/9');
    const sourceBoard = buildSeededSeatBoard(sourcePool).board!;
    const gonePlayerId = sourceBoard.slots.FLEX1;
    const safeHitter = candidate('CONTROL-13-9-SAFE-FLEX', '1B', 3_000);
    const candidates = [...sourcePool, safeHitter];
    const board = {
      ...sourceBoard,
      rankings: {
        ...sourceBoard.rankings,
        global: [safeHitter.id, ...sourceBoard.rankings.global],
      },
    };

    const reconciled = reconcileBoardAvailability({
      board,
      candidates,
      unavailablePlayerIds: new Set([gonePlayerId]),
    });

    expect(reconciled.brokenSlots).toEqual([]);
    expect(reconciled.board.slots.FLEX1).toBe(safeHitter.id);
    expect(reconciled.board.slots.SWING).toBe(sourceBoard.slots.SWING);
    expect(isCanonicalSnakeBoard({ slots: reconciled.board.slots, candidates })).toBe(true);
  });

  it('backfills by the board slot role when the gone player qualified there by secondary position', () => {
    const pool = fullPool();
    const dual = candidate('dual-corner', '1B', 2_000, ['1B', 'C']);
    const seeded = buildSeededSeatBoard(pool).board!;
    const board = {
      ...seeded,
      slots: { ...seeded.slots, C: dual.id },
      rankings: {
        ...seeded.rankings,
        byPosition: {
          ...seeded.rankings.byPosition,
          C: [dual.id, 'C-1', 'C-2'],
          '1B': ['1B-6', dual.id],
        },
      },
    };
    const reconciled = reconcileBoardAvailability({
      board,
      candidates: [...pool, dual],
      unavailablePlayerIds: new Set([dual.id]),
    });
    expect(reconciled.board.slots.C).toBe('C-1');
    expect(reconciled.events).toContainEqual({ slotId: 'C', gonePlayerId: dual.id, promotedPlayerId: 'C-1' });
  });

  it('marks PLAN BROKEN when the GM ranking has no available replacement', () => {
    const seeded = buildSeededSeatBoard(fullPool());
    const board = seeded.board!;
    const ssIds = board.rankings.byPosition?.SS ?? [];
    const reconciled = reconcileBoardAvailability({
      board,
      candidates: fullPool(),
      unavailablePlayerIds: new Set(ssIds),
    });

    expect(reconciled.brokenSlots).toContain('SS');
    expect(reconciled.events[0]).toMatchObject({ slotId: 'SS', promotedPlayerId: null });
  });

  it('keeps the LOG actionable and expires a cleared player warning', () => {
    const first = buildAdvisorLog([], [{
      key: 'risk:ss-1',
      playerId: 'ss-1',
      text: 'SS-1 IS LIKELY GONE BEFORE YOUR NEXT PICK.',
      actionable: true,
    }]);
    const cleared = buildAdvisorLog(first, []);
    expect(first[0].expired).toBe(false);
    expect(cleared[0]).toMatchObject({ key: 'risk:ss-1', expired: true });
  });

  it('uses top-N bullpen arms copy and never creates a CP tax line', () => {
    const rows = buildTaxCoreRows({
      candidates: fullPool(),
      boardPlayerIds: Object.values(buildSeededSeatBoard(fullPool()).board!.slots),
      caps: [
        { group: 'hitters', stat: 'POW', topN: 8, cap: 500, penaltyCurve: 1, penaltyPer100: 1, minAdder: 0 },
        { group: 'bullpen', stat: 'VEL', topN: 4, cap: 200, penaltyCurve: 1, penaltyPer100: 1, minAdder: 0 },
      ],
    });
    expect(rows.map((row) => row.label)).toContain('YOUR TOP 4 BULLPEN ARMS BY VELOCITY');
    expect(rows.map((row) => row.label).join(' ')).not.toMatch(/\bCP\b/);
  });
});

describe('tax-core explainer matches the settled single-assignment grouping (TAXSWING seam)', () => {
  it('shows Two Way batting in hitter rows and pitching in pitcher rows without a duplicate batting row', () => {
    const twoWay = candidate('TWO-WAY', 'SP', 80);
    twoWay.construction.twoWayVariant = 'IF';
    const regular = candidate('REGULAR-SP', 'SP', 90);
    const hitter = candidate('HITTER', 'C', 70);
    const board = [twoWay, regular, hitter];
    const basis = 'pitcher-role-usage-v1' as const;
    const rows = buildTaxCoreRows({
      candidates: board,
      boardPlayerIds: board.map((player) => player.id),
      caps: [
        { group: 'hitters', stat: 'POW', topN: 2, cap: 0, penaltyCurve: 1, penaltyPer100: 1, minAdder: 0, ratingBasis: basis },
        { group: 'rotation', stat: 'POW', topN: 2, cap: 0, penaltyCurve: 1, penaltyPer100: 1, minAdder: 0, ratingBasis: basis },
        { group: 'rotation', stat: 'VEL', topN: 2, cap: 0, penaltyCurve: 1, penaltyPer100: 1, minAdder: 0, ratingBasis: basis },
      ],
    });

    expect(rows.find((row) => row.key === 'hitters:POW')?.playerNames).toEqual(['TWO-WAY', 'HITTER']);
    expect(rows.find((row) => row.key === 'rotation:POW')?.playerNames).toEqual(['REGULAR-SP']);
    expect(rows.find((row) => row.key === 'rotation:VEL')?.playerNames).toEqual(['REGULAR-SP', 'TWO-WAY']);
  });

  it('never names a swing arm in the rotation rows when four pure starters are on the board', () => {
    const board = [
      ...['SP-A', 'SP-B', 'SP-C', 'SP-D'].map((id) => candidate(id, 'SP', 500)),
      candidate('SWING-ELITE', 'SP/RP', 999),
      candidate('RP-1', 'RP', 400),
    ];
    const rows = buildTaxCoreRows({
      candidates: board,
      boardPlayerIds: board.map((row) => row.id),
      caps: [
        { group: 'rotation', stat: 'VEL', topN: 4, cap: 200, penaltyCurve: 1, penaltyPer100: 1, minAdder: 0 },
        { group: 'bullpen', stat: 'VEL', topN: 4, cap: 200, penaltyCurve: 1, penaltyPer100: 1, minAdder: 0 },
      ],
    });
    const rotation = rows.find((row) => row.key === 'rotation:VEL')!;
    const bullpen = rows.find((row) => row.key === 'bullpen:VEL')!;
    expect(rotation.playerNames).not.toContain('SWING-ELITE');
    expect(bullpen.playerNames).toContain('SWING-ELITE');
  });

  it('promotes a swing arm into the rotation rows only to fill a real shortfall', () => {
    const board = [
      ...['SP-A', 'SP-B', 'SP-C'].map((id) => candidate(id, 'SP', 500)),
      candidate('SWING-ELITE', 'SP/RP', 999),
      candidate('RP-1', 'RP', 400),
    ];
    const rows = buildTaxCoreRows({
      candidates: board,
      boardPlayerIds: board.map((row) => row.id),
      caps: [
        { group: 'rotation', stat: 'VEL', topN: 4, cap: 200, penaltyCurve: 1, penaltyPer100: 1, minAdder: 0 },
        { group: 'bullpen', stat: 'VEL', topN: 4, cap: 200, penaltyCurve: 1, penaltyPer100: 1, minAdder: 0 },
      ],
    });
    expect(rows.find((row) => row.key === 'rotation:VEL')!.playerNames).toContain('SWING-ELITE');
    expect(rows.find((row) => row.key === 'bullpen:VEL')!.playerNames).not.toContain('SWING-ELITE');
  });
});
