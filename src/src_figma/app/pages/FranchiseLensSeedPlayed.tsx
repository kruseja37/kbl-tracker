/**
 * FranchiseLensSeedPlayed — DEV/TEST-ONLY harness that seeds a demo franchise AND PLAYS A SEASON
 * through the REAL game-completion pipeline (with the living-season Phase-2 flags ON), so the lens's
 * stat + soul surfaces populate for review: standings, season stats / WAR / leaders, schedule results,
 * player morale, true-value drift, ratings/trait checkpoints, fame, relationships.
 *
 * Uses a local browser-safe synthetic-game generator (real franchise player IDs + per-season form
 * trends) and runs each game via createGameHeader → processCompletedGame → completeGame.
 *
 * Flags are toggled in this browser JS context only (module-scope state in franchisePhase2Flags) —
 * your real app on a different origin/port is untouched. Gated dev/test only.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { seedDemoFranchise, LENS_DEMO_TEAMS } from "../utils/franchiseLensDemoSeed";
import {
  buildSyntheticFranchiseGame,
  type LensTeamSide,
} from "../utils/franchiseLensSyntheticGame";
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
} from "../../../utils/franchisePlayerStorage";
import { getFranchiseSeasonId } from "../../../utils/franchisePersistenceContract";
import { saveSeasonMetadata } from "../../../utils/seasonStorage";
import { addGame, completeGame, type ScheduledGame } from "../../../utils/scheduleStorage";
import { createGameHeader } from "../../../utils/eventLog";
import { processCompletedGame } from "../../../utils/processCompletedGame";
import { CHECKPOINT_CADENCE_DEFAULT } from "../../../data/rosterEngineConstants";
import type { Player, Team } from "../../../utils/leagueBuilderStorage";
import {
  setFranchisePhase2MoraleEnabledForTests,
  setFranchisePhase2FameEnabledForTests,
  setFranchisePhase2FlashpointEnabledForTests,
  setFranchisePhase2CheckpointEnabledForTests,
  setFranchisePhase2TraitsEnabledForTests,
  setFranchisePhase2L10EnabledForTests,
  setFranchisePhase2L11EnabledForTests,
  setFranchisePhase2L12EnabledForTests,
  setFranchisePhase2L13EnabledForTests,
  setFranchisePhase2L14EnabledForTests,
} from "../../../utils/franchisePhase2Flags";

const PITCHER_POSITIONS = new Set(["SP", "RP", "CP", "SP/RP", "P"]);

function enableLivingSeasonFlags(): void {
  setFranchisePhase2MoraleEnabledForTests(true);
  setFranchisePhase2FameEnabledForTests(true);
  setFranchisePhase2FlashpointEnabledForTests(true);
  setFranchisePhase2CheckpointEnabledForTests(true);
  setFranchisePhase2TraitsEnabledForTests(true);
  setFranchisePhase2L10EnabledForTests(true);
  setFranchisePhase2L11EnabledForTests(true);
  setFranchisePhase2L12EnabledForTests(true);
  setFranchisePhase2L13EnabledForTests(true);
  setFranchisePhase2L14EnabledForTests(true);
}

function buildSide(team: Team, allPlayers: Player[]): LensTeamSide {
  const mlb = allPlayers.filter((player) =>
    player.leagueAssignments?.some((a) => a.teamId === team.id && a.rosterStatus === "MLB"),
  );
  return {
    team,
    positionPlayers: mlb.filter((p) => !PITCHER_POSITIONS.has(p.primaryPosition as string)),
    pitchers: mlb.filter((p) => PITCHER_POSITIONS.has(p.primaryPosition as string)),
  };
}

function roundRobinPairings(teamIds: string[]): Array<[string, string]> {
  const pairings: Array<[string, string]> = [];
  for (let i = 0; i < teamIds.length; i += 1) {
    for (let j = i + 1; j < teamIds.length; j += 1) {
      pairings.push([teamIds[i], teamIds[j]]);
    }
  }
  return pairings;
}

export function FranchiseLensSeedPlayed() {
  const [status, setStatus] = useState("starting…");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [franchiseId, setFranchiseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    // Run once. We intentionally do NOT abort on StrictMode's fake unmount — the season seed must
    // complete (a cancel-on-cleanup flag would kill the only run under StrictMode double-invoke).
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const cycles = Math.max(1, Math.min(6, Number(params.get("cycles") ?? "2") || 2));
        const pairings = roundRobinPairings(LENS_DEMO_TEAMS.map((t) => t.id));
        const totalGames = pairings.length * cycles;
        const gamesPerTeam = (LENS_DEMO_TEAMS.length - 1) * cycles;
        setTotal(totalGames);

        setStatus("seeding league + franchise…");
        const seeded = await seedDemoFranchise(gamesPerTeam);
        const fid = seeded.franchiseId;
        const seasonId = getFranchiseSeasonId(fid, seeded.seasonNumber);

        const [teams, players] = await Promise.all([
          getAllFranchiseTeams(fid),
          getAllFranchisePlayers(fid),
        ]);
        const sideByTeam = new Map<string, LensTeamSide>(
          teams.map((team) => [team.id, buildSide(team, players)]),
        );

        await saveSeasonMetadata({
          seasonId,
          seasonNumber: seeded.seasonNumber,
          seasonName: "Lens Demo Season 1",
          status: "active",
          startDate: Date.parse("2026-04-01T00:00:00.000Z"),
          gamesPlayed: 0,
          totalGames,
          gamesPerTeam,
          checkpointCadence: CHECKPOINT_CADENCE_DEFAULT,
        });

        setStatus("building schedule…");
        const scheduleByGameNumber = new Map<number, ScheduledGame>();
        for (let i = 0; i < totalGames; i += 1) {
          const gameNumber = i + 1;
          const pairing = pairings[i % pairings.length];
          const cycle = Math.floor(i / pairings.length);
          const [home, away] = cycle % 2 === 0 ? [pairing[0], pairing[1]] : [pairing[1], pairing[0]];
          const row = await addGame({
            franchiseId: fid,
            seasonId,
            statsScopeId: seasonId,
            seasonNumber: seeded.seasonNumber,
            gameNumber,
            dayNumber: gameNumber,
            date: `Day ${gameNumber}`,
            awayTeamId: away,
            homeTeamId: home,
            source: "manual",
          });
          scheduleByGameNumber.set(gameNumber, row);
        }

        // Living-season flags ON only for game processing (in this browser context). Enabling them
        // before franchise init makes initializeFranchise pathologically slow.
        enableLivingSeasonFlags();
        const processOptions = { seasonId, gamesPerTeam, seasonTotalGames: totalGames };

        for (let gameNumber = 1; gameNumber <= totalGames; gameNumber += 1) {
          const row = scheduleByGameNumber.get(gameNumber)!;
          const home = sideByTeam.get(row.homeTeamId)!;
          const away = sideByTeam.get(row.awayTeamId)!;
          const synthetic = buildSyntheticFranchiseGame({
            gameNumber,
            franchiseId: fid,
            leagueId: seeded.leagueId,
            seasonId,
            seasonNumber: seeded.seasonNumber,
            scheduleGameId: row.id,
            home,
            away,
          });
          const game = synthetic.gameState;
          const awayStarter = game.pitcherGameStats.find((r) => r.teamId === game.awayTeamId && r.isStarter)!;
          const homeStarter = game.pitcherGameStats.find((r) => r.teamId === game.homeTeamId && r.isStarter)!;

          await createGameHeader({
            gameId: game.gameId,
            seasonId,
            statsScopeId: seasonId,
            competitionType: "franchise",
            competitionId: fid,
            competitionName: "Lens Demo",
            franchiseId: fid,
            leagueId: seeded.leagueId,
            scheduleGameId: row.id,
            date: game.savedAt,
            awayTeamId: game.awayTeamId,
            awayTeamName: game.awayTeamName,
            homeTeamId: game.homeTeamId,
            homeTeamName: game.homeTeamName,
            stadiumName: game.stadiumName ?? null,
            startingLineups: {
              away: (game.awayLineupState?.lineup ?? []).map((e) => ({
                playerId: e.playerId,
                playerName: e.playerName,
                position: e.position,
                battingOrder: e.battingOrder,
              })),
              home: (game.homeLineupState?.lineup ?? []).map((e) => ({
                playerId: e.playerId,
                playerName: e.playerName,
                position: e.position,
                battingOrder: e.battingOrder,
              })),
            },
            benchRosters: {
              away: game.awayLineupState?.bench ?? [],
              home: game.homeLineupState?.bench ?? [],
            },
            startingPitchers: {
              away: { playerId: awayStarter.pitcherId, playerName: awayStarter.pitcherName },
              home: { playerId: homeStarter.pitcherId, playerName: homeStarter.pitcherName },
            },
            finalScore: synthetic.finalScore,
            finalInning: 9,
            totalInnings: 9,
            useGhostRunner: false,
            extraInningRunner: false,
            extraInningRunnerDelay: 2,
            isComplete: true,
          });

          await processCompletedGame(game, processOptions, seeded.leagueId, synthetic.archiveOptions);

          const homeWon = game.homeScore > game.awayScore;
          await completeGame(row.id, {
            awayScore: game.awayScore,
            homeScore: game.homeScore,
            winningTeamId: homeWon ? game.homeTeamId : game.awayTeamId,
            losingTeamId: homeWon ? game.awayTeamId : game.homeTeamId,
            gameLogId: game.gameId,
          });

          setProgress(gameNumber);
          setStatus(`playing season… ${gameNumber}/${totalGames}`);
        }

        setFranchiseId(fid);
        setStatus("ready");
      } catch (caught) {
        setError(caught instanceof Error ? `${caught.message}\n${caught.stack ?? ""}` : String(caught));
        setStatus("error");
      }
    })();

  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#3F563F", color: "#E8E8D8", padding: 24, fontFamily: "monospace" }}>
      <h1 style={{ fontSize: 16 }}>Franchise Lens — PLAYED season seed (dev only)</h1>
      <div data-testid="seed-status" style={{ marginTop: 12 }}>
        Status: {status}
      </div>
      {total > 0 ? (
        <div style={{ marginTop: 8 }}>
          Games: {progress} / {total}
        </div>
      ) : null}
      {error ? (
        <pre data-testid="seed-error" style={{ marginTop: 12, color: "#FFB4A8", whiteSpace: "pre-wrap" }}>
          {error}
        </pre>
      ) : null}
      {franchiseId ? (
        <div style={{ marginTop: 16 }}>
          <div>
            Seeded + played franchiseId:{" "}
            <strong data-testid="seeded-franchise-id">{franchiseId}</strong>
          </div>
          <Link
            data-testid="seeded-franchise-link"
            to={`/__preview/franchise-lens/${franchiseId}`}
            style={{ display: "inline-block", marginTop: 12, color: "#FFEFB5" }}
          >
            → open the real-data lens (now populated)
          </Link>
        </div>
      ) : null}
    </main>
  );
}

export default FranchiseLensSeedPlayed;
