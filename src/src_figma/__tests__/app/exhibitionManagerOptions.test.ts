import { describe, expect, test } from "vitest";

import type { ManagerProfile } from "../../../types/managerWpa";
import {
  buildManagerOptionLabels,
  findExistingManagerProfileByDisplayName,
  formatManagerOptionLabel,
} from "../../app/utils/exhibitionManagerOptions";

const profiles: ManagerProfile[] = [
  {
    managerId: "manager-casey-alpha",
    displayName: "Casey Neutral",
    createdByUser: true,
    defaultManager: false,
  },
  {
    managerId: "manager-casey-beta",
    displayName: "casey   neutral",
    createdByUser: true,
    defaultManager: false,
  },
  {
    managerId: "manager-sky-rally",
    displayName: "Sky Rally",
    createdByUser: true,
    defaultManager: false,
  },
];

describe("exhibition manager options", () => {
  test("finds existing manager profiles by normalized display name", () => {
    expect(findExistingManagerProfileByDisplayName(profiles, " Casey Neutral ")).toMatchObject({
      managerId: "manager-casey-alpha",
    });
    expect(findExistingManagerProfileByDisplayName(profiles, "New Boss")).toBeUndefined();
  });

  test("disambiguates duplicate manager display names in selector labels", () => {
    const labels = buildManagerOptionLabels(profiles);

    expect(formatManagerOptionLabel(profiles[0], labels)).toBe("CASEY NEUTRAL (CASEY ALPHA)");
    expect(formatManagerOptionLabel(profiles[1], labels)).toBe("CASEY   NEUTRAL (CASEY BETA)");
    expect(formatManagerOptionLabel(profiles[2], labels)).toBe("SKY RALLY");
  });

  test("uses unique manager-id context for duplicate default manager names", () => {
    const duplicateDefaults: ManagerProfile[] = [
      {
        managerId: "sirloins-manager",
        displayName: "Casey Neutral",
        createdByUser: false,
        defaultManager: true,
      },
      {
        managerId: "beewolves-manager",
        displayName: "Casey Neutral",
        createdByUser: false,
        defaultManager: true,
      },
    ];

    const labels = buildManagerOptionLabels(duplicateDefaults);

    expect(formatManagerOptionLabel(duplicateDefaults[0], labels)).toBe("CASEY NEUTRAL (SIRLOINS)");
    expect(formatManagerOptionLabel(duplicateDefaults[1], labels)).toBe("CASEY NEUTRAL (BEEWOLVES)");
  });
});
