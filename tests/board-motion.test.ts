import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {pieceMotions,type BoardSnapshot} from '../src/board-motion';
import {squareCoordinates} from '../src/MoveFeedback';
function snapshot(history:string[],flipped=false,fen?:string):BoardSnapshot{const board=new Chess(fen);for(const move of history)board.move(move);return {fen:board.fen(),history,flipped};}
test('board coordinates and forward/backward motion are orientation-correct',()=>{
 assert.deepEqual(squareCoordinates('a8',false),{col:0,row:0});assert.deepEqual(squareCoordinates('h1',true),{col:0,row:0});
 assert.deepEqual(pieceMotions(snapshot([]),snapshot(['e2e4'])),{e4:{dx:0,dy:2}});
 assert.deepEqual(pieceMotions(snapshot(['e2e4']),snapshot([])),{e2:{dx:0,dy:-2}});
 assert.deepEqual(pieceMotions(snapshot([],true),snapshot(['e2e4'],true)),{e4:{dx:0,dy:-2}});
});
test('flips and non-adjacent jumps do not animate unrelated pieces',()=>{
 assert.deepEqual(pieceMotions(snapshot([]),snapshot([],true)),{});
 assert.deepEqual(pieceMotions(snapshot([]),snapshot(['e2e4','e7e5'])),{});
 assert.deepEqual(pieceMotions(snapshot(['e2e4']),snapshot(['d2d4','d7d5'])),{});
});
test('castling animates king and rook together; promotions and captures land correctly',()=>{
 const fen='r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
 assert.deepEqual(pieceMotions(snapshot([],false,fen),snapshot(['e1g1'],false,fen)),{g1:{dx:-2,dy:0},f1:{dx:2,dy:0}});
 const promotion='7k/P7/8/8/8/8/8/7K w - - 0 1';
 assert.deepEqual(pieceMotions(snapshot([],false,promotion),snapshot(['a7a8q'],false,promotion)),{a8:{dx:0,dy:1}});
 const history=['e2e4','d7d5'];assert.deepEqual(pieceMotions(snapshot(history),snapshot([...history,'e4d5'])),{d5:{dx:1,dy:1}});
});
