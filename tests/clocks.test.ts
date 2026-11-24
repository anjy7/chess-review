import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGame} from '../server/game';
import {parseClock,clockAt,formatClock} from '../src/clocks';
const pgn='[Event "Live Chess"]\n[TimeControl "300+2"]\n\n1. e4 {[%clk 0:04:59.5]} e5 {[%clk 0:04:58]} 2. Nf3 {[%clk 0:04:57]} Nc6 *';
test('PGN clocks survive parsing and PGN round-trip, without filling missing annotations',()=>{
 const game=parseGame(pgn);assert.deepEqual(game.moves.map(m=>m.clockSeconds),[299.5,298,297,undefined]);
 assert.deepEqual(parseGame(game.pgn).moves,game.moves);
 assert.equal(clockAt(game,0,true),300);assert.equal(clockAt(game,0,false),300);
 assert.equal(clockAt(game,1,true),299.5);assert.equal(clockAt(game,1,false),300);
 assert.equal(clockAt(game,3,true),297);assert.equal(clockAt(game,3,false),298);
 assert.equal(clockAt(game,4,false),undefined);assert.equal(clockAt(game,2,true),299.5);
});
test('clock formats and unsupported/missing fields do not fabricate time',()=>{
 assert.equal(parseClock('[%emt 0:01:00]'),undefined);assert.equal(parseClock('[%clk 0:65:10]'),undefined);
 assert.equal(parseClock('[%clk -1:00:00]'),undefined);assert.equal(parseClock('[%clk 0:00:00]'),0);
 assert.equal(formatClock(299.5),'4:59');assert.equal(formatClock(3661),'1:01:01');assert.equal(formatClock(0),'0:00');assert.equal(formatClock(undefined),'—:—');
 const game=parseGame('1. e4 *');assert.equal(clockAt(game,0,true),undefined);
 game.headers.TimeControl='40/7200:3600';assert.equal(clockAt(game,0,true),undefined);
});
test('black-to-move FEN and repeated board placements retain the correct clock side',()=>{
 const game=parseGame('[SetUp "1"]\n[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1"]\n[TimeControl "60"]\n\n1... Nf6 {[%clk 0:00:55]} 2. Nf3 {[%clk 0:00:54]} Ng8 {[%clk 0:00:53]} 3. Ng1 {[%clk 0:00:52]} Nf6 {[%clk 0:00:51]} *');
 assert.equal(clockAt(game,0,true),undefined);assert.equal(clockAt(game,1,false),55);assert.equal(clockAt(game,5,false),51);assert.equal(clockAt(game,5,true),52);
});
