# 🎮 Snoo-Clues UI State Machine

This diagram represents the valid transitions between UI states in the Snoo-Clues application.

```mermaid
stateDiagram-v2
    [*] --> Initializing: Page Load
    Initializing --> SelectionHub: GameLoader Done

    SelectionHub --> DailyGame: Choose Daily
    SelectionHub --> ColdCase: Choose Cold Case

    state DailyGame {
        [*] --> Clue1Revealed
        Clue1Revealed --> Clue2Revealed: Click Reveal 2
        Clue2Revealed --> Clue3Revealed: Click Reveal 3
        Clue3Revealed --> Guessing
        Clue1Revealed --> Guessing
        Guessing --> Guessing: Incorrect (Feedback)
        Guessing --> WinModal: Correct Guess
        Guessing --> SelectionHub: Click Back (Abandon)
    }

    state ColdCase {
        [*] --> CC_Clue1Revealed
        CC_Clue1Revealed --> CC_Clue2Revealed
        CC_Clue2Revealed --> CC_Clue3Revealed
        CC_Clue3Revealed --> CC_Guessing
        CC_Guessing --> CC_Guessing: Incorrect
        CC_Guessing --> WinModal: Correct Guess
        CC_Guessing --> SelectionHub: Click Back
    }

    WinModal --> SelectionHub: Close/Back
    WinModal --> ColdCase: Keep Training

    PlayedModal --> SelectionHub: View Clues
    PlayedModal --> ColdCase: Browse Cold Cases
```

## State Descriptions

- **Initializing**: GameMaker engine loading (z-index 2000).
- **SelectionHub**: Entry point for picking a case file (z-index 1000).
- **DailyGame / ColdCase**: The main investigation notebook (z-index 100).
- **WinModal**: Mystery solved celebration (z-index 1000).
- **PlayedModal**: Displayed if the daily puzzle was already completed.
- **Abandon (Confirm)**: Confirmation dialog when attempting to leave an active investigation.
