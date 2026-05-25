import "fake-indexeddb/auto";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ReporterAssignmentPanel } from "../../app/components/ReporterAssignmentPanel";
import { INITIAL_MOOD_STATE } from "../../../engines/moodEngine";
import { deriveReporterAvatarPalette } from "../../../engines/reporterAvatarPalette";
import { ERA_REPORTER_NAME_POOLS } from "../../../engines/reporterNameGenerator";
import type { BeatReporter } from "../../../types/reporter";
import { autoGenerateReporterForTeam, assignReporterToTeam } from "../../../utils/reporterAssignment";
import { createReporter, getReporter, getReporterForTeam } from "../../../utils/reporterStorage";
import { loadCurrentGame, saveCurrentGame, type PersistedGameState } from "../../../utils/gameStorage";
import { syncEngine } from "../../../utils/syncEngine";
import { resetTrackerDbForTests } from "../../../utils/trackerDb";

const DB_NAME = "kbl-tracker";

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

function reporterInput(overrides: Partial<Omit<BeatReporter, "id" | "changed_at">> = {}): Omit<BeatReporter, "id" | "changed_at"> {
  return {
    teamId: "unassigned",
    leagueId: "league-1",
    name: "Jack Brennan",
    personality: "BALANCED",
    voiceStyle: "THE_GRINDER",
    eraFlavor: "CLASSIC_TV",
    avatarEra: "headset",
    avatarColors: {
      primary: "#112233",
      secondary: "#AABBCC",
    },
    currentMood: "BALANCED",
    moodMomentum: 0,
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  };
}

function persistedGame(overrides: Partial<PersistedGameState> = {}): PersistedGameState {
  return {
    id: "current",
    gameId: "game-1",
    savedAt: 1_000,
    inning: 1,
    halfInning: "TOP",
    outs: 0,
    homeScore: 0,
    awayScore: 0,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 0,
    awayTeamId: "away-team",
    homeTeamId: "home-team",
    awayTeamName: "Away",
    homeTeamName: "Home",
    seasonNumber: 1,
    leagueId: "league-1",
    beatReporterEnabled: true,
    playerStats: {},
    pitcherGameStats: [],
    fameEvents: [],
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: [],
    ...overrides,
  };
}

describe("pre-game reporter assignment", () => {
  beforeEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
    vi.spyOn(syncEngine, "upsert").mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("auto-generate creates an assigned reporter with era name, team palette, and initial mood state", async () => {
    const team = {
      id: "team-gold",
      name: "Golden Club",
      era: "GOLDEN_AGE" as const,
      colors: { primary: "#123456", secondary: "#FEDCBA" },
    };

    const reporter = await autoGenerateReporterForTeam(team, "league-1");
    const expectedPalette = deriveReporterAvatarPalette({
      id: team.id,
      primaryColor: team.colors.primary,
      secondaryColor: team.colors.secondary,
    });

    expect(reporter.teamId).toBe(team.id);
    expect(reporter.leagueId).toBe("league-1");
    expect(ERA_REPORTER_NAME_POOLS.classic).toContain(reporter.name);
    expect(reporter.avatarColors).toEqual({
      primary: expectedPalette.primary,
      secondary: expectedPalette.secondary,
    });
    expect(reporter.avatarEra).toBe(expectedPalette.silhouetteVariant);
    expect(reporter.moodMomentum).toBe(INITIAL_MOOD_STATE.moodMomentum);
    expect(reporter.currentMood).toBe(reporter.personality);

    await expect(getReporterForTeam(team.id, "league-1")).resolves.toEqual(reporter);
  });

  test("pick-existing assigns a reporter to a team and syncs the updated record", async () => {
    const upsertSpy = vi.spyOn(syncEngine, "upsert");
    const reporter = await createReporter(reporterInput({ teamId: "old-team" }));

    const assigned = await assignReporterToTeam(reporter.id, "new-team");

    expect(assigned.teamId).toBe("new-team");
    expect(assigned.changed_at).toBeGreaterThan(reporter.changed_at);
    expect(upsertSpy).toHaveBeenLastCalledWith(DB_NAME, "reporters", reporter.id, assigned);
    await expect(getReporterForTeam("new-team", "league-1")).resolves.toEqual(assigned);
  });

  test("pick-existing replaces only the selected team's reporter", async () => {
    const oldAway = await createReporter(
      reporterInput({ teamId: "away-team", name: "Old Away Reporter" }),
    );
    const nextAway = await createReporter(
      reporterInput({ teamId: "unassigned", name: "Next Away Reporter" }),
    );
    const home = await createReporter(
      reporterInput({ teamId: "home-team", name: "Home Reporter" }),
    );

    render(
      <ReporterAssignmentPanel
        leagueId="league-1"
        teams={[
          {
            label: "Away team",
            team: {
              id: "away-team",
              name: "Away",
              colors: { primary: "#123456", secondary: "#FEDCBA" },
            },
          },
          {
            label: "Home team",
            team: {
              id: "home-team",
              name: "Home",
              colors: { primary: "#112233", secondary: "#AABBCC" },
            },
          },
        ]}
        liveEnabled={false}
        onLiveEnabledChange={() => undefined}
        postGameEnabled={true}
        onPostGameEnabledChange={() => undefined}
      />,
    );

    const awayPicker = screen.getByLabelText(
      "Away reporter picker",
    ) as HTMLSelectElement;

    await waitFor(() => expect(awayPicker.value).toBe(oldAway.id));

    fireEvent.change(awayPicker, {
      target: { value: nextAway.id },
    });

    await waitFor(() => expect(awayPicker.value).toBe(nextAway.id));

    expect((screen.getByLabelText("Home reporter picker") as HTMLSelectElement).value).toBe(
      home.id,
    );
    await expect(getReporterForTeam("away-team", "league-1")).resolves.toMatchObject({
      id: nextAway.id,
    });
    await expect(getReporterForTeam("home-team", "league-1")).resolves.toMatchObject({
      id: home.id,
    });
    await expect(getReporter(oldAway.id)).resolves.toMatchObject({
      teamId: "unassigned",
    });
  });

  test("pick-existing prevents either team picker from stealing the other assignment", async () => {
    const away = await createReporter(
      reporterInput({ teamId: "away-team", name: "Away Reporter" }),
    );
    const home = await createReporter(
      reporterInput({ teamId: "home-team", name: "Home Reporter" }),
    );

    render(
      <ReporterAssignmentPanel
        leagueId="league-1"
        teams={[
          {
            label: "Away team",
            team: {
              id: "away-team",
              name: "Away",
              colors: { primary: "#123456", secondary: "#FEDCBA" },
            },
          },
          {
            label: "Home team",
            team: {
              id: "home-team",
              name: "Home",
              colors: { primary: "#112233", secondary: "#AABBCC" },
            },
          },
        ]}
        liveEnabled={true}
        onLiveEnabledChange={() => undefined}
        postGameEnabled={false}
        onPostGameEnabledChange={() => undefined}
      />,
    );

    const awayPicker = screen.getByLabelText(
      "Away reporter picker",
    ) as HTMLSelectElement;
    const homePicker = screen.getByLabelText(
      "Home reporter picker",
    ) as HTMLSelectElement;

    await waitFor(() => {
      expect(awayPicker.value).toBe(away.id);
      expect(homePicker.value).toBe(home.id);
    });

    expect(
      within(homePicker).getByRole("option", { name: "Away Reporter (assigned)" }),
    ).toBeDisabled();

    fireEvent.change(homePicker, {
      target: { value: away.id },
    });

    await waitFor(() => {
      expect(awayPicker.value).toBe(away.id);
      expect(homePicker.value).toBe(home.id);
    });
    await expect(getReporterForTeam("away-team", "league-1")).resolves.toMatchObject({
      id: away.id,
    });
    await expect(getReporterForTeam("home-team", "league-1")).resolves.toMatchObject({
      id: home.id,
    });
  });

  test("disabled toggle state greys out generate and picker interactions", async () => {
    await createReporter(reporterInput({ name: "Available Reporter" }));

    render(
      <ReporterAssignmentPanel
        leagueId="league-1"
        teams={[
          {
            label: "Away team",
            team: {
              id: "away-team",
              name: "Away",
              colors: { primary: "#123456", secondary: "#FEDCBA" },
            },
          },
        ]}
        liveEnabled={false}
        onLiveEnabledChange={() => undefined}
        postGameEnabled={false}
        onPostGameEnabledChange={() => undefined}
      />,
    );

    await waitFor(() => expect(screen.getByText("Available Reporter")).toBeInTheDocument());

    expect(screen.getByText("AUTO-GENERATE")).toBeDisabled();
    expect(screen.getByLabelText("Away reporter picker")).toBeDisabled();
    fireEvent.click(screen.getByText("AUTO-GENERATE"));
    await expect(getReporterForTeam("away-team", "league-1")).resolves.toBeNull();
  });

  test("current game persistence round-trips beatReporterEnabled", async () => {
    await saveCurrentGame(persistedGame({ beatReporterEnabled: true }));

    await expect(loadCurrentGame()).resolves.toMatchObject({
      gameId: "game-1",
      beatReporterEnabled: true,
    });
  });
});
