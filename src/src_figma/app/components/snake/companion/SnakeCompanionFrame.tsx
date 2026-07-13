import type { ReactNode } from 'react';

export function safeCompanionLogoUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^(?:https?:|blob:|\/)/i.test(trimmed)) return trimmed;
  if (/^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(trimmed)) return trimmed;
  return null;
}

type OpaqueRgb = { r: number; g: number; b: number; css: string };

function parseOpaqueColor(value: string | undefined): OpaqueRgb | null {
  if (!value) return null;
  const trimmed = value.trim().toLocaleLowerCase();
  const hex = trimmed.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)?.[1];
  if (hex) {
    const expanded = hex.length <= 4 ? [...hex].map((digit) => `${digit}${digit}`).join('') : hex;
    if (expanded.length === 8 && Number.parseInt(expanded.slice(6, 8), 16) < 230) return null;
    const r = Number.parseInt(expanded.slice(0, 2), 16);
    const g = Number.parseInt(expanded.slice(2, 4), 16);
    const b = Number.parseInt(expanded.slice(4, 6), 16);
    return { r, g, b, css: `rgb(${r}, ${g}, ${b})` };
  }
  const rgb = trimmed.match(/^rgba?\(([^)]+)\)$/i)?.[1]?.split(',').map((part) => part.trim());
  if (!rgb || rgb.length < 3 || rgb.length > 4) return null;
  const channel = (part: string): number => part.endsWith('%')
    ? Math.round(Number.parseFloat(part) * 2.55)
    : Math.round(Number.parseFloat(part));
  const [r, g, b] = rgb.slice(0, 3).map(channel);
  const alpha = rgb[3] === undefined ? 1 : Number.parseFloat(rgb[3]);
  if (![r, g, b, alpha].every(Number.isFinite)
    || [r, g, b].some((part) => part < 0 || part > 255)
    || alpha < 0.9 || alpha > 1) return null;
  return { r, g, b, css: `rgb(${r}, ${g}, ${b})` };
}

function luminance(color: OpaqueRgb): number {
  const channels = [color.r, color.g, color.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(left: OpaqueRgb, right: OpaqueRgb): number {
  const bright = Math.max(luminance(left), luminance(right));
  const dark = Math.min(luminance(left), luminance(right));
  return (bright + 0.05) / (dark + 0.05);
}

export function buildCompanionBranding(colors: {
  primary?: string;
  secondary?: string;
  accent?: string;
} | undefined): { background: string; foreground: string; border: string } {
  const fallbackBackground = parseOpaqueColor('#173c2a')!;
  const background = parseOpaqueColor(colors?.primary) ?? fallbackBackground;
  const black = parseOpaqueColor('#0b0f0c')!;
  const white = parseOpaqueColor('#ffffff')!;
  const guaranteedForeground = contrast(background, black) >= contrast(background, white) ? black : white;
  const requestedForeground = parseOpaqueColor(colors?.secondary);
  const foreground = requestedForeground && contrast(background, requestedForeground) >= 4.5
    ? requestedForeground
    : guaranteedForeground;
  const requestedBorder = parseOpaqueColor(colors?.accent);
  const border = requestedBorder && contrast(background, requestedBorder) >= 3
    ? requestedBorder
    : foreground;
  return { background: background.css, foreground: foreground.css, border: border.css };
}

export function CompanionCoveredScreen(props: {
  onReturn: () => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
  onForgetRoom?: () => void | Promise<void>;
  message?: string | null;
}) {
  return (
    <main className="ballpark-page min-h-screen" data-testid="snake-companion-covered">
      <section className="ballpark-panel mx-auto max-w-xl text-center">
        <h1 className="ballpark-title text-3xl">DEVICE COVERED</h1>
        {props.message ? <p className="mt-3 font-bold" role="alert">{props.message}</p> : null}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" className="ballpark-press-button ballpark-press-md ballpark-press-gold" onClick={() => void props.onReturn()}>RETURN TO DESK</button>
          {props.onForgetRoom ? <button type="button" className="ballpark-press-button ballpark-press-md ballpark-press-default" onClick={() => void props.onForgetRoom?.()}>FORGET ROOM</button> : null}
          <button type="button" className="ballpark-press-button ballpark-press-md ballpark-press-default" onClick={() => void props.onSignOut()}>SIGN OUT</button>
        </div>
      </section>
    </main>
  );
}

export function CompanionCompletedScreen(props: {
  teamName: string;
  onLeave: () => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
}) {
  return (
    <main className="ballpark-page min-h-screen" data-testid="snake-companion-complete">
      <section className="ballpark-panel mx-auto max-w-xl text-center">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">{props.teamName.toUpperCase()}</p>
        <h1 className="ballpark-title mt-1 text-3xl">DRAFT COMPLETE</h1>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" className="ballpark-press-button ballpark-press-md ballpark-press-gold" onClick={() => void props.onLeave()}>LEAVE ROOM</button>
          <button type="button" className="ballpark-press-button ballpark-press-md ballpark-press-default" onClick={() => void props.onSignOut()}>SIGN OUT</button>
        </div>
      </section>
    </main>
  );
}

export function SnakeCompanionFrame(props: {
  team: {
    id: string;
    name: string;
    abbreviation: string;
    logoUrl?: string;
    colors?: { primary?: string; secondary?: string; accent?: string };
  };
  currentPick: number;
  order: readonly { pick: number; teamName: string }[];
  ticker: readonly string[];
  selectedPlayer?: ReactNode;
  draftedTruth?: ReactNode;
  privateDesk: ReactNode;
  message?: string | null;
  onCover: () => void;
  onForgetRoom?: () => void;
}) {
  const logoUrl = safeCompanionLogoUrl(props.team.logoUrl);
  const branding = buildCompanionBranding(props.team.colors);
  return (
    <main className="ballpark-page min-h-screen" data-testid="snake-companion-frame">
      <header
        className="mb-5 flex flex-wrap items-center justify-between gap-3 border-4 p-3"
        style={{ backgroundColor: branding.background, color: branding.foreground, borderColor: branding.border }}
        data-testid="companion-team-header"
      >
        <div className="flex items-center gap-3">
          {logoUrl ? <img className="h-14 w-14 object-contain" src={logoUrl} alt={`${props.team.name} logo`} onError={(event) => { event.currentTarget.hidden = true; }} /> : null}
          <div>
          <p className="text-[11px] font-bold tracking-[0.2em]" style={{ color: branding.foreground }}>YOUR PRIVATE DRAFT DESK</p>
          <h1 className="ballpark-title text-3xl" style={{ color: branding.foreground }}>{props.team.name.toUpperCase()}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {props.onForgetRoom ? <button className="ballpark-press-button ballpark-press-sm ballpark-press-default" onClick={props.onForgetRoom}>FORGET ROOM</button> : null}
          <button className="ballpark-press-button ballpark-press-sm ballpark-press-default" onClick={props.onCover}>COVER THIS DEVICE</button>
        </div>
      </header>
      {props.message ? <p className="mb-4 border-4 border-[var(--ballpark-panel-border)] p-3 font-bold" role="status">{props.message}</p> : null}
      <section className="ballpark-panel mb-4" aria-label="Draft order">
        <p className="font-bold">CURRENT PICK {props.currentPick}</p>
        <div className="mt-2 flex gap-2 overflow-x-auto">{props.order.map((slot) => <span key={slot.pick} className="whitespace-nowrap border-2 border-[var(--ballpark-panel-border)] px-2 py-1 text-sm">#{slot.pick} {slot.teamName.toUpperCase()}</span>)}</div>
      </section>
      <section className="ballpark-panel mb-4" aria-label="Draft ticker">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">ROOM TICKER</p>
        {props.ticker.length ? props.ticker.map((line) => <p key={line} className="mt-1 text-sm">{line}</p>) : <p className="mt-1 text-sm">NO PICKS RECORDED YET.</p>}
      </section>
      {props.selectedPlayer}
      {props.draftedTruth ? <div className="mb-4">{props.draftedTruth}</div> : null}
      <section className="ballpark-panel mb-4">{props.privateDesk}</section>
    </main>
  );
}
