export type ReporterSilhouetteVariant = "fedora" | "headset" | "cap";

export interface ReporterAvatarPalette {
  primary: string;
  secondary: string;
  silhouetteVariant: ReporterSilhouetteVariant;
}

const SILHOUETTE_VARIANTS: ReporterSilhouetteVariant[] = ["fedora", "headset", "cap"];
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function hashString(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
}

function normalizeHexColor(value: string, fallback: string): string {
  const trimmed = value.trim();
  return HEX_COLOR_PATTERN.test(trimmed) ? trimmed.toUpperCase() : fallback;
}

export function deriveReporterAvatarPalette(team: {
  id: string;
  primaryColor: string;
  secondaryColor: string;
}): ReporterAvatarPalette {
  const hash = hashString(team.id);

  return {
    primary: normalizeHexColor(team.primaryColor, "#4A6A42"),
    secondary: normalizeHexColor(team.secondaryColor, "#E8E8D8"),
    silhouetteVariant: SILHOUETTE_VARIANTS[hash % SILHOUETTE_VARIANTS.length],
  };
}
