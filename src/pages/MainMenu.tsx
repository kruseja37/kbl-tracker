import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GameSetupModal from '../components/GameSetupModal';

export default function MainMenu() {
  const navigate = useNavigate();
  const [showGameSetup, setShowGameSetup] = useState(false);

  const handleGameSetupConfirm = (awayTeamId: string, homeTeamId: string) => {
    setShowGameSetup(false);
    // Navigate to pregame with team IDs as URL params
    navigate(`/pregame?away=${awayTeamId}&home=${homeTeamId}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Stadium light glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] -translate-y-1/2" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-[120px] -translate-y-1/2" />

      {/* Diagonal field lines pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 40px,
            white 40px,
            white 41px
          )`
        }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">

        {/* Logo Section */}
        <div className="mb-16 text-center">
          {/* Baseball icon with glow */}
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-amber-400/30 rounded-full blur-xl scale-150" />
            <div className="relative text-7xl sm:text-8xl drop-shadow-2xl animate-pulse" style={{ animationDuration: '3s' }}>
              ⚾
            </div>
          </div>

          {/* Title with scoreboard styling */}
          <div className="relative">
            <div className="absolute -inset-x-8 -inset-y-4 bg-gradient-to-r from-transparent via-slate-800/50 to-transparent skew-x-[-2deg]" />
            <h1 className="relative font-black text-5xl sm:text-7xl tracking-tight">
              <span className="text-white drop-shadow-lg">KBL</span>
              <span className="text-blue-400 ml-3 drop-shadow-lg">TRACKER</span>
            </h1>
          </div>

          {/* Tagline */}
          <p className="mt-4 text-slate-400 text-sm sm:text-base tracking-[0.3em] uppercase font-medium">
            Super Mega Baseball 4 Statistics
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="w-full max-w-lg space-y-4 px-4">

          {/* New Game - Primary action */}
          <button
            onClick={() => setShowGameSetup(true)}
            className="group relative block w-full overflow-hidden text-left"
          >
            {/* Card background with diagonal cut */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 skew-x-[-2deg] scale-x-[1.02] transition-all duration-300 group-hover:scale-x-[1.04] group-hover:skew-x-[-3deg]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

            {/* Shine effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

            <div className="relative flex items-center justify-between px-6 py-5 sm:px-8 sm:py-6">
              <div className="flex items-center gap-4">
                <div className="text-3xl sm:text-4xl">🎮</div>
                <div>
                  <div className="font-bold text-white text-xl sm:text-2xl tracking-wide">NEW GAME</div>
                  <div className="text-blue-100/70 text-sm">Start tracking a match</div>
                </div>
              </div>
              <div className="text-white/80 text-2xl group-hover:translate-x-2 transition-transform duration-300">
                →
              </div>
            </div>
          </button>

          {/* Season */}
          <Link
            to="/season"
            className="group relative block w-full overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-700 skew-x-[-2deg] scale-x-[1.02] border-l-4 border-amber-400 transition-all duration-300 group-hover:scale-x-[1.04] group-hover:border-l-[6px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative flex items-center justify-between px-6 py-5 sm:px-8 sm:py-6">
              <div className="flex items-center gap-4">
                <div className="text-3xl sm:text-4xl">📊</div>
                <div>
                  <div className="font-bold text-white text-xl sm:text-2xl tracking-wide">SEASON</div>
                  <div className="text-slate-400 text-sm">View standings & stats</div>
                </div>
              </div>
              <div className="text-slate-400 text-2xl group-hover:translate-x-2 group-hover:text-amber-400 transition-all duration-300">
                →
              </div>
            </div>
          </Link>

          {/* Teams */}
          <Link
            to="/team/select"
            className="group relative block w-full overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-700 skew-x-[-2deg] scale-x-[1.02] border-l-4 border-emerald-400 transition-all duration-300 group-hover:scale-x-[1.04] group-hover:border-l-[6px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative flex items-center justify-between px-6 py-5 sm:px-8 sm:py-6">
              <div className="flex items-center gap-4">
                <div className="text-3xl sm:text-4xl">👥</div>
                <div>
                  <div className="font-bold text-white text-xl sm:text-2xl tracking-wide">TEAMS</div>
                  <div className="text-slate-400 text-sm">Manage rosters & players</div>
                </div>
              </div>
              <div className="text-slate-400 text-2xl group-hover:translate-x-2 group-hover:text-emerald-400 transition-all duration-300">
                →
              </div>
            </div>
          </Link>

        </div>

        {/* Footer ticker */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/80 border border-slate-700/50 rounded-full">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-slate-500 text-xs sm:text-sm font-medium tracking-wide">
              READY TO PLAY
            </span>
          </div>
        </div>

      </div>

      {/* Game Setup Modal */}
      <GameSetupModal
        isOpen={showGameSetup}
        onClose={() => setShowGameSetup(false)}
        onConfirm={handleGameSetupConfirm}
      />
    </div>
  );
}
