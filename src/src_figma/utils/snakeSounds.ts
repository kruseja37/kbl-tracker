export type SnakeSound = 'nav' | 'gavel' | 'turn' | 'snipe' | 'danger';
export type SnakeSoundEvent = 'NAVIGATE' | 'PICK_RECORDED' | 'YOUR_TURN' | 'PRIVATE_SNIPE' | 'DANGER';

const SOUND_BY_EVENT: Record<SnakeSoundEvent, SnakeSound> = {
  NAVIGATE: 'nav',
  PICK_RECORDED: 'gavel',
  YOUR_TURN: 'turn',
  PRIVATE_SNIPE: 'snipe',
  DANGER: 'danger',
};

const NOTES: Record<SnakeSound, readonly number[]> = {
  nav: [330],
  gavel: [110, 82],
  turn: [440, 660],
  snipe: [740, 370, 740],
  danger: [220, 220, 174],
};

export function snakeSoundForRoomEvent(event: SnakeSoundEvent): SnakeSound {
  return SOUND_BY_EVENT[event];
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
