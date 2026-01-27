/**
 * Player Card Component
 * Per IMPLEMENTATION_PLAN.md v3 - Day 6: Player Card with Full Stats
 *
 * Single view showing all player metrics:
 * - Season batting/pitching stats
 * - WAR breakdown (bWAR/fWAR/rWAR/pWAR)
 * - Fame total and tier
 * - Career totals
 */

import React, { useState, useEffect } from 'react';
import { useSeasonStats, type BattingLeaderEntry, type PitchingLeaderEntry } from '../../hooks/useSeasonStats';
import { useWARCalculations, formatWAR, getWARColor, type PlayerBWAR, type PlayerPWAR } from '../../hooks/useWARCalculations';
import { useCareerStats, type CareerBattingLeader, type CareerPitchingLeader } from '../../hooks/useCareerStats';
import {
  getAllBattingStats,
  getAllPitchingStats,
  calculateBattingDerived,
  calculatePitchingDerived,
  type PlayerSeasonBatting,
  type PlayerSeasonPitching,
} from '../../utils/seasonStorage';
import { getCareerStats, type CareerStats } from '../../utils/careerStorage';
import { getFameTier } from '../../engines/fameEngine';
import {
  formatSalary,
  getSalaryColor,
  getSalaryTier,
  calculateSimpleROI,
  getROITierDisplay,
  calculateSalary,
  type PlayerForSalary,
} from '../../engines/salaryCalculator';
import { getPlayer, getPlayerByName, getAllTeams, type PlayerData } from '../../data/playerDatabase';
import { buildDHContext, getLeagues, getSeasonDHConfig, initializeDefaultLeagues } from '../../utils/leagueConfig';
import RelationshipPanel from '../RelationshipPanel';
import AgingDisplay from '../AgingDisplay';
import type { Relationship } from '../../engines/relationshipEngine';

// ============================================
// TYPES
// ============================================

interface PlayerCardProps {
  playerId: string;
  playerName: string;
  teamId: string;
  onClose?: () => void;
  relationships?: Relationship[];
  getPlayerName?: (id: string) => string;
  onPlayerClick?: (playerId: string) => void;
}

interface PlayerFullStats {
  // Player base data from database
  playerData: PlayerData | null;

  // Season batting
  seasonBatting: (PlayerSeasonBatting & {
    avg: number;
    obp: number;
    slg: number;
    ops: number;
  }) | null;

  // Season pitching
  seasonPitching: (PlayerSeasonPitching & {
    era: number;
    whip: number;
    ip: number;
  }) | null;

  // WAR components
  bwar: PlayerBWAR | null;
  pwar: PlayerPWAR | null;
  totalWAR: number;

  // Career
  career: CareerStats | null;

  // Fame
  fameTier: string;
  fameTotal: number;

  // Salary (estimated based on ratings + performance)
  estimatedSalary: number | null;
}

// ============================================
// FORMATTING HELPERS
// ============================================

function formatAvg(avg: number): string {
  return avg.toFixed(3).replace(/^0/, '');
}

function formatERA(era: number): string {
  return era.toFixed(2);
}

function formatIP(outsRecorded: number): string {
  const whole = Math.floor(outsRecorded / 3);
  const partial = outsRecorded % 3;
  return partial > 0 ? `${whole}.${partial}` : `${whole}.0`;
}

/**
 * Convert PlayerData from database to PlayerForSalary format
 */
function toSalaryFormat(player: PlayerData, fame: number): PlayerForSalary {
  return {
    id: player.id,
    name: player.name,
    isPitcher: player.isPitcher,
    isTwoWay: player.isPitcher && player.batterRatings !== undefined &&
              (player.batterRatings.contact >= 40 || player.batterRatings.power >= 40),
    primaryPosition: player.primaryPosition as PlayerForSalary['primaryPosition'],
    ratings: player.isPitcher
      ? player.pitcherRatings!
      : player.batterRatings!,
    battingRatings: player.batterRatings,
    age: player.age,
    personality: undefined,
    fame,
    traits: [player.traits.trait1, player.traits.trait2].filter(Boolean) as string[],
  };
}

// ============================================
// PLAYER CARD COMPONENT
// ============================================

export function PlayerCard({
  playerId,
  playerName,
  teamId,
  onClose,
  relationships = [],
  getPlayerName: getPlayerNameFn,
  onPlayerClick,
}: PlayerCardProps) {
  // Default getPlayerName function if not provided
  const resolvePlayerName = getPlayerNameFn || ((id: string) => {
    const player = getPlayer(id);
    return player?.name || id;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<PlayerFullStats | null>(null);
  const warCalculations = useWARCalculations();

  // Load stats when player changes or when WAR calculations finish loading
  useEffect(() => {
    // Wait for WAR calculations to finish loading before loading player stats
    if (warCalculations.isLoading) {
      return;
    }

    const loadPlayerStats = async () => {
      setIsLoading(true);
      try {
        // First, get player base data from database (this is synchronous)
        const playerData = getPlayer(playerId) || getPlayerByName(playerName) || null;

        // Load season stats - these may fail or return empty if no games played
        let allBatting: PlayerSeasonBatting[] = [];
        let allPitching: PlayerSeasonPitching[] = [];
        let careerData: CareerStats | null = null;

        try {
          // Load season stats (not career - career DB may not be initialized)
          allBatting = await getAllBattingStats('season-1');
          allPitching = await getAllPitchingStats('season-1');
          // Skip career stats for now - can hang if DB version mismatch
          careerData = null;
        } catch (dbErr) {
          console.warn('[PlayerCard] Could not load season stats (may be new season):', dbErr);
        }

        // Find this player's stats
        const batting = allBatting.find(b => b.playerId === playerId);
        const pitching = allPitching.find(p => p.playerId === playerId);

        // Get WAR data - now warCalculations is guaranteed to be loaded
        const bwar = warCalculations.getPlayerBWAR(playerId);
        const pwar = warCalculations.getPlayerPWAR(playerId);

        // Calculate derived stats
        const seasonBatting = batting ? {
          ...batting,
          ...calculateBattingDerived(batting),
        } : null;

        const seasonPitching = pitching ? {
          ...pitching,
          ...calculatePitchingDerived(pitching),
          ip: pitching.outsRecorded / 3,
        } : null;

        // Calculate total WAR
        let totalWAR = 0;
        if (bwar) totalWAR += bwar.bWAR;
        if (pwar) totalWAR += pwar.pWAR;

        // Get fame from season batting (fame is tracked there)
        const fameTotal = batting?.fameNet ?? 0;
        const fameTierData = getFameTier(fameTotal);

        // Calculate salary if player ratings are available in database
        let estimatedSalary: number | null = null;
        if (playerData) {
          const salaryPlayer = toSalaryFormat(playerData, fameTotal);

          // Build DH context for salary calculation
          // This adjusts pitcher batting bonus based on league DH rules
          initializeDefaultLeagues();  // Ensure default leagues exist
          const teams = getAllTeams();
          const leagues = getLeagues();
          const seasonConfig = getSeasonDHConfig();
          const dhContext = buildDHContext(
            { isTwoWay: salaryPlayer.isTwoWay },
            teams,
            leagues,
            seasonConfig
          );

          estimatedSalary = calculateSalary(salaryPlayer, undefined, undefined, false, dhContext);
        }

        setStats({
          playerData,
          seasonBatting,
          seasonPitching,
          bwar,
          pwar,
          totalWAR,
          career: careerData,
          fameTier: fameTierData.label,
          fameTotal,
          estimatedSalary,
        });
      } catch (err) {
        console.error('[PlayerCard] Failed to load stats:', err);
        // Still set stats with at least playerData if available
        const playerData = getPlayer(playerId) || getPlayerByName(playerName) || null;
        setStats({
          playerData,
          seasonBatting: null,
          seasonPitching: null,
          bwar: null,
          pwar: null,
          totalWAR: 0,
          career: null,
          fameTier: 'Unknown',
          fameTotal: 0,
          estimatedSalary: null,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPlayerStats();
  }, [playerId, playerName, warCalculations.isLoading]); // Re-run when WAR finishes loading

  if (isLoading) {
    return (
      <div style={styles.card}>
        <div style={styles.loading}>Loading player stats...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={styles.card}>
        <div style={styles.error}>No stats available for {playerName}</div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.playerName}>{playerName}</div>
          <div style={styles.teamName}>{teamId}</div>
        </div>
        {onClose && (
          <button onClick={onClose} style={styles.closeButton}>
            X
          </button>
        )}
      </div>

      {/* WAR Summary */}
      <div style={styles.warSummary}>
        <div style={styles.warTotal}>
          <span style={styles.warLabel}>Total WAR</span>
          <span style={{ ...styles.warValue, color: getWARColor(stats.totalWAR) }}>
            {formatWAR(stats.totalWAR)}
          </span>
        </div>
        <div style={styles.warBreakdown}>
          {stats.bwar && (
            <div style={styles.warComponent}>
              <span style={styles.componentLabel}>bWAR</span>
              <span style={{ color: getWARColor(stats.bwar.bWAR) }}>
                {formatWAR(stats.bwar.bWAR)}
              </span>
            </div>
          )}
          {stats.pwar && (
            <div style={styles.warComponent}>
              <span style={styles.componentLabel}>pWAR</span>
              <span style={{ color: getWARColor(stats.pwar.pWAR) }}>
                {formatWAR(stats.pwar.pWAR)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Fame */}
      <div style={styles.fameSection}>
        <span style={styles.fameLabel}>Fame:</span>
        <span style={{
          ...styles.fameValue,
          color: stats.fameTotal >= 0 ? '#10b981' : '#ef4444',
        }}>
          {stats.fameTotal > 0 ? '+' : ''}{stats.fameTotal}
        </span>
        <span style={styles.fameTier}>({stats.fameTier})</span>
      </div>

      {/* Salary Section - Requires player ratings per spec */}
      {stats.estimatedSalary !== null ? (
        <div style={styles.salarySection}>
          <span style={styles.salaryLabel}>Est. Value:</span>
          <span style={{ ...styles.salaryValue, color: getSalaryColor(stats.estimatedSalary) }}>
            {formatSalary(stats.estimatedSalary)}
          </span>
          <span style={styles.salaryTier}>{getSalaryTier(stats.estimatedSalary)}</span>
          {stats.totalWAR > 0 && (
            <span style={{
              ...styles.roiBadge,
              color: calculateSimpleROI(stats.estimatedSalary, stats.totalWAR).roiTier === 'ELITE_VALUE' ||
                     calculateSimpleROI(stats.estimatedSalary, stats.totalWAR).roiTier === 'GREAT_VALUE'
                ? '#22c55e'
                : calculateSimpleROI(stats.estimatedSalary, stats.totalWAR).roiTier === 'BUST' ||
                  calculateSimpleROI(stats.estimatedSalary, stats.totalWAR).roiTier === 'POOR_VALUE'
                ? '#ef4444'
                : '#f59e0b'
            }}>
              {getROITierDisplay(calculateSimpleROI(stats.estimatedSalary, stats.totalWAR).roiTier)}
            </span>
          )}
        </div>
      ) : (
        <div style={styles.salarySection}>
          <span style={styles.salaryLabel}>Contract:</span>
          <span style={styles.salaryPlaceholder}>Requires ratings data</span>
        </div>
      )}

      {/* Season Batting */}
      {stats.seasonBatting && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Season Batting</div>
          <div style={styles.statGrid}>
            <StatItem label="G" value={stats.seasonBatting.games} />
            <StatItem label="PA" value={stats.seasonBatting.pa} />
            <StatItem label="AVG" value={formatAvg(stats.seasonBatting.avg)} />
            <StatItem label="OBP" value={formatAvg(stats.seasonBatting.obp)} />
            <StatItem label="SLG" value={formatAvg(stats.seasonBatting.slg)} />
            <StatItem label="OPS" value={stats.seasonBatting.ops.toFixed(3)} />
          </div>
          <div style={styles.statGrid}>
            <StatItem label="HR" value={stats.seasonBatting.homeRuns} />
            <StatItem label="RBI" value={stats.seasonBatting.rbi} />
            <StatItem label="R" value={stats.seasonBatting.runs} />
            <StatItem label="H" value={stats.seasonBatting.hits} />
            <StatItem label="BB" value={stats.seasonBatting.walks} />
            <StatItem label="K" value={stats.seasonBatting.strikeouts} />
          </div>
        </div>
      )}

      {/* Season Pitching */}
      {stats.seasonPitching && stats.seasonPitching.games > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Season Pitching</div>
          <div style={styles.statGrid}>
            <StatItem label="G" value={stats.seasonPitching.games} />
            <StatItem label="GS" value={stats.seasonPitching.gamesStarted} />
            <StatItem label="IP" value={formatIP(stats.seasonPitching.outsRecorded)} />
            <StatItem label="ERA" value={formatERA(stats.seasonPitching.era)} />
            <StatItem label="WHIP" value={stats.seasonPitching.whip.toFixed(2)} />
            <StatItem label="K" value={stats.seasonPitching.strikeouts} />
          </div>
          <div style={styles.statGrid}>
            <StatItem label="W" value={stats.seasonPitching.wins} />
            <StatItem label="L" value={stats.seasonPitching.losses} />
            <StatItem label="SV" value={stats.seasonPitching.saves} />
            <StatItem label="H" value={stats.seasonPitching.hitsAllowed} />
            <StatItem label="BB" value={stats.seasonPitching.walksAllowed} />
            <StatItem label="HR" value={stats.seasonPitching.homeRunsAllowed} />
          </div>
        </div>
      )}

      {/* Player Base Ratings - Show when no season stats exist */}
      {stats.playerData && !stats.seasonBatting && !stats.seasonPitching && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Player Ratings</div>
          {stats.playerData.isPitcher && stats.playerData.pitcherRatings ? (
            <>
              <div style={styles.ratingsRow}>
                <RatingItem label="VEL" value={stats.playerData.pitcherRatings.velocity} />
                <RatingItem label="JNK" value={stats.playerData.pitcherRatings.junk} />
                <RatingItem label="ACC" value={stats.playerData.pitcherRatings.accuracy} />
              </div>
              <div style={styles.arsenalRow}>
                <span style={styles.arsenalLabel}>Arsenal:</span>
                <span style={styles.arsenalValue}>{stats.playerData.arsenal?.join(', ') || '—'}</span>
              </div>
              {stats.playerData.batterRatings && (
                <div style={styles.batterRatingsSubsection}>
                  <div style={styles.subsectionLabel}>Batting Ratings</div>
                  <div style={styles.ratingsRow}>
                    <RatingItem label="POW" value={stats.playerData.batterRatings.power} size="small" />
                    <RatingItem label="CON" value={stats.playerData.batterRatings.contact} size="small" />
                    <RatingItem label="SPD" value={stats.playerData.batterRatings.speed} size="small" />
                  </div>
                </div>
              )}
            </>
          ) : stats.playerData.batterRatings ? (
            <>
              <div style={styles.ratingsRow}>
                <RatingItem label="POW" value={stats.playerData.batterRatings.power} />
                <RatingItem label="CON" value={stats.playerData.batterRatings.contact} />
                <RatingItem label="SPD" value={stats.playerData.batterRatings.speed} />
                <RatingItem label="FLD" value={stats.playerData.batterRatings.fielding} />
                <RatingItem label="ARM" value={stats.playerData.batterRatings.arm} />
              </div>
            </>
          ) : null}
          <div style={styles.positionRow}>
            <span style={styles.posLabel}>Position:</span>
            <span style={styles.posValue}>
              {stats.playerData.primaryPosition}
              {stats.playerData.secondaryPosition && ` / ${stats.playerData.secondaryPosition}`}
            </span>
            <span style={styles.batsThrows}>
              {stats.playerData.bats}/{stats.playerData.throws}
            </span>
          </div>
          <div style={styles.noStatsNotice}>
            No season stats recorded yet
          </div>
        </div>
      )}

      {/* Career Totals */}
      {stats.career && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Career Totals</div>
          {stats.career.batting && (
            <div style={styles.careerLine}>
              <span style={styles.careerLabel}>Batting:</span>
              <span style={styles.careerStats}>
                {stats.career.batting.games}G, {formatAvg(stats.career.batting.hits / Math.max(1, stats.career.batting.ab))} AVG,
                {stats.career.batting.homeRuns} HR, {stats.career.batting.rbi} RBI
              </span>
            </div>
          )}
          {stats.career.pitching && stats.career.pitching.games > 0 && (
            <div style={styles.careerLine}>
              <span style={styles.careerLabel}>Pitching:</span>
              <span style={styles.careerStats}>
                {stats.career.pitching.games}G, {stats.career.pitching.wins}-{stats.career.pitching.losses},
                {formatERA((stats.career.pitching.earnedRuns / Math.max(1, stats.career.pitching.outsRecorded / 3)) * 9)} ERA
              </span>
            </div>
          )}
          {(stats.career.batting?.totalWAR || stats.career.pitching?.pWAR) && (
            <div style={styles.careerLine}>
              <span style={styles.careerLabel}>Career WAR:</span>
              <span style={{ ...styles.careerStats, fontWeight: 600, color: getWARColor(
                (stats.career.batting?.totalWAR ?? 0) + (stats.career.pitching?.pWAR ?? 0)
              )}}>
                {formatWAR((stats.career.batting?.totalWAR ?? 0) + (stats.career.pitching?.pWAR ?? 0))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Aging Display */}
      {stats.playerData && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Age & Career Phase</div>
          <AgingDisplay
            age={stats.playerData.age}
            fame={stats.fameTotal}
            compact={false}
            showRetirementRisk={true}
          />
        </div>
      )}

      {/* Relationships Panel */}
      {relationships.length > 0 && (
        <div style={styles.section}>
          <RelationshipPanel
            playerId={playerId}
            relationships={relationships}
            getPlayerName={resolvePlayerName}
            onPlayerClick={onPlayerClick}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// STAT ITEM COMPONENT
// ============================================

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.statItem}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </div>
  );
}

/**
 * Rating item for displaying player base ratings with color coding
 */
function RatingItem({ label, value, size = 'normal' }: { label: string; value: number; size?: 'normal' | 'small' }) {
  const getRatingColor = (rating: number): string => {
    if (rating >= 90) return '#22c55e'; // Elite - green
    if (rating >= 75) return '#3b82f6'; // Great - blue
    if (rating >= 60) return '#f59e0b'; // Good - amber
    if (rating >= 45) return '#9ca3af'; // Average - gray
    return '#ef4444'; // Below average - red
  };

  const isSmall = size === 'small';
  return (
    <div style={{
      ...styles.ratingItem,
      padding: isSmall ? '4px 8px' : '8px 12px',
    }}>
      <span style={{
        ...styles.ratingLabel,
        fontSize: isSmall ? '0.5rem' : '0.625rem',
      }}>{label}</span>
      <span style={{
        ...styles.ratingValue,
        color: getRatingColor(value),
        fontSize: isSmall ? '0.875rem' : '1.125rem',
      }}>{value}</span>
    </div>
  );
}

// ============================================
// PLAYER CARD MODAL
// ============================================

interface PlayerCardModalProps {
  isOpen: boolean;
  playerId: string;
  playerName: string;
  teamId: string;
  onClose: () => void;
}

export function PlayerCardModal({ isOpen, playerId, playerName, teamId, onClose }: PlayerCardModalProps) {
  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <PlayerCard
          playerId={playerId}
          playerName={playerName}
          teamId={teamId}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

// ============================================
// STYLES
// ============================================

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#1f2937',
    borderRadius: '12px',
    border: '1px solid #374151',
    padding: '16px',
    maxWidth: '400px',
    color: '#f3f4f6',
  },
  loading: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: '24px',
  },
  error: {
    textAlign: 'center',
    color: '#ef4444',
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    borderBottom: '1px solid #374151',
    paddingBottom: '12px',
  },
  playerName: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#f3f4f6',
  },
  teamName: {
    fontSize: '0.875rem',
    color: '#9ca3af',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '1.25rem',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  warSummary: {
    backgroundColor: '#111827',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
  },
  warTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  warLabel: {
    fontSize: '0.875rem',
    color: '#9ca3af',
  },
  warValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  warBreakdown: {
    display: 'flex',
    gap: '16px',
  },
  warComponent: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    fontSize: '0.875rem',
  },
  componentLabel: {
    color: '#6b7280',
  },
  fameSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    padding: '8px 12px',
    backgroundColor: '#111827',
    borderRadius: '6px',
  },
  fameLabel: {
    color: '#9ca3af',
    fontSize: '0.875rem',
  },
  fameValue: {
    fontSize: '1rem',
    fontWeight: 600,
  },
  fameTier: {
    color: '#6b7280',
    fontSize: '0.75rem',
  },
  salarySection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    padding: '8px 12px',
    backgroundColor: '#111827',
    borderRadius: '6px',
    flexWrap: 'wrap',
  },
  salaryLabel: {
    color: '#9ca3af',
    fontSize: '0.875rem',
  },
  salaryValue: {
    fontSize: '1rem',
    fontWeight: 600,
  },
  salaryTier: {
    color: '#6b7280',
    fontSize: '0.75rem',
  },
  roiBadge: {
    fontSize: '0.625rem',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: 'auto',
  },
  salaryPlaceholder: {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '8px',
    marginBottom: '8px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: '0.625rem',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#d1d5db',
  },
  careerLine: {
    display: 'flex',
    gap: '8px',
    marginBottom: '4px',
  },
  careerLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    minWidth: '60px',
  },
  careerStats: {
    fontSize: '0.75rem',
    color: '#d1d5db',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    maxHeight: '90vh',
    overflow: 'auto',
  },
  // Rating display styles
  ratingsRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    justifyContent: 'center',
  },
  ratingItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: '6px',
    minWidth: '48px',
  },
  ratingLabel: {
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  ratingValue: {
    fontWeight: 700,
  },
  arsenalRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    paddingLeft: '4px',
  },
  arsenalLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  arsenalValue: {
    fontSize: '0.875rem',
    color: '#d1d5db',
    fontFamily: 'monospace',
  },
  batterRatingsSubsection: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #374151',
  },
  subsectionLabel: {
    fontSize: '0.625rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
    textAlign: 'center',
  },
  positionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    paddingLeft: '4px',
  },
  posLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  posValue: {
    fontSize: '0.875rem',
    color: '#f3f4f6',
    fontWeight: 500,
  },
  batsThrows: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    marginLeft: 'auto',
  },
  noStatsNotice: {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingTop: '8px',
    borderTop: '1px solid #374151',
    marginTop: '8px',
  },
};

// ============================================
// EXPORTS
// ============================================

export default PlayerCard;
