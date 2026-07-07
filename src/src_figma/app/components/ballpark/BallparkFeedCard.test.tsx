import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { BallparkFeedCard } from "./BallparkFeedCard";

describe("BallparkFeedCard", () => {
  test("renders a left-accent feed item", () => {
    render(
      <BallparkFeedCard meta="Clubhouse" title="Rally starts" tone="success">
        Two runs in the seventh.
      </BallparkFeedCard>,
    );

    expect(screen.getByText("Clubhouse")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Rally starts/i })).toBeInTheDocument();
    expect(screen.getByText(/Two runs/i)).toBeInTheDocument();
  });
});
