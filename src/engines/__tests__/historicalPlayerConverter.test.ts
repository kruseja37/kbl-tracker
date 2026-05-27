import { describe, expect, test } from "vitest";

import {
  convertHistoricalPlayerToSmb4,
  percentileToSmb4Rating,
  resolveHistoricalPlayerByName,
  type HistoricalPlayerSourceRecord,
} from "../historicalPlayerConverter";

const rickeyLikeRecord: HistoricalPlayerSourceRecord = {
  sourceId: "manual:rickey-like",
  sourceName: "Manual test fixture",
  playerName: "Rickey Henderson",
  birthYear: 1958,
  bats: "R",
  throws: "L",
  primaryPositions: ["LF", "CF"],
  careerTotals: { seasons: 25, games: 3081, plateAppearances: 13346 },
  hitter: {
    career: {
      overall: 96,
      power: 70,
      contact: 85,
      discipline: 99,
      speed: 99,
      baserunning: 99,
      defense: 82,
      arm: 55,
      durability: 98,
    },
    peak: {
      overall: 98,
      power: 75,
      contact: 92,
      discipline: 99,
      speed: 99,
      baserunning: 99,
      defense: 88,
      arm: 58,
      durability: 95,
    },
  },
  awards: ["MVP", "Gold Glove"],
  notes: ["Synthetic percentile fixture shaped like a speed/on-base legend."],
};

const pedroLikeRecord: HistoricalPlayerSourceRecord = {
  sourceId: "manual:pedro-like",
  sourceName: "Manual test fixture",
  playerName: "Pedro Martinez",
  birthYear: 1971,
  bats: "R",
  throws: "R",
  primaryPositions: ["SP"],
  careerTotals: { seasons: 18, games: 476, inningsPitched: 2827.1 },
  playerKind: "pitcher",
  pitcherRole: "starter",
  pitchArchetype: "power",
  pitcher: {
    career: {
      overall: 98,
      runPrevention: 99,
      strikeouts: 99,
      velocity: 94,
      movement: 96,
      command: 94,
      workload: 82,
    },
    peak: {
      overall: 99,
      runPrevention: 99,
      strikeouts: 99,
      velocity: 97,
      movement: 99,
      command: 96,
      workload: 88,
    },
  },
  notes: ["Synthetic percentile fixture shaped like a peak-dominant ace."],
};

describe("historical player converter", () => {
  test("maps era-adjusted percentiles to SMB4 ratings through documented anchors", () => {
    expect(percentileToSmb4Rating(1)).toBe(5);
    expect(percentileToSmb4Rating(25)).toBe(38);
    expect(percentileToSmb4Rating(50)).toBe(55);
    expect(percentileToSmb4Rating(90)).toBe(86);
    expect(percentileToSmb4Rating(99)).toBe(99);
  });

  test("resolves candidate records by normalized name", () => {
    expect(resolveHistoricalPlayerByName("rickey henderson", [rickeyLikeRecord, pedroLikeRecord])).toEqual([rickeyLikeRecord]);
    expect(resolveHistoricalPlayerByName("Pedro", [rickeyLikeRecord, pedroLikeRecord])).toEqual([pedroLikeRecord]);
  });

  test("converts a speed and on-base legend into a plausible SMB4 position player", () => {
    const profile = convertHistoricalPlayerToSmb4({
      source: rickeyLikeRecord,
      mode: "hybrid",
    });

    expect(profile.player.name).toBe("Rickey Henderson");
    expect(profile.player.primaryPosition).toBe("LF");
    expect(profile.player.secondaryPosition).toBe("OF");
    expect(profile.player.speed).toBeGreaterThanOrEqual(95);
    expect(profile.player.contact).toBeGreaterThanOrEqual(85);
    expect([profile.player.trait1, profile.player.trait2]).toContain("Stealer");
    expect(profile.grade.grade).toMatch(/S|A\+|A/);
    expect(profile.historicalSummary.archetype).toBe("speed and on-base catalyst");
    expect(profile.historicalSummary.primaryEvidence.some((line) => line.includes("speed"))).toBe(true);
  });

  test("converts an elite starter into pitcher ratings, traits, and a legal arsenal", () => {
    const profile = convertHistoricalPlayerToSmb4({
      source: pedroLikeRecord,
      mode: "peak",
    });
    const arsenal = String(profile.player.arsenal || "").split(",");
    const arsenalFromArray = Array.isArray(profile.player.arsenal) ? profile.player.arsenal : arsenal;

    expect(profile.player.primaryPosition).toBe("SP");
    expect(profile.player.velocity).toBeGreaterThanOrEqual(95);
    expect(profile.player.junk).toBeGreaterThanOrEqual(95);
    expect(profile.player.accuracy).toBeGreaterThanOrEqual(90);
    expect([profile.player.trait1, profile.player.trait2]).toContain("K Collector");
    expect(arsenalFromArray.length).toBeGreaterThanOrEqual(4);
    expect(arsenalFromArray).toContain("4F");
    expect(arsenalFromArray.some((pitch) => ["SL", "CB", "CH", "FK", "SB"].includes(pitch))).toBe(true);
    expect(profile.grade.playerType).toBe("pitcher");
  });
});
