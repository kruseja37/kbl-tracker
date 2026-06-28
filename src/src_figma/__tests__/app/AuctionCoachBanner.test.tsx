import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import {
  AuctionCoachBanner,
  auctionCoachLine,
  type AuctionCoachTier,
} from "../../app/components/AuctionCoachBanner";
import type { AuctionState } from "../../../engines/auctionStateMachine";

const expectedLines: Array<{
  tier: AuctionCoachTier;
  state: AuctionState;
  line: string;
}> = [
  {
    tier: "mlb",
    state: "SETUP",
    line: "Welcome, GM. Lock in your league and team identities, then begin the auction when you're ready.",
  },
  {
    tier: "farm",
    state: "SETUP",
    line: "Now stock your farm system. Set your farm identity, then begin the farm auction.",
  },
  {
    tier: "mlb",
    state: "NOMINATION",
    line: "The draft engine is surfacing the next player. No nominations to make — just get ready to bid.",
  },
  {
    tier: "farm",
    state: "NOMINATION",
    line: "The draft engine is surfacing the next player. No nominations to make — just get ready to bid.",
  },
  {
    tier: "mlb",
    state: "OPEN_BIDDING",
    line: "Player is on the block. Raise or pass — one pass can remove the player for good.",
  },
  {
    tier: "farm",
    state: "OPEN_BIDDING",
    line: "Prospect's up. Hold the scout card to check your read, then raise or pass — one chance only.",
  },
  {
    tier: "mlb",
    state: "RESOLVE",
    line: "You're the last bidder standing. Claim the player at the reserve price, or pass and send the player back to the pool.",
  },
  {
    tier: "farm",
    state: "RESOLVE",
    line: "You're the last bidder standing. Claim the player at the reserve price, or pass and send the player back to the pool.",
  },
  {
    tier: "mlb",
    state: "SOLD",
    line: "Lot settled. On to the next one.",
  },
  {
    tier: "farm",
    state: "SOLD",
    line: "Lot settled. On to the next one.",
  },
  {
    tier: "mlb",
    state: "PASSED",
    line: "No takers — the player is out of the draft. Next player coming up.",
  },
  {
    tier: "farm",
    state: "PASSED",
    line: "No takers — the player is out of the draft. Next player coming up.",
  },
  {
    tier: "mlb",
    state: "AUCTION_COMPLETE",
    line: "Your MLB roster is set. Head to the farm auction to stock your prospects.",
  },
  {
    tier: "farm",
    state: "AUCTION_COMPLETE",
    line: "Your draft is complete. Start the franchise to lock everything in.",
  },
];

describe("AuctionCoachBanner", () => {
  test.each(expectedLines)("returns the expected $tier $state coach line", ({ tier, state, line }) => {
    expect(auctionCoachLine({ tier, state })).toBe(line);
  });

  test("renders the coach label and the MLB open-bidding line", () => {
    render(<AuctionCoachBanner tier="mlb" state="OPEN_BIDDING" />);

    expect(screen.getByText("COACH")).toBeInTheDocument();
    expect(
      screen.getByText("Player is on the block. Raise or pass — one pass can remove the player for good."),
    ).toBeInTheDocument();
  });
});
