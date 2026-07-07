import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import {
  FranchiseLensHub,
  type ActiveTeamVM,
  type HubVM,
  type TeamPickerVM,
} from "../../app/components/franchise/FranchiseLensHub";
import type { ScheduledGame } from "../../../utils/scheduleStorage";

const teams: TeamPickerVM[] = [
  { id: "team-home", name: "Home Nine", abbr: "HOM", primary: "#2A4A2F" },
  { id: "team-away", name: "Away Nine", abbr: "AWY", primary: "#7A2819" },
];

const active: ActiveTeamVM = {
  id: "team-home",
  name: "Home Nine",
  abbr: "HOM",
  recordLabel: "0-0",
  primary: "#2A4A2F",
  secondary: "#C4A853",
};

const hub: HubVM = {
  pulse: { standingLabel: "0-0", payrollLabel: "$0 · 0" },
  roster: [],
  home: { impactCards: [] },
  schedule: {
    upcoming: [],
    recent: [],
  },
};

const games: ScheduledGame[] = [
  {
    id: "game-1",
    franchiseId: "franchise-1",
    seasonId: "franchise-1-season-1",
    statsScopeId: "franchise-1-season-1",
    seasonNumber: 1,
    gameNumber: 1,
    dayNumber: 1,
    awayTeamId: "team-away",
    homeTeamId: "team-home",
    status: "SCHEDULED",
  },
];

describe("FranchiseLensHub schedule parity", () => {
  test("Schedule tab mounts add-game and CSV import affordances", () => {
    render(
      <FranchiseLensHub
        teams={teams}
        active={active}
        hub={hub}
        onSelectTeam={vi.fn()}
        scheduleManager={{
          games,
          selectedTeam: "team-home",
          onTeamChange: vi.fn(),
          availableTeams: teams.map((team) => team.id),
          onAddGame: vi.fn(),
          dropdownOpen: false,
          setDropdownOpen: vi.fn(),
          stadiumMap: { "team-home": "Home Park", "team-away": "Away Park" },
          seasonNumber: 1,
          teamNameMap: { "team-home": "Home Nine", "team-away": "Away Nine" },
          onDeleteGame: vi.fn(),
          onEditGame: vi.fn(),
          onScoreGame: vi.fn(),
          onEnterFinalScore: vi.fn(),
          onSkipGame: vi.fn(),
          onImportCsvRows: vi.fn(),
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Schedule/i }));

    expect(screen.getAllByRole("button", { name: /Add Game/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/CSV SCHEDULE IMPORT/i)).toBeTruthy();
    expect(screen.getAllByText(/Review CSV/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Score game 1 in GameTracker/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Skip game 1/i })).toBeTruthy();
  });
});
