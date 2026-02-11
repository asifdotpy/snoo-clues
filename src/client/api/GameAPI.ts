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

import type { InitResponse } from "../../shared/types/api";

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
     * Fetch basic app info (username, etc)
     */
    static async fetchInitInfo(): Promise<InitResponse> {
        const response = await this.fetchWithTimeout("/api/init", { timeout: 5000 });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || "Failed to fetch Sleuth initialization info.");
        }
        return response.json();
    }

    /**
     * Initialize a game (daily or archives)
     * @param mode - 'daily' for daily puzzle, 'archives' for random puzzle
     */
    static async initGame(mode: 'daily' | 'archives'): Promise<GameInitResponse> {
        const endpoint = mode === 'daily' ? "/api/game/init" : "/api/game/random";
        const response = await this.fetchWithTimeout(endpoint, { timeout: 5000 });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || `Failed to initialize ${mode} Case File.`);
        }

        return response.json();
    }

    /**
     * Submit a guess
     */
    static async submitGuess(guess: string, mode: 'daily' | 'archives' | 'community'): Promise<GuessResponse> {
        const response = await this.fetchWithTimeout("/api/game/guess", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ guess, mode }),
            timeout: 5000
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            if (response.status === 401) {
                const e = new Error(data.error || "LOGIN_REQUIRED") as Error & { status?: number };
                e.status = 401;
                throw e;
            }
            throw new Error(data.error || "Failed to submit findings.");
        }

        return response.json();
    }

    /**
     * Share result to Reddit
     */
    static async shareResult(data: { attempts: number; evidenceFound: number; mode: 'daily' | 'archives' | 'community' }): Promise<ShareResponse> {
        const response = await this.fetchWithTimeout("/api/game/share", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
            timeout: 5000
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || "Failed to report findings.");
        }

        return response.json();
    }

    /**
     * Fetch leaderboard
     */
    static async fetchLeaderboard(): Promise<LeaderboardResponse> {
        const response = await this.fetchWithTimeout("/api/game/leaderboard", { timeout: 5000 });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || "Failed to fetch Sleuth rankings.");
        }

        return response.json();
    }

    /**
     * Fetch a random community case
     */
    static async fetchCommunityGame(): Promise<GameInitResponse> {
        const response = await this.fetchWithTimeout("/api/game/community/random", { timeout: 5000 });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || "Failed to fetch community Case File.");
        }
        return response.json();
    }

    /**
     * Submit a community case
     */
    static async submitCommunityCase(data: { subreddit: string; evidence: string[] }): Promise<{ success: boolean }> {
        const response = await this.fetchWithTimeout("/api/game/community/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
            timeout: 5000
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || "Failed to submit community Case File.");
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
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || "Failed to abandon investigation.");
        }

        return response.json();
    }
}
