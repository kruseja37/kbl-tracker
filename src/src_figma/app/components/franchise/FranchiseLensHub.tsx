import { useState } from "react";

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

export interface NewsStoryVM { category: string; headline: string; excerpt: string; byline: string }
export interface NewsVM {
  editionLabel: string;
  volumeLabel: string;
  priceLabel?: string;
  lead?: { kicker: string; headline: string; body: string; byline: string };
  stories: NewsStoryVM[];
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
}

export interface PulseVM {
  fanMorale?: { value: number; trend: "up" | "down" | "flat"; history: MoraleHistoryVM[] };
  clubhouseLabel?: string;
  clubhouseAvg?: number;
  standingLabel?: string;
  payrollLabel?: string;       // e.g. "$5.4M · 22"
}

export interface HubVM {
  home?: SeasonHomeVM;
  news?: NewsVM;
  pulse: PulseVM;
  roster: PlayerRowVM[];
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
              />
            ) : tab === "Tootwhistle Times" ? (
              <NewspaperTab hub={hub} active={active} />
            ) : (
              <div className="fen-empty">"{tab}" comes next.</div>
            )}
          </div>
        </div>
      </div>
      <button type="button" className="fen-helpbtn" onClick={() => setHelpOn((v) => !v)}>? Help</button>
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

function NewspaperTab({ hub, active }: { hub: HubVM; active: ActiveTeamVM }) {
  const news = hub.news;
  const reporter = active.reporter?.name;
  if (!news) return <div className="fen-empty">No dispatches from the beat yet this season.</div>;
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
            <div className="kick">{news.lead.kicker}</div>
            <h2>{news.lead.headline}</h2>
            <p>{news.lead.body}</p>
            <div className="by">{news.lead.byline}</div>
          </div>
        ) : null}
        <div className="fen-newsgrid">
          {news.stories.map((s, i) => (
            <div className="fen-ncard" key={i}>
              <span className="fen-ncat">{s.category}</span>
              <h3>{s.headline}</h3>
              <p className="ex">{s.excerpt}</p>
              <div className="by">{s.byline}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RosterTab({
  active, hub, openMorale, setOpenMorale,
}: {
  active: ActiveTeamVM;
  hub: HubVM;
  openMorale: string | null;
  setOpenMorale: (v: string | null) => void;
}) {
  const fan = hub.pulse.fanMorale;
  return (
    <>
      {/* club pulse */}
      <div className="fen-pulse">
        <div className="club fen-chalk fen-y">
          {active.name}{" "}
          {hub.pulse.standingLabel ? <span className="fen-muted" style={{ fontFamily: "var(--fen-type)", fontSize: 14 }}>{hub.pulse.standingLabel}</span> : null}
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
            <RosterRow key={p.id} p={p} open={openMorale === p.id} onToggle={() => setOpenMorale(openMorale === p.id ? null : p.id)} />
          ))}
        </div>
      )}
    </>
  );
}

function RosterRow({ p, open, onToggle }: { p: PlayerRowVM; open: boolean; onToggle: () => void }) {
  return (
    <>
      <div className="fen-rnum">{p.number ?? ""}</div>
      <div><span className="fen-rpos">{p.position}</span></div>
      <div className="fen-rname fen-chalk">{p.name}</div>
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

export default FranchiseLensHub;
