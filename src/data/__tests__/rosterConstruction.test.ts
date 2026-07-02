import { describe, expect, it } from 'vitest';

import {
  LEGAL_ROSTER,
  canCover,
  depthReport,
  isLegalRoster,
  twoWayVariantFromTraits,
  type RosterSlotPlayer,
} from '../rosterConstruction';

/**
 * Legality v2 per JK Ruling A EXPANDED + RATIFIED (DECISIONS_LOG 2026-07-01): primary eight, catcher
 * depth 2 counting secondary-C and Two Way (C) pitchers, group secondaries, soft depth tier.
 */

const hitter = (position: string, secondaryPosition?: string | null): RosterSlotPlayer => ({
  isPitcher: false,
  position,
  secondaryPosition: secondaryPosition ?? null,
});

const pitcher = (
  role: 'SP' | 'RP' | 'CP' | 'SP/RP',
  twoWayVariant?: 'IF' | 'OF' | 'C' | null,
): RosterSlotPlayer => ({ isPitcher: true, position: role, role, twoWayVariant: twoWayVariant ?? null });

/** 8 field starters + `benchExtras` + arms; callers tweak pieces per case. */
function starters(): RosterSlotPlayer[] {
  return ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'].map((pos) => hitter(pos));
}

function arms(): RosterSlotPlayer[] {
  return [pitcher('SP'), pitcher('SP'), pitcher('SP'), pitcher('SP'), pitcher('RP'), pitcher('RP'), pitcher('RP'), pitcher('CP')];
}

describe('isLegalRoster — Ruling A ratified semantics', () => {
  it('accepts the classic construction (two primary catchers) — back-compat', () => {
    const roster = [...starters(), hitter('C'), hitter('1B'), hitter('LF'), hitter('2B'), hitter('SS'), hitter('RF'), ...arms()];
    expect(roster).toHaveLength(22);
    expect(isLegalRoster(roster)).toBe(true);
  });

  it('accepts a SECONDARY-position backup catcher (bench 1B with secondary C)', () => {
    const roster = [...starters(), hitter('1B', 'C'), hitter('LF'), hitter('2B'), hitter('SS'), hitter('RF'), hitter('CF'), ...arms()];
    expect(roster).toHaveLength(22);
    expect(isLegalRoster(roster)).toBe(true);
  });

  it('accepts ONE dedicated catcher + a Two Way (C) pitcher (risky-but-viable by ruling)', () => {
    const roster = [
      ...starters(),
      hitter('LF'),
      hitter('2B'),
      hitter('SS'),
      hitter('RF'),
      hitter('1B'),
      ...arms(),
      pitcher('RP', 'C'),
    ];
    expect(roster).toHaveLength(22);
    expect(roster.filter((p) => !p.isPitcher && p.position === 'C')).toHaveLength(1);
    expect(isLegalRoster(roster)).toBe(true);
  });

  it('rejects a roster with NO primary catcher even when two secondary-C players exist', () => {
    const noC = ['1B', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'].map((pos) => hitter(pos));
    const roster = [...noC, hitter('1B', 'C'), hitter('LF', 'C'), hitter('2B'), hitter('SS'), hitter('RF'), hitter('CF'), ...arms()];
    expect(roster).toHaveLength(22);
    expect(isLegalRoster(roster)).toBe(false);
  });

  it('rejects single-coverage catching (exactly one player who can play C)', () => {
    const roster = [...starters(), hitter('1B'), hitter('LF'), hitter('2B'), hitter('SS'), hitter('RF'), hitter('CF'), ...arms()];
    expect(roster).toHaveLength(22);
    expect(isLegalRoster(roster)).toBe(false);
  });

  it('group secondaries (IF/OF etc.) never satisfy catcher coverage', () => {
    const roster = [...starters(), hitter('1B', 'IF/OF'), hitter('LF', 'IF'), hitter('2B'), hitter('SS'), hitter('RF'), hitter('CF'), ...arms()];
    expect(roster).toHaveLength(22);
    expect(isLegalRoster(roster)).toBe(false);
  });
});

describe('canCover — group-secondary + Two Way expansion', () => {
  it('expands the group secondaries to their positions only', () => {
    expect(canCover(hitter('C', 'IF'), '2B')).toBe(true);
    expect(canCover(hitter('C', 'IF'), 'LF')).toBe(false);
    expect(canCover(hitter('C', 'OF'), 'CF')).toBe(true);
    expect(canCover(hitter('C', 'OF'), 'SS')).toBe(false);
    expect(canCover(hitter('C', 'IF/OF'), 'SS')).toBe(true);
    expect(canCover(hitter('C', 'IF/OF'), 'RF')).toBe(true);
    expect(canCover(hitter('C', '1B/OF'), '1B')).toBe(true);
    expect(canCover(hitter('C', '1B/OF'), 'RF')).toBe(true);
    expect(canCover(hitter('C', '1B/OF'), 'SS')).toBe(false);
  });

  it('pitchers cover only via their Two Way variant', () => {
    expect(canCover(pitcher('RP'), 'SS')).toBe(false);
    expect(canCover(pitcher('RP', 'IF'), 'SS')).toBe(true);
    expect(canCover(pitcher('RP', 'IF'), 'LF')).toBe(false);
    expect(canCover(pitcher('SP', 'OF'), 'RF')).toBe(true);
    expect(canCover(pitcher('CP', 'C'), 'C')).toBe(true);
    expect(canCover(pitcher('CP', 'C'), '1B')).toBe(false);
  });

  it('derives Two Way variants from trait strings', () => {
    expect(twoWayVariantFromTraits(['Two Way (C)'])).toBe('C');
    expect(twoWayVariantFromTraits([undefined, 'Two Way (IF)'])).toBe('IF');
    expect(twoWayVariantFromTraits(['Utility', null])).toBeNull();
    expect(twoWayVariantFromTraits([])).toBeNull();
  });
});

describe('depthReport — the SOFT veteran depth tier', () => {
  it('flags thin positions and counts Two Way pitchers as coverage', () => {
    const roster = [
      ...starters(),
      hitter('1B', 'IF'),
      hitter('LF', 'OF'),
      hitter('2B'),
      hitter('SS'),
      hitter('RF'),
      ...arms(),
      pitcher('RP', 'C'),
    ];
    expect(roster).toHaveLength(22);
    const report = depthReport(roster);
    const at = (pos: string) => report.positions.find((d) => d.position === pos)!;
    // C: primary starter + the Two Way (C) arm = 2 → not thin.
    expect(at('C').coverers).toBe(2);
    expect(at('C').thin).toBe(false);
    // 2B: primary starter + bench 2B + the IF secondary = 3 → not thin.
    expect(at('2B').thin).toBe(false);
    // CF: only the primary starter + the OF secondary = 2 → not thin; but 3B has just its starter + IF.
    expect(at('3B').coverers).toBe(2);
    expect(report.thinPositions.every((p) => at(p).coverers < 2)).toBe(true);
  });

  it('depth is advisory only — a thin-depth roster can still be LEGAL', () => {
    const roster = [...starters(), hitter('C'), hitter('1B'), hitter('LF'), hitter('2B'), hitter('SS'), hitter('RF'), ...arms()];
    expect(isLegalRoster(roster)).toBe(true);
    const report = depthReport(roster);
    expect(report.thinPositions.length).toBeGreaterThan(0);
  });

  it('LEGAL_ROSTER surface stays pinned', () => {
    expect(LEGAL_ROSTER.size).toBe(22);
    expect(LEGAL_ROSTER.minCatchers).toBe(2);
    expect(LEGAL_ROSTER.fieldPositions).toHaveLength(8);
  });
});
