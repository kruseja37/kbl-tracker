import { useEffect, useMemo, useState } from "react";
import { FastForward, Play, RotateCcw, ShieldAlert, Sparkles } from "lucide-react";

import {
  fastForwardLivingSeasonTestDriveGames,
  getLivingSeasonTestDriveState,
  listLivingSeasonTestDriveFranchises,
  type DevSyntheticReceipt,
  type LivingSeasonTestDriveState,
  type TestDriveFranchiseOption,
} from "../dev/devSyntheticGameDriver";

const BRANCH_LABELS: Record<string, string> = {
  fame: "Fame",
  moraleAuto: "Morale",
  checkpointDev: "Development checkpoint",
  traits: "Traits",
  L10: "Last-10 storyline",
  L11: "Manager review",
  L12raceAllstar: "Standings and All-Star",
  L13: "Relationships",
  stadium: "Ballpark records",
  trueValueSnapshot: "True Value snapshot",
};

function branchCopy(status: "OFF" | "SUCCESS" | "NO_EVENT" | "FAILED", reason?: string): string {
  if (status === "SUCCESS") return "Updated";
  if (status === "NO_EVENT") return "Nothing to do";
  if (status === "OFF") return "Switched off";
  return reason || "Could not finish";
}

function receiptClass(status: "OFF" | "SUCCESS" | "NO_EVENT" | "FAILED"): string {
  if (status === "SUCCESS") return "border-[#5e8f67] bg-[#213b25] text-[#bde8bd]";
  if (status === "FAILED") return "border-[#b74747] bg-[#432323] text-[#ffd7d7]";
  if (status === "OFF") return "border-[#5f6256] bg-[#2a302b] text-[#aab0a2]";
  return "border-[#6d6f68] bg-[#30332f] text-[#d0d1c9]";
}

function stateCopy(state: LivingSeasonTestDriveState | null): string {
  return state?.message ?? "Choose a franchise to inspect its next scheduled game.";
}

export function LivingSeasonTestDrive() {
  const [franchises, setFranchises] = useState<TestDriveFranchiseOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [state, setState] = useState<LivingSeasonTestDriveState | null>(null);
  const [receipts, setReceipts] = useState<DevSyntheticReceipt[]>([]);
  const [quantity, setQuantity] = useState("3");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ complete: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => franchises.find((franchise) => franchise.franchiseId === selectedId) ?? null,
    [franchises, selectedId],
  );

  useEffect(() => {
    let active = true;
    listLivingSeasonTestDriveFranchises()
      .then((nextFranchises) => {
        if (!active) return;
        setFranchises(nextFranchises);
        setSelectedId((current) => current || nextFranchises.find((item) => item.livingSeasonEnabled)?.franchiseId || nextFranchises[0]?.franchiseId || "");
      })
      .catch((caught: unknown) => active && setError(caught instanceof Error ? caught.message : "Could not load franchises."));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!selectedId) {
      setState(null);
      return () => { active = false; };
    }
    getLivingSeasonTestDriveState(selectedId)
      .then((nextState) => active && setState(nextState))
      .catch((caught: unknown) => active && setError(caught instanceof Error ? caught.message : "Could not inspect the franchise."));
    return () => { active = false; };
  }, [selectedId]);

  const refresh = async () => {
    if (!selectedId) return;
    setState(await getLivingSeasonTestDriveState(selectedId));
  };

  const runGames = async (requested: number) => {
    if (!selectedId || !state || state.availability !== "ready") return;
    const total = Math.max(1, Math.min(requested, state.remainingGames ?? requested));
    setBusy(true);
    setError(null);
    setProgress({ complete: 0, total });
    try {
      const result = await fastForwardLivingSeasonTestDriveGames(selectedId, total, (complete, _total, receipt) => {
        setReceipts((current) => [receipt, ...current]);
        setProgress({ complete, total: _total });
      });
      setState(result.state);
      if (result.stopped) setError(result.state.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The driver stopped on a processing failure.");
      await refresh();
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const fastForwardToCheckpoint = () => {
    if (!state?.nextGame || !state.nextCheckpointGameNumber) return;
    runGames(Math.max(1, state.nextCheckpointGameNumber - state.nextGame.gameNumber + 1));
  };

  const validQuantity = Math.max(1, Number.parseInt(quantity, 10) || 1);
  const controlsEnabled = state?.availability === "ready" && !busy;

  return (
    <main className="min-h-screen bg-[#202820] text-[#f2ead7]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="border-b border-[#8a795a] pb-5">
          <p className="text-xs uppercase tracking-[0.28em] text-[#c4a853]">Developer preview · dev fixture</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-['Moms_Typewriter'] text-3xl">Living Season Test Drive</h1>
              <p className="mt-2 max-w-3xl text-sm text-[#cbb89c]">
                Drive stored switch-on franchises through real living-season processing in minutes. This is not the cut “simulate season” product feature and it adds no product navigation.
              </p>
            </div>
            <div className="rounded border border-[#8a795a] bg-[#2c382f] px-4 py-3 text-sm text-[#cbb89c]">
              Real completion pipeline<br /><span className="text-[#f2ead7]">Synthetic inputs only</span>
            </div>
          </div>
        </header>

        {error ? <div className="rounded border border-[#b74747] bg-[#3a2020] p-3 text-sm text-[#ffd8d8]">{error}</div> : null}

        <section className="rounded border border-[#8a795a] bg-[#29342c] p-5">
          <label className="block text-xs uppercase tracking-[0.2em] text-[#c4a853]" htmlFor="test-drive-franchise">Franchise</label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <select
              id="test-drive-franchise"
              value={selectedId}
              onChange={(event) => { setSelectedId(event.target.value); setReceipts([]); setError(null); }}
              className="min-w-64 rounded border border-[#8a795a] bg-[#202820] px-3 py-2 text-sm text-[#f2ead7]"
            >
              {franchises.length === 0 ? <option value="">No franchises found</option> : null}
              {franchises.map((franchise) => (
                <option key={franchise.franchiseId} value={franchise.franchiseId}>
                  {franchise.name} · {franchise.livingSeasonEnabled ? "Living Season on" : "legacy"}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => void refresh()} disabled={busy || !selectedId} className="inline-flex items-center gap-2 rounded border border-[#8a795a] px-3 py-2 text-sm hover:bg-[#3a3228] disabled:opacity-50">
              <RotateCcw size={15} /> Refresh
            </button>
          </div>

          <div className="mt-4 rounded border border-[#5e6f5d] bg-[#273229] p-4 text-sm text-[#cbb89c]">
            {selected && !selected.livingSeasonEnabled ? <div className="flex items-start gap-2 text-[#f0ce9f]"><ShieldAlert size={17} className="mt-0.5" />{stateCopy(state)}</div> : stateCopy(state)}
            {state?.availability === "ready" && state.nextGame ? (
              <div className="mt-3 grid gap-3 text-[#f2ead7] sm:grid-cols-3">
                <div><span className="block text-xs uppercase text-[#aeb59f]">Schedule</span>{state.currentGameNumber} complete / {state.seasonLength}</div>
                <div><span className="block text-xs uppercase text-[#aeb59f]">Next game</span>#{state.nextGame.gameNumber} · {state.nextMatchup?.awayName ?? state.nextGame.awayTeamId} at {state.nextMatchup?.homeName ?? state.nextGame.homeTeamId}</div>
                <div><span className="block text-xs uppercase text-[#aeb59f]">Seed</span><code className="text-xs text-[#e4d5a6]">{state.seed}</code></div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded border border-[#8a795a] bg-[#29342c] p-5">
          <div className="flex flex-wrap items-end gap-3">
            <button type="button" disabled={!controlsEnabled} onClick={() => void runGames(1)} className="inline-flex items-center gap-2 rounded border border-[#5e8f67] bg-[#223822] px-4 py-3 text-sm hover:bg-[#2b472b] disabled:opacity-50">
              <Play size={16} /> Play next game
            </button>
            <button type="button" disabled={!controlsEnabled || !state?.nextCheckpointGameNumber} onClick={fastForwardToCheckpoint} className="inline-flex items-center gap-2 rounded border border-[#c4a853] bg-[#3f3520] px-4 py-3 text-sm hover:bg-[#4b4128] disabled:opacity-50">
              <FastForward size={16} /> Fast-forward to next checkpoint
            </button>
            <label className="flex items-center gap-2 rounded border border-[#8a795a] px-3 py-2 text-sm">
              <span>N games</span>
              <input type="number" min="1" max={state?.remainingGames ?? 1} value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-16 bg-transparent text-center outline-none" />
            </label>
            <button type="button" disabled={!controlsEnabled} onClick={() => void runGames(validQuantity)} className="inline-flex items-center gap-2 rounded border border-[#8a795a] px-4 py-3 text-sm hover:bg-[#3a3228] disabled:opacity-50">
              <Sparkles size={16} /> Fast-forward N games
            </button>
          </div>
          {progress ? <div className="mt-4 text-sm text-[#e4d5a6]">Processing {progress.complete} of {progress.total} games…</div> : null}
        </section>

        <section className="rounded border border-[#8a795a] bg-[#29342c] p-5">
          <div className="flex items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-[#c4a853]">Under the hood</p><h2 className="mt-1 font-['Moms_Typewriter'] text-2xl">Game receipts</h2></div><span className="text-sm text-[#cbb89c]">The backend’s plain-language X-ray</span></div>
          {receipts.length === 0 ? <p className="mt-4 text-sm text-[#cbb89c]">After each game, its living-season ledger will appear here.</p> : null}
          <div className="mt-4 space-y-4">
            {receipts.map((receipt) => (
              <article key={receipt.gameId} className="rounded border border-[#5e6f5d] bg-[#273229] p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2"><div className="text-lg">{receipt.away.name} {receipt.away.score} · {receipt.home.name} {receipt.home.score}</div><div className="text-sm text-[#cbb89c]">Game #{receipt.gameNumber} · {receipt.completedCivilDate}</div></div>
                <p className="mt-1 text-xs text-[#aeb59f]">Seed: {receipt.seed}</p>
                <div className="mt-3 text-sm text-[#cbb89c]">Overall: <span className="text-[#f2ead7]">{receipt.livingSeasonProcessing?.overall === "complete" ? "Finished" : receipt.livingSeasonProcessing?.overall === "partial-failure" ? "Finished with issues" : "Still processing"}</span></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(BRANCH_LABELS).map(([key, label]) => {
                    const outcome = receipt.livingSeasonProcessing?.branches[key as keyof typeof receipt.livingSeasonProcessing.branches];
                    const status = outcome?.status ?? "FAILED";
                    return (
                    <div key={key} className={`rounded border px-2 py-1 text-xs ${receiptClass(status)}`}>
                      <span className="font-medium">{label}</span>: {outcome ? branchCopy(status, outcome.errorMessage || outcome.errorCode) : "Not completed"}
                    </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default LivingSeasonTestDrive;
