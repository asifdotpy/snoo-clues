import { describe, it, expect } from 'vitest';
import { getPuzzleByDate } from '../logic';
import { DailyPuzzle } from '../../shared/types/api';

const mockPuzzles: DailyPuzzle[] = [
    { date: "2026-02-01", subreddit: "aww", clues: ["clue1", "clue2", "clue3"] },
    { date: "2026-02-02", subreddit: "askreddit", clues: ["clue1", "clue2", "clue3"] }
];

describe('Puzzle Logic Tests', () => {
    it('should return the puzzle for exactly matching date', () => {
        const puzzle = getPuzzleByDate("2026-02-01", mockPuzzles);
        expect(puzzle.subreddit).toBe("aww");
    });

    it('should fallback to the first puzzle if no date matches', () => {
        const puzzle = getPuzzleByDate("2099-01-01", mockPuzzles);
        expect(puzzle.subreddit).toBe("aww");
    });
});
