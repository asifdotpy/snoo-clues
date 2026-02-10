import { describe, it, expect } from 'vitest';
import { normalizeSubredditName } from '../../shared/utils/normalization';

describe('Subreddit Normalization', () => {
    it('removes r/ prefix', () => {
        expect(normalizeSubredditName('r/aww')).toBe('aww');
    });

    it('removes /r/ prefix', () => {
        expect(normalizeSubredditName('/r/aww')).toBe('aww');
    });

    it('converts to lowercase', () => {
        expect(normalizeSubredditName('Aww')).toBe('aww');
        expect(normalizeSubredditName('r/AskReddit')).toBe('askreddit');
    });

    it('trims whitespace', () => {
        expect(normalizeSubredditName('  aww  ')).toBe('aww');
    });

    it('handles full URLs', () => {
        expect(normalizeSubredditName('https://www.reddit.com/r/aww')).toBe('aww');
        expect(normalizeSubredditName('reddit.com/r/aww/')).toBe('aww');
    });

    it('removes trailing slashes', () => {
        expect(normalizeSubredditName('aww/')).toBe('aww');
        expect(normalizeSubredditName('r/aww//')).toBe('aww');
    });

    it('handles empty or invalid gracefully', () => {
        expect(normalizeSubredditName('')).toBe('');
        expect(normalizeSubredditName('   ')).toBe('');
    });
});
