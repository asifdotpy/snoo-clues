/**
 * Snoo-Clues Game - Main Entry Point
 * Modularized client-side application
 */

import "./types/gamemaker";
import GameLoader from "./gameloader/GameLoader";
import { setupHybridBridge, dispatchMascotAction } from "./bridge/HybridBridge";
import { typewriter, vibrate } from "./utils/effects";
import { GameAPI } from "./api/GameAPI";

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
    this.gameOverlay = document.getElementById("gameOverlay")!;
    this.gameContainer = document.querySelector(".game-container")!;
    this.gameSubtitle = document.querySelector(".game-subtitle")!;
    this.closeWinModalBtn = this.winModal.querySelector(".close-modal-btn") as HTMLButtonElement;
    this.closePlayedModalBtn = this.playedModal.querySelector(".close-modal-btn") as HTMLButtonElement;
    this.closeSelectionBtn = document.getElementById("closeSelectionModal") as HTMLButtonElement;
    this.currentModeTag = document.getElementById("currentModeTag")!;
    this.playedToColdBtn = document.getElementById("playedToColdBtn") as HTMLButtonElement;

    // Handle Case Selection modal close button
    if (this.closeSelectionBtn) {
      this.closeSelectionBtn.addEventListener("click", () => {
        // Only close if a game is already initialized
        if (this.currentGameMode) {
          this.hideSelectionHub();
        }
      });
    }

    // Setup Hybrid Bridge for mascot communication
    setupHybridBridge();
  }



  private playSound(soundType: 'rustle' | 'victory' | 'wrong'): void {
    const assetUrl = this.audioAssets ? this.audioAssets[soundType] : null;
    if (!assetUrl) {
      // Fallback
      if (soundType === 'rustle') {
        new Audio("https://www.soundjay.com/misc/sounds/paper-rustle-1.mp3").play().catch(() => { });
      }
      return;
    }
    const audio = new Audio(assetUrl);
    audio.play().catch(e => console.log("Audio playback blocked:", e));
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
    // Use event delegation for the back button to ensure it's always responsive
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target && (target.id === "backToSelection" || target.closest("#backToSelection"))) {
        this.goBackToSelection();
      }
    });
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
      const confirmed = confirm(
        "You have progress in this case. Changing modes will reset your progress. Continue?"
      );
      if (!confirmed) return;
    }

    dispatchMascotAction('switch_mode');
    this.showSelectionHub();
  }

  private showSelectionHub(): void {
    this.selectionModal.classList.remove("hidden");

    // Keep game visible underneath if a game is active
    if (!this.currentGameMode) {
      this.gameOverlay.classList.add("hidden");
    }

    // Only show close button if there is a game to return to
    if (this.closeSelectionBtn) {
      if (this.currentGameMode) {
        this.closeSelectionBtn.classList.remove("hidden");
      } else {
        this.closeSelectionBtn.classList.add("hidden");
      }
    }
  }

  private hideSelectionHub(): void {
    this.selectionModal.classList.add("hidden");
    this.gameOverlay.classList.remove("hidden");
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
    } catch (error) {
      console.error(error);
    }
  }

  private updateGameUI(): void {
    typewriter(this.clue1Text, this.clues[0]);
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
    const cardObj = n === 2 ? this.clue2Card : this.clue3Card;
    const text = n === 2 ? this.clue2Text : this.clue3Text;
    const btn = n === 2 ? this.revealClue2Btn : this.revealClue3Btn;

    cardObj.classList.remove("locked");
    cardObj.classList.add("visible");
    text.classList.remove("hidden");
    btn.style.display = "none";

    this.playSound('rustle');
    typewriter(text, this.clues[n - 1] as string);
    vibrate(20);
  }

  private async submitGuess(): Promise<void> {
    const guess = this.guessInput.value.trim();
    if (!guess) return;
    this.submitBtn.disabled = true;
    this.guessInput.disabled = true;

    try {
      const data = await GameAPI.submitGuess(guess, this.currentGameMode);
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
        dispatchMascotAction('correct');
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
    } catch (error) {
      console.error(error);
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
