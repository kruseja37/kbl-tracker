import { Routes, Route } from 'react-router-dom';
import NavigationHeader from './components/NavigationHeader';
import MainMenu from './pages/MainMenu';
import GamePage from './pages/GamePage';
import PreGameScreen from './pages/PreGameScreen';
import SeasonDashboard from './pages/SeasonDashboard';
import TeamPage from './pages/TeamPage';
import NotFound from './pages/NotFound';

function App() {
  return (
    <>
      <NavigationHeader />
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/season" element={<SeasonDashboard />} />
        <Route path="/pregame" element={
          <PreGameScreen
            awayTeamId="sirloins"
            homeTeamId="beewolves"
            stadiumName="Emerald Diamond"
            onStartGame={() => {}}
          />
        } />
        <Route path="/game" element={<GamePage />} />
        <Route path="/team/:id" element={<TeamPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
