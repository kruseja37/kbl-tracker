/**
 * RosterView - Team roster display
 * Per Ralph Framework S-C009, S-C010
 *
 * Features:
 * - All players listed (22-man roster)
 * - Position shown
 * - Grouped by type (Position Players, Pitchers)
 * - Key stats per player
 * - Click opens PlayerCard
 * - ChemistryDisplay shows team chemistry score
 *
 * Styled with SNES retro aesthetic (SMB4 colors)
 */

import { useMemo, useState } from 'react';
import ChemistryDisplay from '../components/ChemistryDisplay';

// Types for chemistry pairings
interface PlayerPairing {
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  chemistryBonus: number;
  relationshipType?: string;
}

interface RosterPlayer {
  playerId: string;
  playerName: string;
  position: string;
  secondaryPosition?: string;
  age: number;
  bats: 'L' | 'R' | 'S';
  throws: 'L' | 'R';
  // Batting stats
  games?: number;
  avg?: number;
  hr?: number;
  rbi?: number;
  obp?: number;
  slg?: number;
  // Pitching stats
  wins?: number;
  losses?: number;
  era?: number;
  saves?: number;
  strikeouts?: number;
  // Ratings
  power?: number;
  contact?: number;
  speed?: number;
  velocity?: number;
  junk?: number;
  accuracy?: number;
  // Salary
  salary?: number;
  overall?: string;
  originalTeamId?: string;
}

// Format salary for display
function formatSalary(amount: number | undefined): string {
  if (!amount) return '-';
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  return `$${(amount / 1000).toFixed(0)}K`;
}

interface RosterViewProps {
  players: RosterPlayer[];
  teamName: string;
  onPlayerClick?: (playerId: string) => void;
  onDeletePlayer?: (playerId: string) => void;
  showRatings?: boolean;
  chemistryScore?: number;
  topPairings?: PlayerPairing[];
  worstPairings?: PlayerPairing[];
  showChemistry?: boolean;
}

type PlayerGroup = 'positionPlayers' | 'pitchers';

export default function RosterView({
  players,
  teamName,
  onPlayerClick,
  onDeletePlayer,
  showRatings = false,
  chemistryScore = 70,
  topPairings = [],
  worstPairings = [],
  showChemistry = false,
}: RosterViewProps) {
  const [isChemistryExpanded, setIsChemistryExpanded] = useState(false);

  // Group players: Position Players and Pitchers, sorted by salary descending
  const groupedPlayers = useMemo(() => {
    const groups: Record<PlayerGroup, RosterPlayer[]> = {
      positionPlayers: [],
      pitchers: [],
    };

    players.forEach((player) => {
      const pos = player.position.toUpperCase();
      if (['SP', 'RP', 'CL', 'P'].includes(pos)) {
        groups.pitchers.push(player);
      } else {
        groups.positionPlayers.push(player);
      }
    });

    // Sort each group by salary descending
    groups.positionPlayers.sort((a, b) => (b.salary || 0) - (a.salary || 0));
    groups.pitchers.sort((a, b) => (b.salary || 0) - (a.salary || 0));

    return groups;
  }, [players]);

  const formatAvg = (avg: number | undefined): string => {
    if (avg === undefined) return '-';
    return avg.toFixed(3).replace(/^0/, '');
  };

  const formatEra = (era: number | undefined): string => {
    if (era === undefined) return '-';
    return era.toFixed(2);
  };

  // Get overall grade color
  const getGradeColor = (grade: string | undefined): string => {
    if (!grade) return 'text-gray-500';
    if (grade.startsWith('S') || grade.startsWith('A')) return 'text-retro-gold';
    if (grade.startsWith('B')) return 'text-retro-blue-bright';
    if (grade.startsWith('C')) return 'text-retro-green-bright';
    return 'text-gray-400';
  };

  const renderBatterRow = (player: RosterPlayer) => (
    <div
      key={player.playerId}
      className="flex justify-between items-center p-3 bg-white border-2 border-retro-blue hover:bg-retro-cream cursor-pointer transition-colors shadow-retro-sm group"
      onClick={() => onPlayerClick?.(player.playerId)}
    >
      <div className="flex items-center gap-3">
        {/* Position badge */}
        <div className="w-10 h-10 bg-retro-blue text-white font-pixel text-[0.6rem] flex items-center justify-center border-2 border-retro-blue-dark">
          {player.position}
        </div>

        {/* Player info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-retro-navy">{player.playerName}</span>
            {player.overall && (
              <span className={`font-pixel text-[0.5rem] px-2 py-0.5 bg-retro-navy border border-retro-blue ${getGradeColor(player.overall)}`}>
                {player.overall}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-600">
            {player.bats}/{player.throws} • Age {player.age}
            {player.originalTeamId && <span className="text-retro-blue"> • from {player.originalTeamId}</span>}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {showRatings ? (
          <div className="flex gap-2">
            <span className="text-xs font-mono bg-retro-cream border border-retro-blue px-2 py-1">
              <span className="text-gray-500">POW</span> <span className="text-retro-red font-bold">{player.power || '-'}</span>
            </span>
            <span className="text-xs font-mono bg-retro-cream border border-retro-blue px-2 py-1">
              <span className="text-gray-500">CON</span> <span className="text-retro-blue font-bold">{player.contact || '-'}</span>
            </span>
            <span className="text-xs font-mono bg-retro-cream border border-retro-blue px-2 py-1">
              <span className="text-gray-500">SPD</span> <span className="text-retro-green font-bold">{player.speed || '-'}</span>
            </span>
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="text-center">
              <div className="font-bold text-retro-navy">{formatAvg(player.avg)}</div>
              <div className="text-[0.6rem] text-gray-500 uppercase">AVG</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-retro-red">{player.hr ?? '-'}</div>
              <div className="text-[0.6rem] text-gray-500 uppercase">HR</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-retro-blue">{player.rbi ?? '-'}</div>
              <div className="text-[0.6rem] text-gray-500 uppercase">RBI</div>
            </div>
          </div>
        )}

        {/* Salary */}
        <div className="min-w-[70px] text-right font-pixel text-[0.6rem] text-retro-green-bright bg-retro-navy px-2 py-1 border border-retro-green">
          {formatSalary(player.salary)}
        </div>

        {/* Delete button */}
        {onDeletePlayer && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeletePlayer(player.playerId);
            }}
            className="w-7 h-7 flex items-center justify-center bg-retro-red text-white border-2 border-retro-red-dark hover:bg-retro-red-bright transition-colors shadow-retro-sm"
            title="Remove player"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );

  const renderPitcherRow = (player: RosterPlayer) => (
    <div
      key={player.playerId}
      className="flex justify-between items-center p-3 bg-white border-2 border-retro-blue hover:bg-retro-cream cursor-pointer transition-colors shadow-retro-sm group"
      onClick={() => onPlayerClick?.(player.playerId)}
    >
      <div className="flex items-center gap-3">
        {/* Position badge */}
        <div className="w-10 h-10 bg-retro-red text-white font-pixel text-[0.6rem] flex items-center justify-center border-2 border-retro-red-dark">
          {player.position}
        </div>

        {/* Player info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-retro-navy">{player.playerName}</span>
            {player.overall && (
              <span className={`font-pixel text-[0.5rem] px-2 py-0.5 bg-retro-navy border border-retro-blue ${getGradeColor(player.overall)}`}>
                {player.overall}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-600">
            {player.throws} • Age {player.age}
            {player.originalTeamId && <span className="text-retro-blue"> • from {player.originalTeamId}</span>}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {showRatings ? (
          <div className="flex gap-2">
            <span className="text-xs font-mono bg-retro-cream border border-retro-blue px-2 py-1">
              <span className="text-gray-500">VEL</span> <span className="text-retro-red font-bold">{player.velocity || '-'}</span>
            </span>
            <span className="text-xs font-mono bg-retro-cream border border-retro-blue px-2 py-1">
              <span className="text-gray-500">JNK</span> <span className="text-retro-blue font-bold">{player.junk || '-'}</span>
            </span>
            <span className="text-xs font-mono bg-retro-cream border border-retro-blue px-2 py-1">
              <span className="text-gray-500">ACC</span> <span className="text-retro-green font-bold">{player.accuracy || '-'}</span>
            </span>
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="text-center">
              <div className="font-bold text-retro-navy">{player.wins ?? 0}-{player.losses ?? 0}</div>
              <div className="text-[0.6rem] text-gray-500 uppercase">W-L</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-retro-red">{formatEra(player.era)}</div>
              <div className="text-[0.6rem] text-gray-500 uppercase">ERA</div>
            </div>
            {player.position === 'RP' || player.position === 'CL' ? (
              <div className="text-center">
                <div className="font-bold text-retro-gold">{player.saves ?? 0}</div>
                <div className="text-[0.6rem] text-gray-500 uppercase">SV</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="font-bold text-retro-blue">{player.strikeouts ?? '-'}</div>
                <div className="text-[0.6rem] text-gray-500 uppercase">K</div>
              </div>
            )}
          </div>
        )}

        {/* Salary */}
        <div className="min-w-[70px] text-right font-pixel text-[0.6rem] text-retro-green-bright bg-retro-navy px-2 py-1 border border-retro-green">
          {formatSalary(player.salary)}
        </div>

        {/* Delete button */}
        {onDeletePlayer && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeletePlayer(player.playerId);
            }}
            className="w-7 h-7 flex items-center justify-center bg-retro-red text-white border-2 border-retro-red-dark hover:bg-retro-red-bright transition-colors shadow-retro-sm"
            title="Remove player"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );

  const groupLabels: Record<PlayerGroup, string> = {
    positionPlayers: 'POSITION PLAYERS',
    pitchers: 'PITCHERS',
  };

  const groupIcons: Record<PlayerGroup, string> = {
    positionPlayers: '⚾',
    pitchers: '💪',
  };

  return (
    <div className="min-h-screen bg-retro-green relative overflow-hidden">
      {/* Background layers */}
      <div className="bg-field-stripes absolute inset-0" />
      <div className="bg-scanlines absolute inset-0 pointer-events-none z-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header Card */}
        <div className="retro-card mb-6">
          <div className="retro-header-blue">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-white text-xs">👥 ROSTER</span>
              <span className="bg-white text-retro-blue font-pixel text-[0.5rem] px-2 py-1">
                {players.length} PLAYERS
              </span>
            </div>
          </div>
          <div className="retro-body p-4">
            <h1 className="font-pixel text-retro-blue text-lg" style={{ textShadow: '2px 2px 0 #c41e3a' }}>
              {teamName}
            </h1>
          </div>
        </div>

        {/* Team Chemistry Section */}
        {showChemistry && (
          <div className="retro-card mb-6">
            <button
              onClick={() => setIsChemistryExpanded(!isChemistryExpanded)}
              className="w-full retro-header-gold flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span>⚗️</span>
                <span className="font-pixel text-retro-navy text-xs">TEAM CHEMISTRY</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-retro-navy text-retro-gold font-pixel text-[0.6rem] px-2 py-1">
                  {chemistryScore}/100
                </span>
                <span className="text-retro-navy">{isChemistryExpanded ? '▼' : '▶'}</span>
              </div>
            </button>
            {isChemistryExpanded && (
              <div className="retro-body p-4">
                <ChemistryDisplay
                  teamName={teamName}
                  chemistryScore={chemistryScore}
                  topPairings={topPairings}
                  worstPairings={worstPairings}
                  onPlayerClick={onPlayerClick}
                />
              </div>
            )}
          </div>
        )}

        {/* Position Players */}
        {groupedPlayers.positionPlayers.length > 0 && (
          <div className="retro-card mb-6">
            <div className="retro-header-blue">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{groupIcons.positionPlayers}</span>
                  <span className="font-pixel text-white text-xs">{groupLabels.positionPlayers}</span>
                </div>
                <span className="bg-white text-retro-blue font-pixel text-[0.5rem] px-2 py-1">
                  {groupedPlayers.positionPlayers.length}
                </span>
              </div>
            </div>
            <div className="retro-body p-2">
              <div className="flex flex-col gap-1">
                {groupedPlayers.positionPlayers.map(renderBatterRow)}
              </div>
            </div>
          </div>
        )}

        {/* Pitchers */}
        {groupedPlayers.pitchers.length > 0 && (
          <div className="retro-card mb-6">
            <div className="retro-header-red">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{groupIcons.pitchers}</span>
                  <span className="font-pixel text-white text-xs">{groupLabels.pitchers}</span>
                </div>
                <span className="bg-white text-retro-red font-pixel text-[0.5rem] px-2 py-1">
                  {groupedPlayers.pitchers.length}
                </span>
              </div>
            </div>
            <div className="retro-body p-2">
              <div className="flex flex-col gap-1">
                {groupedPlayers.pitchers.map(renderPitcherRow)}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {players.length === 0 && (
          <div className="retro-card">
            <div className="retro-header-red">
              <span className="font-pixel text-white text-xs">NO PLAYERS</span>
            </div>
            <div className="retro-body p-8 text-center">
              <div className="text-5xl mb-4 opacity-50">👤</div>
              <div className="font-pixel text-retro-blue text-sm mb-2">Empty Roster</div>
              <div className="text-gray-600 text-sm">No players on this roster yet.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
