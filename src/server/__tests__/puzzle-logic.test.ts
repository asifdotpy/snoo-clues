import { describe, it, expect } from 'vitest';
import { getTodaysPuzzleInternal } from '../logic';
import { Puzzle } from '../data/puzzles';

const mockPuzzles: Puzzle[] = [
    { subreddit: "aww", clues: ["clue1", "clue2", "clue3"], category: "cat1" },
    { subreddit: "askreddit", clues: ["clue1", "clue2", "clue3"], category: "cat2" }
];

describe('Puzzle Logic Tests', () => {
    it('should return a consistent puzzle for a specific date', () => {
        const date = new Date("2025-01-01T12:00:00Z"); // Day 0
        const puzzle = getTodaysPuzzleInternal(date, mockPuzzles);
        expect(puzzle.subreddit).toBe("aww");
    });

    it('should return the next puzzle for the next day', () => {
        const date = new Date("2025-01-02T12:00:00Z"); // Day 1
        const puzzle = getTodaysPuzzleInternal(date, mockPuzzles);
        expect(puzzle.subreddit).toBe("askreddit");
    });

    it('should loop back to the first puzzle after all puzzles are shown', () => {
        const date = new Date("2025-01-03T12:00:00Z"); // Day 2
        const puzzle = getTodaysPuzzleInternal(date, mockPuzzles);
        expect(puzzle.subreddit).toBe("aww");
    });

    it('should handle dates before epoch gracefully', () => {
        const date = new Date("2024-12-31T12:00:00Z"); // Day -1
        const puzzle = getTodaysPuzzleInternal(date, mockPuzzles);
        expect(puzzle.subreddit).toBe("askreddit"); // |-1| % 2 = 1
    });
});
