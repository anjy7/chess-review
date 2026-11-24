import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {materialSummary} from '../src/material';

test('captures belong to the capturing player; exchanges and rewinding update the lead',()=>{
 const b=new Chess();assert.deepEqual(materialSummary(b),{captured:{w:[],b:[]},advantage:{w:0,b:0}});
 for(const move of ['e4','d5','exd5'])b.move(move);
 assert.deepEqual(materialSummary(b),{captured:{w:['p'],b:[]},advantage:{w:1,b:0}});
 b.move('Qxd5');assert.deepEqual(materialSummary(b),{captured:{w:['p'],b:['p']},advantage:{w:0,b:0}});
 b.undo();assert.equal(materialSummary(b).advantage.w,1);
 b.undo();assert.deepEqual(materialSummary(b).captured,{w:[],b:[]});
});
test('en passant counts the removed pawn',()=>{
 const b=new Chess();for(const m of ['e4','a6','e5','d5','exd6'])b.move(m);
 assert.deepEqual(materialSummary(b),{captured:{w:['p'],b:[]},advantage:{w:1,b:0}});
});
test('material uses the current board, including setups and promotion',()=>{
 const b=new Chess('7k/P7/8/8/8/8/7p/7K w - - 0 1');
 assert.deepEqual(materialSummary(b),{captured:{w:[],b:[]},advantage:{w:0,b:0}});
 b.move('a8=Q+');assert.deepEqual(materialSummary(b),{captured:{w:[],b:[]},advantage:{w:8,b:0}});
 const setup=new Chess('7k/8/8/8/8/8/8/R6K b - - 0 1');
 assert.deepEqual(materialSummary(setup),{captured:{w:[],b:[]},advantage:{w:5,b:0}});
});
test('captured promoted pieces retain their actual type',()=>{
 const b=new Chess('1r5k/P7/8/8/8/8/8/7K w - - 0 1');
 b.move('a8=Q');b.move('Rxa8');
 assert.deepEqual(materialSummary(b),{captured:{w:[],b:['q']},advantage:{w:0,b:5}});
});
