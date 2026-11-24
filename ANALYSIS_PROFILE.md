# Lichess-compatible local analysis

Profile: `fishnet-17d4d063-manual-v1`. This matches the inspected source's ordinary manual-request configuration, **not a guarantee that a particular lichess.org review has identical evaluations**. No requests are made to fishnet and no API key is needed.

## Source pins and settings

- lila `eb024cbad43714392ecce64e8d716c63cd273d00`, `modules/fishnet/src/main/Work.scala`: manual request nominal budget **1,000,000 nodes**, broadcasts 5M, automated work smaller. We implement manual request only.
- fishnet `17d4d06359af8f6c25e432deca7f6cfe26d90177`, `src/api.rs`: `NodeLimit::get` scales the nominal budget by **6/7** to account for chunk overlap: actual `go nodes 857142` per search. There is no depth or movetime search limit in our profile.
- `src/queue.rs` + `src/ipc.rs`: initial position plus all post-move positions, reverse order, five real positions per chunk. Prepend one warm-up position (last position repeated for the first chunk, previous chunk's final position for subsequent chunks). Discard warm-up results. We implement the no-skipped-positions path.
- `src/stockfish.rs`: clear hash with `ucinewgame` at chunk boundaries, MultiPV 1, Skill Level 20, UCI_Chess960 true. Default Stockfish options are Threads 1 and Hash 16 MB; our implementation sets them explicitly. Standard chess castling notation is converted in both directions at the UCI boundary. This does not add Chess960 game support.
- fishnet's Stockfish submodule: **edb0d9db6731067ec50ce619ff372b463bc4dd5d**. The official `sf_19` release tag resolves to this same commit. `scripts/setup-engine.mjs` installs that official release and verifies its published archive digest. Default NNUE: `nn-1a298aa575a0.nnue`.
- AnalysisBuilder in pinned lila stores the evaluated initial score when available. We evaluate the initial position rather than replacing it with the legacy +15 cp fallback.

URLs: https://github.com/lichess-org/fishnet/tree/17d4d06359af8f6c25e432deca7f6cfe26d90177 and https://github.com/lichess-org/lila/tree/eb024cbad43714392ecce64e8d716c63cd273d00/modules/fishnet/src/main .

## Local behavior

- Select **Lichess-compatible · 1M budget** (default UI selection). Timed 0.1/0.3/1/3-second modes remain available. The API preserves its legacy timed default if `mode` is omitted; explicitly send `mode: "lichess"` to select compatibility mode.
- A pool of 16 single-threaded local engines (default, configurable from 1–32 in Settings or the API's integer `workers` field) processes independent chunks in parallel. The pool is capped at the number of chunks. Each engine still resets its hash and performs the complete warm-up/position sequence for every assigned chunk. Progress counts real positions, not warm-ups. Since analysis runs backwards, chronological move labels are published at completion. Cancellation or a worker failure interrupts the pool and releases every engine; interrupted compatibility jobs do not expose a partial score.
- Actual depth, nodes, and elapsed milliseconds are captured. Job/export metadata includes mode, profile, nominal/effective node budgets, engine name, network name, and requested/effective worker counts. Open a reviewed move to see its depth and node count.
- A **120-second safety timeout per search** fails the job rather than silently reporting a truncated search as complete. This is a local lifecycle safeguard, not a fishnet search parameter. Terminal checkmate/stalemate/insufficient-material positions return zero-node results. In compatibility mode repetition/fifty-move handling is left to Stockfish rather than pre-adjudicating claimable draws.
- Compatibility initialization checks the engine identifies as Stockfish 19 and advertises the expected network. This is a compatibility check, not cryptographic attestation of a user-supplied `STOCKFISH_PATH`; use the checksum-verified installer for the known official binary.

## Remaining differences

Lichess can reuse cached evaluations and skip searches; those caches and production deployment details are not available locally. The local mode uses fresh no-skip analysis, not a reproduction of an existing cached website review. Distributed worker assignment/build architecture and live site revisions can differ. Chess.js and shakmaty have different terminal-position implementations in edge cases, although standard-game mate/stalemate/material cases are handled. We do not run broadcasts, variants, server retry policies, opening-cache merging, or adaptive server work. Scores may therefore differ even though the selected published search procedure and scoring are matched.

## Provenance and license

The scheduling adaptation derives from fishnet (GPL-3.0-or-later), copyright its contributors. The combined scoring-related code is marked AGPL-3.0-or-later (compatible incorporation of GPLv3 code into the AGPLv3 combined work). Preserve notices and comply with corresponding-source obligations before redistribution or hosting. Upstream fishnet license is retained at `licenses/fishnet-GPL-3.0.txt`; Lichess scoring attribution is in `SCORING_SOURCES.md`.
