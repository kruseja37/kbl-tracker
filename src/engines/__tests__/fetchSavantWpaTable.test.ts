import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const fetchScriptPath = resolve(repoRoot, "scripts/fetchSavantWpaTable.mjs");
const diffSuffixes = [
  "minus_5",
  "minus_4",
  "minus_3",
  "minus_2",
  "minus_1",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
] as const;

function runFetchScriptWithStub(mode: "terminal-null" | "non-terminal-null") {
  const tempDir = mkdtempSync(join(tmpdir(), "savant-wpa-fetch-"));
  const preloadPath = join(tempDir, "stub-fetch.mjs");
  const outputPath = join(tempDir, "artifact.json");

  writeFileSync(
    preloadPath,
    `
const DIFFS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
const mode = process.env.SAVANT_FETCH_STUB_MODE;

function suffix(diff) {
  return diff < 0 ? "minus_" + Math.abs(diff) : String(diff);
}

globalThis.fetch = async (url) => {
  const requestUrl = new URL(url);
  const params = JSON.parse(requestUrl.searchParams.get("params"));
  const rows = [];

  for (let bases = 0; bases < 8; bases += 1) {
    const row = {
      season_id: 2025,
      inning: params.inning,
      bottom_top: params.half,
      top_inning_sw: params.half === "Top" ? "Y" : "N",
      bases_cd: bases,
      bases: String(bases),
      outs: params.outs,
    };

    for (const diff of DIFFS) {
      const key = suffix(diff);
      const isBadCell =
        mode === "non-terminal-null" &&
        params.inning === 1 &&
        params.half === "Top" &&
        params.outs === 0 &&
        bases === 0 &&
        key === "0";
      row["bat_wins_" + key] = isBadCell ? 0.5 : 1;
      row["leverage_index_" + key] = null;
    }

    rows.push(row);
  }

  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => rows,
    text: async () => JSON.stringify(rows),
  };
};
`,
  );

  const result = spawnSync(
    process.execPath,
    ["--import", preloadPath, fetchScriptPath, "--output", outputPath],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        SAVANT_FETCH_STUB_MODE: mode,
      },
    },
  );

  return {
    outputPath,
    result,
    cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
  };
}

describe("fetchSavantWpaTable", () => {
  test("normalizes terminal null leverage index values to zero", () => {
    const run = runFetchScriptWithStub("terminal-null");
    try {
      expect(run.result.status).toBe(0);
      const artifact = JSON.parse(readFileSync(run.outputPath, "utf8"));

      expect(artifact.rows).toHaveLength(480);
      for (const row of artifact.rows) {
        for (const suffix of diffSuffixes) {
          expect(row[`bat_wins_${suffix}`]).toBe(1);
          expect(row[`leverage_index_${suffix}`]).toBe(0);
        }
      }
    } finally {
      run.cleanup();
    }
  });

  test("rejects non-terminal null leverage index values", () => {
    const run = runFetchScriptWithStub("non-terminal-null");
    try {
      expect(run.result.status).not.toBe(0);
      expect(`${run.result.stderr}\n${run.result.stdout}`).toContain(
        "Savant row has null leverage index leverage_index_0 before a non-terminal win probability",
      );
    } finally {
      run.cleanup();
    }
  });
});
