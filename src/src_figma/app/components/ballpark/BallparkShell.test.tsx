import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { BallparkShell } from "./BallparkShell";

describe("BallparkShell", () => {
  test("renders the header back-plate and optional back action", () => {
    const onBack = vi.fn();

    render(
      <BallparkShell eyebrow="Franchise" onBack={onBack} title="Fenway Hub">
        <p>Clubhouse board</p>
      </BallparkShell>,
    );

    expect(screen.getByText("Franchise")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Fenway Hub/i })).toBeInTheDocument();
    expect(screen.getByText("Clubhouse board")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
