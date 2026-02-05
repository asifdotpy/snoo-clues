/**
 * Game API Client
 *
 * Handles all HTTP requests to the game server endpoints.
 */

import type {
    GameInitResponse,
    GuessResponse,
    ShareResponse,
    LeaderboardResponse,
    AbandonResponse
} from "../../shared/types/api";

export class GameAPI {
    private static async fetchWithTimeout(resource: string, options: RequestInit & { timeout?: number } = {}) {
        const { timeout = 8000 } = options;

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(resource, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    /**
     * Initialize a game (daily or random)
     * @param mode - 'daily' for daily puzzle, 'unlimited' for random puzzle
     */
    static async initGame(mode: 'daily' | 'unlimited'): Promise<GameInitResponse> {
        const endpoint = mode === 'daily' ? "/api/game/init" : "/api/game/random";
        const response = await this.fetchWithTimeout(endpoint, { timeout: 5000 });

        if (!response.ok) {
            throw new Error(`Failed to initialize ${mode} game`);
        }

        return response.json();
    }

    /**
     * Submit a guess
     */
    static async submitGuess(guess: string, mode: 'daily' | 'unlimited' | null): Promise<GuessResponse> {
        const response = await this.fetchWithTimeout("/api/game/guess", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ guess, mode }),
            timeout: 5000
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
        const response = await this.fetchWithTimeout("/api/game/share", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attempts }),
            timeout: 5000
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
        const response = await this.fetchWithTimeout("/api/game/leaderboard", { timeout: 5000 });

        if (!response.ok) {
            throw new Error("Failed to fetch leaderboard");
        }

        return response.json();
    }

    /**
     * Abandon current game and reset streak
     */
    static async abandonGame(): Promise<AbandonResponse> {
        const response = await this.fetchWithTimeout("/api/game/abandon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            timeout: 5000
        });

        if (!response.ok) {
            throw new Error("Failed to abandon game");
        }

        return response.json();
    }
}
