import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import type {
  BoardEntry,
  ChemistryReadout,
  Light,
  RosterIntelligencePayload,
  WorthToYou,
} from "../../../../engines/rosterIntelligencePayload";
import type { Player } from "../../../../utils/leagueBuilderStorage";
import { PlayerProfilePopover } from "../shared/PlayerProfilePopover";

interface WhisperPanelProps {
  payload: RosterIntelligencePayload | null;
}

interface WhisperPayloadMeta {
  seatClubName?: string;
  seatPrimary?: string;
  currentLotPlayerId?: string;
  currentHighBid?: number | null;
  objectPronoun?: "him" | "her";
  boardMeta?: Record<string, { name?: string; positions?: string }>;
  boardPlayers?: Record<string, Player>;
  bidVsPass?: WhisperBidVsPass | null;
}

interface WhisperBidVsPassTarget {
  playerId: string;
  name: string;
  player: Player | null;
  surplus: number;
  ownValue: number;
  predictedMedian: number;
  affordable: boolean;
}

interface WhisperBidVsPassNeed {
  minimumAdditions: number;
  deficits: readonly string[];
}

interface WhisperBidVsPassBranch {
  branch: "bid" | "pass";
  budgetAfter: number;
  needAfter: WhisperBidVsPassNeed | null;
  targets: readonly WhisperBidVsPassTarget[];
}

interface WhisperBidVsPass {
  bidAmount: number;
  bid: WhisperBidVsPassBranch;
  pass: WhisperBidVsPassBranch;
}

const LIGHT_ORDER = ["shape", "identity", "chemistry", "balance", "budget"] as const;
type LightKey = (typeof LIGHT_ORDER)[number];

const NO_READ_LINE = "No read yet -- still doing my homework on this club.";
const EMPTY_BOARD_LINE = "The board's bare. Finish the roster with what's left on the floor.";
const HELP_LINE = "Your assistant GM's private read -- advice for this seat alone. Only the club on the clock can open it, and it covers itself when the turn moves on. He suggests; you decide.";

export function WhisperPanel({ payload }: WhisperPanelProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedLight, setSelectedLight] = useState<LightKey>("shape");
  const [flashVerdict, setFlashVerdict] = useState(false);
  const previousVerdict = useRef<WorthToYou["verdict"] | null>(null);
  const meta = (payload ?? {}) as WhisperPayloadMeta;
  const clubName = meta.seatClubName ?? payload?.seatTeamId ?? "";
  const teamPrimary = meta.seatPrimary ?? "var(--ballpark-brass)";
  const board = payload?.board ?? [];
  const scorecard = payload?.scorecard;
  const worth = payload?.worthToYou;

  const defaultLight = useMemo(() => {
    if (!scorecard) return "shape";
    return LIGHT_ORDER
      .map((key) => ({ key, light: scorecard[key] }))
      .sort((left, right) => lightRank(left.light) - lightRank(right.light) || LIGHT_ORDER.indexOf(left.key) - LIGHT_ORDER.indexOf(right.key))[0]
      ?.key ?? "shape";
  }, [scorecard]);

  useEffect(() => {
    setOpen(false);
    setExpanded(false);
    previousVerdict.current = null;
  }, [payload?.seatTeamId]);

  useEffect(() => {
    setSelectedLight(defaultLight);
  }, [defaultLight, payload?.generatedAtLotIndex]);

  useEffect(() => {
    const next = worth?.verdict ?? null;
    if (open && previousVerdict.current !== null && next !== null && previousVerdict.current !== next) {
      setFlashVerdict(true);
      const timer = window.setTimeout(() => setFlashVerdict(false), 300);
      previousVerdict.current = next;
      return () => window.clearTimeout(timer);
    }
    previousVerdict.current = next;
  }, [open, worth?.verdict]);

  if (!payload) {
    return (
      <section className="whisper-panel whisper-dormant">
        <WhisperStyles />
        <button type="button" className="whisper-strip" disabled>
          <span className="eyebrow">ASST GM</span>
          <span className="whisper-affordance">WAITING ON THE TABLE</span>
        </button>
      </section>
    );
  }

  return (
    <section
      className={`whisper-panel${open ? " open" : ""}`}
      style={{ "--whisper-team": teamPrimary } as CSSProperties}
    >
      <WhisperStyles />
      <button
        type="button"
        className="whisper-strip"
        data-testid="whisper-strip"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="eyebrow">ASST GM · {clubName}</span>
        <span className="whisper-affordance">{open ? "🔒 COVER IT" : "🔒 TAP FOR THE READ"}</span>
      </button>

      {open && (
        <div className="card whisper-body" data-testid="whisper-body">
          <WhisperHeadline
            worth={worth}
            board={board}
            market={payload.market}
            currentHighBid={meta.currentHighBid ?? null}
            objectPronoun={meta.objectPronoun ?? "him"}
            flash={flashVerdict}
          />

          {meta.bidVsPass && <BidVsPassSection bidVsPass={meta.bidVsPass} />}

          {scorecard && (
            <section className="whisper-section" data-testid="whisper-lights">
              <div className="whisper-lights-row">
                {LIGHT_ORDER.map((key) => {
                  const light = scorecard[key];
                  const active = selectedLight === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`whisper-light ${active ? "selected" : ""}`}
                      data-status={light.status}
                      aria-label={key.toUpperCase()}
                      onClick={() => setSelectedLight(key)}
                    >
                      <span className="whisper-dot" />
                      <span>{key.toUpperCase()}</span>
                    </button>
                  );
                })}
              </div>
              <p className="whisper-light-sentence">
                {scorecard[selectedLight].status === "unknown"
                  ? NO_READ_LINE
                  : scorecard[selectedLight].sentence}
              </p>
            </section>
          )}

          {worth?.chemistryReadout && <ChemistryReadoutSection readout={worth.chemistryReadout} />}

          <section className="whisper-section whisper-board" data-testid="whisper-board">
            <div className="row whisper-board-head">
              <div className="eyebrow">YOUR BOARD</div>
              <span className="chip">{board.length} NAMES LEFT</span>
              <span className="spacer" />
              {board.length > 3 && (
                <button type="button" className="whisper-board-toggle" onClick={() => setExpanded((current) => !current)}>
                  {expanded ? "FOLD IT UP" : "FULL BOARD"}
                </button>
              )}
            </div>
            {board.length === 0 ? (
              <p className="whisper-empty">{EMPTY_BOARD_LINE}</p>
            ) : (
              <>
                <div className="whisper-board-list">
                  {board.slice(0, 3).map((entry, index) => (
                    <BoardRow
                      key={entry.playerId}
                      entry={entry}
                      rank={index + 1}
                      meta={meta.boardMeta?.[entry.playerId]}
                      player={meta.boardPlayers?.[entry.playerId]}
                      currentLotPlayerId={meta.currentLotPlayerId ?? payload.market?.playerId}
                    />
                  ))}
                </div>
                {expanded && (
                  <div className="whisper-board-well">
                    {board.slice(3).map((entry, index) => (
                      <BoardRow
                        key={entry.playerId}
                        entry={entry}
                        rank={index + 4}
                        meta={meta.boardMeta?.[entry.playerId]}
                        player={meta.boardPlayers?.[entry.playerId]}
                        currentLotPlayerId={meta.currentLotPlayerId ?? payload.market?.playerId}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

function ChemistryReadoutSection({ readout }: { readout: ChemistryReadout }) {
  return (
    <section className="whisper-section whisper-chemistry-readout" data-testid="whisper-chemistry-readout">
      <div className="eyebrow">CHEMISTRY</div>
      <div className="whisper-chemistry-list">
        {readout.families.map((family) => (
          <div
            key={family.family}
            className={`whisper-chemistry-row${family.isCandidateFamily ? " candidate" : ""}`}
            data-candidate-family={family.isCandidateFamily ? "true" : "false"}
          >
            <span className="whisper-chem-word">{family.word}</span>
            <span className="num whisper-chem-count">{family.count}</span>
            <span className="whisper-chem-tier">{family.tier}</span>
            <span className="whisper-chem-next">
              {family.nextTierLabel && family.distanceToNextTier !== null
                ? `${family.distanceToNextTier} to ${family.nextTierLabel}`
                : "at max"}
            </span>
            {family.isCandidateFamily && (
              <span className="chip whisper-chem-delta">
                {candidateDeltaLabel(readout.candidate)}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function BidVsPassSection({ bidVsPass }: { bidVsPass: WhisperBidVsPass }) {
  return (
    <section className="whisper-section whisper-bid-pass" data-testid="whisper-bid-vs-pass">
      <div className="eyebrow">BID vs PASS</div>
      <div className="whisper-branch-grid">
        <BidVsPassBranchCard branch={bidVsPass.bid} title={`BID ${money(bidVsPass.bidAmount)}`} />
        <BidVsPassBranchCard branch={bidVsPass.pass} title="PASS" />
      </div>
    </section>
  );
}

function BidVsPassBranchCard({
  branch,
  title,
}: {
  branch: WhisperBidVsPassBranch;
  title: string;
}) {
  return (
    <div className="whisper-branch-card">
      <div className="row whisper-branch-head">
        <span className="whisper-branch-title">{title}</span>
        <span className="spacer" />
        <span className="num whisper-branch-budget">{money(branch.budgetAfter)}</span>
      </div>
      <p className="whisper-branch-need">{needSummary(branch.needAfter)}</p>
      <div className="whisper-target-list">
        {branch.targets.slice(0, 5).length === 0 ? (
          <p className="whisper-target-empty">No clean surplus targets left.</p>
        ) : (
          branch.targets.slice(0, 5).map((target) => (
            <BidVsPassTargetRow key={`${branch.branch}-${target.playerId}`} target={target} />
          ))
        )}
      </div>
    </div>
  );
}

function BidVsPassTargetRow({ target }: { target: WhisperBidVsPassTarget }) {
  const name = <span className="whisper-target-name">{target.name}</span>;
  return (
    <div className="whisper-target-row">
      {target.player ? (
        <PlayerProfilePopover player={target.player} revealFull>
          {name}
        </PlayerProfilePopover>
      ) : (
        name
      )}
      <span className={`num whisper-surplus ${target.surplus >= 0 ? "positive" : "negative"}`}>
        {signedMoney(target.surplus)}
      </span>
      {!target.affordable && <span className="chip whisper-cant-afford">can't afford</span>}
    </div>
  );
}

function WhisperHeadline({
  worth,
  board,
  market,
  currentHighBid,
  objectPronoun,
  flash,
}: {
  worth: WorthToYou | undefined;
  board: readonly BoardEntry[];
  market: RosterIntelligencePayload["market"];
  currentHighBid: number | null;
  objectPronoun: "him" | "her";
  flash: boolean;
}) {
  if (!worth) {
    const bestName = board[0]?.note ?? board[0]?.playerId;
    return (
      <section className="whisper-headline" data-testid="whisper-headline">
        <p className="whisper-nomination">
          {bestName ? `Nothing on the block. Best name still out there: ${bestName}.` : EMPTY_BOARD_LINE}
        </p>
      </section>
    );
  }

  const relation = roomRelation(worth.capValue, market);
  const verdictText = verdictLine(worth, objectPronoun);
  const liveBidText = liveBidLine(worth, currentHighBid, objectPronoun);
  return (
    <section className="whisper-headline" data-testid="whisper-headline">
      <div className={`whisper-verdict ${worth.verdict} ${flash ? "flash" : ""}`}>
        {verdictText}
      </div>
      <div className="whisper-number-row">
        <div>
          <div className="eyebrow">YOUR NUMBER</div>
          <div className={`whisper-number num ${worth.verdict === "cap" ? "gold" : ""}`}>
            {worth.recommendedNumber === 0 ? "PASS" : money(worth.recommendedNumber)}
          </div>
        </div>
      </div>
      <div className="whisper-liquidity" data-testid="whisper-liquidity">
        <div className="whisper-liquidity-metric">
          <span className="eyebrow">MAX BID</span>
          <span className="num whisper-liquidity-number">{worth.suggestedMaxBid === 0 ? "PASS" : money(worth.suggestedMaxBid)}</span>
        </div>
        <span className={`chip whisper-price-read ${worth.priceRead}`}>
          {worth.priceRead.toUpperCase()}
        </span>
        <span className={`chip whisper-liquidity-state ${worth.liquidityState}`}>
          {liquidityStateLabel(worth.liquidityState)}
        </span>
        <span className="spacer" />
        <span className="whisper-liquidity-small">Fill Reserve {money(worth.minimumFutureFillReserve)}</span>
        <span className="whisper-liquidity-small">Room {money(worth.discretionaryBudget)}</span>
      </div>
      <div className="whisper-reason-row">
        {liquidityReasonLabels(worth).map((label) => (
          <span key={label} className="chip whisper-reason-chip">{label}</span>
        ))}
        {prioritySignalLabels(worth).map((label) => (
          <span key={label} className="chip whisper-priority-chip">{label}</span>
        ))}
      </div>
      {liveBidText && <p className="whisper-live-bid">{liveBidText}</p>}
      <p className="whisper-why">{whyLine(worth)}</p>
      {relation && <p className="whisper-room-line">{relation}</p>}
    </section>
  );
}

function BoardRow({
  entry,
  rank,
  meta,
  player,
  currentLotPlayerId,
}: {
  entry: BoardEntry;
  rank: number;
  meta: { name?: string; positions?: string } | undefined;
  player: Player | undefined;
  currentLotPlayerId: string | undefined;
}) {
  const onBlock = currentLotPlayerId === entry.playerId;
  const name = <span className="whisper-board-name">{meta?.name ?? entry.note ?? entry.playerId}</span>;
  return (
    <div className={`whisper-board-row${onBlock ? " on-block" : ""}`}>
      <span className="num whisper-rank">{rank}</span>
      {player ? (
        <PlayerProfilePopover player={player} revealFull>
          {name}
        </PlayerProfilePopover>
      ) : (
        name
      )}
      {entry.needTag && <span className="chip whisper-need-chip">{entry.needTag}</span>}
      {entry.fitTag && <span className="chip whisper-fit-chip">{entry.fitTag}</span>}
      <span className="pos">{meta?.positions ?? entry.matchedShape ?? "POS"}</span>
      {onBlock && <span className="chip whisper-on-block">ON THE BLOCK</span>}
      <span className="spacer" />
      <span className="num whisper-worth">{money(entry.worth)}</span>
    </div>
  );
}

function lightRank(light: Light): number {
  if (light.status === "red") return 0;
  if (light.status === "amber") return 1;
  if (light.status === "green") return 2;
  return 3;
}

function verdictLine(worth: WorthToYou, objectPronoun: "him" | "her"): string {
  if (worth.verdict === "push") return `Go get ${objectPronoun} -- worth about ${money(worth.recommendedNumber)} to you.`;
  if (worth.verdict === "pass") return `Let ${objectPronoun} go.`;
  return `Worth more than you can safely spend -- cap at ${money(worth.recommendedNumber)}.`;
}

function whyLine(worth: WorthToYou): string {
  const contribution = worth.chemistryContribution;
  if (contribution > 0) return `Chemistry moves your number up by ${money(contribution)}.`;
  if (Math.abs(worth.ownValue - worth.iv) >= 1) {
    return `Fit and need move the raw IV to ${money(worth.ownValue)} before chemistry.`;
  }
  return "Your fit and need sit right on the raw IV.";
}

function liquidityStateLabel(state: WorthToYou["liquidityState"]): string {
  if (state === "emergency-fill") return "EMERGENCY FILL";
  return state.toUpperCase();
}

function liquidityReasonLabels(worth: WorthToYou): string[] {
  const labels = worth.reasonCodes.map((code) => {
    switch (code) {
      case "above-remaining-budget":
        return "over budget";
      case "above-legal-ceiling":
        return "legal cap";
      case "below-minimum-bid":
        return "bid floor";
      case "emergency-fill":
        return "must fill";
      case "future-fill-protected":
        return "protect fill";
      case "late-budget-surplus":
        return "late cash";
      case "liquidity-constrained":
        return "cash tight";
      case "near-complete":
        return "near done";
      case "priority-fit":
        return "priority need";
      case "scarce-replacement":
        return "scarce repl.";
      case "similar-replacements":
        return "similar repl.";
      case "within-liquidity-ceiling":
        return "under ceiling";
    }
  });
  return labels.slice(0, 4);
}

function prioritySignalLabels(worth: WorthToYou): string[] {
  const labels: string[] = [];
  if (Math.abs(worth.needMultiplier - 1) >= 0.02) {
    labels.push(`NEED ${signedPercent(worth.needMultiplier - 1)}`);
  }
  if (Math.abs(worth.archetypeFitMultiplier - 1) >= 0.02) {
    labels.push(`FIT ${signedPercent(worth.archetypeFitMultiplier - 1)}`);
  }
  return labels;
}

function signedPercent(value: number): string {
  const rounded = Math.round(value * 100);
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}

function candidateDeltaLabel(candidate: ChemistryReadout["candidate"]): string {
  if (candidate.crossing === "L1->L2") return "+1 → tips L2";
  if (candidate.crossing === "L2->L3") return "+1 → tips L3";
  return `+1 → ${candidate.countAfter}`;
}

function liveBidLine(
  worth: WorthToYou,
  currentHighBid: number | null,
  objectPronoun: "him" | "her",
): string | null {
  if (currentHighBid === null) return null;
  if (currentHighBid < worth.recommendedNumber) {
    return `Still under your number -- ${money(worth.recommendedNumber - currentHighBid)} to go`;
  }
  return `Past your number -- let ${objectPronoun} go`;
}

function roomRelation(
  capValue: number | null,
  market: RosterIntelligencePayload["market"],
): string | null {
  if (capValue === null || !market) return null;
  if (capValue < market.band.low) return "The room wants more than you should give.";
  if (capValue > market.band.high) return "You'd be paying past the room -- make sure you mean it.";
  return "That sits inside what the room expects.";
}

function needSummary(need: WhisperBidVsPassNeed | null): string {
  if (!need) return "Needs read unavailable.";
  if (need.minimumAdditions === 0 && need.deficits.length === 0) return "Roster law clean.";
  const additions = `${need.minimumAdditions} ${need.minimumAdditions === 1 ? "addition" : "additions"}`;
  const deficits = need.deficits
    .slice(0, 2)
    .map((deficit) => deficit.replace(/\.$/, ""));
  return deficits.length > 0 ? `Needs ${additions}: ${deficits.join("; ")}` : `Needs ${additions}.`;
}

function signedMoney(value: number): string {
  const rounded = Math.round(value);
  const prefix = rounded >= 0 ? "+" : "-";
  return `${prefix}${money(Math.abs(rounded))}`;
}

function money(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

function WhisperStyles() {
  return (
    <style>{`
      .auc-root .whisper-panel { margin-bottom: 16px; }
      .auc-root .whisper-strip {
        width: 100%;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 13px;
        border-radius: var(--auc-r-ctl);
        border: 1px solid var(--auc-hairline);
        border-left: 4px solid var(--whisper-team, var(--ballpark-brass));
        background: var(--auc-inset);
        color: var(--auc-text);
        box-shadow: var(--auc-shadow-card);
        cursor: pointer;
        text-align: left;
        animation: whisperPulse 0.34s ease-out 1;
      }
      .auc-root .whisper-strip:active { transform: scale(0.98); }
      .auc-root .whisper-affordance {
        color: var(--auc-muted);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.12em;
        white-space: nowrap;
      }
      .auc-root .whisper-dormant .whisper-strip {
        opacity: 0.55;
        cursor: not-allowed;
        border-left-color: transparent;
        animation: none;
      }
      .auc-root .whisper-body {
        padding: 16px;
        max-height: min(56vh, 480px);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin-top: 10px;
      }
      .auc-root .whisper-headline {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .auc-root .whisper-verdict {
        position: relative;
        font-size: 17px;
        line-height: 1.25;
        font-weight: 800;
      }
      .auc-root .whisper-verdict.push { color: #34d399; }
      .auc-root .whisper-verdict.cap { color: var(--ballpark-brass); }
      .auc-root .whisper-verdict.pass { color: color-mix(in srgb, var(--ballpark-sage) 85%, transparent); }
      .auc-root .whisper-verdict.flash::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        bottom: -4px;
        height: 2px;
        background: currentColor;
        animation: whisperVerdictFlash 0.3s ease-out 1;
      }
      .auc-root .whisper-number-row {
        display: flex;
        align-items: end;
        gap: 12px;
      }
      .auc-root .whisper-number {
        margin-top: 2px;
        font-size: 20px;
        font-weight: 800;
      }
      .auc-root .whisper-number.gold { color: var(--ballpark-scoreboard-yellow); }
      .auc-root .whisper-liquidity {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 7px;
        min-width: 0;
        padding: 8px 0;
        border-top: 1px solid rgba(232, 232, 216, 0.1);
        border-bottom: 1px solid rgba(232, 232, 216, 0.1);
      }
      .auc-root .whisper-liquidity-metric {
        display: flex;
        align-items: baseline;
        gap: 7px;
      }
      .auc-root .whisper-liquidity-number {
        color: var(--auc-text);
        font-size: 14px;
        font-weight: 900;
      }
      .auc-root .whisper-price-read,
      .auc-root .whisper-liquidity-state {
        font-size: 10px;
        line-height: 1;
        padding: 4px 7px;
      }
      .auc-root .whisper-price-read.value { color: #34d399; border-color: rgba(52, 211, 153, 0.45); background: rgba(52, 211, 153, 0.08); }
      .auc-root .whisper-price-read.fair { color: #bfdbfe; border-color: rgba(147, 197, 253, 0.45); background: rgba(147, 197, 253, 0.08); }
      .auc-root .whisper-price-read.stretch { color: #fbbf24; border-color: rgba(251, 191, 36, 0.45); background: rgba(251, 191, 36, 0.08); }
      .auc-root .whisper-price-read.pass { color: #fca5a5; border-color: rgba(248, 113, 113, 0.45); background: rgba(248, 113, 113, 0.09); }
      .auc-root .whisper-liquidity-state {
        color: var(--auc-muted);
        border-color: rgba(232, 232, 216, 0.18);
        background: rgba(232, 232, 216, 0.04);
      }
      .auc-root .whisper-liquidity-state.constrained,
      .auc-root .whisper-liquidity-state.emergency-fill {
        color: #fca5a5;
        border-color: rgba(248, 113, 113, 0.42);
        background: rgba(248, 113, 113, 0.08);
      }
      .auc-root .whisper-liquidity-state.aggressive {
        color: #34d399;
        border-color: rgba(52, 211, 153, 0.42);
        background: rgba(52, 211, 153, 0.07);
      }
      .auc-root .whisper-liquidity-small {
        color: var(--auc-muted);
        font-size: 11.5px;
        font-weight: 800;
        white-space: nowrap;
      }
      .auc-root .whisper-reason-row {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      .auc-root .whisper-reason-chip,
      .auc-root .whisper-priority-chip {
        font-size: 9.5px;
        line-height: 1;
        padding: 3px 6px;
      }
      .auc-root .whisper-reason-chip {
        color: var(--auc-muted);
        border-color: rgba(232, 232, 216, 0.18);
        background: rgba(232, 232, 216, 0.04);
      }
      .auc-root .whisper-priority-chip {
        color: var(--ballpark-brass);
        border-color: rgba(202, 164, 94, 0.58);
        background: rgba(202, 164, 94, 0.1);
      }
      .auc-root .whisper-why {
        margin: 0;
        color: var(--auc-text);
        font-size: 13.5px;
      }
      .auc-root .whisper-room-line {
        margin: 0;
        color: var(--auc-muted);
        font-size: 12.5px;
      }
      .auc-root .whisper-nomination,
      .auc-root .whisper-empty {
        margin: 0;
        color: var(--auc-text);
        font-size: 13.5px;
      }
      .auc-root .whisper-section {
        border-top: 1px solid var(--auc-hairline);
        padding-top: 14px;
      }
      .auc-root .whisper-bid-pass {
        display: flex;
        flex-direction: column;
        gap: 9px;
      }
      .auc-root .whisper-branch-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      .auc-root .whisper-branch-card {
        min-width: 0;
        border: 1px solid rgba(232, 232, 216, 0.12);
        background: rgba(0, 0, 0, 0.18);
        padding: 9px;
      }
      .auc-root .whisper-branch-head {
        align-items: center;
        gap: 8px;
      }
      .auc-root .whisper-branch-title {
        color: var(--auc-text);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.08em;
      }
      .auc-root .whisper-branch-budget {
        color: var(--ballpark-brass);
        font-size: 12px;
        font-weight: 900;
      }
      .auc-root .whisper-branch-need {
        min-height: 32px;
        margin: 7px 0 8px;
        color: var(--auc-muted);
        font-size: 11.5px;
        line-height: 1.3;
      }
      .auc-root .whisper-target-list {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .auc-root .whisper-target-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 6px;
        min-height: 25px;
        border-top: 1px solid rgba(232, 232, 216, 0.08);
        padding-top: 5px;
      }
      .auc-root .whisper-target-name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--auc-text);
        font-size: 12.5px;
        font-weight: 700;
      }
      .auc-root .whisper-surplus {
        font-size: 12px;
        font-weight: 900;
      }
      .auc-root .whisper-surplus.positive { color: #34d399; }
      .auc-root .whisper-surplus.negative { color: #f87171; }
      .auc-root .whisper-cant-afford {
        grid-column: 1 / -1;
        justify-self: start;
        color: #fca5a5;
        border-color: rgba(248, 113, 113, 0.45);
        background: rgba(248, 113, 113, 0.1);
        font-size: 9.5px;
        padding: 3px 6px;
      }
      .auc-root .whisper-target-empty {
        margin: 0;
        color: var(--auc-muted);
        font-size: 12px;
      }
      .auc-root .whisper-lights-row {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 6px;
      }
      .auc-root .whisper-light {
        appearance: none;
        display: grid;
        justify-items: center;
        gap: 6px;
        min-width: 0;
        padding: 0 2px 8px;
        border: 0;
        border-bottom: 2px solid transparent;
        background: transparent;
        color: var(--auc-muted);
        font-size: 10.5px;
        font-weight: 800;
        letter-spacing: 0.1em;
        cursor: pointer;
      }
      .auc-root .whisper-light.selected { border-bottom-color: var(--ballpark-brass); }
      .auc-root .whisper-dot {
        width: 14px;
        height: 14px;
        border-radius: 999px;
        border: 3px solid currentColor;
      }
      .auc-root .whisper-light[data-status="green"] .whisper-dot { background: #34d399; border-color: #34d399; }
      .auc-root .whisper-light[data-status="amber"] .whisper-dot { background: #fbbf24; border-color: #fbbf24; }
      .auc-root .whisper-light[data-status="red"] .whisper-dot { background: #DC3545; border-color: #DC3545; }
      .auc-root .whisper-light[data-status="unknown"] .whisper-dot { background: transparent; border-color: rgba(232, 232, 216, 0.45); }
      .auc-root .whisper-light-sentence {
        min-height: 40px;
        margin: 10px 0 0;
        color: var(--auc-text);
        font-size: 13px;
      }
      .auc-root .whisper-chemistry-readout {
        display: flex;
        flex-direction: column;
        gap: 9px;
      }
      .auc-root .whisper-chemistry-list {
        display: flex;
        flex-direction: column;
        border: 1px solid rgba(232, 232, 216, 0.1);
        background: rgba(0, 0, 0, 0.14);
      }
      .auc-root .whisper-chemistry-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 28px 38px minmax(88px, auto) auto;
        align-items: center;
        gap: 8px;
        min-height: 32px;
        padding: 7px 8px;
        border-bottom: 1px solid rgba(232, 232, 216, 0.08);
        color: var(--auc-muted);
        font-size: 12.5px;
      }
      .auc-root .whisper-chemistry-row:last-child { border-bottom: 0; }
      .auc-root .whisper-chemistry-row.candidate {
        color: var(--auc-text);
        background: rgba(202, 164, 94, 0.1);
        box-shadow: inset 3px 0 0 var(--ballpark-brass);
      }
      .auc-root .whisper-chem-word {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 800;
      }
      .auc-root .whisper-chem-count,
      .auc-root .whisper-chem-tier {
        color: var(--auc-text);
        font-weight: 900;
      }
      .auc-root .whisper-chem-next {
        color: var(--auc-muted);
        font-size: 12px;
      }
      .auc-root .whisper-chem-delta {
        justify-self: end;
        color: var(--ballpark-brass);
        border-color: rgba(202, 164, 94, 0.58);
        background: rgba(202, 164, 94, 0.12);
        font-size: 10px;
        padding: 3px 7px;
      }
      .auc-root .whisper-board-head { align-items: center; margin-bottom: 9px; }
      .auc-root .whisper-board-toggle {
        appearance: none;
        border: 0;
        background: transparent;
        color: var(--ballpark-brass);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.1em;
        cursor: pointer;
      }
      .auc-root .whisper-board-list,
      .auc-root .whisper-board-well {
        display: flex;
        flex-direction: column;
      }
      .auc-root .whisper-board-well {
        max-height: 190px;
        overflow-y: auto;
        margin-top: 8px;
        background: rgba(0, 0, 0, 0.22);
        border-top: 1px solid rgba(0, 0, 0, 0.35);
        border-bottom: 1px solid rgba(232, 232, 216, 0.08);
      }
      .auc-root .whisper-board-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 36px;
        border-bottom: 1px solid var(--auc-hairline);
        padding: 7px 4px 7px 8px;
      }
      .auc-root .whisper-board-row:last-child { border-bottom: 0; }
      .auc-root .whisper-board-row.on-block {
        border-left: 3px solid var(--ballpark-brass);
        padding-left: 5px;
      }
      .auc-root .whisper-rank { width: 18px; color: var(--auc-muted); font-size: 12px; }
      .auc-root .whisper-board-name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 13.5px;
        font-weight: 700;
      }
      .auc-root .whisper-worth {
        color: var(--auc-text);
        font-size: 12.5px;
        font-weight: 800;
      }
      .auc-root .whisper-on-block {
        color: var(--ballpark-brass);
        font-size: 10px;
        padding: 3px 7px;
      }
      .auc-root .whisper-need-chip,
      .auc-root .whisper-fit-chip {
        flex: 0 0 auto;
        font-size: 9.5px;
        line-height: 1;
        padding: 3px 6px;
      }
      .auc-root .whisper-need-chip {
        color: var(--ballpark-brass);
        border-color: rgba(202, 164, 94, 0.58);
        background: rgba(202, 164, 94, 0.12);
      }
      .auc-root .whisper-fit-chip {
        color: #f3cf74;
        border-color: rgba(243, 207, 116, 0.72);
        background: rgba(243, 207, 116, 0.08);
      }
      @keyframes whisperPulse {
        0% { border-color: var(--ballpark-brass); }
        100% { border-color: var(--auc-hairline); border-left-color: var(--whisper-team, var(--ballpark-brass)); }
      }
      @keyframes whisperVerdictFlash {
        from { opacity: 1; transform: scaleX(1); }
        to { opacity: 0; transform: scaleX(0.2); }
      }
      @media (prefers-reduced-motion: reduce) {
        .auc-root .whisper-strip,
        .auc-root .whisper-verdict.flash::after { animation: none !important; }
      }
      @media (max-width: 620px) {
        .auc-root .whisper-branch-grid { grid-template-columns: 1fr; }
        .auc-root .whisper-chemistry-row {
          grid-template-columns: minmax(0, 1fr) auto auto;
        }
        .auc-root .whisper-chem-next,
        .auc-root .whisper-chem-delta {
          grid-column: 1 / -1;
          justify-self: start;
        }
      }
    `}</style>
  );
}
