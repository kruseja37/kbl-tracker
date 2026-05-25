import { describe, expect, test } from "vitest";

import { formatWpaPoints } from "../wpaDisplay";

describe("formatWpaPoints", () => {
  test("formats stored decimal WPA as percentage points", () => {
    expect(formatWpaPoints(0.1234)).toBe("+12.3 pp");
    expect(formatWpaPoints(-0.052)).toBe("-5.2 pp");
    expect(formatWpaPoints(0)).toBe("+0.0 pp");
  });

  test("supports custom precision and unavailable values", () => {
    expect(formatWpaPoints(0.1234, 2)).toBe("+12.34 pp");
    expect(formatWpaPoints(undefined)).toBe("n/a");
    expect(formatWpaPoints(Number.NaN)).toBe("n/a");
  });
});
