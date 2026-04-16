import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import BetweenInningPopup from "../../app/components/BetweenInningPopup";

describe("BetweenInningPopup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("renders text and calls onDismiss(auto) after autoDismissMs", () => {
    const onDismiss = vi.fn();

    render(
      <BetweenInningPopup
        text="Freebooters stranded two."
        onDismiss={onDismiss}
        autoDismissMs={6000}
      />,
    );

    expect(screen.getByText("Freebooters stranded two.")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(360);
    });
    expect(onDismiss).toHaveBeenCalledWith("auto");
  });

  test("backdrop click calls onDismiss(tap)", () => {
    const onDismiss = vi.fn();

    render(
      <BetweenInningPopup
        text="Freebooters stranded two."
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByTestId("between-inning-popup-backdrop"));

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onDismiss).toHaveBeenCalledWith("tap");
  });

  test("Escape key calls onDismiss(escape)", () => {
    const onDismiss = vi.fn();

    render(
      <BetweenInningPopup
        text="Freebooters stranded two."
        onDismiss={onDismiss}
      />,
    );

    fireEvent.keyDown(screen.getByTestId("between-inning-popup"), {
      key: "Escape",
    });

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onDismiss).toHaveBeenCalledWith("escape");
  });

  test("focus moves to popup on mount and restores on unmount", () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <div>
        <button type="button">Return focus</button>
      </div>,
    );

    const opener = screen.getByText("Return focus");
    opener.focus();

    rerender(
      <div>
        <button type="button">Return focus</button>
        <BetweenInningPopup
          text="Freebooters stranded two."
          onDismiss={onDismiss}
        />
      </div>,
    );

    const popup = screen.getByTestId("between-inning-popup");
    expect(document.activeElement).toBe(popup);

    rerender(
      <div>
        <button type="button">Return focus</button>
      </div>,
    );

    expect(document.activeElement).toBe(opener);
  });

  test("auto-dismiss timer is cleared on unmount", () => {
    const onDismiss = vi.fn();
    const { unmount } = render(
      <BetweenInningPopup
        text="Freebooters stranded two."
        onDismiss={onDismiss}
      />,
    );

    unmount();

    act(() => {
      vi.advanceTimersByTime(7000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });
});
