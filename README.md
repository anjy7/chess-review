# Local Chess Review

React + TypeScript frontend, Node.js + Effect backend, native Stockfish 19. Single-user app bound to localhost. No engine subscription or cloud analysis.

## Run (Windows)

Node.js 22 or newer is recommended. Dependencies, engine, and production build have already been installed in this working directory.

```powershell
cd C:\Users\Anjy\chess-review-local
npm start
```

Open **http://127.0.0.1:8765**. Stop with Ctrl+C.

For a fresh installation:

```powershell
npm ci
npm run setup:engine
npm run build
npm start
```

The setup script downloads the official `sf_19` Windows release, checks its published SHA-256, and extracts it into `engines/`. To use a different installation or non-Windows OS, set `STOCKFISH_PATH` to the executable. The app displays version 19 branding; choose Stockfish 19 when overriding the path.

Development: `npm run dev`, then http://127.0.0.1:5173. Effect runs on the backend; React manages UI state without introducing an Effect runtime into the browser.

## Use

1. Paste a completed Chess.com `/game/live/ID`, `/game/daily/ID`, or `/analysis/game/live/ID` link. Automatic player lookup is attempted. If blocked, enter either player's username or use PGN.
2. Alternatively paste or upload a PGN. **Nonempty PGN takes precedence over the link.** Try demo loads Morphy's Opera Game.
3. Choose an analysis mode, then Analyze game. The gear button opens the review settings drawer. **Lichess-compatible · 1M budget** is the default: a fixed-node backwards search matching the pinned manual-request profile. Progress updates during the run; move labels appear when complete. Quick/Standard/Deep/Thorough timed modes still publish moves progressively. Both modes can be cancelled.
4. Completed analysis opens the summary with real accuracy and move-category counts. Click **Start Review** to step through the game; the back arrow returns to the summary. Select moves, use arrow keys, play/pause automatic playback, or click the filled evaluation graph to navigate. **Play best line** opens the engine continuation **before** the selected move, at its starting position. Use Next/Back, arrow keys, or variation move buttons to step through it. **Return to game** (or Escape) restores your original review position.
5. Click a piece and destination, or drag a piece, to explore your own continuation. Pointer-based dragging follows the mouse or touch directly, pulls gently toward legal square centers, and slides home on illegal/outside drops; Escape cancels dragging (promotion prompts for q/r/b/n). Every explored position receives fresh Stockfish analysis; the Analysis tab also evaluates main-game positions. **Explore engine line** adds the current recommendation as a step-through continuation. Playing another move replaces the continuation after your variation cursor. Variations are temporary, not exported or a persistent multi-branch tree.
6. The Sound toggle controls original synthesized move/capture/check/checkmate cues and persists in your browser. The layout now follows the seven supplied screenshots: large board without sidebar, coach speech bubble, summary table, filled graph, board move badges, figurine notation, bent knight arrows and bottom navigation. Coordinates sit outside the squares; board sizing is snapped to whole CSS-pixel squares. Piece art is rendered as inline SVG rather than an image to avoid image resampling, with normal curve antialiasing retained. Move-quality badges use shared vector shapes rather than font glyphs. Pieces use Cburnett’s classic transparent SVG set from Wikimedia Commons (CC BY-SA 3.0), served locally; attribution, file sources and changes are recorded in `public/pieces/cburnett/NOTICE.md` and `sources.json`. The graph uses its measured pixel dimensions so markers stay circular and strokes stay sharp. Moves ease into place over 150–240 ms (distance-adjusted), followed by a destination-anchored SVG badge and temporary label; reduced-motion preferences are respected. Castling, captures, promotion and backward navigation have geometry tests. The coach is an original project SVG illustration. Screenshot crops and their local extraction helper are excluded from the published repository. Clocks show imported PGN `[%clk H:MM:SS]` timestamps at each original-game position (and the starting allotment for simple TimeControl headers). Missing timestamps and explored variations show a dash; times are never estimated or counted down. Re-import older saved games to populate their clock data. Summary actions remain in normal document flow rather than covering statistics. Opponent names, evaluations and summary stats come from the imported game, not the reference screenshots.
7. Save review stores the latest five reviews in this browser and downloads a JSON backup. Open Import game → Saved reviews to reopen locally stored reviews. Downloaded JSON is an export only; JSON re-import is not yet implemented.

## Boundaries and scoring

- Standard chess only; 1–800 half-moves; 200 KB PGN limit.
- Link import uses a best-effort Chess.com callback to identify players, then the public monthly archives. Only the most recent 24 archived months are searched. Private/unpublished games, service outages, and changed APIs may require PGN. It does not log into your account or bypass access controls.
- Stockfish analysis is entirely local. Game importing and installation require internet. No external fonts, scripts, or chess-piece assets are used at runtime.
- One review at a time. Timed modes use up to four CPU threads and 128 MB hash with 0.1–3 seconds per position. Compatibility mode uses one thread, 16 MB hash, and a nominal 1M-node budget (857,142 nodes per search after fishnet's overlap adjustment), including backwards chunks and warm-ups. Duration depends on CPU speed; it does not have a target depth. See `ANALYSIS_PROFILE.md` for verified settings and limitations.
- Live position analysis uses a separate 600 ms, one-thread/16 MB search, not the full-review 1M-node profile. It is debounced and superseded requests are interrupted; it pauses while a full review runs. The server permits one live position request at a time (single-user). The complete starting FEN and move history are sent to preserve repetition context. Quick results may change with deeper analysis.
- Evaluations are from White's perspective. Mate is represented as M with a signed distance (M0 at checkmate). History is supplied to Stockfish for repetition handling.
- Scoring now follows pinned Lichess source: winning-chance judgements (roughly 5/10/15 percentage-point drops for Inaccuracy/Mistake/Blunder), including its special mate-created/mate-lost cases. Best/Good are app-only convenience labels for moves without a Lichess error judgement. Matching the engine's preferred move does not override the computed score.
- Move accuracy uses Lichess's full-precision exponential formula, including its current +1 uncertainty bonus. Game accuracy combines a volatility-weighted mean with a harmonic mean; windows, clamps, color alignment, and mate handling follow upstream. One-ply games have no two-player aggregate. Evaluation bar/graph use winning chances too.
- The method matches pinned Lichess scoring, but the numbers need not match lichess.org: engine budgets, versions, and initial-position evaluations differ. We evaluate the actual initial position rather than substituting Lichess's legacy +15 cp default. Short timed searches remain noisy. See `SCORING_SOURCES.md` for exact source revisions and formulas.
- Old browser-saved reviews are rescored in memory from their stored evaluations when loaded; saving again persists/exports the new scoring version. No engine rerun is required. Old downloaded JSON files are not modified.
- This is **not Chess.com's accuracy algorithm**. There are no proprietary Brilliant labels, estimated Elo ratings, tablebases, or LLM coach. Book markers and opening names/ECO codes come from a bundled, pinned Lichess CC0 opening collection, not an exhaustive theory database. Book labels replace the display category only; evaluation-based accuracy is unchanged. Named positions support transpositions and persist after leaving book. Re-import old saved games to add opening annotations. See `data/openings/NOTICE.md`. Text explanations are basic, rules-based comparisons.
- Jobs are ephemeral (last ten until restart); saved reviews remain in browser storage for the same host and port. This server is not intended for internet/LAN deployment or multiple users.

## Architecture

- `src/App.tsx`: React UI, chess.js legal variations, local saves.
- `src/usePieceDrag.tsx`: mouse/touch pointer capture, legal-square attraction, drop/snap-back and cancellation.
- `src/ChessPiece.tsx`, `src/board-motion.ts`: scalable piece art and adjacent-position animation.
- `server/openings.ts`, `data/openings/`: local opening names and book transitions; regenerate with `node scripts/setup-openings.mjs`.
- `src/MoveFeedback.tsx`: orientation-aware feedback placement and shared SVG icons.
- `src/EvaluationGraph.tsx`: responsive, un-stretched SVG graph with keyboard navigation.
- `src/ReviewSummary.tsx`: truthful accuracy/category summary and review entry point.
- `public/pieces/cburnett/`: twelve transparent Wikimedia SVGs and attribution/license records.
- `public/coach.svg`: original coach illustration, licensed with the application.
- `src/sound.ts`: original Web Audio synthesis, no proprietary audio files.
- `server/position.ts`: validates full legal move histories and scopes live engine searches.
- `src/types.ts`: shared API shapes.
- `server/game.ts`: PGN validation and link import.
- `src/scoring.ts`: shared Lichess-derived scoring and saved-review migration (AGPL-3.0-or-later; see `SCORING_SOURCES.md`).
- `server/engine.ts`: interruptible UCI commands. Effect.acquireRelease + Effect.scoped guarantee engine cleanup; command timeouts and AbortSignal interruption stop failed/cancelled work.
- `server/index.ts`: Express JSON API, bounded job state, localhost/origin guards, production static serving.
- `server/review.ts`: Effect orchestration for timed and backwards node-budget reviews.
- `server/analysis-profile.ts`: pinned fishnet profile, chunk scheduler, standard/UCI_Chess960 castling conversion.
- `scripts/setup-engine.mjs`: official release download and digest verification.

The abandoned Python/plain-JavaScript prototype is archived under ignored `.scratch/legacy/`; it is not used.

## Verify

```powershell
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Core tests require the installed engine. Browser tests start/stop a server on port 8765 (stop your existing instance first), exercise import/review/navigation/variations/saves/cancellation and mobile layout, and save screenshots to `.scratch/`. A separate live Chess.com probe reports PASS or INCONCLUSIVE depending on external availability.

## Stockfish licensing

The application is licensed under **AGPL-3.0-or-later** (see `LICENSE`), including the Lichess-derived scoring. Third-party pieces retain their CC BY-SA 3.0 license and the opening dataset is CC0; their notices remain bundled in the source tree. Screenshot-derived assets are not distributed.

Stockfish is GPLv3. This local project downloads its official binary, retaining bundled license, author, and source references. Before redistributing Stockfish with an application, meet the GPL's corresponding-source and notice obligations. Official source: https://github.com/official-stockfish/Stockfish/tree/sf_19 . Other dependencies retain their respective licenses.
