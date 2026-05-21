import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MODEL_VERSION = "mlb-savant-wpa-2016-2025-v1";
const SOURCE_URL = "https://baseballsavant.mlb.com/game-strategy-explorer";
const ENDPOINT_URL = SOURCE_URL;
const DEFAULT_OUTPUT = "src/engines/data/mlbSavantWpa2016_2025.json";
const INNINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const HALVES = ["Top", "Bottom"];
const OUTS = [0, 1, 2];
const EXPECTED_BASE_STATES = new Set([0, 1, 2, 3, 4, 5, 6, 7]);
const SCORE_DIFFS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outputArgIndex = process.argv.indexOf("--output");
const outputPath =
  outputArgIndex >= 0 && process.argv[outputArgIndex + 1]
    ? process.argv[outputArgIndex + 1]
    : DEFAULT_OUTPUT;
const resolvedOutput = resolve(repoRoot, outputPath);

function buildParams(inning, half, outs) {
  return {
    inning,
    half,
    outs,
    balls: null,
    strikes: null,
    situation: null,
    run_diff: 0,
    runners: { "1b": false, "2b": false, "3b": false },
    // The endpoint currently returns batting-team columns either way, but using
    // the batting perspective makes that contract explicit for future refetches.
    perspective: "bat",
  };
}

function buildUrl(params) {
  const url = new URL(ENDPOINT_URL);
  url.searchParams.set("type", "winexp");
  url.searchParams.set("params", JSON.stringify(params));
  return url;
}

function assertNumber(row, field) {
  if (typeof row[field] !== "number" || !Number.isFinite(row[field])) {
    throw new Error(`Savant row is missing numeric field ${field}`);
  }
}

function assertWinProbability(row, field) {
  assertNumber(row, field);
  if (row[field] < 0 || row[field] > 1) {
    throw new Error(`Savant row has out-of-range win probability ${field}`);
  }
}

function normalizeLeverageIndex(row, field, winProbabilityField) {
  if (row[field] === null) {
    if (row[winProbabilityField] !== 0 && row[winProbabilityField] !== 1) {
      throw new Error(
        `Savant row has null leverage index ${field} before a non-terminal win probability`,
      );
    }
    row[field] = 0;
  }

  assertNumber(row, field);
  if (row[field] < 0) {
    throw new Error(`Savant row has negative leverage index ${field}`);
  }
}

function validateRows(rows, request) {
  if (!Array.isArray(rows)) {
    throw new Error(`Expected an array for ${JSON.stringify(request)}`);
  }
  if (rows.length !== 8) {
    throw new Error(`Expected 8 base-state rows for ${JSON.stringify(request)}, got ${rows.length}`);
  }

  const seenBases = new Set();
  for (const row of rows) {
    if (row.inning !== request.inning) {
      throw new Error(`Unexpected inning ${row.inning} for ${JSON.stringify(request)}`);
    }
    if (row.bottom_top !== request.half) {
      throw new Error(`Unexpected half ${row.bottom_top} for ${JSON.stringify(request)}`);
    }
    if (row.outs !== request.outs) {
      throw new Error(`Unexpected outs ${row.outs} for ${JSON.stringify(request)}`);
    }
    if (!EXPECTED_BASE_STATES.has(row.bases_cd)) {
      throw new Error(`Unexpected base state ${row.bases_cd} for ${JSON.stringify(request)}`);
    }
    if (seenBases.has(row.bases_cd)) {
      throw new Error(`Duplicate base state ${row.bases_cd} for ${JSON.stringify(request)}`);
    }
    seenBases.add(row.bases_cd);

    for (const diff of SCORE_DIFFS) {
      const suffix = diff < 0 ? `minus_${Math.abs(diff)}` : String(diff);
      const winProbabilityField = `bat_wins_${suffix}`;
      assertWinProbability(row, winProbabilityField);
      normalizeLeverageIndex(
        row,
        `leverage_index_${suffix}`,
        winProbabilityField,
      );
    }
  }
}

async function fetchRows(params) {
  const response = await fetch(buildUrl(params), {
    headers: {
      accept: "application/json",
      "user-agent": "kbl-tracker-dev-savant-wpa-fetch/1.0",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Savant request failed ${response.status} ${response.statusText}: ${body.slice(0, 300)}`,
    );
  }

  const rows = await response.json();
  validateRows(rows, params);
  return rows;
}

const rows = [];
let requestCount = 0;

for (const inning of INNINGS) {
  for (const half of HALVES) {
    for (const outs of OUTS) {
      const params = buildParams(inning, half, outs);
      const requestRows = await fetchRows(params);
      rows.push(...requestRows);
      requestCount += 1;
      console.log(
        `Fetched ${requestRows.length} rows for inning=${inning} half=${half} outs=${outs}`,
      );
    }
  }
}

rows.sort(
  (left, right) =>
    left.inning - right.inning ||
    left.bottom_top.localeCompare(right.bottom_top) ||
    left.outs - right.outs ||
    left.bases_cd - right.bases_cd,
);

const uniqueKeys = new Set(
  rows.map((row) => `${row.inning}|${row.bottom_top}|${row.outs}|${row.bases_cd}`),
);
if (uniqueKeys.size !== rows.length) {
  throw new Error(`Fetched ${rows.length} rows but only ${uniqueKeys.size} unique row keys`);
}

const artifact = {
  modelVersion: MODEL_VERSION,
  source: "Baseball Savant Game Strategy Explorer",
  sourceUrl: SOURCE_URL,
  fetchedAt: new Date().toISOString(),
  regularSeasonYears: [2016, 2025],
  endpointTypes: ["winexp"],
  requestCount,
  rows,
};

await mkdir(dirname(resolvedOutput), { recursive: true });
await writeFile(resolvedOutput, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Wrote ${rows.length} rows to ${resolvedOutput}`);
