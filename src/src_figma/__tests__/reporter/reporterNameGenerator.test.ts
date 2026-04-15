import { describe, expect, test } from "vitest";

import {
  ERA_REPORTER_NAME_POOLS,
  type EraFlavor,
  generateEraReporterName,
} from "../../../engines/reporterNameGenerator";

describe("reporterNameGenerator", () => {
  test.each(["classic", "modern", "future"] as EraFlavor[])(
    "generates a %s name from its era pool",
    (era) => {
      const generated = generateEraReporterName(era, []);

      expect(ERA_REPORTER_NAME_POOLS[era]).toContain(generated);
    },
  );

  test("never returns a name already present in existingNames", () => {
    const existingNames = [ERA_REPORTER_NAME_POOLS.classic[0], ERA_REPORTER_NAME_POOLS.classic[1]];

    const generated = generateEraReporterName("classic", existingNames);

    expect(existingNames).not.toContain(generated);
    expect(ERA_REPORTER_NAME_POOLS.classic).toContain(generated);
  });

  test("uses a deterministic suffix fallback when the era pool is exhausted", () => {
    const generated = generateEraReporterName("modern", [...ERA_REPORTER_NAME_POOLS.modern]);

    expect(generated).toBe(`${ERA_REPORTER_NAME_POOLS.modern[0]} 2`);
  });

  test("increments the deterministic fallback until it finds an unused name", () => {
    const generated = generateEraReporterName("future", [
      ...ERA_REPORTER_NAME_POOLS.future,
      `${ERA_REPORTER_NAME_POOLS.future[0]} 2`,
      `${ERA_REPORTER_NAME_POOLS.future[0]} 3`,
    ]);

    expect(generated).toBe(`${ERA_REPORTER_NAME_POOLS.future[0]} 4`);
  });
});
