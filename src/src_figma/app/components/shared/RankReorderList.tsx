import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";

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
 */
export interface RankReorderListProps<T> {
  items: readonly T[];
  getId: (item: T) => string;
  /** Used to build the "Drag {label}" / "Move {label} up" / "Move {label} down" aria-labels. */
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
  "data-testid": dataTestId,
}: RankReorderListProps<T>) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const commitMove = (fromIndex: number, toIndex: number) => {
    if (readOnly || fromIndex === toIndex) return;
    onReorder(moveRankedId(items, getId, fromIndex, toIndex));
  };

  return (
    <div className={listClassName} data-testid={dataTestId}>
      {items.map((item, index) => {
        const id = getId(item);
        const label = itemLabel(item);
        const dragIndex = draggedId ? items.findIndex((candidate) => getId(candidate) === draggedId) : -1;
        const dragged = draggedId === id;
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
              {renderContent(item, index)}
            </span>
            <span className={rightWrapClassName}>
              {renderBeforeArrows?.(item, index)}
              {!readOnly ? (
                <>
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
