/**
 * WAR Display Components
 * Per IMPLEMENTATION_PLAN.md v2 - Day 2: WAR Pipeline
 *
 * Displays bWAR/pWAR values and leaderboards.
 */

import React, { useState } from 'react';
import {
  useWARCalculations,
  formatWAR,
  getWARColor,
  getWARTier,
  type PlayerBWAR,
  type PlayerPWAR,
  type PlayerFWAR,
  type PlayerRWAR,
  type PlayerTotalWAR,
} from '../../hooks/useWARCalculations';
import {
  useClutchCalculations,
  type PlayerClutchDisplay,
} from '../../hooks/useClutchCalculations';

// ============================================
// SINGLE PLAYER WAR BADGE
// ============================================

interface WARBadgeProps {
  war: number;
  label?: string;
  seasonGames?: number;
  showTier?: boolean;
}

/**
 * Simple WAR badge for inline display
 */
export function WARBadge({ war, label = 'WAR', seasonGames = 48, showTier = false }: WARBadgeProps) {
  const color = getWARColor(war);
  const tier = getWARTier(war, seasonGames);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '4px',
        backgroundColor: `${color}20`,
        color: color,
        fontWeight: 600,
        fontSize: '0.85rem',
      }}
      title={showTier ? tier : `${label}: ${formatWAR(war)}`}
    >
      <span style={{ opacity: 0.8, fontSize: '0.75rem' }}>{label}</span>
      {formatWAR(war)}
      {showTier && (
        <span style={{ fontSize: '0.7rem', opacity: 0.7, marginLeft: '4px' }}>
          ({tier})
        </span>
      )}
    </span>
  );
}

// ============================================
// PLAYER WAR CARD
// ============================================

interface PlayerWARCardProps {
  playerId: string;
  playerName: string;
  showBreakdown?: boolean;
}

/**
 * WAR card for a single player showing bWAR and/or pWAR
 */
export function PlayerWARCard({ playerId, playerName, showBreakdown = false }: PlayerWARCardProps) {
  const { getPlayerBWAR, getPlayerPWAR, seasonGames, isLoading } = useWARCalculations();

  if (isLoading) {
    return <div style={{ padding: '8px', color: '#6b7280' }}>Loading WAR...</div>;
  }

  const bwarData = getPlayerBWAR(playerId);
  const pwarData = getPlayerPWAR(playerId);

  if (!bwarData && !pwarData) {
    return <div style={{ padding: '8px', color: '#6b7280' }}>No WAR data</div>;
  }

  return (
    <div
      style={{
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: '#1f2937',
        border: '1px solid #374151',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: '8px', color: '#f3f4f6' }}>
        {playerName}
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {bwarData && (
          <WARBadge war={bwarData.bWAR} label="bWAR" seasonGames={seasonGames} />
        )}
        {pwarData && (
          <WARBadge war={pwarData.pWAR} label="pWAR" seasonGames={seasonGames} />
        )}
      </div>

      {showBreakdown && bwarData && (
        <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#9ca3af' }}>
          <div>wOBA: {bwarData.wOBA.toFixed(3)}</div>
          <div>wRAA: {bwarData.wRAA.toFixed(1)}</div>
          <div>PA: {bwarData.pa}</div>
        </div>
      )}

      {showBreakdown && pwarData && (
        <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#9ca3af' }}>
          <div>FIP: {pwarData.fip.toFixed(2)}</div>
          <div>IP: {pwarData.ip.toFixed(1)}</div>
          <div>Role: {pwarData.role}</div>
        </div>
      )}
    </div>
  );
}

// ============================================
// WAR LEADERBOARD
// ============================================

interface WARLeaderboardProps {
  type: 'batting' | 'pitching';
  limit?: number;
  title?: string;
}

/**
 * Leaderboard showing top players by WAR
 */
export function WARLeaderboard({ type, limit = 10, title }: WARLeaderboardProps) {
  const { leaderboards, seasonGames, isLoading, error, refresh } = useWARCalculations();

  const data = type === 'batting' ? leaderboards.battingWAR : leaderboards.pitchingWAR;
  const displayData = data.slice(0, limit);
  const defaultTitle = type === 'batting' ? 'Batting WAR Leaders' : 'Pitching WAR Leaders';

  if (isLoading) {
    return (
      <div
        style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: '#1f2937',
          color: '#9ca3af',
        }}
      >
        Loading leaderboard...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: '#1f2937',
          color: '#ef4444',
        }}
      >
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

  if (displayData.length === 0) {
    return (
      <div
        style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: '#1f2937',
          color: '#6b7280',
        }}
      >
        No {type} data yet. Play some games!
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: '8px',
        backgroundColor: '#1f2937',
        border: '1px solid #374151',
        overflow: 'hidden',
      }}
    >
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
          title="Refresh WAR calculations"
        >
          ↻
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#9ca3af', fontSize: '0.75rem', textAlign: 'left' }}>
            <th style={{ padding: '8px 16px' }}>#</th>
            <th style={{ padding: '8px' }}>Player</th>
            {type === 'batting' ? (
              <>
                <th style={{ padding: '8px', textAlign: 'right' }}>PA</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>wOBA</th>
              </>
            ) : (
              <>
                <th style={{ padding: '8px', textAlign: 'right' }}>IP</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>FIP</th>
              </>
            )}
            <th style={{ padding: '8px 16px', textAlign: 'right' }}>WAR</th>
          </tr>
        </thead>
        <tbody>
          {displayData.map((player, idx) => {
            const war = type === 'batting'
              ? (player as PlayerBWAR).bWAR
              : (player as PlayerPWAR).pWAR;
            const color = getWARColor(war);

            return (
              <tr
                key={player.playerId}
                style={{
                  borderTop: '1px solid #374151',
                  color: '#d1d5db',
                }}
              >
                <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: '0.85rem' }}>
                  {idx + 1}
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <div style={{ fontWeight: 500 }}>{player.playerName}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {player.teamId}
                  </div>
                </td>
                {type === 'batting' ? (
                  <>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.85rem' }}>
                      {(player as PlayerBWAR).pa}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.85rem' }}>
                      {(player as PlayerBWAR).wOBA.toFixed(3)}
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.85rem' }}>
                      {(player as PlayerPWAR).ip.toFixed(1)}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.85rem' }}>
                      {(player as PlayerPWAR).fip.toFixed(2)}
                    </td>
                  </>
                )}
                <td
                  style={{
                    padding: '10px 16px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: color,
                  }}
                >
                  {formatWAR(war)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// EXTENDED LEADERBOARD (supports all WAR types)
// ============================================

type WARTabType = 'batting' | 'pitching' | 'fielding' | 'baserunning' | 'total' | 'clutch';

interface WARLeaderboardExtendedProps {
  type: WARTabType;
  limit?: number;
}

/**
 * Leaderboard that supports all WAR types (batting, pitching, fielding, baserunning, total)
 */
function WARLeaderboardExtended({ type, limit = 10 }: WARLeaderboardExtendedProps) {
  const { leaderboards, isLoading, error, refresh } = useWARCalculations();

  // Get the right data based on type
  const getData = () => {
    switch (type) {
      case 'batting': return leaderboards.battingWAR;
      case 'pitching': return leaderboards.pitchingWAR;
      case 'fielding': return leaderboards.fieldingWAR;
      case 'baserunning': return leaderboards.baserunningWAR;
      case 'total': return leaderboards.totalWAR;
      case 'clutch': return []; // Clutch handled by ClutchLeaderboard component
    }
  };

  const data = getData();
  const displayData = data.slice(0, limit);

  const titles: Record<WARTabType, string> = {
    batting: 'Batting WAR Leaders',
    pitching: 'Pitching WAR Leaders',
    fielding: 'Fielding WAR Leaders',
    baserunning: 'Baserunning WAR Leaders',
    total: 'Total WAR Leaders',
    clutch: 'Clutch Leaders', // Handled by ClutchLeaderboard
  };

  if (isLoading) {
    return (
      <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#1f2937', color: '#9ca3af' }}>
        Loading leaderboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#1f2937', color: '#ef4444' }}>
        Error: {error}
        <button onClick={refresh} style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#374151', color: '#f3f4f6', border: 'none', cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    );
  }

  if (displayData.length === 0) {
    return (
      <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#1f2937', color: '#6b7280' }}>
        No {type} data yet. Play some games!
      </div>
    );
  }

  // Get WAR value based on type
  const getWAR = (player: PlayerBWAR | PlayerPWAR | PlayerFWAR | PlayerRWAR | PlayerTotalWAR): number => {
    switch (type) {
      case 'batting': return (player as PlayerBWAR).bWAR;
      case 'pitching': return (player as PlayerPWAR).pWAR;
      case 'fielding': return (player as PlayerFWAR).fWAR;
      case 'baserunning': return (player as PlayerRWAR).rWAR;
      case 'total': return (player as PlayerTotalWAR).totalWAR;
      case 'clutch': return 0; // Clutch handled by ClutchLeaderboard
    }
  };

  // Get secondary stat columns based on type
  const getColumns = () => {
    switch (type) {
      case 'batting': return ['PA', 'wOBA'];
      case 'pitching': return ['IP', 'FIP'];
      case 'fielding': return ['G', 'Runs Saved'];
      case 'baserunning': return ['wSB', 'wGDP'];
      case 'total': return ['bWAR', 'fWAR'];
      case 'clutch': return ['PA', 'LI']; // Clutch handled by ClutchLeaderboard
    }
  };

  const getSecondaryValues = (player: PlayerBWAR | PlayerPWAR | PlayerFWAR | PlayerRWAR | PlayerTotalWAR): [string, string] => {
    switch (type) {
      case 'batting': {
        const p = player as PlayerBWAR;
        return [String(p.pa), p.wOBA.toFixed(3)];
      }
      case 'pitching': {
        const p = player as PlayerPWAR;
        return [p.ip.toFixed(1), p.fip.toFixed(2)];
      }
      case 'fielding': {
        const p = player as PlayerFWAR;
        return [String(p.games), p.runsSaved.toFixed(1)];
      }
      case 'baserunning': {
        const p = player as PlayerRWAR;
        return [p.wSB.toFixed(2), p.wGDP.toFixed(2)];
      }
      case 'total': {
        const p = player as PlayerTotalWAR;
        return [p.bWAR.toFixed(1), p.fWAR.toFixed(1)];
      }
      case 'clutch': return ['0', '0']; // Clutch handled by ClutchLeaderboard
    }
  };

  const columns = getColumns();

  return (
    <div style={{ borderRadius: '8px', backgroundColor: '#1f2937', border: '1px solid #374151', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', backgroundColor: '#111827', borderBottom: '1px solid #374151', fontWeight: 600, color: '#f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span>{titles[type]}</span>
          <span style={{ fontSize: '0.65rem', color: '#6b7280', marginLeft: '8px', fontWeight: 400 }}>
            (updates after game ends)
          </span>
        </div>
        <button onClick={refresh} style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#374151', color: '#9ca3af', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }} title="Refresh WAR calculations">
          ↻
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#9ca3af', fontSize: '0.75rem', textAlign: 'left' }}>
            <th style={{ padding: '8px 16px' }}>#</th>
            <th style={{ padding: '8px' }}>Player</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>{columns[0]}</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>{columns[1]}</th>
            <th style={{ padding: '8px 16px', textAlign: 'right' }}>WAR</th>
          </tr>
        </thead>
        <tbody>
          {displayData.map((player, idx) => {
            const war = getWAR(player);
            const color = getWARColor(war);
            const [val1, val2] = getSecondaryValues(player);

            return (
              <tr key={player.playerId} style={{ borderTop: '1px solid #374151', color: '#d1d5db' }}>
                <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: '0.85rem' }}>{idx + 1}</td>
                <td style={{ padding: '10px 8px' }}>
                  <div style={{ fontWeight: 500 }}>{player.playerName}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{player.teamId}</div>
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.85rem' }}>{val1}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.85rem' }}>{val2}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color }}>{formatWAR(war)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// CLUTCH LEADERBOARD
// ============================================

interface ClutchLeaderboardProps {
  limit?: number;
}

/**
 * Leaderboard showing top players by clutch rating
 */
function ClutchLeaderboard({ limit = 10 }: ClutchLeaderboardProps) {
  const { clutchLeaderboard, isLoading } = useClutchCalculations();

  const displayData = clutchLeaderboard.slice(0, limit);

  if (isLoading) {
    return (
      <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#1f2937', color: '#9ca3af' }}>
        Loading clutch data...
      </div>
    );
  }

  if (displayData.length === 0) {
    return (
      <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#1f2937', color: '#6b7280' }}>
        No clutch data yet. Play some high-leverage situations!
      </div>
    );
  }

  return (
    <div style={{ borderRadius: '8px', backgroundColor: '#1f2937', border: '1px solid #374151', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', backgroundColor: '#111827', borderBottom: '1px solid #374151', fontWeight: 600, color: '#f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span>Clutch Rating Leaders</span>
          <span style={{ fontSize: '0.65rem', color: '#6b7280', marginLeft: '8px', fontWeight: 400 }}>
            (LI-weighted performance)
          </span>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#9ca3af', fontSize: '0.75rem', textAlign: 'left' }}>
            <th style={{ padding: '8px 16px' }}>#</th>
            <th style={{ padding: '8px' }}>Player</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>PA</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Avg LI</th>
            <th style={{ padding: '8px 16px', textAlign: 'right' }}>Clutch</th>
          </tr>
        </thead>
        <tbody>
          {displayData.map((player, idx) => {
            const { tier } = player;

            return (
              <tr key={player.playerId} style={{ borderTop: '1px solid #374151', color: '#d1d5db' }}>
                <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: '0.85rem' }}>{idx + 1}</td>
                <td style={{ padding: '10px 8px' }}>
                  <div style={{ fontWeight: 500 }}>
                    {tier.icon} {player.playerName || player.playerId}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{tier.tier}</div>
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.85rem' }}>
                  {player.stats.plateAppearances}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.85rem' }}>
                  {(player.stats.plateAppearances > 0 ? player.stats.totalLIExposure / player.stats.plateAppearances : 0).toFixed(2)}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: tier.color }}>
                  {player.clutchRating}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// COMBINED WAR PANEL
// ============================================

interface WARPanelProps {
  defaultTab?: WARTabType;
}

/**
 * Combined panel with tabs for all WAR types
 */
export function WARPanel({ defaultTab = 'total' }: WARPanelProps) {
  const [activeTab, setActiveTab] = useState<WARTabType>(defaultTab);
  const { leaderboards, isLoading } = useWARCalculations();
  const { clutchLeaderboard, isLoading: clutchLoading } = useClutchCalculations();

  const tabStyle = (isActive: boolean) => ({
    padding: '6px 12px',
    borderRadius: '4px 4px 0 0',
    backgroundColor: isActive ? '#1f2937' : 'transparent',
    color: isActive ? '#f3f4f6' : '#6b7280',
    border: 'none',
    borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
    cursor: 'pointer',
    fontWeight: isActive ? 600 : 400,
    fontSize: '0.85rem',
  });

  const getCount = (tab: WARTabType): number => {
    switch (tab) {
      case 'batting': return leaderboards.battingWAR.length;
      case 'pitching': return leaderboards.pitchingWAR.length;
      case 'fielding': return leaderboards.fieldingWAR.length;
      case 'baserunning': return leaderboards.baserunningWAR.length;
      case 'total': return leaderboards.totalWAR.length;
      case 'clutch': return clutchLeaderboard.length;
    }
  };

  const tabs: { key: WARTabType; label: string }[] = [
    { key: 'total', label: 'Total' },
    { key: 'batting', label: 'Batting' },
    { key: 'pitching', label: 'Pitching' },
    { key: 'fielding', label: 'Fielding' },
    { key: 'baserunning', label: 'Baserunning' },
    { key: 'clutch', label: 'Clutch' },
  ];

  const anyLoading = isLoading || clutchLoading;

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '-1px', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            style={tabStyle(activeTab === tab.key)}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {!anyLoading && (
              <span style={{ marginLeft: '4px', fontSize: '0.7rem', opacity: 0.7 }}>
                ({getCount(tab.key)})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'clutch' ? (
        <ClutchLeaderboard limit={10} />
      ) : (
        <WARLeaderboardExtended type={activeTab} limit={10} />
      )}
    </div>
  );
}

// ============================================
// EXPORTS
// ============================================

export default WARPanel;
