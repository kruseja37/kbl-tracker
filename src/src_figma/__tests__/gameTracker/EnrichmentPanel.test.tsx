import 'fake-indexeddb/auto';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  ENRICHMENT_CONFIG,
  EnrichmentPanel,
  RunnerEnrichmentPanel,
  getSprayRegionsForResult,
  resolveSprayRegionForPoint,
} from '../../app/components/EnrichmentPanel';
import {
  inferAssistChain,
  inferPrimaryFielderPositionFromSpray,
} from '../../app/utils/gameTrackerFieldTypes';
import type { PlayLogEntry, RunnerSubEntry } from '../../app/utils/playLogTypes';
import { PLAY_MECHANIC_OPTIONS } from '../../app/utils/fieldingPlayType';
import {
  getAtBatEvent,
  logAtBatEvent,
  updateAtBatEvent,
  type AtBatEvent,
} from '../../../utils/eventLog';

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
  vi.restoreAllMocks();
  await deleteEventLogDB();
});

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
    resultCategory: result === 'BB' ? 'walk' : ['1B', '2B', '3B', 'HR', 'ITPHR'].includes(result) ? 'hit' : 'out',
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

function buildAtBatEvent(result: AtBatEvent['result']): AtBatEvent {
  return {
    eventId: `event-${result}`,
    gameId: 'game-enrichment',
    eventIndex: 1,
    timestamp: 1,
    batterId: 'batter-1',
    batterName: 'Johnson',
    batterTeamId: 'away-team',
    pitcherId: 'pitcher-1',
    pitcherName: 'Anderson',
    pitcherTeamId: 'home-team',
    result,
    rbiCount: 0,
    runsScored: [],
    inning: 4,
    halfInning: 'TOP',
    outs: 1,
    runners: {
      first: { runnerId: 'runner-1', runnerName: 'Runner One', responsiblePitcherId: 'pitcher-1' },
      second: null,
      third: null,
    },
    awayScore: 0,
    homeScore: 0,
    outsAfter: 2,
    runnersAfter: {
      first: { runnerId: 'batter-1', runnerName: 'Johnson', responsiblePitcherId: 'pitcher-1' },
      second: null,
      third: null,
    },
    awayScoreAfter: 0,
    homeScoreAfter: 0,
    leverageIndex: 1,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.48,
    wpa: -0.02,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: false,
    isClutch: false,
    isWalkOff: false,
    version: 1,
    editHistory: [],
  };
}

function getSprayRegion(result: string, id: string) {
  const region = getSprayRegionsForResult(result).find((candidate) => candidate.id === id);
  if (!region) {
    throw new Error(`Missing spray region ${id} for result ${result}`);
  }
  return region;
}

function mockSvgRect(svg: SVGSVGElement) {
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 200,
    bottom: 120,
    width: 200,
    height: 120,
    toJSON: () => ({}),
  } as DOMRect);
}

/** Click the spray SVG at the center of a given region. */
function clickSvgAtRegion(container: HTMLElement, result: string, regionId: string) {
  const svg = container.querySelector('svg');
  if (!(svg instanceof SVGSVGElement)) throw new Error('Expected spray SVG');
  mockSvgRect(svg);
  const region = getSprayRegion(result, regionId);
  fireEvent.click(svg, {
    clientX: region.center.x * 2,
    clientY: region.center.y * 1.2,
  });
}

describe('EnrichmentPanel', () => {
  test('[M2-3-fix] infers GO, FC, and DP assist chains from the primary fielder and bases', () => {
    expect(inferAssistChain('GO', 6, { first: false, second: false, third: false })).toEqual([6, 3]);
    expect(inferAssistChain('GO', 3, { first: false, second: false, third: false })).toEqual([3]);
    expect(inferAssistChain('FC', 6, { first: true, second: false, third: false })).toEqual([6, 4]);
    expect(inferAssistChain('FC', 5, { first: false, second: true, third: false })).toEqual([5, 5]);
    expect(inferAssistChain('DP', 6, { first: true, second: false, third: false })).toEqual([6, 4, 3]);
    expect(inferAssistChain('DP', 1, { first: true, second: false, third: false })).toEqual([1, 6, 3]);
  });

  test('infers spray-chart fielders for hit depth without changing HRs into fielding plays', () => {
    expect(
      inferPrimaryFielderPositionFromSpray({
        result: '1B',
        direction: 'Left',
        depthIndex: 0,
        depthCount: 7,
      }),
    ).toBe(5);
    expect(
      inferPrimaryFielderPositionFromSpray({
        result: '2B',
        direction: 'Left',
        depthIndex: 6,
        depthCount: 7,
      }),
    ).toBe(7);
    expect(
      inferPrimaryFielderPositionFromSpray({
        result: 'HR',
        direction: 'Center',
        depthIndex: 2,
        depthCount: 3,
      }),
    ).toBeNull();
  });

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

  test('shows a 4-pitch walk quick action for BB and saves pitchesInAtBat = 4', () => {
    const onUpdate = vi.fn();

    render(
      <EnrichmentPanel
        entry={buildEntry('BB')}
        currentEnrichment={{}}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '4P WALK' }));

    expect(onUpdate).toHaveBeenCalledWith('pitchesInAtBat', 4);
  });

  test('does not show the 4-pitch walk quick action for HBP', () => {
    render(
      <EnrichmentPanel
        entry={buildEntry('HBP')}
        currentEnrichment={{}}
        onUpdate={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.queryByRole('button', { name: '4P WALK' })).not.toBeInTheDocument();
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

  test('includes FLO in ENRICHMENT_CONFIG with FO parity', () => {
    expect(ENRICHMENT_CONFIG.FLO).toEqual({
      spray: true,
      sprayZones: 27,
      chase: true,
      fieldingAttempt: true,
      playMechanic: true,
      contactType: true,
      modifiers: ENRICHMENT_CONFIG.FO.modifiers,
      hrDistance: false,
    });
  });

  test('[M2-2] gives HR robbery-only fielding enrichment and ITPHR full hit enrichment', () => {
    expect(ENRICHMENT_CONFIG.HR).toMatchObject({
      chase: true,
      fieldingAttempt: true,
      playMechanic: false,
      contactType: true,
      hrDistance: true,
    });

    expect(ENRICHMENT_CONFIG.ITPHR).toEqual({
      spray: true,
      sprayZones: 42,
      chase: true,
      fieldingAttempt: true,
      playMechanic: true,
      contactType: true,
      modifiers: ENRICHMENT_CONFIG['1B'].modifiers,
      hrDistance: false,
    });
  });

  test('[M3-4] shows chase for swinging results and hides it for called-strike or no-swing results', () => {
    expect(ENRICHMENT_CONFIG.K.chase).toBe(true);
    expect(ENRICHMENT_CONFIG.Kc.chase).toBe(false);
    expect(ENRICHMENT_CONFIG.BB.chase).toBe(false);
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

  test('[M2-2] limits HR fielding options to robbery-related play types', () => {
    const onUpdate = vi.fn();

    render(
      <EnrichmentPanel
        entry={buildEntry('HR')}
        currentEnrichment={{}}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Fielding Attempt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Failed Robbery' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Robbed HR' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Wall Catch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Missed Dive' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Routine' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Diving' })).not.toBeInTheDocument();
    expect(screen.queryByText('Play Mechanic')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Failed Robbery' }));

    expect(onUpdate).toHaveBeenCalledWith('fieldingAttemptType', 'robbed_hr');
    expect(onUpdate).toHaveBeenCalledWith('fieldingAttemptOutcome', 'missed');
    expect(onUpdate).toHaveBeenCalledWith('fieldingPlayType', 'failed_robbery');
  });

  test('renders expanded HR spray zones with 27 tappable regions', () => {
    render(
      <EnrichmentPanel
        entry={buildEntry('HR')}
        currentEnrichment={{}}
        onUpdate={() => {}}
        onClose={() => {}}
      />
    );

    expect(document.querySelectorAll('[data-testid^="spray-zone-"]')).toHaveLength(27);
    expect(ENRICHMENT_CONFIG.HR.sprayZones).toBe(27);
  });

  test('renders FO and PO spray charts with 27 zones including 6 foul sub-zones', () => {
    const { unmount } = render(
      <EnrichmentPanel
        entry={buildEntry('FO')}
        currentEnrichment={{}}
        onUpdate={() => {}}
        onClose={() => {}}
      />
    );

    expect(document.querySelectorAll('[data-testid^="spray-zone-"]')).toHaveLength(27);
    expect(document.querySelectorAll('[data-testid^="spray-zone-foul_"]')).toHaveLength(6);

    unmount();

    render(
      <EnrichmentPanel
        entry={buildEntry('PO')}
        currentEnrichment={{}}
        onUpdate={() => {}}
        onClose={() => {}}
      />
    );

    expect(document.querySelectorAll('[data-testid^="spray-zone-"]')).toHaveLength(27);
    expect(document.querySelectorAll('[data-testid^="spray-zone-foul_"]')).toHaveLength(6);
  });

  test('renders LO spray chart with 39 zones including 6 foul sub-zones', () => {
    render(
      <EnrichmentPanel
        entry={buildEntry('LO')}
        currentEnrichment={{}}
        onUpdate={() => {}}
        onClose={() => {}}
      />
    );

    expect(document.querySelectorAll('[data-testid^="spray-zone-"]')).toHaveLength(39);
    expect(document.querySelectorAll('[data-testid^="spray-zone-foul_"]')).toHaveLength(6);
  });

  test('fair line-adjacent hit regions stay in fair buckets rather than foul buckets', () => {
    const leftLineRegion = getSprayRegion('2B', 'd0r6');
    const rightLineRegion = getSprayRegion('2B', 'd5r6');

    expect(resolveSprayRegionForPoint(leftLineRegion.center, '2B')?.storedZone).toBe('Left');
    expect(resolveSprayRegionForPoint(leftLineRegion.center, '2B')?.kind).toBe('fair');
    expect(resolveSprayRegionForPoint(rightLineRegion.center, '2B')?.storedZone).toBe('Right');
    expect(resolveSprayRegionForPoint(rightLineRegion.center, '2B')?.kind).toBe('fair');
  });

  test('HR layout exposes selectable LF pole, dead-center, and RF pole regions', () => {
    expect(resolveSprayRegionForPoint(getSprayRegion('HR', 'd0r2').center, 'HR')?.storedZone).toBe('Left');
    expect(resolveSprayRegionForPoint(getSprayRegion('HR', 'd4r2').center, 'HR')?.storedZone).toBe('Center');
    expect(resolveSprayRegionForPoint(getSprayRegion('HR', 'd8r2').center, 'HR')?.storedZone).toBe('Right');
  });

  test('FO, PO, and LO expose selectable foul polygons on both lines and behind the plate', () => {
    ['FO', 'PO', 'LO'].forEach((result) => {
      expect(resolveSprayRegionForPoint(getSprayRegion(result, 'foul_l_near').center, result)?.storedZone).toBe('Foul-Left');
      expect(resolveSprayRegionForPoint(getSprayRegion(result, 'foul_r_near').center, result)?.storedZone).toBe('Foul-Right');
      expect(resolveSprayRegionForPoint(getSprayRegion(result, 'foul_c_left').center, result)?.storedZone).toBe('Behind-Plate');
    });
  });

  test('[M2-3-fix] selecting a spray zone infers the primary fielder and throw chain', () => {
    const onUpdate = vi.fn();
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { container } = render(
      <EnrichmentPanel
        entry={buildEntry('GO')}
        currentEnrichment={{}}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    clickSvgAtRegion(container, 'GO', 'd0r0');

    expect(onUpdate).toHaveBeenCalledWith(
      'fieldLocation',
      expect.objectContaining({ zone: 'Left' })
    );
    expect(onUpdate).toHaveBeenCalledWith('fieldingSequence', [5, 3]);
    expect(screen.getByRole('combobox', { name: 'Primary Fielder' })).toHaveValue('5');
    expect(consoleLogSpy).toHaveBeenCalledWith('[M2-3-fix] Inferred fielder: 3B');

    consoleLogSpy.mockRestore();
  });

  test('selecting a hit spray zone infers fielding attribution from the selected depth band', () => {
    const onUpdate = vi.fn();
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { container } = render(
      <EnrichmentPanel
        entry={buildEntry('2B')}
        currentEnrichment={{}}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    clickSvgAtRegion(container, '2B', 'd0r6');

    expect(onUpdate).toHaveBeenCalledWith(
      'fieldLocation',
      expect.objectContaining({ zone: 'Left' })
    );
    expect(onUpdate).toHaveBeenCalledWith('fieldingSequence', [7]);
    expect(screen.getByRole('combobox', { name: 'Primary Fielder' })).toHaveValue('7');
    expect(consoleLogSpy).toHaveBeenCalledWith('[M2-3-fix] Inferred fielder: LF');

    consoleLogSpy.mockRestore();
  });

  test('spray location edits preserve rehydrated fielding attribution', () => {
    const onUpdate = vi.fn();

    const { container } = render(
      <EnrichmentPanel
        entry={buildEntry('GO')}
        currentEnrichment={{ fieldingSequence: [6, 3] }}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    clickSvgAtRegion(container, 'GO', 'd0r0');

    expect(onUpdate).toHaveBeenCalledWith(
      'fieldLocation',
      expect.objectContaining({ zone: 'Left' })
    );
    expect(
      onUpdate.mock.calls.some(([field]) => field === 'fieldingSequence')
    ).toBe(false);
    expect(screen.getByRole('combobox', { name: 'Primary Fielder' })).toHaveValue('6');
  });

  test('spray corrections can update auto-inferred fielding after parent syncs the sequence', () => {
    const onUpdate = vi.fn();
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const entry = buildEntry('GO');

    const { container, rerender } = render(
      <EnrichmentPanel
        entry={entry}
        currentEnrichment={{}}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    clickSvgAtRegion(container, 'GO', 'd0r0');
    expect(onUpdate).toHaveBeenCalledWith('fieldingSequence', [5, 3]);

    rerender(
      <EnrichmentPanel
        entry={entry}
        currentEnrichment={{ fieldingSequence: [5, 3] }}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    clickSvgAtRegion(container, 'GO', 'd4r0');

    expect(onUpdate).toHaveBeenCalledWith('fieldingSequence', [3]);
    expect(screen.getByRole('combobox', { name: 'Primary Fielder' })).toHaveValue('3');

    consoleLogSpy.mockRestore();
  });

  test('maps expanded foul-zone taps back to the existing broad persistence buckets', () => {
    const onUpdate = vi.fn();

    const { container } = render(
      <EnrichmentPanel
        entry={buildEntry('FO')}
        currentEnrichment={{}}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    clickSvgAtRegion(container, 'FO', 'foul_l_near');
    clickSvgAtRegion(container, 'FO', 'foul_r_near');
    clickSvgAtRegion(container, 'FO', 'foul_c_left');

    expect(onUpdate).toHaveBeenCalledWith(
      'fieldLocation',
      expect.objectContaining({ zone: 'Foul-Left' })
    );
    expect(onUpdate).toHaveBeenCalledWith(
      'fieldLocation',
      expect.objectContaining({ zone: 'Foul-Right' })
    );
    expect(onUpdate).toHaveBeenCalledWith(
      'fieldLocation',
      expect.objectContaining({ zone: 'Behind-Plate' })
    );
  });

  test('left and right foul zones still infer fielders while behind-plate foul zones do not', () => {
    const onUpdate = vi.fn();

    const { container } = render(
      <EnrichmentPanel
        entry={buildEntry('FO')}
        currentEnrichment={{}}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    clickSvgAtRegion(container, 'FO', 'foul_l_near');
    expect(onUpdate).toHaveBeenCalledWith('fieldingSequence', [7]);

    clickSvgAtRegion(container, 'FO', 'foul_r_near');
    expect(onUpdate).toHaveBeenCalledWith('fieldingSequence', [9]);

    const fieldingSequenceCallCount = onUpdate.mock.calls.filter(
      ([field]) => field === 'fieldingSequence'
    ).length;

    clickSvgAtRegion(container, 'FO', 'foul_c_left');

    expect(
      onUpdate.mock.calls.filter(([field]) => field === 'fieldingSequence')
    ).toHaveLength(fieldingSequenceCallCount);
  });

  test('stores the actual click coordinates instead of snapping the selected point to a region center', () => {
    const onUpdate = vi.fn();
    const { container } = render(
      <EnrichmentPanel
        entry={buildEntry('2B')}
        currentEnrichment={{}}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    // Click at a point squarely inside the left-field fair zone
    clickSvgAtRegion(container, '2B', 'd0r6');
    const region = getSprayRegion('2B', 'd0r6');
    const expectedX = Math.round(region.center.x);
    const expectedY = Math.round(region.center.y);

    expect(onUpdate).toHaveBeenCalledWith(
      'fieldLocation',
      expect.objectContaining({ x: expectedX, y: expectedY, zone: 'Left' })
    );
  });

  test('rehydrated saved locations render the dot at the saved coordinates', () => {
    const region = getSprayRegion('2B', 'd0r6');
    const savedX = Math.round(region.center.x);
    const savedY = Math.round(region.center.y);

    const { container } = render(
      <EnrichmentPanel
        entry={buildEntry('2B')}
        currentEnrichment={{ fieldLocation: { x: savedX, y: savedY, zone: 'Left' } }}
        onUpdate={() => {}}
        onClose={() => {}}
      />
    );

    const dot = container.querySelector('circle[fill="#f59e0b"]');
    expect(dot).toBeTruthy();
    expect(dot!.getAttribute('cx')).toBe(String(savedX * 2));
    expect(dot!.getAttribute('cy')).toBe(String(savedY * 1.2));
  });

  test('coverage regression matrix resolves every region center and rejects out-of-bounds background points', () => {
    ['GO', '2B', 'FO', 'PO', 'LO', 'HR'].forEach((result) => {
      const regions = getSprayRegionsForResult(result);
      regions.forEach((region) => {
        expect(resolveSprayRegionForPoint(region.center, result)?.id).toBe(region.id);
      });

      [
        { x: 2, y: 98 },
        { x: 98, y: 98 },
        { x: 2, y: 10 },
      ].forEach((point) => {
        expect(resolveSprayRegionForPoint(point, result)).toBeNull();
        expect(resolveSprayRegionForPoint(point, result, { allowNearestFallback: true })).toBeNull();
      });
    });
  });

  test('[M2-3-fix] primary fielder dropdown can override the inferred spray-zone selection', () => {
    const onUpdate = vi.fn();
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { container } = render(
      <EnrichmentPanel
        entry={buildEntry('GO')}
        currentEnrichment={{}}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    clickSvgAtRegion(container, 'GO', 'd0r0');
    fireEvent.change(screen.getByRole('combobox', { name: 'Primary Fielder' }), {
      target: { value: '6' },
    });

    expect(onUpdate).toHaveBeenLastCalledWith('fieldingSequence', [6, 3]);
    expect(screen.getByRole('combobox', { name: 'Primary Fielder' })).toHaveValue('6');

    consoleLogSpy.mockRestore();
  });

  test('spray location edits preserve manually selected primary fielder attribution', () => {
    const onUpdate = vi.fn();
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { container } = render(
      <EnrichmentPanel
        entry={buildEntry('GO')}
        currentEnrichment={{}}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    clickSvgAtRegion(container, 'GO', 'd0r0');
    fireEvent.change(screen.getByRole('combobox', { name: 'Primary Fielder' }), {
      target: { value: '6' },
    });
    const fieldingSequenceCallCount = onUpdate.mock.calls.filter(
      ([field]) => field === 'fieldingSequence'
    ).length;

    clickSvgAtRegion(container, 'GO', 'd0r0');

    expect(
      onUpdate.mock.calls.filter(([field]) => field === 'fieldingSequence')
    ).toHaveLength(fieldingSequenceCallCount);
    expect(screen.getByRole('combobox', { name: 'Primary Fielder' })).toHaveValue('6');

    consoleLogSpy.mockRestore();
  });

  test('shows rescued throw control for force-at-first throw chains', () => {
    const onUpdate = vi.fn();

    render(
      <EnrichmentPanel
        entry={buildEntry('GO')}
        currentEnrichment={{ fieldingSequence: [5, 3], fieldingPlayType: 'routine' }}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '1B Rescued Throw' }));

    expect(screen.getByText('Rescued Throw')).toBeInTheDocument();
    expect(onUpdate).toHaveBeenCalledWith('rescuedThrow', true);
  });

  test('shows rescued throw and pivot gem controls for double-play throws to first', () => {
    const onUpdate = vi.fn();

    render(
      <EnrichmentPanel
        entry={buildEntry('DP')}
        currentEnrichment={{ fieldingSequence: [6, 4, 3], fieldingPlayType: 'routine' }}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '1B Rescued Throw' }));
    fireEvent.click(screen.getByRole('button', { name: '2B' }));

    expect(screen.getByText('Extra Gem Credit')).toBeInTheDocument();
    expect(onUpdate).toHaveBeenCalledWith('rescuedThrow', true);
    expect(onUpdate).toHaveBeenCalledWith('extraGemCreditPositions', [4]);
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

  test('[M2-1] shows BT for FC and persists it to the event log when selected', async () => {
    await logAtBatEvent(buildAtBatEvent('FC'));

    const onModifierRecord = vi.fn(async (modifier: string) => {
      const existing = await getAtBatEvent('event-FC');
      if (!existing) {
        throw new Error('Expected FC at-bat to exist in the event log');
      }

      const nextModifiers = [...(existing.enrichment?.modifiers || []), modifier];
      await updateAtBatEvent(existing.eventId, {
        enrichment: { modifiers: nextModifiers },
        version: (existing.version ?? 1) + 1,
      });
    });

    render(
      <EnrichmentPanel
        entry={buildEntry('FC')}
        currentEnrichment={{}}
        onUpdate={() => {}}
        onModifierRecord={(modifier) => void onModifierRecord(modifier)}
        onClose={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: 'BT' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'BT' }));

    await waitFor(async () => {
      expect(onModifierRecord).toHaveBeenCalledWith('BEAT_THROW');
      const persisted = await getAtBatEvent('event-FC');
      expect(persisted?.enrichment?.modifiers).toContain('BEAT_THROW');
    });
  });

  test('[M3-4] toggles chase and logs it from the enrichment panel', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const onUpdate = vi.fn();

    render(
      <EnrichmentPanel
        entry={buildEntry('K')}
        currentEnrichment={{}}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'chase' }));

    expect(onUpdate).toHaveBeenCalledWith('chased', true);

    expect(consoleLogSpy).toHaveBeenCalledWith('[M3-4] Chase toggled: ON', {
      eventId: 'event-K',
      result: 'K',
      chased: true,
    });

    consoleLogSpy.mockRestore();
  });

  test('[M3-4] keeps chased on the at-bat event enrichment payload', () => {
    const event = buildAtBatEvent('K');
    const persisted: AtBatEvent = {
      ...event,
      enrichment: {
        ...(event.enrichment || {}),
        chased: true,
      },
    };

    const roundTrip = JSON.parse(JSON.stringify(persisted)) as AtBatEvent;

    expect(roundTrip.enrichment?.chased).toBe(true);
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
    expect(screen.getByRole('button', { name: 'END' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '1B' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2B' }));

    expect(onUpdate).toHaveBeenCalledWith('evt-1-runner-0', 'toBase', 'second');
  });

  test('runner inning-end destination disables out-only flags', () => {
    const onUpdate = vi.fn();
    const subEntry: RunnerSubEntry = {
      id: 'evt-2-runner-0',
      parentEventId: 'evt-2',
      runnerId: 'runner-2',
      runnerName: 'Freeze Frame',
      fromBase: 'first',
      toBase: 'end',
      isEnrichable: true,
    };

    render(
      <RunnerEnrichmentPanel
        subEntry={subEntry}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: 'Mark TOOTBLAN' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mark Out Advancing' })).toBeDisabled();
  });

  test('[M3-3-universal] shows error attribution controls when a runner outcome crosses the safe/out boundary', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const subEntry: RunnerSubEntry = {
      id: 'evt-2-runner-home',
      parentEventId: 'evt-2',
      runnerId: 'runner-home',
      runnerName: 'Saved At First',
      fromBase: 'first',
      toBase: 'out',
      isEnrichable: true,
    };

    const { rerender } = render(
      <RunnerEnrichmentPanel
        subEntry={subEntry}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText('Error on the play?')).not.toBeInTheDocument();

    rerender(
      <RunnerEnrichmentPanel
        subEntry={{ ...subEntry, toBase: 'second' }}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Error on the play?')).toBeInTheDocument();
    expect(screen.getByLabelText('No Error')).toBeChecked();

    fireEvent.click(screen.getByLabelText('Throwing'));
    rerender(
      <RunnerEnrichmentPanel
        subEntry={{ ...subEntry, toBase: 'second', errorType: 'throwing' }}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'SS(6)' }));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('evt-2-runner-home', 'errorType', 'throwing');
      expect(onUpdate).toHaveBeenCalledWith('evt-2-runner-home', 'errorChargedTo', 6);
    });
  });

  test('[M3-3-v2] shows error attribution controls for scoring runners even without a boundary change', () => {
    const onUpdate = vi.fn();
    const subEntry: RunnerSubEntry = {
      id: 'evt-2-runner-score',
      parentEventId: 'evt-2',
      runnerId: 'runner-score',
      runnerName: 'Dash Home',
      fromBase: 'third',
      toBase: 'home',
      isEnrichable: true,
    };

    render(
      <RunnerEnrichmentPanel
        subEntry={subEntry}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Error on the play?')).toBeInTheDocument();
    expect(screen.getByLabelText('No Error')).toBeChecked();
  });

  test('[M3-3-v2] limits batter correction destinations to OUT and SAFE AT 1B on out-type plays', () => {
    const onUpdate = vi.fn();
    const subEntry: RunnerSubEntry = {
      id: 'evt-5-runner-batter-out',
      parentEventId: 'evt-5',
      runnerId: 'batter-5',
      runnerName: 'Cleanup Hitter',
      fromBase: 'batter',
      toBase: 'out',
      parentResult: 'GO',
      isEnrichable: true,
    };

    render(
      <RunnerEnrichmentPanel
        subEntry={subEntry}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Batter: Cleanup Hitter')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OUT' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SAFE AT 1B' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '2B' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'SAFE AT 1B' }));

    expect(onUpdate).toHaveBeenCalledWith('evt-5-runner-batter-out', 'toBase', 'first');
  });

  test('[M3-1-fix] shows OF hold for an advanced runner and saves explicit hold fields', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const subEntry: RunnerSubEntry = {
      id: 'evt-3-runner-held',
      parentEventId: 'evt-3',
      runnerId: 'runner-3',
      runnerName: 'Holden',
      fromBase: 'first',
      toBase: 'second',
      parentResult: '1B',
      isEnrichable: true,
    };

    expect(PLAY_MECHANIC_OPTIONS.map((option) => option.value)).toContain('hold');
    expect(ENRICHMENT_CONFIG['1B'].playMechanic).toBe(true);

    const { rerender } = render(
      <RunnerEnrichmentPanel
        subEntry={subEntry}
        outfielderByPosition={{
          LF: { playerId: 'fielder-lf', playerName: 'Lefty' },
          CF: { playerId: 'fielder-cf', playerName: 'Center Cut' },
          RF: { playerId: 'fielder-rf', playerName: 'Righty' },
        }}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark Held by OF' }));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('evt-3-runner-held', 'heldByOf', true);
      expect(onUpdate).toHaveBeenCalledWith('evt-3-runner-held', 'baseSaved', '3B');
      expect(onUpdate).toHaveBeenCalledWith('evt-3-runner-held', 'playMechanic', 'hold');
    });

    rerender(
      <RunnerEnrichmentPanel
        subEntry={{ ...subEntry, heldByOf: true, baseSaved: '3B', playMechanic: 'hold' }}
        outfielderByPosition={{
          LF: { playerId: 'fielder-lf', playerName: 'Lefty' },
          CF: { playerId: 'fielder-cf', playerName: 'Center Cut' },
          RF: { playerId: 'fielder-rf', playerName: 'Righty' },
        }}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'RF' }));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('evt-3-runner-held', 'holdingFielder', 'RF');
      expect(onUpdate).toHaveBeenCalledWith('evt-3-runner-held', 'fielderPosition', 'RF');
      expect(onUpdate).toHaveBeenCalledWith('evt-3-runner-held', 'fielderId', 'fielder-rf');
    });
  });

  test('[M3-1-fix] shows OF hold for batter runner sub-entries on extra-base hits', () => {
    const onUpdate = vi.fn();
    const subEntry: RunnerSubEntry = {
      id: 'evt-4-runner-batter',
      parentEventId: 'evt-4',
      runnerId: 'batter-4',
      runnerName: 'Stretch',
      fromBase: 'batter',
      toBase: 'second',
      parentResult: '2B',
      isEnrichable: true,
    };

    render(
      <RunnerEnrichmentPanel
        subEntry={subEntry}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('BAT→2B')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark Held by OF' })).toBeInTheDocument();
  });

  test('runner enrichment distinguishes manager runner calls from OF holds', () => {
    const onUpdate = vi.fn();
    const subEntry: RunnerSubEntry = {
      id: 'evt-4-runner-manager-hold',
      parentEventId: 'evt-4',
      runnerId: 'runner-hold',
      runnerName: 'Freeze',
      fromBase: 'first',
      toBase: 'first',
      parentResult: '1B',
      isEnrichable: true,
    };

    render(
      <RunnerEnrichmentPanel
        subEntry={subEntry}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Manager Runner Call')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hold Runner' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manager Hold' })).not.toBeInTheDocument();
  });

  test('runner enrichment offers hit-and-run on non-batter batted-ball runners and records play-log source', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const subEntry: RunnerSubEntry = {
      id: 'evt-4-runner-hit-run',
      parentEventId: 'evt-4',
      runnerId: 'runner-hr',
      runnerName: 'Break Early',
      fromBase: 'first',
      toBase: 'second',
      parentResult: '1B',
      isEnrichable: true,
    };

    render(
      <RunnerEnrichmentPanel
        subEntry={subEntry}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hit & Run' }));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(
        'evt-4-runner-hit-run',
        'managerRunPlay',
        'hit_and_run',
      );
      expect(onUpdate).toHaveBeenCalledWith(
        'evt-4-runner-hit-run',
        'managerDecisionSource',
        'play_log_enhancement',
      );
    });
  });

  test('runner enrichment does not offer hit-and-run for batter or non-batted-ball entries', () => {
    const onUpdate = vi.fn();

    const { rerender } = render(
      <RunnerEnrichmentPanel
        subEntry={{
          id: 'evt-4-runner-batter-hit-run',
          parentEventId: 'evt-4',
          runnerId: 'batter',
          runnerName: 'Batter',
          fromBase: 'batter',
          toBase: 'first',
          parentResult: '1B',
          isEnrichable: true,
        }}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    expect(screen.queryByRole('button', { name: 'Hit & Run' })).not.toBeInTheDocument();

    rerender(
      <RunnerEnrichmentPanel
        subEntry={{
          id: 'evt-4-runner-walk-hit-run',
          parentEventId: 'evt-4',
          runnerId: 'runner-walk',
          runnerName: 'Runner Walk',
          fromBase: 'first',
          toBase: 'second',
          parentResult: 'BB',
          isEnrichable: true,
        }}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    expect(screen.queryByRole('button', { name: 'Hit & Run' })).not.toBeInTheDocument();
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

  test('[M3-2] shows saved-bases controls for made diving plays and rehydrates current enrichment values', () => {
    const onUpdate = vi.fn();
    const currentEnrichment: NonNullable<AtBatEvent['enrichment']> = {
      fieldingAttemptType: 'diving',
      fieldingAttemptOutcome: 'made',
      fieldingPlayType: 'diving',
      basesSaved: 2,
      savedRun: true,
    };

    render(
      <EnrichmentPanel
        entry={buildEntry('FO')}
        currentEnrichment={currentEnrichment}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Saved Extra Bases')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saved Extra Bases?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2 bases' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '1 base' }));

    expect(onUpdate).toHaveBeenCalledWith('basesSaved', 1);
  });

  test('[M3-2-fix] shows saved-bases controls for missed diving hits and preserves hit-side saved-bases updates', () => {
    const onUpdate = vi.fn();
    const currentEnrichment: NonNullable<AtBatEvent['enrichment']> = {
      fieldingAttemptType: 'diving',
      fieldingAttemptOutcome: 'missed',
      fieldingPlayType: 'missed_dive',
      basesSaved: 1,
      savedRun: false,
    };

    render(
      <EnrichmentPanel
        entry={buildEntry('1B')}
        currentEnrichment={currentEnrichment}
        onUpdate={onUpdate}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Saved Extra Bases')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saved Extra Bases?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 base' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2 bases' }));

    expect(onUpdate).toHaveBeenCalledWith('basesSaved', 2);
  });
});
