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

        // Initial state: first character added synchronously
        expect(element.textContent).toBe('S');

        // Advance time
        await vi.advanceTimersByTimeAsync(10);
        expect(element.textContent).toBe('Sn');

        await vi.advanceTimersByTimeAsync(10);
        expect(element.textContent).toBe('Sno');

        await vi.advanceTimersByTimeAsync(10);
        expect(element.textContent).toBe('Snoo');

        await promise;
        expect(element.textContent).toBe('Snoo');
    });

    it('clears existing content before starting', async () => {
        const element = document.createElement('div');
        element.textContent = 'Old Content';

        await typewriter(element, 'New', 1);

        expect(element.textContent).toBe('New');
    });
});
