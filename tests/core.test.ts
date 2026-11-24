import test from 'node:test';
import assert from 'node:assert/strict';
import { Effect, Exit, Cause } from 'effect';
import { Chess } from 'chess.js';
import { parseGame, linkId } from '../server/game.js';
import { acquireEngine } from '../server/engine.js';

test('PGN preserves starting position, moves, and metadata',()=>{
 const game=parseGame('[White "Alice"]\n\n1. e4 e5 2. Nf3 Nc6 *');
 assert.equal(game.headers.White,'Alice');assert.equal(game.moves.length,4);assert.equal(game.positions.length,5);assert.equal(game.moves[0].uci,'e2e4');
});
test('malformed, empty, and illegal PGNs rejected',()=>{for(const pgn of ['',null,'1. e5 *'])assert.throws(()=>parseGame(pgn));});
test('FEN setup honored',()=>{const g=parseGame('[SetUp "1"]\n[FEN "8/8/8/8/8/4k3/8/R3K3 w Q - 0 1"]\n\n1. Ra3+ *');assert.equal(g.moves[0].uci,'a1a3');});
test('link parsing rejects foreign hosts and unsupported links',()=>{
 assert.deepEqual(linkId('https://www.chess.com/analysis/game/live/123?tab=review'),{kind:'live',id:'123'});
 for(const url of ['https://evil.com/game/live/123','http://chess.com/game/live/123','https://chess.com.evil.com/game/live/123','https://chess.com/member/me'])assert.throws(()=>linkId(url));
});
test('native Stockfish 19 handshake, PV, mate, and repetition',async()=>{
 await Effect.runPromise(Effect.scoped(Effect.gen(function*(){const engine=yield* acquireEngine;yield* engine.initialize();assert.match(engine.name,/Stockfish 19/);
 const evaluation=yield* engine.evaluate(new Chess().fen(),[],100);assert.ok(evaluation.pv.length);assert.ok(Number.isFinite(evaluation.cp));
 const chess=new Chess();for(const move of evaluation.pv)chess.move(move);
 const mate=yield* engine.evaluate(new Chess().fen(),['f2f3','e7e5','g2g4','d8h4'],100);assert.equal(mate.mate,0);assert.equal(mate.cp,-100000);
 const repeat=yield* engine.evaluate(new Chess().fen(),['g1f3','g8f6','f3g1','f6g8','g1f3','g8f6','f3g1','f6g8'],100);assert.equal(repeat.cp,0);
 })));
});
test('Effect interruption releases engine during calculation',async()=>{
 const controller=new AbortController();
 const effect=Effect.scoped(Effect.gen(function*(){const engine=yield* acquireEngine;yield* engine.initialize();const timer=setTimeout(()=>controller.abort(),100);yield* engine.evaluate(new Chess().fen(),[],3000).pipe(Effect.ensuring(Effect.sync(()=>clearTimeout(timer))));}));
 const result=await Effect.runPromiseExit(effect,{signal:controller.signal});assert.ok(Exit.isFailure(result));if(Exit.isFailure(result))assert.ok(Cause.isInterruptedOnly(result.cause));
});
