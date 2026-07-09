import { useEffect, useMemo, useState, useRef, type CSSProperties } from "react";

import {
  boardPositionGroups,
  sortBoardEntriesForPosition,
  type BoardEntry,
  type BoardRankOverrides,
  type ChemistryReadout,
  type Light,
  type RosterIntelligencePayload,
  type WorthToYou,
} from "../../../../engines/rosterIntelligencePayload";
import { gradePriceRange } from "../../../../engines/gradeBandPrice";
import type { Grade } from "../../../../engines/gradeEngine";
import type { LiquidityReasonCode } from "../../../../engines/liquidityAwareBidding";
import type { Player } from "../../../../utils/leagueBuilderStorage";
import type { TaxonomyPosition } from "../../../../data/playerArchetypeTaxonomy";
import { PlayerProfilePopover } from "../shared/PlayerProfilePopover";
import { RankReorderList, materializeRankOrder } from "../shared/RankReorderList";

/**
 * COCKPIT W1a/b (2026-07-08, DRAFT_COCKPIT_DESIGN_2026-07-08.md): "mlb" turns on the always-visible
 * Tier-1 verdict strip + Tier-2 promoted read. COCKPIT W1d (§2.5, same doc): "farm" keeps the
 * tap-through body (no MLB-style Tier-1/2 promotion — fog is the point, per JK's directive) but
 * gains its own zero-tap bridge headline above the strip, a narrowed 2-light row (SHAPE + BUDGET
 * only), and a dark-first chem-fit chip. Declared locally (not imported from AuctionStage.tsx) to
 * avoid a circular type dependency between the two sibling files.
 */
type WhisperTier = "mlb" | "farm";

interface WhisperPanelProps {
  payload: RosterIntelligencePayload | null;
  /** Defaults to "mlb" -- this file's own tests are all MLB-shaped fixtures. */
  tier?: WhisperTier;
}

interface WhisperNominationChip {
  position: string;
  pWithin: number;
  withinLots: number;
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
  /** COCKPIT W1a (RB-3): the marginal luxury tax this candidate adds, from auctionMarginalTax. */
  marginalTax?: number | null;
  /** COCKPIT W1b: WAIT/CHASE read from nominationOdds, computed by the page (session-scoped). */
  nominationChip?: WhisperNominationChip | null;
  /** COCKPIT W1d (farm Tier-1, team-conditioned): the MLB-bridge read, e.g. "MLB thin at C and
   * the pen -- chase catchers and bullpen arms," built from the page's already-tilted
   * rosterBoardPriorityGaps. Always visible above the strip when present; never rendered on MLB. */
  bridgeHeadline?: string | null;
  /** COCKPIT W1d fork 3 (dark-first): the chem-fit Tier-2 chip label from assembleFarmWhisper's
   * chemFitLabel -- only ever non-null once FARM_CHEM_FIT_ENABLED flips on. */
  chemFitLabel?: string | null;
  /** COCKPIT WAVE 2 (B3/Correction 5/7): the seat team's raw GM board order, needed to compute the
   * per-position 5-deep views (sortBoardEntriesForPosition needs the byPosition override map).
   * MLB only -- the farm board (out of scope for this wave) never reads this. */
  boardRankOverrides?: BoardRankOverrides | null;
  /** Persists a GLOBAL reorder (the full board, in its new order) back to Team.boardRankOverrides.
   * Absent = read-only board (e.g. every pre-Wave-2 test fixture, and any tier other than MLB). */
  onBoardReorderGlobal?: (orderedIds: readonly string[]) => void;
  /** Persists a PER-POSITION reorder for one canonical position back to Team.boardRankOverrides. */
  onBoardReorderPosition?: (position: TaxonomyPosition, orderedIds: readonly string[]) => void;
  /** COCKPIT WAVE 2 (B3, S3.4 auto-advance): "Next up at CF: Ramírez -- your #2." -- a single
   * Tier-2 line naming the promoted next target after a lot resolves and a ranked player left the
   * pool. Team-conditioned; absent when nothing meaningful changed (anti-generic law, design §1.8).
   * MLB only. */
  nextUpLine?: string | null;
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

// COCKPIT W1a/b: BALANCE is deleted from this order (rosterIntelligencePayload.ts FiveLights.balance
// doc comment) -- these 4 keys are the only lights the MLB tier renders.
const MLB_LIGHT_ORDER = ["shape", "identity", "chemistry", "budget"] as const;
// COCKPIT W1d (design §2.5, §4 honesty pass): farm renders ONLY shape + budget -- identity and
// chemistry-synergy have no farm data source and are DELETED, not stubbed (assembleFarmWhisper no
// longer populates those keys at all; FiveLights.identity/chemistry are optional for exactly this).
const FARM_LIGHT_ORDER = ["shape", "budget"] as const;
type LightKey = (typeof MLB_LIGHT_ORDER)[number];

function lightOrderForTier(tier: WhisperTier): readonly LightKey[] {
  return tier === "farm" ? FARM_LIGHT_ORDER : MLB_LIGHT_ORDER;
}

// COCKPIT W1b grade-sanity chip (captain ruling 2026-07-08, superseding the initial ±1-step
// window): MLB overallGrade is exact/known (never fogged, unlike farm scout bands), so "normal
// for a B+" means that grade's OWN salary floor-to-ceiling — a pure gradePriceRange table read of
// the tested GRADE_SALARY_BOUNDS. Zero invented parameters, no synthesized window. This list is a
// VALIDITY GUARD only (which grades the bounds table prices), never a pricing ladder:
// leagueBuilderStorage's 13-value Grade union carries 'D-' which the 12-value engine table lacks.
const PRICED_GRADES: readonly Grade[] = ["S", "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D"];

const NO_READ_LINE = "No read yet -- still doing my homework on this club.";
const EMPTY_BOARD_LINE = "The board's bare. Finish the roster with what's left on the floor.";
export const HELP_LINE = "Your assistant GM's private read -- advice for this seat alone. Only the club on the clock can open it, and it covers itself when the turn moves on. He suggests; you decide.";

/** COCKPIT WAVE 2: default the PER-POSITION tab to the first canonical group that actually has
 * remaining candidates, rather than always "C" -- an empty first tab is dead-clutter (design §1.8). */
function firstPopulatedBoardPosition(board: readonly BoardEntry[]): TaxonomyPosition {
  const groups = boardPositionGroups();
  const populated = new Set(board.map((entry) => entry.position).filter((position): position is string => Boolean(position)));
  return groups.find((position) => populated.has(position)) ?? groups[0];
}

export function WhisperPanel({ payload, tier = "mlb" }: WhisperPanelProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedLight, setSelectedLight] = useState<LightKey>("shape");
  const [revealedLight, setRevealedLight] = useState<LightKey | null>(null);
  const [flashVerdict, setFlashVerdict] = useState(false);
  // COCKPIT WAVE 2 (B3/Correction 5/7): Tier-3 board view state -- GLOBAL (the pre-existing flat
  // board, now GM-sortable when expanded) vs PER-POSITION (5-deep per canonical position).
  const [boardViewMode, setBoardViewMode] = useState<"global" | "position">("global");
  const [boardPosition, setBoardPosition] = useState<TaxonomyPosition>(() => firstPopulatedBoardPosition(payload?.board ?? []));
  const [boardPositionExpanded, setBoardPositionExpanded] = useState(false);
  const previousVerdict = useRef<WorthToYou["verdict"] | null>(null);
  const meta = (payload ?? {}) as WhisperPayloadMeta;
  const clubName = meta.seatClubName ?? payload?.seatTeamId ?? "";
  const teamPrimary = meta.seatPrimary ?? "var(--ballpark-brass)";
  const board = payload?.board ?? [];
  const scorecard = payload?.scorecard;
  const worth = payload?.worthToYou;
  const isMlb = tier === "mlb";

  // COCKPIT WAVE 2: per-position counts (for the tab row) and the position-scoped, GM-blended
  // 5-deep view. MLB only -- board entries carry `position` from assembleBoard's candidate.shape;
  // farm never populates it and never renders this view.
  const boardPositionCounts = useMemo(() => {
    const counts = new Map<TaxonomyPosition, number>();
    const groups = boardPositionGroups();
    for (const entry of board) {
      if (entry.position && groups.includes(entry.position as TaxonomyPosition)) {
        const position = entry.position as TaxonomyPosition;
        counts.set(position, (counts.get(position) ?? 0) + 1);
      }
    }
    return counts;
  }, [board]);
  // BOARDFIX2 (Item B): `sortBoardEntriesForPosition`'s own blend is a worth+rank NUDGE, not a
  // positional override (see materializeRankOrder's doc comment) -- it can leapfrog a GM's
  // explicit rank past a much-higher-worth entry ranked just below. `board` itself already
  // arrives pre-materialized for the GLOBAL order (LeagueBuilderAuctionDraft.tsx), but the
  // PER-POSITION view has its own, separate byPosition override -- compute the position-scoped
  // NATURAL order (no override passed; every non-ranked candidate's blend bonus is 0 either way)
  // and materialize the real per-position override on top so a typed/dragged rank lands exactly
  // where the GM put it.
  const boardPositionNatural = useMemo(
    () => sortBoardEntriesForPosition(board, boardPosition, undefined),
    [board, boardPosition],
  );
  const boardPositionView = useMemo(
    () => materializeRankOrder(boardPositionNatural, (entry) => entry.playerId, meta.boardRankOverrides?.byPosition?.[boardPosition]),
    [boardPositionNatural, meta.boardRankOverrides, boardPosition],
  );

  const defaultLight = useMemo(() => {
    if (!scorecard) return "shape";
    const order = lightOrderForTier(tier);
    return order
      .map((key) => ({ key, light: scorecard[key] }))
      .filter((entry): entry is { key: LightKey; light: Light } => Boolean(entry.light))
      .sort((left, right) => lightRank(left.light) - lightRank(right.light) || order.indexOf(left.key) - order.indexOf(right.key))[0]
      ?.key ?? "shape";
  }, [scorecard, tier]);

  useEffect(() => {
    setOpen(false);
    setExpanded(false);
    setRevealedLight(null);
    setBoardViewMode("global");
    setBoardPositionExpanded(false);
    setBoardPosition(firstPopulatedBoardPosition(board));
    previousVerdict.current = null;
    // board is intentionally excluded -- this effect fires once per seat change (matching the
    // pre-existing open/expanded reset above), not on every same-seat lot recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.seatTeamId]);

  useEffect(() => {
    setSelectedLight(defaultLight);
    setRevealedLight(null);
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

  const lotPlayerForGrade = meta.currentLotPlayerId ? meta.boardPlayers?.[meta.currentLotPlayerId] : undefined;

  function renderLights(mode: "mlb" | "farm") {
    if (!scorecard) return null;
    const order = lightOrderForTier(mode);
    const activeKey = mode === "mlb" ? revealedLight : selectedLight;
    const selectedSentence = scorecard[selectedLight];
    const revealedSentence = revealedLight ? scorecard[revealedLight] : undefined;
    return (
      <section className="whisper-section whisper-lights-wrap" data-testid="whisper-lights">
        <div
          className="whisper-lights-row"
          // Farm always shows 2 lights (SHAPE + BUDGET) regardless of viewport -- override the
          // shared 4-column class only for the narrower farm order; MLB keeps its existing
          // class-driven layout (4 columns, 2 on mobile via the shared media query) untouched.
          style={order.length !== MLB_LIGHT_ORDER.length ? { gridTemplateColumns: `repeat(${order.length}, minmax(0, 1fr))` } : undefined}
        >
          {order.map((key) => {
            const light = scorecard[key];
            if (!light) return null;
            const active = activeKey === key;
            return (
              <button
                key={key}
                type="button"
                className={`whisper-light ${active ? "selected" : ""}`}
                data-status={light.status}
                aria-label={key.toUpperCase()}
                title={light.status === "unknown" ? NO_READ_LINE : light.sentence}
                onClick={() => (mode === "mlb" ? setRevealedLight(key) : setSelectedLight(key))}
              >
                <span className="whisper-dot" />
                <span>{key.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
        {mode === "farm" ? (
          selectedSentence && (
            <p className="whisper-light-sentence">
              {selectedSentence.status === "unknown" ? NO_READ_LINE : selectedSentence.sentence}
            </p>
          )
        ) : (
          revealedSentence && (
            <p className="whisper-light-sentence" data-testid="whisper-tier2-light-sentence">
              {revealedSentence.status === "unknown" ? NO_READ_LINE : revealedSentence.sentence}
            </p>
          )
        )}
      </section>
    );
  }

  return (
    <section
      className={`whisper-panel${open ? " open" : ""}`}
      style={{ "--whisper-team": teamPrimary } as CSSProperties}
    >
      <WhisperStyles />

      {isMlb && worth && (
        <WhisperVerdictStrip payload={payload} marginalTax={meta.marginalTax ?? null} />
      )}

      {!isMlb && (meta.bridgeHeadline || meta.chemFitLabel) && (
        <FarmBridgeStrip headline={meta.bridgeHeadline ?? null} chemFitLabel={meta.chemFitLabel ?? null} />
      )}

      {isMlb && (
        <section className="whisper-tier2" data-testid="whisper-tier2">
          {meta.bidVsPass && <CompactBidVsPass bidVsPass={meta.bidVsPass} />}
          {meta.nextUpLine && (
            <p className="whisper-next-up" data-testid="whisper-next-up">{meta.nextUpLine}</p>
          )}
          <div className="whisper-tier2-chips">
            <NominationOddsChip chip={meta.nominationChip ?? null} />
            <GradeSanityChip player={lotPlayerForGrade} />
          </div>
          {renderLights("mlb")}
        </section>
      )}

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
            tier={tier}
          />

          {meta.bidVsPass && <BidVsPassSection bidVsPass={meta.bidVsPass} />}

          {!isMlb && renderLights("farm")}

          {worth?.chemistryReadout && <ChemistryReadoutSection readout={worth.chemistryReadout} />}

          <section className="whisper-section whisper-board" data-testid="whisper-board">
            <div className="row whisper-board-head">
              <div className="eyebrow">YOUR BOARD</div>
              <span className="chip">{board.length} NAMES LEFT</span>
              <span className="spacer" />
              {/* COCKPIT WAVE 2 (Correction 5): MLB-only GLOBAL/PER-POSITION toggle -- absent on
                  farm (out of scope) and absent on an empty board. */}
              {isMlb && board.length > 0 && (
                <div className="whisper-board-view-toggle" data-testid="whisper-board-view-toggle">
                  <button
                    type="button"
                    className={`whisper-board-view-btn${boardViewMode === "global" ? " active" : ""}`}
                    onClick={() => setBoardViewMode("global")}
                  >
                    GLOBAL
                  </button>
                  <button
                    type="button"
                    className={`whisper-board-view-btn${boardViewMode === "position" ? " active" : ""}`}
                    onClick={() => setBoardViewMode("position")}
                  >
                    PER-POSITION
                  </button>
                </div>
              )}
              {(!isMlb || boardViewMode === "global") && board.length > 3 && (
                <button type="button" className="whisper-board-toggle" onClick={() => setExpanded((current) => !current)}>
                  {expanded ? "FOLD IT UP" : "FULL BOARD"}
                </button>
              )}
            </div>
            {board.length === 0 ? (
              <p className="whisper-empty">{EMPTY_BOARD_LINE}</p>
            ) : isMlb && boardViewMode === "position" ? (
              <MlbBoardPositionView
                position={boardPosition}
                positionCounts={boardPositionCounts}
                positionView={boardPositionView}
                expanded={boardPositionExpanded}
                boardMeta={meta.boardMeta}
                boardPlayers={meta.boardPlayers}
                currentLotPlayerId={meta.currentLotPlayerId ?? payload.market?.playerId}
                onSelectPosition={(position) => {
                  setBoardPosition(position);
                  setBoardPositionExpanded(false);
                }}
                onToggleExpanded={() => setBoardPositionExpanded((current) => !current)}
                onReorderPosition={meta.onBoardReorderPosition}
              />
            ) : (
              <>
                {(!isMlb || !expanded) && (
                  <div className="whisper-board-list">
                    {board.slice(0, 3).map((entry, index) => (
                      <BoardRow
                        key={entry.playerId}
                        entry={entry}
                        rank={index + 1}
                        meta={meta.boardMeta?.[entry.playerId]}
                        player={meta.boardPlayers?.[entry.playerId]}
                        currentLotPlayerId={meta.currentLotPlayerId ?? payload.market?.playerId}
                        revealFull={isMlb}
                      />
                    ))}
                  </div>
                )}
                {expanded && (
                  <div className="whisper-board-well">
                    {isMlb ? (
                      <RankReorderList
                        items={board}
                        getId={(entry) => entry.playerId}
                        itemLabel={(entry) => meta.boardMeta?.[entry.playerId]?.name ?? entry.note ?? entry.playerId}
                        onReorder={(orderedIds) => meta.onBoardReorderGlobal?.(orderedIds)}
                        readOnly={!meta.onBoardReorderGlobal}
                        listClassName="whisper-board-reorder-list"
                        rowClassName={(entry, _index, dragged) =>
                          `whisper-board-row${(meta.currentLotPlayerId ?? payload.market?.playerId) === entry.playerId ? " on-block" : ""}${dragged ? " dragged" : ""}`
                        }
                        leftWrapClassName="contents"
                        rightWrapClassName="contents"
                        dragHandleClassName="whisper-board-drag"
                        arrowButtonClassName="whisper-board-arrow"
                        rankBadgeClassName="whisper-board-rank-badge"
                        rankInputClassName="whisper-board-rank-input"
                        sendToTopClassName="whisper-board-send-top"
                        renderContent={(entry, index) => (
                          <BoardRowFields
                            entry={entry}
                            rank={index + 1}
                            meta={meta.boardMeta?.[entry.playerId]}
                            player={meta.boardPlayers?.[entry.playerId]}
                            revealFull
                            showRank={false}
                          />
                        )}
                        renderBeforeArrows={(entry) => (
                          <BoardRowTrailing
                            entry={entry}
                            meta={meta.boardMeta?.[entry.playerId]}
                            onBlock={(meta.currentLotPlayerId ?? payload.market?.playerId) === entry.playerId}
                          />
                        )}
                      />
                    ) : (
                      board.slice(3).map((entry, index) => (
                        <BoardRow
                          key={entry.playerId}
                          entry={entry}
                          rank={index + 4}
                          meta={meta.boardMeta?.[entry.playerId]}
                          player={meta.boardPlayers?.[entry.playerId]}
                          currentLotPlayerId={meta.currentLotPlayerId ?? payload.market?.playerId}
                          revealFull={isMlb}
                        />
                      ))
                    )}
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

/** COCKPIT W1a Tier 1 -- THE CALL. Always visible on the stage, zero taps (design doc §2). */
function WhisperVerdictStrip({
  payload,
  marginalTax,
}: {
  payload: RosterIntelligencePayload;
  marginalTax: number | null;
}) {
  const worth = payload.worthToYou;
  if (!worth) return null;

  const verdictWord = worth.verdict === "push"
    ? "PUSH"
    : worth.verdict === "pass"
      ? "WALK"
      : `CAP ${money(worth.recommendedNumber)}`;

  // ONE CEILING (F9, design §1.3): recommendedNumber is already Math.min(worth, suggestedMaxBid) --
  // the SAME liquidity-adjusted ceiling the verdict/room-relation/budget light agree on -- never
  // capValue (the unreserved completion ceiling). TRUE COST only adds the marginal tax on top.
  const trueCost = marginalTax !== null && marginalTax !== 0
    ? worth.recommendedNumber + marginalTax
    : null;

  const fitPct = signedPercent(worth.archetypeFitMultiplier - 1);
  const identityStatus = payload.scorecard?.identity?.status ?? "unknown";
  const topReason = worth.reasonCodes[0];

  return (
    <section className="whisper-tier1" data-testid="whisper-tier1">
      <span className={`whisper-tier1-verdict ${worth.verdict}`} data-testid="whisper-tier1-verdict">
        {verdictWord}
      </span>
      <span className="whisper-tier1-number" data-testid="whisper-tier1-number">
        YOUR NUMBER {worth.recommendedNumber === 0 ? "PASS" : money(worth.recommendedNumber)}
        {trueCost !== null && (
          <span className="whisper-tier1-truecost" data-testid="whisper-tier1-truecost">
            {" "}— TRUE COST {money(trueCost)} AFTER TAX
          </span>
        )}
      </span>
      <span
        className={`chip whisper-tier1-fit whisper-tier1-fit-${identityStatus}`}
        data-testid="whisper-tier1-fit"
      >
        FIT {fitPct}
      </span>
      {topReason && (
        <span className="chip whisper-tier1-reason" data-testid="whisper-tier1-reason">
          {reasonCodeLabel(topReason)}
        </span>
      )}
    </section>
  );
}

/**
 * COCKPIT W1d, farm "Tier 1" -- THE BRIDGE HEADLINE (design §2.5). Always visible above the strip,
 * zero taps, team-conditioned (built from THIS team's rosterBoardPriorityGaps by the page) --
 * satisfies the anti-generic law (principle 8): it varies with the actual MLB roster, never a
 * generic explainer. The chem-fit chip is dark-first (fork 3) -- absent while the flag is off.
 */
function FarmBridgeStrip({
  headline,
  chemFitLabel,
}: {
  headline: string | null;
  chemFitLabel: string | null;
}) {
  return (
    <section className="whisper-tier1 whisper-farm-bridge" data-testid="whisper-farm-bridge">
      <span className="eyebrow">FARM BRIDGE</span>
      {headline && <span className="whisper-farm-bridge-text">{headline}</span>}
      {chemFitLabel && (
        <span className="chip whisper-farm-bridge-chem" data-testid="whisper-farm-chem-fit">
          {chemFitLabel}
        </span>
      )}
    </section>
  );
}

/** COCKPIT W1b Tier 2 item 1 -- Bid-vs-Pass promoted to a permanently visible compact readout. */
function CompactBidVsPass({ bidVsPass }: { bidVsPass: WhisperBidVsPass }) {
  return (
    <div className="whisper-tier2-bidpass" data-testid="whisper-tier2-bidpass">
      <div className="whisper-tier2-bidpass-row">
        <span className="lab">BID {money(bidVsPass.bidAmount)}</span>
        <span className="num">{money(bidVsPass.bid.budgetAfter)} left</span>
        <span className="muted">{additionsPhrase(bidVsPass.bid.needAfter)}</span>
      </div>
      <div className="whisper-tier2-bidpass-row">
        <span className="lab">PASS</span>
        <span className="num">{money(bidVsPass.pass.budgetAfter)} left</span>
        <span className="muted">{additionsPhrase(bidVsPass.pass.needAfter)}</span>
      </div>
    </div>
  );
}

function additionsPhrase(need: WhisperBidVsPassNeed | null): string {
  if (!need) return "needs read unavailable";
  if (need.minimumAdditions === 0) return "roster clean";
  return `${need.minimumAdditions} to fill`;
}

/** COCKPIT W1b Tier 2 item 2 -- WAIT/CHASE, wired from the zero-caller nominationOdds engine. */
function NominationOddsChip({ chip }: { chip: WhisperNominationChip | null | undefined }) {
  if (!chip) return null;
  const pct = Math.round(chip.pWithin * 100);
  return (
    <span className="chip whisper-tier2-odds" data-testid="whisper-tier2-nomination-odds">
      Next {chip.position}: ~{pct}% within {chip.withinLots} lots
    </span>
  );
}

/** COCKPIT W1b Tier 2 item 3 -- grade sanity chip, wired from the build-dark gradeBandPrice engine. */
function GradeSanityChip({ player }: { player: Player | undefined | null }) {
  if (!player) return null;
  const range = gradeSanityRange(player.overallGrade);
  if (!range) return null;
  return (
    <span className="chip whisper-tier2-grade" data-testid="whisper-tier2-grade">
      Normal for a {range.grade}: {money(range.low)}–{money(range.high)}
    </span>
  );
}

function gradeSanityRange(overallGrade: string): { grade: Grade; low: number; high: number } | null {
  // 'D-' (and any other unrecognized value) falls back to the worst priced tier ('D') rather than
  // crash or fabricate a bound -- see PRICED_GRADES doc comment.
  const grade: Grade = (PRICED_GRADES as readonly string[]).includes(overallGrade)
    ? (overallGrade as Grade)
    : "D";
  const range = gradePriceRange(grade);
  return { grade, low: range.low, high: range.high };
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
  tier,
}: {
  worth: WorthToYou | undefined;
  board: readonly BoardEntry[];
  market: RosterIntelligencePayload["market"];
  currentHighBid: number | null;
  objectPronoun: "him" | "her";
  flash: boolean;
  tier: WhisperTier;
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

  // F9 RULING: room-relation is driven by the SAME liquidity-adjusted ceiling as the verdict and
  // budget light (worth.suggestedMaxBid), never the unreserved worth.capValue — otherwise this
  // line can say "inside expectations" while the verdict above says pass.
  const relation = roomRelation(worth.suggestedMaxBid, market);
  const verdictText = verdictLine(worth, objectPronoun);
  const liveBidText = liveBidLine(worth, currentHighBid, objectPronoun);
  // COCKPIT W1a declutter: on the MLB cockpit the top-priority reason + FIT chip are already
  // promoted to the always-visible Tier-1 strip (WhisperVerdictStrip) -- this tap-through detail
  // shows the REMAINING reason chips only, so nothing repeats itself. Farm has no Tier-1 promotion
  // yet (W1d), so it keeps the full original set.
  const remainingReasonCodes = tier === "mlb" ? worth.reasonCodes.slice(1) : worth.reasonCodes;
  const includeFitChip = tier !== "mlb";
  return (
    <section className="whisper-headline" data-testid="whisper-headline">
      <div className={`whisper-verdict ${worth.verdict} ${flash ? "flash" : ""}`}>
        {verdictText}
      </div>
      <div className="whisper-number-row">
        <div>
          <div className="eyebrow">YOUR NUMBER</div>
          <div
            className={`whisper-number num ${worth.verdict === "cap" ? "gold" : ""}`}
            data-testid="whisper-your-number"
          >
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
        {/* F9 RULING: capValue (the unreserved ceiling) may render ONLY under this distinct,
            honestly-labeled line -- it must never drive the verdict/room-relation/budget light. */}
        {worth.capValue !== null && (
          <span className="whisper-liquidity-small" data-testid="whisper-total-capacity">
            Total Capacity {money(worth.capValue)}
          </span>
        )}
      </div>
      <div className="whisper-reason-row">
        {liquidityReasonLabels(remainingReasonCodes).map((label) => (
          <span key={label} className="chip whisper-reason-chip">{label}</span>
        ))}
        {prioritySignalLabels(worth, includeFitChip).map((label) => (
          <span key={label} className="chip whisper-priority-chip">{label}</span>
        ))}
      </div>
      {liveBidText && <p className="whisper-live-bid">{liveBidText}</p>}
      <p className="whisper-why">{whyLine(worth)}</p>
      {relation && <p className="whisper-room-line">{relation}</p>}
    </section>
  );
}

/** The rank number + popover-wrapped name -- shared by the static BoardRow and the GM-sortable
 * RankReorderList row (COCKPIT WAVE 2). */
function BoardRowFields({
  entry,
  rank,
  meta,
  player,
  revealFull,
  showRank = true,
}: {
  entry: BoardEntry;
  rank: number;
  meta: { name?: string; positions?: string } | undefined;
  player: Player | undefined;
  /** COCKPIT W1d rework (audit note (g)): tier-gated by the caller (farm -> false), matching the
   * three AuctionStage popover sites -- belt-and-suspenders over the 'hidden' literal gate. */
  revealFull: boolean;
  /** BOARDFIX1: RankReorderList now renders its own interactive "#N" rank badge (click-to-edit +
   * send-to-top), so its callers suppress this static one to avoid a duplicate rank number. The
   * static BoardRow (top-3 preview, farm's read-only list) keeps showing it. */
  showRank?: boolean;
}) {
  const name = <span className="whisper-board-name">{meta?.name ?? entry.note ?? entry.playerId}</span>;
  return (
    <>
      {showRank ? <span className="num whisper-rank">{rank}</span> : null}
      {player ? (
        <PlayerProfilePopover player={player} revealFull={revealFull}>
          {name}
        </PlayerProfilePopover>
      ) : (
        name
      )}
    </>
  );
}

/** The need/fit chips, position label, on-block chip, and worth figure -- shared the same way. */
function BoardRowTrailing({
  entry,
  meta,
  onBlock,
}: {
  entry: BoardEntry;
  meta: { name?: string; positions?: string } | undefined;
  onBlock: boolean;
}) {
  return (
    <>
      {entry.needTag && <span className="chip whisper-need-chip">{entry.needTag}</span>}
      {entry.fitTag && <span className="chip whisper-fit-chip">{entry.fitTag}</span>}
      <span className="pos">{meta?.positions ?? entry.matchedShape ?? "POS"}</span>
      {onBlock && <span className="chip whisper-on-block">ON THE BLOCK</span>}
      <span className="spacer" />
      <span className="num whisper-worth">{money(entry.worth)}</span>
    </>
  );
}

function BoardRow({
  entry,
  rank,
  meta,
  player,
  currentLotPlayerId,
  revealFull,
}: {
  entry: BoardEntry;
  rank: number;
  meta: { name?: string; positions?: string } | undefined;
  player: Player | undefined;
  currentLotPlayerId: string | undefined;
  revealFull: boolean;
}) {
  const onBlock = currentLotPlayerId === entry.playerId;
  return (
    <div className={`whisper-board-row${onBlock ? " on-block" : ""}`}>
      <BoardRowFields entry={entry} rank={rank} meta={meta} player={player} revealFull={revealFull} />
      <BoardRowTrailing entry={entry} meta={meta} onBlock={onBlock} />
    </div>
  );
}

/** COCKPIT WAVE 2 (Correction 5): the 5-deep-per-position Tier-3 view, GM-sortable via the same
 * shared RankReorderList the global view and the setup RANK YOUR BOARD zone both use. */
const TIER3_POSITION_DEPTH = 5;

function MlbBoardPositionView({
  position,
  positionCounts,
  positionView,
  expanded,
  boardMeta,
  boardPlayers,
  currentLotPlayerId,
  onSelectPosition,
  onToggleExpanded,
  onReorderPosition,
}: {
  position: TaxonomyPosition;
  positionCounts: ReadonlyMap<TaxonomyPosition, number>;
  positionView: readonly BoardEntry[];
  expanded: boolean;
  boardMeta: Record<string, { name?: string; positions?: string }> | undefined;
  boardPlayers: Record<string, Player> | undefined;
  currentLotPlayerId: string | undefined;
  onSelectPosition: (position: TaxonomyPosition) => void;
  onToggleExpanded: () => void;
  onReorderPosition: ((position: TaxonomyPosition, orderedIds: readonly string[]) => void) | undefined;
}) {
  const groups = boardPositionGroups();
  const visible = expanded ? positionView : positionView.slice(0, TIER3_POSITION_DEPTH);

  // A reorder committed against the visible 5-deep window must not drop the rank of anything
  // currently hidden below the fold -- append the untouched remainder in its existing order.
  const withStableRemainder = (orderedVisibleIds: readonly string[]): string[] => {
    const movedIds = new Set(orderedVisibleIds);
    const remainder = positionView.map((entry) => entry.playerId).filter((id) => !movedIds.has(id));
    return [...orderedVisibleIds, ...remainder];
  };

  return (
    <div className="whisper-board-position-view" data-testid="whisper-board-position-view">
      <div className="whisper-board-position-tabs">
        {groups.map((candidate) => (
          <button
            key={candidate}
            type="button"
            className={`whisper-board-position-tab${candidate === position ? " active" : ""}`}
            onClick={() => onSelectPosition(candidate)}
          >
            {candidate} ({positionCounts.get(candidate) ?? 0})
          </button>
        ))}
      </div>
      {positionView.length === 0 ? (
        <p className="whisper-empty">Nobody left in the pool at {position}.</p>
      ) : (
        <>
          <RankReorderList
            items={visible}
            getId={(entry) => entry.playerId}
            itemLabel={(entry) => boardMeta?.[entry.playerId]?.name ?? entry.note ?? entry.playerId}
            onReorder={(orderedIds) => onReorderPosition?.(position, withStableRemainder(orderedIds))}
            readOnly={!onReorderPosition}
            listClassName="whisper-board-reorder-list"
            rowClassName={(entry, _index, dragged) =>
              `whisper-board-row${currentLotPlayerId === entry.playerId ? " on-block" : ""}${dragged ? " dragged" : ""}`
            }
            leftWrapClassName="contents"
            rightWrapClassName="contents"
            dragHandleClassName="whisper-board-drag"
            arrowButtonClassName="whisper-board-arrow"
            rankBadgeClassName="whisper-board-rank-badge"
            rankInputClassName="whisper-board-rank-input"
            sendToTopClassName="whisper-board-send-top"
            renderContent={(entry, index) => (
              <BoardRowFields
                entry={entry}
                rank={index + 1}
                meta={boardMeta?.[entry.playerId]}
                player={boardPlayers?.[entry.playerId]}
                revealFull
                showRank={false}
              />
            )}
            renderBeforeArrows={(entry) => (
              <BoardRowTrailing
                entry={entry}
                meta={boardMeta?.[entry.playerId]}
                onBlock={currentLotPlayerId === entry.playerId}
              />
            )}
          />
          {positionView.length > TIER3_POSITION_DEPTH && (
            <button type="button" className="whisper-board-toggle" onClick={onToggleExpanded}>
              {expanded ? "TOP 5 ONLY" : `SHOW ALL ${positionView.length}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function lightRank(light: { status: LightStatusLike }): number {
  if (light.status === "red") return 0;
  if (light.status === "amber") return 1;
  if (light.status === "green") return 2;
  return 3;
}

type LightStatusLike = "green" | "amber" | "red" | "unknown";

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

function reasonCodeLabel(code: LiquidityReasonCode): string {
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
}

function liquidityReasonLabels(codes: readonly LiquidityReasonCode[]): string[] {
  return codes.map(reasonCodeLabel).slice(0, 4);
}

function prioritySignalLabels(worth: WorthToYou, includeFit: boolean): string[] {
  const labels: string[] = [];
  if (Math.abs(worth.needMultiplier - 1) >= 0.02) {
    labels.push(`NEED ${signedPercent(worth.needMultiplier - 1)}`);
  }
  if (includeFit && Math.abs(worth.archetypeFitMultiplier - 1) >= 0.02) {
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
  maxBid: number,
  market: RosterIntelligencePayload["market"],
): string | null {
  if (!market) return null;
  if (maxBid < market.band.low) return "The room wants more than you should give.";
  if (maxBid > market.band.high) return "You'd be paying past the room -- make sure you mean it.";
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
      .auc-root .whisper-tier1 {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
        padding: 10px 13px;
        border-radius: var(--auc-r-ctl);
        border: 2px solid var(--auc-hairline);
        border-left: 4px solid var(--whisper-team, var(--ballpark-brass));
        background: var(--auc-inset);
        box-shadow: var(--auc-shadow-card);
      }
      .auc-root .whisper-tier1-verdict {
        font-size: 15px;
        font-weight: 900;
        letter-spacing: 0.04em;
        white-space: nowrap;
      }
      .auc-root .whisper-tier1-verdict.push { color: #34d399; }
      .auc-root .whisper-tier1-verdict.cap { color: var(--ballpark-brass); }
      .auc-root .whisper-tier1-verdict.pass { color: color-mix(in srgb, var(--ballpark-sage) 85%, transparent); }
      .auc-root .whisper-tier1-number {
        flex: 1 1 auto;
        min-width: 160px;
        color: var(--auc-text);
        font-size: 13px;
        font-weight: 800;
      }
      .auc-root .whisper-tier1-truecost { color: var(--ballpark-scoreboard-yellow); }
      .auc-root .whisper-tier1-fit {
        font-size: 10.5px;
        padding: 4px 8px;
      }
      .auc-root .whisper-tier1-fit-green { color: #34d399; border-color: rgba(52, 211, 153, 0.45); background: rgba(52, 211, 153, 0.08); }
      .auc-root .whisper-tier1-fit-amber { color: #fbbf24; border-color: rgba(251, 191, 36, 0.45); background: rgba(251, 191, 36, 0.08); }
      .auc-root .whisper-tier1-fit-red { color: #fca5a5; border-color: rgba(248, 113, 113, 0.45); background: rgba(248, 113, 113, 0.09); }
      .auc-root .whisper-tier1-fit-unknown { color: var(--auc-muted); border-color: rgba(232, 232, 216, 0.18); background: rgba(232, 232, 216, 0.04); }
      .auc-root .whisper-tier1-reason {
        color: var(--ballpark-brass);
        border-color: rgba(202, 164, 94, 0.58);
        background: rgba(202, 164, 94, 0.1);
        font-size: 9.5px;
        padding: 3px 7px;
      }
      .auc-root .whisper-farm-bridge-text {
        flex: 1 1 auto;
        min-width: 160px;
        color: var(--auc-text);
        font-size: 13px;
        font-weight: 700;
      }
      .auc-root .whisper-farm-bridge-chem {
        color: var(--ballpark-brass);
        border-color: rgba(202, 164, 94, 0.58);
        background: rgba(202, 164, 94, 0.1);
        font-size: 10px;
        padding: 3px 7px;
      }
      .auc-root .whisper-tier2 {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 10px;
        padding: 9px 13px;
        border-radius: var(--auc-r-ctl);
        border: 2px solid var(--auc-hairline);
        background: rgba(0, 0, 0, 0.1);
      }
      .auc-root .whisper-tier2-bidpass {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .auc-root .whisper-tier2-bidpass-row {
        display: flex;
        align-items: baseline;
        gap: 8px;
        font-size: 12px;
      }
      .auc-root .whisper-tier2-bidpass-row .lab { color: var(--auc-text); font-weight: 900; }
      .auc-root .whisper-tier2-bidpass-row .num { color: var(--ballpark-brass); font-weight: 800; }
      .auc-root .whisper-tier2-bidpass-row .muted { color: var(--auc-muted); }
      .auc-root .whisper-tier2-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .auc-root .whisper-tier2-odds,
      .auc-root .whisper-tier2-grade {
        font-size: 10.5px;
        padding: 4px 8px;
        color: var(--auc-text);
        border-color: rgba(232, 232, 216, 0.18);
        background: rgba(232, 232, 216, 0.04);
      }
      .auc-root .whisper-strip {
        width: 100%;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 13px;
        border-radius: var(--auc-r-ctl);
        border: 2px solid var(--auc-hairline);
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
        border: 2px solid rgba(232, 232, 216, 0.12);
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
      .auc-root .whisper-lights-wrap { border-top: 0; padding-top: 0; }
      .auc-root .whisper-lights-row {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
      }
      .auc-root .whisper-light {
        appearance: none;
        display: grid;
        justify-items: center;
        gap: 4px;
        min-width: 0;
        padding: 0 2px 6px;
        border: 0;
        border-bottom: 2px solid transparent;
        background: transparent;
        color: var(--auc-muted);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.1em;
        cursor: pointer;
      }
      .auc-root .whisper-light.selected { border-bottom-color: var(--ballpark-brass); }
      .auc-root .whisper-dot {
        width: 12px;
        height: 12px;
        border-radius: 0;
        border: 3px solid currentColor;
      }
      .auc-root .whisper-light[data-status="green"] .whisper-dot { background: #34d399; border-color: #34d399; }
      .auc-root .whisper-light[data-status="amber"] .whisper-dot { background: #fbbf24; border-color: #fbbf24; }
      .auc-root .whisper-light[data-status="red"] .whisper-dot { background: #DC3545; border-color: #DC3545; }
      .auc-root .whisper-light[data-status="unknown"] .whisper-dot { background: transparent; border-color: rgba(232, 232, 216, 0.45); }
      .auc-root .whisper-light-sentence {
        min-height: 0;
        margin: 6px 0 0;
        color: var(--auc-text);
        font-size: 12px;
      }
      .auc-root .whisper-chemistry-readout {
        display: flex;
        flex-direction: column;
        gap: 9px;
      }
      .auc-root .whisper-chemistry-list {
        display: flex;
        flex-direction: column;
        border: 2px solid rgba(232, 232, 216, 0.1);
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
      /* COCKPIT WAVE 2 (Correction 5/7): hard-edge treatments per DRAFT_SKIN_STANDARD_2026-07-08 --
         this UI is born on the standard rather than matching the not-yet-converted --auc-* stage. */
      .auc-root .whisper-board-view-toggle {
        display: flex;
        border: 2px solid var(--ballpark-panel-border);
      }
      .auc-root .whisper-board-view-btn {
        appearance: none;
        border: 0;
        border-radius: 0;
        background: transparent;
        color: var(--ballpark-chalk);
        opacity: 0.75;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.08em;
        padding: 4px 8px;
        cursor: pointer;
      }
      .auc-root .whisper-board-view-btn.active {
        background: var(--ballpark-brass);
        color: #1a1a1a;
        opacity: 1;
      }
      .auc-root .whisper-board-drag,
      .auc-root .whisper-board-arrow {
        appearance: none;
        border: 2px solid var(--ballpark-panel-border);
        border-radius: 0;
        background: transparent;
        color: var(--ballpark-brass);
        padding: 2px;
        cursor: pointer;
        flex-shrink: 0;
        display: inline-flex;
      }
      .auc-root .whisper-board-drag:hover,
      .auc-root .whisper-board-arrow:hover {
        border-color: var(--ballpark-brass);
      }
      .auc-root .whisper-board-arrow:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
      /* TEXTLAW-SWEEP Item B: these three shipped with THE BOARD tier (BOARDFIX1/2) but had no
         rules yet -- rendered with bare browser defaults. Hard-edge treatments per
         DRAFT_SKIN_STANDARD_2026-07-08 sec1/sec2, matching the sibling drag/arrow rules above. */
      .auc-root .whisper-board-rank-badge {
        appearance: none;
        border: 2px solid var(--ballpark-panel-border);
        border-radius: 0;
        background: var(--ballpark-page-bg);
        color: var(--ballpark-brass);
        font-size: 10px;
        font-weight: 800;
        width: 22px;
        padding: 2px 0;
        text-align: center;
        cursor: pointer;
        flex-shrink: 0;
      }
      .auc-root .whisper-board-rank-badge:hover {
        border-color: var(--ballpark-brass);
      }
      .auc-root .whisper-board-rank-badge:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .auc-root .whisper-board-rank-input {
        border: 2px solid var(--ballpark-brass);
        border-radius: 0;
        background: var(--ballpark-page-bg);
        color: var(--ballpark-chalk);
        font-size: 10px;
        font-weight: 800;
        width: 30px;
        padding: 2px 0;
        text-align: center;
        outline: none;
        flex-shrink: 0;
      }
      .auc-root .whisper-board-send-top {
        appearance: none;
        border: 2px solid var(--ballpark-panel-border);
        border-radius: 0;
        background: transparent;
        color: var(--ballpark-brass);
        padding: 2px;
        cursor: pointer;
        flex-shrink: 0;
        display: inline-flex;
      }
      .auc-root .whisper-board-send-top:hover {
        border-color: var(--ballpark-brass);
      }
      .auc-root .whisper-board-send-top:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
      .auc-root .whisper-board-row.dragged { opacity: 0.5; }
      .auc-root .whisper-next-up {
        border-left: 4px solid var(--ballpark-brass);
        padding-left: 8px;
        margin: 0 0 8px;
        font-size: 12px;
        font-weight: 700;
        color: var(--ballpark-chalk);
      }
      .auc-root .whisper-board-position-view { margin-top: 4px; }
      .auc-root .whisper-board-position-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-bottom: 8px;
      }
      .auc-root .whisper-board-position-tab {
        appearance: none;
        border: 2px solid var(--ballpark-panel-border);
        border-radius: 0;
        background: transparent;
        color: var(--ballpark-chalk);
        opacity: 0.75;
        font-size: 9.5px;
        font-weight: 800;
        letter-spacing: 0.06em;
        padding: 3px 6px;
        cursor: pointer;
      }
      .auc-root .whisper-board-position-tab.active {
        background: var(--ballpark-brass);
        color: #1a1a1a;
        opacity: 1;
        border-color: var(--ballpark-brass);
      }
      .auc-root .whisper-board-list,
      .auc-root .whisper-board-well,
      .auc-root .whisper-board-reorder-list {
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
        .auc-root .whisper-tier1 { flex-direction: column; align-items: flex-start; }
        .auc-root .whisper-lights-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
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
