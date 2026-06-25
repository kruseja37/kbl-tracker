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
} from "lucide-react";
import { useLeagueBuilderData } from "../../hooks/useLeagueBuilderData";
import {
  draftRouteForLeague,
  leagueIdFromSearch,
  resolveInitialLeagueId,
} from "../utils/draftRouting";
import {
  addPlayersToLeaguePool,
  removePlayersFromLeaguePool,
  importRosteredPlayersToLeaguePool,
  isPlayerInLeaguePool,
  computePlayerIv,
  lockLeaguePool,
  unlockLeaguePool,
  evaluatePoolSufficiency,
} from "../../../utils/leagueBuilderPoolBuilder";
import type { Player } from "../../../utils/leagueBuilderStorage";
import type { RegisteredPool } from "../../../engines/leagueConstruction";

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return `$${Math.round(value).toLocaleString()}`;
}

function playerName(player: Player): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

const POSITION_OPTIONS = ["All", "C", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "DH", "SP", "RP", "CP"];

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

  const refreshPool = useCallback(async (leagueId: string) => {
    setRegisteredPool(await getRegisteredPool(leagueId));
  }, [getRegisteredPool]);

  useEffect(() => {
    if (activeLeagueId) void refreshPool(activeLeagueId);
    else setRegisteredPool(null);
  }, [activeLeagueId, refreshPool, players]);

  const locked = Boolean(registeredPool?.locked);

  // Selection state (ids checked in each pane).
  const [inSelected, setInSelected] = useState<Set<string>>(new Set());
  const [availSelected, setAvailSelected] = useState<Set<string>>(new Set());
  const [inSearch, setInSearch] = useState("");
  const [availSearch, setAvailSearch] = useState("");
  const [inPosition, setInPosition] = useState("All");
  const [availPosition, setAvailPosition] = useState("All");

  // Reset selections whenever the league or membership changes.
  useEffect(() => {
    setInSelected(new Set());
    setAvailSelected(new Set());
  }, [activeLeagueId]);

  const inPoolPlayers = useMemo(
    () => (activeLeagueId ? players.filter((p) => isPlayerInLeaguePool(p, activeLeagueId)) : []),
    [players, activeLeagueId],
  );
  const availablePlayers = useMemo(
    () => (activeLeagueId ? players.filter((p) => !isPlayerInLeaguePool(p, activeLeagueId)) : []),
    [players, activeLeagueId],
  );

  // Live IV per pooled player (same calc as registration → identical to the locked value).
  const ivById = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of inPoolPlayers) map.set(p.id, computePlayerIv(p));
    return map;
  }, [inPoolPlayers]);

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

  const sufficiency = useMemo(
    () => evaluatePoolSufficiency(inPoolPlayers.length, league?.teamIds.length ?? 0),
    [inPoolPlayers.length, league],
  );

  // Auto-import from branded teams on first open (JK ruling): reconcile EVERY rostered player
  // into a league assignment so the pool the user SEES equals the pool the lock FREEZES (the UI
  // is assignment-based; registration also unions team rosters). Idempotent — the importer skips
  // already-pooled players. Runs once per league while unlocked; NOT gated on pool size (a stray
  // pre-existing assignment must not suppress the seed). Retries on failure.
  const autoImportedRef = useRef<string | null>(null);
  useEffect(() => {
    if (isLoading || !activeLeagueId || !league || locked) return;
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
  }, [isLoading, activeLeagueId, league, locked, refresh]);

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

  const handleAdd = () =>
    runAction(async () => {
      await addPlayersToLeaguePool([...availSelected], activeLeagueId);
      setAvailSelected(new Set());
    });

  const handleRemove = () =>
    runAction(async () => {
      await removePlayersFromLeaguePool([...inSelected], activeLeagueId);
      setInSelected(new Set());
    });

  const handleImport = () =>
    runAction(async () => {
      await importRosteredPlayersToLeaguePool(activeLeagueId);
    });

  const handleLock = () =>
    runAction(async () => {
      await lockLeaguePool(activeLeagueId);
    });

  const handleUnlock = () =>
    runAction(async () => {
      await unlockLeaguePool(activeLeagueId);
    });

  const handleStartDraft = () => {
    if (!league || !locked || !sufficiency.meetsFloor) return;
    navigate(draftRouteForLeague(league));
  };

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
              {league.teamIds.length} teams · {league.tier ?? "juiced"} tier · {sufficiency.mlbSlots} MLB slots
            </span>
          </div>
        )}
        {locked && (
          <div className="ml-auto flex items-center gap-2 bg-[#C4A853] text-[#1A1A1A] border-2 border-[#E8E8D8] px-3 py-1 text-xs font-bold">
            <Lock className="w-4 h-4" /> POOL LOCKED
          </div>
        )}
      </div>

      {(error || actionError) && (
        <div className="bg-red-900/50 border-4 border-red-500 p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-red-200">{actionError ?? error}</span>
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
              disabled={locked}
              onSelectAll={() => selectAll(inFiltered, setInSelected)}
              footer={
                <button
                  onClick={handleRemove}
                  disabled={locked || busy || inSelected.size === 0}
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
                  disabled={locked}
                  onToggle={() => toggle(inSelected, setInSelected, p.id)}
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
              disabled={locked}
              onSelectAll={() => selectAll(availFiltered, setAvailSelected)}
              footer={
                <button
                  onClick={handleAdd}
                  disabled={locked || busy || availSelected.size === 0}
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
                  disabled={locked}
                  onToggle={() => toggle(availSelected, setAvailSelected, p.id)}
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
              Pool {sufficiency.poolSize} / {sufficiency.mlbSlots} MLB slots
              {sufficiency.meetsFloor
                ? ` · surplus ${sufficiency.surplus >= 0 ? "+" : ""}${sufficiency.surplus}`
                : ` · need ${-sufficiency.surplus} more`}
            </div>
            {sufficiency.overSupplyWarning && (
              <div className="text-xs text-[#C4A853]">
                Large pool — the auction will run long.
              </div>
            )}
            <button
              onClick={handleImport}
              disabled={locked || busy}
              className="flex items-center gap-2 bg-[#556B55] hover:bg-[#4A6844] disabled:opacity-40 border-4 border-[#C4A853] px-4 py-2 text-sm font-bold text-[#E8E8D8] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] active:scale-95"
            >
              <Download className="w-4 h-4" /> Import from branded teams
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-4">
            {!locked ? (
              <button
                onClick={handleLock}
                disabled={busy || inPoolPlayers.length === 0}
                className="flex items-center gap-2 bg-[#C4A853] hover:bg-[#D4B863] disabled:opacity-40 text-[#1A1A1A] border-[5px] border-[#E8E8D8] px-6 py-3 font-bold tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] active:scale-95"
              >
                <Lock className="w-5 h-5" /> LOCK POOL
              </button>
            ) : (
              <>
                <button
                  onClick={handleUnlock}
                  disabled={busy}
                  className="flex items-center gap-2 bg-[#4A6844] hover:bg-[#5A8352] disabled:opacity-40 border-[5px] border-[#E8E8D8] px-6 py-3 font-bold tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] active:scale-95"
                >
                  <Unlock className="w-5 h-5" /> UNLOCK
                </button>
                <button
                  onClick={handleStartDraft}
                  disabled={busy || !sufficiency.meetsFloor}
                  className="flex items-center gap-2 bg-[#5A8352] hover:bg-[#4A6844] disabled:opacity-40 border-[5px] border-[#E8E8D8] px-6 py-3 font-bold tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] active:scale-95"
                >
                  <Play className="w-5 h-5" /> START DRAFT
                </button>
              </>
            )}
            {busy && <Loader2 className="w-5 h-5 animate-spin text-[#E8E8D8]/70" />}
          </div>
        </>
      )}
    </Shell>
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
  disabled,
  onToggle,
}: {
  player: Player;
  rightLabel: string;
  rightTitle: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`w-full flex items-center gap-2 px-2 py-1.5 text-left border-b border-[#4A6844] text-sm transition ${
        checked ? "bg-[#5A8352]" : "hover:bg-[#4A6844]"
      } disabled:cursor-default`}
    >
      <span
        className={`w-4 h-4 border-2 flex items-center justify-center shrink-0 ${
          checked ? "bg-[#C4A853] border-[#E8E8D8]" : "border-[#E8E8D8]/50"
        }`}
      >
        {checked && <Check className="w-3 h-3 text-[#1A1A1A]" />}
      </span>
      <span className="flex-1 truncate text-[#E8E8D8]">{playerName(player)}</span>
      <span className="w-10 text-xs text-[#E8E8D8]/60">{player.primaryPosition}</span>
      <span className="w-24 text-right text-xs font-bold text-[#E8E8D8]" title={rightTitle}>
        {rightLabel}
      </span>
    </button>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="px-3 py-8 text-center text-sm text-[#E8E8D8]/40">{label}</div>;
}
