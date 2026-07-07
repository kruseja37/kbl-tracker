import { Fragment, useState } from "react";
import { FranchiseLineupsBoard } from "./FranchiseLineupsBoard";
import { FITNESS_STATES, type FitnessState } from "../../../../engines/fitnessEngine";

/**
 * FranchiseLensHub — the aged-"Green Monster" team-lens franchise hub (redesign,
 * JK-approved 2026-06-25). Pure VIEW component: renders from a HubVM and reports
 * intent via callbacks. The data adapter maps the live franchise data
 * (teams+colors, roster, designations, the morale value + history log) into the
 * VM. Team color lives only in the identity banner; the board is white & yellow
 * chalk — your club yellow, rival red. Styling: src_figma/styles/fenway-theme.css.
 *
 * Slice 1: the shell (lens picker + team-color banner + tab strip) and the
 * Roster tab (club pulse + roster table + the morale ledger popover). Other tabs
 * render a "next" placeholder until they're built.
 */

export interface TeamPickerVM {
  id: string;
  name: string;
  abbr: string;
  primary: string;
}

export interface ActiveTeamVM {
  id: string;
  name: string;
  abbr: string;
  recordLabel: string;
  primary: string;
  secondary: string;
  rivalName?: string;
  rivalId?: string;             // for the board's red rival-highlight (id-keyed, robust)
  seasonLabel?: string;
  /** branding / culture */
  archetype?: string;           // the GM's draft-setup team identity, e.g. "Power Club"
  ballparkNickname?: string;    // e.g. "The Yard"
  gmName?: string;
  managerName?: string;
  managerStyle?: string;
  scoutName?: string;
  scoutSpecialty?: string;
  reporter?: { name: string; mood?: string; avatar?: "fedora" | "headset" | "cap" };
}

export interface ImpactCardVM {
  kind: "crisis" | "dated" | "good" | "info";
  icon: string;
  title: string;
  detail: string;
  cta?: string;
  action?: "checkpoint";       // a clickable impact card that opens a moment-driven takeover
}

export interface NextGameVM {
  scheduleGameId?: string;
  awayTeamId?: string;
  homeTeamId?: string;
  gameNumber?: number;
  awayName: string; awayAbbr: string; awayRecord: string;
  homeName: string; homeAbbr: string; homeRecord: string;
  meta?: string;
  pulse?: React.ReactNode;
}

export interface SeasonHomeVM {
  leadStory?: { kicker: string; headline: string; body: string; byline: string };
  impactCards: ImpactCardVM[];
  nextGame?: NextGameVM;
}

export interface NewsStoryVM { category: string; headline: string; excerpt: string; byline: string; dramaticWeight?: number }
export interface GameRecapVM {
  date: string;                  // GameStory.gameDate
  away: string; home: string;    // matchup (abbr)
  awayScore?: number; homeScore?: number;
  headline: string;              // GameStory.headline
  win?: "home" | "away";         // which side won (bolds the winner)
}
export interface WireItemVM { type: string; text: string; when?: string; tone?: "good" | "bad" | "neutral" }
export interface ReporterDeskVM { name: string; tier: string; accuracy: number; corrections: number; note?: string }
export interface NewsVM {
  editionLabel: string;
  volumeLabel: string;
  priceLabel?: string;
  lead?: { kicker: string; headline: string; body: string; byline: string; dramaticWeight?: number };
  stories: NewsStoryVM[];        // ranked by dramaticWeight (the view sorts)
  recaps?: GameRecapVM[];        // the per-game recap stream (GameStory)
  wire?: WireItemVM[];           // the league wire — all the other SeasonNewsItem event types
  desk?: ReporterDeskVM;         // the beat writer's reputation/accuracy
}

export interface MoraleHistoryVM {
  delta: number;
  reason: string;
  week: string;
}

export interface PlayerMoraleVM {
  value: number;
  state: string;
  trend: "up" | "down" | "flat";
  arc?: string;
  history: MoraleHistoryVM[];
}

/* ===== Player drawer (the per-player depth, opened from a roster name) ===== */
export interface RatingBarVM { label: string; base: number; current: number }   // 0–99
export interface ValuePointVM { checkpoint: string; value: number }              // True Value sparkline
export interface TraitTimelineVM { valence: "gain" | "lose"; trait: string; displaces?: string; atGame: number }
export type TieType = "RIVALRY" | "FEUD" | "MENTORSHIP" | "FRIENDSHIP" | "ROMANCE" | "HISTORY";
export interface TieVM { partner: string; type: TieType; intensity: number; sinceGame?: number; potential?: boolean; moraleImpact?: number }
export interface FameVM {
  heat: number;
  immortality: number;          // reachFloor 0–5
  immortalityLabel: string;     // "Local", "Immortal", …
  channels: { label: string; value: number }[];  // wpa_spine / iconic_event / status / defensive / role_player
}
export interface FormStateVM { label: string; tone?: "up" | "down" | "flat" }   // mojo / fitness chip
export interface MakeupModVM { label: string; value: number }                    // hidden modifier 0–99
export interface CareerAwardVM { label: string; count: number }
export interface MilestoneVM { label: string; detail?: string; achieved: boolean; atLabel?: string }
export interface MoraleSourceVM { label: string; value: number }                 // signed morale contribution
export interface PlayerDetailVM {
  age?: number; bats?: string; throws?: string; grade?: string; bio?: string;
  nickname?: string;
  careerPhase?: string;         // "Prime" / "Decline" … (agingEngine)
  retirementNote?: string;
  mojo?: FormStateVM;
  fitness?: FormStateVM;
  fitnessState?: FitnessState;     // the raw state (for the editable picker's current selection)
  personality?: string;         // the canonical personality
  modifiers?: MakeupModVM[];    // loyalty / ambition / resilience / charisma
  valueTrend?: ValuePointVM[];
  ratings?: RatingBarVM[];      // base→current (mergeRatingsOverlays)
  spray?: SprayRoleVM[];        // this player's own spray — batting (where he hits) / pitching (contact off him) / fielding
  traitsCurrent?: string[];
  traitTimeline?: TraitTimelineVM[];
  moraleSources?: MoraleSourceVM[];  // morale ledger source breakdown
  ties?: TieVM[];
  fame?: FameVM;
  careerLine?: { label: string; value: string }[];   // career totals
  careerAwards?: CareerAwardVM[];
  milestones?: MilestoneVM[];
  designationEffect?: string;
}

export interface PlayerRowVM {
  id: string;
  number?: string;
  position: string;
  name: string;
  war?: number;
  salary?: number;
  trueValue?: number;          // the instance value that drifts as he develops (FranchiseTrueValueRow.trueValue)
  valueGap?: number;           // valueDelta = trueValue − salary; + = bargain, − = overpay
  designation?: { label: string; kind: "gold" | "albatross" };
  morale?: PlayerMoraleVM;
  detail?: PlayerDetailVM;     // the drawer payload (depth lives here so the table stays glanceable)
}

export interface PulseVM {
  fanMorale?: { value: number; trend: "up" | "down" | "flat"; history: MoraleHistoryVM[] };
  clubhouseLabel?: string;
  clubhouseAvg?: number;
  standingLabel?: string;
  payrollLabel?: string;       // e.g. "$5.4M · 22"
}

/* ===== Standings & Races (league-wide — the lens just highlights you/rival) ===== */
export interface StandingRowVM {
  teamId: string;
  name: string;
  abbr: string;
  wins: number;
  losses: number;
  winPct: number;            // 0..1 (rendered .XXX, no leading zero)
  gamesBack: number;         // 0 → division leader (renders "—")
  lastTenWins: number;       // L10 shows {wins}-{10 − wins}
  streak: { type: "W" | "L"; count: number };
  runDiff: number;           // +/-, signed in chalk
  home: { wins: number; losses: number };
  away: { wins: number; losses: number };
}
export interface StandingsDivisionVM { name: string; rows: StandingRowVM[] }

export interface RaceCandidateVM {
  teamId: string;
  teamAbbr: string;
  name: string;
  statLine?: string;         // e.g. ".308 · 31 HR · 92 RBI"
  score: number;             // composite (WAR-led); drives the gap-bar width
  marginToWinner: number;    // 0 for the frontrunner; how far back otherwise
}
export interface AwardRaceVM { category: string; note?: string; candidates: RaceCandidateVM[] }

export interface AllStarPickVM {
  position: string;          // 'C'..'RF' | 'SP' | 'RP' | 'WILDCARD'
  teamId: string;
  teamAbbr: string;
  name: string;
  role: "starter" | "reserve";
}
export interface AllStarSnubVM { teamId: string; teamAbbr: string; name: string; position: string; note?: string }
export interface AllStarBoardVM {
  locked: boolean;
  lockLabel: string;         // "Rosters locked · 60% mark" or "Ballot locks at game 97 · 17 to go"
  starters: AllStarPickVM[];
  reserves: AllStarPickVM[];
  snubs?: AllStarSnubVM[];
}
export interface AwardSlotVM {
  category: string;          // "MVP", "Gold Glove", "Bust of the Year"…
  emblem?: string;
  frontrunner: string;
  teamId: string;
  teamAbbr: string;
  status?: "lead" | "locked";
  dubious?: boolean;         // a negative honor (Bust, Booger Glove) → red accent
}
export interface SeasonProgressVM { label: string; pct: number; nextGate?: string }
export interface PictureSlotVM { teamId: string; teamAbbr: string; name: string; detail: string; tone?: "in" | "hunt" | "out" }
export interface PlayoffPictureVM { progress?: SeasonProgressVM; leaders: PictureSlotVM[]; wildCard: PictureSlotVM[]; note?: string }
export interface StandingsRacesVM {
  picture?: PlayoffPictureVM;   // season progress + magic numbers + wild-card hunt
  divisions: StandingsDivisionVM[];
  races: AwardRaceVM[];
  awards?: AwardSlotVM[];    // the full hardware board (all ~16 categories)
  allStar?: AllStarBoardVM;
}

/* ===== Stadium (team-scoped — the club's ballpark) ===== */
export type SprayDirection = "pull" | "pull_center" | "center" | "oppo_center" | "oppo" | "foul_left" | "foul_right";
export type SprayDepth = "infield" | "shallow" | "medium" | "deep";
export type SprayOutcome = "HR" | "3B" | "2B" | "1B" | "OUT" | "ERR";
export interface SprayDotVM { direction: SprayDirection; depth: SprayDepth; outcome: SprayOutcome }
export interface SprayRoleVM {
  role: "batting" | "pitching" | "fielding";
  dots: SprayDotVM[];
  stats: { label: string; value: string }[];   // e.g. "Batted balls 92", "HR 18", "Pull% 44"
  note?: string;
}
export interface StadiumRecordVM { label: string; holder: string; value: string; note?: string }
export interface StadiumAggregateVM { label: string; value: string }
export interface StadiumPerfVM { label: string; name: string; teamId: string; teamAbbr: string; value: string; kind: "good" | "bad" }
export interface StadiumOpponentVM { teamId: string; teamAbbr: string; record: string; note?: string }
export interface StadiumVM {
  name: string;
  nickname?: string;
  city?: string;
  archetype?: string;                            // "Bandbox" / "Pitcher's Cavern" / "Neutral" …
  dims?: { lf: number; cf: number; rf: number };
  factors?: { overall: number; runs: number; hr: number; confidence: "LOW" | "MEDIUM" | "HIGH"; source?: string };
  homeParkRival?: { teamId: string; teamAbbr: string; record: string; note?: string };  // the club that owns this park (Captain's feature)
  aggregates?: StadiumAggregateVM[];             // park totals (HR here, runs/game, …)
  performers?: StadiumPerfVM[];                  // best/worst hitter & pitcher at this park
  opponents?: StadiumOpponentVM[];               // how visitors fare here
  spray: SprayRoleVM[];                          // batting / pitching / fielding
  records?: StadiumRecordVM[];                   // the house-of-horrors catalog (incl. oddities)
}

/* ===== Checkpoint confirmation worklist (the moment-driven transcription takeover) ===== */
export interface RatingChangeVM { label: string; from: number; to: number }
export interface TraitChangeVM { valence: "gain" | "lose"; trait: string; displaces?: string }
export interface CheckpointPlayerVM {
  id: string;
  name: string;
  position: string;
  ratingChanges: RatingChangeVM[];
  traitChanges: TraitChangeVM[];
}
export interface CheckpointVM {
  number: number;            // 1–5 (every 20%)
  label: string;             // "Checkpoint 3 of 5"
  pctLabel?: string;         // "the 60% mark"
  players: CheckpointPlayerVM[];
}

/* ===== Tentpole takeovers (the season's big moments) ===== */
export interface FiringMomentVM {
  outgoing: string; outgoingRecord: string; reason: string;
  ripples: { name: string; delta: number; note: string }[];   // clubhouse reactions
  fanReaction: string;
  incoming: string; incomingNote: string;
}
export interface RebrandMomentVM {
  oldName: string; oldCity?: string;
  newName: string; newCity: string; newPark: string;
  fanReset: string; fameNote: string; designationNote: string;
}
export interface CeremonyMomentVM {
  title: string; champion: string;
  awards: { category: string; winner: string; teamAbbr: string }[];
  note?: string;
}
export interface EventMomentVM {
  kind: string; player: string; teamAbbr: string;
  effect: string;
  reporterTake?: string;
  options: { label: string; primary?: boolean }[];
}
export interface MomentsVM {
  firing?: FiringMomentVM;
  rebrand?: RebrandMomentVM;
  ceremony?: CeremonyMomentVM;
  event?: EventMomentVM;
}

/* ===== Schedule (team-scoped — the club's fixtures + results) ===== */
export interface ScheduleGameVM {
  scheduleGameId?: string;
  awayTeamId?: string;
  homeTeamId?: string;
  gameNumber?: number;
  date: string;            // "Wk 9 · Wed"
  opponent: string;        // abbr
  home: boolean;           // home (vs) vs away (@)
  result?: { teamScore: number; oppScore: number; win: boolean };  // present → completed
  isNext?: boolean;        // the immediate next game
  note?: string;
}
export interface ScheduleVM {
  upcoming: ScheduleGameVM[];
  recent: ScheduleGameVM[];
  deadlineNote?: string;
}

/* ===== Almanac (league-wide — leaders + trophy case) ===== */
export interface LeaderEntryVM { rank: number; name: string; teamId: string; teamAbbr: string; value: string }
export interface LeaderboardVM { stat: string; entries: LeaderEntryVM[] }
export interface TrophyVM { label: string; holder: string; teamId?: string }
export interface AlmanacVM {
  battingLeaders: LeaderboardVM[];
  pitchingLeaders: LeaderboardVM[];
  trophyCase?: TrophyVM[];
}

/* ===== Roster extras — the farm (22/10), roster advice, trade demands ===== */
export interface FarmPlayerVM {
  id: string;
  position: string;
  name: string;
  grade?: string;
  age?: number;
  readiness?: string;        // "MLB-ready" / "needs a year" / "raw"
  note?: string;
  callUpReady?: boolean;     // the skipper recommends bringing him up
}
export interface RosterMoveAdviceVM { kind: "call-up" | "send-down" | "watch"; text: string }
export interface TradeDemandVM { name: string; position: string; reason: string; severity?: "high" | "low" }
export interface RosterExtrasVM {
  farm?: FarmPlayerVM[];
  advice?: RosterMoveAdviceVM[];
  tradeDemands?: TradeDemandVM[];
  capNote?: string;          // "22/22 active · 9/10 farm · under the line"
}

/**
 * Raw context the interactive Lineups surface needs (the hub is otherwise a pure view, but the Lineups
 * board loads raw rosters + runs the optimizer engine, so the adapter hands it the ids it can't derive
 * from the view-models). Opponent = the active club's next-game opponent; games-played drives the
 * opponent's rotation slot inside the engine seam.
 */
export interface LineupsContextVM {
  franchiseId?: string;
  leagueId?: string;
  activeTeamId: string;
  opponentTeamId: string | null;
  opponentTeamName: string | null;
  opponentGamesPlayed: number;
  nextGameNumber: number | null;
  hasNextGame: boolean;
}

/* ===== Playoffs (club-scoped view of the franchise bracket) ===== */
export interface PlayoffMatchupVM {
  higherSeedAbbr: string;   // abbr of the higher seed (resolved via teamMeta)
  higherSeedName: string;
  higherSeed: number;
  higherSeedWins: number;
  lowerSeedAbbr: string;
  lowerSeedName: string;
  lowerSeed: number;
  lowerSeedWins: number;
  bestOf: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  winnerAbbr?: string;      // abbr of the series winner, when decided
  involvesActive?: boolean; // the lens club is in this series → highlight
}
export interface PlayoffRoundVM {
  round: number;
  roundName: string;
  matchups: PlayoffMatchupVM[];
}
export interface PlayoffsVM {
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  rounds: PlayoffRoundVM[];
  championAbbr?: string;     // resolved abbr of the champion
  championName?: string;
  mvpName?: string;
  mvpStats?: string;
}

/* ===== Trades (club + league transaction ledger for the season) ===== */
export interface TradeSideVM {
  teamAbbr: string;
  teamName: string;
  players: string[];        // resolved names where possible, else id/count
}
export interface TradeCardVM {
  date: string;             // friendly date
  team1: TradeSideVM;
  team2: TradeSideVM;
  cash?: number;            // net cash, when present
  involvesActive?: boolean; // the lens club is on either side → highlight
}
/** A single roster move in the broadened ledger (call-up / send-down / release). */
export interface MoveEntryVM {
  date: string;
  kind: "call_up" | "send_down" | "release" | "other";
  icon: string;             // ▲ ▼ ✂
  label: string;            // "Called up" / "Sent down" / "Released"
  playerName?: string;
  teamAbbr?: string;
  detail?: string;          // "to the active roster" / "to AAA"
  involvesActive: boolean;  // the lens club made the move → highlight
}
export interface TradesVM {
  trades: TradeCardVM[];
  moves?: MoveEntryVM[];    // the broader wire: call-ups, send-downs, releases
}

/* ===== Trade builder (propose a manual in-season trade from the hub) ===== */
export interface TradeCandidatePlayerVM { id: string; name: string; position: string; salary?: number }
export interface TradeCandidateTeamVM {
  teamId: string;
  teamAbbr: string;
  teamName: string;
  isActive: boolean;        // the lens club (the source side of any proposal)
  players: TradeCandidatePlayerVM[];   // MLB-rostered (revealed) players only — gate-safe
}

export interface HubVM {
  home?: SeasonHomeVM;
  news?: NewsVM;
  pulse: PulseVM;
  roster: PlayerRowVM[];
  rosterExtras?: RosterExtrasVM;
  standings?: StandingsRacesVM;
  stadium?: StadiumVM;
  schedule?: ScheduleVM;
  almanac?: AlmanacVM;
  playoffs?: PlayoffsVM;
  trades?: TradesVM;
  tradeCandidates?: TradeCandidateTeamVM[];   // all clubs' MLB rosters, for the trade builder
  checkpoint?: CheckpointVM;
  moments?: MomentsVM;
  lineups?: LineupsContextVM;
  loading?: boolean;
  emptyNote?: string;
}

/* ===== Roster-move actions (optional; wired by the live-data page, absent in the static mock) ===== */
export interface RosterActionResult { success: boolean; message?: string }
export interface TradeProposal {
  sourceTeamId: string;
  targetTeamId: string;
  outgoingPlayerIds: string[];
  incomingPlayerIds: string[];
}
export interface FranchiseLensActions {
  onCallUp: (playerId: string, teamId: string) => Promise<RosterActionResult>;
  onSendDown: (playerId: string, teamId: string) => Promise<RosterActionResult>;
  onExecuteTrade: (proposal: TradeProposal) => Promise<RosterActionResult>;
  onSetFitness: (playerId: string, state: FitnessState) => Promise<RosterActionResult>;
  onScoreGame?: (scheduleGameId?: string) => void;
  onScoreOnlyGame?: (scheduleGameId?: string) => void;
  onSkipGame?: (scheduleGameId?: string) => void;
}
/** A roster move awaiting the user's confirm — call-up from the farm, send-down from the drawer. */
interface PendingMove { kind: "call-up" | "send-down"; playerId: string; teamId: string; name: string }

export interface FranchiseLensHubProps {
  teams: TeamPickerVM[];
  active: ActiveTeamVM;
  hub: HubVM;
  onSelectTeam: (teamId: string) => void;
  onBack?: () => void;
  /** When present, roster rows/farm expose call-up & send-down affordances wired to the live engines. */
  actions?: FranchiseLensActions;
}

const TABS = ["The Clubhouse", "Roster", "Lineups", "Stadium", "Tootwhistle Times", "Playoffs", "Moves"] as const;
const LEAGUE_TABS = ["Standings & Races", "Schedule", "Almanac"] as const;

function moraleClass(v: number): string {
  if (v >= 60) return "hi";
  if (v <= 44) return "lo";
  return "mid";
}
function arrow(trend: "up" | "down" | "flat"): string {
  return trend === "up" ? "▲" : trend === "down" ? "▼" : "";
}

function Money({ value, className }: { value: number; className?: string }) {
  let n = value;
  let unit = "";
  if (Math.abs(value) >= 1_000_000) { n = value / 1_000_000; unit = "M"; }
  else if (Math.abs(value) >= 1_000) { n = value / 1_000; unit = "k"; }
  const digits = unit === "M" ? n.toFixed(2) : Math.round(n).toString();
  return (
    <span className={`fen-money ${className ?? ""}`}>
      <span className="cur">$</span>{digits}<span className="unit">{unit}</span>
    </span>
  );
}

export function FranchiseLensHub({ teams, active, hub, onSelectTeam, actions }: FranchiseLensHubProps) {
  const [tab, setTab] = useState<string>("The Clubhouse");
  const [openMorale, setOpenMorale] = useState<string | null>(null); // playerId | "fan" | null
  const [openPlayer, setOpenPlayer] = useState<PlayerRowVM | null>(null);
  const [openMoment, setOpenMoment] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [helpOn, setHelpOn] = useState(false);

  // Farm call-up: only offered when actions are wired (the live page). teamId = the lens club.
  const requestCallUp = actions
    ? (playerId: string, name: string) => setPendingMove({ kind: "call-up", playerId, teamId: active.id, name })
    : undefined;
  const requestSendDown = actions
    ? (playerId: string, name: string) => setPendingMove({ kind: "send-down", playerId, teamId: active.id, name })
    : undefined;

  const identityStyle = {
    ["--fen-tp" as string]: active.primary,
    ["--fen-ts" as string]: active.secondary,
  } as React.CSSProperties;

  return (
    <div className={`fen-root${helpOn ? " help-on" : ""}`}>
      <div className="fen-wrap">
        {/* lens picker — team names up top, clickable (no label needed) */}
        <div className="fen-lens">
          {teams.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`fen-teamchip${t.id === active.id ? " sel" : ""}`}
              onClick={() => { setOpenMorale(null); onSelectTeam(t.id); }}
            >
              <span className="swab" style={{ background: t.primary }} />
              {t.name}
            </button>
          ))}
        </div>

        {/* identity banner (team colors + branding/culture) */}
        <Banner active={active} />
        <div className="fen-colorbar" style={identityStyle} />

        {/* board + tabs */}
        <div className="fen-board first fen-aged">
          <div className="fen-content">
            <div className="fen-tabs">
              {TABS.map((t) => (
                <button key={t} type="button" className={`fen-tab${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>{t}</button>
              ))}
              {LEAGUE_TABS.map((t) => (
                <button key={t} type="button" className="fen-tab league" onClick={() => setTab(t)}>{t}<span className="fen-help">·league</span></button>
              ))}
            </div>

            {tab === "The Clubhouse" ? (
              <SeasonHome hub={hub} actions={actions} onAction={(a) => setOpenMoment(a)} />
            ) : tab === "Roster" ? (
              <RosterTab
                active={active}
                hub={hub}
                openMorale={openMorale}
                setOpenMorale={setOpenMorale}
                onOpenPlayer={setOpenPlayer}
                onRequestCallUp={requestCallUp}
              />
            ) : tab === "Lineups" ? (
              <FranchiseLineupsBoard hub={hub} active={active} />
            ) : tab === "Tootwhistle Times" ? (
              <NewspaperTab hub={hub} active={active} />
            ) : tab === "Playoffs" ? (
              <PlayoffsTab hub={hub} active={active} />
            ) : tab === "Moves" ? (
              <TradesTab hub={hub} active={active} actions={actions} />
            ) : tab === "Standings & Races" ? (
              <StandingsRacesTab hub={hub} active={active} />
            ) : tab === "Stadium" ? (
              <StadiumTab hub={hub} active={active} />
            ) : tab === "Schedule" ? (
              <ScheduleTab hub={hub} active={active} actions={actions} />
            ) : tab === "Almanac" ? (
              <AlmanacTab hub={hub} active={active} />
            ) : (
              <div className="fen-empty">"{tab}" comes next.</div>
            )}
          </div>
        </div>
      </div>
      <button type="button" className="fen-helpbtn" onClick={() => setHelpOn((v) => !v)}>? Help</button>
      {openPlayer ? (
        <PlayerDrawer
          player={openPlayer}
          onClose={() => setOpenPlayer(null)}
          onSendDown={
            requestSendDown
              ? () => { requestSendDown(openPlayer.id, openPlayer.name); setOpenPlayer(null); }
              : undefined
          }
          onSetFitness={actions ? (state) => actions.onSetFitness(openPlayer.id, state) : undefined}
        />
      ) : null}
      {pendingMove && actions ? (
        <RosterMoveConfirm move={pendingMove} actions={actions} onClose={() => setPendingMove(null)} />
      ) : null}
      {openMoment === "checkpoint" && hub.checkpoint ? <CheckpointTakeover cp={hub.checkpoint} onClose={() => setOpenMoment(null)} /> : null}
      {openMoment === "firing" && hub.moments?.firing ? <FiringTakeover m={hub.moments.firing} onClose={() => setOpenMoment(null)} /> : null}
      {openMoment === "rebrand" && hub.moments?.rebrand ? <RebrandTakeover m={hub.moments.rebrand} onClose={() => setOpenMoment(null)} /> : null}
      {openMoment === "ceremony" && hub.moments?.ceremony ? <CeremonyTakeover m={hub.moments.ceremony} active={active} onClose={() => setOpenMoment(null)} /> : null}
      {openMoment === "event" && hub.moments?.event ? <EventTakeover m={hub.moments.event} active={active} onClose={() => setOpenMoment(null)} /> : null}
    </div>
  );
}

function avatarGlyph(a?: "fedora" | "headset" | "cap"): string {
  return a === "headset" ? "🎧" : a === "cap" ? "🧢" : "🎩";
}

function Banner({ active }: { active: ActiveTeamVM }) {
  const style = {
    ["--fen-tp" as string]: active.primary,
    ["--fen-ts" as string]: active.secondary,
  } as React.CSSProperties;
  const crew: { l: string; v: string }[] = [];
  if (active.gmName) crew.push({ l: "GM", v: active.gmName });
  if (active.managerName) crew.push({ l: "Mgr", v: active.managerName + (active.managerStyle ? ` · ${active.managerStyle}` : "") });
  if (active.scoutName || active.scoutSpecialty) {
    crew.push({ l: "Scout", v: active.scoutName ? `${active.scoutName}${active.scoutSpecialty ? ` · ${active.scoutSpecialty}` : ""}` : active.scoutSpecialty! });
  }
  const meta = [
    active.recordLabel,
    active.ballparkNickname ? `"${active.ballparkNickname}"` : null,
    active.rivalName ? `Rival: ${active.rivalName} ⚔` : null,
  ].filter(Boolean).join("  ·  ");
  return (
    <div className="fen-ident" style={style}>
      <div className="fen-mark">{active.abbr}</div>
      <div>
        <div className="fen-id-main">
          <span className="nm">{active.name}</span>
          {active.archetype ? <span className="fen-archetype">{active.archetype}</span> : null}
        </div>
        <div className="fen-id-meta">{meta}</div>
      </div>
      <div className="fen-crewside">
        {active.reporter ? (
          <div className="fen-reporter">
            <div className="fen-ravatar">{avatarGlyph(active.reporter.avatar)}</div>
            <div className="rt">
              <div className="rn">{active.reporter.name} · beat writer</div>
              {active.reporter.mood ? <div className="rm">mood: {active.reporter.mood}</div> : null}
            </div>
          </div>
        ) : null}
        {crew.length > 0 ? (
          <div className="fen-crew">
            {crew.map((c, i) => <span key={c.l}>{i > 0 ? "  ·  " : ""}<b>{c.l}</b> {c.v}</span>)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SeasonHome({ hub, actions, onAction }: { hub: HubVM; actions?: FranchiseLensActions; onAction?: (action: string) => void }) {
  const home = hub.home;
  if (!home) return <div className="fen-empty">The clubhouse is quiet — no season underway yet.</div>;
  return (
    <>
      {home.leadStory ? (
        <div className="fen-lead">
          <div className="wt fen-help-b">lead story</div>
          <div className="kick">{home.leadStory.kicker}</div>
          <h2>{home.leadStory.headline}</h2>
          <p>{home.leadStory.body}</p>
          <div className="by">{home.leadStory.byline}</div>
        </div>
      ) : null}
      <div className="fen-homegrid">
        <div>
          <div className="fen-sectlab">Needs you now <span className="lite fen-help">· ranked by impact</span></div>
          <div className="fen-icards">
            {home.impactCards.map((c, i) => (
              <button type="button" className={`fen-icard ${c.kind}${c.action ? " act" : ""}`} key={i} onClick={() => c.action && onAction?.(c.action)}>
                <span className="ic">{c.icon}</span>
                <div className="bd"><div className="t">{c.title}</div><div className="d">{c.detail}</div></div>
                {c.cta ? <span className={`go${c.action ? "" : " fen-help"}`}>{c.cta} →</span> : null}
              </button>
            ))}
          </div>
        </div>
        {home.nextGame ? (
          <div>
            <div className="fen-sectlab">Tonight</div>
            <div className="fen-nextgame">
              <div className="fen-mteams">
                <div className="fen-mt"><div className="lg">{home.nextGame.awayAbbr}</div><div className="nm">{home.nextGame.awayName}</div><div className="rc">{home.nextGame.awayRecord}</div></div>
                <div className="fen-vs">@</div>
                <div className="fen-mt you"><div className="lg">{home.nextGame.homeAbbr}</div><div className="nm">{home.nextGame.homeName}</div><div className="rc">{home.nextGame.homeRecord}</div></div>
              </div>
              <button
                type="button"
                className="fen-bigplay"
                onClick={() => actions?.onScoreGame?.(home.nextGame?.scheduleGameId)}
                disabled={!actions?.onScoreGame}
              >
                SCORE
              </button>
              <div className="fen-simrow">
                <button
                  type="button"
                  className="fen-simbtn"
                  onClick={() => actions?.onScoreOnlyGame?.(home.nextGame?.scheduleGameId)}
                  disabled={!actions?.onScoreOnlyGame}
                >
                  SCORE ONLY
                </button>
                <button
                  type="button"
                  className="fen-simbtn"
                  onClick={() => actions?.onSkipGame?.(home.nextGame?.scheduleGameId)}
                  disabled={!actions?.onSkipGame}
                >
                  SKIP
                </button>
              </div>
              {home.nextGame.pulse ? <div className="fen-gpulse">{home.nextGame.pulse}</div> : null}
            </div>
          </div>
        ) : null}
      </div>
      {hub.checkpoint || hub.moments ? (
        <div className="fen-moments-launch">
          <span className="lab">The season's big moments</span>
          {hub.checkpoint ? <button type="button" onClick={() => onAction?.("checkpoint")}>🔔 Checkpoint</button> : null}
          {hub.moments?.event ? <button type="button" onClick={() => onAction?.("event")}>📋 Event to confirm</button> : null}
          {hub.moments?.firing ? <button type="button" onClick={() => onAction?.("firing")}>⚠ Manager firing</button> : null}
          {hub.moments?.rebrand ? <button type="button" onClick={() => onAction?.("rebrand")}>🏟 Rebrand</button> : null}
          {hub.moments?.ceremony ? <button type="button" onClick={() => onAction?.("ceremony")}>🏆 Season-end</button> : null}
        </div>
      ) : null}
      <div className="fen-calm fen-help-b">Your <b>roster</b>, the <b>farm</b>, <b>stadium</b>, <b>standings &amp; races</b>, the <b>Almanac</b> — all a tap away. The home only shows what's earned its place today.</div>
    </>
  );
}

function ImpactPips({ weight }: { weight?: number }) {
  if (weight === undefined) return null;
  const lvl = weight >= 0.66 ? 3 : weight >= 0.4 ? 2 : 1;
  return (
    <span className="fen-impact" title={`story impact ${Math.round(weight * 100)}/100`}>
      {[1, 2, 3].map((n) => <span key={n} className={`pip${n <= lvl ? " on" : ""}`} />)}
    </span>
  );
}

function NewspaperTab({ hub, active }: { hub: HubVM; active: ActiveTeamVM }) {
  const news = hub.news;
  const reporter = active.reporter?.name;
  if (!news) return <div className="fen-empty">No dispatches from the beat yet this season.</div>;
  const ranked = [...news.stories].sort((a, b) => (b.dramaticWeight ?? 0) - (a.dramaticWeight ?? 0));
  return (
    <div className="fen-paper">
      <div className="fen-masthead">
        <div className="name">The Tootwhistle Times</div>
        <div className="subm">{active.name} · {news.editionLabel}</div>
      </div>
      <div className="fen-dateline">
        <span>{news.volumeLabel}</span>
        {reporter ? <span>{reporter}, beat writer</span> : null}
        <span>{news.priceLabel ?? "Price: Two Bits"}</span>
      </div>
      <div className="pbody">
        {news.lead ? (
          <div className="fen-lead2">
            <div className="kick">{news.lead.kicker}<span className="fen-help"> · today's biggest story</span><ImpactPips weight={news.lead.dramaticWeight} /></div>
            <h2>{news.lead.headline}</h2>
            <p>{news.lead.body}</p>
            <div className="by">{news.lead.byline}</div>
          </div>
        ) : null}
        <div className="fen-newsgrid">
          {ranked.map((s, i) => (
            <div className="fen-ncard" key={i}>
              <span className="fen-ncat">{s.category}<ImpactPips weight={s.dramaticWeight} /></span>
              <h3>{s.headline}</h3>
              <p className="ex">{s.excerpt}</p>
              <div className="by">{s.byline}</div>
            </div>
          ))}
        </div>
        {news.recaps && news.recaps.length ? (
          <div className="fen-recaps">
            <div className="fen-recaps-h">Around the League <span className="lite fen-help">· recent games</span></div>
            {news.recaps.map((r, i) => (
              <div className="fen-recap" key={i}>
                <div className="rd">{r.date}</div>
                <div className="rsc">
                  <span className={r.win === "away" ? "w" : ""}>{r.away}{r.awayScore !== undefined ? ` ${r.awayScore}` : ""}</span>
                  <span className="at">@</span>
                  <span className={r.win === "home" ? "w" : ""}>{r.home}{r.homeScore !== undefined ? ` ${r.homeScore}` : ""}</span>
                </div>
                <div className="rh">{r.headline}</div>
              </div>
            ))}
          </div>
        ) : null}
        {news.wire && news.wire.length ? (
          <div className="fen-wire">
            <div className="fen-wire-h">The Wire <span className="lite fen-help">· around the league</span></div>
            {news.wire.map((w, i) => (
              <div className={`fen-wireitem ${w.tone ?? "neutral"}`} key={i}>
                <span className="ty">{w.type}</span>
                <span className="tx">{w.text}</span>
                {w.when ? <span className="wn">{w.when}</span> : null}
              </div>
            ))}
          </div>
        ) : null}
        {news.desk ? (
          <div className="fen-desk">
            <div className="dh">From the desk of {news.desk.name}</div>
            <div className="dm">{news.desk.tier} · {news.desk.accuracy}% accurate · {news.desk.corrections} correction{news.desk.corrections === 1 ? "" : "s"} this season</div>
            {news.desk.note ? <div className="dn">"{news.desk.note}"</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RosterTab({
  active, hub, openMorale, setOpenMorale, onOpenPlayer, onRequestCallUp,
}: {
  active: ActiveTeamVM;
  hub: HubVM;
  openMorale: string | null;
  setOpenMorale: (v: string | null) => void;
  onOpenPlayer: (p: PlayerRowVM) => void;
  onRequestCallUp?: (playerId: string, name: string) => void;
}) {
  const fan = hub.pulse.fanMorale;
  return (
    <>
      {/* club pulse */}
      <div className="fen-pulse">
        <div className="club fen-chalk fen-y">
          {active.name}{" "}
          {hub.pulse.standingLabel ? <span className="fen-muted" style={{ fontFamily: "var(--fen-chalk-font)", fontSize: 14 }}>{hub.pulse.standingLabel}</span> : null}
        </div>
        {fan ? (
          <div style={{ position: "relative" }}>
            <button type="button" className="fen-metric" onClick={() => setOpenMorale(openMorale === "fan" ? null : "fan")}>
              <div className="ml">Fan morale</div>
              <div className={`mv fen-chalk ${moraleClass(fan.value)}`}>{fan.value} <span style={{ fontSize: 15 }}>{arrow(fan.trend)}</span></div>
              <div className="tap fen-help-b">tap for the log</div>
            </button>
            {openMorale === "fan" && (
              <MoralePopover
                name="Fan morale"
                value={fan.value}
                state={fan.trend === "up" ? "Rising" : fan.trend === "down" ? "Falling" : "Steady"}
                history={fan.history}
                onClose={() => setOpenMorale(null)}
                anchor="left"
              />
            )}
          </div>
        ) : null}
        {hub.pulse.clubhouseLabel ? (
          <div className="fen-metric" style={{ cursor: "default" }}>
            <div className="ml">Clubhouse</div>
            <div className="mv fen-chalk">{hub.pulse.clubhouseLabel}</div>
            {hub.pulse.clubhouseAvg !== undefined ? <div className="tap">avg morale {hub.pulse.clubhouseAvg}</div> : null}
          </div>
        ) : null}
        {hub.pulse.payrollLabel ? (
          <div className="fen-metric" style={{ cursor: "default" }}>
            <div className="ml">Payroll</div>
            <div className="mv fen-chalk">{hub.pulse.payrollLabel}</div>
          </div>
        ) : null}
        {active.rivalName ? (
          <div className="fen-rivalcall">Rival: <span className="fen-r">{active.rivalName} ⚔</span></div>
        ) : null}
      </div>

      {/* roster */}
      {hub.loading ? (
        <div className="fen-empty">Loading the roster…</div>
      ) : hub.roster.length === 0 ? (
        <div className="fen-empty">{hub.emptyNote ?? "No players on this roster yet."}</div>
      ) : (
        <div className="fen-roster">
          <div className="h">#</div><div className="h">Pos</div><div className="h">Player</div>
          <div className="h">Designation</div><div className="h rt">WAR</div><div className="h rt">Salary</div><div className="h rt">Value</div><div className="h rt">Net</div><div className="h rt">Morale</div>
          <div className="line" />
          {hub.roster.map((p) => (
            <RosterRow key={p.id} p={p} open={openMorale === p.id} onToggle={() => setOpenMorale(openMorale === p.id ? null : p.id)} onOpen={() => onOpenPlayer(p)} />
          ))}
        </div>
      )}

      {hub.rosterExtras ? <RosterExtras extras={hub.rosterExtras} onRequestCallUp={onRequestCallUp} /> : null}
    </>
  );
}

function RosterExtras({ extras, onRequestCallUp }: { extras: RosterExtrasVM; onRequestCallUp?: (playerId: string, name: string) => void }) {
  return (
    <>
      {(extras.advice && extras.advice.length) || (extras.tradeDemands && extras.tradeDemands.length) ? (
        <div className="fen-frontoffice">
          {extras.advice && extras.advice.length ? (
            <div className="fen-fo-col">
              <div className="fen-sectlab">From the Skipper <span className="lite fen-help">· roster advice</span></div>
              {extras.advice.map((a, i) => (
                <div className={`fen-advice ${a.kind}`} key={i}>
                  <span className="ic">{a.kind === "call-up" ? "▲" : a.kind === "send-down" ? "▼" : "•"}</span>
                  <span className="tx">{a.text}</span>
                </div>
              ))}
            </div>
          ) : null}
          {extras.tradeDemands && extras.tradeDemands.length ? (
            <div className="fen-fo-col">
              <div className="fen-sectlab">Wants Out <span className="lite fen-help">· trade demands</span></div>
              {extras.tradeDemands.map((t, i) => (
                <div className={`fen-demand${t.severity === "high" ? " hot" : ""}`} key={i}>
                  <span className="pos">{t.position}</span>
                  <span className="nm fen-chalk">{t.name}</span>
                  <span className="rs">{t.reason}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {extras.farm && extras.farm.length ? (
        <div className="fen-farm">
          <div className="fen-sectlab">The Farm <span className="lite fen-help">· the 10 · bring a kid up</span></div>
          <div className="fen-farm-list">
            <div className="h">Pos</div><div className="h">Prospect</div><div className="h">Grade</div><div className="h">Readiness</div><div className="h" />
            <div className="line" />
            {extras.farm.map((f) => (
              <Fragment key={f.id}>
                <div><span className="fen-rpos">{f.position}</span></div>
                <div className="fen-rname fen-chalk">{f.name}{f.age ? <span className="fen-farm-age"> · {f.age}</span> : null}</div>
                <div className="fen-farm-grade">{f.grade ?? "—"}</div>
                <div className="fen-farm-ready">{f.readiness ?? ""}{f.note ? <span className="fen-farm-note fen-help"> · {f.note}</span> : null}</div>
                <div className="fen-farm-act">
                  {onRequestCallUp ? (
                    <button type="button" className={`fen-callup${f.callUpReady ? "" : " ghost"}`} onClick={() => onRequestCallUp(f.id, f.name)}>▲ Call up</button>
                  ) : (
                    <button type="button" className={`fen-callup${f.callUpReady ? "" : " ghost"}`} disabled>▲ Call up</button>
                  )}
                </div>
                <div className="line" />
              </Fragment>
            ))}
          </div>
          {extras.capNote ? <div className="fen-farm-cap fen-help-b">{extras.capNote}</div> : null}
        </div>
      ) : null}
    </>
  );
}

/**
 * Confirm-and-execute dialog for a roster move. Reuses the MomentShell takeover so it matches the
 * board aesthetic with no new chrome. Call-up reveals the prospect's true ratings (the scout fog
 * lifts) — we say so. The engine enforces eligibility; its error surfaces inline.
 */
function RosterMoveConfirm({ move, actions, onClose }: { move: PendingMove; actions: FranchiseLensActions; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isCallUp = move.kind === "call-up";
  const run = async () => {
    setBusy(true);
    setErr(null);
    const res = isCallUp
      ? await actions.onCallUp(move.playerId, move.teamId)
      : await actions.onSendDown(move.playerId, move.teamId);
    setBusy(false);
    if (res.success) onClose();
    else setErr(res.message ?? "The move couldn't be completed.");
  };
  return (
    <MomentShell
      accent={isCallUp ? "ceremony" : "rebrand"}
      kicker={isCallUp ? "Roster move · call-up" : "Roster move · send-down"}
      title={isCallUp ? `Call up ${move.name}?` : `Send ${move.name} down?`}
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <button type="button" className="fen-cp-allbtn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="fen-cp-donebtn" onClick={run} disabled={busy}>
            {busy ? "Working…" : isCallUp ? "Call him up" : "Send him down"}
          </button>
        </>
      }
    >
      <div className="fen-cp-sub">
        {isCallUp
          ? `Promoting ${move.name} to the active roster reveals his true ratings — the scout's fog lifts — and logs the move to the wire.`
          : `Optioning ${move.name} to AAA opens an active-roster spot and logs the move to the wire.`}
      </div>
      {err ? <div className="fen-cp-sub fen-r" style={{ marginTop: 10 }}>{err}</div> : null}
    </MomentShell>
  );
}

function RosterRow({ p, open, onToggle, onOpen }: { p: PlayerRowVM; open: boolean; onToggle: () => void; onOpen: () => void }) {
  return (
    <>
      <div className="fen-rnum">{p.number ?? ""}</div>
      <div><span className="fen-rpos">{p.position}</span></div>
      <button type="button" className="fen-rname fen-chalk fen-rname-btn" onClick={onOpen}>{p.name}</button>
      <div>{p.designation ? <span className={`fen-rbadge${p.designation.kind === "albatross" ? " alb" : ""}`}>{p.designation.label}</span> : null}</div>
      <div className="fen-rnumcell">{p.war !== undefined ? p.war.toFixed(1) : "—"}</div>
      <div className="fen-rnumcell soft">{p.salary !== undefined ? <Money value={p.salary} /> : "—"}</div>
      <div className="fen-rnumcell">{p.trueValue !== undefined ? <Money value={p.trueValue} /> : "—"}</div>
      <div className="fen-rnumcell">
        {p.valueGap !== undefined ? (
          <span className={p.valueGap >= 0 ? "fen-net up" : "fen-net dn"}>{p.valueGap >= 0 ? "+" : "−"}<Money value={Math.abs(p.valueGap)} /></span>
        ) : "—"}
      </div>
      <div style={{ position: "relative" }}>
        {p.morale ? (
          <>
            <button type="button" className={`fen-morale ${moraleClass(p.morale.value)}`} onClick={onToggle}>
              {p.morale.value} <span className="ar">{arrow(p.morale.trend)}</span>
            </button>
            {open && (
              <MoralePopover
                name={p.name}
                value={p.morale.value}
                state={p.morale.state}
                arc={p.morale.arc}
                history={p.morale.history}
                onClose={onToggle}
                anchor="right"
              />
            )}
          </>
        ) : (
          <span className="fen-rnumcell soft">—</span>
        )}
      </div>
      <div className="line" />
    </>
  );
}

function MoralePopover({
  name, value, state, arc, history, onClose, anchor,
}: {
  name: string;
  value: number;
  state: string;
  arc?: string;
  history: MoraleHistoryVM[];
  onClose: () => void;
  anchor: "left" | "right";
}) {
  const pos = anchor === "right" ? { right: 0 } : { left: 0 };
  return (
    <>
      <div className="fen-popbackdrop" onClick={onClose} />
      <div className="fen-pop" style={{ top: 34, ...pos }}>
        <button type="button" className="close" aria-label="Close" onClick={onClose}>×</button>
        <div className="ph"><span className={`nm fen-chalk ${moraleClass(value)}`}>{name}</span><span className="st">{state}</span></div>
        <div className="fen-row" style={{ alignItems: "flex-end" }}>
          <span className={`big fen-chalk ${moraleClass(value)}`}>{value}</span>
          {arc ? <span className="arc">{arc}</span> : null}
        </div>
        {history.length === 0 ? (
          <div className="fen-entry"><span className="rs fen-muted">No recorded swings yet this season.</span></div>
        ) : history.map((h, i) => (
          <div className="fen-entry" key={i}>
            <span className={`d ${h.delta >= 0 ? "up" : "dn"}`}>{h.delta >= 0 ? "+" : ""}{h.delta}</span>
            <span><span className="rs">{h.reason}</span><br /><span className="wk">{h.week}</span></span>
          </div>
        ))}
        <div className="foot fen-help-b">Tap a player's name for the full clubhouse card.</div>
      </div>
    </>
  );
}

/* ===== Standings & Races (league tab) ===== */
function teamTone(teamId: string, active: ActiveTeamVM): "" | " you" | " rival" {
  if (teamId === active.id) return " you";
  if (active.rivalId && teamId === active.rivalId) return " rival";
  return "";
}
function pct3(p: number): string {
  return p >= 1 ? "1.000" : p.toFixed(3).replace(/^0/, "");
}
function war1(n: number): string {
  return n.toFixed(1);
}

function PictureSlot({ s, active }: { s: PictureSlotVM; active: ActiveTeamVM }) {
  const tone = teamTone(s.teamId, active);
  return (
    <div className={`fen-pic-slot ${s.tone ?? "in"}${tone}`}>
      <span className="ab fen-chalk">{s.teamAbbr}</span>
      <span className="nm fen-chalk">{s.name}</span>
      <span className="dt">{s.detail}</span>
    </div>
  );
}

function StandingsRacesTab({ hub, active }: { hub: HubVM; active: ActiveTeamVM }) {
  const sr = hub.standings;
  if (!sr) return <div className="fen-empty">No league standings yet this season.</div>;
  return (
    <div className="fen-sr">
      {/* PLAYOFF PICTURE — season progress + magic numbers + wild-card */}
      {sr.picture ? (
        <div className="fen-sr-sect">
          {sr.picture.progress ? (
            <div className="fen-progress">
              <div className="pr-top"><span className="pl">{sr.picture.progress.label}</span>{sr.picture.progress.nextGate ? <span className="pg">{sr.picture.progress.nextGate}</span> : null}</div>
              <div className="pr-bar"><span className="fill" style={{ width: `${Math.max(0, Math.min(100, sr.picture.progress.pct))}%` }} /></div>
            </div>
          ) : null}
          <div className="fen-sectlab">Playoff Picture <span className="lite fen-help">· if the season ended today</span></div>
          <div className="fen-picture">
            <div className="fen-pic-col">
              <div className="fen-pic-h">Division Leaders</div>
              {sr.picture.leaders.map((s, i) => <PictureSlot key={i} s={s} active={active} />)}
            </div>
            <div className="fen-pic-col">
              <div className="fen-pic-h">Wild-Card Hunt</div>
              {sr.picture.wildCard.map((s, i) => <PictureSlot key={i} s={s} active={active} />)}
            </div>
          </div>
          {sr.picture.note ? <div className="fen-pic-note fen-help-b">{sr.picture.note}</div> : null}
        </div>
      ) : null}

      {/* STANDINGS */}
      <div className="fen-sr-sect">
        <div className="fen-sectlab">Standings <span className="lite fen-help">· your club in yellow, the rival in red</span></div>
        {sr.divisions.map((d) => (
          <div className="fen-stand" key={d.name}>
            <div className="fen-stand-div">{d.name}</div>
            <div className="fen-stand-grid">
              <div className="h">Team</div><div className="h rt">W</div><div className="h rt">L</div><div className="h rt">PCT</div>
              <div className="h rt">GB</div><div className="h rt">L10</div><div className="h rt">STRK</div><div className="h rt">RDIFF</div>
              <div className="h rt">HOME</div><div className="h rt">AWAY</div>
              <div className="line" />
              {d.rows.map((r) => {
                const tone = teamTone(r.teamId, active);
                return (
                  <Fragment key={r.teamId}>
                    <div className={`fen-stand-team fen-chalk${tone}`}><span className="ab">{r.abbr}</span>{r.name}</div>
                    <div className={`fen-rnumcell${tone}`}>{r.wins}</div>
                    <div className="fen-rnumcell soft">{r.losses}</div>
                    <div className={`fen-rnumcell${tone}`}>{pct3(r.winPct)}</div>
                    <div className="fen-rnumcell soft">{r.gamesBack === 0 ? "—" : r.gamesBack.toFixed(1)}</div>
                    <div className="fen-rnumcell">{r.lastTenWins}-{10 - r.lastTenWins}</div>
                    <div className={`fen-rnumcell ${r.streak.type === "W" ? "stw" : "stl"}`}>{r.streak.type}{r.streak.count}</div>
                    <div className={`fen-rnumcell ${r.runDiff >= 0 ? "pos" : "neg"}`}>{r.runDiff >= 0 ? "+" : "−"}{Math.abs(r.runDiff)}</div>
                    <div className="fen-rnumcell soft">{r.home.wins}-{r.home.losses}</div>
                    <div className="fen-rnumcell soft">{r.away.wins}-{r.away.losses}</div>
                    <div className="line" />
                  </Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* RACES */}
      <div className="fen-sr-sect">
        <div className="fen-sectlab">The Races <span className="lite fen-help">· the bar shows the gap to the frontrunner</span></div>
        <div className="fen-races">
          {sr.races.map((race) => {
            const lead = race.candidates[0];
            return (
              <div className="fen-race" key={race.category}>
                <div className="fen-race-cat">{race.category}{race.note ? <span className="nt"> · {race.note}</span> : null}</div>
                {race.candidates.map((c, i) => {
                  const frac = lead && lead.score > 0 ? c.score / lead.score : 0;
                  const tone = teamTone(c.teamId, active);
                  return (
                    <div className={`fen-race-row${i === 0 ? " lead" : ""}${tone}`} key={c.teamId + c.name}>
                      <div className="rk">{i + 1}</div>
                      <div className="who">
                        <span className="nm fen-chalk">{c.name}</span>
                        <span className="tm">{c.teamAbbr}{c.statLine ? ` · ${c.statLine}` : ""}</span>
                      </div>
                      <div className="bar"><span className="fill" style={{ width: `${Math.max(7, Math.round(frac * 100))}%` }} /></div>
                      <div className="gap">{i === 0 ? "leads" : `−${war1(c.marginToWinner)}`}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* THE HARDWARE — every award's current frontrunner */}
      {sr.awards && sr.awards.length ? (
        <div className="fen-sr-sect">
          <div className="fen-sectlab">The Hardware <span className="lite fen-help">· every award's frontrunner · provisional</span></div>
          <div className="fen-awards">
            {sr.awards.map((aw, i) => {
              const tone = teamTone(aw.teamId, active);
              return (
                <div className={`fen-award${aw.dubious ? " bad" : ""}`} key={i}>
                  <span className="em">{aw.emblem ?? "🏆"}</span>
                  <div className="bd">
                    <div className="cat">{aw.category}</div>
                    <div className={`who fen-chalk${tone}`}>{aw.frontrunner} <span className="tm">{aw.teamAbbr}</span></div>
                  </div>
                  {aw.status === "locked" ? <span className="st">★</span> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ALL-STAR BOARD */}
      {sr.allStar ? <AllStarBoard board={sr.allStar} active={active} /> : null}
    </div>
  );
}

function AllStarPickRow({ p, active }: { p: AllStarPickVM; active: ActiveTeamVM }) {
  const tone = teamTone(p.teamId, active);
  return (
    <div className={`fen-asrow${tone}`}>
      <span className="pos">{p.position === "WILDCARD" ? "WC" : p.position}</span>
      <span className="nm fen-chalk">{p.name}</span>
      <span className="tm">{p.teamAbbr}</span>
    </div>
  );
}

function AllStarBoard({ board, active }: { board: AllStarBoardVM; active: ActiveTeamVM }) {
  return (
    <div className="fen-sr-sect">
      <div className="fen-sectlab">All-Star Board <span className="lite fen-help">· {board.lockLabel}</span></div>
      <div className="fen-allstar">
        <div className="fen-ascols">
          <div className="fen-ascol">
            <div className="fen-ascol-h">Starters <span className="ct">{board.starters.length}</span></div>
            {board.starters.map((p) => <AllStarPickRow key={p.position + p.name} p={p} active={active} />)}
          </div>
          <div className="fen-ascol">
            <div className="fen-ascol-h">Reserves <span className="ct">{board.reserves.length}</span></div>
            {board.reserves.map((p) => <AllStarPickRow key={p.position + p.name} p={p} active={active} />)}
          </div>
        </div>
        {board.snubs && board.snubs.length > 0 ? (
          <div className="fen-snubs">
            <div className="fen-snub-h">Snubbed <span className="fen-help">· a snub stings the clubhouse</span></div>
            {board.snubs.map((s) => (
              <div className={`fen-snub${teamTone(s.teamId, active)}`} key={s.name}>
                <span className="pos">{s.position}</span>
                <span className="nm fen-chalk">{s.name}</span>
                <span className="tm">{s.teamAbbr}</span>
                {s.note ? <span className="nt">{s.note}</span> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ===== Stadium (team tab) ===== */
const SPRAY_ANGLE: Record<SprayDirection, number> = {
  pull: -34, pull_center: -18, center: 0, oppo_center: 18, oppo: 34, foul_left: -54, foul_right: 54,
};
const SPRAY_RADIUS: Record<SprayDepth, number> = { infield: 80, shallow: 145, medium: 205, deep: 265 };
const SPRAY_DOT_R: Record<string, number> = { hr: 5.2, xbh: 4.2, single: 3.6, out: 3, err: 3.6 };
function sprayPoint(dot: SprayDotVM, i: number): { x: number; y: number } {
  const a = (SPRAY_ANGLE[dot.direction] * Math.PI) / 180;
  const r = SPRAY_RADIUS[dot.depth];
  const jx = ((i * 37) % 17) - 8; // deterministic jitter so stacked balls separate
  const jy = ((i * 53) % 15) - 7;
  return { x: 240 + r * Math.sin(a) + jx, y: 330 - r * Math.cos(a) + jy };
}
function outcomeClass(o: SprayOutcome): string {
  return o === "HR" ? "hr" : o === "2B" || o === "3B" ? "xbh" : o === "1B" ? "single" : o === "ERR" ? "err" : "out";
}

function SprayField({ dots }: { dots: SprayDotVM[] }) {
  return (
    <svg className="fen-spray-svg" viewBox="0 0 480 352" role="img" aria-label="Spray chart of batted balls">
      {/* fair territory + infield dirt */}
      <path className="fen-spray-grass" d="M240 330 L38 128 Q240 -48 442 128 Z" />
      <path className="fen-spray-dirt" d="M240 330 L300 270 L240 210 L180 270 Z" />
      {/* wall arc + foul lines + diamond (chalk) */}
      <path className="fen-spray-wall" d="M38 128 Q240 -48 442 128" />
      <line className="fen-spray-line" x1="240" y1="330" x2="38" y2="128" />
      <line className="fen-spray-line" x1="240" y1="330" x2="442" y2="128" />
      <path className="fen-spray-diamond" d="M240 330 L300 270 L240 210 L180 270 Z" />
      <circle className="fen-spray-mound" cx="240" cy="276" r="4" />
      <circle className="fen-spray-base" cx="240" cy="330" r="3" />
      <circle className="fen-spray-base" cx="300" cy="270" r="3" />
      <circle className="fen-spray-base" cx="240" cy="210" r="3" />
      <circle className="fen-spray-base" cx="180" cy="270" r="3" />
      {dots.map((d, i) => {
        const { x, y } = sprayPoint(d, i);
        const cls = outcomeClass(d.outcome);
        return <circle key={i} className={`fen-spray-dot ${cls}`} cx={x} cy={y} r={SPRAY_DOT_R[cls]} />;
      })}
    </svg>
  );
}

function ParkFactor({ label, v }: { label: string; v: number }) {
  const pct = Math.round(v * 100);
  const tone = pct > 102 ? " up" : pct < 98 ? " dn" : "";
  return (
    <div className="fen-pf">
      <div className={`pv fen-chalk${tone}`}>{pct}</div>
      <div className="pl">{label}</div>
    </div>
  );
}

function SprayPanel({ spray }: { spray: SprayRoleVM[] }) {
  const [role, setRole] = useState<"batting" | "pitching" | "fielding">(spray[0]?.role ?? "batting");
  const roleData = spray.find((r) => r.role === role) ?? spray[0];
  if (!roleData) return null;
  return (
    <>
      {spray.length > 1 ? (
        <div className="fen-spray-toggle">
          {spray.map((r) => (
            <button key={r.role} type="button" className={`fen-spray-tab${role === r.role ? " on" : ""}`} onClick={() => setRole(r.role)}>{r.role}</button>
          ))}
        </div>
      ) : null}
      {roleData.dots.length === 0 ? (
        <div className="fen-empty">No {role} spray evidence yet.</div>
      ) : (
        <>
          <SprayField dots={roleData.dots} />
          <div className="fen-spray-legend">
            <span className="lg hr">HR</span><span className="lg xbh">2B / 3B</span><span className="lg single">1B</span><span className="lg out">Out</span><span className="lg err">Error</span>
          </div>
          <div className="fen-spray-stats">
            {roleData.stats.map((st, i) => (
              <div className="st" key={i}><div className="v fen-chalk">{st.value}</div><div className="l">{st.label}</div></div>
            ))}
          </div>
          {roleData.note ? <div className="fen-spray-note fen-help-b">{roleData.note}</div> : null}
        </>
      )}
    </>
  );
}

function StadiumTab({ hub, active }: { hub: HubVM; active: ActiveTeamVM }) {
  const s = hub.stadium;
  if (!s) return <div className="fen-empty">No ballpark data for {active.name} yet.</div>;
  const stadShort = s.nickname ?? s.name;
  return (
    <div className="fen-stadium">
      <div className="fen-stad-head">
        <div className="fen-stad-name fen-chalk fen-y">{s.nickname ? `"${s.nickname}"` : s.name}</div>
        <div className="fen-stad-sub">{[s.nickname ? s.name : null, s.city].filter(Boolean).join(" · ")}</div>
        {s.archetype ? <span className="fen-stad-arch">{s.archetype}</span> : null}
        {s.dims ? (
          <div className="fen-stad-dims">
            <span><b>LF</b> {s.dims.lf}</span><span><b>CF</b> {s.dims.cf}</span><span><b>RF</b> {s.dims.rf}</span>
          </div>
        ) : null}
      </div>

      {s.homeParkRival ? (
        <div className="fen-stad-rival">
          <span className="ic">⚔</span>
          <span>This season <b className="fen-r">{s.homeParkRival.teamAbbr}</b> owns {s.nickname ? `"${s.nickname}"` : "your park"} — <b className="fen-chalk">{s.homeParkRival.record}</b> here{s.homeParkRival.note ? ` · ${s.homeParkRival.note}` : ""}.</span>
        </div>
      ) : null}

      <div className="fen-stad-grid">
        <div className="fen-stad-spray">
          <div className="fen-sectlab">Spray Chart <span className="lite fen-help">· where balls go at {stadShort}</span></div>
          <SprayPanel spray={s.spray} />
        </div>

        <div className="fen-stad-side">
          {s.factors ? (
            <div className="fen-parkbox">
              <div className="fen-sectlab">Park Factors <span className="lite fen-help">· {(s.factors.source ?? "seed").toLowerCase()} · {s.factors.confidence.toLowerCase()} confidence</span></div>
              <div className="fen-parkrow">
                <ParkFactor label="Overall" v={s.factors.overall} />
                <ParkFactor label="Runs" v={s.factors.runs} />
                <ParkFactor label="Home runs" v={s.factors.hr} />
              </div>
              <div className="fen-park-note fen-help-b">100 = neutral · above favors hitters, below favors pitchers.</div>
            </div>
          ) : null}
          {s.aggregates && s.aggregates.length ? (
            <div className="fen-aggbox">
              <div className="fen-sectlab">This Park, by the Numbers</div>
              <div className="fen-aggs">
                {s.aggregates.map((a, i) => (<div className="agg" key={i}><div className="v fen-chalk">{a.value}</div><div className="l">{a.label}</div></div>))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {s.performers && s.performers.length ? (
        <div className="fen-sr-sect">
          <div className="fen-sectlab">Best &amp; Worst Here <span className="lite fen-help">· who owns this yard, and who it owns</span></div>
          <div className="fen-perfs">
            {s.performers.map((pf, i) => {
              const tone = teamTone(pf.teamId, active);
              return (
                <div className={`fen-perf ${pf.kind}`} key={i}>
                  <div className="pl">{pf.label}</div>
                  <div className={`pn fen-chalk${tone}`}>{pf.name} <span className="tm">{pf.teamAbbr}</span></div>
                  <div className="pv fen-chalk">{pf.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {s.opponents && s.opponents.length ? (
        <div className="fen-sr-sect">
          <div className="fen-sectlab">The Visitors <span className="lite fen-help">· how the league fares at {stadShort}</span></div>
          <div className="fen-opps">
            {s.opponents.map((o, i) => {
              const tone = teamTone(o.teamId, active);
              return (
                <div className={`fen-opp${tone}`} key={i}>
                  <span className="oa fen-chalk">{o.teamAbbr}</span>
                  <span className="orr fen-chalk">{o.record}</span>
                  {o.note ? <span className="on">{o.note}</span> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {s.records && s.records.length ? (
        <div className="fen-sr-sect">
          <div className="fen-sectlab">House of Horrors <span className="lite fen-help">· the park record book &amp; oddities</span></div>
          <div className="fen-recgrid">
            {s.records.map((rec, i) => (
              <div className="fen-rec" key={i}>
                <div className="rl">{rec.label}</div>
                <div className="rv fen-chalk">{rec.value}</div>
                <div className="rh">{rec.holder}{rec.note ? ` · ${rec.note}` : ""}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ===== Player drawer (the per-player dossier) ===== */
const TIE_ICON: Record<TieType, string> = { RIVALRY: "⚔", FEUD: "💢", MENTORSHIP: "🎓", FRIENDSHIP: "🤝", ROMANCE: "❤", HISTORY: "📜" };
const TIE_LABEL: Record<TieType, string> = { RIVALRY: "Rivalry", FEUD: "Feud", MENTORSHIP: "Mentor", FRIENDSHIP: "Friends", ROMANCE: "Romance", HISTORY: "History" };

function ValueSparkline({ points }: { points: ValuePointVM[] }) {
  if (points.length < 2) return null;
  const w = 360, h = 64, pad = 9;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (w - 2 * pad);
  const y = (v: number) => pad + (1 - (v - min) / span) * (h - 2 * pad);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const up = points[points.length - 1].value >= points[0].value;
  return (
    <div className="fen-sparkwrap">
      <svg className="fen-spark" viewBox={`0 0 ${w} ${h}`}>
        <path className={`fen-spark-line ${up ? "up" : "dn"}`} d={d} />
        {points.map((p, i) => <circle key={i} className="fen-spark-dot" cx={x(i)} cy={y(p.value)} r={2.4} />)}
      </svg>
      <div className="fen-sparklabs">{points.map((p, i) => <span key={i}>{p.checkpoint}</span>)}</div>
    </div>
  );
}

function RatingBars({ ratings }: { ratings: RatingBarVM[] }) {
  return (
    <div className="fen-ratings">
      {ratings.map((r) => {
        const delta = r.current - r.base;
        const clamp = (n: number) => Math.max(0, Math.min(100, n));
        return (
          <div className="fen-rating" key={r.label}>
            <div className="rl">{r.label}</div>
            <div className="rbar">
              <span className="fill" style={{ width: `${clamp(r.current)}%` }} />
              <span className="basetick" style={{ left: `${clamp(r.base)}%` }} />
            </div>
            <div className="rv fen-chalk">{r.current}{delta !== 0 ? <span className={`dl ${delta > 0 ? "up" : "dn"}`}>{delta > 0 ? "▲" : "▼"}{Math.abs(delta)}</span> : null}</div>
          </div>
        );
      })}
    </div>
  );
}

function TiesList({ ties }: { ties: TieVM[] }) {
  return (
    <div className="fen-ties">
      {ties.map((t, i) => (
        <div className={`fen-tie${t.potential ? " pot" : ""}`} key={i}>
          <span className="ic">{TIE_ICON[t.type]}</span>
          <div className="who">
            <span className="nm fen-chalk">{t.partner}</span>
            <span className="ty">{TIE_LABEL[t.type]}{t.sinceGame ? ` · since g${t.sinceGame}` : ""}{t.potential ? " · rumored" : ""}</span>
          </div>
          <div className="int"><span className="fill" style={{ width: `${Math.round(t.intensity * 100)}%` }} /></div>
          {t.moraleImpact !== undefined ? <span className={`mi ${t.moraleImpact >= 0 ? "up" : "dn"}`}>{t.moraleImpact >= 0 ? "+" : ""}{t.moraleImpact}/wk</span> : <span className="mi" />}
        </div>
      ))}
    </div>
  );
}

function FameBlock({ fame }: { fame: FameVM }) {
  const max = Math.max(...fame.channels.map((c) => c.value)) || 1;
  return (
    <div className="fen-fame">
      <div className="fame-top">
        <div className="heat"><div className="v fen-chalk fen-y">{fame.heat}</div><div className="l">Fame heat</div></div>
        <div className="immo">
          <div className="l">Immortality · {fame.immortalityLabel}</div>
          <div className="meter">{[1, 2, 3, 4, 5].map((n) => <span key={n} className={`seg${n <= fame.immortality ? " on" : ""}`} />)}</div>
        </div>
      </div>
      <div className="fame-channels">
        {fame.channels.map((c, i) => (
          <div className="ch" key={i}>
            <span className="cl">{c.label}</span>
            <span className="cbar"><span className="fill" style={{ width: `${Math.round((c.value / max) * 100)}%` }} /></span>
            <span className="cv fen-chalk">{c.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DrawerSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="fen-dsect">
      <div className="fen-sectlab">{title}{hint ? <span className="lite fen-help"> · {hint}</span> : null}</div>
      {children}
    </div>
  );
}

/** Best→worst, the order the user picks from. JUICED↑ … HURT↓; FIT is neutral/default. */
const FITNESS_ORDER: FitnessState[] = ["JUICED", "FIT", "WELL", "STRAINED", "WEAK", "HURT"];

/**
 * Editable fitness chip (the franchise analogue of elimination mode's condition selector). Local
 * state shows the pick instantly; onSet persists it (and the adapter reloads), so it carries into
 * the next game launch. Keyed by player id by the caller so it re-inits when the drawer switches.
 */
function FitnessPicker({ current, onSet }: { current: FitnessState; onSet: (state: FitnessState) => Promise<RosterActionResult> }) {
  const [sel, setSel] = useState<FitnessState>(current);
  const [open, setOpen] = useState(false);
  const def = FITNESS_STATES[sel];
  const choose = (state: FitnessState) => { setSel(state); setOpen(false); void onSet(state); };
  return (
    <div className="fen-fitpick">
      <button type="button" className="chip fen-fitpick-btn" onClick={() => setOpen((v) => !v)} aria-label="Set fitness">
        Fitness · <span style={{ color: def.color }}>{def.emoji} {def.displayName}</span> <span className="caret">▾</span>
      </button>
      {open ? (
        <div className="fen-fitpick-menu" role="listbox">
          {FITNESS_ORDER.map((state) => {
            const fd = FITNESS_STATES[state];
            return (
              <button type="button" key={state} className={`fen-fitpick-opt${state === sel ? " on" : ""}`} onClick={() => choose(state)} role="option" aria-selected={state === sel}>
                <span className="ic" style={{ color: fd.color }}>{fd.emoji}</span>
                <span className="nm">{fd.displayName}</span>
                <span className="mu">×{fd.multiplier.toFixed(2)}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function PlayerDrawer({ player, onClose, onSendDown, onSetFitness }: { player: PlayerRowVM; onClose: () => void; onSendDown?: () => void; onSetFitness?: (state: FitnessState) => Promise<RosterActionResult> }) {
  const d = player.detail;
  const m = player.morale;
  return (
    <>
      <div className="fen-drawer-back" onClick={onClose} />
      <div className="fen-drawer" role="dialog" aria-label={`${player.name} dossier`}>
        <button type="button" className="fen-drawer-x" onClick={onClose} aria-label="Close">×</button>
        {onSendDown ? (
          <div className="fen-drawer-act">
            <button type="button" className="fen-callup ghost" onClick={onSendDown}>▼ Send to farm</button>
          </div>
        ) : null}
        <div className="fen-dhead">
          <div className="dnum fen-chalk">{player.number ?? ""}</div>
          <div className="dident">
            <div className="dname fen-chalk fen-y">{player.name}</div>
            {d?.nickname ? <div className="dnick">"{d.nickname}"</div> : null}
            <div className="dmeta">{[player.position, d?.age ? `age ${d.age}` : null, d?.bats && d?.throws ? `B/T ${d.bats}/${d.throws}` : null, d?.grade ? `grade ${d.grade}` : null].filter(Boolean).join(" · ")}</div>
            <div className="dbadges">
              {player.designation ? <span className={`fen-rbadge${player.designation.kind === "albatross" ? " alb" : ""}`}>{player.designation.label}</span> : null}
              {d?.careerPhase ? <span className="dphase">{d.careerPhase}</span> : null}
              {player.war !== undefined ? <span className="dwar">WAR {player.war.toFixed(1)}</span> : null}
            </div>
          </div>
        </div>
        {(d?.mojo || d?.fitness || d?.retirementNote || onSetFitness) ? (
          <div className="fen-dform">
            {d?.mojo ? <span className={`chip ${d.mojo.tone ?? "flat"}`}>Mojo · {d.mojo.label}</span> : null}
            {onSetFitness ? (
              <FitnessPicker key={player.id} current={d?.fitnessState ?? "FIT"} onSet={onSetFitness} />
            ) : d?.fitness ? (
              <span className={`chip ${d.fitness.tone ?? "flat"}`}>Fitness · {d.fitness.label}</span>
            ) : null}
            {d?.retirementNote ? <span className="chip warn">{d.retirementNote}</span> : null}
          </div>
        ) : null}
        {d?.designationEffect ? <div className="fen-deffect">{d.designationEffect}</div> : null}
        {d?.bio ? <div className="fen-dbio">{d.bio}</div> : null}

        <div className="fen-decon">
          <div className="e"><div className="l">Salary</div><div className="v fen-chalk">{player.salary !== undefined ? <Money value={player.salary} /> : "—"}</div></div>
          <div className="e"><div className="l">True Value</div><div className="v fen-chalk">{player.trueValue !== undefined ? <Money value={player.trueValue} /> : "—"}</div></div>
          <div className="e"><div className="l">Net</div><div className="v fen-chalk">{player.valueGap !== undefined ? <span className={player.valueGap >= 0 ? "fen-net up" : "fen-net dn"}>{player.valueGap >= 0 ? "+" : "−"}<Money value={Math.abs(player.valueGap)} /></span> : "—"}</div></div>
        </div>

        {d?.valueTrend && d.valueTrend.length > 1 ? <DrawerSection title="Value trend" hint="True Value by checkpoint"><ValueSparkline points={d.valueTrend} /></DrawerSection> : null}
        {d?.ratings && d.ratings.length ? <DrawerSection title="Ratings" hint="bar = now · tick = draft-day"><RatingBars ratings={d.ratings} /></DrawerSection> : null}
        {d?.spray && d.spray.length ? <DrawerSection title="Spray chart" hint={d.spray[0]?.role === "pitching" ? "contact off him" : "where he hits"}><SprayPanel spray={d.spray} /></DrawerSection> : null}
        {/* Hidden personality modifiers (loyalty/ambition/resilience/charisma) are HIDDEN by product rule
            on ALL players — only the public temperament string is shown. See LIVING_SEASON_UIUX_COVERAGE_MAP. */}
        {d?.personality ? (
          <DrawerSection title="Makeup" hint="public temperament">
            <div className="fen-personality">{d.personality}</div>
          </DrawerSection>
        ) : null}
        {(d?.traitsCurrent?.length || d?.traitTimeline?.length) ? (
          <DrawerSection title="Traits">
            {d?.traitsCurrent && d.traitsCurrent.length ? <div className="fen-traitchips">{d.traitsCurrent.map((t, i) => <span className="chip" key={i}>{t}</span>)}</div> : null}
            {d?.traitTimeline && d.traitTimeline.length ? (
              <div className="fen-traittl">
                {d.traitTimeline.map((e, i) => (
                  <div className={`tl ${e.valence}`} key={i}>
                    <span className="ar">{e.valence === "gain" ? "▲" : "▼"}</span>
                    <span className="tx">{e.valence === "gain" ? "Earned" : "Lost"} <b>{e.trait}</b>{e.displaces ? ` (displaced ${e.displaces})` : ""}</span>
                    <span className="g">g{e.atGame}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </DrawerSection>
        ) : null}

        {m ? (
          <DrawerSection title="Morale" hint={m.state}>
            <div className="fen-dmorale">
              <span className={`big fen-chalk ${moraleClass(m.value)}`}>{m.value} <span className="ar">{arrow(m.trend)}</span></span>
              {m.arc ? <span className="arc">{m.arc}</span> : null}
            </div>
            {d?.moraleSources && d.moraleSources.length ? (
              <div className="fen-msources">
                {d.moraleSources.map((src, i) => (
                  <div className="src" key={i}><span className="sl">{src.label}</span><span className={`sv ${src.value >= 0 ? "up" : "dn"}`}>{src.value >= 0 ? "+" : ""}{src.value}</span></div>
                ))}
              </div>
            ) : null}
            {m.history.length ? m.history.map((h, i) => (
              <div className="fen-entry" key={i}><span className={`d ${h.delta >= 0 ? "up" : "dn"}`}>{h.delta >= 0 ? "+" : ""}{h.delta}</span><span><span className="rs">{h.reason}</span><br /><span className="wk">{h.week}</span></span></div>
            )) : <div className="fen-entry"><span className="rs fen-muted">No recorded swings yet this season.</span></div>}
          </DrawerSection>
        ) : null}

        {d?.ties && d.ties.length ? <DrawerSection title="Ties" hint="clubhouse relationships"><TiesList ties={d.ties} /></DrawerSection> : null}
        {d?.fame ? <DrawerSection title="Fame"><FameBlock fame={d.fame} /></DrawerSection> : null}
        {(d?.careerLine && d.careerLine.length) || (d?.careerAwards && d.careerAwards.length) ? (
          <DrawerSection title="Career" hint="across all seasons">
            {d?.careerLine && d.careerLine.length ? (
              <div className="fen-career">
                {d.careerLine.map((c, i) => (<div className="cl" key={i}><div className="v fen-chalk">{c.value}</div><div className="l">{c.label}</div></div>))}
              </div>
            ) : null}
            {d?.careerAwards && d.careerAwards.length ? (
              <div className="fen-careeraw">{d.careerAwards.map((a, i) => (<span className="aw" key={i}>{a.label} ×{a.count}</span>))}</div>
            ) : null}
          </DrawerSection>
        ) : null}
        {d?.milestones && d.milestones.length ? (
          <DrawerSection title="Milestones">
            {d.milestones.map((ms, i) => (
              <div className={`fen-ms${ms.achieved ? " got" : ""}`} key={i}>
                <span className="ck">{ms.achieved ? "★" : "○"}</span>
                <span className="mt">{ms.label}{ms.detail ? <span className="md"> · {ms.detail}</span> : null}</span>
                {ms.atLabel ? <span className="ma">{ms.atLabel}</span> : null}
              </div>
            ))}
          </DrawerSection>
        ) : null}

        {!d ? <div className="fen-empty">Full dossier fills in as the season runs.</div> : null}
      </div>
    </>
  );
}

/* ===== Almanac (league tab) ===== */
function Leaderboard({ board, active }: { board: LeaderboardVM; active: ActiveTeamVM }) {
  return (
    <div className="fen-lb">
      <div className="fen-lb-stat">{board.stat}</div>
      {board.entries.map((e) => {
        const tone = teamTone(e.teamId, active);
        return (
          <div className={`fen-lb-row${tone}`} key={e.rank + e.name}>
            <span className="rk">{e.rank}</span>
            <span className="nm fen-chalk">{e.name}</span>
            <span className="tm">{e.teamAbbr}</span>
            <span className="vl fen-chalk">{e.value}</span>
          </div>
        );
      })}
    </div>
  );
}

function AlmanacTab({ hub, active }: { hub: HubVM; active: ActiveTeamVM }) {
  const a = hub.almanac;
  if (!a) return <div className="fen-empty">The almanac is bare this early in the season.</div>;
  return (
    <div className="fen-almanac">
      <div className="fen-sectlab">Batting Leaders <span className="lite fen-help">· your club in yellow, the rival in red</span></div>
      <div className="fen-lb-grid">
        {a.battingLeaders.map((b, i) => <Leaderboard key={i} board={b} active={active} />)}
      </div>
      <div className="fen-sectlab fen-almanac-sect2">Pitching Leaders</div>
      <div className="fen-lb-grid">
        {a.pitchingLeaders.map((b, i) => <Leaderboard key={i} board={b} active={active} />)}
      </div>
      {a.trophyCase && a.trophyCase.length ? (
        <>
          <div className="fen-sectlab fen-almanac-sect2">The Trophy Case</div>
          <div className="fen-trophies">
            {a.trophyCase.map((t, i) => (
              <div className={`fen-trophy${t.teamId === active.id ? " you" : ""}`} key={i}>
                <div className="tl">{t.label}</div>
                <div className="th fen-chalk">{t.holder}</div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ===== Schedule (team tab) ===== */
function ScheduleRow({ g, actions }: { g: ScheduleGameVM; actions?: FranchiseLensActions }) {
  return (
    <div className={`fen-sgame${g.isNext ? " next" : ""}`}>
      <div className="sd">{g.date}</div>
      <div className="sm fen-chalk">{g.home ? "vs" : "@"} {g.opponent}</div>
      {g.result ? (
        <div className={`sr ${g.result.win ? "w" : "l"}`}>{g.result.win ? "W" : "L"} {g.result.teamScore}–{g.result.oppScore}</div>
      ) : (
        <div className="fen-sched-actions">
          {g.isNext ? (
            <button
              type="button"
              className="fen-sched-play"
              onClick={() => actions?.onScoreGame?.(g.scheduleGameId)}
              disabled={!actions?.onScoreGame}
            >
              SCORE
            </button>
          ) : null}
          <button
            type="button"
            className="fen-sched-lite"
            onClick={() => actions?.onScoreOnlyGame?.(g.scheduleGameId)}
            disabled={!actions?.onScoreOnlyGame}
          >
            Score Only
          </button>
          <button
            type="button"
            className="fen-sched-lite danger"
            onClick={() => actions?.onSkipGame?.(g.scheduleGameId)}
            disabled={!actions?.onSkipGame}
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
}

function ScheduleTab({ hub, active, actions }: { hub: HubVM; active: ActiveTeamVM; actions?: FranchiseLensActions }) {
  const sc = hub.schedule;
  if (!sc) return <div className="fen-empty">No schedule loaded for {active.name} yet.</div>;
  return (
    <div className="fen-sched">
      {sc.deadlineNote ? <div className="fen-sched-deadline">⚑ {sc.deadlineNote}</div> : null}
      <div className="fen-sched-grid">
        <div className="fen-sched-col">
          <div className="fen-sectlab">Coming Up</div>
          {sc.upcoming.length ? sc.upcoming.map((g, i) => <ScheduleRow key={i} g={g} actions={actions} />) : <div className="fen-empty">Nothing on the docket.</div>}
        </div>
        <div className="fen-sched-col">
          <div className="fen-sectlab">Recent</div>
          {sc.recent.length ? sc.recent.map((g, i) => <ScheduleRow key={i} g={g} actions={actions} />) : <div className="fen-empty">No games played yet.</div>}
        </div>
      </div>
    </div>
  );
}

/* ===== Playoffs (read-only bracket view of the franchise's October) ===== */
function PlayoffMatchupCard({ m }: { m: PlayoffMatchupVM }) {
  const decided = m.status === "COMPLETED";
  const higherWon = decided && m.winnerAbbr === m.higherSeedAbbr;
  const lowerWon = decided && m.winnerAbbr === m.lowerSeedAbbr;
  return (
    <div className={`fen-po-card${m.involvesActive ? " you" : ""}${decided ? " done" : ""}`}>
      <div className={`fen-po-team${higherWon ? " win" : ""}`}>
        <span className="seed">{m.higherSeed}</span>
        <span className="ab fen-chalk">{m.higherSeedAbbr}</span>
        <span className="nm">{m.higherSeedName}</span>
        <span className={`sc${higherWon ? " fen-y" : ""}`}>{m.higherSeedWins}</span>
        {higherWon ? <span className="adv">✓</span> : null}
      </div>
      <div className={`fen-po-team${lowerWon ? " win" : ""}`}>
        <span className="seed">{m.lowerSeed}</span>
        <span className="ab fen-chalk">{m.lowerSeedAbbr}</span>
        <span className="nm">{m.lowerSeedName}</span>
        <span className={`sc${lowerWon ? " fen-y" : ""}`}>{m.lowerSeedWins}</span>
        {lowerWon ? <span className="adv">✓</span> : null}
      </div>
      <div className="fen-po-meta">
        Best of {m.bestOf}
        {m.status === "IN_PROGRESS" ? " · underway" : m.status === "PENDING" ? " · awaiting" : ""}
      </div>
    </div>
  );
}

function PlayoffsTab({ hub, active }: { hub: HubVM; active: ActiveTeamVM }) {
  const po = hub.playoffs;
  if (!po || po.rounds.length === 0) {
    return <div className="fen-empty">The playoffs haven't started.</div>;
  }
  return (
    <div className="fen-po">
      {po.status === "COMPLETED" && po.championAbbr ? (
        <div className={`fen-po-champ${active.abbr === po.championAbbr ? " you" : ""}`}>
          <div className="fen-po-trophy">🏆</div>
          <div className="fen-po-champbody">
            <div className="fen-po-champlab">Champions</div>
            <div className="fen-po-champname fen-chalk fen-y">{po.championName ?? po.championAbbr}</div>
            {po.mvpName ? (
              <div className="fen-po-mvp">Series MVP · <b className="fen-chalk">{po.mvpName}</b>{po.mvpStats ? ` · ${po.mvpStats}` : ""}</div>
            ) : null}
          </div>
        </div>
      ) : null}
      {po.rounds.map((round) => (
        <div className="fen-po-round" key={round.round}>
          <div className="fen-sectlab">{round.roundName}</div>
          {round.matchups.length ? (
            <div className="fen-po-grid">
              {round.matchups.map((m, i) => <PlayoffMatchupCard key={i} m={m} />)}
            </div>
          ) : (
            <div className="fen-empty">No series set for this round.</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ===== Trades (read-only league transaction ledger for the season) ===== */
function TradeCard({ t }: { t: TradeCardVM }) {
  return (
    <div className={`fen-trade-card${t.involvesActive ? " you" : ""}`}>
      <div className="fen-trade-head">
        <span className="fen-trade-when">{t.date}</span>
        {t.cash ? <span className="fen-trade-cash fen-y">${t.cash.toLocaleString()}</span> : null}
      </div>
      <div className="fen-trade-body">
        <div className="fen-trade-side">
          <div className="fen-trade-team fen-chalk"><span className="ab">{t.team1.teamAbbr}</span>{t.team1.teamName}</div>
          <div className="fen-trade-lab">sends</div>
          {t.team1.players.length ? (
            t.team1.players.map((p, i) => <div className="fen-trade-pl" key={i}>{p}</div>)
          ) : (
            <div className="fen-trade-pl soft">—</div>
          )}
        </div>
        <div className="fen-trade-swap">⇄</div>
        <div className="fen-trade-side">
          <div className="fen-trade-team fen-chalk"><span className="ab">{t.team2.teamAbbr}</span>{t.team2.teamName}</div>
          <div className="fen-trade-lab">sends</div>
          {t.team2.players.length ? (
            t.team2.players.map((p, i) => <div className="fen-trade-pl" key={i}>{p}</div>)
          ) : (
            <div className="fen-trade-pl soft">—</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TradesTab({ hub, active, actions }: { hub: HubVM; active: ActiveTeamVM; actions?: FranchiseLensActions }) {
  const [builderOpen, setBuilderOpen] = useState(false);
  const tr = hub.trades;
  const trades = tr?.trades ?? [];
  const moves = tr?.moves ?? [];
  const canPropose = !!actions?.onExecuteTrade && !!hub.tradeCandidates && hub.tradeCandidates.length > 1;

  return (
    <div className="fen-trades">
      <div className="fen-moves-head">
        <div className="fen-sectlab">The Wire <span className="lite fen-help">· every move this season · your club in yellow</span></div>
        {canPropose ? (
          <button type="button" className="fen-callup" onClick={() => setBuilderOpen(true)}>⇄ Propose a trade</button>
        ) : null}
      </div>

      {trades.length === 0 && moves.length === 0 ? (
        <div className="fen-empty">No moves yet this season.</div>
      ) : null}

      {trades.length ? (
        <>
          <div className="fen-movelab">Trades</div>
          {trades.map((t, i) => <TradeCard key={i} t={t} />)}
        </>
      ) : null}

      {moves.length ? (
        <>
          <div className="fen-movelab">Roster moves</div>
          <div className="fen-movelist">
            {moves.map((m, i) => (
              <div className={`fen-moverow${m.involvesActive ? " you" : ""}`} key={i}>
                <span className={`fen-moveic ${m.kind}`}>{m.icon}</span>
                <span className="fen-movewhat fen-chalk">{m.label}</span>
                <span className="fen-movewho fen-chalk">{m.playerName ?? "—"}</span>
                {m.teamAbbr ? <span className="fen-moveteam">{m.teamAbbr}</span> : null}
                {m.detail ? <span className="fen-movedetail fen-help">{m.detail}</span> : null}
                <span className="fen-movewhen">{m.date}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {builderOpen && actions?.onExecuteTrade && hub.tradeCandidates ? (
        <TradeBuilder
          candidates={hub.tradeCandidates}
          active={active}
          onExecuteTrade={actions.onExecuteTrade}
          onClose={() => setBuilderOpen(false)}
        />
      ) : null}
    </div>
  );
}

/**
 * Propose-a-trade builder. Your club is always the source; pick a counterparty, then the players each
 * side ships. Only MLB-rostered (revealed) players are offered — gate-safe — and the engine still
 * refuses unrevealed prospects, surfacing that error inline.
 */
function TradeBuilder({
  candidates, active, onExecuteTrade, onClose,
}: {
  candidates: TradeCandidateTeamVM[];
  active: ActiveTeamVM;
  onExecuteTrade: (proposal: TradeProposal) => Promise<RosterActionResult>;
  onClose: () => void;
}) {
  const source = candidates.find((c) => c.teamId === active.id) ?? candidates.find((c) => c.isActive);
  const others = candidates.filter((c) => c.teamId !== source?.teamId);
  const [targetId, setTargetId] = useState<string>(others[0]?.teamId ?? "");
  const [out, setOut] = useState<Set<string>>(new Set());
  const [inc, setInc] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const target = others.find((c) => c.teamId === targetId);

  const toggle = (set: Set<string>, setSet: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSet(next);
  };
  const ready = !!source && !!target && out.size > 0 && inc.size > 0 && !busy;

  const run = async () => {
    if (!source || !target) return;
    setBusy(true);
    setErr(null);
    const res = await onExecuteTrade({
      sourceTeamId: source.teamId,
      targetTeamId: target.teamId,
      outgoingPlayerIds: Array.from(out),
      incomingPlayerIds: Array.from(inc),
    });
    setBusy(false);
    if (res.success) onClose();
    else setErr(res.message ?? "The trade couldn't be completed.");
  };

  return (
    <MomentShell
      accent="ceremony"
      kicker="Roster move · trade"
      title={`Propose a trade — ${source?.teamAbbr ?? "your club"}`}
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <button type="button" className="fen-cp-allbtn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="fen-cp-donebtn" onClick={run} disabled={!ready}>
            {busy ? "Working…" : "Execute trade"}
          </button>
        </>
      }
    >
      <div className="fen-tb-teampick">
        <span className="fen-help">Trade with</span>
        <select className="fen-tb-select" value={targetId} onChange={(e) => { setTargetId(e.target.value); setInc(new Set()); }}>
          {others.map((c) => <option key={c.teamId} value={c.teamId}>{c.teamName}</option>)}
        </select>
      </div>
      <div className="fen-tb-cols">
        <div className="fen-tb-col">
          <div className="fen-movelab">{source?.teamAbbr ?? "You"} send</div>
          <div className="fen-tb-list">
            {(source?.players ?? []).map((p) => (
              <button type="button" key={p.id} className={`fen-tb-pl${out.has(p.id) ? " on" : ""}`} onClick={() => toggle(out, setOut, p.id)}>
                <span className="pos">{p.position}</span>
                <span className="nm">{p.name}</span>
                {p.salary !== undefined ? <Money value={p.salary} className="sal" /> : null}
              </button>
            ))}
          </div>
        </div>
        <div className="fen-tb-swap">⇄</div>
        <div className="fen-tb-col">
          <div className="fen-movelab">{target?.teamAbbr ?? "They"} send</div>
          <div className="fen-tb-list">
            {(target?.players ?? []).map((p) => (
              <button type="button" key={p.id} className={`fen-tb-pl${inc.has(p.id) ? " on" : ""}`} onClick={() => toggle(inc, setInc, p.id)}>
                <span className="pos">{p.position}</span>
                <span className="nm">{p.name}</span>
                {p.salary !== undefined ? <Money value={p.salary} className="sal" /> : null}
              </button>
            ))}
          </div>
        </div>
      </div>
      {err ? <div className="fen-cp-sub fen-r" style={{ marginTop: 10 }}>{err}</div> : null}
    </MomentShell>
  );
}

/* ===== Checkpoint confirmation worklist (moment-driven takeover) ===== */
function CheckpointTakeover({ cp, onClose }: { cp: CheckpointVM; onClose: () => void }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setDone((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const total = cp.players.length;
  const entered = done.size;
  const allDone = total > 0 && entered >= total;
  return (
    <div className="fen-cp" role="dialog" aria-label={cp.label}>
      <div className="fen-cp-panel fen-aged">
        <div className="fen-content">
          <div className="fen-cp-head">
            <div>
              <div className="fen-cp-kick">⚠ The league just shifted</div>
              <h2 className="fen-chalk fen-y">{cp.label}</h2>
              <div className="fen-cp-sub">Type each <b>new number</b> into SMB4, then check the player off. {cp.pctLabel ? `Fired at ${cp.pctLabel}.` : ""}</div>
            </div>
            <button type="button" className="fen-cp-x" onClick={onClose} aria-label="Close">×</button>
          </div>
          <div className="fen-cp-prog">
            <span className="bar"><span className="fill" style={{ width: `${total ? Math.round((entered / total) * 100) : 0}%` }} /></span>
            <span className="lab fen-chalk">{entered} of {total} entered</span>
          </div>
          <div className="fen-cp-grid">
            {cp.players.map((pl) => {
              const ok = done.has(pl.id);
              return (
                <div className={`fen-cp-card${ok ? " ok" : ""}`} key={pl.id}>
                  <div className="ph">
                    <span className="pos">{pl.position}</span>
                    <span className="nm fen-chalk">{pl.name}</span>
                    <button type="button" className={`chk${ok ? " on" : ""}`} onClick={() => toggle(pl.id)}>{ok ? "✓ entered" : "mark entered"}</button>
                  </div>
                  <div className="changes">
                    {pl.ratingChanges.map((r, i) => {
                      const d = r.to - r.from;
                      return (
                        <div className="rc" key={i}>
                          <span className="rl">{r.label}</span>
                          <span className="rf">{r.from}</span><span className="ar">→</span><span className="rt fen-y">{r.to}</span>
                          <span className={`dl ${d >= 0 ? "up" : "dn"}`}>{d >= 0 ? "▲" : "▼"}{Math.abs(d)}</span>
                        </div>
                      );
                    })}
                    {pl.traitChanges.map((t, i) => (
                      <div className={`tc ${t.valence}`} key={i}>
                        <span className="ar">{t.valence === "gain" ? "＋" : "－"}</span>
                        <span>{t.valence === "gain" ? "Gain" : "Lose"} <b className={t.valence === "gain" ? "fen-y" : ""}>{t.trait}</b>{t.displaces ? ` (replaces ${t.displaces})` : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="fen-cp-foot">
            <button type="button" className="fen-cp-allbtn" onClick={() => setDone(new Set(cp.players.map((p) => p.id)))}>Mark all entered</button>
            <button type="button" className="fen-cp-donebtn" onClick={onClose}>{allDone ? "All set — close" : "Close for now"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Tentpole takeovers (firing / rebrand / ceremony / event) ===== */
function MomentShell({ accent, kicker, title, onClose, children, footer }: { accent?: string; kicker: string; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className={`fen-cp fen-moment${accent ? " " + accent : ""}`} role="dialog" aria-label={title}>
      <div className="fen-cp-panel fen-aged">
        <div className="fen-content">
          <div className="fen-cp-head">
            <div>
              <div className="fen-cp-kick">{kicker}</div>
              <h2 className="fen-chalk fen-y">{title}</h2>
            </div>
            <button type="button" className="fen-cp-x" onClick={onClose} aria-label="Close">×</button>
          </div>
          {children}
          {footer ? <div className="fen-cp-foot">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

function FiringTakeover({ m, onClose }: { m: FiringMomentVM; onClose: () => void }) {
  return (
    <MomentShell accent="fire" kicker="⚠ A change in the dugout" title="You've made a managerial change" onClose={onClose}
      footer={<><button type="button" className="fen-cp-allbtn" onClick={onClose}>Reconsider</button><button type="button" className="fen-cp-donebtn" onClick={onClose}>Confirm the change</button></>}>
      <div className="fen-moment-lead">Out: <b className="fen-chalk">{m.outgoing}</b> <span className="rec">({m.outgoingRecord})</span> — {m.reason}</div>
      <div className="fen-moment-grid2">
        <div className="fen-moment-box">
          <div className="bh">Clubhouse ripple</div>
          {m.ripples.map((r, i) => (
            <div className="fen-mrip" key={i}><span className={`d ${r.delta >= 0 ? "up" : "dn"}`}>{r.delta >= 0 ? "+" : ""}{r.delta}</span><span className="nm fen-chalk">{r.name}</span><span className="nt">{r.note}</span></div>
          ))}
          <div className="fen-mrip foot">Fans: {m.fanReaction}</div>
        </div>
        <div className="fen-moment-box">
          <div className="bh">The interim skipper</div>
          <div className="fen-moment-new fen-chalk fen-y">{m.incoming}</div>
          <div className="fen-moment-note">{m.incomingNote}</div>
        </div>
      </div>
    </MomentShell>
  );
}

function RebrandTakeover({ m, onClose }: { m: RebrandMomentVM; onClose: () => void }) {
  return (
    <MomentShell accent="rebrand" kicker="🏟 A fresh start" title="Relocate & rebrand" onClose={onClose}
      footer={<><button type="button" className="fen-cp-allbtn" onClick={onClose}>Not yet</button><button type="button" className="fen-cp-donebtn" onClick={onClose}>Make it official</button></>}>
      <div className="fen-moment-lead">Fan morale has bottomed out. A clean break resets the franchise.</div>
      <div className="fen-rebrand">
        <div className="side old"><div className="lab">Was</div><div className="nm fen-chalk">{m.oldName}</div>{m.oldCity ? <div className="ct">{m.oldCity}</div> : null}</div>
        <div className="arrow">→</div>
        <div className="side new"><div className="lab">Now</div><div className="nm fen-chalk fen-y">{m.newName}</div><div className="ct">{m.newCity} · {m.newPark}</div></div>
      </div>
      <div className="fen-moment-notes">
        <div>• {m.fanReset}</div>
        <div>• {m.fameNote}</div>
        <div>• {m.designationNote}</div>
      </div>
    </MomentShell>
  );
}

function CeremonyTakeover({ m, active, onClose }: { m: CeremonyMomentVM; active: ActiveTeamVM; onClose: () => void }) {
  return (
    <MomentShell accent="ceremony" kicker="🏆 The hardware comes home" title={m.title} onClose={onClose}
      footer={<button type="button" className="fen-cp-donebtn" onClick={onClose}>Raise the banner</button>}>
      <div className="fen-champ">Champions: <b className="fen-chalk fen-y">{m.champion}</b></div>
      <div className="fen-ceremony">
        {m.awards.map((a, i) => {
          const you = a.teamAbbr === active.abbr;
          return (
            <div className={`fen-cer${you ? " you" : ""}`} key={i}>
              <span className="cat">{a.category}</span>
              <span className="win fen-chalk">{a.winner} <span className="tm">{a.teamAbbr}</span></span>
            </div>
          );
        })}
      </div>
      {m.note ? <div className="fen-moment-note">{m.note}</div> : null}
    </MomentShell>
  );
}

function EventTakeover({ m, active, onClose }: { m: EventMomentVM; active: ActiveTeamVM; onClose: () => void }) {
  const you = m.teamAbbr === active.abbr;
  return (
    <MomentShell accent="event" kicker="📋 An event needs your call" title={m.kind} onClose={onClose}
      footer={m.options.map((o, i) => <button type="button" key={i} className={o.primary ? "fen-cp-donebtn" : "fen-cp-allbtn"} onClick={onClose}>{o.label}</button>)}>
      <div className="fen-moment-lead"><b className={`fen-chalk${you ? " fen-y" : ""}`}>{m.player}</b> <span className="tm">{m.teamAbbr}</span></div>
      <div className="fen-moment-box"><div className="bh">If you confirm</div><div className="fen-moment-note">{m.effect}</div></div>
      {m.reporterTake ? <div className="fen-moment-take">"{m.reporterTake}" <span className="att">— the beat</span></div> : null}
    </MomentShell>
  );
}

export default FranchiseLensHub;
