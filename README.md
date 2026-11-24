# Stockfish Chess Reviewer

Review your chess games locally with Stockfish 19. Built with React, TypeScript, Node.js, and Effect.

## Features

- Import games from Chess.com links or PGN files.
- Review move accuracy, evaluations, and game summaries.
- Explore Stockfish recommendations and play your own variations with live analysis.
- Identify openings, ECO codes, and book moves.
- Navigate with the evaluation graph, keyboard shortcuts, or autoplay.
- Smooth click-to-move and magnetic drag-and-drop, with touch support.
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

1. Import a Chess.com game, paste or upload a PGN, or select **Try demo**.
2. Choose an analysis mode in Settings and click **Analyze game**.
3. Click **Start Review** to step through your moves.
4. Select **Play best line** or move pieces on the board to explore variations.
5. Use **Return to game** or **Esc** to return to the review.

Use **← / →** to step through moves. **Save review** stores the review in your browser and downloads a JSON copy.

## How it works

- **Engine analysis:** Stockfish 19 searches possible continuations and scores positions with its NNUE neural-network evaluator. Analysis uses either a fixed node budget or a time limit per position.
- **Move accuracy:** Lichess-derived formulas convert evaluations into winning chances, then turn the drop after each move into a 0–100 accuracy score using an exponential curve.
- **Game accuracy:** Each player's score averages a volatility-weighted mean and a harmonic mean of move accuracies, emphasizing changing positions and costly mistakes.
- **Move labels:** Winning-chance drops of roughly 5, 10, and 15 percentage points mark inaccuracies, mistakes, and blunders, with separate rules for forced-mate transitions. Other moves are labeled Best when they match the engine's recommendation, or Good otherwise.
- **Openings:** Board positions are matched against a local opening database to identify names and ECO codes, including transpositions. Recorded opening transitions receive Book labels while retaining their accuracy scores.

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
