import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
  getManagerAssignment,
  getManagerProfile,
  resetManagerIdentityDatabaseForTests,
  resolveManagerForTeam,
  saveManagerAssignment,
  saveManagerProfile,
  seedManagerAssignmentsForTeams,
} from "../managerIdentityStorage";

const DB_NAME = "kbl-manager-identity";

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

describe("manager identity storage", () => {
  beforeEach(async () => {
    resetManagerIdentityDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  afterEach(async () => {
    resetManagerIdentityDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("persists canonical profiles and team assignments", async () => {
    const profile = await saveManagerProfile({
      managerId: "manager-casey",
      displayName: "Casey Switch",
      gender: "Nonbinary",
      age: 47,
      hometown: "Boulder, CO",
      createdByUser: true,
      defaultManager: false,
      managementStyle: { label: "Bullpen-first" },
    });

    const assignment = await saveManagerAssignment({
      managerId: profile.managerId,
      teamId: "sirloins",
      mode: "franchise",
      instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
    });

    await expect(getManagerProfile("manager-casey")).resolves.toMatchObject({
      managerId: "manager-casey",
      displayName: "Casey Switch",
      managementStyle: { label: "Bullpen-first" },
    });
    await expect(
      getManagerAssignment({
        teamId: "sirloins",
        mode: "franchise",
        instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
      }),
    ).resolves.toEqual(assignment);
  });

  test("seeds elimination assignments from League Builder assignments", async () => {
    await saveManagerProfile({
      managerId: "manager-sky",
      displayName: "Sky Rally",
      createdByUser: true,
      defaultManager: false,
    });
    await saveManagerAssignment({
      managerId: "manager-sky",
      teamId: "moonstars",
      mode: "franchise",
      instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
    });

    const [assignment] = await seedManagerAssignmentsForTeams({
      teams: [{ id: "moonstars", name: "Moonstars" }],
      mode: "elimination",
      instanceId: "elim-1",
      fallbackMode: "franchise",
      fallbackInstanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
    });

    expect(assignment).toMatchObject({
      managerId: "manager-sky",
      teamId: "moonstars",
      mode: "elimination",
      instanceId: "elim-1",
    });
  });

  test("creates a generated default manager profile when no assignment exists", async () => {
    const resolved = await resolveManagerForTeam({
      team: { id: "beewolves", name: "Beewolves" },
      mode: "exhibition",
      instanceId: "sml",
    });

    expect(resolved.managerId).toBe("beewolves-manager");
    expect(resolved.managerName.length).toBeGreaterThan(0);
    expect(resolved.profile).toMatchObject({
      managerId: "beewolves-manager",
      gender: "Male",
      defaultManager: true,
      createdByUser: false,
    });
  });
});
