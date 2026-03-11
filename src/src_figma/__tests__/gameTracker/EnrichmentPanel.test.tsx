import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { EnrichmentPanel } from '../../app/components/EnrichmentPanel';
import type { PlayLogEntry } from '../../app/utils/playLogTypes';

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
  test('shows exit type controls for hit outcomes and saves normalized value', () => {
    const onUpdate = vi.fn();

    render(
      <EnrichmentPanel
        entry={buildEntry('1B')}
        currentEnrichment={{ exitType: 'line_drive' }}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Exit Type')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Line Drive' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ground' }));

    expect(onUpdate).toHaveBeenCalledWith('exitType', 'ground_ball');
  });

  test('does not show exit type controls for walk outcomes', () => {
    render(
      <EnrichmentPanel
        entry={buildEntry('BB')}
        currentEnrichment={{}}
        onUpdate={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText('Exit Type')).not.toBeInTheDocument();
  });

  test('shows fielding play type controls for outs and saves normalized value', () => {
    const onUpdate = vi.fn();

    render(
      <EnrichmentPanel
        entry={buildEntry('FO')}
        currentEnrichment={{ fieldingPlayType: 'diving' }}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Fielding Play Type')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Diving' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wall Catch' }));

    expect(onUpdate).toHaveBeenCalledWith('fieldingPlayType', 'wall');
  });

  test('routes modifier clicks through the at-bat modifier handler', () => {
    const onModifierRecord = vi.fn();

    render(
      <EnrichmentPanel
        entry={buildEntry('FO')}
        currentEnrichment={{ modifiers: ['BUNT'] }}
        onUpdate={() => {}}
        onModifierRecord={onModifierRecord}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Modifiers')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'BUNT' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'ROB' }));

    expect(onModifierRecord).toHaveBeenCalledWith('ROBBERY');
  });
});
