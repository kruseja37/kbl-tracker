import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = join(__dirname, '..', '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

describe('salary cap ratings invariant CODEX-HARDCAP-P1', () => {
  test('TIER_RATING_SCALES remains declared only and is not used to scale live player ratings', () => {
    const usages = sourceFiles(SRC_ROOT)
      .map((path) => ({
        path: relative(SRC_ROOT, path),
        source: readFileSync(path, 'utf8'),
      }))
      .filter(({ path }) => !path.includes('__tests__/'))
      .filter(({ source }) => source.includes('TIER_RATING_SCALES'))
      .map(({ path }) => path)
      .sort();

    expect(usages).toEqual(['data/tierParams.ts']);
  });
});
