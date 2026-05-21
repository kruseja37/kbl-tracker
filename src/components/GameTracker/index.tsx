interface RetiredGameTrackerProps {
  onGameEnd?: unknown;
}

export default function RetiredGameTracker(_props: RetiredGameTrackerProps = {}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8">
      <div className="max-w-xl rounded border border-slate-700 bg-slate-900 p-6 text-center">
        <h1 className="text-xl font-semibold">Retired GameTracker Disabled</h1>
        <p className="mt-3 text-sm text-slate-300">
          This legacy tracker entry point is intentionally inert. Current games must launch
          through the Figma GameTracker route at /game-tracker/:gameId so WPA is written
          through the Savant-backed runtime pipeline.
        </p>
      </div>
    </div>
  );
}
