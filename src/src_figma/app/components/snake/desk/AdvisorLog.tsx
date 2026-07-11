import type { AdvisorLogEntry } from './deskModel';

export function AdvisorLog({ entries }: { entries: readonly AdvisorLogEntry[] }) {
  return (
    <div className="space-y-2" aria-label="Advisor log">
      {entries.map((entry) => (
        <p key={entry.key} className={`border-l-4 border-[var(--ballpark-brass)] pl-3 ${entry.expired ? 'opacity-55' : 'font-bold'}`}>
          {entry.expired ? 'EXPIRED — ' : ''}{entry.text}
        </p>
      ))}
      {entries.length === 0 && <p>NO ACTION NEEDED RIGHT NOW.</p>}
    </div>
  );
}
