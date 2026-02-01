export type InitResponse = {
  type: "init";
  postId: string;
  username: string;
};

// Snoo-Clues Game Types
export type DailyPuzzle = {
  date: string;
  subreddit: string;
  clues: [string, string, string];
};

export type GameInitResponse = {
  type: "game_init";
  clues: [string, string, string];
  hasPlayedToday: boolean;
  attempts: number;
  isWinner: boolean;
  streak: number;
  answer?: string | undefined;
  rank?: string | undefined;
};

export type GuessRequest = {
  guess: string;
};

export type GuessResponse = {
  type: "guess_result";
  correct: boolean;
  answer?: string | undefined; // Only sent if correct
  attempts: number;
  streak?: number | undefined;
  rank?: string | undefined;
};

export type ShareRequest = {
  attempts: number;
};

export type ShareResponse = {
  type: "share_result";
  success: boolean;
  commentUrl?: string | undefined;
};

export type LeaderboardEntry = {
  username: string;
  score: number;
};

export type LeaderboardResponse = {
  type: "leaderboard_data";
  leaderboard: LeaderboardEntry[];
};
