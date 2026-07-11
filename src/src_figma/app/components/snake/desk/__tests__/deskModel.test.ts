import { describe, expect, it } from 'vitest';

import {
  buildAdvisorLog,
  buildSeededSeatBoard,
  buildTaxCoreRows,
  isCandidateEligibleForBoardSlot,
  reconcileBoardAvailability,
  type DeskCandidate,
} from '../deskModel';

function candidate(id: string, position: DeskCandidate['position'], worth: number): DeskCandidate {
  return {
    id,
    name: id.toUpperCase(),
    position,
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
