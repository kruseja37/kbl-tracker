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

function inlineExistingDeriveCpuTeamIds(
  session: CpuShillAuctionSession | null,
  leagueTeams: readonly CpuTeamControlInfo[],
): string[] {
  if (!session) return [];
  const ids = new Set<string>();

  for (const team of leagueTeams) {
    if (team.controlledBy === 'ai') ids.add(team.id);
  }

  for (const teamId of Object.keys(session.cpuShills ?? {})) {
    ids.add(teamId);
  }

  const count = Math.max(0, Math.min(session.config.cpuShillCount ?? 0, session.nominationOrder.length));
  if (count > 0) {
    for (const teamId of session.nominationOrder.slice(-count)) {
      ids.add(teamId);
    }
  }

  return session.nominationOrder.filter((teamId) => ids.has(teamId));
}

describe('cpuTeamRoles RB-10a build-dark classifier', () => {
  test('parity: allCpuTeamIds mirrors the existing last-N deriveCpuTeamIds union', () => {
    const session = makeSession({ cpuShillCount: 2 });
    const classification = classifyCpuTeams(session, []);

    expect(classification.allCpuTeamIds).toEqual(['team-c', 'team-d']);
    expect(classification.allCpuTeamIds).toEqual(inlineExistingDeriveCpuTeamIds(session, []));
  });

  test('default dissolve coverage: with no AI teams, shills plus controlled CPU equals every CPU bidder', () => {
    const session = makeSession({ cpuShillCount: 3, excludeFromLeague: true });
    const classification = classifyCpuTeams(session, []);

    expect([...classification.shillTeamIds, ...classification.controlledCpuTeamIds]).toEqual(
      classification.allCpuTeamIds,
    );
  });

  test('disjointness: an opt-in AI team in the last-N slice is controlled CPU, not a shill', () => {
    const session = makeSession({
      nominationOrder: ['human', 'last-human', 'ai-team'],
      cpuShillCount: 2,
      excludeFromLeague: true,
    });
    const classification = classifyCpuTeams(session, [
      { id: 'ai-team', controlledBy: 'ai' },
      { id: 'human', controlledBy: 'human' },
    ]);

    expect(classification.controlledCpuTeamIds).toEqual(['ai-team']);
    expect(classification.shillTeamIds).toEqual(['last-human']);
    expect(classification.shillTeamIds).not.toContain('ai-team');
    expect(classification.allCpuTeamIds).toEqual(inlineExistingDeriveCpuTeamIds(session, [
      { id: 'ai-team', controlledBy: 'ai' },
      { id: 'human', controlledBy: 'human' },
    ]));
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
    expect(classification.allCpuTeamIds).toEqual(inlineExistingDeriveCpuTeamIds(session, []));
    expect([...classification.shillTeamIds, ...classification.controlledCpuTeamIds]).not.toEqual(
      classification.allCpuTeamIds,
    );
  });

  test('explicit cpuShills map keys become shills when they are not AI-controlled teams', () => {
    const session = makeSession({
      nominationOrder: ['team-a', 'team-b', 'team-c'],
      cpuShillCount: 0,
      excludeFromLeague: true,
      cpuShills: { 'team-b': {}, 'team-c': {} },
    });

    expect(deriveShillTeamIds(session, [{ id: 'team-c', controlledBy: 'human' }])).toEqual(['team-b', 'team-c']);
  });

  test('null session returns empty classifications', () => {
    expect(classifyCpuTeams(null, [{ id: 'ai-team', controlledBy: 'ai' }])).toEqual({
      shillTeamIds: [],
      controlledCpuTeamIds: [],
      allCpuTeamIds: [],
    });
  });
});
