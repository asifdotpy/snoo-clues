import {
  GameInitResponse,
  GuessResponse,
  ShareResponse
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
    dispatchMascotAction?: (actionType: string) => void;
  }
}

declare function gmCallback_mascot_react(actionType: string): void;

// ##########################################################################
// # GAMEMAKER LOADER
// ##########################################################################

class GameLoader {
  private canvasElement: HTMLCanvasElement;

  constructor() {
    this.canvasElement = document.getElementById("canvas") as HTMLCanvasElement;
    this.setupModule();
    this.loadGame();
  }

  private setupModule() {
    window.Module = {
      preRun: [],
      postRun: [],
      print: (text: string) => console.log(text),
      printErr: (text: string) => console.error(text),
      canvas: this.canvasElement,
      setStatus: (text: string) => console.log(`[GameMaker] ${text}`)
    };
  }

  private async loadGame() {
    // GameMaker assets are loaded via the script tag in index.html
    console.log("GameMaker engine initialized.");
  }
}

// ##########################################################################
// # SNOO-CLUES GAME CONTROLLER (STABLE BUILD)
// ##########################################################################

class SnooCluesGame {
  private currentMode: 'daily' | 'unlimited' = 'daily';
  private clues: [string, string, string] = ["", "", ""];
  private attempts: number = 0;
  private isWinner: boolean = false;
  private streak: number = 0;
  private totalWins: number = 0;
  private rank: string = "Snoo Rookie";

  // DOM Elements
  private streakValRef!: HTMLElement;
  private rankValRef!: HTMLElement;
  private clueTexts: [HTMLElement, HTMLElement, HTMLElement] = [null!, null!, null!];
  private clueCards: [HTMLElement, HTMLElement, HTMLElement] = [null!, null!, null!];
  private optionsGrid!: HTMLElement;
  private statusMsg!: HTMLElement;
  private modal!: HTMLElement;
  private mAttempts!: HTMLElement;
  private mStreak!: HTMLElement;
  private shareBtn!: HTMLButtonElement;
  private modeDailyBtn!: HTMLElement;
  private modeUnlimitedBtn!: HTMLElement;

  constructor() {
    this.initDOMElements();
    this.attachEventListeners();
    this.setupHybridBridge();
    this.initGame('daily');
  }

  private initDOMElements() {
    this.streakValRef = document.getElementById("streak-val")!;
    this.rankValRef = document.getElementById("rank-val")!;
    this.clueTexts = [
      document.getElementById("clue1-text")!,
      document.getElementById("clue2-text")!,
      document.getElementById("clue3-text")!
    ];
    this.clueCards = [
      document.getElementById("clue-1")!,
      document.getElementById("clue-2")!,
      document.getElementById("clue-3")!
    ];
    this.optionsGrid = document.getElementById("options-grid")!;
    this.statusMsg = document.getElementById("status-msg")!;
    this.modal = document.getElementById("result-modal")!;
    this.mAttempts = document.getElementById("m-attempts")!;
    this.mStreak = document.getElementById("m-streak")!;
    this.shareBtn = document.getElementById("share-btn") as HTMLButtonElement;
    this.modeDailyBtn = document.getElementById("mode-daily")!;
    this.modeUnlimitedBtn = document.getElementById("mode-unlimited")!;
  }

  private setupHybridBridge() {
    window.dispatchMascotAction = (actionType: string) => {
      console.log(`Mascot Action: ${actionType}`);
      if (typeof gmCallback_mascot_react === 'function') {
        gmCallback_mascot_react(actionType);
      }
    };
  }

  private attachEventListeners() {
    document.querySelectorAll(".reveal-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const n = parseInt((e.target as HTMLElement).dataset.clue || "1");
        this.revealClue(n);
      });
    });

    this.modeDailyBtn.addEventListener("click", () => this.initGame('daily'));
    this.modeUnlimitedBtn.addEventListener("click", () => this.initGame('unlimited'));
    this.shareBtn.addEventListener("click", () => this.shareResult());
    document.getElementById("close-modal")?.addEventListener("click", () => {
      this.modal.classList.add("hidden");
      if (this.currentMode === 'unlimited') this.initGame('unlimited');
    });
  }

  private async initGame(mode: 'daily' | 'unlimited') {
    this.currentMode = mode;
    this.isWinner = false;
    this.attempts = 0;
    this.updateModeUI();
    this.statusMsg.textContent = `Establishing link to ${mode === 'daily' ? 'Daily Signal' : 'Cold Case Archives'}...`;

    try {
      const endpoint = mode === 'daily' ? "/api/game/init" : "/api/game/random";
      const response = await fetch(endpoint);
      const data = (await response.json()) as GameInitResponse;

      this.clues = data.clues;
      this.streak = data.streak;
      this.totalWins = data.totalWins || 0;
      this.rank = data.rank || "Snoo Rookie";
      this.attempts = data.attempts;

      this.renderUI(data);

      if (data.isWinner && mode === 'daily') {
        this.isWinner = true;
        this.statusMsg.textContent = "Daily Signal Already Solved.";
        this.showWinModal(data.attempts);
      } else {
        this.statusMsg.textContent = "Transmission stabilized. Identify the source.";
      }
    } catch (err) {
      console.error(err);
      this.statusMsg.textContent = "System offline. Reconnecting...";
    }
  }

  private updateModeUI() {
    this.modeDailyBtn.classList.toggle("active", this.currentMode === 'daily');
    this.modeUnlimitedBtn.classList.toggle("active", this.currentMode === 'unlimited');
  }

  private renderUI(data: GameInitResponse) {
    this.streakValRef.textContent = this.streak.toString();
    this.rankValRef.textContent = this.rank;

    // Reset Clues
    this.clueTexts[0].textContent = this.clues[0];
    this.clueTexts[1].textContent = this.clues[1];
    this.clueTexts[2].textContent = this.clues[2];

    this.clueCards[1].classList.add("locked");
    this.clueCards[2].classList.add("locked");
    this.clueTexts[1].classList.add("hidden");
    this.clueTexts[2].classList.add("hidden");
    this.clueCards[1].querySelector(".reveal-btn")?.classList.remove("hidden");
    this.clueCards[2].querySelector(".reveal-btn")?.classList.remove("hidden");

    // Render Options
    this.optionsGrid.innerHTML = "";
    data.choices.forEach(choice => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = `r/${choice.name}`;
      btn.addEventListener("click", () => this.submitGuess(choice.name));
      this.optionsGrid.appendChild(btn);
    });
  }

  private revealClue(n: number) {
    const idx = n - 1;
    this.clueCards[idx].classList.remove("locked");
    this.clueTexts[idx].classList.remove("hidden");
    this.clueCards[idx].querySelector(".reveal-btn")?.classList.add("hidden");
    window.dispatchMascotAction?.('reveal');
  }

  private async submitGuess(guess: string) {
    if (this.isWinner && this.currentMode === 'daily') return;

    try {
      this.statusMsg.textContent = "Verifying frequency sync...";
      const response = await fetch("/api/game/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guess,
          mode: this.currentMode,
          targetSubreddit: this.currentMode === 'unlimited' ? this.clues[0] : undefined // Simple way to track target in random
        }),
      });
      const data = (await response.json()) as GuessResponse;

      if (data.correct) {
        this.isWinner = true;
        this.streak = data.streak;
        this.rank = data.rank || this.rank;
        this.streakValRef.textContent = this.streak.toString();
        this.rankValRef.textContent = this.rank;
        this.showWinModal(data.attempts);
        window.dispatchMascotAction?.('correct');
      } else {
        this.statusMsg.textContent = "Sync Error: Interference detected.";
        window.dispatchMascotAction?.('wrong');
        const btn = Array.from(this.optionsGrid.children).find(b => b.textContent?.includes(guess)) as HTMLElement;
        if (btn) btn.style.background = "#333";
      }
    } catch (err) {
      console.error(err);
    }
  }

  private showWinModal(attempts: number) {
    this.mAttempts.textContent = attempts.toString();
    this.mStreak.textContent = this.streak.toString();
    this.modal.classList.remove("hidden");
    this.shareBtn.textContent = "Share To Reddit";
  }

  private async shareResult() {
    try {
      this.shareBtn.textContent = "Broadcasting...";
      const text = `I solved the Snoo-Clue in ${this.attempts} attempt${this.attempts !== 1 ? 's' : ''}! 🔍 Streak: ${this.streak}. Rank: ${this.rank}.`;

      const response = await fetch("/api/game/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempts: this.attempts, text }), // Added custom text for server handling
      });

      if (response.ok) {
        this.shareBtn.textContent = "✅ Shared!";
      }
    } catch (err) {
      this.shareBtn.textContent = "❌ Failed";
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GameLoader();
  new SnooCluesGame();
});
