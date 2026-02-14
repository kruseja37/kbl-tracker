/**
 * HallOfFameGallery - Hall of Fame members display
 * Per Ralph Framework S-G002
 *
 * Features:
 * - All HOF members listed
 * - Plaque-style display
 * - Career summary with stats
 */

interface HOFMember {
  playerId: string;
  playerName: string;
  position: string;
  inductionYear: number;
  yearsActive: string; // e.g., "2024-2035"
  careerWAR: number;
  keyStats: { label: string; value: string }[];
  awards: string[];
  teamNames: string[];
}

interface HallOfFameGalleryProps {
  members: HOFMember[];
  onMemberClick?: (playerId: string) => void;
  onBack?: () => void;
}

export default function HallOfFameGallery({
  members,
  onMemberClick,
  onBack,
}: HallOfFameGalleryProps) {
  const sortedMembers = [...members].sort(
    (a, b) => b.inductionYear - a.inductionYear
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
        <div style={styles.hofIcon}>🏛️</div>
        <h1 style={styles.title}>Hall of Fame</h1>
        <p style={styles.subtitle}>
          {members.length} {members.length === 1 ? 'legend' : 'legends'} enshrined
        </p>
      </div>

      {/* Gallery Grid */}
      <div style={styles.gallery}>
        {sortedMembers.map((member) => (
          <div
            key={member.playerId}
            style={styles.plaque}
            onClick={() => onMemberClick?.(member.playerId)}
          >
            {/* Plaque Header */}
            <div style={styles.plaqueHeader}>
              <div style={styles.portraitPlaceholder}>
                <span style={styles.portraitIcon}>👤</span>
              </div>
              <div style={styles.plaqueTitle}>
                <span style={styles.playerName}>{member.playerName}</span>
                <span style={styles.position}>{member.position}</span>
              </div>
            </div>

            {/* Induction Info */}
            <div style={styles.inductionBadge}>
              Class of {member.inductionYear}
            </div>

            {/* Career WAR */}
            <div style={styles.warSection}>
              <span style={styles.warValue}>{member.careerWAR.toFixed(1)}</span>
              <span style={styles.warLabel}>Career WAR</span>
            </div>

            {/* Years Active */}
            <div style={styles.yearsActive}>{member.yearsActive}</div>

            {/* Key Stats */}
            <div style={styles.statsGrid}>
              {member.keyStats.slice(0, 4).map((stat, idx) => (
                <div key={idx} style={styles.statItem}>
                  <span style={styles.statValue}>{stat.value}</span>
                  <span style={styles.statLabel}>{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Awards */}
            {member.awards.length > 0 && (
              <div style={styles.awards}>
                {member.awards.slice(0, 3).map((award, idx) => (
                  <span key={idx} style={styles.awardBadge}>
                    {award}
                  </span>
                ))}
                {member.awards.length > 3 && (
                  <span style={styles.moreAwards}>+{member.awards.length - 3}</span>
                )}
              </div>
            )}

            {/* Teams */}
            <div style={styles.teams}>
              {member.teamNames.join(' • ')}
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>🌟</span>
          <span>No Hall of Famers yet</span>
          <span style={styles.emptySubtext}>
            Players with 40+ career WAR become eligible
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
  hofIcon: {
    fontSize: '3rem',
    marginBottom: '12px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '2rem',
    fontWeight: 900,
    color: '#fbbf24',
  },
  subtitle: {
    margin: 0,
    fontSize: '1rem',
    color: '#94a3b8',
  },
  gallery: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  plaque: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '24px',
    border: '2px solid #fbbf24',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  plaqueHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px',
  },
  portraitPlaceholder: {
    width: '60px',
    height: '60px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitIcon: {
    fontSize: '2rem',
    opacity: 0.5,
  },
  plaqueTitle: {
    display: 'flex',
    flexDirection: 'column',
  },
  playerName: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#fff',
  },
  position: {
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  inductionBadge: {
    display: 'inline-block',
    padding: '6px 16px',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: '100px',
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: '#fbbf24',
    marginBottom: '16px',
  },
  warSection: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    marginBottom: '8px',
  },
  warValue: {
    fontSize: '1.75rem',
    fontWeight: 900,
    color: '#22c55e',
  },
  warLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  yearsActive: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    marginBottom: '16px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
  },
  statValue: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  statLabel: {
    fontSize: '0.5625rem',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  awards: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '12px',
  },
  awardBadge: {
    padding: '4px 10px',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderRadius: '100px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#a855f7',
  },
  moreAwards: {
    fontSize: '0.75rem',
    color: '#64748b',
    alignSelf: 'center',
  },
  teams: {
    fontSize: '0.75rem',
    color: '#64748b',
    textAlign: 'center',
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
