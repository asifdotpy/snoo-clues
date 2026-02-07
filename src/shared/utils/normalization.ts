/**
 * Normalizes a subreddit name by removing r/ or /r/ prefixes,
 * trimming whitespace, and converting to lowercase.
 */
export function normalizeSubredditName(name: string): string {
    let normalized = name.trim().toLowerCase();

    // Remove URL prefixes if present (e.g., https://www.reddit.com/r/...)
    normalized = normalized.replace(/^(https?:\/\/)?(www\.)?reddit\.com\//, "");

    // Remove leading /r/ or r/
    normalized = normalized.replace(/^(\/?r\/)/, "");

    // Remove leading and trailing slashes
    normalized = normalized.replace(/^\/+|\/+$/g, "");

    return normalized;
}
