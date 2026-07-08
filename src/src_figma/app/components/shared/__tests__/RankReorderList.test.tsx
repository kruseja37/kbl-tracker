import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { RankReorderList, moveRankedId } from "../RankReorderList";

afterEach(() => {
  cleanup();
});

interface Item {
  id: string;
  name: string;
}

const ITEMS: Item[] = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Bravo" },
  { id: "c", name: "Charlie" },
];

function renderList(overrides: Partial<Parameters<typeof RankReorderList<Item>>[0]> = {}) {
  const onReorder = vi.fn();
  const utils = render(
    <RankReorderList<Item>
      items={ITEMS}
      getId={(item) => item.id}
      itemLabel={(item) => item.name}
      onReorder={onReorder}
      rowClassName={(_item, _index, dragged) => (dragged ? "dragged" : "row")}
      leftWrapClassName="left"
      rightWrapClassName="right"
      dragHandleClassName="drag-handle"
      arrowButtonClassName="arrow-button"
      renderContent={(item) => <span>{item.name}</span>}
      {...overrides}
    />,
  );
  return { onReorder, ...utils };
}

describe("moveRankedId", () => {
  test("moves an id from one index to another", () => {
    expect(moveRankedId(ITEMS, (item) => item.id, 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveRankedId(ITEMS, (item) => item.id, 2, 0)).toEqual(["c", "a", "b"]);
  });

  test("returns the unchanged order when indices are equal or out of range", () => {
    expect(moveRankedId(ITEMS, (item) => item.id, 1, 1)).toEqual(["a", "b", "c"]);
    expect(moveRankedId(ITEMS, (item) => item.id, -1, 1)).toEqual(["a", "b", "c"]);
    expect(moveRankedId(ITEMS, (item) => item.id, 0, 99)).toEqual(["a", "b", "c"]);
  });
});

describe("RankReorderList", () => {
  test("renders drag handle and arrow buttons per row, labeled with itemLabel", () => {
    renderList();
    expect(screen.getByRole("button", { name: "Drag Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move Alpha up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Alpha down" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Charlie down" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Charlie up" })).not.toBeDisabled();
  });

  test("arrow-down click commits a reorder via onReorder", () => {
    const { onReorder } = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Move Alpha down" }));
    expect(onReorder).toHaveBeenCalledWith(["b", "a", "c"]);
  });

  test("arrow-up click commits a reorder via onReorder", () => {
    const { onReorder } = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Move Charlie up" }));
    expect(onReorder).toHaveBeenCalledWith(["a", "c", "b"]);
  });

  test("readOnly hides the drag handle and arrow buttons, but still shows renderBeforeArrows", () => {
    renderList({
      readOnly: true,
      renderBeforeArrows: (item) => <span>BADGE-{item.id}</span>,
      renderAfterArrows: (item) => <span>AFTER-{item.id}</span>,
    });
    expect(screen.queryByRole("button", { name: "Drag Alpha" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Move Alpha/ })).toBeNull();
    expect(screen.getByText("BADGE-a")).toBeInTheDocument();
    expect(screen.queryByText("AFTER-a")).toBeNull();
  });

  test("renderBeforeArrows renders unconditionally; renderAfterArrows only when not readOnly", () => {
    renderList({
      renderBeforeArrows: (item) => <span>BADGE-{item.id}</span>,
      renderAfterArrows: (item) => <span>AFTER-{item.id}</span>,
    });
    expect(screen.getByText("BADGE-a")).toBeInTheDocument();
    expect(screen.getByText("AFTER-a")).toBeInTheDocument();
  });

  test("drag-and-drop from row A onto row B commits the same reorder as the arrow buttons would", () => {
    const { onReorder } = renderList();
    const dragHandle = screen.getByRole("button", { name: "Drag Alpha" });
    const dropRow = screen.getByText("Charlie").closest("div") as HTMLElement;

    const dataTransfer = { effectAllowed: "", setData: vi.fn() };
    fireEvent.dragStart(dragHandle, { dataTransfer });
    fireEvent.dragOver(dropRow, { dataTransfer });
    fireEvent.drop(dropRow, { dataTransfer });

    expect(onReorder).toHaveBeenCalledWith(["b", "c", "a"]);
  });

  test("dropping on the dragged item's own row is a no-op (fromIndex === toIndex short circuit)", () => {
    const { onReorder } = renderList();
    const dragHandle = screen.getByRole("button", { name: "Drag Alpha" });
    const ownRow = screen.getByText("Alpha").closest("div") as HTMLElement;

    const dataTransfer = { effectAllowed: "", setData: vi.fn() };
    fireEvent.dragStart(dragHandle, { dataTransfer });
    fireEvent.drop(ownRow, { dataTransfer });

    expect(onReorder).not.toHaveBeenCalled();
  });

  test("data-testid is forwarded to the list wrapper", () => {
    renderList({ "data-testid": "my-rank-list" });
    const list = screen.getByTestId("my-rank-list");
    expect(within(list).getByText("Alpha")).toBeInTheDocument();
  });
});
