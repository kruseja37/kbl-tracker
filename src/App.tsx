import { useState, useEffect } from 'react';
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

// Player Management
import ManualPlayerInput from './components/ManualPlayerInput';

import { getTeam } from './data/playerDatabase';
import { getAllCustomPlayers } from './utils/customPlayerStorage';

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

// Format salary for display
function formatSalary(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  }
  return `$${(amount / 1000).toFixed(0)}K`;
}

// Wrapper for RosterView - loads custom players from storage
function RosterWrapper() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<ReturnType<typeof getAllCustomPlayers>>([]);

  // Load players on mount
  useEffect(() => {
    setPlayers(getAllCustomPlayers());
  }, []);

  // Convert CustomPlayer to RosterPlayer format (extended with salary)
  const rosterPlayers = players.map(p => ({
    playerId: p.id,
    playerName: p.name,
    position: p.isPitcher ? 'SP' : p.position,
    secondaryPosition: p.secondaryPosition,
    age: p.age || 25,
    bats: p.bats,
    throws: p.throws,
    // Ratings
    power: p.batterRatings.power,
    contact: p.batterRatings.contact,
    speed: p.batterRatings.speed,
    velocity: p.pitcherRatings?.velocity,
    junk: p.pitcherRatings?.junk,
    accuracy: p.pitcherRatings?.accuracy,
    // Extended fields
    salary: p.salary || 0,
    overall: p.overall,
    originalTeamId: p.originalTeamId,
  }));

  // Calculate total roster salary
  const totalSalary = rosterPlayers.reduce((sum, p) => sum + (p.salary || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button
            onClick={() => navigate('/add-player')}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + Add Player
          </button>
          {players.length > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Total Payroll</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fbbf24' }}>{formatSalary(totalSalary)}</div>
            </div>
          )}
        </div>
      </div>
      <RosterView
        players={rosterPlayers}
        teamName="My Team Roster"
        showRatings={true}
      />
    </div>
  );
}

// Wrapper for ManualPlayerInput - add player page
function AddPlayerWrapper() {
  const navigate = useNavigate();
  return (
    <ManualPlayerInput
      onSuccess={() => navigate('/roster')}
      onCancel={() => navigate('/roster')}
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

// Sample free agents for demonstration
const DEMO_FREE_AGENTS = [
  {
    playerId: 'fa_001',
    playerName: 'Marcus Sullivan',
    position: 'CF',
    age: 28,
    overall: 'A-',
    salary: 8500000,
    isPitcher: false,
    power: 72,
    contact: 81,
    speed: 88,
    lastSeasonWAR: 3.2,
  },
  {
    playerId: 'fa_002',
    playerName: 'Jake Morrison',
    position: 'SP',
    age: 31,
    overall: 'B+',
    salary: 12000000,
    isPitcher: true,
    velocity: 84,
    junk: 78,
    accuracy: 82,
    lastSeasonWAR: 2.8,
  },
  {
    playerId: 'fa_003',
    playerName: 'Carlos Reyes',
    position: '1B',
    age: 26,
    overall: 'B+',
    salary: 4200000,
    isPitcher: false,
    power: 85,
    contact: 68,
    speed: 42,
    lastSeasonWAR: 1.9,
  },
  {
    playerId: 'fa_004',
    playerName: 'Tyrone Williams',
    position: 'SS',
    age: 24,
    overall: 'B',
    salary: 3100000,
    isPitcher: false,
    power: 58,
    contact: 74,
    speed: 79,
    lastSeasonWAR: 1.4,
  },
  {
    playerId: 'fa_005',
    playerName: 'Mike Patterson',
    position: 'RP',
    age: 29,
    overall: 'B+',
    salary: 5500000,
    isPitcher: true,
    velocity: 91,
    junk: 65,
    accuracy: 76,
    lastSeasonWAR: 1.1,
  },
];

// Wrapper for FreeAgencyHub
function FreeAgencyWrapper() {
  const navigate = useNavigate();
  const [freeAgents, setFreeAgents] = useState(DEMO_FREE_AGENTS);
  const [capSpace, setCapSpace] = useState(50000000);
  const [signedPlayers, setSignedPlayers] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState(1);

  const handleSignPlayer = (playerId: string) => {
    const player = freeAgents.find(fa => fa.playerId === playerId);
    if (!player) return;

    // Update state
    setSignedPlayers(prev => [...prev, playerId]);
    setCapSpace(prev => prev - player.salary);
    setFreeAgents(prev => prev.filter(fa => fa.playerId !== playerId));

    // Show confirmation (in production, this would use a toast)
    console.log(`[Free Agency] Signed ${player.playerName} for $${(player.salary / 1000000).toFixed(1)}M`);
    alert(`Signed ${player.playerName} to your team for $${(player.salary / 1000000).toFixed(1)}M/year!`);
  };

  const handleContinue = () => {
    if (currentRound < 3) {
      setCurrentRound(prev => prev + 1);
    } else {
      navigate('/offseason');
    }
  };

  return (
    <FreeAgencyHub
      freeAgents={freeAgents}
      currentRound={currentRound}
      totalRounds={3}
      capSpace={capSpace}
      onSignPlayer={handleSignPlayer}
      onContinue={handleContinue}
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
        <Route path="/add-player" element={<AddPlayerWrapper />} />
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
