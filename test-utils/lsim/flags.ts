import * as phase2Flags from '../../src/utils/franchisePhase2Flags';

type FlagSetter = (enabled: boolean | null) => void;

export interface ForcedPhase2Flags {
  setterNames: string[];
  restore: () => void;
}

export function forceAllPhase2FlagsOn(): ForcedPhase2Flags {
  const setters = Object.entries(phase2Flags).filter(
    (entry): entry is [string, FlagSetter] =>
      entry[0].startsWith('setFranchisePhase2') &&
      entry[0].endsWith('EnabledForTests') &&
      typeof entry[1] === 'function',
  );

  if (setters.length < 8) {
    throw new Error(
      `[L-SIM-H1] Phase-2 flag enumeration found ${setters.length} setters; expected at least the 8 Phase-2 flags.`,
    );
  }

  for (const [, setter] of setters) setter(true);

  return {
    setterNames: setters.map(([name]) => name).sort(),
    restore: () => {
      for (const [, setter] of setters) setter(null);
    },
  };
}
