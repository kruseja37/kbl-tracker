export type AudioSoundName =
  | 'quickBarTap'
  | 'runScored'
  | 'homeRun'
  | 'strikeout'
  | 'halfInning'
  | 'undoBloop'
  | 'startGame'
  | 'endGame'
  | 'beatReporterType';

type SoundCategory = 'game' | 'beatReporter';

interface ToneStep {
  frequency: number;
  durationMs: number;
  gapMs?: number;
  waveform?: OscillatorType;
  volume?: number;
  slideToFrequency?: number;
}

type SoundDefinition = {
  category: SoundCategory;
  notes: ToneStep[];
};

type AudioContextConstructor = typeof AudioContext;

type BrowserAudioWindow = Window & {
  webkitAudioContext?: AudioContextConstructor;
};

const SOUND_DEFINITIONS: Record<AudioSoundName, SoundDefinition> = {
  quickBarTap: {
    category: 'game',
    notes: [
      { frequency: 720, durationMs: 45, waveform: 'square', volume: 0.035 },
      { frequency: 520, durationMs: 55, waveform: 'triangle', volume: 0.03 },
    ],
  },
  runScored: {
    category: 'game',
    notes: [
      { frequency: 523.25, durationMs: 85, waveform: 'square', volume: 0.04 },
      { frequency: 659.25, durationMs: 95, waveform: 'square', volume: 0.04 },
      { frequency: 783.99, durationMs: 120, waveform: 'triangle', volume: 0.045 },
    ],
  },
  homeRun: {
    category: 'game',
    notes: [
      { frequency: 523.25, durationMs: 90, waveform: 'square', volume: 0.04 },
      { frequency: 659.25, durationMs: 90, waveform: 'square', volume: 0.04 },
      { frequency: 783.99, durationMs: 110, waveform: 'square', volume: 0.045 },
      { frequency: 1046.5, durationMs: 170, waveform: 'triangle', volume: 0.05, slideToFrequency: 1174.66 },
    ],
  },
  strikeout: {
    category: 'game',
    notes: [
      { frequency: 587.33, durationMs: 120, waveform: 'square', volume: 0.04 },
      { frequency: 392.0, durationMs: 160, waveform: 'triangle', volume: 0.04, slideToFrequency: 329.63 },
    ],
  },
  halfInning: {
    category: 'game',
    notes: [
      { frequency: 880, durationMs: 65, waveform: 'triangle', volume: 0.03 },
      { frequency: 1174.66, durationMs: 65, waveform: 'triangle', volume: 0.03 },
      { frequency: 987.77, durationMs: 80, waveform: 'square', volume: 0.035 },
    ],
  },
  undoBloop: {
    category: 'game',
    notes: [
      { frequency: 520, durationMs: 70, waveform: 'triangle', volume: 0.03 },
      { frequency: 390, durationMs: 70, waveform: 'triangle', volume: 0.03 },
      { frequency: 260, durationMs: 80, waveform: 'square', volume: 0.025 },
    ],
  },
  startGame: {
    category: 'game',
    notes: [
      { frequency: 392.0, durationMs: 100, waveform: 'square', volume: 0.035 },
      { frequency: 523.25, durationMs: 110, waveform: 'square', volume: 0.04 },
      { frequency: 659.25, durationMs: 120, waveform: 'triangle', volume: 0.045 },
      { frequency: 783.99, durationMs: 170, waveform: 'triangle', volume: 0.05 },
    ],
  },
  endGame: {
    category: 'game',
    notes: [
      { frequency: 659.25, durationMs: 110, waveform: 'triangle', volume: 0.04 },
      { frequency: 523.25, durationMs: 110, waveform: 'triangle', volume: 0.04 },
      { frequency: 440.0, durationMs: 120, waveform: 'square', volume: 0.035 },
      { frequency: 329.63, durationMs: 170, waveform: 'triangle', volume: 0.03 },
    ],
  },
  beatReporterType: {
    category: 'beatReporter',
    notes: [
      { frequency: 1320, durationMs: 24, waveform: 'square', volume: 0.018 },
      { frequency: 990, durationMs: 24, waveform: 'square', volume: 0.018, gapMs: 4 },
    ],
  },
};

export class AudioManager {
  gameSoundsEnabled = false;
  beatReporterSoundsEnabled = false;
  private audioContext: AudioContext | null = null;

  setGameSoundsEnabled(enabled: boolean) {
    this.gameSoundsEnabled = enabled;
  }

  setBeatReporterSoundsEnabled(enabled: boolean) {
    this.beatReporterSoundsEnabled = enabled;
  }

  async playSound(name: AudioSoundName) {
    const sound = SOUND_DEFINITIONS[name];
    if (!sound || !this.isCategoryEnabled(sound.category)) {
      return;
    }

    const context = this.getAudioContext();
    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
      try {
        await context.resume();
      } catch (error) {
        console.warn('[AudioManager] Failed to resume AudioContext:', error);
        return;
      }
    }

    this.scheduleSound(context, sound.notes);
  }

  private isCategoryEnabled(category: SoundCategory) {
    return category === 'game' ? this.gameSoundsEnabled : this.beatReporterSoundsEnabled;
  }

  private getAudioContext() {
    if (typeof window === 'undefined') {
      return null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      return this.audioContext;
    }

    const audioWindow = window as BrowserAudioWindow;
    const AudioContextCtor = window.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }

    this.audioContext = new AudioContextCtor();
    return this.audioContext;
  }

  private scheduleSound(context: AudioContext, notes: ToneStep[]) {
    let nextStartTime = context.currentTime + 0.005;

    notes.forEach((note) => {
      const oscillator: OscillatorNode = context.createOscillator();
      const gainNode: GainNode = context.createGain();
      const durationSeconds = note.durationMs / 1000;
      const gapSeconds = (note.gapMs ?? 12) / 1000;
      const peakVolume = note.volume ?? 0.03;

      oscillator.type = note.waveform ?? 'square';
      oscillator.frequency.setValueAtTime(note.frequency, nextStartTime);
      if (note.slideToFrequency) {
        oscillator.frequency.linearRampToValueAtTime(note.slideToFrequency, nextStartTime + durationSeconds);
      }

      gainNode.gain.setValueAtTime(0.0001, nextStartTime);
      gainNode.gain.linearRampToValueAtTime(peakVolume, nextStartTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, nextStartTime + durationSeconds);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(nextStartTime);
      oscillator.stop(nextStartTime + durationSeconds);

      nextStartTime += durationSeconds + gapSeconds;
    });
  }
}

export default AudioManager;
