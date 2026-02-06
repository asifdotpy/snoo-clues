/**
 * Simple AudioManager with Web Audio API synthesis.
 * - Uses Web Audio API to generate simple game sounds (no external files needed)
 * - Supports HTML Audio elements for background music from CDN
 * - Persists mute state to localStorage under `snoo_audio_muted`
 */

import { syncAudioState } from '../bridge/HybridBridge';

export class AudioManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private synths: Map<string, { freq: number; duration: number }> = new Map();
  private music?: HTMLAudioElement;
  private mutedKey = 'snoo_audio_muted';
  private muted = false;
  private audioContext?: AudioContext;

  constructor() {
    try {
      const saved = localStorage.getItem(this.mutedKey);
      this.muted = saved === 'true';
    } catch (e) {
      this.muted = false;
    }
    
    // Initialize Web Audio Context lazily (browsers require user gesture for audioContext.resume())
    try {
      const ctx = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      if (ctx) {
        this.audioContext = new ctx();
      }
    } catch (e) {
      // noop - Web Audio not supported
    }
  }

  /**
   * Register a generated synth sound with frequency and duration
   * @param name - Sound identifier
   * @param freq - Frequency in Hz (e.g., 800 for A5)
   * @param duration - Duration in milliseconds
   */
  registerSynth(name: string, freq: number, duration: number): void {
    this.synths.set(name, { freq, duration });
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
      // noop
    }
  }

  registerMusic(src: string): void {
    try {
      const ctor = (globalThis as any).Audio;
      if (!ctor) return;
      this.music = new ctor(src);
      if (this.music) {
        this.music.loop = true;
        this.music.preload = 'auto';
        this.music.muted = this.muted;
      }
    } catch (e) {
      // noop
    }
  }

  /**
   * Play a synthetic tone or loaded sound
   */
  playSound(name: string): void {
    if (this.muted) return;

    // Try synth first
    const synth = this.synths.get(name);
    if (synth) {
      this.playSynth(synth.freq, synth.duration);
      return;
    }

    // Fall back to HTML Audio
    const s = this.sounds.get(name);
    if (!s) return;
    try {
      s.currentTime = 0;
      void s.play();
    } catch (e) {
      // ignore play errors
    }
  }

  /**
   * Play a simple sine wave tone using Web Audio API
   */
  private playSynth(frequency: number, duration: number): void {
    if (!this.audioContext) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const endTime = now + duration / 1000;

      // Resume audio context if suspended (required by browsers on user gesture)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Create oscillator
      const osc = ctx.createOscillator();
      osc.frequency.value = frequency;
      osc.type = 'sine';

      // Create gain node for volume envelope
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, endTime);

      // Connect and play
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(endTime);
    } catch (e) {
      // noop - Web Audio synthesis failed
    }
  }

  playMusic(): void {
    if (this.muted) return;
    if (!this.music) return;
    try {
      // Resume audio context if needed
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
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
      if (this.music) {
        this.music.muted = v;
        // If we are unmuting and music was intended to be playing, ensure it is
        // Note: Browsers handle the 'muted' attribute on the element,
        // so we don't strictly need to pause/play here unless we want to stop loading.
      }
      localStorage.setItem(this.mutedKey, String(v));
    } catch (e) {
      console.warn('[Audio] Failed to persist mute state:', e);
    }

    // Synchronize with GameMaker mascot system
    syncAudioState(v);
  }

  toggleMuted(): void {
    this.setMuted(!this.muted);
  }

  /**
   * Synchronize the current state with external systems (like GameMaker)
   */
  sync(): void {
    syncAudioState(this.muted);
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
