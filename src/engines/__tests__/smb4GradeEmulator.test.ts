import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  SMB4_FULL_GRADE_SCALE,
  explainSmb4Player,
  numericScoreToSmb4Grade,
  normalizeSmb4Player,
  scoreSmb4Player,
  type Smb4PlayerInput,
} from "../smb4GradeEmulator";

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

function fixtureByName(name: string): Smb4PlayerInput {
  const player = loadSmb4Fixture().find((row) => row.name === name);
  if (!player) throw new Error(`Missing fixture player: ${name}`);
  return player;
}

describe("SMB4 grade emulator", () => {
  test("normalizes known OCR aliases and arsenal formats", () => {
    const normalized = normalizeSmb4Player({
      primaryPosition: "sp",
      secondaryPosition: "(none)",
      bats: "s",
      throws: "l",
      trait1: "Elite 4",
      trait2: "PWR vs RHP",
      arsenal: "4F, 2F, CF, SL, SC, KN",
    });

    expect(normalized.primaryPosition).toBe("SP");
    expect(normalized.secondaryPosition).toBe("");
    expect(normalized.bats).toBe("S");
    expect(normalized.throws).toBe("L");
    expect(normalized.traits).toEqual(["Elite 4F", "POW vs RHP"]);
    expect(normalized.pitches).toEqual(["2F", "4F", "CF", "SL"]);
  });

  test("filters non-SMB4 pitch strings before scoring arsenal count", () => {
    const valid = scoreSmb4Player({
      primaryPosition: "SP",
      velocity: 50,
      junk: 50,
      accuracy: 50,
      arsenal: "4F|SL",
    });
    const withUnknownPitches = scoreSmb4Player({
      primaryPosition: "SP",
      velocity: 50,
      junk: 50,
      accuracy: 50,
      arsenal: "4F|SL|SC|KN|XYZ",
    });
    const invalidOnly = scoreSmb4Player({
      primaryPosition: "SP",
      velocity: 50,
      junk: 50,
      accuracy: 50,
      arsenal: "SC|KN|XYZ",
    });

    expect(withUnknownPitches.numericScore).toBeCloseTo(valid.numericScore, 10);
    expect(invalidOnly.warnings).toContain("Pitcher has no parsed arsenal; arsenal-count and pitch-type features are zero.");
  });

  test("matches known player grades and numeric scores from the final CODEX model", () => {
    const handley = scoreSmb4Player(fixtureByName("Handley Dexterez"));
    const hurley = scoreSmb4Player(fixtureByName("Hurley Bender"));
    const hammer = scoreSmb4Player(fixtureByName("Hammer Longballo"));
    const winnie = scoreSmb4Player(fixtureByName("Winnie Noelle"));

    expect(handley.playerType).toBe("hitter");
    expect(handley.grade).toBe("S");
    expect(handley.numericScore).toBeCloseTo(96.3101, 4);

    expect(hurley.playerType).toBe("pitcher");
    expect(hurley.grade).toBe("S");
    expect(hurley.numericScore).toBeCloseTo(95.7024, 4);

    expect(hammer.grade).toBe("A+");
    expect(hammer.numericScore).toBeCloseTo(90.9675, 4);

    expect(winnie.grade).toBe("A-");
    expect(winnie.numericScore).toBeCloseTo(81.2001, 4);
  });

  test("keeps the original center mapping available for audit comparisons", () => {
    expect(numericScoreToSmb4Grade(69.55, { gradeMapping: "center" }).grade).toBe("B");
    expect(numericScoreToSmb4Grade(69.55).grade).toBe("B-");

    const rows = loadSmb4Fixture();
    const centerExact = rows.filter((row) => scoreSmb4Player(row, { gradeMapping: "center" }).grade === row.overallGrade).length;

    expect(centerExact).toBe(371);
  });

  test("improves fixture exact-match accuracy with calibrated ordinal thresholds", () => {
    const rows = loadSmb4Fixture();
    let exact = 0;
    let withinOne = 0;
    let hitters = 0;
    let hitterExact = 0;
    let pitchers = 0;
    let pitcherExact = 0;

    for (const row of rows) {
      const result = scoreSmb4Player(row);
      const expectedGrade = String(row.overallGrade || "");
      const expectedIndex = SMB4_FULL_GRADE_SCALE.indexOf(expectedGrade as (typeof SMB4_FULL_GRADE_SCALE)[number]);
      const actualIndex = SMB4_FULL_GRADE_SCALE.indexOf(result.grade);

      if (result.grade === expectedGrade) exact += 1;
      if (Math.abs(actualIndex - expectedIndex) <= 1) withinOne += 1;

      if (result.playerType === "hitter") {
        hitters += 1;
        if (result.grade === expectedGrade) hitterExact += 1;
      } else {
        pitchers += 1;
        if (result.grade === expectedGrade) pitcherExact += 1;
      }
    }

    expect(rows).toHaveLength(440);
    expect(exact).toBe(387);
    expect(withinOne).toBe(439);
    expect(hitters).toBe(261);
    expect(hitterExact).toBe(226);
    expect(pitchers).toBe(179);
    expect(pitcherExact).toBe(161);
  });

  test("explains score contributions that sum back to the numeric score", () => {
    const explanation = explainSmb4Player(fixtureByName("Handley Dexterez"));
    const contributionSum = explanation.allContributions.reduce(
      (sum, contribution) => sum + contribution.contribution,
      explanation.intercept,
    );

    expect(explanation.topContributions.length).toBeGreaterThan(0);
    expect(contributionSum).toBeCloseTo(explanation.numericScore, 10);
    expect(explanation.topContributions[0].feature).toBe("contact");
  });
});
