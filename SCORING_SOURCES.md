# Lichess scoring provenance

`src/scoring.ts` is a TypeScript adaptation of the algorithms below. It carries SPDX `AGPL-3.0-or-later`, reflecting the Lichess-derived code. Lichess and its contributors retain their copyrights. This local application is not affiliated with or endorsed by Lichess. If distributing or hosting a combined derivative, comply with applicable copyleft/source-availability requirements; do not treat this module as permissively licensed. Full upstream AGPL text: `licenses/lichess-AGPL-3.0.txt`.

## Pinned references

Lichess lila revision **eb024cbad43714392ecce64e8d716c63cd273d00**:
- https://github.com/lichess-org/lila/blob/eb024cbad43714392ecce64e8d716c63cd273d00/modules/analyse/src/main/AccuracyPercent.scala
- https://github.com/lichess-org/lila/blob/eb024cbad43714392ecce64e8d716c63cd273d00/modules/tree/src/main/Advice.scala
- https://github.com/lichess-org/lila/blob/eb024cbad43714392ecce64e8d716c63cd273d00/modules/tree/src/main/eval.scala
- Accuracy regression scenarios adapted from https://github.com/lichess-org/lila/blob/eb024cbad43714392ecce64e8d716c63cd273d00/modules/analyse/src/test/AccuracyPercentTest.scala

Scalachess revision **176d2f70958dd1caa3d9f5bc3bade71b7ebfd311**:
- https://github.com/lichess-org/scalachess/blob/176d2f70958dd1caa3d9f5bc3bade71b7ebfd311/core/src/main/scala/eval.scala

Scalalib revision **68c51f9e0c78848cdb0209a7de1dab8c6f66a885**:
- https://github.com/lichess-org/scalalib/blob/68c51f9e0c78848cdb0209a7de1dab8c6f66a885/lila/src/main/scala/Maths.scala

## Implemented details

- Winning chances: `2 / (1 + exp(-0.00368208 * cp)) - 1` (range -1..1).
- Accuracy Win%: `50 + 50 * winningChances(clamp(cp,-1000,1000))`. Mates saturate to the appropriate endpoint. Terminal M0 uses the stored signed CP sentinel to retain the winner.
- Move accuracy: 100 if winning chances do not decrease; otherwise clamp `103.1668100711649 * exp(-0.04354415386753951 * winPercentLoss) - 3.166924740191411 + 1` to 0..100. The +1 is the current upstream uncertainty bonus, absent from the rounded documentation example.
- Game accuracy: window size `clamp(floor(numberOfMoves/10),2,8)`; prefix-pad first-window weights as upstream; population standard deviations clamped to 0.5..12. Average the per-color weighted arithmetic mean and harmonic mean. The harmonic denominator floors each accuracy at 1. Both players must have at least one scored move.
- Error judgements use **uncapped** winning-chance deltas >= .1/.2/.3 (equivalent to 5/10/15 Win% percentage points). Mate-created/lost exceptions use upstream 700/999 cp boundaries. Continuing a forced mate or merely delaying it receives no mate judgement.
- Best and Good are local UI labels, only assigned when there is no upstream error judgement. There is no Excellent category now.
- Initial position is actually evaluated. Lichess sometimes uses its legacy +15 cp initial fallback. The optional Lichess-compatible mode now matches the pinned manual-request fishnet search profile (see `ANALYSIS_PROFILE.md`), but caches and deployment differences still prevent a numerical parity promise.
- Source revision recorded in job/export metadata as `lichess-eb024cba-v1`. Browser-saved reviews are recomputed from existing evaluations on load; this does not improve the original engine search depth.
