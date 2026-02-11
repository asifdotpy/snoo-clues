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

// Mock ResizeObserver for JSDOM
(window as any).ResizeObserver = class {
    callback: any;
    constructor(callback: any) { this.callback = callback; }
    observe() { this.callback([{ contentRect: { width: 800, height: 600 } }]); }
    unobserve() { }
    disconnect() { }
};

// Mock Audio
(window as any).Audio = class {
    play() { return Promise.resolve(); }
    pause() { }
    catch() { }
};

describe('Submission Modal Logic', () => {
    beforeEach(async () => {
        // Load HTML
        const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
        document.body.innerHTML = html;

        // Reset mocks
        vi.stubGlobal('fetch', vi.fn().mockImplementation((url) => {
            if (url === '/api/init') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ username: 'TestSleuth', postId: 't3_123' })
                });
            }
            if (url === '/api/game/leaderboard') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ leaderboard: [] })
                });
            }
            if (url === '/api/game/community/submit') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }));

        vi.clearAllMocks();
        vi.resetModules();
        await import('../main');
        document.dispatchEvent(new Event('DOMContentLoaded'));
    });

    it('shows error feedback for empty fields', async () => {
        const openBtn = document.getElementById('openSubmitModalBtn');
        fireEvent.click(openBtn!);

        const submitBtn = document.getElementById('submitCaseBtn');
        fireEvent.click(submitBtn!);

        const feedback = document.getElementById('submitFeedback');
        await waitFor(() => expect(feedback?.textContent).toBe('Please provide a Subreddit name!'));
        expect(feedback).toHaveClass('error');
        expect(feedback).toHaveClass('active');
    });

    it('shows error feedback for short subreddit name', async () => {
        const openBtn = document.getElementById('openSubmitModalBtn');
        fireEvent.click(openBtn!);

        const subInput = document.getElementById('submitSubreddit') as HTMLInputElement;
        fireEvent.input(subInput, { target: { value: 'a' } });

        const submitBtn = document.getElementById('submitCaseBtn');
        fireEvent.click(submitBtn!);

        const feedback = document.getElementById('submitFeedback');
        await waitFor(() => expect(feedback?.textContent).toBe('Subreddit name is too short (min 3 characters).'));
    });

    it('shows success state for valid submission', async () => {
        const openBtn = document.getElementById('openSubmitModalBtn');
        fireEvent.click(openBtn!);

        const subInput = document.getElementById('submitSubreddit') as HTMLInputElement;
        const e1 = document.getElementById('submitEvidence1') as HTMLTextAreaElement;
        const e2 = document.getElementById('submitEvidence2') as HTMLTextAreaElement;
        const e3 = document.getElementById('submitEvidence3') as HTMLTextAreaElement;

        fireEvent.input(subInput, { target: { value: 'testsub' } });
        fireEvent.input(e1, { target: { value: 'evidence 1 description' } });
        fireEvent.input(e2, { target: { value: 'evidence 2 description' } });
        fireEvent.input(e3, { target: { value: 'evidence 3 description' } });

        const submitBtn = document.getElementById('submitCaseBtn');
        fireEvent.click(submitBtn!);

        await waitFor(() => expect(document.getElementById('submitSuccessArea')).not.toHaveClass('hidden'));
        expect(document.getElementById('submitFormArea')).toHaveClass('hidden');
    });

    it('resets form when clicking Submit Another', async () => {
        const openBtn = document.getElementById('openSubmitModalBtn');
        fireEvent.click(openBtn!);

        // Manually trigger success state for testing reset
        document.getElementById('submitFormArea')?.classList.add('hidden');
        document.getElementById('submitSuccessArea')?.classList.remove('hidden');

        const anotherBtn = document.getElementById('submitAnotherBtn');
        fireEvent.click(anotherBtn!);

        expect(document.getElementById('submitFormArea')).not.toHaveClass('hidden');
        expect(document.getElementById('submitSuccessArea')).toHaveClass('hidden');

        const subInput = document.getElementById('submitSubreddit') as HTMLInputElement;
        expect(subInput.value).toBe('');
    });

    it('converts subreddit input to lowercase', async () => {
        const openBtn = document.getElementById('openSubmitModalBtn');
        fireEvent.click(openBtn!);

        const subInput = document.getElementById('submitSubreddit') as HTMLInputElement;
        fireEvent.input(subInput, { target: { value: 'MySubreddit' } });

        expect(subInput.value).toBe('mysubreddit');
    });

    it('shows error feedback for long subreddit name', async () => {
        const openBtn = document.getElementById('openSubmitModalBtn');
        fireEvent.click(openBtn!);

        const subInput = document.getElementById('submitSubreddit') as HTMLInputElement;
        fireEvent.input(subInput, { target: { value: 'a'.repeat(22) } });

        const submitBtn = document.getElementById('submitCaseBtn');
        fireEvent.click(submitBtn!);

        const feedback = document.getElementById('submitFeedback');
        await waitFor(() => expect(feedback?.textContent).toBe('Subreddit name is too long (max 21 characters).'));
    });

    it('shows error feedback for invalid characters in subreddit name', async () => {
        const openBtn = document.getElementById('openSubmitModalBtn');
        fireEvent.click(openBtn!);

        const subInput = document.getElementById('submitSubreddit') as HTMLInputElement;
        fireEvent.input(subInput, { target: { value: 'test-sub!' } });

        const submitBtn = document.getElementById('submitCaseBtn');
        fireEvent.click(submitBtn!);

        const feedback = document.getElementById('submitFeedback');
        await waitFor(() => expect(feedback?.textContent).toBe('Subreddit name contains invalid characters! Only alphanumeric and underscores allowed.'));
    });
});
