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
