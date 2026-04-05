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
});
