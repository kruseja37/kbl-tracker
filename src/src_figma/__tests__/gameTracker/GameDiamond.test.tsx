import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { GameDiamond } from '../../app/components/GameDiamond';

describe('GameDiamond', () => {
  test('renders info mode field surface and forwards batter/fielder taps', () => {
    const onBatterTap = vi.fn();
    const onFielderTap = vi.fn();

    render(
      <DndProvider backend={HTML5Backend}>
        <div style={{ width: 900, height: 600 }}>
          <GameDiamond
            mode="info"
            bases={{ first: true, second: false, third: false }}
            runnerNames={{ first: 'Garcia' }}
            currentBatterName="Johnson"
            fielders={[
              {
                positionNumber: 6,
                playerId: 'ss-1',
                fullName: 'K. Washington',
                displayName: 'WASHINGTON',
                position: 'SS',
                fwar: 0.3,
              },
            ]}
            onBatterTap={onBatterTap}
            onFielderTap={onFielderTap}
          />
        </div>
      </DndProvider>
    );

    expect(screen.getByText('Info Mode')).toBeInTheDocument();
    expect(screen.getByText('WASHINGTON')).toBeInTheDocument();
    expect(screen.getByText('SS · 0.3')).toBeInTheDocument();
    expect(screen.getByText('JOHNSON')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByText('WASHINGTON'), { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(screen.getByText('WASHINGTON'), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByText('JOHNSON'));

    expect(onFielderTap).toHaveBeenCalledWith(6, 'K. Washington', expect.objectContaining({
      left: expect.any(String),
      top: expect.any(String),
    }));
    expect(onBatterTap).toHaveBeenCalledTimes(1);
  });
});
