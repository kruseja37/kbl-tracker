import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, Gavel, RefreshCw, ShieldAlert, UserCheck } from "lucide-react";

import {
  playerDisplayName,
  teamDisplayName,
  useAuctionDraft,
} from "../hooks/useAuctionDraft";
import {
  DraftRosterBoard,
  MLB_BOARD_TARGET,
  type DraftBoardEntry,
} from "../components/DraftRosterBoard";
import { reservePriceCurve } from "../../../data/rosterEngineConstants";
import {
  getTeamAuctionMaxBid,
  type AuctionPlayer,
  type AuctionResult,
  type AuctionSession,
} from "../../../engines/auctionStateMachine";
import type { Player, Team } from "../../hooks/useLeagueBuilderData";

const DEFAULT_AUCTION_SEED = "startup-auction-v1";

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return `$${Math.round(value).toLocaleString()}`;
}

function minimumBid(session: AuctionSession): number | null {
  const lot = session.currentLot;
  if (!lot) return null;
  return lot.highBid === null ? lot.openingAsk : lot.highBid + session.config.bidIncrement;
}

function reserveAsk(player: AuctionPlayer | null | undefined): number | null {
  if (!player) return null;
  return reservePriceCurve(player.ivPercentile) * player.iv;
}

function playerPositions(player: Player | null | undefined): string[] {
  return Array.from(new Set([player?.primaryPosition, player?.secondaryPosition].filter(Boolean) as string[]));
}

function positionBadges(player: Player | null | undefined) {
  const positions = playerPositions(player);
  if (positions.length === 0) {
    return <span className="bg-[#3B7DD8] px-2 py-0.5 text-xs font-bold">POS</span>;
  }
  return positions.map((position) => (
    <span key={position} className="bg-[#3B7DD8] px-2 py-0.5 text-xs font-bold">
      {position}
    </span>
  ));
}

function resultText(result: AuctionResult, playerById: Map<string, Player>, teamById: Map<string, Team>): string {
  const playerName = playerDisplayName(playerById.get(result.playerId));
  if (result.disposition === "SOLD") {
    return `${playerName} SOLD to ${teamDisplayName(result.winnerTeamId ? teamById.get(result.winnerTeamId) : null)} for ${formatMoney(result.salary)}`;
  }
  if (result.disposition === "SET_ASIDE") return `${playerName} set aside`;
  return `${playerName} PASSED`;
}

function resultNoticeClass(disposition: AuctionResult["disposition"] | undefined): string {
  if (disposition === "SOLD") return "bg-[#2F7D46] border-[#E8E8D8]/40 text-[#E8E8D8]";
  if (disposition === "SET_ASIDE") return "bg-[#6B3A3A] border-[#FFD27A] text-[#FFE8B0]";
  return "bg-[#4A6844] border-[#FFD27A] text-[#FFD27A]";
}

function rosterPositionTally(
  team: AuctionSession["teams"][number] | null | undefined,
  playerById: Map<string, Player>,
): Array<[string, number]> {
  const tally = new Map<string, number>();
  for (const assignment of team?.roster ?? []) {
    const position = playerById.get(assignment.playerId)?.primaryPosition ?? "Unknown";
    tally.set(position, (tally.get(position) ?? 0) + 1);
  }
  return [...tally.entries()].sort((left, right) => left[0].localeCompare(right[0]));
}

export function LeagueBuilderAuctionDraft() {
  const navigate = useNavigate();
  const auction = useAuctionDraft();
  const { leagueData, loadAuction, session } = auction;
  const [activeLeagueId, setActiveLeagueId] = useState("");
  const [seed, setSeed] = useState(DEFAULT_AUCTION_SEED);
  const [cpuCount, setCpuCount] = useState(0);
  const [bidIncrement, setBidIncrement] = useState(5000);
  const [bidAmount, setBidAmount] = useState("");
  const loadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeLeagueId && leagueData.leagues.length > 0) {
      setActiveLeagueId(leagueData.leagues[0].id);
    }
  }, [activeLeagueId, leagueData.leagues]);

  useEffect(() => {
    if (!activeLeagueId) return;
    const key = `${activeLeagueId}:1`;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;
    void loadAuction(activeLeagueId);
  }, [activeLeagueId, loadAuction]);

  const activeLeague = useMemo(
    () => leagueData.leagues.find((league) => league.id === activeLeagueId) ?? null,
    [activeLeagueId, leagueData.leagues],
  );

  const leagueTeams = useMemo(() => {
    if (!activeLeague?.teamIds?.length) return [];
    return activeLeague.teamIds
      .map((teamId) => leagueData.teams.find((team) => team.id === teamId))
      .filter(Boolean);
  }, [activeLeague, leagueData.teams]);

  const teamById = useMemo(() => new Map(leagueData.teams.map((team) => [team.id, team])), [leagueData.teams]);
  const playerById = useMemo(() => new Map(leagueData.players.map((player) => [player.id, player])), [leagueData.players]);
  const teamStateById = useMemo(() => new Map(session?.teams.map((team) => [team.teamId, team]) ?? []), [session]);

  const currentBidder = auction.currentBidderTeamId ? teamById.get(auction.currentBidderTeamId) : null;
  const currentLotPlayer = session?.currentLot ? playerById.get(session.currentLot.playerId) : null;
  const minBid = session ? minimumBid(session) : null;
  const lot = session?.currentLot ?? null;
  const lotAuctionPlayer = lot ? session?.players[lot.playerId] ?? null : null;
  const pendingClaimTeam = session?.pendingClaim ? teamById.get(session.pendingClaim.teamId) : null;
  const currentBidderTeamState = auction.currentBidderTeamId ? teamStateById.get(auction.currentBidderTeamId) : null;
  const currentBidderMaxBid = session && auction.currentBidderTeamId
    ? getTeamAuctionMaxBid(session, auction.currentBidderTeamId)
    : null;
  const currentBidderIsCpu = auction.isCpuTeam(auction.currentBidderTeamId);
  const currentRosterTally = useMemo(
    () => rosterPositionTally(currentBidderTeamState, playerById),
    [currentBidderTeamState, playerById],
  );
  const rosterBoardTeamState = useMemo(() => {
    if (currentBidderTeamState) return currentBidderTeamState;
    const humanTeam = leagueData.teams.find((team) => team.controlledBy === "human");
    return humanTeam ? teamStateById.get(humanTeam.id) ?? null : null;
  }, [currentBidderTeamState, leagueData.teams, teamStateById]);
  const rosterBoardEntries = useMemo<DraftBoardEntry[]>(() => (
    (rosterBoardTeamState?.roster ?? []).map((assignment) => {
      const player = playerById.get(assignment.playerId);
      return {
        id: assignment.playerId,
        name: playerDisplayName(player),
        primaryPosition: player?.primaryPosition ?? "Unknown",
        secondaryPosition: player?.secondaryPosition,
        salary: assignment.salary,
      };
    })
  ), [playerById, rosterBoardTeamState]);
  const rosterBoardPayroll = useMemo(
    () => rosterBoardEntries.reduce((sum, entry) => sum + entry.salary, 0),
    [rosterBoardEntries],
  );
  const latestResult = session?.results.at(-1) ?? null;

  useEffect(() => {
    if (minBid !== null) setBidAmount(String(Math.ceil(minBid)));
  }, [minBid]);

  const clampBidAmount = (amount: number): number | null => {
    if (minBid === null || currentBidderMaxBid === null || !Number.isFinite(amount)) return null;
    const lower = Math.ceil(minBid);
    const upper = Math.floor(currentBidderMaxBid);
    if (upper < lower) return null;
    return Math.min(Math.max(Math.round(amount), lower), upper);
  };

  const nowTeam =
    session?.state === "OPEN_BIDDING" ? currentBidder :
    session?.state === "RESOLVE" && session.pendingClaim ? pendingClaimTeam :
    null;
  const nowAction =
    session?.state === "NOMINATION" ? "surface next lot" :
    session?.state === "OPEN_BIDDING" ? "raise or pass" :
    session?.state === "RESOLVE" && session.pendingClaim ? "claim at reserve or pass" :
    (session?.state === "SOLD" || session?.state === "PASSED") ? "confirm next lot" :
    session?.state === "AUCTION_COMPLETE" ? "auction complete" :
    "setup";

  const handoffPrompt = useMemo(() => {
    if (!session) return "Host setup";
    if (session.state === "NOMINATION") {
      return "Hold — engine surfacing the next player.";
    }
    if (session.state === "OPEN_BIDDING") {
      if (auction.currentBidderTeamId && !auction.isCpuTeam(auction.currentBidderTeamId)) {
        return `Pass device to ${teamDisplayName(currentBidder)}`;
      }
      return "Hold — CPUs resolving";
    }
    if (session.state === "RESOLVE" && session.pendingClaim) {
      if (!auction.isCpuTeam(session.pendingClaim.teamId)) return `Pass device to ${teamDisplayName(pendingClaimTeam)}`;
      return "Hold — CPUs resolving";
    }
    if (session.state === "SOLD" || session.state === "PASSED") {
      return "Confirm next lot.";
    }
    if (session.state === "AUCTION_COMPLETE") return "Auction complete.";
    return "Hold — CPUs resolving";
  }, [
    auction,
    currentBidder,
    pendingClaimTeam,
    session,
  ]);

  const availablePoolCandidates = useMemo(() => {
    if (!session) return [];
    return session.availablePlayerIds
      .map((playerId) => session.players[playerId])
      .filter(Boolean);
  }, [session]);

  const blockers = useMemo(() => {
    const messages: string[] = [];
    if (!activeLeagueId) messages.push("Select a league to load the auction draft.");
    if (activeLeagueId && leagueTeams.length === 0) messages.push("Selected league has no teams.");
    if (session?.state === "NOMINATION" && availablePoolCandidates.length === 0) messages.push("No nominatable players remain.");
    return messages;
  }, [activeLeagueId, availablePoolCandidates.length, leagueTeams.length, session?.state]);

  const beginAuction = () => {
    void auction.initAuction(activeLeagueId, {
      nominationOrderSeed: seed,
      cpuShillCount: cpuCount,
      bidIncrement,
      turnTimerSeconds: null,
      excludeFromLeague: true,
    });
  };

  if (leagueData.isLoading) {
    return (
      <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8 flex items-center justify-center">
        <div className="text-lg">Loading auction draft...</div>
      </div>
    );
  }

  if (leagueData.error) {
    return (
      <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8 flex items-center justify-center">
        <div className="text-xl text-red-400">Error: {leagueData.error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              aria-label="Back to League Builder"
              onClick={() => navigate("/league-builder")}
              className="p-3 bg-[#4A6844] hover:bg-[#5A8352] border-4 border-[#E8E8D8] transition active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              <ArrowLeft className="w-6 h-6 text-[#E8E8D8]" />
            </button>
            <div className="flex items-center gap-3 bg-[#5A8352] border-[6px] border-[#E8E8D8] px-8 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]">
              <Gavel className="w-6 h-6" style={{ color: "#FFD27A" }} />
              <h1
                className="text-2xl font-bold text-[#E8E8D8] tracking-wider"
                style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
              >
                MLB AUCTION DRAFT
              </h1>
            </div>
          </div>
          {session?.state === "AUCTION_COMPLETE" && (
            <span className="flex items-center gap-2 bg-[#2F7D46] border-4 border-[#E8E8D8]/40 px-4 py-2 font-bold">
              <CheckCircle2 className="w-5 h-5" />
              AUCTION COMPLETE
            </span>
          )}
        </div>

        {auction.error && (
          <div className="mb-6 bg-[#6B3A3A] border-4 border-[#FFD27A] p-4 text-[#FFE8B0] font-bold">
            {auction.error}
          </div>
        )}

        <div className="mb-6 bg-[#3B7DD8] border-[6px] border-[#E8E8D8] p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]">
          <div className="text-xs text-[#E8E8D8]/70 font-bold">HANDOFF</div>
          <div className="text-xl font-bold">
            Now: {nowTeam ? teamDisplayName(nowTeam) : "Host"} — {nowAction}
          </div>
          <div className="mt-1 text-sm text-[#E8E8D8]/85 font-bold">{handoffPrompt}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          <section className="bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <h2 className="font-bold mb-4 text-lg">SETUP</h2>

            <label htmlFor="auction-league" className="block text-xs text-[#E8E8D8]/70 mb-1">LEAGUE</label>
            <select
              id="auction-league"
              value={activeLeagueId}
              onChange={(event) => {
                setActiveLeagueId(event.target.value);
                loadedKeyRef.current = null;
              }}
              className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none mb-4"
            >
              {leagueData.leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>

            <label htmlFor="auction-seed" className="block text-xs text-[#E8E8D8]/70 mb-1">SEED</label>
            <input
              id="auction-seed"
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              disabled={Boolean(session)}
              className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none mb-4 disabled:opacity-60"
            />

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-[#E8E8D8]/70">
                CPU COUNT
                <input
                  value={cpuCount}
                  onChange={(event) => setCpuCount(Number(event.target.value) || 0)}
                  disabled={Boolean(session)}
                  type="number"
                  min={0}
                  max={Math.max(0, leagueTeams.length - 1)}
                  className="mt-1 w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none disabled:opacity-60"
                />
              </label>
              <label className="block text-xs text-[#E8E8D8]/70">
                BID INCREMENT
                <input
                  value={bidIncrement}
                  onChange={(event) => setBidIncrement(Number(event.target.value) || 0)}
                  disabled={Boolean(session)}
                  type="number"
                  min={1}
                  className="mt-1 w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none disabled:opacity-60"
                />
              </label>
            </div>

            {!session && (
              <button
                onClick={beginAuction}
                disabled={!activeLeagueId || leagueTeams.length === 0 || auction.isWorking}
                className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#3B7DD8] hover:bg-[#4B8DE8] disabled:opacity-50 disabled:hover:bg-[#3B7DD8] border-4 border-[#E8E8D8] transition font-bold"
              >
                {auction.isWorking ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                <span>{auction.isWorking ? "STARTING" : "BEGIN AUCTION DRAFT"}</span>
              </button>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                <div className="text-xs text-[#E8E8D8]/60">TEAMS</div>
                <div className="font-bold text-xl">{leagueTeams.length}</div>
              </div>
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                <div className="text-xs text-[#E8E8D8]/60">CPU</div>
                <div className="font-bold text-xl">{auction.cpuTeamIds.length || cpuCount}</div>
              </div>
            </div>

            {blockers.length ? (
              <div className="mt-5 bg-[#6B3A3A] border-4 border-[#FFD27A] p-4">
                <div className="flex items-center gap-2 font-bold mb-2">
                  <ShieldAlert className="w-5 h-5" />
                  BLOCKED
                </div>
                <ul className="space-y-1 text-sm text-[#FFE8B0]">
                  {blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="font-bold text-lg">STATE: {session?.state ?? "SETUP"}</h2>
              {session && <div className="text-sm text-[#E8E8D8]/60">Seed {session.config.nominationOrderSeed}</div>}
            </div>

            {!session && (
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4 text-[#E8E8D8]/80">
                No active auction session. Configure the league, then begin.
              </div>
            )}

            {session?.state === "NOMINATION" && (
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                <div className="text-xs text-[#E8E8D8]/60">ENGINE NOMINATION</div>
                <div className="text-xl font-bold">Surfacing the next player...</div>
                <div className="mt-1 text-sm text-[#E8E8D8]/70">
                  Available pool: {availablePoolCandidates.length} players
                </div>
              </div>
            )}

              {session?.state === "OPEN_BIDDING" && lot && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                      <div className="text-xs text-[#E8E8D8]/60">ENGINE NOMINATED</div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <div className="text-xl font-bold">{playerDisplayName(currentLotPlayer)}</div>
                        {positionBadges(currentLotPlayer)}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-[#E8E8D8]/75">
                        <div>IV {formatMoney(lotAuctionPlayer?.iv)}</div>
                        <div>Reserve {formatMoney(reserveAsk(lotAuctionPlayer) ?? lot.openingAsk)}</div>
                        <div>Opening {formatMoney(lot.openingAsk)}</div>
                      </div>
                    </div>
                    <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                      <div className="text-xs text-[#E8E8D8]/60">HIGH BID</div>
                      <div className="text-xl font-bold">{lot.highBid === null ? "No bid yet" : formatMoney(lot.highBid)}</div>
                      <div className="text-sm text-[#E8E8D8]/70">
                        {lot.highBidder ? teamDisplayName(teamById.get(lot.highBidder)) : "No bidder yet"}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                      <div className="text-xs text-[#E8E8D8]/60">CURRENT BIDDER</div>
                      <div className="text-xl font-bold">{teamDisplayName(currentBidder)}</div>
                      <div className="text-sm text-[#E8E8D8]/70">
                        Still in: {lot.stillIn.map((teamId) => teamDisplayName(teamById.get(teamId))).join(", ")}
                      </div>
                    </div>
                    <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                      <div className="text-xs text-[#E8E8D8]/60">YOUR REMAINING BUDGET</div>
                      <div className="text-xl font-bold">{formatMoney(currentBidderTeamState?.budgetRemaining)}</div>
                      <div className="text-sm text-[#E8E8D8]/70">{teamDisplayName(currentBidder)}</div>
                    </div>
                    <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                      <div className="text-xs text-[#E8E8D8]/60">YOUR MAX BID</div>
                      <div className="text-xl font-bold">{formatMoney(currentBidderMaxBid)}</div>
                      <div className="text-sm text-[#FFD27A] font-bold">Teams below the current ask are auto-passed.</div>
                    </div>
                  </div>
                  <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
                      <div>
                        <div className="text-xs text-[#E8E8D8]/60">ROSTER SLOTS REMAINING</div>
                        <div className="text-3xl font-bold">{currentBidderTeamState?.rosterSlotsRemaining ?? "N/A"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#E8E8D8]/60 mb-2">CURRENT ROSTER POSITION TALLY</div>
                        {currentRosterTally.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {currentRosterTally.map(([position, count]) => (
                              <span key={position} className="bg-[#2d3d2f] border-2 border-[#E8E8D8]/20 px-2 py-1 text-xs font-bold">
                                {position}: {count}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-[#E8E8D8]/70">No MLB auction players rostered yet.</div>
                        )}
                      </div>
                    </div>
                  </div>
                  {auction.currentBidderTeamId ? (
                    <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                      <div className="text-xs text-[#E8E8D8]/60 mb-3">RAISE</div>
                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px_auto] gap-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {[1, 2, 5].map((multiple) => {
                            const amount = minBid === null ? null : minBid + session.config.bidIncrement * multiple;
                            const disabled = auction.isWorking
                              || currentBidderIsCpu
                              || amount === null
                              || currentBidderMaxBid === null
                              || amount > currentBidderMaxBid;
                            return (
                              <button
                                key={multiple}
                                type="button"
                                onClick={() => amount !== null && void auction.bid(auction.currentBidderTeamId!, amount)}
                                disabled={disabled}
                                className="px-4 py-2 bg-[#2F7D46] hover:bg-[#3F8D56] disabled:opacity-50 disabled:hover:bg-[#2F7D46] border-4 border-[#E8E8D8] font-bold"
                              >
                                +{multiple}× {formatMoney(amount)}
                              </button>
                            );
                          })}
                        </div>
                        <label className="block text-xs text-[#E8E8D8]/70 font-bold">
                          CUSTOM BID
                          <input
                            aria-label="Custom bid amount"
                            value={bidAmount}
                            onChange={(event) => setBidAmount(event.target.value)}
                            onBlur={() => {
                              const clamped = clampBidAmount(Number(bidAmount));
                              if (clamped !== null) setBidAmount(String(clamped));
                            }}
                            type="number"
                            min={minBid ?? undefined}
                            max={currentBidderMaxBid ?? undefined}
                            disabled={auction.isWorking || currentBidderIsCpu}
                            className="mt-1 w-full bg-[#2d3d2f] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none disabled:opacity-50"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const clamped = clampBidAmount(Number(bidAmount));
                            if (clamped === null) return;
                            setBidAmount(String(clamped));
                            void auction.bid(auction.currentBidderTeamId!, clamped);
                          }}
                          disabled={auction.isWorking || currentBidderIsCpu || clampBidAmount(Number(bidAmount)) === null}
                          className="self-end px-4 py-2 bg-[#2F7D46] hover:bg-[#3F8D56] disabled:opacity-50 disabled:hover:bg-[#2F7D46] border-4 border-[#E8E8D8] font-bold"
                        >
                          RAISE CUSTOM
                        </button>
                      </div>
                      <button
                        onClick={() => void auction.pass(auction.currentBidderTeamId!)}
                        disabled={auction.isWorking || currentBidderIsCpu}
                        className="mt-3 px-4 py-2 bg-[#6B3A3A] hover:bg-[#7B4A4A] disabled:opacity-50 border-4 border-[#E8E8D8] font-bold"
                      >
                        PASS
                      </button>
                    </div>
                  ) : (
                    <button
                    onClick={() => void auction.resolve()}
                    disabled={auction.isWorking}
                    className="px-4 py-2 bg-[#3B7DD8] hover:bg-[#4B8DE8] border-4 border-[#E8E8D8] font-bold"
                  >
                    RESOLVE LOT
                  </button>
                )}
              </div>
            )}

            {session?.state === "RESOLVE" && (
              <div className="space-y-4">
                <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                  <div className="text-xs text-[#E8E8D8]/60">PENDING CLAIM</div>
                  <div className="text-xl font-bold">
                    {session.pendingClaim
                      ? `${teamDisplayName(pendingClaimTeam)} can claim ${playerDisplayName(currentLotPlayer)} at ${formatMoney(session.pendingClaim.price)}`
                      : "Ready to resolve"}
                  </div>
                </div>
                {session.pendingClaim ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => void auction.claimAtReserve()}
                      disabled={auction.isWorking || auction.isCpuTeam(session.pendingClaim.teamId)}
                      className="px-4 py-2 bg-[#2F7D46] hover:bg-[#3F8D56] disabled:opacity-50 border-4 border-[#E8E8D8] font-bold"
                    >
                      CLAIM AT RESERVE
                    </button>
                    <button
                      onClick={() => void auction.pass(session.pendingClaim!.teamId)}
                      disabled={auction.isWorking || auction.isCpuTeam(session.pendingClaim.teamId)}
                      className="px-4 py-2 bg-[#6B3A3A] hover:bg-[#7B4A4A] disabled:opacity-50 border-4 border-[#E8E8D8] font-bold"
                    >
                      PASS
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => void auction.resolve()}
                    disabled={auction.isWorking}
                    className="px-4 py-2 bg-[#3B7DD8] hover:bg-[#4B8DE8] border-4 border-[#E8E8D8] font-bold"
                  >
                    RESOLVE
                  </button>
                )}
              </div>
            )}

              {(session?.state === "SOLD" || session?.state === "PASSED") && (
                <div className="space-y-4">
                  <div className={`${resultNoticeClass(latestResult?.disposition)} border-4 p-4`}>
                    <div className="text-xs text-[#E8E8D8]/60">LAST RESULT</div>
                    <div className="text-xl font-bold">{latestResult ? resultText(latestResult, playerById, teamById) : session.state}</div>
                  </div>
                  <button
                    onClick={() => void auction.advance()}
                  disabled={auction.isWorking}
                  className="px-4 py-2 bg-[#3B7DD8] hover:bg-[#4B8DE8] border-4 border-[#E8E8D8] font-bold"
                >
                  NEXT LOT
                </button>
              </div>
            )}

              {session?.state === "AUCTION_COMPLETE" && (
                <div className="bg-[#2F7D46] border-4 border-[#E8E8D8]/40 p-4 font-bold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <span>AUCTION COMPLETE. MLB rosters are filled in the auction session.</span>
                  <button
                    onClick={() => navigate("/league-builder/farm-auction-draft")}
                    className="px-4 py-2 bg-[#3B7DD8] hover:bg-[#4B8DE8] border-4 border-[#E8E8D8] font-bold whitespace-nowrap"
                  >
                    PROCEED TO FARM AUCTION →
                  </button>
                </div>
              )}
            </section>
          </div>

        {session && (
          <section className="mt-6 bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <h2 className="font-bold text-lg mb-4">LOT LOG</h2>
            <div className="space-y-2">
                {session.results.slice(-12).reverse().map((result, index) => (
                  <div key={`${result.playerId}-${session.results.length - index}`} className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3 text-sm">
                    {resultText(result, playerById, teamById)}
                  </div>
                ))}
              {session.results.length === 0 && (
                <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3 text-sm text-[#E8E8D8]/70">
                  No lots resolved yet.
                </div>
              )}
            </div>
          </section>
        )}

        {session && (
          <DraftRosterBoard
            tier="mlb"
            entries={rosterBoardEntries}
            target={MLB_BOARD_TARGET}
            payroll={rosterBoardPayroll}
            walletRemaining={rosterBoardTeamState?.budgetRemaining ?? null}
          />
        )}
      </div>
    </div>
  );
}
