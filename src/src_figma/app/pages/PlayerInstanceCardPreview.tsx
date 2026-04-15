import type { CanonicalPlayerInstance } from "../../../utils/almanacStorage";
import type {
  LeaguePlayerOverrideRecord,
  Player,
} from "../../../utils/leagueBuilderStorage";
import type { FameTier } from "../../../types/reporter";
import type { PlayerFameGameSource } from "../components/PlayerFameSection";
import {
  PlayerInstanceCardContent,
  type PlayerInstanceCardContentState,
} from "./PlayerInstanceCard";

interface PreviewVariant {
  key: string;
  title: string;
  subtitle: string;
  state: PlayerInstanceCardContentState;
}

function createPlayer(
  overrides: Partial<Player> = {},
): Player {
  return {
    id: "preview-player-1",
    firstName: "Maya",
    lastName: "Vega",
    nickname: "Comet",
    baseFameTier: 3,
    gender: "F",
    age: 27,
    bats: "R",
    throws: "R",
    primaryPosition: "SS",
    power: 67,
    contact: 74,
    speed: 78,
    fielding: 72,
    arm: 69,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: "A-",
    trait1: "Clutch",
    trait2: "Utility",
    personality: "Competitive",
    chemistry: "Competitive",
    morale: 50,
    mojo: "Normal",
    fame: 0,
    salary: 2400000,
    createdDate: "2026-04-14T00:00:00.000Z",
    lastModified: "2026-04-14T00:00:00.000Z",
    isCustom: true,
    hometown: {
      city: "Denver",
      state: "CO",
    },
    editHistory: [],
    ...overrides,
  };
}

function createInstance(
  overrides: Partial<CanonicalPlayerInstance> = {},
): CanonicalPlayerInstance {
  return {
    mode: "exhibition",
    instanceId: "preview-exhibition",
    instanceName: "Press Box Exhibition",
    playerIdInInstance: "preview-player-1",
    ...overrides,
  };
}

function createOverride(
  fameTierOverride?: FameTier,
): LeaguePlayerOverrideRecord | null {
  if (!fameTierOverride) {
    return null;
  }

  return {
    id: "preview-elimination::preview-player-1",
    leagueId: "preview-elimination",
    playerId: "preview-player-1",
    overrides: {},
    fameTierOverride,
    lastModified: "2026-04-14T00:00:00.000Z",
  };
}

function createPreviewState({
  player,
  instance,
  playerOverride,
  latestGame,
}: {
  player: Player;
  instance: CanonicalPlayerInstance;
  playerOverride?: LeaguePlayerOverrideRecord | null;
  latestGame?: PlayerFameGameSource | null;
}): PlayerInstanceCardContentState {
  return {
    canonicalPlayer: {
      canonicalId: "preview-canonical-1",
      playerName: `${player.firstName} ${player.lastName}`,
      hometown: player.hometown ?? { city: "Unknown", state: "--" },
      instances: [instance],
    },
    instance,
    player,
    playerOverride: playerOverride ?? null,
    latestGame: latestGame ?? null,
    ratingState: player,
    isPitcher: false,
    usedFallback: true,
    batting: null,
    pitching: null,
    teams: [],
    timeline: [],
  };
}

function createGame(
  gameId: string,
  events: PlayerFameGameSource["fameEvents"],
): PlayerFameGameSource {
  return {
    gameId,
    fameEvents: events,
  };
}

const exhibitionGame = createGame("preview-exhibition-game", [
  {
    id: "fame-exh-1",
    gameId: "preview-exhibition-game",
    eventType: "WALK_OFF",
    playerId: "preview-player-1",
    playerName: "Maya Vega",
    playerTeam: "PRESS",
    fameValue: 1.5,
    fameType: "bonus",
    inning: 9,
    halfInning: "BOTTOM",
    timestamp: Date.parse("2026-04-14T19:04:00.000Z"),
    autoDetected: true,
    description: "Delivered the winning swing in the ninth.",
  },
  {
    id: "fame-exh-2",
    gameId: "preview-exhibition-game",
    eventType: "WEB_GEM",
    playerId: "preview-player-1",
    playerName: "Maya Vega",
    playerTeam: "PRESS",
    fameValue: 0.5,
    fameType: "bonus",
    inning: 7,
    halfInning: "TOP",
    timestamp: Date.parse("2026-04-14T18:42:00.000Z"),
    autoDetected: true,
    description: "Laid out in the hole to steal a hit.",
  },
]);

const eliminationGame = createGame("preview-elimination-game", [
  {
    id: "fame-elim-1",
    gameId: "preview-elimination-game",
    eventType: "GO_AHEAD_HR",
    playerId: "preview-player-1",
    playerName: "Maya Vega",
    playerTeam: "PRESS",
    fameValue: 1.9,
    fameType: "bonus",
    inning: 8,
    halfInning: "BOTTOM",
    timestamp: Date.parse("2026-04-14T20:12:00.000Z"),
    autoDetected: true,
    description: "Turned the bracket game with a late homer.",
  },
]);

const previewVariants: PreviewVariant[] = [
  {
    key: "unknown",
    title: "Unknown",
    subtitle: "Exhibition base tier 1",
    state: createPreviewState({
      player: createPlayer({ baseFameTier: 1 }),
      instance: createInstance({ instanceId: "preview-unknown" }),
      latestGame: exhibitionGame,
    }),
  },
  {
    key: "veteran",
    title: "Veteran",
    subtitle: "Exhibition base tier 3",
    state: createPreviewState({
      player: createPlayer({ baseFameTier: 3 }),
      instance: createInstance({ instanceId: "preview-veteran", instanceName: "Default Veteran" }),
      latestGame: exhibitionGame,
    }),
  },
  {
    key: "superstar",
    title: "Superstar",
    subtitle: "Exhibition base tier 5",
    state: createPreviewState({
      player: createPlayer({ baseFameTier: 5 }),
      instance: createInstance({ instanceId: "preview-superstar", instanceName: "Marquee Showcase" }),
      latestGame: exhibitionGame,
    }),
  },
  {
    key: "override",
    title: "Override Precedence",
    subtitle: "Elimination override 4 wins over base tier 2",
    state: createPreviewState({
      player: createPlayer({ baseFameTier: 2 }),
      instance: createInstance({
        mode: "elimination",
        instanceId: "preview-elimination",
        instanceName: "Elimination Run",
      }),
      playerOverride: createOverride(4),
      latestGame: eliminationGame,
    }),
  },
  {
    key: "franchise",
    title: "Franchise Placeholder",
    subtitle: "Deferred rollup state",
    state: createPreviewState({
      player: createPlayer({ baseFameTier: 4 }),
      instance: createInstance({
        mode: "franchise",
        instanceId: "preview-franchise",
        instanceName: "Franchise Archive",
      }),
      latestGame: exhibitionGame,
    }),
  },
];

export function PlayerInstanceCardPreview() {
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
          maxWidth: "1720px",
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
            PlayerInstanceCard fixture gallery
          </h1>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "22px",
            alignItems: "start",
          }}
        >
          {previewVariants.map((variant) => (
            <section key={variant.key} data-testid={`player-instance-card-preview-${variant.key}`}>
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
                <div style={{ color: "#F2C041", fontSize: "0.92rem" }}>{variant.title}</div>
                <div style={{ color: "#CBB89C", fontSize: "0.78rem", marginTop: "6px" }}>
                  {variant.subtitle}
                </div>
              </div>

              <div className="flex flex-col gap-6 text-white font-['Press_Start_2P']">
                <PlayerInstanceCardContent state={variant.state} />
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

export default PlayerInstanceCardPreview;
