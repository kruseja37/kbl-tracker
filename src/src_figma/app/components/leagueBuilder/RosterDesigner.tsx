import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { PressButton } from "../ballpark";
import {
  buildDefaultDesignSlots,
  countEligibleForAsk,
  evaluateRosterDesign,
  rankPoolForSlot,
  askSatisfaction,
  type DesignBlocker,
  type DesignFeasibilityResult,
  type DesignPoolPlayer,
  type DesignSlot,
  type RankedPoolEntry,
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
import { historicalToSimArchetype } from "../../../../engines/draftabilityRanker";
import { buildBest22Target, type Best22Target, type Best22TargetPick } from "../../../../engines/best22Target";
import type { TierKey } from "../../../../data/tierParams";
import { buildRosterDesignPool, demandUniverseFromPlayers } from "../../engines/leaguePlayerAdapter";
import {
  designTargetChipCopy,
  designTargetStripCopy,
  designVerdictCopy,
  designVerdictTone,
  formatVerdictMoney,
  targetVerdictState,
  type TargetVerdictState,
  type VerdictTone,
} from "./designVerdict";
import type { DraftPoolMode, Player, Team } from "../../../../utils/leagueBuilderStorage";
import { PlayerProfilePopover } from "../shared/PlayerProfilePopover";

export { buildRosterDesignPool } from "../../engines/leaguePlayerAdapter";

type RosterDesignPins = Record<string, string>;
type RosterDesignSave = {
  slots: DesignSlot[];
  lockedAt?: string;
  pins?: RosterDesignPins;
  rankOverrides?: Record<string, string[]>;
};
type PinDisplay = {
  playerId: string;
  playerName: string;
  salary?: number;
  honorsAsk: boolean;
  orphaned: boolean;
  dropped: boolean;
};

type RosterDesignerProps = {
  team: Team;
  mode: DraftPoolMode;
  players: readonly Player[];
  lockedPool: boolean;
  budget: number;
  tier: TierKey;
  showHelp: boolean;
  disabled?: boolean;
  disabledReason?: string | null;
  poolDrawn?: boolean;
  onSave: (design: RosterDesignSave) => Promise<void>;
};

const LINEUP_SLOT_IDS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
const STAFF_SLOT_IDS = ["SP1", "SP2", "SP3", "SP4", "RP1", "RP2", "RP3", "CP"];
const BENCH_SLOT_IDS = ["backupC", "FLEX1", "FLEX2", "FLEX3", "FLEX4", "SWING"];
const FIELD_POSITIONS = new Set<string>(LINEUP_SLOT_IDS);
const HITTER_SHAPES = ALL_SHAPES.filter((shape) => shape.role === "hitter" || shape.role === "both");
const DEPTH_SHAPE_FAMILIES = new Set(EXTENDED_SHAPES.filter((shape) => shape.depthClass).map((shape) => shape.family));

function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function cleanPins(pins: RosterDesignPins | undefined): RosterDesignPins {
  if (!pins) return {};
  return Object.fromEntries(Object.entries(pins).filter(([, playerId]) => typeof playerId === "string" && playerId.length > 0));
}

function savePayload(slots: DesignSlot[], lockedAt: string | undefined, pins: RosterDesignPins): RosterDesignSave {
  const cleanedPins = cleanPins(pins);
  return {
    slots,
    lockedAt,
    ...(Object.keys(cleanedPins).length > 0 ? { pins: cleanedPins } : {}),
  };
}

function defaultPreferenceForSlot(slotId: string): SlotPreference {
  return {
    allowRunnerUp: true,
    personalityTilt: slotId === "C" || slotId === "SS" || slotId === "SP1" || slotId === "CP" ? "avoid-fragile" : "any",
  };
}

function mergePreference(defaultPreference: SlotPreference, savedPreference: SlotPreference | undefined): SlotPreference {
  return {
    ...defaultPreference,
    ...savedPreference,
    tags: savedPreference?.tags ? { ...savedPreference.tags } : defaultPreference.tags,
  };
}

function slotKindAllowsTwoWay(slot: DesignSlot): boolean {
  return slot.kind === "backupC" || slot.kind === "sp" || slot.kind === "rp" || slot.kind === "cp" || slot.kind === "swing";
}

function sanitizePreferenceForSlot(slot: DesignSlot, preference: SlotPreference): SlotPreference {
  if (slotKindAllowsTwoWay(slot) || !preference.tags?.twoWay) return preference;
  const tags = { ...preference.tags };
  delete tags.twoWay;
  return {
    ...preference,
    tags: Object.keys(tags).length > 0 ? tags : undefined,
  };
}

export function seedRosterDesignSlots(savedSlots?: readonly DesignSlot[]): DesignSlot[] {
  const savedById = new Map((savedSlots ?? []).map((slot) => [slot.slotId, slot]));
  return buildDefaultDesignSlots().map((slot) => {
    const saved = savedById.get(slot.slotId) ?? (slot.kind === "cp" ? savedById.get("RP4") : undefined);
    return {
      ...slot,
      preference: sanitizePreferenceForSlot(slot, mergePreference(defaultPreferenceForSlot(slot.slotId), saved?.preference)),
    };
  });
}

export function rosterDesignStatusTone(slots: readonly DesignSlot[], players: readonly Player[], budget: number): VerdictTone {
  const pool = buildRosterDesignPool(players);
  if (pool.length === 0) return "quiet";
  return designVerdictTone(evaluateRosterDesign(slots, pool, budget), pool.length);
}

function slotLabel(slot: DesignSlot): string {
  if (slot.slotId === "backupC") return "BACKUP C";
  if (slot.slotId.startsWith("FLEX")) return `BENCH ${slot.slotId.replace("FLEX", "")}`;
  if (slot.kind === "cp") return "CP · CLOSER";
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
  return slot.kind === "sp" || slot.kind === "rp" || slot.kind === "cp" || slot.kind === "swing";
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
  if (slot.kind === "cp") return [{ shapes: menuForPosition("CP") }];
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
  if (slot.kind === "cp") return "CP";
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
  tier,
  showHelp,
  disabled = false,
  disabledReason,
  poolDrawn = false,
  onSave,
}: RosterDesignerProps) {
  const loadedTeamId = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const dirtyTeamIdRef = useRef<string | null>(null);
  const dirtyVersionRef = useRef(0);
  const renderedTeamIdRef = useRef(team.id);
  const saveInFlightRef = useRef<{ teamId: string; version: number } | null>(null);
  const latestPendingSaveRef = useRef<{
    teamId: string;
    save: RosterDesignerProps["onSave"];
    slots: DesignSlot[];
    lockedAt: string | undefined;
    pins: RosterDesignPins;
  } | null>(null);
  const resetConfirmRef = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState<DesignSlot[]>(() => seedRosterDesignSlots(team.rosterDesign?.slots));
  const [lockedAt, setLockedAt] = useState<string | undefined>(team.rosterDesign?.lockedAt);
  const [pins, setPins] = useState<RosterDesignPins>(() => cleanPins(team.rosterDesign?.pins));
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [result, setResult] = useState<DesignFeasibilityResult | null>(null);
  const [target, setTarget] = useState<Best22Target | null>(null);
  const [targetState, setTargetState] = useState<TargetVerdictState>("quiet");
  const [resetConfirm, setResetConfirm] = useState(false);

  renderedTeamIdRef.current = team.id;
  latestPendingSaveRef.current = { teamId: team.id, save: onSave, slots, lockedAt, pins };

  const persistDirtySave = useCallback((
    teamId: string,
    save: RosterDesignerProps["onSave"],
    nextSlots: DesignSlot[],
    nextLockedAt: string | undefined,
    nextPins: RosterDesignPins,
  ) => {
    if (!dirtyRef.current || dirtyTeamIdRef.current !== teamId) return;
    if (saveInFlightRef.current?.teamId === teamId) return;
    const version = dirtyVersionRef.current;
    saveInFlightRef.current = { teamId, version };
    void save(savePayload(nextSlots, nextLockedAt, nextPins)).then(() => {
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
    return () => {
      const pending = latestPendingSaveRef.current;
      if (pending) persistDirtySave(pending.teamId, pending.save, pending.slots, pending.lockedAt, pending.pins);
    };
  }, [persistDirtySave]);

  useEffect(() => {
    if (loadedTeamId.current === team.id) return;
    loadedTeamId.current = team.id;
    setSlots(seedRosterDesignSlots(team.rosterDesign?.slots));
    setLockedAt(team.rosterDesign?.lockedAt);
    setPins(cleanPins(team.rosterDesign?.pins));
    setSelectedSlotId(null);
    setResult(null);
    setTarget(null);
    setTargetState("quiet");
    setResetConfirm(false);
  }, [team.id, team.rosterDesign?.lockedAt, team.rosterDesign?.pins, team.rosterDesign?.slots]);

  const designPool = useMemo(() => buildRosterDesignPool(players), [players]);
  const fullPlayerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const simPool = useMemo(() => demandUniverseFromPlayers(players), [players]);
  const targetArchetype = useMemo(() => {
    const historical = HISTORICAL_ARCHETYPES.find((archetype) => archetype.id === team.mlbArchetypeKey);
    return historical ? historicalToSimArchetype(historical) : null;
  }, [team.mlbArchetypeKey]);
  const targetClassifiedById = useMemo(
    () => new Map(simPool.map((player) => [player.id, classifyPlayerArchetype(player.profile)])),
    [simPool],
  );
  const classifiedPool = useMemo(
    () => designPool.map((player) => ({ ...player, classification: classifyPlayerArchetype(player.profile) })),
    [designPool],
  );
  const pinMemoKey = useMemo(() => JSON.stringify(Object.entries(pins).sort(([left], [right]) => left.localeCompare(right))), [pins]);
  const pinMap = useMemo(() => new Map(Object.entries(pins)), [pinMemoKey]);

  useEffect(() => {
    const effectTeamId = team.id;
    const timer = window.setTimeout(() => {
      const nextResult = designPool.length > 0 ? evaluateRosterDesign(slots, designPool, budget) : null;
      const nextTarget = designPool.length > 0 && targetArchetype
        ? buildBest22Target(slots, simPool, targetClassifiedById, targetArchetype, tier, budget, pinMap)
        : null;
      setResult(nextResult);
      setTarget(nextTarget);
      setTargetState(targetVerdictState({
        poolSize: designPool.length,
        hasIdentity: Boolean(targetArchetype),
        target: nextTarget,
      }));
      persistDirtySave(effectTeamId, onSave, slots, lockedAt, pins);
    }, 300);
    return () => {
      window.clearTimeout(timer);
      if (renderedTeamIdRef.current !== effectTeamId) {
        persistDirtySave(effectTeamId, onSave, slots, lockedAt, pins);
      }
    };
  }, [budget, designPool, lockedAt, onSave, pinMap, pins, persistDirtySave, simPool, slots, targetArchetype, targetClassifiedById, team.id, tier]);

  useEffect(() => {
    if (!resetConfirm) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (resetConfirmRef.current?.contains(event.target as Node)) return;
      setResetConfirm(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [resetConfirm]);

  const pinDisplayBySlot = useMemo(() => {
    const displays = new Map<string, PinDisplay>();
    const designPlayerById = new Map(designPool.map((player) => [player.id, player]));
    const classificationById = new Map(classifiedPool.map((player) => [player.id, player.classification]));
    const targetPickBySlotId = new Map((target?.picks ?? []).map((pick) => [pick.slotId, pick]));
    const droppedBySlotId = new Map((target?.pins.dropped ?? []).map((drop) => [drop.slotId, drop]));

    for (const slot of slots) {
      const playerId = pinMap.get(slot.slotId);
      if (!playerId) continue;
      const poolPlayer = designPlayerById.get(playerId);
      const targetPick = targetPickBySlotId.get(slot.slotId);
      const dropped = droppedBySlotId.get(slot.slotId);
      const classification = classificationById.get(playerId);
      const satisfaction = classification ? askSatisfaction(slot.preference, classification) : null;
      const hasShapeAsk = Boolean(slot.preference?.shape);
      const hasTagAsk = Object.values(slot.preference?.tags ?? {}).some(Boolean);
      const honorsAsk = targetPick?.playerId === playerId
        ? targetPick.honorsAsk
        : !hasShapeAsk && !hasTagAsk
          ? true
          : Boolean(satisfaction?.satisfiesShape && satisfaction.satisfiesTags);
      displays.set(slot.slotId, {
        playerId,
        playerName: targetPick?.playerId === playerId
          ? targetPick.playerName ?? playerId
          : poolPlayer?.name ?? playerId,
        salary: targetPick?.playerId === playerId ? targetPick.salary : poolPlayer?.salary,
        honorsAsk,
        orphaned: !poolPlayer,
        dropped: Boolean(poolPlayer && dropped),
      });
    }

    return displays;
  }, [classifiedPool, designPool, pinMap, slots, target]);

  const selectedSlot = slots.find((slot) => slot.slotId === selectedSlotId) ?? null;
  const tone = designVerdictTone(result, designPool.length);
  const chip = {
    state: designVerdictCopy(result, tone),
    cost: designTargetChipCopy(result, targetState, target),
  };
  const baseTargetStrip = designTargetStripCopy(targetState, target);
  const pinCount = pinMap.size;
  const droppedPinCount = target?.pins.dropped.length ?? 0;
  const pinStripSegment = pinCount > 0 && target
    ? droppedPinCount > 0
      ? ` · ${droppedPinCount} OF ${pinCount} PINS CAN'T LAND`
      : ` · ${pinCount} PIN${pinCount === 1 ? "" : "S"} LOCKED IN`
    : "";
  const pinnedTargetInfeasible = pinCount > 0 && Boolean(target && !target.feasible && target.pins.honored.length > 0);
  const targetStrip = pinnedTargetInfeasible
    ? "THE 22 AROUND YOUR PINS BREAKS THE CAP OR THE ROSTER LAW — EASE A PIN OR RIDE IT"
    : baseTargetStrip
      ? `${baseTargetStrip}${pinStripSegment}`
      : null;
  const feasibleTarget = targetState === "feasible" ? target : null;
  const blockers = result?.blockers ?? [];
  const blockedIds = blockedSlotIds(blockers);
  const readOnly = disabled || Boolean(lockedAt);
  const canLock = mode === "design-first" && !disabled && !lockedAt && tone === "green";
  const lockedByDesign = Boolean(lockedAt) && !disabled;
  const poolReplanning = poolDrawn && mode === "design-first" && !lockedPool && !lockedAt;
  const unlockConsequenceVisible = poolDrawn && mode === "design-first" && !lockedPool && Boolean(lockedAt);

  const markDirty = () => {
    dirtyRef.current = true;
    dirtyTeamIdRef.current = team.id;
    dirtyVersionRef.current += 1;
  };

  const updateSlot = (slotId: string, update: (slot: DesignSlot) => DesignSlot) => {
    if (readOnly) return;
    markDirty();
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
    markDirty();
    setSlots(seedRosterDesignSlots());
    setPins({});
    setLockedAt(undefined);
    setSelectedSlotId(null);
    setResetConfirm(false);
  };

  const lockDesign = () => {
    if (!canLock) return;
    markDirty();
    setLockedAt(new Date().toISOString());
  };

  const unlockDesign = () => {
    if (disabled) return;
    markDirty();
    setLockedAt(undefined);
  };

  const pinPlayerToSlot = (slotId: string, playerId: string) => {
    if (readOnly) return;
    const nextPins = Object.fromEntries(
      Object.entries(pins).filter(([currentSlotId, currentPlayerId]) => currentSlotId !== slotId && currentPlayerId !== playerId),
    );
    if (nextPins[slotId] === playerId) return;
    markDirty();
    setPins({ ...nextPins, [slotId]: playerId });
  };

  const unpinSlot = (slotId: string) => {
    if (readOnly || !pins[slotId]) return;
    const nextPins = { ...pins };
    delete nextPins[slotId];
    markDirty();
    setPins(nextPins);
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
        {targetStrip ? (
          <div
            className={classNames(
              "mt-2 text-[11px] font-bold tracking-[0.12em]",
              (targetState === "infeasible" || droppedPinCount > 0 || pinnedTargetInfeasible) && "text-[var(--ballpark-status-warn)]",
              targetState === "no-identity" && "text-[var(--ballpark-chalk)]/55",
              targetState === "feasible" && droppedPinCount === 0 && !pinnedTargetInfeasible && "text-[var(--ballpark-brass)]",
            )}
          >
            {targetStrip}
          </div>
        ) : null}
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
              <div className="flex flex-wrap items-center gap-2">
                <PressButton size="md" variant="gold" onClick={unlockDesign} disabled={disabled}>
                  UNLOCK & EDIT
                </PressButton>
                {unlockConsequenceVisible ? (
                  <span className="text-[11px] text-[var(--ballpark-chalk)]/55">EDITS RE-OPEN THE PLAN — LOCK AGAIN AND RE-EXTRACT TO APPLY</span>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <PressButton size="md" variant="gold" onClick={lockDesign} disabled={!canLock}>
                  LOCK DESIGN
                </PressButton>
                {poolReplanning && tone === "green" ? (
                  <span className="text-[11px] text-[var(--ballpark-chalk)]/55">LOCK TO QUEUE THE RE-EXTRACT — THE POOL STILL REFLECTS YOUR OLD PLAN</span>
                ) : tone !== "green" && tone !== "quiet" ? (
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
            Two numbers, two questions. FLOOR is the cheapest legal way to fill your 22 — proof it builds, not a plan. TARGET is the 22 this pool would hand you if the room broke your way — the best expression of your identity and your asks under the cap. Chase the target; trust the floor. Prices are asking prices — the room sets the real ones.
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
          target={feasibleTarget}
          pinDisplayBySlot={pinDisplayBySlot}
          onSelect={setSelectedSlotId}
        />
        <SlotGroup
          title="THE STAFF"
          slots={slots.filter((slot) => STAFF_SLOT_IDS.includes(slot.slotId))}
          result={result}
          blockedIds={blockedIds}
          selectedSlotId={selectedSlotId}
          target={feasibleTarget}
          pinDisplayBySlot={pinDisplayBySlot}
          onSelect={setSelectedSlotId}
        />
        <SlotGroup
          title="THE BENCH"
          slots={slots.filter((slot) => BENCH_SLOT_IDS.includes(slot.slotId))}
          result={result}
          blockedIds={blockedIds}
          selectedSlotId={selectedSlotId}
          target={feasibleTarget}
          pinDisplayBySlot={pinDisplayBySlot}
          onSelect={setSelectedSlotId}
        />
      </div>

      {selectedSlot ? (
        <SlotEditor
          slot={selectedSlot}
          readOnly={readOnly}
          identityKey={team.mlbArchetypeKey}
          designPool={designPool}
          fullPlayerById={fullPlayerById}
          classifiedPool={classifiedPool}
          targetPick={feasibleTarget?.picks.find((pick) => pick.slotId === selectedSlot.slotId) ?? null}
          pinDisplay={pinDisplayBySlot.get(selectedSlot.slotId) ?? null}
          pinnedPlayerId={pins[selectedSlot.slotId] ?? null}
          lockedByDesign={lockedByDesign}
          disabledReason={disabledReason}
          onPreferenceChange={(update) => updatePreference(selectedSlot.slotId, update)}
          onPin={(playerId) => pinPlayerToSlot(selectedSlot.slotId, playerId)}
          onUnpin={() => unpinSlot(selectedSlot.slotId)}
          onUnlock={unlockDesign}
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
  target,
  pinDisplayBySlot,
  onSelect,
}: {
  title: string;
  slots: readonly DesignSlot[];
  result: DesignFeasibilityResult | null;
  blockedIds: ReadonlySet<string>;
  selectedSlotId: string | null;
  target: Best22Target | null;
  pinDisplayBySlot: ReadonlyMap<string, PinDisplay>;
  onSelect: (slotId: string) => void;
}) {
  const resolutionById = new Map((result?.slots ?? []).map((slot) => [slot.slotId, slot]));
  const targetPickById = new Map((target?.picks ?? []).map((pick) => [pick.slotId, pick]));
  return (
    <div>
      <div className="text-[11px] font-bold tracking-[0.16em] text-[var(--ballpark-brass)] mb-2">{title}</div>
      <div className="space-y-2">
        {slots.map((slot) => {
          const resolution = resolutionById.get(slot.slotId);
          const targetPick = targetPickById.get(slot.slotId);
          const pinDisplay = pinDisplayBySlot.get(slot.slotId);
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
              <span className="min-w-0">
                <span className={classNames("block truncate text-sm", slot.preference?.shape ? "text-[var(--ballpark-chalk)]" : "text-[var(--ballpark-chalk)]/45")}>
                  {slotShapeSummary(slot)}
                </span>
                {pinDisplay ? (
                  <span
                    className={classNames(
                      "mt-0.5 block truncate text-[11px]",
                      pinDisplay.orphaned || pinDisplay.dropped ? "text-[var(--ballpark-status-warn)]" : "text-[var(--ballpark-brass)]",
                    )}
                  >
                    {pinDisplay.orphaned
                      ? `📌 ${pinDisplay.playerName} — OUT OF THE POOL`
                      : pinDisplay.dropped
                        ? `📌 ${pinDisplay.playerName} — CAN'T PIN HERE`
                        : `${pinDisplay.honorsAsk ? "" : "≈ "}📌 ${pinDisplay.playerName} · ${formatVerdictMoney(pinDisplay.salary)}`}
                  </span>
                ) : targetPick?.playerId ? (
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--ballpark-brass)]/70">
                    {targetPick.honorsAsk ? "" : "≈ "}→ {targetPick.playerName ?? targetPick.playerId} · {formatVerdictMoney(targetPick.salary)}
                  </span>
                ) : null}
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
  designPool,
  fullPlayerById,
  classifiedPool,
  targetPick,
  pinDisplay,
  pinnedPlayerId,
  lockedByDesign = false,
  disabledReason,
  onPreferenceChange,
  onPin,
  onUnpin,
  onUnlock,
}: {
  slot: DesignSlot;
  readOnly: boolean;
  identityKey: string | undefined;
  designPool: readonly DesignPoolPlayer[];
  fullPlayerById: ReadonlyMap<string, Player>;
  classifiedPool: readonly ClassifiedDesignPlayer[];
  targetPick: Best22TargetPick | null;
  pinDisplay: PinDisplay | null;
  pinnedPlayerId: string | null;
  lockedByDesign?: boolean;
  disabledReason?: string | null;
  onPreferenceChange: (update: (preference: SlotPreference) => SlotPreference) => void;
  onPin: (playerId: string) => void;
  onUnpin: () => void;
  onUnlock?: () => void;
}) {
  const groups = menuGroupsForSlot(slot);
  const visibleShapes = groups.flatMap((group) => group.shapes);
  const alignedFamilies = topAlignedFamilies(slot, visibleShapes, identityKey);
  const preference = slot.preference ?? defaultPreferenceForSlot(slot.slotId);
  const classificationById = useMemo(
    () => new Map(classifiedPool.map((player) => [player.id, player.classification])),
    [classifiedPool],
  );
  const shortlist = useMemo(
    () => rankPoolForSlot(slot, preference, designPool).slice(0, 5),
    [designPool, preference, slot],
  );

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
      {lockedByDesign ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-2 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] px-3 py-2">
          <span className="text-[11px] font-bold tracking-[0.08em] text-[var(--ballpark-brass)]">🔒 THE ASK IS LOCKED — THE POOL WAS DRAWN FROM IT</span>
          <PressButton size="sm" variant="gold" onClick={onUnlock ?? (() => undefined)}>
            UNLOCK & EDIT
          </PressButton>
        </div>
      ) : readOnly && disabledReason ? (
        <div className="mb-3 border-2 border-[var(--ballpark-status-warn)] bg-[var(--ballpark-well)] px-3 py-2 text-[11px] font-bold tracking-[0.08em] text-[var(--ballpark-status-warn)]">
          {disabledReason}
        </div>
      ) : null}
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

          {slotKindAllowsTwoWay(slot) ? (
            <ToggleControl
              label="TWO-WAY"
              checked={Boolean(preference.tags?.twoWay)}
              disabled={readOnly}
              onChange={(checked) => setTag("twoWay", checked ? true : undefined)}
            />
          ) : null}
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

          {pinDisplay ? (
            <div
              className={classNames(
                "flex flex-wrap items-center justify-between gap-2 border-2 bg-[var(--ballpark-well)] px-3 py-2 text-[11px] font-bold tracking-[0.08em]",
                pinDisplay.orphaned || pinDisplay.dropped
                  ? "border-[var(--ballpark-status-warn)] text-[var(--ballpark-status-warn)]"
                  : "border-[var(--ballpark-brass)] text-[var(--ballpark-brass)]",
              )}
            >
              <span>
                {pinDisplay.orphaned
                  ? `PINNED: ${pinDisplay.playerName} — LEFT THE POOL. RE-EXTRACT CAN BRING HIM BACK.`
                  : pinDisplay.dropped
                    ? `PINNED: ${pinDisplay.playerName} — CAN'T PIN TO THIS SLOT`
                  : `PINNED TO THIS SLOT: ${pinDisplay.playerName} · ${formatVerdictMoney(pinDisplay.salary)}`}
              </span>
              {!readOnly ? (
                <PressButton size="sm" onClick={onUnpin}>
                  UNPIN
                </PressButton>
              ) : null}
            </div>
          ) : null}

          <ShortlistRail
            entries={shortlist}
            preference={preference}
            classificationById={classificationById}
            fullPlayerById={fullPlayerById}
            targetPick={targetPick}
            readOnly={readOnly}
            pinnedPlayerId={pinnedPlayerId}
            onPin={onPin}
            onUnpin={onUnpin}
          />
        </div>
      </div>
    </div>
  );
}

function ShortlistRail({
  entries,
  preference,
  classificationById,
  fullPlayerById,
  targetPick,
  readOnly,
  pinnedPlayerId,
  onPin,
  onUnpin,
}: {
  entries: readonly RankedPoolEntry[];
  preference: SlotPreference;
  classificationById: ReadonlyMap<string, ShapeClassification>;
  fullPlayerById: ReadonlyMap<string, Player>;
  targetPick: Best22TargetPick | null;
  readOnly: boolean;
  pinnedPlayerId: string | null;
  onPin: (playerId: string) => void;
  onUnpin: () => void;
}) {
  return (
    <div className="border-2 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-3">
      <div className="mb-2 text-[10px] font-bold tracking-[0.14em] text-[var(--ballpark-brass)]">THE ASK&apos;S SHORTLIST</div>
      {entries.length === 0 ? (
        <div className="text-[11px] leading-snug text-[var(--ballpark-chalk)]/45">NOBODY IN THE POOL FITS THIS ASK YET</div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry) => {
            const classification = classificationById.get(entry.playerId);
            const satisfaction = classification ? askSatisfaction(preference, classification) : null;
            const runnerUp = satisfaction?.shapeMatch === "runnerUp";
            const isTarget = targetPick?.playerId === entry.playerId;
            const pinnedHere = pinnedPlayerId === entry.playerId;
            const fullPlayer = fullPlayerById.get(entry.playerId);
            const name = (
              <span className="min-w-0 truncate">
                {runnerUp ? <span className="text-[var(--ballpark-status-warn)]">≈ </span> : null}
                {entry.playerName ?? entry.playerId} · {entry.shape} · {formatVerdictMoney(entry.salary)}
              </span>
            );
            return (
              <div key={entry.playerId} className="flex items-center justify-between gap-2 text-[11px] text-[var(--ballpark-chalk)]/75">
                {fullPlayer ? (
                  <PlayerProfilePopover player={fullPlayer} revealFull>
                    {name}
                  </PlayerProfilePopover>
                ) : (
                  name
                )}
                <span className="shrink-0 flex items-center gap-1">
                  {isTarget ? (
                    <span className="border border-[var(--ballpark-brass)] px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[var(--ballpark-brass)]">
                      TARGET
                    </span>
                  ) : null}
                  {!readOnly ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (pinnedHere) onUnpin();
                        else onPin(entry.playerId);
                      }}
                      className={classNames(
                        "border px-1.5 py-0.5 text-[9px] font-bold tracking-wider active:scale-95",
                        pinnedHere
                          ? "border-[var(--ballpark-brass)] bg-[var(--ballpark-brass)] text-[#1A1A1A]"
                          : "border-[var(--ballpark-panel-border)] text-[var(--ballpark-brass)] hover:border-[var(--ballpark-brass)]",
                      )}
                    >
                      {pinnedHere ? "PINNED ✓" : "PIN"}
                    </button>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      )}
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
