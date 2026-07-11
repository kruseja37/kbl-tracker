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

  it('lets the commissioner execute or decline one current package and shows both timing costs', async () => {
    const onAsk = vi.fn().mockResolvedValue(answer);
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
      onExecute={onExecute}
    />);
    fireEvent.change(screen.getByLabelText('BUYING CLUB'), { target: { value: 'buyer' } });
    fireEvent.change(screen.getByLabelText('SELLING CLUB'), { target: { value: 'seller' } });
    fireEvent.change(screen.getByLabelText('TARGET PICK'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'CHECK THE GUIDE' }));
    await screen.findByText(answer.message);
    expect(screen.getByText('KODIAKS NEXT PICK MOVES: #14 → #9')).toBeInTheDocument();
    expect(screen.getByText('COMETS NEXT PICK MOVES: #9 → #14')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'EXECUTE TRADE' }));
    await waitFor(() => expect(onExecute).toHaveBeenCalledWith(proposal));

    rerender(<SnakeCommissionerTrade
      teams={teams}
      ownedPicksByTeamId={{ buyer: [14, 41], seller: [9, 62] }}
      sessionRevision={8}
      onAsk={onAsk}
      onExecute={onExecute}
    />);
    expect(screen.queryByText(answer.message)).not.toBeInTheDocument();
  });

  it('refuses a stale execution verbatim and decline withdraws the package', async () => {
    const onAsk = vi.fn().mockResolvedValue(answer);
    const onExecute = vi.fn().mockResolvedValue({
      valid: false, message: 'The draft moved on — refresh.', session: null,
      livePickMoved: false, receipts: [],
    } satisfies ExecutedAskedPickTrade);
    render(<SnakeCommissionerTrade
      teams={teams}
      ownedPicksByTeamId={{ buyer: [14, 41], seller: [9, 62] }}
      sessionRevision={7}
      onAsk={onAsk}
      onExecute={onExecute}
    />);
    fireEvent.change(screen.getByLabelText('BUYING CLUB'), { target: { value: 'buyer' } });
    fireEvent.change(screen.getByLabelText('SELLING CLUB'), { target: { value: 'seller' } });
    fireEvent.change(screen.getByLabelText('TARGET PICK'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'CHECK THE GUIDE' }));
    await screen.findByText(answer.message);
    fireEvent.click(screen.getByRole('button', { name: 'EXECUTE TRADE' }));
    expect(await screen.findByText('The draft moved on — refresh.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'EXECUTE TRADE' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'CHECK THE GUIDE' }));
    await screen.findByText(answer.message);
    fireEvent.click(screen.getByRole('button', { name: 'DECLINE' }));
    expect(screen.queryByText(answer.message)).not.toBeInTheDocument();
  });
});
