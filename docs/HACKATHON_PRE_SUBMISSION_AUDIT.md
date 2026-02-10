# 🔍 Snoo-Clues Pre-Hackathon Logic Audit

**Generated:** Feb 8, 2025  
**Scope:** Streak logic, puzzle logic, guess validation, leaderboard, ranks, and integration flows.

---

## Executive Summary

The codebase has **solid core logic** with unit tests covering streak, puzzle, normalization, and rank logic. However, several **critical and high-priority issues** were identified that should be addressed before hackathon submission.

| Priority | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 2 | Must fix |
| 🟠 High | 3 | Should fix |
| 🟡 Medium | 4 | Consider fixing |
| 🟢 Low | 2 | Optional |

---

## 1. Streak Logic ✅ (Working)

**Location:** `src/server/logic.ts` → `calculateNewStreak()`

**Behavior:**
- No previous win → returns `1` (new streak)
- Last win was yesterday → increments streak
- Last win was today → maintains streak (no double-count)
- Last win was 2+ days ago → resets to `1`

**Tests:** `src/server/__tests__/streak-logic.test.ts` — All 5 cases covered.

**Integration:** `updateStreak()` in `index.ts` correctly fetches `lastWinDate` from Redis, calls `calculateNewStreak`, and persists new streak + date.

**⚠️ Timezone Consideration (Medium):**
- `getTodayDateKey()` uses `new Date().toISOString().split('T')[0]` → **UTC date**
- Users in PST at 8 PM may see "tomorrow" in UTC, causing streak edge cases
- **Recommendation:** Document that dates are server/UTC-based, or add timezone handling if targeting global users.

---

## 2. Puzzle Selection Logic ✅ (Working)

**Location:** `src/server/logic.ts` → `getTodaysPuzzleInternal()`

**Behavior:**
- Epoch: `2025-01-01`
- `diffDays = floor((today - epoch) / msPerDay)`
- `puzzleIndex = abs(diffDays) % puzzles.length`
- Handles dates before epoch via `Math.abs()`

**Tests:** `src/server/__tests__/puzzle-logic.test.ts` — Consistent, looping, pre-epoch cases covered.

**Data:** `src/server/data/puzzles.ts` — 51 puzzles, each with `subreddit`, `clues`, `category`.

---

## 3. Guess Validation ✅ (Working)

**Flow:**
1. Client normalizes guess via `normalizeSubredditName()` before submit
2. Server receives `guess` and `mode` (`daily` | `unlimited`)
3. Server normalizes both guess and correct answer before comparison
4. `normalizeSubredditName` handles: trim, lowercase, `r/`, `/r/`, URLs, trailing slashes

**Tests:** `src/server/__tests__/product-logic.test.ts` — Normalization cases covered.

**Edge case:** If `mode` is `null` or missing, server treats as daily (`isUnlimited = mode === 'unlimited'`). Client passes `this.currentGameMode` which can be `null` after `resetGameUI()` — rare but possible if user submits before picking a mode. Consider validating `mode` on server.

---

## 4. 🔴 CRITICAL: Leaderboard `zIncrBy` Argument Order

**Location:** `src/server/index.ts:82`

```ts
await redis.zIncrBy(key, amount, username);  // ❌ WRONG
```

**Devvit Redis API signature:**
```ts
zIncrBy(key: string, member: string, value: number): Promise<number>;
```

**Correct call:**
```ts
await redis.zIncrBy(key, username, amount);  // ✅ (key, member, value)
```

**Impact:** Leaderboard scores may not increment correctly. Passing `amount` as `member` and `username` as `value` will cause incorrect Redis behavior.

**Fix:**
```diff
- await redis.zIncrBy(key, amount, username);
+ await redis.zIncrBy(key, username, amount);
```

---

## 5. 🔴 CRITICAL: Sleuth Rank README vs Code Mismatch

**README.md promises:**
- Rookie Sleuth (0–1 Wins)
- Private Eye (2–5 Wins)
- Senior Sleuth (6–10 Wins)
- Inspector (11–20 Wins)
- Master Investigator (21+ Wins)

**logic.ts implements (score-based):**
- Rookie Sleuth (0–9 points)
- Junior Sleuth (10–49)
- Senior Investigator (50–99)
- Lead Sleuth (100–199)
- Chief of Sleuths (200+)

**Scoring:** Daily win = 10 pts, Cold case win = 1 pt. So "wins" ≠ "points".

**Impact:** Users expecting "Private Eye" at 2 wins will see "Rookie Sleuth" (score 20). Major UX/marketing mismatch.

**Options:**
1. **Align code to README:** Change `getSleuthRank()` to use win counts and the stated tier names.
2. **Align README to code:** Update README to reflect point-based ranks and actual tier names.

---

## 6. 🟠 Cold Case Random Pool Edge Case

**Location:** `src/server/index.ts:223-225`

```ts
const pool = ALL_PUZZLES.filter(p => p.subreddit !== dailyPuzzle.subreddit);
const puzzle = pool[Math.floor(Math.random() * pool.length)]!;
```

**Issue:** With 51 puzzles, `pool` has 50 elements — safe. But if `ALL_PUZZLES` ever has only 1 entry, `pool` is empty and `pool[0]` is `undefined`, causing a crash.

**Fix:** Add guard:
```ts
if (pool.length === 0) {
  // Fallback to daily puzzle or return error
}
```

---

## 7. 🟠 Leaderboard `zRange` API Verification

**Current usage:**
```ts
const top = await redis.zRange(key, 0, 9, { by: 'rank', reverse: true });
```

**Devvit types:** `zRange` returns `{ member: string; score: number }[]` and supports `by: 'rank' | 'score' | 'lex'`, `reverse: true`.

**Note:** The code then re-fetches scores via `zScore` for each member. The `zRange` result already includes `score` — you could simplify by using `top[i].score` directly and avoid N+1 Redis calls.

---

## 8. 🟠 Abandon Flow & Streak Reset

**Behavior:** `POST /api/game/abandon` sets streak to 0 and deletes `lastWinDate`.

**Client:** `handleExit(isAbandon)` calls `GameAPI.abandonGame()` when user confirms abandon. `resetGameUI(isAbandon)` clears local state.

** docs/Case-Selection-and-Abandon-Fixes.md** indicates fixes were proposed for:
- Full UI reset on abandon
- Case selection close button visibility

**Verification:** `resetGameUI()` in `main.ts` appears comprehensive. Confirm close button and abandon UX in manual testing.

---

## 9. 🟡 Mode Passed to Guess Endpoint

**Client:** `GameAPI.submitGuess(guess, this.currentGameMode)` — can be `null` after reset.

**Server:** `isUnlimited = mode === 'unlimited'` — if `mode` is `null`, treated as daily. That’s reasonable but implicit. Consider explicit validation and a clear error for invalid `mode`.

---

## 10. 🟡 Share Endpoint Validation

**Location:** `index.ts:364-378`

Share requires `isWinner` for today. Uses `attempts` from request body for the comment text. If client sends wrong `attempts`, the shared message could be misleading. Low risk if client always sends correct value.

---

## 11. 🟢 `getMultipleChoices` Not Used

**Location:** `src/server/logic.ts:45-74`

`getMultipleChoices()` exists but is unused. Current game is free-text guess, not multiple choice. Safe to leave or remove if not planned.

---

## 12. Test Execution

**Vitest config:** Uses `setupFiles: ['./src/client/__tests__/setup.ts']` and `environment: 'jsdom'`. Server tests (`streak-logic`, `puzzle-logic`, `product-logic`) should run with default Vitest config.

**Action:** Run `npx vitest run` and confirm all tests pass before submission.

---

## Pre-Submission Checklist

### Must Do
- [ ] Fix `zIncrBy` argument order in `incrementUserScore()`
- [ ] Resolve README vs `getSleuthRank()` mismatch (code or docs)

### Should Do
- [ ] Add empty-pool guard for Cold Case random selection
- [ ] Run full test suite: `npx vitest run`
- [ ] Manually test: daily game, cold case, abandon, share, leaderboard

### Consider
- [ ] Document or fix UTC date handling for streaks
- [ ] Validate `mode` in guess endpoint
- [ ] Simplify leaderboard by using `zRange` scores instead of extra `zScore` calls

---

## Quick Reference: Key Files

| Logic | File | Entry Point |
|-------|------|-------------|
| Streak | `logic.ts` | `calculateNewStreak()` |
| Puzzle | `logic.ts` | `getTodaysPuzzleInternal()` |
| Guess | `index.ts` | `POST /api/game/guess` |
| Ranks | `logic.ts` | `getSleuthRank()` |
| Leaderboard | `index.ts` | `incrementUserScore()`, `getTopSleuths()` |
| Normalization | `shared/utils/normalization.ts` | `normalizeSubredditName()` |
