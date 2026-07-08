import { describe, expect, it } from 'vitest';

import type { RosterSlotPlayer } from '../../data/rosterConstruction';
import {
  DEPTH_NEED_NUDGE,
  depthAwareNeedNudge,
  rosterNeedBreakdown,
  playerFillsHardRequirement,
  teamRosterNeed,
  toRosterSlotPlayer,
  wouldStrandRoster,
  type RosterPositionMap,
} from '../rosterNeed';
import { DEFAULT_AUCTION_SETUP_CONFIG } from '../../data/auctionEngineConstants';
import { recordBid, resolveLot, type AuctionSession } from '../auctionStateMachine';

const hitter = (position: string, secondaryPosition?: string | null): RosterSlotPlayer => ({
  isPitcher: false,
  position,
  secondaryPosition: secondaryPosition ?? null,
});

const pitcher = (
  role: 'SP' | 'RP' | 'CP' | 'SP/RP',
  twoWayVariant?: 'IF' | 'OF' | 'C' | null,
): RosterSlotPlayer => ({ isPitcher: true, position: role, role, twoWayVariant: twoWayVariant ?? null });

describe('toRosterSlotPlayer', () => {
  it('maps hitters with secondaries and pitchers with roles + Two Way traits', () => {
    expect(toRosterSlotPlayer({ primaryPosition: 'SS', secondaryPosition: 'IF/OF' })).toEqual({
      isPitcher: false,
      position: 'SS',
      secondaryPosition: 'IF/OF',
    });
    expect(toRosterSlotPlayer({ primaryPosition: 'SP/RP' })).toMatchObject({
      isPitcher: true,
      role: 'SP/RP',
      twoWayVariant: null,
    });
    expect(
      toRosterSlotPlayer({ primaryPosition: 'RP', traits: ['Two Way (C)', undefined] }),
    ).toMatchObject({ isPitcher: true, role: 'RP', twoWayVariant: 'C' });
    // Generic 'P' / 'TWO-WAY' primaries carry no rotation/bullpen role commitment.
    expect(toRosterSlotPlayer({ primaryPosition: 'P' }).role).toBeUndefined();
  });
});

describe('rosterNeedBreakdown', () => {
  it('an empty roster needs 21 constrained bodies (the 22nd is a free choice)', () => {
    const need = rosterNeedBreakdown([]);
    expect(need.missingPrimaries).toHaveLength(8);
    expect(need.pitcherNeed).toBe(8);
    expect(need.hitterFloorNeed).toBe(5);
    expect(need.minimumAdditions).toBe(21);
    expect(need.infeasible).toBe(false);
  });

  it('SP/RP swings satisfy either pitching side (optimal assignment, not double-counted)', () => {
    // 3 pure SP + 3 pure RP + 1 swing: the swing fills one side; one body still missing.
    const arms = [pitcher('SP'), pitcher('SP'), pitcher('SP'), pitcher('RP'), pitcher('RP'), pitcher('RP'), pitcher('SP/RP')];
    expect(rosterNeedBreakdown(arms).pitcherNeed).toBe(1);
    // 4 swings alone: 4 can cover one full side but the other still needs 4.
    const swings = [pitcher('SP/RP'), pitcher('SP/RP'), pitcher('SP/RP'), pitcher('SP/RP')];
    expect(rosterNeedBreakdown(swings).pitcherNeed).toBe(4);
  });

  it('requires a CP for the closer slot while letting that CP also satisfy relief', () => {
    const noCloser = [
      pitcher('SP'), pitcher('SP'), pitcher('SP'), pitcher('SP'),
      pitcher('RP'), pitcher('RP'), pitcher('RP'), pitcher('RP'),
    ];
    const missingReliefAndCloser = [
      pitcher('SP'), pitcher('SP'), pitcher('SP'), pitcher('SP'),
      pitcher('RP'), pitcher('RP'), pitcher('RP'),
    ];

    const closerOnlyNeed = rosterNeedBreakdown(noCloser);
    expect(closerOnlyNeed.pitcherNeed).toBe(1);
    expect(closerOnlyNeed.bullpenDeficit).toBe(0);
    expect(closerOnlyNeed.closerDeficit).toBe(1);
    expect(playerFillsHardRequirement(pitcher('RP'), closerOnlyNeed)).toBe(false);
    expect(playerFillsHardRequirement(pitcher('CP'), closerOnlyNeed)).toBe(true);

    const overlappingNeed = rosterNeedBreakdown(missingReliefAndCloser);
    expect(overlappingNeed.pitcherNeed).toBe(1);
    expect(overlappingNeed.bullpenDeficit).toBe(1);
    expect(overlappingNeed.closerDeficit).toBe(1);
    expect(playerFillsHardRequirement(pitcher('RP'), overlappingNeed)).toBe(false);
    expect(playerFillsHardRequirement(pitcher('CP'), overlappingNeed)).toBe(true);
  });

  it('F2: unknown-role arms (P / TWO-WAY primaries) credit NEITHER staff minimum — matching legality', () => {
    // isLegalRoster only credits explicit SP/RP/CP/SP-RP roles, so four bare-'P' arms leave the
    // full 4+4 staff requirement outstanding (they occupy pitcher headcount only).
    const bareArms = Array.from({ length: 4 }, () => toRosterSlotPlayer({ primaryPosition: 'P' }));
    expect(rosterNeedBreakdown(bareArms).pitcherNeed).toBe(8);
    // And the headcount still counts toward the 9-pitcher ceiling.
    const nineBare = Array.from({ length: 6 }, () => toRosterSlotPlayer({ primaryPosition: 'P' }));
    const need = rosterNeedBreakdown([...nineBare, pitcher('SP'), pitcher('SP'), pitcher('RP'), pitcher('RP')]);
    expect(need.infeasible).toBe(true); // 10 pitchers already — no legal completion
  });

  it('breached ceilings are infeasible (15th hitter / 10th pitcher can never reach legal)', () => {
    const hitters15 = Array.from({ length: 15 }, () => hitter('1B'));
    expect(rosterNeedBreakdown(hitters15).infeasible).toBe(true);
    const pitchers10 = Array.from({ length: 10 }, () => pitcher('RP'));
    expect(rosterNeedBreakdown(pitchers10).infeasible).toBe(true);
  });

  it('coverage rides along on other required additions (no dedicated body double-count)', () => {
    // 8 primaries (incl. C) + full arms: coverage needs 1 more C-coverer, floor needs 5 more
    // hitters — the coverer shares a floor body, so additions = 5, not 6.
    const roster = [
      ...['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'].map((p) => hitter(p)),
      pitcher('SP'), pitcher('SP'), pitcher('SP'), pitcher('SP'),
      pitcher('RP'), pitcher('RP'), pitcher('RP'), pitcher('CP'),
    ];
    const need = rosterNeedBreakdown(roster);
    expect(need.catcherCoverNeed).toBe(1);
    expect(need.hitterFloorNeed).toBe(5);
    expect(need.minimumAdditions).toBe(5);
  });
});

describe('depthAwareNeedNudge — COCKPIT W1d farm bridge (DRAFT_COCKPIT_DESIGN_2026-07-08.md §2.5)', () => {
  // 8-primary + full-staff roster so the SS candidate never trips ownNeedMultiplier's hard-deficit
  // path in the calling test file — these fixtures isolate the DEPTH signal alone.
  const fullStaff = [
    pitcher('SP'), pitcher('SP'), pitcher('SP'), pitcher('SP'),
    pitcher('RP'), pitcher('RP'), pitcher('RP'), pitcher('CP'),
  ];

  it('acceptance case (a) — Handley: a star SS whose own secondary is IF/OF, PLUS another SS-capable body, reads COVERED (<=1.0)', () => {
    const handleyRoster: RosterSlotPlayer[] = [
      hitter('C'), hitter('1B'), hitter('2B'), hitter('3B'),
      hitter('SS', 'IF/OF'), // Handley: star SS who also covers IF/OF
      hitter('LF'), hitter('CF'), hitter('RF'),
      hitter('CF', 'SS'), // another SS-capable body -- coverers = 2
      ...fullStaff,
    ];
    const nudge = depthAwareNeedNudge(handleyRoster, hitter('SS'));
    expect(nudge).toBeLessThanOrEqual(1.0);
    expect(nudge).toBe(DEPTH_NEED_NUDGE.covered);
  });

  it('acceptance case (b) — Ozzie: a pure SS with no secondary, and nobody else covering SS, reads THIN (>1.0)', () => {
    const ozzieRoster: RosterSlotPlayer[] = [
      hitter('C'), hitter('1B'), hitter('2B'), hitter('3B'),
      hitter('SS'), // Ozzie: pure SS, no secondary
      hitter('LF'), hitter('CF'), hitter('RF'),
      hitter('CF', 'RF'), // bench body that does NOT touch SS/IF
      ...fullStaff,
    ];
    const nudge = depthAwareNeedNudge(ozzieRoster, hitter('SS'));
    expect(nudge).toBeGreaterThan(1.0);
    expect(nudge).toBe(DEPTH_NEED_NUDGE.thin);
  });

  it('a group secondary (IF, not just exact SS) counts toward SS coverage — the Handley encoding', () => {
    const roster: RosterSlotPlayer[] = [
      hitter('SS'),
      hitter('2B', 'IF'), // group secondary covers SS too
    ];
    expect(depthAwareNeedNudge(roster, hitter('SS'))).toBe(DEPTH_NEED_NUDGE.covered);
  });

  it('the Utility TRAIT never feeds this coverage math for hitters — only secondaryPosition does', () => {
    // Per the design's explicit taxonomy warning: Utility governs out-of-position RATINGS quality
    // only, never coverage counting. toRosterSlotPlayer's hitter branch never reads `traits` at
    // all, so a 'Utility' trait with no secondaryPosition must NOT count as an SS coverer.
    const utilityNoSecondary = toRosterSlotPlayer({ primaryPosition: '2B', traits: ['Utility'] });
    const roster: RosterSlotPlayer[] = [hitter('SS'), utilityNoSecondary];
    expect(depthAwareNeedNudge(roster, hitter('SS'))).toBe(DEPTH_NEED_NUDGE.thin);
  });

  describe('pitcher classes read rosterNeedBreakdown, not depthReport (no field-position notion for arms)', () => {
    it('CP: below/at/above the closer floor map to thin/adequate/covered', () => {
      const noCloser = [pitcher('SP'), pitcher('SP'), pitcher('SP'), pitcher('SP'), pitcher('RP'), pitcher('RP')];
      const oneCloser = [...noCloser.slice(0, 5), pitcher('CP')];
      const twoClosers = [...oneCloser, pitcher('CP')];

      expect(depthAwareNeedNudge(noCloser, pitcher('CP'))).toBe(DEPTH_NEED_NUDGE.thin);
      expect(depthAwareNeedNudge(oneCloser, pitcher('CP'))).toBe(DEPTH_NEED_NUDGE.adequate);
      expect(depthAwareNeedNudge(twoClosers, pitcher('CP'))).toBe(DEPTH_NEED_NUDGE.covered);
    });

    it('RP: below/at/above the bullpen-class floor (4 relief arms) map to thin/adequate/covered', () => {
      const thinBullpen = [pitcher('SP'), pitcher('SP'), pitcher('SP'), pitcher('SP'), pitcher('RP'), pitcher('RP')];
      const adequateBullpen = [...thinBullpen, pitcher('RP'), pitcher('CP')];
      const coveredBullpen = [...adequateBullpen, pitcher('RP')];

      expect(depthAwareNeedNudge(thinBullpen, pitcher('RP'))).toBe(DEPTH_NEED_NUDGE.thin);
      expect(depthAwareNeedNudge(adequateBullpen, pitcher('RP'))).toBe(DEPTH_NEED_NUDGE.adequate);
      expect(depthAwareNeedNudge(coveredBullpen, pitcher('RP'))).toBe(DEPTH_NEED_NUDGE.covered);
    });

    it('SP: below/at/above the rotation floor (4 starters) map to thin/adequate/covered', () => {
      const thinRotation = [pitcher('SP'), pitcher('SP')];
      const adequateRotation = [...thinRotation, pitcher('SP'), pitcher('SP')];
      const coveredRotation = [...adequateRotation, pitcher('SP')];

      expect(depthAwareNeedNudge(thinRotation, pitcher('SP'))).toBe(DEPTH_NEED_NUDGE.thin);
      expect(depthAwareNeedNudge(adequateRotation, pitcher('SP'))).toBe(DEPTH_NEED_NUDGE.adequate);
      expect(depthAwareNeedNudge(coveredRotation, pitcher('SP'))).toBe(DEPTH_NEED_NUDGE.covered);
    });
  });

  it('an unresolvable hitter position (not one of the 8 field positions) falls back to the neutral adequate tier, never a fabricated read', () => {
    expect(depthAwareNeedNudge([], hitter('DH'))).toBe(DEPTH_NEED_NUDGE.adequate);
  });
});

describe('wouldStrandRoster — the bid-time forced-filler guard', () => {
  const base21 = (): { ids: string[]; map: Record<string, RosterSlotPlayer> } => {
    const map: Record<string, RosterSlotPlayer> = {};
    const ids: string[] = [];
    const add = (id: string, p: RosterSlotPlayer) => {
      ids.push(id);
      map[id] = p;
    };
    ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'].forEach((pos, i) => add(`s${i}`, hitter(pos)));
    ['1B', '2B', 'SS', 'LF', 'RF'].forEach((pos, i) => add(`b${i}`, hitter(pos)));
    add('p1', pitcher('SP'));
    add('p2', pitcher('SP'));
    add('p3', pitcher('SP'));
    add('p4', pitcher('SP'));
    add('p5', pitcher('RP'));
    add('p6', pitcher('RP'));
    add('p7', pitcher('RP'));
    add('p8', pitcher('CP'));
    return { ids, map };
  };

  it('strands on a candidate that leaves catcher coverage unreachable in the last slot', () => {
    const { ids, map } = base21();
    map.cand = hitter('1B');
    expect(ids).toHaveLength(21);
    expect(wouldStrandRoster(ids, 'cand', map)).toBe(true);
  });

  it('does not strand when the candidate ITSELF carries the missing coverage (secondary-C)', () => {
    const { ids, map } = base21();
    map.cand = hitter('1B', 'C');
    expect(wouldStrandRoster(ids, 'cand', map)).toBe(false);
  });

  it('does not strand on a Two Way (C) pitcher filling the last slot', () => {
    const { ids, map } = base21();
    map.cand = pitcher('RP', 'C');
    expect(wouldStrandRoster(ids, 'cand', map)).toBe(false);
  });

  it('strands on a ceiling breach (would-be 15th hitter)', () => {
    const { ids, map } = base21();
    // Convert to 14 hitters + 7 pitchers first: swap one arm for a hitter.
    map.p8 = hitter('RF', 'C');
    map.cand = hitter('LF');
    expect(wouldStrandRoster(ids, 'cand', map)).toBe(true);
  });

  it('stands down (permissive) when any position info is missing', () => {
    const { ids, map } = base21();
    delete map.b0;
    map.cand = hitter('1B');
    expect(wouldStrandRoster(ids, 'cand', map)).toBe(false);
    expect(teamRosterNeed(ids, map as RosterPositionMap)).toBeNull();
  });
});

describe('auctionStateMachine integration — bid-strands-roster', () => {
  function sessionWith(
    candidate: RosterSlotPlayer | null,
    opts: { stillIn?: string[]; t2Budget?: number } = {},
  ): AuctionSession {
    const rosterIds: string[] = [];
    const players: Record<string, { playerId: string; iv: number; ivPercentile: number; pos?: RosterSlotPlayer }> = {};
    const add = (id: string, pos: RosterSlotPlayer) => {
      rosterIds.push(id);
      players[id] = { playerId: id, iv: 50, ivPercentile: 50, pos };
    };
    ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'].forEach((pos, i) => add(`s${i}`, hitter(pos)));
    ['1B', '2B', 'SS', 'LF', 'RF'].forEach((pos, i) => add(`b${i}`, hitter(pos)));
    (['SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'CP'] as const).forEach((role, i) =>
      add(`p${i}`, pitcher(role)),
    );
    players.lot = { playerId: 'lot', iv: 60, ivPercentile: 60, ...(candidate ? { pos: candidate } : {}) };

    return {
      state: 'OPEN_BIDDING',
      config: { ...DEFAULT_AUCTION_SETUP_CONFIG },
      teams: [
        {
          teamId: 'T1',
          budgetRemaining: 10_000,
          rosterSlotsRemaining: 1,
          minSalary: 1,
          projectedTax: 0,
          roster: rosterIds.map((playerId) => ({ playerId, salary: 10 })),
        },
        {
          teamId: 'T2',
          budgetRemaining: opts.t2Budget ?? 10_000,
          rosterSlotsRemaining: 22,
          minSalary: 1,
          projectedTax: 0,
          roster: [],
        },
      ],
      nominationOrder: ['T1', 'T2'],
      nominationIndex: 0,
      nominationRound: 1,
      players,
      playerOrder: Object.keys(players),
      availablePlayerIds: ['lot'],
      currentLot: {
        playerId: 'lot',
        nominatorTeamId: 'T2',
        openingAsk: 1,
        highBid: null,
        highBidder: null,
        stillIn: opts.stillIn ?? ['T1', 'T2'],
        bidTurnTeamId: 'T1',
      },
      pendingClaim: null,
      results: [],
      saleCount: 0,
    };
  }

  it('rejects a bid that would strand the roster, names the reason, and leaves the session intact', () => {
    const session = sessionWith(hitter('1B'));
    const result = recordBid(session, 'T1', 5);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('bid-strands-roster');
  });

  it('accepts the same bid when the lot player carries the missing coverage', () => {
    const session = sessionWith(hitter('1B', 'C'));
    expect(recordBid(session, 'T1', 5).ok).toBe(true);
  });

  it('accepts a Two Way (C) arm as the completing player', () => {
    const session = sessionWith(pitcher('RP', 'C'));
    expect(recordBid(session, 'T1', 5).ok).toBe(true);
  });

  it('stands down for position-blind sessions (pre-C1 saves / farm) — scalar behavior preserved', () => {
    const session = sessionWith(null);
    expect(recordBid(session, 'T1', 5).ok).toBe(true);
  });

  it('R2-2: the forced no-bid filler honors the strand guard — the lot passes out instead of completing an illegal roster', () => {
    // Everyone passed (stillIn empty) and T2 cannot afford the ask → pre-fix, the forced filler
    // hands T1 the wrong-position player (illegal 22); post-fix, T1 is strand-filtered and the
    // existing no-taker fallback fires (permanent pass-out; no roster changes).
    const session = sessionWith(hitter('1B'), { stillIn: [], t2Budget: 0 });
    const result = resolveLot(session);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const t1 = result.session.teams.find((t) => t.teamId === 'T1')!;
      expect(t1.roster).toHaveLength(21);
      const lotResult = result.session.results.find((r) => r.playerId === 'lot');
      expect(lotResult?.winnerTeamId ?? null).toBeNull();
    }
  });

  it('R2-2 control: the forced filler still sells when the player carries the missing coverage', () => {
    const session = sessionWith(hitter('1B', 'C'), { stillIn: [], t2Budget: 0 });
    const result = resolveLot(session);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const t1 = result.session.teams.find((t) => t.teamId === 'T1')!;
      expect(t1.roster).toHaveLength(22);
      expect(t1.roster.some((a) => a.playerId === 'lot')).toBe(true);
    }
  });
});
