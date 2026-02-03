import { Choice, DailyPuzzle } from "../shared/types/api";

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
    return puzzle || (puzzles[0] as DailyPuzzle);
}

/**
 * Generates 4 choices: the correct answer and 3 random distractors from different categories.
 */
export function getMultipleChoices(correctSub: string, allPuzzles: Omit<DailyPuzzle, 'date'>[]): Choice[] {
    const correctPuzzle = allPuzzles.find(p => p.subreddit === correctSub);
    if (!correctPuzzle) return [];

    const choices: Choice[] = [
        { name: correctSub, color: "#FF4500" } // Reddit Orange
    ];

    const usedCategories = new Set([correctPuzzle.category]);
    const shuffled = [...allPuzzles].sort(() => Math.random() - 0.5);

    // Try to get 3 distractors from different categories
    for (const p of shuffled) {
        if (choices.length >= 4) break;
        if (p.subreddit !== correctSub && !usedCategories.has(p.category)) {
            choices.push({ name: p.subreddit, color: "#FF4500" });
            usedCategories.add(p.category);
        }
    }

    // Fallback: Fill the rest with random subreddits if not enough categories
    if (choices.length < 4) {
        for (const p of shuffled) {
            if (choices.length >= 4) break;
            if (p.subreddit !== correctSub && !choices.find(c => c.name === p.subreddit)) {
                choices.push({ name: p.subreddit, color: "#FF4500" });
            }
        }
    }

    return choices.sort(() => Math.random() - 0.5);
}

/**
 * Returns the Detective Rank based on total wins.
 */
export function getDetectiveRank(totalWins: number): string {
    if (totalWins <= 1) return "Snoo Rookie";
    if (totalWins <= 5) return "Private Eye";
    if (totalWins <= 10) return "Lead Investigator";
    if (totalWins <= 20) return "Chief of Detectives";
    return "Snoo-Clues Legend";
}
