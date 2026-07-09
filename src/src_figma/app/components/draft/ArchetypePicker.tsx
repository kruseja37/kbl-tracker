import { useState } from "react";
import { Check } from "lucide-react";
import {
  TEAM_ARCHETYPES,
  FAMILY_COLOR,
  archetypeByKey,
  type TeamArchetype,
} from "../../data/teamArchetypeCatalog";

/**
 * ArchetypePicker — pick ONE archetype each for the MLB identity (sets
 * affordability / luxury-cap shift) and the FARM identity (steers the scout),
 * from the canonical 24 historical identities (derived dynamically from
 * HISTORICAL_ARCHETYPES — never hardcoded here). Controlled component: the picks
 * live in the Draft Setup hub; this reports intent via onPick. Style = the
 * neo-brutalist KBL house look (matches LeagueBuilderDraftSetup).
 *
 * Magnitudes are still being tuned, so cards show the PLAIN boost→sacrifice, not
 * numbers. The "strong vs / weak vs" matchup line is reserved (empirical, lands
 * after Season 1).
 */

export type ArchetypeSlot = "mlb" | "farm";
export type ArchetypeDraftabilityBand = "GREEN" | "YELLOW" | "LOCKED";
export type ArchetypeDraftabilityMap = Record<string, { band: ArchetypeDraftabilityBand; reason?: string }>;

export interface ArchetypePickerProps {
  mlbKey?: string | null;
  farmKey?: string | null;
  draftability?: ArchetypeDraftabilityMap;
  onPick: (slot: ArchetypeSlot, key: string) => void;
  teamLabel?: string;
  disabled?: boolean;
  disabledReason?: string;
  /** TEXTLAW-SWEEP: the identity explainer paragraphs are TUTORIAL-class and gate behind the
   * PARENT's existing Help toggle -- this picker never renders a second Help button of its own. */
  showHelp?: boolean;
}

function BoostSacrifice({ a }: { a: TeamArchetype }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-bold">
      {a.boosts.map((b) => (
        <span key={b} className="text-[var(--ballpark-boost-green)]">+{b}</span>
      ))}
      <span className="text-[var(--ballpark-chalk)]/40">→</span>
      {a.sacrifices.map((s) => (
        <span key={s} className="text-[var(--ballpark-sacrifice-red)]">−{s}</span>
      ))}
    </div>
  );
}

function SlotButton({
  label, hint, archetype, active, onClick,
}: {
  label: string; hint: string; archetype?: TeamArchetype; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 min-w-[220px] text-left border-4 px-4 py-3 transition-colors ${
        active
          ? "border-[var(--ballpark-brass)] bg-[var(--ballpark-card-active)] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]"
          : "border-[var(--ballpark-panel-border)] bg-[var(--ballpark-panel)] hover:bg-[#34472f]"
      }`}
    >
      <div className="text-[10px] font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">{label}</div>
      <div className="text-lg font-bold text-[var(--ballpark-chalk)] truncate" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>
        {archetype ? archetype.name : "— pick one —"}
      </div>
      <div className="text-[11px] text-[var(--ballpark-chalk)]/55">{archetype ? archetype.era : hint}</div>
    </button>
  );
}

function ArchetypeCard({
  a, pickedFor, isActiveSlotPick, draftability, disabled, disabledReason, onClick,
}: {
  a: TeamArchetype;
  pickedFor: ArchetypeSlot[];
  isActiveSlotPick: boolean;
  draftability?: { band: ArchetypeDraftabilityBand; reason?: string };
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
}) {
  const color = FAMILY_COLOR[a.family];
  const isLocked = draftability?.band === "LOCKED";
  const verdictLine = draftability?.band === "YELLOW" && draftability.reason
    ? { copy: `▲ ${draftability.reason}`, className: "text-[var(--ballpark-warn-border)]" }
    : draftability?.band === "LOCKED" && draftability.reason
      ? { copy: `✕ ${draftability.reason}`, className: "text-[var(--ballpark-sacrifice-red)]" }
      : null;
  const lockedClass = isLocked ? " opacity-[0.55] grayscale-[0.25]" : "";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      className={`relative text-left border-4 p-4 transition-transform active:scale-[0.99]${lockedClass} ${
        isActiveSlotPick
          ? "border-[var(--ballpark-brass)] bg-[var(--ballpark-card-active)] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          : "border-[var(--ballpark-panel-border)] bg-[#34472f] hover:bg-[var(--ballpark-card-active)] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)]"
      } disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#34472f]`}
    >
      {/* picked badges */}
      {pickedFor.length > 0 && (
        <div className="absolute top-2 right-2 flex gap-1">
          {pickedFor.map((s) => (
            <span key={s} className="flex items-center gap-1 bg-[var(--ballpark-brass)] text-[#1A1A1A] text-[9px] font-bold tracking-wider px-1.5 py-0.5">
              <Check className="w-2.5 h-2.5" /> {s === "mlb" ? "MLB" : "FARM"}
            </span>
          ))}
        </div>
      )}
      <div
        className="inline-block text-[9px] font-bold tracking-[0.14em] px-2 py-0.5 mb-2"
        style={{ color: "#1A1A1A", background: isLocked ? "#8A8D84" : color }}
      >
        {a.family.toUpperCase()}
      </div>
      <div className="text-lg font-bold text-[var(--ballpark-chalk)] leading-tight pr-16" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>
        {a.name}
      </div>
      <div className="text-[11px] font-bold tracking-wide mb-2" style={{ color }}>{a.era}</div>
      <div className="text-[12px] text-[var(--ballpark-chalk)]/70 leading-snug mb-3 min-h-[34px]">{a.lore}</div>
      <BoostSacrifice a={a} />
      {verdictLine ? (
        <div className={`mt-3 text-[11px] font-bold leading-snug ${verdictLine.className}`}>{verdictLine.copy}</div>
      ) : null}
      {/* reserved matchup line — empirical, lands after Season 1 */}
      <div className={`${verdictLine ? "mt-2" : "mt-3"} pt-2 border-t border-[var(--ballpark-panel-border)]/60 text-[10px] tracking-wide text-[var(--ballpark-chalk)]/30`}>
        ⚔ Strong vs · weak vs — revealed after Season 1
      </div>
    </button>
  );
}

export function ArchetypePicker({
  mlbKey,
  farmKey,
  draftability,
  onPick,
  teamLabel,
  disabled = false,
  disabledReason,
  showHelp = false,
}: ArchetypePickerProps) {
  const [slot, setSlot] = useState<ArchetypeSlot>("mlb");
  const mlb = archetypeByKey(mlbKey);
  const farm = archetypeByKey(farmKey);
  const activeKey = slot === "mlb" ? mlbKey : farmKey;
  const showDraftabilityPending = draftability !== undefined && Object.keys(draftability).length === 0;

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
        <div className="text-xs font-bold tracking-[0.2em] text-[var(--ballpark-brass)]">TEAM IDENTITY</div>
        {teamLabel ? <div className="text-sm text-[var(--ballpark-chalk)]/70">{teamLabel}</div> : null}
      </div>
      {showDraftabilityPending ? (
        <div className="text-[11px] text-[var(--ballpark-chalk)]/45 mb-3">
          Draftability reads appear once your player list is in.
        </div>
      ) : null}

      {/* the two slots */}
      <div className="flex flex-wrap gap-3 mb-2">
        <SlotButton label="MLB IDENTITY · sets affordability" hint="what's cheap to build" archetype={mlb} active={slot === "mlb"} onClick={() => setSlot("mlb")} />
        <SlotButton label="FARM IDENTITY · steers your scout" hint="what your scout hunts" archetype={farm} active={slot === "farm"} onClick={() => setSlot("farm")} />
      </div>
      {showHelp ? (
        <div className="text-[12px] text-[var(--ballpark-chalk)]/55 mb-4">
          {slot === "mlb"
            ? "Choosing your MLB identity — it shifts your luxury-tax ceilings, making your style cheap to over-stack."
            : "Choosing your farm identity — it focuses your scout on the prospects that fit this build."}
        </div>
      ) : null}

      {/* the card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {TEAM_ARCHETYPES.map((a) => {
          const pickedFor: ArchetypeSlot[] = [];
          if (mlbKey === a.key) pickedFor.push("mlb");
          if (farmKey === a.key) pickedFor.push("farm");
          const verdict = draftability?.[a.key];
          const cardDisabled = disabled || (slot === "mlb" && verdict?.band === "LOCKED");
          return (
            <ArchetypeCard
              key={a.key}
              a={a}
              pickedFor={pickedFor}
              isActiveSlotPick={activeKey === a.key}
              draftability={verdict}
              disabled={cardDisabled}
              disabledReason={disabled ? disabledReason : verdict?.reason}
              onClick={() => onPick(slot, a.key)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default ArchetypePicker;
