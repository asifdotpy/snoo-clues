import { describe, it, expect } from 'vitest';
import { calculateNewStreak } from '../logic';

describe('Streak Logic Tests', () => {
    it('should start with 1 if no previous win date', () => {
        expect(calculateNewStreak(null, "2026-02-01", 0)).toBe(1);
    });

    it('should increment if played within 24 hours (on the following day)', () => {
        const lastWin = "2026-01-31";
        const today = "2026-02-01";
        const currentStreak = 5;
        expect(calculateNewStreak(lastWin, today, currentStreak)).toBe(6);
    });

    it('should maintain streak if played on the same day (should not happen in daily, but logic should handle it)', () => {
        const lastWin = "2026-02-01";
        const today = "2026-02-01";
        const currentStreak = 5;
        expect(calculateNewStreak(lastWin, today, currentStreak)).toBe(5);
    });

    it('should reset if more than 24 hours passed (e.g., missed yesterday)', () => {
        const lastWin = "2026-01-28";
        const today = "2026-02-01";
        const currentStreak = 5;
        expect(calculateNewStreak(lastWin, today, currentStreak)).toBe(1);
    });

    it('should reset if yesterday was missed (last win was day before yesterday)', () => {
        const lastWin = "2026-01-30";
        const today = "2026-02-01";
        const currentStreak = 5;
        expect(calculateNewStreak(lastWin, today, currentStreak)).toBe(1);
    });
});
