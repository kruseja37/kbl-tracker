import { describe, expect, it } from 'vitest';

import { resolveCompanionServerOrigin } from './scripts/viteCompanionAddress';

describe('companion Vite address endpoint', () => {
  it('publishes the resolved LAN origin instead of the loopback address', () => {
    expect(resolveCompanionServerOrigin({
      local: ['http://localhost:5173/'],
      network: ['http://192.168.68.54:5173/'],
    })).toBe('http://192.168.68.54:5173');
  });

  it('fails closed when the server has no network listener', () => {
    expect(resolveCompanionServerOrigin({
      local: ['http://localhost:5173/'],
      network: [],
    })).toBeNull();
    expect(resolveCompanionServerOrigin(null)).toBeNull();
  });

  it('rejects credentials and loopback values accidentally listed as network URLs', () => {
    expect(resolveCompanionServerOrigin({
      local: [],
      network: ['http://owner:secret@192.168.68.54:5173/', 'http://127.0.0.1:5173/'],
    })).toBeNull();
  });
});
