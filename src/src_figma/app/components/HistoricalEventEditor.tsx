import React from 'react';

import type { BetweenPlayEvent } from '../../../utils/eventLog';
import type { PlayLogEntry } from '../utils/playLogTypes';

interface HistoricalEventEditorProps {
  entry: PlayLogEntry;
  event: BetweenPlayEvent | null;
  loading?: boolean;
  saving?: boolean;
  onReturnToLive: () => void;
  onRunnerCaughtByChange?: (caughtBy: number | null) => void;
  onLineupPositionChange?: (position: string) => void;
  onSubstitutionPlayerChange?: (field: 'outPlayer' | 'inPlayer', playerId: string) => void;
  onSubstitutionPositionChange?: (position: string) => void;
  onPitcherChange?: (field: 'outgoingPitcher' | 'incomingPitcher', pitcherId: string) => void;
  onContextValueChange?: (value: string) => void;
  onContextReasonChange?: (reason: string) => void;
  lineupOptions?: Array<{ id: string; label: string }>;
  pitcherOptions?: Array<{ id: string; label: string }>;
  contextValueOptions?: Array<{ value: string; label: string }>;
}

const POSITION_OPTIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const;

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 border-b border-[#4a6a4a]/40 last:border-b-0">
      <div className="text-[8px] text-[#88AA88] uppercase tracking-wide">{label}</div>
      <div className="text-[9px] text-[#E8E8D8] text-right">{value}</div>
    </div>
  );
}

function LockedOutcomeNotice() {
  return (
    <div className="text-[8px] text-[#C4A853] bg-[#2f3b21] border border-[#5a6b38] px-2 py-1 rounded">
      Tap undo to change outcome.
    </div>
  );
}

export function HistoricalEventEditor({
  entry,
  event,
  loading = false,
  saving = false,
  onReturnToLive,
  onRunnerCaughtByChange,
  onLineupPositionChange,
  onSubstitutionPlayerChange,
  onSubstitutionPositionChange,
  onPitcherChange,
  onContextValueChange,
  onContextReasonChange,
  lineupOptions = [],
  pitcherOptions = [],
  contextValueOptions = [],
}: HistoricalEventEditorProps) {
  const title = entry.editorType === 'runner'
    ? 'Runner Event'
    : entry.editorType === 'lineup_pitching'
    ? 'Lineup / Pitching'
    : 'Context / Modifiers';

  const runnerAction = event?.runnerAction;
  const canEditCaughtBy = !!event?.stolenBase && (event.type === 'stolen_base' || event.type === 'caught_stealing');

  return (
    <div className="bg-[#2a3a2d] border-l-2 border-[#C4A853] flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1 bg-[#1a2a1d] border-b border-[#4a6a4a]">
        <div className="min-w-0">
          <div className="text-[8px] text-[#88AA88] font-mono">{entry.inningLabel}</div>
          <div className="text-[9px] text-[#E8E8D8] font-bold truncate">{title}: {entry.result}</div>
        </div>
        <button
          onClick={onReturnToLive}
          className="text-[8px] text-[#E8E8D8] bg-[#3d5240] border border-[#4a6a4a] px-1.5 py-0.5 rounded hover:bg-[#4a6a4a]"
        >
          Return to live
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading ? (
          <div className="text-[9px] text-[#88AA88]">Loading event…</div>
        ) : !event ? (
          <div className="text-[9px] text-[#fca5a5]">Recorded event not found.</div>
        ) : (
          <>
            <FieldRow label="Actor" value={entry.batterName} />
            {entry.description && <FieldRow label="Summary" value={entry.description} />}

            {entry.editorType === 'runner' && (
              <>
                <LockedOutcomeNotice />
                <div className="bg-[#1f2937]/50 border border-[#4a6a4a] rounded px-2 py-2 space-y-1">
                  <FieldRow label="From" value={runnerAction ? `${runnerAction.fromBase}B` : '—'} />
                  <FieldRow label="To" value={runnerAction ? (runnerAction.outcome === 'out' ? 'OUT' : `${runnerAction.toBase === 4 ? 'HOME' : `${runnerAction.toBase}B`}`) : '—'} />
                  <FieldRow label="Outcome" value={runnerAction?.outcome || '—'} />
                </div>

                {canEditCaughtBy ? (
                  <div>
                    <div className="text-[8px] text-[#88AA88] font-bold uppercase tracking-wide mb-1">Fielder Involved</div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => onRunnerCaughtByChange?.(null)}
                        disabled={saving}
                        className={`text-[8px] px-2 py-1 rounded border ${event.stolenBase?.caughtBy == null ? 'bg-[#C4A853]/20 border-[#C4A853] text-[#C4A853]' : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88]'}`}
                      >
                        None
                      </button>
                      {Array.from({ length: 9 }, (_, index) => index + 1).map((position) => (
                        <button
                          key={position}
                          onClick={() => onRunnerCaughtByChange?.(position)}
                          disabled={saving}
                          className={`text-[8px] px-2 py-1 rounded border ${event.stolenBase?.caughtBy === position ? 'bg-[#C4A853]/20 border-[#C4A853] text-[#C4A853]' : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88]'}`}
                        >
                          {position}
                        </button>
                      ))}
                    </div>
                    <div className="text-[7px] text-[#88AA88] mt-1">
                      {saving ? 'Saving…' : 'Editable enrichment only. Outcome stays locked.'}
                    </div>
                  </div>
                ) : (
                  <div className="text-[8px] text-[#88AA88]">
                    No editable enrichment fields are wired for this runner event yet.
                  </div>
                )}
              </>
            )}

            {entry.editorType === 'lineup_pitching' && (
              <>
                <div className="text-[8px] text-[#C4A853] bg-[#2f3b21] border border-[#5a6b38] px-2 py-1 rounded">
                  Lineup edits version this row, then replay forward from this event.
                </div>
                {event.type === 'position_change' && event.substitution && (
                  <div className="space-y-2">
                    <div className="bg-[#1f2937]/50 border border-[#4a6a4a] rounded px-2 py-2">
                      <FieldRow label="Player" value={event.substitution.inPlayerName || event.substitution.inPlayerId} />
                      <FieldRow label="Previous" value={event.substitution.previousPosition || '—'} />
                      <FieldRow label="Current" value={event.substitution.inPosition || event.substitution.previousPosition || '—'} />
                    </div>
                    <div>
                      <div className="text-[8px] text-[#88AA88] font-bold uppercase tracking-wide mb-1">Defensive Position</div>
                      <div className="flex flex-wrap gap-1">
                        {POSITION_OPTIONS.map((position) => (
                          <button
                            key={position}
                            onClick={() => onLineupPositionChange?.(position)}
                            disabled={saving}
                            className={`text-[8px] px-2 py-1 rounded border ${
                              (event.substitution?.inPosition || event.substitution?.previousPosition) === position
                                ? 'bg-[#C4A853]/20 border-[#C4A853] text-[#C4A853]'
                                : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88]'
                            }`}
                          >
                            {position}
                          </button>
                        ))}
                      </div>
                      <div className="text-[7px] text-[#88AA88] mt-1">
                        {saving ? 'Saving and replaying…' : 'Position changes replay the ledger from this point forward.'}
                      </div>
                    </div>
                  </div>
                )}
                {event.type === 'substitution' && event.substitution && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-2">
                      <label className="text-[8px] text-[#88AA88] font-bold uppercase tracking-wide">
                        Outgoing Player
                        <select
                          value={event.substitution.outPlayerId}
                          onChange={(e) => onSubstitutionPlayerChange?.('outPlayer', e.target.value)}
                          disabled={saving || lineupOptions.length === 0}
                          className="mt-1 w-full bg-[#1f2937]/60 border border-[#4a6a4a] rounded px-2 py-1 text-[9px] text-[#E8E8D8]"
                        >
                          {lineupOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-[8px] text-[#88AA88] font-bold uppercase tracking-wide">
                        Incoming Player
                        <select
                          value={event.substitution.inPlayerId}
                          onChange={(e) => onSubstitutionPlayerChange?.('inPlayer', e.target.value)}
                          disabled={saving || lineupOptions.length === 0}
                          className="mt-1 w-full bg-[#1f2937]/60 border border-[#4a6a4a] rounded px-2 py-1 text-[9px] text-[#E8E8D8]"
                        >
                          {lineupOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div>
                      <div className="text-[8px] text-[#88AA88] font-bold uppercase tracking-wide mb-1">Assigned Position</div>
                      <div className="flex flex-wrap gap-1">
                        {POSITION_OPTIONS.map((position) => (
                          <button
                            key={position}
                            onClick={() => onSubstitutionPositionChange?.(position)}
                            disabled={saving}
                            className={`text-[8px] px-2 py-1 rounded border ${
                              (event.substitution?.inPosition || event.substitution?.outPosition) === position
                                ? 'bg-[#C4A853]/20 border-[#C4A853] text-[#C4A853]'
                                : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88]'
                            }`}
                          >
                            {position}
                          </button>
                        ))}
                      </div>
                      <div className="text-[7px] text-[#88AA88] mt-1">
                        {saving ? 'Saving and replaying…' : 'Substitution fixes replay the ledger from this point forward.'}
                      </div>
                    </div>
                  </div>
                )}
                {event.substitution && (
                  <div className="bg-[#1f2937]/50 border border-[#4a6a4a] rounded px-2 py-2">
                    <FieldRow label="Out" value={event.substitution.outPlayerName || event.substitution.outPlayerId} />
                    <FieldRow label="In" value={event.substitution.inPlayerName || event.substitution.inPlayerId} />
                    <FieldRow label="Position" value={event.substitution.inPosition || event.substitution.outPosition || '—'} />
                  </div>
                )}
                {event.pitcherChange && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-2">
                      <label className="text-[8px] text-[#88AA88] font-bold uppercase tracking-wide">
                        Outgoing Pitcher
                        <select
                          value={event.pitcherChange.outgoingPitcherId}
                          onChange={(e) => onPitcherChange?.('outgoingPitcher', e.target.value)}
                          disabled={saving || pitcherOptions.length === 0}
                          className="mt-1 w-full bg-[#1f2937]/60 border border-[#4a6a4a] rounded px-2 py-1 text-[9px] text-[#E8E8D8]"
                        >
                          {pitcherOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-[8px] text-[#88AA88] font-bold uppercase tracking-wide">
                        Incoming Pitcher
                        <select
                          value={event.pitcherChange.incomingPitcherId}
                          onChange={(e) => onPitcherChange?.('incomingPitcher', e.target.value)}
                          disabled={saving || pitcherOptions.length === 0}
                          className="mt-1 w-full bg-[#1f2937]/60 border border-[#4a6a4a] rounded px-2 py-1 text-[9px] text-[#E8E8D8]"
                        >
                          {pitcherOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="bg-[#1f2937]/50 border border-[#4a6a4a] rounded px-2 py-2">
                      <FieldRow label="Outgoing" value={event.pitcherChange.outgoingPitcherName || event.pitcherChange.outgoingPitcherId} />
                      <FieldRow label="Incoming" value={event.pitcherChange.incomingPitcherName || event.pitcherChange.incomingPitcherId} />
                      <FieldRow label="Inherited" value={event.pitcherChange.inheritedRunners} />
                    </div>
                    <div className="text-[7px] text-[#88AA88]">
                      {saving ? 'Saving and replaying…' : 'Pitcher changes replay the ledger from this point forward.'}
                    </div>
                  </div>
                )}
                {event.type !== 'position_change' && event.type !== 'substitution' && event.type !== 'pitcher_change' && (
                  <div className="text-[8px] text-[#88AA88]">
                    Substitution and pitcher-change editing stay view-only until their replay editors are wired.
                  </div>
                )}
              </>
            )}

            {entry.editorType === 'context_modifiers' && (
              <>
                {(event.type === 'mojo_change' || event.type === 'fitness_change') && event.playerStateChange ? (
                  <div className="space-y-2">
                    <label className="text-[8px] text-[#88AA88] font-bold uppercase tracking-wide">
                      Value
                      <select
                        value={String(event.playerStateChange.newValue)}
                        onChange={(e) => onContextValueChange?.(e.target.value)}
                        disabled={saving || contextValueOptions.length === 0}
                        className="mt-1 w-full bg-[#1f2937]/60 border border-[#4a6a4a] rounded px-2 py-1 text-[9px] text-[#E8E8D8]"
                      >
                        {contextValueOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[8px] text-[#88AA88] font-bold uppercase tracking-wide">
                      Reason
                      <input
                        key={`${event.eventId}-${event.version ?? 1}-reason`}
                        type="text"
                        defaultValue={event.playerStateChange.reason || ''}
                        onBlur={(e) => onContextReasonChange?.(e.target.value)}
                        disabled={saving}
                        className="mt-1 w-full bg-[#1f2937]/60 border border-[#4a6a4a] rounded px-2 py-1 text-[9px] text-[#E8E8D8]"
                        placeholder="Optional note"
                      />
                    </label>
                    <div className="text-[7px] text-[#88AA88]">
                      {saving ? 'Saving…' : 'Context edits version this row in place without replay.'}
                    </div>
                  </div>
                ) : (
                  <div className="text-[8px] text-[#88AA88]">
                    Context rows are visible and selectable. Edit wiring will attach here as those producer paths are normalized.
                  </div>
                )}
                {event.playerStateChange && (
                  <div className="bg-[#1f2937]/50 border border-[#4a6a4a] rounded px-2 py-2">
                    <FieldRow label="Type" value={event.playerStateChange.stateType} />
                    <FieldRow label="Previous" value={String(event.playerStateChange.previousValue)} />
                    <FieldRow label="New" value={String(event.playerStateChange.newValue)} />
                    {event.playerStateChange.reason && <FieldRow label="Reason" value={event.playerStateChange.reason} />}
                  </div>
                )}
                {event.managerMoment && (
                  <div className="bg-[#1f2937]/50 border border-[#4a6a4a] rounded px-2 py-2">
                    <FieldRow label="Decision" value={event.managerMoment.decisionType} />
                    <FieldRow label="Leverage" value={event.managerMoment.leverageIndex.toFixed(1)} />
                    {event.managerMoment.context && <FieldRow label="Context" value={event.managerMoment.context} />}
                  </div>
                )}
                {event.pitchCountUpdate && (
                  <div className="bg-[#1f2937]/50 border border-[#4a6a4a] rounded px-2 py-2">
                    <FieldRow label="Pitch Count" value={event.pitchCountUpdate.pitchCount} />
                    <FieldRow label="Timing" value={event.pitchCountUpdate.timing} />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default HistoricalEventEditor;
