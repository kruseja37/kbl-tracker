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
import { buildEliminationGameTrackerRoster } from '../../../utils/eliminationRosterStorage';
import { getEliminationTeam } from '../../../utils/eliminationPlayerStorage';
import {
  getAllPlayoffs,
  getPlayoffByElimination,
  updatePlayoff,
  getSeriesByPlayoff,
  getPlayoffLeaders,
  getEliminationRoundName,
  type PlayoffConfig,
  type PlayoffSeries,
  type PlayoffPlayerStats,
} from '../../../utils/playoffStorage';
import { computeEliminationAwards, type EliminationAward } from '../../../utils/eliminationAwards';
import { buildClutchContext, getHomeFieldPattern } from '../../../engines/playoffEngine';
import { EliminationTeamHub } from '../components/EliminationTeamHub';
import { TeamImpactLeaderboardsPanel } from '../components/TeamImpactLeaderboardsPanel';
import { ReporterAssignmentPanel, type ReporterAssignmentPanelTeam } from '../components/ReporterAssignmentPanel';
import { resolveManagerForTeam } from '../../../utils/managerIdentityStorage';
import {
  getInstanceTeamImpactLeaderboards,
  type TeamImpactLeaderboards,
} from '../../../utils/teamImpact';
import { withPregameManagerNavigationState } from '../utils/pregameNavigationState';
import { buildPregameBenchmarkIssues } from '../utils/pregameLineupBenchmarks';

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

type FamePlayoffRound =
  | 'wild_card'
  | 'division_series'
  | 'championship_series'
  | 'world_series';

const tabs: Array<{ id: EliminationTab; label: string; icon: ReactNode }> = [
  { id: 'bracket', label: 'BRACKET', icon: <GitBranch className="w-4 h-4" /> },
  { id: 'teamhub', label: 'TEAM HUB', icon: <Users className="w-4 h-4" /> },
  { id: 'leaders', label: 'LEADERS', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'awards', label: 'AWARDS', icon: <Award className="w-4 h-4" /> },
  { id: 'history', label: 'HISTORY', icon: <Trophy className="w-4 h-4" /> },
];

function buildSeriesCardState(
  eliminationId: string,
  series: PlayoffSeries,
  selectedHomeTeamId?: string | null,
): SeriesCardState {
  const nextGameNumber = series.higherSeedWins + series.lowerSeedWins + 1;
  const homeTeamId =
    selectedHomeTeamId ||
    getHomeFieldPattern(
      nextGameNumber,
      series.bestOf,
      series.higherSeed.teamId,
      series.lowerSeed.teamId
    );
  const higherSeedHome = homeTeamId === series.higherSeed.teamId;
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

function resolveReporterToggle(
  explicitValue: boolean | undefined,
  legacyValue: boolean | undefined,
  fallback: boolean,
): boolean {
  return explicitValue ?? legacyValue ?? fallback;
}

function mapSeriesRoundToFameRound(
  round: number,
  totalRounds: number,
): FamePlayoffRound {
  if (round >= totalRounds) return 'world_series';
  if (round === totalRounds - 1) return 'championship_series';
  if (round === totalRounds - 2) return 'division_series';
  return 'wild_card';
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
  const [selectedHomeTeamId, setSelectedHomeTeamId] = useState<string | null>(null);
  // Phase 2a two-toggle model: live defaults OFF, post-game ON.
  const [liveBeatReporterEnabled, setLiveBeatReporterEnabled] = useState(false);
  const [postGameColumnsEnabled, setPostGameColumnsEnabled] = useState(true);
  const [pregameReporterTeams, setPregameReporterTeams] = useState<ReporterAssignmentPanelTeam[]>([]);
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

        const [loadedPlayoff, allPlayoffs] = await Promise.all([
          getPlayoffByElimination(currentEliminationId),
          getAllPlayoffs(),
        ]);

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
        setLiveBeatReporterEnabled(
          resolveReporterToggle(
            loadedPlayoff.liveBeatReporterEnabled,
            loadedPlayoff.beatReporterEnabled,
            false,
          ),
        );
        setPostGameColumnsEnabled(
          resolveReporterToggle(
            loadedPlayoff.postGameColumnsEnabled,
            loadedPlayoff.beatReporterEnabled,
            true,
          ),
        );
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

  useEffect(() => {
    if (!eliminationId || !metadata || !playoffConfig) return;
    if (metadata.status !== 'COMPLETED' || metadata.awards !== undefined) return;

    const currentEliminationId = eliminationId;
    const currentPlayoffId = playoffConfig.id;
    let cancelled = false;

    async function persistAwards() {
      try {
        const computedAwards = await computeEliminationAwards(currentPlayoffId);
        if (cancelled) return;

        await updateElimination(currentEliminationId, { awards: computedAwards });
        if (cancelled) return;

        setMetadata((prev) => (
          prev && prev.eliminationId === currentEliminationId
            ? { ...prev, awards: computedAwards }
            : prev
        ));
      } catch (err) {
        if (!cancelled) {
          console.error('[EliminationHome] Failed to persist awards:', err);
        }
      }
    }

    void persistAwards();
    return () => {
      cancelled = true;
    };
  }, [eliminationId, metadata, playoffConfig]);

  useEffect(() => {
    if (!playoffConfig) return;

    const shouldPersist =
      playoffConfig.liveBeatReporterEnabled !== liveBeatReporterEnabled ||
      playoffConfig.postGameColumnsEnabled !== postGameColumnsEnabled ||
      playoffConfig.beatReporterEnabled !== (liveBeatReporterEnabled || postGameColumnsEnabled);

    if (!shouldPersist) return;

    let cancelled = false;
    void updatePlayoff(playoffConfig.id, {
      liveBeatReporterEnabled,
      postGameColumnsEnabled,
      beatReporterEnabled: liveBeatReporterEnabled || postGameColumnsEnabled,
    })
      .then((updatedPlayoff) => {
        if (!cancelled) {
          setPlayoffConfig(updatedPlayoff);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[EliminationHome] Failed to persist reporter toggles:', err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [liveBeatReporterEnabled, playoffConfig, postGameColumnsEnabled]);

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
  const selectedSeriesGame = useMemo(
    () =>
      eliminationId && selectedSeries
        ? buildSeriesCardState(eliminationId, selectedSeries, selectedHomeTeamId)
        : null,
    [eliminationId, selectedHomeTeamId, selectedSeries],
  );

  useEffect(() => {
    if (!eliminationId || !selectedSeries) {
      setSelectedHomeTeamId(null);
      return;
    }

    setSelectedHomeTeamId((current) => {
      if (
        current === selectedSeries.higherSeed.teamId ||
        current === selectedSeries.lowerSeed.teamId
      ) {
        return current;
      }
      return buildSeriesCardState(eliminationId, selectedSeries).homeTeam.teamId;
    });
  }, [eliminationId, selectedSeries]);

  useEffect(() => {
    if (!eliminationId || !selectedSeriesGame) {
      setPregameReporterTeams([]);
      return;
    }

    let cancelled = false;
    const currentEliminationId = eliminationId;
    const currentSeriesGame = selectedSeriesGame;
    async function loadReporterTeams() {
      const [awayTeamData, homeTeamData] = await Promise.all([
        getEliminationTeam(currentEliminationId, currentSeriesGame.awayTeam.teamId),
        getEliminationTeam(currentEliminationId, currentSeriesGame.homeTeam.teamId),
      ]);
      if (cancelled) return;
      setPregameReporterTeams([
        {
          label: 'Away team',
          team: {
            id: currentSeriesGame.awayTeam.teamId,
            name: currentSeriesGame.awayTeam.teamName,
            era: awayTeamData?.era,
            colors: awayTeamData?.colors,
          },
        },
        {
          label: 'Home team',
          team: {
            id: currentSeriesGame.homeTeam.teamId,
            name: currentSeriesGame.homeTeam.teamName,
            era: homeTeamData?.era,
            colors: homeTeamData?.colors,
          },
        },
      ]);
    }
    loadReporterTeams().catch((err) => {
      if (!cancelled) console.error('[EliminationHome] Failed to load reporter teams:', err);
    });
    return () => {
      cancelled = true;
    };
  }, [eliminationId, selectedSeriesGame]);

  const handlePlayGame = async (
    series: PlayoffSeries,
    selectedHomeTeamIdForLaunch: string,
  ) => {
    if (!eliminationId || !playoffConfig || !metadata) return;

    try {
      const { gameId, nextGameNumber, homeTeam, awayTeam } = buildSeriesCardState(
        eliminationId,
        series,
        selectedHomeTeamIdForLaunch,
      );
      const higherSeedHome = homeTeam.teamId === series.higherSeed.teamId;
      const clutchContext = buildClutchContext(
        series.higherSeedWins,
        series.lowerSeedWins,
        series.bestOf,
        series.round === playoffConfig.rounds,
      );
      const [awayRoster, homeRoster, awayTeamData, homeTeamData] = await Promise.all([
        buildEliminationGameTrackerRoster(eliminationId, awayTeam.teamId, playoffConfig.useDH),
        buildEliminationGameTrackerRoster(eliminationId, homeTeam.teamId, playoffConfig.useDH),
        getEliminationTeam(eliminationId, awayTeam.teamId),
        getEliminationTeam(eliminationId, homeTeam.teamId),
      ]);
      const [awayManager, homeManager] = await Promise.all([
        resolveManagerForTeam({
          team: {
            id: awayTeam.teamId,
            name: awayTeam.teamName,
            managerId: awayTeamData?.managerId,
            managerName: awayTeamData?.managerName,
          },
          mode: 'elimination',
          instanceId: eliminationId,
          persistAssignment: true,
        }),
        resolveManagerForTeam({
          team: {
            id: homeTeam.teamId,
            name: homeTeam.teamName,
            managerId: homeTeamData?.managerId,
            managerName: homeTeamData?.managerName,
          },
          mode: 'elimination',
          instanceId: eliminationId,
          persistAssignment: true,
        }),
      ]);
      const awayOpposingHand =
        (homeRoster.pitchers.find((pitcher) => pitcher.isActive)?.throwingHand ||
          "R") === "L"
          ? "vsLHP"
          : "vsRHP";
      const homeOpposingHand =
        (awayRoster.pitchers.find((pitcher) => pitcher.isActive)?.throwingHand ||
          "R") === "L"
          ? "vsLHP"
          : "vsRHP";
      const optimalLineupSnapshots = {
        away: awayRoster.optimalLineups?.[awayOpposingHand],
        home: homeRoster.optimalLineups?.[homeOpposingHand],
      };
      const lineupBenchmarkIssues = buildPregameBenchmarkIssues([
        {
          teamName: awayTeam.teamName,
          opposingPitcherHand: awayOpposingHand === "vsLHP" ? "L" : "R",
          dhEnabled: playoffConfig.useDH,
          snapshot: optimalLineupSnapshots.away,
        },
        {
          teamName: homeTeam.teamName,
          opposingPitcherHand: homeOpposingHand === "vsLHP" ? "L" : "R",
          dhEnabled: playoffConfig.useDH,
          snapshot: optimalLineupSnapshots.home,
        },
      ]);
      if (lineupBenchmarkIssues.length > 0) {
        setError(
          `Lineup Delta benchmarks need attention before first pitch: ${lineupBenchmarkIssues.join(" • ")} Use Team Hub to recalculate/apply or set the current lineup as optimal.`,
        );
        return;
      }

      sessionStorage.setItem(
        "kbl-pending-live-beat-reporter-enabled",
        JSON.stringify(liveBeatReporterEnabled),
      );
      sessionStorage.setItem(
        "kbl-pending-post-game-columns-enabled",
        JSON.stringify(postGameColumnsEnabled),
      );
      navigate(`/game-tracker/${gameId}`, {
        state: withPregameManagerNavigationState({
          gameMode: 'elimination',
          eliminationId: eliminationId,
          seriesId: series.id,
          gameNumber: nextGameNumber,
          roundName: series.roundName,
          seasonNumber: 1,
          statsScopeId: `elimination-${eliminationId}`,
          competitionType: 'elimination',
          competitionId: eliminationId,
          competitionName: metadata.name,
          leagueId: metadata.leagueId,
          liveBeatReporterEnabled,
          postGameColumnsEnabled,
          homeTeamId: homeTeam.teamId,
          homeTeamName: homeTeam.teamName,
          homeTeamAbbreviation: homeTeamData?.abbreviation,
          homeSeed: homeTeam.seed,
          awayTeamId: awayTeam.teamId,
          awayTeamName: awayTeam.teamName,
          awayTeamAbbreviation: awayTeamData?.abbreviation,
          awaySeed: awayTeam.seed,
          seriesScore: {
            home: higherSeedHome ? series.higherSeedWins : series.lowerSeedWins,
            away: higherSeedHome ? series.lowerSeedWins : series.higherSeedWins,
          },
          awayPlayers: awayRoster.players,
          awayPitchers: awayRoster.pitchers,
          homePlayers: homeRoster.players,
          homePitchers: homeRoster.pitchers,
          optimalLineupSnapshots,
          awayTeamColor: awayTeamData?.colors.primary,
          awayTeamBorderColor: awayTeamData?.colors.secondary,
          homeTeamColor: homeTeamData?.colors.primary,
          homeTeamBorderColor: homeTeamData?.colors.secondary,
          stadiumName: homeTeamData?.stadium || homeTeam.teamName + ' Stadium',
          playoffSeriesId: series.id,
          playoffGameNumber: nextGameNumber,
          playoffId: playoffConfig.id,
          playoffRound: mapSeriesRoundToFameRound(series.round, playoffConfig.rounds),
          isEliminationGame: clutchContext.isEliminationGame,
          isClinchGame: clutchContext.isClinchGame,
          totalInnings: playoffConfig.inningsPerGame,
          useGhostRunner: false,
          useDH: playoffConfig.useDH,
        }, {
          awayManagerId: awayManager.managerId,
          awayManagerName: awayManager.managerName,
          homeManagerId: homeManager.managerId,
          homeManagerName: homeManager.managerName,
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load elimination rosters for game start.');
    }
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="px-3 py-2 hover:bg-[#4A6844] border-2 border-[#4A6844] transition active:scale-95 text-[8px] font-bold"
            >
              HOME
            </button>
            <button
              onClick={() => navigate('/elimination/select')}
              className="p-2 hover:bg-[#4A6844] border-2 border-[#4A6844] transition active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-[#E8E8D8]" />
            </button>
          </div>
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
            selectedHomeTeamId={selectedHomeTeamId}
            onSelectHomeTeam={setSelectedHomeTeamId}
            onPlayGame={handlePlayGame}
            reporterPanel={
              pregameReporterTeams.length === 2 ? (
                <ReporterAssignmentPanel
                  leagueId={metadata.leagueId}
                  teams={pregameReporterTeams}
                  liveEnabled={liveBeatReporterEnabled}
                  onLiveEnabledChange={setLiveBeatReporterEnabled}
                  postGameEnabled={postGameColumnsEnabled}
                  onPostGameEnabledChange={setPostGameColumnsEnabled}
                />
              ) : null
            }
          />
        )}

        {activeTab === 'teamhub' && (
          <EliminationTeamHub
            eliminationId={eliminationId!}
            teams={playoffConfig.teams}
            useDH={playoffConfig.useDH}
          />
        )}

        {activeTab === 'leaders' && (
          <PlayoffLeadersContent
            eliminationId={eliminationId!}
            playoffId={playoffConfig.id}
          />
        )}

        {activeTab === 'awards' && (
          <EliminationAwardsContent
            isCompleted={metadata.status === 'COMPLETED'}
            awards={metadata.awards}
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
  selectedHomeTeamId,
  onSelectHomeTeam,
  onPlayGame,
  reporterPanel,
}: {
  eliminationId: string;
  playoffConfig: PlayoffConfig;
  seriesByRound: Array<[number, PlayoffSeries[]]>;
  selectedSeries: PlayoffSeries | null;
  onSelectSeries: (seriesId: string) => void;
  selectedHomeTeamId: string | null;
  onSelectHomeTeam: (teamId: string | null) => void;
  onPlayGame: (series: PlayoffSeries, homeTeamId: string) => void;
  reporterPanel?: ReactNode;
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
            <div className="text-sm mb-4">▶ {getEliminationRoundName(round, playoffConfig.rounds).toUpperCase()}</div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {roundSeries.map((series) => {
                const isSelected = selectedSeries?.id === series.id;
                const playable = canPlaySeries(series);
                const nextGame = buildSeriesCardState(eliminationId, series);

                return (
                  <div
                    key={series.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectSeries(series.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectSeries(series.id);
                      }
                    }}
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
                          <div className="text-[8px] text-[#E8E8D8]/60">
                            Host selected in the series panel before launch.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {selectedSeries && (
        <>
          <SelectedSeriesPanel
            eliminationId={eliminationId}
            playoffConfig={playoffConfig}
            series={selectedSeries}
            selectedHomeTeamId={selectedHomeTeamId}
            onSelectHomeTeam={onSelectHomeTeam}
            onPlayGame={onPlayGame}
          />
          {reporterPanel}
        </>
      )}
    </div>
  );
}

function SelectedSeriesPanel({
  eliminationId,
  playoffConfig,
  series,
  selectedHomeTeamId,
  onSelectHomeTeam,
  onPlayGame,
}: {
  eliminationId: string;
  playoffConfig: PlayoffConfig;
  series: PlayoffSeries;
  selectedHomeTeamId: string | null;
  onSelectHomeTeam: (teamId: string | null) => void;
  onPlayGame: (series: PlayoffSeries, homeTeamId: string) => void;
}) {
  const nextGame = buildSeriesCardState(eliminationId, series, selectedHomeTeamId);

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
            GAME {nextGame.nextGameNumber}: choose the home team before launch.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[series.higherSeed, series.lowerSeed].map((team) => {
              const isSelected = nextGame.homeTeam.teamId === team.teamId;
              return (
                <button
                  key={team.teamId}
                  onClick={() => onSelectHomeTeam(team.teamId)}
                  className={`border-4 p-3 text-left transition ${
                    isSelected
                      ? 'border-[#C4A853] bg-[#C4A853]/15'
                      : 'border-[#E8E8D8] bg-[#4A6844] hover:border-[#C4A853]'
                  }`}
                >
                  <div className="text-[8px] text-[#E8E8D8]/60">HOME TEAM</div>
                  <div className="text-xs mt-1">#{team.seed} {team.teamName}</div>
                </button>
              );
            })}
          </div>
          <div className="text-[8px] text-[#E8E8D8]/70">
            Matchup: {nextGame.awayTeam.teamName} at {nextGame.homeTeam.teamName}
          </div>
          {canPlaySeries(series) && (
            <button
              onClick={() => onPlayGame(series, nextGame.homeTeam.teamId)}
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

function PlayoffLeadersContent({
  eliminationId,
  playoffId,
}: {
  eliminationId: string;
  playoffId: string;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [leaderError, setLeaderError] = useState<string | null>(null);
  const [batting, setBatting] = useState<Record<string, PlayoffPlayerStats[]>>({});
  const [pitching, setPitching] = useState<Record<string, PlayoffPlayerStats[]>>({});
  const [fielding, setFielding] = useState<Record<string, PlayoffPlayerStats[]>>({});
  const [impactLeaderboards, setImpactLeaderboards] = useState<TeamImpactLeaderboards | null>(null);
  const [impactError, setImpactError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLeaders() {
      try {
        setIsLoading(true);
        setLeaderError(null);
        setImpactError(null);
        setImpactLeaderboards(null);

        const battingStats = {
          AVG: 'avg',
          OBP: 'obp',
          H: 'hits',
          HR: 'homeRuns',
          RBI: 'rbi',
          R: 'runs',
          SB: 'stolenBases',
          OPS: 'ops',
        } as const;
        const pitchingStats = {
          ERA: 'era',
          IP: 'inningsPitched',
          W: 'wins',
          K: 'pitchingStrikeouts',
          WHIP: 'whip',
          SV: 'saves',
        } as const;
        const fieldingStats = {
          FWAR: 'fieldingWAR',
          RS: 'fieldingRunsSaved',
          PLAYS: 'fieldingPlays',
        } as const;

        const impactLeadersResult = getInstanceTeamImpactLeaderboards('elimination', eliminationId, 5)
          .then((leaderboards) => ({ leaderboards, error: null as string | null }))
          .catch((error) => ({
            leaderboards: null,
            error: error instanceof Error ? error.message : 'Failed to load Team Impact leaders.',
          }));

        const [battingEntries, pitchingEntries, fieldingEntries, impactResult] = await Promise.all([
          Promise.all(
            Object.entries(battingStats).map(async ([label, stat]) => [label, await getPlayoffLeaders(playoffId, stat, 5)] as const)
          ),
          Promise.all(
            Object.entries(pitchingStats).map(async ([label, stat]) => [label, await getPlayoffLeaders(playoffId, stat, 5)] as const)
          ),
          Promise.all(
            Object.entries(fieldingStats).map(async ([label, stat]) => [label, await getPlayoffLeaders(playoffId, stat, 5)] as const)
          ),
          impactLeadersResult,
        ]);

        if (cancelled) return;
        setBatting(Object.fromEntries(battingEntries));
        setPitching(Object.fromEntries(pitchingEntries));
        setFielding(Object.fromEntries(fieldingEntries));
        setImpactLeaderboards(impactResult.leaderboards);
        setImpactError(impactResult.error);
      } catch (err) {
        if (!cancelled) {
          console.error('[EliminationHome] Failed to load leaders:', err);
          setLeaderError(err instanceof Error ? err.message : 'Failed to load leaders.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadLeaders();
    return () => {
      cancelled = true;
    };
  }, [eliminationId, playoffId]);

  const hasPlayoffLeaderData =
    Object.values(batting).some((items) => items.length > 0) ||
    Object.values(pitching).some((items) => items.length > 0) ||
    Object.values(fielding).some((items) => items.length > 0);

  if (isLoading) {
    return (
      <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E8E8D8] mx-auto mb-3" />
        <div className="text-[8px] text-[#E8E8D8]/70">LOADING PLAYOFF LEADERS...</div>
      </div>
    );
  }

  if (!hasPlayoffLeaderData) {
    return (
      <TeamImpactLeaderboardsPanel
        leaderboards={impactLeaderboards}
        error={impactError ?? leaderError}
        theme="elimination"
      />
    );
  }

  return (
    <div className="space-y-4">
      <TeamImpactLeaderboardsPanel
        leaderboards={impactLeaderboards}
        error={impactError}
        theme="elimination"
      />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <LeaderPanel title="BATTING LEADERS" entries={batting} />
        <LeaderPanel title="PITCHING LEADERS" entries={pitching} />
        <LeaderPanel title="FIELDING LEADERS" entries={fielding} />
      </div>
    </div>
  );
}

function EliminationAwardsContent({
  isCompleted,
  awards,
}: {
  isCompleted: boolean;
  awards?: EliminationAward[];
}) {
  if (!isCompleted) {
    return (
      <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-8 text-center py-12 text-[#E8E8D8]/60 text-xs">
        AWARDS WILL APPEAR AFTER BRACKET COMPLETES
      </div>
    );
  }

  if (awards === undefined) {
    return (
      <div className="bg-[#5A8352] border-[6px] border-[#4A6844] p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E8E8D8] mx-auto mb-3" />
        <div className="text-[8px] text-[#E8E8D8]/70">STORING ELIMINATION AWARDS...</div>
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
              <div className="text-[8px] text-[#E8E8D8]/50">No qualifying data yet</div>
            ) : (
              stats.map((stat, index) => (
                <div key={`${label}-${stat.playerId}-${index}`} className="flex items-start justify-between gap-3 text-[8px] py-1 border-b border-[#6B9462] last:border-0">
                  <div>
                    <div>{index + 1}. {stat.playerName}</div>
                    <div className="text-[7px] text-[#E8E8D8]/50">{stat.teamId}</div>
                  </div>
                  <div className="text-right">
                    <div>{formatLeaderValue(label, stat)}</div>
                    <div className="text-[7px] text-[#E8E8D8]/50">{formatLeaderContext(label, stat)}</div>
                  </div>
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
    case 'OBP':
      return stat.obp.toFixed(3);
    case 'OPS':
      return stat.ops.toFixed(3);
    case 'FWAR':
      return `${(stat.fieldingWAR ?? 0).toFixed(2)}${stat.fieldingPrimaryPosition ? ` ${stat.fieldingPrimaryPosition}` : ''}`;
    case 'RS':
      return `${(stat.fieldingRunsSaved ?? 0) >= 0 ? '+' : ''}${(stat.fieldingRunsSaved ?? 0).toFixed(2)}`;
    case 'PLAYS':
      return String(stat.fieldingPlays ?? 0);
    case 'ERA':
      return (stat.era ?? 0).toFixed(2);
    case 'WHIP':
      return (stat.whip ?? 0).toFixed(2);
    case 'IP':
      return formatInningsPitched(stat.inningsPitched ?? 0);
    case 'H':
      return String(stat.hits);
    case 'HR':
      return String(stat.homeRuns);
    case 'RBI':
      return String(stat.rbi);
    case 'R':
      return String(stat.runs);
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

function formatLeaderContext(label: string, stat: PlayoffPlayerStats): string {
  switch (label) {
    case 'AVG':
      return `${stat.atBats} AB`;
    case 'OBP':
    case 'OPS':
      return `${getPlayoffPlateAppearances(stat)} PA`;
    case 'H':
    case 'HR':
    case 'RBI':
    case 'R':
    case 'SB':
      return `${stat.games} G`;
    case 'ERA':
    case 'WHIP':
    case 'IP':
    case 'W':
    case 'K':
    case 'SV':
      return `${formatInningsPitched(stat.inningsPitched ?? 0)} IP`;
    case 'FWAR':
    case 'RS':
    case 'PLAYS':
      return `${stat.fieldingPlays ?? 0} plays`;
    default:
      return `${stat.games} G`;
  }
}

function formatInningsPitched(value: number): string {
  const outs = Math.round(value * 3);
  const innings = Math.floor(outs / 3);
  const partialOuts = outs % 3;
  return partialOuts === 0 ? String(innings) : `${innings}.${partialOuts}`;
}

function getPlayoffPlateAppearances(stat: PlayoffPlayerStats): number {
  return stat.atBats + stat.walks + (stat.hitByPitch ?? 0) + (stat.sacrificeFlies ?? 0);
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
