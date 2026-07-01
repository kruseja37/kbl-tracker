import { useState } from "react";

/**
 * AuctionStage — the "Premium Retro" auction-draft stage (MLB + farm), the
 * presentational centerpiece of the redesign (see AUCTION_DRAFT_UX_REDESIGN.md).
 *
 * This is a PURE view component: it renders from an AuctionStageVM and reports
 * intent through optional callbacks. The production wiring maps the existing
 * `useAuctionDraft` / `useFarmAuctionDraft` session state into the VM — the
 * behavior contract is unchanged (§7 of the redesign doc). MLB and farm are the
 * SAME stage; `tier` + the presence of `lot.scout` toggle the value-fog.
 */

export type AuctionTier = "mlb" | "farm";

export interface ScoutReadVM {
  /** displayed price-range endpoints (dollars) */
  rangeLow: number;
  rangeHigh: number;
  /** jittered point estimate (dollars) inside the band */
  mid: number;
  /** 20–80 scouting-tradition grade */
  grade2080: number;
  confidence: "Low" | "Medium" | "High";
  confidenceNote?: string;
}

export interface LotVM {
  name: string;
  positions: string;
  personality: string;
  chemistry: string;
  batsThrows?: string;
  age?: number;
  objectPronoun?: "him" | "her";
  /** MLB: public IV advisory string (e.g. "~$144,000"). Omitted on farm. */
  ivAdvisory?: string;
  /** Farm: the fogged scout read (covered by default, long-press to reveal). */
  scout?: ScoutReadVM;
  highBid?: { amount: number; by: string; isYou: boolean } | null;
}

export interface PresetVM {
  label: string;
  amount: number;
  enabled: boolean;
  selected?: boolean;
}

export interface MoveVM {
  walletLabel: string;
  wallet: number;
  maxBid: number;
  slotsLeft: number;
  ceilingNote: string;
  presets: PresetVM[];
  currentBid: number;
  canBid: boolean;
  canPass?: boolean;
  primaryLabel?: string;
  secondaryLabel?: string;
  /** when it's a CPU team's turn the decision zone shows a calm wait beat */
  cpuTurnName?: string | null;
  cpuDecision?: CpuDecisionVM | null;
}

export interface CpuDecisionVM {
  teamName: string;
  roleLabel: "CPU team" | "Shill";
  action: string;
  reason: string;
  valuation?: string;
  maxBid?: string;
  amount?: string;
}

export interface RosterSlotVM {
  pos: string;
  who?: string;
  filled: boolean;
  isGap: boolean;
}

export interface BoardVM {
  title: string;
  hint: string;
  columns?: number;
  slots: RosterSlotVM[];
  needLine: React.ReactNode;
}

export interface LogItemVM {
  kind: "won" | "rival" | "gone";
  text: string;
  amount?: number;
}

export interface AuctionStageVM {
  tier: AuctionTier;
  status: {
    phaseLabel: string;
    lotLabel: string;
    rosterLabel: string;
    nowText: string;
    teamName?: string;
    teamPrimary?: string;
    teamSecondary?: string;
  };
  lot: LotVM;
  move: MoveVM;
  board: BoardVM;
  log: LogItemVM[];
  coach?: React.ReactNode;
  scoutInsight?: {
    verdict: string;
    summary: string;
    details: React.ReactNode;
  } | null;
  /** preview-only: force a SOLD / GONE stamp over the lot */
  overlay?: "sold" | "gone" | null;
}

export interface AuctionStageProps {
  vm: AuctionStageVM;
  toolbar?: React.ReactNode;
  supplemental?: React.ReactNode;
  onSelectPreset?: (amount: number) => void;
  onBid?: () => void;
  onPass?: () => void;
  onAdvanceCpu?: () => void;
}

const money = (n: number) => "$" + Math.round(n).toLocaleString();
const moneyK = (n: number) => "$" + Math.round(n / 1000) + "k";

export function AuctionStage({ vm, toolbar, supplemental, onSelectPreset, onBid, onPass, onAdvanceCpu }: AuctionStageProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const isCpuTurn = Boolean(vm.move.cpuTurnName);

  return (
    <div className="auc-root">
      <div className="wrap">
        {toolbar}

        <div className="statusbar">
          <button type="button" className={`help-toggle${helpOpen ? " active" : ""}`} onClick={() => setHelpOpen((open) => !open)}>
            Help
          </button>
          {helpOpen && <span className="pill">{vm.status.phaseLabel}</span>}
          <span className="pill num">{vm.status.lotLabel}</span>
          <span className="pill">{vm.status.rosterLabel}</span>
          <span
            className="now team-now"
            style={{
              "--team-primary": vm.status.teamPrimary ?? "var(--auc-gold)",
              "--team-secondary": vm.status.teamSecondary ?? "var(--auc-text)",
            } as React.CSSProperties}
          >
            <span className="live" /> Now: <span>{vm.status.nowText}</span>
          </span>
        </div>

        <div className="stage">
          {/* LEFT — the lot + your move */}
          <div>
            <div className="gonewrap">
              <div className="lot">
                <Lot lot={vm.lot} />
              </div>
              {vm.overlay === "sold" && (
                <div className="stamp sold"><div><div className="s">SOLD</div></div></div>
              )}
              {vm.overlay === "gone" && (
                <div className="stamp gone">
                  <div>
                    <div className="s">GONE</div>
                    <div className="note">Nobody bid. {vm.lot.objectPronoun === "her" ? "She's" : "He's"} off the board for good.</div>
                  </div>
                </div>
              )}
            </div>

            <div className="move">
              <div className="walletline">
                <div><div className="lab">{vm.move.walletLabel}</div><div className="v gold num">{money(vm.move.wallet)}</div></div>
                <div><div className="lab">Most you can bid</div><div className="v num">{money(vm.move.maxBid)}</div></div>
                <div><div className="lab">Slots left</div><div className="v num">{vm.move.slotsLeft}</div></div>
              </div>
              <div className="ceiling">{vm.move.ceilingNote}</div>

              {isCpuTurn ? (
                <div className="cpu-panel">
                  <div className="eyebrow">{vm.move.cpuDecision?.roleLabel ?? "CPU"} turn preview</div>
                  <div className="cpu-action">{vm.move.cpuDecision?.action ?? `${vm.move.cpuTurnName} is deciding`}</div>
                  <div className="cpu-reason">{vm.move.cpuDecision?.reason ?? "Read-only preview. Advance to let the decision resolve."}</div>
                  {(vm.move.cpuDecision?.amount || vm.move.cpuDecision?.valuation || vm.move.cpuDecision?.maxBid) && (
                    <div className="cpu-numbers">
                      {vm.move.cpuDecision.amount && <span>Move <b>{vm.move.cpuDecision.amount}</b></span>}
                      {vm.move.cpuDecision.valuation && <span>Read <b>{vm.move.cpuDecision.valuation}</b></span>}
                      {vm.move.cpuDecision.maxBid && <span>Cap <b>{vm.move.cpuDecision.maxBid}</b></span>}
                    </div>
                  )}
                  <button type="button" className="advance-cpu" onClick={() => onAdvanceCpu?.()} disabled={!vm.move.canBid}>
                    Advance decision
                  </button>
                </div>
              ) : (
                <>
                  <div className="presets">
                    {vm.move.presets.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        className={`preset${!p.enabled ? " dim" : ""}${p.selected ? " sel" : ""}`}
                        disabled={!p.enabled}
                        title={p.enabled ? undefined : "above your cap"}
                        onClick={() => p.enabled && onSelectPreset?.(p.amount)}
                      >
                        {p.label}
                      </button>
                    ))}
                    <span className="chip num" style={{ marginLeft: "auto" }}>
                      your bid · {money(vm.move.currentBid)}
                    </span>
                  </div>
                  <div className="actions">
                    <button type="button" className="bid" disabled={!vm.move.canBid} onClick={() => onBid?.()}>
                      {vm.move.primaryLabel ?? `BID ${moneyK(vm.move.currentBid)}`}
                    </button>
                    <button
                      type="button"
                      className="letgo"
                      disabled={vm.move.canPass === false}
                      onClick={() => onPass?.()}
                    >
                      {vm.move.secondaryLabel ?? `Let ${vm.lot.objectPronoun ?? "him"} go`}
                    </button>
                  </div>
                </>
              )}

              {helpOpen && (
                <div className="tax">
                  <span>On-identity</span>
                  <div className="meter"><i style={{ width: "30%" }} /></div>
                  <span>heavy off-identity</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — roster need board + lot log */}
          <div>
            <div className="card board">
              <div className="row">
                <div className="eyebrow">{vm.board.title}</div>
                <div className="spacer" />
                <span className="chip">{vm.board.hint}</span>
              </div>
              <div className="slots" style={vm.board.columns ? { gridTemplateColumns: `repeat(${vm.board.columns}, 1fr)` } : undefined}>
                {vm.board.slots.map((s, i) => (
                  <div key={i} className={`slot${s.filled ? " filled" : ""}${s.isGap ? " gap" : ""}`}>
                    <div className="p">{s.pos}</div>
                    {s.who !== undefined && <div className={`who${s.filled ? "" : " faint"}`}>{s.who || "open"}</div>}
                  </div>
                ))}
              </div>
              <div className="needline">{vm.board.needLine}</div>
            </div>

            {vm.log.length > 0 && (
              <div className="card log">
                <div className="eyebrow" style={{ marginBottom: 6 }}>Lot log</div>
                {vm.log.map((it, i) => (
                  <div key={i} className="logitem">
                    <span className={`tag ${it.kind}`}>{it.kind === "won" ? "Won" : it.kind === "rival" ? "Rival" : "Gone"}</span>
                    {it.text}
                    <span className="spacer" />
                    <span className={it.amount ? "num muted" : "faint"}>{it.amount ? money(it.amount) : "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {vm.scoutInsight && (
          <details className="scout-insight">
            <summary>
              <span>{vm.scoutInsight.verdict}</span>
              <b>{vm.scoutInsight.summary}</b>
            </summary>
            <div className="scout-insight-body">{vm.scoutInsight.details}</div>
          </details>
        )}

        {vm.coach && helpOpen && (
          <div className="coach">
            <div className="mic">🎙</div>
            <div className="txt">{vm.coach}</div>
          </div>
        )}

        {supplemental}
      </div>
    </div>
  );
}

function Lot({ lot }: { lot: LotVM }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="lotinner">
      <div className="eyebrow">{lot.scout ? "On the block · prospect" : "On the block"}</div>
      <div className="name">{lot.name.toUpperCase()}</div>
      <div className="axes">
        <span className="pos">{lot.positions}</span>
        <span className="chip">{lot.personality}</span>
        <span className="chip">{lot.chemistry}</span>
        {lot.age !== undefined && <span className="chip">Age {lot.age}</span>}
        {lot.batsThrows && <span className="chip">B/T {lot.batsThrows}</span>}
      </div>

      {lot.ivAdvisory && (
        <div className="valueline">
          <div className="eyebrow">Worth (IV)</div>
          <div className="big num">{lot.ivAdvisory}</div>
          <div className="muted" style={{ fontSize: 12.5 }}>advisory — values are public in the majors</div>
        </div>
      )}

      {lot.scout && (
        <>
          <p className="muted" style={{ fontSize: 13.5, margin: "2px 0 0" }}>
            True value is in the fog. Your scout's read is yours alone — keep it covered.
          </p>
          <div className={`scout${revealed ? " revealed" : ""}`}>
            <button
              type="button"
              className="cover"
              aria-label="Hold to reveal scout report"
              onPointerDown={(e) => { e.preventDefault(); setRevealed(true); }}
              onPointerUp={() => setRevealed(false)}
              onPointerLeave={() => setRevealed(false)}
            >
              <span style={{ fontSize: 18 }}>🔒</span> Press &amp; hold to see your scout's read
            </button>
            <div className="body">
              <ScoutBody scout={lot.scout} />
            </div>
          </div>
        </>
      )}

      <div className="highbid">
        <div className="eyebrow">High bid</div>
        <div className="row" style={{ marginTop: 6 }}>
          <div className="amt num">{lot.highBid ? money(lot.highBid.amount) : "$0"}</div>
          <div className="spacer" />
          <div className={lot.highBid ? "by" : "by muted"}>
            {lot.highBid ? lot.highBid.by : "opening — be the first"}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoutBody({ scout }: { scout: ScoutReadVM }) {
  const span = scout.rangeHigh - scout.rangeLow || 1;
  // band occupies the middle ~40–70%; here we encode position by the displayed numbers.
  const leftPct = 30;
  const rightPct = 42;
  const midPct = 30 + ((scout.mid - scout.rangeLow) / span) * (100 - leftPct - rightPct);
  // 20–80 grade → pin position
  const pinPct = Math.max(0, Math.min(100, ((scout.grade2080 - 20) / 60) * 100));
  return (
    <>
      <div className="eyebrow">
        Scout's price range <span className="faint" style={{ textTransform: "none", letterSpacing: 0 }}>— narrow band = confident</span>
      </div>
      <div className="range">
        <div className="rangebar">
          <i style={{ left: `${leftPct}%`, right: `${rightPct}%` }} />
          <div className="mid" style={{ left: `${midPct}%` }} />
        </div>
        <div className="row" style={{ marginTop: 6 }}>
          <span className="num muted" style={{ fontSize: 12 }}>{money(scout.rangeLow)}</span>
          <span className="spacer" />
          <span className="num gold" style={{ fontSize: 13 }}>~{money(scout.mid)}</span>
          <span className="spacer" />
          <span className="num muted" style={{ fontSize: 12 }}>{money(scout.rangeHigh)}</span>
        </div>
      </div>
      <div className="gauge">
        <div><div className="eyebrow">Grade</div><div className="gval num">{scout.grade2080}</div></div>
        <div className="gtrack"><div className="pin" style={{ left: `${pinPct}%` }} /></div>
      </div>
      <div className="conf">
        Confidence: <b className={scout.confidence === "High" ? "win" : scout.confidence === "Low" ? "loss" : "gold"}>{scout.confidence}</b>
        {scout.confidenceNote ? ` — ${scout.confidenceNote}` : ""}
      </div>
    </>
  );
}
