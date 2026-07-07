import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { BallparkButton } from "./BallparkButton";

describe("BallparkButton", () => {
  test("renders a typed press-physics button", () => {
    const onClick = vi.fn();

    render(<BallparkButton onClick={onClick}>Play Ball</BallparkButton>);
    fireEvent.click(screen.getByRole("button", { name: /Play Ball/i }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Play Ball/i })).toHaveClass("ballpark-press-button");
  });
});
