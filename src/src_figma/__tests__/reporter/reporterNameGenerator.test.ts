import { describe, expect, test } from "vitest";

import {
  type EraFlavor,
  generateEraReporterName,
} from "../../../engines/reporterNameGenerator";
import { SMB4_FIRST_NAMES, SMB4_LAST_NAMES } from "../../../data/smb4NameDatabase";

const FIRST_NAMES = new Set(SMB4_FIRST_NAMES);
const LAST_NAMES = new Set(SMB4_LAST_NAMES);

function isFromSmb4Pool(name: string): boolean {
  const firstSpace = name.indexOf(" ");
  if (firstSpace < 0) return false;
  const firstName = name.slice(0, firstSpace);
  const lastName = name.slice(firstSpace + 1);
  return FIRST_NAMES.has(firstName) && LAST_NAMES.has(lastName);
}

describe("reporterNameGenerator", () => {
  test.each(["classic", "modern", "future"] as EraFlavor[])(
    "generates a %s name as firstName + lastName from the real SMB4 name pool",
    (era) => {
      const generated = generateEraReporterName(era, []);

      expect(isFromSmb4Pool(generated)).toBe(true);
    },
  );

  test("never returns a name already present in existingNames", () => {
    // Generate a batch, feeding each result back as an existing name; every
    // result must be unique within the run.
    const seen: string[] = [];
    for (let i = 0; i < 25; i += 1) {
      const generated = generateEraReporterName("modern", seen);
      expect(seen).not.toContain(generated);
      seen.push(generated);
    }
  });
});
