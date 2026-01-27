/**
 * Player Card Component
 * Per IMPLEMENTATION_PLAN.md v3 - Day 6: Player Card with Full Stats
 *
 * Styled with SNES retro aesthetic (SMB4 colors)
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
  calculateSalaryWithBreakdown,
  type PlayerForSalary,
  type SalaryBreakdown,
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
  playerData: PlayerData | null;
  seasonBatting: (PlayerSeasonBatting & {
    avg: number;
    obp: number;
    slg: number;
    ops: number;
  }) | null;
  seasonPitching: (PlayerSeasonPitching & {
    era: number;
    whip: number;
    ip: number;
  }) | null;
  bwar: PlayerBWAR | null;
  pwar: PlayerPWAR | null;
  totalWAR: number;
  career: CareerStats | null;
  fameTier: string;
  fameTotal: number;
  estimatedSalary: number | null;
  salaryBreakdown: SalaryBreakdown | null;
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
  const resolvePlayerName = getPlayerNameFn || ((id: string) => {
    const player = getPlayer(id);
    return player?.name || id;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<PlayerFullStats | null>(null);
  const [showSalaryBreakdown, setShowSalaryBreakdown] = useState(false);
  const warCalculations = useWARCalculations();

  useEffect(() => {
    if (warCalculations.isLoading) {
      return;
    }

    const loadPlayerStats = async () => {
      setIsLoading(true);
      try {
        const playerData = getPlayer(playerId) || getPlayerByName(playerName) || null;

        let allBatting: PlayerSeasonBatting[] = [];
        let allPitching: PlayerSeasonPitching[] = [];
        let careerData: CareerStats | null = null;

        try {
          allBatting = await getAllBattingStats('season-1');
          allPitching = await getAllPitchingStats('season-1');
          careerData = null;
        } catch (dbErr) {
          console.warn('[PlayerCard] Could not load season stats:', dbErr);
        }

        const batting = allBatting.find(b => b.playerId === playerId);
        const pitching = allPitching.find(p => p.playerId === playerId);

        const bwar = warCalculations.getPlayerBWAR(playerId);
        const pwar = warCalculations.getPlayerPWAR(playerId);

        const seasonBatting = batting ? {
          ...batting,
          ...calculateBattingDerived(batting),
        } : null;

        const seasonPitching = pitching ? {
          ...pitching,
          ...calculatePitchingDerived(pitching),
          ip: pitching.outsRecorded / 3,
        } : null;

        let totalWAR = 0;
        if (bwar) totalWAR += bwar.bWAR;
        if (pwar) totalWAR += pwar.pWAR;

        const fameTotal = batting?.fameNet ?? 0;
        const fameTierData = getFameTier(fameTotal);

        let estimatedSalary: number | null = null;
        let salaryBreakdown: SalaryBreakdown | null = null;
        if (playerData) {
          const salaryPlayer = toSalaryFormat(playerData, fameTotal);
          initializeDefaultLeagues();
          const teams = getAllTeams();
          const leagues = getLeagues();
          const seasonConfig = getSeasonDHConfig();
          const dhContext = buildDHContext(
            { isTwoWay: salaryPlayer.isTwoWay },
            teams,
            leagues,
            seasonConfig
          );
          salaryBreakdown = calculateSalaryWithBreakdown(salaryPlayer, undefined, undefined, false, dhContext);
          estimatedSalary = salaryBreakdown.finalSalary;
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
          salaryBreakdown,
        });
      } catch (err) {
        console.error('[PlayerCard] Failed to load stats:', err);
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
          salaryBreakdown: null,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPlayerStats();
  }, [playerId, playerName, warCalculations.isLoading]);

  if (isLoading) {
    return (
      <div className="retro-card max-w-md">
        <div className="retro-header-blue">
          <span className="font-pixel text-white text-xs">LOADING</span>
        </div>
        <div className="retro-body p-6 text-center">
          <div className="text-3xl mb-2 animate-bounce">⚾</div>
          <div className="font-pixel text-retro-blue text-xs">Loading player stats...</div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="retro-card max-w-md">
        <div className="retro-header-red">
          <span className="font-pixel text-white text-xs">ERROR</span>
        </div>
        <div className="retro-body p-6 text-center">
          <div className="text-retro-red">No stats available for {playerName}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="retro-card max-w-md">
      {/* Header */}
      <div className="retro-header-blue flex justify-between items-center">
        <div>
          <div className="font-pixel text-white text-sm">{playerName}</div>
          <div className="text-retro-cream text-xs">{teamId}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white hover:text-retro-gold transition-colors text-lg"
          >
            ✕
          </button>
        )}
      </div>

      <div className="retro-body p-4 space-y-4">
        {/* WAR Summary */}
        <div className="bg-retro-navy p-3 border-2 border-retro-blue">
          <div className="flex justify-between items-center mb-2">
            <span className="font-pixel text-[0.6rem] text-retro-cream">TOTAL WAR</span>
            <span
              className="font-pixel text-lg"
              style={{ color: getWARColor(stats.totalWAR) }}
            >
              {formatWAR(stats.totalWAR)}
            </span>
          </div>
          <div className="flex gap-4 text-sm">
            {stats.bwar && (
              <div className="flex gap-2 items-center">
                <span className="text-gray-400 text-xs">bWAR</span>
                <span style={{ color: getWARColor(stats.bwar.bWAR) }}>
                  {formatWAR(stats.bwar.bWAR)}
                </span>
              </div>
            )}
            {stats.pwar && (
              <div className="flex gap-2 items-center">
                <span className="text-gray-400 text-xs">pWAR</span>
                <span style={{ color: getWARColor(stats.pwar.pWAR) }}>
                  {formatWAR(stats.pwar.pWAR)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Fame */}
        <div className="flex items-center gap-2 bg-white p-2 border-2 border-retro-blue">
          <span className="font-pixel text-[0.6rem] text-gray-500">FAME</span>
          <span
            className="font-bold"
            style={{ color: stats.fameTotal >= 0 ? '#22c55e' : '#ef4444' }}
          >
            {stats.fameTotal > 0 ? '+' : ''}{stats.fameTotal}
          </span>
          <span className="text-xs text-gray-500">({stats.fameTier})</span>
        </div>

        {/* Salary Section */}
        {stats.estimatedSalary !== null ? (
          <div className="bg-white border-2 border-retro-blue">
            <div
              className="p-2 flex items-center gap-2 flex-wrap cursor-pointer hover:bg-retro-cream"
              onClick={() => stats.salaryBreakdown && setShowSalaryBreakdown(!showSalaryBreakdown)}
            >
              <span className="font-pixel text-[0.6rem] text-gray-500">EST. VALUE</span>
              <span
                className="font-bold"
                style={{ color: getSalaryColor(stats.estimatedSalary) }}
              >
                {formatSalary(stats.estimatedSalary)}
              </span>
              <span className="text-xs text-gray-500">{getSalaryTier(stats.estimatedSalary)}</span>
              {stats.totalWAR > 0 && (
                <span
                  className="text-[0.6rem] font-bold px-1 py-0.5 bg-retro-cream border border-retro-blue"
                  style={{
                    color: calculateSimpleROI(stats.estimatedSalary, stats.totalWAR).roiTier === 'ELITE_VALUE' ||
                           calculateSimpleROI(stats.estimatedSalary, stats.totalWAR).roiTier === 'GREAT_VALUE'
                      ? '#22c55e'
                      : calculateSimpleROI(stats.estimatedSalary, stats.totalWAR).roiTier === 'BUST' ||
                        calculateSimpleROI(stats.estimatedSalary, stats.totalWAR).roiTier === 'POOR_VALUE'
                      ? '#ef4444'
                      : '#f59e0b'
                  }}
                >
                  {getROITierDisplay(calculateSimpleROI(stats.estimatedSalary, stats.totalWAR).roiTier)}
                </span>
              )}
              {stats.salaryBreakdown && (
                <span className="ml-auto text-gray-400 text-xs">{showSalaryBreakdown ? '▼' : '▶'}</span>
              )}
            </div>
            {showSalaryBreakdown && stats.salaryBreakdown && (
              <div className="border-t-2 border-retro-blue p-2 bg-retro-cream text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base (from ratings)</span>
                  <span>{formatSalary(stats.salaryBreakdown.baseSalary)}</span>
                </div>
                {stats.salaryBreakdown.positionMultiplier !== 1.0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Position</span>
                    <span style={{ color: stats.salaryBreakdown.positionMultiplier > 1 ? '#22c55e' : '#ef4444' }}>
                      ×{stats.salaryBreakdown.positionMultiplier.toFixed(2)}
                    </span>
                  </div>
                )}
                {stats.salaryBreakdown.traitModifier !== 1.0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Traits</span>
                    <span style={{ color: stats.salaryBreakdown.traitModifier > 1 ? '#22c55e' : '#ef4444' }}>
                      ×{stats.salaryBreakdown.traitModifier.toFixed(2)}
                    </span>
                  </div>
                )}
                {stats.salaryBreakdown.ageFactor !== 1.0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Age</span>
                    <span style={{ color: stats.salaryBreakdown.ageFactor > 1 ? '#22c55e' : '#ef4444' }}>
                      ×{stats.salaryBreakdown.ageFactor.toFixed(2)}
                    </span>
                  </div>
                )}
                {stats.salaryBreakdown.fameModifier !== 1.0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fame</span>
                    <span style={{ color: stats.salaryBreakdown.fameModifier > 1 ? '#22c55e' : '#ef4444' }}>
                      ×{stats.salaryBreakdown.fameModifier.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1 border-t border-retro-blue">
                  <span>Final Salary</span>
                  <span style={{ color: getSalaryColor(stats.salaryBreakdown.finalSalary) }}>
                    {formatSalary(stats.salaryBreakdown.finalSalary)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-2 border-2 border-retro-blue">
            <span className="font-pixel text-[0.6rem] text-gray-500">CONTRACT</span>
            <span className="text-gray-400 text-xs ml-2 italic">Requires ratings data</span>
          </div>
        )}

        {/* Season Batting */}
        {stats.seasonBatting && (
          <div className="bg-white border-2 border-retro-blue">
            <div className="bg-retro-cream px-2 py-1 border-b-2 border-retro-blue">
              <span className="font-pixel text-[0.6rem] text-retro-blue">SEASON BATTING</span>
            </div>
            <div className="p-2">
              <div className="grid grid-cols-6 gap-2 text-center mb-2">
                <StatItem label="G" value={stats.seasonBatting.games} />
                <StatItem label="PA" value={stats.seasonBatting.pa} />
                <StatItem label="AVG" value={formatAvg(stats.seasonBatting.avg)} />
                <StatItem label="OBP" value={formatAvg(stats.seasonBatting.obp)} />
                <StatItem label="SLG" value={formatAvg(stats.seasonBatting.slg)} />
                <StatItem label="OPS" value={stats.seasonBatting.ops.toFixed(3)} />
              </div>
              <div className="grid grid-cols-6 gap-2 text-center">
                <StatItem label="HR" value={stats.seasonBatting.homeRuns} />
                <StatItem label="RBI" value={stats.seasonBatting.rbi} />
                <StatItem label="R" value={stats.seasonBatting.runs} />
                <StatItem label="H" value={stats.seasonBatting.hits} />
                <StatItem label="BB" value={stats.seasonBatting.walks} />
                <StatItem label="K" value={stats.seasonBatting.strikeouts} />
              </div>
            </div>
          </div>
        )}

        {/* Season Pitching */}
        {stats.seasonPitching && stats.seasonPitching.games > 0 && (
          <div className="bg-white border-2 border-retro-red">
            <div className="bg-retro-red/10 px-2 py-1 border-b-2 border-retro-red">
              <span className="font-pixel text-[0.6rem] text-retro-red">SEASON PITCHING</span>
            </div>
            <div className="p-2">
              <div className="grid grid-cols-6 gap-2 text-center mb-2">
                <StatItem label="G" value={stats.seasonPitching.games} />
                <StatItem label="GS" value={stats.seasonPitching.gamesStarted} />
                <StatItem label="IP" value={formatIP(stats.seasonPitching.outsRecorded)} />
                <StatItem label="ERA" value={formatERA(stats.seasonPitching.era)} />
                <StatItem label="WHIP" value={stats.seasonPitching.whip.toFixed(2)} />
                <StatItem label="K" value={stats.seasonPitching.strikeouts} />
              </div>
              <div className="grid grid-cols-6 gap-2 text-center">
                <StatItem label="W" value={stats.seasonPitching.wins} />
                <StatItem label="L" value={stats.seasonPitching.losses} />
                <StatItem label="SV" value={stats.seasonPitching.saves} />
                <StatItem label="H" value={stats.seasonPitching.hitsAllowed} />
                <StatItem label="BB" value={stats.seasonPitching.walksAllowed} />
                <StatItem label="HR" value={stats.seasonPitching.homeRunsAllowed} />
              </div>
            </div>
          </div>
        )}

        {/* Player Base Ratings */}
        {stats.playerData && !stats.seasonBatting && !stats.seasonPitching && (
          <div className="bg-white border-2 border-retro-gold">
            <div className="bg-retro-gold/20 px-2 py-1 border-b-2 border-retro-gold">
              <span className="font-pixel text-[0.6rem] text-retro-navy">PLAYER RATINGS</span>
            </div>
            <div className="p-3">
              {stats.playerData.isPitcher && stats.playerData.pitcherRatings ? (
                <>
                  <div className="flex justify-center gap-2 mb-3">
                    <RatingItem label="VEL" value={stats.playerData.pitcherRatings.velocity} />
                    <RatingItem label="JNK" value={stats.playerData.pitcherRatings.junk} />
                    <RatingItem label="ACC" value={stats.playerData.pitcherRatings.accuracy} />
                  </div>
                  <div className="text-center text-xs text-gray-600 mb-2">
                    <span className="text-gray-400">Arsenal:</span>{' '}
                    <span className="font-mono">{stats.playerData.arsenal?.join(', ') || '—'}</span>
                  </div>
                  {stats.playerData.batterRatings && (
                    <div className="pt-2 border-t border-retro-gold">
                      <div className="font-pixel text-[0.5rem] text-gray-500 text-center mb-2">BATTING</div>
                      <div className="flex justify-center gap-2">
                        <RatingItem label="POW" value={stats.playerData.batterRatings.power} size="small" />
                        <RatingItem label="CON" value={stats.playerData.batterRatings.contact} size="small" />
                        <RatingItem label="SPD" value={stats.playerData.batterRatings.speed} size="small" />
                      </div>
                    </div>
                  )}
                </>
              ) : stats.playerData.batterRatings ? (
                <div className="flex justify-center gap-2 flex-wrap">
                  <RatingItem label="POW" value={stats.playerData.batterRatings.power} />
                  <RatingItem label="CON" value={stats.playerData.batterRatings.contact} />
                  <RatingItem label="SPD" value={stats.playerData.batterRatings.speed} />
                  <RatingItem label="FLD" value={stats.playerData.batterRatings.fielding} />
                  <RatingItem label="ARM" value={stats.playerData.batterRatings.arm} />
                </div>
              ) : null}
              <div className="mt-3 pt-2 border-t border-retro-gold flex items-center justify-between text-sm">
                <span className="text-gray-500">Position:</span>
                <span className="font-bold text-retro-navy">
                  {stats.playerData.primaryPosition}
                  {stats.playerData.secondaryPosition && ` / ${stats.playerData.secondaryPosition}`}
                </span>
                <span className="text-gray-400 text-xs">
                  {stats.playerData.bats}/{stats.playerData.throws}
                </span>
              </div>
              <div className="text-center text-xs text-gray-400 italic mt-2">
                No season stats recorded yet
              </div>
            </div>
          </div>
        )}

        {/* Career Totals */}
        {stats.career && (
          <div className="bg-white border-2 border-retro-blue">
            <div className="bg-retro-cream px-2 py-1 border-b-2 border-retro-blue">
              <span className="font-pixel text-[0.6rem] text-retro-blue">CAREER TOTALS</span>
            </div>
            <div className="p-2 text-xs space-y-1">
              {stats.career.batting && (
                <div>
                  <span className="text-gray-500">Batting:</span>{' '}
                  <span className="text-retro-navy">
                    {stats.career.batting.games}G, {formatAvg(stats.career.batting.hits / Math.max(1, stats.career.batting.ab))} AVG,{' '}
                    {stats.career.batting.homeRuns} HR, {stats.career.batting.rbi} RBI
                  </span>
                </div>
              )}
              {stats.career.pitching && stats.career.pitching.games > 0 && (
                <div>
                  <span className="text-gray-500">Pitching:</span>{' '}
                  <span className="text-retro-navy">
                    {stats.career.pitching.games}G, {stats.career.pitching.wins}-{stats.career.pitching.losses},{' '}
                    {formatERA((stats.career.pitching.earnedRuns / Math.max(1, stats.career.pitching.outsRecorded / 3)) * 9)} ERA
                  </span>
                </div>
              )}
              {(stats.career.batting?.totalWAR || stats.career.pitching?.pWAR) && (
                <div>
                  <span className="text-gray-500">Career WAR:</span>{' '}
                  <span
                    className="font-bold"
                    style={{
                      color: getWARColor((stats.career.batting?.totalWAR ?? 0) + (stats.career.pitching?.pWAR ?? 0))
                    }}
                  >
                    {formatWAR((stats.career.batting?.totalWAR ?? 0) + (stats.career.pitching?.pWAR ?? 0))}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aging Display */}
        {stats.playerData && (
          <div className="bg-white border-2 border-retro-blue">
            <div className="bg-retro-cream px-2 py-1 border-b-2 border-retro-blue">
              <span className="font-pixel text-[0.6rem] text-retro-blue">AGE & CAREER PHASE</span>
            </div>
            <div className="p-2">
              <AgingDisplay
                age={stats.playerData.age}
                fame={stats.fameTotal}
                compact={false}
                showRetirementRisk={true}
              />
            </div>
          </div>
        )}

        {/* Relationships Panel */}
        {relationships.length > 0 && (
          <div className="bg-white border-2 border-retro-blue">
            <RelationshipPanel
              playerId={playerId}
              relationships={relationships}
              getPlayerName={resolvePlayerName}
              onPlayerClick={onPlayerClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// STAT ITEM COMPONENT
// ============================================

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[0.5rem] text-gray-500 uppercase">{label}</span>
      <span className="text-sm font-bold text-retro-navy">{value}</span>
    </div>
  );
}

function RatingItem({ label, value, size = 'normal' }: { label: string; value: number; size?: 'normal' | 'small' }) {
  const getRatingColor = (rating: number): string => {
    if (rating >= 90) return '#22c55e';
    if (rating >= 75) return '#3b82f6';
    if (rating >= 60) return '#f59e0b';
    if (rating >= 45) return '#9ca3af';
    return '#ef4444';
  };

  const isSmall = size === 'small';
  return (
    <div className={`flex flex-col items-center bg-retro-cream border border-retro-blue ${isSmall ? 'px-2 py-1' : 'px-3 py-2'}`}>
      <span className={`text-gray-500 uppercase ${isSmall ? 'text-[0.4rem]' : 'text-[0.5rem]'}`}>{label}</span>
      <span
        className={`font-bold ${isSmall ? 'text-sm' : 'text-lg'}`}
        style={{ color: getRatingColor(value) }}
      >
        {value}
      </span>
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
    <div
      className="fixed inset-0 bg-black/75 flex justify-center items-center z-[1000]"
      onClick={onClose}
    >
      <div className="max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
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

export default PlayerCard;
