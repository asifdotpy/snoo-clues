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
