import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const flags = vi.hoisted(() => ({ snakeV1: false }));

vi.mock('../../../utils/franchisePhase2Activation', () => ({
  hydrateFranchisePhase2ActivationCache: vi.fn(async () => null),
}));

vi.mock('../../../utils/franchisePhase2Flags', () => ({
  isSnakeDraftV1Enabled: () => flags.snakeV1,
}));

vi.mock('../../app/pages/SnakeCompanion', () => ({
  default: () => <h1>COMPANION ROUTE OPEN</h1>,
}));

import App from '../../../App';

afterEach(() => {
  flags.snakeV1 = false;
  vi.clearAllMocks();
});

describe('snake companion route gate', () => {
  it('keeps /snake-companion hidden while the snake v1 flag is off', async () => {
    render(<MemoryRouter initialEntries={['/snake-companion']}><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Page Not Found' })).toBeInTheDocument();
  });

  it('registers /snake-companion when the snake v1 flag is on', async () => {
    flags.snakeV1 = true;
    render(<MemoryRouter initialEntries={['/snake-companion']}><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'COMPANION ROUTE OPEN' })).toBeInTheDocument();
  });
});
