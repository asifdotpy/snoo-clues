/**
 * Game API Client
 *
 * Handles all HTTP requests to the game server endpoints.
 */

import type {
    GameInitResponse,
    GuessResponse,
    ShareResponse,
    LeaderboardResponse
} from "../../shared/types/api";

export class GameAPI {
    /**
     * Initialize a game (daily or random)
     * @param mode - 'daily' for daily puzzle, 'unlimited' for random puzzle
     */
    static async initGame(mode: 'daily' | 'unlimited'): Promise<GameInitResponse> {
        const endpoint = mode === 'daily' ? "/api/game/init" : "/api/game/random";
        const response = await fetch(endpoint);

        if (!response.ok) {
            throw new Error(`Failed to initialize ${mode} game`);
        }

        return response.json();
    }

    /**
     * Submit a guess
     */
    static async submitGuess(guess: string, mode: 'daily' | 'unlimited' | null): Promise<GuessResponse> {
        const response = await fetch("/api/game/guess", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ guess, mode }),
        });

        if (!response.ok) {
            throw new Error("Failed to submit guess");
        }

        return response.json();
    }

    /**
     * Share result to Reddit
     */
    static async shareResult(attempts: number): Promise<ShareResponse> {
        const response = await fetch("/api/game/share", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attempts }),
        });

        if (!response.ok) {
            throw new Error("Failed to share result");
        }

        return response.json();
    }

    /**
     * Fetch leaderboard
     */
    static async fetchLeaderboard(): Promise<LeaderboardResponse> {
        const response = await fetch("/api/game/leaderboard");

        if (!response.ok) {
            throw new Error("Failed to fetch leaderboard");
        }

        return response.json();
    }
}
