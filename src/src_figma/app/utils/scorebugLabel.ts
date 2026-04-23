export function getScorebugTeamLabel(
  teamAbbreviation?: string | null,
  fallbackName?: string | null,
): string {
  const abbreviation = teamAbbreviation?.trim();
  if (abbreviation) {
    return abbreviation.toUpperCase();
  }

  const fallback = fallbackName?.trim();
  if (fallback) {
    return fallback;
  }

  return "TEAM";
}
