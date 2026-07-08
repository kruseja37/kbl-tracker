/**
 * P7 rules-prune characterization.
 *
 * The standalone League Builder rules preset editor is intentionally no longer
 * exposed as an editable settings surface because its preset fields are not
 * consumed by the live franchise season path.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeagueBuilderRules } from '../../app/pages/LeagueBuilderRules';

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

describe('LeagueBuilderRules P7 prune state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders a non-editing rules handoff page', () => {
    render(<LeagueBuilderRules />);

    expect(screen.getByText('RULES')).toBeInTheDocument();
    expect(screen.getByText('Rules are set during Franchise Setup')).toBeInTheDocument();
    expect(screen.getByText(/Standalone rules presets are not wired/i)).toBeInTheDocument();
  });

  test('does not expose decorative preset CRUD or unwired rules knobs', () => {
    render(<LeagueBuilderRules />);

    expect(screen.queryByText('NEW PRESET')).not.toBeInTheDocument();
    expect(screen.queryByText('AVAILABLE PRESETS')).not.toBeInTheDocument();
    expect(screen.queryByText('GAME RULES')).not.toBeInTheDocument();
    expect(screen.queryByText('MERCY RULE')).not.toBeInTheDocument();
    expect(screen.queryByText('TRADE DEADLINE')).not.toBeInTheDocument();
    expect(screen.queryByText('PITCH COUNTS')).not.toBeInTheDocument();
    expect(screen.queryByText('MOUND VISITS')).not.toBeInTheDocument();
  });

  test('back button navigates to league builder', () => {
    render(<LeagueBuilderRules />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/league-builder');
  });
});
