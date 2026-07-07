/**
 * Canonical player chemistry codes for Mode-1 auction rebuild.
 *
 * Source: AUCTION_DRAFT_SPEC_V2.md section 3.7 (player chemistry axis)
 * and JK ruling 2026-06-21 for the 440-player target shape.
 * The rostered PLAYERS source counts at the ruling were:
 * SPI 93, DIS 88, CMP 88, SCH 88, CRA 83; free agents are excluded.
 */

export type ChemistryCode = 'SPI' | 'DIS' | 'CMP' | 'SCH' | 'CRA';

export const CHEMISTRY_CODES: readonly ChemistryCode[] = ['SPI', 'DIS', 'CMP', 'SCH', 'CRA'] as const;

export const CHEMISTRY_CODE_TO_WORD: Record<
  ChemistryCode,
  'Spirited' | 'Disciplined' | 'Competitive' | 'Scholarly' | 'Crafty'
> = {
  SPI: 'Spirited',
  DIS: 'Disciplined',
  CMP: 'Competitive',
  SCH: 'Scholarly',
  CRA: 'Crafty',
};

export const CHEMISTRY_WORD_TO_CODE = Object.fromEntries(
  CHEMISTRY_CODES.map((code) => [CHEMISTRY_CODE_TO_WORD[code], code]),
) as Record<'Spirited' | 'Disciplined' | 'Competitive' | 'Scholarly' | 'Crafty', ChemistryCode>;

const CHEMISTRY_CODE_SET = new Set<string>(CHEMISTRY_CODES);

const CHEMISTRY_WORD_TO_CODE_CASE_INSENSITIVE = Object.fromEntries(
  Object.entries(CHEMISTRY_WORD_TO_CODE).map(([word, code]) => [word.toUpperCase(), code]),
) as Record<string, ChemistryCode>;

const LEGACY_PLAYER_CHEMISTRY_ALIASES: Record<string, ChemistryCode> = {
  FIERY: 'CMP',
  GRITTY: 'CMP',
};

export function normalizeToChemistryCode(value: string): ChemistryCode {
  if (CHEMISTRY_CODE_SET.has(value)) {
    return value as ChemistryCode;
  }

  const upperValue = value.toUpperCase();
  if (CHEMISTRY_CODE_SET.has(upperValue)) {
    return upperValue as ChemistryCode;
  }

  return CHEMISTRY_WORD_TO_CODE_CASE_INSENSITIVE[upperValue] ?? LEGACY_PLAYER_CHEMISTRY_ALIASES[upperValue] ?? 'CMP';
}

export const CHEMISTRY_TARGET_DISTRIBUTION: Record<ChemistryCode, number> = {
  SPI: 0.21,
  DIS: 0.20,
  CMP: 0.20,
  SCH: 0.20,
  CRA: 0.19,
};

export const CHEMISTRY_TARGET_SOURCE_TOLERANCE = 0.015;
