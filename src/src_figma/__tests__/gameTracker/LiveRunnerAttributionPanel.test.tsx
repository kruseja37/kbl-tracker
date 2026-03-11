import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { LiveRunnerAttributionPanel } from '../../app/components/LiveRunnerAttributionPanel';

describe('LiveRunnerAttributionPanel', () => {
  test('renders live runner attribution details and emits selection/commit actions', () => {
    const onFielderChange = vi.fn();
    const onCancel = vi.fn();
    const onCommit = vi.fn();

    render(
      <LiveRunnerAttributionPanel
        title="Stolen Base"
        summary="Garcia: FIRST -> SECOND"
        pitcherName="Pitcher One"
        catcherName="Catcher One"
        fielderId="fielder-1"
        fielderOptions={[
          { id: 'fielder-1', label: 'C — Catcher One' },
          { id: 'fielder-2', label: 'SS — Shortstop Two' },
        ]}
        onFielderChange={onFielderChange}
        onCancel={onCancel}
        onCommit={onCommit}
      />
    );

    expect(screen.getByText('LIVE RUNNER EVENT')).toBeInTheDocument();
    expect(screen.getByText('Garcia: FIRST -> SECOND')).toBeInTheDocument();
    expect(screen.getByText('Pitcher One')).toBeInTheDocument();
    expect(screen.getByDisplayValue('C — Catcher One')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('C — Catcher One'), {
      target: { value: 'fielder-2' },
    });
    fireEvent.click(screen.getByText('Cancel'));
    fireEvent.click(screen.getByText('LOG RUNNER EVENT'));

    expect(onFielderChange).toHaveBeenCalledWith('fielder-2');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});
