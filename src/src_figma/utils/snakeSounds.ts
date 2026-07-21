export type SnakeSound = 'nav' | 'gavel' | 'turn' | 'snipe' | 'danger' | 'drafted' | 'request';
export type SnakeSoundEvent = 'NAVIGATE' | 'PICK_RECORDED' | 'YOUR_TURN' | 'PRIVATE_SNIPE' | 'DANGER'
  | 'PLAYER_DRAFTED' | 'COMPANION_PICK_SENT';

export const SNAKE_SOUND_STORAGE_KEY = 'kbl-snake-sounds-enabled';

const SOUND_BY_EVENT: Record<SnakeSoundEvent, SnakeSound> = {
  NAVIGATE: 'nav',
  PICK_RECORDED: 'gavel',
  YOUR_TURN: 'turn',
  PRIVATE_SNIPE: 'snipe',
  DANGER: 'danger',
  PLAYER_DRAFTED: 'drafted',
  COMPANION_PICK_SENT: 'request',
};

const NOTES: Record<SnakeSound, readonly number[]> = {
  nav: [330],
  gavel: [110, 82],
  turn: [440, 660],
  snipe: [740, 370, 740],
  danger: [220, 220, 174],
  drafted: [523, 659, 784],
  request: [784, 1047],
};

export function snakeSoundForRoomEvent(event: SnakeSoundEvent): SnakeSound {
  return SOUND_BY_EVENT[event];
}

export function loadSnakeSoundsEnabled(storage?: Pick<Storage, 'getItem'> | null): boolean {
  try {
    const source = storage ?? (typeof window === 'undefined' ? null : window.localStorage);
    return source?.getItem(SNAKE_SOUND_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function saveSnakeSoundsEnabled(enabled: boolean, storage?: Pick<Storage, 'setItem'> | null): void {
  try {
    const target = storage ?? (typeof window === 'undefined' ? null : window.localStorage);
    target?.setItem(SNAKE_SOUND_STORAGE_KEY, String(enabled));
  } catch {
    // Sound preference is optional; a blocked browser store must not block the room.
  }
}

export function createSnakeSoundPlayer(enabled: boolean) {
  return {
    play(sound: SnakeSound) {
      if (!enabled || typeof window === 'undefined') return;
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      NOTES[sound].forEach((frequency, index) => {
        const start = context.currentTime + index * 0.075;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.055, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.07);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.075);
      });
    },
  };
}
