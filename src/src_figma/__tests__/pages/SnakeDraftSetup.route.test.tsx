import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../utils/franchisePhase2Activation', () => ({
  hydrateFranchisePhase2ActivationCache: vi.fn(async () => null),
}));

vi.mock('../../../utils/franchisePhase2Flags', () => ({
  isSnakeDraftPocEnabled: () => false,
  isSnakeDraftV1Enabled: () => false,
}));

import App from '../../../App';

afterEach(() => vi.clearAllMocks());

describe('snake v1 route gate', () => {
  it('keeps /snake-setup hidden while the default-off flag is off', async () => {
    render(<MemoryRouter initialEntries={['/snake-setup']}><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Page Not Found' })).toBeInTheDocument();
  });
});
