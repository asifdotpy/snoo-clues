import { describe, it, expect, vi } from 'vitest';
import { typewriter } from '../utils/effects';

describe('typewriter utility', () => {
    it('reveals text character by character', async () => {
        const element = document.createElement('div');
        const text = 'Snoo';

        // Use a faster speed for testing
        const promise = typewriter(element, text, 1);

        // It should start empty
        expect(element.textContent).toBe('');

        await promise;

        // It should eventually complete
        expect(element.textContent).toBe('Snoo');
    });

    it('clears existing content before starting', async () => {
        const element = document.createElement('div');
        element.textContent = 'Old Content';

        await typewriter(element, 'New', 1);

        expect(element.textContent).toBe('New');
    });
});
