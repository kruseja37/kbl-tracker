export interface PlayerLineupMetaSource {
  jerseyNumber?: number | string | null;
  hometown?: { city?: string | null; state?: string | null } | string | null;
}

export interface PlayerLineupMetaParts {
  jersey: string;
  hometown: string;
}

export function getPlayerLineupMetaParts(
  player: PlayerLineupMetaSource,
): PlayerLineupMetaParts {
  const jersey =
    typeof player.jerseyNumber === "number" && Number.isFinite(player.jerseyNumber)
      ? `#${player.jerseyNumber}`
      : typeof player.jerseyNumber === "string" && player.jerseyNumber.trim()
        ? `#${player.jerseyNumber.trim().replace(/^#/, "")}`
        : "";

  const hometown =
    typeof player.hometown === "string"
      ? player.hometown.trim()
      : [player.hometown?.city?.trim(), player.hometown?.state?.trim()]
          .filter(Boolean)
          .join(", ");

  return { jersey, hometown };
}

export function formatPlayerLineupMeta(player: PlayerLineupMetaSource): string {
  const { jersey, hometown } = getPlayerLineupMetaParts(player);
  return [jersey, hometown].filter(Boolean).join(" ");
}
