import React from 'react';

interface LiveRunnerAttributionPanelProps {
  title: string;
  summary: string;
  pitcherName?: string;
  catcherName?: string;
  fielderId: string;
  fielderOptions: Array<{ id: string; label: string }>;
  showErrorType?: boolean;
  errorType?: 'fielding' | 'throwing' | 'mental';
  saving?: boolean;
  onFielderChange: (fielderId: string) => void;
  onErrorTypeChange?: (errorType: 'fielding' | 'throwing' | 'mental') => void;
  onCancel: () => void;
  onCommit: () => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 border-b border-[#4a6a4a]/40 last:border-b-0">
      <div className="text-[8px] text-[#88AA88] uppercase tracking-wide">{label}</div>
      <div className="text-[9px] text-[#E8E8D8] text-right">{value}</div>
    </div>
  );
}

export function LiveRunnerAttributionPanel({
  title,
  summary,
  pitcherName,
  catcherName,
  fielderId,
  fielderOptions,
  showErrorType = false,
  errorType = 'fielding',
  saving = false,
  onFielderChange,
  onErrorTypeChange,
  onCancel,
  onCommit,
}: LiveRunnerAttributionPanelProps) {
  return (
    <div className="bg-[#2a3a2d] border-l-2 border-[#C4A853] flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1 bg-[#1a2a1d] border-b border-[#4a6a4a]">
        <div>
          <div className="text-[8px] text-[#88AA88] font-mono">LIVE RUNNER EVENT</div>
          <div className="text-[9px] text-[#E8E8D8] font-bold">{title}</div>
        </div>
        <button
          onClick={onCancel}
          className="text-[8px] text-[#E8E8D8] bg-[#3d5240] border border-[#4a6a4a] px-1.5 py-0.5 rounded hover:bg-[#4a6a4a]"
        >
          Cancel
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <div className="text-[8px] text-[#C4A853]">
          Confirm live runner attribution before committing the event.
        </div>

        <div className="bg-[#1f2937]/50 border border-[#4a6a4a] rounded px-2 py-2 space-y-1">
          <DetailRow label="Play" value={summary} />
          <DetailRow label="Pitcher" value={pitcherName || 'Unknown'} />
          <DetailRow label="Catcher" value={catcherName || 'Unknown'} />
        </div>

        <label className="text-[8px] text-[#88AA88] font-bold uppercase tracking-wide">
          Actual Fielder
          <select
            value={fielderId}
            onChange={(e) => onFielderChange(e.target.value)}
            disabled={saving || fielderOptions.length === 0}
            className="mt-1 w-full bg-[#1f2937]/60 border border-[#4a6a4a] rounded px-2 py-1 text-[9px] text-[#E8E8D8]"
          >
            <option value="">Unknown fielder</option>
            {fielderOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {showErrorType && (
          <label className="text-[8px] text-[#88AA88] font-bold uppercase tracking-wide">
            Error Type
            <select
              value={errorType}
              onChange={(e) => onErrorTypeChange?.(e.target.value as 'fielding' | 'throwing' | 'mental')}
              disabled={saving}
              className="mt-1 w-full bg-[#1f2937]/60 border border-[#4a6a4a] rounded px-2 py-1 text-[9px] text-[#E8E8D8]"
            >
              <option value="fielding">Fielding</option>
              <option value="throwing">Throwing</option>
              <option value="mental">Mental</option>
            </select>
          </label>
        )}

        <div className="text-[7px] text-[#88AA88]">
          {saving ? 'Saving…' : 'Pitcher and catcher come from the live defensive alignment. Fielder is the defender who completed the tag, throw, or misplay.'}
        </div>
      </div>

      <div className="p-2 border-t border-[#4a6a4a]">
        <button
          onClick={onCommit}
          disabled={saving}
          className="w-full bg-[#34d399] text-[#062b1f] font-bold text-[11px] py-2 border-2 border-[#10b981] hover:bg-[#6ee7b7] disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
        >
          {saving ? 'SAVING…' : 'LOG RUNNER EVENT'}
        </button>
      </div>
    </div>
  );
}
