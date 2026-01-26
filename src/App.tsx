import { Routes, Route, useSearchParams } from 'react-router-dom';
import NavigationHeader from './components/NavigationHeader';
import MainMenu from './pages/MainMenu';
import GamePage from './pages/GamePage';
import PreGameScreen from './pages/PreGameScreen';
import PostGameScreen from './pages/PostGameScreen';
import SeasonDashboard from './pages/SeasonDashboard';
import TeamPage from './pages/TeamPage';
import NotFound from './pages/NotFound';
import { getTeam } from './data/playerDatabase';

// Wrapper to handle URL params for PreGameScreen
function PreGameWrapper() {
  const [searchParams] = useSearchParams();
  const awayTeamId = searchParams.get('away') || 'sirloins';
  const homeTeamId = searchParams.get('home') || 'beewolves';
  const awayPitcherId = searchParams.get('awayPitcher') || undefined;
  const homePitcherId = searchParams.get('homePitcher') || undefined;

  // Get home team's stadium name
  const homeTeam = getTeam(homeTeamId);
  const stadiumName = homeTeam?.homePark || 'Home Stadium';

  return (
    <PreGameScreen
      awayTeamId={awayTeamId}
      homeTeamId={homeTeamId}
      awayStarterId={awayPitcherId}
      homeStarterId={homePitcherId}
      stadiumName={stadiumName}
      onStartGame={() => {
        // TODO: Store selected teams in context for GamePage
      }}
    />
  );
}

function App() {
  return (
    <>
      <NavigationHeader />
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/season" element={<SeasonDashboard />} />
        <Route path="/pregame" element={<PreGameWrapper />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/postgame" element={<PostGameScreen />} />
        <Route path="/team/:id" element={<TeamPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
