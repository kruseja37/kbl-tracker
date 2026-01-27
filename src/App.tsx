import { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useSearchParams, useNavigate, useLocation } from 'react-router-dom';

// Global styles
import './styles/global.css';

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
import GoldGloveAwards from './components/awards/GoldGloveAwards';
import SilverSluggerAwards from './components/awards/SilverSluggerAwards';
import LeagueLeadersAward from './components/awards/LeagueLeadersAward';
import MVPReveal from './components/awards/MVPReveal';
import CyYoungReveal from './components/awards/CyYoungReveal';
import ROYReveal from './components/awards/ROYReveal';
import AwardsSummary from './components/awards/AwardsSummary';
import { getGoldGloveCandidates } from './services/fieldingStatsAggregator';

// Offseason
import OffseasonHub from './pages/OffseasonHub';
import EOSRatingsView from './pages/EOSRatingsView';
import RetirementsScreen from './pages/RetirementsScreen';
import FreeAgencyHub from './pages/FreeAgencyHub';
import DraftHub from './pages/DraftHub';
import TradeHub from './pages/TradeHub';
import SpringTrainingHub from './pages/SpringTrainingHub';
import ScheduleGenerationHub from './pages/ScheduleGenerationHub';

// Museum
import MuseumHub from './pages/MuseumHub';
import HallOfFameGallery from './components/museum/HallOfFameGallery';
import RetiredNumbersWall from './components/museum/RetiredNumbersWall';
import FranchiseRecords from './components/museum/FranchiseRecords';
import ChampionshipBanners from './components/museum/ChampionshipBanners';

// Player Management
import ManualPlayerInput from './components/ManualPlayerInput';

// League Management
import LeagueBuilder from './components/LeagueBuilder';

import { getTeam } from './data/playerDatabase';
import { getAllCustomPlayers, deleteCustomPlayer } from './utils/customPlayerStorage';
import { logFASigning, logTrade } from './utils/transactionStorage';

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

// Team filter options
const TEAM_FILTERS = [
  { value: 'all', label: 'All Players' },
  { value: 'sirloins', label: 'Sirloins' },
  { value: 'beewolves', label: 'Beewolves' },
  { value: 'my-team', label: 'Custom Players' },
];

// Wrapper for RosterView - loads custom players from storage
function RosterWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const [players, setPlayers] = useState<ReturnType<typeof getAllCustomPlayers>>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  // Load players on mount and whenever the location changes (e.g., returning from add-player)
  useEffect(() => {
    setPlayers(getAllCustomPlayers());
  }, [location.key]);

  // Filter players by team
  const filteredPlayers = selectedTeam === 'all'
    ? players
    : players.filter(p => p.teamId === selectedTeam);

  // Convert CustomPlayer to RosterPlayer format (extended with salary)
  const rosterPlayers = filteredPlayers.map(p => ({
    playerId: p.id,
    playerName: p.name,
    position: p.isPitcher ? 'SP' : p.position,
    secondaryPosition: p.secondaryPosition,
    age: p.age || 25,
    bats: p.bats,
    throws: p.throws,
    // Ratings
    power: p.batterRatings?.power,
    contact: p.batterRatings?.contact,
    speed: p.batterRatings?.speed,
    velocity: p.pitcherRatings?.velocity,
    junk: p.pitcherRatings?.junk,
    accuracy: p.pitcherRatings?.accuracy,
    // Extended fields
    salary: p.salary || 0,
    overall: p.overall,
    originalTeamId: p.teamId !== 'my-team' ? p.teamId : undefined,
  }));

  // Calculate total roster salary
  const totalSalary = rosterPlayers.reduce((sum, p) => sum + (p.salary || 0), 0);

  // Get display name for selected team
  const teamDisplayName = TEAM_FILTERS.find(t => t.value === selectedTeam)?.label || 'Roster';

  // Handle player deletion
  const handleDeletePlayer = (playerId: string) => {
    if (window.confirm('Are you sure you want to remove this player from your roster?')) {
      deleteCustomPlayer(playerId);
      setPlayers(getAllCustomPlayers()); // Refresh the list
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        {/* Team Filter */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {TEAM_FILTERS.map(team => (
              <button
                key={team.value}
                onClick={() => setSelectedTeam(team.value)}
                style={{
                  padding: '8px 16px',
                  background: selectedTeam === team.value
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    : '#1e293b',
                  border: selectedTeam === team.value ? '2px solid #60a5fa' : '2px solid #334155',
                  borderRadius: '8px',
                  color: selectedTeam === team.value ? '#fff' : '#94a3b8',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {team.label}
              </button>
            ))}
          </div>
        </div>

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
          {filteredPlayers.length > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Total Payroll</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fbbf24' }}>{formatSalary(totalSalary)}</div>
            </div>
          )}
        </div>
      </div>
      <RosterView
        players={rosterPlayers}
        teamName={teamDisplayName}
        showRatings={true}
        onDeletePlayer={handleDeletePlayer}
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
      onNavigateToAward={(awardId) => navigate(`/awards/${awardId}`)}
      completedAwards={[]}
      onSkipToSummary={() => navigate('/season')}
      seasonYear={2026}
    />
  );
}

// Wrapper for GoldGloveAwards - pulls data from fieldingStatsAggregator
function GoldGloveWrapper() {
  const navigate = useNavigate();
  const seasonId = 'season_2026'; // In production, get from GlobalState

  // Positions to get Gold Glove candidates for
  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'P'];

  // Get winners from fielding stats aggregator
  const winners = useMemo(() => {
    return positions.map(position => {
      const candidates = getGoldGloveCandidates(seasonId, position, 10);
      if (candidates.length === 0) {
        // No data - return placeholder
        return {
          playerId: `placeholder_${position}`,
          playerName: 'No Qualifying Players',
          teamName: '-',
          position,
          fwar: 0,
        };
      }
      const winner = candidates[0];
      const posStats = winner.positionStats.find(ps => ps.position === position);
      return {
        playerId: winner.playerId,
        playerName: winner.playerName,
        teamName: winner.teamId || 'Unknown',
        position,
        fwar: posStats?.uzr || 0,
        defensiveRunsSaved: posStats ? Math.round((posStats.putouts + posStats.assists - posStats.errors) / 10) : 0,
        fieldingPct: posStats?.fieldingPct,
      };
    });
  }, [seasonId]);

  return (
    <GoldGloveAwards
      winners={winners}
      onContinue={() => navigate('/awards/silverslugger')}
      onPlayerClick={(playerId) => console.log('[GoldGlove] Player clicked:', playerId)}
    />
  );
}

// Wrapper for SilverSluggerAwards
function SilverSluggerWrapper() {
  const navigate = useNavigate();

  // Placeholder winners - will be populated from storage in production
  const winners = useMemo(() => {
    const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
    return positions.map(position => ({
      playerId: `placeholder_${position}`,
      playerName: 'No Qualifying Players',
      teamName: '-',
      position,
      avg: 0,
      hr: 0,
      rbi: 0,
      ops: 0,
    }));
  }, []);

  return (
    <SilverSluggerAwards
      winners={winners}
      onContinue={() => navigate('/awards/mvp')}
      onPlayerClick={(playerId) => console.log('[SilverSlugger] Player clicked:', playerId)}
    />
  );
}

// Wrapper for LeagueLeadersAward
function LeagueLeadersWrapper2() {
  const navigate = useNavigate();

  // Placeholder data
  const placeholderLeader = {
    playerId: 'placeholder',
    playerName: 'No Data',
    teamName: '-',
    value: 0,
  };

  return (
    <LeagueLeadersAward
      battingLeaders={{
        avg: placeholderLeader,
        hr: placeholderLeader,
        rbi: placeholderLeader,
      }}
      pitchingLeaders={{
        era: placeholderLeader,
        wins: placeholderLeader,
        strikeouts: placeholderLeader,
      }}
      onContinue={() => navigate('/awards/goldglove')}
      onPlayerClick={(playerId) => console.log('[Leaders] Player clicked:', playerId)}
    />
  );
}

// Wrapper for MVPReveal
function MVPWrapper() {
  const navigate = useNavigate();

  const winner = useMemo(() => ({
    playerId: 'placeholder_mvp',
    playerName: 'No MVP Selected',
    teamName: '-',
    position: 'N/A',
    totalWar: 0,
    bwar: 0,
    fwar: 0,
    rwar: 0,
    seasonStats: {
      avg: 0,
      hr: 0,
      rbi: 0,
      runs: 0,
      sb: 0,
    },
  }), []);

  return (
    <MVPReveal
      winner={winner}
      onContinue={() => navigate('/awards/cyyoung')}
      onPlayerClick={(playerId) => console.log('[MVP] Player clicked:', playerId)}
    />
  );
}

// Wrapper for CyYoungReveal
function CyYoungWrapper() {
  const navigate = useNavigate();

  const winner = useMemo(() => ({
    playerId: 'placeholder_cyyoung',
    playerName: 'No Cy Young Selected',
    teamName: '-',
    pwar: 0,
    wins: 0,
    losses: 0,
    era: 0,
    strikeouts: 0,
    ip: 0,
    whip: 0,
  }), []);

  return (
    <CyYoungReveal
      winner={winner}
      onContinue={() => navigate('/awards/roy')}
      onPlayerClick={(playerId) => console.log('[CyYoung] Player clicked:', playerId)}
    />
  );
}

// Wrapper for ROYReveal
function ROYWrapper() {
  const navigate = useNavigate();

  const winner = useMemo(() => ({
    playerId: 'placeholder_roy',
    playerName: 'No ROY Selected',
    teamName: '-',
    age: 0,
    isPitcher: false,
    bwar: 0,
    avg: 0,
    hr: 0,
    rbi: 0,
    sb: 0,
  }), []);

  return (
    <ROYReveal
      winner={winner}
      onContinue={() => navigate('/awards/summary')}
      onPlayerClick={(playerId) => console.log('[ROY] Player clicked:', playerId)}
    />
  );
}

// Wrapper for AwardsSummary
function AwardsSummaryWrapper() {
  const navigate = useNavigate();

  return (
    <AwardsSummary
      winners={[]}
      totalFameAwarded={0}
      onPlayerClick={(playerId) => console.log('[Summary] Player clicked:', playerId)}
      onFinish={() => navigate('/offseason')}
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

  const handleSignPlayer = (playerId: string, years: number) => {
    const player = freeAgents.find(fa => fa.playerId === playerId);
    if (!player) return;

    // Update state
    setSignedPlayers(prev => [...prev, playerId]);
    setCapSpace(prev => prev - player.salary);
    setFreeAgents(prev => prev.filter(fa => fa.playerId !== playerId));

    // Log the transaction
    logFASigning(
      1, // Current season - in production, get from GlobalState
      player.playerId,
      player.playerName,
      null, // Old team (FA has no team)
      'user-team', // New team - in production, get from GlobalState
      player.salary
    ).then(() => {
      console.log(`[Free Agency] Signed ${player.playerName} for ${years}yr / $${(player.salary * years / 1000000).toFixed(1)}M total`);
    });
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

// Wrapper for TradeHub - includes transaction logging for completed trades
function TradeWrapper() {
  const navigate = useNavigate();
  const [completedTrades, setCompletedTrades] = useState<{
    tradeId: string;
    otherTeamId: string;
    otherTeamName: string;
    sentPlayers: { playerId: string; playerName: string }[];
    receivedPlayers: { playerId: string; playerName: string }[];
    completedAt: Date;
  }[]>([]);

  // Handler for when a trade is executed (would be called from trade proposal flow)
  const handleTradeExecuted = (
    team1: string,
    team2: string,
    playersFromTeam1: { playerId: string; playerName: string }[],
    playersFromTeam2: { playerId: string; playerName: string }[]
  ) => {
    // Log the transaction
    logTrade(
      1, // Current season - in production, get from GlobalState
      null, // Offseason trade
      team1,
      team2,
      playersFromTeam1.map(p => p.playerId),
      playersFromTeam2.map(p => p.playerId)
    ).then(() => {
      console.log(`[Trade Hub] Trade executed: ${playersFromTeam1.length} players ↔ ${playersFromTeam2.length} players`);
    });

    // Update local state
    const newTrade = {
      tradeId: `trade_${Date.now()}`,
      otherTeamId: team2,
      otherTeamName: team2,
      sentPlayers: playersFromTeam1,
      receivedPlayers: playersFromTeam2,
      completedAt: new Date(),
    };
    setCompletedTrades(prev => [...prev, newTrade]);
  };

  return (
    <TradeHub
      pendingTrades={[]}
      completedTrades={completedTrades}
      userTeamName="My Team"
      onNewTrade={() => console.log('[Trade Hub] New trade requested')}
      onViewTrade={(tradeId) => console.log('[Trade Hub] View trade:', tradeId)}
      onContinue={() => navigate('/offseason')}
    />
  );
}

// Demo data for Spring Training
const DEMO_SPRING_TRAINING_PLAYERS = [
  { playerId: 'st1', playerName: 'Jake Hammer', position: 'SS', age: 22, isPitcher: false, power: 65, contact: 72, speed: 78 },
  { playerId: 'st2', playerName: 'Mike Power', position: '1B', age: 28, isPitcher: false, power: 88, contact: 70, speed: 45 },
  { playerId: 'st3', playerName: 'Tom Swift', position: 'CF', age: 34, isPitcher: false, power: 55, contact: 68, speed: 72 },
  { playerId: 'st4', playerName: 'Ace Fireball', position: 'SP', age: 26, isPitcher: true, velocity: 92, junk: 65, accuracy: 78 },
  { playerId: 'st5', playerName: 'Old Reliable', position: 'RP', age: 38, isPitcher: true, velocity: 75, junk: 82, accuracy: 85 },
];

// Wrapper for SpringTrainingHub
function SpringTrainingWrapper() {
  const navigate = useNavigate();
  return (
    <SpringTrainingHub
      players={DEMO_SPRING_TRAINING_PLAYERS}
      teamName="My Team"
      onComplete={() => navigate('/offseason/schedule-gen')}
    />
  );
}

// Demo teams for schedule generation
const DEMO_TEAMS = [
  { teamId: 'sirloins', teamName: 'Sirloins' },
  { teamId: 'beewolves', teamName: 'Beewolves' },
  { teamId: 'blowfish', teamName: 'Blowfish' },
  { teamId: 'overdogs', teamName: 'Overdogs' },
];

// Wrapper for ScheduleGenerationHub
function ScheduleGenerationWrapper() {
  const navigate = useNavigate();
  return (
    <ScheduleGenerationHub
      teams={DEMO_TEAMS}
      currentSeason={1}
      onStartSeason={(schedule, seasonLength) => {
        console.log(`[Schedule Gen] Created ${schedule.length} games, ${seasonLength} per team`);
        navigate('/season');
      }}
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

// Wrapper for Hall of Fame Gallery
function HallOfFameWrapper() {
  const navigate = useNavigate();
  return (
    <HallOfFameGallery
      members={[]}
      onMemberClick={(playerId) => navigate(`/player/${playerId}`)}
      onBack={() => navigate('/museum')}
    />
  );
}

// Wrapper for Retired Numbers Wall
function RetiredNumbersWrapper() {
  const navigate = useNavigate();
  return (
    <RetiredNumbersWall
      numbers={[]}
      onNumberClick={(playerId) => navigate(`/player/${playerId}`)}
      onBack={() => navigate('/museum')}
    />
  );
}

// Wrapper for Franchise Records
function FranchiseRecordsWrapper() {
  const navigate = useNavigate();
  return (
    <FranchiseRecords
      records={[]}
      onPlayerClick={(playerId) => navigate(`/player/${playerId}`)}
      onBack={() => navigate('/museum')}
    />
  );
}

// Wrapper for Championship Banners
function ChampionshipBannersWrapper() {
  const navigate = useNavigate();
  return (
    <ChampionshipBanners
      championships={[]}
      onBannerClick={(seasonId) => navigate(`/season/${seasonId}`)}
      onMvpClick={(playerId) => navigate(`/player/${playerId}`)}
      onBack={() => navigate('/museum')}
    />
  );
}

// Wrapper for LeagueBuilder
function LeagueBuilderWrapper() {
  const navigate = useNavigate();
  return (
    <LeagueBuilder
      onSuccess={(leagueId) => {
        console.log(`[League Builder] Created league: ${leagueId}`);
        navigate('/season');
      }}
      onCancel={() => navigate('/')}
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
        <Route path="/awards/leaders" element={<LeagueLeadersWrapper2 />} />
        <Route path="/awards/goldglove" element={<GoldGloveWrapper />} />
        <Route path="/awards/silverslugger" element={<SilverSluggerWrapper />} />
        <Route path="/awards/mvp" element={<MVPWrapper />} />
        <Route path="/awards/cyyoung" element={<CyYoungWrapper />} />
        <Route path="/awards/roy" element={<ROYWrapper />} />
        <Route path="/awards/summary" element={<AwardsSummaryWrapper />} />

        {/* Offseason */}
        <Route path="/offseason" element={<OffseasonWrapper />} />
        <Route path="/offseason/ratings" element={<EOSRatingsWrapper />} />
        <Route path="/offseason/retirements" element={<RetirementsWrapper />} />
        <Route path="/offseason/free-agency" element={<FreeAgencyWrapper />} />
        <Route path="/offseason/draft" element={<DraftWrapper />} />
        <Route path="/offseason/trades" element={<TradeWrapper />} />
        <Route path="/offseason/spring-training" element={<SpringTrainingWrapper />} />
        <Route path="/offseason/schedule-gen" element={<ScheduleGenerationWrapper />} />

        {/* Museum */}
        <Route path="/museum" element={<MuseumWrapper />} />
        <Route path="/museum/hof" element={<HallOfFameWrapper />} />
        <Route path="/museum/retired" element={<RetiredNumbersWrapper />} />
        <Route path="/museum/records" element={<FranchiseRecordsWrapper />} />
        <Route path="/museum/championships" element={<ChampionshipBannersWrapper />} />

        {/* League Builder */}
        <Route path="/league-builder" element={<LeagueBuilderWrapper />} />

        {/* Team */}
        <Route path="/team/:id" element={<TeamPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
