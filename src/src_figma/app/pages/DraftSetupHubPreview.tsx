import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, X, Users, Gavel, Minus, ChevronRight, Check, Lock, Unlock, Edit3, AlertTriangle } from "lucide-react";
import { ArchetypePicker, type ArchetypeSlot } from "../components/draft/ArchetypePicker";
import { archetypeByKey } from "../data/teamArchetypeCatalog";
import { useLeagueBuilderData, type RegisteredPool, type Team } from "../../hooks/useLeagueBuilderData";
import {
  MAX_DRAFT_SHILL_COUNT,
  clampDraftShillCount,
  leagueIdFromSearch,
  resolveInitialLeagueId,
  scoutHireRouteForLeague,
  shillCountFromSearch,
} from "../utils/draftRouting";
import { selectTeamArchetype } from "../../../engines/archetypeIdentity";
import { scaledShillDefault } from "../../../data/auctionEngineConstants";
import { saveTeam } from "../../../utils/leagueBuilderStorage";
import { getAuctionSession } from "../../../utils/leagueBuilderStorage";
import { evaluatePoolDemandSufficiency } from "../../../utils/leagueBuilderPoolBuilder";
import { MLB_AUCTION_SEASON } from "../../../utils/leagueBuilderAuctionPipeline";

/**
 * DraftSetupHubPreview — the full Draft Setup hub (roadmap §7.2). The "big
 * new screen": per team, in one place —
 * who's-playing/seats + GM identity (D8: the human names themselves), human-vs-CPU
 * ownership, the MLB+farm archetype picks, and the shill count. (The existing pool
 * shuttle + lock from LeagueBuilderDraftSetup sits above this in the real screen.)
 */

interface Seat { id: string; name: string }
interface TeamConfig { ownerId: string; mlbKey?: string; farmKey?: string } // ownerId = seatId | "cpu"
const SAVED_DRAFT_SETUP_LOCK_MESSAGE =
  "A saved auction is in progress. Resume that draft before changing setup.";
const CHECKING_SAVED_DRAFT_MESSAGE = "Checking for a saved auction before allowing setup changes.";
const SAVED_DRAFT_LOOKUP_ERROR_MESSAGE =
  "Could not confirm whether a saved auction exists. Refresh before changing setup.";

function compactTeams(team: Team | undefined): team is Team {
  return Boolean(team);
}

function seededOwnerId(team: Team, existing: TeamConfig | undefined): string {
  if (team.controlledBy === "ai") return "cpu";
  if (existing?.ownerId && existing.ownerId !== "cpu") return existing.ownerId;
  return "s1";
}

export function DraftSetupHubPreview() {
  const navigate = useNavigate();
  const { leagues, teams, isLoading, error, refresh, getRegisteredPool } = useLeagueBuilderData();
  const requestedLeagueId = useMemo(() => leagueIdFromSearch(window.location.search), []);
  const requestedShillCount = useMemo(() => shillCountFromSearch(window.location.search), []);
  const [activeLeagueId, setActiveLeagueId] = useState("");
  const [seats, setSeats] = useState<Seat[]>([{ id: "s1", name: "You" }, { id: "s2", name: "Player 2" }]);
  const [configs, setConfigs] = useState<Record<string, TeamConfig>>({});
  const [shills, setShills] = useState(() => scaledShillDefault(0));
  const [selected, setSelected] = useState<string>("");
  const [registeredPool, setRegisteredPool] = useState<RegisteredPool | null>(null);
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolError, setPoolError] = useState<string | null>(null);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [savedDraftChecked, setSavedDraftChecked] = useState(false);
  const [savedDraftLookupError, setSavedDraftLookupError] = useState<string | null>(null);
  const [setupActionError, setSetupActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeLeagueId && leagues.length > 0) {
      setActiveLeagueId(resolveInitialLeagueId(leagues, requestedLeagueId));
    }
  }, [activeLeagueId, leagues, requestedLeagueId]);

  const activeLeague = useMemo(
    () => leagues.find((league) => league.id === activeLeagueId) ?? null,
    [activeLeagueId, leagues],
  );

  const leagueTeams = useMemo(() => {
    if (!activeLeague?.teamIds?.length) return [];
    return activeLeague.teamIds
      .map((teamId) => teams.find((team) => team.id === teamId))
      .filter(compactTeams);
  }, [activeLeague, teams]);

  useEffect(() => {
    if (!activeLeagueId) {
      setRegisteredPool(null);
      setPoolLoading(false);
      setPoolError(null);
      setHasSavedDraft(false);
      return;
    }
    let cancelled = false;
    setRegisteredPool(null);
    setPoolLoading(true);
    setPoolError(null);
    void getRegisteredPool(activeLeagueId)
      .then((pool) => {
        if (!cancelled) setRegisteredPool(pool);
      })
      .catch((caught) => {
        if (!cancelled) setPoolError(caught instanceof Error ? caught.message : "Could not load player pool.");
      })
      .finally(() => {
        if (!cancelled) setPoolLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeLeagueId, getRegisteredPool]);

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
    setSetupActionError(null);
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

  useEffect(() => {
    setShills(clampDraftShillCount(requestedShillCount ?? scaledShillDefault(leagueTeams.length)));
  }, [leagueTeams.length, requestedShillCount]);

  useEffect(() => {
    if (leagueTeams.length === 0) return;
    setConfigs((current) => {
      const next: Record<string, TeamConfig> = {};
      leagueTeams.forEach((team) => {
        const existing = current[team.id];
        next[team.id] = {
          ownerId: seededOwnerId(team, existing),
          mlbKey: team.mlbArchetypeKey,
          farmKey: team.farmArchetypeKey,
        };
      });
      return next;
    });
  }, [leagueTeams]);

  useEffect(() => {
    if (leagueTeams.length === 0) {
      setSelected("");
      return;
    }
    if (!selected || !leagueTeams.some((team) => team.id === selected)) {
      setSelected(leagueTeams[0].id);
    }
  }, [leagueTeams, selected]);

  const ownerName = (ownerId: string) => (ownerId === "cpu" ? "CPU" : seats.find((s) => s.id === ownerId)?.name ?? "CPU");
  const setConfig = (teamId: string, patch: Partial<TeamConfig>) =>
    setConfigs((c) => ({ ...c, [teamId]: { ...c[teamId], ...patch } }));
  const latestTeam = (teamId: string) => teams.find((team) => team.id === teamId);
  const savedDraftMutationBlocked = !savedDraftChecked || Boolean(savedDraftLookupError) || hasSavedDraft;
  const setupMutationBlockMessage = hasSavedDraft
    ? SAVED_DRAFT_SETUP_LOCK_MESSAGE
    : savedDraftLookupError ?? (savedDraftChecked
      ? null
      : CHECKING_SAVED_DRAFT_MESSAGE);
  const canMutateSetup = () => {
    if (!setupMutationBlockMessage) return true;
    setSetupActionError(setupMutationBlockMessage);
    return false;
  };
  const handlePick = async (slot: ArchetypeSlot, key: string) => {
    if (!canMutateSetup()) return;
    if (!selected) return;
    const current = configs[selected];
    const nextMlbKey = slot === "mlb" ? key : current?.mlbKey;
    const nextFarmKey = slot === "farm" ? key : current?.farmKey;
    setConfig(selected, slot === "mlb" ? { mlbKey: key } : { farmKey: key });
    if (!nextMlbKey) return;

    const team = latestTeam(selected);
    if (!team) return;
    await selectTeamArchetype({ ...team }, nextMlbKey, nextFarmKey);
    await refresh();
  };
  const handleOwnerChange = async (teamId: string, ownerId: string) => {
    if (!canMutateSetup()) return;
    setConfig(teamId, { ownerId });
    const team = latestTeam(teamId);
    if (!team) return;
    await saveTeam({ ...team, controlledBy: ownerId === "cpu" ? "ai" : "human" });
    await refresh();
  };

  const humanTeams = useMemo(() => leagueTeams.filter((team) => configs[team.id]?.ownerId !== "cpu"), [configs, leagueTeams]);
  const identitiesReady = leagueTeams.length > 0 && leagueTeams.every((team) => configs[team.id]?.mlbKey);
  const poolSize = registeredPool?.players.length ?? 0;
  // FABLE-C3-FIX F4: same market-clearing gate as the routed Draft Setup — teams and shills are
  // separate demand kinds (shills demand their capped WINS, never 22 seats each).
  const poolSufficiency = useMemo(
    () => evaluatePoolDemandSufficiency(poolSize, activeLeague?.teamIds.length ?? 0, shills),
    [activeLeague?.teamIds.length, poolSize, shills],
  );
  const poolLocked = Boolean(registeredPool?.locked);
  const poolReady = poolLocked && poolSufficiency.meetsFloor;
  const ready = identitiesReady && poolReady && !poolLoading && !poolError && savedDraftChecked && !savedDraftLookupError;
  const sel = leagueTeams.find((team) => team.id === selected);
  const selCfg = configs[selected];
  const poolEditRoute = activeLeague
    ? `/league-builder/draft-setup?leagueId=${encodeURIComponent(activeLeague.id)}`
    : "/league-builder/draft-setup";

  const addSeat = () => {
    if (!canMutateSetup()) return;
    setSeats((s) => [...s, { id: `s${Date.now()}`, name: `Player ${s.length + 1}` }]);
  };
  const removeSeat = (id: string) => {
    if (!canMutateSetup()) return;
    const affectedTeamIds = leagueTeams
      .filter((team) => configs[team.id]?.ownerId === id)
      .map((team) => team.id);
    setSeats((s) => (s.length <= 1 ? s : s.filter((x) => x.id !== id)));
    setConfigs((c) => {
      const next = { ...c };
      Object.keys(next).forEach((tid) => { if (next[tid].ownerId === id) next[tid] = { ...next[tid], ownerId: "cpu" }; });
      return next;
    });
    void (async () => {
      await Promise.all(affectedTeamIds.map(async (teamId) => {
        const team = latestTeam(teamId);
        if (!team) return;
        await saveTeam({ ...team, controlledBy: "ai" });
      }));
      if (affectedTeamIds.length > 0) await refresh();
    })();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-6" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-2 text-xs font-bold tracking-[0.2em] text-[#C4A853]">DRAFT SETUP</div>
          <h1 className="text-2xl font-bold">Loading draft room...</h1>
        </div>
      </div>
    );
  }

  if (error || !activeLeague || leagueTeams.length === 0 || !sel || !selCfg) {
    return (
      <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-6" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-2 text-xs font-bold tracking-[0.2em] text-[#C4A853]">DRAFT SETUP</div>
          <h1 className="text-2xl font-bold mb-2" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.8)" }}>Select a league first</h1>
          <p className="text-sm text-[#E8E8D8]/65">
            {error ? `Draft setup could not load: ${error}` : "No active league with teams is available for draft setup."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-6" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-2 text-xs font-bold tracking-[0.2em] text-[#C4A853]">DRAFT SETUP</div>
        <h1 className="text-2xl font-bold mb-1" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.8)" }}>The Draft Room</h1>
        <p className="text-sm text-[#E8E8D8]/65 mb-5 max-w-[72ch]">
          Who's playing, who owns which clubs, each club's identity, and how much CPU pressure fills the room — all before the draft begins.
        </p>

        <div className="bg-[#2d3d2f] border-4 border-[#4A6844] p-4 mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {poolLocked ? <Lock className="w-4 h-4 text-[#9FE0A0]" /> : <Unlock className="w-4 h-4 text-[#FFD27A]" />}
                <div className="text-xs font-bold tracking-[0.2em] text-[#C4A853]">PLAYER POOL</div>
                <span className={`text-[10px] font-bold px-2 py-0.5 ${poolReady ? "bg-[#9FE0A0] text-[#1A1A1A]" : "bg-[#6B3A3A] text-[#FFE8B0]"}`}>
                  {poolLoading ? "LOADING" : poolReady ? "LOCKED" : "NEEDS LOCK"}
                </span>
              </div>
              <div className="text-sm text-[#E8E8D8]/75">
                {poolSize.toLocaleString()} players · {poolSufficiency.mlbSlots} draft slots
                {poolSufficiency.meetsFloor
                  ? ` · surplus ${poolSufficiency.surplus >= 0 ? "+" : ""}${poolSufficiency.surplus}`
                  : ` · need ${Math.abs(poolSufficiency.surplus)} more`}
              </div>
              {poolError || savedDraftLookupError || setupActionError ? (
                <div className="mt-2 flex items-center gap-2 text-xs font-bold text-[#FFE8B0]">
                  <AlertTriangle className="w-3.5 h-3.5" /> {setupActionError ?? savedDraftLookupError ?? poolError}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => navigate(poolEditRoute)}
              className="flex items-center gap-2 bg-[#34472f] hover:bg-[#3a4d3c] border-2 border-[#C4A853] px-3 py-2 text-sm font-bold"
            >
              <Edit3 className="w-4 h-4" /> Edit player pool
            </button>
          </div>
        </div>

        {/* who's playing + the room */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 mb-4">
          <div className="bg-[#2d3d2f] border-4 border-[#4A6844] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-[#C4A853]" />
              <div className="text-xs font-bold tracking-[0.2em] text-[#C4A853]">WHO'S PLAYING</div>
              <span className="text-[11px] text-[#E8E8D8]/45">· your name is your GM identity · one device, passed around</span>
            </div>
            <div className="flex flex-col gap-2">
              {seats.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="w-6 text-center text-xs font-bold text-[#C4A853]">{i + 1}</span>
                  <input
                    value={s.name}
                    onChange={(e) => {
                      if (savedDraftMutationBlocked) return;
                      setSeats((arr) => arr.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)));
                    }}
                    disabled={savedDraftMutationBlocked}
                    className="flex-1 bg-[#34472f] border-2 border-[#4A6844] focus:border-[#C4A853] outline-none px-3 py-2 text-sm font-bold text-[#E8E8D8]"
                  />
                  <span className="text-[11px] text-[#E8E8D8]/50 w-20 text-right">
                    {leagueTeams.filter((team) => configs[team.id]?.ownerId === s.id).length} team(s)
                  </span>
                  <button type="button" onClick={() => removeSeat(s.id)} disabled={seats.length <= 1 || savedDraftMutationBlocked}
                    className="p-1.5 border-2 border-[#4A6844] hover:border-[#E0857A] disabled:opacity-30">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addSeat} disabled={savedDraftMutationBlocked}
              className="mt-3 flex items-center gap-2 bg-[#34472f] hover:bg-[#3a4d3c] disabled:opacity-40 border-2 border-[#4A6844] px-3 py-2 text-sm font-bold">
              <Plus className="w-4 h-4" /> Add player
            </button>
          </div>

          <div className="bg-[#2d3d2f] border-4 border-[#4A6844] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gavel className="w-4 h-4 text-[#C4A853]" />
              <div className="text-xs font-bold tracking-[0.2em] text-[#C4A853]">THE ROOM</div>
            </div>
            <div className="text-[12px] text-[#E8E8D8]/60 mb-3">
              Pure shills bid from their own visible draft rosters and do not transfer into the living season.
            </div>
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Decrease shill bidders" disabled={savedDraftMutationBlocked} onClick={() => setShills((n) => Math.max(0, n - 1))}
                className="p-2 border-2 border-[#4A6844] hover:border-[#C4A853] disabled:opacity-40"><Minus className="w-4 h-4" /></button>
              <div className="text-3xl font-bold text-[#E8E8D8] w-10 text-center" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>{shills}</div>
              <button type="button" aria-label="Increase shill bidders" disabled={savedDraftMutationBlocked} onClick={() => setShills((n) => Math.min(MAX_DRAFT_SHILL_COUNT, n + 1))}
                className="p-2 border-2 border-[#4A6844] hover:border-[#C4A853] disabled:opacity-40"><Plus className="w-4 h-4" /></button>
              <div className="text-[11px] text-[#E8E8D8]/50 ml-1">shill bidders</div>
            </div>
          </div>
        </div>

        {/* the teams */}
        <div className="bg-[#2d3d2f] border-4 border-[#4A6844] p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-xs font-bold tracking-[0.2em] text-[#C4A853]">THE CLUBS</div>
            <span className="text-[11px] text-[#E8E8D8]/45">{humanTeams.length} human · {leagueTeams.length - humanTeams.length} CPU</span>
            <span className={`ml-auto text-[11px] font-bold ${identitiesReady ? "text-[#9FE0A0]" : "text-[#E8E8D8]/45"}`}>
              {identitiesReady ? "✓ every club has an identity" : "set each club's identity"}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {leagueTeams.map((t) => {
              const cfg = configs[t.id];
              const isHuman = cfg.ownerId !== "cpu";
              const m = archetypeByKey(cfg.mlbKey);
              const f = archetypeByKey(cfg.farmKey);
              const isSel = t.id === selected;
              return (
                <div key={t.id} className={`border-4 p-3 ${isSel ? "border-[#C4A853] bg-[#3a4d3c]" : "border-[#4A6844] bg-[#34472f]"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-[#E8E8D8]" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>{t.name}</span>
                    {isHuman && <span className="text-[9px] font-bold tracking-wider bg-[#C4A853] text-[#1A1A1A] px-1.5 py-0.5">{ownerName(cfg.ownerId).toUpperCase()}</span>}
                    <select
                      value={cfg.ownerId}
                      onChange={(e) => { void handleOwnerChange(t.id, e.target.value); }}
                      disabled={savedDraftMutationBlocked}
                      className="ml-auto bg-[#243024] border-2 border-[#4A6844] text-xs font-bold px-2 py-1 text-[#E8E8D8] outline-none"
                    >
                      <option value="cpu">CPU</option>
                      {seats.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px] text-[#E8E8D8]/60 mb-2">
                    <span>MLB: <span className="text-[#E8E8D8]">{m?.name ?? "—"}</span></span>
                    <span>Farm: <span className="text-[#E8E8D8]">{f?.name ?? "—"}</span></span>
                  </div>
                  <button type="button" onClick={() => setSelected(t.id)}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#C4A853] hover:underline">
                    {m ? <><Check className="w-3 h-3" /> identity set — edit</> : <>set identity <ChevronRight className="w-3 h-3" /></>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* the picker for the selected club */}
        <div className="bg-[#2d3d2f] border-4 border-[#C4A853] p-4">
          <ArchetypePicker
            teamLabel={`${sel.name} (${sel.abbreviation}) · GM ${ownerName(selCfg.ownerId)}`}
            mlbKey={selCfg.mlbKey}
            farmKey={selCfg.farmKey}
            onPick={handlePick}
            disabled={savedDraftMutationBlocked}
            disabledReason={setupMutationBlockMessage ?? undefined}
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button type="button" disabled={!ready} onClick={() => { if (ready) navigate(scoutHireRouteForLeague(activeLeague, { shillCount: shills })); }}
            className="flex items-center gap-2 bg-[#C4A853] hover:bg-[#D4B863] disabled:opacity-40 text-[#1A1A1A] border-[5px] border-[#E8E8D8] px-6 py-3 font-bold tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] active:scale-95">
            {hasSavedDraft ? "Resume Draft" : "Start the Draft"} <ChevronRight className="w-5 h-5" />
          </button>
          {!ready && (
            <span className="text-[11px] text-[#E8E8D8]/50">
              {savedDraftLookupError
                ? "could not verify saved draft status"
                : !savedDraftChecked
                  ? "checking for a saved draft"
                  : !poolReady
                    ? "lock a sufficient player pool first"
                    : "give every club an MLB identity first"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default DraftSetupHubPreview;
