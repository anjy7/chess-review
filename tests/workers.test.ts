import {test} from 'node:test';import assert from 'node:assert/strict';import {Effect} from 'effect';
import {review} from '../server/review.js';import {parseGame} from '../server/game.js';import type {Job} from '../src/types.js';
const game=parseGame('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 *');
const job=():Job=>({id:'workers-test',status:'running',progress:0,results:[],summary:{}});
test('parallel workers preserve complete chronological results and cap engines to group count',async()=>{
 const serial=job(),parallel=job();
 await Effect.runPromise(review(game,{mode:'lichess',limit:{nodes:10000},workers:1},serial));
 await Effect.runPromise(review(game,{mode:'lichess',limit:{nodes:10000},workers:32},parallel));
 const stable=(j:Job)=>j.results.map(r=>({...r,before:{...r.before,timeMs:0},after:{...r.after,timeMs:0}}));
 assert.deepEqual(stable(parallel),stable(serial));assert.deepEqual(parallel.summary,serial.summary);
 assert.equal(parallel.analysis?.workers,32);assert.equal(parallel.analysis?.effectiveWorkers,3);
 assert.equal(parallel.analysis?.completedPositions,13);assert.equal(parallel.progress,1);
});
test('cancelling a parallel review releases workers without publishing sparse or partial results',async()=>{
 const value=job(),controller=new AbortController(),start=Date.now(),timer=setTimeout(()=>controller.abort(),800);
 try{await assert.rejects(Effect.runPromise(review(game,{mode:'lichess',limit:{nodes:857142},workers:4},value),{signal:controller.signal}));}
 finally{clearTimeout(timer);}
 assert.ok(Date.now()-start<4000);assert.deepEqual(value.results,[]);assert.deepEqual(value.summary,{});
});
