import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { typewriter } from '../utils/effects';

describe('typewriter utility', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('reveals text character by character', async () => {
        const element = document.createElement('div');
        const text = 'Snoo';

        // Start promise
        const promise = typewriter(element, text, 10);

        // Initial state: first character added synchronously before first await
        expect(element.textContent).toBe('S');

        // Advance time for each character (4 chars total, so 4 waits)
        await vi.advanceTimersByTimeAsync(10);
        expect(element.textContent).toBe('Sn');

        await vi.advanceTimersByTimeAsync(10);
        expect(element.textContent).toBe('Sno');

        await vi.advanceTimersByTimeAsync(10);
        expect(element.textContent).toBe('Snoo');

        // One more advance to finish the final loop iteration's setTimeout
        await vi.advanceTimersByTimeAsync(10);

        await promise;
        expect(element.textContent).toBe('Snoo');
    });

    it('clears existing content before starting', async () => {
        const element = document.createElement('div');
        element.textContent = 'Old Content';

        const promise = typewriter(element, 'New', 1);
        await vi.runAllTimersAsync();
        await promise;

        expect(element.textContent).toBe('New');
    });
});
