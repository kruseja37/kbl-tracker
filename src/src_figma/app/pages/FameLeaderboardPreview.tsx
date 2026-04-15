import { FameLeaderboardCard, type FameLeaderboardGameSource } from "../components/FameLeaderboardCard";
import { FamePromotionBanner } from "../components/FamePromotionBanner";
import {
  RunStandingsTable,
  type RunStandingsEntry,
} from "../components/RunStandingsTable";
import type { FamePromotionCandidate } from "../engines/famePromotion";

const exhibitionFixture: FameLeaderboardGameSource = {
  gameId: "preview-fame-exhibition",
  awayTeamId: "comets",
  awayTeamName: "Comets",
  homeTeamId: "sparks",
  homeTeamName: "Sparks",
  competitionType: "exhibition",
  competitionId: "preview-exhibition",
  fameEvents: [
    {
      id: "away-1",
      gameId: "preview-fame-exhibition",
      eventType: "WALK_OFF",
      playerId: "away-maya",
      playerName: "Maya Vega",
      playerTeam: "comets",
      fameValue: 1.8,
      fameType: "bonus",
      inning: 9,
      halfInning: "BOTTOM",
      timestamp: Date.parse("2026-04-14T19:12:00.000Z"),
      autoDetected: true,
      description: "Lined the deciding single into right-center.",
    },
    {
      id: "away-2",
      gameId: "preview-fame-exhibition",
      eventType: "WEB_GEM",
      playerId: "away-maya",
      playerName: "Maya Vega",
      playerTeam: "comets",
      fameValue: 0.6,
      fameType: "bonus",
      inning: 7,
      halfInning: "TOP",
      timestamp: Date.parse("2026-04-14T18:48:00.000Z"),
      autoDetected: true,
      description: "Took away extra bases in the gap.",
    },
    {
      id: "away-3",
      gameId: "preview-fame-exhibition",
      eventType: "GO_AHEAD_HR",
      playerId: "away-jo",
      playerName: "Jo Mercer",
      playerTeam: "comets",
      fameValue: 1.5,
      fameType: "bonus",
      inning: 8,
      halfInning: "TOP",
      timestamp: Date.parse("2026-04-14T19:02:00.000Z"),
      autoDetected: true,
      description: "Hammered the late lead-change homer.",
    },
    {
      id: "away-4",
      gameId: "preview-fame-exhibition",
      eventType: "TOOTBLAN",
      playerId: "away-rio",
      playerName: "Rio Park",
      playerTeam: "comets",
      fameValue: -0.8,
      fameType: "boner",
      inning: 6,
      halfInning: "TOP",
      timestamp: Date.parse("2026-04-14T18:35:00.000Z"),
      autoDetected: true,
      description: "Ran into the final out at third.",
    },
    {
      id: "home-1",
      gameId: "preview-fame-exhibition",
      eventType: "GRAND_SLAM",
      playerId: "home-ivy",
      playerName: "Ivy Knox",
      playerTeam: "sparks",
      fameValue: 2.4,
      fameType: "bonus",
      inning: 5,
      halfInning: "BOTTOM",
      timestamp: Date.parse("2026-04-14T18:11:00.000Z"),
      autoDetected: true,
      description: "Cleared the bags with one swing.",
    },
    {
      id: "home-2",
      gameId: "preview-fame-exhibition",
      eventType: "WEB_GEM",
      playerId: "home-dani",
      playerName: "Dani Cross",
      playerTeam: "sparks",
      fameValue: 0.5,
      fameType: "bonus",
      inning: 4,
      halfInning: "TOP",
      timestamp: Date.parse("2026-04-14T17:58:00.000Z"),
      autoDetected: true,
      description: "Laid out near the warning track.",
    },
    {
      id: "home-3",
      gameId: "preview-fame-exhibition",
      eventType: "BLOWN_SAVE",
      playerId: "home-lena",
      playerName: "Lena Vale",
      playerTeam: "sparks",
      fameValue: -1.2,
      fameType: "boner",
      inning: 9,
      halfInning: "TOP",
      timestamp: Date.parse("2026-04-14T19:07:00.000Z"),
      autoDetected: true,
      description: "Could not lock down the final frame.",
    },
    {
      id: "home-4",
      gameId: "preview-fame-exhibition",
      eventType: "CLUTCH_GRAND_SLAM",
      playerId: "home-ivy",
      playerName: "Ivy Knox",
      playerTeam: "sparks",
      fameValue: 1.4,
      fameType: "bonus",
      inning: 5,
      halfInning: "BOTTOM",
      timestamp: Date.parse("2026-04-14T18:12:00.000Z"),
      autoDetected: true,
      description: "Kept the crowd in a roar after the slam.",
    },
  ],
};

const eliminationFixture: FameLeaderboardGameSource = {
  ...exhibitionFixture,
  gameId: "preview-fame-elimination",
  competitionType: "elimination",
  competitionId: "preview-elimination",
  awayTeamName: "Bracket Breakers",
  homeTeamName: "Night Shift",
};

const eliminationRunTotals = {
  "away-maya": 6.4,
  "away-jo": 4.1,
  "away-rio": -0.4,
  "home-ivy": 7.2,
  "home-dani": 1.3,
  "home-lena": -1.2,
};

const eliminationRunStandings: RunStandingsEntry[] = [
  {
    playerId: "home-ivy",
    playerName: "Ivy Knox",
    teamId: "sparks",
    teamName: "Night Shift",
    totalFame: 7.2,
    gamesPlayed: 3,
    isCurrentGamePlayer: true,
    events: [
      eliminationFixture.fameEvents[4]!,
      eliminationFixture.fameEvents[7]!,
    ],
  },
  {
    playerId: "away-maya",
    playerName: "Maya Vega",
    teamId: "comets",
    teamName: "Bracket Breakers",
    totalFame: 6.4,
    gamesPlayed: 3,
    isCurrentGamePlayer: true,
    events: [
      eliminationFixture.fameEvents[0]!,
      eliminationFixture.fameEvents[1]!,
    ],
  },
  {
    playerId: "away-jo",
    playerName: "Jo Mercer",
    teamId: "comets",
    teamName: "Bracket Breakers",
    totalFame: 4.1,
    gamesPlayed: 2,
    isCurrentGamePlayer: true,
    events: [eliminationFixture.fameEvents[2]!],
  },
  {
    playerId: "home-dani",
    playerName: "Dani Cross",
    teamId: "sparks",
    teamName: "Night Shift",
    totalFame: 1.3,
    gamesPlayed: 2,
    isCurrentGamePlayer: true,
    events: [eliminationFixture.fameEvents[5]!],
  },
];

const promotionFixture: FamePromotionCandidate[] = [
  {
    playerId: "home-ivy",
    playerName: "Ivy Knox",
    teamId: "sparks",
    teamName: "Night Shift",
    currentTier: 3,
    targetTier: 4,
    runTotalFame: 82.4,
    gamesPlayed: 4,
  },
];

export function FameLeaderboardPreview() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 24px 56px",
        background:
          "radial-gradient(circle at top, #4A5B46 0%, #2E3A2C 48%, #1B231B 100%)",
        color: "#F5E8CF",
      }}
    >
      <section
        style={{
          maxWidth: "1460px",
          margin: "0 auto",
          padding: "28px",
          border: "3px solid rgba(245, 232, 207, 0.44)",
          background:
            "linear-gradient(180deg, rgba(17, 22, 16, 0.78) 0%, rgba(25, 31, 24, 0.94) 100%)",
          boxShadow: "0 18px 40px rgba(0, 0, 0, 0.34)",
        }}
      >
        <div
          style={{
            marginBottom: "26px",
            fontFamily: "'Tox Typewriter', monospace",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#CBB89C", marginBottom: "10px" }}>
            Editorial Fame Preview
          </div>
          <h1 style={{ margin: 0, fontSize: "1.85rem", color: "#F2C041" }}>
            Fame leaderboard fixture gallery
          </h1>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
            gap: "22px",
            alignItems: "start",
          }}
        >
          <section>
            <div
              style={{
                marginBottom: "12px",
                padding: "14px 16px",
                border: "1px solid rgba(245, 232, 207, 0.18)",
                background: "rgba(255, 255, 255, 0.04)",
                fontFamily: "'Tox Typewriter', monospace",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              <div style={{ color: "#F2C041", fontSize: "0.92rem" }}>Exhibition</div>
              <div style={{ color: "#CBB89C", fontSize: "0.78rem", marginTop: "6px" }}>
                Multiple players ranked by game fame
              </div>
            </div>
            <FameLeaderboardCard
              game={exhibitionFixture}
              gameMode="exhibition"
              initialExpandedPlayerIds={["away-maya", "home-ivy"]}
            />
          </section>

          <section>
            <div
              style={{
                marginBottom: "12px",
                padding: "14px 16px",
                border: "1px solid rgba(245, 232, 207, 0.18)",
                background: "rgba(255, 255, 255, 0.04)",
                fontFamily: "'Tox Typewriter', monospace",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              <div style={{ color: "#F2C041", fontSize: "0.92rem" }}>Elimination</div>
              <div style={{ color: "#CBB89C", fontSize: "0.78rem", marginTop: "6px" }}>
                Same card with run-total subtitle values
              </div>
            </div>
            <FameLeaderboardCard
              game={eliminationFixture}
              gameMode="elimination"
              initialExpandedPlayerIds={["away-jo", "home-lena"]}
              runTotalsByPlayerId={eliminationRunTotals}
            />
            <div style={{ marginTop: "18px" }}>
              <FamePromotionBanner
                candidates={promotionFixture}
                onAccept={() => undefined}
                onDismiss={() => undefined}
              />
            </div>
            <div style={{ marginTop: "18px" }}>
              <RunStandingsTable standings={eliminationRunStandings} />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default FameLeaderboardPreview;
