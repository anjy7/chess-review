import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {Effect} from 'effect';
import {analyzeTree} from '../server/tree.js';
import {positionInput} from '../server/position.js';
import {scoreMove} from '../src/scoring.js';
import {UciEngine,enginePath} from '../server/engine.js';
test('MultiPV restores single-line searches and interruption releases an active tree search',async()=>{
 const engine=new UciEngine(enginePath());let timer:ReturnType<typeof setTimeout>|undefined;
 try{await Effect.runPromise(engine.initialize(true));
  const lines=await Effect.runPromise(engine.evaluateVariations(new Chess().fen(),[],150));assert.equal(lines.length,3);
  const ranks=new Set<number>();await Effect.runPromise(engine.evaluate(new Chess().fen(),[],100,rank=>ranks.add(rank)));assert.deepEqual([...ranks],[1]);
  const controller=new AbortController(),start=Date.now();timer=setTimeout(()=>controller.abort(),150);
  await assert.rejects(Effect.runPromise(engine.evaluateVariations(new Chess().fen(),[],3000),{signal:controller.signal}));assert.ok(Date.now()-start<2000);
 }finally{clearTimeout(timer);engine.close();}
});
test('candidate tree returns three distinct legal lines with coherent depth and white-perspective scores',async()=>{
 const initialFen=new Chess().fen();
 for(const moves of [[],['e2e4']]){
 const result=await Effect.runPromise(analyzeTree(positionInput({initialFen,moves})));
 assert.equal(result.turn,moves.length?'b':'w');assert.equal(result.candidates.length,3);
 assert.equal(new Set(result.candidates.map(c=>c.uci)).size,3);
 assert.equal(new Set(result.candidates.map(c=>c.evaluation.depth)).size,1);
 for(const c of result.candidates){const b=new Chess(result.fen);assert.deepEqual(c.evaluation.pv.map(m=>b.move(m).san),c.line);assert.equal(c.san,c.line[0]);}
 const best=result.candidates[0];assert.equal(best.accuracy,100);assert.equal(best.winLoss,0);
 for(const candidate of result.candidates){const expected=scoreMove(best.evaluation,candidate.evaluation,result.turn==='w',candidate===best);assert.equal(candidate.accuracy,expected.accuracy);assert.equal(candidate.winLoss,expected.winLoss);assert.ok(candidate.accuracy>=0&&candidate.accuracy<=100&&candidate.winLoss>=0);}
 assert.ok(result.turn==='b'?best.evaluation.cp<=result.candidates[1].evaluation.cp:best.evaluation.cp>=result.candidates[1].evaluation.cp);
 }
});
test('terminal positions return a terminal node without engine branches',async()=>{
 const board=new Chess();for(const m of ['f3','e5','g4','Qh4#'])board.move(m);
 const result=await Effect.runPromise(analyzeTree(positionInput({initialFen:board.fen(),moves:[]})));
 assert.equal(result.terminal,'Checkmate');assert.deepEqual(result.candidates,[]);
});
