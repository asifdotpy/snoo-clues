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

const ALL_PUZZLES: Omit<DailyPuzzle, 'date'>[] = [
  { subreddit: "aww", clues: ["Dedicated to things that make you go 'awww!'", "Cute animals, babies, and heartwarming moments", "🐶🐱👶 Wholesome places on Reddit"] },
  { subreddit: "askreddit", clues: ["Curiosity meets community through interrogation", "Source of 'what is your secret' stories", "❓ Largest Q&A forum"] },
  { subreddit: "gaming", clues: ["Digital battlefield for pixels and passion", "Controllers, keyboards, and frame rates", "🎮 Primary hub for electronic entertainment"] },
  { subreddit: "funny", clues: ["Pharmacist of laughter", "Visual gags and situational comedy", "😂 Massive collection of humor"] },
  { subreddit: "todayilearned", clues: ["Unofficial repository of trivia", "Yesterday's obscurities become today's front page", "🧠 TIL stands for..."] },
  { subreddit: "science", clues: ["Digital observatory for evidence-based reality", "Peer-reviewed findings", "🔬 Strictly moderated hub"] },
  { subreddit: "movies", clues: ["Cinematic headquarters for film buffs", "Trailers and casting news", "🎬 Motion picture industry dissection"] },
  { subreddit: "pics", clues: ["Window into the world via photography", "From politics to pretty rocks", "📷 Default hub for visual captures"] },
  { subreddit: "technology", clues: ["Frontier of innovation and silicon", "AI breakthroughs and privacy concerns", "💻 Future of computing"] },
  { subreddit: "music", clues: ["Auditory archive for melodies", "New releases and throwback classics", "🎵 The universal language"] },
  { subreddit: "worldnews", clues: ["Global echo chamber of current events", "Headlines from every corner of the earth", "🌍 International reporting hub"] },
  { subreddit: "showerthoughts", clues: ["Epiphanies born in the bathroom", "Mind-bending realizations about mundane things", "🚿 Deep thoughts while scrubbing"] },
  { subreddit: "explainlikeimfive", clues: ["Complex concepts for simple minds", "Physics and economics made easy", "👶 ELI5: The simplification engine"] },
  { subreddit: "space", clues: ["The final frontier in digital form", "Galaxies, nebulas, and rocket launches", "🚀 Observatory for the cosmos"] },
  { subreddit: "natureisfm", clues: ["The brutal beauty of the wild", "Predators and survival on camera", "🌋 Nature's uncensored reality"] },
  { subreddit: "earthporn", clues: ["Stunning landscapes without the Snoos", "High-resolution natural beauty", "🏔️ Earth's most photogenic spots"] },
  { subreddit: "nonononoyes", clues: ["Anxiety-inducing moments with a happy ending", "Near misses and narrow escapes", "😰 Close calls caught on film"] },
  { subreddit: "dataisbeautiful", clues: ["Information transformed into art", "Charts, graphs, and visual statistics", "📊 Data visualization at its best"] },
  { subreddit: "books", clues: ["The digital library for bibliophiles", "Literary discussions and recommendations", "📚 Where stories never end"] },
  { subreddit: "food", clues: ["The internet's communal kitchen", "Recipes, food porn, and culinary experiments", "🍲 Gourmet and everyday eats"] },
  { subreddit: "travel", clues: ["Digital passport for the wanderlust-stricken", "Hidden gems and tourist traps", "✈️ Global exploration hub"] },
  { subreddit: "history", clues: ["Chronicle of humanity's past", "Ancient civilizations and recent events", "🏛️ Learning from what came before"] },
  { subreddit: "art", clues: ["Museum without walls", "Paintings, sculptures, and digital works", "🎨 Creative expression hub"] },
  { subreddit: "philosophy", clues: ["Digital agora for deep thinking", "Existence, ethics, and logic", "⚖️ Contemplating the big questions"] },
  { subreddit: "fitness", clues: ["Gym without the membership fee", "Workout routines and nutritional advice", "💪 Pursuit of the physical peak"] },
  { subreddit: "diy", clues: ["The 'do it yourself' workshop", "Home renovations and craft projects", "🔨 Building it with your own hands"] },
  { subreddit: "gadgets", clues: ["Review site for the latest tech", "Smartphones, wearables, and hardware", "📱 Tools of the modern era"] },
  { subreddit: "tifu", clues: ["Chronicles of daily disasters", "Confessions of mistakes made today", "🤦 TIFU by posting this..."] },
  { subreddit: "nosleep", clues: ["Original horror stories that feel real", "Don't read these in the dark", "👁️ Fiction that keeps you awake"] },
  { subreddit: "personalfinance", clues: ["Budgeting and investment sanctuary", "401ks, debt, and saving strategies", "💰 Mastering your money"] },
  { subreddit: "futurology", clues: ["Speculation on what lies ahead", "Post-scarcity, longevity, and automation", "🤖 Thinking about tomorrow"] },
  { subreddit: "nottheonion", clues: ["Real news that sounds like satire", "Truth is stranger than fiction", "🧅 Reality mimicking parody"] },
  { subreddit: "lifehacks", clues: ["Shortcuts for a better existence", "Efficiency tips for daily tasks", "💡 Smarter ways to live"] },
  { subreddit: "relationships", clues: ["Advice for the heart and social circle", "Navigating human connections", "❤️ Problem solving for people"] },
  { subreddit: "philosophy", clues: ["Agora for deep thinkers", "Existence and ethics", "📜 Contemplating the human condition"] },
  { subreddit: "sports", clues: ["The ultimate arena for competition", "Scores, highlights, and team news", "⚽ Every game, every league"] },
  { subreddit: "television", clues: ["The small screen's digital hub", "Streaming news and episode discussions", "📺 Binge-watching headquarters"] },
  { subreddit: "mildlyinteresting", clues: ["Things that are... okay, I guess", "Not quite mind-blowing, but enough", "🤔 Interest at a moderate level"] },
  { subreddit: "interestingasf", clues: ["Truly fascinating captures", "Higher tier of curiosity", "🤩 Mind-blowing discoveries"] },
  { subreddit: "oldpeoplereddit", clues: ["Technological confusion and wholesome posts", "Grandma's first day on the site", "👵 Typing in all caps"] },
  { subreddit: "unpopularopinion", clues: ["The controversial debate floor", "Opinions that go against the grain", "🗣️ Where agreement is rare"] },
  { subreddit: "creepy", clues: ["Eerie images and unsettling vibes", "Ghost stories and dark aesthetics", "👻 Spine-chilling content"] },
  { subreddit: "architecture", clues: ["The blueprint for building design", "Skyscrapers and historic ruins", "🏛️ Beauty in built form"] },
  { subreddit: "astronomy", clues: ["Stargazing and celestial events", "Cosmology and telescope talk", "🔭 Eyes on the night sky"] },
  { subreddit: "environment", clues: ["Climate change and conservation news", "Protecting the planet one post at a time", "🌿 Earth's defense hub"] },
  { subreddit: "legaladvice", clues: ["Crowdsourced council for law", "Navigating the justice system", "⚖️ Not a substitute for a lawyer"] },
  { subreddit: "medizine", clues: ["The digital ward for health news", "Breakthroughs and medical mysteries", "🧪 Science of the human body"] },
  { subreddit: "parenting", clues: ["Support group for the sleep-deprived", "Raising humans from diapers to dorms", "🍼 The hardest job in the world"] },
  { subreddit: "photography", clues: ["The lens-crafters community", "Exposure, composition, and gear", "📸 Mastering the frozen moment"] },
  { subreddit: "writing", clues: ["The workshop for aspiring authors", "Plot, character, and grammar", "📝 Crafting the written word"] },
  { subreddit: "psychology", clues: ["Mapping the human mind", "Behavioral studies and mental health", "🧠 Why we do what we do"] }
];

const DAILY_PUZZLES: DailyPuzzle[] = ALL_PUZZLES.slice(0, 10).map((p, i) => ({
  ...p,
  date: new Date(new Date("2026-02-01").getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}));

function streakKey(postId: string, username: string): string {
  return `streak:${postId}:${username}`;
}

function lastWinDateKey(postId: string, username: string): string {
  return `last_win_date:${postId}:${username}`;
}

function coldCasesKey(postId: string, username: string): string {
  return `cold_cases:${postId}:${username}`;
}

async function getUserStreak(postId: string, username: string): Promise<number> {
  const value = await redis.get(streakKey(postId, username));
  return value ? parseInt(value, 10) : 0;
}

async function getColdCasesSolved(postId: string, username: string): Promise<number> {
  const value = await redis.get(coldCasesKey(postId, username));
  return value ? parseInt(value, 10) : 0;
}

async function incrementColdCases(postId: string, username: string): Promise<number> {
  const key = coldCasesKey(postId, username);
  const current = await getColdCasesSolved(postId, username);
  const newValue = current + 1;
  await redis.set(key, newValue.toString());
  return newValue;
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
    const coldCases = await getColdCasesSolved(postId, username);
    const score = await redis.zScore(leaderboardKey(postId), username) || 0;
    res.json({
      type: "game_init",
      clues: puzzle.clues,
      hasPlayedToday: hasPlayed,
      attempts: attempts,
      isWinner: winner,
      streak: streak,
      coldCasesSolved: coldCases,
      answer: winner ? puzzle.subreddit : undefined,
      rank: getDetectiveRank(score),
      audioAssets: {
        rustle: "https://www.soundjay.com/misc/sounds/paper-rustle-1.mp3",
        victory: "https://www.soundjay.com/human/sounds/applause-01.mp3",
        wrong: "https://www.soundjay.com/misc/sounds/fail-trombone-01.mp3"
      }
    } as GameInitResponse);
  } catch (err) {
    res.status(500).json({ error: "Failed" });
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
    const coldCases = await getColdCasesSolved(postId, username);
    const score = await redis.zScore(leaderboardKey(postId), username) || 0;

    // Pick a random puzzle that isn't the daily one
    const dailyPuzzle = getTodaysPuzzle();
    const pool = ALL_PUZZLES.filter(p => p.subreddit !== dailyPuzzle.subreddit);
    const puzzle = pool[Math.floor(Math.random() * pool.length)]!;

    res.json({
      type: "game_init",
      clues: puzzle.clues,
      hasPlayedToday: false, // Unlimited mode
      attempts: 0,
      isWinner: false,
      streak: streak,
      coldCasesSolved: coldCases,
      rank: getDetectiveRank(score),
      audioAssets: {
        rustle: "https://www.soundjay.com/misc/sounds/paper-rustle-1.mp3",
        victory: "https://www.soundjay.com/human/sounds/applause-01.mp3",
        wrong: "https://www.soundjay.com/misc/sounds/fail-trombone-01.mp3"
      }
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

    const { guess, mode, targetSubreddit } = req.body as (GuessRequest & { mode?: 'daily' | 'unlimited', targetSubreddit?: string });
    if (!guess) {
      res.status(400).json({ error: "Invalid" });
      return;
    }

    const isUnlimited = mode === 'unlimited';
    const today = getTodayDateKey();

    // Determine the answer to check against
    let correctAnswer = "";
    if (isUnlimited) {
      correctAnswer = targetSubreddit || "";
    } else {
      const puzzle = getTodaysPuzzle();
      correctAnswer = puzzle.subreddit;
      if (await isWinner(postId, username, today)) {
        res.status(400).json({ error: "Already solved daily" });
        return;
      }
    }

    const isCorrect = guess.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    let streak = await getUserStreak(postId, username);
    let coldCasesSolved = await getColdCasesSolved(postId, username);
    let score = await redis.zScore(leaderboardKey(postId), username) || 0;
    let attempts = 0;

    if (!isUnlimited) {
      attempts = await incrementAttempts(postId, username, today);
    }

    if (isCorrect) {
      if (isUnlimited) {
        coldCasesSolved = await incrementColdCases(postId, username);
        // Cold cases still increment rank score but not streak
        score = await incrementUserScore(postId, username);
      } else {
        await markAsWinner(postId, username, today);
        streak = await updateStreak(postId, username, today);
        score = await incrementUserScore(postId, username);
      }
    }

    res.json({
      type: "guess_result",
      correct: isCorrect,
      answer: isCorrect ? correctAnswer : undefined,
      attempts: isUnlimited ? 0 : attempts, // Attempts only track for daily
      streak: streak,
      coldCasesSolved: coldCasesSolved,
      rank: isCorrect ? getDetectiveRank(score) : undefined,
      audioTrigger: isCorrect ? 'correct' : 'wrong'
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

router.post("/api/game/abandon", async (_req, res): Promise<void> => {
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

    const sKey = streakKey(postId, username);
    const dKey = lastWinDateKey(postId, username);
    await redis.set(sKey, "0");
    await redis.del(dKey);

    res.json({ success: true, streak: 0 });
  } catch (err) {
    res.status(500).json({ error: "Failed to abandon game" });
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
