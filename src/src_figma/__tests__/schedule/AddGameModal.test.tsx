import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { AddGameModal } from '../../app/components/AddGameModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onAddGame: vi.fn(),
  onAddSeries: vi.fn(),
  nextGameNumber: 1,
  nextDayNumber: 1,
  nextDate: 'July 12',
  teams: ['TIGERS', 'SOX'],
};

describe('AddGameModal', () => {
  test('labels Add Series as explicit repetition without generated opponents', () => {
    render(<AddGameModal {...defaultProps} />);

    expect(screen.getByText(/Explicit repeat only/i)).toBeInTheDocument();
    expect(screen.getByText(/no generated opponents/i)).toBeInTheDocument();
    expect(screen.getByText(/Edit rows after adding if dates or times differ/i)).toBeInTheDocument();
  });

  test('edit mode hides Add Series and saves the edited row', () => {
    const onUpdateGame = vi.fn();
    render(
      <AddGameModal
        {...defaultProps}
        onUpdateGame={onUpdateGame}
        editingGame={{
          id: 'game-1',
          gameNumber: 1,
          dayNumber: 1,
          date: 'July 12',
          time: '7:00 PM',
          awayTeamId: 'TIGERS',
          homeTeamId: 'SOX',
        }}
      />,
    );

    expect(screen.getByText('EDIT SCHEDULE GAME')).toBeInTheDocument();
    expect(screen.queryByText(/Explicit repeat only/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save Game' }));

    expect(onUpdateGame).toHaveBeenCalledWith('game-1', expect.objectContaining({
      gameNumber: 1,
      dayNumber: 1,
      awayTeamId: 'TIGERS',
      homeTeamId: 'SOX',
    }));
  });
});
