import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { BallparkPanel } from "./BallparkPanel";

describe("BallparkPanel", () => {
  test("renders a panel with a header strip", () => {
    render(
      <BallparkPanel eyebrow="Tonight" title="League Leaders">
        Top bats on the board.
      </BallparkPanel>,
    );

    expect(screen.getByText("Tonight")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /League Leaders/i })).toBeInTheDocument();
    expect(screen.getByText(/Top bats/i)).toBeInTheDocument();
  });
});
