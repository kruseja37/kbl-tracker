import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

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
  teamNameMap: { TIGERS: 'Moonstars', SOX: 'Sand Cats' },
};

describe('AddGameModal', () => {
  beforeEach(() => vi.clearAllMocks());

  test('keeps explanatory copy behind the ratified Help control', () => {
    render(<AddGameModal {...defaultProps} />);

    expect(screen.getByRole('dialog', { name: 'ADD GAME TO SCHEDULE' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.queryByText(/nothing else is generated/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    expect(screen.getByText(/nothing else is generated/i)).toBeInTheDocument();
  });

  test('edit mode hides Add Series and saves the edited row', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'SAVE GAME' }));

    await waitFor(() => expect(onUpdateGame).toHaveBeenCalledWith('game-1', expect.objectContaining({
      gameNumber: 1,
      dayNumber: 1,
      awayTeamId: 'TIGERS',
      homeTeamId: 'SOX',
    })));
    await waitFor(() => expect(defaultProps.onClose).toHaveBeenCalled());
  });

  test('shows team names and submits the real next day number', async () => {
    const onAddGame = vi.fn();
    render(<AddGameModal {...defaultProps} nextGameNumber={11} nextDayNumber={21} onAddGame={onAddGame} />);

    expect(screen.getAllByRole('option', { name: 'Moonstars' })).toHaveLength(2);
    expect(screen.getAllByRole('option', { name: 'Sand Cats' })).toHaveLength(2);
    expect(screen.getByLabelText('Day #')).toHaveValue(21);
    fireEvent.change(screen.getByLabelText('Away Team'), { target: { value: 'TIGERS' } });
    fireEvent.change(screen.getByLabelText('Home Team'), { target: { value: 'SOX' } });
    fireEvent.click(screen.getByRole('button', { name: 'ADD GAME' }));

    await waitFor(() => expect(onAddGame).toHaveBeenCalledWith(expect.objectContaining({ gameNumber: 11, dayNumber: 21 })));
    await waitFor(() => expect(defaultProps.onClose).toHaveBeenCalled());
  });

  test('submits the selected starting game number when adding a series', async () => {
    const onAddSeries = vi.fn();
    render(<AddGameModal {...defaultProps} nextGameNumber={11} nextDayNumber={21} onAddSeries={onAddSeries} />);

    fireEvent.change(screen.getByLabelText('Game Number'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Away Team'), { target: { value: 'TIGERS' } });
    fireEvent.change(screen.getByLabelText('Home Team'), { target: { value: 'SOX' } });
    fireEvent.click(screen.getByRole('button', { name: 'ADD SERIES' }));

    await waitFor(() => expect(onAddSeries).toHaveBeenCalledWith(
      expect.objectContaining({ gameNumber: 15, dayNumber: 21 }),
      3,
    ));
    await waitFor(() => expect(defaultProps.onClose).toHaveBeenCalled());
  });

  test('keeps entered data open and blocks duplicate submits until an async failure settles', async () => {
    let rejectSave: ((reason?: unknown) => void) | null = null;
    const onAddGame = vi.fn(() => new Promise<void>((_, reject) => { rejectSave = reject; }));
    const onClose = vi.fn();
    render(<AddGameModal {...defaultProps} onAddGame={onAddGame} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText('Away Team'), { target: { value: 'TIGERS' } });
    fireEvent.change(screen.getByLabelText('Home Team'), { target: { value: 'SOX' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: 'August 4' } });

    fireEvent.click(screen.getByRole('button', { name: 'ADD GAME' }));
    expect(screen.getByRole('button', { name: 'SAVING GAME…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'SAVING GAME…' }));
    expect(onAddGame).toHaveBeenCalledTimes(1);
    rejectSave?.(new Error('disk unavailable'));

    expect(await screen.findByRole('alert')).toHaveTextContent('disk unavailable');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Date')).toHaveValue('August 4');
    await waitFor(() => expect(screen.getByRole('button', { name: 'ADD GAME' })).toBeEnabled());
  });
});
