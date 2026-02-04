import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameAPI } from '../api/GameAPI';

describe('GameAPI', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    it('initGame fetches correctly for daily mode', async () => {
        const mockData = { clues: ['A', 'B', 'C'] };
        (fetch as any).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockData),
        });

        const result = await GameAPI.initGame('daily');
        expect(fetch).toHaveBeenCalledWith('/api/game/init');
        expect(result).toEqual(mockData);
    });

    it('initGame fetches correctly for unlimited mode', async () => {
        const mockData = { clues: ['X', 'Y', 'Z'] };
        (fetch as any).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockData),
        });

        const result = await GameAPI.initGame('unlimited');
        expect(fetch).toHaveBeenCalledWith('/api/game/random');
        expect(result).toEqual(mockData);
    });

    it('submitGuess posts correct data', async () => {
        (fetch as any).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ correct: true }),
        });

        await GameAPI.submitGuess('test', 'daily');
        expect(fetch).toHaveBeenCalledWith('/api/game/guess', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ guess: 'test', mode: 'daily' })
        }));
    });

    it('handles errors gracefully', async () => {
        (fetch as any).mockResolvedValue({ ok: false });
        await expect(GameAPI.initGame('daily')).rejects.toThrow('Failed to initialize daily game');
    });
});
