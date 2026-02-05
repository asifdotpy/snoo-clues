import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Confirmation Modal for Mode Change', () => {
  let confirmModal: HTMLElement;
  let confirmYesBtn: HTMLButtonElement;
  let confirmNoBtn: HTMLButtonElement;
  let mockGameInstance: any;

  beforeEach(() => {
    // Setup DOM elements
    document.body.innerHTML = `
      <div class="modal hidden" id="confirmModal">
        <div class="modal-content">
          <h2>Abandon Case?</h2>
          <p>You have progress in this investigation. Changing modes will reset your progress. Are you sure you want to continue?</p>
          <div class="modal-actions">
            <button id="confirm-yes-btn" class="modal-btn">Yes, Abandon</button>
            <button id="confirm-no-btn" class="modal-btn secondary">No, Stay</button>
          </div>
        </div>
      </div>

      <div id="clue2Card" class="card">
        <div id="clue2Text"></div>
      </div>
      <div id="clue3Card" class="card">
        <div id="clue3Text"></div>
      </div>
      <div id="selectionModal" class="modal hidden">
        <div class="modal-content"></div>
      </div>
      <div id="gameOverlay"></div>
    `;

    confirmModal = document.getElementById('confirmModal')!;
    confirmYesBtn = document.getElementById('confirm-yes-btn') as HTMLButtonElement;
    confirmNoBtn = document.getElementById('confirm-no-btn') as HTMLButtonElement;

    // Mock game instance methods
    mockGameInstance = {
      confirmModal: confirmModal,
      confirmYesBtn: confirmYesBtn,
      confirmNoBtn: confirmNoBtn,
      clue2Card: document.getElementById('clue2Card'),
      clue3Card: document.getElementById('clue3Card'),
      selectionModal: document.getElementById('selectionModal'),
      gameOverlay: document.getElementById('gameOverlay'),
      attempts: 0,
      isWinner: false,
      currentGameMode: 'daily',

      showModal(t: string): void {
        const modalMap: any = {
          confirm: this.confirmModal,
        };
        modalMap[t].classList.remove('hidden');
      },

      closeModal(t: string): void {
        const modalMap: any = {
          confirm: this.confirmModal,
        };
        modalMap[t].classList.add('hidden');
      },

      executeBackToSelection(): void {
        this.currentGameMode = null;
        this.showSelectionHub();
      },

      showSelectionHub(): void {
        this.selectionModal.classList.remove('hidden');
        if (!this.currentGameMode) {
          this.gameOverlay.classList.add('hidden');
        }
      },

      goBackToSelection(): void {
        const hasProgress = this.attempts > 0 ||
          this.clue2Card.classList.contains('visible') ||
          this.clue3Card.classList.contains('visible');

        if (hasProgress && !this.isWinner) {
          this.showModal('confirm');
          return;
        }

        this.executeBackToSelection();
      },
    };
  });

  describe('Modal Visibility', () => {
    it('should hide the confirmation modal by default', () => {
      expect(confirmModal.classList.contains('hidden')).toBe(true);
    });

    it('should show the confirmation modal when there is progress', () => {
      mockGameInstance.attempts = 1;
      mockGameInstance.goBackToSelection();
      expect(confirmModal.classList.contains('hidden')).toBe(false);
    });

    it('should show the confirmation modal when clue 2 is revealed', () => {
      mockGameInstance.clue2Card.classList.add('visible');
      mockGameInstance.goBackToSelection();
      expect(confirmModal.classList.contains('hidden')).toBe(false);
    });

    it('should show the confirmation modal when clue 3 is revealed', () => {
      mockGameInstance.clue3Card.classList.add('visible');
      mockGameInstance.goBackToSelection();
      expect(confirmModal.classList.contains('hidden')).toBe(false);
    });

    it('should not show confirmation modal if no progress was made', () => {
      mockGameInstance.attempts = 0;
      mockGameInstance.clue2Card.classList.remove('visible');
      mockGameInstance.clue3Card.classList.remove('visible');
      mockGameInstance.goBackToSelection();
      expect(confirmModal.classList.contains('hidden')).toBe(true);
    });

    it('should not show confirmation modal if game is already won', () => {
      mockGameInstance.attempts = 5;
      mockGameInstance.isWinner = true;
      mockGameInstance.goBackToSelection();
      expect(confirmModal.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Button Interactions', () => {
    beforeEach(() => {
      // Show the modal before testing buttons
      mockGameInstance.attempts = 1;
      mockGameInstance.showModal('confirm');
    });

    it('should close modal and abandon case when "Yes, Abandon" is clicked', () => {
      // Initial state
      expect(mockGameInstance.currentGameMode).toBe('daily');
      expect(confirmModal.classList.contains('hidden')).toBe(false);

      // Simulate button click behavior
      mockGameInstance.closeModal('confirm');
      mockGameInstance.executeBackToSelection();

      // Assert modal is closed
      expect(confirmModal.classList.contains('hidden')).toBe(true);
      // Assert game mode is reset
      expect(mockGameInstance.currentGameMode).toBe(null);
      // Assert selection hub is shown
      expect(mockGameInstance.selectionModal.classList.contains('hidden')).toBe(false);
    });

    it('should close modal and keep game when "No, Stay" is clicked', () => {
      const initialMode = mockGameInstance.currentGameMode;

      // Simulate button click behavior
      mockGameInstance.closeModal('confirm');

      // Assert modal is closed
      expect(confirmModal.classList.contains('hidden')).toBe(true);
      // Assert game mode is NOT changed
      expect(mockGameInstance.currentGameMode).toBe(initialMode);
      // Assert selection hub is NOT shown
      expect(mockGameInstance.selectionModal.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Modal Content', () => {
    it('should have the correct heading', () => {
      const heading = confirmModal.querySelector('h2');
      expect(heading?.textContent).toBe('Abandon Case?');
    });

    it('should have descriptive text about progress loss', () => {
      const paragraph = confirmModal.querySelector('p');
      expect(paragraph?.textContent).toContain('You have progress in this investigation');
      expect(paragraph?.textContent).toContain('Changing modes will reset your progress');
    });

    it('should have exactly two action buttons', () => {
      const buttons = confirmModal.querySelectorAll('.modal-btn');
      expect(buttons.length).toBe(2);
    });

    it('should have correct button labels', () => {
      const buttons = confirmModal.querySelectorAll('.modal-btn');
      expect(buttons[0].textContent).toBe('Yes, Abandon');
      expect(buttons[1].textContent).toBe('No, Stay');
    });

    it('should have correct button IDs', () => {
      expect(confirmYesBtn.id).toBe('confirm-yes-btn');
      expect(confirmNoBtn.id).toBe('confirm-no-btn');
    });

    it('should have secondary styling on No button', () => {
      expect(confirmNoBtn.classList.contains('secondary')).toBe(true);
      expect(confirmYesBtn.classList.contains('secondary')).toBe(false);
    });
  });

  describe('Progress Detection', () => {
    it('should detect progress when attempts are made', () => {
      mockGameInstance.attempts = 1;
      mockGameInstance.goBackToSelection();
      expect(confirmModal.classList.contains('hidden')).toBe(false);
    });

    it('should detect progress when multiple attempts are made', () => {
      mockGameInstance.attempts = 3;
      mockGameInstance.goBackToSelection();
      expect(confirmModal.classList.contains('hidden')).toBe(false);
    });

    it('should detect progress when clue card is visible', () => {
      mockGameInstance.clue2Card.classList.add('visible');
      mockGameInstance.goBackToSelection();
      expect(confirmModal.classList.contains('hidden')).toBe(false);
    });

    it('should detect no progress when all conditions are false', () => {
      mockGameInstance.attempts = 0;
      mockGameInstance.clue2Card.classList.remove('visible');
      mockGameInstance.clue3Card.classList.remove('visible');
      mockGameInstance.isWinner = false;
      mockGameInstance.goBackToSelection();
      expect(confirmModal.classList.contains('hidden')).toBe(true);
    });

    it('should bypass confirmation for winners', () => {
      mockGameInstance.attempts = 5;
      mockGameInstance.isWinner = true;
      mockGameInstance.goBackToSelection();
      expect(confirmModal.classList.contains('hidden')).toBe(true);
      expect(mockGameInstance.currentGameMode).toBe(null);
    });
  });

  describe('Game Mode Transitions', () => {
    it('should handle transition from daily to cold case', () => {
      mockGameInstance.currentGameMode = 'daily';
      mockGameInstance.attempts = 1;
      mockGameInstance.goBackToSelection();
      mockGameInstance.closeModal('confirm');
      mockGameInstance.executeBackToSelection();
      
      expect(mockGameInstance.currentGameMode).toBe(null);
      expect(confirmModal.classList.contains('hidden')).toBe(true);
    });

    it('should handle transition from cold case to daily', () => {
      mockGameInstance.currentGameMode = 'unlimited';
      mockGameInstance.attempts = 1;
      mockGameInstance.goBackToSelection();
      mockGameInstance.closeModal('confirm');
      mockGameInstance.executeBackToSelection();
      
      expect(mockGameInstance.currentGameMode).toBe(null);
      expect(confirmModal.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Modal Type Handling', () => {
    it('should correctly add hidden class to confirm modal', () => {
      mockGameInstance.showModal('confirm');
      expect(confirmModal.classList.contains('hidden')).toBe(false);
    });

    it('should correctly remove hidden class from confirm modal', () => {
      mockGameInstance.showModal('confirm');
      mockGameInstance.closeModal('confirm');
      expect(confirmModal.classList.contains('hidden')).toBe(true);
    });
  });
});
