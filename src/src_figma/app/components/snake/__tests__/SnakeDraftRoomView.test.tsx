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
    ticker: [{ id: 't1', teamId: 'b', text: 'PICK #1 · COMETS SELECTED JANE DOE' }],
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
  it('uses exact neutral team copy without exposing a missing order team id anywhere in the DOM', () => {
    const missingTeamId = 'internal-team-key-42';
    render(<SnakeDraftRoomView {...props({
      order: [{ pick: 1, teamId: missingTeamId }],
      currentPickIndex: 0,
      activeSeatId: null,
      candidate: null,
      candidateProfile: null,
      ticker: [],
    })} />);

    expect(screen.getByText('UNKNOWN TEAM')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(missingTeamId);
    expect(document.body.innerHTML).not.toContain(missingTeamId);
  });

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

  it('keeps public drafted money and chemistry visible while private plan and selected truth stay absent until reveal', () => {
    render(<SnakeDraftRoomView {...props({
      publicTruthByTeamId: {
        a: {
          ledger: { rosterCount: 1, salary: 88_000, tax: 4_000, allIn: 92_000, moneyLeft: 908_000 },
          chemistry: [
            { family: 'CMP', word: 'Competitive', count: 1, tier: 'L1' },
            { family: 'SPI', word: 'Spirited', count: 0, tier: 'L1' },
            { family: 'CRA', word: 'Crafty', count: 0, tier: 'L1' },
            { family: 'SCH', word: 'Scholarly', count: 0, tier: 'L1' },
            { family: 'DIS', word: 'Disciplined', count: 0, tier: 'L1' },
          ],
        },
      },
      privateDesk: <div>PRIVATE PLAN $777,777</div>,
      selectedPlayerCard: <div>PRIVATE FIT STRONG · CHEM 2→3</div>,
    })} />);
    expect(screen.getByTestId('drafted-truth-a')).toHaveTextContent('$88,000');
    expect(screen.getByTestId('drafted-truth-a')).toHaveTextContent('Competitive');
    expect(screen.getByTestId('drafted-truth-a').querySelector('[data-testid="compact-money-grid"]')).not.toBeNull();
    expect(screen.getByLabelText('DRAFTED ROSTER chemistry')).toHaveClass('grid-cols-1');
    expect(screen.queryByText('PRIVATE PLAN $777,777')).not.toBeInTheDocument();
    expect(screen.queryByText('PRIVATE FIT STRONG · CHEM 2→3')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    expect(screen.getByText('PRIVATE PLAN $777,777')).toBeInTheDocument();
    expect(screen.getByText('PRIVATE FIT STRONG · CHEM 2→3')).toBeInTheDocument();
  });

  it('puts the private desk first at iPad width and keeps the ritual rail sticky on wide screens', () => {
    render(<SnakeDraftRoomView {...props()} />);
    const privateSeat = screen.getByRole('region', { name: 'Private seat' });
    const ritual = screen.getByRole('region', { name: 'Draft ritual' });

    expect(privateSeat.parentElement).toHaveClass('xl:grid-cols-[minmax(0,1fr)_minmax(280px,30vw)]');
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

  it('keeps cover, the full selected name, and draft action ahead of profile details and the board', () => {
    render(<SnakeDraftRoomView {...props({
      candidate: { id: 'p1', name: 'Buzz Pastimm', position: 'CF', consequence: 'A legal finish remains.' },
      selectedFitLabel: 'FIT · STRONG FIT',
      selectedPlayerCard: <div data-testid="profile-details">PROFILE RATINGS AND TRAITS</div>,
      privateDesk: <div data-testid="private-board">22-PLAYER BOARD</div>,
    })} />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    const cover = screen.getByRole('button', { name: 'COVER' });
    const fullName = screen.getByRole('heading', { name: 'Buzz Pastimm' });
    const action = screen.getByRole('button', { name: 'DRAFT PLAYER' });
    const profile = screen.getByTestId('profile-details');
    const board = screen.getByTestId('private-board');
    expect(fullName).toHaveClass('break-words');
    expect(cover.compareDocumentPosition(fullName) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(fullName.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(action.compareDocumentPosition(profile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(profile.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('windows the draft order around the active pick and marks the live pick', () => {
    const order = Array.from({ length: 20 }, (_, index) => ({ pick: index + 1, teamId: index % 2 ? 'b' : 'a' }));
    render(<SnakeDraftRoomView {...props({ order, currentPickIndex: 11 })} />);
    expect(screen.getByText('PICKS 10–16 OF 20')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comets pick 12' })).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByRole('button', { name: 'Kodiaks pick 1' })).not.toBeInTheDocument();
  });

  it('uses an explicit full-draft count when the room receives an absolute-pick preview window', () => {
    const order = Array.from({ length: 6 }, (_, index) => ({ pick: index + 19, teamId: index % 2 ? 'a' : 'b' }));
    render(<SnakeDraftRoomView {...props({ order, totalPickCount: 44 })} />);
    expect(screen.getByText('PICKS 19–24 OF 44')).toBeInTheDocument();
  });

  it('opens the pass cover only for the hotseat club on the clock', () => {
    const { rerender } = render(<SnakeDraftRoomView {...props({ hotseatNextName: 'Alex', activeSeatId: 'a' })} />);
    expect(screen.getByRole('dialog')).toHaveTextContent('PASS TO ALEX');
    fireEvent.click(screen.getByRole('button', { name: 'I HAVE THE ROOM' }));
    fireEvent.click(screen.getByRole('button', { name: 'COMETS' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(<SnakeDraftRoomView {...props({ hotseatNextName: 'Alex', activeSeatId: 'b', currentPickIndex: 0 })} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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

  it('uses one private TEAM selector in MLB, removes old private DOM before switching, and keeps pick-window cards public-only', () => {
    const onActiveSeatChange = vi.fn(() => {
      expect(screen.queryByText('KODIAKS SECRET BOARD')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'DRAFT PLAYER' })).not.toBeInTheDocument();
    });
    const view = render(<SnakeDraftRoomView {...props({
      consolidatedMlb: true,
      privateDesk: <div>KODIAKS SECRET BOARD</div>,
      selectedPlayerCard: (draftAction) => <section data-testid="one-selected-card"><h2>Sam Slugger</h2>{draftAction}</section>,
      tradeGuide: <div>SHARED MLB GUIDE MUST NOT RENDER</div>,
      commissionerTrade: <div>COMMISSIONER TRADE STAYS</div>,
      onActiveSeatChange,
    })} />);
    expect(screen.getAllByRole('combobox', { name: 'TEAM' })).toHaveLength(1);
    expect(screen.queryByRole('region', { name: 'Club lens' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kodiaks pick 1' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Kodiaks pick 1')).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByRole('button', { name: 'THE GUIDE' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'CORRECT LAST ACTION' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TRADE' })).toBeInTheDocument();
    expect(screen.getByText('RECENT PICKS').closest('details')).not.toHaveAttribute('open');

    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    expect(screen.getByText('KODIAKS SECRET BOARD')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Sam Slugger' })).toHaveLength(1);
    expect(screen.getByTestId('one-selected-card')).toContainElement(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'TEAM' }), { target: { value: 'b' } });
    expect(onActiveSeatChange).toHaveBeenCalledWith('b');
    expect(screen.queryByText('KODIAKS SECRET BOARD')).not.toBeInTheDocument();

    view.rerender(<SnakeDraftRoomView {...props({
      consolidatedMlb: true,
      activeSeatId: 'b',
      privateDesk: <div>COMETS SECRET BOARD</div>,
      onActiveSeatChange,
    })} />);
    expect(screen.queryByText('COMETS SECRET BOARD')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'REVEAL COMETS SEAT' })).toBeInTheDocument();
  });

  it('contains iPad-width overflow and keeps every persistent MLB control at the 44px target', () => {
    const view = render(<SnakeDraftRoomView {...props({
      consolidatedMlb: true,
      commissionerTrade: <div>COMMISSIONER TRADE</div>,
      companionApproval: <div>COMPANION APPROVAL</div>,
      correctionAvailable: true,
    })} />);
    const expectEveryPersistentControlToBeTouchSafe = () => {
      for (const control of view.container.querySelectorAll('button, select, summary')) {
        expect(control).toHaveClass('min-h-11');
      }
    };
    expect(screen.getByTestId('snake-draft-room')).toHaveClass('min-w-0', 'overflow-x-clip', 'overflow-y-visible');
    expect(screen.getByTestId('room-layout')).toHaveClass('min-w-0');
    expect(screen.getByRole('combobox', { name: 'TEAM' })).toHaveClass('min-h-11');
    expectEveryPersistentControlToBeTouchSafe();
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    expect(screen.getByRole('button', { name: 'DRAFT PLAYER' })).toHaveClass('min-h-11');
    expect(screen.getByRole('button', { name: 'COVER' })).toHaveClass('min-h-11');
    expect(screen.getByLabelText('Commissioner controls').querySelectorAll('button')).not.toHaveLength(0);
    expectEveryPersistentControlToBeTouchSafe();
    fireEvent.click(screen.getByRole('button', { name: 'TRADE' }));
    expectEveryPersistentControlToBeTouchSafe();
    fireEvent.click(screen.getByRole('button', { name: 'COMPANIONS' }));
    expectEveryPersistentControlToBeTouchSafe();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it('keeps the shared ticker neutral and private strings covered', () => {
    render(<SnakeDraftRoomView {...props()} />);
    expect(screen.getByText('PICK #1 · COMETS SELECTED JANE DOE')).toBeInTheDocument();
    expect(screen.queryByText('Sam Slugger')).not.toBeInTheDocument();
    expect(screen.queryByText('Your top first baseman.')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/steal|took your/i);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    expect(screen.getByText('Your top first baseman.')).toBeInTheDocument();
  });

  it('keeps the full numbered pick-by-pick log inside the expandable Recent Picks panel', () => {
    const ticker = Array.from({ length: 12 }, (_, index) => ({
      id: `pick-${index + 1}`,
      teamId: index % 2 === 0 ? 'a' : 'b',
      text: `PICK #${index + 1} · ${index % 2 === 0 ? 'KODIAKS' : 'COMETS'} SELECTED PLAYER ${index + 1}`,
    })).reverse();
    render(<SnakeDraftRoomView {...props({ consolidatedMlb: true, ticker })} />);
    const recent = screen.getByText('RECENT PICKS').closest('details');
    expect(recent).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('RECENT PICKS'));
    expect(recent).toHaveAttribute('open');
    expect(screen.getByText('PICK #12 · COMETS SELECTED PLAYER 12')).toBeInTheDocument();
    expect(screen.getByText('PICK #1 · KODIAKS SELECTED PLAYER 1')).toBeInTheDocument();
  });

  it('auto-covers when the public club lens changes', () => {
    render(<SnakeDraftRoomView {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'COMETS' }));
    expect(screen.queryByText('Your top first baseman.')).not.toBeInTheDocument();
  });

  it('keeps an armed public-only farm ritual alive across club-lens changes', async () => {
    vi.useFakeTimers();
    const onRecordPick = vi.fn();
    render(<SnakeDraftRoomView {...props({ onRecordPick, onActiveSeatChange: undefined })} />);

    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    fireEvent.click(screen.getByRole('button', { name: 'COMETS' }));
    expect(screen.getByRole('button', { name: 'HOLD THE GAVEL' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'KODIAKS' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'HOLD THE GAVEL' }));
    fireEvent.click(screen.getByRole('button', { name: 'COMETS' }));
    expect(screen.getByRole('button', { name: 'KEEP HOLDING' })).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(onRecordPick).toHaveBeenCalledWith('p1');
  });

  it('cancels the armed ritual when a controlled private seat switches clubs', () => {
    const onActiveSeatChange = vi.fn();
    render(<SnakeDraftRoomView {...props({ onActiveSeatChange })} />);

    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    fireEvent.click(screen.getByRole('button', { name: 'COMETS' }));

    expect(onActiveSeatChange).toHaveBeenCalledWith('b');
    expect(screen.queryByRole('button', { name: 'HOLD THE GAVEL' })).not.toBeInTheDocument();
    expect(screen.getByText('KODIAKS IS REVIEWING THE BOARD')).toBeInTheDocument();
  });

  it('cancels an announced ritual when a controlled private seat switches clubs', async () => {
    vi.useFakeTimers();
    const onActiveSeatChange = vi.fn();
    const onRecordPick = vi.fn();
    render(<SnakeDraftRoomView {...props({ onActiveSeatChange, onRecordPick })} />);

    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'HOLD THE GAVEL' }));
    fireEvent.click(screen.getByRole('button', { name: 'COMETS' }));

    expect(onActiveSeatChange).toHaveBeenCalledWith('b');
    expect(screen.queryByRole('button', { name: 'KEEP HOLDING' })).not.toBeInTheDocument();
    expect(screen.getByText('KODIAKS IS REVIEWING THE BOARD')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(onRecordPick).not.toHaveBeenCalled();
  });

  it('controls the private club, removes the old private DOM, and never arms an off-clock desk', () => {
    const onActiveSeatChange = vi.fn();
    const { rerender } = render(<SnakeDraftRoomView {...props({
      privateDesk: <div>KODIAKS SECRET BOARD</div>,
      onActiveSeatChange,
      canDraftFromActiveSeat: true,
    })} />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    expect(screen.getByText('KODIAKS SECRET BOARD')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'COMETS' }));
    expect(onActiveSeatChange).toHaveBeenCalledWith('b');

    rerender(<SnakeDraftRoomView {...props({
      activeSeatId: 'b',
      candidate: { id: 'p2', name: 'Pat Pitcher', position: 'SP', consequence: 'Comets private consequence.', privateNote: 'COMETS SECRET NOTE' },
      privateDesk: <div>COMETS SECRET BOARD</div>,
      onActiveSeatChange,
      canDraftFromActiveSeat: false,
    })} />);
    expect(screen.queryByText('KODIAKS SECRET BOARD')).not.toBeInTheDocument();
    expect(screen.queryByText('COMETS SECRET BOARD')).not.toBeInTheDocument();
    expect(screen.queryByText('COMETS SECRET NOTE')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL COMETS SEAT' }));
    expect(screen.getByText('COMETS SECRET BOARD')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'DRAFT PLAYER' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'KODIAKS' }));
    rerender(<SnakeDraftRoomView {...props({
      activeSeatId: 'a',
      privateDesk: <div>KODIAKS SECRET BOARD</div>,
      onActiveSeatChange,
      canDraftFromActiveSeat: true,
    })} />);
    expect(screen.queryByText('COMETS SECRET BOARD')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    expect(screen.getByRole('button', { name: 'DRAFT PLAYER' })).toBeInTheDocument();
  });

  it('selects the new on-clock private club and keeps it covered when the live pick advances', () => {
    const { rerender } = render(<SnakeDraftRoomView {...props({ privateDesk: <div>KODIAKS SECRET BOARD</div> })} />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    rerender(<SnakeDraftRoomView {...props({
      activeSeatId: 'b',
      currentPickIndex: 1,
      candidate: { id: 'p2', name: 'Pat Pitcher', position: 'SP', consequence: 'Comets consequence.' },
      privateDesk: <div>COMETS SECRET BOARD</div>,
    })} />);
    expect(screen.queryByText('KODIAKS SECRET BOARD')).not.toBeInTheDocument();
    expect(screen.queryByText('COMETS SECRET BOARD')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'REVEAL COMETS SEAT' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Comets' })).toBeInTheDocument();
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

  it('keeps touch panes while exposing semantic hooks for the desktop single-scroll layout', () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    const { rerender } = render(<SnakeDraftRoomView {...props({
      consolidatedMlb: true,
      selectedPlayerCard: <div data-testid="profile-details">PROFILE RATINGS AND TRAITS</div>,
      privateDesk: <div data-testid="private-board">22-PLAYER BOARD</div>,
    })} />);

    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    scrollIntoView.mockClear();
    expect(screen.getByTestId('private-workspace-layout')).toHaveClass(
      'snake-private-workspace',
      'lg:grid-cols-[minmax(280px,0.8fr)_minmax(360px,1.2fr)]',
    );
    expect(screen.getByTestId('selected-player-pane')).toContainElement(screen.getByTestId('profile-details'));
    expect(screen.getByTestId('selected-player-pane')).toHaveClass(
      'sticky',
      'snake-selected-pane',
      'top-3',
      'self-start',
      'lg:top-20',
      'lg:max-h-[calc(100vh-22rem)]',
    );
    expect(screen.getByTestId('private-workspace-scroll')).toContainElement(screen.getByTestId('private-board'));
    expect(screen.getByTestId('private-workspace-scroll')).toHaveClass('overflow-y-auto', 'snake-board-pane');

    rerender(<SnakeDraftRoomView {...props({
      consolidatedMlb: true,
      candidate: { id: 'p2', name: 'Pat Pitcher', position: 'SP', consequence: 'A different legal finish.' },
      selectedPlayerCard: <div data-testid="profile-details">PAT PROFILE RATINGS AND TRAITS</div>,
      privateDesk: <div data-testid="private-board">22-PLAYER BOARD</div>,
    })} />);
    expect(screen.getByText('PAT PROFILE RATINGS AND TRAITS')).toBeInTheDocument();
    expect(scrollIntoView).not.toHaveBeenCalled();
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

  it('uses pick-only ownership and correction copy in FARM without trade language', () => {
    render(<SnakeDraftRoomView {...props({
      draftActionLabel: 'DRAFT PROSPECT',
      correctionAvailable: true,
      tradeGuide: undefined,
      commissionerTrade: undefined,
    })} />);

    expect(screen.getByText('REMAINING PICKS')).toBeInTheDocument();
    expect(screen.queryByText('OWNED, TRADEABLE PICKS')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'THE GUIDE' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'TRADE' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'CORRECT LAST ACTION' }));
    expect(screen.getByText('ONLY THE LATEST PICK CAN BE UNDONE.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/tradeable|pick or trade/i);
  });

  it('does not announce a correction when the durable write is rejected', async () => {
    const onCorrectLatest = vi.fn().mockRejectedValue(new Error('stale correction'));
    render(<SnakeDraftRoomView {...props({ correctionAvailable: true, onCorrectLatest })} />);
    fireEvent.click(screen.getByRole('button', { name: 'CORRECT LAST ACTION' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'UNDO LAST ACTION' })); });
    expect(onCorrectLatest).toHaveBeenCalledTimes(1);
    expect(screen.getByText('UNDO THE MOST RECENT ACTION?')).toBeInTheDocument();
  });

  it('does not render a manual pause control when the draft has no clock', () => {
    render(<SnakeDraftRoomView {...props()} />);
    expect(screen.queryByRole('button', { name: 'PAUSE' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'RESUME ROOM' })).not.toBeInTheDocument();
  });

  it('offers recovery only after an automatic or saved stopped state exists', () => {
    const onPauseChange = vi.fn();
    render(<SnakeDraftRoomView {...props({ paused: true, onPauseChange })} />);
    expect(screen.queryByRole('button', { name: 'PAUSE' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RESUME ROOM' }));
    expect(onPauseChange).toHaveBeenCalledWith(false);
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

  it('supports a full keyboard gavel hold', async () => {
    vi.useFakeTimers();
    const onRecordPick = vi.fn();
    render(<SnakeDraftRoomView {...props({ onRecordPick })} />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL KODIAKS SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    const gavel = screen.getByRole('button', { name: 'HOLD THE GAVEL' });
    fireEvent.keyDown(gavel, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'KEEP HOLDING' })).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(onRecordPick).toHaveBeenCalledWith('p1');
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
    expect(screen.getByText('PICK 1 · Kodiaks')).toBeInTheDocument();
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

  it('mounts a completed room as closed and exposes no seat, candidate, or draft action', () => {
    const onDraftComplete = vi.fn();
    render(<SnakeDraftRoomView {...props({
      currentPickIndex: 3,
      activeSeatId: null,
      canDraftFromActiveSeat: false,
      candidate: null,
      privateDesk: undefined,
      onDraftComplete,
    })} />);

    expect(screen.getByTestId('draft-complete-private-state')).toHaveTextContent('THE BOARD IS CLOSED');
    expect(screen.getByTestId('draft-complete-ritual-state')).toHaveTextContent('THE DRAFT IS COMPLETE');
    expect(screen.queryByRole('button', { name: /REVEAL .* SEAT/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /DRAFT (?:PLAYER|PROSPECT)/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'PAUSE' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'THE GUIDE' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'TRADE' })).not.toBeInTheDocument();
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
