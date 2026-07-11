import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSeatReveal } from '../useSeatReveal';

describe('useSeatReveal', () => {
  it('fails closed and auto-covers on pick, trade, lens, and seat changes', () => {
    const { result, rerender } = renderHook(
      ({ seatId, pickKey, tradeKey, lensId }) => useSeatReveal({ seatId, pickKey, tradeKey, lensId }),
      { initialProps: { seatId: 'a', pickKey: '1', tradeKey: '0', lensId: 'a' } },
    );
    expect(result.current.revealed).toBe(false);
    act(() => result.current.reveal());
    expect(result.current.revealed).toBe(true);

    rerender({ seatId: 'a', pickKey: '2', tradeKey: '0', lensId: 'a' });
    expect(result.current.revealed).toBe(false);
    act(() => result.current.reveal());
    rerender({ seatId: 'a', pickKey: '2', tradeKey: '1', lensId: 'a' });
    expect(result.current.revealed).toBe(false);
    act(() => result.current.reveal());
    rerender({ seatId: 'a', pickKey: '2', tradeKey: '1', lensId: 'b' });
    expect(result.current.revealed).toBe(false);
    act(() => result.current.reveal());
    rerender({ seatId: 'b', pickKey: '2', tradeKey: '1', lensId: 'b' });
    expect(result.current.revealed).toBe(false);
  });
});
