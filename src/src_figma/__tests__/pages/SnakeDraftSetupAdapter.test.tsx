import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { HISTORICAL_ARCHETYPES } from '../../../data/historicalArchetypes';
import { LUXURY_CAP_TABLES } from '../../../data/tierParams';
import { proveSimultaneousSnakeSeating } from '../../../engines/snakeSeatingProof';
import type { RegisteredPool } from '../../../engines/leagueConstruction';
import {
  buildInitialSnakeSeatBoards,
  buildLockedSnakeSeatingPlayers,
  buildSnakeSetupProofInput,
  deriveSnakeVersionGroups,
  lockedSnakeVersionSelections,
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
  test('an absent order team uses exact neutral copy without exposing the internal id', () => {
    const missingTeamId = 'setup-internal-team-key-51';
    const adapter = {
      groups: [],
      versionSelections: {},
      setVersionSelections: vi.fn(),
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

  test('chooses exactly one historical version before lock', () => {
    const ruthA = makePlayer(1, { id: 'ruth-a', firstName: 'Babe', lastName: 'Ruth', sourceId: 'lahman:ruthba01' } as never);
    const ruthB = makePlayer(2, { id: 'ruth-b', firstName: 'Babe', lastName: 'Ruth', sourceId: 'lahman:ruthba01' } as never);
    const mays = makePlayer(3, { id: 'mays', firstName: 'Willie', lastName: 'Mays', sourceId: 'lahman:mayswi01' } as never);
    const groups = deriveSnakeVersionGroups([ruthA, ruthB, mays]);
    const ruthGroup = groups.find(({ cards }) => cards.length === 2)!;
    expect(selectedSnakePoolIds(groups, { [ruthGroup.groupId]: 'ruth-b' })).toEqual(['ruth-b', 'mays']);
    expect(lockedSnakeVersionSelections(groups, ['ruth-b', 'mays'])).toEqual({
      [ruthGroup.groupId]: 'ruth-b',
    });
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
    const boards = buildInitialSnakeSeatBoards({ teams: [team], players, pool: pool(players) });
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
    const boards = buildInitialSnakeSeatBoards({ teams: [makeTeam('team-a')], players, pool: pool(players) });
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
    const certificate = proveSimultaneousSnakeSeating(
      buildSnakeSetupProofInput({ teams: [makeTeam('team-a')], players, pool: widePool }),
    );
    expect(certificate.feasible, certificate.message).toBe(true);
    const allInCost = certificate.assignments[0].allInCost;
    const locked = { ...widePool, tierCap: allInCost - 0.0000005 };
    const boards = buildInitialSnakeSeatBoards({
      teams: [makeTeam('team-a')],
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
      'Choose no more than 3 companion seats.',
      `Add a GM name for ${teams[0].name}.`,
      'Give every companion seat a unique GM name.',
    ]);

    expect(validateSnakeCompanionSeats({
      teams,
      gmNames: { 'team-a': 'Alex', 'team-b': 'Blair', 'team-c': 'Casey' },
      seatModes: { 'team-a': 'companion', 'team-b': 'companion', 'team-c': 'companion', 'team-d': 'hotseat' },
    })).toEqual([]);
  });
});
