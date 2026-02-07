import { describe, it, expect } from 'vitest';
import { getDetectiveRank } from '../logic';
import { normalizeSubredditName } from '../../shared/utils/normalization';

describe('Product Logic: Ranks', () => {
    it('should assign correct ranks based on points', () => {
        expect(getDetectiveRank(0)).toBe("Rookie Sleuth");
        expect(getDetectiveRank(9)).toBe("Rookie Sleuth");
        expect(getDetectiveRank(10)).toBe("Junior Detective");
        expect(getDetectiveRank(49)).toBe("Junior Detective");
        expect(getDetectiveRank(50)).toBe("Senior Investigator");
        expect(getDetectiveRank(99)).toBe("Senior Investigator");
        expect(getDetectiveRank(100)).toBe("Lead Profiler");
        expect(getDetectiveRank(199)).toBe("Lead Profiler");
        expect(getDetectiveRank(200)).toBe("Chief of Detectives");
        expect(getDetectiveRank(1000)).toBe("Chief of Detectives");
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
