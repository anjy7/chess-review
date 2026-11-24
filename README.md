# Stockfish Chess Reviewer

Review your chess games locally with Stockfish 19. Built with React, TypeScript, Node.js, and Effect.

## Features

- Import games from Chess.com links or PGN files, or pick from a username’s five latest completed games.
- Review move accuracy, evaluations, and game summaries.
- Explore Stockfish recommendations and play your own variations with live analysis.
- Open **View decision tree** for a top-down tree with three candidate moves, evaluations, expandable replies, and branch-to-board exploration.
- Identify openings, ECO codes, and book moves.
- Navigate with the evaluation graph, keyboard shortcuts, or autoplay.
- Smooth click-to-move and magnetic drag-and-drop, with touch support.
- Switch between recent games and saved analyses in two scrollable library lists.
- Display captured pieces and the material lead beneath each player's name.
- Replay recorded game clocks and save reviews locally.

## Getting started

Install [Node.js 22+](https://nodejs.org/), then run:

```sh
git clone https://github.com/anjy7/chess-review.git
cd chess-review
npm ci
npm run setup:engine
npm run build
npm start
```

Open **http://127.0.0.1:8765**.

The engine setup script installs Stockfish 19 on Windows. For an existing installation or another platform, set `STOCKFISH_PATH` to your Stockfish executable instead.

## Usage

1. Enter a Chess.com username and click **Find recent games**, then choose a game and **Import selected game**. You can also paste a game link, upload a PGN, or select **Try demo**.
2. Choose an analysis mode in Settings and click **Analyze game**.
3. Click **Start Review** to step through your moves.
4. Select **Play best line** or move pieces on the board to explore variations.
5. Use **Return to game** or **Esc** to return to the review.

**View decision tree** searches the current position with Stockfish MultiPV 3 (one thread, one second per expansion). Expand replies on demand or choose **Show on board** to play a branch. Each candidate shows move accuracy and winning-chance loss relative to the best candidate in that parent search, using the review’s scoring formulas. Move text matches the player making the move; white/black bars show the advantage using the same scale as the main board; the display is a candidate-move tree, not Stockfish’s full internal search tree. Closing the popup cancels its active search.

Use **← / →** to step through moves. **Save review** stores the review in your browser and downloads a JSON copy. All saved reviews appear in the library with the original game ID and played date/time when present in the PGN (UTC is labeled); saving the same game again updates its entry. Click outside the import dialog or press **Esc** to close it.

## Analysis modes

Every mode uses Stockfish 19 to evaluate positions and find the strongest continuation. Choose a mode in Settings before analyzing a game.

| Mode | Search budget | Best for |
| --- | --- | --- |
| **Lichess-compatible** (default) | 1M nominal nodes per position | Consistent search effort using a Lichess fishnet-style profile. |
| **Quick** | 0.1 seconds per position | A fast overview of the game. |
| **Standard** | 0.3 seconds per position | Everyday reviews with a balance of speed and search time. |
| **Deep** | 1 second per position | Giving Stockfish more time to investigate tactics and alternatives. |
| **Thorough** | 3 seconds per position | The longest timed search for a detailed review. |

### Fixed-node analysis

Lichess-compatible mode limits search work rather than elapsed time. A node is a position visited during the search. It works backward through the game in groups, with warm-up searches and a cleared engine cache between groups. The nominal 1M budget becomes **857,142 nodes per search** after fishnet's overlap adjustment. By default, **16 Stockfish workers** process independent groups in parallel, each using **one CPU thread and 16 MB of hash memory**. Change **Workers** (1–32) in Settings; your choice is remembered in this browser. Short games use fewer workers than requested when there are fewer groups. The per-position budget is unchanged.

### Timed analysis

Quick, Standard, Deep, and Thorough analyze positions from start to finish, showing results progressively. Each position gets the selected time allowance, using **up to four CPU threads and 128 MB of hash memory**. Longer searches let Stockfish explore more possibilities; the depth reached depends on the position and hardware.

### Live analysis

Exploring a variation or opening the Analysis tab triggers a fresh **0.6-second search** for the current position. Moving again replaces the previous request, keeping recommendations focused on the position you're viewing.

All full-game modes use the same Lichess-derived accuracy scoring; the search budget determines the evaluations fed into it.

## Development

```sh
npm run dev
```

Open **http://127.0.0.1:5173**.

### Tests

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

Install the engine before testing. Stop the running app before browser tests so port 8765 is available.

## License

[AGPL-3.0-or-later](LICENSE). [Stockfish](https://github.com/official-stockfish/Stockfish) is GPLv3. Chess pieces by [Cburnett](public/pieces/cburnett/NOTICE.md) are CC BY-SA 3.0. The [opening dataset](data/openings/NOTICE.md) is CC0.
