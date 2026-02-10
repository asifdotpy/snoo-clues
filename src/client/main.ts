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
import { AUDIO_CONFIG } from "./config/AudioAssets";

import type {
  GameInitResponse,
  LeaderboardEntry,
} from "../shared/types/api";

// ##########################################################################
// # SNOO-CLUES GAME CONTROLLER
// ##########################################################################

class SnooCluesGame {
  private evidence: [string, string, string] = ["", "", ""];
  private attempts: number = 0;
  private isWinner: boolean = false;
  private hasPlayed: boolean = false;
  private streak: number = 0;
  private rank: string = "Rookie Sleuth";
  private archivesSolved: number = 0;
  private evidenceFound: number = 1;
  private currentCategory: string = "";
  private currentGameMode: 'daily' | 'archives' | 'community' | null = null;
  private audioAssets?: GameInitResponse['audioAssets'];
  private pendingExitTarget: 'selection' | 'home' | null = null;

  // DOM Elements
  private evidence1Text!: HTMLElement;
  private evidence2Text!: HTMLElement;
  private evidence3Text!: HTMLElement;
  private evidence2Card!: HTMLElement;
  private evidence3Card!: HTMLElement;
  private revealEvidence2Btn!: HTMLButtonElement;
  private revealEvidence3Btn!: HTMLButtonElement;
  private guessInput!: HTMLInputElement;
  private submitBtn!: HTMLButtonElement;
  private attemptsCount!: HTMLElement;
  private feedbackMessage!: HTMLElement;
  private winModal!: HTMLElement;
  private playedModal!: HTMLElement;
  private submitModal!: HTMLElement;
  private confirmModal!: HTMLElement;
  private confirmModalTitle!: HTMLElement;
  private confirmModalText!: HTMLElement;
  private correctAnswer!: HTMLElement;
  private winAttempts!: HTMLElement;
  private playedAttemptsCount!: HTMLElement;
  private playedStreakVal!: HTMLElement;
  private streakValue!: HTMLElement;
  private streakBadge!: HTMLElement;
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
  private startArchivesBtn!: HTMLButtonElement;
  private startCommunityBtn!: HTMLButtonElement;
  private keepTrainingBtn!: HTMLButtonElement;
  private gameContainer!: HTMLElement;
  private gameSubtitle!: HTMLElement;
  private currentModeTag!: HTMLElement;
  private playedToArchivesBtn!: HTMLButtonElement;
  private exitToHomeBtn!: HTMLButtonElement;
  private selectionExitToHomeBtn!: HTMLButtonElement;
  private loadingElement!: HTMLElement;
  private startInvestigationBtn!: HTMLButtonElement;
  private userGreeting!: HTMLElement;
  private mascotTipBtn!: HTMLButtonElement;
  private openSubmitModalBtn!: HTMLButtonElement;
  private closeSubmitModalBtn!: HTMLButtonElement;
  private submitCaseBtn!: HTMLButtonElement;
  private cancelSubmitBtn!: HTMLButtonElement;
  private copyTriggers!: NodeListOf<HTMLElement>;

  constructor() {
    this.initDOMElements();
    this.attachEventListeners();
    this.resetGameUI();
    this.fetchLeaderboard();
    this.setupAudioAndSettings();
    this.fetchUserGreeting();
  }

  private async fetchUserGreeting(): Promise<void> {
    try {
      const data = await GameAPI.fetchInitInfo();
      if (data.username) {
        this.userGreeting.textContent = `Hey ${data.username} 👋`;
      }
    } catch (e) {
      console.warn("Failed to fetch username for greeting");
    }
  }

  private setupAudioAndSettings(): void {
    // Initialize settings UI (integrated into header)
    setupSettingsUI();

    // Register Background Music
    Audio.registerMusic(AUDIO_CONFIG.bgm.url);

    // Register Sound Effects and their Synth Fallbacks
    Object.entries(AUDIO_CONFIG.sfx).forEach(([name, config]) => {
      // Register the high-quality sound
      Audio.registerSound(name, config.url);

      // Register the zero-latency synth fallback
      Audio.registerSynth(name, config.synthFallback.freq, config.synthFallback.duration);
    });

    const isMuted = Audio.isMuted();
    console.log(`[Audio] Modular system initialized. Muted: ${isMuted}`);
  }

  private initDOMElements(): void {
    this.evidence1Text = document.getElementById("evidence1Text")!;
    this.evidence2Text = document.getElementById("evidence2Text")!;
    this.evidence3Text = document.getElementById("evidence3Text")!;
    this.evidence2Card = document.getElementById("evidence2Card")!;
    this.evidence3Card = document.getElementById("evidence3Card")!;
    this.revealEvidence2Btn = document.getElementById("revealEvidence2") as HTMLButtonElement;
    this.revealEvidence3Btn = document.getElementById("revealEvidence3") as HTMLButtonElement;
    this.guessInput = document.getElementById("guessInput") as HTMLInputElement;
    this.submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;
    this.attemptsCount = document.getElementById("attemptsCount")!;
    this.feedbackMessage = document.getElementById("feedbackMessage")!;
    this.winModal = document.getElementById("winModal")!;
    this.playedModal = document.getElementById("playedModal")!;
    this.submitModal = document.getElementById("submitModal")!;
    this.confirmModal = document.getElementById("confirmModal")!;
    this.confirmModalTitle = document.getElementById("confirmModalTitle")!;
    this.confirmModalText = document.getElementById("confirmModalText")!;
    this.correctAnswer = document.getElementById("correct-answer")!;
    this.winAttempts = document.getElementById("win-attempts-count")!;
    this.playedAttemptsCount = document.getElementById('played-attempts-count')!;
    this.playedStreakVal = document.getElementById('played-streak-val')!;
    this.streakValue = document.getElementById('streak-value')!;
    this.streakBadge = document.getElementById('streakBadge')!;
    this.winStreakVal = document.getElementById('win-streak-val')!;
    this.rankValue = document.getElementById('rank-value')!;
    this.winRankName = document.getElementById('win-rank-name')!;
    this.caseClosedStamp = document.getElementById('case-closed-stamp')!;
    this.leaderboardList = document.getElementById('leaderboardList')!;
    this.shareBtn = document.getElementById("share-btn") as HTMLButtonElement;
    this.selectionModal = document.getElementById("selectionModal")!;
    this.startDailyBtn = document.getElementById("startDailyBtn") as HTMLButtonElement;
    this.startArchivesBtn = document.getElementById("startArchivesBtn") as HTMLButtonElement;
    this.startCommunityBtn = document.getElementById("startCommunityBtn") as HTMLButtonElement;
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
    this.playedToArchivesBtn = document.getElementById("playedToArchivesBtn") as HTMLButtonElement;
    this.exitToHomeBtn = document.getElementById("exitToHome") as HTMLButtonElement;
    this.selectionExitToHomeBtn = document.getElementById("selectionExitToHome") as HTMLButtonElement;
    this.loadingElement = document.getElementById("loading")!;
    this.startInvestigationBtn = document.getElementById("start-case-file-btn") as HTMLButtonElement;
    this.userGreeting = document.getElementById("user-greeting")!;
    this.mascotTipBtn = document.getElementById("mascot-tip-btn") as HTMLButtonElement;
    this.openSubmitModalBtn = document.getElementById("openSubmitModalBtn") as HTMLButtonElement;
    this.closeSubmitModalBtn = document.getElementById("closeSubmitModal") as HTMLButtonElement;
    this.submitCaseBtn = document.getElementById("submitCaseBtn") as HTMLButtonElement;
    this.cancelSubmitBtn = document.getElementById("cancelSubmitBtn") as HTMLButtonElement;
    this.copyTriggers = document.querySelectorAll(".copy-trigger");

    // Handle Case Selection modal close button
    if (this.closeSelectionBtn) {
      this.closeSelectionBtn.addEventListener("click", () => {
        this.playSound('click');
        this.hideSelectionHub();
      });
    }

    // Setup Hybrid Bridge for mascot communication
    setupHybridBridge();
  }

  private playSound(soundType: 'rustle' | 'victory' | 'wrong' | 'hit' | 'click'): void {
    switch (soundType) {
      case 'victory':
        Audio.playSound('victory');
        break;
      case 'wrong':
        Audio.playSound('wrong');
        break;
      case 'rustle':
        Audio.playSound('reveal');
        break;
      case 'hit':
        Audio.playSound('hit');
        break;
      case 'click':
        Audio.playSound('click');
        break;
    }
  }

  private attachEventListeners(): void {
    this.revealEvidence2Btn.addEventListener("click", () => this.revealEvidence(2));
    this.revealEvidence3Btn.addEventListener("click", () => this.revealEvidence(3));
    this.submitBtn.addEventListener("click", () => {
      this.playSound('click');
      this.submitGuess();
    });
    this.guessInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.playSound('click');
        this.submitGuess();
      }
    });
    this.guessInput.addEventListener("input", () => {
      this.guessInput.value = this.guessInput.value.toLowerCase();
      if (this.guessInput.value.length > 0) {
        dispatchMascotAction('typing');
      }
    });
    this.shareBtn.addEventListener("click", () => {
      this.playSound('click');
      this.shareResult();
    });
    this.closeWinModalBtn.addEventListener("click", () => {
      this.playSound('click');
      this.closeModal("win");
    });
    this.closePlayedModalBtn.addEventListener("click", () => {
      this.playSound('click');
      this.closeModal("played");
    });

    this.copyTriggers.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const clueNum = (e.target as HTMLElement).getAttribute("data-clue");
        this.handleCopyClue(clueNum);
      });
    });

    // Share from win modal
    if (this.shareBtn) {
      this.shareBtn.textContent = "📢 Report Findings";
    }

    // Share from played modal too
    const playedShareBtn = this.playedModal.querySelector(".share-btn") as HTMLButtonElement;
    if (playedShareBtn) {
      playedShareBtn.addEventListener("click", () => {
        this.playSound('click');
        this.shareResult(playedShareBtn);
      });
    }

    // Attach listeners to "X" buttons
    const winCloseX = this.winModal.querySelector(".win-close-x");
    if (winCloseX) {
      winCloseX.addEventListener("click", () => {
        this.playSound('click');
        this.closeModal("win");
      });
    }

    const playedCloseX = this.playedModal.querySelector(".played-close-x");
    if (playedCloseX) {
      playedCloseX.addEventListener("click", () => {
        this.playSound('click');
        this.closeModal("played");
      });
    }

    this.confirmYesBtn.addEventListener("click", () => {
      this.playSound('click');
      this.closeModal("confirm");
      this.handleExit(this.hasCaseProgress());
    });

    this.confirmNoBtn.addEventListener("click", () => {
      this.playSound('click');
      this.closeModal("confirm");
    });

    this.startDailyBtn.addEventListener("click", () => {
      this.playSound('click');
      this.initGame('daily');
    });
    this.startArchivesBtn.addEventListener("click", () => {
      this.playSound('click');
      this.initGame('archives');
    });
    this.startCommunityBtn.addEventListener("click", () => {
      this.playSound('click');
      this.initGame('community');
    });
    this.keepTrainingBtn.addEventListener("click", () => {
      this.playSound('click');
      const wasArchives = this.currentGameMode === 'archives';
      this.closeModal("win");
      if (!wasArchives) {
        this.initGame('archives');
      }
    });
    // Connect Change Case Type button
    const backBtn = document.getElementById("backToSelection");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        this.playSound('click');
        this.requestExitConfirmation('selection');
      });
    }

    this.playedToArchivesBtn.addEventListener("click", () => {
      this.playSound('click');
      this.closeModal("played");
      this.initGame('archives');
    });

    // New Exit to Home listeners
    if (this.exitToHomeBtn) {
      this.exitToHomeBtn.addEventListener("click", () => {
        this.playSound('click');
        this.requestExitConfirmation('home');
      });
    }

    if (this.selectionExitToHomeBtn) {
      this.selectionExitToHomeBtn.addEventListener("click", () => {
        this.playSound('click');
        this.requestExitConfirmation('home');
      });
    }

    if (this.startInvestigationBtn) {
      this.startInvestigationBtn.addEventListener("click", () => {
        this.startInvestigationBtn.disabled = true;
        this.showMainMenu();
      });
    }

    if (this.mascotTipBtn) {
      this.mascotTipBtn.addEventListener("click", () => {
        this.playSound('click');
        this.showMascotTip();
      });
    }

    // Submit case listeners
    this.openSubmitModalBtn.addEventListener("click", () => {
      this.playSound('click');
      this.showModal("submit");
    });

    const closeSubmit = () => {
      this.playSound('click');
      this.closeModal("submit");
    };

    this.closeSubmitModalBtn.addEventListener("click", closeSubmit);
    this.cancelSubmitBtn.addEventListener("click", closeSubmit);

    this.submitCaseBtn.addEventListener("click", () => {
      this.playSound('click');
      this.handleCaseSubmission();
    });
  }

  public showMainMenu(keepCurrentMascot: boolean = false): void {
    console.log("[Navigation] Showing Main Menu (Selection Hub)");

    // 1. Hide Loading/Splash Screen
    this.loadingElement.classList.add("hidden");
    setTimeout(() => {
      if (this.loadingElement.classList.contains("hidden")) {
        this.loadingElement.style.display = "none";
      }
    }, 500);

    // 2. Show Game Layers
    this.gameOverlay.classList.remove("hidden");
    this.selectionModal.classList.remove("hidden");

    // Ensure selection hub close button is properly managed
    if (this.closeSelectionBtn) {
      this.closeSelectionBtn.classList.remove("hidden");
    }

    if (!keepCurrentMascot) {
      dispatchMascotAction('idle');
    }

    Audio.playMusic();
  }

  private hasCaseProgress(): boolean {
    return (this.attempts > 0 ||
      this.evidence2Card.classList.contains("visible") ||
      this.evidence3Card.classList.contains("visible")) && !this.isWinner;
  }

  private requestExitConfirmation(target: 'selection' | 'home'): void {
    console.log(`[Navigation] Requesting exit to: ${target}`);
    this.pendingExitTarget = target;

    if (!this.hasCaseProgress()) {
      if (target === 'selection') {
        this.handleExit(false);
      } else {
        // Home exit with no progress still shows a "safety" confirmation
        this.confirmModalTitle.textContent = "Retreat to HQ?";
        this.confirmModalText.textContent = "Going back to the splash screen. Your streak is safe. Continue?";
        this.confirmYesBtn.textContent = "Yes, Retreat";
        this.showModal("confirm");
      }
      return;
    }

    // Progress exists, show abandonment warning
    if (target === 'home') {
      this.confirmModalTitle.textContent = "Retreat to HQ?";
      this.confirmModalText.textContent = "Your current Case File progress will be lost and your streak will reset. Retreat anyway?";
      this.confirmYesBtn.textContent = "Yes, Retreat";
    } else {
      this.confirmModalTitle.textContent = "Abandon Case?";
      this.confirmModalText.textContent = "Abandoning this Case File will forfeit your current progress and reset your streak to 0. Retreat?";
      this.confirmYesBtn.textContent = "Yes, Abandon";
    }

    this.showModal("confirm");
  }

  private async handleExit(isAbandon: boolean): Promise<void> {
    const target = this.pendingExitTarget;
    this.pendingExitTarget = null;

    if (target === 'home') {
      console.log("[Navigation] Executing Exit to Home");
      Audio.pauseMusic();

      if (isAbandon) {
        try {
          await GameAPI.abandonGame();
        } catch (error) {
          console.error("Failed to abandon game:", error);
        }
        this.streak = 0;
        this.updateStreakDisplay();
      }

      this.resetGameUI(isAbandon); // Pass isAbandon to skip immediate idle reset

      // Hide game application layers
      this.gameOverlay.classList.add("hidden");
      this.selectionModal.classList.add("hidden");

      // Show loading screen / splash
      this.loadingElement.style.display = "flex";
      this.loadingElement.classList.remove("hidden");

      // Re-enable the start button for future re-entry
      if (this.startInvestigationBtn) {
        this.startInvestigationBtn.classList.remove("hidden");
        this.startInvestigationBtn.disabled = false;
      }
    } else {
      console.log("[Navigation] Executing Return to Selection Hub");

      if (isAbandon) {
        try {
          await GameAPI.abandonGame();
        } catch (error) {
          console.error("Failed to abandon game:", error);
        }
        this.streak = 0;
        this.updateStreakDisplay();
      } else {
        dispatchMascotAction('switch_mode');
      }

      this.resetGameUI(isAbandon);
      this.showMainMenu(isAbandon);
    }
  }

  private hideSelectionHub(): void {
    this.selectionModal.classList.add("hidden");
    this.gameOverlay.classList.remove("hidden");
  }

  private async initGame(mode: 'daily' | 'archives' | 'community'): Promise<void> {
    this.resetGameUI();
    this.currentGameMode = mode;
    this.hideSelectionHub();

    // Start background music
    Audio.playMusic();

    // Toggle aesthetics
    if (mode === 'archives') {
      this.gameContainer.classList.add('archives-case');
      this.gameSubtitle.textContent = "The Archives (Practice)";
      this.currentModeTag.textContent = "ARCHIVES";
      this.currentModeTag.className = "mode-tag archives";
    } else if (mode === 'community') {
      this.gameContainer.classList.add('archives-case'); // Reuse archives blue for now
      this.gameSubtitle.textContent = "Community Case File (User Contributed)";
      this.currentModeTag.textContent = "COMMUNITY";
      this.currentModeTag.className = "mode-tag archives";
    } else {
      this.gameContainer.classList.remove('archives-case');
      this.gameSubtitle.textContent = "The Daily Subreddit Case File";
      this.currentModeTag.textContent = "DAILY CASE";
      this.currentModeTag.className = "mode-tag daily";
    }

    try {
      const data = mode === 'community'
        ? await GameAPI.fetchCommunityGame()
        : await GameAPI.initGame(mode as 'daily' | 'archives');
      this.evidence = data.evidence;
      if (data.username) {
        this.userGreeting.textContent = `Hey ${data.username} 👋`;
      }
      this.attempts = data.attempts;
      this.hasPlayed = data.hasPlayedToday;
      this.isWinner = data.isWinner;
      this.streak = data.streak;
      this.rank = data.rank || "Rookie Sleuth";
      this.archivesSolved = data.archivesSolved;
      this.currentCategory = data.category || "";
      this.audioAssets = data.audioAssets;

      this.updateGameUI();
      this.updateStreakDisplay();

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
      let message = "Unable to load Case File. Please check your connection and try again.";

      if (error.name === 'AbortError') {
        message = "Sleuth HQ is taking too long to respond. Please check your connection.";
      } else if (error.message) {
        message = error.message;
      }

      this.showFeedback(message, "error");
    }
  }

  private updateStreakDisplay(): void {
    this.streakValue.textContent = this.streak.toString();
    if (this.streak > 0) {
      this.streakBadge.classList.add('active');
    } else {
      this.streakBadge.classList.remove('active');
    }
  }

  private updateGameUI(): void {
    typewriter(this.evidence1Text, this.evidence[0]);
    this.evidence2Text.textContent = this.evidence[1];
    this.evidence3Text.textContent = this.evidence[2];
    this.attemptsCount.textContent = this.attempts.toString();
    this.updateStreakDisplay();
    this.rankValue.textContent = this.rank;

    [this.evidence2Card, this.evidence3Card].forEach(c => {
      c.classList.add("locked");
      c.classList.remove("visible");
    });
    [this.evidence2Text, this.evidence3Text].forEach(t => t.classList.add("hidden"));
    [this.revealEvidence2Btn, this.revealEvidence3Btn].forEach(b => b.style.display = "block");
    this.copyTriggers.forEach(t => {
      if (t.getAttribute("data-clue") !== "1") {
        t.classList.add("hidden");
      }
    });
  }

  private revealEvidence(n: 2 | 3): void {
    const cardObj = n === 2 ? this.evidence2Card : this.evidence3Card;
    const text = n === 2 ? this.evidence2Text : this.evidence3Text;
    const btn = n === 2 ? this.revealEvidence2Btn : this.revealEvidence3Btn;

    if (n > this.evidenceFound) {
      this.evidenceFound = n;
    }

    cardObj.classList.remove("locked");
    cardObj.classList.add("visible");
    text.classList.remove("hidden");
    btn.style.display = "none";

    this.playSound('rustle');
    dispatchMascotAction('reveal');
    typewriter(text, this.evidence[n - 1] as string);

    // Show copy trigger for this clue
    const copyTrigger = document.querySelector(`.copy-trigger[data-clue="${n}"]`);
    if (copyTrigger) copyTrigger.classList.remove("hidden");

    vibrate(20);
  }

  private handleCopyClue(num: string | null): void {
    if (!num) return;
    const index = parseInt(num) - 1;
    const text = this.evidence[index];
    if (!text) return;

    this.playSound('click');
    navigator.clipboard.writeText(text).then(() => {
      this.showFeedback(`🔎 Evidence #${num} copied to clipboard!`, "success", 3000);
    }).catch(err => {
      console.error("Failed to copy:", err);
      this.showFeedback("Failed to copy evidence.", "error", 3000);
    });
  }

  private async submitGuess(): Promise<void> {
    const guess = normalizeSubredditName(this.guessInput.value);
    if (!guess) return;
    this.submitBtn.disabled = true;
    this.guessInput.disabled = true;

    dispatchMascotAction('searching');

    try {
      const data = await GameAPI.submitGuess(guess, this.currentGameMode);
      this.attempts = data.attempts;
      this.attemptsCount.textContent = this.attempts.toString();
      this.streak = data.streak ?? this.streak;
      this.updateStreakDisplay();
      this.rank = data.rank ?? this.rank;
      this.rankValue.textContent = this.rank;
      this.archivesSolved = data.archivesSolved ?? this.archivesSolved;

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
      let message = "Unable to submit findings. Please check your connection and try again.";

      if (error.message === 'LOGIN_REQUIRED') {
        message = "Sleuth identity not verified. Please log in to Reddit to submit findings and earn rank.";
      } else if (error.name === 'AbortError') {
        message = "Sleuth HQ is taking too long. Report failed. Please try again.";
      } else if (error.message) {
        message = error.message;
      }

      this.showFeedback(message, "error");
      this.submitBtn.disabled = false;
      this.guessInput.disabled = false;
    }
  }

  private async shareResult(btnElement: HTMLButtonElement = this.shareBtn): Promise<void> {
    try {
      const data = await GameAPI.shareResult({
        attempts: this.attempts,
        evidenceFound: this.evidenceFound,
        mode: this.currentGameMode || 'daily'
      });
      if (data.success) {
        btnElement.textContent = "✅ Findings Reported!";
      }
    } catch (error: any) {
      console.error(error);
      this.showFeedback(
        error.message || "Failed to report findings to HQ. Please try again.",
        "error"
      );
    }
  }

  private showFeedback(m: string, t: "success" | "error", duration: number = 3000): void {
    this.feedbackMessage.textContent = m;
    this.feedbackMessage.className = `feedback-message ${t} active`;

    // Auto-clear after delay for better UX
    setTimeout(() => {
      this.feedbackMessage.classList.remove('active');
    }, duration);
  }

  private async fetchLeaderboard(): Promise<void> {
    try {
      const data = await GameAPI.fetchLeaderboard();
      this.renderLeaderboard(data.leaderboard);
    } catch (error) {
      console.error("Sleuth rankings fetch failed:", error);
      this.leaderboardList.innerHTML = `
        <div class="leaderboard-item error">
          Failed to load Sleuth rankings.
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

  private showModal(t: "win" | "played" | "confirm" | "submit"): void {
    const modalMap = {
      win: this.winModal,
      played: this.playedModal,
      confirm: this.confirmModal,
      submit: this.submitModal
    };
    modalMap[t].classList.remove("hidden");
  }

  private closeModal(t: "win" | "played" | "confirm" | "submit"): void {
    const modalMap = {
      win: this.winModal,
      played: this.playedModal,
      confirm: this.confirmModal,
      submit: this.submitModal
    };
    modalMap[t].classList.add("hidden");

    // Automatically load new archive case when closing win modal in archives mode
    if (t === 'win' && this.currentGameMode === 'archives') {
      console.log("[Logic] Archives mode: Automatically starting next case");
      this.initGame('archives');
    }
  }

  private resetGameUI(isAbandon: boolean = false): void {
    console.log("[UI] Performing comprehensive state reset");
    this.currentGameMode = null;
    this.shareBtn.textContent = "📢 Report Findings";
    this.evidence = ["", "", ""];
    this.attempts = 0;
    this.evidenceFound = 1;
    this.isWinner = false;
    this.hasPlayed = false;
    this.audioAssets = undefined;

    // 1. Evidence Reset
    this.evidence1Text.textContent = "NO ACTIVE CASE FILE";
    this.evidence2Text.textContent = "???";
    this.evidence3Text.textContent = "???";

    [this.evidence2Card, this.evidence3Card].forEach(c => {
      c.classList.add("locked");
      c.classList.remove("visible");
    });
    [this.evidence2Text, this.evidence3Text].forEach(t => t.classList.add("hidden"));
    [this.revealEvidence2Btn, this.revealEvidence3Btn].forEach(b => b.style.display = "block");

    // 2. Input & Feedback Reset
    this.guessInput.value = "";
    this.guessInput.disabled = false;
    this.submitBtn.disabled = false;
    this.feedbackMessage.textContent = "";
    this.feedbackMessage.className = "feedback-message";
    this.feedbackMessage.classList.remove('active');

    // 3. Counter Reset
    this.attemptsCount.textContent = "0";
    this.updateStreakDisplay();
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
    this.gameContainer.classList.remove('archives-case');
    this.gameSubtitle.textContent = "The Daily Subreddit Case File";
    this.currentModeTag.textContent = "DAILY CASE";
    this.currentModeTag.className = "mode-tag daily";

    // 6. Close all modals
    this.closeModal("win");
    this.closeModal("played");
    this.closeModal("confirm");

    // 7. Mascot Reset - only if not disappointed by abandonment
    if (!isAbandon) {
      dispatchMascotAction('idle');
    } else {
      dispatchMascotAction('mascot_disappointed');
    }
  }

  private disableInput(): void {
    this.guessInput.disabled = true;
    this.submitBtn.disabled = true;
  }

  private showMascotTip(): void {
    // Official Case File restriction
    if (this.currentGameMode !== 'archives') {
      this.showFeedback("🔎 Tip: Archives only, Sleuth! This is an official Case File—no outside interference permitted.", "success", 10000);
      dispatchMascotAction('reveal');
      return;
    }

    const SLEUTH_TIPS = [
      "Look for keywords in the evidence—they often point to the Subreddit's niche!",
      "Common prefixes like 'ask', 'today', or 'mildly' are very popular on Reddit.",
      "Check the emoji at the start of Evidence #3—it's usually a direct hint!",
      "Don't worry about 'r/'—I'll handle that for you.",
      "The Archives are great for practice and still earn you rank points!",
      "The Daily Case File resets at midnight UTC. Don't break your streak!",
      "Some Subreddits are compound words. Try combining them if it sounds right.",
      "Mascot says: 'I'm watching your progress, Sleuth. No pressure!'"
    ];

    let tip = SLEUTH_TIPS[Math.floor(Math.random() * SLEUTH_TIPS.length)];

    // Add category-specific hint if available to help explain clues
    if (this.currentCategory) {
      const categoryMap: Record<string, string> = {
        'wholesome': 'This Subreddit is known for its positive and heartwarming content.',
        'gaming': 'This case involves the world of pixels, consoles, and video games.',
        'humor': 'Expect something funny—this Subreddit is all about jokes and laughter.',
        'knowledge': 'This is an educational hub where Sleuths share facts and trivia.',
        'science': 'The evidence points toward a rigorous, science-focused Subreddit.',
        'entertainment': 'This Subreddit is a major hub for movies, TV, or music fans.',
        'visual': 'This Subreddit is primarily focused on photos and visual content.',
        'lifestyle': 'The evidence describes a Subreddit centered around a specific hobby or life path.',
        'nature': 'This case is about the natural world, plants, or wild animals.',
        'news': 'The evidence is referencing global events or current news cycles.',
        'meta': 'This is a meta-Subreddit—it\'s about Reddit itself or general internet trends.',
        'community': 'This is a Case File submitted by a fellow Sleuth in the field!'
      };

      const categoryHint = categoryMap[this.currentCategory.toLowerCase()];
      if (categoryHint) {
        tip = `Sleuth's Analysis: ${categoryHint}`;
      }
    }

    this.showFeedback(`🔎 Tip: ${tip}`, "success", 10000); // 10 seconds duration
    dispatchMascotAction('reveal'); // Reuse reveal animation for tip
  }

  private async handleCaseSubmission(): Promise<void> {
    const sub = (document.getElementById("submitSubreddit") as HTMLInputElement).value;
    const e1 = (document.getElementById("submitEvidence1") as HTMLTextAreaElement).value;
    const e2 = (document.getElementById("submitEvidence2") as HTMLTextAreaElement).value;
    const e3 = (document.getElementById("submitEvidence3") as HTMLTextAreaElement).value;

    if (!sub || !e1 || !e2 || !e3) {
      this.showFeedback("Please fill in all evidence fields!", "error");
      return;
    }

    this.submitCaseBtn.disabled = true;
    this.submitCaseBtn.textContent = "Submitting...";

    try {
      const res = await GameAPI.submitCommunityCase({
        subreddit: sub,
        evidence: [e1, e2, e3]
      });
      if (res.success) {
        this.showFeedback("✅ Case File Submitted!", "success");
        this.closeModal("submit");
        // Clear form
        (document.getElementById("submitSubreddit") as HTMLInputElement).value = "";
        (document.getElementById("submitEvidence1") as HTMLTextAreaElement).value = "";
        (document.getElementById("submitEvidence2") as HTMLTextAreaElement).value = "";
        (document.getElementById("submitEvidence3") as HTMLTextAreaElement).value = "";
      }
    } catch (error: any) {
      this.showFeedback(error.message || "Failed to submit Case File.", "error");
    } finally {
      this.submitCaseBtn.disabled = false;
      this.submitCaseBtn.textContent = "Submit Case File";
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const game = new SnooCluesGame();
  (window as any).gameInstance = game;
  new GameLoader(game);
});
