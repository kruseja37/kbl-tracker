import { describe, expect, test } from "vitest";

import { applyLiveBoardRankOverlay, computeBoardAutoAdvanceLine } from "../../app/pages/LeagueBuilderAuctionDraft";
import type { BoardEntry, RosterIntelligencePayload } from "../../../engines/rosterIntelligencePayload";
import type { Team } from "../../hooks/useLeagueBuilderData";

function entry(playerId: string, worth: number): BoardEntry {
  return { playerId, worth, matchedShape: "SS", needTag: null, fitTag: null, position: "SS" };
}

function overrides(byPosition: NonNullable<Team["boardRankOverrides"]>["byPosition"]): Team["boardRankOverrides"] {
  return { byPosition };
}

/** Base input: a SOLD result with no current-lot collision -- individual tests override fields. */
function soldInput(input: Partial<Parameters<typeof computeBoardAutoAdvanceLine>[0]> = {}) {
  return {
    latestResultPlayerId: "ss-1",
    latestResultDisposition: "SOLD" as const,
    soldPosition: "SS" as const,
    currentLotPlayerId: undefined,
    board: [entry("ss-2", 80_000)],
    boardRankOverrides: overrides({ SS: ["ss-1", "ss-2"] }),
    boardMeta: {},
    ...input,
  };
}

describe("computeBoardAutoAdvanceLine (COCKPIT WAVE 2, B3/S3.4 auto-advance)", () => {
  test("absent when there is no latest result at all", () => {
    expect(
      computeBoardAutoAdvanceLine(soldInput({ latestResultPlayerId: undefined, latestResultDisposition: undefined })),
    ).toBeNull();
  });

  test("absent when the sold player's position could not be resolved", () => {
    expect(computeBoardAutoAdvanceLine(soldInput({ soldPosition: undefined }))).toBeNull();
  });

  test("absent when the GM never ranked anyone at that position", () => {
    expect(computeBoardAutoAdvanceLine(soldInput({ boardRankOverrides: overrides({}) }))).toBeNull();
  });

  test("absent when the departure wasn't the GM's current effective #1 (someone else's guy sold)", () => {
    // GM's board is [ss-1, ss-2]; the player who just sold ("ss-9") isn't on it at all.
    expect(
      computeBoardAutoAdvanceLine(soldInput({
        latestResultPlayerId: "ss-9",
        board: [entry("ss-1", 90_000), entry("ss-2", 80_000)],
      })),
    ).toBeNull();
  });

  test("names the promoted #2 when the GM's ranked #1 just sold", () => {
    const line = computeBoardAutoAdvanceLine(soldInput({
      board: [entry("ss-2", 80_000), entry("ss-3", 40_000)],
      boardRankOverrides: overrides({ SS: ["ss-1", "ss-2", "ss-3"] }),
      boardMeta: { "ss-2": { name: "Ramírez" } },
    }));
    expect(line).toBe("Next up at SS: Ramírez — your #2.");
  });

  test("multi-hop: correctly labels #3 when #1 and #2 already left the pool across earlier lots", () => {
    // ss-1 sold two lots ago, ss-2 sold last lot -- this lot's departure is ss-2. The GM's
    // effective #1 immediately before THIS resolution (excluding the long-gone ss-1) was ss-2,
    // so it still fires, and correctly reports ss-3's ORIGINAL rank (3), not a recomputed rank.
    const line = computeBoardAutoAdvanceLine(soldInput({
      latestResultPlayerId: "ss-2",
      board: [entry("ss-3", 40_000)],
      boardRankOverrides: overrides({ SS: ["ss-1", "ss-2", "ss-3"] }),
      boardMeta: { "ss-3": { name: "Ortiz" } },
    }));
    expect(line).toBe("Next up at SS: Ortiz — your #3.");
  });

  test("absent when nobody remains at that position to promote", () => {
    expect(computeBoardAutoAdvanceLine(soldInput({ board: [] }))).toBeNull();
  });

  test("falls back to boardMeta -> note -> playerId for the promoted player's display name", () => {
    const withMeta = computeBoardAutoAdvanceLine(soldInput({
      board: [{ ...entry("ss-2", 80_000), note: "Note Name" }],
      boardMeta: { "ss-2": { name: "Meta Name" } },
    }));
    expect(withMeta).toBe("Next up at SS: Meta Name — your #2.");

    const noteOnly = computeBoardAutoAdvanceLine(soldInput({
      board: [{ ...entry("ss-2", 80_000), note: "Note Name" }],
    }));
    expect(noteOnly).toBe("Next up at SS: Note Name — your #2.");

    const idOnly = computeBoardAutoAdvanceLine(soldInput({}));
    expect(idOnly).toBe("Next up at SS: ss-2 — your #2.");
  });

  test("does not fire on a position the GM ranked when the sold player belongs to a different position", () => {
    expect(
      computeBoardAutoAdvanceLine(soldInput({
        latestResultPlayerId: "cf-1",
        soldPosition: "CF",
      })),
    ).toBeNull();
  });

  describe("audit Note 1 rework: SOLD-only disposition gate", () => {
    test("PASSED-and-recycled result -> NO line, even though the GM's #1 appears to have 'departed'", () => {
      // Reserve pricing (ON by default) recycles a first-pass player BACK into availablePlayerIds
      // (finalizePassedLot, auctionStateMachine.ts:919-953) -- ss-1 is STILL ON THE BOARD here
      // despite being the latest result's player. Announcing a promotion would be false.
      expect(
        computeBoardAutoAdvanceLine(soldInput({
          latestResultDisposition: "PASSED",
          board: [entry("ss-1", 90_000), entry("ss-2", 80_000)],
        })),
      ).toBeNull();
    });

    test("final PASSED pass-out (player genuinely gone) -> STILL no line -- the gate is SOLD-only, not board-presence", () => {
      expect(
        computeBoardAutoAdvanceLine(soldInput({
          latestResultDisposition: "PASSED",
          board: [entry("ss-2", 80_000)],
        })),
      ).toBeNull();
    });

    test("SET_ASIDE result -> no line", () => {
      expect(
        computeBoardAutoAdvanceLine(soldInput({
          latestResultDisposition: "SET_ASIDE",
          board: [entry("ss-2", 80_000)],
        })),
      ).toBeNull();
    });

    test("SOLD result -> line fires exactly as before the rework", () => {
      const line = computeBoardAutoAdvanceLine(soldInput({
        boardMeta: { "ss-2": { name: "Ramírez" } },
      }));
      expect(line).toBe("Next up at SS: Ramírez — your #2.");
    });
  });

  describe("audit Note 5 upgrade: on-the-block variant", () => {
    test("promoted target IS the current lot -> on-the-block copy with rank and position", () => {
      const line = computeBoardAutoAdvanceLine(soldInput({
        currentLotPlayerId: "ss-2",
        board: [entry("ss-2", 80_000), entry("ss-3", 40_000)],
        boardRankOverrides: overrides({ SS: ["ss-1", "ss-2", "ss-3"] }),
        boardMeta: { "ss-2": { name: "Ramírez" } },
      }));
      expect(line).toBe("On the block now: Ramírez — your #2 at SS.");
    });

    test("promoted target NOT on the block -> standard promoted copy, unaffected by an unrelated current lot", () => {
      const line = computeBoardAutoAdvanceLine(soldInput({
        currentLotPlayerId: "cf-9",
        board: [entry("ss-2", 80_000), entry("ss-3", 40_000)],
        boardRankOverrides: overrides({ SS: ["ss-1", "ss-2", "ss-3"] }),
        boardMeta: { "ss-2": { name: "Ramírez" } },
      }));
      expect(line).toBe("Next up at SS: Ramírez — your #2.");
    });

    test("on-the-block promoted target the GM never explicitly ranked -> rank-less on-block copy", () => {
      // GM ranked only ss-1; after his sale the engine's worth-order top (ss-2, unranked) is on
      // the block -- the line still announces, without inventing a rank number.
      const line = computeBoardAutoAdvanceLine(soldInput({
        currentLotPlayerId: "ss-2",
        boardRankOverrides: overrides({ SS: ["ss-1"] }),
        boardMeta: { "ss-2": { name: "Ramírez" } },
      }));
      expect(line).toBe("On the block now: Ramírez at SS.");
    });
  });
});

describe("applyLiveBoardRankOverlay (CALLFIX 2026-07-08 Item 4)", () => {
  const basePayload: RosterIntelligencePayload = {
    seatTeamId: "team-a",
    // Post-sale board: ss-1 (the departing player) is already gone, only ss-2 remains at SS.
    board: [entry("ss-2", 80_000)],
  };

  test("recomputes nextUpLine from the LIVE pending overlay -- the exact fix: BEFORE this, whisperPayload's own nextUpLine was baked in against the (possibly stale, up to BOARD_RANK_SAVE_DEBOUNCE_MS old) persisted team.boardRankOverrides read, not this fresh in-memory edit", () => {
    const overlaid = applyLiveBoardRankOverlay(
      basePayload,
      { overrides: overrides({ SS: ["ss-1", "ss-2"] }) },
      {
        latestResultPlayerId: "ss-1",
        latestResultDisposition: "SOLD",
        soldPosition: "SS",
        currentLotPlayerId: undefined,
      },
    );
    expect(overlaid.nextUpLine).toBe("Next up at SS: ss-2 — your #2.");
  });

  test("proves the bug this fixes: an EMPTY overlay (the stale-equivalent, pre-flush persisted read) produces NO line at all, even though a real override exists in-memory a moment later", () => {
    const staleRead = applyLiveBoardRankOverlay(
      basePayload,
      { overrides: overrides({}) },
      {
        latestResultPlayerId: "ss-1",
        latestResultDisposition: "SOLD",
        soldPosition: "SS",
        currentLotPlayerId: undefined,
      },
    );
    expect(staleRead.nextUpLine).toBeNull();
  });

  test("applies the overlay's GLOBAL order to the returned board -- matching the visible board the GM just edited, not the payload's original order", () => {
    const overlaid = applyLiveBoardRankOverlay(
      { seatTeamId: "team-a", board: [entry("a", 10), entry("b", 20)] },
      { overrides: { global: ["b", "a"] } },
      {
        latestResultPlayerId: undefined,
        latestResultDisposition: undefined,
        soldPosition: undefined,
        currentLotPlayerId: undefined,
      },
    );
    expect(overlaid.board?.map((row) => row.playerId)).toEqual(["b", "a"]);
    expect(overlaid.boardRankOverrides).toEqual({ global: ["b", "a"] });
  });

  test("boardMeta omission is safe -- BoardEntry.note already carries the same display name computeBoardAutoAdvanceLine would otherwise have looked up there", () => {
    const overlaid = applyLiveBoardRankOverlay(
      { seatTeamId: "team-a", board: [{ ...entry("ss-2", 80_000), note: "Ramírez" }] },
      { overrides: overrides({ SS: ["ss-1", "ss-2"] }) },
      {
        latestResultPlayerId: "ss-1",
        latestResultDisposition: "SOLD",
        soldPosition: "SS",
        currentLotPlayerId: undefined,
      },
    );
    expect(overlaid.nextUpLine).toBe("Next up at SS: Ramírez — your #2.");
  });
});
