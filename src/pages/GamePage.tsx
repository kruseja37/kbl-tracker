import { useNavigate } from 'react-router-dom';
import GameTracker from '../components/GameTracker';
import { useDataIntegrity } from '../hooks/useDataIntegrity';
import { getOrCreateSeason } from '../utils/seasonStorage';
import { useEffect, useState, useCallback } from 'react';

export default function GamePage() {
  const navigate = useNavigate();
  const dataIntegrity = useDataIntegrity();
  const [seasonReady, setSeasonReady] = useState(false);

  // Handle game end - navigate to PostGameScreen with game data
  const handleGameEnd = useCallback((data: {
    awayTeamId: string;
    homeTeamId: string;
    awayScore: number;
    homeScore: number;
    innings: number;
    isWalkoff: boolean;
    topBatters: Array<{ name: string; stats: string; teamId: string }>;
    topPitchers: Array<{ name: string; stats: string; decision: 'W' | 'L' | 'S' | 'H' | null; teamId: string }>;
    playerOfGame: { name: string; teamId: string; stats: string; fameBonus: number } | null;
  }) => {
    // Build URL params for PostGameScreen
    const params = new URLSearchParams({
      away: data.awayTeamId,
      home: data.homeTeamId,
      awayScore: data.awayScore.toString(),
      homeScore: data.homeScore.toString(),
      innings: data.innings.toString(),
      walkoff: data.isWalkoff.toString(),
      topBatters: encodeURIComponent(JSON.stringify(data.topBatters)),
      topPitchers: encodeURIComponent(JSON.stringify(data.topPitchers)),
    });

    if (data.playerOfGame) {
      params.set('pog', encodeURIComponent(JSON.stringify(data.playerOfGame)));
    }

    navigate(`/postgame?${params.toString()}`);
  }, [navigate]);

  useEffect(() => {
    async function ensureSeason() {
      try {
        await getOrCreateSeason(
          'season-2026',
          1,
          '2026 Season',
          48
        );
        setSeasonReady(true);
      } catch (err) {
        console.error('[GamePage] Failed to initialize season:', err);
        setSeasonReady(true);
      }
    }
    ensureSeason();
  }, []);

  useEffect(() => {
    if (dataIntegrity.status.checked && dataIntegrity.status.needsAggregation > 0) {
      dataIntegrity.recoverUnaggregatedGames();
    }
  }, [dataIntegrity.status.checked, dataIntegrity.status.needsAggregation, dataIntegrity.recoverUnaggregatedGames]);

  if (!seasonReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">&#9918;</div>
          <div className="text-gray-400">Initializing season...</div>
        </div>
      </div>
    );
  }

  if (dataIntegrity.isRecovering) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <div className="bg-amber-500 text-black px-4 py-3 flex items-center justify-center gap-3">
          <span className="text-xl">&#128260;</span>
          <div>
            <strong>Recovering game data...</strong>
            <span className="ml-2">
              ({dataIntegrity.recoveryProgress.current} / {dataIntegrity.recoveryProgress.total})
            </span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-5xl mb-4">&#9918;</div>
            <div className="text-lg mb-2">Recovering Game Data</div>
            <div className="text-gray-400">
              Processing game {dataIntegrity.recoveryProgress.current} of {dataIntegrity.recoveryProgress.total}...
            </div>
          </div>
        </div>
      </div>
    );
  }

  const showErrorBanner = dataIntegrity.status.checked && dataIntegrity.status.hasErrors > 0;
  const showIncompleteWarning = dataIntegrity.status.checked && dataIntegrity.status.incompleteGames > 0;

  return (
    <div className="min-h-screen bg-slate-900">
      {showErrorBanner && (
        <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm">
          <span>&#9888;&#65039;</span>
          <span>
            {dataIntegrity.status.hasErrors} game(s) had aggregation errors. Stats may be incomplete.
          </span>
          <button
            onClick={() => dataIntegrity.recoverUnaggregatedGames()}
            className="ml-3 px-3 py-1 bg-white text-red-500 rounded font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {showIncompleteWarning && !showErrorBanner && (
        <div className="bg-blue-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm">
          <span>&#8505;&#65039;</span>
          <span>
            {dataIntegrity.status.incompleteGames} incomplete game(s) found. Resume or finish these games to preserve data.
          </span>
        </div>
      )}

      <GameTracker onGameEnd={handleGameEnd} />
    </div>
  );
}
