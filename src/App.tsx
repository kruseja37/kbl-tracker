import { Routes, Route } from 'react-router-dom';
import NavigationHeader from './components/NavigationHeader';
import MainMenu from './pages/MainMenu';
import GamePage from './pages/GamePage';
import SeasonPage from './pages/SeasonPage';
import TeamPage from './pages/TeamPage';
import NotFound from './pages/NotFound';

function App() {
  return (
    <>
      <NavigationHeader />
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/season" element={<SeasonPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/team/:id" element={<TeamPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
