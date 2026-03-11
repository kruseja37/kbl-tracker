import React, { useMemo } from 'react';

import { BASE_POSITIONS, FIELDER_POSITIONS, FieldCanvas, normalizedToViewBoxPercent, useViewBox } from './FieldCanvas';
import { FielderIcon, type FielderData } from './FielderIcon';
import { RunnerDragDrop } from './RunnerDragDrop';

type RunnerBase = 'first' | 'second' | 'third';

export interface GameDiamondFielder {
  positionNumber: number;
  playerId: string;
  fullName: string;
  displayName: string;
  position: string;
  fwar?: number;
}

interface GameDiamondProps {
  mode: 'info' | 'enhancement';
  bases: { first: boolean; second: boolean; third: boolean };
  runnerNames?: { first?: string; second?: string; third?: string };
  currentBatterName: string;
  fielders: GameDiamondFielder[];
  fielderBorderColors?: [string, string];
  batterBackgroundColor?: string;
  batterBorderColor?: string;
  zoomLevel?: number;
  onRunnerTap?: (base: RunnerBase, anchorPosition: { left: string; top: string }) => void;
  onFielderTap?: (positionNumber: number, playerName: string, anchorPosition: { left: string; top: string }) => void;
  onBatterTap?: () => void;
  onFieldTap?: (coord: { x: number; y: number }) => void;
}

function BatterIcon({
  batterName,
  backgroundColor = '#2563eb',
  borderColor = '#93c5fd',
  onTap,
}: {
  batterName: string;
  backgroundColor?: string;
  borderColor?: string;
  onTap?: () => void;
}) {
  const viewBox = useViewBox();
  const anchor = normalizedToViewBoxPercent(BASE_POSITIONS.home.x, BASE_POSITIONS.home.y - 0.06, viewBox);
  const displayName = batterName.split(' ').pop()?.toUpperCase() || 'BATTER';

  return (
    <button
      type="button"
      onClick={onTap}
      className="absolute z-30 px-3 py-1 text-[10px] font-bold text-[#E8E8D8] border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.35)]"
      style={{
        left: `${anchor.leftPercent}%`,
        top: `${anchor.topPercent}%`,
        transform: 'translate(-50%, -50%)',
        backgroundColor,
        borderColor,
      }}
    >
      {displayName}
    </button>
  );
}

function DiamondFielder({
  fielder,
  borderColor,
  onTap,
}: {
  fielder: GameDiamondFielder;
  borderColor: string;
  onTap?: (positionNumber: number, playerName: string, anchorPosition: { left: string; top: string }) => void;
}) {
  const viewBox = useViewBox();
  const defaultPosition = FIELDER_POSITIONS[fielder.positionNumber];
  const anchor = normalizedToViewBoxPercent(defaultPosition.x, defaultPosition.y, viewBox);
  const fielderData: FielderData = {
    positionNumber: fielder.positionNumber,
    name: fielder.displayName,
    playerId: fielder.playerId,
    position: fielder.position,
    fwar: fielder.fwar,
  };

  return (
    <FielderIcon
      fielder={fielderData}
      borderColor={borderColor}
      draggable={false}
      onClick={() => onTap?.(fielder.positionNumber, fielder.fullName, { left: `${anchor.leftPercent}%`, top: `${anchor.topPercent}%` })}
    />
  );
}

export function GameDiamond({
  mode,
  bases,
  runnerNames,
  currentBatterName,
  fielders,
  fielderBorderColors = ['#E8E8D8', '#88AA88'],
  batterBackgroundColor,
  batterBorderColor,
  zoomLevel = 0.82,
  onRunnerTap,
  onFielderTap,
  onBatterTap,
  onFieldTap,
}: GameDiamondProps) {
  const fieldersByNumber = useMemo(() => {
    return [...fielders].sort((a, b) => a.positionNumber - b.positionNumber);
  }, [fielders]);

  return (
    <div className="absolute inset-0">
      <FieldCanvas
        className="h-full w-full"
        zoomLevel={zoomLevel}
        onFieldClick={(coord, isFoul) => {
          if (!isFoul) {
            onFieldTap?.(coord);
          }
        }}
      >
        {fieldersByNumber.map((fielder, index) => {
          return (
            <DiamondFielder
              key={`${fielder.playerId}-${fielder.position}`}
              fielder={fielder}
              borderColor={fielderBorderColors[index % fielderBorderColors.length]}
              onTap={onFielderTap}
            />
          );
        })}

        <RunnerDragDrop
          bases={bases}
          runnerNames={runnerNames}
          onRunnerMove={() => {}}
          onRunnerTap={onRunnerTap}
          draggable={false}
        />

        <BatterIcon
          batterName={currentBatterName}
          backgroundColor={batterBackgroundColor}
          borderColor={batterBorderColor}
          onTap={onBatterTap}
        />
      </FieldCanvas>

      <div className="absolute left-3 top-3 z-40 border border-[#4a6a4a] bg-[#1a2a1d]/85 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.18em] text-[#E8E8D8]">
        {mode === 'enhancement' ? 'Enhancement Mode' : 'Info Mode'}
      </div>
    </div>
  );
}
