import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { normalizeSubredditName } from '../../shared/utils/normalization';

describe('Technical Audit: DOM Integrity', () => {
    let html: string;

    beforeEach(() => {
        html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
        document.body.innerHTML = html;
    });

    it('should find all required DOM elements queried by SnooCluesGame', () => {
        const requiredIds = [
            'clue1Text', 'clue2Text', 'clue3Text',
            'clue2Card', 'clue3Card',
            'revealClue2', 'revealClue3',
            'guessInput', 'submitBtn',
            'attemptsCount', 'feedbackMessage',
            'winModal', 'playedModal', 'confirmModal',
            'correct-answer', 'win-attempts-count',
            'played-attempts-count', 'played-streak-val',
            'streak-value', 'win-streak-val',
            'rank-value', 'win-rank-name',
            'case-closed-stamp', 'leaderboardList',
            'share-btn', 'selectionModal',
            'startDailyBtn', 'startColdBtn',
            'keep-training-btn', 'gameOverlay',
            'confirm-yes-btn', 'confirm-no-btn',
            'closeSelectionModal', 'currentModeTag',
            'playedToColdBtn'
        ];

        requiredIds.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                throw new Error(`Required element with ID "${id}" not found in index.html`);
            }
            expect(element).toBeDefined();
        });
    });

    it('should find all required DOM elements queried by GameLoader', () => {
        const loaderIds = ['status', 'progress', 'spinner', 'canvas', 'loading'];
        loaderIds.forEach(id => {
            expect(document.getElementById(id)).not.toBeNull();
        });
    });

    it('should have correct initial visibility states', () => {
        // Modals should be hidden by default
        expect(document.getElementById('winModal')).toHaveClass('hidden');
        expect(document.getElementById('playedModal')).toHaveClass('hidden');
        expect(document.getElementById('confirmModal')).toHaveClass('hidden');
        expect(document.getElementById('selectionModal')).toHaveClass('hidden');

        // Note: selectionModal is shown in the constructor of SnooCluesGame,
        // but in the base HTML it has the "hidden" class.
    });
});

describe('Technical Audit: Normalization Consistency', () => {
    it('should normalize subreddit names correctly', () => {
        expect(normalizeSubredditName('r/aww')).toBe('aww');
        expect(normalizeSubredditName('/r/AskReddit')).toBe('askreddit');
        expect(normalizeSubredditName('  gaming  ')).toBe('gaming');
        expect(normalizeSubredditName('Subreddit')).toBe('subreddit');
    });

    it('should handle edge cases in normalization', () => {
        expect(normalizeSubredditName('')).toBe('');
        expect(normalizeSubredditName('   ')).toBe('');
        expect(normalizeSubredditName('r/r/test')).toBe('r/test'); // Only strips first r/
    });
});
