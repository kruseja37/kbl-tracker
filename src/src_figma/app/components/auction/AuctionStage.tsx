import { useState } from "react";
import type { RosterIntelligencePayload } from "../../../../engines/rosterIntelligencePayload";
import type { Player } from "../../../../utils/leagueBuilderStorage";
import { HELP_LINE, WhisperPanel } from "./WhisperPanel";
import { PressButton } from "../ballpark";
import { PlayerProfilePopover } from "../shared/PlayerProfilePopover";
import { OnTheClockBanner } from "./onTheClockBanner";

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
  valueLabel?: string;
  gradeLabel?: string;
  gradeBandLabel?: string;
  confidenceBandLabel?: string;
  toolBands?: Array<{ label: string; lower: number; upper: number }>;
}

export interface LotVM {
  player?: Player | null;
  name: string;
  positions: string;
  personality: string;
  chemistry: string;
  traitCountLabel?: string;
  batsThrows?: string;
  age?: number;
  objectPronoun?: "him" | "her";
  /** MLB: public market read from the scout/market model. Omitted on farm. */
  publicMarket?: {
    band: { low: number; median: number; high: number };
    interestedTeams: number;
    contested: { rivalCount: number; message: string } | null;
    likelyPass: boolean;
  };
  /** Farm: the fogged scout read (covered by default, long-press to reveal). */
  scout?: ScoutReadVM;
  reserveAsk?: number | null;
  reserveLabel?: string;
  highBid?: {
    amount: number;
    by: string;
    isYou: boolean;
    /** FLOORREFIT Move 4: the holding team's primary color, for the 4px left-border swatch.
     * Absent (fallback) renders the holder name exactly as before, no swatch. */
    byTeamPrimary?: string;
    byAbbreviation?: string;
  } | null;
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
  roleLabel: "CPU team" | "Market Shill";
  action: string;
  reason: string;
  amount?: string;
}

export interface RosterSlotVM {
  slotId?: string;
  pos: string;
  group?: "THE EIGHT" | "ROTATION" | "BULLPEN" | "THE BENCH";
  who?: string;
  chip?: string;
  filled: boolean;
  isGap: boolean;
  gapLabel?: string | null;
  depthNote?: string | null;
  /** WT-D: the rostered player behind `who`, when resolvable — powers the roster-board popover. */
  player?: Player | null;
}

export interface BoardVM {
  title: string;
  hint: string;
  columns?: number;
  slots: RosterSlotVM[];
  overflow?: Array<{ playerId: string; name: string; chip: string; player?: Player | null }>;
  needLine: React.ReactNode;
}

export interface LogItemVM {
  kind: "won" | "rival" | "gone";
  text: string;
  amount?: number;
  /** WT-D pattern (CALLFIX 2026-07-08 Item 3, the 4th popover surface): the resolved player/
   * prospect behind this row's headline name, when resolvable. Paired with `namePrefix` so the
   * render wraps JUST that leading substring of `text` in the existing PlayerProfilePopover, the
   * same way the roster board slot / overflow rail / on-the-block lot already do. System lines
   * (or any row where the player can't be resolved) render `text` unchanged, plain. */
  player?: Player | null;
  /** The exact leading substring of `text` that names the player (e.g. "Avery Anchor" out of
   * "Avery Anchor SOLD to Page Caps for $10,000") -- required alongside `player` so the render
   * knows exactly how much of the string to wrap. */
  namePrefix?: string;
}

export interface AuctionCompleteVM {
  clubs: {
    teamId: string;
    name: string;
    primary: string;
    secondary: string;
    countLabel: string;
    legal: boolean;
    blockers: string[];
  }[];
  allLegal: boolean;
  blockedCount: number;
  summary: string;
  onProceed: () => void;
  proceedLabel?: string;
  overrideArmed: boolean;
  onArmOverride: () => void;
  onConfirmOverride: () => void;
  onStayOverride?: () => void;
  settle?: {
    seatTotal: number;
    perClubLabel: string;
    partial: boolean;
    partialLine?: string;
    armed: boolean;
    busy?: boolean;
    onArm: () => void;
    onConfirm: () => void;
    onStay: () => void;
    resultLine: string | null;
  };
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
    /** FLOORREFIT Move 1: which kind of turn is live -- drives the ON THE CLOCK banner's generic
     * (non-viewer) copy. Absent for states with no well-defined acting team. */
    turnKind?: "bid" | "nomination";
    /** FLOORREFIT Move 1: whether the acting team (whichever team `teamName` names) is CPU/shill-
     * controlled -- an independently-correct signal computed by each page, NOT derived from
     * `move.cpuTurnName` (the farm floor always leaves that null; see the FLOORREFIT contract). */
    actingTeamIsCpu?: boolean;
  };
  lot: LotVM;
  move: MoveVM;
  board: BoardVM;
  log: LogItemVM[];
  complete?: AuctionCompleteVM;
  help?: React.ReactNode;
  /** preview-only: force a SOLD / UNSOLD / GONE stamp over the lot */
  overlay?: "sold" | "unsold" | "gone" | null;
}

export interface AuctionStageProps {
  vm: AuctionStageVM;
  whisperPayload?: RosterIntelligencePayload | null;
  toolbar?: React.ReactNode;
  supplemental?: React.ReactNode;
  onSelectPreset?: (amount: number) => void;
  onBid?: () => void;
  onPass?: () => void;
  onAdvanceCpu?: () => void;
}

const money = (n: number) => "$" + Math.round(n).toLocaleString();
const moneyK = (n: number) => "$" + Math.round(n / 1000) + "k";

type BoardGroupName = NonNullable<RosterSlotVM["group"]>;

function fallbackSlotGroup(slot: RosterSlotVM): BoardGroupName {
  if (slot.pos === "C" || slot.pos === "1B" || slot.pos === "2B" || slot.pos === "3B" || slot.pos === "SS" || slot.pos === "LF" || slot.pos === "CF" || slot.pos === "RF") {
    return "THE EIGHT";
  }
  if (slot.pos.startsWith("SP")) return "ROTATION";
  if (slot.pos.startsWith("RP") || slot.pos === "CP") return "BULLPEN";
  return "THE BENCH";
}

export function AuctionStage({ vm, whisperPayload = null, toolbar, supplemental, onSelectPreset, onBid, onPass, onAdvanceCpu }: AuctionStageProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const isCpuTurn = Boolean(vm.move.cpuTurnName);
  const boardSlots = vm.board.slots.map((slot, index) => ({
    ...slot,
    slotId: slot.slotId ?? `${slot.pos}-${index + 1}`,
    group: slot.group ?? fallbackSlotGroup(slot),
  }));

  return (
    <div className="auc-root">
      <div className="wrap">
        {toolbar}

        <div className="statusbar">
          <button type="button" className={`help-toggle${helpOpen ? " active" : ""}`} onClick={() => setHelpOpen((open) => !open)}>
            Help
          </button>
          {/* TEXTLAW-SWEEP A3 reverse fix: this is ALWAYS-class content (the phase itself, e.g.
              "MLB auction") -- it was wrongly gated behind Help; now permanently visible. */}
          <span className="pill">{vm.status.phaseLabel}</span>
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
          {/* LEFT — the lot + your move, or the complete-screen handoff check */}
          <div>
            {vm.complete ? (
              <HandoffCheckPanel complete={vm.complete} />
            ) : (
              <>
                <OnTheClockBanner status={vm.status} />
                <div className="gonewrap">
                  <div className="lot">
                    <Lot lot={vm.lot} tier={vm.tier} helpOpen={helpOpen} />
                  </div>
                  {vm.overlay === "sold" && (
                    <div className="stamp sold"><div><div className="s">SOLD</div></div></div>
                  )}
                  {vm.overlay === "unsold" && (
                    <div className="stamp unsold">
                      <div>
                        <div className="s">UNSOLD</div>
                        <div className="note">Nobody bid at that price. {vm.lot.objectPronoun === "her" ? "She'll" : "He'll"} get one more look later.</div>
                      </div>
                    </div>
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
                      {vm.move.cpuDecision?.amount && (
                        <div className="cpu-numbers">
                          <span>Move <b>{vm.move.cpuDecision.amount}</b></span>
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

                </div>

                {/* FLOORREFIT Move 6: the roster fill board moves here (left column, under the bid
                    controls -- today's dead space) from the right column's bottom. */}
                <RosterBoardCard board={vm.board} boardSlots={boardSlots} tier={vm.tier} />
              </>
            )}

            {/* FLOORREFIT Move 6, complete-screen carve-out: the board rendered independent of
                vm.complete in the ORIGINAL right-column placement (a dedicated WT-D test covers a
                rostered player's popover on the complete-screen board) -- kept independent here too,
                so it now sits below the handoff-check panel on the complete screen instead of
                nested inside the bid-controls fragment above (which only exists pre-complete). */}
            {vm.complete && <RosterBoardCard board={vm.board} boardSlots={boardSlots} tier={vm.tier} />}
          </div>

          {/* RIGHT — the advisor, uncaged (FLOORREFIT §2) + lot log */}
          <div>
            <WhisperPanel key={whisperPayload?.seatTeamId ?? "dormant"} payload={whisperPayload} tier={vm.tier} />
            {helpOpen && (
              <div className="help-panel whisper-help">
                <div className="help-mark">?</div>
                <div className="txt">{HELP_LINE}</div>
              </div>
            )}

            {vm.log.length > 0 && (
              <div className="card log">
                <div className="eyebrow" style={{ marginBottom: 6 }}>Lot log</div>
                {vm.log.map((it, i) => (
                  <div key={i} className="logitem">
                    <span className={`tag ${it.kind}`}>{it.kind === "won" ? "Won" : it.kind === "rival" ? "Rival" : "Gone"}</span>
                    {/* CALLFIX Item 3 (WT-D pattern, the 4th popover surface): wrap just the
                        headline name in the popover, same tier-gated reveal as the roster board
                        slot / overflow rail above. System lines (no resolvable player) fall back
                        to plain text, unchanged. */}
                    {it.player && it.namePrefix && it.text.startsWith(it.namePrefix) ? (
                      <>
                        <PlayerProfilePopover player={it.player} revealFull={vm.tier !== "farm"}>
                          <span className="who-clickable">{it.namePrefix}</span>
                        </PlayerProfilePopover>
                        {it.text.slice(it.namePrefix.length)}
                      </>
                    ) : (
                      it.text
                    )}
                    <span className="spacer" />
                    <span className={it.amount ? "num muted" : "faint"}>{it.amount ? money(it.amount) : "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {vm.help && helpOpen && (
          <div className="help-panel">
            <div className="help-mark">?</div>
            <div className="txt">{vm.help}</div>
          </div>
        )}

        {supplemental}
      </div>
    </div>
  );
}

type ResolvedRosterSlotVM = RosterSlotVM & { slotId: string; group: BoardGroupName };

/** FLOORREFIT Move 6: the roster fill board, shared by both of AuctionStage's render sites (the
 * normal left-column-under-bid-controls placement, and the complete-screen carve-out that keeps it
 * visible alongside the handoff-check panel, matching pre-refit behavior). Same JSX, testids, and
 * classes the original single copy had -- only lifted into its own component to avoid tripling it. */
function RosterBoardCard({ board, boardSlots, tier }: { board: BoardVM; boardSlots: readonly ResolvedRosterSlotVM[]; tier: AuctionTier }) {
  return (
    <div className="card board">
      <div className="row">
        <div className="eyebrow">{board.title}</div>
        <div className="spacer" />
        <span className="chip">{board.hint}</span>
      </div>
      <div className="board-groups">
        {(["THE EIGHT", "ROTATION", "BULLPEN", "THE BENCH"] as const).map((group) => {
          const groupSlots = boardSlots.filter((slot) => slot.group === group);
          if (groupSlots.length === 0) return null;
          const benchFilled = group === "THE BENCH" ? groupSlots.filter((slot) => slot.filled).length : null;
          return (
            <div key={group} className="board-group">
              <div className="board-group-title">
                {group}
                {benchFilled !== null && <span>BENCH {benchFilled}/{groupSlots.length}</span>}
              </div>
              <div className="slots" style={board.columns ? { gridTemplateColumns: `repeat(${board.columns}, 1fr)` } : undefined}>
                {groupSlots.map((s) => (
                  <div
                    key={s.slotId}
                    data-testid={`auction-board-slot-${s.slotId}`}
                    className={`slot${s.filled ? " filled" : ""}${s.isGap ? " gap" : ""}`}
                  >
                    <div className="p">{s.pos}</div>
                    {s.chip && <div className="slot-chip">{s.chip}</div>}
                    {s.who !== undefined && (
                      <div className={`who${s.filled ? "" : " faint"}`}>
                        {s.player ? (
                          // COCKPIT W1d (WT-D audit follow-up): revealFull is tier-gated here as
                          // defense-in-depth -- farm prospects always carry the 'hidden'
                          // ratingRevealState literal (shouldReveal gates on that regardless of
                          // this prop), but a farm-tier board should never even ASK for the full
                          // reveal.
                          <PlayerProfilePopover player={s.player} revealFull={tier !== "farm"}>
                            <span className="who-clickable">{s.who || "open"}</span>
                          </PlayerProfilePopover>
                        ) : (
                          s.who || "open"
                        )}
                      </div>
                    )}
                    {s.depthNote && <div className="depth-note">{s.depthNote}</div>}
                    {s.gapLabel && (
                      <div data-testid={`auction-board-gap-${s.slotId}`} className="gap-label">
                        {s.gapLabel}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {board.overflow && board.overflow.length > 0 && (
        <div data-testid="auction-board-overflow" className="overflow-rail">
          <div className="overflow-title">OVERFLOW — {board.overflow.length} UNSEATED</div>
          <div className="overflow-note">These players don't fit the legal 22 frame — resolve before launch.</div>
          <div className="overflow-list">
            {board.overflow.map((entry) => (
              <span key={entry.playerId} className="chip">
                <b>{entry.chip}</b>{" "}
                {entry.player ? (
                  // COCKPIT W1d (WT-D audit follow-up): same tier-gated defense-in-depth as the
                  // roster-slot popover above.
                  <PlayerProfilePopover player={entry.player} revealFull={tier !== "farm"}>
                    <span className="who-clickable">{entry.name}</span>
                  </PlayerProfilePopover>
                ) : (
                  entry.name
                )}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="needline">{board.needLine}</div>
    </div>
  );
}

function HandoffCheckPanel({ complete }: { complete: AuctionCompleteVM }) {
  return (
    <section
      className="handoff-check"
      data-testid="auction-complete-panel"
      tabIndex={-1}
    >
      <div className="handoff-strip">MLB DRAFT COMPLETE — THE HANDOFF CHECK</div>
      <div className="handoff-rows">
        {complete.clubs.map((club) => (
          <div
            key={club.teamId}
            className={`handoff-row${club.legal ? " legal" : " blocked"}`}
            data-testid={`auction-exit-club-${club.teamId}`}
          >
            <div className="handoff-club">
              <span
                className="handoff-chip"
                style={{
                  "--team-primary": club.primary,
                  "--team-secondary": club.secondary,
                } as React.CSSProperties}
              />
              <div>
                <div className="handoff-name">{club.name}</div>
                <div className="handoff-count">{club.countLabel}</div>
              </div>
            </div>
            <div className="handoff-verdict">
              {club.legal ? (
                <div className="handoff-legal" data-testid={`auction-exit-legal-${club.teamId}`}>✓ LEGAL 22</div>
              ) : (
                <>
                  <div className="handoff-blocked" data-testid={`auction-exit-blocked-${club.teamId}`}>BLOCKED</div>
                  <div className="handoff-blockers">
                    {club.blockers.map((blocker) => (
                      <div key={blocker}>{blocker}</div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={`handoff-footer${complete.allLegal ? " legal" : " blocked"}`}>
        <div className="handoff-summary">{complete.summary}</div>
        {complete.settle?.resultLine && (
          <div className="handoff-result-line">{complete.settle.resultLine}</div>
        )}
        {complete.allLegal ? (
          <PressButton variant="gold" size="lg" onClick={complete.onProceed}>
            {complete.proceedLabel ?? "FARM DRAFT"} →
          </PressButton>
        ) : (
          <>
          {complete.settle && complete.settle.seatTotal > 0 && (
            <div className="handoff-settle" data-auction-settle>
              {complete.settle.armed ? (
                <>
                  <div className="handoff-confirm">
                    Settle {complete.settle.seatTotal} empty seat{complete.settle.seatTotal === 1 ? "" : "s"} from the leftovers at league minimum — {complete.settle.perClubLabel}. Best fit first; money only breaks ties.
                  </div>
                  {complete.settle.partial && complete.settle.partialLine && (
                    <div className="handoff-partial">{complete.settle.partialLine}</div>
                  )}
                  <div className="handoff-buttons">
                    <button
                      type="button"
                      className="handoff-settle-confirm"
                      onClick={complete.settle.onConfirm}
                      disabled={complete.settle.busy}
                    >
                      SETTLE {complete.settle.seatTotal} SEAT{complete.settle.seatTotal === 1 ? "" : "S"}
                    </button>
                    <button
                      type="button"
                      className="handoff-stay"
                      onClick={complete.settle.onStay}
                      disabled={complete.settle.busy}
                    >
                      STAY
                    </button>
                  </div>
                </>
              ) : (
                <PressButton
                  variant="default"
                  size="md"
                  onClick={complete.settle.onArm}
                  disabled={complete.settle.busy}
                >
                  SETTLE FROM THE SHILLS
                </PressButton>
              )}
            </div>
          )}
          <div className="handoff-override" data-auction-exit-override>
            <button type="button" className="handoff-review" onClick={complete.onProceed}>
              REVIEW ROSTERS
            </button>
            {complete.overrideArmed ? (
              <>
                <div className="handoff-confirm">
                  This hands off {complete.blockedCount} club{complete.blockedCount === 1 ? "" : "s"} that can't field a legal 22. The franchise wizard will refuse them until they're fixed. Proceed?
                </div>
                <div className="handoff-buttons">
                  <button type="button" className="handoff-yes" onClick={complete.onConfirmOverride}>
                    YES — HAND OFF AS-IS
                  </button>
                  <button type="button" className="handoff-stay" onClick={complete.onStayOverride ?? complete.onArmOverride}>
                    STAY
                  </button>
                </div>
              </>
            ) : (
              <button type="button" className="handoff-anyway" onClick={complete.onArmOverride}>
                PROCEED ANYWAY
              </button>
            )}
          </div>
          </>
        )}
      </div>
    </section>
  );
}

function Lot({ lot, tier, helpOpen }: { lot: LotVM; tier: AuctionTier; helpOpen: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const name = <span className="name">{lot.name.toUpperCase()}</span>;
  const isFarmLot = tier === "farm";
  return (
    <div className="lotinner">
      <div className="eyebrow">{lot.scout ? "On the block · prospect" : "On the block"}</div>
      {lot.player ? (
        // COCKPIT W1d (WT-D audit follow-up): gate on `tier` directly rather than `!lot.scout` --
        // belt-and-suspenders so a farm lot can never reveal full ratings even if `lot.scout`
        // were ever absent for some edge-case reason.
        <PlayerProfilePopover player={lot.player} revealFull={isFarmLot ? false : !lot.scout}>
          {name}
        </PlayerProfilePopover>
      ) : (
        name
      )}
      <div className="axes">
        <span className="pos">{lot.positions}</span>
        {isFarmLot ? (
          <>
            {lot.age !== undefined && <span className="chip">Age {lot.age}</span>}
            {lot.traitCountLabel && <span className="chip">{lot.traitCountLabel}</span>}
          </>
        ) : (
          <>
            <span className="chip">{lot.personality}</span>
            <span className="chip">{lot.chemistry}</span>
            {lot.age !== undefined && <span className="chip">Age {lot.age}</span>}
            {lot.batsThrows && <span className="chip">B/T {lot.batsThrows}</span>}
          </>
        )}
      </div>

      {lot.publicMarket && (
        <div className="market-read ballpark-feed-card">
          <div className="market-read-main">
            {/* FLOORREFIT Move 5: the three unlabeled boxes + the eyebrow collapse into one quiet
                mono line ("MARKET $lo · $mid · $hi") -- "MARKET" is the label now, so the old
                "Public market" eyebrow is gone (Say-it-once, design §1.2). The reserve ask folds in
                right here whenever this lot HAS a public-market read; a lot with a reserve but no
                public-market read (farm) keeps the standalone reserve chip below, unchanged. */}
            <div className="market-line num" aria-label="Public market price band">
              MARKET {money(lot.publicMarket.band.low)} · {money(lot.publicMarket.band.median)} · {money(lot.publicMarket.band.high)}
              {lot.reserveAsk !== null && lot.reserveAsk !== undefined && (
                <span className="market-line-reserve">
                  {" "}
                  — <b>{lot.reserveLabel ?? "RESERVE"}</b> {money(lot.reserveAsk)}
                </span>
              )}
            </div>
            {helpOpen && (
              <div className="muted" style={{ fontSize: 12.5 }}>
                Scout band: low / expected / stretch
              </div>
            )}
          </div>
          <div className={`market-signal${lot.publicMarket.contested ? " contested" : ""}`}>
            {lot.publicMarket.contested ? (
              <>
                <span>CONTESTED</span>
                <p>
                  {lot.publicMarket.contested.rivalCount} teams are near the top of the room.
                  Expect a fight or have a fallback.
                </p>
              </>
            ) : lot.publicMarket.likelyPass ? (
              <>
                <span>QUIET</span>
                <p>No clean bidder at the ask yet.</p>
              </>
            ) : (
              <>
                <span>{lot.publicMarket.interestedTeams} LIVE</span>
                <p>{lot.publicMarket.interestedTeams === 1 ? "One team" : "Teams"} can meet the ask.</p>
              </>
            )}
          </div>
        </div>
      )}

      {lot.scout && (
        <>
          {helpOpen && (
            <p className="muted" style={{ fontSize: 13.5, margin: "2px 0 0" }}>
              True value is in the fog. Your scout's read is yours alone — keep it covered.
            </p>
          )}
          <div className={`scout${revealed ? " revealed" : ""}`}>
            <button
              type="button"
              className="cover"
              aria-label="Scout report"
              onClick={() => setRevealed((current) => !current)}
            >
              <span style={{ fontSize: 18 }}>📋</span> {revealed ? "COVER IT" : "TAP FOR THE SCOUT REPORT"}
            </button>
            <div className="body">
              {revealed && <ScoutBody scout={lot.scout} helpOpen={helpOpen} />}
            </div>
          </div>
        </>
      )}

      {/* Standalone reserve chip only when there's no public-market line to fold it into (farm
          floor, or any MLB lot without a public-market read) -- no number lost either way. */}
      {!lot.publicMarket && lot.reserveAsk !== null && lot.reserveAsk !== undefined && (
        <div className="reserve-ask">
          <span>{lot.reserveLabel ?? "RESERVE"}</span>
          <b className="num">{money(lot.reserveAsk)}</b>
        </div>
      )}

      <div className="highbid">
        <div className="eyebrow">High bid</div>
        <div className="row" style={{ marginTop: 6 }}>
          <div className="amt num">{lot.highBid ? money(lot.highBid.amount) : "$0"}</div>
          <div className="spacer" />
          <div
            className={`by${lot.highBid ? "" : " muted"}${lot.highBid?.byTeamPrimary ? " swatch" : ""}`}
            style={
              lot.highBid?.byTeamPrimary
                ? ({ "--holder-color": lot.highBid.byTeamPrimary } as React.CSSProperties)
                : undefined
            }
          >
            {lot.highBid ? (
              <>
                {/* FLOORREFIT Move 4: the holder's team abbreviation, colored to match the swatch --
                    "who's winning" reads at a glance. Absent (fallback) leaves the name as today. */}
                {lot.highBid.byAbbreviation && <b className="by-abbr">{lot.highBid.byAbbreviation}</b>}
                {lot.highBid.by}
              </>
            ) : (
              "opening — be the first"
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoutBody({ scout, helpOpen }: { scout: ScoutReadVM; helpOpen: boolean }) {
  const low = Math.min(scout.rangeLow, scout.rangeHigh);
  const high = Math.max(scout.rangeLow, scout.rangeHigh);
  const span = Math.max(0, high - low);
  const anchor = Math.max(Math.abs(scout.mid), Math.abs(high), 1);
  const bandWidthPct = Math.max(12, Math.min(92, (span / anchor) * 100));
  const leftPct = (100 - bandWidthPct) / 2;
  const rightPct = leftPct;
  const midInRange = span > 0 ? (Math.min(Math.max(scout.mid, low), high) - low) / span : 0.5;
  const midPct = leftPct + midInRange * bandWidthPct;
  const pinPct = Math.max(0, Math.min(100, ((scout.grade2080 - 20) / 60) * 100));
  return (
    <>
      {scout.valueLabel && (
        <div className="conf" style={{ marginTop: 0, marginBottom: 10 }}>
          Scout value <b className="gold">{scout.valueLabel}</b>
        </div>
      )}
      {helpOpen && (
        <div className="eyebrow">
          Scout's price range <span className="faint" style={{ textTransform: "none", letterSpacing: 0 }}>— narrow band = confident</span>
        </div>
      )}
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
      {scout.gradeLabel && (
        <div className="conf">
          Scout grade <b>{scout.gradeLabel}</b>
        </div>
      )}
      {scout.gradeBandLabel && (
        <div className="conf">
          Grade band <b>{scout.gradeBandLabel}</b>
        </div>
      )}
      {scout.confidenceBandLabel && (
        <div className="conf">
          Confidence band <b>{scout.confidenceBandLabel}</b>
        </div>
      )}
      {scout.toolBands && scout.toolBands.length > 0 && (
        <div className="conf">
          {scout.toolBands.map((band) => (
            <span key={band.label} className="chip" style={{ marginRight: 6, marginTop: 6 }}>
              {band.label} {band.lower}-{band.upper}
            </span>
          ))}
        </div>
      )}
      <div className="conf">
        Confidence: <b className={scout.confidence === "High" ? "win" : scout.confidence === "Low" ? "loss" : "gold"}>{scout.confidence}</b>
        {scout.confidenceNote ? ` — ${scout.confidenceNote}` : ""}
      </div>
    </>
  );
}
