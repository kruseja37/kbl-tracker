import { describe, expect, test } from "vitest";

import { computeBoardAutoAdvanceLine } from "../../app/pages/LeagueBuilderAuctionDraft";
import type { BoardEntry } from "../../../engines/rosterIntelligencePayload";
import type { Team } from "../../hooks/useLeagueBuilderData";

function entry(playerId: string, worth: number): BoardEntry {
  return { playerId, worth, matchedShape: "SS", needTag: null, fitTag: null, position: "SS" };
}

function overrides(byPosition: NonNullable<Team["boardRankOverrides"]>["byPosition"]): Team["boardRankOverrides"] {
  return { byPosition };
}

describe("computeBoardAutoAdvanceLine (COCKPIT WAVE 2, B3/S3.4 auto-advance)", () => {
  test("absent when there is no latest result at all", () => {
    expect(
      computeBoardAutoAdvanceLine({
        latestResultPlayerId: undefined,
        soldPosition: "SS",
        board: [entry("ss-2", 80_000)],
        boardRankOverrides: overrides({ SS: ["ss-1", "ss-2"] }),
        boardMeta: {},
      }),
    ).toBeNull();
  });

  test("absent when the sold player's position could not be resolved", () => {
    expect(
      computeBoardAutoAdvanceLine({
        latestResultPlayerId: "ss-1",
        soldPosition: undefined,
        board: [entry("ss-2", 80_000)],
        boardRankOverrides: overrides({ SS: ["ss-1", "ss-2"] }),
        boardMeta: {},
      }),
    ).toBeNull();
  });

  test("absent when the GM never ranked anyone at that position", () => {
    expect(
      computeBoardAutoAdvanceLine({
        latestResultPlayerId: "ss-1",
        soldPosition: "SS",
        board: [entry("ss-2", 80_000)],
        boardRankOverrides: overrides({}),
        boardMeta: {},
      }),
    ).toBeNull();
  });

  test("absent when the departure wasn't the GM's current effective #1 (someone else's guy sold)", () => {
    // GM's board is [ss-1, ss-2]; the player who just sold ("ss-9") isn't on it at all.
    expect(
      computeBoardAutoAdvanceLine({
        latestResultPlayerId: "ss-9",
        soldPosition: "SS",
        board: [entry("ss-1", 90_000), entry("ss-2", 80_000)],
        boardRankOverrides: overrides({ SS: ["ss-1", "ss-2"] }),
        boardMeta: {},
      }),
    ).toBeNull();
  });

  test("names the promoted #2 when the GM's ranked #1 just sold", () => {
    const line = computeBoardAutoAdvanceLine({
      latestResultPlayerId: "ss-1",
      soldPosition: "SS",
      board: [entry("ss-2", 80_000), entry("ss-3", 40_000)],
      boardRankOverrides: overrides({ SS: ["ss-1", "ss-2", "ss-3"] }),
      boardMeta: { "ss-2": { name: "Ramírez" } },
    });
    expect(line).toBe("Next up at SS: Ramírez — your #2.");
  });

  test("multi-hop: correctly labels #3 when #1 and #2 already left the pool across earlier lots", () => {
    // ss-1 sold two lots ago, ss-2 sold last lot -- this lot's departure is ss-2. The GM's
    // effective #1 immediately before THIS resolution (excluding the long-gone ss-1) was ss-2,
    // so it still fires, and correctly reports ss-3's ORIGINAL rank (3), not a recomputed rank.
    const line = computeBoardAutoAdvanceLine({
      latestResultPlayerId: "ss-2",
      soldPosition: "SS",
      board: [entry("ss-3", 40_000)],
      boardRankOverrides: overrides({ SS: ["ss-1", "ss-2", "ss-3"] }),
      boardMeta: { "ss-3": { name: "Ortiz" } },
    });
    expect(line).toBe("Next up at SS: Ortiz — your #3.");
  });

  test("absent when nobody remains at that position to promote", () => {
    expect(
      computeBoardAutoAdvanceLine({
        latestResultPlayerId: "ss-1",
        soldPosition: "SS",
        board: [],
        boardRankOverrides: overrides({ SS: ["ss-1"] }),
        boardMeta: {},
      }),
    ).toBeNull();
  });

  test("falls back to boardMeta -> note -> playerId for the promoted player's display name", () => {
    const withMeta = computeBoardAutoAdvanceLine({
      latestResultPlayerId: "ss-1",
      soldPosition: "SS",
      board: [{ ...entry("ss-2", 80_000), note: "Note Name" }],
      boardRankOverrides: overrides({ SS: ["ss-1", "ss-2"] }),
      boardMeta: { "ss-2": { name: "Meta Name" } },
    });
    expect(withMeta).toBe("Next up at SS: Meta Name — your #2.");

    const noteOnly = computeBoardAutoAdvanceLine({
      latestResultPlayerId: "ss-1",
      soldPosition: "SS",
      board: [{ ...entry("ss-2", 80_000), note: "Note Name" }],
      boardRankOverrides: overrides({ SS: ["ss-1", "ss-2"] }),
      boardMeta: {},
    });
    expect(noteOnly).toBe("Next up at SS: Note Name — your #2.");

    const idOnly = computeBoardAutoAdvanceLine({
      latestResultPlayerId: "ss-1",
      soldPosition: "SS",
      board: [entry("ss-2", 80_000)],
      boardRankOverrides: overrides({ SS: ["ss-1", "ss-2"] }),
      boardMeta: {},
    });
    expect(idOnly).toBe("Next up at SS: ss-2 — your #2.");
  });

  test("does not fire on a position the GM ranked when the sold player belongs to a different position", () => {
    expect(
      computeBoardAutoAdvanceLine({
        latestResultPlayerId: "cf-1",
        soldPosition: "CF",
        board: [entry("ss-2", 80_000)],
        boardRankOverrides: overrides({ SS: ["ss-1", "ss-2"] }),
        boardMeta: {},
      }),
    ).toBeNull();
  });
});
