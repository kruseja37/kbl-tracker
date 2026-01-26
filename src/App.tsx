import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import GameTracker from './components/GameTracker';
import { useDataIntegrity } from './hooks/useDataIntegrity';
import { getOrCreateSeason } from './utils/seasonStorage';

function App() {
  const dataIntegrity = useDataIntegrity();
  const [seasonReady, setSeasonReady] = useState(false);

  // Ensure season exists on app startup (fixes BUG-004/BUG-005)
  // This must happen BEFORE GameTracker mounts so WAR hooks find data
  useEffect(() => {
    async function ensureSeason() {
      try {
        await getOrCreateSeason(
          'season-2026',
          1,
          '2026 Season',
          48 // SMB4 default season length
        );
        console.log('[App] Season initialized: season-2026');
        setSeasonReady(true);
      } catch (err) {
        console.error('[App] Failed to initialize season:', err);
        setSeasonReady(true); // Continue anyway to not block UI
      }
    }
    ensureSeason();
  }, []);

  // Auto-recover unaggregated games on startup
  useEffect(() => {
    if (dataIntegrity.status.checked && dataIntegrity.status.needsAggregation > 0) {
      console.log(`[App] Found ${dataIntegrity.status.needsAggregation} games needing aggregation, starting recovery...`);
      dataIntegrity.recoverUnaggregatedGames();
    }
  }, [dataIntegrity.status.checked, dataIntegrity.status.needsAggregation, dataIntegrity.recoverUnaggregatedGames]);

  // Wait for season to be initialized
  if (!seasonReady) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#1a1a2e',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#fff',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚾</div>
          <div style={{ color: '#888' }}>Initializing season...</div>
        </div>
      </div>
    );
  }

  // Show recovery banner if recovering
  if (dataIntegrity.isRecovering) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#1a1a2e',
      }}>
        {/* Recovery Banner */}
        <div style={{
          backgroundColor: '#f59e0b',
          color: '#000',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}>
          <div style={{ fontSize: '20px' }}>🔄</div>
          <div>
            <strong>Recovering game data...</strong>
            <span style={{ marginLeft: '8px' }}>
              ({dataIntegrity.recoveryProgress.current} / {dataIntegrity.recoveryProgress.total})
            </span>
          </div>
        </div>

        {/* Loading state while recovering */}
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#fff',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚾</div>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>Recovering Game Data</div>
            <div style={{ color: '#888' }}>
              Processing game {dataIntegrity.recoveryProgress.current} of {dataIntegrity.recoveryProgress.total}...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error banner if there were integrity errors
  const showErrorBanner = dataIntegrity.status.checked && dataIntegrity.status.hasErrors > 0;
  const showIncompleteWarning = dataIntegrity.status.checked && dataIntegrity.status.incompleteGames > 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e' }}>
      {/* Error Banner */}
      {showErrorBanner && (
        <div style={{
          backgroundColor: '#ef4444',
          color: '#fff',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '14px',
        }}>
          <span>⚠️</span>
          <span>
            {dataIntegrity.status.hasErrors} game(s) had aggregation errors.
            Stats may be incomplete.
          </span>
          <button
            onClick={() => dataIntegrity.recoverUnaggregatedGames()}
            style={{
              marginLeft: '12px',
              padding: '4px 12px',
              backgroundColor: '#fff',
              color: '#ef4444',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Incomplete Games Warning */}
      {showIncompleteWarning && !showErrorBanner && (
        <div style={{
          backgroundColor: '#3b82f6',
          color: '#fff',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '14px',
        }}>
          <span>ℹ️</span>
          <span>
            {dataIntegrity.status.incompleteGames} incomplete game(s) found.
            Resume or finish these games to preserve data.
          </span>
        </div>
      )}

      <Routes>
        <Route path="/" element={<GameTracker />} />
      </Routes>
    </div>
  );
}

export default App;
