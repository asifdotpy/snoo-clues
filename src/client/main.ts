import { InitResponse } from "../shared/types/api";

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

// This is the manifest file data structure for type checking security
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
          this.progressElement.value = parseInt(m[2]) * 100;
          this.progressElement.max = parseInt(m[3]) * 100;
          this.progressElement.hidden = false;
          this.spinnerElement.hidden = false;
        } else {
          this.progressElement.value = 0;
          this.progressElement.max = 100;
          this.progressElement.hidden = true;

          if (!text) {
            this.spinnerElement.style.display = "none";
            this.canvasElement.style.display = "block";
            this.loadingElement.style.display = "none";
          }
        }
        this.statusElement.innerHTML = text;
      },
      totalDependencies: 0,
      monitorRunDependencies: (left: number) => {
        window.Module.totalDependencies = Math.max(window.Module.totalDependencies, left);
        window.Module.setStatus(
          left
            ? `Preparing... (${window.Module.totalDependencies - left}/${window.Module.totalDependencies})`
            : "All downloads complete."
        );
      },
    };

    window.Module.setStatus("Downloading...");

    window.onerror = (event) => {
      window.Module.setStatus("Exception thrown, see JavaScript console");
      this.spinnerElement.style.display = "none";
      window.Module.setStatus = (text: string) => {
        if (text) window.Module.printErr(`[post-exception status] ${text}`);
      };
    };

    if (typeof window === "object") {
      window.Module.arguments = window.location.search.substr(1).trim().split('&');
      if (!window.Module.arguments[0]) {
        window.Module.arguments = [];
      }
    }
  }

  private setupResizeObserver() {
    window.onGameSetWindowSize = (width: number, height: number) => {
      console.log(`Window size set to width: ${width}, height: ${height}`);
      this.startingHeight = height;
      this.startingWidth = width;
      this.startingAspect = this.startingWidth / this.startingHeight;
    };

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => this.ensureAspectRatio());
      setTimeout(() => window.requestAnimationFrame(() => this.ensureAspectRatio()), 100);
    });
    resizeObserver.observe(document.body);

    if (/Android|iPhone|iPod/i.test(navigator.userAgent)) {
      document.body.classList.add("scrollingDisabled");
    }
  }

  private ensureAspectRatio() {
    if (!this.canvasElement || !this.startingHeight || !this.startingWidth) {
      return;
    }

    this.canvasElement.classList.add("active");

    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight;
    let newHeight: number, newWidth: number;

    const heightQuotient = this.startingHeight / maxHeight;
    const widthQuotient = this.startingWidth / maxWidth;

    if (heightQuotient > widthQuotient) {
      newHeight = maxHeight;
      newWidth = newHeight * this.startingAspect!;
    } else {
      newWidth = maxWidth;
      newHeight = newWidth / this.startingAspect!;
    }

    this.canvasElement.style.height = "100%" //`${newHeight}px`;
    this.canvasElement.style.width = "100%" //`${newWidth}px`;
  }

  private async loadRunnerManifest(): Promise<void> {
    try {
      const res = await fetch("/runner.json", {
        credentials: "include",      // keep Devvit context; same-origin
        cache: "no-cache"            // avoid stale manifest after deploys
      });
      if (!res.ok) throw new Error(`runner.json HTTP ${res.status}`);
      const manifest = (await res.json()) as RunnerManifest;

      // Basic validation
      if (!Array.isArray(manifest.manifestFiles) || !Array.isArray(manifest.manifestFilesMD5)) {
        throw new Error("runner.json missing arrays");
      }
      if (manifest.manifestFiles.length !== manifest.manifestFilesMD5.length) {
        console.warn("[runner.json] manifestFiles and manifestFilesMD5 length mismatch");
      }

      // Wire the global getters from the manifest
      window.manifestFiles = () => manifest.manifestFiles.join(";");
      window.manifestFilesMD5 = () => manifest.manifestFilesMD5.slice(); // return a copy

    } catch (e) {
      console.warn("Falling back to hardcoded manifest (runner.json not available):", e);

      // Fallback to current hardcoded values (this should never happen)
      window.manifestFiles = () =>
        [
          "runner.data",
          "runner.js",
          "runner.wasm",
          "audio-worklet.js",
          "game.unx"
        ].join(";");

      window.manifestFilesMD5 = () =>
        [
          "585214623b669175a702fed30de7d21d",
          "8669aa66d44cfb4f13a098cd6b0296e1",
          "d29ac123833b56dcfbe188f10e5ecb85",
          "e8f1e8db8cf996f8715a6f2164c2e44e",
          "00a26996df3ce310bb5836ef7f4b0e3c"
        ];
    }
  }

  private setupGameMakerGlobals() {

    // GameMaker async method support - make variables globally accessible
    window.g_pAddAsyncMethod = -1;
    window.setAddAsyncMethod = (asyncMethod: any) => {
      window.g_pAddAsyncMethod = asyncMethod;
      console.log("setAddAsyncMethod called with:", asyncMethod);
    };

    // Exception handling - make variables globally accessible
    window.g_pJSExceptionHandler = undefined;
    window.setJSExceptionHandler = (exceptionHandler: any) => {
      if (typeof exceptionHandler === "function") {
        window.g_pJSExceptionHandler = exceptionHandler;
      }
    };

    window.hasJSExceptionHandler = () => {
      return window.g_pJSExceptionHandler !== undefined && typeof window.g_pJSExceptionHandler === "function";
    };

    window.doJSExceptionHandler = (exceptionJSON: string) => {
      if (typeof window.g_pJSExceptionHandler === "function") {
        const exception = JSON.parse(exceptionJSON);
        window.g_pJSExceptionHandler(exception);
      }
    };

    // WAD/Resource loading - make variables globally accessible
    window.g_pWadLoadCallback = undefined;
    window.setWadLoadCallback = (wadLoadCallback: any) => {
      window.g_pWadLoadCallback = wadLoadCallback;
    };

    window.onFirstFrameRendered = () => {
      console.log("First frame rendered!");
    };

    // Ad system stubs
    window.triggerAd = (adId: string, ...callbacks: any[]) => {
      console.log("triggerAd called with adId:", adId);
      // For now, just call the callbacks to simulate ad completion
      if (callbacks.length > 0 && typeof callbacks[0] === 'function') {
        setTimeout(() => callbacks[0](), 100);
      }
    };

    window.triggerPayment = (itemId: string, callback: any) => {
      console.log("triggerPayment called with itemId:", itemId);
      // Simulate payment completion
      if (typeof callback === 'function') {
        setTimeout(() => callback({ id: itemId }), 1000);
      }
    };

    // UI utility functions
    window.toggleElement = (id: string) => {
      const elem = document.getElementById(id);
      if (elem) {
        elem.style.display = elem.style.display === 'block' ? 'none' : 'block';
      }
    };

    // Multiplayer/networking stubs
    let acceptable_rollback_frames = 0;
    window.set_acceptable_rollback = (frames: number) => {
      acceptable_rollback_frames = frames;
      console.log("Set acceptable rollback frames:", frames);
    };

    window.report_stats = (statsData: any) => {
      console.log("Game stats reported:", statsData);
    };

    window.log_next_game_state = () => {
      console.log("Game state logging requested");
    };

    window.wallpaper_update_config = (config: string) => {
      console.log("Wallpaper config update:", config);
    };

    window.wallpaper_reset_config = () => {
      console.log("Wallpaper config reset");
    };

    // Mock accelerometer API to prevent permissions policy violations
    if (!('DeviceMotionEvent' in window)) {
      (window as any).DeviceMotionEvent = class MockDeviceMotionEvent extends Event {
        constructor(type: string, eventInitDict?: any) {
          super(type, eventInitDict);
        }
      };
    }

    if (!('DeviceOrientationEvent' in window)) {
      (window as any).DeviceOrientationEvent = class MockDeviceOrientationEvent extends Event {
        constructor(type: string, eventInitDict?: any) {
          super(type, eventInitDict);
        }
      };
    }
  }

  private async loadGame() {
    try {
      // First try to get initial data from the server
      await this.fetchInitialData();

      // Load manifest data that GameMaker runtime expects
      await this.loadRunnerManifest();

      // Setup required global functions before loading GameMaker script
      this.setupGameMakerGlobals();

      // Load the GameMaker runner script
      const script = document.createElement('script');
      script.src = '/runner.js';
      script.async = true;
      script.type = 'text/javascript';

      script.onload = () => {
        console.log('Game script loaded successfully');
      };

      script.onerror = (error) => {
        console.error('Failed to load game script:', error);
        this.statusElement.textContent = 'Failed to load game';
      };

      document.head.appendChild(script);
    } catch (error) {
      console.error('Error loading game:', error);
      this.statusElement.textContent = 'Error loading game';
    }
  }

  private async fetchInitialData() {
    try {
      const response = await fetch("/api/init");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = (await response.json()) as InitResponse;
      if (data.type === "init") {
        console.log(`Game initialized for user: ${data.username}, post: ${data.postId}`);
      } else {
        console.error("Invalid response type from /api/init", data);
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  }
}

// ##########################################################################
// # SNOO-CLUES GAME CONTROLLER
// ##########################################################################

import { GameInitResponse, GuessResponse, ShareResponse } from "../shared/types/api";

class SnooCluesGame {
  private clues: [string, string, string] = ["", "", ""];
  private attempts: number = 0;
  private isWinner: boolean = false;
  private hasPlayed: boolean = false;
  private streak: number = 0;

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
  private leaderboardList!: HTMLElement;
  private shareBtn!: HTMLButtonElement;
  private closeWinModalBtn!: HTMLButtonElement;
  private closePlayedModalBtn!: HTMLButtonElement;

  constructor() {
    this.initDOMElements();
    this.attachEventListeners();
    this.initGame();
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
    this.winAttempts = document.getElementById("winAttempts")!;
    this.playedAttemptsCount = document.getElementById('played-attempts-count')!;
    this.playedStreakVal = document.getElementById('played-streak-val')!;
    this.streakValue = document.getElementById('streak-value')!;
    this.winStreakVal = document.getElementById('win-streak-val')!;
    this.leaderboardList = document.getElementById('leaderboardList')!;
    this.shareBtn = document.getElementById("shareBtn") as HTMLButtonElement;
    this.closeWinModalBtn = document.getElementById("closeWinModal") as HTMLButtonElement;
    this.closePlayedModalBtn = document.getElementById("closePlayedModal") as HTMLButtonElement;
  }

  private attachEventListeners(): void {
    // Clue reveal buttons
    this.revealClue2Btn.addEventListener("click", () => this.revealClue(2));
    this.revealClue3Btn.addEventListener("click", () => this.revealClue(3));

    // Guess submission
    this.submitBtn.addEventListener("click", () => this.submitGuess());
    this.guessInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.submitGuess();
    });

    // Auto-lowercase input
    this.guessInput.addEventListener("input", () => {
      this.guessInput.value = this.guessInput.value.toLowerCase();
    });

    // Modal controls
    this.shareBtn.addEventListener("click", () => this.shareResult());
    this.closeWinModalBtn.addEventListener("click", () => this.closeModal("win"));
    this.closePlayedModalBtn.addEventListener("click", () => this.closeModal("played"));
  }

  private async initGame(): Promise<void> {
    try {
      const response = await fetch("/api/game/init");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as GameInitResponse;

      this.clues = data.clues;
      this.attempts = data.attempts;
      this.hasPlayed = data.hasPlayedToday;
      this.isWinner = data.isWinner;
      this.streak = data.streak; // Initialize streak

      // Display first clue
      this.clue1Text.textContent = this.clues[0];
      this.clue2Text.textContent = this.clues[1];
      this.clue3Text.textContent = this.clues[2];

      // Update attempts counter
      this.attemptsCount.textContent = this.attempts.toString();
      this.streakValue.textContent = this.streak.toString(); // Update streak display

      // If already played, show modal
      if (this.hasPlayed) {
        this.playedAttemptsCount.textContent = this.attempts.toString();
        this.playedStreakVal.textContent = this.streak.toString();
        this.answerText.textContent = data.answer || "???"; // Display answer if available
        this.showModal("played");
        this.disableInput();
      }
    } catch (error) {
      console.error("Error initializing game:", error);
      this.showFeedback("Failed to load game. Please refresh.", "error");
    }
  }

  private revealClue(clueNumber: 2 | 3): void {
    if (clueNumber === 2) {
      this.clue2Card.classList.remove("locked");
      this.clue2Card.classList.add("visible");
      this.clue2Text.classList.remove("hidden");
      this.revealClue2Btn.style.display = "none";
    } else {
      this.clue3Card.classList.remove("locked");
      this.clue3Card.classList.add("visible");
      this.clue3Text.classList.remove("hidden");
      this.revealClue3Btn.style.display = "none";
    }
  }

  private async submitGuess(): Promise<void> {
    const guess = this.guessInput.value.trim();

    if (!guess) {
      this.showFeedback("Please enter a subreddit name", "error");
      return;
    }

    // Disable input during submission
    this.submitBtn.disabled = true;
    this.guessInput.disabled = true;

    try {
      const response = await fetch("/api/game/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as GuessResponse;

      // Update attempts
      this.attempts = data.attempts;
      this.attemptsCount.textContent = this.attempts.toString();
      this.streak = data.streak ?? this.streak; // Update streak if provided
      this.streakValue.textContent = this.streak.toString(); // Update streak display

      if (data.correct) {
        // Win!
        this.isWinner = true;
        this.answerText.textContent = data.answer || guess;
        this.winAttempts.textContent = this.attempts.toString();
        this.winStreakVal.textContent = this.streak.toString(); // Update win streak display
        this.showFeedback("🎉 Correct! You solved it!", "success");
        this.showModal("win");
        this.disableInput();
        this.fetchLeaderboard(); // Update leaderboard after win
      } else {
        // Incorrect guess
        this.showFeedback("❌ Not quite! Try again.", "error");
        this.guessInput.value = "";
        this.guessInput.focus();

        // Re-enable input
        this.submitBtn.disabled = false;
        this.guessInput.disabled = false;
      }
    } catch (error) {
      console.error("Error submitting guess:", error);
      this.showFeedback(
        error instanceof Error ? error.message : "Failed to submit guess",
        "error"
      );

      // Re-enable input on error
      this.submitBtn.disabled = false;
      this.guessInput.disabled = false;
    }
  }

  private async shareResult(): Promise<void> {
    this.shareBtn.disabled = true;
    this.shareBtn.textContent = "Sharing...";

    try {
      const response = await fetch("/api/game/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempts: this.attempts }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as ShareResponse;

      if (data.success) {
        this.shareBtn.textContent = "✅ Shared!";
        setTimeout(() => {
          this.shareBtn.textContent = "📢 Share to Reddit";
          this.shareBtn.disabled = false;
        }, 3000);
      }
    } catch (error) {
      console.error("Error sharing result:", error);
      this.shareBtn.textContent = "❌ Failed";
      setTimeout(() => {
        this.shareBtn.textContent = "📢 Share to Reddit";
        this.shareBtn.disabled = false;
      }, 3000);
    }
  }

  private showFeedback(message: string, type: "success" | "error"): void {
    this.feedbackMessage.textContent = message;
    this.feedbackMessage.className = `feedback-message ${type}`;
  }

  private async fetchLeaderboard(): Promise<void> {
    try {
      const response = await fetch("/api/game/leaderboard");
      if (!response.ok) throw new Error("Failed to fetch leaderboard");

      const data = (await response.json()) as LeaderboardResponse;
      this.renderLeaderboard(data.leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      this.leaderboardList.innerHTML = '<div class="leaderboard-item error">Failed to load rankings</div>';
    }
  }

  private renderLeaderboard(entries: LeaderboardEntry[]): void {
    if (entries.length === 0) {
      this.leaderboardList.innerHTML = '<div class="leaderboard-item">No investigations solved yet.</div>';
      return;
    }

    this.leaderboardList.innerHTML = entries
      .map((entry, index) => `
        <div class="leaderboard-item">
          <span class="leaderboard-rank">#${index + 1}</span>
          <span class="leaderboard-name">${entry.username}</span>
          <span class="leaderboard-score">${entry.score} pts</span>
        </div>
      `)
      .join("");
  }

  private showModal(type: "win" | "played"): void {
    if (type === "win") {
      this.winModal.classList.remove("hidden");
    } else {
      this.playedModal.classList.remove("hidden");
    }
  }

  private closeModal(type: "win" | "played"): void {
    if (type === "win") {
      this.winModal.classList.add("hidden");
    } else {
      this.playedModal.classList.add("hidden");
    }
  }

  private disableInput(): void {
    this.guessInput.disabled = true;
    this.submitBtn.disabled = true;
  }
}

// Initialize both systems when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new GameLoader();       // Initialize GameMaker engine
    new SnooCluesGame();    // Initialize game overlay
  });
} else {
  new GameLoader();
  new SnooCluesGame();
}
