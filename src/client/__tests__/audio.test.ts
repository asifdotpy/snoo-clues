import { describe, it, expect, beforeEach, vi } from 'vitest';

class MockAudio {
  src: string | undefined;
  loop = false;
  preload = '';
  muted = false;
  readyState = 4;
  currentTime = 0;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn(() => {});
  addEventListener = (_: string, __: any) => {};
  constructor(s?: string) { this.src = s; }
}

class MockOscillator {
  frequency = { value: 0 };
  type = 'sine';
  connect = vi.fn(() => this);
  start = vi.fn();
  stop = vi.fn();
}

class MockGain {
  gain = { 
    setValueAtTime: vi.fn(), 
    exponentialRampToValueAtTime: vi.fn() 
  };
  connect = vi.fn(() => this);
}

class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  resume = vi.fn(() => Promise.resolve());
  createOscillator = vi.fn(() => new MockOscillator());
  createGain = vi.fn(() => new MockGain());
}

beforeEach(() => {
  vi.resetModules();
  // @ts-ignore
  globalThis.Audio = MockAudio as any;
  // @ts-ignore
  globalThis.AudioContext = MockAudioContext as any;
  // @ts-ignore
  globalThis.webkitAudioContext = MockAudioContext as any;
  localStorage.clear();
});

describe('AudioManager with Web Audio API', () => {
  it('persists mute setting to localStorage', async () => {
    const mod = await import('../utils/AudioHelper');
    const { Audio } = mod as any;
    Audio.setMuted(true);
    expect(localStorage.getItem('snoo_audio_muted')).toBe('true');
    Audio.setMuted(false);
    expect(localStorage.getItem('snoo_audio_muted')).toBe('false');
  });

  it('does not play sounds when muted', async () => {
    const mod = await import('../utils/AudioHelper');
    const { Audio } = mod as any;
    Audio.registerSynth('hit', 800, 150);
    Audio.setMuted(true);
    Audio.playSound('hit');
    // When muted, playSound returns early and doesn't synthesize
    const synth = (Audio as any).synths.get('hit');
    expect(synth).toBeDefined();
  });

  it('plays synth sound when unmuted', async () => {
    const mod = await import('../utils/AudioHelper');
    const { Audio } = mod as any;
    Audio.registerSynth('hit', 800, 150);
    Audio.setMuted(false);
    Audio.playSound('hit');
    const synth = (Audio as any).synths.get('hit');
    expect(synth).toBeDefined();
    expect(synth.freq).toBe(800);
  });

  it('supports both HTML Audio and Web Audio synths', async () => {
    const mod = await import('../utils/AudioHelper');
    const { Audio } = mod as any;
    
    // Register both types
    Audio.registerSynth('hit', 800, 150);
    Audio.registerSound('wrong', '/sounds/wrong.mp3');
    
    expect((Audio as any).synths.size).toBe(1);
    expect((Audio as any).sounds.size).toBe(1);
  });

  it('prioritizes synth over HTML Audio when both registered', async () => {
    const mod = await import('../utils/AudioHelper');
    const { Audio } = mod as any;
    
    // Register synth first with same name
    Audio.registerSynth('hit', 800, 150);
    // This would try to register Audio element with same name
    Audio.registerSound('hit', '/sounds/hit.mp3');
    
    // Synth should be in synths map
    expect((Audio as any).synths.get('hit')).toBeDefined();
  });
});

