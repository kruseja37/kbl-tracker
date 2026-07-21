export function sameDraftSessionSnapshot(
  current: {
    id: string;
    lastModified: string;
    revision?: number;
    snakeCompanions?: unknown;
    seatBoards?: Readonly<Record<string, { revision?: number }>>;
    farmSeatBoards?: Readonly<Record<string, { revision?: number }>>;
  },
  fresh: {
    id: string;
    lastModified: string;
    revision?: number;
    snakeCompanions?: unknown;
    seatBoards?: Readonly<Record<string, { revision?: number }>>;
    farmSeatBoards?: Readonly<Record<string, { revision?: number }>>;
  },
): boolean {
  return fresh.id === current.id
    && fresh.lastModified === current.lastModified
    && (fresh.revision ?? 0) === (current.revision ?? 0)
    && JSON.stringify(fresh.snakeCompanions) === JSON.stringify(current.snakeCompanions)
    && boardRevisionSignature(fresh.seatBoards) === boardRevisionSignature(current.seatBoards)
    && boardRevisionSignature(fresh.farmSeatBoards) === boardRevisionSignature(current.farmSeatBoards);
}

function boardRevisionSignature(
  boards?: Readonly<Record<string, { revision?: number }>>,
): string {
  return JSON.stringify(Object.entries(boards ?? {})
    .map(([teamId, board]) => [teamId, board.revision ?? 0] as const)
    .sort(([leftTeamId], [rightTeamId]) => leftTeamId.localeCompare(rightTeamId)));
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
