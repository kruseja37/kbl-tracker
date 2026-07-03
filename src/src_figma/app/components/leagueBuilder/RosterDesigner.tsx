import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { PressButton } from "../ballpark";
import {
  buildDefaultDesignSlots,
  countEligibleForAsk,
  evaluateRosterDesign,
  type DesignBlocker,
  type DesignFeasibilityResult,
  type DesignPoolPlayer,
  type DesignSlot,
  type DesignSlotKind,
  type SlotPreference,
} from "../../../../engines/rosterDesignFeasibility";
import {
  ALL_SHAPES,
  EXTENDED_SHAPES,
  menuForPosition,
  type ArchetypeFamilyDefinition,
  type PersonalityTilt,
  type TaxonomyPosition,
} from "../../../../data/playerArchetypeTaxonomy";
import {
  classifyPlayerArchetype,
  pitcherAlignmentGroupFor,
  shapeAlignmentScore,
  type ShapeClassification,
} from "../../../../engines/playerArchetypeClassifier";
import { HISTORICAL_ARCHETYPES } from "../../../../data/historicalArchetypes";
import { buildRosterDesignPool } from "../../engines/leaguePlayerAdapter";
import type { DraftPoolMode, Player, Team } from "../../../../utils/leagueBuilderStorage";

export { buildRosterDesignPool } from "../../engines/leaguePlayerAdapter";

type RosterDesignSave = { slots: DesignSlot[]; lockedAt?: string };
type VerdictTone = "red" | "amber" | "green" | "quiet";

type RosterDesignerProps = {
  team: Team;
  mode: DraftPoolMode;
  players: readonly Player[];
  lockedPool: boolean;
  budget: number;
  showHelp: boolean;
  disabled?: boolean;
  disabledReason?: string | null;
  onSave: (design: RosterDesignSave) => Promise<void>;
};

const LINEUP_SLOT_IDS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
const STAFF_SLOT_IDS = ["SP1", "SP2", "SP3", "SP4", "RP1", "RP2", "RP3", "RP4"];
const BENCH_SLOT_IDS = ["backupC", "FLEX1", "FLEX2", "FLEX3", "FLEX4", "SWING"];
const FIELD_POSITIONS = new Set<string>(LINEUP_SLOT_IDS);
const HITTER_SHAPES = ALL_SHAPES.filter((shape) => shape.role === "hitter" || shape.role === "both");
const DEPTH_SHAPE_FAMILIES = new Set(EXTENDED_SHAPES.filter((shape) => shape.depthClass).map((shape) => shape.family));

function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return `$${Math.round(value).toLocaleString()}`;
}

function defaultPreferenceForSlot(slotId: string): SlotPreference {
  return {
    allowRunnerUp: true,
    personalityTilt: slotId === "C" || slotId === "SS" || slotId === "SP1" ? "avoid-fragile" : "any",
  };
}

function mergePreference(defaultPreference: SlotPreference, savedPreference: SlotPreference | undefined): SlotPreference {
  return {
    ...defaultPreference,
    ...savedPreference,
    tags: savedPreference?.tags ? { ...savedPreference.tags } : defaultPreference.tags,
  };
}

export function seedRosterDesignSlots(savedSlots?: readonly DesignSlot[]): DesignSlot[] {
  const savedById = new Map((savedSlots ?? []).map((slot) => [slot.slotId, slot]));
  return buildDefaultDesignSlots().map((slot) => {
    const saved = savedById.get(slot.slotId);
    return {
      ...slot,
      preference: mergePreference(defaultPreferenceForSlot(slot.slotId), saved?.preference),
    };
  });
}

function verdictTone(result: DesignFeasibilityResult | null, poolSize: number): VerdictTone {
  if (poolSize === 0 || !result) return "quiet";
  if (result.blockers.some((blocker) => blocker.kind === "no-match" && blocker.slotId !== "legality")) return "red";
  if (result.blockers.some((blocker) => blocker.slotId === "legality")) return "amber";
  if (result.blockers.some((blocker) => blocker.kind === "budget")) return "amber";
  if (result.feasible) return "green";
  return "quiet";
}

export function rosterDesignStatusTone(slots: readonly DesignSlot[], players: readonly Player[], budget: number): VerdictTone {
  const pool = buildRosterDesignPool(players);
  if (pool.length === 0) return "quiet";
  return verdictTone(evaluateRosterDesign(slots, pool, budget), pool.length);
}

function slotLabel(slot: DesignSlot): string {
  if (slot.slotId === "backupC") return "BACKUP C";
  if (slot.slotId.startsWith("FLEX")) return `BENCH ${slot.slotId.replace("FLEX", "")}`;
  return slot.slotId;
}

function slotShapeSummary(slot: DesignSlot): string {
  const preference = slot.preference ?? {};
  const tagCount = Object.values(preference.tags ?? {}).filter(Boolean).length;
  return preference.shape ? `${preference.shape}${tagCount > 0 ? ` +${tagCount}` : ""}` : "ANY";
}

function slotKindIsHitter(slot: DesignSlot): boolean {
  return slot.kind === "pos" || slot.kind === "backupC" || slot.kind === "flex" || slot.kind === "swing";
}

function slotKindIsPitcher(slot: DesignSlot): boolean {
  return slot.kind === "sp" || slot.kind === "rp" || slot.kind === "swing";
}

// Candidate counting goes through the ENGINE's countEligibleForAsk — this file used to
// keep a private copy of the eligibility/matching rules and drifted from the solver
// (coverage vs primary, JK 2026-07-02). One rule set, one owner.
type ClassifiedDesignPlayer = DesignPoolPlayer & { classification: ShapeClassification };

function shapeIdentityLine(shape: ArchetypeFamilyDefinition): string | null {
  return "identityLine" in shape && typeof shape.identityLine === "string" ? shape.identityLine : null;
}

function menuGroupsForSlot(slot: DesignSlot): Array<{ label?: string; shapes: ArchetypeFamilyDefinition[] }> {
  if (slot.kind === "pos" && slot.position) return [{ shapes: menuForPosition(slot.position) }];
  if (slot.kind === "backupC") return [{ shapes: menuForPosition("C") }];
  if (slot.kind === "sp") return [{ shapes: menuForPosition("SP") }];
  if (slot.kind === "rp") return [{ shapes: menuForPosition("RP") }];
  if (slot.kind === "flex") {
    return [
      { label: "BENCH STOCK", shapes: HITTER_SHAPES.filter((shape) => DEPTH_SHAPE_FAMILIES.has(shape.family)) },
      { label: "EVERYDAY SHAPES", shapes: HITTER_SHAPES.filter((shape) => !DEPTH_SHAPE_FAMILIES.has(shape.family)) },
    ];
  }
  return [
    { label: "BATS", shapes: HITTER_SHAPES },
    { label: "ARMS", shapes: menuForPosition("RP") },
  ];
}

function alignmentPositionForSlot(slot: DesignSlot): TaxonomyPosition {
  if (slot.kind === "rp" || (slot.kind === "swing" && slot.preference?.shape && menuForPosition("RP").some((shape) => shape.family === slot.preference?.shape))) return "RP";
  if (slot.kind === "sp") return "SP";
  if (slot.kind === "backupC") return "C";
  if (slot.kind === "pos" && slot.position) return slot.position;
  return "LF";
}

function topAlignedFamilies(slot: DesignSlot, shapes: readonly ArchetypeFamilyDefinition[], identityKey: string | undefined): Set<string> {
  const identity = HISTORICAL_ARCHETYPES.find((archetype) => archetype.id === identityKey);
  if (!identity) return new Set();
  const position = alignmentPositionForSlot(slot);
  return new Set(
    shapes
      .map((shape) => ({
        family: shape.family,
        score: shapeAlignmentScore(shape, identity, pitcherAlignmentGroupFor(position)),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.family.localeCompare(right.family))
      .slice(0, 3)
      .map((entry) => entry.family),
  );
}

function blockedSlotIds(blockers: readonly DesignBlocker[]): Set<string> {
  return new Set(blockers
    .filter((blocker) => blocker.slotId !== "legality" && blocker.slotId !== "budget")
    .map((blocker) => blocker.slotId));
}

function chipCopy(result: DesignFeasibilityResult | null, tone: VerdictTone): { state: string; cost: string } {
  if (!result || tone === "quiet") return { state: "NOTHING TO CHECK AGAINST YET", cost: "EST. N/A" };
  if (tone === "red") {
    const count = result.blockers.filter((blocker) => blocker.kind === "no-match" && blocker.slotId !== "legality").length;
    return { state: `${count} SPOT${count === 1 ? "" : "S"} WON'T FILL`, cost: `EST. ${formatMoney(result.totalCost)} OF ${formatMoney(result.budget)}` };
  }
  if (result.blockers.some((blocker) => blocker.slotId === "legality")) {
    return { state: "FILLS · NOT A LEGAL 22", cost: `EST. ${formatMoney(result.totalCost)} OF ${formatMoney(result.budget)}` };
  }
  if (result.blockers.some((blocker) => blocker.kind === "budget")) {
    return {
      state: `OVER BUDGET · ${formatMoney(Math.max(0, result.totalCost - result.budget))} OVER`,
      cost: `EST. ${formatMoney(result.totalCost)} OF ${formatMoney(result.budget)}`,
    };
  }
  return {
    state: `BUILDS · ${formatMoney(result.headroom)} TO SPARE`,
    cost: `EST. ${formatMoney(result.totalCost)} OF ${formatMoney(result.budget)}`,
  };
}

function sourceLine(mode: DraftPoolMode, lockedPool: boolean): string {
  if (lockedPool) return "Checked against the locked pool";
  return mode === "design-first" ? "Checked against your player list" : "Checked against today's pool";
}

function hasEditedDesign(team: Team): boolean {
  return Boolean(team.rosterDesign);
}

export function RosterDesigner({
  team,
  mode,
  players,
  lockedPool,
  budget,
  showHelp,
  disabled = false,
  disabledReason,
  onSave,
}: RosterDesignerProps) {
  const loadedTeamId = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const dirtyTeamIdRef = useRef<string | null>(null);
  const dirtyVersionRef = useRef(0);
  const renderedTeamIdRef = useRef(team.id);
  const saveInFlightRef = useRef<{ teamId: string; version: number } | null>(null);
  const resetConfirmRef = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState<DesignSlot[]>(() => seedRosterDesignSlots(team.rosterDesign?.slots));
  const [lockedAt, setLockedAt] = useState<string | undefined>(team.rosterDesign?.lockedAt);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [result, setResult] = useState<DesignFeasibilityResult | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  renderedTeamIdRef.current = team.id;

  const persistDirtySave = useCallback((
    teamId: string,
    save: RosterDesignerProps["onSave"],
    nextSlots: DesignSlot[],
    nextLockedAt: string | undefined,
  ) => {
    if (!dirtyRef.current || dirtyTeamIdRef.current !== teamId) return;
    if (saveInFlightRef.current?.teamId === teamId) return;
    const version = dirtyVersionRef.current;
    saveInFlightRef.current = { teamId, version };
    void save({ slots: nextSlots, lockedAt: nextLockedAt }).then(() => {
      if (dirtyTeamIdRef.current === teamId && dirtyVersionRef.current === version) {
        dirtyRef.current = false;
        dirtyTeamIdRef.current = null;
      }
    }).catch(() => {
      // The host owns visible save errors; keep dirty state so a rejected save is not forgotten.
    }).finally(() => {
      if (saveInFlightRef.current?.teamId === teamId && saveInFlightRef.current.version === version) {
        saveInFlightRef.current = null;
      }
    });
  }, []);

  useEffect(() => {
    if (loadedTeamId.current === team.id) return;
    loadedTeamId.current = team.id;
    setSlots(seedRosterDesignSlots(team.rosterDesign?.slots));
    setLockedAt(team.rosterDesign?.lockedAt);
    setSelectedSlotId(null);
    setResetConfirm(false);
  }, [team.id, team.rosterDesign?.lockedAt, team.rosterDesign?.slots]);

  const designPool = useMemo(() => buildRosterDesignPool(players), [players]);
  const classifiedPool = useMemo(
    () => designPool.map((player) => ({ ...player, classification: classifyPlayerArchetype(player.profile) })),
    [designPool],
  );

  useEffect(() => {
    const effectTeamId = team.id;
    const timer = window.setTimeout(() => {
      const nextResult = designPool.length > 0 ? evaluateRosterDesign(slots, designPool, budget) : null;
      setResult(nextResult);
      persistDirtySave(effectTeamId, onSave, slots, lockedAt);
    }, 200);
    return () => {
      window.clearTimeout(timer);
      if (renderedTeamIdRef.current !== effectTeamId) {
        persistDirtySave(effectTeamId, onSave, slots, lockedAt);
      }
    };
  }, [budget, designPool, lockedAt, onSave, persistDirtySave, slots, team.id]);

  useEffect(() => {
    if (!resetConfirm) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (resetConfirmRef.current?.contains(event.target as Node)) return;
      setResetConfirm(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [resetConfirm]);

  const selectedSlot = slots.find((slot) => slot.slotId === selectedSlotId) ?? null;
  const tone = verdictTone(result, designPool.length);
  const chip = chipCopy(result, tone);
  const blockers = result?.blockers ?? [];
  const blockedIds = blockedSlotIds(blockers);
  const readOnly = disabled || Boolean(lockedAt);
  const canLock = mode === "design-first" && !disabled && !lockedAt && tone === "green";

  const updateSlot = (slotId: string, update: (slot: DesignSlot) => DesignSlot) => {
    if (readOnly) return;
    dirtyRef.current = true;
    dirtyTeamIdRef.current = team.id;
    dirtyVersionRef.current += 1;
    setResetConfirm(false);
    setSlots((current) => current.map((slot) => (slot.slotId === slotId ? update(slot) : slot)));
  };

  const updatePreference = (slotId: string, update: (preference: SlotPreference) => SlotPreference) => {
    updateSlot(slotId, (slot) => ({
      ...slot,
      preference: update({ ...defaultPreferenceForSlot(slot.slotId), ...(slot.preference ?? {}), tags: slot.preference?.tags ? { ...slot.preference.tags } : undefined }),
    }));
  };

  const resetDesign = () => {
    if (readOnly) return;
    dirtyRef.current = true;
    dirtyTeamIdRef.current = team.id;
    dirtyVersionRef.current += 1;
    setSlots(seedRosterDesignSlots());
    setLockedAt(undefined);
    setSelectedSlotId(null);
    setResetConfirm(false);
  };

  const lockDesign = () => {
    if (!canLock) return;
    dirtyRef.current = true;
    dirtyTeamIdRef.current = team.id;
    dirtyVersionRef.current += 1;
    setLockedAt(new Date().toISOString());
  };

  const unlockDesign = () => {
    if (disabled) return;
    dirtyRef.current = true;
    dirtyTeamIdRef.current = team.id;
    dirtyVersionRef.current += 1;
    setLockedAt(undefined);
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-[var(--ballpark-well)] border-b-4 border-[var(--ballpark-brass)] pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold tracking-[0.18em] text-[var(--ballpark-chalk)]">
              THE TWENTY-TWO · {team.name.toUpperCase()}
            </div>
            <div className="text-[11px] text-[var(--ballpark-chalk)]/55 mt-1">{sourceLine(mode, lockedPool)}</div>
          </div>
          <div
            className={classNames(
              "border-2 px-3 py-2 text-right bg-[var(--ballpark-well)] min-w-[210px]",
              tone === "red" && "border-[var(--ballpark-status-red-bright)] text-[var(--ballpark-status-red-bright)]",
              tone === "amber" && "border-[var(--ballpark-status-warn)] text-[var(--ballpark-status-warn)]",
              tone === "green" && "border-[var(--ballpark-status-green)] text-[var(--ballpark-status-green)]",
              tone === "quiet" && "border-transparent text-[var(--ballpark-chalk)]/45",
            )}
          >
            <div className="text-xs font-bold tracking-wider">{chip.state}</div>
            <div className="text-[11px] mt-0.5">{chip.cost}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <div ref={resetConfirmRef}>
            {resetConfirm ? (
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-[var(--ballpark-chalk)]/75">SURE?</span>
                <PressButton size="sm" variant="affirm" onClick={resetDesign} disabled={readOnly}>
                  <Check className="w-3 h-3" />
                </PressButton>
                <PressButton size="sm" variant="destruct" onClick={() => setResetConfirm(false)} disabled={readOnly}>
                  <X className="w-3 h-3" />
                </PressButton>
              </div>
            ) : (
              <PressButton size="sm" onClick={() => setResetConfirm(true)} disabled={readOnly}>
                RESET
              </PressButton>
            )}
          </div>
          {mode === "design-first" && (
            lockedAt ? (
              <PressButton size="md" variant="gold" onClick={unlockDesign} disabled={disabled}>
                UNLOCK
              </PressButton>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <PressButton size="md" variant="gold" onClick={lockDesign} disabled={!canLock}>
                  LOCK DESIGN
                </PressButton>
                {tone !== "green" && tone !== "quiet" ? (
                  <span className="text-[11px] text-[var(--ballpark-chalk)]/55">Fix the blockers first — the pool gets built from locked designs.</span>
                ) : null}
              </div>
            )
          )}
          {disabled && disabledReason ? <span className="text-[11px] text-[var(--ballpark-status-warn)]">{disabledReason}</span> : null}
        </div>
      </div>

      {showHelp ? (
        <div className="space-y-2">
          <HelpNote>
            {mode === "design-first"
              ? "Your design tells the league what to stock the draft with. Set the kind of player you want at each of the 22 spots — the pool gets built to meet the room's asks, then everyone bids from it. Leave a spot on ANY and you're happy taking the best deal there."
              : "The pool is already set — use the design to sketch your build. The check tells you whether the pool can actually hand you this roster, and roughly what it would run."}
          </HelpNote>
          <HelpNote>
            The check fills your 22 with the cheapest players that fit each ask. Prices here are asking prices — the room sets the real ones. Green means it builds; the red cards name exactly what's in the way.
          </HelpNote>
          <HelpNote>
            A shape is a player's strengths and the weaknesses that come with them — taking a weakness on purpose is how you free up money for the spots you care about. FITS YOUR IDENTITY means a shape runs cheap under your club's identity — fit, not a bargain guarantee. Tags narrow the ask (lefty, switch, utility). Temperament is a preference, not a rule — if the best fit is a fragile head, you'll hear about it, not be blocked from him.
          </HelpNote>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SlotGroup
          title="THE LINEUP"
          slots={slots.filter((slot) => LINEUP_SLOT_IDS.includes(slot.slotId))}
          result={result}
          blockedIds={blockedIds}
          selectedSlotId={selectedSlotId}
          onSelect={setSelectedSlotId}
        />
        <SlotGroup
          title="THE STAFF"
          slots={slots.filter((slot) => STAFF_SLOT_IDS.includes(slot.slotId))}
          result={result}
          blockedIds={blockedIds}
          selectedSlotId={selectedSlotId}
          onSelect={setSelectedSlotId}
        />
        <SlotGroup
          title="THE BENCH"
          slots={slots.filter((slot) => BENCH_SLOT_IDS.includes(slot.slotId))}
          result={result}
          blockedIds={blockedIds}
          selectedSlotId={selectedSlotId}
          onSelect={setSelectedSlotId}
        />
      </div>

      {selectedSlot ? (
        <SlotEditor
          slot={selectedSlot}
          readOnly={readOnly}
          identityKey={team.mlbArchetypeKey}
          classifiedPool={classifiedPool}
          onPreferenceChange={(update) => updatePreference(selectedSlot.slotId, update)}
        />
      ) : null}

      {blockers.length > 0 ? (
        <div className="space-y-2">
          {blockers.map((blocker, index) => {
            const isWarn = blocker.kind === "budget" || blocker.slotId === "legality";
            const canSelect = slots.some((slot) => slot.slotId === blocker.slotId);
            return (
              <button
                key={`${blocker.slotId}-${index}`}
                type="button"
                onClick={() => {
                  if (canSelect) setSelectedSlotId(blocker.slotId);
                }}
                className={classNames(
                  "block w-full text-left bg-[var(--ballpark-well)] border-l-4 border-y-2 border-r-2 px-3 py-2 text-sm text-[var(--ballpark-chalk)]/80 active:scale-[0.99]",
                  isWarn ? "border-l-[var(--ballpark-status-warn)] border-y-[var(--ballpark-panel-border)] border-r-[var(--ballpark-panel-border)]" : "border-l-[var(--ballpark-status-red-bright)] border-y-[var(--ballpark-panel-border)] border-r-[var(--ballpark-panel-border)]",
                  canSelect && "hover:bg-[var(--ballpark-action-green)]",
                )}
              >
                {blocker.message}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function SlotGroup({
  title,
  slots,
  result,
  blockedIds,
  selectedSlotId,
  onSelect,
}: {
  title: string;
  slots: readonly DesignSlot[];
  result: DesignFeasibilityResult | null;
  blockedIds: ReadonlySet<string>;
  selectedSlotId: string | null;
  onSelect: (slotId: string) => void;
}) {
  const resolutionById = new Map((result?.slots ?? []).map((slot) => [slot.slotId, slot]));
  return (
    <div>
      <div className="text-[11px] font-bold tracking-[0.16em] text-[var(--ballpark-brass)] mb-2">{title}</div>
      <div className="space-y-2">
        {slots.map((slot) => {
          const resolution = resolutionById.get(slot.slotId);
          const blocked = blockedIds.has(slot.slotId);
          const selected = selectedSlotId === slot.slotId;
          return (
            <button
              key={slot.slotId}
              type="button"
              onClick={() => onSelect(slot.slotId)}
              className={classNames(
                "w-full grid grid-cols-[76px_1fr_auto] gap-2 items-center border-2 px-2 py-2 text-left active:scale-[0.98]",
                selected
                  ? "border-[var(--ballpark-brass)] bg-[#3a4d3c]"
                  : blocked
                    ? "border-[var(--ballpark-status-red-bright)] bg-[var(--ballpark-well)]"
                    : "border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] hover:border-[var(--ballpark-brass)]",
              )}
            >
              <span className="text-xs font-bold text-[var(--ballpark-chalk)]">{slotLabel(slot)}</span>
              <span className={classNames("min-w-0 truncate text-sm", slot.preference?.shape ? "text-[var(--ballpark-chalk)]" : "text-[var(--ballpark-chalk)]/45")}>
                {slotShapeSummary(slot)}
              </span>
              <span className="flex items-center justify-end gap-1 text-[11px] text-[var(--ballpark-chalk)]/55">
                {resolution?.viaRunnerUp ? <span className="text-[var(--ballpark-status-warn)]">≈</span> : null}
                <span>×{resolution?.candidateCount ?? 0}</span>
                {blocked ? (
                  <span className="text-[var(--ballpark-status-red-bright)]">✕</span>
                ) : resolution?.playerId ? (
                  <span className="text-[var(--ballpark-status-green)]">●</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SlotEditor({
  slot,
  readOnly,
  identityKey,
  classifiedPool,
  onPreferenceChange,
}: {
  slot: DesignSlot;
  readOnly: boolean;
  identityKey: string | undefined;
  classifiedPool: readonly ClassifiedDesignPlayer[];
  onPreferenceChange: (update: (preference: SlotPreference) => SlotPreference) => void;
}) {
  const groups = menuGroupsForSlot(slot);
  const visibleShapes = groups.flatMap((group) => group.shapes);
  const alignedFamilies = topAlignedFamilies(slot, visibleShapes, identityKey);
  const preference = slot.preference ?? defaultPreferenceForSlot(slot.slotId);

  const setShape = (shape: string | undefined) => {
    onPreferenceChange((current) => ({ ...current, shape }));
  };
  const setTag = <K extends keyof NonNullable<SlotPreference["tags"]>>(key: K, value: NonNullable<SlotPreference["tags"]>[K] | undefined) => {
    onPreferenceChange((current) => {
      const tags = { ...(current.tags ?? {}) };
      if (value === undefined || value === false || value === null) delete tags[key];
      else tags[key] = value;
      return { ...current, tags: Object.keys(tags).length > 0 ? tags : undefined };
    });
  };

  return (
    <div className="border-2 border-[var(--ballpark-panel-border)] bg-[#1f2a23] p-3">
      <div className="text-sm font-bold text-[var(--ballpark-chalk)] mb-3">{slotLabel(slot)} — THE ASK</div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(220px,2fr)] gap-4">
        <div className="max-h-[320px] overflow-y-auto bg-[var(--ballpark-well)] border-2 border-[var(--ballpark-panel-border)]">
          <ShapeRow
            selected={!preference.shape}
            disabled={readOnly}
            count={countEligibleForAsk(slot, undefined, classifiedPool)}
            onClick={() => setShape(undefined)}
            title="ANY SHAPE"
          />
          {groups.map((group) => (
            <div key={group.label ?? "default"}>
              {group.label ? <div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-[0.16em] text-[var(--ballpark-brass)]">{group.label}</div> : null}
              {group.shapes.map((shape) => {
                const count = countEligibleForAsk(slot, shape.family, classifiedPool);
                const disabled = readOnly || count === 0;
                return (
                  <ShapeRow
                    key={`${group.label ?? "default"}-${shape.family}`}
                    selected={preference.shape === shape.family}
                    disabled={disabled}
                    count={count}
                    onClick={() => setShape(shape.family)}
                    title={shape.family}
                    detail={shapeIdentityLine(shape)}
                    fitsIdentity={alignedFamilies.has(shape.family)}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {preference.shape ? (
            <ToggleControl
              label="NEAR MATCHES COUNT"
              checked={preference.allowRunnerUp ?? true}
              disabled={readOnly}
              onChange={(checked) => onPreferenceChange((current) => ({ ...current, allowRunnerUp: checked }))}
            />
          ) : null}

          {slotKindIsHitter(slot) ? (
            <>
              <SegmentedControl
                label="BATS"
                value={preference.tags?.bats ?? "ANY"}
                options={["ANY", "L", "R", "S"]}
                disabled={readOnly}
                onChange={(value) => setTag("bats", value === "ANY" ? undefined : value as "L" | "R" | "S")}
              />
              <SegmentedControl
                label="PLATOON"
                value={preference.tags?.platoonSide ?? "ANY"}
                options={["ANY", "vs-LHP", "vs-RHP"]}
                display={{ "vs-LHP": "VS LHP", "vs-RHP": "VS RHP" }}
                disabled={readOnly}
                onChange={(value) => setTag("platoonSide", value === "ANY" ? undefined : value as "vs-LHP" | "vs-RHP")}
              />
              <ToggleControl
                label="PLAYS MULTIPLE SPOTS"
                checked={Boolean(preference.tags?.utility)}
                disabled={readOnly}
                onChange={(checked) => setTag("utility", checked ? true : undefined)}
              />
            </>
          ) : null}

          {slotKindIsPitcher(slot) ? (
            <ToggleControl
              label="LEFTY ARM"
              checked={Boolean(preference.tags?.leftArm)}
              disabled={readOnly}
              onChange={(checked) => setTag("leftArm", checked ? true : undefined)}
            />
          ) : null}

          <ToggleControl
            label="TWO-WAY"
            checked={Boolean(preference.tags?.twoWay)}
            disabled={readOnly}
            onChange={(checked) => setTag("twoWay", checked ? true : undefined)}
          />
          <SegmentedControl
            label="TEMPERAMENT"
            value={preference.personalityTilt ?? "any"}
            options={["any", "prefer-steady", "avoid-fragile", "embrace-volatility"]}
            display={{
              any: "ANY",
              "prefer-steady": "STEADY",
              "avoid-fragile": "NO FRAGILE",
              "embrace-volatility": "EGO WELCOME",
            }}
            disabled={readOnly}
            onChange={(value) => onPreferenceChange((current) => ({ ...current, personalityTilt: value as PersonalityTilt }))}
          />
        </div>
      </div>
    </div>
  );
}

function ShapeRow({
  selected,
  disabled,
  count,
  title,
  detail,
  fitsIdentity = false,
  onClick,
}: {
  selected: boolean;
  disabled: boolean;
  count: number;
  title: string;
  detail?: string | null;
  fitsIdentity?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classNames(
        "w-full border-b border-[var(--ballpark-panel-border)] px-3 py-2 text-left active:scale-[0.99] disabled:opacity-45",
        selected ? "bg-[#3a4d3c]" : "hover:bg-[var(--ballpark-action-green)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-[var(--ballpark-chalk)]">{title}</span>
            {fitsIdentity ? (
              <span className="border border-[var(--ballpark-brass)] px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[var(--ballpark-brass)]">
                FITS YOUR IDENTITY
              </span>
            ) : null}
          </div>
          {detail ? <div className="mt-0.5 text-[11px] leading-snug text-[var(--ballpark-chalk)]/70">{detail}</div> : null}
        </div>
        <span className="shrink-0 border border-[var(--ballpark-panel-border)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--ballpark-chalk)]/70">
          ×{count}
        </span>
      </div>
    </button>
  );
}

function ToggleControl({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      className={classNames(
        "w-full flex items-center justify-between gap-3 border-2 px-3 py-2 text-left active:scale-[0.98] disabled:opacity-45",
        checked ? "border-[var(--ballpark-brass)] bg-[#3a4d3c]" : "border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)]",
      )}
    >
      <span className="text-[11px] font-bold tracking-wider text-[var(--ballpark-chalk)]">{label}</span>
      <span className={checked ? "text-[var(--ballpark-status-green)]" : "text-[var(--ballpark-chalk)]/45"}>
        {checked ? "✓" : "·"}
      </span>
    </button>
  );
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  display = {},
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  display?: Partial<Record<T, string>>;
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-[0.14em] text-[var(--ballpark-brass)] mb-1">{label}</div>
      <div className="flex flex-wrap border-2 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)]">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            disabled={disabled}
            className={classNames(
              "flex-1 min-w-fit px-2 py-1.5 text-[11px] font-bold active:scale-95 disabled:opacity-45",
              value === option ? "bg-[var(--ballpark-brass)] text-[#1A1A1A]" : "text-[var(--ballpark-chalk)]/75 hover:bg-[var(--ballpark-action-green)]",
            )}
          >
            {display[option] ?? option}
          </button>
        ))}
      </div>
    </div>
  );
}

function HelpNote({ children }: { children: ReactNode }) {
  return (
    <div className="border-l-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] px-3 py-2 text-xs leading-relaxed text-[var(--ballpark-chalk)]/75">
      {children}
    </div>
  );
}

export function rosterDesignHasBeenEdited(team: Team): boolean {
  return hasEditedDesign(team);
}
