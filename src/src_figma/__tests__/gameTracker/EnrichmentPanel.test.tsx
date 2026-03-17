import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { EnrichmentPanel, RunnerEnrichmentPanel } from '../../app/components/EnrichmentPanel';
import type { PlayLogEntry, RunnerSubEntry } from '../../app/utils/playLogTypes';

function buildEntry(result: string): PlayLogEntry {
  return {
    id: `entry-${result}`,
    eventId: `event-${result}`,
    eventType: 'at_bat',
    editorType: 'batter_at_bat',
    visibility: 'default',
    isSelectable: true,
    inningLabel: 'T4',
    batterName: 'Johnson',
    result,
    resultCategory: result === 'BB' ? 'walk' : ['1B', '2B', '3B', 'HR'].includes(result) ? 'hit' : 'out',
    rbi: 0,
    runsScored: 0,
    hasFieldingData: false,
    hasLocationData: false,
    hasKType: result === 'K' || result === 'Kc',
    hasPitchCount: false,
    hasPitchType: false,
    isEnrichable: true,
    isQAB: false,
    timestamp: Date.now(),
  };
}

describe('EnrichmentPanel', () => {
  test('shows contact type controls for hit outcomes and saves value as exitType', () => {
    const onUpdate = vi.fn();

    render(
      <EnrichmentPanel
        entry={buildEntry('1B')}
        currentEnrichment={{}}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Contact Type')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Normal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hard' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hard' }));

    expect(onUpdate).toHaveBeenCalledWith('exitType', 'hard');
  });

  test('does not show contact type controls for walk outcomes', () => {
    render(
      <EnrichmentPanel
        entry={buildEntry('BB')}
        currentEnrichment={{}}
        onUpdate={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText('Contact Type')).not.toBeInTheDocument();
  });

  test('shows fielding attempt controls for outs with attempt type and outcome', () => {
    const onUpdate = vi.fn();

    render(
      <EnrichmentPanel
        entry={buildEntry('FO')}
        currentEnrichment={{}}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Fielding Attempt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Diving' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Diving' }));

    // Should set both fieldingAttemptType and legacy fieldingPlayType
    expect(onUpdate).toHaveBeenCalledWith('fieldingAttemptType', 'diving');
    expect(onUpdate).toHaveBeenCalledWith('fieldingPlayType', 'diving');
  });

  test('shows play mechanic controls for outs', () => {
    render(
      <EnrichmentPanel
        entry={buildEntry('GO')}
        currentEnrichment={{}}
        onUpdate={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Play Mechanic')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Relay' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rundown' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deflection' })).toBeInTheDocument();
  });

  test('routes modifier clicks through the at-bat modifier handler and gates KP/NUT off HR', () => {
    const onModifierRecord = vi.fn();

    // HR should NOT show KP or NUT modifiers
    const { unmount } = render(
      <EnrichmentPanel
        entry={buildEntry('HR')}
        currentEnrichment={{}}
        onUpdate={() => {}}
        onModifierRecord={onModifierRecord}
        onClose={() => {}}
      />
    );

    expect(screen.queryByRole('button', { name: 'KP' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'NUT' })).not.toBeInTheDocument();

    unmount();

    // GO should show KP and NUT modifiers
    render(
      <EnrichmentPanel
        entry={buildEntry('GO')}
        currentEnrichment={{}}
        onUpdate={() => {}}
        onModifierRecord={onModifierRecord}
        onClose={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: 'KP' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'NUT' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'KP' }));
    expect(onModifierRecord).toHaveBeenCalledWith('KILLED_PITCHER');
  });

  test('TOOTBLAN and BUNT are not in play-level modifiers', () => {
    render(
      <EnrichmentPanel
        entry={buildEntry('GO')}
        currentEnrichment={{}}
        onUpdate={() => {}}
        onModifierRecord={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.queryByRole('button', { name: 'BUNT' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'TBL' })).not.toBeInTheDocument();
  });

  test('runner enrichment panel offers forward destinations including hold for wild-pitch corrections', () => {
    const onUpdate = vi.fn();
    const subEntry: RunnerSubEntry = {
      id: 'evt-1-runner-0',
      parentEventId: 'evt-1',
      runnerId: 'runner-1',
      runnerName: 'Speedy',
      fromBase: 'second',
      toBase: 'third',
      isEnrichable: true,
    };

    render(
      <RunnerEnrichmentPanel
        subEntry={subEntry}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: '2B' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3B' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'HOME' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OUT' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '1B' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2B' }));

    expect(onUpdate).toHaveBeenCalledWith('evt-1-runner-0', 'toBase', 'second');
  });

  test('hit enrichment exposes a batter out-advancing toggle', () => {
    const onUpdate = vi.fn();

    render(
      <EnrichmentPanel
        entry={buildEntry('2B')}
        currentEnrichment={{}}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Out Advancing' }));

    expect(onUpdate).toHaveBeenCalledWith('batterOutAdvancing', true);
  });
});
