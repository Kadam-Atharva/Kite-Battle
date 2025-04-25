
# 🪁 Kite Battle Game – Core Functions Overview

This markdown provides an overview of the core functions and classes used in the **Kite Battle** game, along with their approximate line numbers in the respective files.

---

## 🎮 Game Flow Functions (`game.js`)

| Function Name              | Line No. | Description |
|---------------------------|----------|-------------|
| `initializeGame()`        | ~45      | Sets up the canvas, event listeners, and starts the game loop. |
| `prepareGameStart(mode)`  | ~15      | Reads player names and initiates the selected game mode. |
| `startGame(mode, p1, p2)` | ~80      | Initializes the game for the selected mode, creates kite objects. |
| `gameLoop()`              | ~430     | Main rendering and game state handling loop. |
| `updateGame(deltaTime)`   | ~end     | Updates all dynamic game objects including kites, powerups, particles. |
| `drawGame()`              | ~end     | Renders the entire frame: background, kites, UI, effects. |
| `returnToMenu()`          | ~65      | Resets game state and shows the main menu. |
| `showScreen(screenId)`    | ~390     | Handles showing/hiding different game screens. |

---

## 🪁 Kite Object Functions (`objects.js`)

| Class/Function               | Line No. | Description |
|-----------------------------|----------|-------------|
| `class Kite`                | ~1       | Represents a kite, encapsulates movement, health, collision, power-ups. |
| `Kite.update()`             | ~50      | Handles movement, controls, wind, power-ups for a kite. |
| `Kite.draw(ctx)`            | ~90      | Draws the kite on the canvas, including trails and effects. |
| `Kite.dash()`               | ~160     | Applies a quick speed boost, creates dash effects. |
| `Kite.activateDefense()`    | ~190     | Activates a temporary shield around the kite. |
| `Kite.takeDamage()`        | ~220     | Applies damage to kite, shows particle effects. |
| `Kite.checkPowerUpCollisions()` | ~260 | Checks and handles collisions with power-ups. |
| `createParticle()`         | ~300     | Creates particle effects like sparkles, dashes, collisions. |

---

> 💡 Tip: You can refer to these line numbers to navigate quickly while presenting or debugging.
