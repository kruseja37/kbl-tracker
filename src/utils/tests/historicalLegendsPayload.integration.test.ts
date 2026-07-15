import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

import type { HistoricalLegendsAppPayload } from '../../data/historicalLegendsAppData';

const payloadPath = resolve('public/data/historical-legends-app-data.json');
const runWithFinalPayload = existsSync(payloadPath) ? test : test.skip;

describe('final Historical Legends app payload', () => {
  runWithFinalPayload('contains the approved replacement set and excludes the held cards', () => {
    const payload = JSON.parse(readFileSync(payloadPath, 'utf8')) as HistoricalLegendsAppPayload;
    const playerIds = new Set(payload.players.map((player) => player.historicalLegend.playerId));

    expect(payload).toMatchObject({
      playerCount: 345,
      profileCount: 835,
      profileCounts: { Career: 245, Peak: 245, 'Draft Pool': 345 },
    });
    for (const playerId of ['baezj001', 'johnj010', 'kolbd001', 'roget002']) {
      expect(playerIds.has(playerId), `${playerId} should be present`).toBe(true);
    }
    for (const playerId of ['blauj001', 'hofft001', 'hollg001', 'vendp001']) {
      expect(playerIds.has(playerId), `${playerId} should be absent`).toBe(false);
    }
  });
});
