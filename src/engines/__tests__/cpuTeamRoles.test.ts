import { describe, expect, test } from 'vitest';

import {
  classifyCpuTeams,
  deriveShillTeamIds,
  type CpuTeamControlInfo,
} from '../cpuTeamRoles';
import type { CpuShillAuctionSession } from '../cpuShillBidding';

const BASE_CONFIG = {
  format: 'auction' as const,
  bidIncrement: 100,
  turnTimerSeconds: null,
  nominationOrderSeed: 'cpu-team-roles-test-seed',
  cpuShillCount: 0,
  excludeFromLeague: true,
};

function makeSession({
  nominationOrder = ['team-a', 'team-b', 'team-c', 'team-d'],
  cpuShillCount = 0,
  excludeFromLeague = true,
  cpuShills,
}: {
  nominationOrder?: readonly string[];
  cpuShillCount?: number;
  excludeFromLeague?: boolean;
  cpuShills?: Readonly<Record<string, unknown>>;
} = {}): CpuShillAuctionSession {
  return {
    nominationOrder,
    config: {
      ...BASE_CONFIG,
      cpuShillCount,
      excludeFromLeague,
    },
    cpuShills,
  } as CpuShillAuctionSession;
}

function inlineExpectedCpuTeamIds(
  session: CpuShillAuctionSession | null,
  leagueTeams: readonly CpuTeamControlInfo[],
): string[] {
  if (!session) return [];
  const ids = new Set<string>();
  const humanTeamIds = new Set(
    leagueTeams.filter((team) => team.controlledBy === 'human').map((team) => team.id),
  );

  for (const team of leagueTeams) {
    if (team.controlledBy === 'ai') ids.add(team.id);
  }

  for (const teamId of Object.keys(session.cpuShills ?? {})) {
    if (!humanTeamIds.has(teamId)) ids.add(teamId);
  }

  const count = Math.max(0, Math.min(session.config.cpuShillCount ?? 0, session.nominationOrder.length));
  if (count > 0) {
    for (const teamId of session.nominationOrder.slice(-count)) {
      if (!humanTeamIds.has(teamId)) ids.add(teamId);
    }
  }

  return session.nominationOrder.filter((teamId) => ids.has(teamId));
}

describe('cpuTeamRoles RB-10a build-dark classifier', () => {
  test('legacy fallback: allCpuTeamIds includes last-N teams only when they are not known human clubs', () => {
    const session = makeSession({ cpuShillCount: 2 });
    const classification = classifyCpuTeams(session, []);

    expect(classification.allCpuTeamIds).toEqual(['team-c', 'team-d']);
    expect(classification.allCpuTeamIds).toEqual(inlineExpectedCpuTeamIds(session, []));
  });

  test('default dissolve coverage: with no AI teams, shills plus controlled CPU equals every CPU bidder', () => {
    const session = makeSession({ cpuShillCount: 3, excludeFromLeague: true });
    const classification = classifyCpuTeams(session, []);

    expect([...classification.shillTeamIds, ...classification.controlledCpuTeamIds]).toEqual(
      classification.allCpuTeamIds,
    );
  });

  test('disjointness: an opt-in AI team in the last-N slice is controlled CPU, not a shill, and humans are excluded', () => {
    const session = makeSession({
      nominationOrder: ['human', 'last-human', 'ai-team'],
      cpuShillCount: 2,
      excludeFromLeague: true,
    });
    const classification = classifyCpuTeams(session, [
      { id: 'ai-team', controlledBy: 'ai' },
      { id: 'human', controlledBy: 'human' },
      { id: 'last-human', controlledBy: 'human' },
    ]);

    expect(classification.controlledCpuTeamIds).toEqual(['ai-team']);
    expect(classification.shillTeamIds).toEqual([]);
    expect(classification.shillTeamIds).not.toContain('ai-team');
    expect(classification.allCpuTeamIds).toEqual(['ai-team']);
    expect(classification.allCpuTeamIds).toEqual(inlineExpectedCpuTeamIds(session, [
      { id: 'ai-team', controlledBy: 'ai' },
      { id: 'human', controlledBy: 'human' },
      { id: 'last-human', controlledBy: 'human' },
    ]));
  });

  test('legacy MLB saved sessions never classify human clubs as shills, but synthetic shills still work', () => {
    const syntheticShillId = '__auction_shill__legacy__1';
    const session = makeSession({
      nominationOrder: ['human-a', 'ai-team', 'human-b', syntheticShillId],
      cpuShillCount: 3,
      excludeFromLeague: true,
      cpuShills: { [syntheticShillId]: {}, 'human-a': {} },
    });
    const classification = classifyCpuTeams(session, [
      { id: 'human-a', controlledBy: 'human' },
      { id: 'human-b', controlledBy: 'human' },
      { id: 'ai-team', controlledBy: 'ai' },
    ]);

    expect(classification.shillTeamIds).toEqual([syntheticShillId]);
    expect(classification.controlledCpuTeamIds).toEqual(['ai-team']);
    expect(classification.allCpuTeamIds).toEqual(['ai-team', syntheticShillId]);
    expect(classification.shillTeamIds).not.toContain('human-a');
    expect(classification.shillTeamIds).not.toContain('human-b');
    expect(classification.allCpuTeamIds).not.toContain('human-a');
    expect(classification.allCpuTeamIds).not.toContain('human-b');
  });

  test('dissolve switch: excludeFromLeague false empties shills without changing the auto-bid set', () => {
    const session = makeSession({
      nominationOrder: ['team-a', 'team-b', 'team-c', 'team-d'],
      cpuShillCount: 2,
      excludeFromLeague: false,
      cpuShills: { 'team-b': {} },
    });
    const classification = classifyCpuTeams(session, []);

    expect(classification.shillTeamIds).toEqual([]);
    expect(classification.allCpuTeamIds).toEqual(['team-b', 'team-c', 'team-d']);
    expect(classification.allCpuTeamIds).toEqual(inlineExpectedCpuTeamIds(session, []));
    expect([...classification.shillTeamIds, ...classification.controlledCpuTeamIds]).not.toEqual(
      classification.allCpuTeamIds,
    );
  });

  test('explicit cpuShills map keys become shills unless they are known human or AI-controlled teams', () => {
    const session = makeSession({
      nominationOrder: ['team-a', 'team-b', 'team-c', '__auction_shill__x__1'],
      cpuShillCount: 0,
      excludeFromLeague: true,
      cpuShills: { 'team-b': {}, 'team-c': {}, '__auction_shill__x__1': {} },
    });

    expect(deriveShillTeamIds(session, [
      { id: 'team-b', controlledBy: 'ai' },
      { id: 'team-c', controlledBy: 'human' },
    ])).toEqual(['__auction_shill__x__1']);
  });

  test('null session returns empty classifications', () => {
    expect(classifyCpuTeams(null, [{ id: 'ai-team', controlledBy: 'ai' }])).toEqual({
      shillTeamIds: [],
      controlledCpuTeamIds: [],
      allCpuTeamIds: [],
    });
  });
});
