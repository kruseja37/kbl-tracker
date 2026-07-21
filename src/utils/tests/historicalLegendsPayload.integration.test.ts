import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

import type { HistoricalLegendsAppPayload } from '../../data/historicalLegendsAppData';
import { buildDraftProfileModel } from '../draftProfileModel';

const payloadPath = resolve('public/data/historical-legends-app-data.json');
const runWithFinalPayload = existsSync(payloadPath) ? test : test.skip;
const PITCHER_POSITIONS = new Set(['SP', 'SP/RP', 'RP', 'CP']);
const PROTECTED_PLAYER_DATA_SHA256 = '75aedfcec76ba4ee0096bba836364d983e1532521f2cb84ca2b4de9e0e620fd4';

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

describe('final Historical Legends app payload', () => {
  runWithFinalPayload('contains the frozen 345-player library without substituting later experiments', () => {
    const payload = JSON.parse(readFileSync(payloadPath, 'utf8')) as HistoricalLegendsAppPayload;
    const playerIds = new Set(payload.players.map((player) => player.historicalLegend.playerId));

    expect(payload).toMatchObject({
      playerCount: 345,
      profileCount: 835,
      profileCounts: { Career: 245, Peak: 245, 'Draft Pool': 345 },
    });
    for (const playerId of [
      'mattd001',
      'reesp101',
      'rodra001',
      'dibbr001',
      'langw001',
      'blauj001',
      'hofft001',
      'hollg001',
      'vendp001',
    ]) {
      expect(playerIds.has(playerId), `${playerId} should be present`).toBe(true);
    }
    for (const playerId of ['benia001', 'charn001', 'bondb101']) {
      expect(playerIds.has(playerId), `${playerId} should be absent`).toBe(false);
    }
  });

  runWithFinalPayload('gives every Draft, Career, and Peak pitcher one canonical role without changing protected card data', () => {
    const payload = JSON.parse(readFileSync(payloadPath, 'utf8')) as HistoricalLegendsAppPayload;
    const protectedPlayers = payload.players.map((player) => {
      if (!PITCHER_POSITIONS.has(player.primaryPosition)) return player;
      const protectedPlayer = { ...player };
      delete protectedPlayer.secondaryPosition;
      return protectedPlayer;
    });

    expect(sha256(protectedPlayers)).toBe(PROTECTED_PLAYER_DATA_SHA256);
    expect(new Set(payload.players.map((player) => player.historicalProfileType))).toEqual(
      new Set(['Draft Pool', 'Career', 'Peak']),
    );

    const pitchers = payload.players.filter((player) => PITCHER_POSITIONS.has(player.primaryPosition));
    expect(pitchers).toHaveLength(326);
    for (const pitcher of pitchers) {
      expect(PITCHER_POSITIONS.has(pitcher.primaryPosition), pitcher.id).toBe(true);
      expect(pitcher.secondaryPosition, pitcher.id).toBeUndefined();
      expect(buildDraftProfileModel(pitcher, { revealFull: true }).secondaryPosition, pitcher.id).toBeUndefined();
    }

    const twoWayPitchers = pitchers.filter((player) => (
      [player.trait1, player.trait2].some((trait) => trait?.startsWith('Two Way'))
    ));
    expect(twoWayPitchers.map((player) => [player.id, player.trait1, player.trait2])).toEqual([
      ['hl:ankir001:career', 'Two Way (OF)', 'Wild Thing'],
      ['hl:ankir001:draft', 'Two Way (OF)', 'Wild Thing'],
      ['hl:halld101:draft', 'Two Way (OF)', undefined],
      ['hl:ruthb101:draft', 'Two Way (OF)', 'Crossed Up'],
    ]);
  });
});
