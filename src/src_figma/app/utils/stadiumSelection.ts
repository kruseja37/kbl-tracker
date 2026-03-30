export function getInitialSelectedStadium(
  navigationStadium?: string | null,
): string | null {
  return navigationStadium ?? null;
}

export function shouldSyncSelectedStadium(
  selectedStadium: string | null | undefined,
): selectedStadium is string {
  return Boolean(selectedStadium);
}

export function getDisplayedStadiumName(
  selectedStadium: string | null | undefined,
  persistedStadium: string | null | undefined,
): string | undefined {
  return selectedStadium || persistedStadium || undefined;
}
