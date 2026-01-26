import { Routes, Route, useSearchParams, useNavigate } from 'react-router-dom';
import NavigationHeader from './components/NavigationHeader';
import MainMenu from './pages/MainMenu';
import GamePage from './pages/GamePage';
import PreGameScreen from './pages/PreGameScreen';
import PostGameScreen from './pages/PostGameScreen';
import SeasonDashboard from './pages/SeasonDashboard';
import TeamPage from './pages/TeamPage';
import NotFound from './pages/NotFound';

// Season views
import ScheduleView from './pages/ScheduleView';
import RosterView from './pages/RosterView';
import LeagueLeadersView from './pages/LeagueLeadersView';
import StatsByParkView from './pages/StatsByParkView';

// Awards
import AwardsCeremonyHub from './pages/AwardsCeremonyHub';

// Offseason
import OffseasonHub from './pages/OffseasonHub';
import EOSRatingsView from './pages/EOSRatingsView';
import RetirementsScreen from './pages/RetirementsScreen';
import FreeAgencyHub from './pages/FreeAgencyHub';
import DraftHub from './pages/DraftHub';
import TradeHub from './pages/TradeHub';

// Museum
import MuseumHub from './pages/MuseumHub';

import { getTeam } from './data/playerDatabase';

// Wrapper to handle URL params for PreGameScreen
function PreGameWrapper() {
  const [searchParams] = useSearchParams();
  const awayTeamId = searchParams.get('away') || 'sirloins';
  const homeTeamId = searchParams.get('home') || 'beewolves';
  const awayPitcherId = searchParams.get('awayPitcher') || undefined;
  const homePitcherId = searchParams.get('homePitcher') || undefined;

  const homeTeam = getTeam(homeTeamId);
  const stadiumName = homeTeam?.homePark || 'Home Stadium';

  return (
    <PreGameScreen
      awayTeamId={awayTeamId}
      homeTeamId={homeTeamId}
      awayStarterId={awayPitcherId}
      homeStarterId={homePitcherId}
      stadiumName={stadiumName}
      onStartGame={() => {}}
    />
  );
}

// Wrapper for ScheduleView
function ScheduleWrapper() {
  return (
    <ScheduleView
      games={[]}
      teams={[]}
      currentGameNumber={1}
    />
  );
}

// Wrapper for RosterView
function RosterWrapper() {
  return (
    <RosterView
      players={[]}
      teamName="My Team"
    />
  );
}

// Wrapper for LeagueLeadersView
function LeadersWrapper() {
  return (
    <LeagueLeadersView
      batters={[]}
      pitchers={[]}
      gamesPlayed={0}
    />
  );
}

// Wrapper for StatsByParkView
function StatsByParkWrapper() {
  return (
    <StatsByParkView
      playerName="Select a player"
      homeStadium=""
      stadiumStats={[]}
      onBack={() => window.history.back()}
    />
  );
}

// Wrapper for AwardsCeremonyHub
function AwardsWrapper() {
  const navigate = useNavigate();
  return (
    <AwardsCeremonyHub
      onNavigateToAward={() => {}}
      completedAwards={[]}
      onSkipToSummary={() => navigate('/season')}
      seasonYear={2026}
    />
  );
}

// Wrapper for OffseasonHub
function OffseasonWrapper() {
  const navigate = useNavigate();
  return (
    <OffseasonHub
      currentPhase={1}
      completedPhases={[]}
      onNavigate={(route) => navigate(route)}
    />
  );
}

// Wrapper for EOSRatingsView
function EOSRatingsWrapper() {
  const navigate = useNavigate();
  return (
    <EOSRatingsView
      changes={[]}
      onContinue={() => navigate('/offseason')}
    />
  );
}

// Wrapper for RetirementsScreen
function RetirementsWrapper() {
  const navigate = useNavigate();
  return (
    <RetirementsScreen
      retirees={[]}
      onContinue={() => navigate('/offseason')}
    />
  );
}

// Wrapper for FreeAgencyHub
function FreeAgencyWrapper() {
  const navigate = useNavigate();
  return (
    <FreeAgencyHub
      freeAgents={[]}
      currentRound={1}
      totalRounds={3}
      capSpace={50000000}
      onSignPlayer={() => {}}
      onContinue={() => navigate('/offseason')}
    />
  );
}

// Wrapper for DraftHub
function DraftWrapper() {
  const navigate = useNavigate();
  return (
    <DraftHub
      draftOrder={[]}
      prospects={[]}
      userTeamId="user"
      currentPick={1}
      round={1}
      totalRounds={3}
      onDraftPlayer={() => {}}
      onContinue={() => navigate('/offseason')}
    />
  );
}

// Wrapper for TradeHub
function TradeWrapper() {
  const navigate = useNavigate();
  return (
    <TradeHub
      pendingTrades={[]}
      completedTrades={[]}
      userTeamName="My Team"
      onNewTrade={() => {}}
      onViewTrade={() => {}}
      onContinue={() => navigate('/offseason')}
    />
  );
}

// Wrapper for MuseumHub
function MuseumWrapper() {
  const navigate = useNavigate();
  return (
    <MuseumHub
      teamName="My Team"
      featuredItems={[]}
      hofCount={0}
      retiredNumberCount={0}
      championshipCount={0}
      onNavigate={(section) => {
        navigate(`/museum/${section}`);
      }}
    />
  );
}

function App() {
  return (
    <>
      <NavigationHeader />
      <Routes>
        {/* Main */}
        <Route path="/" element={<MainMenu />} />

        {/* Game Flow */}
        <Route path="/pregame" element={<PreGameWrapper />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/postgame" element={<PostGameScreen />} />

        {/* Season */}
        <Route path="/season" element={<SeasonDashboard />} />
        <Route path="/schedule" element={<ScheduleWrapper />} />
        <Route path="/roster" element={<RosterWrapper />} />
        <Route path="/leaders" element={<LeadersWrapper />} />
        <Route path="/stats-by-park" element={<StatsByParkWrapper />} />

        {/* Awards */}
        <Route path="/awards" element={<AwardsWrapper />} />

        {/* Offseason */}
        <Route path="/offseason" element={<OffseasonWrapper />} />
        <Route path="/offseason/ratings" element={<EOSRatingsWrapper />} />
        <Route path="/offseason/retirements" element={<RetirementsWrapper />} />
        <Route path="/offseason/free-agency" element={<FreeAgencyWrapper />} />
        <Route path="/offseason/draft" element={<DraftWrapper />} />
        <Route path="/offseason/trades" element={<TradeWrapper />} />

        {/* Museum */}
        <Route path="/museum" element={<MuseumWrapper />} />

        {/* Team */}
        <Route path="/team/:id" element={<TeamPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
