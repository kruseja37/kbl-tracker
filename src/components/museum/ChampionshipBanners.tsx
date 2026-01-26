/**
 * ChampionshipBanners - Championship banners display
 * Per Ralph Framework S-G005
 *
 * Features:
 * - Banners displayed for each championship
 * - Year visible on banner
 * - Click for season summary
 */

import { useState } from 'react';

interface Championship {
  championshipId: string;
  year: number;
  seasonId: string;
  opponent: string;
  seriesResult: string; // e.g., "4-2"
  mvpName?: string;
  mvpPlayerId?: string;
  teamRecord?: string; // e.g., "42-8"
}

interface ChampionshipBannersProps {
  championships: Championship[];
  onBannerClick?: (seasonId: string) => void;
  onMvpClick?: (playerId: string) => void;
  onBack?: () => void;
}

export default function ChampionshipBanners({
  championships,
  onBannerClick,
  onMvpClick,
  onBack,
}: ChampionshipBannersProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sortedChampionships = [...championships].sort((a, b) => b.year - a.year);

  const selectedChampionship = sortedChampionships.find(
    (c) => c.championshipId === selectedId
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        {onBack && (
          <button style={styles.backButton} onClick={onBack}>
            ← Back to Museum
          </button>
        )}
        <div style={styles.icon}>🏆</div>
        <h1 style={styles.title}>Championship Banners</h1>
        <p style={styles.subtitle}>
          {championships.length} title{championships.length !== 1 ? 's' : ''} won
        </p>
      </div>

      {/* Banners Display */}
      <div style={styles.bannersRow}>
        {sortedChampionships.map((champ) => (
          <div
            key={champ.championshipId}
            style={{
              ...styles.banner,
              borderColor:
                selectedId === champ.championshipId ? '#fbbf24' : '#22c55e',
              transform:
                selectedId === champ.championshipId ? 'scale(1.05)' : 'scale(1)',
            }}
            onClick={() => {
              setSelectedId(
                selectedId === champ.championshipId ? null : champ.championshipId
              );
            }}
          >
            <div style={styles.bannerTop}>
              <span style={styles.trophyIcon}>🏆</span>
            </div>
            <div style={styles.bannerYear}>{champ.year}</div>
            <div style={styles.bannerLabel}>CHAMPIONS</div>
          </div>
        ))}
      </div>

      {/* Selected Championship Detail */}
      {selectedChampionship && (
        <div style={styles.detailCard}>
          <h2 style={styles.detailTitle}>
            {selectedChampionship.year} Championship
          </h2>

          <div style={styles.detailGrid}>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Series Result</span>
              <span style={styles.detailValue}>
                {selectedChampionship.seriesResult}
              </span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Opponent</span>
              <span style={styles.detailValue}>
                {selectedChampionship.opponent}
              </span>
            </div>
            {selectedChampionship.teamRecord && (
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Season Record</span>
                <span style={styles.detailValue}>
                  {selectedChampionship.teamRecord}
                </span>
              </div>
            )}
            {selectedChampionship.mvpName && (
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Series MVP</span>
                <button
                  style={styles.mvpButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedChampionship.mvpPlayerId) {
                      onMvpClick?.(selectedChampionship.mvpPlayerId);
                    }
                  }}
                >
                  {selectedChampionship.mvpName}
                </button>
              </div>
            )}
          </div>

          <button
            style={styles.viewSeasonButton}
            onClick={() => onBannerClick?.(selectedChampionship.seasonId)}
          >
            View {selectedChampionship.year} Season
          </button>
        </div>
      )}

      {championships.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>🏆</span>
          <span>No championships yet</span>
          <span style={styles.emptySubtext}>
            Win the World Series to hang your first banner!
          </span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '0.875rem',
    cursor: 'pointer',
    marginBottom: '24px',
  },
  icon: {
    fontSize: '3rem',
    marginBottom: '12px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '2rem',
    fontWeight: 900,
    color: '#22c55e',
  },
  subtitle: {
    margin: 0,
    fontSize: '1rem',
    color: '#94a3b8',
  },
  bannersRow: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '24px',
    marginBottom: '40px',
  },
  banner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '120px',
    padding: '20px 16px',
    backgroundColor: '#22c55e',
    borderRadius: '0 0 60px 60px',
    border: '3px solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  bannerTop: {
    marginBottom: '8px',
  },
  trophyIcon: {
    fontSize: '2rem',
  },
  bannerYear: {
    fontSize: '1.5rem',
    fontWeight: 900,
    color: '#0f172a',
    marginBottom: '4px',
  },
  bannerLabel: {
    fontSize: '0.5rem',
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  detailCard: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '24px',
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    border: '1px solid #334155',
  },
  detailTitle: {
    margin: '0 0 20px 0',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#fff',
    textAlign: 'center',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
  },
  detailLabel: {
    fontSize: '0.6875rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  detailValue: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#fff',
  },
  mvpButton: {
    padding: '4px 12px',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    border: 'none',
    borderRadius: '100px',
    color: '#fbbf24',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  viewSeasonButton: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.9375rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '60px 20px',
    color: '#64748b',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '3rem',
  },
  emptySubtext: {
    fontSize: '0.875rem',
    maxWidth: '280px',
  },
};
