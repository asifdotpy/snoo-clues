import {
  DailyPuzzle,
  GameInitResponse,
  GuessRequest,
  GuessResponse,
  ShareRequest,
  LeaderboardEntry,
  CommunitySubmissionRequest,
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

function streakKey(username: string): string {
  return `streak:${username}`;
}

function lastWinDateKey(username: string): string {
  return `last_win_date:${username}`;
}

function archivesKey(username: string): string {
  return `archives_solved:${username}`;
}

function archivesAnswerKey(username: string): string {
  return `archives_answer:${username}`;
}

function communityCasesKey(): string {
  return `community_cases`;
}

function communityCaseAnswerKey(username: string): string {
  return `community_case_answer:${username}`;
}

async function getUserStreak(username: string): Promise<number> {
  const sKey = streakKey(username);
  const dKey = lastWinDateKey(username);
  const lastWinDate = await redis.get(dKey);
  const value = await redis.get(sKey);
  const currentStreak = value ? parseInt(value, 10) : 0;

  if (!lastWinDate) return 0;

  const today = getTodayDateKey();
  const yesterday = new Date(new Date(today).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Streak is valid if the last win was today or yesterday
  if (lastWinDate === today || lastWinDate === yesterday) {
    return currentStreak;
  }

  return 0;
}

async function getArchivesSolved(username: string): Promise<number> {
  const value = await redis.get(archivesKey(username));
  return value ? parseInt(value, 10) : 0;
}

async function incrementArchivesSolved(username: string): Promise<number> {
  const key = archivesKey(username);
  const current = await getArchivesSolved(username);
  const newValue = current + 1;
  await redis.set(key, newValue.toString());
  return newValue;
}

async function updateStreak(username: string, today: string): Promise<number> {
  const sKey = streakKey(username);
  const dKey = lastWinDateKey(username);
  const lastWinDate = await redis.get(dKey);
  let currentStreak = await getUserStreak(username);

  currentStreak = calculateNewStreak(lastWinDate ?? null, today, currentStreak);

  await redis.set(sKey, currentStreak.toString());
  await redis.set(dKey, today);
  return currentStreak;
}

function leaderboardKey(): string {
  return `leaderboard`;
}

async function incrementUserScore(username: string, amount: number = 1): Promise<number> {
  const key = leaderboardKey();
  // Devvit Redis API: zIncrBy(key, member, value) returns the new score
  return await redis.zIncrBy(key, username, amount);
}

async function getTopSleuths(): Promise<LeaderboardEntry[]> {
  const key = leaderboardKey();
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

function playedKey(username: string, date: string): string {
  return `played:${username}:${date}`;
}

function attemptsKey(username: string, date: string): string {
  return `attempts:${username}:${date}`;
}

function winnerKey(username: string, date: string): string {
  return `winner:${username}:${date}`;
}

async function getUsername(): Promise<string> {
  const u = await reddit.getCurrentUsername();
  return u ?? "anonymous";
}

async function hasPlayedToday(username: string, date: string): Promise<boolean> {
  return (await redis.get(playedKey(username, date))) === "true";
}

async function isWinner(username: string, date: string): Promise<boolean> {
  return (await redis.get(winnerKey(username, date))) === "true";
}

async function getUserAttempts(username: string, date: string): Promise<number> {
  const value = await redis.get(attemptsKey(username, date));
  return value ? parseInt(value, 10) : 0;
}

async function incrementAttempts(username: string, date: string): Promise<number> {
  const key = attemptsKey(username, date);
  const current = await getUserAttempts(username, date);
  const newValue = current + 1;
  await redis.set(key, newValue.toString(), { expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
  return newValue;
}

async function markAsPlayed(username: string, date: string): Promise<void> {
  await redis.set(playedKey(username, date), "true", { expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
}

async function markAsWinner(username: string, date: string): Promise<void> {
  await redis.set(winnerKey(username, date), "true", { expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
  await markAsPlayed(username, date);
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
    const hasPlayed = await hasPlayedToday(username, today);
    const attempts = await getUserAttempts(username, today);
    const winner = await isWinner(username, today);
    const streak = await getUserStreak(username);
    const archivesCount = await getArchivesSolved(username);
    const score = await redis.zScore(leaderboardKey(), username) || 0;
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
    console.error("[Game Init] Error:", err);
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
    const streak = await getUserStreak(username);
    const archivesCount = await getArchivesSolved(username);
    const score = await redis.zScore(leaderboardKey(), username) || 0;

    // Pick a random puzzle that isn't the daily one
    const dailyPuzzle = getTodaysPuzzle();
    const pool = ALL_PUZZLES.filter(p => p.subreddit !== dailyPuzzle.subreddit);

    // Fallback if pool is empty (e.g. only 1 puzzle exists)
    const puzzle = pool.length > 0
      ? pool[Math.floor(Math.random() * pool.length)]!
      : dailyPuzzle;

    // Store the answer for validation
    await redis.set(archivesAnswerKey(username), puzzle.subreddit);

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
    console.error("[Game Random] Error:", err);
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
      correctAnswer = await redis.get(archivesAnswerKey(username)) || "";
    } else if (isCommunity) {
      correctAnswer = await redis.get(communityCaseAnswerKey(username)) || "";
    } else {
      const puzzle = getTodaysPuzzle();
      correctAnswer = puzzle.subreddit;
      if (await isWinner(username, today)) {
        res.status(400).json({ error: "This Daily Case File has already been closed." });
        return;
      }
    }

    if (!correctAnswer) {
      res.status(404).json({ error: "The targeted Case File does not exist in our active records." });
      return;
    }

    const isCorrect = normalizeSubredditName(guess) === normalizeSubredditName(correctAnswer);
    let streak = await getUserStreak(username);
    let archivesSolvedCount = await getArchivesSolved(username);
    let score = await redis.zScore(leaderboardKey(), username) || 0;
    let attempts = 0;

    if (!isArchives) {
      attempts = await incrementAttempts(username, today);
    }

    if (isCorrect) {
      if (isArchives || isCommunity) {
        archivesSolvedCount = await incrementArchivesSolved(username);
        // Practice cases still increment rank score but not streak. Award 1 point.
        score = await incrementUserScore(username, 1);
      } else {
        await markAsWinner(username, today);
        streak = await updateStreak(username, today);
        // Daily cases are more prestigious. Award 10 points.
        score = await incrementUserScore(username, 10);
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
    console.error("[Guess] Error:", error);
    res.status(500).json({ error: "Sleuth HQ encountered an error while processing your findings." });
  }
});

router.get("/api/game/leaderboard", async (_req, res): Promise<void> => {
  try {
    const leaderboard = await getTopSleuths();
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

    const sKey = streakKey(username);
    const dKey = lastWinDateKey(username);
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
      if (!(await isWinner(username, today))) {
        res.status(403).json({ error: "You must close the Case File before reporting your findings!" });
        return;
      }
    } else if (mode === 'archives') {
      correctAnswer = await redis.get(archivesAnswerKey(username)) || "???";
      caseTitle = "Archives Case";
    } else if (mode === 'community') {
      correctAnswer = await redis.get(communityCaseAnswerKey(username)) || "???";
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

    await redis.zAdd(communityCasesKey(), { member: JSON.stringify(submission), score: Date.now() });
    res.json({ success: true, message: "Case File successfully submitted to the community archives!" });
  } catch (err) {
    console.error("[Community Submit] Error:", err);
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
    const score = await redis.zScore(leaderboardKey(), username) || 0;
    const streak = await getUserStreak(username);
    const archivesCount = await getArchivesSolved(username);

    // Get a random community case
    let len = await redis.zCard(communityCasesKey());
    if (len === 0) {
      console.log("[Community] Seeding initial test case for hackathon verification.");
      const seedCase = {
        subreddit: "ProgrammerHumor",
        evidence: [
          "Where the semicolon is king of the jungle...",
          "Centering a DIV is our legendary final boss.",
          "Every post starts with 'I don't know who needs to hear this...'"
        ],
        author: "SleuthMaster",
        category: "community",
        timestamp: Date.now()
      };
      await redis.zAdd(communityCasesKey(), { member: JSON.stringify(seedCase), score: Date.now() });
      len = 1;
    }

    const randomIndex = Math.floor(Math.random() * len);
    const raw = await redis.zRange(communityCasesKey(), randomIndex, randomIndex, { by: 'rank' });
    if (!raw || raw.length === 0 || !raw[0]) {
      res.status(404).json({ error: "Failed to retrieve a community Case File from the records." });
      return;
    }

    // Devvit zRange returns { member: string, score: number }[]
    const puzzle = JSON.parse(raw[0].member) as { subreddit: string, evidence: [string, string, string], category?: string };

    // Store answer for validation
    await redis.set(communityCaseAnswerKey(username), puzzle.subreddit);

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
    console.error("[Community Random] Error:", err);
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
