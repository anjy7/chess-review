import {Chess} from 'chess.js';
import {Effect} from 'effect';
import {acquireEngine} from './engine.js';
import {positionInput} from './position.js';
import {scoreMove} from '../src/scoring.js';
import type {TreeAnalysis} from '../src/types.js';
export function analyzeTree(input:ReturnType<typeof positionInput>):Effect.Effect<TreeAnalysis,Error>{
 return Effect.scoped(Effect.gen(function*(){
  const base={fen:input.board.fen(),turn:input.board.turn()};
  if(input.board.isGameOver())return {...base,terminal:input.board.isCheckmate()?'Checkmate':input.board.isThreefoldRepetition()?'Draw claim available (threefold repetition)':input.board.isDrawByFiftyMoves()?'Draw claim available (50-move rule)':'Draw',candidates:[]} satisfies TreeAnalysis;
  const engine=yield* acquireEngine;yield* engine.initialize(true);
  const variations=yield* engine.evaluateVariations(input.initialFen,input.moves);
  const valid=variations.filter(e=>e.pv.length);
  const candidates=valid.map((evaluation,index)=>{
   const board=new Chess(input.board.fen()),line=evaluation.pv.map(move=>board.move(move).san);
   // Candidate values share the same parent search. Grade each against its best line.
   const {accuracy,winLoss}=scoreMove(valid[0],evaluation,input.board.turn()==='w',index===0);
   return {uci:evaluation.pv[0],san:line[0],evaluation,line,accuracy,winLoss};
  });
  if(!candidates.length)throw Error('No complete candidate lines returned. Please retry.');
  return {...base,candidates} satisfies TreeAnalysis;
 }));
}
