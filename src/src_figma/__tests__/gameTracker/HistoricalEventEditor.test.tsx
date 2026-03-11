import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { HistoricalEventEditor } from '../../app/components/HistoricalEventEditor';
import type { BetweenPlayEvent } from '../../../utils/eventLog';
import type { PlayLogEntry } from '../../app/utils/playLogTypes';

function createEntry(overrides: Partial<PlayLogEntry> = {}): PlayLogEntry {
  return {
    id: 'entry-1',
    eventId: 'bp-1',
    eventType: 'injury',
    editorType: 'context_modifiers',
    visibility: 'default',
    isSelectable: true,
    inningLabel: 'T4',
    batterName: 'Home Starter',
    result: 'INJ',
    resultCategory: 'special',
    rbi: 0,
    runsScored: 0,
    hasFieldingData: false,
    hasLocationData: false,
    hasKType: false,
    hasPitchCount: false,
    hasPitchType: false,
    isEnrichable: false,
    isQAB: false,
    timestamp: 100,
    ...overrides,
  };
}

function createEvent(overrides: Partial<BetweenPlayEvent> = {}): BetweenPlayEvent {
  return {
    eventId: 'bp-1',
    gameId: 'game-1',
    timestamp: 100,
    eventIndex: 1.001,
    type: 'injury',
    version: 1,
    playerStateChange: {
      playerId: 'pitcher-1',
      playerName: 'Home Starter',
      stateType: 'injury',
      previousValue: 'FIT',
      newValue: 'WEAK',
      reason: 'Killed pitcher by Johnson',
      sourceEventType: 'KILLED_PITCHER',
      causedByPlayerName: 'Johnson',
      stayedIn: false,
    },
    ...overrides,
  };
}

describe('HistoricalEventEditor', () => {
  const baseProps = {
    onReturnToLive: vi.fn(),
  };

  test('treats injury rows as annotation-only editors', () => {
    render(
      <HistoricalEventEditor
        {...baseProps}
        entry={createEntry()}
        event={createEvent({ linkedEventId: 'bp-2' })}
        onContextReasonChange={vi.fn()}
        onInjuryStayedInChange={vi.fn()}
      />
    );

    expect(screen.getByText('Fitness changes live on the linked fitness row. Injury rows only own annotation fields.')).toBeInTheDocument();
    expect(screen.getByText('Caused By')).toBeInTheDocument();
    expect(screen.getByText('Johnson')).toBeInTheDocument();
    expect(screen.getByText('Linked Row')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Killed pitcher by Johnson')).toBeInTheDocument();
    expect(screen.queryByText('Value')).not.toBeInTheDocument();
  });

  test('hides injury-note editing on linked killed-pitcher fitness rows', () => {
    render(
      <HistoricalEventEditor
        {...baseProps}
        entry={createEntry({
          eventType: 'fitness_change',
          result: 'FIT',
          batterName: 'Home Starter',
        })}
        event={createEvent({
          type: 'fitness_change',
          linkedEventId: 'bp-1',
          playerStateChange: {
            playerId: 'pitcher-1',
            playerName: 'Home Starter',
            stateType: 'fitness',
            previousValue: 'FIT',
            newValue: 'WEAK',
            reason: 'Killed pitcher by Johnson',
            sourceEventType: 'KILLED_PITCHER',
            causedByPlayerName: 'Johnson',
            stayedIn: false,
          },
        })}
        contextValueOptions={[
          { value: 'STRAINED', label: 'Strained' },
          { value: 'WEAK', label: 'Weak' },
        ]}
        onContextValueChange={vi.fn()}
        onContextReasonChange={vi.fn()}
      />
    );

    expect(screen.getByText('Injury note and stayed-in status live on the linked injury row.')).toBeInTheDocument();
    expect(screen.getByText('Fitness edits sync the linked injury row value.')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Killed pitcher by Johnson')).not.toBeInTheDocument();
  });

  test('renders editable manager-moment and pitch-count system rows', () => {
    const { rerender } = render(
      <HistoricalEventEditor
        {...baseProps}
        entry={createEntry({
          eventType: 'manager_moment',
          result: 'MM',
          batterName: 'Manager Moment',
          visibility: 'system',
        })}
        event={createEvent({
          type: 'manager_moment',
          playerStateChange: undefined,
          managerMoment: {
            leverageIndex: 2.4,
            decisionType: 'pitching_change',
            context: 'High leverage spot',
          },
        })}
        onManagerMomentChange={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('pitching_change')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2.4')).toBeInTheDocument();
    expect(screen.getByDisplayValue('High leverage spot')).toBeInTheDocument();

    rerender(
      <HistoricalEventEditor
        {...baseProps}
        entry={createEntry({
          eventType: 'pitch_count_update',
          result: 'PC',
          batterName: 'Home Starter',
          visibility: 'system',
        })}
        event={createEvent({
          type: 'pitch_count_update',
          playerStateChange: undefined,
          pitchCountUpdate: {
            pitcherId: 'pitcher-1',
            pitchCount: 27,
            timing: 'end_of_half_inning',
          },
        })}
        onPitchCountValueChange={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('27')).toBeInTheDocument();
    expect(screen.getByText('Pitch-count corrections version this row in place without replay.')).toBeInTheDocument();
  });

  test('renders battery attribution controls for wild pitch and passed ball rows', () => {
    const { rerender } = render(
      <HistoricalEventEditor
        {...baseProps}
        entry={createEntry({
          eventType: 'wild_pitch',
          editorType: 'runner',
          result: 'WP',
          batterName: 'Garcia',
        })}
        event={createEvent({
          type: 'wild_pitch',
          playerStateChange: undefined,
          runnerAction: {
            runnerId: 'runner-1',
            runnerName: 'Garcia',
            fromBase: 1,
            toBase: 2,
            outcome: 'safe',
            reason: 'wild_pitch',
          },
          wildPitchOrPassedBall: {
            wpOrPb: 'wild_pitch',
            pitcherId: 'pitcher-1',
            catcherId: 'catcher-1',
            runnersAdvanced: [{ runnerId: 'runner-1', fromBase: 1, toBase: 2 }],
          },
        })}
        pitcherOptions={[
          { id: 'pitcher-1', label: 'Pitcher One' },
          { id: 'pitcher-2', label: 'Pitcher Two' },
        ]}
        onRunnerPitcherChange={vi.fn()}
      />
    );

    expect(screen.getByText('Charged Pitcher')).toBeInTheDocument();
    expect(screen.getByText('Attribution edits reassign credit without replaying the game state.')).toBeInTheDocument();

    rerender(
      <HistoricalEventEditor
        {...baseProps}
        entry={createEntry({
          eventType: 'passed_ball',
          editorType: 'runner',
          result: 'PB',
          batterName: 'Garcia',
        })}
        event={createEvent({
          type: 'passed_ball',
          playerStateChange: undefined,
          runnerAction: {
            runnerId: 'runner-1',
            runnerName: 'Garcia',
            fromBase: 1,
            toBase: 2,
            outcome: 'safe',
            reason: 'passed_ball',
          },
          wildPitchOrPassedBall: {
            wpOrPb: 'passed_ball',
            pitcherId: 'pitcher-1',
            catcherId: 'catcher-1',
            runnersAdvanced: [{ runnerId: 'runner-1', fromBase: 1, toBase: 2 }],
          },
        })}
        pitcherOptions={[
          { id: 'pitcher-1', label: 'Pitcher One' },
        ]}
        catcherOptions={[
          { id: 'catcher-1', label: 'Catcher One' },
          { id: 'catcher-2', label: 'Catcher Two' },
        ]}
        onRunnerPitcherChange={vi.fn()}
        onRunnerCatcherChange={vi.fn()}
      />
    );

    expect(screen.getByText('Charged Catcher')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Catcher One')).toBeInTheDocument();
  });
});
