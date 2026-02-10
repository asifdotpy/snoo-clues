import { describe, it, expect } from 'vitest';
import { getSleuthRank } from '../logic';
import { normalizeSubredditName } from '../../shared/utils/normalization';

describe('Product Logic: Ranks', () => {
    it('should assign correct ranks based on points', () => {
        expect(getSleuthRank(0)).toBe("Rookie Sleuth");
        expect(getSleuthRank(9)).toBe("Rookie Sleuth");
        expect(getSleuthRank(10)).toBe("Junior Sleuth");
        expect(getSleuthRank(49)).toBe("Junior Sleuth");
        expect(getSleuthRank(50)).toBe("Senior Sleuth");
        expect(getSleuthRank(99)).toBe("Senior Sleuth");
        expect(getSleuthRank(100)).toBe("Lead Sleuth");
        expect(getSleuthRank(199)).toBe("Lead Sleuth");
        expect(getSleuthRank(200)).toBe("Chief of Sleuths");
        expect(getSleuthRank(1000)).toBe("Chief of Sleuths");
    });
});

describe('Product Logic: Normalization', () => {
    it('should normalize basic names', () => {
        expect(normalizeSubredditName("aww")).toBe("aww");
        expect(normalizeSubredditName("  Aww  ")).toBe("aww");
    });

    it('should remove r/ and /r/ prefixes', () => {
        expect(normalizeSubredditName("r/aww")).toBe("aww");
        expect(normalizeSubredditName("/r/aww")).toBe("aww");
    });

    it('should remove full Reddit URLs', () => {
        expect(normalizeSubredditName("https://www.reddit.com/r/aww")).toBe("aww");
        expect(normalizeSubredditName("http://reddit.com/r/aww")).toBe("aww");
        expect(normalizeSubredditName("reddit.com/r/aww")).toBe("aww");
    });

    it('should handle trailing and leading slashes', () => {
        expect(normalizeSubredditName("aww/")).toBe("aww");
        expect(normalizeSubredditName("/aww/")).toBe("aww");
        expect(normalizeSubredditName("r/aww/")).toBe("aww");
    });

    it('should handle complex cases', () => {
        expect(normalizeSubredditName("  https://reddit.com/r/Aww/  ")).toBe("aww");
    });
});
