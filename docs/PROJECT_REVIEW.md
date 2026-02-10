# 🔍 Snoo-Clues — Project Review

**Review date:** Feb 8, 2025  
**Scope:** Full codebase scan — architecture, logic, docs, tests, and hackathon readiness.

---

## 1. What This Project Is

**Snoo-Clues** is a **daily subreddit guessing game** for Reddit, built with **Devvit** and a **hybrid GameMaker + HTML/TS** frontend. Players see three progressive clues and guess the subreddit; they can play the daily case (one per day, UTC) or browse “Cold Cases” (unlimited practice). Streaks, a global leaderboard, and sleuth ranks round out the experience.

- **Platform:** Reddit (Devvit 0.12.x)
- **Frontend:** Vite + TypeScript, modular CSS, GameMaker WASM for canvas/mascot/audio
- **Backend:** Devvit server (Express), Redis for streaks/leaderboard/state
- **Content:** 51 hand-crafted puzzles in `src/server/data/puzzles.ts`

---

## 2. Architecture & Structure

**Strengths:**

- **Clear separation:** `src/client/`, `src/server/`, `src/shared/` with shared types (`api.ts`) and utilities (e.g. `normalization.ts`).
- **Documentation:** `README.md` is concise and accurate (UTC, ranks, points). Supporting docs are strong:
  - `STATE_MACHINE.md` — Mermaid diagram for UI flows (SelectionHub → Daily/ColdCase → Win/Played/Abandon).
  - `TECHNICAL_DEBT_REPORT.md` — Documents past DOM/state/error-handling fixes.
  - `HACKATHON_PRE_SUBMISSION_AUDIT.md` — Detailed logic audit with priorities.
  - `HowToBuild.md`, `PRODUCTION_PREP.md`, `Z_INDEX_GUIDE.md`, `Case-Selection-and-Abandon-Fixes.md`.
- **Client structure:** `main.ts` as game controller, `GameAPI.ts` for HTTP, `HybridBridge.ts` for GameMaker callbacks, `GameLoader.ts` for WASM load, modular CSS partials under `styles/`.
- **Devvit config:** `devvit.json` is minimal and correct (post dir, server entry, menu, triggers, dev subreddit).

**Notable details:**

- Guess normalization is shared and used on both client and server — consistent behavior and no duplicated logic.
- Leaderboard uses Redis sorted sets; `getTopSleuths()` uses `zRange` and maps `member`/`score` directly (no N+1 `zScore` calls).
- Cold Case pool has an explicit fallback when the pool is empty (e.g. single-puzzle edge case).

---

## 3. Critical & High-Priority Audit Items — Status

From `docs/HACKATHON_PRE_SUBMISSION_AUDIT.md`:

| Item | Audit | Current status |
|------|--------|----------------|
| **zIncrBy argument order** | 🔴 Critical | **Fixed** — `index.ts` uses `redis.zIncrBy(key, username, amount)`. |
| **README vs getSleuthRank()** | 🔴 Critical | **Resolved** — README now documents point-based ranks and tier names that match `logic.ts` (Rookie Sleuth 0–9, Junior Sleuth 10–49, etc.). |
| **Cold Case empty pool** | 🟠 High | **Fixed** — Guard in place: `pool.length > 0 ? pool[random] : dailyPuzzle`. |
| **Leaderboard zRange usage** | 🟠 High | **Addressed** — Code uses `zRange` result’s `member` and `score`; no extra `zScore` round-trips. |
| **Abandon flow / resetGameUI** | 🟠 High | **Documented** — Audit and Case-Selection doc reference fixes; `resetGameUI()` in `main.ts` is comprehensive; manual verification recommended. |

The two critical issues from the audit are **resolved**; high-priority items are either fixed or documented with a clear path for manual checks.

---

## 4. Logic & Behavior

- **Streak:** `calculateNewStreak()` in `logic.ts` is tested (5 cases in `streak-logic.test.ts`) and used correctly in `updateStreak()` with Redis.
- **Puzzle selection:** `getTodaysPuzzleInternal()` uses epoch 2025-01-01 and `abs(diffDays) % puzzles.length`; covered by `puzzle-logic.test.ts`.
- **Guess validation:** Client normalizes before submit; server normalizes guess and answer and compares; normalization tests in `product-logic.test.ts`.
- **Ranks:** `getSleuthRank(score)` is point-based and aligned with README (0–9, 10–49, 50–99, 100–199, 200+).
- **Mode handling:** If `mode` is missing on guess, server defaults to daily and logs a warning — reasonable; explicit validation would be a small improvement.

**Timezone:** Streaks and “today” use UTC (`getTodayDateKey()`). README states “Daily puzzles reset at midnight UTC” and “Your streak is based on UTC dates” — appropriate and documented.

---

## 5. Tests & Quality

- **Server:** `streak-logic.test.ts`, `puzzle-logic.test.ts`, `product-logic.test.ts` cover core logic.
- **Client:** `GameAPI.test.ts`, `effects.test.ts`, `audio.test.ts`, `audit.test.ts`, `confirm-modal.test.ts` (plus a `.localbak`).
- **Config:** Vitest with `jsdom`, `setupFiles` for client tests; single root `vitest.config.ts`.

**Recommendation:** Run `npx vitest run` before submission and fix any failures. If the suite is silent in your environment, run with `--reporter=verbose` or target specific dirs to confirm all tests execute and pass.

---

## 6. Remaining Considerations (from audit)

- **Medium:** Validate `mode` on the guess endpoint (e.g. require `'daily' | 'unlimited'`) and return a clear error for invalid/missing mode if you want stricter API contract.
- **Medium:** Share endpoint uses `attempts` from the request body for the comment text; low risk if the client always sends the correct value; optional server-side sanity check.
- **Low:** `getMultipleChoices()` in `logic.ts` is unused; safe to leave or remove for clarity.
- **Manual:** Abandon UX and case selection close button — confirm in playtest as suggested in the audit.

---

## 7. Summary

| Aspect | Assessment |
|--------|------------|
| **Architecture** | Clear client/server/shared split; hybrid GameMaker bridge is well scoped. |
| **Documentation** | Strong — README, state machine, technical debt, and pre-submission audit. |
| **Core logic** | Streak, puzzle, guess, ranks, and leaderboard are consistent and tested. |
| **Audit follow-up** | Critical (zIncrBy, README/ranks) and high-priority (cold case pool, leaderboard) items are addressed. |
| **Hackathon readiness** | In good shape: run full test suite, do a short manual pass (daily, cold case, abandon, share, leaderboard), and optionally tighten mode/share validation. |

**Verdict:** The project is well structured, documented, and aligned with the pre-submission audit. The critical bugs are fixed and the design (shared normalization, point-based ranks, UTC, fallbacks) is coherent. A final test run and a quick manual check of key flows will round it out for submission.
