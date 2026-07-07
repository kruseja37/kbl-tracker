import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { cwd } from "node:process";

import { describe, expect, test } from "vitest";

import { calculateWPA } from "../wpaCalculator";
import { WPA_MODEL_VERSION } from "../wpaV2";

const repoRoot = cwd();
const srcRoot = join(repoRoot, "src");

function toRepoPath(path: string): string {
  return relative(repoRoot, path).replaceAll("\\", "/");
}

function collectProductionSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      if (entry === "__tests__" || entry === "tests" || entry === "__mocks__") {
        return [];
      }
      return collectProductionSourceFiles(path);
    }

    if (!/\.(ts|tsx)$/.test(entry) || /\.d\.ts$/.test(entry) || /\.test\.(ts|tsx)$/.test(entry)) {
      return [];
    }

    return [path];
  });
}

function findSourceMatches(pattern: RegExp): string[] {
  return collectProductionSourceFiles(srcRoot).flatMap((path) => {
    const source = readFileSync(path, "utf8");
    const lines = source.split(/\r?\n/);
    return lines.flatMap((line, index) => {
      pattern.lastIndex = 0;
      return pattern.test(line) ? [`${toRepoPath(path)}:${index + 1}: ${line.trim()}`] : [];
    });
  });
}

function filePathFromMatch(match: string): string {
  return match.slice(0, match.indexOf(":"));
}

describe("WPA runtime boundary", () => {
  test("legacy approximation identifiers stay out of production source", () => {
    expect(findSourceMatches(/\bcalculateSimpleWinProbability\b/)).toEqual([]);
    expect(findSourceMatches(/\bwinProbBefore\b|\bwinProbAfter\b/)).toEqual([]);

    const manualDeltaMatches = findSourceMatches(
      /\bwinProbabilityAfter\s*-\s*winProbabilityBefore\b|\bwinProbabilityBefore\s*-\s*winProbabilityAfter\b/,
    ).filter((match) => !match.startsWith("src/utils/kblWpaAttribution.ts:"));

    expect(manualDeltaMatches).toEqual([]);
  });

  test("old win probability estimator is only used by non-WPA notability scoring", () => {
    const allowedEstimateFiles = new Set([
      "src/engines/index.ts",
      "src/engines/leverageCalculator.ts",
      "src/engines/notabilityScorer.ts",
    ]);

    const unauthorized = findSourceMatches(/\bestimateWinProbability\b/).filter((match) => {
      const file = match.slice(0, match.indexOf(":"));
      return !allowedEstimateFiles.has(file);
    });

    expect(unauthorized).toEqual([]);
  });

  test("active routes do not mount retired GameTracker or archived GamePage", () => {
    const activeRoutes = [
      readFileSync(join(repoRoot, "src/App.tsx"), "utf8"),
      readFileSync(join(repoRoot, "src/src_figma/app/routes.tsx"), "utf8"),
    ].join("\n");

    expect(activeRoutes).not.toMatch(/components\/GameTracker/);
    expect(activeRoutes).not.toMatch(/archived-pages\/GamePage/);
    expect(activeRoutes).toMatch(/src_figma\/app\/pages\/GameTracker|@\/app\/pages\/GameTracker/);
  });

  test("retired GameTracker entry points cannot write WPA or launch games", () => {
    const retiredTracker = readFileSync(
      join(repoRoot, "src/components/GameTracker/index.tsx"),
      "utf8",
    );
    const archivedGamePage = readFileSync(
      join(repoRoot, "src/archived-pages/GamePage.tsx"),
      "utf8",
    );

    expect(retiredTracker).toMatch(/Retired GameTracker Disabled/);
    expect(retiredTracker).not.toMatch(/\bcalculateWPA\b/);
    expect(retiredTracker).not.toMatch(/\blogAtBatEvent\b/);
    expect(retiredTracker).not.toMatch(/\blogFieldingEvent\b/);
    expect(retiredTracker).not.toMatch(/\bcreateGameHeader\b/);
    expect(retiredTracker).not.toMatch(/\bcompleteGame\b/);
    expect(retiredTracker).not.toMatch(/\bmarkGameAggregated\b/);
    expect(retiredTracker).not.toMatch(/\bmarkAggregationFailed\b/);
    expect(retiredTracker).not.toMatch(/\bwinProbabilityBefore\b|\bwinProbabilityAfter\b/);
    expect(retiredTracker).not.toMatch(/\bwpaModelVersion\b/);

    expect(archivedGamePage).not.toMatch(/components\/GameTracker|\.\.\/components\/GameTracker/);
    expect(archivedGamePage).toMatch(/Navigate to="\/exhibition"/);
  });

  test("known event WPA writers route through calculateWPA", () => {
    const writerFiles = [
      "src/src_figma/hooks/useGameState.ts",
      "src/utils/eventLog.ts",
      "src/utils/kblWpaAttribution.ts",
      "src/utils/managerWpaDerivation.ts",
    ];

    for (const file of writerFiles) {
      const source = readFileSync(join(repoRoot, file), "utf8");
      expect(source, file).toMatch(/\bcalculateWPA\(/);
      expect(source, file).not.toMatch(/\bcalculateSimpleWinProbability\b/);
      expect(source, file).not.toMatch(/\bwinProbBefore\b|\bwinProbAfter\b/);
      expect(source, file).not.toMatch(/\bestimateWinProbability\b/);
    }
  });

  test("event-log write APIs stay in approved runtime surfaces", () => {
    const approvedEventLogWriteFiles = new Set([
      "src/src_figma/app/pages/GameTracker.tsx",
      "src/src_figma/hooks/useGameState.ts",
      "src/hooks/useDataIntegrity.ts",
      "src/utils/eventLog.ts",
      "src/utils/processCompletedGame.ts",
      // Dev-only seed harness: gated behind enableFranchiseManualSmokeSetupRoute (renders NotFound
      // in production). Fabricates played games to preview the Fenway franchise-lens hub. Blessed as
      // a single scoped allowlist entry per JK ruling 2026-07-01 (Wave-0 assembly) — NOT a general
      // loosening; the guard keeps its teeth for every other surface.
      "src/src_figma/app/pages/FranchiseLensSeedPlayed.tsx",
    ]);
    const eventLogWriteApiPattern =
      /\b(?:logAtBatEvent|logFieldingEvent|updateAtBatEvent|updateAtBatEventWithFieldingSync|createGameHeader|completeGame|markGameAggregated|markAggregationFailed)\b/;

    const unauthorized = collectProductionSourceFiles(srcRoot).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      const repoPath = toRepoPath(path);
      if (!source.match(/from\s+["'][^"']*(?:utils\/eventLog|\/eventLog)["']/)) {
        return [];
      }
      if (approvedEventLogWriteFiles.has(repoPath)) {
        return [];
      }

      return source
        .split(/\r?\n/)
        .flatMap((line, index) =>
          !/^\s*(?:\/\/|\*)/.test(line) && eventLogWriteApiPattern.test(line)
            ? [`${repoPath}:${index + 1}: ${line.trim()}`]
            : [],
        );
    });

    expect(unauthorized).toEqual([]);
  });

  test("direct committed WPA field materialization stays allowlisted", () => {
    const approvedDirectWpaFieldFiles = new Set([
      "src/engines/wpaCalculator.ts",
      "src/engines/wpaV2.ts",
      "src/src_figma/app/engines/reporter/reporterContext.ts",
      "src/src_figma/app/hooks/useCommentaryFeed.ts",
      "src/src_figma/app/pages/BetweenInningSummaryPreview.tsx",
      "src/src_figma/app/pages/GameDetail.tsx",
      "src/src_figma/app/pages/GameTracker.tsx",
      "src/src_figma/app/pages/MatchupDramaBarPreview.tsx",
      "src/src_figma/app/utils/gameTrackerRunnerCorrection.ts",
      "src/utils/eventLog.ts",
      // Read-only trust report: consumes archive-backed WPA availability from
      // franchise value inputs and explicitly keeps WPA out of final value authority.
      "src/utils/franchiseAnalyticsTrust.ts",
      // Stadium record materializer: reads committed completed-game WPA archives
      // for cumulative WPA and largest-swing records; it does not calculate WPA.
      "src/utils/franchiseStadiumRecordsStorage.ts",
      "src/utils/gameStorage.ts",
      "src/utils/kblWpaAttribution.ts",
      "src/utils/managerWpaDerivation.ts",
      "src/utils/managerWpaGameState.ts",
      "src/utils/playersOfTheGame.ts",
      "src/utils/scoreReconciliation.ts",
      "src/utils/teamImpact.ts",
    ]);

    const directCommittedWpaFieldPattern =
      /\b(?:wpa|winProbabilityBefore|winProbabilityAfter|homeDelta|wpaModelVersion|battingTeamDelta|fieldingTeamDelta)\s*:|\.(?:wpa|winProbabilityBefore|winProbabilityAfter|homeDelta|battingTeamDelta|fieldingTeamDelta|wpaModelVersion)\s*=/;

    const unauthorized = findSourceMatches(directCommittedWpaFieldPattern).filter((match) => {
      const file = filePathFromMatch(match);
      return !approvedDirectWpaFieldFiles.has(file);
    });

    expect(unauthorized).toEqual([]);
  });

  test("current WPA writer returns the Savant model version and traced fallback for unsupported score diff", () => {
    const result = calculateWPA(
      {
        inning: 6,
        isTop: true,
        outs: 1,
        bases: { first: false, second: false, third: false },
        awayScore: 10,
        homeScore: 4,
      },
      {
        outs: 2,
        bases: { first: false, second: false, third: false },
        awayScore: 10,
        homeScore: 4,
      },
    );

    expect(result.wpaModelVersion).toBe(WPA_MODEL_VERSION);
    expect(result.winExpectancyTraceBefore).toMatchObject({
      fallback: "score-diff-out-of-savant-range",
      fallbackModelVersion: "kbl-wpa-v3",
    });
    expect(result.winExpectancyTraceAfter).toMatchObject({
      fallback: "score-diff-out-of-savant-range",
      fallbackModelVersion: "kbl-wpa-v3",
    });
  });
});
