/**
 * LeagueLeadersView - League statistical leaders
 * Per Ralph Framework S-C006, S-C007
 *
 * Features:
 * - Batting leaders (AVG, HR, RBI)
 * - Pitching leaders (ERA, W, K)
 * - Top 10 per category
 * - Qualification rules applied
 * - "Q" badge for qualified players
 */

import { useMemo, useState } from 'react';

interface PlayerStats {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  // Batting stats
  games?: number;
  pa?: number;
  ab?: number;
  hits?: number;
  hr?: number;
  rbi?: number;
  avg?: number;
  obp?: number;
  slg?: number;
  // Pitching stats
  ip?: number;
  wins?: number;
  losses?: number;
  saves?: number;
  era?: number;
  whip?: number;
  strikeouts?: number;
}

interface LeagueLeadersViewProps {
  batters: PlayerStats[];
  pitchers: PlayerStats[];
  gamesPlayed: number; // Team games played for qualification calc
  onPlayerClick?: (playerId: string) => void;
}

type BattingCategory = 'avg' | 'hr' | 'rbi' | 'hits' | 'obp' | 'slg';
type PitchingCategory = 'era' | 'wins' | 'strikeouts' | 'saves' | 'whip';

export default function LeagueLeadersView({
  batters,
  pitchers,
  gamesPlayed,
  onPlayerClick,
}: LeagueLeadersViewProps) {
  const [activeBattingCategory, setActiveBattingCategory] = useState<BattingCategory>('avg');
  const [activePitchingCategory, setActivePitchingCategory] = useState<PitchingCategory>('era');

  // Qualification thresholds
  const battingQualPA = Math.floor(gamesPlayed * 3.1);
  const pitchingQualIP = gamesPlayed;

  // Check if batter qualifies
  const isBatterQualified = (player: PlayerStats): boolean => {
    return (player.pa || 0) >= battingQualPA;
  };

  // Check if pitcher qualifies
  const isPitcherQualified = (player: PlayerStats): boolean => {
    return (player.ip || 0) >= pitchingQualIP;
  };

  // Get batting leaders for a category
  const getBattingLeaders = (category: BattingCategory, limit: number = 10) => {
    const sorted = [...batters]
      .filter((p) => {
        // For rate stats, require qualification
        if (['avg', 'obp', 'slg'].includes(category)) {
          return isBatterQualified(p);
        }
        return (p[category] ?? 0) > 0;
      })
      .sort((a, b) => {
        const aVal = a[category] ?? 0;
        const bVal = b[category] ?? 0;
        return bVal - aVal;
      })
      .slice(0, limit);

    return sorted;
  };

  // Get pitching leaders for a category
  const getPitchingLeaders = (category: PitchingCategory, limit: number = 10) => {
    const sorted = [...pitchers]
      .filter((p) => {
        // For rate stats, require qualification
        if (['era', 'whip'].includes(category)) {
          return isPitcherQualified(p);
        }
        return (p[category] ?? 0) > 0;
      })
      .sort((a, b) => {
        const aVal = a[category] ?? 0;
        const bVal = b[category] ?? 0;
        // ERA and WHIP are lower-is-better
        if (['era', 'whip'].includes(category)) {
          return aVal - bVal;
        }
        return bVal - aVal;
      })
      .slice(0, limit);

    return sorted;
  };

  const battingLeaders = useMemo(
    () => getBattingLeaders(activeBattingCategory),
    [batters, activeBattingCategory, battingQualPA]
  );

  const pitchingLeaders = useMemo(
    () => getPitchingLeaders(activePitchingCategory),
    [pitchers, activePitchingCategory, pitchingQualIP]
  );

  const formatStat = (value: number | undefined, category: string): string => {
    if (value === undefined) return '-';
    if (['avg', 'obp', 'slg'].includes(category)) {
      return value.toFixed(3).replace(/^0/, '');
    }
    if (['era', 'whip'].includes(category)) {
      return value.toFixed(2);
    }
    if (category === 'ip') {
      // Format IP (e.g., 45.2 for 45 innings + 2 outs)
      const fullInnings = Math.floor(value);
      const outs = Math.round((value - fullInnings) * 10);
      return `${fullInnings}.${outs}`;
    }
    return Math.round(value).toString();
  };

  const battingCategories: { key: BattingCategory; label: string }[] = [
    { key: 'avg', label: 'AVG' },
    { key: 'hr', label: 'HR' },
    { key: 'rbi', label: 'RBI' },
    { key: 'hits', label: 'H' },
    { key: 'obp', label: 'OBP' },
    { key: 'slg', label: 'SLG' },
  ];

  const pitchingCategories: { key: PitchingCategory; label: string }[] = [
    { key: 'era', label: 'ERA' },
    { key: 'wins', label: 'W' },
    { key: 'strikeouts', label: 'K' },
    { key: 'saves', label: 'SV' },
    { key: 'whip', label: 'WHIP' },
  ];

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>League Leaders</h1>

      {/* Qualification Note */}
      <div style={styles.qualNote}>
        Batting: {battingQualPA} PA minimum • Pitching: {pitchingQualIP} IP minimum
      </div>

      <div style={styles.sectionsGrid}>
        {/* Batting Leaders */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            <span>🏏</span> Batting Leaders
          </h2>

          {/* Category Tabs */}
          <div style={styles.categoryTabs}>
            {battingCategories.map((cat) => (
              <button
                key={cat.key}
                style={{
                  ...styles.categoryTab,
                  ...(activeBattingCategory === cat.key ? styles.categoryTabActive : {}),
                }}
                onClick={() => setActiveBattingCategory(cat.key)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Leaders List */}
          <div style={styles.leadersList}>
            {battingLeaders.map((player, index) => (
              <div
                key={player.playerId}
                style={styles.leaderRow}
                onClick={() => onPlayerClick?.(player.playerId)}
              >
                <div style={styles.rank}>{index + 1}</div>
                <div style={styles.playerInfo}>
                  <span style={styles.playerName}>
                    {player.playerName}
                    {isBatterQualified(player) && (
                      <span style={styles.qualBadge}>Q</span>
                    )}
                  </span>
                  <span style={styles.teamName}>{player.teamName}</span>
                </div>
                <div style={styles.statValue}>
                  {formatStat(player[activeBattingCategory], activeBattingCategory)}
                </div>
              </div>
            ))}
            {battingLeaders.length === 0 && (
              <div style={styles.empty}>No qualified batters yet</div>
            )}
          </div>
        </div>

        {/* Pitching Leaders */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            <span>⚾</span> Pitching Leaders
          </h2>

          {/* Category Tabs */}
          <div style={styles.categoryTabs}>
            {pitchingCategories.map((cat) => (
              <button
                key={cat.key}
                style={{
                  ...styles.categoryTab,
                  ...(activePitchingCategory === cat.key ? styles.categoryTabActive : {}),
                }}
                onClick={() => setActivePitchingCategory(cat.key)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Leaders List */}
          <div style={styles.leadersList}>
            {pitchingLeaders.map((player, index) => (
              <div
                key={player.playerId}
                style={styles.leaderRow}
                onClick={() => onPlayerClick?.(player.playerId)}
              >
                <div style={styles.rank}>{index + 1}</div>
                <div style={styles.playerInfo}>
                  <span style={styles.playerName}>
                    {player.playerName}
                    {isPitcherQualified(player) && (
                      <span style={styles.qualBadge}>Q</span>
                    )}
                  </span>
                  <span style={styles.teamName}>{player.teamName}</span>
                </div>
                <div style={styles.statValue}>
                  {formatStat(player[activePitchingCategory], activePitchingCategory)}
                </div>
              </div>
            ))}
            {pitchingLeaders.length === 0 && (
              <div style={styles.empty}>No qualified pitchers yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  pageTitle: {
    margin: '0 0 8px 0',
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#fff',
  },
  qualNote: {
    fontSize: '0.8125rem',
    color: '#64748b',
    marginBottom: '24px',
  },
  sectionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
  },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #334155',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  categoryTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '16px',
  },
  categoryTab: {
    padding: '6px 12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  categoryTabActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    color: '#fff',
  },
  leadersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  leaderRow: {
    display: 'grid',
    gridTemplateColumns: '32px 1fr 60px',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  rank: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#64748b',
  },
  playerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  playerName: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  teamName: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  statValue: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#22c55e',
    textAlign: 'right',
  },
  qualBadge: {
    fontSize: '0.625rem',
    fontWeight: 700,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: '#22c55e',
    padding: '2px 5px',
    borderRadius: '3px',
  },
  empty: {
    padding: '20px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '0.875rem',
  },
};
