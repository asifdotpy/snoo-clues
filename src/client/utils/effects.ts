/**
 * UI Effects and Animations
 *
 * Utility functions for typewriter effects, haptic feedback, and other UI enhancements.
 */

/**
 * Typewriter effect: reveals text character-by-character
 * @param element - The HTML element to apply the effect to
 * @param text - The text to reveal
 * @param speed - Delay between characters in milliseconds (default: 30ms)
 */
export async function typewriter(
    element: HTMLElement,
    text: string,
    speed: number = 30
): Promise<void> {
    element.textContent = "";
    for (let i = 0; i < text.length; i++) {
        element.textContent += text[i];
        await new Promise((resolve) => setTimeout(resolve, speed));
    }
}

/**
 * Trigger haptic feedback on mobile devices
 * @param duration - Duration in milliseconds (default: 20ms)
 */
export function vibrate(duration: number = 20): void {
    if (window.navigator.vibrate) {
        window.navigator.vibrate(duration);
    }
}
