import {
  DailyPuzzle,
  GameInitResponse,
  GuessRequest,
  GuessResponse,
  ShareRequest,
  LeaderboardEntry,
  LeaderboardResponse
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
import { calculateNewStreak, getPuzzleByDate, getMultipleChoices, getDetectiveRank } from "./logic.js";
import { ALL_PUZZLES } from "./data/puzzles.js";

// ##########################################################################
// # DAILY PUZZLES DATA
// ##########################################################################

const DAILY_PUZZLES: DailyPuzzle[] = ALL_PUZZLES.slice(0, 15).map((p, i) => ({
  ...p,
  date: new Date(new Date("2026-02-01").getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}));

// ##########################################################################
// # REDIS KEYS & HELPERS
// ##########################################################################

function streakKey(postId: string, username: string): string {
  return `streak:${postId}:${username}`;
}

function lastWinDateKey(postId: string, username: string): string {
  return `last_win_date:${postId}:${username}`;
}

function totalWinsKey(postId: string, username: string): string {
  return `total_wins:${postId}:${username}`;
}

function leaderboardKey(postId: string): string {
  return `leaderboard:${postId}`;
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

// ##########################################################################
// # STATE LOGIC
// ##########################################################################

async function getUsername(): Promise<string> {
  const u = await reddit.getCurrentUsername();
  return u ?? "anonymous";
}

async function getUserStreak(postId: string, username: string): Promise<number> {
  const value = await redis.get(streakKey(postId, username));
  return value ? parseInt(value, 10) : 0;
}

async function getTotalWins(postId: string, username: string): Promise<number> {
  const value = await redis.get(totalWinsKey(postId, username));
  return value ? parseInt(value, 10) : 0;
}

async function incrementTotalWins(postId: string, username: string): Promise<number> {
  const key = totalWinsKey(postId, username);
  const current = await getTotalWins(postId, username);
  const newValue = current + 1;
  await redis.set(key, newValue.toString());
  // Update leaderboard
  await redis.zAdd(leaderboardKey(postId), { score: newValue, member: username });
  return newValue;
}

async function updateStreak(postId: string, username: string, today: string): Promise<number> {
  const sKey = streakKey(postId, username);
  const dKey = lastWinDateKey(postId, username);
  const lastWinDate = await redis.get(dKey);
  const currentStreak = await getUserStreak(postId, username);

  const newStreak = calculateNewStreak(lastWinDate || null, today, currentStreak);

  await redis.set(sKey, newStreak.toString());
  await redis.set(dKey, today);
  return newStreak;
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
  await redis.set(key, newValue.toString());
  return newValue;
}

async function markAsWinner(postId: string, username: string, date: string): Promise<void> {
  await redis.set(winnerKey(postId, username, date), "true");
  await redis.set(playedKey(postId, username, date), "true");
}

function getTodayDateKey(): string {
  return new Date().toISOString().split('T')[0] ?? "unknown";
}

// ##########################################################################
// # EXPRESS APP
// ##########################################################################

const app = express();
app.use(express.json());

const router = express.Router();

router.get("/api/game/init", async (_req, res): Promise<void> => {
  try {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({ error: "Missing postId" });
      return;
    }
    const username = await getUsername();
    const today = getTodayDateKey();
    const puzzle = getPuzzleByDate(today, DAILY_PUZZLES);
    const played = await hasPlayedToday(postId, username, today);
    const attempts = await getUserAttempts(postId, username, today);
    const winner = await isWinner(postId, username, today);
    const streak = await getUserStreak(postId, username);
    const totalWins = await getTotalWins(postId, username);
    const rank = getDetectiveRank(totalWins);

    res.json({
      type: "game_init",
      clues: puzzle.clues,
      hasPlayedToday: played,
      attempts: attempts,
      isWinner: winner,
      streak: streak,
      totalWins: totalWins,
      choices: getMultipleChoices(puzzle.subreddit, ALL_PUZZLES),
      rank: rank,
      answer: winner ? puzzle.subreddit : undefined
    } as GameInitResponse);
  } catch (err) {
    res.status(500).json({ error: "Failed to initialize game" });
  }
});

router.get("/api/game/random", async (_req, res): Promise<void> => {
  try {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({ error: "Missing postId" });
      return;
    }
    const username = await getUsername();
    const streak = await getUserStreak(postId, username);
    const totalWins = await getTotalWins(postId, username);
    const rank = getDetectiveRank(totalWins);

    const dailyPuzzle = getPuzzleByDate(getTodayDateKey(), DAILY_PUZZLES);
    const pool = ALL_PUZZLES.filter(p => p.subreddit !== dailyPuzzle.subreddit);
    const puzzle = pool[Math.floor(Math.random() * pool.length)]!;

    res.json({
      type: "game_init",
      clues: puzzle.clues,
      hasPlayedToday: false,
      attempts: 0,
      isWinner: false,
      streak: streak,
      totalWins: totalWins,
      choices: getMultipleChoices(puzzle.subreddit, ALL_PUZZLES),
      rank: rank
    } as GameInitResponse);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch random case" });
  }
});

router.post("/api/game/guess", async (req, res): Promise<void> => {
  try {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({ error: "Missing postId" });
      return;
    }
    const username = await getUsername();
    const { guess, mode, targetSubreddit } = req.body as (GuessRequest & { mode?: 'daily' | 'unlimited', targetSubreddit?: string });

    if (!guess) {
      res.status(400).json({ error: "Missing guess" });
      return;
    }

    const isUnlimited = mode === 'unlimited';
    const today = getTodayDateKey();

    let correctAnswer = "";
    if (isUnlimited) {
      // In unlimited mode, we rely on targetSubreddit being sent back OR we store it in session
      // For simplicity, we assume targetSubreddit is passed back correctly
      correctAnswer = targetSubreddit || "";
    } else {
      const puzzle = getPuzzleByDate(today, DAILY_PUZZLES);
      correctAnswer = puzzle.subreddit;
      if (await isWinner(postId, username, today)) {
        res.status(400).json({ error: "Already solved daily case" });
        return;
      }
    }

    const isCorrect = guess.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    let streak = await getUserStreak(postId, username);
    let totalWins = await getTotalWins(postId, username);
    let attempts = 0;

    if (!isUnlimited) {
      attempts = await incrementAttempts(postId, username, today);
    }

    if (isCorrect) {
      totalWins = await incrementTotalWins(postId, username);
      if (!isUnlimited) {
        await markAsWinner(postId, username, today);
        streak = await updateStreak(postId, username, today);
      }
    }

    const rank = getDetectiveRank(totalWins);

    res.json({
      type: "guess_result",
      correct: isCorrect,
      answer: isCorrect ? correctAnswer : undefined,
      attempts: isUnlimited ? 0 : attempts,
      streak: streak,
      totalWins: totalWins,
      rank: rank,
      audioTrigger: isCorrect ? 'correct' : 'wrong'
    } as GuessResponse);
  } catch (error) {
    res.status(500).json({ error: "Failed to process guess" });
  }
});

router.post("/api/game/share", async (req, res): Promise<void> => {
  try {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({ error: "Missing postId" });
      return;
    }
    const username = await getUsername();
    const { attempts } = req.body as ShareRequest;

    const streak = await getUserStreak(postId, username);
    const totalWins = await getTotalWins(postId, username);
    const rank = getDetectiveRank(totalWins);

    const text = `I solved the Snoo-Clue in ${attempts} attempt${attempts !== 1 ? 's' : ''}! 🔍 Streak: ${streak}. Rank: ${rank}.`;

    const comment = await reddit.submitComment({
      id: postId,
      text: text
    });
    res.json({ type: "share_result", success: true, commentUrl: `https://reddit.com${comment.permalink}` });
  } catch (err) {
    res.status(500).json({ error: "Failed to broadcast result" });
  }
});

router.get("/api/game/leaderboard", async (_req, res): Promise<void> => {
  try {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({ error: "Missing postId" });
      return;
    }
    const top = await redis.zRange(leaderboardKey(postId), 0, 9, { by: 'rank', reverse: true });
    const leaderboard: LeaderboardEntry[] = await Promise.all(top.map(async (m) => ({
      username: m.member,
      score: await redis.zScore(leaderboardKey(postId), m.member) || 0
    })));
    res.json({ type: "leaderboard_data", leaderboard } as LeaderboardResponse);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.post("/internal/on-app-install", async (_req, res): Promise<void> => {
  try {
    const post = await createPost();
    res.json({ status: "success", message: `Post created: ${post.id}` });
  } catch (error) {
    res.status(400).json({ status: "error" });
  }
});

router.post("/internal/menu/post-create", async (_req, res): Promise<void> => {
  try {
    const post = await createPost();
    res.json({ navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}` });
  } catch (error) {
    res.status(400).json({ status: "error" });
  }
});

app.use(router);
const server = createServer(app);
server.listen(getServerPort());
