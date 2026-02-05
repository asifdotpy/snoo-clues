/**
 * Snoo-Clues Game - Main Entry Point
 * Modularized client-side application
 */

import "./types/gamemaker";
import GameLoader from "./gameloader/GameLoader";
import { setupHybridBridge, dispatchMascotAction } from "./bridge/HybridBridge";
import { typewriter, vibrate } from "./utils/effects";
import { GameAPI } from "./api/GameAPI";
import { normalizeSubredditName } from "../shared/utils/normalization";
import setupSettingsUI from "./ui/Settings";
import { Audio } from "./utils/AudioHelper";

import type {
  GameInitResponse,
  LeaderboardEntry,
} from "../shared/types/api";

// ##########################################################################
// # SNOO-CLUES GAME CONTROLLER
// ##########################################################################

class SnooCluesGame {
  private clues: [string, string, string] = ["", "", ""];
  private attempts: number = 0;
  private isWinner: boolean = false;
  private hasPlayed: boolean = false;
  private streak: number = 0;
  private rank: string = "Rookie Sleuth";
  private coldCasesSolved: number = 0;
  private currentGameMode: 'daily' | 'unlimited' | null = null;
  private audioAssets?: GameInitResponse['audioAssets'];

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
  private confirmModal!: HTMLElement;
  private correctAnswer!: HTMLElement;
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
  private confirmYesBtn!: HTMLButtonElement;
  private confirmNoBtn!: HTMLButtonElement;
  private closeSelectionBtn!: HTMLButtonElement;
  private selectionModal!: HTMLElement;
  private gameOverlay!: HTMLElement;
  private startDailyBtn!: HTMLButtonElement;
  private startColdBtn!: HTMLButtonElement;
  private keepTrainingBtn!: HTMLButtonElement;
  private gameContainer!: HTMLElement;
  private gameSubtitle!: HTMLElement;
  private currentModeTag!: HTMLElement;
  private playedToColdBtn!: HTMLButtonElement;

  constructor() {
    this.initDOMElements();
    this.attachEventListeners();
    this.resetGameUI();
    this.showSelectionHub();
    this.fetchLeaderboard();
    this.setupAudioAndSettings();
  }

  private setupAudioAndSettings(): void {
    // Initialize settings UI (gear button + mute toggle)
    setupSettingsUI();
    
    // Register audio assets from public/audio directory
    // These will be played based on game events
    Audio.registerMusic('/audio/background-music.mp3');
    Audio.registerSound('hit', '/audio/hit.mp3');
    Audio.registerSound('wrong', '/audio/wrong.mp3');
    
    // Restore muted setting from localStorage
    const isMuted = Audio.isMuted();
    console.log(`[Audio] Initialized. Muted: ${isMuted}`);
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
    this.confirmModal = document.getElementById("confirmModal")!;
    this.correctAnswer = document.getElementById("correct-answer")!;
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
    this.gameOverlay = document.getElementById("gameOverlay")!;
    this.gameContainer = document.querySelector(".game-container")!;
    this.gameSubtitle = document.querySelector(".game-subtitle")!;
    this.closeWinModalBtn = this.winModal.querySelector(".close-modal-btn") as HTMLButtonElement;
    this.closePlayedModalBtn = this.playedModal.querySelector(".close-modal-btn") as HTMLButtonElement;
    this.confirmYesBtn = document.getElementById("confirm-yes-btn") as HTMLButtonElement;
    this.confirmNoBtn = document.getElementById("confirm-no-btn") as HTMLButtonElement;
    this.closeSelectionBtn = document.getElementById("closeSelectionModal") as HTMLButtonElement;
    this.currentModeTag = document.getElementById("currentModeTag")!;
    this.playedToColdBtn = document.getElementById("playedToColdBtn") as HTMLButtonElement;

    // Handle Case Selection modal close button
    if (this.closeSelectionBtn) {
      this.closeSelectionBtn.addEventListener("click", () => {
        this.hideSelectionHub();
      });
    }

    // Setup Hybrid Bridge for mascot communication
    setupHybridBridge();
  }



  private playSound(soundType: 'rustle' | 'victory' | 'wrong'): void {
    // Use the new AudioManager instead of direct Audio construction
    if (soundType === 'victory') {
      Audio.playSound('hit');
    } else if (soundType === 'wrong') {
      Audio.playSound('wrong');
    } else if (soundType === 'rustle') {
      Audio.playSound('hit'); // Use 'hit' sound as fallback for rustle
    }
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

    // Attach listeners to "X" buttons
    const winCloseX = this.winModal.querySelector(".win-close-x");
    if (winCloseX) winCloseX.addEventListener("click", () => this.closeModal("win"));

    const playedCloseX = this.playedModal.querySelector(".played-close-x");
    if (playedCloseX) playedCloseX.addEventListener("click", () => this.closeModal("played"));

    this.confirmYesBtn.addEventListener("click", () => {
      this.closeModal("confirm");
      this.executeBackToSelection(true);
    });

    this.confirmNoBtn.addEventListener("click", () => {
      this.closeModal("confirm");
    });

    this.startDailyBtn.addEventListener("click", () => this.initGame('daily'));
    this.startColdBtn.addEventListener("click", () => this.initGame('unlimited'));
    this.keepTrainingBtn.addEventListener("click", () => {
      const wasUnlimited = this.currentGameMode === 'unlimited';
      this.closeModal("win");
      if (!wasUnlimited) {
        this.initGame('unlimited');
      }
    });
    // Connect Change Case Type button
    const backBtn = document.getElementById("backToSelection");
    if (backBtn) {
      backBtn.addEventListener("click", () => this.goBackToSelection());
    }

    this.playedToColdBtn.addEventListener("click", () => {
      this.closeModal("played");
      this.initGame('unlimited');
    });
  }

  private goBackToSelection(): void {
    console.log("[Navigation] Returning to Selection Hub");
    // Only confirm if progress was made and user hasn't won yet
    const hasProgress = this.attempts > 0 ||
      this.clue2Card.classList.contains("visible") ||
      this.clue3Card.classList.contains("visible");

    if (hasProgress && !this.isWinner) {
      this.showModal("confirm");
      return;
    }

    this.executeBackToSelection();
  }

  private async executeBackToSelection(isAbandon: boolean = false): Promise<void> {
    if (isAbandon) {
      try {
        await GameAPI.abandonGame();
      } catch (error) {
        console.error("Failed to abandon game:", error);
      }
      this.streak = 0;
      this.streakValue.textContent = "0";
      dispatchMascotAction('mascot_disappointed');
    } else {
      dispatchMascotAction('switch_mode');
    }

    this.resetGameUI();
    this.showSelectionHub();
  }

  private showSelectionHub(): void {
    this.selectionModal.classList.remove("hidden");

    // Always keep game visible underneath for the "Empty Desk" feel
    this.gameOverlay.classList.remove("hidden");

    // Always show close button
    if (this.closeSelectionBtn) {
      this.closeSelectionBtn.classList.remove("hidden");
    }
  }

  private hideSelectionHub(): void {
    this.selectionModal.classList.add("hidden");
    this.gameOverlay.classList.remove("hidden");
  }



  private async initGame(mode: 'daily' | 'unlimited'): Promise<void> {
    this.resetGameUI();
    this.currentGameMode = mode;
    this.hideSelectionHub();

    // Toggle aesthetics
    if (mode === 'unlimited') {
      this.gameContainer.classList.add('cold-case');
      this.gameSubtitle.textContent = "Cold Case Investigation (Practice)";
      this.currentModeTag.textContent = "COLD CASE";
      this.currentModeTag.className = "mode-tag unlimited";
    } else {
      this.gameContainer.classList.remove('cold-case');
      this.gameSubtitle.textContent = "The Daily Subreddit Investigation";
      this.currentModeTag.textContent = "DAILY CASE";
      this.currentModeTag.className = "mode-tag daily";
    }

    try {
      const data = await GameAPI.initGame(mode);
      this.clues = data.clues;
      this.attempts = data.attempts;
      this.hasPlayed = data.hasPlayedToday;
      this.isWinner = data.isWinner;
      this.streak = data.streak;
      this.rank = data.rank || "Rookie Sleuth";
      this.coldCasesSolved = data.coldCasesSolved;
      this.audioAssets = data.audioAssets;

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
    } catch (error: any) {
      console.error(error);
      const message = error.name === 'AbortError'
        ? "Request timed out. Please try again."
        : "Unable to load investigation. Please check your connection and try again.";
      this.showFeedback(message, "error");
    }
  }

  private updateGameUI(): void {
    typewriter(this.clue1Text, this.clues[0]);
    this.clue2Text.textContent = this.clues[1];
    this.clue3Text.textContent = this.clues[2];
    this.attemptsCount.textContent = this.attempts.toString();
    this.streakValue.textContent = this.streak.toString();
    this.rankValue.textContent = this.rank;

    [this.clue2Card, this.clue3Card].forEach(c => {
      c.classList.add("locked");
      c.classList.remove("visible");
    });
    [this.clue2Text, this.clue3Text].forEach(t => t.classList.add("hidden"));
    [this.revealClue2Btn, this.revealClue3Btn].forEach(b => b.style.display = "block");
  }

  private revealClue(n: 2 | 3): void {
    const cardObj = n === 2 ? this.clue2Card : this.clue3Card;
    const text = n === 2 ? this.clue2Text : this.clue3Text;
    const btn = n === 2 ? this.revealClue2Btn : this.revealClue3Btn;

    cardObj.classList.remove("locked");
    cardObj.classList.add("visible");
    text.classList.remove("hidden");
    btn.style.display = "none";

    this.playSound('rustle');
    dispatchMascotAction('reveal');
    typewriter(text, this.clues[n - 1] as string);
    vibrate(20);
  }

  private async submitGuess(): Promise<void> {
    const guess = normalizeSubredditName(this.guessInput.value);
    if (!guess) return;
    this.submitBtn.disabled = true;
    this.guessInput.disabled = true;

    try {
      const data = await GameAPI.submitGuess(guess, this.currentGameMode);
      this.attempts = data.attempts;
      this.attemptsCount.textContent = this.attempts.toString();
      this.streak = data.streak ?? this.streak;
      this.streakValue.textContent = this.streak.toString();
      this.rank = data.rank ?? this.rank;
      this.rankValue.textContent = this.rank;
      this.coldCasesSolved = data.coldCasesSolved ?? this.coldCasesSolved;

      if (data.correct) {
        this.isWinner = true;
        this.correctAnswer.textContent = `r/${data.answer ?? guess}`;
        this.winAttempts.textContent = this.attempts.toString();
        this.winStreakVal.textContent = this.streak.toString();
        this.winRankName.textContent = this.rank;

        this.showModal("win");
        dispatchMascotAction('victory');
        this.playSound('victory');

        setTimeout(() => {
          this.caseClosedStamp.classList.remove('hidden');
          this.caseClosedStamp.classList.add('stamped');
        }, 500);
        this.disableInput();
        this.fetchLeaderboard();
      } else {
        this.showFeedback("❌ Incorrect", "error");
        dispatchMascotAction('wrong');
        if (data.audioTrigger === 'wrong') this.playSound('wrong');
        this.guessInput.value = "";
        this.guessInput.focus();
        this.submitBtn.disabled = false;
        this.guessInput.disabled = false;
      }
    } catch (error: any) {
      console.error(error);
      const message = error.name === 'AbortError'
        ? "Submission timed out. Please try again."
        : "Unable to submit guess. Please check your connection and try again.";
      this.showFeedback(message, "error");
      this.submitBtn.disabled = false;
      this.guessInput.disabled = false;
    }
  }

  private async shareResult(): Promise<void> {
    try {
      const data = await GameAPI.shareResult(this.attempts);
      if (data.success) {
        this.shareBtn.textContent = "✅ Shared!";
      }
    } catch (error) {
      console.error(error);
      this.showFeedback(
        "Failed to share result to Reddit. Please try again.",
        "error"
      );
    }
  }

  private showFeedback(m: string, t: "success" | "error"): void {
    this.feedbackMessage.textContent = m;
    this.feedbackMessage.className = `feedback-message ${t} active`;

    // Auto-clear after short delay for better UX
    setTimeout(() => {
      this.feedbackMessage.classList.remove('active');
    }, 3000);
  }

  private async fetchLeaderboard(): Promise<void> {
    try {
      const data = await GameAPI.fetchLeaderboard();
      this.renderLeaderboard(data.leaderboard);
    } catch (error) {
      console.error("Leaderboard fetch failed:", error);
      this.leaderboardList.innerHTML = `
        <div class="leaderboard-item error">
          Failed to load rankings.
        </div>
      `;
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

  private showModal(t: "win" | "played" | "confirm"): void {
    const modalMap = {
      win: this.winModal,
      played: this.playedModal,
      confirm: this.confirmModal
    };
    modalMap[t].classList.remove("hidden");
  }

  private closeModal(t: "win" | "played" | "confirm"): void {
    const modalMap = {
      win: this.winModal,
      played: this.playedModal,
      confirm: this.confirmModal
    };
    modalMap[t].classList.add("hidden");

    // Automatically load new cold case when closing win modal in unlimited mode
    if (t === 'win' && this.currentGameMode === 'unlimited') {
      console.log("[Logic] Unlimited mode: Automatically starting next case");
      this.initGame('unlimited');
    }
  }

  private resetGameUI(): void {
    console.log("[UI] Performing comprehensive state reset");
    this.currentGameMode = null;
    this.shareBtn.textContent = "📢 Share to Reddit";
    this.clues = ["", "", ""];
    this.attempts = 0;
    this.isWinner = false;
    this.hasPlayed = false;
    this.audioAssets = undefined;

    // 1. Clue Reset
    this.clue1Text.textContent = "NO ACTIVE CASE";
    this.clue2Text.textContent = "???";
    this.clue3Text.textContent = "???";

    [this.clue2Card, this.clue3Card].forEach(c => {
      c.classList.add("locked");
      c.classList.remove("visible");
    });
    [this.clue2Text, this.clue3Text].forEach(t => t.classList.add("hidden"));
    [this.revealClue2Btn, this.revealClue3Btn].forEach(b => b.style.display = "block");

    // 2. Input & Feedback Reset
    this.guessInput.value = "";
    this.guessInput.disabled = false;
    this.submitBtn.disabled = false;
    this.feedbackMessage.textContent = "";
    this.feedbackMessage.className = "feedback-message";
    this.feedbackMessage.classList.remove('active');

    // 3. Counter Reset
    this.attemptsCount.textContent = "0";
    this.streakValue.textContent = "0";
    this.rank = "Rookie Sleuth";
    this.rankValue.textContent = this.rank;

    // 4. Modal Content Reset
    this.caseClosedStamp.classList.add('hidden');
    this.caseClosedStamp.classList.remove('stamped');
    this.correctAnswer.textContent = "r/...";
    this.winAttempts.textContent = "0";
    this.winStreakVal.textContent = "0";
    this.playedAttemptsCount.textContent = "0";
    this.playedStreakVal.textContent = "0";
    const playedAnswer = document.getElementById('played-answer');
    if (playedAnswer) playedAnswer.textContent = "r/...";

    // 5. Global Aesthetic Reset
    this.gameContainer.classList.remove('cold-case');
    this.gameSubtitle.textContent = "The Daily Subreddit Investigation";
    this.currentModeTag.textContent = "DAILY CASE";
    this.currentModeTag.className = "mode-tag daily";

    // 6. Close all modals
    this.closeModal("win");
    this.closeModal("played");
    this.closeModal("confirm");

    // 7. Mascot Reset
    dispatchMascotAction('idle');
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
