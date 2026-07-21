/* eslint-disable react-refresh/only-export-components -- this shared control deliberately exports its pure ranking helpers */
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUp, GripVertical } from "lucide-react";

/**
 * COCKPIT WAVE 2 (Correction 7, ASST_GM_DRAFT_INTELLIGENCE_SPEC_2026-07-04.md §7): the drag +
 * arrow reorder mechanics ORIGINALLY built for RosterDesigner's per-slot shortlist
 * (RosterDesigner.tsx ShortlistRail, commit 7b5214ca) extracted into ONE shared component so the
 * setup "RANK YOUR BOARD" zone and the live Tier-3 whisper board reuse the exact same interaction
 * model instead of forking it. RosterDesigner's shortlist now renders THROUGH this component with
 * no behavior change (see RosterDesigner.tsx ShortlistRail) — every styling knob below is a
 * REQUIRED prop (no shared default look) so each caller makes its skin choice explicit: the
 * shortlist keeps its pre-existing 1px-border treatment (no behavior/visual change), while new
 * Wave-2 UI is born on the DRAFT_SKIN_STANDARD_2026-07-08.md hard-edge treatments.
 *
 * BOARDFIX1 (2026-07-08): drag + arrows alone make a long-distance move (e.g. 44th overall to
 * top-5) impractical — native HTML5 drag doesn't auto-scroll a scrolling list, and arrows require
 * one click per rank. Two affordances close that gap, built once here so every caller (setup
 * board, live board, and — harmlessly, at 5 items — RosterDesigner's shortlist) gets them
 * identically: the rank badge becomes a click-to-edit "type a target rank" control, and a
 * "send to top" quick action sits next to the arrows.
 */
export interface RankReorderListProps<T> {
  items: readonly T[];
  getId: (item: T) => string;
  /** Used to build the "Drag {label}" / "Move {label} up" / "Move {label} down" /
   *  "Set rank for {label}" / "Send {label} to top" aria-labels. */
  itemLabel: (item: T) => string;
  onReorder: (orderedIds: readonly string[]) => void;
  /** Optional global move adapter for a paged window of a larger ranking. */
  onMove?: (fromIndex: number, toIndex: number) => void;
  /** Zero-based position of the first rendered item in the complete ranking. */
  rankOffset?: number;
  /** Complete ranking length, used by direct rank entry in a paged window. */
  totalItemCount?: number;
  readOnly?: boolean;
  /** The row's primary content (name/popover/etc) — rendered after the drag handle. */
  renderContent: (item: T, index: number) => ReactNode;
  /** Rendered before the arrow buttons, UNCONDITIONALLY (e.g. a TARGET badge). */
  renderBeforeArrows?: (item: T, index: number) => ReactNode;
  /** Rendered after the arrow buttons, only when NOT readOnly (e.g. a PIN button). */
  renderAfterArrows?: (item: T, index: number) => ReactNode;
  /** className for the outer list wrapper (defaults to the shortlist's original spacing). */
  listClassName?: string;
  rowClassName: (item: T, index: number, dragged: boolean) => string;
  leftWrapClassName: string;
  rightWrapClassName: string;
  dragHandleClassName: string;
  arrowButtonClassName: string;
  /** BOARDFIX1: the "#N" rank badge, click-to-edit into a type-in target rank. Required alongside
   *  rankInputClassName/sendToTopClassName — same no-shared-default-look discipline as every other
   *  style prop. Rendered UNCONDITIONALLY (even readOnly), matching renderBeforeArrows. */
  rankBadgeClassName: string;
  rankInputClassName: string;
  /** "Send to top" quick action, rendered next to the arrows — hidden when readOnly. */
  sendToTopClassName: string;
  "data-testid"?: string;
}

/** Generic id-array reorder — the same splice-based move RosterDesigner's movePlayerId used. */
export function moveRankedId<T>(
  items: readonly T[],
  getId: (item: T) => string,
  fromIndex: number,
  toIndex: number,
): string[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items.map(getId);
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map(getId);
}

/**
 * BOARDFIX2 (2026-07-08): materializes a FULL displayed order from a "natural" (engine/worth)
 * order plus an optional explicit GM override id sequence.
 *
 * Root cause this fixes: the live/setup board list (rosterIntelligencePayload.ts's
 * `sortByGmBlend`, out of this lane's allowed-edit surface — it's engine math) treats the GM's
 * explicit rank order as a NUDGE bonus added on top of raw worth, then re-sorts by
 * worth+bonus — it never MATERIALIZES the override as literal positions. A player explicitly
 * ranked #6 can still get leapfrogged back to #4 (or anywhere else) if enough higher-worth
 * players sit below rank 6, because their raw worth advantage can exceed the bonus a rank-6 nudge
 * grants. That is JK's exact reported symptom ("type in 6 and player moves to 4") — the sparse-
 * override hypothesis floated at dispatch time turned out not to be it (this component's own
 * commitEdit already receives and clamps against the FULL displayed `items` array); the blend's
 * bonus-vs-worth math is the real mechanism, even against a COMPLETE override permutation.
 *
 * Fix (caller-side, no engine edit needed): stop trusting the blend's SORT ORDER for anything the
 * user directly drags/types on. Instead, place every id that appears in `overrideIds` at EXACTLY
 * its override index (dropping any override id no longer present in `natural` — e.g. a player who
 * left the pool), then fill the remaining slots with the entries NOT in the override, in their
 * `natural` relative order (worth-ranked, since `natural`'s own order is unaffected by whether the
 * blend was given an override — every non-overridden id's bonus is always 0 regardless). The
 * result: a rank-edit lands exactly where it was typed and STAYS there on every subsequent render,
 * because once a view's ids are all present in the override (the common case after any edit, since
 * every move here persists the FULL reordered id list — see moveRankedId above), materialize is a
 * pure permutation, not a nudge.
 */
export function materializeRankOrder<T>(
  natural: readonly T[],
  getId: (item: T) => string,
  overrideIds: readonly string[] | undefined,
): T[] {
  if (!overrideIds || overrideIds.length === 0) return [...natural];
  const byId = new Map(natural.map((item) => [getId(item), item]));
  const placed = new Set<string>();
  const result: T[] = [];
  for (const id of overrideIds) {
    if (placed.has(id)) continue;
    const item = byId.get(id);
    if (!item) continue;
    result.push(item);
    placed.add(id);
  }
  for (const item of natural) {
    const id = getId(item);
    if (placed.has(id)) continue;
    result.push(item);
    placed.add(id);
  }
  return result;
}

export function RankReorderList<T>({
  items,
  getId,
  itemLabel,
  onReorder,
  onMove,
  rankOffset = 0,
  totalItemCount = items.length,
  readOnly = false,
  renderContent,
  renderBeforeArrows,
  renderAfterArrows,
  listClassName = "space-y-1.5",
  rowClassName,
  leftWrapClassName,
  rightWrapClassName,
  dragHandleClassName,
  arrowButtonClassName,
  rankBadgeClassName,
  rankInputClassName,
  sendToTopClassName,
  "data-testid": dataTestId,
}: RankReorderListProps<T>) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const commitMove = (fromIndex: number, toIndex: number) => {
    if (readOnly || fromIndex === toIndex) return;
    if (onMove) {
      onMove(fromIndex, toIndex);
      return;
    }
    onReorder(moveRankedId(items, getId, fromIndex, toIndex));
  };

  const beginEdit = (id: string, currentRank: number) => {
    if (readOnly) return;
    setEditingId(id);
    setEditValue(String(currentRank));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  /** Enter and blur both commit; non-numeric input cancels; a valid number clamps to [1, N]. */
  const commitEdit = (fromIndex: number) => {
    const trimmed = editValue.trim();
    if (trimmed.length === 0 || !/^-?\d+$/.test(trimmed)) {
      cancelEdit();
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    const clamped = Math.min(Math.max(parsed, 1), totalItemCount);
    cancelEdit();
    commitMove(rankOffset + fromIndex, clamped - 1);
  };

  const handleEditKeyDown = (event: KeyboardEvent<HTMLInputElement>, fromIndex: number) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitEdit(fromIndex);
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  };

  return (
    <div className={listClassName} data-testid={dataTestId}>
      {items.map((item, index) => {
        const id = getId(item);
        const label = itemLabel(item);
        const globalIndex = rankOffset + index;
        const rank = globalIndex + 1;
        const dragIndex = draggedId ? items.findIndex((candidate) => getId(candidate) === draggedId) : -1;
        const dragged = draggedId === id;
        const editing = editingId === id;
        return (
          <div
            key={id}
            onDragOver={(event) => {
              if (readOnly || !draggedId || draggedId === id) return;
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (dragIndex >= 0) commitMove(rankOffset + dragIndex, globalIndex);
              setDraggedId(null);
            }}
            className={rowClassName(item, index, dragged)}
          >
            <span className={leftWrapClassName}>
              {!readOnly ? (
                <button
                  type="button"
                  draggable
                  aria-label={`Drag ${label}`}
                  title="Drag to rank"
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", id);
                    setDraggedId(id);
                  }}
                  onDragEnd={() => setDraggedId(null)}
                  className={dragHandleClassName}
                >
                  <GripVertical className="h-3 w-3" aria-hidden="true" />
                </button>
              ) : null}
              {editing ? (
                <input
                  type="number"
                  autoFocus
                  min={1}
                  max={totalItemCount}
                  value={editValue}
                  aria-label={`Set rank for ${label}`}
                  className={rankInputClassName}
                  onChange={(event) => setEditValue(event.target.value)}
                  onFocus={(event) => event.currentTarget.select()}
                  onKeyDown={(event) => handleEditKeyDown(event, index)}
                  onBlur={() => commitEdit(index)}
                />
              ) : (
                <button
                  type="button"
                  disabled={readOnly}
                  aria-label={`Set rank for ${label}`}
                  title="Click to type a target rank"
                  onClick={() => beginEdit(id, rank)}
                  className={rankBadgeClassName}
                >
                  {rank}
                </button>
              )}
              {renderContent(item, index)}
            </span>
            <span className={rightWrapClassName}>
              {renderBeforeArrows?.(item, index)}
              {!readOnly ? (
                <>
                  <button
                    type="button"
                    onClick={() => commitMove(globalIndex, 0)}
                    disabled={globalIndex === 0}
                    aria-label={`Send ${label} to top`}
                    title="Send to top"
                    className={sendToTopClassName}
                  >
                    <ChevronsUp className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => commitMove(globalIndex, globalIndex - 1)}
                    disabled={globalIndex === 0}
                    aria-label={`Move ${label} up`}
                    className={arrowButtonClassName}
                  >
                    <ArrowUp className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => commitMove(globalIndex, globalIndex + 1)}
                    disabled={globalIndex === totalItemCount - 1}
                    aria-label={`Move ${label} down`}
                    className={arrowButtonClassName}
                  >
                    <ArrowDown className="h-3 w-3" aria-hidden="true" />
                  </button>
                  {renderAfterArrows?.(item, index)}
                </>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
