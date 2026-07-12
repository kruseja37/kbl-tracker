export interface SnakeDraftRecapTeam {
  id: string;
  name: string;
  abbreviation: string;
  colors: { primary: string; secondary: string; accent?: string };
  logoUrl?: string;
}

export interface SnakeDraftRecapPick {
  pick: number;
  teamId: string;
  playerId: string;
  playerName: string;
  position?: string;
  salary?: number;
  tax?: number;
}

function money(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.round(Math.abs(value)).toLocaleString()}`;
}

function knownTotal(picks: readonly SnakeDraftRecapPick[], field: 'salary' | 'tax'): number | null {
  const values = picks.map((pick) => pick[field]);
  if (values.some((value) => typeof value !== 'number' || !Number.isFinite(value))) return null;
  return values.reduce<number>((sum, value) => sum + (value as number), 0);
}

function moneyOrUnknown(value: number | null): string {
  return value === null ? '—' : money(value);
}

export function SnakeDraftRecap(props: {
  phase: 'MLB' | 'FARM';
  teams: readonly SnakeDraftRecapTeam[];
  picks: readonly SnakeDraftRecapPick[];
  committing: boolean;
  error?: string | null;
  onConfirm: () => void | Promise<void>;
}) {
  const showTax = props.phase === 'MLB';
  return (
    <main className="ballpark-page min-h-screen" data-testid="snake-draft-recap">
      <header className="mb-5">
        <p className="text-[11px] font-bold tracking-[0.2em] text-[var(--ballpark-brass)]">DRAFT COMPLETE</p>
        <h1 className="ballpark-title text-3xl">{props.phase} DRAFT RECAP</h1>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        {props.teams.map((team) => {
          const picks = props.picks.filter((pick) => pick.teamId === team.id).sort((a, b) => a.pick - b.pick);
          const salary = knownTotal(picks, 'salary');
          const tax = showTax ? knownTotal(picks, 'tax') : 0;
          const allIn = salary === null || tax === null ? null : salary + tax;
          return (
            <section key={team.id} className="ballpark-panel" aria-label={`${team.name} draft recap`}>
              <div className="ballpark-panel-strip flex items-center gap-3" style={{ backgroundColor: team.colors.primary, color: team.colors.secondary, borderColor: team.colors.accent ?? team.colors.secondary }}>
                {team.logoUrl ? <img src={team.logoUrl} alt={`${team.name} logo`} className="h-10 w-10 object-contain" /> : null}
                <strong>{team.name.toUpperCase()}</strong>
              </div>
              <div className={`mb-3 grid gap-2 ${showTax ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <div><p className="text-[10px] font-bold text-[var(--ballpark-brass)]">ROSTER</p><strong>{picks.length}</strong></div>
                <div><p className="text-[10px] font-bold text-[var(--ballpark-brass)]">SALARY</p><strong>{moneyOrUnknown(salary)}</strong></div>
                {showTax ? <div><p className="text-[10px] font-bold text-[var(--ballpark-brass)]">TAX</p><strong>{moneyOrUnknown(tax)}</strong></div> : null}
                <div><p className="text-[10px] font-bold text-[var(--ballpark-brass)]">ALL-IN</p><strong>{moneyOrUnknown(allIn)}</strong></div>
              </div>
              <ol className="space-y-2">
                {picks.map((pick) => (
                  <li key={`${pick.pick}-${pick.playerId}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-2 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-2">
                    <strong>#{pick.pick}</strong>
                    <span><strong>{pick.playerName.toUpperCase()}</strong>{pick.position ? <small className="ml-2 text-[var(--ballpark-brass)]">{pick.position}</small> : null}</span>
                    <span className="text-right text-xs font-bold">
                      <span className="block">{typeof pick.salary === 'number' && Number.isFinite(pick.salary) ? money(pick.salary) : '—'}</span>
                      {showTax ? <span className="block">TAX {typeof pick.tax === 'number' && Number.isFinite(pick.tax) ? money(pick.tax) : '—'}</span> : null}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
      {props.error ? <p className="mt-5 border-4 border-[var(--ballpark-warn-border)] bg-[var(--ballpark-warn-panel)] p-3 font-black text-[var(--ballpark-warn-text)]" role="alert">{props.error}</p> : null}
      <button className="ballpark-press-button ballpark-press-lg ballpark-press-gold mt-5" disabled={props.committing} onClick={() => void props.onConfirm()}>
        {props.committing ? 'COMMITTING…' : `CONFIRM ${props.phase} DRAFT`}
      </button>
    </main>
  );
}
