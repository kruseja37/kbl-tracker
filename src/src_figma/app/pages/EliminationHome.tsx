import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Award,
  BarChart3,
  GitBranch,
  Loader2,
  Trophy,
  Users,
} from 'lucide-react';
import {
  getElimination,
  updateElimination,
  type EliminationMetadata,
} from '../../../utils/eliminationManager';
import {
  getAllPlayoffs,
  getSeriesByPlayoff,
  getPlayoffLeaders,
  getRoundName,
  type PlayoffConfig,
  type PlayoffSeries,
  type PlayoffPlayerStats,
} from '../../../utils/playoffStorage';
import { computeEliminationAwards, type EliminationAward } from '../../../utils/eliminationAwards';
import { EliminationTeamHub } from '../components/EliminationTeamHub';

type EliminationTab = 'bracket' | 'teamhub' | 'leaders' | 'awards' | 'history';

type HistoryEntry = {
  playoff: PlayoffConfig;
  series: PlayoffSeries[];
  championName: string;
  runnerUpName: string;
  finalResult: string;
};

type SeriesCardState = {
  gameId: string;
  nextGameNumber: number;
  homeTeam: { teamId: string; teamName: string; seed: number };
  awayTeam: { teamId: string; teamName: string; seed: number };
};

const tabs: Array<{ id: EliminationTab; label: string; icon: ReactNode }> = [
  { id: 'bracket', label: 'BRACKET', icon: <GitBranch className="w-4 h-4" /> },
  { id: 'teamhub', label: 'TEAM HUB', icon: <Users className="w-4 h-4" /> },
  { id: 'leaders', label: 'LEADERS', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'awards', label: 'AWARDS', icon: <Award className="w-4 h-4" /> },
  { id: 'history', label: 'HISTORY', icon: <Trophy className="w-4 h-4" /> },
];

function buildSeriesCardState(eliminationId: string, series: PlayoffSeries): SeriesCardState {
  const nextGameNumber = series.higherSeedWins + series.lowerSeedWins + 1;
  const higherSeedHome = nextGameNumber % 2 === 1;
  const homeTeam = higherSeedHome ? series.higherSeed : series.lowerSeed;
  const awayTeam = higherSeedHome ? series.lowerSeed : series.higherSeed;

  return {
    gameId: `elim-${eliminationId}-${series.id}-g${nextGameNumber}`,
    nextGameNumber,
    homeTeam,
    awayTeam,
  };
}

function formatSeriesScore(series: PlayoffSeries): string {
  return `${series.higherSeedWins}-${series.lowerSeedWins}`;
}

function getWinnerName(series: PlayoffSeries): string {
  if (series.winner === series.higherSeed.teamId) return series.higherSeed.teamName;
  if (series.winner === series.lowerSeed.teamId) return series.lowerSeed.teamName;
  return 'Winner TBD';
}

function getRunnerUpName(playoff: PlayoffConfig, series: PlayoffSeries[]): string {
  const finalRound = Math.max(...series.map((item) => item.round), 0);
  const finalSeries = series.find((item) => item.round === finalRound && item.status === 'COMPLETED');

  if (!finalSeries?.winner) return 'Runner-up TBD';

  const loserId =
    finalSeries.winner === finalSeries.higherSeed.teamId
      ? finalSeries.lowerSeed.teamId
      : finalSeries.higherSeed.teamId;

  return playoff.teams.find((team) => team.teamId === loserId)?.teamName ?? 'Runner-up TBD';
}

function canPlaySeries(series: PlayoffSeries): boolean {
  return series.status === 'PENDING' || series.status === 'IN_PROGRESS';
}

export function EliminationHome() {
  const navigate = useNavigate();
  const { eliminationId } = useParams<{ eliminationId: string }>();
  const [activeTab, setActiveTab] = useState<EliminationTab>('bracket');
  const [metadata, setMetadata] = useState<EliminationMetadata | null>(null);
  const [playoffConfig, setPlayoffConfig] = useState<PlayoffConfig | null>(null);
  const [seriesList, setSeriesList] = useState<PlayoffSeries[]>([]);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eliminationId) {
      setError('Missing elimination bracket ID.');
      setIsLoading(false);
      return;
    }

    const currentEliminationId = eliminationId;

    let cancelled = false;

    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        const loadedMetadata = await getElimination(currentEliminationId);
        if (!loadedMetadata) {
          throw new Error(`Elimination bracket not found: ${currentEliminationId}`);
        }

        const allPlayoffs = await getAllPlayoffs();
        const loadedPlayoff =
          allPlayoffs.find(
            (playoff) =>
              playoff.sourceType === 'elimination' && playoff.eliminationId === currentEliminationId
          ) ?? null;

        if (!loadedPlayoff) {
          throw new Error(`Playoff bracket not found for elimination: ${currentEliminationId}`);
        }

        const [loadedSeries, completedEntries] = await Promise.all([
          getSeriesByPlayoff(loadedPlayoff.id),
          Promise.all(
            allPlayoffs
              .filter((playoff) => playoff.sourceType === 'elimination' && playoff.status === 'COMPLETED')
              .map(async (playoff) => {
                const playoffSeries = await getSeriesByPlayoff(playoff.id);
                const championName =
                  playoff.teams.find((team) => team.teamId === playoff.champion)?.teamName ?? 'Champion TBD';
                const finalRound = Math.max(...playoffSeries.map((item) => item.round), 0);
                const finalSeries = playoffSeries.find(
                  (item) => item.round === finalRound && item.status === 'COMPLETED'
                );

                return {
                  playoff,
                  series: playoffSeries,
                  championName,
                  runnerUpName: getRunnerUpName(playoff, playoffSeries),
                  finalResult: finalSeries
                    ? `${finalSeries.higherSeed.teamName} ${finalSeries.higherSeedWins}-${finalSeries.lowerSeedWins} ${finalSeries.lowerSeed.teamName}`
                    : 'Championship result unavailable',
                } satisfies HistoryEntry;
              })
          ),
        ]);

        await updateElimination(currentEliminationId, { lastPlayedAt: Date.now() });

        if (cancelled) return;

        setMetadata(loadedMetadata);
        setPlayoffConfig(loadedPlayoff);
        setSeriesList(loadedSeries.sort((a, b) => a.round - b.round || a.higherSeed.seed - b.higherSeed.seed));
        setHistoryEntries(
          completedEntries.sort((a, b) => (b.playoff.completedAt ?? 0) - (a.playoff.completedAt ?? 0))
        );
        setSelectedSeriesId(loadedSeries[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load elimination bracket.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [eliminationId]);

  const seriesByRound = useMemo(() => {
    const grouped = new Map<number, PlayoffSeries[]>();
    for (const series of seriesList) {
      grouped.set(series.round, [...(grouped.get(series.round) ?? []), series]);
    }
    return [...grouped.entries()].sort((a, b) => a[0] - b[0]);
  }, [seriesList]);

  const selectedSeries = useMemo(
    () => seriesList.find((series) => series.id === selectedSeriesId) ?? null,
    [seriesList, selectedSeriesId]
  );

  const handlePlayGame = (series: PlayoffSeries) => {
    if (!eliminationId || !playoffConfig) return;

    const { gameId, nextGameNumber, homeTeam, awayTeam } = buildSeriesCardState(eliminationId, series);

    navigate(`/game-tracker/${gameId}`, {
      state: {
        gameMode: 'elimination',
        eliminationId: eliminationId,
        seriesId: series.id,
        gameNumber: nextGameNumber,
        roundName: series.roundName,
        seasonId: `elimination-${eliminationId}`,
        seasonNumber: 1,
        homeTeamId: homeTeam.teamId,
        homeTeamName: homeTeam.teamName,
        awayTeamId: awayTeam.teamId,
        awayTeamName: awayTeam.teamName,
        stadiumName: homeTeam.teamName + ' Stadium',
        playoffSeriesId: series.id,
        playoffGameNumber: nextGameNumber,
        playoffId: playoffConfig.id,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#6B9462] text-[#E8E8D8] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E8E8D8]" />
      </div>
    );
  }

  if (error || !metadata || !playoffConfig) {
    return (
      <div className="min-h-screen bg-[#6B9462] text-[#E8E8D8] flex items-center justify-center p-6">
        <div className="w-full max-w-[720px] bg-[#5A8352] border-[6px] border-[#4A6844] p-8 text-center">
          <div className="text-sm mb-3">ELIMINATION BRACKET UNAVAILABLE</div>
          <div className="text-[10px] text-[#E8E8D8]/70 mb-6">{error ?? 'Bracket data missing.'}</div>
          <button
            onClick={() => navigate('/elimination/select')}
            className="px-6 py-3 bg-[#4A6844] border-4 border-[#E8E8D8] text-[#E8E8D8] hover:bg-[#3C5636] active:scale-95"
          >
            BACK TO BRACKETS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#6B9462] text-[#E8E8D8]">
      <div className="bg-[#5A8352] border-b-[6px] border-[#4A6844] px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/elimination/select')}
            className="p-2 hover:bg-[#4A6844] border-2 border-[#4A6844] transition active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-[#E8E8D8]" />
          </button>
          <div className="text-center flex-1">
            <div className="text-lg">{metadata.name || 'ELIMINATION BRACKET'}</div>
            <div className="text-[8px] text-[#E8E8D8]/70">
              {metadata.leagueName.toUpperCase()} • {metadata.teamsCount} TEAMS • ROUND {metadata.currentRound || 1}
            </div>
          </div>
          <div className="w-10 text-right text-[8px] text-[#E8E8D8]/70">{metadata.status}</div>
        </div>
      </div>

      <div className="bg-[#5A8352] border-b-4 border-[#4A6844]">
        <div className="max-w-7xl mx-auto flex flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-[8px] flex items-center gap-2 transition border-r-2 border-[#4A6844] ${
                activeTab === tab.id ? 'bg-[#4A6844] text-[#E8E8D8]' : 'text-[#E8E8D8]/60 hover:bg-[#4A6844]/60'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {activeTab === 'bracket' && (
          <BracketTab
            eliminationId={eliminationId!}
            playoffConfig={playoffConfig}
            seriesByRound={seriesByRound}
            selectedSeries={selectedSeries}
            onSelectSeries={setSelectedSeriesId}
            onPlayGame={handlePlayGame}
          />
        )}

        {activeTab === 'teamhub' && (
          <EliminationTeamHub
            eliminationId={eliminationId!}
            teams={playoffConfig.teams}
          />
        )}

        {activeTab === 'leaders' && <PlayoffLeadersContent playoffId={playoffConfig.id} />}

        {activeTab === 'awards' && (
          <EliminationAwardsContent
            playoffId={playoffConfig.id}
            isCompleted={metadata.status === 'COMPLETED'}
          />
        )}

        {activeTab === 'history' && <HistoryTab entries={historyEntries} />}
      </div>
    </div>
  );
}

function BracketTab({
  eliminationId,
  playoffConfig,
  seriesByRound,
  selectedSeries,
  onSelectSeries,
  onPlayGame,
}: {
  eliminationId: string;
  playoffConfig: PlayoffConfig;
  seriesByRound: Array<[number, PlayoffSeries[]]>;
  selectedSeries: PlayoffSeries | null;
  onSelectSeries: (seriesId: string) => void;
  onPlayGame: (series: PlayoffSeries) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-6">
        <div className="text-sm mb-2">▶ BRACKET OVERVIEW</div>
        <div className="text-[8px] text-[#E8E8D8]/70">
          {playoffConfig.teamsQualifying} TEAMS • {playoffConfig.rounds} ROUNDS • BEST OF{' '}
          {playoffConfig.gamesPerRound.join('/')}
        </div>
      </div>

      {seriesByRound.length === 0 ? (
        <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-8 text-center text-[#E8E8D8]/60 text-xs">
          No series found for this bracket yet.
        </div>
      ) : (
        seriesByRound.map(([round, roundSeries]) => (
          <div key={round} className="bg-[#5A8352] border-[6px] border-[#4A6844] p-4">
            <div className="text-sm mb-4">▶ {getRoundName(round, playoffConfig.rounds).toUpperCase()}</div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {roundSeries.map((series) => {
                const isSelected = selectedSeries?.id === series.id;
                const playable = canPlaySeries(series);
                const nextGame = buildSeriesCardState(eliminationId, series);

                return (
                  <button
                    key={series.id}
                    onClick={() => onSelectSeries(series.id)}
                    className={`text-left border-4 p-4 transition active:scale-95 ${
                      isSelected
                        ? 'bg-[#4A6844] border-[#E8E8D8]'
                        : 'bg-[#6B9462] border-[#4A6844] hover:bg-[#4A6844]/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="text-xs">#{series.higherSeed.seed} {series.higherSeed.teamName}</div>
                        <div className="text-[8px] text-[#E8E8D8]/60 mt-1">vs</div>
                        <div className="text-xs mt-1">#{series.lowerSeed.seed} {series.lowerSeed.teamName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] text-[#E8E8D8]/60">{series.status}</div>
                        <div className="text-lg">{formatSeriesScore(series)}</div>
                      </div>
                    </div>

                    {series.status === 'COMPLETED' ? (
                      <div className="flex items-center gap-2 text-[8px] text-[#E8E8D8]">
                        <Trophy className="w-4 h-4" />
                        WINNER: {getWinnerName(series).toUpperCase()}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-[8px] text-[#E8E8D8]/70">
                          NEXT GAME {nextGame.nextGameNumber} • HOME: {nextGame.homeTeam.teamName}
                        </div>
                        {playable && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              onPlayGame(series);
                            }}
                            className="px-4 py-2 bg-[#E91E63] border-4 border-[#E8E8D8] text-[#E8E8D8] text-[8px] hover:bg-[#C2185B] active:scale-95"
                          >
                            PLAY GAME
                          </button>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}

      {selectedSeries && (
        <SelectedSeriesPanel eliminationId={eliminationId} playoffConfig={playoffConfig} series={selectedSeries} onPlayGame={onPlayGame} />
      )}
    </div>
  );
}

function SelectedSeriesPanel({
  eliminationId,
  playoffConfig,
  series,
  onPlayGame,
}: {
  eliminationId: string;
  playoffConfig: PlayoffConfig;
  series: PlayoffSeries;
  onPlayGame: (series: PlayoffSeries) => void;
}) {
  const nextGame = buildSeriesCardState(eliminationId, series);

  return (
    <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-6">
      <div className="text-sm mb-3">▶ SELECTED SERIES</div>
      <div className="text-xs mb-2">
        {series.roundName} • #{series.higherSeed.seed} {series.higherSeed.teamName} vs #{series.lowerSeed.seed}{' '}
        {series.lowerSeed.teamName}
      </div>
      <div className="text-[8px] text-[#E8E8D8]/70 mb-4">
        STATUS: {series.status} • SCORE: {formatSeriesScore(series)} • BEST OF {series.bestOf} • ROUND{' '}
        {series.round}/{playoffConfig.rounds}
      </div>
      {series.status === 'COMPLETED' ? (
        <div className="flex items-center gap-2 text-[8px]">
          <Trophy className="w-4 h-4" />
          WINNER: {getWinnerName(series).toUpperCase()}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-[8px] text-[#E8E8D8]/70">
            GAME {nextGame.nextGameNumber}: {nextGame.awayTeam.teamName} at {nextGame.homeTeam.teamName}
          </div>
          {canPlaySeries(series) && (
            <button
              onClick={() => onPlayGame(series)}
              className="px-4 py-2 bg-[#E91E63] border-4 border-[#E8E8D8] text-[#E8E8D8] text-[8px] hover:bg-[#C2185B] active:scale-95"
            >
              PLAY GAME
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PlayoffLeadersContent({ playoffId }: { playoffId: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [batting, setBatting] = useState<Record<string, PlayoffPlayerStats[]>>({});
  const [pitching, setPitching] = useState<Record<string, PlayoffPlayerStats[]>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadLeaders() {
      try {
        setIsLoading(true);

        const battingStats = {
          AVG: 'avg',
          HR: 'homeRuns',
          RBI: 'rbi',
          SB: 'stolenBases',
          OPS: 'ops',
        } as const;
        const pitchingStats = {
          ERA: 'era',
          W: 'wins',
          K: 'pitchingStrikeouts',
          WHIP: 'whip',
          SV: 'saves',
        } as const;

        const [battingEntries, pitchingEntries] = await Promise.all([
          Promise.all(
            Object.entries(battingStats).map(async ([label, stat]) => [label, await getPlayoffLeaders(playoffId, stat, 5)] as const)
          ),
          Promise.all(
            Object.entries(pitchingStats).map(async ([label, stat]) => [label, await getPlayoffLeaders(playoffId, stat, 5)] as const)
          ),
        ]);

        if (cancelled) return;
        setBatting(Object.fromEntries(battingEntries));
        setPitching(Object.fromEntries(pitchingEntries));
      } catch (err) {
        if (!cancelled) {
          console.error('[EliminationHome] Failed to load leaders:', err);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadLeaders();
    return () => {
      cancelled = true;
    };
  }, [playoffId]);

  const hasData =
    Object.values(batting).some((items) => items.length > 0) || Object.values(pitching).some((items) => items.length > 0);

  if (isLoading) {
    return (
      <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E8E8D8] mx-auto mb-3" />
        <div className="text-[8px] text-[#E8E8D8]/70">LOADING PLAYOFF LEADERS...</div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-8 text-center">
        <BarChart3 className="w-10 h-10 text-[#E8E8D8]/30 mx-auto mb-3" />
        <div className="text-xs text-[#E8E8D8]/60">No playoff stats yet for this bracket.</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <LeaderPanel title="BATTING LEADERS" entries={batting} />
      <LeaderPanel title="PITCHING LEADERS" entries={pitching} />
    </div>
  );
}

function EliminationAwardsContent({
  playoffId,
  isCompleted,
}: {
  playoffId: string;
  isCompleted: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [awards, setAwards] = useState<EliminationAward[]>([]);

  useEffect(() => {
    if (!isCompleted) {
      setAwards([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAwards() {
      try {
        setIsLoading(true);
        const computedAwards = await computeEliminationAwards(playoffId);
        if (!cancelled) {
          setAwards(computedAwards);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[EliminationHome] Failed to compute awards:', err);
          setAwards([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadAwards();
    return () => {
      cancelled = true;
    };
  }, [playoffId, isCompleted]);

  if (!isCompleted) {
    return (
      <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-8 text-center py-12 text-[#E8E8D8]/60 text-xs">
        AWARDS WILL APPEAR AFTER BRACKET COMPLETES
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E8E8D8] mx-auto mb-3" />
        <div className="text-[8px] text-[#E8E8D8]/70">COMPUTING ELIMINATION AWARDS...</div>
      </div>
    );
  }

  if (awards.length === 0) {
    return (
      <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-8 text-center">
        <Award className="w-10 h-10 text-[#E8E8D8]/30 mx-auto mb-3" />
        <div className="text-xs text-[#E8E8D8]/60">No playoff stats available to compute awards yet.</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {awards.map((award) => (
        <div
          key={award.category}
          className="bg-[#5A8352] border-[6px] border-[#4A6844] p-5 shadow-[6px_6px_0_rgba(0,0,0,0.35)]"
        >
          <div className="flex items-center gap-2 mb-3 text-[#F5D06F]">
            <Award className="w-4 h-4" />
            <div className="text-[8px] uppercase tracking-[0.2em]">{award.category}</div>
          </div>
          <div className="text-sm text-[#E8E8D8] font-bold mb-1">{award.playerName}</div>
          <div className="text-[8px] text-[#E8E8D8]/70 uppercase mb-3">{award.teamId}</div>
          <div className="text-[10px] text-[#E8E8D8]/85">{award.statLine}</div>
        </div>
      ))}
    </div>
  );
}

function LeaderPanel({
  title,
  entries,
}: {
  title: string;
  entries: Record<string, PlayoffPlayerStats[]>;
}) {
  return (
    <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-4">
      <div className="text-xs text-center mb-4">{title}</div>
      <div className="space-y-3">
        {Object.entries(entries).map(([label, stats]) => (
          <div key={label} className="bg-[#4A6844] border-4 border-[#6B9462] p-3">
            <div className="text-[8px] mb-2">{label}</div>
            {stats.length === 0 ? (
              <div className="text-[8px] text-[#E8E8D8]/50">No data</div>
            ) : (
              stats.map((stat, index) => (
                <div key={`${label}-${stat.playerId}-${index}`} className="flex justify-between text-[8px] py-1 border-b border-[#6B9462] last:border-0">
                  <div>
                    {index + 1}. {stat.playerName}
                  </div>
                  <div>{formatLeaderValue(label, stat)}</div>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatLeaderValue(label: string, stat: PlayoffPlayerStats): string {
  switch (label) {
    case 'AVG':
      return stat.avg.toFixed(3);
    case 'OPS':
      return stat.ops.toFixed(3);
    case 'ERA':
      return (stat.era ?? 0).toFixed(2);
    case 'WHIP':
      return (stat.whip ?? 0).toFixed(2);
    case 'HR':
      return String(stat.homeRuns);
    case 'RBI':
      return String(stat.rbi);
    case 'SB':
      return String(stat.stolenBases);
    case 'W':
      return String(stat.wins ?? 0);
    case 'K':
      return String(stat.pitchingStrikeouts ?? 0);
    case 'SV':
      return String(stat.saves ?? 0);
    default:
      return '0';
  }
}

function HistoryTab({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-8 text-center">
        <Trophy className="w-10 h-10 text-[#E8E8D8]/30 mx-auto mb-3" />
        <div className="text-xs text-[#E8E8D8]/60">No completed elimination brackets yet.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div key={entry.playoff.id} className="bg-[#5A8352] border-[6px] border-[#4A6844] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5" />
            <div className="text-sm">{entry.playoff.seasonId.toUpperCase()}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[8px]">
            <div className="bg-[#4A6844] border-4 border-[#6B9462] p-3">
              <div className="text-[#E8E8D8]/60 mb-1">CHAMPION</div>
              <div>{entry.championName}</div>
            </div>
            <div className="bg-[#4A6844] border-4 border-[#6B9462] p-3">
              <div className="text-[#E8E8D8]/60 mb-1">RUNNER-UP</div>
              <div>{entry.runnerUpName}</div>
            </div>
            <div className="bg-[#4A6844] border-4 border-[#6B9462] p-3">
              <div className="text-[#E8E8D8]/60 mb-1">FINAL RESULT</div>
              <div>{entry.finalResult}</div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {entry.series
              .slice()
              .sort((a, b) => a.round - b.round)
              .map((series) => (
                <div key={series.id} className="bg-[#4A6844] border-4 border-[#6B9462] p-3 text-[8px]">
                  <div className="mb-1">{series.roundName.toUpperCase()}</div>
                  <div>
                    #{series.higherSeed.seed} {series.higherSeed.teamName} {series.higherSeedWins}-{series.lowerSeedWins}{' '}
                    #{series.lowerSeed.seed} {series.lowerSeed.teamName}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
