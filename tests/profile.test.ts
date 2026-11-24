import test from 'node:test';
import assert from 'node:assert/strict';
import { Effect } from 'effect';
import { Chess } from 'chess.js';
import { fishnetChunks, analysisOptions, engineMove, standardMove, FISHNET_PROFILE } from '../server/analysis-profile.js';
import { acquireEngine } from '../server/engine.js';

test('compatibility profile ignores timed input; invalid modes/budgets rejected',()=>{
 assert.deepEqual(analysisOptions({mode:'lichess',seconds:0.1}),{mode:'lichess',limit:{nodes:857142}});
 assert.deepEqual(analysisOptions({seconds:.3}),{mode:'timed',limit:{milliseconds:300}});
 assert.throws(()=>analysisOptions({mode:'fake'}));for(const seconds of [NaN,Infinity,0,4])assert.throws(()=>analysisOptions({seconds}));
 assert.equal(FISHNET_PROFILE.hashMb,16);assert.equal(FISHNET_PROFILE.threads,1);
});
test('reverse chunks cover initial through final exactly once plus warmups',()=>{
 const chunks=fishnetChunks(11);assert.deepEqual(chunks.map(c=>c.map(p=>p.index)),[[11,11,10,9,8,7],[7,6,5,4,3,2],[2,1,0]]);
 assert.ok(chunks.every(c=>c[0].warmup&&!c.slice(1).some(p=>p.warmup)));
 for(const n of [1,4,5,6,10,11,800]){const real=fishnetChunks(n).flat().filter(p=>!p.warmup);assert.deepEqual(real.map(p=>p.index),Array.from({length:n+1},(_,i)=>n-i));}
});
test('standard castling translates to fishnet UCI_Chess960 and back without mutating board',()=>{
 for(const turn of ['w','b'])for(const side of ['g','c']){
 const board=new Chess(`r3k2r/8/8/8/8/8/8/R3K2R ${turn} KQkq - 0 1`),rank=turn==='w'?'1':'8';
 const normal='e'+rank+side+rank,engine='e'+rank+(side==='g'?'h':'a')+rank,before=board.fen();
 assert.equal(engineMove(board,normal),engine);assert.equal(standardMove(board,engine),normal);assert.equal(board.fen(),before);
 }
});
test('native fixed-node search is reproducible after hash reset, records nodes, and accepts castling history',async()=>{
 await Effect.runPromise(Effect.scoped(Effect.gen(function*(){
 const engine=yield* acquireEngine;yield* engine.initialize(true);
 assert.equal(engine.name,'Stockfish 19');assert.equal(engine.network,'nn-1a298aa575a0.nnue');
 yield* engine.newGame();const first=yield* engine.evaluate(new Chess().fen(),[],{nodes:100000});
 yield* engine.newGame();const second=yield* engine.evaluate(new Chess().fen(),[],{nodes:100000});
 assert.equal(first.cp,second.cp);assert.deepEqual(first.pv,second.pv);assert.equal(first.depth,second.depth);assert.equal(first.nodes,second.nodes);assert.ok(first.nodes!>=100000);
 const fen='r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
 const after=yield* engine.evaluate(fen,['e1g1','e8c8'],{nodes:10000});
 const board=new Chess(fen);board.move('e1g1');board.move('e8c8');for(const move of after.pv)board.move(move);
 })));
});
