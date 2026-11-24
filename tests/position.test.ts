import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { Effect } from 'effect';
import { analyzePosition,positionInput } from '../server/position.js';
test('position validation rejects invalid FEN, oversized histories and illegal moves',()=>{const initialFen=new Chess().fen();for(const data of [{initialFen:'bad',moves:[]},{initialFen,moves:['e2e5']},{initialFen,moves:['garbage']},{initialFen,moves:Array(1001).fill('e2e4')},{initialFen,moves:'e2e4'}])assert.throws(()=>positionInput(data));});
test('live position analysis returns correct FEN and legal recommendation branch',async()=>{const input=positionInput({initialFen:new Chess().fen(),moves:['e2e4','c7c5','g1f3']});const result=await Effect.runPromise(analyzePosition(input));assert.equal(result.fen,input.board.fen());assert.ok(result.evaluation.depth>0);const board=new Chess(result.fen);assert.deepEqual(result.evaluation.pv.map(m=>board.move(m).san),result.line);});
