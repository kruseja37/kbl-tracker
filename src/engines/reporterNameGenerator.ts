import { SMB4_FIRST_NAMES, SMB4_LAST_NAMES } from "../data/smb4NameDatabase";

export type EraFlavor = "classic" | "modern" | "future";

/**
 * Generate a reporter byline name from the real SMB4 name pool — the same
 * source the player/manager generators use (no invented strings). The `era`
 * parameter is retained for call-site compatibility; SMB4 names are not
 * era-segmented, so it no longer selects a pool.
 */
export function generateEraReporterName(_era: EraFlavor, existingNames: string[]): string {
  const existing = new Set(existingNames.map((name) => name.trim().toLocaleLowerCase()));

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const firstName = SMB4_FIRST_NAMES[Math.floor(Math.random() * SMB4_FIRST_NAMES.length)];
    const lastName = SMB4_LAST_NAMES[Math.floor(Math.random() * SMB4_LAST_NAMES.length)];
    const candidate = `${firstName} ${lastName}`;
    if (!existing.has(candidate.toLocaleLowerCase())) {
      return candidate;
    }
  }

  // Deterministic suffix fallback if every random draw collided with an existing name.
  const fallbackBase = `${SMB4_FIRST_NAMES[0]} ${SMB4_LAST_NAMES[0]}`;
  let suffix = 2;
  let fallback = `${fallbackBase} ${suffix}`;

  while (existing.has(fallback.toLocaleLowerCase())) {
    suffix += 1;
    fallback = `${fallbackBase} ${suffix}`;
  }

  return fallback;
}
