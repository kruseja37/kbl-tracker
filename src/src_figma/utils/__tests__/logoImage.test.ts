import { describe, expect, it } from 'vitest';

import {
  TEAM_LOGO_MAX_BYTES,
  TEAM_LOGO_TOO_BIG_MESSAGE,
  assertTeamLogoBlobFits,
  fitTeamLogoDimensions,
} from '../logoImage';

describe('team logo image limits', () => {
  it('fits wide, tall, and already-small images inside 128 by 128 without stretching', () => {
    expect(fitTeamLogoDimensions(512, 256)).toEqual({ width: 128, height: 64 });
    expect(fitTeamLogoDimensions(256, 512)).toEqual({ width: 64, height: 128 });
    expect(fitTeamLogoDimensions(64, 48)).toEqual({ width: 64, height: 48 });
  });

  it('rejects an encoded image above the hard cap with the ruled copy', () => {
    expect(() => assertTeamLogoBlobFits({ size: TEAM_LOGO_MAX_BYTES })).not.toThrow();
    expect(() => assertTeamLogoBlobFits({ size: TEAM_LOGO_MAX_BYTES + 1 }))
      .toThrow(TEAM_LOGO_TOO_BIG_MESSAGE);
  });
});
