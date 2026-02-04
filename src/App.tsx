import { Routes, Route } from 'react-router-dom';

// Global styles
import './styles/global.css';

import NavigationHeader from './components/NavigationHeader';
import NotFound from './pages/NotFound';

// Figma Design Pages (exhaustive UI replacement)
import { AppHome } from './src_figma/app/pages/AppHome';
import { FranchiseSetup } from './src_figma/app/pages/FranchiseSetup';
import { FranchiseHome } from './src_figma/app/pages/FranchiseHome';
import { GameTracker } from './src_figma/app/pages/GameTracker';
import { PostGameSummary } from './src_figma/app/pages/PostGameSummary';
import { ExhibitionGame } from './src_figma/app/pages/ExhibitionGame';
import { WorldSeries } from './src_figma/app/pages/WorldSeries';
import { LeagueBuilder } from './src_figma/app/pages/LeagueBuilder';

/**
 * KBL Tracker - Main App
 *
 * All routes use Figma-designed components which provide an exhaustive UI.
 * The FranchiseHome page includes all in-season, playoff, and offseason flows
 * as tabs and modals, so no separate routes are needed for:
 * - Season dashboard, Schedule, Roster, Leaders
 * - Awards ceremony flows
 * - Offseason flows (Free Agency, Draft, Trades, Retirements, etc.)
 * - Museum (Hall of Fame, Retired Numbers, etc.)
 *
 * Legacy pages are kept in src/pages/ and src/components/ for reference
 * but are no longer routed.
 */
function App() {
  return (
    <>
      <NavigationHeader />
      <Routes>
        {/* Main Menu - Figma Design */}
        <Route path="/" element={<AppHome />} />

        {/* Franchise Flow - Figma Design */}
        <Route path="/franchise/setup" element={<FranchiseSetup />} />
        <Route path="/franchise/:franchiseId" element={<FranchiseHome />} />

        {/* Game Flow - Figma Design */}
        <Route path="/game-tracker/:gameId" element={<GameTracker />} />
        <Route path="/post-game/:gameId" element={<PostGameSummary />} />

        {/* Exhibition Game - Figma Design */}
        <Route path="/exhibition" element={<ExhibitionGame />} />

        {/* Playoffs/World Series - Figma Design */}
        <Route path="/world-series" element={<WorldSeries />} />

        {/* League Builder - Figma Design */}
        <Route path="/league-builder" element={<LeagueBuilder />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
