/**
 * LeagueNewsFeed - League news and happenings
 * Per Ralph Framework S-F012
 *
 * Features:
 * - Stories listed chronologically
 * - Team filter
 * - Story types: trades, milestones, injuries, signings
 */

import { useState, useMemo } from 'react';

export type NewsStoryType =
  | 'TRADE'
  | 'MILESTONE'
  | 'INJURY'
  | 'SIGNING'
  | 'RETIREMENT'
  | 'AWARD'
  | 'RECORD'
  | 'ACHIEVEMENT';

export interface NewsStory {
  storyId: string;
  type: NewsStoryType;
  headline: string;
  body: string;
  teamIds: string[];
  teamNames: string[];
  playerIds: string[];
  playerNames: string[];
  timestamp: number;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface LeagueNewsFeedProps {
  stories: NewsStory[];
  teams: { teamId: string; teamName: string }[];
  onPlayerClick?: (playerId: string) => void;
  onTeamClick?: (teamId: string) => void;
}

const STORY_ICONS: Record<NewsStoryType, string> = {
  TRADE: '🔄',
  MILESTONE: '🏆',
  INJURY: '🩹',
  SIGNING: '✍️',
  RETIREMENT: '👋',
  AWARD: '🏅',
  RECORD: '📊',
  ACHIEVEMENT: '⭐',
};

const STORY_COLORS: Record<NewsStoryType, string> = {
  TRADE: '#3b82f6',
  MILESTONE: '#fbbf24',
  INJURY: '#ef4444',
  SIGNING: '#22c55e',
  RETIREMENT: '#a855f7',
  AWARD: '#fbbf24',
  RECORD: '#06b6d4',
  ACHIEVEMENT: '#22c55e',
};

export default function LeagueNewsFeed({
  stories,
  teams,
  onPlayerClick,
  onTeamClick,
}: LeagueNewsFeedProps) {
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterType, setFilterType] = useState<NewsStoryType | 'all'>('all');

  const filteredStories = useMemo(() => {
    let result = [...stories];

    // Team filter
    if (filterTeam !== 'all') {
      result = result.filter((s) => s.teamIds.includes(filterTeam));
    }

    // Type filter
    if (filterType !== 'all') {
      result = result.filter((s) => s.type === filterType);
    }

    // Sort by timestamp (most recent first)
    result.sort((a, b) => b.timestamp - a.timestamp);

    return result;
  }, [stories, filterTeam, filterType]);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>📰</span>
        <h2 style={styles.title}>League News</h2>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">All Teams</option>
          {teams.map((team) => (
            <option key={team.teamId} value={team.teamId}>
              {team.teamName}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as NewsStoryType | 'all')}
          style={styles.filterSelect}
        >
          <option value="all">All Types</option>
          <option value="TRADE">Trades</option>
          <option value="MILESTONE">Milestones</option>
          <option value="SIGNING">Signings</option>
          <option value="INJURY">Injuries</option>
          <option value="RETIREMENT">Retirements</option>
          <option value="AWARD">Awards</option>
          <option value="RECORD">Records</option>
          <option value="ACHIEVEMENT">Achievements</option>
        </select>
      </div>

      {/* Story Count */}
      <div style={styles.storyCount}>
        {filteredStories.length} {filteredStories.length === 1 ? 'story' : 'stories'}
      </div>

      {/* Stories List */}
      <div style={styles.storiesList}>
        {filteredStories.map((story) => (
          <div
            key={story.storyId}
            style={{
              ...styles.storyCard,
              borderLeftColor: STORY_COLORS[story.type],
            }}
          >
            {/* Story Header */}
            <div style={styles.storyHeader}>
              <div style={styles.storyTypeBadge}>
                <span style={styles.storyIcon}>{STORY_ICONS[story.type]}</span>
                <span
                  style={{
                    ...styles.storyTypeLabel,
                    color: STORY_COLORS[story.type],
                  }}
                >
                  {story.type}
                </span>
              </div>
              <div style={styles.storyTimestamp}>
                {formatDate(story.timestamp)} • {formatTime(story.timestamp)}
              </div>
            </div>

            {/* Headline */}
            <h3 style={styles.headline}>{story.headline}</h3>

            {/* Body */}
            <p style={styles.body}>{story.body}</p>

            {/* Related */}
            <div style={styles.relatedSection}>
              {/* Teams */}
              {story.teamNames.length > 0 && (
                <div style={styles.relatedRow}>
                  {story.teamNames.map((name, idx) => (
                    <button
                      key={idx}
                      style={styles.teamTag}
                      onClick={() => onTeamClick?.(story.teamIds[idx])}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}

              {/* Players */}
              {story.playerNames.length > 0 && (
                <div style={styles.relatedRow}>
                  {story.playerNames.map((name, idx) => (
                    <button
                      key={idx}
                      style={styles.playerTag}
                      onClick={() => onPlayerClick?.(story.playerIds[idx])}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Importance Indicator */}
            {story.importance === 'HIGH' && (
              <div style={styles.importanceBadge}>🔥 Breaking</div>
            )}
          </div>
        ))}
      </div>

      {filteredStories.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>📭</span>
          <span>No news to display</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #334155',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  headerIcon: {
    fontSize: '1.5rem',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#fff',
  },
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  filterSelect: {
    padding: '8px 12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  storyCount: {
    fontSize: '0.8125rem',
    color: '#64748b',
    marginBottom: '16px',
  },
  storiesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxHeight: '600px',
    overflowY: 'auto',
  },
  storyCard: {
    backgroundColor: '#0f172a',
    borderRadius: '12px',
    padding: '16px',
    borderLeft: '4px solid',
  },
  storyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  storyTypeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  storyIcon: {
    fontSize: '1rem',
  },
  storyTypeLabel: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  storyTimestamp: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  headline: {
    margin: '0 0 8px 0',
    fontSize: '1rem',
    fontWeight: 700,
    color: '#fff',
    lineHeight: 1.3,
  },
  body: {
    margin: '0 0 12px 0',
    fontSize: '0.875rem',
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  relatedSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  relatedRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  teamTag: {
    padding: '4px 10px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    border: 'none',
    borderRadius: '100px',
    color: '#3b82f6',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  playerTag: {
    padding: '4px 10px',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    border: 'none',
    borderRadius: '100px',
    color: '#22c55e',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  importanceBadge: {
    marginTop: '12px',
    padding: '4px 10px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#ef4444',
    display: 'inline-block',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '40px 20px',
    color: '#64748b',
  },
  emptyIcon: {
    fontSize: '2rem',
  },
};
