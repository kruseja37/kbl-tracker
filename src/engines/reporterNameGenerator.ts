export type EraFlavor = "classic" | "modern" | "future";

export const ERA_REPORTER_NAME_POOLS: Record<EraFlavor, readonly string[]> = {
  classic: [
    '"Dutch" Calloway',
    "Whitey Perkins",
    "Bud McAllister",
    '"Scoop" Brennan',
    "Red Kessler",
    "Chet Whitmore",
  ],
  modern: [
    "Howard Kessler",
    "Jack Brennan",
    "Don Castellano",
    "Marty Collins",
    "Ray Donovan",
    "Bill Mercer",
  ],
  future: [
    "Mike Torres",
    "Ashley Chen",
    "Marcus Webb",
    "Sam Delgado",
    "Priya Shah",
    "Jordan Ellis",
  ],
};

export function generateEraReporterName(era: EraFlavor, existingNames: string[]): string {
  const existing = new Set(existingNames.map((name) => name.trim().toLocaleLowerCase()));
  const pool = ERA_REPORTER_NAME_POOLS[era];
  const availableName = pool.find((name) => !existing.has(name.toLocaleLowerCase()));

  if (availableName) {
    return availableName;
  }

  const fallbackBase = pool[0];
  let suffix = 2;
  let fallback = `${fallbackBase} ${suffix}`;

  while (existing.has(fallback.toLocaleLowerCase())) {
    suffix += 1;
    fallback = `${fallbackBase} ${suffix}`;
  }

  return fallback;
}
