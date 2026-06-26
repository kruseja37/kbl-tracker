import { Fragment, useState } from "react";

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
}

export interface NextGameVM {
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
export interface NewsVM {
  editionLabel: string;
  volumeLabel: string;
  priceLabel?: string;
  lead?: { kicker: string; headline: string; body: string; byline: string; dramaticWeight?: number };
  stories: NewsStoryVM[];        // ranked by dramaticWeight (the view sorts)
  recaps?: GameRecapVM[];        // the per-game recap stream (GameStory)
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
export interface TieVM { partner: string; type: TieType; intensity: number; sinceGame?: number; potential?: boolean }
export interface FameVM {
  heat: number;
  immortality: number;          // reachFloor 0–5
  immortalityLabel: string;     // "Local", "Immortal", …
  channels: { label: string; value: number }[];  // wpa_spine / iconic_event / status / defensive / role_player
}
export interface PlayerDetailVM {
  age?: number; bats?: string; throws?: string; grade?: string; bio?: string;
  valueTrend?: ValuePointVM[];
  ratings?: RatingBarVM[];      // base→current (mergeRatingsOverlays)
  spray?: SprayRoleVM[];        // this player's own spray — batting (where he hits) / pitching (contact off him) / fielding
  traitsCurrent?: string[];
  traitTimeline?: TraitTimelineVM[];
  ties?: TieVM[];
  fame?: FameVM;
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
export interface StandingsRacesVM {
  divisions: StandingsDivisionVM[];
  races: AwardRaceVM[];
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
export interface StadiumVM {
  name: string;
  nickname?: string;
  city?: string;
  dims?: { lf: number; cf: number; rf: number };
  factors?: { overall: number; runs: number; hr: number; confidence: "LOW" | "MEDIUM" | "HIGH"; source?: string };
  spray: SprayRoleVM[];                          // batting / pitching / fielding
  records?: StadiumRecordVM[];                   // the house-of-horrors catalog
}

export interface HubVM {
  home?: SeasonHomeVM;
  news?: NewsVM;
  pulse: PulseVM;
  roster: PlayerRowVM[];
  standings?: StandingsRacesVM;
  stadium?: StadiumVM;
  loading?: boolean;
  emptyNote?: string;
}

export interface FranchiseLensHubProps {
  teams: TeamPickerVM[];
  active: ActiveTeamVM;
  hub: HubVM;
  onSelectTeam: (teamId: string) => void;
  onBack?: () => void;
}

const TABS = ["The Clubhouse", "Roster", "Stadium", "Tootwhistle Times"] as const;
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

export function FranchiseLensHub({ teams, active, hub, onSelectTeam }: FranchiseLensHubProps) {
  const [tab, setTab] = useState<string>("The Clubhouse");
  const [openMorale, setOpenMorale] = useState<string | null>(null); // playerId | "fan" | null
  const [openPlayer, setOpenPlayer] = useState<PlayerRowVM | null>(null);
  const [helpOn, setHelpOn] = useState(false);

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
              <SeasonHome hub={hub} />
            ) : tab === "Roster" ? (
              <RosterTab
                active={active}
                hub={hub}
                openMorale={openMorale}
                setOpenMorale={setOpenMorale}
                onOpenPlayer={setOpenPlayer}
              />
            ) : tab === "Tootwhistle Times" ? (
              <NewspaperTab hub={hub} active={active} />
            ) : tab === "Standings & Races" ? (
              <StandingsRacesTab hub={hub} active={active} />
            ) : tab === "Stadium" ? (
              <StadiumTab hub={hub} active={active} />
            ) : (
              <div className="fen-empty">"{tab}" comes next.</div>
            )}
          </div>
        </div>
      </div>
      <button type="button" className="fen-helpbtn" onClick={() => setHelpOn((v) => !v)}>? Help</button>
      {openPlayer ? <PlayerDrawer player={openPlayer} onClose={() => setOpenPlayer(null)} /> : null}
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

function SeasonHome({ hub }: { hub: HubVM }) {
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
              <button type="button" className={`fen-icard ${c.kind}`} key={i}>
                <span className="ic">{c.icon}</span>
                <div className="bd"><div className="t">{c.title}</div><div className="d">{c.detail}</div></div>
                {c.cta ? <span className="go fen-help">{c.cta} →</span> : null}
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
              <button type="button" className="fen-bigplay">▶  PLAY BALL</button>
              <div className="fen-simrow"><button type="button" className="fen-simbtn">Sim this game</button><button type="button" className="fen-simbtn">Sim the week</button></div>
              {home.nextGame.pulse ? <div className="fen-gpulse">{home.nextGame.pulse}</div> : null}
            </div>
          </div>
        ) : null}
      </div>
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
      </div>
    </div>
  );
}

function RosterTab({
  active, hub, openMorale, setOpenMorale, onOpenPlayer,
}: {
  active: ActiveTeamVM;
  hub: HubVM;
  openMorale: string | null;
  setOpenMorale: (v: string | null) => void;
  onOpenPlayer: (p: PlayerRowVM) => void;
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
    </>
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

function StandingsRacesTab({ hub, active }: { hub: HubVM; active: ActiveTeamVM }) {
  const sr = hub.standings;
  if (!sr) return <div className="fen-empty">No league standings yet this season.</div>;
  return (
    <div className="fen-sr">
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
  return (
    <div className="fen-stadium">
      <div className="fen-stad-head">
        <div className="fen-stad-name fen-chalk fen-y">{s.nickname ? `"${s.nickname}"` : s.name}</div>
        <div className="fen-stad-sub">{[s.nickname ? s.name : null, s.city].filter(Boolean).join(" · ")}</div>
        {s.dims ? (
          <div className="fen-stad-dims">
            <span><b>LF</b> {s.dims.lf}</span><span><b>CF</b> {s.dims.cf}</span><span><b>RF</b> {s.dims.rf}</span>
          </div>
        ) : null}
      </div>

      <div className="fen-stad-grid">
        <div className="fen-stad-spray">
          <div className="fen-sectlab">Spray Chart <span className="lite fen-help">· where balls go at {s.nickname ?? s.name}</span></div>
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
          {s.records && s.records.length ? (
            <div className="fen-recbox">
              <div className="fen-sectlab">House of Horrors <span className="lite fen-help">· the park record book</span></div>
              {s.records.map((rec, i) => (
                <div className="fen-rec" key={i}>
                  <div className="rl">{rec.label}</div>
                  <div className="rv fen-chalk">{rec.value}</div>
                  <div className="rh">{rec.holder}{rec.note ? ` · ${rec.note}` : ""}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
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

function PlayerDrawer({ player, onClose }: { player: PlayerRowVM; onClose: () => void }) {
  const d = player.detail;
  const m = player.morale;
  return (
    <>
      <div className="fen-drawer-back" onClick={onClose} />
      <div className="fen-drawer" role="dialog" aria-label={`${player.name} dossier`}>
        <button type="button" className="fen-drawer-x" onClick={onClose} aria-label="Close">×</button>
        <div className="fen-dhead">
          <div className="dnum fen-chalk">{player.number ?? ""}</div>
          <div className="dident">
            <div className="dname fen-chalk fen-y">{player.name}</div>
            <div className="dmeta">{[player.position, d?.age ? `age ${d.age}` : null, d?.bats && d?.throws ? `B/T ${d.bats}/${d.throws}` : null, d?.grade ? `grade ${d.grade}` : null].filter(Boolean).join(" · ")}</div>
            <div className="dbadges">
              {player.designation ? <span className={`fen-rbadge${player.designation.kind === "albatross" ? " alb" : ""}`}>{player.designation.label}</span> : null}
              {player.war !== undefined ? <span className="dwar">WAR {player.war.toFixed(1)}</span> : null}
            </div>
          </div>
        </div>
        {d?.designationEffect ? <div className="fen-deffect fen-help-b">{d.designationEffect}</div> : null}
        {d?.bio ? <div className="fen-dbio">{d.bio}</div> : null}

        <div className="fen-decon">
          <div className="e"><div className="l">Salary</div><div className="v fen-chalk">{player.salary !== undefined ? <Money value={player.salary} /> : "—"}</div></div>
          <div className="e"><div className="l">True Value</div><div className="v fen-chalk">{player.trueValue !== undefined ? <Money value={player.trueValue} /> : "—"}</div></div>
          <div className="e"><div className="l">Net</div><div className="v fen-chalk">{player.valueGap !== undefined ? <span className={player.valueGap >= 0 ? "fen-net up" : "fen-net dn"}>{player.valueGap >= 0 ? "+" : "−"}<Money value={Math.abs(player.valueGap)} /></span> : "—"}</div></div>
        </div>

        {d?.valueTrend && d.valueTrend.length > 1 ? <DrawerSection title="Value trend" hint="True Value by checkpoint"><ValueSparkline points={d.valueTrend} /></DrawerSection> : null}
        {d?.ratings && d.ratings.length ? <DrawerSection title="Ratings" hint="bar = now · tick = draft-day"><RatingBars ratings={d.ratings} /></DrawerSection> : null}
        {d?.spray && d.spray.length ? <DrawerSection title="Spray chart" hint={d.spray[0]?.role === "pitching" ? "contact off him" : "where he hits"}><SprayPanel spray={d.spray} /></DrawerSection> : null}
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
            {m.history.length ? m.history.map((h, i) => (
              <div className="fen-entry" key={i}><span className={`d ${h.delta >= 0 ? "up" : "dn"}`}>{h.delta >= 0 ? "+" : ""}{h.delta}</span><span><span className="rs">{h.reason}</span><br /><span className="wk">{h.week}</span></span></div>
            )) : <div className="fen-entry"><span className="rs fen-muted">No recorded swings yet this season.</span></div>}
          </DrawerSection>
        ) : null}

        {d?.ties && d.ties.length ? <DrawerSection title="Ties" hint="clubhouse relationships"><TiesList ties={d.ties} /></DrawerSection> : null}
        {d?.fame ? <DrawerSection title="Fame"><FameBlock fame={d.fame} /></DrawerSection> : null}

        {!d ? <div className="fen-empty">Full dossier fills in as the season runs.</div> : null}
      </div>
    </>
  );
}

export default FranchiseLensHub;
