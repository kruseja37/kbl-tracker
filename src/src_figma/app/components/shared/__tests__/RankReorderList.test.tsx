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
      rankBadgeClassName="rank-badge"
      rankInputClassName="rank-input"
      sendToTopClassName="send-to-top"
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

describe("RankReorderList — BOARDFIX1 rank-badge edit + send-to-top", () => {
  test("renders a numbered rank badge per row, labeled via itemLabel", () => {
    renderList();
    expect(screen.getByRole("button", { name: "Set rank for Alpha" })).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "Set rank for Bravo" })).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: "Set rank for Charlie" })).toHaveTextContent("3");
  });

  test("clicking the rank badge opens a type-in input pre-filled with the current rank", () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: "Set rank for Charlie" }));
    const input = screen.getByRole("spinbutton", { name: "Set rank for Charlie" });
    expect(input).toHaveValue(3);
  });

  test("Enter commits a valid target rank, moving the row and shifting the others", () => {
    const { onReorder } = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Set rank for Charlie" }));
    const input = screen.getByRole("spinbutton", { name: "Set rank for Charlie" });
    fireEvent.change(input, { target: { value: "1" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onReorder).toHaveBeenCalledWith(["c", "a", "b"]);
    // The edit closes back to the badge after committing.
    expect(screen.getByRole("button", { name: "Set rank for Charlie" })).toBeInTheDocument();
  });

  test("Escape cancels without committing a reorder", () => {
    const { onReorder } = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Set rank for Charlie" }));
    const input = screen.getByRole("spinbutton", { name: "Set rank for Charlie" });
    fireEvent.change(input, { target: { value: "1" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onReorder).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Set rank for Charlie" })).toBeInTheDocument();
  });

  test("blur commits the typed rank (same as Enter)", () => {
    const { onReorder } = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Set rank for Alpha" }));
    const input = screen.getByRole("spinbutton", { name: "Set rank for Alpha" });
    fireEvent.change(input, { target: { value: "3" } });
    fireEvent.blur(input);
    expect(onReorder).toHaveBeenCalledWith(["b", "c", "a"]);
  });

  test("out-of-range numeric input clamps to [1, N] instead of canceling", () => {
    const { onReorder } = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Set rank for Alpha" }));
    const input = screen.getByRole("spinbutton", { name: "Set rank for Alpha" });
    fireEvent.change(input, { target: { value: "999" } });
    fireEvent.keyDown(input, { key: "Enter" });
    // Clamped to N=3 -- moving Alpha to the bottom, same as rank 3.
    expect(onReorder).toHaveBeenCalledWith(["b", "c", "a"]);

    onReorder.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Set rank for Charlie" }));
    const secondInput = screen.getByRole("spinbutton", { name: "Set rank for Charlie" });
    fireEvent.change(secondInput, { target: { value: "-5" } });
    fireEvent.keyDown(secondInput, { key: "Enter" });
    // Clamped to 1 -- moving Charlie to the top.
    expect(onReorder).toHaveBeenCalledWith(["c", "a", "b"]);
  });

  test("non-numeric input cancels instead of committing", () => {
    const { onReorder } = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Set rank for Alpha" }));
    const input = screen.getByRole("spinbutton", { name: "Set rank for Alpha" });
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onReorder).not.toHaveBeenCalled();
  });

  test("committing to the row's own current rank is a no-op", () => {
    const { onReorder } = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Set rank for Bravo" }));
    const input = screen.getByRole("spinbutton", { name: "Set rank for Bravo" });
    fireEvent.change(input, { target: { value: "2" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onReorder).not.toHaveBeenCalled();
  });

  test("send-to-top moves a row straight to rank 1", () => {
    const { onReorder } = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Send Charlie to top" }));
    expect(onReorder).toHaveBeenCalledWith(["c", "a", "b"]);
  });

  test("send-to-top is disabled for the row already at rank 1", () => {
    renderList();
    expect(screen.getByRole("button", { name: "Send Alpha to top" })).toBeDisabled();
  });

  test("readOnly disables the rank badge (no edit) and hides send-to-top, but still renders the rank number", () => {
    renderList({ readOnly: true });
    const badge = screen.getByRole("button", { name: "Set rank for Alpha" });
    expect(badge).toBeDisabled();
    expect(badge).toHaveTextContent("1");
    fireEvent.click(badge);
    expect(screen.queryByRole("spinbutton", { name: "Set rank for Alpha" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Send Alpha to top/ })).toBeNull();
  });
});
