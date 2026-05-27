import "fake-indexeddb/auto";

import { describe, expect, test } from "vitest";

import {
  getTransactionsByFranchiseSeason,
  isMode2V1TransactionType,
  logMode2V1Transaction,
  logTrade,
  toMode2V1TransactionType,
} from "../transactionStorage";

describe("Mode 2 v1 transaction surface", () => {
  test("persists canonical v1 transaction types", async () => {
    const entry = await logMode2V1Transaction({
      type: "call_up",
      actor: "USER",
      season: 2001,
      gameNumber: 12,
      phase: "REGULAR_SEASON",
      data: {
        playerId: "player-1",
        fromRosterLevel: "FARM",
        toRosterLevel: "ACTIVE",
      },
    });

    expect(entry.type).toBe("call_up");
    expect(isMode2V1TransactionType(entry.type)).toBe(true);
  });

  test("maps supported legacy names but rejects non-v1 transaction categories", async () => {
    expect(toMode2V1TransactionType("TRADE_EXECUTED")).toBe("trade");
    expect(toMode2V1TransactionType("FA_SIGNING")).toBe("free_agent_signing");
    expect(toMode2V1TransactionType("MANUAL_EDIT")).toBeNull();

    await expect(
      logMode2V1Transaction({
        type: "MANUAL_EDIT",
        actor: "USER",
        season: 2002,
        phase: "REGULAR_SEASON",
        data: { entityId: "player-1" },
      }),
    ).rejects.toThrow("Unsupported Mode 2 v1 transaction type");
  });

  test("trade convenience logger writes the v1 canonical trade type", async () => {
    const entry = await logTrade(
      2003,
      18,
      "team-a",
      "team-b",
      ["player-a"],
      ["player-b"],
    );

    expect(entry.type).toBe("trade");
  });

  test("persists canonical franchise season identity for Mode 2 v1 transactions", async () => {
    const entryA = await logMode2V1Transaction({
      type: "send_down",
      actor: "USER",
      season: 1,
      seasonId: "franchise-a-season-1",
      statsScopeId: "franchise-a-season-1",
      franchiseId: "franchise-a",
      scheduleGameId: "schedule-a-1",
      phase: "REGULAR_SEASON",
      data: { playerId: "player-a" },
    });
    await logMode2V1Transaction({
      type: "send_down",
      actor: "USER",
      season: 1,
      seasonId: "franchise-b-season-1",
      statsScopeId: "franchise-b-season-1",
      franchiseId: "franchise-b",
      scheduleGameId: "schedule-b-1",
      phase: "REGULAR_SEASON",
      data: { playerId: "player-b" },
    });

    expect(entryA).toMatchObject({
      franchiseId: "franchise-a",
      seasonId: "franchise-a-season-1",
      statsScopeId: "franchise-a-season-1",
      scheduleGameId: "schedule-a-1",
      season: 1,
    });

    const franchiseAEntries = await getTransactionsByFranchiseSeason(
      "franchise-a",
      "franchise-a-season-1",
    );
    expect(franchiseAEntries.map((entry) => entry.franchiseId)).toEqual(["franchise-a"]);
    expect(franchiseAEntries.map((entry) => entry.seasonId)).toEqual(["franchise-a-season-1"]);
  });
});
