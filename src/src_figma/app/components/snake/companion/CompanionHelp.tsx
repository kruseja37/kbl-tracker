import { useState, type ReactNode } from 'react';

export function CompanionHelp(props: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        type="button"
        aria-label="COMPANION HELP"
        aria-expanded={open}
        className="ballpark-press-button ballpark-press-sm ballpark-press-default"
        onClick={() => setOpen((current) => !current)}
      >
        ?
      </button>
      {open ? (
        <aside className="mt-3 border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-3 text-sm" aria-label="Companion instructions">
          {props.children}
        </aside>
      ) : null}
    </div>
  );
}
