# Development & Playtest Notes — Streak & Leaderboard

When testing alone in development, daily streak and leaderboard can appear to "not work" for a few reasons. This doc explains how they work and what to check.

---

## How streak and leaderboard work

- **Daily streak:** Increments only when you **solve the daily puzzle** (Today's Investigation). It does **not** increase when you play Cold Case (unlimited practice).
- **Leaderboard:** Scores are stored **per post**. Each Reddit post has its own leaderboard. You get 10 points for a daily win and 1 point per Cold Case win.
- **Data scope:** Streak, leaderboard, and "already played today" are all keyed by **post ID** and **username**. So the same user on two different posts has two separate streaks and two separate leaderboard entries.

---

## Why they might "not work" in playtest

### 1. Not logged in to Reddit

The server requires a logged-in Reddit user to save streak and leaderboard. If the app runs in a context where `reddit.getCurrentUsername()` is missing (e.g. anonymous), the guess API returns **401 Login required** and does **not** update streak or score.

**What to do:** Open the playtest URL while **logged in to Reddit** in the same browser/session. Use the same account that has access to the playtest subreddit.

### 2. Playing only Cold Case

Cold Case wins add **leaderboard points** (1 per solve) but **do not** change your **daily streak**. Streak only updates when you win **Today's Investigation** (daily mode).

**What to do:** To test streak, choose **"Today's Investigation"** and solve the daily puzzle. After a correct guess you should see streak and rank update, and the leaderboard should refresh with your score.

### 3. Different posts

If you open the game from **different post URLs** (e.g. two different "Create a new post" links), each post has its own Redis data. Your streak and leaderboard on Post A will not appear when you open Post B.

**What to do:** Use the **same** post URL when testing streak/leaderboard so you stay on the same `postId`.

### 4. Leaderboard not refreshing

After a correct guess, the client calls `fetchLeaderboard()` so the list should update. If you see "Failed to load rankings" or the list stays empty, check the browser console for errors; the leaderboard API uses the same `context.postId` as the rest of the game, so a missing or wrong context would affect it too.

---

## Quick checklist

- [ ] Logged in to Reddit when opening the playtest URL.
- [ ] Playing **Today's Investigation** (daily) when testing **streak**.
- [ ] Using the **same post** (same URL) for the whole test session.
- [ ] After a daily win, leaderboard should refresh and show your username and score (e.g. 10 pts).

If all of the above are true and streak/leaderboard still don’t update, check the browser Network tab for the `/api/game/guess` response (e.g. 401 vs 200) and the server logs for errors.
