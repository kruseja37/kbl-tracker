import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SnakeDraftRoomView, type SnakeDraftRoomViewProps } from '../SnakeDraftRoomView';
import type { Player } from '../../../../../utils/leagueBuilderStorage';
import { buildDraftProfileModel } from '../../../../../utils/draftProfileModel';

const teams = [
  { id: 'a', name: 'Kodiaks', abbreviation: 'KOD', colors: { primary: 'rgb(120, 20, 20)', secondary: 'rgb(240, 220, 180)', accent: 'rgb(20, 80, 120)' }, logoUrl: 'data:image/png;base64,AA==' },
  { id: 'b', name: 'Comets', abbreviation: 'COM', colors: { primary: 'rgb(20, 70, 120)', secondary: 'rgb(230, 230, 220)' } },
];

const candidateProfile = {
  id: 'p1', firstName: 'Sam', lastName: 'Slugger', gender: 'F', age: 24, bats: 'R', throws: 'R',
  primaryPosition: '1B', secondaryPosition: '3B', power: 88, contact: 77, speed: 42, fielding: 61, arm: 70,
  velocity: 0, junk: 0, accuracy: 0, arsenal: [], overallGrade: 'A-', personality: 'Competitive',
  chemistry: 'Spirited', trait1: 'Power vs RHP', trait2: 'Tough Out', playerArchetype: 'Slugger', morale: 50,
  mojo: 'Normal', fame: 0, salary: 1000, leagueAssignments: [],
  hiddenPersonalityModifiers: { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 },
  createdDate: '2026-01-01', lastModified: '2026-01-01', isCustom: true,
} as Player;

function props(overrides: Partial<SnakeDraftRoomViewProps> = {}): SnakeDraftRoomViewProps {
  return {
    teams,
    order: [{ pick: 1, teamId: 'a' }, { pick: 2, teamId: 'b' }, { pick: 3, teamId: 'b', endpoint: true }],
    currentPickIndex: 0,
    ticker: [{ id: 't1', teamId: 'b', text: 'COMETS SELECTED JANE DOE' }],
    rostersByTeamId: { a: [{ id: 'p0', name: 'Al Ready', position: 'SS' }], b: [] },
    ownedPicksByTeamId: { a: [1], b: [2, 3] },
    activeSeatId: 'a',
    candidate: { id: 'p1', name: 'Sam Slugger', position: '1B', consequence: 'You can still finish a legal 22.', privateNote: 'Your top first baseman.' },
    candidateProfile,
    draftActionLabel: 'DRAFT PLAYER',
    paused: false,
    soundsEnabled: true,
    correctionAvailable: false,
    onPauseChange: vi.fn(),
    onRecordPick: vi.fn(),
    onCorrectLatest: vi.fn(),
    onSoundsEnabledChange: vi.fn(),
    ...overrides,
  };
}

describe('SnakeDraftRoomView', () => {
  it('keeps room explainers behind the Help toggle', () => {
    render(<SnakeDraftRoomView {...props()} />);
    expect(screen.queryByText('THE SHARED ROOM STAYS COVERED UNTIL THE CLUB ARMS ITS PICK.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'HELP' }));
    expect(screen.getByText('THE SHARED ROOM STAYS COVERED UNTIL THE CLUB ARMS ITS PICK.')).toBeInTheDocument();
  });

  it('keeps the private desk absent while covered and renders it only after reveal', () => {
    render(<SnakeDraftRoomView {...props({ privateDesk: <div>SECRET BOARD CONTENT</div> })} />);
    expect(screen.queryByText('SECRET BOARD CONTENT')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /REVEAL .* SEAT/ }));
    expect(screen.getByText('SECRET BOARD CONTENT')).toBeInTheDocument();
  });

  it('puts the private desk first in the wide room layout and compacts the sticky ritual rail', () => {
    render(<SnakeDraftRoomView {...props()} />);
    const privateSeat = screen.getByRole('region', { name: 'Private seat' });
    const ritual = screen.getByRole('region', { name: 'Draft ritual' });

    expect(privateSeat.parentElement).toHaveClass('xl:grid-cols-[1fr_400px]');
    expect(privateSeat.compareDocumentPosition(ritual) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(ritual.parentElement).toHaveClass('self-start', 'xl:sticky', 'xl:top-4');
    expect(screen.getByText('KODIAKS IS REVIEWING THE BOARD').parentElement).toHaveClass('min-h-36');
    expect(screen.getByText('KODIAKS IS REVIEWING THE BOARD')).toHaveClass('text-xl');

    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    expect(screen.getByTestId('ritual-card')).toHaveClass('min-h-44', 'p-4');
    expect(screen.getByAltText('Kodiaks logo')).toHaveClass('h-14', 'w-14');
    expect(screen.getByText('THE KODIAKS SELECT…')).toHaveClass('text-lg');
  });

  it('opens the public guide and commissioner trade from separate shared-main buttons', () => {
    render(<SnakeDraftRoomView {...props({
      tradeGuide: <div>PUBLIC POSTED PRICE CHART</div>,
      commissionerTrade: <div>COMMISSIONER EXECUTE OR DECLINE</div>,
    })} />);
    expect(screen.queryByText('PUBLIC POSTED PRICE CHART')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'THE GUIDE' }));
    expect(screen.getByText('PUBLIC POSTED PRICE CHART')).toBeInTheDocument();
    expect(screen.queryByText('COMMISSIONER EXECUTE OR DECLINE')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'TRADE' }));
    expect(screen.queryByText('PUBLIC POSTED PRICE CHART')).not.toBeInTheDocument();
    expect(screen.getByText('COMMISSIONER EXECUTE OR DECLINE')).toBeInTheDocument();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it('keeps the shared ticker neutral and private strings covered', () => {
    render(<SnakeDraftRoomView {...props()} />);
    expect(screen.getByText('COMETS SELECTED JANE DOE')).toBeInTheDocument();
    expect(screen.queryByText('Sam Slugger')).not.toBeInTheDocument();
    expect(screen.queryByText('Your top first baseman.')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/steal|took your/i);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    expect(screen.getByText('Your top first baseman.')).toBeInTheDocument();
  });

  it('auto-covers when the public club lens changes', () => {
    render(<SnakeDraftRoomView {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'COMETS' }));
    expect(screen.queryByText('Your top first baseman.')).not.toBeInTheDocument();
  });

  it('keeps the revealed desk open when the selected candidate changes', () => {
    const { rerender } = render(<SnakeDraftRoomView {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    rerender(<SnakeDraftRoomView {...props({
      candidate: { id: 'p2', name: 'Pat Pitcher', position: 'SP', consequence: 'A different legal finish.', privateNote: 'Selected from rankings.' },
      candidateProfile: { ...candidateProfile, id: 'p2', firstName: 'Pat', lastName: 'Pitcher', primaryPosition: 'SP' },
    })} />);
    expect(screen.getByText('Selected from rankings.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'REVEAL KODIAKS SEAT' })).not.toBeInTheDocument();
  });

  it('opens the selected player shared full profile without a pronoun label', () => {
    render(<SnakeDraftRoomView {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'VIEW FULL PROFILE' }));
    expect(screen.getByText('POW')).toBeInTheDocument();
    expect(screen.getByText('Power vs RHP')).toBeInTheDocument();
    expect(screen.getByText(buildDraftProfileModel(candidateProfile, { revealFull: true }).archetype!)).toBeInTheDocument();
    expect(screen.getByText('Competitive')).toBeInTheDocument();
    expect(screen.getByText('Spirited')).toBeInTheDocument();
    const privateSeatText = screen.getByRole('region', { name: 'Private seat' }).textContent ?? '';
    expect(privateSeatText).not.toMatch(/\b(?:he|she|him|her)\b|pronouns?/i);
  });

  it('renders engine facts and never offers ARM for an illegal candidate', () => {
    render(<SnakeDraftRoomView {...props({ candidate: { id: 'p1', name: 'Sam Slugger', position: '1B', consequence: 'You are short 2 catchers.', blockReason: 'You are short 2 catchers.' } })} />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    expect(screen.getByText('You are short 2 catchers.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'COVER & ARM' })).not.toBeInTheDocument();
  });

  it('renders team colors and logo through the ritual card', () => {
    render(<SnakeDraftRoomView {...props()} />);
    expect(screen.getByAltText('Kodiaks logo in draft order')).toBeInTheDocument();
    expect(screen.getByAltText('Kodiaks logo in club lens')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    const card = screen.getByTestId('ritual-card');
    expect(card).toHaveStyle({ backgroundColor: 'rgb(120, 20, 20)', color: 'rgb(240, 220, 180)' });
    expect(screen.getByAltText('Kodiaks logo')).toBeInTheDocument();
    expect(screen.getByText('THE KODIAKS SELECT…')).toBeInTheDocument();
  });

  it('opens the persisted one-action correction window', () => {
    render(<SnakeDraftRoomView {...props({ correctionAvailable: true })} />);
    fireEvent.click(screen.getByRole('button', { name: 'CORRECT LAST ACTION' }));
    expect(screen.getByText('UNDO THE MOST RECENT ACTION?')).toBeInTheDocument();
  });

  it('records only after the full gavel hold and fires the thock', async () => {
    vi.useFakeTimers();
    const oscillator = { type: 'square', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
    const context = { currentTime: 0, destination: {}, createOscillator: vi.fn(() => oscillator), createGain: vi.fn(() => gain) };
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: vi.fn(function MockAudioContext() { return context; }) });
    const onRecordPick = vi.fn();
    render(<SnakeDraftRoomView {...props({ onRecordPick })} />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'HOLD THE GAVEL' }));
    expect(screen.getByRole('button', { name: 'KEEP HOLDING' })).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(onRecordPick).toHaveBeenCalledWith('p1');
    expect(screen.getByText('PICK RECORDED')).toBeInTheDocument();
    expect(oscillator.start).toHaveBeenCalled();
  });

  it('does not show PICK RECORDED when the page rejects an invalid save', async () => {
    vi.useFakeTimers();
    const onRecordPick = vi.fn().mockRejectedValue(new Error('selected player is no longer available'));
    render(<SnakeDraftRoomView {...props({ onRecordPick })} />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'HOLD THE GAVEL' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(onRecordPick).toHaveBeenCalledWith('p1');
    expect(screen.queryByText('PICK RECORDED')).not.toBeInTheDocument();
    expect(screen.getByText('PICK NOT SAVED — HOLD THE GAVEL AGAIN')).toBeInTheDocument();
  });

  it('cancels a mid-hold pause without touching the session save', async () => {
    vi.useFakeTimers();
    const saveSession = vi.fn();
    render(<SnakeDraftRoomView {...props({ onRecordPick: saveSession })} />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'HOLD THE GAVEL' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    fireEvent.click(screen.getByRole('button', { name: 'PAUSE' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(saveSession).not.toHaveBeenCalled();
    expect(screen.queryByText('PICK RECORDED')).not.toBeInTheDocument();
  });

  it('shows the recorded beat, removes manual advance, then auto-advances a non-final pick once', async () => {
    vi.useFakeTimers();
    const { rerender } = render(<SnakeDraftRoomView {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'HOLD THE GAVEL' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });

    rerender(<SnakeDraftRoomView {...props({
      activeSeatId: 'b',
      currentPickIndex: 1,
      candidate: { id: 'p2', name: 'Pat Pitcher', position: 'SP', consequence: 'A different legal finish.' },
    })} />);

    expect(screen.getByText('SAM SLUGGER')).toBeInTheDocument();
    expect(screen.getByText('THE KODIAKS SELECT…')).toBeInTheDocument();
    expect(screen.queryByText('PAT PITCHER')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ADVANCE TO NEXT PICK' })).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(screen.queryByText('SAM SLUGGER')).not.toBeInTheDocument();
    expect(screen.getByText('COMETS IS REVIEWING THE BOARD')).toBeInTheDocument();
  });

  it('keeps the recorded beat and its one auto-advance when the next live pick moves', async () => {
    vi.useFakeTimers();
    const { rerender } = render(<SnakeDraftRoomView {...props({ livePickMoveRevision: 0 })} />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'HOLD THE GAVEL' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });

    rerender(<SnakeDraftRoomView {...props({
      activeSeatId: 'b',
      currentPickIndex: 1,
      livePickMoveRevision: 1,
      candidate: { id: 'p2', name: 'Pat Pitcher', position: 'SP', consequence: 'A different legal finish.' },
    })} />);

    expect(screen.getByText('SAM SLUGGER')).toBeInTheDocument();
    expect(screen.queryByText('PAT PITCHER')).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(screen.queryByText('SAM SLUGGER')).not.toBeInTheDocument();
    expect(screen.getAllByText('COMETS IS REVIEWING THE BOARD')).toHaveLength(1);
  });

  it('holds the final recorded beat and opens recap only from VIEW DRAFT RECAP', async () => {
    vi.useFakeTimers();
    const onDraftComplete = vi.fn();
    const finalProps = props({ order: [{ pick: 1, teamId: 'a' }], onDraftComplete });
    const { rerender } = render(<SnakeDraftRoomView {...finalProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'HOLD THE GAVEL' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    rerender(<SnakeDraftRoomView {...finalProps} currentPickIndex={1} candidate={null} />);

    expect(onDraftComplete).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(onDraftComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'VIEW DRAFT RECAP' }));
    expect(onDraftComplete).toHaveBeenCalledTimes(1);
  });

  it('cancels a mid-hold live-pick trade without recording', async () => {
    vi.useFakeTimers();
    const saveSession = vi.fn();
    const { rerender } = render(<SnakeDraftRoomView {...props({ onRecordPick: saveSession, tradeRevision: 0 })} />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'HOLD THE GAVEL' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    rerender(<SnakeDraftRoomView {...props({ onRecordPick: saveSession, tradeRevision: 1 })} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(saveSession).not.toHaveBeenCalled();
    expect(screen.getByText('THE LIVE PICK MOVED — REVIEW THE NEW TURN')).toBeInTheDocument();
  });

  it('keeps snipe and danger sounds private until the seat is revealed', () => {
    const oscillator = { type: 'square', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
    const context = { currentTime: 0, destination: {}, createOscillator: vi.fn(() => oscillator), createGain: vi.fn(() => gain) };
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: vi.fn(function MockAudioContext() { return context; }) });
    render(<SnakeDraftRoomView {...props({ privateSnipeKey: 'snipe-1', dangerKey: 'danger-1' })} />);
    expect(oscillator.start).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    expect(oscillator.start).toHaveBeenCalledTimes(8);
  });
});

describe('companion approval room tool (S5 mount stitch)', () => {
  it('opens the companion approval surface from the COMPANIONS button and never renders it unbidden', () => {
    const { unmount } = render(<SnakeDraftRoomView {...props({ companionApproval: <div>APPROVAL-SURFACE</div> })} />);
    expect(screen.queryByText('APPROVAL-SURFACE')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'COMPANIONS' }));
    expect(screen.getByText('APPROVAL-SURFACE')).toBeInTheDocument();
    expect(screen.getByText('COMPANION DEVICES')).toBeInTheDocument();
    unmount();
  });
});
