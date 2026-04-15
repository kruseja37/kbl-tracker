import { describe, expect, test } from "vitest";

import {
  deriveReporterAvatarPalette,
  type ReporterSilhouetteVariant,
} from "../../../engines/reporterAvatarPalette";

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/;

describe("reporterAvatarPalette", () => {
  test("returns the same palette for the same team input across calls", () => {
    const team = {
      id: "team-blowfish",
      primaryColor: "#123abc",
      secondaryColor: "#def456",
    };

    expect(deriveReporterAvatarPalette(team)).toEqual(deriveReporterAvatarPalette(team));
  });

  test("distributes silhouette variants across all three values for realistic team ids", () => {
    const variants = new Set<ReporterSilhouetteVariant>();

    for (let i = 0; i < 30; i += 1) {
      variants.add(
        deriveReporterAvatarPalette({
          id: `team-${i}`,
          primaryColor: "#112233",
          secondaryColor: "#AABBCC",
        }).silhouetteVariant,
      );
    }

    expect(variants).toEqual(new Set(["fedora", "headset", "cap"]));
  });

  test("returns normalized valid hex colors", () => {
    const palette = deriveReporterAvatarPalette({
      id: "team-color-test",
      primaryColor: "#1a2b3c",
      secondaryColor: "#d4e5f6",
    });

    expect(palette.primary).toMatch(HEX_COLOR_PATTERN);
    expect(palette.secondary).toMatch(HEX_COLOR_PATTERN);
    expect(palette.primary).toBe("#1A2B3C");
    expect(palette.secondary).toBe("#D4E5F6");
  });

  test("falls back deterministically for invalid color input", () => {
    expect(
      deriveReporterAvatarPalette({
        id: "team-invalid-color",
        primaryColor: "green",
        secondaryColor: "",
      }),
    ).toMatchObject({
      primary: "#4A6A42",
      secondary: "#E8E8D8",
    });
  });
});
