import { Routes, Route } from 'react-router-dom';
import GamePage from './pages/GamePage';
import SeasonPage from './pages/SeasonPage';
import TeamPage from './pages/TeamPage';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Routes>
      <Route path="/" element={<GamePage />} />
      <Route path="/season" element={<SeasonPage />} />
      <Route path="/game" element={<GamePage />} />
      <Route path="/team/:id" element={<TeamPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
