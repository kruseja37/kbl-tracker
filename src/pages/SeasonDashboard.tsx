import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getActiveSeason, calculateStandings } from '../utils/seasonStorage';
import type { SeasonMetadata, TeamStanding as StorageTeamStanding } from '../utils/seasonStorage';
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
  const [teamMorale, setTeamMorale] = useState(75);
  const [contractionRiskFactors, setContractionRiskFactors] = useState<RiskFactor[]>([]);

  const teamsForNews = useMemo(() =>
    Object.values(TEAMS).map(t => ({ teamId: t.id, teamName: t.name })),
    []
  );

  useEffect(() => {
    async function loadSeasonData() {
      try {
        // Load season metadata
        const activeSeason = await getActiveSeason();
        setSeason(activeSeason);

        // Load standings from completed games
        if (activeSeason) {
          const standingsData = await calculateStandings(activeSeason.seasonId);
          // Convert to the format expected by StandingsView
          setStandings(standingsData.map(s => ({
            teamId: s.teamId,
            teamName: s.teamName,
            wins: s.wins,
            losses: s.losses,
            runsScored: s.runsScored,
            runsAllowed: s.runsAllowed,
            streak: s.streak,
            lastTenWins: s.lastTenWins,
            homeRecord: s.homeRecord,
            awayRecord: s.awayRecord,
          })));
        }
      } catch (err) {
        console.error('[SeasonDashboard] Failed to load season data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSeasonData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-retro-green relative flex items-center justify-center">
        <div className="bg-field-stripes absolute inset-0" />
        <div className="bg-scanlines absolute inset-0 pointer-events-none z-50" />
        <div className="relative z-10 text-center">
          <div className="retro-card p-8">
            <div className="retro-header-blue -mx-8 -mt-8 mb-4 px-4 py-3">
              <span className="font-pixel text-white text-sm">LOADING</span>
            </div>
            <div className="text-5xl mb-4 animate-bounce">⚾</div>
            <div className="font-pixel text-retro-blue text-xs">Loading Season...</div>
          </div>
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
    <div className="min-h-screen bg-retro-green relative overflow-hidden">
      {/* Background layers */}
      <div className="bg-field-stripes absolute inset-0" />
      <div className="bg-scanlines absolute inset-0 pointer-events-none z-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Season Header */}
        <div className="retro-card mb-6">
          <div className="retro-header-blue">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${season.status === 'active' ? 'bg-retro-green-bright animate-pulse' : 'bg-gray-400'}`} />
                <span className="font-pixel text-white text-xs">
                  {season.status === 'active' ? 'SEASON IN PROGRESS' : 'SEASON COMPLETE'}
                </span>
              </div>
              <span className="font-pixel text-retro-gold text-xs">
                {progressPercent}%
              </span>
            </div>
          </div>
          <div className="retro-body p-4">
            <h1 className="font-pixel text-retro-blue text-lg mb-4" style={{ textShadow: '2px 2px 0 #c41e3a' }}>
              {season.seasonName}
            </h1>

            {/* Season Progress */}
            <SeasonProgressTracker
              gamesPlayed={season.gamesPlayed}
              totalGames={season.totalGames}
              phase={season.status === 'active' ? 'regular' : 'offseason'}
              compact={true}
            />
          </div>
        </div>

        {/* Contraction Warning */}
        <ContractionWarning
          teamMorale={teamMorale}
          riskFactors={contractionRiskFactors}
          contractionThreshold={30}
          onDismiss={() => console.log('[SeasonDashboard] Contraction warning dismissed')}
          onLearnMore={() => navigate('/help/morale')}
        />

        {/* Stats Card */}
        <div className="retro-card mb-6">
          <div className="retro-header-gold">
            <span className="font-pixel text-retro-navy text-xs">SEASON STATS</span>
          </div>
          <div className="retro-body">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-white border-2 border-retro-blue shadow-retro-sm">
                <div className="font-pixel text-retro-blue text-2xl">{season.gamesPlayed}</div>
                <div className="text-xs text-gray-600 uppercase mt-1">Played</div>
              </div>
              <div className="p-3 bg-white border-2 border-retro-blue shadow-retro-sm">
                <div className="font-pixel text-retro-blue text-2xl">{gamesRemaining}</div>
                <div className="text-xs text-gray-600 uppercase mt-1">Remaining</div>
              </div>
              <div className="p-3 bg-white border-2 border-retro-blue shadow-retro-sm">
                <div className="font-pixel text-retro-green-bright text-2xl">
                  {season.status === 'active' ? 'LIVE' : 'END'}
                </div>
                <div className="text-xs text-gray-600 uppercase mt-1">Status</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <Link to="/game" className="retro-card-red group">
            <div className="retro-header-red">
              <span className="font-pixel text-white text-xs">NEW GAME</span>
            </div>
            <div className="retro-body flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎮</span>
                <div>
                  <div className="font-bold text-retro-red">Start a Match</div>
                  <div className="text-sm text-gray-600">Track a game</div>
                </div>
              </div>
              <span className="text-retro-red text-xl group-hover:translate-x-2 transition-transform animate-blink">▶</span>
            </div>
          </Link>

          <Link to="/roster" className="retro-card group">
            <div className="retro-header-blue">
              <span className="font-pixel text-white text-xs">ROSTER</span>
            </div>
            <div className="retro-body flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">👥</span>
                <div>
                  <div className="font-bold text-retro-blue">Manage Players</div>
                  <div className="text-sm text-gray-600">View roster</div>
                </div>
              </div>
              <span className="text-retro-blue text-xl group-hover:translate-x-2 transition-transform">▶</span>
            </div>
          </Link>
        </div>

        {/* Navigation Grid */}
        <div className="retro-card mb-6">
          <div className="retro-header-blue">
            <span className="font-pixel text-white text-xs">NAVIGATION</span>
          </div>
          <div className="retro-body">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link to="/schedule" className="p-4 bg-white border-2 border-retro-blue shadow-retro-sm hover:bg-retro-cream text-center transition-colors">
                <div className="text-2xl mb-2">📅</div>
                <div className="font-pixel text-retro-blue text-[0.6rem]">SCHEDULE</div>
              </Link>
              <Link to="/leaders" className="p-4 bg-white border-2 border-retro-blue shadow-retro-sm hover:bg-retro-cream text-center transition-colors">
                <div className="text-2xl mb-2">🏆</div>
                <div className="font-pixel text-retro-blue text-[0.6rem]">LEADERS</div>
              </Link>
              <Link to="/awards" className="p-4 bg-white border-2 border-retro-blue shadow-retro-sm hover:bg-retro-cream text-center transition-colors">
                <div className="text-2xl mb-2">🏅</div>
                <div className="font-pixel text-retro-blue text-[0.6rem]">AWARDS</div>
              </Link>
              <Link to="/museum" className="p-4 bg-white border-2 border-retro-blue shadow-retro-sm hover:bg-retro-cream text-center transition-colors">
                <div className="text-2xl mb-2">🏛️</div>
                <div className="font-pixel text-retro-blue text-[0.6rem]">MUSEUM</div>
              </Link>
            </div>
          </div>
        </div>

        {/* Playoff Bracket */}
        {isPlayoffs && playoffMatchups.length > 0 && (
          <div className="retro-card mb-6">
            <div className="retro-header-gold">
              <span className="font-pixel text-retro-navy text-xs">PLAYOFFS</span>
            </div>
            <div className="retro-body p-4">
              <PlayoffBracket
                matchups={playoffMatchups}
                teamCount={playoffMatchups.length >= 7 ? 8 : 4}
                onMatchupClick={(matchupId) => {
                  navigate(`/playoffs/${matchupId}`);
                }}
              />
            </div>
          </div>
        )}

        {/* Standings */}
        <div className="retro-card mb-6">
          <div className="retro-header-blue">
            <span className="font-pixel text-white text-xs">🏆 STANDINGS</span>
          </div>
          <div className="retro-body p-4">
            <StandingsView
              standings={standings}
              onTeamClick={(teamId) => navigate(`/team/${teamId}`)}
              compact={true}
            />
          </div>
        </div>

        {/* News Feed */}
        <div className="retro-card">
          <div className="retro-header-blue">
            <span className="font-pixel text-white text-xs">📰 LEAGUE NEWS</span>
          </div>
          <div className="retro-body p-4">
            <LeagueNewsFeed
              stories={newsStories}
              teams={teamsForNews}
              onPlayerClick={(playerId) => console.log('[NewsFeed] Player clicked:', playerId)}
              onTeamClick={(teamId) => console.log('[NewsFeed] Team clicked:', teamId)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function NoSeasonState() {
  return (
    <div className="min-h-screen bg-retro-green relative overflow-hidden flex items-center justify-center">
      <div className="bg-field-stripes absolute inset-0" />
      <div className="bg-scanlines absolute inset-0 pointer-events-none z-50" />

      <div className="relative z-10 text-center px-4 max-w-md">
        <div className="retro-card">
          <div className="retro-header-red">
            <span className="font-pixel text-white text-sm">NO SEASON</span>
          </div>
          <div className="retro-body p-8">
            {/* Empty state icon */}
            <div className="mb-6">
              <div className="inline-block relative">
                <div className="text-7xl opacity-50">📋</div>
                <div className="absolute -bottom-1 -right-1 text-3xl">❌</div>
              </div>
            </div>

            <h2 className="font-pixel text-retro-blue text-sm mb-4">
              No Season Started
            </h2>
            <p className="text-gray-600 mb-6 text-sm">
              Start tracking your first season to see standings, stats, and progress here.
            </p>

            <Link to="/game">
              <button className="retro-btn retro-btn-red flex items-center gap-2 mx-auto">
                <span>⚾</span>
                <span>START SEASON</span>
                <span className="animate-blink">▶</span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
