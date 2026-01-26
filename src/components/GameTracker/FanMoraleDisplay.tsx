/**
 * Fan Morale Display Component
 *
 * Displays fan morale state, trend, and risk level.
 * Integrates with fanMoraleEngine for calculations.
 *
 * @see FAN_MORALE_SYSTEM_SPEC.md
 */

import React from 'react';
import {
  type FanMorale,
  type FanState,
  type MoraleTrend,
  type RiskLevel,
  FAN_STATE_CONFIG,
  getFanState,
  getRiskLevel,
} from '../../engines/fanMoraleEngine';

// ============================================
// TYPES
// ============================================

interface FanMoraleBadgeProps {
  morale: number;
  showTrend?: boolean;
  trend?: MoraleTrend;
  compact?: boolean;
}

interface FanMoraleBarProps {
  morale: number;
  showLabels?: boolean;
}

interface FanMoraleDetailProps {
  moraleData: FanMorale;
  showHistory?: boolean;
}

interface FanMoraleSectionProps {
  morale: number;
  trend?: MoraleTrend;
  trendStreak?: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getTrendArrow(trend: MoraleTrend): string {
  switch (trend) {
    case 'RISING': return '↑';
    case 'FALLING': return '↓';
    case 'STABLE': return '→';
  }
}

function getTrendColor(trend: MoraleTrend): string {
  switch (trend) {
    case 'RISING': return '#22c55e';
    case 'FALLING': return '#ef4444';
    case 'STABLE': return '#9ca3af';
  }
}

function getRiskColor(risk: RiskLevel): string {
  switch (risk) {
    case 'SAFE': return '#22c55e';
    case 'WATCH': return '#f59e0b';
    case 'DANGER': return '#ef4444';
    case 'CRITICAL': return '#dc2626';
  }
}

function getRiskLabel(risk: RiskLevel): string {
  switch (risk) {
    case 'SAFE': return 'Safe';
    case 'WATCH': return 'Watch';
    case 'DANGER': return 'Danger';
    case 'CRITICAL': return 'Critical';
  }
}

// ============================================
// COMPONENTS
// ============================================

/**
 * Compact badge showing morale state with emoji
 */
export function FanMoraleBadge({
  morale,
  showTrend = false,
  trend = 'STABLE',
  compact = false,
}: FanMoraleBadgeProps) {
  const state = getFanState(morale);
  const config = FAN_STATE_CONFIG[state];

  if (compact) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 6px',
        backgroundColor: `${config.color}20`,
        borderRadius: '4px',
        fontSize: '0.75rem',
      }}>
        <span>{config.emoji}</span>
        <span style={{ color: config.color, fontWeight: 600 }}>{morale}</span>
        {showTrend && (
          <span style={{ color: getTrendColor(trend), fontSize: '0.625rem' }}>
            {getTrendArrow(trend)}
          </span>
        )}
      </span>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: `${config.color}15`,
      border: `1px solid ${config.color}40`,
      borderRadius: '8px',
    }}>
      <span style={{ fontSize: '1.5rem' }}>{config.emoji}</span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ color: config.color, fontWeight: 600, fontSize: '0.875rem' }}>
          {config.label}
        </span>
        <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
          Morale: {morale}/99
          {showTrend && (
            <span style={{ color: getTrendColor(trend), marginLeft: '6px' }}>
              {getTrendArrow(trend)} {trend.toLowerCase()}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

/**
 * Horizontal bar showing morale level with state zones
 */
export function FanMoraleBar({ morale, showLabels = true }: FanMoraleBarProps) {
  const state = getFanState(morale);
  const config = FAN_STATE_CONFIG[state];

  return (
    <div style={{ width: '100%' }}>
      {showLabels && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '4px',
          fontSize: '0.625rem',
          color: '#6b7280',
        }}>
          <span>Hostile</span>
          <span>Euphoric</span>
        </div>
      )}
      <div style={{
        position: 'relative',
        height: '12px',
        backgroundColor: '#1f2937',
        borderRadius: '6px',
        overflow: 'hidden',
      }}>
        {/* Gradient background showing zones */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, #8B0000, #FF0000, #FF4500, #FFA500, #FFFF00, #7FFF00, #00FF00)',
          opacity: 0.3,
        }} />
        {/* Current morale indicator */}
        <div style={{
          position: 'absolute',
          left: `${morale}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '8px',
          height: '16px',
          backgroundColor: config.color,
          borderRadius: '2px',
          boxShadow: `0 0 4px ${config.color}`,
        }} />
      </div>
      {showLabels && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '4px',
          fontSize: '0.75rem',
          color: config.color,
        }}>
          {config.emoji} {config.label} ({morale})
        </div>
      )}
    </div>
  );
}

/**
 * Detailed morale view with history
 */
export function FanMoraleDetail({ moraleData, showHistory = false }: FanMoraleDetailProps) {
  const config = FAN_STATE_CONFIG[moraleData.state];
  const riskColor = getRiskColor(moraleData.riskLevel);

  return (
    <div style={{
      backgroundColor: '#111827',
      borderRadius: '8px',
      padding: '16px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '2rem' }}>{config.emoji}</span>
          <div>
            <div style={{ color: config.color, fontWeight: 700, fontSize: '1.125rem' }}>
              {config.label}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
              {config.description}
            </div>
          </div>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
        }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: config.color }}>
            {moraleData.current}
          </span>
          <span style={{ fontSize: '0.625rem', color: '#6b7280' }}>/ 99</span>
        </div>
      </div>

      {/* Morale bar */}
      <FanMoraleBar morale={moraleData.current} />

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        marginTop: '12px',
        padding: '8px',
        backgroundColor: '#0d1117',
        borderRadius: '6px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.625rem', color: '#6b7280', textTransform: 'uppercase' }}>
            Trend
          </div>
          <div style={{ color: getTrendColor(moraleData.trend), fontWeight: 600, fontSize: '0.875rem' }}>
            {getTrendArrow(moraleData.trend)} {moraleData.trend}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.625rem', color: '#6b7280', textTransform: 'uppercase' }}>
            Streak
          </div>
          <div style={{ color: '#d1d5db', fontWeight: 600, fontSize: '0.875rem' }}>
            {moraleData.trendStreak}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.625rem', color: '#6b7280', textTransform: 'uppercase' }}>
            Risk
          </div>
          <div style={{ color: riskColor, fontWeight: 600, fontSize: '0.875rem' }}>
            {getRiskLabel(moraleData.riskLevel)}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.625rem', color: '#6b7280', textTransform: 'uppercase' }}>
            Range
          </div>
          <div style={{ color: '#d1d5db', fontWeight: 600, fontSize: '0.875rem' }}>
            {moraleData.seasonLow}-{moraleData.seasonHigh}
          </div>
        </div>
      </div>

      {/* Recent event */}
      {moraleData.lastEvent && (
        <div style={{
          marginTop: '12px',
          padding: '8px',
          backgroundColor: '#0d1117',
          borderRadius: '6px',
        }}>
          <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '4px' }}>
            LAST EVENT
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#d1d5db', fontSize: '0.875rem' }}>
              {moraleData.lastEvent.type.replace(/_/g, ' ')}
            </span>
            <span style={{
              color: moraleData.lastEvent.finalImpact >= 0 ? '#22c55e' : '#ef4444',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}>
              {moraleData.lastEvent.finalImpact > 0 ? '+' : ''}{moraleData.lastEvent.finalImpact}
            </span>
          </div>
        </div>
      )}

      {/* Event history */}
      {showHistory && moraleData.eventHistory.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '4px' }}>
            RECENT HISTORY
          </div>
          <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {moraleData.eventHistory.slice(-5).reverse().map((event, i) => (
              <div key={event.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 8px',
                backgroundColor: i % 2 === 0 ? '#0d1117' : 'transparent',
                fontSize: '0.75rem',
              }}>
                <span style={{ color: '#9ca3af' }}>
                  {event.type.replace(/_/g, ' ')}
                </span>
                <span style={{
                  color: event.finalImpact >= 0 ? '#22c55e' : '#ef4444',
                }}>
                  {event.finalImpact > 0 ? '+' : ''}{event.finalImpact}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active trade aftermaths */}
      {moraleData.activeTradeAftermaths.length > 0 && (
        <div style={{
          marginTop: '12px',
          padding: '8px',
          backgroundColor: '#1e3a5f',
          borderRadius: '6px',
          border: '1px solid #3b82f6',
        }}>
          <div style={{ fontSize: '0.625rem', color: '#60a5fa', marginBottom: '4px' }}>
            TRADE UNDER SCRUTINY ({moraleData.activeTradeAftermaths.length})
          </div>
          {moraleData.activeTradeAftermaths.map((ta, i) => (
            <div key={ta.tradeId || i} style={{
              fontSize: '0.75rem',
              color: '#93c5fd',
              marginTop: '4px',
            }}>
              Trade #{i + 1} - Game {ta.scrutinyPeriod.gamesPlayed}/14
              {ta.acquiredPlayers.length > 0 && (
                <span style={{ color: '#60a5fa' }}>
                  {' '}({ta.acquiredPlayers.map(p => p.playerName).join(', ')})
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Simple section for PlayerCard or Scoreboard integration
 */
export function FanMoraleSection({ morale, trend = 'STABLE', trendStreak = 0 }: FanMoraleSectionProps) {
  const state = getFanState(morale);
  const config = FAN_STATE_CONFIG[state];
  const risk = getRiskLevel(morale);
  const riskColor = getRiskColor(risk);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: '#111827',
      borderRadius: '6px',
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '1.25rem' }}>{config.emoji}</span>
      <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Fan Morale:</span>
      <span style={{ color: config.color, fontWeight: 600, fontSize: '1rem' }}>
        {morale}
      </span>
      <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
        ({config.label})
      </span>
      <span style={{
        color: getTrendColor(trend),
        fontSize: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
      }}>
        {getTrendArrow(trend)}
        {trendStreak > 1 && `×${trendStreak}`}
      </span>
      {risk !== 'SAFE' && (
        <span style={{
          marginLeft: 'auto',
          fontSize: '0.625rem',
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: '4px',
          backgroundColor: `${riskColor}20`,
          color: riskColor,
        }}>
          {getRiskLabel(risk).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export default FanMoraleDetail;
