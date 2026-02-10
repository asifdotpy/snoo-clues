import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameAPI } from '../api/GameAPI';

describe('GameAPI', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    it('initGame fetches correctly for daily mode', async () => {
        const mockData = { evidence: ['A', 'B', 'C'] };
        (fetch as any).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockData),
        });

        const result = await GameAPI.initGame('daily');
        expect(fetch).toHaveBeenCalledWith('/api/game/init', expect.objectContaining({ timeout: 5000 }));
        expect(result).toEqual(mockData);
    });

    it('initGame fetches correctly for archives mode', async () => {
        const mockData = { evidence: ['X', 'Y', 'Z'] };
        (fetch as any).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockData),
        });

        const result = await GameAPI.initGame('archives');
        expect(fetch).toHaveBeenCalledWith('/api/game/random', expect.objectContaining({ timeout: 5000 }));
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
            body: JSON.stringify({ guess: 'test', mode: 'daily' }),
            timeout: 5000
        }));
    });

    it('handles errors gracefully', async () => {
        (fetch as any).mockResolvedValue({
            ok: false,
            json: () => Promise.resolve({ error: "The Daily Case File could not be retrieved from the archives." })
        });
        await expect(GameAPI.initGame('daily')).rejects.toThrow('The Daily Case File could not be retrieved from the archives.');
    });
});
