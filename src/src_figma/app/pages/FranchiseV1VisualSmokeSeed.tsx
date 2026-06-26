import { Link } from "react-router-dom";

const SMOKE_GAME_ID = "visual-smoke-franchise-game";
const SMOKE_LIVE_GAME_ID = "visual-smoke-live-game";
const SMOKE_FRANCHISE_ID = "visual-franchise";
const SMOKE_SEASON_ID = "visual-franchise-season-1";

type ScheduleFixtureRow = {
  id: string;
  week: number;
  status: string;
  awayTeam: string;
  homeTeam: string;
  stadium: string;
  starter: string;
  action: string;
};

type RosterFixtureRow = {
  id: string;
  name: string;
  position: string;
  rosterStatus: string;
  salary: string;
  morale: string;
  statSummary: string;
  designation: string;
  hiddenSafe: boolean;
  safetyLabel?: string;
};

const scheduleFixtureRows: ScheduleFixtureRow[] = [
  {
    id: "visual-schedule-row-1",
    week: 3,
    status: "SCHEDULED",
    awayTeam: "Denver Longnames",
    homeTeam: "Boulder Baselines",
    stadium: "Apple Field",
    starter: "Owen Carefully-Named",
    action: "Launch GameTracker",
  },
];

const rosterFixtureRows: RosterFixtureRow[] = [
  {
    id: "visual-roster-row-mlb",
    name: "Catalina Fullname-Rivera",
    position: "SS",
    rosterStatus: "MLB / Sirloins",
    salary: "$2.4M",
    morale: "64 / steady",
    statSummary: "2.1 WAR / .842 OPS",
    designation: "MVP preview",
    hiddenSafe: false,
  },
  {
    id: "visual-roster-row-farm-hidden",
    name: "Juniper McAllister-Santos",
    position: "CF",
    rosterStatus: "FARM / hidden",
    salary: "Baseline hidden",
    morale: "50 / neutral",
    statSummary: "Visible scouting only",
    designation: "Blocked",
    hiddenSafe: true,
    safetyLabel: "HIDDEN SAFE",
  },
  {
    id: "visual-roster-row-pitcher",
    name: "Marisol Longstride",
    position: "SP",
    rosterStatus: "MLB / rotation",
    salary: "$5.1M",
    morale: "72 / upbeat",
    statSummary: "3.4 pWAR / 2.42 ERA",
    designation: "Ace preview",
    hiddenSafe: false,
  },
];

function lineup(names: string[], positions: string[]) {
  return names.map((playerName, index) => ({
    playerId: `visual-${playerName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    playerName,
    position: positions[index] ?? "OF",
    battingOrder: index + 1,
  }));
}

function createCurrentGameSeed() {
  const awayLineup = lineup(
    [
      "Catalina Fullname-Rivera",
      "Juniper McAllister-Santos",
      "Mateo Evergreen-Lancaster",
      "Ari Solstice",
      "Nadia Fastwind",
      "Theo Granite",
      "Priya Westbrook",
      "Silas Nightgame",
      "Mina Tallgrass",
    ],
    ["SS", "CF", "1B", "C", "LF", "3B", "2B", "RF", "SP"],
  );
  const homeLineup = lineup(
    [
      "Briar Longlastname",
      "Opal Rainmaker",
      "Felix Northstar",
      "Tessa Keystone",
      "Luca Highcastle",
      "Iris Mapleton",
      "Noah Broadleaf",
      "Zara Clearfield",
      "Hugo Stonebridge",
    ],
    ["SS", "CF", "1B", "C", "LF", "3B", "2B", "RF", "SP"],
  );

  return {
    id: "current",
    gameId: SMOKE_LIVE_GAME_ID,
    savedAt: Date.parse("2026-06-05T12:00:00.000Z"),
    inning: 3,
    halfInning: "TOP",
    outs: 1,
    homeScore: 2,
    awayScore: 3,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 2,
    atBatCount: 14,
    awayTeamId: "team-away",
    homeTeamId: "team-home",
    awayTeamName: "Denver Longnames",
    homeTeamName: "Boulder Baselines",
    seasonNumber: 1,
    stadiumName: "Apple Field",
    stadiumId: "apple-field",
    gamePhase: "LIVE",
    currentBatterId: awayLineup[2].playerId,
    currentBatterName: awayLineup[2].playerName,
    currentPitcherId: "visual-pitcher-home",
    currentPitcherName: "Owen Carefully-Named",
    playerStats: {},
    pitcherGameStats: [],
    fameEvents: [],
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: ["Seeded visual smoke live game."],
    awayLineup,
    homeLineup,
    seasonId: SMOKE_SEASON_ID,
    statsScopeId: SMOKE_SEASON_ID,
    franchiseId: SMOKE_FRANCHISE_ID,
    scheduleGameId: "visual-schedule-2",
    competitionType: "franchise",
    competitionId: SMOKE_FRANCHISE_ID,
  };
}

function createCompletedGameSeed() {
  return {
    id: "current",
    gameId: SMOKE_GAME_ID,
    savedAt: Date.parse("2026-06-05T12:00:00.000Z"),
    inning: 9,
    halfInning: "BOTTOM",
    outs: 3,
    homeScore: 1,
    awayScore: 4,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 72,
    awayTeamId: "team-away",
    homeTeamId: "team-home",
    awayTeamName: "Denver Longnames",
    homeTeamName: "Boulder Baselines",
    seasonNumber: 1,
    stadiumName: "Apple Field",
    stadiumId: "apple-field",
    playerStats: {
      "visual-batter-away": {
        playerName: "Catalina Fullname-Rivera",
        teamId: "team-away",
        pa: 4,
        ab: 4,
        h: 2,
        singles: 1,
        doubles: 1,
        triples: 0,
        hr: 0,
        rbi: 1,
        r: 1,
        bb: 0,
        hbp: 0,
        k: 1,
        sb: 0,
        cs: 0,
        sf: 0,
        sh: 0,
        gidp: 0,
        putouts: 0,
        assists: 0,
        fieldingErrors: 0,
      },
    },
    pitcherGameStats: [
      {
        pitcherId: "visual-pitcher-away",
        pitcherName: "Marisol Longstride",
        teamId: "team-away",
        isStarter: true,
        entryInning: 1,
        outsRecorded: 27,
        hitsAllowed: 0,
        runsAllowed: 0,
        earnedRuns: 0,
        walksAllowed: 2,
        strikeoutsThrown: 11,
        homeRunsAllowed: 0,
        hitBatters: 0,
        basesReachedViaError: 0,
        wildPitches: 0,
        pitchCount: 111,
        battersFaced: 29,
        consecutiveHRsAllowed: 0,
        firstInningRuns: 0,
        basesLoadedWalks: 0,
        inningsComplete: 9,
        decision: "W",
        save: false,
        hold: false,
        blownSave: false,
      },
    ],
    fameEvents: [
      {
        id: "visual-smoke-fame-1",
        gameId: SMOKE_GAME_ID,
        eventType: "NO_HITTER",
        playerId: "visual-pitcher-away",
        playerName: "Marisol Longstride",
        playerTeam: "team-away",
        fameValue: 5,
        fameType: "bonus",
        inning: 9,
        halfInning: "BOTTOM",
        timestamp: Date.parse("2026-06-05T12:00:00.000Z"),
        autoDetected: true,
        description: "Marisol Longstride finishes a trusted GameTracker no-hitter.",
      },
    ],
    managerWpaTotals: [
      {
        managerId: "visual-manager-away",
        managerName: "Skipper Longform",
        teamId: "team-away",
        tacticalManagerWpa: 0,
        deploymentWpa: 0.18,
        lineupDeltaWpa: 0,
        managerValue: 0.18,
      },
    ],
    playerWpaTotals: [
      {
        playerId: "visual-batter-away",
        playerName: "Catalina Fullname-Rivera",
        teamId: "team-away",
        totalWpa: 0.36,
        battingWpa: 0.31,
        pitchingWpa: 0,
        catchingWpa: 0,
        fieldingWpa: 0.03,
        baserunningWpa: 0.02,
        managingWpa: 0,
      },
    ],
    managerDecisions: [],
    managerDeploymentStints: [],
    managerLineupDeltas: [],
    managerRecommendationWatches: [],
    legacyManagerDecisions: [],
    moraleShifts: [],
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: ["Final: Denver Longnames 4, Boulder Baselines 1."],
    seasonId: SMOKE_SEASON_ID,
    statsScopeId: SMOKE_SEASON_ID,
    franchiseId: SMOKE_FRANCHISE_ID,
    scheduleGameId: "visual-schedule-1",
    competitionType: "franchise",
    competitionId: SMOKE_FRANCHISE_ID,
  };
}

export function FranchiseV1VisualSmokeSeed() {
  const livePreview = createCurrentGameSeed();
  const completedPreview = createCompletedGameSeed();
  const fameEvent = completedPreview.fameEvents[0];
  const managerWpa = completedPreview.managerWpaTotals?.[0];
  const playerWpa = completedPreview.playerWpaTotals?.[0];
  const scheduleFixture = scheduleFixtureRows[0];

  return (
    <main className="min-h-screen bg-[#567A50] px-4 py-6 text-white font-['Press_Start_2P']">
      <div className="mx-auto w-full max-w-5xl min-w-0 border-[6px] border-[#4A6844] bg-[#6B9462] p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.45)]">
        <div className="text-[16px] text-[#E8E8D8]">Mode 1/2 Visual Smoke Preview</div>
        <div className="mt-2 text-[9px] leading-5 text-[#E8E8D8]/75">
          Deterministic local preview labels for browser smoke. This route is read-only and does not write the current
          GameTracker snapshot, completed-game archive, schedule rows, or franchise storage.
        </div>
        <div className="mt-4 inline-block border-2 border-[#4A6844] bg-[#5A8352] px-3 py-2 text-[10px] text-[#FFEFB5]">
          READ ONLY / NO STORAGE WRITES
        </div>

        <div className="mt-5 grid gap-3">
          <section
            aria-label="Populated Franchise schedule fixture"
            className="border-4 border-[#4A6844] bg-[#5A8352] p-4 text-[9px] leading-5 text-[#E8E8D8]"
            data-testid="visual-smoke-schedule-fixture"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] text-[#FFEFB5]">Populated schedule row visual smoke</div>
                <div className="mt-2 text-[#E8E8D8]/70">
                  Fixture-only row. No schedule store row is written.
                </div>
              </div>
              <div className="border border-[#E8E8D8]/30 bg-[#3F563F] px-2 py-1 text-[8px] text-[#E8E8D8]/80">
                WEEK {scheduleFixture.week} / {scheduleFixture.status}
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="min-w-0 border-2 border-[#4A6844] bg-[#4A6844] p-3">
                <div className="text-[8px] text-[#C4A853]">AWAY</div>
                <div className="mt-1 break-words text-[11px] text-[#E8E8D8]">{scheduleFixture.awayTeam}</div>
              </div>
              <div className="text-center text-[10px] text-[#FFEFB5]">AT</div>
              <div className="min-w-0 border-2 border-[#4A6844] bg-[#4A6844] p-3">
                <div className="text-[8px] text-[#C4A853]">HOME</div>
                <div className="mt-1 break-words text-[11px] text-[#E8E8D8]">{scheduleFixture.homeTeam}</div>
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <div className="border border-[#E8E8D8]/20 bg-[#4A6844] p-2">
                <div className="text-[8px] text-[#C4A853]">STADIUM</div>
                <div className="mt-1 break-words">{scheduleFixture.stadium}</div>
              </div>
              <div className="border border-[#E8E8D8]/20 bg-[#4A6844] p-2">
                <div className="text-[8px] text-[#C4A853]">EXPECTED STARTER</div>
                <div className="mt-1 break-words">{scheduleFixture.starter}</div>
              </div>
              <div className="border border-[#E8E8D8]/20 bg-[#3F563F] p-2">
                <div className="text-[8px] text-[#C4A853]">ACTION LAYOUT</div>
                <div className="mt-1 break-words">{scheduleFixture.action}</div>
              </div>
            </div>
          </section>

          <section
            aria-label="Populated Team Hub roster fixture"
            className="border-4 border-[#4A6844] bg-[#5A8352] p-4 text-[9px] leading-5 text-[#E8E8D8]"
            data-testid="visual-smoke-roster-fixture"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] text-[#FFEFB5]">Populated Team Hub roster rows</div>
                <div className="mt-2 text-[#E8E8D8]/70">
                  Fixture-only scan table. Hidden FARM row uses labels, not hidden ratings or scout truth.
                </div>
              </div>
              <div className="border border-[#E8E8D8]/30 bg-[#3F563F] px-2 py-1 text-[8px] text-[#E8E8D8]/80">
                {rosterFixtureRows.length} ROWS / READ ONLY
              </div>
            </div>
            <div className="mt-4 overflow-x-auto border-2 border-[#4A6844]">
              <table className="min-w-[720px] w-full border-collapse text-left">
                <thead className="bg-[#4A6844] text-[8px] text-[#C4A853]">
                  <tr>
                    <th className="px-2 py-2">PLAYER</th>
                    <th className="px-2 py-2">POS</th>
                    <th className="px-2 py-2">STATUS</th>
                    <th className="px-2 py-2">SALARY</th>
                    <th className="px-2 py-2">MORALE</th>
                    <th className="px-2 py-2">STATS</th>
                    <th className="px-2 py-2">DESIG</th>
                    <th className="px-2 py-2">SAFETY</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterFixtureRows.map((row) => (
                    <tr
                      key={row.id}
                      className={row.hiddenSafe ? "bg-[#3F563F] text-[#E8E8D8]/75" : "bg-[#5A8352] text-[#E8E8D8]"}
                      data-testid={row.id}
                    >
                      <td className="px-2 py-2">
                        <div className="max-w-[190px] break-words text-[9px]">{row.name}</div>
                      </td>
                      <td className="px-2 py-2">{row.position}</td>
                      <td className="px-2 py-2">{row.rosterStatus}</td>
                      <td className="px-2 py-2">{row.salary}</td>
                      <td className="px-2 py-2">{row.morale}</td>
                      <td className="px-2 py-2">{row.statSummary}</td>
                      <td className="px-2 py-2">{row.designation}</td>
                      <td className="px-2 py-2">
                        {row.hiddenSafe ? (
                          <div className="inline-block border border-[#FFEFB5]/40 bg-[#4A6844] px-2 py-1 text-[8px] text-[#FFEFB5]">
                            {row.safetyLabel}
                            <span className="block text-[#E8E8D8]/75">Ratings truth blocked</span>
                          </div>
                        ) : (
                          <span className="text-[#E8E8D8]/60">Visible row</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <section className="border-4 border-[#4A6844] bg-[#5A8352] p-4 text-[9px] leading-5 text-[#E8E8D8]">
            <div className="text-[10px] text-[#FFEFB5]">GameTracker name-wrap preview</div>
            <div className="mt-3">Game id: {livePreview.gameId}</div>
            <div>Batter: {livePreview.currentBatterName}</div>
            <div>Pitcher: {livePreview.currentPitcherName}</div>
            <div>Score: {livePreview.awayTeamName} {livePreview.awayScore}, {livePreview.homeTeamName} {livePreview.homeScore}</div>
            <div className="mt-2 text-[#E8E8D8]/70">No live game route is seeded by this page.</div>
          </section>

          <section className="border-4 border-[#4A6844] bg-[#5A8352] p-4 text-[9px] leading-5 text-[#E8E8D8]">
            <div className="text-[10px] text-[#FFEFB5]">Game Detail evidence preview</div>
            <div className="mt-3">Archive id: {completedPreview.gameId}</div>
            <div>Fame: {fameEvent?.eventType ?? "none"} / {fameEvent?.playerName ?? "none"}</div>
            <div>Player WPA: {playerWpa?.playerName ?? "none"} {playerWpa ? playerWpa.totalWpa.toFixed(2) : "0.00"}</div>
            <div>Manager WPA: {managerWpa?.managerName ?? "none"} {managerWpa ? managerWpa.managerValue.toFixed(2) : "0.00"}</div>
            <div className="mt-2 text-[#E8E8D8]/70">No completed-game archive is written by this page.</div>
          </section>

          <Link className="border-4 border-[#4A6844] bg-[#5A8352] p-4 text-[10px] text-[#E8E8D8]" to="/__preview/player-instance-card">
            Player Instance Card WPA preview
          </Link>
        </div>
      </div>
    </main>
  );
}

export default FranchiseV1VisualSmokeSeed;
