import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CompanionCoveredScreen, SnakeCompanionFrame } from '../SnakeCompanionFrame';

const team = {
  id: 'bew', name: 'Beewolves', abbreviation: 'BEW',
  colors: { primary: '#1f6b45', secondary: '#f4d35e', accent: '#16281f' },
};

describe('SnakeCompanionFrame Batch 5 surface', () => {
  it('keeps Help hidden, combines the live strip, preserves decision order, and has no active Forget Room', () => {
    render(<SnakeCompanionFrame
      team={team}
      currentPick={19}
      onClockTeam={{ name: 'Buzzards', colors: { primary: '#006b2d', secondary: '#ffdc00' } }}
      order={[{ pick: 19, teamName: 'Buzzards' }, { pick: 20, teamName: 'Beewolves' }]}
      ticker={['KODIAKS SELECTED JOVITA PULO']}
      selectedPlayer={<div data-testid="selected">SELECTED PROFILE</div>}
      draftedTruth={<div data-testid="drafted">DRAFTED TRUTH</div>}
      privateDesk={(showHelp) => <div data-testid="desk">PRIVATE DESK {showHelp ? 'HELP ACTIVE' : ''}</div>}
      helpNotes={['RANKINGS STAY PRIVATE.']}
      onCover={vi.fn()}
    />);

    expect(screen.getByTestId('snake-companion-frame')).toHaveClass('min-w-0', 'overflow-x-clip', 'overflow-y-visible');
    expect(screen.getByTestId('companion-selected-player-pane')).toHaveClass(
      'sticky',
      'top-3',
      'self-start',
      'lg:max-h-[calc(100vh-18rem)]',
    );
    expect(screen.getByTestId('companion-live-strip')).toHaveTextContent('PICK 19');
    expect(screen.getByTestId('companion-live-strip')).toHaveTextContent('BUZZARDS · PICK 19');
    expect(screen.getByTestId('companion-live-strip')).toHaveStyle({ backgroundColor: '#006b2d' });
    expect(screen.getByTestId('companion-live-strip')).toHaveTextContent('#20 BEEWOLVES');
    expect(screen.getByTestId('companion-live-strip')).toHaveTextContent('KODIAKS SELECTED JOVITA PULO');
    expect(screen.getByTestId('companion-live-strip').querySelector('.overflow-x-auto')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'FORGET ROOM' })).not.toBeInTheDocument();
    expect(screen.queryByText("THIS DEVICE SHOWS ONLY THE CLAIMED CLUB'S PRIVATE DESK.")).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'HELP' })).toHaveClass('min-h-11', 'min-w-11');
    expect(screen.getByRole('button', { name: 'COVER THIS DEVICE' })).toHaveClass('min-h-11');

    const selected = screen.getByTestId('selected');
    const drafted = screen.getByTestId('drafted');
    const desk = screen.getByTestId('desk');
    expect(selected.compareDocumentPosition(drafted) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(drafted.compareDocumentPosition(desk) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'HELP' }));
    expect(screen.getByText("THIS DEVICE SHOWS ONLY THE CLAIMED CLUB'S PRIVATE DESK.")).toBeInTheDocument();
    expect(screen.getByText('RANKINGS STAY PRIVATE.')).toBeInTheDocument();
    expect(screen.getByTestId('desk')).toHaveTextContent('HELP ACTIVE');
  });

  it('keeps Forget Room on the covered recovery surface', () => {
    const { container } = render(<CompanionCoveredScreen openTeamName="Buzzards" onReturn={vi.fn()} onSignOut={vi.fn()} onForgetRoom={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'FORGET ROOM' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RETURN TO DESK' })).toHaveTextContent('OPEN BUZZARDS DESK');
    for (const control of container.querySelectorAll('button')) {
      expect(control).toHaveClass('min-h-11');
    }
  });

  it('shows only approved teams in the compact switcher and requests the selected desk', () => {
    const onSwitchTeam = vi.fn();
    render(<SnakeCompanionFrame
      team={team}
      authorizedTeams={[{ id: 'bew', name: 'Beewolves' }, { id: 'buz', name: 'Buzzards' }]}
      onSwitchTeam={onSwitchTeam}
      currentPick={1}
      order={[]}
      ticker={[]}
      privateDesk={<div>BEES ONLY</div>}
      onCover={vi.fn()}
    />);

    const switcher = screen.getByRole('combobox', { name: 'PRIVATE TEAM DESK' });
    expect(switcher).toHaveValue('bew');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['BEEWOLVES', 'BUZZARDS']);
    fireEvent.change(switcher, { target: { value: 'buz' } });
    expect(onSwitchTeam).toHaveBeenCalledWith('buz');
  });
});
