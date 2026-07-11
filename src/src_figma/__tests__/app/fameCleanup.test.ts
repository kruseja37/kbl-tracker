import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

import { FAME_VALUES } from '../../../types/game';
import {
  buildFameEventRecord,
  formatNeutralFameEventActivity,
  toCatalogFameEventType,
} from '../../app/hooks/useFameTracking';

describe('FAME-CLEANUP-1', () => {
  test('quick-button activity copy is neutral and contains no Fame arithmetic', () => {
    const eventType = toCatalogFameEventType('KILLED');
    expect(eventType).toBe('KILLED_PITCHER');

    const activity = formatNeutralFameEventActivity(eventType!, 'Jones');
    expect(activity).toBe('Killed Pitcher — Jones');
    expect(activity).not.toMatch(/[+-]\d/);
    expect(activity).not.toMatch(/fame/i);
  });

  test('durable records keep the canonical catalog value and LI calculation', () => {
    const record = buildFameEventRecord({
      eventType: 'WALK_OFF_HR',
      playerId: 'jones',
      playerName: 'Jones',
      inning: 9,
      halfInning: 'BOTTOM',
      leverageIndex: 4,
    });

    expect(record.fameValue).toBe(FAME_VALUES.WALK_OFF_HR * 2);
    expect(record.fameType).toBe('bonus');
    expect(record.description).not.toMatch(/[+-]\d|fame/i);
  });

  test('GameTracker completion has no legacy narrator or numeric Fame UI path', () => {
    const gameTrackerSource = readFileSync(
      resolve(process.cwd(), 'src/src_figma/app/pages/GameTracker.tsx'),
      'utf8',
    );

    expect(gameTrackerSource).not.toContain('generateGameRecap');
    expect(gameTrackerSource).not.toContain('formatFameValue');
    expect(gameTrackerSource).not.toContain('Fame Event Popup');
    expect(gameTrackerSource).not.toContain('gameNarrative');
    expect(gameTrackerSource).not.toContain('awayNarrative');
  });
});
