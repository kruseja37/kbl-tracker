export function startCompanionFreshness(input: {
  pullAndRefresh: () => void | Promise<void>;
  intervalMs?: number;
  windowObject?: Pick<Window, 'setInterval' | 'clearInterval'>;
  documentObject?: Pick<Document, 'addEventListener' | 'removeEventListener' | 'visibilityState'>;
}): () => void {
  const windowObject = input.windowObject ?? window;
  const documentObject = input.documentObject ?? document;
  const run = () => { void input.pullAndRefresh(); };
  const timer = windowObject.setInterval(run, input.intervalMs ?? 5_000);
  const onVisibility = () => { if (documentObject.visibilityState === 'visible') run(); };
  documentObject.addEventListener('visibilitychange', onVisibility);
  return () => {
    windowObject.clearInterval(timer);
    documentObject.removeEventListener('visibilitychange', onVisibility);
  };
}
