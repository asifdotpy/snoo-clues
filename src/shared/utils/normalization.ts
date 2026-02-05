/**
 * Normalizes a subreddit name by removing r/ or /r/ prefixes,
 * trimming whitespace, and converting to lowercase.
 */
export function normalizeSubredditName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/^(\/?r\/)/, "");
}
