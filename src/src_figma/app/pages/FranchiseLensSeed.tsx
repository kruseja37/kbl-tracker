/**
 * FranchiseLensSeed — DEV/TEST-ONLY verification harness (not a shipped deliverable).
 *
 * Seeds a DETERMINISTIC demo franchise so the real-data lens
 * (/__preview/franchise-lens/:franchiseId) can be browser-verified reproducibly without a device
 * save. It writes a small complete league inline (6 teams × 22 MLB + 10 FARM with an exactly-
 * matching farmRoster + 1 scout each + league template) — mirroring the proven seed in
 * franchiseSetupLaunch.integration.test.ts — then calls the real initializeFranchise.
 *
 * (We avoid prepareFranchiseManualSmokeFixture's startup farm/scout draft, which fails the
 * "FARM roster does not match player FARM assignments" handoff check in a fresh browser.)
 *
 * The franchise DATA is deterministic; the generated franchiseId string is fresh per run — the
 * lens route works for any id, so a script reads it from data-testid="seeded-franchise-id".
 * Gated dev/test only, so it does not ship in prod.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  saveLeagueTemplate,
  savePlayer,
  saveScoutProfile,
  saveTeam,
  saveTeamRoster,
} from "../../../utils/leagueBuilderStorage";
import { initializeFranchise } from "../../../utils/franchiseInitializer";
import type { FranchiseConfig } from "../../../types/franchise";

type SavePlayerInput = Parameters<typeof savePlayer>[0];
type SaveTeamInput = Parameters<typeof saveTeam>[0];

const LEAGUE_ID = "lens-demo-league";

const DEMO_TEAMS = [
  { id: "lens-demo-team-1", name: "Boulder Baselines", abbr: "BLD", primary: "#1F6F43", secondary: "#0E2A1A" },
  { id: "lens-demo-team-2", name: "Denver Longnames", abbr: "DEN", primary: "#2D5BA8", secondary: "#10213F" },
  { id: "lens-demo-team-3", name: "Apple Field Aces", abbr: "AFA", primary: "#B23B3B", secondary: "#3A1010" },
  { id: "lens-demo-team-4", name: "Sirloin City Cuts", abbr: "SIR", primary: "#C4A853", secondary: "#3A2F12" },
  { id: "lens-demo-team-5", name: "Keystone Combine", abbr: "KEY", primary: "#5B3FA8", secondary: "#1E1238" },
  { id: "lens-demo-team-6", name: "Granite Pitchers", abbr: "GRA", primary: "#3A8E8E", secondary: "#103030" },
];

function makePlayer(
  teamId: string,
  index: number,
  primaryPosition: SavePlayerInput["primaryPosition"],
  rosterStatus: "MLB" | "FARM" = "MLB",
): SavePlayerInput {
  const isPitcher = ["SP", "RP", "CP", "SP/RP", "P", "TWO-WAY"].includes(String(primaryPosition));
  return {
    id: `${teamId}-${rosterStatus.toLowerCase()}-${isPitcher ? "p" : "b"}-${index}`,
    firstName: rosterStatus === "FARM" ? `Farm${index}` : isPitcher ? `Pitcher${index}` : `Batter${index}`,
    lastName: teamId.replace("lens-demo-", ""),
    gender: "M",
    jerseyNumber: index,
    age: 27,
    bats: index % 2 === 0 ? "L" : "R",
    throws: isPitcher ? "R" : index % 2 === 0 ? "L" : "R",
    primaryPosition,
    secondaryPosition: isPitcher ? "P" : "IF",
    power: isPitcher ? 20 : 55 + ((index * 3) % 35),
    contact: isPitcher ? 20 : 55 + ((index * 5) % 35),
    speed: isPitcher ? 25 : 45 + ((index * 7) % 40),
    fielding: 60 + ((index * 2) % 25),
    arm: 60 + ((index * 4) % 25),
    velocity: isPitcher ? 70 + ((index * 3) % 25) : 0,
    junk: isPitcher ? 65 + ((index * 5) % 25) : 0,
    accuracy: isPitcher ? 65 + ((index * 7) % 25) : 0,
    arsenal: isPitcher ? ["4F", "SL", "CH"] : [],
    overallGrade: "B",
    personality: "Competitive",
    chemistry: "Competitive",
    morale: 50,
    mojo: "Normal",
    fame: 0,
    salary: 800_000 + index * 120_000,
    leagueAssignments: [{ leagueId: LEAGUE_ID, teamId, rosterStatus }],
    isCustom: true,
    sourceDatabase: "lens-demo-seed",
  };
}

async function seedLeagueTeam(team: (typeof DEMO_TEAMS)[number]): Promise<void> {
  const teamId = team.id;
  const lineupPositions = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"] as const;
  const benchPositions = ["C", "IF", "OF", "1B/OF"] as const;
  const pitcherPositions = ["SP", "SP", "SP", "SP", "RP", "RP", "RP", "CP", "SP/RP"] as const;
  const farmPositions = ["C", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "SP", "RP"] as const;

  const batterIds = lineupPositions.map((_, index) => `${teamId}-mlb-b-${index + 1}`);
  const benchIds = benchPositions.map((_, index) => `${teamId}-mlb-b-${lineupPositions.length + index + 1}`);
  const pitcherIds = pitcherPositions.map((_, index) => `${teamId}-mlb-p-${index + 1}`);
  const farmIds = farmPositions.map(
    (position, index) =>
      `${teamId}-farm-${["SP", "RP", "CP", "SP/RP", "P", "TWO-WAY"].includes(position) ? "p" : "b"}-${index + 1}`,
  );
  const starterId = pitcherIds[0];

  const teamRecord: SaveTeamInput = {
    id: teamId,
    name: team.name,
    abbreviation: team.abbr,
    location: team.name,
    nickname: team.name,
    colors: { primary: team.primary, secondary: team.secondary },
    stadium: `${team.name} Park`,
    ballparkNickname: `The ${team.abbr} Yard`,
    leagueIds: [LEAGUE_ID],
    lineupWithDH: lineupPositions.map((fieldingPosition, index) => ({
      battingOrder: index + 1,
      playerId: batterIds[index],
      fieldingPosition,
    })),
    lineupWithoutDH: [
      ...lineupPositions.slice(0, 8).map((fieldingPosition, index) => ({
        battingOrder: index + 1,
        playerId: batterIds[index],
        fieldingPosition,
      })),
      { battingOrder: 9, playerId: starterId, fieldingPosition: "P" },
    ],
    startingRotation: [starterId],
  };
  await saveTeam(teamRecord);

  for (const [index, position] of lineupPositions.entries()) {
    await savePlayer(makePlayer(teamId, index + 1, position));
  }
  for (const [index, position] of benchPositions.entries()) {
    await savePlayer(makePlayer(teamId, lineupPositions.length + index + 1, position));
  }
  for (const [index, position] of pitcherPositions.entries()) {
    await savePlayer(makePlayer(teamId, index + 1, position));
  }
  for (const [index, position] of farmPositions.entries()) {
    await savePlayer(makePlayer(teamId, index + 1, position, "FARM"));
  }
  await saveScoutProfile({
    id: `${teamId}-scout-1`,
    leagueId: LEAGUE_ID,
    teamId,
    name: `${team.name} Scout`,
    specialties: ["outfield"],
    weaknesses: ["CP"],
    accuracyByPosition: { CF: 84, SP: 80, CP: 55, "1B": 64 },
    seed: `${teamId}:scout:1`,
    hiredPick: { round: 1, pickNumber: 1, teamId },
  });
  await saveTeamRoster({
    teamId,
    mlbRoster: [...batterIds, ...benchIds, ...pitcherIds],
    farmRoster: farmIds,
    lineupWithDH: teamRecord.lineupWithDH ?? [],
    lineupWithoutDH: teamRecord.lineupWithoutDH ?? [],
    startingRotation: [starterId],
    longRelievers: [],
    closingPitcher: pitcherIds[7],
    setupPitchers: [pitcherIds[6]],
    depthChart: {
      C: [], "1B": [], "2B": [], SS: [], "3B": [], LF: [], CF: [], RF: [], DH: [], SP: [], RP: [], CP: [],
    },
    pinchHitOrder: benchIds,
    pinchRunOrder: benchIds,
    defensiveSubOrder: benchIds,
    lastModified: new Date().toISOString(),
  });
}

function makeConfig(): FranchiseConfig {
  return {
    franchiseName: "Lens Demo Franchise",
    league: LEAGUE_ID,
    leagueDetails: { name: "Lens Demo League", teams: DEMO_TEAMS.length, conferences: 0, divisions: 0 },
    season: {
      gamesPerTeam: 30,
      inningsPerGame: 9,
      extraInningsRule: "standard",
      scheduleType: "balanced",
      useDH: true,
      allStarGame: false,
      tradeDeadline: false,
      mercyRule: false,
    },
    playoffs: {
      teamsQualifying: 2,
      format: "conference",
      seriesLengths: {
        wildCard: "best-of-3",
        divisionSeries: "best-of-5",
        championship: "best-of-7",
        worldSeries: "best-of-7",
      },
      homeFieldAdvantage: "higher-seed",
    },
    teams: { selectedTeams: [DEMO_TEAMS[0].id], mode: "single", playerAssignments: {} },
    roster: { mode: "existing" },
  };
}

export function FranchiseLensSeed() {
  const [status, setStatus] = useState("starting…");
  const [franchiseId, setFranchiseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus("seeding deterministic league (6 teams)…");
        for (const team of DEMO_TEAMS) {
          await seedLeagueTeam(team);
        }
        await saveLeagueTemplate({
          id: LEAGUE_ID,
          name: "Lens Demo League",
          teamIds: DEMO_TEAMS.map((team) => team.id),
          conferences: [],
          divisions: [],
          defaultRulesPreset: "default",
        });
        if (cancelled) return;

        setStatus("initializing franchise…");
        const id = await initializeFranchise(makeConfig());
        if (cancelled) return;
        setFranchiseId(id);
        setStatus("ready");
      } catch (caught) {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : String(caught));
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#3F563F", color: "#E8E8D8", padding: 24, fontFamily: "monospace" }}>
      <h1 style={{ fontSize: 16 }}>Franchise Lens — demo seed (dev only)</h1>
      <div data-testid="seed-status" style={{ marginTop: 12 }}>
        Status: {status}
      </div>
      {error ? (
        <div data-testid="seed-error" style={{ marginTop: 12, color: "#FFB4A8" }}>
          {error}
        </div>
      ) : null}
      {franchiseId ? (
        <div style={{ marginTop: 16 }}>
          <div>
            Seeded franchiseId: <strong data-testid="seeded-franchise-id">{franchiseId}</strong>
          </div>
          <Link
            data-testid="seeded-franchise-link"
            to={`/__preview/franchise-lens/${franchiseId}`}
            style={{ display: "inline-block", marginTop: 12, color: "#FFEFB5" }}
          >
            → open the real-data lens
          </Link>
        </div>
      ) : null}
    </main>
  );
}

export default FranchiseLensSeed;
