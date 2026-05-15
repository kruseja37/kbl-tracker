import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { PlayerCardModal } from "../../app/pages/GameTracker";

describe("PlayerCardModal", () => {
  test("preserves runnerBase when subbing out a live baserunner", () => {
    const onSubOut = vi.fn();

    render(
      <PlayerCardModal
        player={{ name: "Rickey Henderson", type: "batter", playerId: "runner-1" }}
        onClose={vi.fn()}
        onSubOut={onSubOut}
        benchPlayers={[
          {
            name: "Dave Roberts",
            pos: "OF",
            hand: "L",
            isOutOfGame: false,
          },
        ]}
        runnerBase="first"
        gamePhase="LIVE"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "SUB OUT" }));
    fireEvent.click(screen.getByRole("button", { name: /Dave Roberts/i }));

    expect(onSubOut).toHaveBeenCalledWith(
      "runner-1",
      "Rickey Henderson",
      "Dave Roberts",
      false,
      "OF",
      "first",
    );
  });

  test("keeps pre-game swap-order controls visible while hiding mojo and fitness editing", () => {
    render(
      <PlayerCardModal
        player={{ name: "Mookie Betts", type: "batter", playerId: "batter-1" }}
        onClose={vi.fn()}
        showSwapOrder
        onSwapOrder={vi.fn()}
        currentMojo={2}
        currentFitness="FIT"
        onMojoChange={vi.fn()}
        onFitnessChange={vi.fn()}
        gamePhase="PRE_GAME"
      />,
    );

    expect(screen.getByRole("button", { name: "SWAP ORDER" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "UPDATE MOJO" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "UPDATE FITNESS" })).not.toBeInTheDocument();
    expect(screen.queryByText("CONDITION")).not.toBeInTheDocument();
  });
});
