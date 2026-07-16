import { describe, expect, it } from 'vitest';

import type { HistoricalArchetype } from '../../../data/historicalArchetypes';
import type { Player } from '../../../utils/leagueBuilderStorage';
import { rosterFitForArchetype } from '../../app/pages/LeagueBuilderDraftSetup.helpers';

function player(id: string, primaryPosition: Player['primaryPosition'], power: number, velocity: number): Player {
  return {
    id,
    firstName: id,
    lastName: 'Player',
    primaryPosition,
    power,
    contact: 0,
    speed: 0,
    fielding: 0,
    arm: 0,
    velocity,
    junk: 0,
    accuracy: 0,
  } as Player;
}

describe('Draft Setup archetype auto-assignment fit', () => {
  it('scores each mixed hitter/pitcher boost against its own cohort', () => {
    const mixed: HistoricalArchetype = {
      id: 'mixed', name: 'Mixed', exemplars: [], era: 'test', lore: 'test', identity: 'test',
      boosts: ['POW', 'ROT_VEL'], nerfs: [], spec: { POW: 1, ROT_VEL: 1 },
    };
    const fit = rosterFitForArchetype([
      player('slugger', '1B', 90, 0),
      player('starter', 'SP', 5, 10),
    ], mixed);

    expect(fit).toBe(50);
  });
});
