import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  buildCompanionBranding,
  CompanionCompletedScreen,
  CompanionCoveredScreen,
  SnakeCompanionFrame,
} from '../SnakeCompanionFrame';

describe('companion privacy and team-first surfaces', () => {
  it('keeps a covered device free of private desk content until explicit return', () => {
    const onReturn = vi.fn();
    render(<CompanionCoveredScreen onReturn={onReturn} onSignOut={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'DEVICE COVERED' })).toBeInTheDocument();
    expect(screen.queryByText('PRIVATE PLAYER BOARD')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    expect(onReturn).toHaveBeenCalledOnce();
  });

  it('shows a terminal completed-room surface with no editable desk', () => {
    const onLeave = vi.fn();
    render(<CompanionCompletedScreen teamName="Kodiaks" onLeave={onLeave} onSignOut={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'DRAFT COMPLETE' })).toBeInTheDocument();
    expect(screen.queryByTestId('private-draft-desk')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'LEAVE ROOM' }));
    expect(onLeave).toHaveBeenCalledOnce();
  });

  it('renders safe team branding plus selected and drafted truth ahead of the board', () => {
    const { rerender } = render(<SnakeCompanionFrame
      team={{
        id: 'team-a',
        name: 'Kodiaks',
        abbreviation: 'KOD',
        logoUrl: 'data:image/png;base64,AA==',
        colors: { primary: '#112233', secondary: '#fefefe', accent: '#ddaa00' },
      }}
      currentPick={7}
      order={[{ pick: 7, teamName: 'Kodiaks' }]}
      ticker={[]}
      selectedPlayer={<div>SELECTED PLAYER PROFILE</div>}
      draftedTruth={<div>DRAFTED MONEY AND CHEMISTRY</div>}
      privateDesk={<div>PRIVATE PLAYER BOARD</div>}
      onCover={vi.fn()}
    />);

    expect(screen.getByAltText('Kodiaks logo')).toHaveAttribute('src', 'data:image/png;base64,AA==');
    const copy = document.body.textContent ?? '';
    expect(copy.indexOf('SELECTED PLAYER PROFILE')).toBeLessThan(copy.indexOf('PRIVATE PLAYER BOARD'));
    expect(copy.indexOf('DRAFTED MONEY AND CHEMISTRY')).toBeLessThan(copy.indexOf('PRIVATE PLAYER BOARD'));

    rerender(<SnakeCompanionFrame
      team={{ id: 'team-a', name: 'Kodiaks', abbreviation: 'KOD', logoUrl: 'javascript:alert(1)' }}
      currentPick={7}
      order={[]}
      ticker={[]}
      privateDesk={<div>PRIVATE PLAYER BOARD</div>}
      onCover={vi.fn()}
    />);
    expect(screen.queryByAltText('Kodiaks logo')).not.toBeInTheDocument();
  });

  it('forces opaque high-contrast branding for identical and transparent hostile colors', () => {
    expect(buildCompanionBranding({
      primary: 'rgba(255, 255, 255, 0)',
      secondary: 'rgba(255, 255, 255, 0)',
      accent: 'javascript:alert(1)',
    })).toEqual({
      background: 'rgb(23, 60, 42)',
      foreground: 'rgb(255, 255, 255)',
      border: 'rgb(255, 255, 255)',
    });
    expect(buildCompanionBranding({ primary: '#ffffff', secondary: '#ffffff', accent: '#ffffff' })).toEqual({
      background: 'rgb(255, 255, 255)',
      foreground: 'rgb(11, 15, 12)',
      border: 'rgb(11, 15, 12)',
    });
  });
});
