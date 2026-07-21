import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SNAKE_SOUND_STORAGE_KEY,
  createSnakeSoundPlayer,
  loadSnakeSoundsEnabled,
  saveSnakeSoundsEnabled,
  snakeSoundForRoomEvent,
} from '../snakeSounds';

describe('snake sounds', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('maps the room sounds, including distinct public-pick and companion-request cues', () => {
    expect(snakeSoundForRoomEvent('NAVIGATE')).toBe('nav');
    expect(snakeSoundForRoomEvent('PICK_RECORDED')).toBe('gavel');
    expect(snakeSoundForRoomEvent('YOUR_TURN')).toBe('turn');
    expect(snakeSoundForRoomEvent('PRIVATE_SNIPE')).toBe('snipe');
    expect(snakeSoundForRoomEvent('DANGER')).toBe('danger');
    expect(snakeSoundForRoomEvent('PLAYER_DRAFTED')).toBe('drafted');
    expect(snakeSoundForRoomEvent('COMPANION_PICK_SENT')).toBe('request');
  });

  it('uses WebAudio when enabled and stays silent when disabled', () => {
    const oscillator = { type: 'square', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
    const context = { currentTime: 0, destination: {}, createOscillator: vi.fn(() => oscillator), createGain: vi.fn(() => gain) };
    const AudioContext = vi.fn(function MockAudioContext() { return context; });
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: AudioContext });

    const player = createSnakeSoundPlayer(true);
    player.play('gavel');
    expect(oscillator.start).toHaveBeenCalled();
    expect(oscillator.stop).toHaveBeenCalled();
    createSnakeSoundPlayer(false).play('danger');
    expect(AudioContext).toHaveBeenCalledTimes(1);
  });

  it('keeps the sound toggle choice across a room reload', () => {
    localStorage.removeItem(SNAKE_SOUND_STORAGE_KEY);
    expect(loadSnakeSoundsEnabled()).toBe(true);
    saveSnakeSoundsEnabled(false);
    expect(loadSnakeSoundsEnabled()).toBe(false);
    saveSnakeSoundsEnabled(true);
    expect(loadSnakeSoundsEnabled()).toBe(true);
  });
});
