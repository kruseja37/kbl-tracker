import { describe, expect, test } from 'vitest';

import {
  CHEMISTRY_CODES,
  CHEMISTRY_CODE_TO_WORD,
  CHEMISTRY_TARGET_DISTRIBUTION,
  CHEMISTRY_TARGET_SOURCE_TOLERANCE,
  CHEMISTRY_WORD_TO_CODE,
  normalizeToChemistryCode,
  type ChemistryCode,
} from '../chemistryCanonical';
import { PLAYERS } from '../playerDatabase';

describe('chemistryCanonical RB-0a', () => {
  test('pins the target distribution to the five canonical codes and sums to 1.0', () => {
    expect(new Set(CHEMISTRY_CODES).size).toBe(5);
    expect(Object.keys(CHEMISTRY_TARGET_DISTRIBUTION).sort()).toEqual([...CHEMISTRY_CODES].sort());

    const sum = CHEMISTRY_CODES.reduce((total, code) => total + CHEMISTRY_TARGET_DISTRIBUTION[code], 0);
    expect(Math.abs(sum - 1)).toBeLessThanOrEqual(1e-9);
  });

  test('guards the rostered 440-player source distribution against drift', () => {
    const rosteredPlayers = Object.values(PLAYERS).filter((player) => player.teamId !== 'free-agent');
    expect(rosteredPlayers).toHaveLength(440);

    const counts = Object.fromEntries(CHEMISTRY_CODES.map((code) => [code, 0])) as Record<ChemistryCode, number>;
    for (const player of rosteredPlayers) {
      expect(CHEMISTRY_CODES).toContain(player.chemistry);
      counts[player.chemistry as ChemistryCode] += 1;
    }

    for (const code of CHEMISTRY_CODES) {
      const share = counts[code] / rosteredPlayers.length;
      expect(Math.abs(share - CHEMISTRY_TARGET_DISTRIBUTION[code])).toBeLessThanOrEqual(
        CHEMISTRY_TARGET_SOURCE_TOLERANCE,
      );
    }
  });

  test('normalizes codes, words, legacy aliases, and unknown values to canonical codes', () => {
    for (const code of CHEMISTRY_CODES) {
      expect(normalizeToChemistryCode(code)).toBe(code);
      expect(normalizeToChemistryCode(code.toLowerCase())).toBe(code);
    }

    const wordEntries = Object.entries(CHEMISTRY_WORD_TO_CODE) as Array<[keyof typeof CHEMISTRY_WORD_TO_CODE, ChemistryCode]>;
    for (const [word, code] of wordEntries) {
      expect(normalizeToChemistryCode(word)).toBe(code);
      expect(normalizeToChemistryCode(word.toUpperCase())).toBe(code);
      expect(normalizeToChemistryCode(word.toLowerCase())).toBe(code);
    }

    expect(normalizeToChemistryCode('FIERY')).toBe('CMP');
    expect(normalizeToChemistryCode('GRITTY')).toBe('CMP');
    expect(normalizeToChemistryCode('fiery')).toBe('CMP');
    expect(normalizeToChemistryCode('gritty')).toBe('CMP');
    expect(normalizeToChemistryCode('')).toBe('CMP');
    expect(normalizeToChemistryCode('not-a-real-chemistry')).toBe('CMP');
  });

  test('keeps code-to-word and word-to-code maps as exact inverses', () => {
    expect(Object.keys(CHEMISTRY_WORD_TO_CODE).sort()).toEqual(
      CHEMISTRY_CODES.map((code) => CHEMISTRY_CODE_TO_WORD[code]).sort(),
    );

    for (const code of CHEMISTRY_CODES) {
      const word = CHEMISTRY_CODE_TO_WORD[code];
      expect(CHEMISTRY_WORD_TO_CODE[word]).toBe(code);
    }
  });

  test('reproduces the legacy player-path title-case outputs', () => {
    const legacyCases: Array<[string, (typeof CHEMISTRY_CODE_TO_WORD)[ChemistryCode]]> = [
      ['SPI', 'Spirited'],
      ['DIS', 'Disciplined'],
      ['CMP', 'Competitive'],
      ['SCH', 'Scholarly'],
      ['CRA', 'Crafty'],
      ['SPIRITED', 'Spirited'],
      ['DISCIPLINED', 'Disciplined'],
      ['COMPETITIVE', 'Competitive'],
      ['SCHOLARLY', 'Scholarly'],
      ['CRAFTY', 'Crafty'],
      ['Fiery', 'Competitive'],
      ['Gritty', 'Competitive'],
      ['unknown', 'Competitive'],
    ];

    for (const [input, expected] of legacyCases) {
      expect(CHEMISTRY_CODE_TO_WORD[normalizeToChemistryCode(input)]).toBe(expected);
    }
  });
});
