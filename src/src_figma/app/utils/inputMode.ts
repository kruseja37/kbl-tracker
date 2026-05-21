import { useEffect, useState } from 'react';

const TOUCH_POINTER_QUERIES = ['(any-pointer: coarse)', '(pointer: coarse)'];

type TouchNavigator = Navigator & {
  maxTouchPoints?: number;
  msMaxTouchPoints?: number;
};

export function isTouchInputAvailable(): boolean {
  if (typeof window === 'undefined') return false;

  const nav = window.navigator as TouchNavigator;
  const maxTouchPoints = nav.maxTouchPoints ?? nav.msMaxTouchPoints ?? 0;
  if (maxTouchPoints > 0) return true;

  if (TOUCH_POINTER_QUERIES.some((query) => window.matchMedia?.(query).matches)) {
    return true;
  }

  return false;
}

export function useTouchInputAvailable(): boolean {
  const [isTouchAvailable, setIsTouchAvailable] = useState(isTouchInputAvailable);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const updateTouchAvailability = () => {
      setIsTouchAvailable(isTouchInputAvailable());
    };

    const mediaQueries = TOUCH_POINTER_QUERIES.map((query) => window.matchMedia?.(query))
      .filter((query): query is MediaQueryList => Boolean(query));

    mediaQueries.forEach((query) => {
      query.addEventListener?.('change', updateTouchAvailability);
      query.addListener?.(updateTouchAvailability);
    });
    const markTouchAvailable = () => {
      setIsTouchAvailable(true);
    };

    window.addEventListener('touchstart', markTouchAvailable, { passive: true, once: true });

    updateTouchAvailability();

    return () => {
      mediaQueries.forEach((query) => {
        query.removeEventListener?.('change', updateTouchAvailability);
        query.removeListener?.(updateTouchAvailability);
      });
      window.removeEventListener('touchstart', markTouchAvailable);
    };
  }, []);

  return isTouchAvailable;
}
