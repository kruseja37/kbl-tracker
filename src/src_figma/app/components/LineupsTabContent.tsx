import { useMemo } from "react";
import { useFranchiseDataContext } from "@/app/pages/FranchiseHomeContext";
import type { LeagueStandings, StandingEntry } from "@/hooks/useFranchiseData";
import type { MojoState, Player } from "../../../utils/leagueBuilderStorage";
import { optimalLineupField } from "../../../utils/optimalLineup";
import type { OpposingPitcherHand } from "../../../types/managerWpa";
import { getFranchisePlayerName } from "../utils/franchiseLineupDomain";
import { buildPregameBenchmarkRows } from "../utils/pregameLineupBenchmarks";
import { useFranchiseNextGameLineupAdvisor } from "../hooks/useFranchiseNextGameLineupAdvisor";
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
 * LineupsTabContent — the legacy (FranchiseHome) presentation of the franchise Lineups tab (Step 5b).
 * Resolves the opponent from franchiseData.nextGame + standings, then leans on the shared advisor +
 * editor hooks (also used by the Fenway hub). The optimal lineup is a SCOUT ADVISOR, not an mWAR input.
 *
 * Data note: franchiseData.nextGame.awayTeam / .homeTeam carry team IDs (not display names), assigned
 * from the scheduled game's awayTeamId / homeTeamId; getNextFranchiseGame is unfiltered, so the next
 * game may not involve the controlled team (hence the null fallback below).
 */
export function LineupsTabContent() {
  const franchiseData = useFranchiseDataContext();
  const franchiseId = franchiseData.franchiseConfig?.franchiseId;
  const leagueId = franchiseData.franchiseConfig?.league ?? undefined;
  const activeTeamId = franchiseData.lensTeamId;
  const nextGame = franchiseData.nextGame;
  const standings = franchiseData.standings;
  const teamNameMap = franchiseData.teamNameMap ?? {};

  const opponentTeamId = useMemo(() => {
    if (!nextGame || !activeTeamId) return null;
    if (nextGame.awayTeam === activeTeamId) return nextGame.homeTeam;
    if (nextGame.homeTeam === activeTeamId) return nextGame.awayTeam;
    return null;
  }, [nextGame, activeTeamId]);

  const opponentGamesPlayed = useMemo(() => {
    if (!opponentTeamId) return 0;
    const entry = flattenStandings(standings).find((row) => row.teamId === opponentTeamId);
    return entry ? entry.wins + entry.losses : 0;
  }, [standings, opponentTeamId]);

  const {
    loading,
    loadError,
    franchiseTeam,
    setFranchiseTeam,
    rosterPlayers,
    seamResult,
    optimalSlots,
    lineupMojoPlayers,
    isApplying,
    applyMessage,
    applyError,
    handleAcceptOptimal,
    handleMojoChange,
  } = useFranchiseNextGameLineupAdvisor({
    franchiseId,
    leagueId,
    activeTeamId,
    opponentTeamId,
    opponentGamesPlayed,
  });

  const activeTeamName = activeTeamId ? teamNameMap[activeTeamId] ?? "Your team" : "Your team";
  const opponentTeamName = opponentTeamId ? teamNameMap[opponentTeamId] ?? opponentTeamId : null;

  const benchmarkRows = useMemo(() => {
    if (!franchiseTeam || !seamResult) return [];
    const hand = seamResult.opponentStarter.throws as OpposingPitcherHand;
    const field = optimalLineupField(hand, false);
    return buildPregameBenchmarkRows([
      {
        teamName: activeTeamName,
        opposingPitcherHand: hand,
        dhEnabled: false,
        snapshot: franchiseTeam[field],
      },
    ]);
  }, [franchiseTeam, seamResult, activeTeamName]);

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
            {lineupMojoPlayers.map((player: Player) => (
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
