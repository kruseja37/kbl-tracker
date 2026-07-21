import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import {
  addPlayersToLeaguePool,
  isPlayerInExternalDraftSourceUniverse,
  isPlayerInLeaguePool,
  isPlayerInSourceUniverse,
  removePlayersFromLeaguePool,
  resolveExternalDraftSourceLeagueIds,
  resolveIncludeUnassignedSourcePlayers,
  resolveSourceLeagueIds,
} from '../leagueBuilderPoolBuilder';
import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
  getLeagueTemplate,
  getPlayer,
  savePlayer,
  saveLeagueTemplate,
  type Player,
} from '../leagueBuilderStorage';

const OWN_LEAGUE_ID = 'universe-own-league';
const OTHER_LEAGUE_ID = 'universe-other-league';

function makePlayer(id: string, assignmentLeagueIds: string[] = []): Player {
  return {
    id,
    firstName: id,
    lastName: 'Universe',
    gender: 'M',
    age: 25,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    power: 60,
    contact: 60,
    speed: 60,
    fielding: 60,
    arm: 60,
    velocity: 30,
    junk: 30,
    accuracy: 30,
    arsenal: ['4F'],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Crafty',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 10_000,
    leagueAssignments: assignmentLeagueIds.map((leagueId) => ({
      leagueId,
      teamId: '',
      rosterStatus: 'FREE_AGENT',
    })),
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: true,
  };
}

// ---------------------------------------------------------------------------------------------
// Pure-function coverage (DRAFT_POOL_UNIVERSE_SPEC_2026-07-08 §2/§7): no DB needed.
// ---------------------------------------------------------------------------------------------

describe('resolveSourceLeagueIds', () => {
  test('an absent saved set stays null so the caller can resolve every external source', () => {
    expect(resolveSourceLeagueIds({ sourceLeagueIds: undefined })).toBeNull();
  });

  test('an explicit empty array stays empty', () => {
    expect(resolveSourceLeagueIds({ sourceLeagueIds: [] })).toEqual([]);
  });

  test('explicit set (including a mix of own + other leagues) is returned as-is', () => {
    expect(resolveSourceLeagueIds({ sourceLeagueIds: [OTHER_LEAGUE_ID] }))
      .toEqual([OTHER_LEAGUE_ID]);
  });
});

describe('draft target and source separation', () => {
  test('removes the target id from explicit and untouched source sets', () => {
    expect(resolveExternalDraftSourceLeagueIds({
      configuredSourceLeagueIds: [OWN_LEAGUE_ID, OTHER_LEAGUE_ID],
      availableLeagueIds: [OWN_LEAGUE_ID, OTHER_LEAGUE_ID],
      targetLeagueId: OWN_LEAGUE_ID,
    })).toEqual([OTHER_LEAGUE_ID]);
    expect(resolveExternalDraftSourceLeagueIds({
      configuredSourceLeagueIds: null,
      availableLeagueIds: [OWN_LEAGUE_ID, OTHER_LEAGUE_ID],
      targetLeagueId: OWN_LEAGUE_ID,
    })).toEqual([OTHER_LEAGUE_ID]);
  });

  test('a target pool write never becomes source ownership on reload', () => {
    const targetOnly = makePlayer('target-only', [OWN_LEAGUE_ID]);
    expect(isPlayerInExternalDraftSourceUniverse({
      player: targetOnly,
      sourceLeagueIds: [],
      targetLeagueId: OWN_LEAGUE_ID,
      includeUnassignedSourcePlayers: false,
    })).toBe(false);

    const sourceAndTarget = makePlayer('source-and-target', [OTHER_LEAGUE_ID, OWN_LEAGUE_ID]);
    expect(isPlayerInExternalDraftSourceUniverse({
      player: sourceAndTarget,
      sourceLeagueIds: [OTHER_LEAGUE_ID],
      targetLeagueId: OWN_LEAGUE_ID,
      includeUnassignedSourcePlayers: false,
    })).toBe(true);
    expect(isPlayerInExternalDraftSourceUniverse({
      player: sourceAndTarget,
      sourceLeagueIds: [],
      targetLeagueId: OWN_LEAGUE_ID,
      includeUnassignedSourcePlayers: false,
    })).toBe(false);
  });
});

describe('unassigned-player source switch', () => {
  test('defaults on for old and untouched league records', () => {
    expect(resolveIncludeUnassignedSourcePlayers({ includeUnassignedSourcePlayers: undefined })).toBe(true);
  });

  test('can produce an exact source-only universe', () => {
    const players = [
      makePlayer('career-card', [OTHER_LEAGUE_ID]),
      makePlayer('unassigned-stock', []),
    ];
    expect(players.filter((player) => isPlayerInSourceUniverse(player, [OTHER_LEAGUE_ID], false))
      .map((player) => player.id)).toEqual(['career-card']);
    expect(players.filter((player) => isPlayerInSourceUniverse(player, [OTHER_LEAGUE_ID], true))
      .map((player) => player.id)).toEqual(['career-card', 'unassigned-stock']);
  });
});

describe('legacy raw resolver compatibility', () => {
  test('an absent field still returns null for older callers', () => {
    // Draft Setup now resolves this null state to every known external source. This assertion keeps
    // the saved-record compatibility contract separate from the target-aware page resolver.
    const players = [
      makePlayer('own-1', [OWN_LEAGUE_ID]),
      makePlayer('other-1', [OTHER_LEAGUE_ID]),
      makePlayer('third-1', ['a-third-league']),
      makePlayer('fa-1', []),
    ];
    const resolved = resolveSourceLeagueIds({ sourceLeagueIds: undefined });
    const universe = resolved === null ? players : players.filter((p) => isPlayerInSourceUniverse(p, resolved));
    // This is the legacy caller behavior only.
    expect(universe).toBe(players);
    expect(universe.map((p) => p.id)).toEqual(['own-1', 'other-1', 'third-1', 'fa-1']);
  });

  test('explicit array (first toggle materializes it) switches to filtered behavior', () => {
    const players = [
      makePlayer('own-1', [OWN_LEAGUE_ID]),
      makePlayer('other-1', [OTHER_LEAGUE_ID]),
      makePlayer('fa-1', []),
    ];
    const resolved = resolveSourceLeagueIds({ sourceLeagueIds: [OWN_LEAGUE_ID] });
    const universe = resolved === null ? players : players.filter((p) => isPlayerInSourceUniverse(p, resolved));
    expect(universe.map((p) => p.id)).toEqual(['own-1', 'fa-1']);
  });

  test('explicit [] = free-agents-only (never-claimed players bypass the filter)', () => {
    const players = [
      makePlayer('own-1', [OWN_LEAGUE_ID]),
      makePlayer('fa-1', []),
    ];
    const resolved = resolveSourceLeagueIds({ sourceLeagueIds: [] });
    const universe = resolved === null ? players : players.filter((p) => isPlayerInSourceUniverse(p, resolved));
    expect(universe.map((p) => p.id)).toEqual(['fa-1']);
  });
});

describe('isPlayerInSourceUniverse', () => {
  test('a player assigned only to the checked league is in the universe', () => {
    const player = makePlayer('p1', [OWN_LEAGUE_ID]);
    expect(isPlayerInSourceUniverse(player, [OWN_LEAGUE_ID])).toBe(true);
  });

  test('a player assigned only to an UNCHECKED league is excluded (the core narrowing behavior)', () => {
    const player = makePlayer('p2', [OTHER_LEAGUE_ID]);
    expect(isPlayerInSourceUniverse(player, [OWN_LEAGUE_ID])).toBe(false);
  });

  test('checking the other league brings its members into the union', () => {
    const player = makePlayer('p3', [OTHER_LEAGUE_ID]);
    expect(isPlayerInSourceUniverse(player, [OWN_LEAGUE_ID, OTHER_LEAGUE_ID])).toBe(true);
  });

  test('a never-claimed player (empty leagueAssignments) stays universally available, even with zero sources checked', () => {
    // Real production case, not a test-only edge case: every SMB4/MLB seed's free-agent players
    // are seeded with leagueAssignments: [] (convertPlayer, leagueBuilderStorage.ts). Excluding
    // them would make freshly seeded free agents permanently unreachable by ANY league.
    const freeAgent = makePlayer('p4', []);
    expect(isPlayerInSourceUniverse(freeAgent, [])).toBe(true);
    expect(isPlayerInSourceUniverse(freeAgent, [OWN_LEAGUE_ID])).toBe(true);
  });

  test('a real (non-empty) checked set still excludes players claimed by leagues outside it', () => {
    const otherLeagueOnly = makePlayer('p5', [OTHER_LEAGUE_ID]);
    const thirdLeaguePlayer = makePlayer('p6', ['a-third-league']);
    expect(isPlayerInSourceUniverse(otherLeagueOnly, [OTHER_LEAGUE_ID])).toBe(true);
    expect(isPlayerInSourceUniverse(thirdLeaguePlayer, [OTHER_LEAGUE_ID])).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// Persistence + migration-care coverage: real fake-indexeddb round trip.
// ---------------------------------------------------------------------------------------------

beforeEach(async () => {
  __resetLeagueBuilderDatabaseForTests();
  await clearAllLeagueBuilderData().catch(() => undefined);
});

afterEach(async () => {
  await clearAllLeagueBuilderData().catch(() => undefined);
  __resetLeagueBuilderDatabaseForTests();
});

describe('sourceLeagueIds persistence (DRAFT_POOL_UNIVERSE_SPEC_2026-07-08 §7/§8, ruling #3)', () => {
  test('a league saved without ever touching sourceLeagueIds round-trips as undefined (no silent write-back)', async () => {
    const saved = await saveLeagueTemplate({
      id: OWN_LEAGUE_ID,
      name: 'Own League',
      teamIds: [],
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'standard',
      draftFormat: 'auction',
    });
    expect(saved.sourceLeagueIds).toBeUndefined();

    const reloaded = await getLeagueTemplate(OWN_LEAGUE_ID);
    expect(reloaded?.sourceLeagueIds).toBeUndefined();
    // Back-compat resolution off the absent field = null = unfiltered (all leagues).
    expect(resolveSourceLeagueIds(reloaded!)).toBeNull();
  });

  test('an explicit sourceLeagueIds set (including an empty array) round-trips exactly on the league record', async () => {
    await saveLeagueTemplate({
      id: OWN_LEAGUE_ID,
      name: 'Own League',
      teamIds: [],
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'standard',
      draftFormat: 'auction',
      sourceLeagueIds: [OTHER_LEAGUE_ID],
    });

    const reloaded = await getLeagueTemplate(OWN_LEAGUE_ID);
    expect(reloaded?.sourceLeagueIds).toEqual([OTHER_LEAGUE_ID]);

    // Own league un-checked entirely (JK ruling #1) — persists as a real, distinct empty array.
    const unchecked = await saveLeagueTemplate({ ...reloaded!, sourceLeagueIds: [] });
    expect(unchecked.sourceLeagueIds).toEqual([]);
    const reloadedUnchecked = await getLeagueTemplate(OWN_LEAGUE_ID);
    expect(reloadedUnchecked?.sourceLeagueIds).toEqual([]);
    expect(resolveSourceLeagueIds(reloadedUnchecked!)).toEqual([]);
  });

  test('the explicit unassigned-player switch round-trips without changing legacy defaults', async () => {
    await saveLeagueTemplate({
      id: OWN_LEAGUE_ID,
      name: 'Own League',
      teamIds: [],
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'standard',
      includeUnassignedSourcePlayers: false,
    });
    const reloaded = await getLeagueTemplate(OWN_LEAGUE_ID);
    expect(reloaded?.includeUnassignedSourcePlayers).toBe(false);
    expect(resolveIncludeUnassignedSourcePlayers(reloaded!)).toBe(false);
  });
});

describe('§6 fine curation: curated-universe players use the same exclude path as native players', () => {
  test('a player pulled in only via a curated (non-own) league can be removed from THIS league like any native member', async () => {
    const curatedPlayer = makePlayer('curated-1', [OTHER_LEAGUE_ID]);
    await savePlayer(curatedPlayer);

    // Extraction/manual-add pulls the curated player into the active league's pool — this is
    // the generic addPlayersToLeaguePool path the shuttle's "Add" button already calls.
    await addPlayersToLeaguePool(['curated-1'], OWN_LEAGUE_ID);
    const afterAdd = await getPlayer('curated-1');
    expect(isPlayerInLeaguePool(afterAdd!, OWN_LEAGUE_ID)).toBe(true);
    expect(isPlayerInLeaguePool(afterAdd!, OTHER_LEAGUE_ID)).toBe(true);

    // The exclude toggle (shuttle "Remove" button, handleRemove) — generic, no new code path.
    await removePlayersFromLeaguePool(['curated-1'], OWN_LEAGUE_ID);
    const afterRemove = await getPlayer('curated-1');
    expect(isPlayerInLeaguePool(afterRemove!, OWN_LEAGUE_ID)).toBe(false);
    // Removing from THIS league does not strip the player's original curated-league membership.
    expect(isPlayerInLeaguePool(afterRemove!, OTHER_LEAGUE_ID)).toBe(true);
  });
});
