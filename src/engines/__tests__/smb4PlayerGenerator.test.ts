import { describe, expect, test } from "vitest";

import { scoreSmb4Player } from "../smb4GradeEmulator";
import {
  SMB4_STANDARD_TEAM_ROSTER_TEMPLATES,
  formatSmb4RosterReportMarkdown,
  generateSmb4Players,
  generateSmb4Roster,
  profileLevelsToCode,
  summarizeSmb4Roster,
} from "../smb4PlayerGenerator";

const FASTBALL_PITCHES = new Set(["4F", "2F", "CF"]);
const OFFSPEED_PITCHES = new Set(["SL", "CB", "CH", "FK", "SB"]);
const SMB4_PITCHES = new Set([...FASTBALL_PITCHES, ...OFFSPEED_PITCHES]);

function parseArsenal(arsenal: unknown): string[] {
  return String(arsenal || "")
    .split(/[|,]/)
    .map((pitch) => pitch.trim())
    .filter(Boolean);
}

function expectValidPitcherArsenal(player: { arsenal?: unknown }) {
  const pitches = parseArsenal(player.arsenal);

  expect(pitches.length).toBeGreaterThanOrEqual(2);
  expect(pitches.length).toBeLessThanOrEqual(5);
  expect(pitches.every((pitch) => SMB4_PITCHES.has(pitch))).toBe(true);
  expect(pitches.some((pitch) => FASTBALL_PITCHES.has(pitch))).toBe(true);
  expect(pitches.some((pitch) => OFFSPEED_PITCHES.has(pitch))).toBe(true);
}

function countBy<T extends string>(values: T[]): Partial<Record<T, number>> {
  return values.reduce<Partial<Record<T, number>>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

describe("SMB4 player generator", () => {
  test("generates B- players across requested positions with exactly one trait", () => {
    const players = generateSmb4Players({
      count: 10,
      targetGrade: "B-",
      positions: ["C", "SS", "CF", "SP", "RP"],
      traitPolicy: { mode: "exactlyOne", allowedPolarity: "positive" },
      seed: "b-minus-one-trait",
    });

    expect(players).toHaveLength(10);

    players.forEach((player, index) => {
      expect(player.primaryPosition).toBe(["C", "SS", "CF", "SP", "RP"][index % 5]);
      expect(player.trait1).toBeTruthy();
      expect(player.trait2 || "").toBe("");
      expect(player.generatedGrade).toBe("B-");
      expect(scoreSmb4Player(player).grade).toBe("B-");
      expect(player.numericScore).toBeCloseTo(scoreSmb4Player(player).numericScore, 4);
      expect(player.power).toBeGreaterThanOrEqual(0);
      expect(player.power).toBeLessThanOrEqual(99);
      expect(player.realismScore).toBeGreaterThan(0);
      if (["SP", "RP", "CP", "SP/RP"].includes(player.primaryPosition || "")) {
        expectValidPitcherArsenal(player);
      }
    });
  });

  test("is deterministic for the same seed and request", () => {
    const request = {
      count: 4,
      targetGrade: "C+" as const,
      positions: ["1B", "2B", "SP", "CP"],
      traitPolicy: { mode: "atLeastOne" as const, allowedPolarity: "any" as const },
      seed: 42,
    };

    expect(generateSmb4Players(request)).toEqual(generateSmb4Players(request));
  });

  test("returns closest candidates instead of throwing when constraints are hard", () => {
    const players = generateSmb4Players({
      count: 2,
      targetGrade: "S",
      positions: ["CP"],
      traitPolicy: { mode: "exactlyTwo", allowedPolarity: "negative" },
      seed: "hard-case",
      maxAttemptsPerPlayer: 2,
    });

    expect(players).toHaveLength(2);
    expect(players[0].generationNotes.length).toBeGreaterThan(0);
    players.forEach(expectValidPitcherArsenal);
  });

  test("includes standard-team roster templates derived from the SMB4 fixture", () => {
    const sandcats = SMB4_STANDARD_TEAM_ROSTER_TEMPLATES.Sandcats;

    expect(sandcats.positionPlan).toHaveLength(22);
    expect(sandcats.gradePlan).toHaveLength(22);
    expect(sandcats.positionPlan.slice(0, 5)).toEqual(["SS", "RF", "1B", "1B", "CF"]);
    expect(countBy([...sandcats.gradePlan])).toEqual({
      "B-": 2,
      A: 2,
      B: 4,
      "A-": 5,
      "C+": 5,
      C: 3,
      "C-": 1,
    });
  });

  test("generates a full roster toward a standard team profile", () => {
    const roster = generateSmb4Roster({
      teamName: "Generated Sandcats",
      standardTeamProfileName: "Sandcats",
      seed: "sandcats-profile",
      candidatesPerSlot: 8,
      improvementPasses: 3,
      traitPolicy: { mode: "atLeastOne", allowedPolarity: "positive" },
    });

    expect(roster.players).toHaveLength(22);
    expect(roster.profile.counts).toEqual({
      players: 22,
      hitters: 13,
      rotation: 5,
      bullpen: 4,
    });
    expect(roster.positionCounts.SP).toBe(4);
    expect(roster.positionCounts.RP).toBe(4);
    expect(roster.positionCounts.CP ?? 0).toBe(0);
    expect(countBy(roster.players.map((player) => player.targetGrade))).toEqual({
      "B-": 2,
      A: 2,
      B: 4,
      "A-": 5,
      "C+": 5,
      C: 3,
      "C-": 1,
    });
    expect(roster.profileDistance.levelDistance).toBeLessThanOrEqual(5);
    expect(roster.profile.levels.speed).toBeGreaterThanOrEqual(4);
    expect(roster.profile.levels.power).toBeLessThanOrEqual(2);
    expect(roster.players.filter((player) => player.trait1 || player.trait2)).toHaveLength(22);
    roster.players
      .filter((player) => ["SP", "RP", "CP", "SP/RP"].includes(player.primaryPosition || ""))
      .forEach(expectValidPitcherArsenal);
  });

  test("summarizes generated rosters with profile bars and report rows", () => {
    const roster = generateSmb4Roster({
      teamName: "Generated Sandcats",
      standardTeamProfileName: "Sandcats",
      seed: "sandcats-profile",
      candidatesPerSlot: 8,
      improvementPasses: 3,
      traitPolicy: { mode: "atLeastOne", allowedPolarity: "positive" },
    });

    const report = summarizeSmb4Roster(roster);
    const markdown = formatSmb4RosterReportMarkdown(roster);

    expect(report.targetProfileCode).toBe("P0-C2-S6-R0-B5");
    expect(report.profileCode).toBe(profileLevelsToCode(roster.profile.levels));
    expect(report.players).toHaveLength(22);
    expect(report.profileBars.power.text).toHaveLength(6);
    expect(report.targetProfileBars.speed.text).toBe("######");
    expect(report.players[0].ratings.power).toBe(roster.players[0].power);
    expect(markdown).toContain("# Generated Sandcats SMB4 Roster Report");
    expect(markdown).toContain("## Profile Bars");
    expect(markdown).toContain("## Players");
  });
});
