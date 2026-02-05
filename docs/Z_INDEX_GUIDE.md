# Snoo-Clues Z-Index Hierarchy Guide

This document defines the standardized z-index layers used in the Snoo-Clues application to prevent layering conflicts and ensure interactive elements are properly accessible.

## CSS Variables

Z-indices are managed via CSS custom properties defined in `src/client/styles/_reset.css`:

| Variable | Value | Purpose |
| :--- | :--- | :--- |
| `--z-base` | 1 | Background decorative elements, watermark text. |
| `--z-clue` | 10 | The main game container and clue cards. |
| `--z-overlay` | 100 | The game overlay wrapper and stamps. |
| `--z-dropdown` | 200 | Navigation dropdowns and floating menus. |
| `--z-modal-backdrop` | 999 | Darkened backdrop for modal dialogs. |
| `--z-modal` | 1000 | Case selection, Victory, and Confirmation modals. |
| `--z-loading` | 2000 | Initial GameMaker engine loading screen. |
| `--z-alert` | 3000 | Critical system alerts or notifications. |

## Usage Guidelines

1. **Always use variables**: Do not hardcode numeric `z-index` values in CSS. Use `z-index: var(--z-modal);`.
2. **Contextual layering**: Ensure that elements intended to be clickable are not obscured by higher-layer transparent containers.
3. **Stacking contexts**: Remember that `z-index` only works on positioned elements (`relative`, `absolute`, `fixed`).

## Layering Diagram (Bottom to Top)

1. GameMaker Canvas (base layer)
2. `game-container.cold-case::after` (`--z-base`)
3. `.game-container` (`--z-clue`)
4. `.game-overlay` (`--z-overlay`)
5. `.modal` (`--z-modal`)
6. `.loading` (`--z-loading`)
