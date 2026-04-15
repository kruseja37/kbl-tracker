import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { FamePromotionBanner } from "../../app/components/FamePromotionBanner";
import type { FamePromotionCandidate } from "../../app/engines/famePromotion";

const candidate: FamePromotionCandidate = {
  playerId: "player-ivy",
  playerName: "Ivy Knox",
  teamId: "night-shift",
  teamName: "Night Shift",
  currentTier: 3,
  targetTier: 4,
  runTotalFame: 82.4,
  gamesPlayed: 4,
};

describe("FamePromotionBanner", () => {
  test("renders a just-crossed threshold candidate with actions", () => {
    const onAccept = vi.fn();
    const onDismiss = vi.fn();

    render(
      <FamePromotionBanner
        candidates={[candidate]}
        onAccept={onAccept}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByTestId("fame-promotion-banner")).toBeInTheDocument();
    expect(screen.getByText("Ivy Knox")).toBeInTheDocument();
    expect(screen.getByText(/Run Fame \+82.4/i)).toBeInTheDocument();
    expect(screen.getByText("Veteran")).toBeInTheDocument();
    expect(screen.getByText("Captain")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /accept/i }));
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(onAccept).toHaveBeenCalledWith(candidate);
    expect(onDismiss).toHaveBeenCalledWith(candidate);
  });

  test("does not render when there are no promotion candidates", () => {
    render(
      <FamePromotionBanner
        candidates={[]}
        onAccept={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("fame-promotion-banner")).not.toBeInTheDocument();
  });
});
