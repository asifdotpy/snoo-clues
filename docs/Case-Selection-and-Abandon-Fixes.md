**Case Selection & Abandon Flow — Findings and Implementation Plan**

Summary
-------
- This document collects the investigation results about two UX/logic issues discovered in the client:
  - abandoning a game does not fully reset the previous game's UI/state
  - the Case Selection modal's close button is hidden or not functioning on first open

Findings (what I observed)
--------------------------------
- Issue 1 — Abandon does not reset game state:
  - Code location: [src/client/main.ts](src/client/main.ts#L191-L210)
  - `executeBackToSelection()` only sets `currentGameMode = null`, dispatches a mascot action and calls `showSelectionHub()`.
  - UI state that remains set after abandon: clue card visibility/classes, clue text content, attempts counter, submit/input enabled state, feedback messages, stamped case state, etc.
  - `updateGameUI()` exists and resets many UI parts, but it is only called during `initGame()` and not when abandoning.

- Issue 2 — Case Selection close button and behavior:
  - HTML: `src/client/index.html` contains a close button with id `closeSelectionModal` inside the selection modal.
  - `showSelectionHub()` contains logic that hides the close button when `this.currentGameMode` is falsy, and shows it when a game exists.
  - The close button's click handler only calls `hideSelectionHub()` if `this.currentGameMode` is truthy. This prevents the modal from being closed on first open.

Desired Behavior
----------------
- Abandoning a game (confirm Yes) should:
  - Fully clear previous game's UI (cards hidden and locked, clue text reset, attempts reset, feedback cleared, submit enabled, case-stamp reset)
  - Reset in-memory game state (`attempts`, `clues`, `isWinner`, `hasPlayed`, `currentGameMode`, etc.)
  - Return to case selection modal (without contaminating future games)

- The Case Selection modal close button should:
  - Be visible and usable whenever the modal is open (independent of `currentGameMode`)
  - Close only the modal and return the UI to the prior state (game view underneath) without changing game state

Proposed Fixes (concise)
-----------------------
1. Add a `resetGameUI()` method in `src/client/main.ts` that performs a thorough UI + state reset. It should:
   - Reset `this.currentGameMode = null`, `this.attempts = 0`, `this.isWinner = false`, `this.hasPlayed = false` and other relevant fields
   - Clear clue texts and re-lock clue cards:
     - ensure `.locked` is present and `.visible` & `.hidden` classes set appropriately
     - set `this.clue2Text.textContent = '???'`, `this.clue3Text.textContent = '???'` (or follow `updateGameUI()` behavior)
   - Reset attempts counter text, feedback message, case-stamped classes, submit/guess input enablement
   - Optionally call `updateGameUI()` or reuse its logic where appropriate

2. Update `executeBackToSelection()` to call `resetGameUI()` before showing the selection hub and dispatching mascot actions. This ensures the game is clean when the user abandons.

3. Fix the close button visibility logic:
   - In `showSelectionHub()` remove the conditional hiding of `closeSelectionBtn`. Always `classList.remove('hidden')` so the button is visible when modal opens.

4. Fix the close button event handler:
   - Remove the `if (this.currentGameMode)` check in the listener so that clicking the button always calls `hideSelectionHub()` (does not change game state).

5. Add small unit/DOM tests:
   - Extend existing `confirm-modal.test.ts` to validate that after confirming abandon, `resetGameUI()` actually clears UI and state.
   - Add tests that the close button is visible on first open and hides the modal when clicked.

Implementation Steps (priority order)
-----------------------------------
1. Implement `resetGameUI()` in `src/client/main.ts`. Keep the method focused and small; reuse `updateGameUI()` where appropriate.
2. Update `executeBackToSelection()` to call `resetGameUI()` before `showSelectionHub()`.
3. Modify `showSelectionHub()` to always show the close button and adjust the close button handler to always call `hideSelectionHub()`.
4. Add tests (or extend existing tests) and run the suite with:

```bash
npx vitest run
```

5. Manually smoke-test in the browser/dev container (open UI, start game, reveal clues, click Change Case Type → confirm abandon → verify UI cleared).

Notes and safety
----------------
- Prefer making UI-only resets in `resetGameUI()` and avoid touching server-side state. `initGame()` will reinitialize when a new game is chosen.
- Keep backwards-compatible behavior: `hideSelectionHub()` should continue to restore the underlying game view when the modal is closed.

References
----------
- Current navigation logic: [src/client/main.ts](src/client/main.ts#L191-L210)
- Case selection template: [src/client/index.html](src/client/index.html#L20-L42)

If you want, I can now implement these code changes and add the tests, run `npx vitest run`, and push the commits. Which step would you like me to do next?
