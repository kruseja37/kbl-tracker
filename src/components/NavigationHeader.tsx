import { Link, useLocation } from 'react-router-dom';
import TeamSelector from './TeamSelector';

export default function NavigationHeader() {
  const location = useLocation();

  // Don't show header on main menu or game-tracker (has its own integrated header)
  if (location.pathname === '/' || location.pathname.startsWith('/game-tracker')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-retro-blue border-b-4 border-retro-blue-dark shadow-retro">
      <div className="h-14 px-4 flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo / Home Link */}
        <Link
          to="/"
          className="group flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          {/* Logo container */}
          <div className="relative flex items-center">
            {/* Baseball icon */}
            <span className="text-2xl mr-2 group-hover:scale-110 transition-transform duration-200">
              ⚾
            </span>

            {/* Brand text - pixel style */}
            <div className="bg-white px-3 py-1 border-2 border-retro-blue-dark shadow-retro-sm">
              <span className="font-pixel text-retro-blue text-xs tracking-wide">
                KBL
              </span>
            </div>
          </div>
        </Link>

        {/* Right side - team selector and breadcrumb */}
        <div className="flex items-center gap-4">
          {/* Team Selector */}
          <TeamSelector />

          {/* Current section indicator */}
          <div className="bg-retro-cream px-3 py-1 border-2 border-retro-blue-dark shadow-retro-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-retro-green-bright rounded-full animate-pulse" />
            <span className="font-pixel text-retro-blue text-[0.6rem] tracking-wide uppercase">
              {getPageLabel(location.pathname)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function getPageLabel(pathname: string): string {
  if (pathname.startsWith('/game')) return 'Game';
  if (pathname.startsWith('/pregame')) return 'Pre-Game';
  if (pathname.startsWith('/postgame')) return 'Post-Game';
  if (pathname.startsWith('/season')) return 'Season';
  if (pathname.startsWith('/roster')) return 'Roster';
  if (pathname.startsWith('/schedule')) return 'Schedule';
  if (pathname.startsWith('/leaders')) return 'Leaders';
  if (pathname.startsWith('/awards')) return 'Awards';
  if (pathname.startsWith('/offseason')) return 'Offseason';
  if (pathname.startsWith('/museum')) return 'Museum';
  if (pathname.startsWith('/team')) return 'Team';
  if (pathname.startsWith('/league-builder')) return 'League';
  return 'Menu';
}
