import {
  GameInitResponse,
  GuessResponse,
  ShareResponse,
  LeaderboardEntry,
  LeaderboardResponse
} from "../shared/types/api";

declare global {
  interface Window {
    Module: any;
    GM_tick?: (time: number) => void;
    onGameSetWindowSize?: (width: number, height: number) => void;
    manifestFiles?: () => string;
    manifestFilesMD5?: () => string[];
    log_next_game_state?: () => void;
    wallpaper_update_config?: (config: string) => void;
    wallpaper_reset_config?: () => void;
    setAddAsyncMethod?: (method: any) => void;
    setJSExceptionHandler?: (handler: any) => void;
    hasJSExceptionHandler?: () => boolean;
    doJSExceptionHandler?: (exceptionJSON: string) => void;
    setWadLoadCallback?: (callback: any) => void;
    onFirstFrameRendered?: () => void;
    triggerAd?: (adId: string, ...callbacks: any[]) => void;
    triggerPayment?: (itemId: string, callback: any) => void;
    toggleElement?: (id: string) => void;
    set_acceptable_rollback?: (frames: number) => void;
    report_stats?: (statsData: any) => void;
    g_pAddAsyncMethod?: any;
    g_pJSExceptionHandler?: any;
    g_pWadLoadCallback?: any;
  }
}

// Manifest structure
type RunnerManifest = {
  manifestFiles: string[];
  manifestFilesMD5: string[];
  mainJS?: string;
  unx?: string;
  index?: string;
  runner?: { version?: string; yyc?: boolean };
};

class GameLoader {
  private statusElement: HTMLElement;
  private progressElement: HTMLProgressElement;
  private spinnerElement: HTMLElement;
  private canvasElement: HTMLCanvasElement;
  private loadingElement: HTMLElement;
  private startingHeight?: number;
  private startingWidth?: number;
  private startingAspect?: number;

  constructor() {
    this.statusElement = document.getElementById("status") as HTMLElement;
    this.progressElement = document.getElementById("progress") as HTMLProgressElement;
    this.spinnerElement = document.getElementById("spinner") as HTMLElement;
    this.canvasElement = document.getElementById("canvas") as HTMLCanvasElement;
    this.loadingElement = document.getElementById("loading") as HTMLElement;

    this.canvasElement.addEventListener("click", () => {
      this.canvasElement.focus();
    });

    this.setupModule();
    this.setupResizeObserver();
    this.loadGame();
  }

  private setupModule() {
    window.Module = {
      preRun: [],
      postRun: [],
      print: (text: string) => {
        console.log(text);
        if (text === "Entering main loop.") {
          this.ensureAspectRatio();
        }
      },
      printErr: (text: string) => {
        console.error(text);
      },
      canvas: this.canvasElement,
      setStatus: (text: string) => {
        if (!window.Module.setStatus.last) {
          window.Module.setStatus.last = { time: Date.now(), text: "" };
        }
        if (text === window.Module.setStatus.last.text) return;

        const m = text.match(/([^(]+)\((\d+(?:\.\d+)?)\/(\d+)\)/);
        const now = Date.now();
        if (m && now - window.Module.setStatus.last.time < 30) return;

        window.Module.setStatus.last.time = now;
        window.Module.setStatus.last.text = text;

        if (m) {
          const val = parseInt(m[2]) * 100;
          const max = parseInt(m[3]) * 100;
          this.progressElement.value = val;
          this.progressElement.max = max;
          this.progressElement.hidden = false;
          this.spinnerElement.hidden = false;
        } else {
          this.progressElement.value = 0;
          this.progressElement.max = 0;
          this.progressElement.hidden = true;
          if (!text) this.spinnerElement.hidden = true;
        }
        this.statusElement.innerHTML = text;
      }
    };
    window.Module.setStatus("Downloading...");
  }

  private ensureAspectRatio() {
    if (this.startingAspect) {
      this.statusElement.hidden = true;
      this.progressElement.hidden = true;
      this.spinnerElement.hidden = true;
      this.loadingElement.style.display = "none";
    }
  }

  private setupResizeObserver() {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (!this.startingWidth) {
          this.startingWidth = width;
          this.startingHeight = height;
          this.startingAspect = width / height;
        }
      }
    });
    observer.observe(this.canvasElement);
  }

  private async loadGame() {
    try {
      if (window.manifestFiles && window.manifestFilesMD5) {
        const manifest: RunnerManifest = {
          manifestFiles: window.manifestFiles().split(","),
          manifestFilesMD5: window.manifestFilesMD5(),
        };
        console.log("Loading game with manifest:", manifest);
      }
    } catch (e) {
      console.error("Failed to load manifest:", e);
    }
  }
}

// ##########################################################################
// # SNOO-CLUES GAME CONTROLLER
// ##########################################################################

class SnooCluesGame {
  private clues: [string, string, string] = ["", "", ""];
  private attempts: number = 0;
  private isWinner: boolean = false;
  private hasPlayed: boolean = false;
  private streak: number = 0;
  private coldCasesSolved: number = 0;
  private currentGameMode: 'daily' | 'unlimited' | null = null;
  private targetSubreddit: string = "";

  // DOM Elements
  private clue1Text!: HTMLElement;
  private clue2Text!: HTMLElement;
  private clue3Text!: HTMLElement;
  private clue2Card!: HTMLElement;
  private clue3Card!: HTMLElement;
  private revealClue2Btn!: HTMLButtonElement;
  private revealClue3Btn!: HTMLButtonElement;
  private guessInput!: HTMLInputElement;
  private submitBtn!: HTMLButtonElement;
  private attemptsCount!: HTMLElement;
  private feedbackMessage!: HTMLElement;
  private winModal!: HTMLElement;
  private playedModal!: HTMLElement;
  private answerText!: HTMLElement;
  private winAttempts!: HTMLElement;
  private playedAttemptsCount!: HTMLElement;
  private playedStreakVal!: HTMLElement;
  private streakValue!: HTMLElement;
  private winStreakVal!: HTMLElement;
  private rankValue!: HTMLElement;
  private winRankName!: HTMLElement;
  private caseClosedStamp!: HTMLElement;
  private leaderboardList!: HTMLElement;
  private shareBtn!: HTMLButtonElement;
  private closeWinModalBtn!: HTMLButtonElement;
  private closePlayedModalBtn!: HTMLButtonElement;
  private selectionModal!: HTMLElement;
  private startDailyBtn!: HTMLButtonElement;
  private startColdBtn!: HTMLButtonElement;
  private keepTrainingBtn!: HTMLButtonElement;
  private gameContainer!: HTMLElement;
  private gameSubtitle!: HTMLElement;
  private coldCasesSolvedVal!: HTMLElement;

  constructor() {
    this.initDOMElements();
    this.attachEventListeners();
    this.showSelectionHub();
    this.fetchLeaderboard();
  }

  private initDOMElements(): void {
    this.clue1Text = document.getElementById("clue1Text")!;
    this.clue2Text = document.getElementById("clue2Text")!;
    this.clue3Text = document.getElementById("clue3Text")!;
    this.clue2Card = document.getElementById("clue2Card")!;
    this.clue3Card = document.getElementById("clue3Card")!;
    this.revealClue2Btn = document.getElementById("revealClue2") as HTMLButtonElement;
    this.revealClue3Btn = document.getElementById("revealClue3") as HTMLButtonElement;
    this.guessInput = document.getElementById("guessInput") as HTMLInputElement;
    this.submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;
    this.attemptsCount = document.getElementById("attemptsCount")!;
    this.feedbackMessage = document.getElementById("feedbackMessage")!;
    this.winModal = document.getElementById("winModal")!;
    this.playedModal = document.getElementById("playedModal")!;
    this.answerText = document.getElementById("answerText")!;
    this.winAttempts = document.getElementById("win-attempts-count")!;
    this.playedAttemptsCount = document.getElementById('played-attempts-count')!;
    this.playedStreakVal = document.getElementById('played-streak-val')!;
    this.streakValue = document.getElementById('streak-value')!;
    this.winStreakVal = document.getElementById('win-streak-val')!;
    this.rankValue = document.getElementById('rank-value')!;
    this.winRankName = document.getElementById('win-rank-name')!;
    this.caseClosedStamp = document.getElementById('case-closed-stamp')!;
    this.leaderboardList = document.getElementById('leaderboardList')!;
    this.shareBtn = document.getElementById("share-btn") as HTMLButtonElement;
    this.selectionModal = document.getElementById("selectionModal")!;
    this.startDailyBtn = document.getElementById("startDailyBtn") as HTMLButtonElement;
    this.startColdBtn = document.getElementById("startColdBtn") as HTMLButtonElement;
    this.keepTrainingBtn = document.getElementById("keep-training-btn") as HTMLButtonElement;
    this.gameContainer = document.querySelector(".game-container")!;
    this.gameSubtitle = document.querySelector(".game-subtitle")!;
    this.closeWinModalBtn = this.winModal.querySelector(".close-modal-btn") as HTMLButtonElement;
    this.closePlayedModalBtn = this.playedModal.querySelector(".close-modal-btn") as HTMLButtonElement;
  }

  private attachEventListeners(): void {
    this.revealClue2Btn.addEventListener("click", () => this.revealClue(2));
    this.revealClue3Btn.addEventListener("click", () => this.revealClue(3));
    this.submitBtn.addEventListener("click", () => this.submitGuess());
    this.guessInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.submitGuess();
    });
    this.guessInput.addEventListener("input", () => {
      this.guessInput.value = this.guessInput.value.toLowerCase();
    });
    this.shareBtn.addEventListener("click", () => this.shareResult());
    this.closeWinModalBtn.addEventListener("click", () => this.closeModal("win"));
    this.closePlayedModalBtn.addEventListener("click", () => this.closeModal("played"));

    this.startDailyBtn.addEventListener("click", () => this.initGame('daily'));
    this.startColdBtn.addEventListener("click", () => this.initGame('unlimited'));
    this.keepTrainingBtn.addEventListener("click", () => {
      this.closeModal("win");
      this.initGame('unlimited');
    });
  }

  private showSelectionHub(): void {
    this.selectionModal.classList.remove("hidden");
  }

  private hideSelectionHub(): void {
    this.selectionModal.classList.add("hidden");
  }

  private async initGame(mode: 'daily' | 'unlimited'): Promise<void> {
    this.currentGameMode = mode;
    this.hideSelectionHub();

    // Reset UI state for new game
    this.isWinner = false;
    this.submitBtn.disabled = false;
    this.guessInput.disabled = false;
    this.guessInput.value = "";
    this.caseClosedStamp.classList.add('hidden');
    this.caseClosedStamp.classList.remove('stamped');
    this.feedbackMessage.textContent = "";

    // Toggle aesthetics
    if (mode === 'unlimited') {
      this.gameContainer.classList.add('cold-case');
      this.gameSubtitle.textContent = "Cold Case Investigation (Practice)";
    } else {
      this.gameContainer.classList.remove('cold-case');
      this.gameSubtitle.textContent = "The Daily Subreddit Investigation";
    }

    try {
      const endpoint = mode === 'daily' ? "/api/game/init" : "/api/game/random";
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Init failed");

      const data = (await response.json()) as GameInitResponse;
      this.clues = data.clues;
      this.attempts = data.attempts;
      this.hasPlayed = data.hasPlayedToday;
      this.isWinner = data.isWinner;
      this.streak = data.streak;
      this.coldCasesSolved = data.coldCasesSolved;

      // If unlimited, the "answer" is stored in targetSubreddit to check locally or on server
      // But we'll let the server handle validation for security
      // The random endpoint doesn't send the answer, only clues.

      this.updateGameUI();

      if (this.hasPlayed && mode === 'daily') {
        this.playedAttemptsCount.textContent = this.attempts.toString();
        this.playedStreakVal.textContent = this.streak.toString();
        const playedAnswer = document.getElementById('played-answer');
        if (playedAnswer) playedAnswer.textContent = `r/${data.answer || "???"}`;
        this.showModal("played");
        this.disableInput();
      }
    } catch (error) {
      console.error(error);
    }
  }

  private updateGameUI(): void {
    this.clue1Text.textContent = this.clues[0];
    this.clue2Text.textContent = this.clues[1];
    this.clue3Text.textContent = this.clues[2];
    this.attemptsCount.textContent = this.attempts.toString();
    this.streakValue.textContent = this.streak.toString();

    // Reset cards
    [this.clue2Card, this.clue3Card].forEach(c => {
      c.classList.add("locked");
      c.classList.remove("visible");
    });
    [this.clue2Text, this.clue3Text].forEach(t => t.classList.add("hidden"));
    [this.revealClue2Btn, this.revealClue3Btn].forEach(b => b.style.display = "block");
  }

  private revealClue(n: 2 | 3): void {
    const card = n === 2 ? this.clue2Card : this.clue3Card;
    const text = n === 2 ? this.clue2Text : this.clue3Text;
    const btn = n === 2 ? this.revealClue2Btn : this.revealClue3Btn;
    card.classList.remove("locked");
    card.classList.add("visible");
    text.classList.remove("hidden");
    btn.style.display = "none";
  }

  private async submitGuess(): Promise<void> {
    const guess = this.guessInput.value.trim();
    if (!guess) return;
    this.submitBtn.disabled = true;
    this.guessInput.disabled = true;

    try {
      const response = await fetch("/api/game/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guess,
          mode: this.currentGameMode
        }),
      });
      const data = (await response.json()) as GuessResponse;
      this.attempts = data.attempts;
      this.attemptsCount.textContent = this.attempts.toString();
      this.streak = data.streak ?? this.streak;
      this.streakValue.textContent = this.streak.toString();
      this.coldCasesSolved = data.coldCasesSolved ?? this.coldCasesSolved;

      if (data.correct) {
        this.isWinner = true;
        this.answerText.textContent = `r/${data.answer ?? guess}`;
        this.winAttempts.textContent = this.attempts.toString();
        this.winStreakVal.textContent = this.streak.toString();

        // Update rank if returned
        if (data.rank) {
          this.rankValue.textContent = data.rank;
          this.winRankName.textContent = data.rank.split(' ')[0] ?? "Detective";
        }

        this.showModal("win");
        setTimeout(() => {
          this.caseClosedStamp.classList.remove('hidden');
          this.caseClosedStamp.classList.add('stamped');
        }, 500);
        this.disableInput();
        this.fetchLeaderboard();
      } else {
        this.showFeedback("❌ Incorrect", "error");
        this.guessInput.value = "";
        this.guessInput.focus();
        this.submitBtn.disabled = false;
        this.guessInput.disabled = false;
      }
    } catch (error) {
      console.error(error);
      this.submitBtn.disabled = false;
      this.guessInput.disabled = false;
    }
  }

  private async shareResult(): Promise<void> {
    try {
      const response = await fetch("/api/game/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempts: this.attempts }),
      });
      const data = (await response.json()) as ShareResponse;
      if (data.success) {
        this.shareBtn.textContent = "✅ Shared!";
      }
    } catch (error) {
      console.error(error);
    }
  }

  private showFeedback(m: string, t: "success" | "error"): void {
    this.feedbackMessage.textContent = m;
    this.feedbackMessage.className = `feedback-message ${t}`;
  }

  private async fetchLeaderboard(): Promise<void> {
    try {
      const response = await fetch("/api/game/leaderboard");
      const data = (await response.json()) as LeaderboardResponse;
      this.renderLeaderboard(data.leaderboard);
    } catch (error) {
      console.error(error);
    }
  }

  private renderLeaderboard(entries: LeaderboardEntry[]): void {
    this.leaderboardList.innerHTML = entries
      .map((e, i) => `
        <div class="leaderboard-item">
          <span class="leaderboard-rank">#${i + 1}</span>
          <span class="leaderboard-name">${e.username}</span>
          <span class="leaderboard-score">${e.score} pts</span>
        </div>
      `)
      .join("");
  }

  private showModal(t: "win" | "played"): void {
    (t === "win" ? this.winModal : this.playedModal).classList.remove("hidden");
  }

  private closeModal(t: "win" | "played"): void {
    (t === "win" ? this.winModal : this.playedModal).classList.add("hidden");
  }

  private disableInput(): void {
    this.guessInput.disabled = true;
    this.submitBtn.disabled = true;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GameLoader();
  new SnooCluesGame();
});
