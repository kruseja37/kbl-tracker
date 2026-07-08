import { useEffect, useMemo, useState } from "react";
import { Check, RotateCcw, Save, Zap } from "lucide-react";

import {
  FRANCHISE_PHASE2_FLAG_DESCRIPTORS,
  getCachedFranchisePhase2ActivationRecord,
  hydrateFranchisePhase2ActivationCache,
  resetFranchisePhase2ActivationRecord,
  saveFranchisePhase2ActivationRecord,
  type FranchisePhase2ActivationRecord,
  type FranchisePhase2FlagKey,
  type FranchisePhase2FlagOverrides,
} from "../../../utils/franchisePhase2Activation";

type DraftState = Pick<FranchisePhase2ActivationRecord, "globalEnabled" | "flagOverrides">;

function cloneDraft(record: FranchisePhase2ActivationRecord | null): DraftState {
  return {
    globalEnabled: record?.globalEnabled ?? null,
    flagOverrides: { ...(record?.flagOverrides ?? {}) },
  };
}

function effectiveFlagValue(draft: DraftState, flagKey: FranchisePhase2FlagKey): boolean {
  const override = draft.flagOverrides[flagKey];
  if (typeof override === "boolean") return override;
  return draft.globalEnabled ?? false;
}

function overrideLabel(value: boolean | undefined): string {
  if (value === true) return "Forced on";
  if (value === false) return "Forced off";
  return "Global/default";
}

export function Phase2ActivationConsole() {
  const [record, setRecord] = useState<FranchisePhase2ActivationRecord | null>(() =>
    getCachedFranchisePhase2ActivationRecord(),
  );
  const [draft, setDraft] = useState<DraftState>(() => cloneDraft(record));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    hydrateFranchisePhase2ActivationCache()
      .then((hydrated) => {
        if (!mounted) return;
        setRecord(hydrated);
        setDraft(cloneDraft(hydrated));
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to hydrate Phase-2 activation.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const activeCount = useMemo(
    () => FRANCHISE_PHASE2_FLAG_DESCRIPTORS.filter((flag) => effectiveFlagValue(draft, flag.key)).length,
    [draft],
  );

  const updateFlagOverride = (flagKey: FranchisePhase2FlagKey, enabled: boolean | undefined) => {
    setDraft((current) => {
      const flagOverrides: FranchisePhase2FlagOverrides = { ...current.flagOverrides };
      if (typeof enabled === "boolean") {
        flagOverrides[flagKey] = enabled;
      } else {
        delete flagOverrides[flagKey];
      }
      return { ...current, flagOverrides };
    });
  };

  const saveDraft = async (nextDraft = draft, message = "Phase-2 activation saved.") => {
    try {
      setIsSaving(true);
      setError(null);
      const saved = await saveFranchisePhase2ActivationRecord(nextDraft);
      setRecord(saved);
      setDraft(cloneDraft(saved));
      setStatus(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save Phase-2 activation.");
    } finally {
      setIsSaving(false);
    }
  };

  const activateAll = () => {
    void saveDraft({ globalEnabled: true, flagOverrides: {} }, "All Phase-2 flags activated globally.");
  };

  const resetAll = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await resetFranchisePhase2ActivationRecord();
      setRecord(null);
      setDraft(cloneDraft(null));
      setStatus("Phase-2 activation reset to compiled defaults.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset Phase-2 activation.");
    } finally {
      setIsSaving(false);
    }
  };

  const globalLabel =
    draft.globalEnabled === true ? "Globally active" : draft.globalEnabled === false ? "Globally inactive" : "Compiled default";

  return (
    <main className="min-h-screen bg-[#202820] text-[#f2ead7]">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#8a795a] pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#c4a853]">Developer Preview</p>
            <h1 className="mt-2 font-['Moms_Typewriter'] text-3xl">Phase-2 Activation</h1>
          </div>
          <div className="rounded border border-[#8a795a] bg-[#2c382f] px-4 py-3 text-sm">
            <div className="text-[#cbb89c]">Effective flags</div>
            <div className="text-xl">{activeCount} / {FRANCHISE_PHASE2_FLAG_DESCRIPTORS.length}</div>
          </div>
        </header>

        {isLoading ? (
          <div className="rounded border border-[#8a795a] bg-[#2c382f] p-4 text-sm">Loading activation record...</div>
        ) : null}

        {error ? (
          <div className="rounded border border-[#b74747] bg-[#3a2020] p-3 text-sm text-[#ffd8d8]">{error}</div>
        ) : null}
        {status ? (
          <div className="rounded border border-[#5e8f67] bg-[#213323] p-3 text-sm text-[#d7f7d7]">{status}</div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="rounded border border-[#8a795a] bg-[#29342c] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-[#c4a853]">Global activation</div>
            <div className="mt-2 text-xl">{globalLabel}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDraft((current) => ({ ...current, globalEnabled: true }))}
                className="inline-flex items-center gap-2 rounded border border-[#5e8f67] px-3 py-2 text-sm hover:bg-[#324733]"
              >
                <Check size={16} /> On
              </button>
              <button
                type="button"
                onClick={() => setDraft((current) => ({ ...current, globalEnabled: false }))}
                className="inline-flex items-center gap-2 rounded border border-[#8a795a] px-3 py-2 text-sm hover:bg-[#3a3228]"
              >
                <RotateCcw size={16} /> Off
              </button>
              <button
                type="button"
                onClick={() => setDraft((current) => ({ ...current, globalEnabled: null }))}
                className="rounded border border-[#8a795a] px-3 py-2 text-sm hover:bg-[#3a3228]"
              >
                Default
              </button>
            </div>
          </div>
          <div className="flex flex-wrap content-start gap-2">
            <button
              type="button"
              onClick={activateAll}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded border border-[#c4a853] bg-[#3f3520] px-4 py-2 text-sm hover:bg-[#4b4128] disabled:opacity-60"
            >
              <Zap size={16} /> Activate all
            </button>
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded border border-[#5e8f67] bg-[#223822] px-4 py-2 text-sm hover:bg-[#2b472b] disabled:opacity-60"
            >
              <Save size={16} /> Save
            </button>
            <button
              type="button"
              onClick={() => void resetAll()}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded border border-[#8a795a] bg-[#302820] px-4 py-2 text-sm hover:bg-[#3a3228] disabled:opacity-60"
            >
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {FRANCHISE_PHASE2_FLAG_DESCRIPTORS.map((flag) => {
            const override = draft.flagOverrides[flag.key];
            const effective = effectiveFlagValue(draft, flag.key);
            return (
              <div key={flag.key} className="rounded border border-[#5e6f5d] bg-[#273229] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg">{flag.label}</h2>
                    <p className="mt-1 text-sm text-[#cbb89c]">{flag.detail}</p>
                  </div>
                  <span className={effective ? "text-[#98d18f]" : "text-[#d39b8f]"}>
                    {effective ? "ON" : "OFF"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => updateFlagOverride(flag.key, true)}
                    className="rounded border border-[#5e8f67] px-3 py-2 hover:bg-[#324733]"
                  >
                    On
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFlagOverride(flag.key, false)}
                    className="rounded border border-[#8a795a] px-3 py-2 hover:bg-[#3a3228]"
                  >
                    Off
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFlagOverride(flag.key, undefined)}
                    className="rounded border border-[#6f705f] px-3 py-2 hover:bg-[#33392f]"
                  >
                    Inherit
                  </button>
                  <span className="ml-auto text-xs text-[#cbb89c]">{overrideLabel(override)}</span>
                </div>
              </div>
            );
          })}
        </section>

        <footer className="text-xs text-[#b8ad98]">
          Record: {record ? `${record.updatedAt} · v${record.version}` : "none"}
        </footer>
      </div>
    </main>
  );
}

export default Phase2ActivationConsole;
