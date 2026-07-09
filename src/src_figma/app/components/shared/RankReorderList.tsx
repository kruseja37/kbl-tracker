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

export function RankReorderList<T>({
  items,
  getId,
  itemLabel,
  onReorder,
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
    const clamped = Math.min(Math.max(parsed, 1), items.length);
    cancelEdit();
    commitMove(fromIndex, clamped - 1);
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
        const rank = index + 1;
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
              if (dragIndex >= 0) commitMove(dragIndex, index);
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
                  max={items.length}
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
                    onClick={() => commitMove(index, 0)}
                    disabled={index === 0}
                    aria-label={`Send ${label} to top`}
                    title="Send to top"
                    className={sendToTopClassName}
                  >
                    <ChevronsUp className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => commitMove(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Move ${label} up`}
                    className={arrowButtonClassName}
                  >
                    <ArrowUp className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => commitMove(index, index + 1)}
                    disabled={index === items.length - 1}
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
