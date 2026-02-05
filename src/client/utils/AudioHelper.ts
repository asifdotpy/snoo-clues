/**
 * Simple AudioManager to scaffold sound/music control and persistence.
 * - Registers named sound effects and one music track
 * - Persists mute state to localStorage under `snoo_audio_muted`
 */
export class AudioManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private music?: HTMLAudioElement;
  private mutedKey = 'snoo_audio_muted';
  private muted = false;

  constructor() {
    try {
      const saved = localStorage.getItem(this.mutedKey);
      this.muted = saved === 'true';
    } catch (e) {
      this.muted = false;
    }
  }

  registerSound(name: string, src: string): void {
    try {
      const ctor = (globalThis as any).Audio;
      if (!ctor) return;
      const a = new ctor(src);
      a.preload = 'auto';
      a.muted = this.muted;
      this.sounds.set(name, a);
    } catch (e) {
      // noop - environments without Audio will skip
    }
  }

  registerMusic(src: string): void {
    try {
      const ctor = (globalThis as any).Audio;
      if (!ctor) return;
      this.music = new ctor(src);
      this.music.loop = true;
      this.music.preload = 'auto';
      this.music.muted = this.muted;
    } catch (e) {
      // noop
    }
  }

  playSound(name: string): void {
    if (this.muted) return;
    const s = this.sounds.get(name);
    if (!s) return;
    try {
      s.currentTime = 0;
      void s.play();
    } catch (e) {
      // ignore play errors
    }
  }

  playMusic(): void {
    if (this.muted) return;
    if (!this.music) return;
    try {
      void this.music.play();
    } catch (e) {}
  }

  pauseMusic(): void {
    try {
      this.music?.pause();
    } catch (e) {}
  }

  setMuted(v: boolean): void {
    this.muted = v;
    try {
      this.sounds.forEach(s => (s.muted = v));
      if (this.music) this.music.muted = v;
      localStorage.setItem(this.mutedKey, String(v));
    } catch (e) {}
    if (v) this.pauseMusic(); else this.playMusic();
  }

  toggleMuted(): void {
    this.setMuted(!this.muted);
  }

  isMuted(): boolean {
    return this.muted;
  }

  async preloadAll(): Promise<void> {
    const elements: HTMLMediaElement[] = [...this.sounds.values()];
    if (this.music) elements.push(this.music);
    await Promise.all(elements.map(e => new Promise<void>(res => {
      if ((e as any).readyState >= 4) return res();
      const onEnd = () => res();
      const onErr = () => res();
      e.addEventListener('canplaythrough', onEnd, { once: true });
      e.addEventListener('error', onErr, { once: true });
    })));
  }
}

export const Audio = new AudioManager();
