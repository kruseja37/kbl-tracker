const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

export function toSuperscript(num: number): string {
  const str = Math.round(num).toString();
  return str.split("").map((digit) => SUPERSCRIPT_DIGITS[digit] || digit).join("");
}

export function getMoraleColor(morale: number): string {
  if (morale >= 80) return "#22c55e";
  if (morale >= 60) return "#4ade80";
  if (morale >= 40) return "#9ca3af";
  if (morale >= 20) return "#f97316";
  return "#ef4444";
}

export function getMoraleState(morale: number): string {
  if (morale >= 80) return "Ecstatic";
  if (morale >= 60) return "Happy";
  if (morale >= 40) return "Content";
  if (morale >= 20) return "Unhappy";
  return "Miserable";
}

export interface MoraleDisplay {
  superscript: string;
  color: string;
  value: number;
  state: string;
}

export function getMoraleDisplay(morale: number): MoraleDisplay {
  const clampedMorale = Math.max(0, Math.min(99, morale));

  return {
    superscript: toSuperscript(clampedMorale),
    color: getMoraleColor(clampedMorale),
    value: clampedMorale,
    state: getMoraleState(clampedMorale),
  };
}
