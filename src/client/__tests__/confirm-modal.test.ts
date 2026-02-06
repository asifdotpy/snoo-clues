import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/dom';
import fs from 'fs';
import path from 'path';

// Mock the bridge module BEFORE importing main
vi.mock('../bridge/HybridBridge', () => ({
    setupHybridBridge: vi.fn(),
    dispatchMascotAction: vi.fn(),
    syncAudioState: vi.fn(),
    triggerGameMakerBGM: vi.fn(),
    pauseGameMakerBGM: vi.fn()
}));

import { dispatchMascotAction } from '../bridge/HybridBridge';

// Mock ResizeObserver for JSDOM
(window as any).ResizeObserver = class {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock Audio
(window as any).Audio = class {
    play() { return Promise.resolve(); }
    pause() { }
    catch() { }
};

describe('Abandon Flow and Modal Behavior', () => {
    beforeEach(async () => {
        // Load HTML
        const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
        document.body.innerHTML = html;

        // Reset mocks
        vi.stubGlobal('fetch', vi.fn().mockImplementation((url) => {
            if (url === '/api/game/init' || url === '/api/game/random') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        clues: ['Clue 1', 'Clue 2', 'Clue 3'],
                        attempts: 0,
                        hasPlayedToday: false,
                        isWinner: false,
                        streak: 5,
                        coldCasesSolved: 2,
                        audioAssets: {
                           rustle: "rustle.mp3",
                           victory: "victory.mp3",
                           wrong: "wrong.mp3"
                        }
                    })
                });
            }
            if (url === '/api/game/abandon') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true, streak: 0 })
                });
            }
            if (url === '/api/game/leaderboard') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ leaderboard: [] })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }));

        vi.clearAllMocks();
        vi.resetModules();
        await import('../main');
        document.dispatchEvent(new Event('DOMContentLoaded'));
    });

    it('Case Selection close button is visible and functional', async () => {
        const selectionModal = document.getElementById('selectionModal');
        const closeBtn = document.getElementById('closeSelectionModal');
        const gameOverlay = document.getElementById('gameOverlay');

        expect(selectionModal).not.toHaveClass('hidden');
        expect(closeBtn).not.toHaveClass('hidden');

        fireEvent.click(closeBtn!);

        expect(selectionModal).toHaveClass('hidden');
        expect(gameOverlay).not.toHaveClass('hidden');
    });

    it('Abandoning a game resets state and UI', async () => {
        // Pick a mode
        const dailyBtn = document.getElementById('startDailyBtn');
        fireEvent.click(dailyBtn!);

        await waitFor(() => expect(document.getElementById('selectionModal')).toHaveClass('hidden'));

        // Check streak from init
        await waitFor(() => expect(document.getElementById('streak-value')?.textContent).toBe('5'));

        // Reveal a clue to create progress
        const revealBtn2 = document.getElementById('revealClue2');
        fireEvent.click(revealBtn2!);

        await waitFor(() => expect(document.getElementById('clue2Card')).toHaveClass('visible'));

        // Click back to selection
        const backBtn = document.getElementById('backToSelection');
        fireEvent.click(backBtn!);

        // Confirm modal should show
        const confirmModal = document.getElementById('confirmModal');
        expect(confirmModal).not.toHaveClass('hidden');
        expect(confirmModal?.textContent).toContain('Abandoning this case will forfeit your current investigation and reset your streak to 0. Retreat?');

        // Click Yes, Abandon
        const confirmYesBtn = document.getElementById('confirm-yes-btn');
        fireEvent.click(confirmYesBtn!);

        // Check streak reset in UI
        await waitFor(() => expect(document.getElementById('streak-value')?.textContent).toBe('0'));

        // Check UI reset to Empty Desk
        expect(document.getElementById('clue1Text')?.textContent).toBe('NO ACTIVE CASE');
        expect(document.getElementById('clue2Card')).toHaveClass('locked');
        expect(document.getElementById('clue2Card')).not.toHaveClass('visible');

        // Check fetch called for abandon
        expect(fetch).toHaveBeenCalledWith('/api/game/abandon', expect.any(Object));

        // Check mascot action
        expect(dispatchMascotAction).toHaveBeenCalledWith('mascot_disappointed');
    });

    it('Closing Case Selection shows Empty Desk on first open', async () => {
        const closeBtn = document.getElementById('closeSelectionModal');
        fireEvent.click(closeBtn!);

        expect(document.getElementById('selectionModal')).toHaveClass('hidden');
        expect(document.getElementById('clue1Text')?.textContent).toBe('NO ACTIVE CASE');
    });
});
