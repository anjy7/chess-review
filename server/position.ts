import { Chess } from 'chess.js';
import { Effect } from 'effect';
import { acquireEngine } from './engine.js';
export function positionInput(body:{initialFen?:unknown;moves?:unknown}) {
  if(typeof body.initialFen!=='string'||body.initialFen.length>200||!Array.isArray(body.moves)||body.moves.length>1000||!body.moves.every(m=>typeof m==='string'&&/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m)))throw Error('Provide a valid starting FEN and at most 1000 UCI moves.');
  const board=new Chess(body.initialFen);for(const move of body.moves)board.move(move);
  return {initialFen:body.initialFen,moves:body.moves as string[],board};
}
export function analyzePosition(input:ReturnType<typeof positionInput>){
  return Effect.scoped(Effect.gen(function*(){const engine=yield* acquireEngine;
    // A single thread bounds resource use while a game review runs separately.
    yield* engine.initialize(true);
    const evaluation=yield* engine.evaluate(input.initialFen,input.moves,{milliseconds:600});
    const board=new Chess(input.board.fen()),line:string[]=[];
    for(const move of evaluation.pv){try{line.push(board.move(move).san);}catch{break;}}
    return {fen:input.board.fen(),evaluation,line};
  }));
}
