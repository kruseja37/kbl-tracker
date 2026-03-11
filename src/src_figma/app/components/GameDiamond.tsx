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
  enhancementSequence?: number[];
  enhancementHelpText?: string;
  fielderBorderColors?: [string, string];
  batterBackgroundColor?: string;
  batterBorderColor?: string;
  zoomLevel?: number;
  onRunnerTap?: (base: RunnerBase, anchorPosition: { left: string; top: string }) => void;
  onFielderTap?: (positionNumber: number, playerName: string, anchorPosition: { left: string; top: string }) => void;
  onBatterTap?: () => void;
  onFieldTap?: (coord: { x: number; y: number }) => void;
  onEnhancementSequenceUndo?: () => void;
  onEnhancementSequenceClear?: () => void;
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
  sequenceNumber,
  onTap,
}: {
  fielder: GameDiamondFielder;
  borderColor: string;
  sequenceNumber?: number;
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
      sequenceNumber={sequenceNumber}
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
  enhancementSequence = [],
  enhancementHelpText,
  fielderBorderColors = ['#E8E8D8', '#88AA88'],
  batterBackgroundColor,
  batterBorderColor,
  zoomLevel = 0.82,
  onRunnerTap,
  onFielderTap,
  onBatterTap,
  onFieldTap,
  onEnhancementSequenceUndo,
  onEnhancementSequenceClear,
}: GameDiamondProps) {
  const fieldersByNumber = useMemo(() => {
    return [...fielders].sort((a, b) => a.positionNumber - b.positionNumber);
  }, [fielders]);
  const sequenceBadges = useMemo(() => {
    const badges = new Map<number, number>();
    enhancementSequence.forEach((positionNumber, index) => {
      if (!badges.has(positionNumber)) {
        badges.set(positionNumber, index + 1);
      }
    });
    return badges;
  }, [enhancementSequence]);
  const canUndoSequence = enhancementSequence.length > 0 && !!onEnhancementSequenceUndo;
  const canClearSequence = enhancementSequence.length > 0 && !!onEnhancementSequenceClear;

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
              sequenceNumber={sequenceBadges.get(fielder.positionNumber)}
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

      {mode === 'enhancement' && (
        <div className="absolute right-3 top-3 z-40 max-w-[220px] border border-[#4a6a4a] bg-[#1a2a1d]/90 px-2 py-2 text-[8px] text-[#E8E8D8] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.35)]">
          <div className="font-bold uppercase tracking-[0.14em] text-[#C4A853]">Fielding Sequence</div>
          <div className="mt-1 font-mono text-[10px]">
            {enhancementSequence.length > 0 ? enhancementSequence.join('-') : 'Tap fielders on the diamond'}
          </div>
          <div className="mt-1 text-[7px] text-[#88AA88]">
            {enhancementHelpText || 'Tap fielders to build the sequence. Tap the field to set location.'}
          </div>
          {(canUndoSequence || canClearSequence) && (
            <div className="mt-2 flex gap-1">
              <button
                type="button"
                onClick={onEnhancementSequenceUndo}
                disabled={!canUndoSequence}
                className="flex-1 border border-[#5a6b38] bg-[#2f3b21] px-1.5 py-1 text-[8px] font-bold text-[#E8E8D8] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={onEnhancementSequenceClear}
                disabled={!canClearSequence}
                className="flex-1 border border-[#7b2d2d] bg-[#3b2121] px-1.5 py-1 text-[8px] font-bold text-[#fca5a5] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
