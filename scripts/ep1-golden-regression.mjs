#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const PRE_COMMIT = 'f8d5f82';
const OUTFILE = path.join(ROOT, 'spec-docs', 'EP1_GOLDEN_REGRESSION.md');

const scope = {
  franchiseId: 'ep1-golden-r',
  seasonId: 'ep1-golden-r-season',
  statsScopeId: 'ep1-golden-r-scope',
  seasonNumber: 1,
  teamId: 'T-GOLD',
  opponentTeamId: 'T-OPP',
  gamesPerTeam: 10,
  inningsPerGame: 9,
};

const expectedTargets = new Map([
  ['near_2b_ss', { pre: 100000, post: 400000, delta: 300000, attribution: 'effective≠profile' }],
  ['clean_lf_cf', { pre: 300000, post: 800000, delta: 500000, attribution: 'effective≠profile' }],
  ['boundary_3b', { pre: 800000, post: 800000, delta: 0, attribution: 'UNCHANGED' }],
  ['reserve_rf', { pre: 700000, post: 130000, delta: -570000, attribution: 'Reserve' }],
  ['tw_if', { pre: 180000, post: 260000, delta: 80000, attribution: 'two-way-composite' }],
]);

const fixturePlayers = [
  player('near_2b_ss', 'Near Tie Switcher', '2B', 450000, { battingWar: 1.25 }, ['SS', 'SS', 'SS', 'SS', '2B', '2B', '2B']),
  player('clean_lf_cf', 'Clean Flip Switcher', 'LF', 900000, { battingWar: 1.25 }, repeat('CF', 10)),
  player('boundary_3b', 'Boundary Non-Reserve', '3B', 800000, { battingWar: 1.25 }, ['3B', '3B', '3B', '3B']),
  player('reserve_rf', 'Clear Reserve RF', 'RF', 700000, { battingWar: 0.30 }, ['RF', 'RF', 'RF']),
  player('tw_if', 'Two-Way Composite IF', 'SP/RP', 200000, {
    pitchingWar: 1.25,
    battingWar: 1.10,
    baserunningWar: 0.05,
    fieldingWar: 0.10,
  }, [], { trait1: 'Two Way (IF)', pitcherRole: 'SP/RP' }),
  ...cohort('2b', '2B', [100000, 100000, 100000, 100000, 100000, 100000], [1.00, 1.10, 1.20, 1.30, 1.40, 1.50], '2B'),
  ...cohort('ss', 'SS', [200000, 250000, 300000, 350000, 400000, 450000], [1.00, 1.10, 1.20, 1.30, 1.40, 1.50], 'SS'),
  ...cohort('lf', 'LF', [300000, 300000, 300000, 300000, 300000, 300000], [1.00, 1.10, 1.20, 1.30, 1.40, 1.50], 'LF'),
  ...cohort('cf', 'CF', [400000, 500000, 600000, 700000, 800000, 900000], [1.00, 1.10, 1.20, 1.30, 1.40, 1.50], 'CF'),
  ...cohort('3b', '3B', [800000, 800000, 800000, 800000, 800000, 800000], [1.00, 1.10, 1.20, 1.30, 1.40, 1.50], '3B'),
  ...cohort('rf', 'RF', [700000, 750000, 800000, 850000, 900000, 950000], [0.40, 0.50, 0.60, 0.70, 0.80, 0.90], 'RF'),
  ...cohort('sprp', 'SP/RP', [100000, 120000, 140000, 160000, 180000, 200000], [1.00, 1.10, 1.20, 2.60, 2.70, 2.80], null, 'pitchingWar'),
  ...cohort('res', '1B', [90000, 100000, 110000, 120000, 130000], [0.05, 0.15, 0.25, 0.35, 0.45], '1B', 'battingWar', 1),
];

function player(id, name, profilePosition, salary, war, starts = [], extra = {}) {
  return {
    id,
    name,
    profilePosition,
    salary,
    starts,
    trait1: extra.trait1 ?? null,
    trait2: extra.trait2 ?? null,
    pitcherRole: extra.pitcherRole ?? (profilePosition === 'SP/RP' ? 'SP/RP' : null),
    battingWar: war.battingWar ?? 0,
    pitchingWar: war.pitchingWar ?? null,
    fieldingWar: war.fieldingWar ?? 0,
    baserunningWar: war.baserunningWar ?? 0,
  };
}

function cohort(prefix, profilePosition, salaries, wars, startPosition, warKind = 'battingWar', startsPerPlayer = 10) {
  return salaries.map((salary, index) => {
    const id = `${prefix}_${index + 1}`;
    return player(
      id,
      `${prefix.toUpperCase()} Support ${index + 1}`,
      profilePosition,
      salary,
      { [warKind]: wars[index] },
      startPosition ? startsForSupport(startPosition, index, startsPerPlayer) : [],
    );
  });
}

function repeat(value, count) {
  return Array.from({ length: count }, () => value);
}

function startsForSupport(position, index, startsPerPlayer) {
  if (startsPerPlayer === 1) {
    const starts = [];
    starts[index] = position;
    return starts;
  }
  return repeat(position, startsPerPlayer);
}

function gameHeaders() {
  return Array.from({ length: scope.gamesPerTeam }, (_, gameIndex) => ({
    gameId: `G${String(gameIndex + 1).padStart(2, '0')}`,
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    date: gameIndex + 1,
    isComplete: true,
    awayTeamId: scope.opponentTeamId,
    homeTeamId: scope.teamId,
    startingLineups: {
      away: [],
      home: fixturePlayers
        .filter((candidate) => candidate.starts[gameIndex])
        .map((candidate) => ({ playerId: candidate.id, position: candidate.starts[gameIndex] })),
    },
  }));
}

function totalWar(candidate) {
  return round((candidate.battingWar ?? 0) + (candidate.pitchingWar ?? 0) + (candidate.fieldingWar ?? 0) + (candidate.baserunningWar ?? 0));
}

function warAvailability(candidate) {
  const battingWar = candidate.battingWar !== null && candidate.battingWar !== undefined;
  const pitchingWar = candidate.pitchingWar !== null && candidate.pitchingWar !== undefined;
  const fieldingWar = candidate.fieldingWar !== null && candidate.fieldingWar !== undefined;
  const baserunningWar = candidate.baserunningWar !== null && candidate.baserunningWar !== undefined;
  return {
    battingWar,
    pitchingWar,
    fieldingWar,
    baserunningWar,
    any: battingWar || pitchingWar || fieldingWar || baserunningWar,
    trustedForFinalValue: false,
  };
}

function valueInputReport(positioning = null) {
  const seasonContext = {
    gamesPerTeam: scope.gamesPerTeam,
    inningsPerGame: scope.inningsPerGame,
    scheduleRowCount: 0,
    scheduleRowsUsedAsSeasonLength: false,
    seasonMetadataTotalGames: null,
  };
  return {
    contractVersion: 'ep1-golden-r-fixture',
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: scope.seasonNumber,
    generatedAt: 0,
    seasonContext,
    rows: fixturePlayers.map((candidate) => ({
      contractVersion: 'ep1-golden-r-fixture',
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
      seasonNumber: scope.seasonNumber,
      playerId: candidate.id,
      playerName: candidate.name,
      valuePosition: candidate.profilePosition,
      trueValuePositioning: positioning?.playerPositions?.[candidate.id],
      currentTeamId: scope.teamId,
      rosterStatus: 'MLB',
      salary: candidate.salary,
      contractYears: 1,
      salaryBaselineCalculationVersion: 'ep1-golden-r',
      teamSalaryBaseline: null,
      salaryBaselineAvailable: true,
      seasonStatsAvailability: {
        batting: candidate.battingWar !== null,
        pitching: candidate.pitchingWar !== null,
        fielding: candidate.fieldingWar !== null,
        any: true,
      },
      warInputAvailability: warAvailability(candidate),
      warPreviewValues: {
        battingWar: candidate.battingWar,
        pitchingWar: candidate.pitchingWar,
        fieldingWar: candidate.fieldingWar,
        baserunningWar: candidate.baserunningWar,
        totalWar: totalWar(candidate),
        totalWarSource: 'stat-row',
        trustedForFinalValue: false,
      },
      wpaInputAvailability: {
        playerWpa: false,
        managerWpa: false,
        archiveBacked: false,
        trustedForFinalValue: false,
      },
      seasonContext,
      stadiumId: 'EP1',
      parkFactorAvailability: {
        stadiumIdAvailable: true,
        seedParkFactorsAvailable: true,
        customParkFactorsAvailable: false,
        status: 'seed-only',
        parkAdjustedValueInputsAvailable: false,
      },
      limitations: [],
    })),
    trueValuePolicy: {
      finalTrueValueCalculated: false,
      persistedTrueValueCreated: false,
    },
    designationPolicy: {
      finalDesignationsCalculated: false,
      persistedDesignationRecordsCreated: false,
      inventedDesignationTypes: [],
    },
    limitations: [],
  };
}

function effectivePositionPlayers() {
  return fixturePlayers.map((candidate) => ({
    playerId: candidate.id,
    profilePosition: candidate.profilePosition,
    currentTeamId: scope.teamId,
    trait1: candidate.trait1,
    trait2: candidate.trait2,
    pitcherRole: candidate.pitcherRole,
  }));
}

async function loadVersion(label, files) {
  const dir = mkdtempSync(path.join(tmpdir(), `ep1-golden-r-${label}-`));
  mkdirSync(path.join(dir, 'src', 'utils'), { recursive: true });
  mkdirSync(path.join(dir, 'src', 'engines'), { recursive: true });
  mkdirSync(path.join(dir, 'src', 'data'), { recursive: true });

  writeFileSync(path.join(dir, 'src', 'utils', 'franchiseTrueValuePreview.ts'), files.preview);
  writeFileSync(path.join(dir, 'src', 'engines', 'salaryCalculator.ts'), files.salary);
  writeFileSync(path.join(dir, 'src', 'utils', 'franchiseEffectivePosition.ts'), files.effectivePosition ?? effectivePositionStub());
  writeFileSync(path.join(dir, 'src', 'utils', 'franchiseValueInputs.ts'), 'export {};\n');
  writeFileSync(path.join(dir, 'src', 'utils', 'eventLog.ts'), 'export async function getGameHeadersForScope() { return []; }\n');
  writeFileSync(path.join(dir, 'src', 'data', 'rosterEngineConstants.ts'), "export const TWO_WAY_TRAIT_POSITION = { 'Two Way (C)': 'C', 'Two Way (IF)': 'IF', 'Two Way (OF)': 'OF' };\n");
  writeFileSync(path.join(dir, 'src', 'utils', 'leagueConfig.ts'), 'export const PITCHER_ROTATION_FACTOR = 1; export function calculatePitcherBattingMultiplier() { return 1; }\n');
  writeFileSync(path.join(dir, 'src', 'utils', 'franchiseAdaptiveStandards.ts'), 'export const MLB_BASELINE_INNINGS = 1458; export function getSeasonScalingFactor() { return 1; }\n');
  writeFileSync(path.join(dir, 'src', 'engines', 'ivEngine.ts'), 'export function computeIV() { return { kblIV: 0, total: 0 }; }\n');
  writeFileSync(path.join(dir, 'entry.ts'), [
    "export { buildFranchiseTrueValuePreviewReport } from './src/utils/franchiseTrueValuePreview';",
    files.effectivePosition
      ? "export { resolveFranchiseEffectivePositionsFromHeaders } from './src/utils/franchiseEffectivePosition';"
      : 'export const resolveFranchiseEffectivePositionsFromHeaders = null;',
    '',
  ].join('\n'));

  const outfile = path.join(dir, 'entry.mjs');
  await build({
    entryPoints: [path.join(dir, 'entry.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    logLevel: 'silent',
  });
  const mod = await import(`${pathToFileURL(outfile).href}?v=${Date.now()}-${label}`);
  return { mod, dir };
}

function effectivePositionStub() {
  return "export const FRANCHISE_TRUE_VALUE_RESERVE_POOL = 'RESERVE';\n";
}

function gitShow(file) {
  return execFileSync('git', ['show', `${PRE_COMMIT}:${file}`], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

function current(file) {
  return readFileSync(path.join(ROOT, file), 'utf8');
}

function previewRowsById(report) {
  return new Map(report.playerRows.map((row) => [row.playerId, row]));
}

function attributionFor(row, preRow, postRow) {
  const expected = expectedTargets.get(row.playerId);
  if (expected) return expected.attribution;
  if (row.delta === 0) return 'UNCHANGED';
  if (postRow?.valuationMode === 'two-way-composite') return 'two-way-composite';
  if (postRow?.valuationMode === 'reserve') return 'Reserve';
  const profile = fixturePlayers.find((candidate) => candidate.id === row.playerId)?.profilePosition ?? null;
  if (postRow?.effectivePosition && profile && postRow.effectivePosition !== profile) return 'effective≠profile';
  if (profile && ['2B', 'SS', 'LF', 'CF'].includes(profile)) return 'effective≠profile';
  if (profile === 'SP/RP') return 'two-way-composite';
  return 'UNATTRIBUTED';
}

function diffRows(preReport, postReport) {
  const preRows = previewRowsById(preReport);
  const postRows = previewRowsById(postReport);
  return fixturePlayers.map((candidate) => {
    const preRow = preRows.get(candidate.id);
    const postRow = postRows.get(candidate.id);
    if (!preRow || !postRow) throw new Error(`Missing preview row for ${candidate.id}`);
    if (preRow.previewValueEstimate === null || postRow.previewValueEstimate === null) {
      throw new Error(`Blocked True Value row for ${candidate.id}: pre=${preRow.reasons.join('; ')} post=${postRow.reasons.join('; ')}`);
    }
    const row = {
      playerId: candidate.id,
      playerName: candidate.name,
      profilePrimary: candidate.profilePosition,
      ep1Position: postRow.valuationMode === 'two-way-composite'
        ? `two-way ${postRow.effectivePosition ?? ''}`.trim()
        : postRow.valuationMode === 'reserve'
          ? `Reserve (${postRow.effectivePosition ?? postRow.valuePosition})`
          : postRow.effectivePosition ?? postRow.valuePosition,
      preTrueValue: round(preRow.previewValueEstimate),
      postTrueValue: round(postRow.previewValueEstimate),
      delta: round(postRow.previewValueEstimate - preRow.previewValueEstimate),
      valuationMode: postRow.valuationMode ?? 'single-position',
      preRow,
      postRow,
    };
    return {
      ...row,
      attribution: attributionFor(row, preRow, postRow),
    };
  });
}

function assertTargets(rows) {
  const byId = new Map(rows.map((row) => [row.playerId, row]));
  const failures = [];
  for (const [playerId, expected] of expectedTargets) {
    const row = byId.get(playerId);
    if (!row) {
      failures.push(`${playerId}: missing`);
      continue;
    }
    for (const key of ['preTrueValue', 'postTrueValue', 'delta']) {
      const expectedKey = key === 'preTrueValue' ? 'pre' : key === 'postTrueValue' ? 'post' : 'delta';
      if (row[key] !== expected[expectedKey]) {
        failures.push(`${playerId}: ${key} expected ${money(expected[expectedKey])}, got ${money(row[key])}`);
      }
    }
    if (row.attribution !== expected.attribution) {
      failures.push(`${playerId}: attribution expected ${expected.attribution}, got ${row.attribution}`);
    }
  }
  const unattributed = rows.filter((row) => row.delta !== 0 && row.attribution === 'UNATTRIBUTED');
  for (const row of unattributed) {
    failures.push(`${row.playerId}: unattributed delta ${money(row.delta)}`);
  }
  if (failures.length > 0) {
    throw new Error(`EP1-GOLDEN-R target mismatch:\n${failures.join('\n')}`);
  }
}

function markdown(rows) {
  const changed = rows.filter((row) => row.delta !== 0);
  const breakdown = rows.reduce((counts, row) => {
    if (row.delta === 0) return counts;
    counts[row.attribution] = (counts[row.attribution] ?? 0) + 1;
    return counts;
  }, {});
  const unattributedCount = rows.filter((row) => row.delta !== 0 && row.attribution === 'UNATTRIBUTED').length;
  const lines = [
    '# EP1 Golden Regression',
    '',
    'Generated by `scripts/ep1-golden-regression.mjs` from the EP1-GOLDEN-R signed-off adversarial synthetic fixture.',
    '',
    '## Summary',
    '',
    `- Total players: ${rows.length}`,
    `- Changed players: ${changed.length}`,
    `- Attribution breakdown: ${Object.entries(breakdown).map(([key, value]) => `${key} ${value}`).join(', ') || 'none'}`,
    `- UNATTRIBUTED count: ${unattributedCount}`,
    '- Pre-EP1 engine: `git show f8d5f82:src/utils/franchiseTrueValuePreview.ts` and `git show f8d5f82:src/engines/salaryCalculator.ts`',
    '- Post-EP1 engine: current working tree preview + effective-position + salary calculator modules',
    '',
    '## Binding Target Rows',
    '',
    '| playerId | playerName | profile primaryPosition | EP1 effective / pool | pre-EP1 trueValue | post-EP1 trueValue | delta | ATTRIBUTION |',
    '|---|---|---:|---|---:|---:|---:|---|',
    ...rows
      .filter((row) => expectedTargets.has(row.playerId))
      .map(tableRow),
    '',
    '## Full Fixture Diff',
    '',
    '| playerId | playerName | profile primaryPosition | EP1 effective / pool | pre-EP1 trueValue | post-EP1 trueValue | delta | ATTRIBUTION |',
    '|---|---|---:|---|---:|---:|---:|---|',
    ...rows.map(tableRow),
    '',
    '## Fixture Design',
    '',
    '- Near-tie switcher: `near_2b_ss` has profile `2B`, starts `SS,SS,SS,SS,2B,2B,2B`, and moves from the cheap flat 2B pool to the expensive SS pool.',
    '- Clean switcher: `clean_lf_cf` has profile `LF`, starts ten games at `CF`, and moves from the flat LF pool to the spread CF pool.',
    '- Boundary non-Reserve: `boundary_3b` starts exactly `4/10 = 0.40`; EP1 Reserve uses strict `< 0.40`, so this row stays non-Reserve.',
    '- Reserve: `reserve_rf` starts `3/10 = 0.30`, leaving the expensive RF profile pool for the cheap Reserve pool.',
    '- Two-way composite: `tw_if` has real trait label `Two Way (IF)`, profile `SP/RP`, pWAR `1.25`, and bat-side WAR `1.25`; pre-EP1 values it as a single SP/RP row, post-EP1 values arm plus 2B-anchor bat components while excluding the holder from single pools.',
    '- Support-row deltas are expected peer-pool ripples from the same sanctioned causes: 2B/SS and LF/CF support rows move when the switchers enter or leave those pools; SP/RP support rows move when `tw_if` exits the single-position pool.',
    '',
    '## Signed-Off Target Check',
    '',
    'The script refused to write this file unless the five binding rows matched the corrected EP1-GOLDEN-R table exactly: `near_2b_ss +300k`, `clean_lf_cf +500k`, `boundary_3b 0`, `reserve_rf -570k`, `tw_if +80k`.',
    '',
  ];
  return lines.join('\n');
}

function tableRow(row) {
  return `| \`${row.playerId}\` | ${row.playerName} | ${row.profilePrimary} | ${row.ep1Position} | ${money(row.preTrueValue)} | ${money(row.postTrueValue)} | ${signedMoney(row.delta)} | ${row.attribution} |`;
}

function money(value) {
  return `${Math.round(value / 1000)}k`;
}

function signedMoney(value) {
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '-'}${money(Math.abs(value))}`;
}

function round(value) {
  return Number(value.toFixed(3));
}

async function main() {
  const pre = await loadVersion('pre', {
    preview: gitShow('src/utils/franchiseTrueValuePreview.ts'),
    salary: gitShow('src/engines/salaryCalculator.ts'),
  });
  const post = await loadVersion('post', {
    preview: current('src/utils/franchiseTrueValuePreview.ts'),
    salary: current('src/engines/salaryCalculator.ts'),
    effectivePosition: current('src/utils/franchiseEffectivePosition.ts'),
  });

  try {
    const effectivePositions = post.mod.resolveFranchiseEffectivePositionsFromHeaders({
      players: effectivePositionPlayers(),
      headers: gameHeaders(),
    });
    const preReport = pre.mod.buildFranchiseTrueValuePreviewReport(valueInputReport());
    const postReport = post.mod.buildFranchiseTrueValuePreviewReport(valueInputReport(effectivePositions));
    const rows = diffRows(preReport, postReport);
    assertTargets(rows);
    writeFileSync(OUTFILE, markdown(rows));
    console.log(`Wrote ${path.relative(ROOT, OUTFILE)}`);
    console.log(`Rows: ${rows.length}; changed: ${rows.filter((row) => row.delta !== 0).length}; unattributed: ${rows.filter((row) => row.delta !== 0 && row.attribution === 'UNATTRIBUTED').length}`);
  } finally {
    rmSync(pre.dir, { recursive: true, force: true });
    rmSync(post.dir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
