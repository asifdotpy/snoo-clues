/**
 * Audio Assets Configuration
 * Modular architecture for managing game sounds and music.
 */

export interface SoundConfig {
    url: string;
    synthFallback: {
        freq: number;
        duration: number;
    };
}

export const AUDIO_CONFIG = {
    bgm: {
        url: 'https://assets.mixkit.co/active_storage/music/20-smooth-cool-jazz.mp3',
        // Music typically doesn't have a synth fallback, but we keep the structure consistent
    },
    sfx: {
        click: {
            url: 'https://www.soundjay.com/buttons/button-16.mp3',
            synthFallback: { freq: 1000, duration: 50 }
        },
        hit: {
            url: 'https://www.soundjay.com/buttons/button-3.mp3',
            synthFallback: { freq: 800, duration: 150 }
        },
        wrong: {
            url: 'https://www.soundjay.com/buttons/button-10.mp3',
            synthFallback: { freq: 300, duration: 200 }
        },
        reveal: {
            url: 'https://www.soundjay.com/buttons/button-20.mp3',
            synthFallback: { freq: 600, duration: 100 }
        },
        victory: {
            url: 'https://www.soundjay.com/buttons/button-4.mp3',
            synthFallback: { freq: 1000, duration: 500 }
        }
    }
} as const;

export type SFXType = keyof typeof AUDIO_CONFIG.sfx;
