import { describe, expect, it } from 'vitest';

import {
  buildAdvisorLog,
  buildSeededSeatBoard,
  buildTaxCoreRows,
  isCandidateEligibleForBoardSlot,
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

  it('uses canonical primary and secondary eligibility in rankings, slots, and no unrelated roles', () => {
    const dual = candidate('dual-corner', '1B', 2_000, ['1B', 'C']);
    const rankings = buildSeededSeatBoard([...fullPool(), dual]).board!.rankings.byPosition!;
    expect(rankings.C).toContain(dual.id);
    expect(rankings['1B']).toContain(dual.id);
    expect(isCandidateEligibleForBoardSlot('C', dual)).toBe(true);
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
