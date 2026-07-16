import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

import type { HistoricalLegendsAppPayload } from '../../data/historicalLegendsAppData';

const payloadPath = resolve('public/data/historical-legends-app-data.json');
const runWithFinalPayload = existsSync(payloadPath) ? test : test.skip;

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
});
