import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowLeft,
  Search,
  Download,
  Lock,
  Unlock,
  Play,
  Check,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Pencil,
  X,
} from "lucide-react";
import { useLeagueBuilderData } from "../../hooks/useLeagueBuilderData";
import {
  draftRouteForLeague,
  leagueIdFromSearch,
  resolveInitialLeagueId,
} from "../utils/draftRouting";
import { recommendedShillCount } from "../../../engines/auctionPoolSizing";
import { MLB_AUCTION_SEASON } from "../../../utils/leagueBuilderAuctionPipeline";
import {
  addPlayersToLeaguePool,
  removePlayersFromLeaguePool,
  importRosteredPlayersToLeaguePool,
  isPlayerInLeaguePool,
  computePlayerIv,
  computePlayerGrade,
  lockLeaguePool,
  unlockLeaguePool,
  evaluatePoolDemandSufficiency,
  evaluatePoolComposition,
  type PoolCompositionReport,
} from "../../../utils/leagueBuilderPoolBuilder";
import { getAuctionSession, type PitchType, type Player, type Position } from "../../../utils/leagueBuilderStorage";
import type { RegisteredPool } from "../../../engines/leagueConstruction";
import { TRAIT_PRICING } from "../../../data/traitPricing";

const ALL_TRAIT_NAMES: string[] = [...new Set(TRAIT_PRICING.map((t) => t.name))].sort();

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return `$${Math.round(value).toLocaleString()}`;
}

function playerName(player: Player): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

// Draftable primary positions only (JK ruling + DECISIONS_LOG: "DH removed ENTIRELY, DH is a
// lineup slot only"; TWO-WAY is a trait, not a position). Pitchers carry the combined SP/RP role.
const DRAFTABLE_POSITION_OPTIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "SP", "SP/RP", "RP", "CP"] as const;
const POSITION_OPTIONS = ["All", ...DRAFTABLE_POSITION_OPTIONS] as const;
const PITCHER_POSITION_SET = new Set<string>(["SP", "SP/RP", "RP", "CP"]);
const PITCH_TYPES: PitchType[] = ["4F", "2F", "CB", "SL", "CH", "FK", "CF", "SB", "SC", "KN"];
const ARM_SLOTS: Array<NonNullable<Player["armSlot"]>> = ["High", "Mid", "Low", "Sub"];
const SAVED_DRAFT_POOL_LOCK_MESSAGE =
  "A saved auction is in progress. Resume that draft before changing this player pool.";
const CHECKING_SAVED_DRAFT_MESSAGE = "Checking for a saved auction before allowing pool edits.";
const SAVED_DRAFT_LOOKUP_ERROR_MESSAGE =
  "Could not confirm whether a saved auction exists. Refresh before changing this player pool.";
const LOCKED_POOL_EDIT_MESSAGE = "Unlock the player pool before editing. Locked pools freeze the auction values.";

type DraftablePosition = (typeof DRAFTABLE_POSITION_OPTIONS)[number];

type PlayerEditForm = {
  firstName: string;
  lastName: string;
  gender: Player["gender"];
  age: string;
  bats: Player["bats"];
  throws: Player["throws"];
  armSlot: NonNullable<Player["armSlot"]> | "";
  primaryPosition: DraftablePosition;
  secondaryPosition: DraftablePosition | "";
  power: string;
  contact: string;
  speed: string;
  fielding: string;
  arm: string;
  velocity: string;
  junk: string;
  accuracy: string;
  arsenal: PitchType[];
  trait1: string;
  trait2: string;
};

const HITTER_RATINGS = [
  { key: "power", label: "POW" },
  { key: "contact", label: "CON" },
  { key: "speed", label: "SPD" },
  { key: "fielding", label: "FLD" },
  { key: "arm", label: "ARM" },
] as const;

const PITCHER_RATINGS = [
  { key: "velocity", label: "VEL" },
  { key: "junk", label: "JNK" },
  { key: "accuracy", label: "ACC" },
] as const;

function isPitcherPosition(position: string | undefined): boolean {
  return Boolean(position && PITCHER_POSITION_SET.has(position));
}

function isDraftablePosition(position: string | undefined): position is DraftablePosition {
  return Boolean(position && DRAFTABLE_POSITION_OPTIONS.includes(position as DraftablePosition));
}

function clampInt(value: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function playerToEditForm(player: Player): PlayerEditForm {
  return {
    firstName: player.firstName,
    lastName: player.lastName,
    gender: player.gender ?? "M",
    age: player.age.toString(),
    bats: player.bats,
    throws: player.throws,
    armSlot: player.armSlot ?? "",
    primaryPosition: isDraftablePosition(player.primaryPosition) ? player.primaryPosition : "C",
    secondaryPosition: isDraftablePosition(player.secondaryPosition) ? player.secondaryPosition : "",
    power: player.power.toString(),
    contact: player.contact.toString(),
    speed: player.speed.toString(),
    fielding: player.fielding.toString(),
    arm: player.arm.toString(),
    velocity: player.velocity.toString(),
    junk: player.junk.toString(),
    accuracy: player.accuracy.toString(),
    arsenal: [...(player.arsenal ?? [])],
    trait1: player.trait1 ?? "",
    trait2: player.trait2 ?? "",
  };
}

function buildEditedPlayer(player: Player, form: PlayerEditForm): Player {
  const edited: Player = {
    ...player,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    gender: form.gender,
    age: clampInt(form.age, player.age, 18, 50),
    bats: form.bats,
    throws: form.throws,
    armSlot: form.armSlot || null,
    primaryPosition: form.primaryPosition as Position,
    secondaryPosition: form.secondaryPosition ? (form.secondaryPosition as Position) : undefined,
    power: clampInt(form.power, player.power, 0, 99),
    contact: clampInt(form.contact, player.contact, 0, 99),
    speed: clampInt(form.speed, player.speed, 0, 99),
    fielding: clampInt(form.fielding, player.fielding, 0, 99),
    arm: clampInt(form.arm, player.arm, 0, 99),
    velocity: clampInt(form.velocity, player.velocity, 0, 99),
    junk: clampInt(form.junk, player.junk, 0, 99),
    accuracy: clampInt(form.accuracy, player.accuracy, 0, 99),
    arsenal: [...form.arsenal],
    trait1: form.trait1 || undefined,
    trait2: form.trait2 || undefined,
  };
  return { ...edited, overallGrade: computePlayerGrade(edited) };
}

function positionLabel(player: Player): string {
  return player.secondaryPosition
    ? `${player.primaryPosition} / ${player.secondaryPosition}`
    : player.primaryPosition;
}

export function LeagueBuilderDraftSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    leagues,
    teams,
    players,
    isLoading,
    error,
    getRegisteredPool,
    updatePlayer,
    refresh,
  } = useLeagueBuilderData();

  const requestedLeagueId = leagueIdFromSearch(location.search);
  const [activeLeagueId, setActiveLeagueId] = useState<string>("");

  // Resolve the active league once leagues load (honoring ?leagueId=).
  useEffect(() => {
    if (leagues.length === 0) return;
    setActiveLeagueId((current) =>
      current && leagues.some((l) => l.id === current)
        ? current
        : resolveInitialLeagueId(leagues, requestedLeagueId),
    );
  }, [leagues, requestedLeagueId]);

  const league = useMemo(
    () => leagues.find((l) => l.id === activeLeagueId) ?? null,
    [leagues, activeLeagueId],
  );

  const [registeredPool, setRegisteredPool] = useState<RegisteredPool | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [savedDraftChecked, setSavedDraftChecked] = useState(false);
  const [savedDraftLookupError, setSavedDraftLookupError] = useState<string | null>(null);

  const refreshPool = useCallback(async (leagueId: string) => {
    setRegisteredPool(await getRegisteredPool(leagueId));
  }, [getRegisteredPool]);

  useEffect(() => {
    if (activeLeagueId) void refreshPool(activeLeagueId);
    else setRegisteredPool(null);
  }, [activeLeagueId, refreshPool, players]);

  useEffect(() => {
    if (!activeLeagueId) {
      setHasSavedDraft(false);
      setSavedDraftLookupError(null);
      setSavedDraftChecked(true);
      return;
    }
    let cancelled = false;
    setSavedDraftChecked(false);
    setSavedDraftLookupError(null);
    void getAuctionSession(activeLeagueId, MLB_AUCTION_SEASON).then((row) => {
      if (cancelled) return;
      setHasSavedDraft(Boolean(row && row.session.state !== "AUCTION_COMPLETE"));
      setSavedDraftLookupError(null);
      setSavedDraftChecked(true);
    }).catch(() => {
      if (!cancelled) {
        setHasSavedDraft(false);
        setSavedDraftLookupError(SAVED_DRAFT_LOOKUP_ERROR_MESSAGE);
        setSavedDraftChecked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeLeagueId]);

  const locked = Boolean(registeredPool?.locked);
  const savedDraftMutationBlocked = !savedDraftChecked || Boolean(savedDraftLookupError) || hasSavedDraft;
  const poolEditingBlocked = locked || savedDraftMutationBlocked;
  const poolEditingBlockMessage = hasSavedDraft
    ? SAVED_DRAFT_POOL_LOCK_MESSAGE
    : savedDraftLookupError ?? (savedDraftChecked
      ? LOCKED_POOL_EDIT_MESSAGE
      : CHECKING_SAVED_DRAFT_MESSAGE);

  // Selection state (ids checked in each pane).
  const [inSelected, setInSelected] = useState<Set<string>>(new Set());
  const [availSelected, setAvailSelected] = useState<Set<string>>(new Set());
  const [inSearch, setInSearch] = useState("");
  const [availSearch, setAvailSearch] = useState("");
  const [inPosition, setInPosition] = useState("All");
  const [availPosition, setAvailPosition] = useState("All");
  const [focusedPlayerId, setFocusedPlayerId] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Reset selections whenever the league or membership changes.
  useEffect(() => {
    setInSelected(new Set());
    setAvailSelected(new Set());
    setFocusedPlayerId(null);
    setEditingPlayer(null);
  }, [activeLeagueId]);

  const inPoolPlayers = useMemo(
    () => (activeLeagueId ? players.filter((p) => isPlayerInLeaguePool(p, activeLeagueId)) : []),
    [players, activeLeagueId],
  );
  const availablePlayers = useMemo(
    () => (activeLeagueId ? players.filter((p) => !isPlayerInLeaguePool(p, activeLeagueId)) : []),
    [players, activeLeagueId],
  );

  const focusedPlayer = useMemo(
    () => players.find((p) => p.id === focusedPlayerId) ?? null,
    [players, focusedPlayerId],
  );

  useEffect(() => {
    if (focusedPlayerId && !focusedPlayer) setFocusedPlayerId(null);
  }, [focusedPlayerId, focusedPlayer]);

  // Live IV per pooled player (same calc as registration → identical to the locked value).
  const ivById = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of inPoolPlayers) map.set(p.id, computePlayerIv(p));
    return map;
  }, [inPoolPlayers]);

  // Note: the AVAILABLE rows show each player's STORED overallGrade (cheap, and canonical for
  // seeded data — an edit persists the freshly-derived grade). Deriving the canonical grade for
  // the whole list every render is far too heavy (scoreSmb4Player × hundreds), so the live
  // derived grade is computed only for the ONE focused player (panel) and in the edit modal.

  const inFiltered = useMemo(() => {
    const q = inSearch.trim().toLowerCase();
    return inPoolPlayers
      .filter((p) => (inPosition === "All" ? true : p.primaryPosition === inPosition))
      .filter((p) => (q ? playerName(p).toLowerCase().includes(q) : true))
      .sort((a, b) => (ivById.get(b.id) ?? 0) - (ivById.get(a.id) ?? 0));
  }, [inPoolPlayers, inSearch, inPosition, ivById]);

  const availFiltered = useMemo(() => {
    const q = availSearch.trim().toLowerCase();
    return availablePlayers
      .filter((p) => (availPosition === "All" ? true : p.primaryPosition === availPosition))
      .filter((p) => (q ? playerName(p).toLowerCase().includes(q) : true))
      .sort((a, b) => playerName(a).localeCompare(playerName(b)));
  }, [availablePlayers, availSearch, availPosition]);

  // FABLE-C3: the sim-backed shill default (0 humans known at this layer → full-pressure sizing,
  // the conservative basis) + the market-clearing sufficiency (shills demand their expected WINS,
  // not 22 phantom seats — the end-checkpoint semantics).
  const estimatedShills = league ? recommendedShillCount(0, league.teamIds.length).count : 0;
  const sufficiency = useMemo(
    () => evaluatePoolDemandSufficiency(inPoolPlayers.length, league?.teamIds.length ?? 0, estimatedShills),
    [league?.teamIds.length, estimatedShills, inPoolPlayers.length],
  );

  // FABLE-C3 (audit POOL-01): composition intelligence rides the REGISTERED (locked) snapshot.
  const [composition, setComposition] = useState<PoolCompositionReport | null>(null);
  useEffect(() => {
    let cancelled = false;
    setComposition(null);
    if (!activeLeagueId || !locked) return;
    void (async () => {
      try {
        const report = await evaluatePoolComposition(activeLeagueId, estimatedShills);
        if (!cancelled) setComposition(report);
      } catch {
        if (!cancelled) setComposition(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeLeagueId, locked, estimatedShills]);

  // Auto-import from branded teams on first open (JK ruling): reconcile EVERY rostered player
  // into a league assignment so the pool the user SEES equals the pool the lock FREEZES (the UI
  // is assignment-based; registration also unions team rosters). Idempotent — the importer skips
  // already-pooled players. Runs once per league while unlocked; NOT gated on pool size (a stray
  // pre-existing assignment must not suppress the seed). Retries on failure.
  const autoImportedRef = useRef<string | null>(null);
  useEffect(() => {
    if (isLoading || !activeLeagueId || !league || poolEditingBlocked) return;
    if (autoImportedRef.current === activeLeagueId) return;
    autoImportedRef.current = activeLeagueId;
    void (async () => {
      try {
        const added = await importRosteredPlayersToLeaguePool(activeLeagueId);
        if (added > 0) await refresh();
      } catch {
        autoImportedRef.current = null; // allow retry on a later render
      }
    })();
  }, [isLoading, activeLeagueId, league, poolEditingBlocked, refresh]);

  const runAction = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      setActionError(null);
      try {
        await fn();
        await refresh();
        if (activeLeagueId) await refreshPool(activeLeagueId);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [refresh, refreshPool, activeLeagueId],
  );

  const assertPoolCanMutate = () => {
    if (!savedDraftChecked) throw new Error(CHECKING_SAVED_DRAFT_MESSAGE);
    if (savedDraftLookupError) throw new Error(savedDraftLookupError);
    if (hasSavedDraft) throw new Error(SAVED_DRAFT_POOL_LOCK_MESSAGE);
  };

  const handleAdd = () =>
    runAction(async () => {
      assertPoolCanMutate();
      await addPlayersToLeaguePool([...availSelected], activeLeagueId);
      setAvailSelected(new Set());
    });

  const handleRemove = () =>
    runAction(async () => {
      assertPoolCanMutate();
      await removePlayersFromLeaguePool([...inSelected], activeLeagueId);
      setInSelected(new Set());
    });

  const handleImport = () =>
    runAction(async () => {
      assertPoolCanMutate();
      await importRosteredPlayersToLeaguePool(activeLeagueId);
    });

  const handleLock = () =>
    runAction(async () => {
      assertPoolCanMutate();
      await lockLeaguePool(activeLeagueId);
    });

  const handleUnlock = () =>
    runAction(async () => {
      assertPoolCanMutate();
      await unlockLeaguePool(activeLeagueId);
    });

  const handleStartDraft = () => {
    if (!league || !locked || !sufficiency.meetsFloor) return;
    navigate(`/league-builder/draft-config?leagueId=${league.id}`);
  };

  const handleSaveEditedPlayer = useCallback(
    async (updatedPlayer: Player) => {
      if (poolEditingBlocked) {
        setEditError(poolEditingBlockMessage);
        return;
      }
      setEditSaving(true);
      setEditError(null);
      try {
        const playerWithDerivedGrade = {
          ...updatedPlayer,
          overallGrade: computePlayerGrade(updatedPlayer),
        };
        const saved = await updatePlayer(playerWithDerivedGrade);
        await refresh();
        if (activeLeagueId) await refreshPool(activeLeagueId);
        setFocusedPlayerId(saved.id);
        setEditingPlayer(null);
      } catch (err) {
        setEditError(err instanceof Error ? err.message : String(err));
      } finally {
        setEditSaving(false);
      }
    },
    [activeLeagueId, poolEditingBlockMessage, poolEditingBlocked, refresh, refreshPool, updatePlayer],
  );

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const selectAll = (filtered: Player[], setter: (s: Set<string>) => void) =>
    setter(new Set(filtered.map((p) => p.id)));

  // ---- render ----
  if (!isLoading && leagues.length === 0) {
    return (
      <Shell onBack={() => navigate("/league-builder")}>
        <div className="bg-[#556B55] border-[4px] border-[#C4A853] p-8 text-center text-[#E8E8D8]">
          No leagues yet. Create a league first, then come back to set up its draft.
        </div>
      </Shell>
    );
  }

  return (
    <Shell onBack={() => navigate("/league-builder")}>
      {/* League selector + summary */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {leagues.length > 1 && (
          <select
            value={activeLeagueId}
            onChange={(e) => setActiveLeagueId(e.target.value)}
            className="bg-[#4A6844] border-4 border-[#E8E8D8] text-[#E8E8D8] px-4 py-2 text-sm font-bold tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] cursor-pointer"
          >
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name.toUpperCase()}
              </option>
            ))}
          </select>
        )}
        {league && (
          <div className="text-sm text-[#E8E8D8]/80">
            <span className="font-bold">{league.name}</span>
            <span className="text-[#E8E8D8]/50">
              {"  ·  "}
              {league.teamIds.length} teams · {estimatedShills} est. shills · {league.tier ?? "juiced"} tier · {sufficiency.mlbSlots} draft slots
            </span>
          </div>
        )}
        {locked && (
          <div className="ml-auto flex items-center gap-2 bg-[#C4A853] text-[#1A1A1A] border-2 border-[#E8E8D8] px-3 py-1 text-xs font-bold">
            <Lock className="w-4 h-4" /> POOL LOCKED
          </div>
        )}
      </div>

      {(error || actionError || savedDraftLookupError) && (
        <div className="bg-red-900/50 border-4 border-red-500 p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-red-200">{actionError ?? savedDraftLookupError ?? error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-[#E8E8D8]/60">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <>
          {/* Two-pane shuttle */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 mb-6">
            {/* IN THE POOL */}
            <Pane
              title={`IN THE POOL (${inPoolPlayers.length})`}
              accent="#5A8352"
              search={inSearch}
              onSearch={setInSearch}
              position={inPosition}
              onPosition={setInPosition}
              disabled={poolEditingBlocked}
              onSelectAll={() => selectAll(inFiltered, setInSelected)}
              footer={
                <button
                  onClick={handleRemove}
                  disabled={poolEditingBlocked || busy || inSelected.size === 0}
                  className="flex items-center gap-2 bg-[#4A6844] hover:bg-[#5A8352] disabled:opacity-40 border-4 border-[#E8E8D8] px-4 py-2 text-sm font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] active:scale-95"
                >
                  Remove <ChevronRight className="w-4 h-4" />
                </button>
              }
            >
              {inFiltered.map((p) => (
                <Row
                  key={p.id}
                  player={p}
                  rightLabel={formatMoney(ivById.get(p.id))}
                  rightTitle="IV"
                  checked={inSelected.has(p.id)}
                  focused={focusedPlayerId === p.id}
                  disabled={poolEditingBlocked}
                  onToggle={() => toggle(inSelected, setInSelected, p.id)}
                  onFocus={() => setFocusedPlayerId(p.id)}
                />
              ))}
              {inFiltered.length === 0 && <Empty label="No players in the pool." />}
            </Pane>

            {/* shuttle arrows (desktop) */}
            <div className="hidden lg:flex flex-col items-center justify-center gap-3 text-[#E8E8D8]/40">
              <ChevronLeft className="w-6 h-6" />
              <ChevronRight className="w-6 h-6" />
            </div>

            {/* AVAILABLE */}
            <Pane
              title={`AVAILABLE PLAYERS (${availablePlayers.length})`}
              accent="#3B7DD8"
              search={availSearch}
              onSearch={setAvailSearch}
              position={availPosition}
              onPosition={setAvailPosition}
              disabled={poolEditingBlocked}
              onSelectAll={() => selectAll(availFiltered, setAvailSelected)}
              footer={
                <button
                  onClick={handleAdd}
                  disabled={poolEditingBlocked || busy || availSelected.size === 0}
                  className="flex items-center gap-2 bg-[#4A6844] hover:bg-[#5A8352] disabled:opacity-40 border-4 border-[#E8E8D8] px-4 py-2 text-sm font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" /> Add
                </button>
              }
            >
              {availFiltered.slice(0, 500).map((p) => (
                <Row
                  key={p.id}
                  player={p}
                  rightLabel={p.overallGrade}
                  rightTitle="Grade"
                  checked={availSelected.has(p.id)}
                  focused={focusedPlayerId === p.id}
                  disabled={poolEditingBlocked}
                  onToggle={() => toggle(availSelected, setAvailSelected, p.id)}
                  onFocus={() => setFocusedPlayerId(p.id)}
                />
              ))}
              {availFiltered.length > 500 && (
                <div className="text-xs text-[#E8E8D8]/50 px-2 py-2">
                  Showing first 500 of {availFiltered.length}. Narrow the filters to see more.
                </div>
              )}
              {availFiltered.length === 0 && <Empty label="No available players match." />}
            </Pane>
          </div>

          {focusedPlayer && (
            <FocusedPlayerPanel
              player={focusedPlayer}
              locked={poolEditingBlocked}
              lockedLabel={hasSavedDraft ? "Draft Saved" : undefined}
              lockedTitle={poolEditingBlockMessage}
              onEdit={() => {
                if (poolEditingBlocked) return;
                setEditError(null);
                setEditingPlayer(focusedPlayer);
              }}
            />
          )}

          {/* Sufficiency + import */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div
              className={`flex items-center gap-2 px-4 py-2 border-4 text-sm font-bold ${
                sufficiency.meetsFloor
                  ? "border-[#5A8352] text-[#9Fe09F] bg-[#3a4d3c]"
                  : "border-red-500 text-red-300 bg-red-900/30"
              }`}
            >
              {sufficiency.meetsFloor ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              Pool {sufficiency.poolSize} / {sufficiency.mlbSlots} draft slots
              {sufficiency.meetsFloor
                ? ` · surplus ${sufficiency.surplus >= 0 ? "+" : ""}${sufficiency.surplus}`
                : ` · need ${-sufficiency.surplus} more`}
              {` · recommended ${sufficiency.targetSize}`}
            </div>
            {sufficiency.overSupplyWarning && (
              <div className="text-xs text-[#C4A853]">
                Large pool — the auction will run long.
              </div>
            )}
            <button
              onClick={handleImport}
              disabled={poolEditingBlocked || busy}
              className="flex items-center gap-2 bg-[#556B55] hover:bg-[#4A6844] disabled:opacity-40 border-4 border-[#C4A853] px-4 py-2 text-sm font-bold text-[#E8E8D8] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] active:scale-95"
            >
              <Download className="w-4 h-4" /> Import from branded teams
            </button>
          </div>

          {/* FABLE-C3: archetype market outlook (locked-pool composition intelligence) */}
          {composition && (
            <div className="mb-6 border-4 border-[#5A8352] bg-[#2e3f30] p-4">
              <div className="text-sm font-bold text-[#E8E8D8] mb-2">
                Archetype market outlook — {composition.outlooks.filter((o) => o.pIdentityCompletion >= 0.9).length} of{" "}
                {composition.outlooks.length} archetypes look buildable in a contested draft
              </div>
              <div className="grid gap-1">
                {[...composition.outlooks]
                  .sort((a, b) => a.pIdentityCompletion - b.pIdentityCompletion)
                  .slice(0, 6)
                  .map((outlook) => (
                    <div key={outlook.archetypeId} className="flex flex-wrap items-baseline gap-2 text-xs">
                      <span
                        className={`font-bold ${
                          outlook.pIdentityCompletion >= 0.9
                            ? "text-[#9Fe09F]"
                            : outlook.pIdentityCompletion >= 0.6
                              ? "text-[#C4A853]"
                              : "text-red-300"
                        }`}
                      >
                        {Math.round(outlook.pIdentityCompletion * 100)}%
                      </span>
                      <span className="text-[#E8E8D8]">{outlook.archetypeName}</span>
                      {outlook.note && <span className="text-[#A8B8A0]">{outlook.note}</span>}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-4">
            {!locked ? (
              <button
                onClick={handleLock}
                disabled={busy || savedDraftMutationBlocked || inPoolPlayers.length === 0}
                className="flex items-center gap-2 bg-[#C4A853] hover:bg-[#D4B863] disabled:opacity-40 text-[#1A1A1A] border-[5px] border-[#E8E8D8] px-6 py-3 font-bold tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] active:scale-95"
              >
                <Lock className="w-5 h-5" /> LOCK POOL
              </button>
            ) : (
              <>
                <button
                  onClick={handleUnlock}
                  disabled={busy || savedDraftMutationBlocked}
                  className="flex items-center gap-2 bg-[#4A6844] hover:bg-[#5A8352] disabled:opacity-40 border-[5px] border-[#E8E8D8] px-6 py-3 font-bold tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] active:scale-95"
                >
                  <Unlock className="w-5 h-5" /> UNLOCK
                </button>
                <button
                  onClick={handleStartDraft}
                  disabled={busy || savedDraftMutationBlocked || !sufficiency.meetsFloor}
                  className="flex items-center gap-2 bg-[#5A8352] hover:bg-[#4A6844] disabled:opacity-40 border-[5px] border-[#E8E8D8] px-6 py-3 font-bold tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] active:scale-95"
                >
                  <Play className="w-5 h-5" /> {hasSavedDraft ? "RESUME DRAFT" : "START DRAFT"}
                </button>
              </>
            )}
            {busy && <Loader2 className="w-5 h-5 animate-spin text-[#E8E8D8]/70" />}
          </div>

          {editingPlayer && (
            <DraftSetupPlayerEditModal
              player={editingPlayer}
              saving={editSaving}
              error={editError}
              onCancel={() => {
                if (editSaving) return;
                setEditError(null);
                setEditingPlayer(null);
              }}
              onSave={handleSaveEditedPlayer}
            />
          )}
        </>
      )}
    </Shell>
  );
}

function FocusedPlayerPanel({
  player,
  locked,
  lockedLabel,
  lockedTitle,
  onEdit,
}: {
  player: Player;
  locked: boolean;
  lockedLabel?: string;
  lockedTitle?: string;
  onEdit: () => void;
}) {
  const grade = computePlayerGrade(player);
  const iv = computePlayerIv(player);
  const ratings = isPitcherPosition(player.primaryPosition)
    ? [...HITTER_RATINGS, ...PITCHER_RATINGS]
    : HITTER_RATINGS;

  return (
    <div className="bg-[#556B55] border-[4px] border-[#C4A853] p-4 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] text-[#C4A853] mb-1">FOCUSED PLAYER</div>
          <div className="text-xl font-bold text-[#E8E8D8]" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>
            {playerName(player)}
          </div>
          <div className="text-sm text-[#E8E8D8]/70">
            {positionLabel(player)} · Age {player.age} · B/T {player.bats}/{player.throws}
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          disabled={locked}
          title={locked ? lockedTitle ?? "Unlock the player pool before editing frozen auction values." : undefined}
          className="flex items-center gap-2 bg-[#5A8352] hover:bg-[#4A6844] disabled:opacity-45 disabled:hover:bg-[#5A8352] border-4 border-[#E8E8D8] px-4 py-2 text-sm font-bold text-[#E8E8D8] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] active:scale-95"
        >
          <Pencil className="w-4 h-4" /> {locked ? lockedLabel ?? "Unlock to Edit" : "Edit Player"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatBlock label="GRADE" value={grade} />
        <StatBlock label="IV" value={formatMoney(iv)} />
        <StatBlock label="POSITION" value={positionLabel(player)} />
        <StatBlock label="GENDER" value={player.gender === "F" ? "She/her" : "He/him"} />
        <StatBlock label="TRAITS" value={[player.trait1, player.trait2].filter(Boolean).join(" / ") || "None"} />
      </div>

      {isPitcherPosition(player.primaryPosition) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <StatBlock label="ARM SLOT" value={player.armSlot ?? "Not set"} />
          <StatBlock label="ARSENAL" value={(player.arsenal ?? []).join(" / ") || "Not set"} />
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
        {ratings.map((rating) => (
          <div key={rating.key} className="bg-[#3a4d3c] border-2 border-[#4A6844] px-3 py-2">
            <div className="text-[10px] font-bold tracking-wider text-[#E8E8D8]/50">{rating.label}</div>
            <div className="text-lg font-bold text-[#E8E8D8]">{player[rating.key]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#3a4d3c] border-2 border-[#4A6844] px-3 py-2 min-w-0">
      <div className="text-[10px] font-bold tracking-wider text-[#E8E8D8]/50">{label}</div>
      <div className="text-sm font-bold text-[#E8E8D8] truncate">{value}</div>
    </div>
  );
}

function DraftSetupPlayerEditModal({
  player,
  saving,
  error,
  onCancel,
  onSave,
}: {
  player: Player;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (player: Player) => Promise<void>;
}) {
  const [form, setForm] = useState<PlayerEditForm>(() => playerToEditForm(player));

  useEffect(() => {
    setForm(playerToEditForm(player));
  }, [player]);

  const previewPlayer = useMemo(() => buildEditedPlayer(player, form), [player, form]);
  const previewIv = useMemo(() => computePlayerIv(previewPlayer), [previewPlayer]);
  const isPitcher = isPitcherPosition(form.primaryPosition);
  const visibleRatings = isPitcher ? [...HITTER_RATINGS, ...PITCHER_RATINGS] : HITTER_RATINGS;
  const inputClass = "w-full bg-[#4A6844] border-[3px] border-[#3F5A3A] px-3 py-2 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none";
  const numericInputClass = `${inputClass} text-center font-bold`;

  const updateForm = <K extends keyof PlayerEditForm>(field: K, value: PlayerEditForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };
  const toggleArsenal = (pitch: PitchType) => {
    setForm((current) => ({
      ...current,
      arsenal: current.arsenal.includes(pitch)
        ? current.arsenal.filter((candidate) => candidate !== pitch)
        : [...current.arsenal, pitch],
    }));
  };

  const saveDisabled = saving || !form.firstName.trim() || !form.lastName.trim() || !form.gender;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#556B55] border-[6px] border-[#C4A853] text-[#E8E8D8] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between gap-4 p-4 border-b-4 border-[#4A6844]">
          <div>
            <div className="text-xs font-bold tracking-[0.2em] text-[#C4A853] mb-1">EDIT PLAYER</div>
            <div className="text-xl font-bold">{playerName(previewPlayer)}</div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="p-2 bg-[#4A6844] hover:bg-[#5A8352] disabled:opacity-40 border-4 border-[#E8E8D8] active:scale-95"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="bg-red-900/50 border-4 border-red-500 p-3 text-sm text-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="block text-xs font-bold tracking-wider text-[#E8E8D8]/70 mb-1">First Name</span>
              <input
                value={form.firstName}
                onChange={(event) => updateForm("firstName", event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-bold tracking-wider text-[#E8E8D8]/70 mb-1">Last Name</span>
              <input
                value={form.lastName}
                onChange={(event) => updateForm("lastName", event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-bold tracking-wider text-[#E8E8D8]/70 mb-1">Gender</span>
              <select
                value={form.gender}
                onChange={(event) => updateForm("gender", event.target.value as Player["gender"])}
                className={inputClass}
              >
                <option value="M">He/him</option>
                <option value="F">She/her</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <label className="block">
              <span className="block text-xs font-bold tracking-wider text-[#E8E8D8]/70 mb-1">Age</span>
              <input
                type="number"
                min={18}
                max={50}
                value={form.age}
                onChange={(event) => updateForm("age", event.target.value)}
                className={numericInputClass}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-bold tracking-wider text-[#E8E8D8]/70 mb-1">Bats</span>
              <select
                value={form.bats}
                onChange={(event) => updateForm("bats", event.target.value as Player["bats"])}
                className={inputClass}
              >
                <option value="R">R</option>
                <option value="L">L</option>
                <option value="S">S</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-bold tracking-wider text-[#E8E8D8]/70 mb-1">Throws</span>
              <select
                value={form.throws}
                onChange={(event) => updateForm("throws", event.target.value as Player["throws"])}
                className={inputClass}
              >
                <option value="R">R</option>
                <option value="L">L</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-bold tracking-wider text-[#E8E8D8]/70 mb-1">Arm Slot</span>
              <select
                value={form.armSlot}
                onChange={(event) => updateForm("armSlot", event.target.value as PlayerEditForm["armSlot"])}
                className={inputClass}
              >
                <option value="">Not set</option>
                {ARM_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-bold tracking-wider text-[#E8E8D8]/70 mb-1">Grade</span>
              <div className="bg-[#3a4d3c] border-[3px] border-[#3F5A3A] px-3 py-2 font-bold text-[#C4A853]">
                {previewPlayer.overallGrade}
              </div>
            </label>
            <label className="block">
              <span className="block text-xs font-bold tracking-wider text-[#E8E8D8]/70 mb-1">IV</span>
              <div className="bg-[#3a4d3c] border-[3px] border-[#3F5A3A] px-3 py-2 font-bold text-[#C4A853]">
                {formatMoney(previewIv)}
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-bold tracking-wider text-[#E8E8D8]/70 mb-1">Primary Position</span>
              <select
                value={form.primaryPosition}
                onChange={(event) => {
                  const primaryPosition = event.target.value as DraftablePosition;
                  setForm((current) => ({
                    ...current,
                    primaryPosition,
                    secondaryPosition: current.secondaryPosition === primaryPosition ? "" : current.secondaryPosition,
                  }));
                }}
                className={inputClass}
              >
                {DRAFTABLE_POSITION_OPTIONS.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-bold tracking-wider text-[#E8E8D8]/70 mb-1">Secondary Position</span>
              <select
                value={form.secondaryPosition}
                onChange={(event) => updateForm("secondaryPosition", event.target.value as PlayerEditForm["secondaryPosition"])}
                className={inputClass}
              >
                <option value="">None</option>
                {DRAFTABLE_POSITION_OPTIONS.filter((position) => position !== form.primaryPosition).map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <div className="text-xs font-bold tracking-wider text-[#E8E8D8]/70 mb-2">
              {isPitcher ? "Full Pitcher Ratings" : "Hitting Ratings"}
            </div>
            <div className={`grid gap-3 ${isPitcher ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-5"}`}>
              {visibleRatings.map((rating) => (
                <label key={rating.key} className="block">
                  <span className="block text-xs font-bold tracking-wider text-[#E8E8D8]/70 mb-1">{rating.label}</span>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={form[rating.key]}
                    onChange={(event) => updateForm(rating.key, event.target.value)}
                    className={numericInputClass}
                  />
                </label>
              ))}
            </div>
          </div>

          {isPitcher && (
            <div>
              <div className="text-xs font-bold tracking-wider text-[#E8E8D8]/70 mb-2">Arsenal</div>
              <div className="flex flex-wrap gap-2 bg-[#4A6844] border-[3px] border-[#3F5A3A] p-2">
                {PITCH_TYPES.map((pitch) => (
                  <button
                    key={pitch}
                    type="button"
                    onClick={() => toggleArsenal(pitch)}
                    className={`px-3 py-1 text-xs border-2 transition ${
                      form.arsenal.includes(pitch)
                        ? "bg-[#5599FF] border-[#3366FF] text-white"
                        : "bg-[#4A6844] border-[#3F5A3A] text-[#E8E8D8]/70 hover:border-[#E8E8D8]/50"
                    }`}
                  >
                    {pitch}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-bold tracking-wider text-[#E8E8D8]/70 mb-2">Traits</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-bold tracking-wider text-[#E8E8D8]/70 mb-1">Trait 1</span>
                <select
                  value={form.trait1}
                  onChange={(event) => updateForm("trait1", event.target.value)}
                  className={inputClass}
                >
                  <option value="">None</option>
                  {ALL_TRAIT_NAMES.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-bold tracking-wider text-[#E8E8D8]/70 mb-1">Trait 2</span>
                <select
                  value={form.trait2}
                  onChange={(event) => updateForm("trait2", event.target.value)}
                  className={inputClass}
                >
                  <option value="">None</option>
                  {ALL_TRAIT_NAMES.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 p-4 border-t-4 border-[#4A6844]">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-5 py-2 bg-[#4A6844] hover:bg-[#3F5A3A] disabled:opacity-40 border-[3px] border-[#E8E8D8]/60 font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSave(previewPlayer)}
            disabled={saveDisabled}
            className="flex items-center gap-2 px-5 py-2 bg-[#3B7DD8] hover:bg-[#3366CC] disabled:opacity-40 border-[3px] border-[#E8E8D8] font-bold"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            className="p-3 bg-[#4A6844] hover:bg-[#5A8352] border-4 border-[#E8E8D8] transition active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            <ArrowLeft className="w-6 h-6 text-[#E8E8D8]" />
          </button>
          <div className="flex items-center gap-3 bg-[#5A8352] border-[6px] border-[#E8E8D8] px-8 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]">
            <h1 className="text-2xl font-bold text-[#E8E8D8] tracking-wider" style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}>
              DRAFT SETUP
            </h1>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Pane({
  title,
  accent,
  search,
  onSearch,
  position,
  onPosition,
  disabled,
  onSelectAll,
  footer,
  children,
}: {
  title: string;
  accent: string;
  search: string;
  onSearch: (v: string) => void;
  position: string;
  onPosition: (v: string) => void;
  disabled: boolean;
  onSelectAll: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#556B55] border-[4px] p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]" style={{ borderColor: accent }}>
      <div className="text-sm font-bold text-[#E8E8D8] mb-3 tracking-wide" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>
        {title}
      </div>
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E8E8D8]/50" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search…"
            className="w-full bg-[#4A6844] border-2 border-[#E8E8D8]/40 text-[#E8E8D8] pl-8 pr-2 py-1.5 text-sm placeholder:text-[#E8E8D8]/40"
          />
        </div>
        <select
          value={position}
          onChange={(e) => onPosition(e.target.value)}
          className="bg-[#4A6844] border-2 border-[#E8E8D8]/40 text-[#E8E8D8] px-2 py-1.5 text-sm cursor-pointer"
        >
          {POSITION_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div className="h-[46vh] overflow-y-auto border-2 border-[#4A6844] bg-[#3a4d3c]">
        {children}
      </div>
      <div className="flex items-center justify-between mt-3">
        <button
          onClick={onSelectAll}
          disabled={disabled}
          className="text-xs font-bold text-[#E8E8D8]/80 hover:text-[#E8E8D8] disabled:opacity-40 underline"
        >
          Select all
        </button>
        {footer}
      </div>
    </div>
  );
}

function Row({
  player,
  rightLabel,
  rightTitle,
  checked,
  focused,
  disabled,
  onToggle,
  onFocus,
}: {
  player: Player;
  rightLabel: string;
  rightTitle: string;
  checked: boolean;
  focused: boolean;
  disabled: boolean;
  onToggle: () => void;
  onFocus: () => void;
}) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onFocus();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onKeyDown={handleKeyDown}
      className={`w-full flex items-center gap-2 px-2 py-1.5 text-left border-b border-[#4A6844] text-sm transition cursor-pointer ${
        focused ? "bg-[#C4A853]/20 outline outline-2 outline-[#C4A853] -outline-offset-2" : checked ? "bg-[#5A8352]" : "hover:bg-[#4A6844]"
      }`}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        disabled={disabled}
        aria-pressed={checked}
        aria-label={`${checked ? "Deselect" : "Select"} ${playerName(player)}`}
        className={`w-4 h-4 border-2 flex items-center justify-center shrink-0 disabled:opacity-40 ${
          checked ? "bg-[#C4A853] border-[#E8E8D8]" : "border-[#E8E8D8]/50"
        }`}
      >
        {checked && <Check className="w-3 h-3 text-[#1A1A1A]" />}
      </button>
      <span className="flex-1 truncate text-[#E8E8D8]">{playerName(player)}</span>
      <span className="w-10 text-xs text-[#E8E8D8]/60">{player.primaryPosition}</span>
      <span className="w-24 text-right text-xs font-bold text-[#E8E8D8]" title={rightTitle}>
        {rightLabel}
      </span>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="px-3 py-8 text-center text-sm text-[#E8E8D8]/40">{label}</div>;
}
