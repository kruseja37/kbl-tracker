import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';

const SRC_ROOT = 'src';
const TRUST_SOURCE_FILES = new Set([
  'src/utils/franchiseValueInputs.ts',
  'src/utils/franchiseTrueValuePreview.ts',
  'src/utils/franchiseAnalyticsTrust.ts',
  'src/utils/franchiseDesignationReadinessReport.ts',
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === 'tests' || entry === '__tests__') return [];
      return sourceFiles(fullPath);
    }
    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
  });
}

describe('D6a trusted-value boundary', () => {
  test('salary morale and deferred designation code paths do not read trustedForTrueValue', () => {
    const boundaryTerms = /salaryMovementAllowed|moraleMutationAllowed|\bsalaryMovement\b|\bmorale\b|CAPTAIN|Captain|FAN_HOPEFUL|Fan Hopeful|CORNERSTONE|Cornerstone/;
    const leakingFiles = sourceFiles(SRC_ROOT)
      .map((path) => relative('.', path))
      .filter((path) => !TRUST_SOURCE_FILES.has(path))
      .filter((path) => {
        const source = readFileSync(path, 'utf8');
        return source.includes('trustedForTrueValue') && boundaryTerms.test(source);
      });

    expect(leakingFiles).toEqual([]);
  });
});
