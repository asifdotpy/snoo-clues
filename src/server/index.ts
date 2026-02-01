import express from "express";
import {
  InitResponse,
  DailyPuzzle,
  GameInitResponse,
  GuessRequest,
  GuessResponse,
  ShareRequest,
  ShareResponse
} from "../shared/types/api";
import {
  createServer,
  context,
  getServerPort,
  reddit,
  redis
} from "@devvit/web/server";
import { createPost } from "./core/post";

// ##########################################################################
// # DAILY PUZZLES DATA - Snoo-Clues Game
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

// ##########################################################################
// # GAME HELPER FUNCTIONS
// ##########################################################################

function getTodaysPuzzle(): DailyPuzzle | null {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return DAILY_PUZZLES.find(p => p.date === today) || DAILY_PUZZLES[0]; // Fallback to first puzzle
}

function getTodayDateKey(): string {
  return new Date().toISOString().split('T')[0];
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
  const key = playedKey(postId, username, date);
  const value = await redis.get(key);
  return value === "true";
}

async function isWinner(postId: string, username: string, date: string): Promise<boolean> {
  const key = winnerKey(postId, username, date);
  const value = await redis.get(key);
  return value === "true";
}

async function getUserAttempts(postId: string, username: string, date: string): Promise<number> {
  const key = attemptsKey(postId, username, date);
  const value = await redis.get(key);
  return value ? parseInt(value, 10) : 0;
}

async function incrementAttempts(postId: string, username: string, date: string): Promise<number> {
  const key = attemptsKey(postId, username, date);
  const current = await getUserAttempts(postId, username, date);
  const newValue = current + 1;
  await redis.set(key, newValue.toString(), { expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }); // 7 days TTL
  return newValue;
}

async function markAsPlayed(postId: string, username: string, date: string): Promise<void> {
  const key = playedKey(postId, username, date);
  await redis.set(key, "true", { expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }); // 7 days TTL
}

async function markAsWinner(postId: string, username: string, date: string): Promise<void> {
  const key = winnerKey(postId, username, date);
  await redis.set(key, "true", { expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }); // 7 days TTL
  await markAsPlayed(postId, username, date);
}

// ##########################################################################

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

router.get<
  { postId: string },
  InitResponse | { status: string; message: string }
>("/api/init", async (_req, res): Promise<void> => {
  const { postId } = context;

  if (!postId) {
    console.error("API Init Error: postId not found in devvit context");
    res.status(400).json({
      status: "error",
      message: "postId is required but missing from context",
    });
    return;
  }

  try {
    const username = await reddit.getCurrentUsername();

    res.json({
      type: "init",
      postId: postId,
      username: username ?? "anonymous",
    });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    let errorMessage = "Unknown error during initialization";
    if (error instanceof Error) {
      errorMessage = `Initialization failed: ${error.message}`;
    }
    res.status(400).json({ status: "error", message: errorMessage });
  }
});

// ##########################################################################
// # SNOO-CLUES GAME API ENDPOINTS
// ##########################################################################

// GET /api/game/init - Send today's clues and user status
router.get("/api/game/init", async (_req, res): Promise<void> => {
  try {
    const { postId } = context;
    if (!postId) {
      return res.status(400).json({ error: "Missing postId in context" });
    }

    const username = await getUsername();
    const today = getTodayDateKey();
    const puzzle = getTodaysPuzzle();

    if (!puzzle) {
      return res.status(404).json({ error: "No puzzle available for today" });
    }

    const hasPlayed = await hasPlayedToday(postId, username, today);
    const attempts = await getUserAttempts(postId, username, today);
    const winner = await isWinner(postId, username, today);

    const response: GameInitResponse = {
      type: "game_init",
      clues: puzzle.clues,
      hasPlayedToday: hasPlayed,
      attempts: attempts,
      isWinner: winner
    };

    res.json(response);
  } catch (err) {
    console.error("GET /api/game/init error:", err);
    res.status(500).json({ error: "Failed to initialize game" });
  }
});

// POST /api/game/guess - Validate user's guess
router.post("/api/game/guess", async (req, res): Promise<void> => {
  try {
    const { postId } = context;
    if (!postId) {
      return res.status(400).json({ error: "Missing postId in context" });
    }

    const username = await getUsername();
    if (username === "anonymous") {
      return res.status(401).json({ error: "Login required" });
    }

    const today = getTodayDateKey();
    const puzzle = getTodaysPuzzle();

    if (!puzzle) {
      return res.status(404).json({ error: "No puzzle available for today" });
    }

    // Check if already won today
    const winner = await isWinner(postId, username, today);
    if (winner) {
      return res.status(400).json({ error: "You've already solved today's puzzle!" });
    }

    const { guess } = req.body as GuessRequest;
    if (!guess || typeof guess !== "string") {
      return res.status(400).json({ error: "Invalid guess" });
    }

    // Increment attempts
    const attempts = await incrementAttempts(postId, username, today);

    // Normalize and compare (lowercase, trim)
    const normalizedGuess = guess.toLowerCase().trim();
    const normalizedAnswer = puzzle.subreddit.toLowerCase().trim();
    const isCorrect = normalizedGuess === normalizedAnswer;

    if (isCorrect) {
      // Mark as winner
      await markAsWinner(postId, username, today);
    }

    const response: GuessResponse = {
      type: "guess_result",
      correct: isCorrect,
      answer: isCorrect ? puzzle.subreddit : undefined,
      attempts: attempts
    };

    res.json(response);
  } catch (err) {
    console.error("POST /api/game/guess error:", err);
    res.status(500).json({ error: "Failed to process guess" });
  }
});

// POST /api/game/share - Share result to Reddit
router.post("/api/game/share", async (req, res): Promise<void> => {
  try {
    const { postId } = context;
    if (!postId) {
      return res.status(400).json({ error: "Missing postId in context" });
    }

    const username = await getUsername();
    if (username === "anonymous") {
      return res.status(401).json({ error: "Login required" });
    }

    const today = getTodayDateKey();
    const winner = await isWinner(postId, username, today);

    if (!winner) {
      return res.status(400).json({ error: "You must solve the puzzle before sharing" });
    }

    const { attempts } = req.body as ShareRequest;
    if (!attempts || typeof attempts !== "number") {
      return res.status(400).json({ error: "Invalid attempts count" });
    }

    // Create a comment on the post
    const commentText = `I solved today's Snoo-Clues in ${attempts} attempt${attempts !== 1 ? 's' : ''}! 🔍🎉`;

    try {
      const comment = await reddit.submitComment({
        id: postId,
        text: commentText,
      });

      const response: ShareResponse = {
        type: "share_result",
        success: true,
        commentUrl: `https://reddit.com${comment.permalink}`
      };

      res.json(response);
    } catch (commentError) {
      console.error("Failed to post comment:", commentError);
      res.status(500).json({ error: "Failed to post comment to Reddit" });
    }
  } catch (err) {
    console.error("POST /api/game/share error:", err);
    res.status(500).json({ error: "Failed to share result" });
  }
});

// ##########################################################################

router.post("/internal/on-app-install", async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: "success",
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: "error",
      message: "Failed to create post",
    });
  }
});

router.post("/internal/menu/post-create", async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: "error",
      message: "Failed to create post",
    });
  }
});

app.use(router);

const server = createServer(app);
server.on("error", (err) => console.error(`server error; ${err.stack}`));
server.listen(getServerPort());
