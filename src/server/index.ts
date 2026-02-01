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

// ##########################################################################
// # DAILY PUZZLES DATA
// ##########################################################################

const DAILY_PUZZLES: DailyPuzzle[] = [
  {
    date: "2026-02-01",
    subreddit: "aww",
    clues: [
      "This subreddit is dedicated to things that make you go 'awww!'",
      "Cute animals, babies, and heartwarming moments",
      "🐶🐱👶 One of the most wholesome places on Reddit"
    ]
  },
  {
    date: "2026-02-02",
    subreddit: "askreddit",
    clues: [
      "A place where curiosity meets community through interrogation",
      "The source of those 'what is your secret' YouTube videos",
      "❓ The largest question-and-answer forum on the site"
    ]
  },
  {
    date: "2026-02-03",
    subreddit: "gaming",
    clues: [
      "A digital battlefield for pixels and passion",
      "Controllers, keyboards, and heated debates about frame rates",
      "🎮 The primary hub for all things electronic entertainment"
    ]
  },
  {
    date: "2026-02-04",
    subreddit: "funny",
    clues: [
      "The pharmacist of laughter, though some jokes are generic",
      "Visual gags, situational comedy, and occasional groans",
      "😂 A massive collection of attempts at humor"
    ]
  },
  {
    date: "2026-02-05",
    subreddit: "todayilearned",
    clues: [
      "The unofficial repository of 'did you know?' trivia",
      "Where yesterday's obscurities become today's front page",
      "🧠 TIL stands for... actually, you probably know this"
    ]
  },
  {
    date: "2026-02-06",
    subreddit: "science",
    clues: [
      "The digital observatory for evidence-based reality",
      "Peer-reviewed findings and complex research papers",
      "🔬 A strictly moderated hub for academic discovery"
    ]
  },
  {
    date: "2026-02-07",
    subreddit: "movies",
    clues: [
      "The cinematic headquarters for film buffs",
      "Trailers, casting news, and deep analysis of the silver screen",
      "🎬 Where the motion picture industry is dissected"
    ]
  },
  {
    date: "2026-02-08",
    subreddit: "pics",
    clues: [
      "A window into the world, one photograph at a time",
      "From political protests to a picture of a really nice rock",
      "📷 The default hub for high-quality (and low-quality) visual captures"
    ]
  },
  {
    date: "2026-02-09",
    subreddit: "technology",
    clues: [
      "The frontier of innovation, gadgets, and silicon",
      "AI breakthroughs, privacy concerns, and software updates",
      "💻 Where the future of computing is debated daily"
    ]
  },
  {
    date: "2026-02-10",
    subreddit: "music",
    clues: [
      "The auditory archive for melodies and rhythms",
      "New releases, throwback classics, and independent artists",
      "🎵 The universal language, hosted on Reddit"
    ]
  }
];

function streakKey(postId: string, username: string): string {
  return `streak:${postId}:${username}`;
}

function lastWinDateKey(postId: string, username: string): string {
  return `last_win_date:${postId}:${username}`;
}

async function getUserStreak(postId: string, username: string): Promise<number> {
  const value = await redis.get(streakKey(postId, username));
  return value ? parseInt(value, 10) : 0;
}

async function updateStreak(postId: string, username: string, today: string): Promise<number> {
  const sKey = streakKey(postId, username);
  const dKey = lastWinDateKey(postId, username);
  const lastWinDate = await redis.get(dKey);
  let currentStreak = await getUserStreak(postId, username);
  if (lastWinDate) {
    const yesterday = new Date(new Date(today).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    if (lastWinDate === yesterday) currentStreak += 1;
    else if (lastWinDate !== today) currentStreak = 1;
  } else currentStreak = 1;
  await redis.set(sKey, currentStreak.toString());
  await redis.set(dKey, today);
  return currentStreak;
}

function leaderboardKey(postId: string): string {
  return `leaderboard:${postId}`;
}

async function incrementUserScore(postId: string, username: string): Promise<number> {
  const key = leaderboardKey(postId);
  await redis.zIncrBy(key, username, 1);
  const score = await redis.zScore(key, username);
  return score || 0;
}

async function getTopDetectives(postId: string): Promise<LeaderboardEntry[]> {
  const key = leaderboardKey(postId);
  const top = await redis.zRange(key, 0, 9, { by: 'rank', reverse: true });
  return Promise.all(top.map(async (member) => {
    const score = await redis.zScore(key, member.member) || 0;
    return { username: member.member, score: score };
  }));
}

function getDetectiveRank(score: number): string {
  if (score <= 1) return "Rookie Sleuth";
  if (score <= 5) return "Private Eye";
  if (score <= 10) return "Senior Detective";
  if (score <= 20) return "Inspector";
  return "Master Investigator";
}

function getTodaysPuzzle(): DailyPuzzle {
  const today = new Date().toISOString().split('T')[0];
  const puzzle = DAILY_PUZZLES.find(p => p.date === today);
  return puzzle ?? DAILY_PUZZLES[0];
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
    res.status(400).json({ status: "error", message: "postId is required" });
    return;
  }
  try {
    const username = await getUsername();
    res.json({ type: "init", postId: postId, username: username });
  } catch (error) {
    res.status(400).json({ status: "error", message: "Initialization failed" });
  }
});

router.get("/api/game/init", async (_req, res): Promise<void> => {
  try {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({ error: "Missing postId" });
      return;
    }
    const username = await getUsername();
    const today = getTodayDateKey();
    const puzzle = getTodaysPuzzle();
    const hasPlayed = await hasPlayedToday(postId, username, today);
    const attempts = await getUserAttempts(postId, username, today);
    const winner = await isWinner(postId, username, today);
    const streak = await getUserStreak(postId, username);
    const score = await redis.zScore(leaderboardKey(postId), username) || 0;
    res.json({
      type: "game_init",
      clues: puzzle.clues,
      hasPlayedToday: hasPlayed,
      attempts: attempts,
      isWinner: winner,
      streak: streak,
      answer: winner ? puzzle.subreddit : undefined,
      rank: getDetectiveRank(score)
    } as GameInitResponse);
  } catch (err) {
    res.status(500).json({ error: "Failed" });
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
    if (username === "anonymous") {
      res.status(401).json({ error: "Login required" });
      return;
    }
    const today = getTodayDateKey();
    const puzzle = getTodaysPuzzle();
    if (await isWinner(postId, username, today)) {
      res.status(400).json({ error: "Already solved" });
      return;
    }
    const { guess } = req.body as GuessRequest;
    if (!guess) {
      res.status(400).json({ error: "Invalid" });
      return;
    }
    const attempts = await incrementAttempts(postId, username, today);
    const isCorrect = guess.toLowerCase().trim() === puzzle.subreddit.toLowerCase().trim();
    let streak = 0;
    let score = await redis.zScore(leaderboardKey(postId), username) || 0;
    if (isCorrect) {
      await markAsWinner(postId, username, today);
      streak = await updateStreak(postId, username, today);
      score = await incrementUserScore(postId, username);
    }
    res.json({
      type: "guess_result",
      correct: isCorrect,
      answer: isCorrect ? puzzle.subreddit : undefined,
      attempts: attempts,
      streak: isCorrect ? streak : undefined,
      rank: isCorrect ? getDetectiveRank(score) : undefined
    } as GuessResponse);
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/api/game/leaderboard", async (_req, res): Promise<void> => {
  try {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({ error: "Missing postId" });
      return;
    }
    const leaderboard = await getTopDetectives(postId);
    res.json({ type: "leaderboard_data", leaderboard });
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/api/game/share", async (req, res): Promise<void> => {
  try {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({ error: "Missing" });
      return;
    }
    const username = await getUsername();
    if (username === "anonymous" || !(await isWinner(postId, username, getTodayDateKey()))) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { attempts } = req.body as ShareRequest;
    const comment = await reddit.submitComment({
      id: postId,
      text: `I solved today's Snoo-Clues in ${attempts} attempt${attempts !== 1 ? 's' : ''}! 🔍🎉`
    });
    res.json({ type: "share_result", success: true, commentUrl: `https://reddit.com${comment.permalink}` });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
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
