import {
  DailyPuzzle,
  GameInitResponse,
  GuessRequest,
  GuessResponse,
  ShareRequest,
  LeaderboardEntry,
} from "../shared/types/api";
import {
  createServer,
  context,
  getServerPort,
  reddit,
  redis,
} from "@devvit/web/server";
import express from "express";
import { createPost } from "./core/post.js";

import { ALL_PUZZLES } from "./data/puzzles.js";
import {
  normalizeSubredditName,
  getSleuthRank,
  calculateNewStreak,
  getTodaysPuzzleInternal
} from "./logic.js";

// Daily puzzles are dynamically selected from ALL_PUZZLES based on the current date

function streakKey(postId: string, username: string): string {
  return `streak:${postId}:${username}`;
}

function lastWinDateKey(postId: string, username: string): string {
  return `last_win_date:${postId}:${username}`;
}

function archivesKey(postId: string, username: string): string {
  return `archives_solved:${postId}:${username}`;
}

function archivesAnswerKey(postId: string, username: string): string {
  return `archives_answer:${postId}:${username}`;
}

function communityCasesKey(): string {
  return `community_cases`;
}

function communityCaseAnswerKey(postId: string, username: string): string {
  return `community_case_answer:${postId}:${username}`;
}

async function getUserStreak(postId: string, username: string): Promise<number> {
  const value = await redis.get(streakKey(postId, username));
  return value ? parseInt(value, 10) : 0;
}

async function getArchivesSolved(postId: string, username: string): Promise<number> {
  const value = await redis.get(archivesKey(postId, username));
  return value ? parseInt(value, 10) : 0;
}

async function incrementArchivesSolved(postId: string, username: string): Promise<number> {
  const key = archivesKey(postId, username);
  const current = await getArchivesSolved(postId, username);
  const newValue = current + 1;
  await redis.set(key, newValue.toString());
  return newValue;
}

async function updateStreak(postId: string, username: string, today: string): Promise<number> {
  const sKey = streakKey(postId, username);
  const dKey = lastWinDateKey(postId, username);
  const lastWinDate = await redis.get(dKey);
  let currentStreak = await getUserStreak(postId, username);

  currentStreak = calculateNewStreak(lastWinDate, today, currentStreak);

  await redis.set(sKey, currentStreak.toString());
  await redis.set(dKey, today);
  return currentStreak;
}

function leaderboardKey(postId: string): string {
  return `leaderboard:${postId}`;
}

async function incrementUserScore(postId: string, username: string, amount: number = 1): Promise<number> {
  const key = leaderboardKey(postId);
  // Devvit Redis API: zIncrBy(key, member, value) returns the new score
  return await redis.zIncrBy(key, username, amount);
}

async function getTopSleuths(postId: string): Promise<LeaderboardEntry[]> {
  const key = leaderboardKey(postId);
  const top = await redis.zRange(key, 0, 9, { by: 'rank', reverse: true });
  return top.map((member) => ({
    username: member.member,
    score: member.score
  }));
}


function getTodaysPuzzle(): DailyPuzzle & { category: string } {
  return getTodaysPuzzleInternal(new Date(), ALL_PUZZLES);
}

function getTodayCaseNumber(): number {
  const epoch = new Date("2025-01-01").getTime();
  const current = new Date().getTime();
  return Math.floor((current - epoch) / (1000 * 60 * 60 * 24)) + 1;
}

function getTodayDateKey(): string {
  return new Date().toISOString().split('T')[0] ?? "unknown";
}

function playedKey(postId: string, username: string, date: string): string {
  return `played:${postId}:${username}:${date}`;
}

function attemptsKey(postId: string, username: string, date: string): string {
  return `attempts:${postId}:${username}:${date}`;
}

function winnerKey(postId: string, username: string, date: string): string {
  return `winner:${postId}:${username}:${date}`;
}

async function getUsername(): Promise<string> {
  const u = await reddit.getCurrentUsername();
  return u ?? "anonymous";
}

async function hasPlayedToday(postId: string, username: string, date: string): Promise<boolean> {
  return (await redis.get(playedKey(postId, username, date))) === "true";
}

async function isWinner(postId: string, username: string, date: string): Promise<boolean> {
  return (await redis.get(winnerKey(postId, username, date))) === "true";
}

async function getUserAttempts(postId: string, username: string, date: string): Promise<number> {
  const value = await redis.get(attemptsKey(postId, username, date));
  return value ? parseInt(value, 10) : 0;
}

async function incrementAttempts(postId: string, username: string, date: string): Promise<number> {
  const key = attemptsKey(postId, username, date);
  const current = await getUserAttempts(postId, username, date);
  const newValue = current + 1;
  await redis.set(key, newValue.toString(), { expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
  return newValue;
}

async function markAsPlayed(postId: string, username: string, date: string): Promise<void> {
  await redis.set(playedKey(postId, username, date), "true", { expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
}

async function markAsWinner(postId: string, username: string, date: string): Promise<void> {
  await redis.set(winnerKey(postId, username, date), "true", { expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
  await markAsPlayed(postId, username, date);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

const router = express.Router();

router.get("/api/init", async (_req, res): Promise<void> => {
  const { postId } = context;
  if (!postId) {
    res.status(400).json({ status: "error", message: "Case File ID (postId) is missing from context." });
    return;
  }
  try {
    const username = await getUsername();
    res.json({ type: "init", postId: postId, username: username });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Sleuth initialization failed. Please try again." });
  }
});

router.get("/api/game/init", async (_req, res): Promise<void> => {
  try {
    const postId = context.postId;
    if (!postId) {
      res.status(400).json({ error: "Unable to identify the Case File (Missing postId)." });
      return;
    }
    const username = await getUsername();
    const today = getTodayDateKey();
    const puzzle = getTodaysPuzzle();
    const hasPlayed = await hasPlayedToday(postId, username, today);
    const attempts = await getUserAttempts(postId, username, today);
    const winner = await isWinner(postId, username, today);
    const streak = await getUserStreak(postId, username);
    const archivesCount = await getArchivesSolved(postId, username);
    const score = await redis.zScore(leaderboardKey(postId), username) || 0;
    res.json({
      type: "game_init",
      username: username,
      evidence: puzzle.evidence,
      hasPlayedToday: hasPlayed,
      attempts: attempts,
      isWinner: winner,
      streak: streak,
      archivesSolved: archivesCount,
      category: puzzle.category,
      answer: winner ? puzzle.subreddit : undefined,
      rank: getSleuthRank(score),
      audioAssets: {
        rustle: "https://www.soundjay.com/misc/sounds/paper-rustle-1.mp3",
        victory: "https://www.soundjay.com/human/sounds/applause-01.mp3",
        wrong: "https://www.soundjay.com/misc/sounds/fail-trombone-01.mp3"
      }
    } as GameInitResponse);
  } catch (err) {
    res.status(500).json({ error: "The Daily Case File could not be retrieved from the archives." });
  }
});

router.get("/api/game/random", async (_req, res): Promise<void> => {
  try {
    const postId = context.postId;
    if (!postId) {
      res.status(400).json({ error: "Unable to identify the Case File (Missing postId)." });
      return;
    }
    const username = await getUsername();
    const streak = await getUserStreak(postId, username);
    const archivesCount = await getArchivesSolved(postId, username);
    const score = await redis.zScore(leaderboardKey(postId), username) || 0;

    // Pick a random puzzle that isn't the daily one
    const dailyPuzzle = getTodaysPuzzle();
    const pool = ALL_PUZZLES.filter(p => p.subreddit !== dailyPuzzle.subreddit);

    // Fallback if pool is empty (e.g. only 1 puzzle exists)
    const puzzle = pool.length > 0
      ? pool[Math.floor(Math.random() * pool.length)]!
      : dailyPuzzle;

    // Store the answer for validation
    await redis.set(archivesAnswerKey(postId, username), puzzle.subreddit);

    res.json({
      type: "game_init",
      username: username,
      evidence: puzzle.evidence,
      hasPlayedToday: false, // Archives mode
      attempts: 0,
      isWinner: false,
      streak: streak,
      archivesSolved: archivesCount,
      category: puzzle.category,
      rank: getSleuthRank(score),
      audioAssets: {
        rustle: "https://www.soundjay.com/misc/sounds/paper-rustle-1.mp3",
        victory: "https://www.soundjay.com/human/sounds/applause-01.mp3",
        wrong: "https://www.soundjay.com/misc/sounds/fail-trombone-01.mp3"
      }
    } as GameInitResponse);
  } catch (err) {
    res.status(500).json({ error: "Failed to pull a random Case File from the Archives." });
  }
});

router.post("/api/game/guess", async (req, res): Promise<void> => {
  try {
    const postId = context.postId;
    if (!postId) {
      res.status(400).json({ error: "Unable to identify Case File (Missing postId)." });
      return;
    }
    const username = await getUsername();
    if (username === "anonymous") {
      res.status(401).json({ error: "Sleuth identity not verified. Please log in to Reddit to submit findings." });
      return;
    }

    const { guess, mode } = req.body as (GuessRequest & { mode?: 'daily' | 'archives' | 'community' });
    if (!guess) {
      res.status(400).json({ error: "No subreddit was provided for analysis." });
      return;
    }

    const isArchives = mode === 'archives';
    const isCommunity = mode === 'community';
    if (!mode) {
      console.warn(`[Guess] Missing mode for sleuth ${username}. Defaulting to daily.`);
    }
    const today = getTodayDateKey();

    // Determine the answer to check against
    let correctAnswer = "";
    if (isArchives) {
      correctAnswer = await redis.get(archivesAnswerKey(postId, username)) || "";
    } else if (isCommunity) {
      correctAnswer = await redis.get(communityCaseAnswerKey(postId, username)) || "";
    } else {
      const puzzle = getTodaysPuzzle();
      correctAnswer = puzzle.subreddit;
      if (await isWinner(postId, username, today)) {
        res.status(400).json({ error: "This Daily Case File has already been closed." });
        return;
      }
    }

    if (!correctAnswer) {
      res.status(404).json({ error: "The targeted Case File does not exist in our active records." });
      return;
    }

    const isCorrect = normalizeSubredditName(guess) === normalizeSubredditName(correctAnswer);
    let streak = await getUserStreak(postId, username);
    let archivesSolvedCount = await getArchivesSolved(postId, username);
    let score = await redis.zScore(leaderboardKey(postId), username) || 0;
    let attempts = 0;

    if (!isArchives) {
      attempts = await incrementAttempts(postId, username, today);
    }

    if (isCorrect) {
      if (isArchives || isCommunity) {
        archivesSolvedCount = await incrementArchivesSolved(postId, username);
        // Practice cases still increment rank score but not streak. Award 1 point.
        score = await incrementUserScore(postId, username, 1);
      } else {
        await markAsWinner(postId, username, today);
        streak = await updateStreak(postId, username, today);
        // Daily cases are more prestigious. Award 10 points.
        score = await incrementUserScore(postId, username, 10);
      }
    }

    res.json({
      type: "guess_result",
      correct: isCorrect,
      answer: isCorrect ? correctAnswer : undefined,
      attempts: isArchives ? 0 : attempts, // Attempts only track for daily/community
      streak: streak,
      archivesSolved: archivesSolvedCount,
      rank: isCorrect ? getSleuthRank(score) : undefined,
      audioTrigger: isCorrect ? 'correct' : 'wrong'
    } as GuessResponse);
  } catch (error) {
    res.status(500).json({ error: "Sleuth HQ encountered an error while processing your findings." });
  }
});

router.get("/api/game/leaderboard", async (_req, res): Promise<void> => {
  try {
    const postId = context.postId;
    if (!postId) {
      res.status(400).json({ error: "Unable to identify Case File for rankings (Missing postId)." });
      return;
    }
    const leaderboard = await getTopSleuths(postId);
    res.json({ type: "leaderboard_data", leaderboard });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve the sleuth rankings from HQ." });
  }
});

router.post("/api/game/abandon", async (_req, res): Promise<void> => {
  try {
    const postId = context.postId;
    if (!postId) {
      res.status(400).json({ error: "Unable to identify the Case File to abandon (Missing postId)." });
      return;
    }
    const username = await getUsername();
    if (username === "anonymous") {
      res.status(401).json({ error: "Sleuth identity not verified. Login required to manage Case Files." });
      return;
    }

    const sKey = streakKey(postId, username);
    const dKey = lastWinDateKey(postId, username);
    await redis.set(sKey, "0");
    await redis.del(dKey);

    res.json({ success: true, streak: 0 });
  } catch (err) {
    res.status(500).json({ error: "Failed to properly abandon the investigation at HQ." });
  }
});

router.post("/api/game/share", async (req, res): Promise<void> => {
  try {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({ error: "Unable to identify Case File for reporting (Missing postId)." });
      return;
    }
    const username = await getUsername();
    if (username === "anonymous") {
      res.status(401).json({ error: "Sleuth identity not verified. Login required to report findings." });
      return;
    }

    const { attempts, evidenceFound, mode } = req.body as ShareRequest;

    let emojiRow = "";
    for (let i = 1; i <= 3; i++) {
      emojiRow += i <= evidenceFound ? "🔎 " : "⬛ ";
    }

    const today = getTodayDateKey();
    let correctAnswer = "";
    let caseTitle = "Case File";

    if (mode === 'daily') {
      const puzzle = getTodaysPuzzle();
      correctAnswer = puzzle.subreddit;
      caseTitle = `Daily Case #${getTodayCaseNumber()}`;
      // Verify they actually won
      if (!(await isWinner(postId, username, today))) {
        res.status(403).json({ error: "You must close the Case File before reporting your findings!" });
        return;
      }
    } else if (mode === 'archives') {
      correctAnswer = await redis.get(archivesAnswerKey(postId, username)) || "???";
      caseTitle = "Archives Case";
    } else if (mode === 'community') {
      correctAnswer = await redis.get(communityCaseAnswerKey(postId, username)) || "???";
      caseTitle = "Community Case";
    }

    const text = `Snoo-Clues ${caseTitle}
${emojiRow.trim()}
I solved it in ${attempts} attempt${attempts !== 1 ? 's' : ''}! 🔍🎉
r/${correctAnswer}`;

    const comment = await reddit.submitComment({
      id: postId,
      text: text
    });

    res.json({ type: "share_result", success: true, commentUrl: `https://reddit.com${comment.permalink}` });
  } catch (err) {
    console.error("[Share] Error:", err);
    res.status(500).json({ error: "HQ failed to post your reported findings. Please try again." });
  }
});

router.post("/api/game/community/submit", async (req, res): Promise<void> => {
  try {
    const { subreddit, evidence } = req.body as CommunitySubmissionRequest;
    if (!subreddit || !evidence || evidence.length !== 3) {
      res.status(400).json({ error: "The submitted Case File is incomplete or invalid." });
      return;
    }

    const username = await getUsername();
    const submission = {
      subreddit: normalizeSubredditName(subreddit),
      evidence,
      author: username,
      category: "community",
      timestamp: Date.now()
    };

    await redis.lPush(communityCasesKey(), JSON.stringify(submission));
    res.json({ success: true, message: "Case File successfully submitted to the community archives!" });
  } catch (err) {
    res.status(500).json({ error: "HQ failed to process your Case File submission." });
  }
});

router.get("/api/game/community/random", async (_req, res): Promise<void> => {
  try {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({ error: "Unable to identify Case File (Missing postId)." });
      return;
    }
    const username = await getUsername();
    const score = await redis.zScore(leaderboardKey(postId), username) || 0;
    const streak = await getUserStreak(postId, username);
    const archivesCount = await getArchivesSolved(postId, username);

    // Get a random community case
    const len = await redis.lLen(communityCasesKey());
    if (len === 0) {
      res.status(404).json({ error: "No community Case Files found. Be the first Sleuth to submit one!" });
      return;
    }

    const randomIndex = Math.floor(Math.random() * len);
    const raw = await redis.lRange(communityCasesKey(), randomIndex, randomIndex);
    if (!raw || raw.length === 0) {
      res.status(404).json({ error: "Failed to retrieve a community Case File from the records." });
      return;
    }

    // Devvit lRange returns string[]
    const puzzle = JSON.parse(raw[0]) as { subreddit: string, evidence: [string, string, string], category?: string };

    // Store answer for validation
    await redis.set(communityCaseAnswerKey(postId, username), puzzle.subreddit);

    res.json({
      type: "game_init",
      username: username,
      evidence: puzzle.evidence,
      hasPlayedToday: false,
      attempts: 0,
      isWinner: false,
      streak: streak,
      archivesSolved: archivesCount,
      category: puzzle.category || "community",
      rank: getSleuthRank(score),
      audioAssets: {
        rustle: "https://www.soundjay.com/misc/sounds/paper-rustle-1.mp3",
        victory: "https://www.soundjay.com/human/sounds/applause-01.mp3",
        wrong: "https://www.soundjay.com/misc/sounds/fail-trombone-01.mp3"
      }
    } as GameInitResponse);
  } catch (err) {
    res.status(500).json({ error: "Sleuth HQ encountered an error while pulling a community Case File." });
  }
});

router.post("/internal/on-app-install", async (_req, res): Promise<void> => {
  try {
    const post = await createPost();
    res.json({ status: "success", message: `Investigation Board created: ${post.id}` });
  } catch (error) {
    res.status(400).json({ status: "error", message: "Failed to create investigation board." });
  }
});

router.post("/internal/menu/post-create", async (_req, res): Promise<void> => {
  try {
    const post = await createPost();
    res.json({ navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}` });
  } catch (error) {
    res.status(400).json({ status: "error", message: "Failed to create investigation board." });
  }
});

app.use(router);
const server = createServer(app);
server.listen(getServerPort());
