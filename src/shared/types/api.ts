export interface DailyPuzzle {
  date: string;
  subreddit: string;
  clues: [string, string, string];
  category: string;
}

export interface Choice {
  name: string;
  color: string;
}

export interface GameInitResponse {
  type: "game_init";
  clues: [string, string, string];
  hasPlayedToday: boolean;
  attempts: number;
  isWinner: boolean;
  streak: number;
  totalWins: number;
  choices: Choice[];
  rank: string;
  answer?: string;
  audioAssets?: {
    rustle: string;
    victory: string;
    wrong: string;
  };
}

export interface GuessRequest {
  guess: string;
}

export interface GuessResponse {
  type: "guess_result";
  correct: boolean;
  answer?: string;
  attempts: number;
  streak: number;
  totalWins: number;
  rank: string;
  audioTrigger?: 'correct' | 'wrong';
}

export interface ShareRequest {
  attempts: number;
  text?: string;
}

export interface ShareResponse {
  type: "share_result";
  success: boolean;
  commentUrl?: string;
}

export interface LeaderboardEntry {
  username: string;
  score: number;
}

export interface LeaderboardResponse {
  type: "leaderboard_data";
  leaderboard: LeaderboardEntry[];
}
