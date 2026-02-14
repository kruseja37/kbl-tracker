/**
 * MuseumHub - Franchise history museum
 * Per Ralph Framework S-G001
 *
 * Features:
 * - Navigation to HOF, Retired Numbers, Records, Championships
 * - Featured highlights
 * - Gallery-style clean layout
 */

interface FeaturedItem {
  id: string;
  type: 'HOF' | 'RECORD' | 'CHAMPIONSHIP' | 'RETIRED_NUMBER';
  title: string;
  subtitle: string;
  year?: number;
}

interface MuseumHubProps {
  teamName: string;
  featuredItems: FeaturedItem[];
  hofCount: number;
  retiredNumberCount: number;
  championshipCount: number;
  onNavigate: (section: 'hof' | 'retired' | 'records' | 'championships') => void;
  onFeaturedClick?: (itemId: string, type: string) => void;
}

export default function MuseumHub({
  teamName,
  featuredItems,
  hofCount,
  retiredNumberCount,
  championshipCount,
  onNavigate,
  onFeaturedClick,
}: MuseumHubProps) {
  const sections = [
    { id: 'hof', icon: '🏛️', label: 'Hall of Fame', count: hofCount, color: '#fbbf24' },
    { id: 'retired', icon: '🏆', label: 'Retired Numbers', count: retiredNumberCount, color: '#a855f7' },
    { id: 'records', icon: '📊', label: 'Franchise Records', count: null, color: '#3b82f6' },
    { id: 'championships', icon: '🏆', label: 'Championship Banners', count: championshipCount, color: '#22c55e' },
  ] as const;

  const getTypeIcon = (type: FeaturedItem['type']): string => {
    switch (type) {
      case 'HOF': return '🏛️';
      case 'RECORD': return '📊';
      case 'CHAMPIONSHIP': return '🏆';
      case 'RETIRED_NUMBER': return '👕';
      default: return '⭐';
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.museumIcon}>🏛️</div>
        <h1 style={styles.title}>{teamName} Museum</h1>
        <p style={styles.subtitle}>Celebrating our franchise history</p>
      </div>

      {/* Section Navigation */}
      <div style={styles.sectionGrid}>
        {sections.map((section) => (
          <button
            key={section.id}
            style={styles.sectionCard}
            onClick={() => onNavigate(section.id)}
          >
            <span style={styles.sectionIcon}>{section.icon}</span>
            <span style={styles.sectionLabel}>{section.label}</span>
            {section.count !== null && (
              <span style={{ ...styles.sectionCount, color: section.color }}>
                {section.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Featured Items */}
      {featuredItems.length > 0 && (
        <div style={styles.featuredSection}>
          <h2 style={styles.featuredTitle}>Featured Highlights</h2>
          <div style={styles.featuredGrid}>
            {featuredItems.map((item) => (
              <div
                key={item.id}
                style={styles.featuredCard}
                onClick={() => onFeaturedClick?.(item.id, item.type)}
              >
                <span style={styles.featuredIcon}>{getTypeIcon(item.type)}</span>
                <div style={styles.featuredContent}>
                  <span style={styles.featuredItemTitle}>{item.title}</span>
                  <span style={styles.featuredItemSubtitle}>{item.subtitle}</span>
                  {item.year && (
                    <span style={styles.featuredItemYear}>{item.year}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {hofCount === 0 && retiredNumberCount === 0 && championshipCount === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>🌟</span>
          <span style={styles.emptyText}>Start building your legacy</span>
          <span style={styles.emptySubtext}>
            Win championships, develop Hall of Famers, and create history!
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
  museumIcon: {
    fontSize: '4rem',
    marginBottom: '16px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '2rem',
    fontWeight: 900,
    color: '#fff',
  },
  subtitle: {
    margin: 0,
    fontSize: '1rem',
    color: '#94a3b8',
  },
  sectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    maxWidth: '900px',
    margin: '0 auto 40px',
  },
  sectionCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '24px 16px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  sectionIcon: {
    fontSize: '2.5rem',
  },
  sectionLabel: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#fff',
  },
  sectionCount: {
    fontSize: '1.5rem',
    fontWeight: 900,
  },
  featuredSection: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  featuredTitle: {
    margin: '0 0 20px 0',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#fff',
  },
  featuredGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  featuredCard: {
    display: 'flex',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  featuredIcon: {
    fontSize: '2rem',
    flexShrink: 0,
  },
  featuredContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  featuredItemTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#fff',
  },
  featuredItemSubtitle: {
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  featuredItemYear: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '4px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '4rem',
  },
  emptyText: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#fff',
  },
  emptySubtext: {
    fontSize: '0.875rem',
    color: '#64748b',
    maxWidth: '300px',
  },
};
