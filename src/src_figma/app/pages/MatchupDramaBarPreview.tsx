import { MatchupDramaBar } from "../components/MatchupDramaBar";
import type { ReporterContext } from "../engines/reporter/reporterContext";

const baseContext: ReporterContext = {
  batter: {
    id: "batter-ivy",
    name: "Ivy Sparks",
    nickname: "Fuse",
    nicknames: ["The Fuse"],
    effectiveFame: 3,
    archetype: "SLUGGER",
    baselineBackstory: "A pull hitter whose legend started in a gravel-lot league.",
    signatureMoment: "Cleared the warehouse roof in extras.",
    teamId: "away-comets",
  },
  pitcher: {
    id: "pitcher-mara",
    name: "Mara Stone",
    nicknames: [],
    effectiveFame: 3,
    archetype: "ACE",
    baselineBackstory: "A cold-weather ace with a split-change nobody likes discussing.",
    teamId: "home-meteors",
  },
  battingTeam: {
    id: "away-comets",
    name: "Away Comets",
    abbreviation: "AWY",
    era: "CLASSIC_TV",
    cityVibe: "A telescope town with brass-band summers",
    baselineBackstory: "A barnstorming club that learned to live on close games.",
    ballparkNickname: "The Observatory",
  },
  pitchingTeam: {
    id: "home-meteors",
    name: "Home Meteors",
    abbreviation: "HME",
    era: "GOLDEN_AGE",
    cityVibe: "Mill chimneys, river fog, and packed bleachers",
    baselineBackstory: "The old-money club everyone wants to beat.",
    ballparkNickname: "The Furnace",
  },
  batterLegacySummary: "",
  pitcherLegacySummary: "",
  battingTeamLegacySummary: "",
  pitchingTeamLegacySummary: "",
  batterRecentAlmanac: [],
  pitcherRecentAlmanac: [],
  battingTeamRecentAlmanac: [],
  pitchingTeamRecentAlmanac: [],
  teamRecentAlmanac: [],
  activeOpposingRelationships: [],
  activeWithinTeamRelationships: [],
  teamDnaFacts: [],
  homeTeamRivalries: [],
  awayTeamRivalries: [],
  teamRivalryIntensity: 0,
  dramaticWeight: 1.1,
  gameState: {
    gameId: "preview-game",
    atBatId: "preview-game_1",
    inning: 2,
    halfInning: "TOP",
    outs: 0,
    bases: { first: null, second: null, third: null },
    awayScore: 0,
    homeScore: 0,
    battingTeamId: "away-comets",
    pitchingTeamId: "home-meteors",
    batterId: "batter-ivy",
    pitcherId: "pitcher-mara",
    competitionType: "exhibition",
  },
};

const variants: Array<{ title: string; note: string; context: ReporterContext }> = [
  {
    title: "Low Drama",
    note: "Average fame and early-game leverage. The bar should feel calm and mostly informational.",
    context: baseContext,
  },
  {
    title: "Medium Drama",
    note: "Late-middle inning pressure with a meaningful positive WPA swing available.",
    context: {
      ...baseContext,
      dramaticWeight: 2.55,
      gameState: {
        ...baseContext.gameState,
        inning: 7,
        halfInning: "TOP",
        outs: 1,
        bases: { first: null, second: "June Vale", third: null },
        awayScore: 2,
        homeScore: 3,
      },
      wpaMoment: {
        eventId: "preview-game_7",
        leverageIndex: 1.95,
        winProbabilityBefore: 0.61,
        winProbabilityAfter: 0.47,
        wpa: 0.14,
      },
    },
  },
  {
    title: "High Drama",
    note: "Bottom ninth, two outs, superstar vs captain. This should read like a headline moment.",
    context: {
      ...baseContext,
      batter: {
        ...baseContext.batter,
        effectiveFame: 5,
        name: "Roxy Cannon",
        nickname: "The Siren",
      },
      pitcher: {
        ...baseContext.pitcher,
        effectiveFame: 4,
        name: "Mara Stone",
      },
      battingTeam: {
        ...baseContext.battingTeam,
        name: "Visiting Sirens",
      },
      dramaticWeight: 4.35,
      gameState: {
        ...baseContext.gameState,
        inning: 9,
        halfInning: "BOTTOM",
        outs: 2,
        bases: { first: "Ada Knox", second: null, third: "Mina Vale" },
        awayScore: 5,
        homeScore: 4,
      },
      wpaMoment: {
        eventId: "preview-game_9",
        leverageIndex: 4.02,
        winProbabilityBefore: 0.28,
        winProbabilityAfter: 0.74,
        wpa: 0.46,
      },
    },
  },
];

export function MatchupDramaBarPreview() {
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
          maxWidth: "1280px",
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
            Reporter Context Preview
          </div>
          <h1 style={{ margin: 0, fontSize: "1.85rem", color: "#F2C041" }}>
            MatchupDramaBar fixture gallery
          </h1>
          <p
            style={{
              maxWidth: "850px",
              margin: "12px 0 0",
              color: "rgba(245, 232, 207, 0.72)",
              fontFamily: "'Moms Typewriter', monospace",
              fontSize: "0.95rem",
              lineHeight: 1.6,
              letterSpacing: "normal",
              textTransform: "none",
            }}
          >
            V1-slim proof route. These fixtures exercise the bar with fame, WPA,
            inning state, and reporter dramatic weight only. Lineup icons and
            relationship/rivalry data are intentionally deferred.
          </p>
        </div>

        <div style={{ display: "grid", gap: "24px" }}>
          {variants.map((variant) => (
            <section key={variant.title}>
              <div
                style={{
                  marginBottom: "10px",
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  gap: "8px",
                  fontFamily: "'Tox Typewriter', monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                <div style={{ color: "#F2C041" }}>{variant.title}</div>
                <div style={{ color: "#CBB89C", fontSize: "0.78rem" }}>{variant.note}</div>
              </div>
              <MatchupDramaBar context={variant.context} />
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

export default MatchupDramaBarPreview;
