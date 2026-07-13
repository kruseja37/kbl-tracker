import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SnakeGuidePackage } from '../../../../../../engines/snakeGuideTrade';
import { SnakeCommissionerTrade } from '../SnakeCommissionerTrade';
import { SnakeTradeGuide } from '../SnakeTradeGuide';
import type { AskedPickGuideResult, ExecutedAskedPickTrade } from '../tradeGuideModel';

const teams = [
  { id: 'buyer', name: 'Kodiaks' },
  { id: 'seller', name: 'Comets' },
];
const proposal: SnakeGuidePackage = {
  buyerTeamId: 'buyer', sellerTeamId: 'seller', targetPick: 9,
  offerPickNumbers: [14, 41], receivePickNumbers: [9, 62],
  offerValue: 180, receiveValue: 180, sessionRevision: 7,
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
  offerValue: 180, receiveValue: 180, postedSessionRevision: 7,
  buyerNod: true, sellerNod: true, postedAt: '2026-07-12T12:00:00.000Z',
};

describe('S4 guide surfaces', () => {
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
    expect(container.textContent).not.toMatch(/suggested target|best target|recommended target|%/i);
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
});
