export interface TeamBrandingInput {
  primary?: string;
  secondary?: string;
  accent?: string;
}

export interface CompanionTeamBranding {
  primary: string;
  secondary: string;
  foreground: string;
  border: string;
}

function hex(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? '';
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed.slice(1).split('').map((part) => `${part}${part}`).join('')}`.toUpperCase();
  }
  const rgb = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(1(?:\.0*)?))?\s*\)$/i);
  if (rgb) {
    const channels = rgb.slice(1, 4).map(Number);
    if (channels.every((channel) => channel >= 0 && channel <= 255)) {
      return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
    }
  }
  return fallback;
}

function luminance(value: string): number {
  const channels = [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16) / 255)
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(left: string, right: string): number {
  const [light, dark] = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

export function companionTeamBranding(colors: TeamBrandingInput | null | undefined): CompanionTeamBranding {
  const primary = hex(colors?.primary, '#4A6844');
  const secondary = hex(colors?.secondary, '#C4A853');
  const accent = hex(colors?.accent, secondary);
  const chalk = '#E8E8D8';
  const ink = '#1A1A1A';
  const guaranteedForeground = contrast(primary, chalk) >= contrast(primary, ink) ? chalk : ink;
  const foreground = contrast(primary, secondary) >= 4.5 ? secondary : guaranteedForeground;
  const border = contrast(primary, accent) >= 1.35
    ? accent
    : contrast(primary, secondary) >= 1.35
      ? secondary
      : foreground;
  return { primary, secondary, foreground, border };
}
