import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { summarizeRelationshipMoraleDeltas } from './invariants/soul';
import type { LsimH2SuiteSummary } from './seasonRunner';

const DEFAULT_REPORT_PATH = path.resolve(process.cwd(), 'spec-docs/SEASON_SIMULATION_REPORT.md');

function tableRow(values: Array<string | number>): string {
  return `| ${values.map((value) => String(value)).join(' | ')} |`;
}

function jsonBlock(value: unknown): string {
  return ['```json', JSON.stringify(value, null, 2), '```'].join('\n');
}

function invariantTable(summary: LsimH2SuiteSummary): string {
  const rows = Object.entries(summary.baseline.invariantResults)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, result]) => tableRow([name, result.tag, result.pass, result.fail]));
  return [
    tableRow(['Invariant', 'Tag', 'Pass Count', 'Fail Count']),
    tableRow(['---', '---', '---:', '---:']),
    ...rows,
  ].join('\n');
}

function findingsSection(summary: LsimH2SuiteSummary): string {
  const findings = [...summary.baseline.findings, ...summary.determinismFindings];
  if (findings.length === 0) return 'No RED findings logged.';
  return findings
    .map((finding) => [
      `- ${finding.tag} ${finding.name} at game ${finding.gameNumber}`,
      `  - classification: ${finding.classification}`,
      `  - detail: ${finding.detail}`,
    ].join('\n'))
    .join('\n');
}

function deferredSection(summary: LsimH2SuiteSummary): string {
  return summary.deferred
    .map((entry) => `- ${entry.section} ${entry.name}: ${entry.reason}`)
    .join('\n');
}

export function renderLsimH2Report(summary: LsimH2SuiteSummary): string {
  const baseline = summary.baseline;
  const relationshipMoraleDeltas = summarizeRelationshipMoraleDeltas(baseline.finalSnapshot);
  return [
    '# Season Simulation Report',
    '',
    'Generated: 2026-06-19',
    '',
    '## L-SIM-H2 Summary',
    '',
    tableRow(['Leg', 'Seed', 'Games Simulated', 'Total Scheduled Games', 'Stopped Early', 'Final Digest']),
    tableRow(['---', '---', '---:', '---:', '---', '---']),
    tableRow([
      'Baseline',
      baseline.seed,
      baseline.gamesSimulated,
      baseline.totalScheduledGames,
      String(baseline.stoppedEarly),
      baseline.finalDigest,
    ]),
    tableRow([
      'Determinism A',
      summary.determinism.seed,
      summary.determinism.firstGamesSimulated,
      baseline.totalScheduledGames,
      'n/a',
      summary.determinism.firstDigest,
    ]),
    tableRow([
      'Determinism B',
      summary.determinism.seed,
      summary.determinism.secondGamesSimulated,
      baseline.totalScheduledGames,
      'n/a',
      summary.determinism.secondDigest,
    ]),
    '',
    `Determinism same-seed byte-identical end-state: **${summary.determinism.sameSeedByteIdentical ? 'PASS' : 'FAIL'}**`,
    '',
    `Exact baseline games simulated: **${baseline.gamesSimulated}**`,
    '',
    `Checkpoint cadence: **${baseline.checkpointCadence}** (${baseline.checkpointGameNumbers.length} boundaries)`,
    '',
    `Checkpoint files: ${baseline.checkpointFiles.length === 0 ? 'none' : baseline.checkpointFiles.join(', ')}`,
    '',
    '## L13 Relationship Morale Deltas',
    '',
    jsonBlock(relationshipMoraleDeltas),
    '',
    '## Soul-Layer Invariants',
    '',
    invariantTable(summary),
    '',
    '## Gaps / Deferred',
    '',
    deferredSection(summary),
    '',
    '## Section 9 Distributions',
    '',
    jsonBlock(baseline.distributions),
    '',
    '## Findings',
    '',
    findingsSection(summary),
    '',
    '## Notes',
    '',
    '- The runner drives real `processCompletedGame` with all Phase-2 flags forced on.',
    `- The baseline sandbox is direct, deterministic, 6 teams, ${baseline.gamesPerTeam} games per team, ${baseline.totalScheduledGames} scheduled games.`,
    '- The full edge-league and multi-season matrix remains assigned to the Opus step-4 audit.',
    '',
  ].join('\n');
}

export async function writeLsimH2Report(
  summary: LsimH2SuiteSummary,
  outputPath = DEFAULT_REPORT_PATH,
): Promise<string> {
  const markdown = renderLsimH2Report(summary);
  await writeFile(outputPath, markdown, 'utf8');
  return outputPath;
}
