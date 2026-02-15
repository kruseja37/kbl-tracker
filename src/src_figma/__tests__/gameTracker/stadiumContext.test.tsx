/**
 * Stadium Context Tests (BUG-012: stadiumName + park data)
 * @franchise-game-tracker
 */

import 'fake-indexeddb/auto';
import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AtBatFlow from '../../../components/GameTracker/AtBatFlow';
import { createGameHeader, getGameHeader } from '../../../utils/eventLog';

const deleteEventLogDB = () => new Promise<void>((resolve) => {
  const request = indexedDB.deleteDatabase('kbl-event-log');
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    resolve();
  };
  request.onsuccess = finish;
  request.onerror = finish;
  request.onblocked = finish;
  setTimeout(finish, 50);
});

afterEach(async () => {
  await deleteEventLogDB();
});

describe('@franchise-game-tracker stadium persistence and HR limits', () => {
  test('@franchise-game-tracker stores stadiumName when creating a game header', async () => {
    await createGameHeader({
      gameId: 'stadium-test',
      seasonId: 'season-1',
      date: Date.now(),
      awayTeamId: 'away-1',
      awayTeamName: 'Away Squad',
      homeTeamId: 'home-1',
      homeTeamName: 'Home Squad',
      finalScore: { away: 0, home: 0 },
      finalInning: 9,
      isComplete: false,
      stadiumName: 'Apple Field',
    });

    const header = await getGameHeader('stadium-test');
    expect(header?.stadiumName).toBe('Apple Field');
  });

  test('@franchise-game-tracker HR validation honors real stadium fence distances', () => {
    render(
      <AtBatFlow
        result="HR"
        bases={{ first: null, second: null, third: null }}
        batterName="HR Hitter"
        outs={0}
        onComplete={() => undefined}
        onCancel={() => undefined}
        stadiumName="Apple Field"
      />
    );

    const leftButton = screen.getByRole('button', { name: 'Left' });
    fireEvent.click(leftButton);

    const distanceInput = screen.getByPlaceholderText('e.g., 420');
    fireEvent.change(distanceInput, { target: { value: '330' } });

    const continueButton = screen.getByRole('button', { name: /Continue to Fielding/i });
    expect(continueButton).toBeDisabled();

    fireEvent.change(distanceInput, { target: { value: '337' } });
    expect(continueButton).not.toBeDisabled();
  });
});
