export function sameDraftSessionSnapshot(
  current: { id: string; lastModified: string; revision?: number; snakeCompanions?: unknown },
  fresh: { id: string; lastModified: string; revision?: number; snakeCompanions?: unknown },
): boolean {
  return fresh.id === current.id
    && fresh.lastModified === current.lastModified
    && (fresh.revision ?? 0) === (current.revision ?? 0)
    && JSON.stringify(fresh.snakeCompanions) === JSON.stringify(current.snakeCompanions);
}

export function startCompanionFreshness(input: {
  pullAndRefresh: () => void | Promise<void>;
  intervalMs?: number;
  windowObject?: Pick<Window, 'setInterval' | 'clearInterval'>;
  documentObject?: Pick<Document, 'addEventListener' | 'removeEventListener' | 'visibilityState'>;
}): () => void {
  const windowObject = input.windowObject ?? window;
  const documentObject = input.documentObject ?? document;
  let inFlight = false;
  let stopped = false;
  const run = () => {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      const result = input.pullAndRefresh();
      if (result && typeof result.then === 'function') {
        void result.then(
          () => { inFlight = false; },
          () => { inFlight = false; },
        );
      } else {
        inFlight = false;
      }
    } catch {
      inFlight = false;
    }
  };
  const timer = windowObject.setInterval(run, input.intervalMs ?? 5_000);
  const onVisibility = () => { if (documentObject.visibilityState === 'visible') run(); };
  documentObject.addEventListener('visibilitychange', onVisibility);
  return () => {
    stopped = true;
    windowObject.clearInterval(timer);
    documentObject.removeEventListener('visibilitychange', onVisibility);
  };
}
