import { DailyPuzzle } from "../shared/types/api";

/**
 * Calculates the new streak based on the last win date and the current date.
 * If the last win was yesterday, the streak increments.
 * If the last win was today, the streak remains the same.
 * Otherwise, the streak resets to 1.
 */
export function calculateNewStreak(lastWinDate: string | null, today: string, currentStreak: number): number {
    if (!lastWinDate) return 1;
    const yesterday = new Date(new Date(today).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    if (lastWinDate === yesterday) return currentStreak + 1;
    if (lastWinDate === today) return currentStreak;
    return 1;
}

/**
 * Retrieves the puzzle for a specific date from the provided list.
 * Fallback to the first puzzle if no match is found.
 */
export function getPuzzleByDate(date: string, puzzles: DailyPuzzle[]): DailyPuzzle {
    const puzzle = puzzles.find(p => p.date === date);
    return puzzle ?? puzzles[0];
}
