import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SnakeResponsivePreview } from '../../app/pages/SnakeResponsivePreview';
import { SNAKE_BOARD_SLOT_IDS } from '../../../utils/leagueBuilderStorage';
import {
  PREVIEW_CANDIDATES,
  createPreviewBoard,
  previewBoardPlayerIds,
  previewPlanBill,
  previewSelectedConsequence,
} from '../../app/pages/snakeResponsivePreviewFixture';

describe('SnakeResponsivePreview', () => {
  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState({}, '', '/');
  });

  it('is a covered, stateful main-room test drive', () => {
    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=main');
    render(<SnakeResponsivePreview />);

    expect(screen.queryByTestId('private-draft-desk')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL BEEWOLVES SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getByRole('button', { name: /^SELECT SAM SLUGGER/ }));
    expect(screen.getByTestId('selected-player-action-strip')).toHaveTextContent('Sam Slugger');

    fireEvent.change(screen.getByRole('searchbox', { name: 'FIND PLAYER' }), { target: { value: 'taylor utility' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send TAYLOR UTILITY to top' }));
    fireEvent.click(screen.getByRole('button', { name: 'MY BOARD' }));
    expect(screen.getByTestId('my-board-view')).toHaveTextContent('TAYLOR UTILITY');
    fireEvent.click(screen.getByRole('button', { name: 'ASST GM BOARD' }));
    expect(screen.getByTestId('assistant-board-panel')).toHaveTextContent('ASST GM 22');
    expect(screen.getByTestId('assistant-board-panel')).toHaveTextContent('QUINN VERSATILE');

    fireEvent.change(screen.getByRole('combobox', { name: 'TEAM' }), { target: { value: 'buz' } });
    expect(screen.queryByTestId('private-draft-desk')).not.toBeInTheDocument();
    expect(screen.queryByTestId('selected-player-card')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'REVEAL BUZZARDS SEAT' })).toBeInTheDocument();
  });

  it('starts the companion covered and creates a fresh private epoch on every return', () => {
    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=companion');
    render(<SnakeResponsivePreview />);

    expect(screen.getByTestId('snake-companion-covered')).toBeInTheDocument();
    expect(screen.queryByText('JOVITA PULO')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    const firstEpoch = screen.getByTestId('companion-private-epoch').getAttribute('data-private-epoch');
    expect(screen.getByTestId('private-draft-desk')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'COVER THIS DEVICE' }));
    expect(screen.queryByText('JOVITA PULO')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    expect(screen.getByTestId('companion-private-epoch')).not.toHaveAttribute('data-private-epoch', firstEpoch);
  });

  it('clears old-epoch companion choices on cover while preserving the durable board', () => {
    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=companion');
    render(<SnakeResponsivePreview />);

    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    const firstEpoch = screen.getByTestId('companion-private-epoch').getAttribute('data-private-epoch');
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getByRole('button', { name: /^SELECT TAYLOR UTILITY/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Send TAYLOR UTILITY to top' }));
    fireEvent.click(screen.getByRole('button', { name: 'OPTIMIZE AROUND' }));
    expect(screen.getByTestId('assistant-optimization-result')).toHaveTextContent('OPTIMIZED FOR TAYLOR UTILITY');
    fireEvent.click(screen.getByRole('button', { name: 'TRADE TO #19' }));
    fireEvent.click(screen.getByRole('button', { name: 'COVER THIS DEVICE' }));
    expect(screen.queryByText('TAYLOR UTILITY')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    expect(screen.getByTestId('companion-private-epoch')).not.toHaveAttribute('data-private-epoch', firstEpoch);
    expect(screen.getByTestId('selected-player-action-strip')).toHaveTextContent('Jovita Pulo');
    expect(screen.queryByTestId('assistant-optimization-result')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'REVERT' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'MY BOARD' }));
    expect(screen.getByTestId('my-board-view')).toHaveTextContent('TAYLOR UTILITY');
    fireEvent.click(screen.getByRole('button', { name: 'TRADE PICKS' }));
    expect(screen.getByRole('spinbutton', { name: 'WHAT WOULD IT COST TO REACH PICK N?' })).toHaveValue(null);
  });

  it('previews the exact legal Keep/refit result for every available off-board candidate', () => {
    for (const unavailable of [new Set<string>(), new Set(['core-c', 'core-ss'])]) {
      const board = createPreviewBoard(unavailable);
      const beforePlayerIds = previewBoardPlayerIds(board);
      const beforeIds = new Set(beforePlayerIds);
      for (const candidate of PREVIEW_CANDIDATES.filter((entry) => !unavailable.has(entry.id) && !beforeIds.has(entry.id))) {
        const consequence = previewSelectedConsequence({
          board,
          selectedPlayerId: candidate.id,
          teamId: 'bew',
          privateEpoch: 4,
          unavailablePlayerIds: unavailable,
        });
        expect(consequence.status, candidate.name).toBe('ready');
        if (consequence.status !== 'ready') continue;
        const afterPlayerIds = previewBoardPlayerIds(consequence.board);
        const afterIds = new Set(afterPlayerIds);
        expect(afterPlayerIds, candidate.name).toContain(candidate.id);
        expect(afterPlayerIds.some((playerId) => unavailable.has(playerId)), candidate.name).toBe(false);
        expect(afterPlayerIds.filter((playerId) => !beforeIds.has(playerId)), candidate.name).toEqual([candidate.id]);
        expect(beforePlayerIds.filter((playerId) => !afterIds.has(playerId)), candidate.name).toEqual([consequence.displacedPlayerId]);
        expect(consequence.reassignedSlotIds, candidate.name).toEqual(
          SNAKE_BOARD_SLOT_IDS.filter((slotId) => board.slots[slotId] !== consequence.board.slots[slotId]),
        );
        expect(consequence.after.ledger, candidate.name).toMatchObject({
          salary: previewPlanBill(consequence.board).planCost,
          tax: previewPlanBill(consequence.board).planTax,
          allIn: previewPlanBill(consequence.board).planCost + previewPlanBill(consequence.board).planTax,
        });
      }
      expect(previewSelectedConsequence({
        board,
        selectedPlayerId: beforePlayerIds[0],
        teamId: 'bew',
        privateEpoch: 4,
        unavailablePlayerIds: unavailable,
      }).status).toBe('already-on-board');
    }
  });

  it('never exposes a gavel to the revealed off-clock club', () => {
    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=main');
    render(<SnakeResponsivePreview />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL BEEWOLVES SEAT' }));
    expect(screen.queryByRole('button', { name: 'DRAFT PLAYER' })).not.toBeInTheDocument();
  });

  it('marks initial roster players drafted and removes them from both boards', () => {
    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=main');
    render(<SnakeResponsivePreview />);
    fireEvent.change(screen.getByRole('combobox', { name: 'TEAM' }), { target: { value: 'buz' } });
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL BUZZARDS SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    expect(screen.queryByRole('button', { name: /^SELECT CASEY RECEIVER/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'MY BOARD' }));
    expect(screen.getByTestId('my-board-view')).not.toHaveTextContent('CASEY RECEIVER');
    fireEvent.click(screen.getByRole('button', { name: 'ASST GM BOARD' }));
    expect(screen.getByTestId('assistant-board-panel')).not.toHaveTextContent('CASEY RECEIVER');
  });

  it('moves the live pick owner when the exact trade executes', async () => {
    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=main');
    render(<SnakeResponsivePreview />);
    fireEvent.click(screen.getByRole('button', { name: 'TRADE', exact: true }));
    expect(screen.getByRole('region', { name: 'Commissioner trade flow' })).toHaveTextContent('YOU GIVE#20 + #21');
    expect(screen.getByRole('region', { name: 'Commissioner trade flow' })).toHaveTextContent('YOU GET#19 + #22');
    fireEvent.click(screen.getByRole('button', { name: 'BUYER NOD' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'BUYER NODDED' })).toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'SELLER NOD' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'SELLER NODDED' })).toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'EXECUTE TRADE' }));
    await waitFor(() => expect(screen.getByLabelText('Beewolves pick 19')).toHaveAttribute('aria-current', 'step'));
    expect(screen.getByTestId('snake-responsive-preview')).toHaveAttribute('data-trade-revision', '1');
    expect(screen.getByTestId('snake-responsive-preview')).toHaveAttribute('data-current-pick-team', 'bew');
    expect(screen.getByTestId('preview-trade-receipts')).toHaveTextContent('BEW · YOU TRADED PICKS 20+21 FOR 19+22 — YOUR NEXT PICK: #19.');
    expect(screen.getByTestId('preview-trade-receipts')).toHaveTextContent('BUZ · YOU TRADED PICKS 19+22 FOR 20+21 — YOUR NEXT PICK: #20.');
    expect(screen.getByRole('region', { name: 'Selected team public roster' })).toHaveTextContent('19, 22, 24, 36');
    fireEvent.click(screen.getByRole('button', { name: 'CLOSE' }));
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL BEEWOLVES SEAT' }));
    expect(screen.queryByRole('button', { name: 'TRADE TO #19' })).not.toBeInTheDocument();
    expect(screen.queryByText('PICK 19 IS AVAILABLE.')).not.toBeInTheDocument();
  });

  it('runs private and commissioner questions through the real guide with chart-derived totals', async () => {
    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=main');
    render(<SnakeResponsivePreview />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL BEEWOLVES SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'TRADE PICKS' }));
    const privateGuide = screen.getByRole('region', { name: 'The trade guide' });
    const privateTarget = within(privateGuide).getByRole('spinbutton', { name: 'WHAT WOULD IT COST TO REACH PICK N?' });

    fireEvent.change(privateTarget, { target: { value: '20' } });
    fireEvent.click(within(privateGuide).getByRole('button', { name: 'CHECK PICK 20' }));
    await waitFor(() => expect(within(privateGuide).getByText('No legal guide trade reaches pick 20.')).toBeInTheDocument());
    expect(within(privateGuide).queryByText(/RECEIVE 19\+41/)).not.toBeInTheDocument();

    fireEvent.change(privateTarget, { target: { value: '19' } });
    fireEvent.click(within(privateGuide).getByRole('button', { name: 'CHECK PICK 19' }));
    await waitFor(() => expect(within(privateGuide).getByText('OFFER 20+21; RECEIVE 19+22 — guide-matched and legal now.')).toBeInTheDocument());
    fireEvent.click(within(privateGuide).getByText('FULL POSTED PRICE CHART'));
    expect(within(privateGuide).getByText('PICK 19').parentElement).toHaveTextContent('$130');
    expect(within(privateGuide).getByText('PICK 22').parentElement).toHaveTextContent('$124');
    expect(within(privateGuide).getAllByText('$254').length).toBeGreaterThan(1);
    expect(within(privateGuide).getAllByText('$0').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'TRADE', exact: true }));
    const commissioner = screen.getByRole('region', { name: 'Commissioner trade flow' });
    fireEvent.change(within(commissioner).getByRole('combobox', { name: 'BUYING CLUB' }), { target: { value: 'buz' } });
    fireEvent.change(within(commissioner).getByRole('combobox', { name: 'SELLING CLUB' }), { target: { value: 'bew' } });
    fireEvent.change(within(commissioner).getByRole('combobox', { name: 'TARGET PICK' }), { target: { value: '20' } });
    fireEvent.click(within(commissioner).getByRole('button', { name: 'CHECK THE GUIDE' }));
    await waitFor(() => expect(within(commissioner).getByText(/RECEIVE 20/)).toBeInTheDocument());
    expect(within(commissioner).queryByText(/RECEIVE 19\+41/)).not.toBeInTheDocument();
  });

  it('keeps REVERT hidden after a ranking edit that was not a selected-player Keep', () => {
    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=main');
    render(<SnakeResponsivePreview />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL BEEWOLVES SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'FIND PLAYER' }), { target: { value: 'taylor utility' } });
    fireEvent.click(screen.getByRole('button', { name: /^SELECT TAYLOR UTILITY/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Send TAYLOR UTILITY to top' }));
    expect(screen.queryByRole('button', { name: 'REVERT' })).not.toBeInTheDocument();
  });

  it('makes SIGN OUT and FORGET ROOM visible terminal state transitions', () => {
    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=companion');
    render(<SnakeResponsivePreview />);
    fireEvent.click(screen.getByRole('button', { name: 'SIGN OUT' }));
    expect(screen.getByRole('alert')).toHaveTextContent('SIGNED OUT');
    fireEvent.click(screen.getByRole('button', { name: 'FORGET ROOM' }));
    expect(screen.getByRole('alert')).toHaveTextContent('ROOM FORGOTTEN');
  });

  it('enters a visible local recap after the terminal preview pick', async () => {
    vi.useFakeTimers();
    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=main&terminal=1');
    render(<SnakeResponsivePreview />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL BEEWOLVES SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'HOLD THE GAVEL' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(screen.getByTestId('local-draft-recap')).toHaveTextContent('6 PICKS RECORDED');
  });

  it('removes a newly drafted player from every private choice and prevents a duplicate pick', async () => {
    vi.useFakeTimers();
    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=main');
    render(<SnakeResponsivePreview />);
    fireEvent.change(screen.getByRole('combobox', { name: 'TEAM' }), { target: { value: 'buz' } });
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL BUZZARDS SEAT' }));
    expect(screen.getByTestId('selected-player-action-strip')).toHaveTextContent('Max Backstop');
    fireEvent.click(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'HOLD THE GAVEL' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    fireEvent.change(screen.getByRole('combobox', { name: 'TEAM' }), { target: { value: 'bew' } });
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL BEEWOLVES SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    expect(screen.queryByRole('button', { name: /^SELECT MAX BACKSTOP/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'MY BOARD' }));
    expect(screen.getByTestId('my-board-view')).not.toHaveTextContent('MAX BACKSTOP');
    fireEvent.click(screen.getByRole('button', { name: 'ASST GM BOARD' }));
    expect(screen.getByTestId('assistant-board-panel')).not.toHaveTextContent('MAX BACKSTOP');
    expect(screen.queryByRole('button', { name: 'TRADE TO #19' })).not.toBeInTheDocument();
    expect(screen.queryByText('PICK 19 IS AVAILABLE.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'TRADE TO #22' }));
    fireEvent.click(screen.getByRole('button', { name: 'TRADE PICKS' }));
    expect(screen.getByRole('spinbutton', { name: 'WHAT WOULD IT COST TO REACH PICK N?' })).toHaveValue(22);
    expect(screen.getByTestId('drafted-truth-bew')).toHaveTextContent('1/22');
    fireEvent.change(screen.getByRole('combobox', { name: 'TEAM' }), { target: { value: 'buz' } });
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL BUZZARDS SEAT' }));
    expect(screen.getByRole('region', { name: 'Selected team public roster' })).toHaveTextContent('MAX BACKSTOP');
    expect(screen.queryByRole('button', { name: 'DRAFT PLAYER' })).not.toBeInTheDocument();
  });

  it('uses the same roster finance and chemistry truth on main and companion surfaces', () => {
    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=main');
    const main = render(<SnakeResponsivePreview />);
    const mainTruth = screen.getByTestId('drafted-truth-bew').textContent;
    main.unmount();

    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=companion');
    render(<SnakeResponsivePreview />);
    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    expect(screen.getByTestId('companion-drafted-truth-bew').textContent).toBe(mainTruth);
  });

  it('offers REVERT only for the exact last Keep and restores that board', () => {
    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=main');
    render(<SnakeResponsivePreview />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL BEEWOLVES SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getByRole('button', { name: /^SELECT TAYLOR UTILITY/ }));
    fireEvent.click(screen.getByRole('button', { name: 'KEEP ON MY BOARD' }));
    expect(screen.getByRole('button', { name: 'REVERT' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'MY BOARD' }));
    expect(screen.getByTestId('my-board-view')).toHaveTextContent('TAYLOR UTILITY');
    fireEvent.click(screen.getByRole('button', { name: 'REVERT' }));
    expect(screen.queryByRole('button', { name: 'REVERT' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'KEEP ON MY BOARD' })).toBeInTheDocument();
    expect(screen.getByTestId('my-board-view')).not.toHaveTextContent('TAYLOR UTILITY');
  });

  it('clears companion selection, board, assistant, trade, and epoch state on sign out', () => {
    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=companion');
    render(<SnakeResponsivePreview />);
    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    fireEvent.click(screen.getByRole('button', { name: 'PLAYER POOL' }));
    fireEvent.click(screen.getByRole('button', { name: /^SELECT TAYLOR UTILITY/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Send TAYLOR UTILITY to top' }));
    fireEvent.click(screen.getByRole('button', { name: 'OPTIMIZE AROUND' }));
    fireEvent.click(screen.getByRole('button', { name: 'TRADE TO #19' }));
    fireEvent.click(screen.getByRole('button', { name: 'TRADE PICKS' }));
    expect(screen.getByRole('spinbutton', { name: 'WHAT WOULD IT COST TO REACH PICK N?' })).toHaveValue(19);
    fireEvent.click(screen.getByRole('button', { name: 'COVER THIS DEVICE' }));
    fireEvent.click(screen.getByRole('button', { name: 'SIGN OUT' }));
    expect(screen.getByRole('alert')).toHaveTextContent('SIGNED OUT');
    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    expect(screen.getByTestId('companion-private-epoch')).toHaveAttribute('data-private-epoch', '1');
    expect(screen.getByTestId('selected-player-action-strip')).toHaveTextContent('Jovita Pulo');
    fireEvent.click(screen.getByRole('button', { name: 'MY BOARD' }));
    expect(screen.getByTestId('my-board-view')).not.toHaveTextContent('TAYLOR UTILITY');
    fireEvent.click(screen.getByRole('button', { name: 'TRADE PICKS' }));
    expect(screen.getByRole('spinbutton', { name: 'WHAT WOULD IT COST TO REACH PICK N?' })).toHaveValue(null);
  });

  it('exposes responsive companion work panes and no dead correction control', () => {
    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=main');
    const main = render(<SnakeResponsivePreview />);
    expect(screen.queryByRole('button', { name: 'CORRECT LAST ACTION' })).not.toBeInTheDocument();
    main.unmount();

    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=companion');
    render(<SnakeResponsivePreview />);
    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    expect(screen.getByTestId('companion-private-workspace-layout')).toBeInTheDocument();
    expect(screen.getByTestId('companion-selected-player-pane')).toContainElement(screen.getByTestId('selected-player-card'));
    expect(screen.getByTestId('companion-private-workspace-scroll')).toContainElement(screen.getByTestId('private-draft-desk'));
  });

  it('always exposes a visible optimized Assistant GM result on main and companion desks', () => {
    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=main');
    const main = render(<SnakeResponsivePreview />);
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL BEEWOLVES SEAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'OPTIMIZE AROUND' }));
    expect(screen.getByRole('button', { name: 'ASST GM BOARD' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('assistant-optimization-result')).toHaveTextContent('OPTIMIZED FOR JOVITA PULO');
    fireEvent.click(screen.getByRole('button', { name: 'MY BOARD' }));
    fireEvent.click(screen.getByRole('button', { name: 'OPTIMIZE AROUND' }));
    expect(screen.getByRole('button', { name: 'ASST GM BOARD' })).toHaveAttribute('aria-pressed', 'true');
    main.unmount();

    window.history.replaceState({}, '', '/__preview/snake-responsive?surface=companion');
    render(<SnakeResponsivePreview />);
    fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    fireEvent.click(screen.getByRole('button', { name: 'OPTIMIZE AROUND' }));
    expect(screen.getByRole('button', { name: 'ASST GM BOARD' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('assistant-optimization-result')).toHaveTextContent('OPTIMIZED FOR JOVITA PULO');
  });
});
