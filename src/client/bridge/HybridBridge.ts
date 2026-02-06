/**
 * Hybrid Bridge for Mascot Communication
 *
 * Provides a bridge between the HTML5 UI and the GameMaker mascot system.
 * Allows JavaScript to trigger mascot reactions via the gmCallback_mascot_react function.
 */

import "../types/gamemaker";

/**
 * Sets up the Hybrid Bridge for mascot communication
 * Defines the global dispatchMascotAction function that GameMaker listens for
 */
export function setupHybridBridge(): void {
    window.dispatchMascotAction = (actionType: string) => {
        console.log(`[Hybrid Bridge] Mascot Action: ${actionType}`);

        if (typeof gmCallback_mascot_react === 'function') {
            gmCallback_mascot_react(actionType);
        } else {
            console.warn('[Hybrid Bridge] GameMaker mascot callback not found');
        }
    };
}

/**
 * Dispatch a mascot action (if bridge is set up)
 * @param actionType - The action to trigger (e.g., 'correct', 'wrong', 'reveal')
 */
export function dispatchMascotAction(actionType: string): void {
    if (window.dispatchMascotAction) {
        window.dispatchMascotAction(actionType);
    }
}

/**
 * Synchronize the audio state (muted/unmuted) with GameMaker
 * @param isMuted - Whether the audio should be muted
 */
export function syncAudioState(isMuted: boolean): void {
    console.log(`[Hybrid Bridge] Sync Audio State: ${isMuted ? 'MUTED' : 'UNMUTED'}`);

    if (typeof gmCallback_set_audio_state === 'function') {
        gmCallback_set_audio_state(isMuted);
    } else {
        // Fallback: some GameMaker versions might use dispatchMascotAction for everything
        dispatchMascotAction(isMuted ? 'mute' : 'unmute');
        console.warn('[Hybrid Bridge] gmCallback_set_audio_state not found, fell back to mascot action');
    }
}

/**
 * Trigger background music playback in GameMaker (if available)
 */
export function triggerGameMakerBGM(): void {
    console.log('[Hybrid Bridge] Trigger BGM');
    
    if (typeof gmCallback_play_bgm === 'function') {
        gmCallback_play_bgm();
    } else {
        console.warn('[Hybrid Bridge] gmCallback_play_bgm not found - BGM will play from HTML5 audio only');
    }
}

/**
 * Trigger background music pause in GameMaker (if available)
 */
export function pauseGameMakerBGM(): void {
    console.log('[Hybrid Bridge] Pause BGM');
    
    if (typeof gmCallback_pause_bgm === 'function') {
        gmCallback_pause_bgm();
    } else {
        console.warn('[Hybrid Bridge] gmCallback_pause_bgm not found');
    }
}
