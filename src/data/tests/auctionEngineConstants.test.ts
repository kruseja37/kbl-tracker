import { describe, expect, test } from 'vitest';

import {
  DEFAULT_AUCTION_SETUP_CONFIG,
  type AuctionSetupConfig,
} from '../auctionEngineConstants';

describe('auctionEngineConstants', () => {
  test('exports the ruled v1 auction setup defaults', () => {
    expect(DEFAULT_AUCTION_SETUP_CONFIG).toMatchObject<AuctionSetupConfig>({
      format: 'auction',
      turnTimerSeconds: null,
      cpuShillCount: expect.any(Number),
      nominationOrderSeed: expect.any(String),
      bidIncrement: expect.any(Number),
      excludeFromLeague: true,
    });
  });

  test('keeps the default bid increment positive', () => {
    expect(DEFAULT_AUCTION_SETUP_CONFIG.bidIncrement).toBeGreaterThan(0);
  });
});
