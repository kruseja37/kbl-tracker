import type { AuctionState } from "../../../engines/auctionStateMachine";

export type AuctionCoachTier = "mlb" | "farm";

export function auctionCoachLine(args: { tier: AuctionCoachTier; state: AuctionState }): string {
  const { tier, state } = args;

  switch (state) {
    case "SETUP":
      return tier === "mlb"
        ? "Welcome, GM. Lock in your league and team identities, then begin the auction when you're ready."
        : "Now stock your farm system. Set your farm identity, then begin the farm auction.";
    case "NOMINATION":
      return "The draft engine is surfacing the next player. No nominations to make — just get ready to bid.";
    case "OPEN_BIDDING":
      return tier === "mlb"
        ? "He's on the block. Raise or pass — and remember, pass and he's gone for good."
        : "Prospect's up. Hold the scout card to check your read, then raise or pass — one chance only.";
    case "RESOLVE":
      return "You're the last bidder standing. Claim him at the reserve price, or pass and send him back to the pool.";
    case "SOLD":
      return "Lot settled. On to the next one.";
    case "PASSED":
      return "No takers — he's out of the draft. Next player coming up.";
    case "AUCTION_COMPLETE":
      return tier === "mlb"
        ? "Your MLB roster is set. Head to the farm auction to stock your prospects."
        : "Your draft is complete. Start the franchise to lock everything in.";
    default: {
      const exhaustiveState: never = state;
      return exhaustiveState;
    }
  }
}

export function AuctionCoachBanner({ tier, state }: { tier: AuctionCoachTier; state: AuctionState }) {
  return (
    <div
      role="note"
      aria-label="Auction coach"
      className="mb-4 border-4 border-[#E8E8D8]/25 bg-[#4A6844] px-4 py-3 text-[#E8E8D8] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.45)]"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="w-fit border border-[#E8E8D8]/35 bg-[#556B55] px-2 py-0.5 text-[10px] font-bold text-[#E8E8D8]">
          COACH
        </span>
        <p className="text-sm leading-snug text-[#E8E8D8]/90">{auctionCoachLine({ tier, state })}</p>
      </div>
    </div>
  );
}
