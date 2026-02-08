import { DailyPuzzle } from "../shared/types/api";
import { Puzzle } from "./data/puzzles.js";

export { normalizeSubredditName } from "../shared/utils/normalization.js";

/**
 * Calculates the new streak based on the last win date and the current date.
 */
export function calculateNewStreak(lastWinDate: string | null, today: string, currentStreak: number): number {
    if (!lastWinDate) return 1;
    const yesterday = new Date(new Date(today).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    if (lastWinDate === yesterday) return currentStreak + 1;
    if (lastWinDate === today) return currentStreak;
    return 1;
}

/**
 * Selects a puzzle based on the date modulo the number of available puzzles.
 */
export function getTodaysPuzzleInternal(today: Date, puzzles: Puzzle[]): DailyPuzzle {
    const todayKey = today.toISOString().split('T')[0] ?? "2025-01-01";
    const epoch = new Date("2025-01-01").getTime();
    const current = new Date(todayKey).getTime();
    const diffDays = Math.floor((current - epoch) / (1000 * 60 * 60 * 24));

    const puzzleIndex = Math.abs(diffDays) % puzzles.length;
    const p = puzzles[puzzleIndex]!;

    return {
        subreddit: p.subreddit,
        clues: p.clues,
        date: todayKey
    };
}

/**
 * Returns the Detective Rank based on score (points).
 * 0-9: Rookie Sleuth
 * 10-49: Junior Detective
 * 50-99: Senior Investigator
 * 100-199: Lead Profiler
 * 200+: Chief of Detectives
 */
export function getDetectiveRank(score: number): string {
    if (score < 10) return "Rookie Sleuth";
    if (score < 50) return "Junior Detective";
    if (score < 100) return "Senior Investigator";
    if (score < 200) return "Lead Profiler";
    return "Chief of Detectives";
}
