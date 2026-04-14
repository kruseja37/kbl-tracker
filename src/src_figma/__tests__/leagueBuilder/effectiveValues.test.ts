import { describe, expect, test } from "vitest";

import type {
  LeaguePlayerOverrideRecord,
  Player,
  PlayerAttributes,
} from "../../../utils/leagueBuilderStorage";
import { getEffectiveFame } from "../../../utils/effectiveValues";

function createPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "player-1",
    firstName: "Maya",
    lastName: "Lopez",
    gender: "F",
    age: 27,
    bats: "R",
    throws: "R",
    primaryPosition: "SS",
    power: 61,
    contact: 58,
    speed: 64,
    fielding: 72,
    arm: 68,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: "B",
    personality: "Competitive",
    chemistry: "Competitive",
    morale: 50,
    mojo: "Normal",
    fame: 0,
    salary: 1000000,
    createdDate: "2026-04-14T00:00:00.000Z",
    lastModified: "2026-04-14T00:00:00.000Z",
    isCustom: true,
    ...overrides,
  };
}

function createOverrideRecord(
  overrides: Partial<PlayerAttributes> = {},
  fameTierOverride?: LeaguePlayerOverrideRecord["fameTierOverride"],
): LeaguePlayerOverrideRecord {
  return {
    id: "league-1::player-1",
    leagueId: "league-1",
    playerId: "player-1",
    overrides,
    fameTierOverride,
    lastModified: "2026-04-14T00:00:00.000Z",
  };
}

describe("getEffectiveFame", () => {
  test("returns the player's base fame tier when no override is present", () => {
    const player = createPlayer({ baseFameTier: 4 });

    expect(getEffectiveFame(player)).toBe(4);
  });

  test("returns the override fame tier when present", () => {
    const player = createPlayer({ baseFameTier: 5 });
    const override = createOverrideRecord({}, 2);

    expect(getEffectiveFame(player, override)).toBe(2);
  });

  test("falls back to the base fame tier when the override record omits fame", () => {
    const player = createPlayer({ baseFameTier: 1 });
    const override = createOverrideRecord({ contact: 82 });

    expect(getEffectiveFame(player, override)).toBe(1);
  });

  test("defaults to veteran tier three when the base fame tier is unset", () => {
    const player = createPlayer({ baseFameTier: undefined });

    expect(getEffectiveFame(player)).toBe(3);
  });

  test("is null-safe when player and instance are both absent", () => {
    expect(getEffectiveFame(null, undefined)).toBe(3);
  });

  test("can resolve an instance override even when the base player is absent", () => {
    const override = createOverrideRecord({}, 5);

    expect(getEffectiveFame(undefined, override)).toBe(5);
  });
});
