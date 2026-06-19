import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
  buildDefaultManagerProfile,
  deleteManagerAssignmentsForInstance,
  getManagerAssignment,
  getManagerProfile,
  listManagerAssignments,
  resetManagerIdentityDatabaseForTests,
  resolveManagerForTeam,
  saveManagerAssignment,
  saveManagerProfile,
  saveUnassignedManagerProfile,
  seedManagerAssignmentsForTeams,
  setManagerFired,
} from "../managerIdentityStorage";
import { syncEngine } from "../syncEngine";

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
    vi.restoreAllMocks();
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

  test("generates stable default manager profiles per team", () => {
    expect(buildDefaultManagerProfile({ id: "beewolves", name: "Beewolves" })).toEqual(
      buildDefaultManagerProfile({ id: "beewolves", name: "Beewolves" }),
    );
    expect(buildDefaultManagerProfile({ id: "beewolves", name: "Beewolves" })).not.toEqual(
      buildDefaultManagerProfile({ id: "sirloins", name: "Sirloins" }),
    );
  });

  test("queues manager identity changes for sync", async () => {
    const upsertSpy = vi.spyOn(syncEngine, "upsert");
    const removeSpy = vi.spyOn(syncEngine, "remove");

    const profile = await saveManagerProfile({
      managerId: "manager-sync",
      displayName: "Sync Boss",
      createdByUser: true,
      defaultManager: false,
    });
    const assignment = await saveManagerAssignment({
      managerId: profile.managerId,
      teamId: "sirloins",
      mode: "exhibition",
      instanceId: "sync-league",
    });

    expect(upsertSpy).toHaveBeenCalledWith(
      "kbl-manager-identity",
      "managerProfiles",
      "manager-sync",
      expect.objectContaining({ managerId: "manager-sync", displayName: "Sync Boss" }),
    );
    expect(upsertSpy).toHaveBeenCalledWith(
      "kbl-manager-identity",
      "managerAssignments",
      ["exhibition", "sync-league", "sirloins"],
      expect.objectContaining(assignment),
    );

    await deleteManagerAssignmentsForInstance({
      mode: "exhibition",
      instanceId: "sync-league",
    });

    expect(removeSpy).toHaveBeenCalledWith(
      "kbl-manager-identity",
      "managerAssignments",
      ["exhibition", "sync-league", "sirloins"],
    );
  });

  test("saves user manager profiles without binding them to a team assignment", async () => {
    const profile = await saveUnassignedManagerProfile({
      managerId: "manager-casey-neutral",
      displayName: "Casey Neutral",
    });

    await expect(getManagerProfile(profile.managerId)).resolves.toMatchObject({
      managerId: "manager-casey-neutral",
      displayName: "Casey Neutral",
      createdByUser: true,
      defaultManager: false,
    });
    await expect(listManagerAssignments()).resolves.toEqual([]);
    await expect(
      saveUnassignedManagerProfile({
        displayName: " casey   neutral ",
      }),
    ).resolves.toMatchObject({
      managerId: profile.managerId,
      displayName: "Casey Neutral",
    });

    await saveManagerAssignment({
      managerId: profile.managerId,
      teamId: "sirloins",
      mode: "exhibition",
      instanceId: "exh-user-a",
    });
    await saveManagerAssignment({
      managerId: profile.managerId,
      teamId: "beewolves",
      mode: "exhibition",
      instanceId: "exh-user-b",
    });

    await expect(listManagerAssignments({ mode: "exhibition" })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          managerId: profile.managerId,
          teamId: "sirloins",
          instanceId: "exh-user-a",
        }),
        expect.objectContaining({
          managerId: profile.managerId,
          teamId: "beewolves",
          instanceId: "exh-user-b",
        }),
      ]),
    );
  });

  describe("setManagerFired", () => {
    test("marks an assignment fired and persists the firing reason", async () => {
      await saveManagerAssignment({
        managerId: "manager-fired",
        teamId: "sirloins",
        mode: "franchise",
        instanceId: "season-2026",
        startDate: "2026-01-01T00:00:00.000Z",
      });

      const fired = await setManagerFired({
        teamId: "sirloins",
        mode: "franchise",
        instanceId: "season-2026",
        endDate: "2026-06-18T00:00:00.000Z",
        reason: "user",
      });

      expect(fired).toMatchObject({
        managerId: "manager-fired",
        teamId: "sirloins",
        mode: "franchise",
        instanceId: "season-2026",
        fired: true,
        endDate: "2026-06-18T00:00:00.000Z",
        firedReason: "user",
      });
      await expect(
        getManagerAssignment({
          teamId: "sirloins",
          mode: "franchise",
          instanceId: "season-2026",
        }),
      ).resolves.toMatchObject({
        fired: true,
        endDate: "2026-06-18T00:00:00.000Z",
        firedReason: "user",
      });
    });

    test("keeps the original end date and reason when called again", async () => {
      await saveManagerAssignment({
        managerId: "manager-idempotent",
        teamId: "moonstars",
        mode: "franchise",
        instanceId: "season-2026",
        startDate: "2026-01-01T00:00:00.000Z",
      });

      const first = await setManagerFired({
        teamId: "moonstars",
        mode: "franchise",
        instanceId: "season-2026",
        endDate: "2026-06-18T00:00:00.000Z",
        reason: "user",
      });
      const second = await setManagerFired({
        teamId: "moonstars",
        mode: "franchise",
        instanceId: "season-2026",
        endDate: "2026-07-04T00:00:00.000Z",
        reason: "rebrand",
      });

      expect(first).toMatchObject({
        fired: true,
        endDate: "2026-06-18T00:00:00.000Z",
        firedReason: "user",
      });
      expect(second).toMatchObject({
        fired: true,
        endDate: "2026-06-18T00:00:00.000Z",
        firedReason: "user",
      });
      await expect(
        getManagerAssignment({
          teamId: "moonstars",
          mode: "franchise",
          instanceId: "season-2026",
        }),
      ).resolves.toMatchObject({
        fired: true,
        endDate: "2026-06-18T00:00:00.000Z",
        firedReason: "user",
      });
    });

    test("returns null when no assignment exists", async () => {
      await expect(
        setManagerFired({
          teamId: "wide-loads",
          mode: "franchise",
          instanceId: "season-2026",
          endDate: "2026-06-18T00:00:00.000Z",
          reason: "auto-backstop",
        }),
      ).resolves.toBeNull();
    });

    test("excludes fired assignments from active manager reads", async () => {
      await saveManagerProfile({
        managerId: "manager-active-before-fire",
        displayName: "Active Before Fire",
        createdByUser: true,
        defaultManager: false,
      });
      await saveManagerAssignment({
        managerId: "manager-active-before-fire",
        teamId: "sirloins",
        mode: "franchise",
        instanceId: "season-2026",
        startDate: "2026-01-01T00:00:00.000Z",
      });

      await expect(
        listManagerAssignments({
          mode: "franchise",
          instanceId: "season-2026",
          teamId: "sirloins",
        }),
      ).resolves.toHaveLength(1);

      await setManagerFired({
        teamId: "sirloins",
        mode: "franchise",
        instanceId: "season-2026",
        endDate: "2026-06-18T00:00:00.000Z",
        reason: "user",
      });

      await expect(
        listManagerAssignments({
          mode: "franchise",
          instanceId: "season-2026",
          teamId: "sirloins",
        }),
      ).resolves.toEqual([]);
      await expect(
        resolveManagerForTeam({
          team: {
            id: "sirloins",
            name: "Sirloins",
            managerId: "manager-successor",
            managerName: "Successor Voice",
          },
          mode: "franchise",
          instanceId: "season-2026",
        }),
      ).resolves.toMatchObject({
        managerId: "manager-successor",
        managerName: "Successor Voice",
        assignment: undefined,
      });
      await expect(
        getManagerAssignment({
          teamId: "sirloins",
          mode: "franchise",
          instanceId: "season-2026",
        }),
      ).resolves.toMatchObject({
        fired: true,
        endDate: "2026-06-18T00:00:00.000Z",
        firedReason: "user",
      });
    });
  });
});
