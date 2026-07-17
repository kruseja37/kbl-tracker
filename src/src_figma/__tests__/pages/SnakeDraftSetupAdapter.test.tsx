import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { HISTORICAL_ARCHETYPES } from '../../../data/historicalArchetypes';
import { LUXURY_CAP_TABLES } from '../../../data/tierParams';
import { proveSimultaneousSnakeSeating, type SnakeSeatingProof } from '../../../engines/snakeSeatingProof';
import type { RegisteredPool } from '../../../engines/leagueConstruction';
import {
  buildInitialSnakeSeatBoards,
  buildLockedSnakeSeatingPlayers,
  buildSnakeSetupProofInput,
  deriveSnakeVersionGroups,
  lockedSnakeVersionSelections,
  rebuildPracticeSnakeSeatBoards,
  selectedSnakePoolIds,
  validateSnakeCompanionSeats,
} from '../../app/components/snake/setup/SnakeDraftSetupAdapter.helpers';
import { SnakeDraftSetupPanels } from '../../app/components/snake/setup/SnakeDraftSetupAdapter';
import type { Player } from '../../hooks/useLeagueBuilderData';
import { snakePlayerVersionLabel } from '../../../utils/snakePlayerIdentity';
import { makeLegalRosterPlayerSet, makeLegalRosterPlayers, makePlayer, makeTeam } from './LeagueBuilderDraftSetup.testUtils';

function pool(players: Player[], iv = 1_000): RegisteredPool {
  return {
    leagueId: 'snake-adapter',
    tier: 'standard',
    balanceMode: 'taxed',
    players: players.map((player) => ({ id: player.id, iv, salary: player.salary })),
    tierCap: 1_000_000,
    luxuryCaps: LUXURY_CAP_TABLES.standard,
    pickValueChart: [],
    totalSlots: 22,
    poolSurplusWarning: false,
    locked: true,
  };
}

function rosterLocalTaxFixture(players: Player[]): Player[] {
  return players.map((player) => (
    player.primaryPosition === 'SP'
    || player.primaryPosition === 'SP/RP'
    || player.primaryPosition === 'RP'
    || player.primaryPosition === 'CP'
      ? { ...player, power: 20, contact: 20, speed: 20 }
      : player
  ));
}

describe('SnakeDraftSetupAdapter', () => {
  test('fails closed when production board construction has no seating certificate', () => {
    const players = rosterLocalTaxFixture(makeLegalRosterPlayers());
    expect(() => buildInitialSnakeSeatBoards({
      teams: [makeTeam('team-a')],
      players,
      pool: pool(players),
    })).toThrow(/without a valid seating certificate/i);
  });

  test('rebuilds Practice boards from the injected asynchronous proof receipt', async () => {
    const players = rosterLocalTaxFixture(makeLegalRosterPlayers());
    const locked = pool(players, 1_000);
    const team = makeTeam('team-a', { mlbArchetypeKey: undefined, capIdentity: undefined });
    const certificate = {
      feasible: true,
      assignments: [{
        teamId: team.id,
        playerIds: players.map((player) => player.id),
        salaryCost: players.length * 1_000,
        addedTax: 0,
        allInCost: players.length * 1_000,
      }],
      shortfall: null,
      message: 'EVERY CLUB CAN FINISH A LEGAL 22.',
    } satisfies SnakeSeatingProof;
    const runProof = vi.fn(async () => certificate);

    const boards = await rebuildPracticeSnakeSeatBoards({
      teams: [team],
      players,
      pool: locked,
      runProof,
    });

    expect(runProof).toHaveBeenCalledOnce();
    expect(runProof.mock.calls[0][0]).toEqual(buildSnakeSetupProofInput({ teams: [team], players, pool: locked }));
    expect(Object.values(boards[team.id].slots)).toHaveLength(22);
  });

  test('an absent order team uses exact neutral copy without exposing the internal id', () => {
    const missingTeamId = 'setup-internal-team-key-51';
    const adapter = {
      groups: [],
      selectedPoolIds: [],
      gmNames: {},
      setGmNames: vi.fn(),
      seatModes: {},
      setSeatModes: vi.fn(),
      seed: 'test',
      setSeed: vi.fn(),
      order: [missingTeamId],
      swapFirst: null,
      shuffleOrder: vi.fn(),
      tapOrder: vi.fn(),
    } as unknown as Parameters<typeof SnakeDraftSetupPanels>[0]['adapter'];
    render(<SnakeDraftSetupPanels adapter={adapter} teams={[]} locked={false} disabled={false} />);

    expect(screen.getByText('1. UNKNOWN TEAM')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(missingTeamId);
    expect(document.body.innerHTML).not.toContain(missingTeamId);
  });

  test('locks every historical version and stores no setup-time selection', () => {
    const ruthA = makePlayer(1, { id: 'ruth-a', firstName: 'Babe', lastName: 'Ruth', sourceId: 'lahman:ruthba01' } as never);
    const ruthB = makePlayer(2, { id: 'ruth-b', firstName: 'Babe', lastName: 'Ruth', sourceId: 'lahman:ruthba01' } as never);
    const mays = makePlayer(3, { id: 'mays', firstName: 'Willie', lastName: 'Mays', sourceId: 'lahman:mayswi01' } as never);
    const groups = deriveSnakeVersionGroups([ruthA, ruthB, mays]);
    expect(selectedSnakePoolIds(groups, {})).toEqual(['ruth-a', 'ruth-b', 'mays']);
    expect(lockedSnakeVersionSelections(groups, ['ruth-a', 'ruth-b', 'mays'])).toEqual({});
  });

  test('shows only the compact cards-and-people count, keeping version inventory and retirement explanation behind Help', () => {
    const cards = (['Career', 'Peak', 'Draft Pool'] as const).map((historicalProfileType, index) => (
      makePlayer(index + 1, {
        id: `aaron-${index}`,
        firstName: 'Hank',
        lastName: 'Aaron',
        versionGroupId: 'historical:aaron',
        historicalProfileType,
      })
    ));
    const adapter = {
      groups: deriveSnakeVersionGroups(cards),
      selectedPoolIds: cards.map((card) => card.id),
      gmNames: {}, setGmNames: vi.fn(), seatModes: {}, setSeatModes: vi.fn(),
      seed: 'test', setSeed: vi.fn(), order: [], swapFirst: null,
      shuffleOrder: vi.fn(), tapOrder: vi.fn(),
    } as unknown as Parameters<typeof SnakeDraftSetupPanels>[0]['adapter'];
    const view = render(<SnakeDraftSetupPanels adapter={adapter} teams={[]} locked={false} disabled={false} />);

    expect(screen.getByTestId('snake-version-count')).toHaveTextContent('3 CARDS · 1 PEOPLE');
    expect(screen.queryByText('HANK AARON')).not.toBeInTheDocument();
    expect(screen.queryByText('CAREER')).not.toBeInTheDocument();
    expect(screen.queryByText('PEAK')).not.toBeInTheDocument();
    expect(screen.queryByText('DRAFT POOL')).not.toBeInTheDocument();
    expect(screen.queryByText(/retires automatically/i)).not.toBeInTheDocument();
    view.rerender(<SnakeDraftSetupPanels adapter={adapter} teams={[]} locked={false} disabled={false} showHelp />);
    expect(screen.getByText(/retires automatically/i)).toBeInTheDocument();
    expect(screen.queryByText('HANK AARON')).not.toBeInTheDocument();
  });

  test('groups imported Career, Peak, and Draft cards by stable historical identity', () => {
    const cards = (['Career', 'Peak', 'Draft Pool'] as const).map((historicalProfileType, index) => (
      makePlayer(index + 1, {
        id: `hl:aaroh101:${historicalProfileType.toLowerCase().replace(' pool', '')}`,
        firstName: 'Hank',
        lastName: 'Aaron',
        sourceId: 'historical:aaroh101',
        historicalSourceId: 'historical:aaroh101',
        versionGroupId: 'historical:aaroh101',
        historicalProfileType,
      })
    ));
    const groups = deriveSnakeVersionGroups(cards);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ groupId: 'historical:aaroh101' });
    expect(groups[0].cards.map((card) => card.historicalProfileType)).toEqual([
      'Career',
      'Peak',
      'Draft Pool',
    ]);
    expect(cards.map((card) => snakePlayerVersionLabel(card, cards))).toEqual([
      'Career',
      'Peak',
      'Draft Pool',
    ]);
  });

  test('uses the locked RegisteredPool IV even when the live player salary disagrees', () => {
    const players = makeLegalRosterPlayers(999_999);
    const locked = pool(players, 12_345);
    expect(buildLockedSnakeSeatingPlayers({ players, pool: locked }).every((player) => player.price === 12_345)).toBe(true);
  });

  test('carries Two Way identity from the locked pool into Snake seating economics', () => {
    const players = makeLegalRosterPlayers(10_000);
    const target = players.find((player) => player.primaryPosition === 'SP')!;
    const withTwoWay = players.map((player) => player.id === target.id
      ? { ...player, trait1: 'Two Way (C)' }
      : player);
    const locked = pool(withTwoWay, 12_345);

    expect(buildLockedSnakeSeatingPlayers({ players: withTwoWay, pool: locked })
      .find((player) => player.playerId === target.id)?.construction.twoWayVariant).toBe('C');
  });

  test('materializes a certified board through Two Way catcher coverage and version identity', () => {
    const base = makeLegalRosterPlayers(10_000);
    const backup = base.find((player) => player.id === 'legal-backup-c')!;
    const starter = base.find((player) => player.primaryPosition === 'SP')!;
    const players = rosterLocalTaxFixture(base.map((player) => {
      if (player.id === backup.id) return { ...player, secondaryPosition: undefined };
      if (player.id === starter.id) {
        return {
          ...player,
          trait1: 'Two Way (C)',
          sourceId: 'historical:two-way-catcher',
          versionGroupId: 'historical:two-way-catcher',
        };
      }
      return { ...player, versionGroupId: `person:${player.id}` };
    }));
    const locked = pool(players, 1_000);
    const team = makeTeam('team-a', { mlbArchetypeKey: undefined, capIdentity: undefined });
    const certificate = {
      feasible: true,
      assignments: [{
        teamId: team.id,
        playerIds: players.map((player) => player.id),
        salaryCost: players.length * 1_000,
        addedTax: 0,
        allInCost: players.length * 1_000,
      }],
      shortfall: null,
      message: 'EVERY CLUB CAN FINISH A LEGAL 22.',
    } satisfies SnakeSeatingProof;

    const boards = buildInitialSnakeSeatBoards({ teams: [team], players, pool: locked, certificate });
    const plannedIds = Object.values(boards[team.id].slots);
    expect(plannedIds).toHaveLength(22);
    expect(new Set(plannedIds.map((id) => players.find((player) => player.id === id)?.versionGroupId ?? id)).size).toBe(22);
    expect(plannedIds).toContain(starter.id);
  });

  test('materializes a legal 14-hitter, 8-pitcher certificate whose catcher depth comes from a Two Way starter', () => {
    const base = makeLegalRosterPlayers(10_000);
    const starter = base.find((player) => player.primaryPosition === 'SP')!;
    const players = rosterLocalTaxFixture([
      ...base
        .filter((player) => player.id !== 'legal-swing')
        .map((player) => {
          if (player.id === 'legal-backup-c') return { ...player, secondaryPosition: undefined };
          if (player.id === starter.id) return { ...player, trait1: 'Two Way (C)' };
          return player;
        }),
      makePlayer(999, { id: 'fifth-bench-hitter', primaryPosition: 'CF', secondaryPosition: 'RF' }),
    ]);
    const locked = pool(players, 1_000);
    const team = makeTeam('team-a', { mlbArchetypeKey: undefined, capIdentity: undefined });
    const certificate = {
      feasible: true,
      assignments: [{
        teamId: team.id,
        playerIds: players.map((player) => player.id),
        salaryCost: players.length * 1_000,
        addedTax: 0,
        allInCost: players.length * 1_000,
      }],
      shortfall: null,
      message: 'EVERY CLUB CAN FINISH A LEGAL 22.',
    } satisfies SnakeSeatingProof;

    const boards = buildInitialSnakeSeatBoards({ teams: [team], players, pool: locked, certificate });
    expect(Object.values(boards[team.id].slots)).toHaveLength(22);
    expect(new Set(Object.values(boards[team.id].slots))).toHaveLength(22);
  });

  test('materializes a legal certified roster with surplus closers instead of demanding rigid relief rows', () => {
    const players = rosterLocalTaxFixture(makeLegalRosterPlayers(10_000).map((player) => (
      player.id === 'legal-rp-2' || player.id === 'legal-swing'
        ? { ...player, primaryPosition: 'CP' as const }
        : player
    )));
    const locked = pool(players, 1_000);
    const team = makeTeam('team-a', { mlbArchetypeKey: undefined, capIdentity: undefined });
    const certificate = {
      feasible: true,
      assignments: [{
        teamId: team.id,
        playerIds: players.map((player) => player.id),
        salaryCost: players.length * 1_000,
        addedTax: 0,
        allInCost: players.length * 1_000,
      }],
      shortfall: null,
      message: 'EVERY CLUB CAN FINISH A LEGAL 22.',
    } satisfies SnakeSeatingProof;

    const boards = buildInitialSnakeSeatBoards({ teams: [team], players, pool: locked, certificate });
    const plannedIds = Object.values(boards[team.id].slots);
    expect(plannedIds).toHaveLength(22);
    expect(new Set(plannedIds)).toHaveLength(22);
    expect(new Set(plannedIds)).toEqual(new Set(players.map((player) => player.id)));
  });

  test('materializes a legal certified roster whose ninth pitcher is a surplus pure starter', () => {
    const players = rosterLocalTaxFixture(makeLegalRosterPlayers(10_000).map((player) => (
      player.id === 'legal-swing' ? { ...player, primaryPosition: 'SP' as const } : player
    )));
    const locked = pool(players, 1_000);
    const team = makeTeam('team-a', { mlbArchetypeKey: undefined, capIdentity: undefined });
    const certificate = {
      feasible: true,
      assignments: [{
        teamId: team.id,
        playerIds: players.map((player) => player.id),
        salaryCost: players.length * 1_000,
        addedTax: 0,
        allInCost: players.length * 1_000,
      }],
      shortfall: null,
      message: 'EVERY CLUB CAN FINISH A LEGAL 22.',
    } satisfies SnakeSeatingProof;

    const boards = buildInitialSnakeSeatBoards({ teams: [team], players, pool: locked, certificate });
    const plannedIds = Object.values(boards[team.id].slots);
    expect(plannedIds).toHaveLength(22);
    expect(new Set(plannedIds)).toHaveLength(22);
    expect(new Set(plannedIds)).toEqual(new Set(players.map((player) => player.id)));
  });

  test('never replaces an unaffordable certified player with an outside pool candidate', () => {
    const certifiedPlayers = rosterLocalTaxFixture(makeLegalRosterPlayers(10_000));
    const outside = makePlayer(999, {
      id: '000-outside-cf',
      primaryPosition: 'CF',
      secondaryPosition: 'RF',
      salary: 1,
    });
    const players = [...certifiedPlayers, outside];
    const locked = pool(players, 1_000);
    const team = makeTeam('team-a', { mlbArchetypeKey: undefined, capIdentity: undefined });
    const certificate = {
      feasible: true,
      assignments: [{
        teamId: team.id,
        playerIds: certifiedPlayers.map((player) => player.id),
        salaryCost: locked.tierCap + 1,
        addedTax: 0,
        allInCost: locked.tierCap + 1,
      }],
      shortfall: null,
      message: 'EVERY CLUB CAN FINISH A LEGAL 22.',
    } satisfies SnakeSeatingProof;

    expect(() => buildInitialSnakeSeatBoards({ teams: [team], players, pool: locked, certificate }))
      .toThrow(/not affordable under the certified cap identity/i);
  });

  test('passes each chosen archetype cap identity into the simultaneous proof', () => {
    const players = [
      ...makeLegalRosterPlayerSet('first', 10_000),
      ...makeLegalRosterPlayerSet('second', 10_000),
      ...makeLegalRosterPlayerSet('third', 10_000),
      makePlayer(201, { id: 'extra-c-1', primaryPosition: 'C' }),
      makePlayer(202, { id: 'extra-c-2', primaryPosition: 'C' }),
      makePlayer(203, { id: 'extra-c-3', primaryPosition: 'C' }),
    ].map((player) => ({
      ...player,
      power: 10,
      contact: 10,
      speed: 96,
      fielding: 10,
      arm: 10,
      velocity: 50,
      junk: 50,
      accuracy: 50,
    }));
    const locked = pool(players, 1_000);
    const balanced = proveSimultaneousSnakeSeating({
      ...buildSnakeSetupProofInput({ teams: [makeTeam('team-a', { mlbArchetypeKey: undefined, capIdentity: undefined })], players, pool: locked }),
      clubs: [{ teamId: 'team-a', roster: [], budgetRemaining: 100_000_000 }],
      realTeamCount: 20,
    });
    expect(balanced.feasible, balanced.message).toBe(true);

    const heavier = {
      archetype: HISTORICAL_ARCHETYPES.find((archetype) => archetype.id === 'murderers-row')!,
      proof: proveSimultaneousSnakeSeating({
        ...buildSnakeSetupProofInput({
          teams: [makeTeam('team-a', { mlbArchetypeKey: 'murderers-row' })],
          players,
          pool: locked,
        }),
        clubs: [{
          teamId: 'team-a',
          roster: [],
          budgetRemaining: 100_000_000,
          capIdentity: buildSnakeSetupProofInput({
            teams: [makeTeam('team-a', { mlbArchetypeKey: 'murderers-row' })],
            players,
            pool: locked,
          }).clubs[0].capIdentity,
        }],
        realTeamCount: 20,
      }),
    };
    expect(heavier.proof.assignments[0].allInCost).toBeGreaterThan(balanced.assignments[0].allInCost);

    const balancedCost = balanced.assignments[0].allInCost;
    const heavyCost = heavier.proof.assignments[0].allInCost;
    const gatedPool = { ...locked, tierCap: (balancedCost + heavyCost) / 2 };
    const balancedAtGate = proveSimultaneousSnakeSeating({
      ...buildSnakeSetupProofInput({ teams: [makeTeam('team-a', { mlbArchetypeKey: undefined, capIdentity: undefined })], players, pool: gatedPool }),
      clubs: [{ teamId: 'team-a', roster: [], budgetRemaining: gatedPool.tierCap }],
      realTeamCount: 20,
    });
    const heavyAtGate = proveSimultaneousSnakeSeating({
      ...buildSnakeSetupProofInput({
        teams: [makeTeam('team-a', { mlbArchetypeKey: heavier.archetype.id })],
        players,
        pool: gatedPool,
      }),
      realTeamCount: 20,
    });
    expect(balancedAtGate.feasible).toBe(true);
    expect(heavyAtGate.feasible).toBe(false);
  });

  test('snapshots setup rankings into each initial seat board', () => {
    const players = rosterLocalTaxFixture([
      ...makeLegalRosterPlayerSet('first', 10_000),
      ...makeLegalRosterPlayerSet('second', 10_000),
      makePlayer(301, { id: 'floor-c', primaryPosition: 'C' }),
      makePlayer(302, { id: 'floor-lf', primaryPosition: 'LF' }),
      makePlayer(303, { id: 'floor-cf', primaryPosition: 'CF' }),
      makePlayer(304, { id: 'floor-rf', primaryPosition: 'RF' }),
      makePlayer(305, { id: 'floor-cp', primaryPosition: 'CP' }),
    ]);
    const handRanked = players.at(-1)!;
    const team = makeTeam('team-a', { boardRankOverrides: { global: [handRanked.id] } });
    const boards = buildInitialSnakeSeatBoards({
      teams: [team],
      players,
      pool: pool(players),
      allowSynchronousProof: true,
    });
    expect(boards['team-a'].rankings.global?.[0]).toBe(handRanked.id);
    expect(boards['team-a'].rankings.frozenPlayerIds).toContain(handRanked.id);
  });

  test('starts the default overall ranking with the same 22 players as the roster plan', () => {
    const players = rosterLocalTaxFixture([
      ...makeLegalRosterPlayerSet('first', 10_000),
      ...makeLegalRosterPlayerSet('second', 10_000),
      makePlayer(301, { id: 'floor-c', primaryPosition: 'C' }),
      makePlayer(302, { id: 'floor-lf', primaryPosition: 'LF' }),
      makePlayer(303, { id: 'floor-cf', primaryPosition: 'CF' }),
      makePlayer(304, { id: 'floor-rf', primaryPosition: 'RF' }),
      makePlayer(305, { id: 'floor-cp', primaryPosition: 'CP' }),
    ]);
    const boards = buildInitialSnakeSeatBoards({
      teams: [makeTeam('team-a')],
      players,
      pool: pool(players),
      allowSynchronousProof: true,
    });
    const board = boards['team-a'];

    expect(new Set(board.rankings.global.slice(0, 22))).toEqual(new Set(Object.values(board.slots)));
  });

  test('seeds a certificate accepted within the canonical sub-cent money tolerance', () => {
    const players = rosterLocalTaxFixture([
      ...makeLegalRosterPlayerSet('epsilon-first', 1_000),
      ...makeLegalRosterPlayerSet('epsilon-second', 1_000),
      makePlayer(401, { id: 'epsilon-floor-c', primaryPosition: 'C' }),
      makePlayer(402, { id: 'epsilon-floor-lf', primaryPosition: 'LF' }),
      makePlayer(403, { id: 'epsilon-floor-cf', primaryPosition: 'CF' }),
      makePlayer(404, { id: 'epsilon-floor-rf', primaryPosition: 'RF' }),
      makePlayer(405, { id: 'epsilon-floor-cp', primaryPosition: 'CP' }),
    ]);
    const widePool = pool(players, 1_000);
    const moneyOnlyTeam = makeTeam('team-a', { mlbArchetypeKey: undefined });
    const certificate = proveSimultaneousSnakeSeating(
      buildSnakeSetupProofInput({ teams: [moneyOnlyTeam], players, pool: widePool }),
    );
    expect(certificate.feasible, certificate.message).toBe(true);
    const allInCost = certificate.assignments[0].allInCost;
    const locked = { ...widePool, tierCap: allInCost - 0.0000005 };
    const boards = buildInitialSnakeSeatBoards({
      teams: [moneyOnlyTeam],
      players,
      pool: locked,
      certificate,
    });

    expect(Object.values(boards['team-a'].slots)).toHaveLength(22);
  });

  test('blocks unclaimable companion setup before the room can be created', () => {
    const teams = [makeTeam('team-a'), makeTeam('team-b'), makeTeam('team-c'), makeTeam('team-d')];
    expect(validateSnakeCompanionSeats({
      teams,
      gmNames: { 'team-a': '', 'team-b': 'Alex', 'team-c': ' alex ', 'team-d': 'Dana' },
      seatModes: { 'team-a': 'companion', 'team-b': 'companion', 'team-c': 'companion', 'team-d': 'companion' },
    })).toEqual([
      `Add a GM name for ${teams[0].name}.`,
    ]);

    expect(validateSnakeCompanionSeats({
      teams,
      gmNames: { 'team-a': 'Alex', 'team-b': 'Blair', 'team-c': 'Casey' },
      seatModes: { 'team-a': 'companion', 'team-b': 'companion', 'team-c': 'companion', 'team-d': 'hotseat' },
    })).toEqual([]);

    const packageTeams = Array.from({ length: 8 }, (_, index) => makeTeam(`package-team-${index + 1}`));
    const seatModes = Object.fromEntries(packageTeams.map((team, index) => [
      team.id,
      index === 0 || index === 7 ? 'hotseat' : 'companion',
    ])) as Record<string, 'hotseat' | 'companion'>;
    const gmNames = Object.fromEntries(packageTeams.map((team, index) => [
      team.id,
      index === 0 || index === 7 ? 'Commissioner' : ['Alex', 'Alex', 'Blair', 'Blair', 'Casey', 'Casey'][index - 1],
    ]));
    expect(validateSnakeCompanionSeats({ teams: packageTeams, gmNames, seatModes })).toEqual([]);

    expect(validateSnakeCompanionSeats({
      teams: packageTeams,
      gmNames: { ...gmNames, [packageTeams[7].id]: 'Dana' },
      seatModes: { ...seatModes, [packageTeams[7].id]: 'companion' },
    })).toEqual(['Choose no more than 3 companion GM packages.']);
  });
});
