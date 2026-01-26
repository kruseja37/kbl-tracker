/**
 * Career Stats Display Components
 * Per IMPLEMENTATION_PLAN.md v3 - Day 5: Career Aggregation Pipeline
 *
 * Displays career stats leaderboards and player cards.
 */

import React, { useState } from 'react';
import {
  useCareerStats,
  formatAvg,
  formatERA,
  formatIP,
  formatWAR,
  getCareerTierColor,
  type CareerBattingLeader,
  type CareerPitchingLeader,
} from '../../hooks/useCareerStats';

// ============================================
// CAREER BATTING LEADERBOARD
// ============================================

interface CareerBattingLeaderboardProps {
  sortBy?: 'war' | 'hr' | 'hits' | 'rbi';
  limit?: number;
  title?: string;
}

export function CareerBattingLeaderboard({
  sortBy = 'war',
  limit = 10,
  title,
}: CareerBattingLeaderboardProps) {
  const { leaderboards, isLoading, error, refresh } = useCareerStats();

  const sortKeyMap = {
    war: 'battingByWAR',
    hr: 'battingByHR',
    hits: 'battingByHits',
    rbi: 'battingByRBI',
  } as const;

  const data = leaderboards[sortKeyMap[sortBy]].slice(0, limit);
  const defaultTitle = `Career ${sortBy === 'war' ? 'WAR' : sortBy.toUpperCase()} Leaders`;

  if (isLoading) {
    return (
      <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#1f2937', color: '#9ca3af' }}>
        Loading career stats...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#1f2937', color: '#ef4444' }}>
        Error: {error}
        <button
          onClick={refresh}
          style={{
            marginLeft: '8px',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: '#374151',
            color: '#f3f4f6',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#1f2937', color: '#6b7280' }}>
        No career batting data yet. Play some games!
      </div>
    );
  }

  return (
    <div style={{ borderRadius: '8px', backgroundColor: '#1f2937', border: '1px solid #374151', overflow: 'hidden' }}>
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: '#111827',
          borderBottom: '1px solid #374151',
          fontWeight: 600,
          color: '#f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{title || defaultTitle}</span>
        <button
          onClick={refresh}
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: '#374151',
            color: '#9ca3af',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
          title="Refresh career stats"
        >
          ↻
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#9ca3af', fontSize: '0.75rem', textAlign: 'left' }}>
            <th style={{ padding: '8px 16px' }}>#</th>
            <th style={{ padding: '8px' }}>Player</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>G</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>HR</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>H</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>RBI</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>AVG</th>
            <th style={{ padding: '8px 16px', textAlign: 'right' }}>WAR</th>
          </tr>
        </thead>
        <tbody>
          {data.map((player, idx) => (
            <tr key={player.playerId} style={{ borderTop: '1px solid #374151', color: '#d1d5db' }}>
              <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: '0.85rem' }}>{idx + 1}</td>
              <td style={{ padding: '10px 8px' }}>
                <div style={{ fontWeight: 500 }}>{player.playerName}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{player.teamId}</div>
              </td>
              <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.85rem' }}>{player.games}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.85rem', color: getCareerTierColor('homeRuns', player.homeRuns) }}>
                {player.homeRuns}
              </td>
              <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.85rem', color: getCareerTierColor('hits', player.hits) }}>
                {player.hits}
              </td>
              <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.85rem', color: getCareerTierColor('rbi', player.rbi) }}>
                {player.rbi}
              </td>
              <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.85rem' }}>{formatAvg(player.avg)}</td>
              <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: getCareerTierColor('war', player.totalWAR ?? 0) }}>
                {formatWAR(player.totalWAR ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// CAREER PITCHING LEADERBOARD
// ============================================

interface CareerPitchingLeaderboardProps {
  sortBy?: 'war' | 'wins' | 'strikeouts' | 'saves';
  limit?: number;
  title?: string;
}

export function CareerPitchingLeaderboard({
  sortBy = 'war',
  limit = 10,
  title,
}: CareerPitchingLeaderboardProps) {
  const { leaderboards, isLoading, error, refresh } = useCareerStats();

  const sortKeyMap = {
    war: 'pitchingByWAR',
    wins: 'pitchingByWins',
    strikeouts: 'pitchingByStrikeouts',
    saves: 'pitchingBySaves',
  } as const;

  const data = leaderboards[sortKeyMap[sortBy]].slice(0, limit);
  const defaultTitle = `Career ${sortBy === 'war' ? 'pWAR' : sortBy.charAt(0).toUpperCase() + sortBy.slice(1)} Leaders`;

  if (isLoading) {
    return (
      <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#1f2937', color: '#9ca3af' }}>
        Loading career stats...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#1f2937', color: '#ef4444' }}>
        Error: {error}
        <button
          onClick={refresh}
          style={{
            marginLeft: '8px',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: '#374151',
            color: '#f3f4f6',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#1f2937', color: '#6b7280' }}>
        No career pitching data yet. Play some games!
      </div>
    );
  }

  return (
    <div style={{ borderRadius: '8px', backgroundColor: '#1f2937', border: '1px solid #374151', overflow: 'hidden' }}>
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: '#111827',
          borderBottom: '1px solid #374151',
          fontWeight: 600,
          color: '#f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{title || defaultTitle}</span>
        <button
          onClick={refresh}
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: '#374151',
            color: '#9ca3af',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
          title="Refresh career stats"
        >
          ↻
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#9ca3af', fontSize: '0.75rem', textAlign: 'left' }}>
            <th style={{ padding: '8px 16px' }}>#</th>
            <th style={{ padding: '8px' }}>Player</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>G</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>W</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>IP</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>K</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>ERA</th>
            <th style={{ padding: '8px 16px', textAlign: 'right' }}>WAR</th>
          </tr>
        </thead>
        <tbody>
          {data.map((player, idx) => (
            <tr key={player.playerId} style={{ borderTop: '1px solid #374151', color: '#d1d5db' }}>
              <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: '0.85rem' }}>{idx + 1}</td>
              <td style={{ padding: '10px 8px' }}>
                <div style={{ fontWeight: 500 }}>{player.playerName}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{player.teamId}</div>
              </td>
              <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.85rem' }}>{player.games}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.85rem', color: getCareerTierColor('wins', player.wins) }}>
                {player.wins}
              </td>
              <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.85rem' }}>{formatIP(player.ip)}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.85rem', color: getCareerTierColor('strikeouts', player.strikeouts) }}>
                {player.strikeouts}
              </td>
              <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.85rem' }}>{formatERA(player.era)}</td>
              <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: getCareerTierColor('war', player.pWAR ?? 0) }}>
                {formatWAR(player.pWAR ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// COMBINED CAREER PANEL
// ============================================

type CareerTab = 'batting' | 'pitching';
type BattingSort = 'war' | 'hr' | 'hits' | 'rbi';
type PitchingSort = 'war' | 'wins' | 'strikeouts' | 'saves';

interface CareerPanelProps {
  defaultTab?: CareerTab;
}

export function CareerPanel({ defaultTab = 'batting' }: CareerPanelProps) {
  const [activeTab, setActiveTab] = useState<CareerTab>(defaultTab);
  const [battingSort, setBattingSort] = useState<BattingSort>('war');
  const [pitchingSort, setPitchingSort] = useState<PitchingSort>('war');
  const { leaderboards, isLoading } = useCareerStats();

  const tabStyle = (isActive: boolean) => ({
    padding: '8px 16px',
    borderRadius: '4px 4px 0 0',
    backgroundColor: isActive ? '#1f2937' : 'transparent',
    color: isActive ? '#f3f4f6' : '#6b7280',
    border: 'none',
    borderBottom: isActive ? '2px solid #10b981' : '2px solid transparent',
    cursor: 'pointer',
    fontWeight: isActive ? 600 : 400,
  });

  const sortButtonStyle = (isActive: boolean) => ({
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: isActive ? '#374151' : 'transparent',
    color: isActive ? '#f3f4f6' : '#6b7280',
    border: '1px solid #374151',
    cursor: 'pointer',
    fontSize: '0.75rem',
  });

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '-1px' }}>
        <button style={tabStyle(activeTab === 'batting')} onClick={() => setActiveTab('batting')}>
          Career Batting
          {!isLoading && (
            <span style={{ marginLeft: '8px', fontSize: '0.75rem', opacity: 0.7 }}>
              ({leaderboards.battingByWAR.length})
            </span>
          )}
        </button>
        <button style={tabStyle(activeTab === 'pitching')} onClick={() => setActiveTab('pitching')}>
          Career Pitching
          {!isLoading && (
            <span style={{ marginLeft: '8px', fontSize: '0.75rem', opacity: 0.7 }}>
              ({leaderboards.pitchingByWAR.length})
            </span>
          )}
        </button>
      </div>

      {/* Sort Options */}
      <div style={{ padding: '8px 12px', backgroundColor: '#1f2937', borderBottom: '1px solid #374151', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Sort by:</span>
        {activeTab === 'batting' ? (
          <>
            <button style={sortButtonStyle(battingSort === 'war')} onClick={() => setBattingSort('war')}>WAR</button>
            <button style={sortButtonStyle(battingSort === 'hr')} onClick={() => setBattingSort('hr')}>HR</button>
            <button style={sortButtonStyle(battingSort === 'hits')} onClick={() => setBattingSort('hits')}>Hits</button>
            <button style={sortButtonStyle(battingSort === 'rbi')} onClick={() => setBattingSort('rbi')}>RBI</button>
          </>
        ) : (
          <>
            <button style={sortButtonStyle(pitchingSort === 'war')} onClick={() => setPitchingSort('war')}>WAR</button>
            <button style={sortButtonStyle(pitchingSort === 'wins')} onClick={() => setPitchingSort('wins')}>Wins</button>
            <button style={sortButtonStyle(pitchingSort === 'strikeouts')} onClick={() => setPitchingSort('strikeouts')}>K</button>
            <button style={sortButtonStyle(pitchingSort === 'saves')} onClick={() => setPitchingSort('saves')}>Saves</button>
          </>
        )}
      </div>

      {/* Content */}
      {activeTab === 'batting' ? (
        <CareerBattingLeaderboard sortBy={battingSort} limit={15} />
      ) : (
        <CareerPitchingLeaderboard sortBy={pitchingSort} limit={15} />
      )}
    </div>
  );
}

// ============================================
// EXPORTS
// ============================================

export default CareerPanel;
