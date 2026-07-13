import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../utils/franchisePhase2Activation', () => ({
  hydrateFranchisePhase2ActivationCache: vi.fn(async () => null),
}));

vi.mock('../../../utils/franchisePhase2Flags', () => ({
  isSnakeDraftV1Enabled: () => false,
}));

vi.mock('../../app/pages/LeagueBuilderDraftSetup', () => ({
  LeagueBuilderDraftSetup: () => {
    const location = useLocation();
    return <div data-testid="unified-setup-location">{location.pathname}{location.search}</div>;
  },
}));

import App from '../../../App';

afterEach(() => vi.clearAllMocks());

describe('retired snake setup route', () => {
  it('redirects to the unified setup while preserving leagueId', async () => {
    render(<MemoryRouter initialEntries={['/snake-setup?leagueId=league-42']}><App /></MemoryRouter>);
    expect(await screen.findByTestId('unified-setup-location')).toHaveTextContent(
      '/league-builder/draft-setup?leagueId=league-42',
    );
  });

  it('retires the superseded snake POC route into unified setup while preserving leagueId', async () => {
    render(<MemoryRouter initialEntries={['/league-builder/snake-draft?leagueId=league-99']}><App /></MemoryRouter>);
    expect(await screen.findByTestId('unified-setup-location')).toHaveTextContent(
      '/league-builder/draft-setup?leagueId=league-99',
    );
  });
});
