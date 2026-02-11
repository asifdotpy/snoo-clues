export type InitResponse = {
  type: "init";
  postId: string;
  username: string;
};

// Snoo-Clues Game Types
export type DailyPuzzle = {
  date: string;
  subreddit: string;
  evidence: [string, string, string];
};

export type GameInitResponse = {
  type: "game_init";
  username: string;
  evidence: [string, string, string];
  hasPlayedToday: boolean;
  attempts: number;
  isWinner: boolean;
  streak: number;
  archivesSolved: number;
  category?: string | undefined;
  answer?: string | undefined;
  rank?: string | undefined;
  audioAssets?: {
    rustle: string;
    victory: string;
    wrong: string;
  };
};

export type GuessRequest = {
  guess: string;
  mode: 'daily' | 'archives' | 'community';
};

export type GuessResponse = {
  type: "guess_result";
  correct: boolean;
  answer?: string | undefined; // Only sent if correct
  attempts: number;
  streak?: number | undefined;
  archivesSolved?: number | undefined;
  rank?: string | undefined;
  audioTrigger?: 'correct' | 'wrong';
};

export type ShareRequest = {
  attempts: number;
  evidenceFound: number;
  mode: 'daily' | 'archives' | 'community';
};

export type ShareResponse = {
  type: "share_result";
  success: boolean;
  commentUrl?: string | undefined;
};

export type AbandonResponse = {
  success: boolean;
  streak: number;
};

export type LeaderboardEntry = {
  username: string;
  score: number;
};

export type LeaderboardResponse = {
  type: "leaderboard_data";
  leaderboard: LeaderboardEntry[];
};

export type CommunitySubmissionRequest = {
  subreddit: string;
  evidence: [string, string, string];
};

export type CommunitySubmissionResponse = {
  success: boolean;
  message: string;
};
