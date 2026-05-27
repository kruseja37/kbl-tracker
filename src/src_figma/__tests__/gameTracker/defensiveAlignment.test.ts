import { describe, expect, test } from 'vitest';

import type { Player, Pitcher } from '../../app/components/TeamRoster';
import { buildDefensiveAlignmentByPosition } from '../../app/utils/defensiveAlignment';
import { extractFieldingEvents } from '../../app/utils/fieldingEventExtractor';
import type { PlayData } from '../../app/utils/gameTrackerFieldTypes';
import type { TeamLineupSnapshot } from '../../hooks/useGameState';

const getRosterEntityId = (entity: { playerId?: string; name: string }) =>
  entity.playerId ?? entity.name;

const player = (
  playerId: string,
  name: string,
  position: string | undefined,
  battingOrder?: number,
  isOutOfGame = false,
): Player => ({
  playerId,
  name,
  position,
  battingOrder,
  isOutOfGame,
  battingHand: 'R',
  stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
});

const pitcher = (playerId: string, name: string): Pitcher => ({
  playerId,
  name,
  throwingHand: 'R',
  isActive: true,
  isStarter: false,
  stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 },
});

const snapshot = (
  lineup: TeamLineupSnapshot['lineup'],
  overrides: Partial<TeamLineupSnapshot> = {},
): TeamLineupSnapshot => ({
  lineup,
  bench: [],
  usedPlayers: [],
  currentPitcher: {
    playerId: 'home-sp',
    playerName: 'Home Starter',
    position: 'P',
    battingOrder: 9,
    enteredInning: 1,
    isStarter: true,
  },
  ...overrides,
});

describe('buildDefensiveAlignmentByPosition', () => {
  test('uses the active lineup snapshot instead of stale displayed roster positions', () => {
    const alignment = buildDefensiveAlignmentByPosition({
      fieldingTeam: 'home',
      fieldingTeamPlayers: [
        player('home-bench-2b', 'Bench Second', '2B', 5),
        player('home-starter-2b', 'Starter Second', '2B', undefined, true),
      ],
      lineupSnapshot: snapshot(
        [
          {
            playerId: 'home-bench-2b',
            playerName: 'Bench Second',
            position: '2B',
            battingOrder: 5,
            enteredInning: 7,
            enteredFor: 'Starter Second',
            isStarter: false,
          },
        ],
        { usedPlayers: ['home-starter-2b'] },
      ),
      activePitcher: pitcher('raw-home-sp', 'Raw Starter'),
      getRosterEntityId,
    });

    expect(alignment['2B']).toEqual({
      playerId: 'home-bench-2b',
      playerName: 'Bench Second',
    });
    expect(Object.values(alignment)).not.toContainEqual({
      playerId: 'home-starter-2b',
      playerName: 'Starter Second',
    });
    expect(alignment.P).toEqual({
      playerId: 'raw-home-sp',
      playerName: 'Raw Starter',
    });
  });

  test('preserves fallback alignment while filtering bench and out-of-game players', () => {
    const alignment = buildDefensiveAlignmentByPosition({
      fieldingTeam: 'home',
      fieldingTeamPlayers: [
        player('home-active-2b', 'Active Second', '2B', 4),
        player('home-bench-2b', 'Bench Second', '2B'),
        player('home-used-2b', 'Used Second', '2B', undefined, true),
      ],
      lineupSnapshot: snapshot([], {
        currentPitcher: {
          playerId: 'home-sp',
          playerName: 'Home Starter',
          position: 'P',
          battingOrder: 9,
          enteredInning: 1,
          isStarter: true,
        },
      }),
      activePitcher: pitcher('home-rp', 'Home Reliever'),
      getRosterEntityId,
    });

    expect(alignment['2B']).toEqual({
      playerId: 'home-active-2b',
      playerName: 'Active Second',
    });
    expect(alignment.P).toEqual({
      playerId: 'home-rp',
      playerName: 'Home Reliever',
    });
  });

  test('layers sparse snapshot defenders over full active roster fallback and current pitcher', () => {
    const alignment = buildDefensiveAlignmentByPosition({
      fieldingTeam: 'home',
      fieldingTeamPlayers: [
        player('fallback-p', 'Fallback Pitcher', 'P', 9),
        player('fallback-c', 'Fallback Catcher', 'C', 8),
        player('fallback-1b', 'Fallback First', '1B', 3),
        player('fallback-2b', 'Fallback Second', '2B', 4),
        player('fallback-3b', 'Fallback Third', '3B', 5),
        player('fallback-ss', 'Fallback Short', 'SS', 6),
        player('fallback-lf', 'Fallback Left', 'LF', 7),
        player('fallback-cf', 'Fallback Center', 'CF', 1),
        player('fallback-rf', 'Fallback Right', 'RF', 2),
        player('bench-ss', 'Bench Short', 'SS'),
        player('used-3b', 'Used Third', '3B', undefined, true),
      ],
      lineupSnapshot: snapshot([
        {
          playerId: 'snapshot-2b',
          playerName: 'Snapshot Second',
          position: '2B',
          battingOrder: 4,
          enteredInning: 7,
          isStarter: false,
        },
      ]),
      activePitcher: pitcher('raw-p', 'Raw Pitcher'),
      currentPitcherId: 'state-p',
      currentPitcherName: 'State Pitcher',
      getRosterEntityId,
    });

    expect(alignment).toMatchObject({
      C: { playerId: 'fallback-c', playerName: 'Fallback Catcher' },
      '1B': { playerId: 'fallback-1b', playerName: 'Fallback First' },
      '2B': { playerId: 'snapshot-2b', playerName: 'Snapshot Second' },
      '3B': { playerId: 'fallback-3b', playerName: 'Fallback Third' },
      SS: { playerId: 'fallback-ss', playerName: 'Fallback Short' },
      LF: { playerId: 'fallback-lf', playerName: 'Fallback Left' },
      CF: { playerId: 'fallback-cf', playerName: 'Fallback Center' },
      RF: { playerId: 'fallback-rf', playerName: 'Fallback Right' },
      P: { playerId: 'state-p', playerName: 'State Pitcher' },
    });
    expect(Object.values(alignment)).not.toContainEqual({
      playerId: 'bench-ss',
      playerName: 'Bench Short',
    });
    expect(Object.values(alignment)).not.toContainEqual({
      playerId: 'used-3b',
      playerName: 'Used Third',
    });
    expect(alignment.P).not.toEqual({ playerId: 'raw-p', playerName: 'Raw Pitcher' });
    expect(alignment.P).not.toEqual({ playerId: 'home-sp', playerName: 'Home Starter' });
  });

  test('uses explicit current pitcher over stale active pitcher', () => {
    const alignment = buildDefensiveAlignmentByPosition({
      fieldingTeam: 'home',
      fieldingTeamPlayers: [
        player('fallback-p', 'Fallback Pitcher', 'P', 9),
      ],
      lineupSnapshot: snapshot([], { currentPitcher: null }),
      activePitcher: pitcher('stale-active-p', 'Stale Active Pitcher'),
      currentPitcherId: 'state-p',
      currentPitcherName: 'State Pitcher',
      getRosterEntityId,
    });

    expect(alignment.P).toEqual({
      playerId: 'state-p',
      playerName: 'State Pitcher',
    });
  });

  test('uses explicit current pitcher over stale snapshot current pitcher', () => {
    const alignment = buildDefensiveAlignmentByPosition({
      fieldingTeam: 'home',
      fieldingTeamPlayers: [
        player('fallback-p', 'Fallback Pitcher', 'P', 9),
      ],
      lineupSnapshot: snapshot([], {
        currentPitcher: {
          playerId: 'stale-snapshot-p',
          playerName: 'Stale Snapshot Pitcher',
          position: 'P',
          battingOrder: 9,
          enteredInning: 1,
          isStarter: true,
        },
      }),
      currentPitcherId: 'state-p',
      currentPitcherName: 'State Pitcher',
      getRosterEntityId,
    });

    expect(alignment.P).toEqual({
      playerId: 'state-p',
      playerName: 'State Pitcher',
    });
  });

  test('keeps earlier fielding credit with the original defender after a later same-position substitution', () => {
    const playData: PlayData = {
      type: 'out',
      outType: 'GO',
      fieldingSequence: [4],
    };

    const starterAlignment = buildDefensiveAlignmentByPosition({
      fieldingTeam: 'home',
      fieldingTeamPlayers: [],
      lineupSnapshot: snapshot([
        {
          playerId: 'home-starter-2b',
          playerName: 'Starter Second',
          position: '2B',
          battingOrder: 5,
          enteredInning: 1,
          isStarter: true,
        },
      ]),
      getRosterEntityId,
    });

    const starterEvents = extractFieldingEvents(playData, {
      gameId: 'game-fielding-credit',
      defensiveTeamId: 'home-team',
      atBatEventId: 'game-fielding-credit_1',
      atBatEventIndex: 1,
      defendersByPosition: starterAlignment,
    });

    const replacementAlignment = buildDefensiveAlignmentByPosition({
      fieldingTeam: 'home',
      fieldingTeamPlayers: [],
      lineupSnapshot: snapshot(
        [
          {
            playerId: 'home-bench-2b',
            playerName: 'Bench Second',
            position: '2B',
            battingOrder: 5,
            enteredInning: 7,
            enteredFor: 'Starter Second',
            isStarter: false,
          },
        ],
        { usedPlayers: ['home-starter-2b'] },
      ),
      getRosterEntityId,
    });

    const replacementEvents = extractFieldingEvents(playData, {
      gameId: 'game-fielding-credit',
      defensiveTeamId: 'home-team',
      atBatEventId: 'game-fielding-credit_2',
      atBatEventIndex: 2,
      defendersByPosition: replacementAlignment,
    });

    expect(starterEvents[0]).toMatchObject({
      playerId: 'home-starter-2b',
      playerName: 'Starter Second',
      position: '2B',
    });
    expect(replacementEvents[0]).toMatchObject({
      playerId: 'home-bench-2b',
      playerName: 'Bench Second',
      position: '2B',
    });
    expect(starterEvents[0].playerId).toBe('home-starter-2b');
  });
});
