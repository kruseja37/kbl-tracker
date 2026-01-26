import { useParams, Link } from 'react-router-dom';
import { useMemo } from 'react';
import TeamStatsView from '../components/TeamStatsView';
import { TEAMS } from '../data/playerDatabase';

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();

  // Get team info from database
  const team = useMemo(() => {
    if (!id) return null;
    return TEAMS[id] || null;
  }, [id]);

  // Placeholder stats - will be populated from storage in future
  const teamStats = useMemo(() => ({
    teamId: id || '',
    teamName: team?.name || `Team ${id}`,
    // Batting
    runs: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbi: 0,
    walks: 0,
    strikeouts: 0,
    stolenBases: 0,
    avg: 0,
    obp: 0,
    slg: 0,
    ops: 0,
    // Pitching
    era: 0,
    whip: 0,
    qualityStarts: 0,
    saves: 0,
    blownSaves: 0,
    pitchingStrikeouts: 0,
    pitchingWalks: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    inningsPitched: 0,
  }), [id, team]);

  if (!id) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-white mb-2">Team Not Found</h1>
          <Link to="/season" className="text-blue-400 hover:text-blue-300">
            ← Back to Season
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/season"
            className="text-slate-400 hover:text-white text-sm mb-4 inline-block"
          >
            ← Back to Season
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-4xl">⚾</div>
            <div>
              <h1 className="text-3xl font-black text-white">
                {team?.name || `Team ${id}`}
              </h1>
              {team && (
                <p className="text-slate-400 text-sm mt-1">
                  {team.chemistry} • {team.homePark || 'Home Park TBD'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Team Stats */}
        <TeamStatsView stats={teamStats} />

        {/* Placeholder sections for future features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span>👥</span> Roster
            </h3>
            <p className="text-slate-400 text-sm">
              Player roster will be displayed here.
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span>📅</span> Recent Games
            </h3>
            <p className="text-slate-400 text-sm">
              Recent game results will be displayed here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
