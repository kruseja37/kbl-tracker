import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SnakeGuidePackage } from '../../../../../../engines/snakeGuideTrade';
import { SnakeCommissionerTrade } from '../SnakeCommissionerTrade';
import { SnakeTradeGuide } from '../SnakeTradeGuide';
import type { AskedPickGuideResult, ExecutedAskedPickTrade } from '../tradeGuideModel';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const teams = [
  { id: 'buyer', name: 'Kodiaks' },
  { id: 'seller', name: 'Comets' },
];
const proposal: SnakeGuidePackage & { sellerPremium: number } = {
  buyerTeamId: 'buyer', sellerTeamId: 'seller', targetPick: 9,
  offerPickNumbers: [14, 41], receivePickNumbers: [9, 62],
  offerValue: 180, receiveValue: 180, sellerPremium: 777, sessionRevision: 7,
};
const answer: AskedPickGuideResult = {
  message: 'OFFER 14+41; RECEIVE 9+62 — guide-matched and legal now.',
  proposal,
  nextPickMoves: [
    { teamId: 'buyer', before: 14, after: 9 },
    { teamId: 'seller', before: 9, after: 14 },
  ],
};
const openOffer = {
  id: 'offer-1', phase: 'MLB' as const,
  buyerTeamId: 'buyer', sellerTeamId: 'seller', targetPick: 9,
  offerPickNumbers: [14, 41], receivePickNumbers: [9, 62],
  offerValue: 180, receiveValue: 180, sellerPremium: 777, postedSessionRevision: 7,
  buyerNod: true, sellerNod: true, postedAt: '2026-07-12T12:00:00.000Z',
};

describe('S4 guide surfaces', () => {
  it('keeps every guide and commissioner control at the 44px touch target', () => {
    const guide = render(<SnakeTradeGuide
      teams={teams}
      fixedBuyerTeamId="buyer"
      pickValueChart={[{ pick: 9, value: 150 }]}
      sessionRevision={7}
      prefill={{ key: 'touch-prefill', result: answer }}
      openOffers={[{ ...openOffer, buyerNod: false }]}
      onAsk={vi.fn()}
      onPost={vi.fn()}
      onNod={vi.fn()}
      onClose={vi.fn()}
    />);
    for (const control of guide.container.querySelectorAll('button, input, select, summary')) {
      expect(control).toHaveClass('min-h-11');
    }
    guide.unmount();

    const commissioner = render(<SnakeCommissionerTrade
      teams={teams}
      ownedPicksByTeamId={{ buyer: [14, 41], seller: [9, 62] }}
      sessionRevision={7}
      openOffers={[{ ...openOffer, buyerNod: false, sellerNod: false }]}
      onAsk={vi.fn()}
      onPost={vi.fn()}
      onNod={vi.fn()}
      onClose={vi.fn()}
      onExecute={vi.fn()}
    />);
    for (const control of commissioner.container.querySelectorAll('button, input, select, summary')) {
      expect(control).toHaveClass('min-h-11');
    }
  });

  it('shows the full posted chart but asks the engine about only the typed pick', async () => {
    const onAsk = vi.fn().mockResolvedValue(answer);
    const { container } = render(<SnakeTradeGuide
      teams={teams}
      fixedBuyerTeamId="buyer"
      pickValueChart={[{ pick: 1, value: 200 }, { pick: 2, value: 190 }, { pick: 9, value: 150 }]}
      sessionRevision={7}
      onAsk={onAsk}
    />);
    expect(screen.getByText('PICK 1')).toBeInTheDocument();
    expect(screen.getByText('PICK 2')).toBeInTheDocument();
    expect(screen.getByText('PICK 9')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('WHAT WOULD IT COST TO REACH PICK N?'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'CHECK PICK 9' }));
    await waitFor(() => expect(onAsk).toHaveBeenCalledWith('buyer', 9));
    expect(screen.getByText(answer.message)).toBeInTheDocument();
    expect(screen.getByTestId('trade-value-card')).toHaveTextContent('WITH COMETS');
    expect(screen.getByTestId('trade-value-card')).toHaveTextContent('YOU GIVE#14 + #41');
    expect(screen.getByTestId('trade-value-card')).toHaveTextContent('YOU GET#9 + #62');
    expect(screen.getByTestId('trade-value-card')).toHaveTextContent('OFFER TOTAL$180');
    expect(screen.getByTestId('trade-value-card')).toHaveTextContent('RECEIVE TOTAL$180');
    expect(screen.getByTestId('trade-value-card')).toHaveTextContent('SELLER PREMIUM$777');
    expect(container.textContent).not.toMatch(/suggested target|best target|recommended target|%/i);
  });

  it('renders a legacy missing premium as unavailable and preserves buyer/seller orientation', () => {
    const { sellerPremium: _legacyMissing, ...legacyOffer } = openOffer;
    expect(_legacyMissing).toBe(777);
    const view = render(<SnakeTradeGuide
      teams={teams}
      fixedBuyerTeamId="buyer"
      pickValueChart={[{ pick: 9, value: 150 }]}
      sessionRevision={7}
      onAsk={vi.fn()}
      openOffers={[legacyOffer]}
    />);
    expect(screen.getByTestId('trade-value-card')).toHaveTextContent('WITH COMETS');
    expect(screen.getByTestId('trade-value-card')).toHaveTextContent('YOU GIVE#14 + #41');
    expect(screen.getByTestId('trade-value-card')).toHaveTextContent('YOU GET#9 + #62');
    expect(screen.getByTestId('trade-value-card')).toHaveTextContent('SELLER PREMIUMUNAVAILABLE');

    view.rerender(<SnakeTradeGuide
      teams={teams}
      fixedBuyerTeamId="seller"
      pickValueChart={[{ pick: 9, value: 150 }]}
      sessionRevision={7}
      onAsk={vi.fn()}
      openOffers={[legacyOffer]}
    />);
    expect(screen.getByTestId('trade-value-card')).toHaveTextContent('WITH KODIAKS');
    expect(screen.getByTestId('trade-value-card')).toHaveTextContent('YOU GIVE#9 + #62');
    expect(screen.getByTestId('trade-value-card')).toHaveTextContent('YOU GET#14 + #41');
    expect(screen.getByTestId('trade-value-card')).toHaveTextContent('SELLER PREMIUMUNAVAILABLE');
  });

  it('posts a checked package, then executes only the durable offer after both clubs nod', async () => {
    const onAsk = vi.fn().mockResolvedValue(answer);
    const onPost = vi.fn().mockResolvedValue(undefined);
    const onNod = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn().mockResolvedValue(undefined);
    const executed: ExecutedAskedPickTrade = {
      valid: true,
      message: 'Guide-matched and legal now.',
      session: {} as ExecutedAskedPickTrade['session'],
      livePickMoved: false,
      receipts: [],
    };
    const onExecute = vi.fn().mockResolvedValue(executed);
    const { rerender } = render(<SnakeCommissionerTrade
      teams={teams}
      ownedPicksByTeamId={{ buyer: [14, 41], seller: [9, 62] }}
      sessionRevision={7}
      onAsk={onAsk}
      onPost={onPost}
      onNod={onNod}
      onClose={onClose}
      onExecute={onExecute}
    />);
    fireEvent.change(screen.getByLabelText('BUYING CLUB'), { target: { value: 'buyer' } });
    fireEvent.change(screen.getByLabelText('SELLING CLUB'), { target: { value: 'seller' } });
    fireEvent.change(screen.getByLabelText('TARGET PICK'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'CHECK THE GUIDE' }));
    await screen.findByText(answer.message);
    expect(screen.getByText('KODIAKS NEXT PICK MOVES: #14 → #9')).toBeInTheDocument();
    expect(screen.getByText('COMETS NEXT PICK MOVES: #9 → #14')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'POST OFFER' }));
    await waitFor(() => expect(onPost).toHaveBeenCalledWith(proposal));

    rerender(<SnakeCommissionerTrade
      teams={teams}
      ownedPicksByTeamId={{ buyer: [14, 41], seller: [9, 62] }}
      sessionRevision={7}
      openOffers={[openOffer]}
      onAsk={onAsk}
      onPost={onPost}
      onNod={onNod}
      onClose={onClose}
      onExecute={onExecute}
    />);
    expect(screen.getByText('KODIAKS ↔ COMETS')).toBeInTheDocument();
    expect(screen.getByTestId('trade-value-card')).toHaveTextContent('YOU GIVE#14 + #41');
    expect(screen.getByTestId('trade-value-card')).toHaveTextContent('YOU GET#9 + #62');
    expect(screen.getByTestId('trade-value-card')).toHaveTextContent('OFFER TOTAL$180');
    expect(screen.getByTestId('trade-value-card')).toHaveTextContent('RECEIVE TOTAL$180');
    fireEvent.click(screen.getByRole('button', { name: 'EXECUTE TRADE' }));
    await waitFor(() => expect(onExecute).toHaveBeenCalledWith(openOffer));
  });

  it('reports a stale durable execution verbatim and routes decline through the parent writer', async () => {
    const onAsk = vi.fn().mockResolvedValue(answer);
    const onPost = vi.fn().mockResolvedValue(undefined);
    const onNod = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn().mockResolvedValue(undefined);
    const onExecute = vi.fn().mockResolvedValue({
      valid: false, message: 'The draft moved on — refresh.', session: null,
      livePickMoved: false, receipts: [],
    } satisfies ExecutedAskedPickTrade);
    render(<SnakeCommissionerTrade
      teams={teams}
      ownedPicksByTeamId={{ buyer: [14, 41], seller: [9, 62] }}
      sessionRevision={7}
      openOffers={[openOffer]}
      onAsk={onAsk}
      onPost={onPost}
      onNod={onNod}
      onClose={onClose}
      onExecute={onExecute}
    />);
    fireEvent.click(screen.getByRole('button', { name: 'EXECUTE TRADE' }));
    expect(await screen.findByText('The draft moved on — refresh.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'DECLINE' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(openOffer.id, 'DECLINED'));
    expect(await screen.findByRole('status')).toHaveTextContent('THE OFFER IS DECLINED.');
  });

  it('turns guide write rejections into visible status and refreshes the room', async () => {
    const failure = new Error('The draft moved on — refresh.');
    const onFailure = vi.fn().mockResolvedValue(undefined);
    const onAsk = vi.fn().mockResolvedValue(answer);
    const onPost = vi.fn().mockRejectedValue(failure);
    const onNod = vi.fn().mockRejectedValue(failure);
    const onClose = vi.fn().mockRejectedValue(failure);
    render(<SnakeTradeGuide
      teams={teams}
      fixedBuyerTeamId="buyer"
      pickValueChart={[{ pick: 9, value: 150 }]}
      sessionRevision={7}
      onAsk={onAsk}
      onPost={onPost}
      openOffers={[{ ...openOffer, buyerNod: false }]}
      onNod={onNod}
      onClose={onClose}
      onFailure={onFailure}
    />);

    fireEvent.change(screen.getByLabelText('WHAT WOULD IT COST TO REACH PICK N?'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'CHECK PICK 9' }));
    await screen.findByText(answer.message);
    fireEvent.click(screen.getByRole('button', { name: 'POST OFFER' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('THE DRAFT MOVED ON — REFRESH.'));

    fireEvent.click(screen.getByRole('button', { name: 'NOD' }));
    await waitFor(() => expect(onNod).toHaveBeenCalledWith(openOffer.id, 'buyer'));
    fireEvent.click(screen.getByRole('button', { name: 'WITHDRAW' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(openOffer.id, 'WITHDRAWN'));
    expect(onFailure).toHaveBeenCalledTimes(3);
  });

  it('turns commissioner trade rejections into visible status and refreshes the room', async () => {
    const failure = new Error('Room revision changed');
    const onFailure = vi.fn().mockResolvedValue(undefined);
    const onNod = vi.fn().mockRejectedValue(failure);
    const onClose = vi.fn().mockRejectedValue(failure);
    const onExecute = vi.fn().mockRejectedValue(failure);
    render(<SnakeCommissionerTrade
      teams={teams}
      ownedPicksByTeamId={{ buyer: [14, 41], seller: [9, 62] }}
      sessionRevision={7}
      openOffers={[{ ...openOffer, buyerNod: false, sellerNod: false }]}
      onAsk={vi.fn().mockResolvedValue(answer)}
      onPost={vi.fn().mockRejectedValue(failure)}
      onNod={onNod}
      onClose={onClose}
      onExecute={onExecute}
      onFailure={onFailure}
    />);

    fireEvent.click(screen.getByRole('button', { name: 'BUYER NOD' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ROOM REVISION CHANGED'));
    fireEvent.click(screen.getByRole('button', { name: 'DECLINE' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(openOffer.id, 'DECLINED'));
    expect(onFailure).toHaveBeenCalledTimes(2);
  });

  it('prefills an exact verified package without asking or posting and clears it before paint', () => {
    const onAsk = vi.fn();
    const onPost = vi.fn();
    const prefill = { key: 'prefill-7', result: answer as typeof answer & { proposal: SnakeGuidePackage } };
    const view = render(<SnakeTradeGuide
      teams={teams}
      fixedBuyerTeamId="buyer"
      pickValueChart={[{ pick: 9, value: 150 }]}
      sessionRevision={7}
      prefill={prefill}
      onAsk={onAsk}
      onPost={onPost}
    />);
    expect(screen.getByLabelText('WHAT WOULD IT COST TO REACH PICK N?')).toHaveValue(9);
    expect(screen.getByText(answer.message)).toBeInTheDocument();
    expect(onAsk).not.toHaveBeenCalled();
    expect(onPost).not.toHaveBeenCalled();

    view.rerender(<SnakeTradeGuide
      teams={teams}
      fixedBuyerTeamId="buyer"
      pickValueChart={[{ pick: 9, value: 150 }]}
      sessionRevision={8}
      prefill={prefill}
      onAsk={onAsk}
      onPost={onPost}
    />);
    expect(screen.getByLabelText('WHAT WOULD IT COST TO REACH PICK N?')).toHaveValue(null);
    expect(screen.queryByText(answer.message)).not.toBeInTheDocument();
    expect(onPost).not.toHaveBeenCalled();

    view.rerender(<SnakeTradeGuide
      teams={teams}
      fixedBuyerTeamId="seller"
      pickValueChart={[{ pick: 9, value: 150 }]}
      sessionRevision={7}
      prefill={prefill}
      onAsk={onAsk}
      onPost={onPost}
    />);
    expect(screen.queryByText(answer.message)).not.toBeInTheDocument();
    expect(screen.getByLabelText('WHAT WOULD IT COST TO REACH PICK N?')).toHaveValue(null);

    view.rerender(<SnakeTradeGuide
      teams={teams}
      fixedBuyerTeamId="buyer"
      pickValueChart={[{ pick: 9, value: 150 }]}
      sessionRevision={7}
      prefill={null}
      onAsk={onAsk}
      onPost={onPost}
    />);
    expect(screen.queryByText(answer.message)).not.toBeInTheDocument();
    expect(onAsk).not.toHaveBeenCalled();
    expect(onPost).not.toHaveBeenCalled();
  });

  it.each([
    ['team switch', { fixedBuyerTeamId: 'seller' }],
    ['revision switch', { sessionRevision: 8 }],
    ['claim/private-epoch switch', { privateScopeKey: 'claim-b|epoch-2' }],
  ])('ignores a deferred guide answer after a %s', async (_name, override) => {
    const pending = deferred<AskedPickGuideResult>();
    const onFailure = vi.fn();
    const common = {
      teams,
      fixedBuyerTeamId: 'buyer',
      pickValueChart: [{ pick: 9, value: 150 }],
      sessionRevision: 7,
      privateScopeKey: 'claim-a|epoch-1',
      onAsk: vi.fn(() => pending.promise),
      onFailure,
    };
    const view = render(<SnakeTradeGuide {...common} />);
    fireEvent.change(screen.getByLabelText('WHAT WOULD IT COST TO REACH PICK N?'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'CHECK PICK 9' }));
    view.rerender(<SnakeTradeGuide {...common} {...override} />);
    await act(async () => { pending.resolve(answer); await pending.promise; });
    expect(screen.queryByText(answer.message)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('ignores a deferred guide answer after prefill becomes null or the covered desk unmounts', async () => {
    const pending = deferred<AskedPickGuideResult>();
    const prefill = { key: 'prefill-7', result: answer as typeof answer & { proposal: SnakeGuidePackage } };
    const common = {
      teams, fixedBuyerTeamId: 'buyer', pickValueChart: [{ pick: 9, value: 150 }],
      sessionRevision: 7, privateScopeKey: 'claim-a|epoch-1', onAsk: vi.fn(() => pending.promise),
    };
    const view = render(<SnakeTradeGuide {...common} prefill={prefill} />);
    fireEvent.click(screen.getByRole('button', { name: 'CHECK PICK 9' }));
    view.rerender(<SnakeTradeGuide {...common} prefill={null} />);
    await act(async () => { pending.resolve(answer); await pending.promise; });
    expect(screen.queryByText(answer.message)).not.toBeInTheDocument();

    const coveredPending = deferred<AskedPickGuideResult>();
    view.rerender(<SnakeTradeGuide {...common} onAsk={() => coveredPending.promise} />);
    fireEvent.change(screen.getByLabelText('WHAT WOULD IT COST TO REACH PICK N?'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'CHECK PICK 9' }));
    view.unmount();
    await act(async () => { coveredPending.resolve(answer); await coveredPending.promise; });
    expect(screen.queryByText(answer.message)).not.toBeInTheDocument();
  });

  it('never publishes stale post, nod, or close completions after the private context changes', async () => {
    const postPending = deferred<void>();
    const nodPending = deferred<void>();
    const closePending = deferred<void>();
    const common = {
      teams, fixedBuyerTeamId: 'buyer', pickValueChart: [{ pick: 9, value: 150 }],
      sessionRevision: 7, privateScopeKey: 'claim-a|epoch-1', onAsk: vi.fn(),
      openOffers: [{ ...openOffer, buyerNod: false }],
      onPost: vi.fn(() => postPending.promise),
      onNod: vi.fn(() => nodPending.promise),
      onClose: vi.fn(() => closePending.promise),
    };
    const prefill = { key: 'prefill-7', result: answer as typeof answer & { proposal: SnakeGuidePackage } };
    const view = render(<SnakeTradeGuide {...common} prefill={prefill} />);
    fireEvent.click(screen.getByRole('button', { name: 'POST OFFER' }));
    view.rerender(<SnakeTradeGuide {...common} prefill={null} privateScopeKey="claim-b|epoch-2" />);
    await act(async () => { postPending.resolve(); await postPending.promise; });
    expect(screen.queryByText('THE OFFER IS POSTED.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'NOD' }));
    view.rerender(<SnakeTradeGuide {...common} prefill={null} sessionRevision={8} />);
    await act(async () => { nodPending.resolve(); await nodPending.promise; });
    expect(screen.queryByText('YOUR NOD IS RECORDED.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'WITHDRAW' }));
    view.rerender(<SnakeTradeGuide {...common} prefill={null} fixedBuyerTeamId="seller" />);
    await act(async () => { closePending.resolve(); await closePending.promise; });
    expect(screen.queryByText('THE OFFER IS CLOSED.')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
