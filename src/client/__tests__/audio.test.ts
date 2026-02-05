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

beforeEach(() => {
  // Reset module cache so the AudioManager uses the mocked global Audio
  vi.resetModules();
  // @ts-ignore - test environment override
  globalThis.Audio = MockAudio as any;
  localStorage.clear();
});

describe('AudioManager scaffold', () => {
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
    Audio.registerSound('hit', '/sounds/hit.mp3');
    Audio.setMuted(true);
    Audio.playSound('hit');
    const s = (Audio as any).sounds.get('hit');
    expect(s.play).not.toHaveBeenCalled();
  });

  it('plays sound when unmuted', async () => {
    const mod = await import('../utils/AudioHelper');
    const { Audio } = mod as any;
    Audio.registerSound('hit', '/sounds/hit.mp3');
    Audio.setMuted(false);
    Audio.playSound('hit');
    const s = (Audio as any).sounds.get('hit');
    expect(s.play).toHaveBeenCalled();
  });
});
