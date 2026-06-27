import { useEffect, useMemo, useState } from "react";
import { useFranchiseDataContext } from "@/app/pages/FranchiseHome";
import type { LeagueStandings, StandingEntry } from "@/hooks/useFranchiseData";
import type { MojoState, Player, Team } from "../../../utils/leagueBuilderStorage";
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
  saveFranchisePlayer,
  saveFranchiseTeam,
} from "../../../utils/franchisePlayerStorage";
import { optimalLineupField } from "../../../utils/optimalLineup";
import type { OpposingPitcherHand } from "../../../types/managerWpa";
import { resolveFranchiseNextGameOptimalLineup } from "../utils/franchiseNextGameLineup";
import {
  applyFranchiseTeamUpdateWithStaleOptimalSnapshots,
  getFranchisePlayerName,
  isActiveFranchisePlayerForTeam,
  lineupSlotsFromOptimalSnapshot,
  normalizeFranchiseLineupSlots,
  toOptimalCandidate,
} from "../utils/franchiseLineupDomain";
import { buildPregameBenchmarkRows } from "../utils/pregameLineupBenchmarks";
import { FranchiseLineupRotationEditor } from "./FranchiseLineupRotationEditor";
import { PregameBenchmarkChecklist } from "./PregameBenchmarkChecklist";

const MOJO_STATES: MojoState[] = ["On Fire", "Hot", "Normal", "Cold", "Ice Cold"];

/** Flatten the divisional standings into a single team list (for opponent games-played). */
function flattenStandings(standings: LeagueStandings): StandingEntry[] {
  const out: StandingEntry[] = [];
  for (const division of [standings.Eastern, standings.Western]) {
    for (const entries of Object.values(division ?? {})) {
      out.push(...entries);
    }
  }
  return out;
}

/**
 * LineupsTabContent — the franchise Lineups tab (Step 5b).
 *
 * Reads the active club's NEXT game, resolves the opponent's NEXT starting pitcher (rotation-aware,
 * full profile) and optimizes the lineup against THAT specific pitcher via the engine seam
 * (resolveFranchiseNextGameOptimalLineup). Surfaces the optimal-lineup advisor (accept), the shared
 * manual lineup + rotation editor (adjust), a mojo editor, and a readiness checklist.
 *
 * The optimal lineup is a SCOUT-DRIVEN ADVISOR — it is never wired into the manager-WPA track.
 *
 * Data note: franchiseData.nextGame.awayTeam / .homeTeam carry team IDs (not display names) — they
 * are assigned from the scheduled game's awayTeamId / homeTeamId. The opponent's games-played is read
 * from the standings (wins + losses), which drives the opponent's rotation slot inside the seam.
 */
export function LineupsTabContent() {
  const franchiseData = useFranchiseDataContext();
  const franchiseId = franchiseData.franchiseConfig?.franchiseId;
  const leagueId = franchiseData.franchiseConfig?.league ?? undefined;
  const activeTeamId = franchiseData.lensTeamId;
  const nextGame = franchiseData.nextGame;
  const standings = franchiseData.standings;
  const teamNameMap = franchiseData.teamNameMap ?? {};

  // Franchise mode is sealed no-DH at config level (franchiseInitializer forces season.useDH=false),
  // so the lineup UI never offers a DH toggle.
  const useDH = false;

  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [franchiseTeam, setFranchiseTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    if (!franchiseId || !activeTeamId) {
      setAllTeams([]);
      setAllPlayers([]);
      setFranchiseTeam(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const [teams, players] = await Promise.all([
          getAllFranchiseTeams(franchiseId),
          getAllFranchisePlayers(franchiseId),
        ]);
        if (cancelled) return;
        setAllTeams(teams);
        setAllPlayers(players);
        setFranchiseTeam(teams.find((team) => team.id === activeTeamId) ?? null);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load lineup data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [franchiseId, activeTeamId]);

  const rosterPlayers = useMemo(
    () =>
      activeTeamId
        ? allPlayers.filter((player) => isActiveFranchisePlayerForTeam(player, activeTeamId, leagueId))
        : [],
    [allPlayers, activeTeamId, leagueId],
  );

  const opponentTeamId = useMemo(() => {
    if (!nextGame || !activeTeamId) return null;
    if (nextGame.awayTeam === activeTeamId) return nextGame.homeTeam;
    if (nextGame.homeTeam === activeTeamId) return nextGame.awayTeam;
    // franchiseData.nextGame is the franchise's next scheduled game, NOT filtered to the
    // controlled team (getNextFranchiseGame is called without a teamFilter). If the active club
    // isn't in it, there's no opponent to optimize against — fall back to the empty state.
    return null;
  }, [nextGame, activeTeamId]);

  const opponentGamesPlayed = useMemo(() => {
    if (!opponentTeamId) return 0;
    const entry = flattenStandings(standings).find((row) => row.teamId === opponentTeamId);
    return entry ? entry.wins + entry.losses : 0;
  }, [standings, opponentTeamId]);

  const seamResult = useMemo(() => {
    if (!activeTeamId || !opponentTeamId || rosterPlayers.length === 0) return null;
    try {
      return resolveFranchiseNextGameOptimalLineup({
        activeTeamId,
        roster: rosterPlayers.map(toOptimalCandidate),
        teams: allTeams,
        allPlayers,
        opponentTeamId,
        opponentGamesPlayed,
        dhEnabled: useDH,
      });
    } catch {
      return null;
    }
  }, [activeTeamId, opponentTeamId, rosterPlayers, allTeams, allPlayers, opponentGamesPlayed, useDH]);

  const activeTeamName = activeTeamId ? teamNameMap[activeTeamId] ?? "Your team" : "Your team";
  const opponentTeamName = opponentTeamId ? teamNameMap[opponentTeamId] ?? opponentTeamId : null;

  const optimalSlots = useMemo(() => {
    if (!seamResult) return [];
    return seamResult.snapshot.slots.slice().sort((a, b) => a.battingOrderSlot - b.battingOrderSlot);
  }, [seamResult]);

  const benchmarkRows = useMemo(() => {
    if (!franchiseTeam || !seamResult) return [];
    const hand = seamResult.opponentStarter.throws as OpposingPitcherHand;
    const field = optimalLineupField(hand, useDH);
    return buildPregameBenchmarkRows([
      {
        teamName: activeTeamName,
        opposingPitcherHand: hand,
        dhEnabled: useDH,
        snapshot: franchiseTeam[field],
      },
    ]);
  }, [franchiseTeam, seamResult, useDH, activeTeamName]);

  const lineupMojoPlayers = useMemo(() => {
    const byId = new Map(rosterPlayers.map((player) => [player.id, player]));
    return optimalSlots
      .map((slot) => byId.get(slot.playerId))
      .filter((player): player is Player => Boolean(player));
  }, [optimalSlots, rosterPlayers]);

  const handleAcceptOptimal = async () => {
    if (!franchiseId || !franchiseTeam || !seamResult) return;
    setIsApplying(true);
    setApplyMessage(null);
    setApplyError(null);
    try {
      const lineup = normalizeFranchiseLineupSlots(
        rosterPlayers,
        lineupSlotsFromOptimalSnapshot(seamResult.snapshot),
        useDH,
      );
      const update: Partial<Team> = {
        [useDH ? "lineupWithDH" : "lineupWithoutDH"]: lineup,
      };
      const nextTeam = applyFranchiseTeamUpdateWithStaleOptimalSnapshots(franchiseTeam, update);
      const savedTeam = await saveFranchiseTeam(franchiseId, nextTeam);
      setFranchiseTeam(savedTeam);
      setApplyMessage("Optimal lineup applied. Fine-tune below, or launch when ready.");
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Failed to apply the optimal lineup.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleMojoChange = async (player: Player, mojo: MojoState) => {
    if (!franchiseId) return;
    const updated: Player = { ...player, mojo };
    setAllPlayers((prev) => prev.map((existing) => (existing.id === player.id ? updated : existing)));
    try {
      await saveFranchisePlayer(franchiseId, updated);
    } catch {
      // Revert the optimistic update on failure.
      setAllPlayers((prev) => prev.map((existing) => (existing.id === player.id ? player : existing)));
    }
  };

  if (!activeTeamId) {
    return (
      <div className="bg-[var(--franchise-header)] border-[5px] border-[var(--franchise-border)] p-6">
        <h2 className="text-[14px] text-[var(--franchise-text)] mb-2">Lineups</h2>
        <p className="text-[11px] text-[var(--franchise-text)]/70">
          No controlled team is set for this franchise yet.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-[var(--franchise-header)] border-[5px] border-[var(--franchise-border)] p-6 flex items-center justify-center min-h-[200px]">
        <div className="text-[var(--franchise-text)] text-xl">Loading lineup data...</div>
      </div>
    );
  }

  const starter = seamResult?.opponentStarter ?? null;
  const handLabel = starter ? (starter.throws === "L" ? "LHP" : "RHP") : null;
  const starterTraits = starter
    ? (starter.traits ?? [starter.trait1, starter.trait2]).filter((t): t is string => Boolean(t))
    : [];

  return (
    <div className="space-y-4">
      {/* ---- Next game header ---- */}
      <div className="bg-[var(--franchise-header)] border-[5px] border-[var(--franchise-border)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] text-[var(--franchise-gold)]">NEXT GAME LINEUP</div>
            <div className="mt-1 text-[12px] text-[var(--franchise-text)]">
              {nextGame
                ? `${activeTeamName} vs ${opponentTeamName ?? "opponent"} — Game ${nextGame.gameNumber}`
                : "No upcoming game scheduled."}
            </div>
            <div className="mt-1 text-[8px] text-[var(--franchise-text)]/60">
              Optimal lineup is built against the opponent's next starting pitcher's full profile.
            </div>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="border-2 border-[var(--franchise-loss)]/50 bg-[var(--franchise-border)] p-2 text-[9px] text-[var(--franchise-loss-text)]">
          {loadError}
        </div>
      )}

      {/* ---- Opponent starter + optimal lineup ---- */}
      <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)]">
        {/* Opponent starting pitcher */}
        <div className="border-[4px] border-[var(--franchise-border)] bg-[var(--franchise-panel)] p-3">
          <div className="text-[10px] text-[var(--franchise-gold)] mb-2">OPPONENT'S NEXT STARTER</div>
          {starter ? (
            <div className="space-y-1 text-[9px] text-[var(--franchise-text)]">
              <div className="text-[12px]">{starter.pitcherName}</div>
              <div className="text-[var(--franchise-text)]/70">
                Throws {handLabel}
                {starter.pitcherRole ? ` • ${starter.pitcherRole}` : ""}
              </div>
              <div className="text-[var(--franchise-text)]/70">
                VEL {starter.velocity ?? "—"} · JNK {starter.junk ?? "—"} · ACC {starter.accuracy ?? "—"}
              </div>
              {starter.arsenal && starter.arsenal.length > 0 && (
                <div className="text-[var(--franchise-text)]/60">Arsenal: {starter.arsenal.join(", ")}</div>
              )}
              {starterTraits.length > 0 && (
                <div className="text-[var(--franchise-text)]/60">Traits: {starterTraits.join(", ")}</div>
              )}
            </div>
          ) : (
            <div className="text-[9px] text-[var(--franchise-text)]/60">
              {!nextGame
                ? "No upcoming game — nothing to optimize against yet."
                : "Couldn't resolve the opponent's next starter (no rotation set, or pitcher record unavailable). Set the opponent's rotation to enable matchup optimization."}
            </div>
          )}
        </div>

        {/* Optimal lineup vs that starter */}
        <div className="border-[4px] border-[var(--franchise-border)] bg-[var(--franchise-panel)] p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[10px] text-[var(--franchise-gold)]">
                OPTIMAL LINEUP {handLabel ? `vs ${handLabel}` : ""}
              </div>
              {seamResult && (
                <div className="mt-1 text-[8px] text-[var(--franchise-text)]/60">
                  Projected team WPA: {seamResult.snapshot.projectedTeamLineupKblWpa.toFixed(3)}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => void handleAcceptOptimal()}
              disabled={!seamResult || !franchiseTeam || isApplying || optimalSlots.length === 0}
              className="border-2 border-[var(--franchise-text)] bg-[var(--franchise-border)] px-3 py-1 text-[8px] font-bold text-[var(--franchise-text)] hover:border-[var(--franchise-gold)] disabled:opacity-40"
            >
              {isApplying ? "APPLYING..." : "ACCEPT OPTIMAL"}
            </button>
          </div>

          {applyError && (
            <div className="mb-2 border-2 border-[var(--franchise-loss)]/50 bg-[var(--franchise-border)] p-2 text-[8px] text-[var(--franchise-loss-text)]">
              {applyError}
            </div>
          )}
          {applyMessage && (
            <div className="mb-2 border-2 border-[var(--franchise-text)]/30 bg-[var(--franchise-border)] p-2 text-[8px] text-[var(--franchise-text)]">
              {applyMessage}
            </div>
          )}

          {optimalSlots.length === 0 ? (
            <div className="text-[9px] text-[var(--franchise-text)]/60">
              {rosterPlayers.length === 0
                ? "No MLB-active position players found for your team."
                : "No optimal lineup available — set the opponent's next starter."}
            </div>
          ) : (
            <div className="space-y-1">
              {optimalSlots.map((slot) => (
                <div
                  key={`${slot.battingOrderSlot}-${slot.playerId}`}
                  className="grid grid-cols-[28px_minmax(120px,1fr)_44px_64px] items-center gap-2 text-[9px] text-[var(--franchise-text)]"
                >
                  <div className="text-[var(--franchise-text)]/70">#{slot.battingOrderSlot}</div>
                  <div>{slot.playerName}</div>
                  <div className="text-[var(--franchise-gold-soft)]">{slot.defensivePosition}</div>
                  <div className="text-right text-[var(--franchise-text)]/70">{slot.projectedSlotKblWpa.toFixed(3)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---- Readiness ---- */}
      {benchmarkRows.length > 0 && (
        <PregameBenchmarkChecklist rows={benchmarkRows} />
      )}

      {/* ---- Mojo editor for the optimal lineup ---- */}
      {lineupMojoPlayers.length > 0 && (
        <div className="border-[4px] border-[var(--franchise-border)] bg-[var(--franchise-panel)] p-3">
          <div className="text-[10px] text-[var(--franchise-gold)] mb-1">LINEUP MOJO</div>
          <div className="mb-2 text-[8px] text-[var(--franchise-text)]/60">
            Mojo feeds the matchup optimizer. (Fitness is assumed FIT in franchise play.)
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {lineupMojoPlayers.map((player) => (
              <div key={player.id} className="grid grid-cols-[minmax(110px,1fr)_110px] items-center gap-2 text-[9px]">
                <div className="text-[var(--franchise-text)]">{getFranchisePlayerName(player)}</div>
                <select
                  aria-label={`${getFranchisePlayerName(player)} mojo`}
                  value={player.mojo}
                  onChange={(event) => void handleMojoChange(player, event.target.value as MojoState)}
                  className="border-2 border-[var(--franchise-panel-dark)] bg-[var(--franchise-panel)] p-1 text-[var(--franchise-text)]"
                >
                  {MOJO_STATES.map((mojo) => (
                    <option key={mojo} value={mojo}>
                      {mojo}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Manual adjust: shared lineup + rotation editor ---- */}
      <FranchiseLineupRotationEditor
        franchiseId={franchiseId}
        franchiseTeam={franchiseTeam}
        setFranchiseTeam={setFranchiseTeam}
        franchiseRosterPlayers={rosterPlayers}
      />
    </div>
  );
}
