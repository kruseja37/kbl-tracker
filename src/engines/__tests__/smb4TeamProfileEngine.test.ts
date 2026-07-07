import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  SMB4_STANDARD_TEAM_PROFILES,
  SMB4_TEAM_PROFILE_CATEGORIES,
  calculateTeamProfile,
  compareTeamProfiles,
  scoreToTeamProfileLevel,
  targetLevelsToTeamProfile,
} from "../smb4TeamProfileEngine";
import type { Smb4PlayerInput } from "../smb4GradeEmulator";

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  return dataRows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

function loadSmb4Fixture(): Smb4PlayerInput[] {
  const fixturePath = path.resolve(process.cwd(), "spec-docs/data/smb4_players_fixed.csv");
  return parseCsv(readFileSync(fixturePath, "utf8")) as Smb4PlayerInput[];
}

function playersByTeam(): Map<string, Smb4PlayerInput[]> {
  const teams = new Map<string, Smb4PlayerInput[]>();
  for (const player of loadSmb4Fixture()) {
    const notes = "notes" in player ? String((player as Record<string, unknown>).notes || "") : "";
    const team = notes.replace(/^SMB4\s+/, "");
    teams.set(team, [...(teams.get(team) ?? []), player]);
  }
  return teams;
}

describe("SMB4 team profile engine", () => {
  test("calculates the first-pass standard profiles from the fixed SMB4 fixture", () => {
    const teams = playersByTeam();

    expect(teams.size).toBe(20);

    for (const [teamName, expected] of Object.entries(SMB4_STANDARD_TEAM_PROFILES)) {
      const players = teams.get(teamName);
      if (!players) throw new Error(`Missing team fixture: ${teamName}`);

      const actual = calculateTeamProfile(players, { teamName });

      expect(actual.counts).toEqual(expected.counts);
      expect(actual.levels).toEqual(expected.levels);
      expect(actual.rawScores).toEqual(expected.rawScores);
      expect(actual.warnings).toEqual([]);
    }
  });

  test("standard profile levels span zero through six in each category", () => {
    for (const category of SMB4_TEAM_PROFILE_CATEGORIES) {
      const levels = Object.values(SMB4_STANDARD_TEAM_PROFILES).map((profile) => profile.levels[category]);
      expect(Math.min(...levels)).toBe(0);
      expect(Math.max(...levels)).toBe(6);
    }
  });

  test("captures obvious team identities", () => {
    expect(SMB4_STANDARD_TEAM_PROFILES.Sirloins.levels.power).toBe(6);
    expect(SMB4_STANDARD_TEAM_PROFILES.Sandcats.levels.speed).toBe(6);
    expect(SMB4_STANDARD_TEAM_PROFILES.Moonstars.levels.rotation).toBe(6);
    expect(SMB4_STANDARD_TEAM_PROFILES.Freebooters.levels.bullpen).toBe(6);
    expect(SMB4_STANDARD_TEAM_PROFILES.Blowfish.levels.contact).toBe(6);
  });

  test("matches exported standard team profile JSON artifacts", () => {
    const exportPath = path.resolve(process.cwd(), "spec-docs/data/smb4_standard_team_profiles.json");
    const exported = JSON.parse(readFileSync(exportPath, "utf8")) as {
      profiles: Record<string, { levels: unknown; rawScores: unknown; counts: unknown }>;
    };

    for (const [teamName, expected] of Object.entries(SMB4_STANDARD_TEAM_PROFILES)) {
      expect(exported.profiles[teamName].levels).toEqual(expected.levels);
      expect(exported.profiles[teamName].rawScores).toEqual(expected.rawScores);
      expect(exported.profiles[teamName].counts).toEqual(expected.counts);
    }
  });

  test("maps category scores to clamped zero-to-six levels", () => {
    expect(scoreToTeamProfileLevel("power", 47.15)).toBe(0);
    expect(scoreToTeamProfileLevel("power", 75.38)).toBe(6);
    expect(scoreToTeamProfileLevel("power", 200)).toBe(6);
    expect(scoreToTeamProfileLevel("power", -20)).toBe(0);
  });

  test("compares profile distance by level and normalized score deltas", () => {
    const sandcats = SMB4_STANDARD_TEAM_PROFILES.Sandcats;
    const target = targetLevelsToTeamProfile(
      {
        power: 0,
        contact: 2,
        speed: 6,
        rotation: 0,
        bullpen: 5,
      },
      "Sandcats Target",
    );

    const exactish = compareTeamProfiles(sandcats, target);
    const sirloinsDistance = compareTeamProfiles(SMB4_STANDARD_TEAM_PROFILES.Sirloins, target);

    expect(exactish.levelDistance).toBe(0);
    expect(sirloinsDistance.levelDistance).toBeGreaterThan(exactish.levelDistance);
    expect(sirloinsDistance.totalDistance).toBeGreaterThan(exactish.totalDistance);
  });
});
