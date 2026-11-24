import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGame} from '../server/game';
import {moveLabel} from '../src/move-label';
test('local opening index recognizes named positions and real book transitions',()=>{
 const game=parseGame('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *');
 assert.match(game.opening!.name,/Ruy Lopez/);assert.match(game.opening!.eco,/^C/);
 assert.ok(game.moves.every(move=>move.book));assert.equal(moveLabel(game,0,'Best'),'Book');
 assert.equal(game.moves[0].opening?.name,"King's Pawn Game");
});
test('out-of-book move retains the last opening name without marking every later move book',()=>{
 const game=parseGame('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Bc4 Ra7 *');
 assert.equal(game.moves.at(-1)?.book,false);assert.ok(game.opening?.name);
 assert.equal(moveLabel(game,7,'Mistake'),'Mistake');
});
test('opening detection handles transpositions and ignores setup puzzles',()=>{
 const a=parseGame('1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 *');
 const b=parseGame('1. c4 Nf6 2. Nc3 e6 3. d4 Bb4 *');
 assert.deepEqual(a.opening,b.opening);assert.match(a.opening!.name,/Nimzo-Indian/);
 const setup=parseGame('[SetUp "1"]\n[FEN "8/8/8/8/8/4k3/8/R3K3 w Q - 0 1"]\n\n1. Ra3+ *');assert.equal(setup.opening,undefined);assert.equal(setup.moves[0].book,undefined);
});
