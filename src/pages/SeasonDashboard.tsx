import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getActiveSeason } from '../utils/seasonStorage';
import type { SeasonMetadata } from '../utils/seasonStorage';
import LeagueNewsFeed, { type NewsStory } from '../components/LeagueNewsFeed';
import StandingsView from '../components/StandingsView';
import SeasonProgressTracker from '../components/SeasonProgressTracker';
import PlayoffBracket from '../components/PlayoffBracket';
import ContractionWarning from '../components/ContractionWarning';
import { TEAMS } from '../data/playerDatabase';

// Types for playoff bracket
interface TeamSeed {
  teamId: string;
  teamName: string;
  seed: number;
  record?: { wins: number; losses: number };
}

interface MatchupSeries {
  id: string;
  round: 'wildcard' | 'division' | 'championship' | 'finals';
  team1?: TeamSeed;
  team2?: TeamSeed;
  team1Wins: number;
  team2Wins: number;
  winnerId?: string;
  gamesToWin: number;
}

// Types for contraction warning
interface RiskFactor {
  factor: string;
  value: number | string;
  threshold: number | string;
  isCritical: boolean;
}

// Type for standings data
interface TeamStanding {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  runsScored: number;
  runsAllowed: number;
  streak: { type: 'W' | 'L'; count: number };
  lastTenWins: number;
  homeRecord: { wins: number; losses: number };
  awayRecord: { wins: number; losses: number };
}

export default function SeasonDashboard() {
  const navigate = useNavigate();
  const [season, setSeason] = useState<SeasonMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [newsStories, setNewsStories] = useState<NewsStory[]>([]);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [isPlayoffs, setIsPlayoffs] = useState(false);
  const [playoffMatchups, setPlayoffMatchups] = useState<MatchupSeries[]>([]);
  const [teamMorale, setTeamMorale] = useState(75); // Default healthy morale
  const [contractionRiskFactors, setContractionRiskFactors] = useState<RiskFactor[]>([]);

  // Convert TEAMS to format expected by LeagueNewsFeed
  const teamsForNews = useMemo(() =>
    Object.values(TEAMS).map(t => ({ teamId: t.id, teamName: t.name })),
    []
  );

  useEffect(() => {
    async function loadSeason() {
      try {
        const activeSeason = await getActiveSeason();
        setSeason(activeSeason);
      } catch (err) {
        console.error('[SeasonDashboard] Failed to load season:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSeason();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">⚾</div>
          <div className="text-slate-400 tracking-wider uppercase text-sm">Loading Season...</div>
        </div>
      </div>
    );
  }

  if (!season) {
    return <NoSeasonState />;
  }

  const progressPercent = Math.round((season.gamesPlayed / season.totalGames) * 100);
  const gamesRemaining = season.totalGames - season.gamesPlayed;

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Stadium light glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Season Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-3 h-3 rounded-full ${season.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-slate-400 uppercase tracking-[0.2em] text-xs font-medium">
              {season.status === 'active' ? 'Season In Progress' : 'Season Complete'}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {season.seasonName}
          </h1>
        </div>

        {/* Contraction Warning - Show when morale is low */}
        <ContractionWarning
          teamMorale={teamMorale}
          riskFactors={contractionRiskFactors}
          contractionThreshold={30}
          onDismiss={() => console.log('[SeasonDashboard] Contraction warning dismissed')}
          onLearnMore={() => navigate('/help/morale')}
        />

        {/* Season Progress Tracker (Compact) */}
        <div className="mb-6">
          <SeasonProgressTracker
            gamesPlayed={season.gamesPlayed}
            totalGames={season.totalGames}
            phase={season.status === 'active' ? 'regular' : 'offseason'}
            compact={true}
          />
        </div>

        {/* Main Progress Card */}
        <div className="relative mb-8 overflow-hidden">
          {/* Card with diagonal accent */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800/80 to-slate-900/80 skew-x-[-1deg] scale-x-[1.02]" />
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-500 skew-x-[-1deg]" />

          <div className="relative p-6 sm:p-8">
            {/* Big Numbers Display */}
            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="text-slate-500 uppercase tracking-wider text-xs mb-1">Games Played</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl sm:text-7xl font-black text-white tabular-nums">
                    {season.gamesPlayed}
                  </span>
                  <span className="text-2xl sm:text-3xl text-slate-500 font-bold">
                    / {season.totalGames}
                  </span>
                </div>
              </div>

              {/* Percentage badge */}
              <div className="text-right">
                <div className="inline-block px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded">
                  <span className="text-3xl sm:text-4xl font-black text-blue-400 tabular-nums">
                    {progressPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Segmented Progress Bar */}
            <div className="mb-4">
              <div className="flex gap-[2px] h-4 bg-slate-900/50 rounded overflow-hidden">
                {Array.from({ length: 20 }).map((_, i) => {
                  const segmentPercent = (i + 1) * 5;
                  const isFilled = progressPercent >= segmentPercent;
                  const isPartial = progressPercent > segmentPercent - 5 && progressPercent < segmentPercent;

                  return (
                    <div
                      key={i}
                      className={`flex-1 transition-all duration-500 ${
                        isFilled
                          ? 'bg-gradient-to-t from-blue-600 to-blue-400'
                          : isPartial
                          ? 'bg-gradient-to-t from-blue-600/50 to-blue-400/50'
                          : 'bg-slate-800'
                      }`}
                      style={{ transitionDelay: `${i * 30}ms` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700/50">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{gamesRemaining}</div>
                <div className="text-slate-500 text-xs uppercase tracking-wider">Remaining</div>
              </div>
              <div className="text-center border-x border-slate-700/50">
                <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{season.totalGames}</div>
                <div className="text-slate-500 text-xs uppercase tracking-wider">Total Games</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-emerald-400">
                  {season.status === 'active' ? 'LIVE' : 'END'}
                </div>
                <div className="text-slate-500 text-xs uppercase tracking-wider">Status</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Link
            to="/game"
            className="group relative block overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 skew-x-[-2deg] scale-x-[1.02] transition-all duration-300 group-hover:scale-x-[1.04]" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

            <div className="relative flex items-center gap-4 px-6 py-5">
              <div className="text-3xl">🎮</div>
              <div>
                <div className="font-bold text-white text-lg">New Game</div>
                <div className="text-emerald-100/70 text-sm">Track a match</div>
              </div>
              <div className="ml-auto text-white/80 text-xl group-hover:translate-x-2 transition-transform">→</div>
            </div>
          </Link>

          <Link
            to="/roster"
            className="group relative block overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-slate-700 to-slate-600 skew-x-[-2deg] scale-x-[1.02] transition-all duration-300 group-hover:scale-x-[1.04]" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

            <div className="relative flex items-center gap-4 px-6 py-5">
              <div className="text-3xl">👥</div>
              <div>
                <div className="font-bold text-white text-lg">Roster</div>
                <div className="text-slate-300/70 text-sm">Manage players</div>
              </div>
              <div className="ml-auto text-white/80 text-xl group-hover:translate-x-2 transition-transform">→</div>
            </div>
          </Link>
        </div>

        {/* Season Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Link to="/schedule" className="p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-center transition-colors">
            <div className="text-2xl mb-2">📅</div>
            <div className="text-white font-semibold text-sm">Schedule</div>
          </Link>
          <Link to="/leaders" className="p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-center transition-colors">
            <div className="text-2xl mb-2">🏆</div>
            <div className="text-white font-semibold text-sm">Leaders</div>
          </Link>
          <Link to="/awards" className="p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-center transition-colors">
            <div className="text-2xl mb-2">🏅</div>
            <div className="text-white font-semibold text-sm">Awards</div>
          </Link>
          <Link to="/museum" className="p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-center transition-colors">
            <div className="text-2xl mb-2">🏛️</div>
            <div className="text-white font-semibold text-sm">Museum</div>
          </Link>
        </div>

        {/* Playoff Bracket - Show during playoffs */}
        {isPlayoffs && playoffMatchups.length > 0 && (
          <div className="mb-8 bg-slate-800/50 rounded-xl p-4">
            <PlayoffBracket
              matchups={playoffMatchups}
              teamCount={playoffMatchups.length >= 7 ? 8 : 4}
              onMatchupClick={(matchupId) => {
                console.log('[SeasonDashboard] Matchup clicked:', matchupId);
                navigate(`/playoffs/${matchupId}`);
              }}
            />
          </div>
        )}

        {/* League Standings */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>🏆</span> Standings
          </h2>
          <StandingsView
            standings={standings}
            onTeamClick={(teamId) => navigate(`/team/${teamId}`)}
            compact={true}
          />
        </div>

        {/* League News Feed */}
        <LeagueNewsFeed
          stories={newsStories}
          teams={teamsForNews}
          onPlayerClick={(playerId) => console.log('[NewsFeed] Player clicked:', playerId)}
          onTeamClick={(teamId) => console.log('[NewsFeed] Team clicked:', teamId)}
        />
      </div>
    </div>
  );
}

function NoSeasonState() {
  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[100px]" />

      <div className="relative z-10 text-center px-4 max-w-md">
        {/* Empty state icon */}
        <div className="mb-6">
          <div className="inline-block relative">
            <div className="text-7xl opacity-30">📋</div>
            <div className="absolute -bottom-1 -right-1 text-3xl">❌</div>
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
          No Season Started
        </h2>
        <p className="text-slate-400 mb-8">
          Start tracking your first season to see standings, stats, and progress here.
        </p>

        <Link
          to="/game"
          className="group relative inline-flex items-center gap-3 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-400 skew-x-[-2deg] scale-x-[1.05] transition-all duration-300 group-hover:scale-x-[1.08]" />
          <div className="relative flex items-center gap-3 px-8 py-4 font-bold text-black">
            <span className="text-xl">⚾</span>
            <span className="text-lg">Start Season</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
