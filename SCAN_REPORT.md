# 🔍 Snoo-Clues Scan Report

This report summarizes the findings of a comprehensive code audit and vulnerability scan performed on the Snoo-Clues codebase.

## 🐛 Identified Bugs

### 1. Critical: Persistent State Scoping (Streak & Leaderboard)
- **Problem**: Most Redis keys are currently scoped using `postId` (e.g., `streak:postId:username`).
- **Root Cause**: If a user plays on a different post (e.g., a new daily investigation board), the server looks for their streak and progress on that specific post, find nothing, and starts from zero.
- **Symptom**: "Daily streak always stays at 0" when testing across multiple posts.
- **Fix**: Refactor Redis keys for streaks, last win dates, leaderboards, and archive progress to be subreddit-wide instead of post-specific.

### 2. Logic: Daily Progress Fragmented
- **Problem**: `playedKey`, `winnerKey`, and `attemptsKey` are also scoped by `postId`.
- **Impact**: A user could technically solve the same daily puzzle multiple times if it is posted in different threads, and their attempts are not consolidated.
- **Fix**: Scoping these keys to the subreddit + date will ensure a consistent daily experience across all investigation boards.

### 3. Architecture: Manual Abandonment Penalty
- **Problem**: The game explicitly resets the streak to 0 if a user "Abandons" a case (by returning to menu after starting).
- **Impact**: While intentional, this may be too harsh or triggered accidentally.
- **Recommendation**: Clarify UI warnings or only penalize explicit abandonment of Daily Case Files.

## 🛡️ Security & Vulnerabilities

### `npm audit` Results
- **Status**: 6 vulnerabilities found.
- **Details**:
  - `tmp` (dependency of dev tools) has a symbolic link vulnerability.
  - `vite` (dev server) has moderate severity file system bypass vulnerabilities.
- **Risk Assessment**: Low. These affect development tools rather than the production server-side logic (which runs in the isolated Devvit environment).
- **Fix**: Run `npm audit fix --force` where possible.

## ✅ Redis Verification
- **Method Signatures**: `redis.zIncrBy(key, member, value)` and `redis.zRange(key, start, stop, { by: 'rank' })` were verified against Devvit 0.12.x standards and are implemented correctly.
- **Data Integrity**: Normalization of subreddit names is handled consistently on both client and server.

## 📈 Next Steps
1. Refactor Redis key generation to ensure global persistence of Sleuth stats.
2. Update the `calculateNewStreak` logic to be more robust against date edge cases.
3. Apply security patches to dev dependencies.
4. Verify all changes with expanded test suites.
