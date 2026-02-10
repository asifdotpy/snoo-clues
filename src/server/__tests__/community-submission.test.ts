import { describe, it, expect, vi } from 'vitest';
import { normalizeSubredditName } from '../../shared/utils/normalization';

describe('Community Case Logic', () => {
    it('creates a correctly formatted submission object', () => {
        const subreddit = '  r/TestSub  ';
        const evidence = ['e1', 'e2', 'e3'];
        const username = 'Sleuth123';

        const submission = {
            subreddit: normalizeSubredditName(subreddit),
            evidence,
            author: username,
            category: "community",
            timestamp: 123456789
        };

        expect(submission.subreddit).toBe('testsub');
        expect(submission.evidence).toHaveLength(3);
        expect(submission.author).toBe('Sleuth123');
        expect(submission.category).toBe('community');
    });

    it('normalizes various subreddit formats for submission', () => {
        expect(normalizeSubredditName('r/Programming')).toBe('programming');
        expect(normalizeSubredditName('  /r/funny  ')).toBe('funny');
        expect(normalizeSubredditName('https://reddit.com/r/pics')).toBe('pics');
    });
});
